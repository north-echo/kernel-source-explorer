"""Original reading-companion annotations, resolved against actual indexed evidence."""
from copy import deepcopy
from functools import lru_cache
import json
from pathlib import Path

REVISION = 'a2de78ee6ed8bf8cd99d177c74865a6e8c3cb6ea'
CONTENT = Path(__file__).with_name('lessons.json')
EXPERIMENTS = Path(__file__).with_name('experiments')


@lru_cache
def curriculum():
    return json.loads(CONTENT.read_text())



def experiment_path(lesson_id):
    lesson = next((item for item in curriculum()['lessons'] if item['id'] == lesson_id), None)
    if not lesson:
        return None
    filename = lesson['experiment']['file']
    if Path(filename).name != filename or not filename.endswith('.c'):
        raise ValueError('Invalid packaged experiment path')
    return EXPERIMENTS / filename


def resolve_checkpoint(db, metadata, checkpoint):
    unavailable = dict(available=False, reason='Open the pinned Linux 7.2.11 kernel dataset to inspect this checkpoint.')
    if db is None or metadata.get('kind') != 'kernel' or metadata.get('revision') != REVISION:
        return unavailable
    selector = checkpoint['selector']
    if selector['type'] == 'call':
        found = db.execute('''SELECT r.*,s.name AS source_name,t.name AS target_name,u.path AS tu,u.status
            FROM relationships r JOIN symbols s ON s.id=r.source_id JOIN symbols t ON t.id=r.target_id
            JOIN translation_units u ON u.id=r.tu_id
            WHERE s.name=? AND t.name=? AND r.file=? AND u.path=?
            AND r.kind='direct_call' AND r.resolution='compiler_resolved' AND r.origin='clang_ast'
            AND u.status='successful' ORDER BY r.id LIMIT 2''',
                           (selector['caller'], selector['callee'], selector['file'], selector['file'])).fetchall()
        if len(found) != 1:
            return dict(available=False, reason='This checkpoint has missing or ambiguous successful compiler evidence in the open index.')
        edge = dict(found[0])
        selection = dict(symbol_id=edge['source_id'], name=edge['source_name'],
                         location={key: edge[key] for key in ['file', 'line', 'column']}, edge=edge)
    else:
        found = db.execute('''SELECT DISTINCT s.id,s.name,l.file,l.line,l.column FROM symbols s
            JOIN locations l ON l.symbol_id=s.id JOIN translation_units u ON u.id=l.tu_id
            WHERE s.name=? AND l.file=? AND l.is_definition=1 AND u.status='successful'
            ORDER BY l.line LIMIT 2''', (selector['name'], selector['file'])).fetchall()
        if len(found) != 1:
            return dict(available=False, reason='This definition is missing or ambiguous in the successful indexed scope.')
        symbol = dict(found[0])
        selection = dict(symbol_id=symbol['id'], name=symbol['name'],
                         location={key: symbol[key] for key in ['file', 'line', 'column']})
    return dict(available=True, dataset_id=metadata['dataset_id'], revision=metadata['revision'], selection=selection)


def learning_content(db=None, metadata=None):
    result = deepcopy(curriculum())
    result['annotation_origin'] = 'authored_learning_material'
    for lesson in result['lessons']:
        lesson['experiment']['source'] = experiment_path(lesson['id']).read_text()
        for checkpoint in lesson['checkpoints']:
            checkpoint.update(resolve_checkpoint(db, metadata or {}, checkpoint))
    return result


def reader_profile(path):
    """Return only supported profile fields. Never expose the continuity file itself."""
    fallback = dict(reading_lesson='process-inheritance', reading_reference='Chapter 2 · §2.7 Processes', interests=[])
    try:
        raw = json.loads(path.read_text())
        if not isinstance(raw, dict):
            return fallback
        ids = {lesson['id'] for lesson in curriculum()['lessons']}
        result = dict(reading_lesson=raw.get('reading_lesson') if raw.get('reading_lesson') in ids else fallback['reading_lesson'],
                      reading_reference=str(raw.get('reading_reference', fallback['reading_reference']))[:200],
                      interests=[x[:80] for x in raw.get('interests', [])[:8] if isinstance(x, str)] if isinstance(raw.get('interests', []), list) else [])
        for field, limit in [('study_environment', 200), ('discussion_context', 2000)]:
            if isinstance(raw.get(field), str):
                result[field] = raw[field][:limit]
        return result
    except (OSError, ValueError, TypeError):
        return fallback
