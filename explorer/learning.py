"""Original reading-companion annotations, resolved against actual indexed evidence."""
from copy import deepcopy
from functools import lru_cache
import json
import re
from pathlib import Path

REVISION = 'a2de78ee6ed8bf8cd99d177c74865a6e8c3cb6ea'
CONTENT = Path(__file__).with_name('lessons.json')
EXPERIMENTS = Path(__file__).with_name('experiments')


@lru_cache
def curriculum():
    result = json.loads(CONTENT.read_text())
    result['chapters'] = json.loads(CONTENT.with_name('chapters.json').read_text())
    return result



def experiment_path(lesson_id):
    lesson = next((item for item in curriculum()['lessons'] if item['id'] == lesson_id), None)
    if not lesson or not lesson.get('experiment'):
        return None
    filename = lesson['experiment']['file']
    if Path(filename).name != filename or not filename.endswith('.c'):
        raise ValueError('Invalid packaged experiment path')
    return EXPERIMENTS / filename


def resolve_checkpoint(db, metadata, checkpoint):
    if db is None:
        return dict(available=False, reason_code='index_missing', reason='No readable source index is open. Reading and code remain available; prepare the pinned Linux dataset to visit this checkpoint.')
    if metadata.get('kind') != 'kernel':
        return dict(available=False, reason_code='wrong_dataset_kind', reason='The open index is a fixture, not the reviewed kernel dataset. Open the pinned Linux dataset for this checkpoint.')
    if metadata.get('revision') != REVISION:
        return dict(available=False, reason_code='revision_mismatch', reason='The open kernel revision differs from the reviewed mapping. Open the pinned revision or author and validate a new mapping.')
    selector = checkpoint['selector']
    if selector['type'] == 'call':
        found = db.execute('''SELECT r.*,s.name AS source_name,t.name AS target_name,u.path AS tu,u.status
            FROM relationships r JOIN symbols s ON s.id=r.source_id JOIN symbols t ON t.id=r.target_id
            JOIN translation_units u ON u.id=r.tu_id
            WHERE s.name=? AND t.name=? AND r.file=? AND u.path=?
            AND r.kind='direct_call' AND r.resolution='compiler_resolved' AND r.origin='clang_ast'
            AND u.status='successful' ORDER BY r.id LIMIT 2''',
                           (selector['caller'], selector['callee'], selector['file'], selector['file'])).fetchall()
        if len(found) > 1:
            return dict(available=False, reason_code='ambiguous_evidence', reason='More than one successful compiler record matches this selector; review the mapping.')
        if not found:
            partial = db.execute('''SELECT 1 FROM relationships r JOIN symbols s ON s.id=r.source_id
                JOIN symbols t ON t.id=r.target_id JOIN translation_units u ON u.id=r.tu_id
                WHERE s.name=? AND t.name=? AND r.file=? AND u.path=? AND u.status!='successful'
                AND r.kind='direct_call' AND r.resolution='compiler_resolved' AND r.origin='clang_ast' LIMIT 1''',
                (selector['caller'], selector['callee'], selector['file'], selector['file'])).fetchone()
            return dict(available=False, reason_code='partial_evidence' if partial else 'evidence_missing',
                        reason='Matching evidence exists only in unsuccessful translation units. Review diagnostics and rebuild before using this checkpoint.' if partial else 'No compiler evidence matches this authored selector. Check indexed scope or review the mapping.')
        edge = dict(found[0])
        selection = dict(symbol_id=edge['source_id'], name=edge['source_name'],
                         location={key: edge[key] for key in ['file', 'line', 'column']}, edge=edge)
    else:
        found = db.execute('''SELECT DISTINCT s.id,s.name,l.file,l.line,l.column FROM symbols s
            JOIN locations l ON l.symbol_id=s.id JOIN translation_units u ON u.id=l.tu_id
            WHERE s.name=? AND l.file=? AND l.is_definition=1 AND u.status='successful'
            ORDER BY l.line LIMIT 2''', (selector['name'], selector['file'])).fetchall()
        if len(found) > 1:
            return dict(available=False, reason_code='ambiguous_definition', reason='This definition is ambiguous in the successful indexed scope; review its selector.')
        if not found:
            partial = db.execute('''SELECT 1 FROM symbols s JOIN locations l ON l.symbol_id=s.id
                JOIN translation_units u ON u.id=l.tu_id WHERE s.name=? AND l.file=? AND l.is_definition=1
                AND u.status!='successful' LIMIT 1''', (selector['name'], selector['file'])).fetchone()
            return dict(available=False, reason_code='partial_definition' if partial else 'definition_missing',
                        reason='A matching definition exists only in unsuccessful translation units; review diagnostics and rebuild.' if partial else 'No indexed definition matches. Check scope or review the authored mapping.')
        symbol = dict(found[0])
        selection = dict(symbol_id=symbol['id'], name=symbol['name'],
                         location={key: symbol[key] for key in ['file', 'line', 'column']})
    return dict(available=True, dataset_id=metadata['dataset_id'], revision=metadata['revision'], selection=selection)


def learning_content(db=None, metadata=None):
    result = deepcopy(curriculum())
    result['annotation_origin'] = 'authored_learning_material'
    for lesson in result['lessons']:
        source = experiment_path(lesson['id']).read_text()
        lesson['experiment']['source'] = source
        markers = [(match.group(1), source[:match.start()].count('\n') + 1) for match in re.finditer(r'/\* @step ([a-z0-9-]+) \*/', source)]
        bounds = {id: (start, markers[i+1][1]-1 if i+1 < len(markers) else len(source.splitlines())) for i, (id, start) in enumerate(markers)}
        for segment in lesson['walkthrough']:
            segment['start'], segment['end'] = bounds[segment['id']]
        lesson['experiment']['sha256'] = __import__('hashlib').sha256(source.encode()).hexdigest()
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
        ids = {lesson['id'] for lesson in curriculum()['lessons'] + curriculum()['chapters']}
        result = dict(reading_lesson=raw.get('reading_lesson') if raw.get('reading_lesson') in ids else fallback['reading_lesson'],
                      reading_reference=str(raw.get('reading_reference', fallback['reading_reference']))[:200],
                      interests=[x[:80] for x in raw.get('interests', [])[:8] if isinstance(x, str)] if isinstance(raw.get('interests', []), list) else [])
        active = raw.get('active_lab')
        if isinstance(active, dict):
            lesson = next((item for item in curriculum()['lessons'] if item['id'] == active.get('lesson')), None)
            if lesson and any(step['id'] == active.get('segment') for step in lesson.get('walkthrough', [])):
                result['active_lab'] = dict(lesson=lesson['id'], segment=active['segment'])
        for field, limit in [('study_environment', 200), ('discussion_context', 2000)]:
            if isinstance(raw.get(field), str):
                result[field] = raw[field][:limit]
        return result
    except (OSError, ValueError, TypeError):
        return fallback
