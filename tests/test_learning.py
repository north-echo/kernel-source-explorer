import json
from pathlib import Path
import sqlite3

from fastapi.testclient import TestClient
from explorer.api import create_app
from explorer.learning import REVISION, curriculum, resolve_checkpoint
from test_explorer import indexed  # Reuse the real native-index fixture.


def test_reading_companion_works_without_a_source_index(tmp_path, monkeypatch):
    monkeypatch.setenv('KSE_PROFILE', str(tmp_path / 'absent-profile.json'))
    with TestClient(create_app(tmp_path / 'absent.sqlite'), base_url='http://localhost') as client:
        content = client.get('/api/learning').json()
        assert len(content['lessons']) == 9
        assert content['annotation_origin'] == 'authored_learning_material'
        assert all(not stop['available'] for lesson in content['lessons'] for stop in lesson['checkpoints'])
        assert 'fork()' not in content['book']['title']
        for lesson in content['lessons']:
            assert lesson['prompt'] and lesson['reading'] and lesson['explanation']
            assert all(term in content['glossary'] for term in lesson['terms'])
            response = client.get('/api/learning/' + lesson['id'] + '/experiment')
            assert response.status_code == 200
            assert response.text == lesson['experiment']['source']
            assert 'attachment' in response.headers['content-disposition']
        assert client.get('/api/learning/unknown/experiment').status_code == 404
        assert client.get('/api/reader-profile').json()['interests'] == []


def test_private_profile_is_local_whitelisted_and_optional(tmp_path, monkeypatch):
    profile = tmp_path / 'personal.json'
    profile.write_text(json.dumps(dict(reading_lesson='exec-replacement', reading_reference='My private reading place',
                                      interests=['sandboxing'], continuity_text='do not expose this field')))
    monkeypatch.setenv('KSE_PROFILE', str(profile))
    with TestClient(create_app(tmp_path / 'absent.sqlite'), base_url='http://localhost') as client:
        response = client.get('/api/reader-profile')
        assert response.json() == dict(reading_lesson='exec-replacement', reading_reference='My private reading place', interests=['sandboxing'])
        assert 'do not expose' not in response.text
        profile.write_text('bad json')
        assert client.get('/api/reader-profile').json()['reading_lesson'] == 'process-inheritance'
        profile.write_text(json.dumps(dict(reading_lesson='unknown', interests='wrong type')))
        assert client.get('/api/reader-profile').json()['interests'] == []


def test_fixture_never_claims_to_be_kernel_lesson_evidence(indexed):
    client, _, _, _ = indexed
    content = client.get('/api/learning').json()
    assert all(not stop['available'] for topic in content['lessons'] for stop in topic['checkpoints'])
    assert client.get('/api/learning', headers={'X-KSE-Dataset':'stale'}).status_code == 409


def test_annotation_resolver_requires_unambiguous_successful_compiler_facts(indexed):
    _, _, output, _ = indexed
    checkpoint = dict(selector=dict(type='call', caller='allocate_pid', callee='helper', file='process.c'))
    # This exercises resolution with actual compiler fixture facts. It is not a kernel validation.
    metadata = dict(kind='kernel', revision=REVISION, dataset_id='resolver-unit-test')
    with sqlite3.connect(output) as db:
        db.row_factory = sqlite3.Row
        result = resolve_checkpoint(db, metadata, checkpoint)
        assert result['available'] and result['selection']['edge']['origin'] == 'clang_ast'
        assert result['selection']['location'] == dict(file='process.c', line=5, column=37)
        db.execute("UPDATE translation_units SET status='partial' WHERE path='process.c'")
        assert resolve_checkpoint(db, metadata, checkpoint)['reason_code'] == 'partial_evidence'
        db.execute("UPDATE translation_units SET status='successful' WHERE path='process.c'")
        edge = result['selection']['edge']
        db.execute('''INSERT INTO relationships(source_id,target_id,tu_id,kind,resolution,file,line,column)
            VALUES (?,?,?,?,?,?,?,?)''', (edge['source_id'],edge['target_id'],edge['tu_id'],'direct_call','compiler_resolved','process.c',99,1))
        assert not resolve_checkpoint(db, metadata, checkpoint)['available']
        assert not resolve_checkpoint(db, dict(kind='fixture'), checkpoint)['available']


def test_real_kernel_learning_checkpoints_have_readable_evidence():
    import pytest
    index = Path('data/learning/index.sqlite')
    if not index.is_file():
        pytest.skip('Optional real kernel dataset is not installed')
    with TestClient(create_app(index), base_url='http://localhost') as client:
        content = client.get('/api/learning').json()
        for lesson in content['lessons']:
            for stop in lesson['checkpoints']:
                assert stop['available'], (lesson['id'], stop['id'], stop.get('reason'))
                selection = stop['selection']
                response = client.get('/api/source', params=selection['location'], headers={'X-KSE-Dataset':stop['dataset_id']})
                assert response.status_code == 200
                if 'edge' in selection:
                    assert selection['edge']['resolution'] == 'compiler_resolved'


def test_entire_book_catalog_has_original_guides_and_valid_concept_maps(tmp_path):
    with TestClient(create_app(tmp_path / 'absent.sqlite'), base_url='http://localhost') as client:
        content = client.get('/api/learning').json()
        chapters = content['chapters']
        assert [c['number'] for c in chapters] == list(range(1, 65))
        all_topics = chapters + content['lessons']
        ids = {c['id'] for c in all_topics}
        assert len(ids) == 73
        assert chapters[5]['pages']['start'] == 113
        assert chapters[19]['title'] == 'Signals: Fundamental Concepts'
        assert chapters[46]['title'] == 'System V Semaphores'
        assert chapters[-1]['pages'] == {'start': 1375, 'end': 1400}
        for chapter in chapters:
            assert len(chapter['explanation']) >= 2
            assert chapter['prompt'].endswith('?') and chapter['follow_up'].endswith('?')
            assert chapter['checkpoints'] == []  # Reading coverage does not fabricate kernel coverage.
            assert set(chapter['related']).issubset(ids)
            assert client.get('/api/learning/' + chapter['id'] + '/experiment').status_code == 404
        for topic in all_topics:
            flow = topic['flow']
            node_ids = {n['id'] for n in flow['nodes']}
            assert len(node_ids) == len(flow['nodes'])
            assert all(n['label'] for n in flow['nodes'])
            assert all(e['source'] in node_ids and e['target'] in node_ids for e in flow['edges'])
            connected = {e[k] for e in flow['edges'] for k in ('source', 'target')}
            assert connected == node_ids


def test_profile_accepts_full_book_reading_place(tmp_path):
    from explorer.learning import reader_profile
    profile = tmp_path / 'reader.json'
    profile.write_text(json.dumps({'reading_lesson':'chapter-64', 'reading_reference':'Pseudoterminals'}))
    assert reader_profile(profile)['reading_lesson'] == 'chapter-64'


def test_reading_survives_incompatible_and_corrupt_indexes(tmp_path):
    bad = tmp_path / 'bad.sqlite'
    for contents in [b'not sqlite at all', b'']:
        bad.write_bytes(contents)
        with TestClient(create_app(bad), base_url='http://localhost') as client:
            result = client.get('/api/learning')
            assert result.status_code == 200
            content = result.json()
            assert len(content['chapters']) == 64 and content['index_error']
            assert all(c['reason_code'] == 'index_unusable' for t in content['lessons'] for c in t['checkpoints'])
    bad.unlink()
    with sqlite3.connect(bad) as db:
        db.execute('PRAGMA user_version=99')
    with TestClient(create_app(bad), base_url='http://localhost') as client:
        assert 'Unsupported index schema' in client.get('/api/learning').json()['index_error']


def test_walkthrough_ranges_downloads_and_runtime_reports_share_canonical_source(tmp_path):
    import hashlib
    from explorer.learning import learning_content
    content = learning_content()
    report = json.loads(Path('docs/followup-experiment-validation.json').read_text())
    runtime = {r['experiment']:r for r in report['results'] if r['case']=='canonical'}
    assert report['effective_uid'] != 0 and report['system'] == 'Linux'
    for lesson in content['lessons']:
        source = lesson['experiment']['source']
        lines = source.splitlines()
        assert lesson['experiment']['sha256'] == hashlib.sha256(source.encode()).hexdigest()
        assert runtime[Path(lesson['experiment']['file']).stem]['source_sha256'] == lesson['experiment']['sha256']
        assert lesson['experiment']['assumptions'] and lesson['experiment']['variation'] and lesson['experiment']['troubleshooting']
        for step in lesson['walkthrough']:
            assert lines[step['start']-1].strip() == '/* @step ' + step['id'] + ' */'
            assert step['start'] <= step['end'] <= len(lines)
        if lesson['id'] == 'fork-memory':
            fork = next(s for s in lesson['walkthrough'] if s['id']=='fork')
            assert 'pid_t child_pid = fork();' in '\n'.join(lines[fork['start']-1:fork['end']])
    assert runtime['seccomp_boundary']['stdout'] == 'getppid before=allowed after=EPERM getpid=allowed\n'


def test_chapter_depth_and_flagged_diagram_semantics():
    content = curriculum()
    for chapter in content['chapters']:
        assert chapter['concepts']
        if 'explanation_headings' in chapter:
            assert len(chapter['explanation_headings']) == len(chapter['explanation'])
            assert all(isinstance(h, str) and h for h in chapter['explanation_headings'])
        assert not any(c['title']=='Trace the mechanism before choosing a boundary' for c in chapter['concepts'])
        assert all(c['explanation'] not in chapter['explanation'] for c in chapter['concepts'])
        assert len(chapter['terms']) >= 2
        assert chapter['references'] and chapter['review']['date']
        for concept in chapter['concepts']:
            assert all(concept[field] for field in ['scenario','explanation','assumptions','counterexample','apis','references'])
    c = {x['number']:x for x in content['chapters']}
    flow = c[5]['flow']
    assert {e['source'] for e in flow['edges'] if e['target']=='n2'} == {'n0','n1'}
    assert 'unmasked' in c[17]['flow']['scope']
    assert any('discard' in n['label'] for n in c[20]['flow']['nodes'])
    assert 'MAP_SHARED' in c[24]['flow']['scope']
    assert any(e['source']=='n3' and e['target']=='n1' for e in c[30]['flow']['edges'])
    assert 'not define any acknowledgment' in c[61]['flow']['scope']
    assert not any(t['checkpoints'] for t in content['lessons'] if t['id'] in ['launcher-preparation','child-supervision','seccomp-boundary'])


def test_exact_relationship_link_and_symbol_filters(indexed):
    client, _, _, _ = indexed
    hits = client.get('/api/symbols', params={'q':'allocate_pid','symbol_kind':'function','definitions_only':True}).json()
    assert hits and all(x['kind']=='function' and x['is_definition'] for x in hits)
    assert client.get('/api/symbols', params={'q':'allocate_pid','symbol_kind':'struct'}).json() == []
    neighborhood = client.get('/api/neighborhood', params={'id':hits[0]['id'],'direction':'outgoing','kind':'direct_call'}).json()
    edge = neighborhood['edges'][0]
    assert client.get('/api/relationship', params={'id':edge['id']}).json() == edge
    assert client.get('/api/relationship', params={'id':99999999}).status_code == 404
    assert client.get('/api/relationship', params={'id':edge['id']}, headers={'X-KSE-Dataset':'wrong'}).status_code == 409


def test_checkpoint_failure_reasons_are_distinct(indexed):
    _, _, output, _ = indexed
    checkpoint = dict(selector=dict(type='call', caller='allocate_pid', callee='helper', file='process.c'))
    metadata = dict(kind='kernel', revision=REVISION, dataset_id='resolver-test')
    assert resolve_checkpoint(None, {}, checkpoint)['reason_code'] == 'index_missing'
    with sqlite3.connect(output) as db:
        db.row_factory = sqlite3.Row
        assert resolve_checkpoint(db, dict(kind='fixture'), checkpoint)['reason_code'] == 'wrong_dataset_kind'
        assert resolve_checkpoint(db, dict(kind='kernel', revision='other'), checkpoint)['reason_code'] == 'revision_mismatch'
        missing = dict(selector=dict(type='call', caller='not_present', callee='helper', file='process.c'))
        assert resolve_checkpoint(db, metadata, missing)['reason_code'] == 'evidence_missing'
        db.execute("UPDATE translation_units SET status='partial' WHERE path='process.c'")
        assert resolve_checkpoint(db, metadata, checkpoint)['reason_code'] == 'partial_evidence'


def test_supported_active_lab_profile_is_explicit_and_validated(tmp_path):
    from explorer.learning import reader_profile
    profile = tmp_path / 'profile.json'
    profile.write_text(json.dumps(dict(reading_lesson='chapter-02', active_lab=dict(lesson='fork-memory', segment='fork'))))
    assert reader_profile(profile)['active_lab'] == dict(lesson='fork-memory', segment='fork')
    profile.write_text(json.dumps(dict(active_lab=dict(lesson='fork-memory', segment='not-a-step'))))
    assert 'active_lab' not in reader_profile(profile)


def test_followup_teaching_has_connected_statement_steps_and_precise_filter_traces():
    content = curriculum()
    for lesson in content['lessons']:
        for segment in lesson['walkthrough']:
            assert segment['situation'] and segment['prerequisite'] and segment['change']
            assert all(step.strip() and step not in ['|', '||'] for step in segment['steps'])
    fork = next(t for t in content['lessons'] if t['id'] == 'fork-memory')
    segment = next(s for s in fork['walkthrough'] if s['id'] == 'fork')
    assert [s.split()[0] for s in segment['steps'][:5]] == ['child_pid', 'pid_t', 'fork()', 'The', 'On']
    assert 'Neither restarts main()' in segment['steps'][4]
    seccomp = next(t for t in content['lessons'] if t['id'] == 'seccomp-boundary')
    table_segment = next(s for s in seccomp['walkthrough'] if s['id'] == 'filter')
    assert [len(t['rows']) for t in table_segment['tables']] == [7, 9]
    assert 'thread' in next(s for s in seccomp['walkthrough'] if s['id']=='install')['change']
    report = json.loads(Path('docs/followup-experiment-validation.json').read_text())
    cases = {r['case']: r for r in report['results']}
    for name in ['mutation-no-chdir', 'mutation-inherited-environment']:
        assert cases[name]['exit_code'] != 0 and cases[name]['stderr']
    assert cases['variation-usr1-inherited-ignored-blocked']['exit_code'] == 0
    assert cases['simulated-zero-getppid']['exit_code'] == 0
    assert cases['simulated-zero-getuid']['exit_code'] == 0


def test_explorer_starts_and_reading_annotations_are_bound_to_reviewed_evidence():
    from explorer.learning import learning_content
    content = learning_content()
    starts = [lesson for lesson in content['lessons'] if lesson.get('explorer_start')]
    assert {l['id'] for l in starts} == {'fork-memory','process-inheritance','exec-replacement','exit-wait','process-identity'}
    for lesson in starts:
        start = lesson['explorer_start']
        assert start['segment'] in {s['id'] for s in lesson['walkthrough']}
        checkpoint = next(c for c in lesson['checkpoints'] if c['id']==start['checkpoint'])
        assert not checkpoint['available'] and checkpoint['reason_code']=='index_missing'
        assert all(start[k] for k in ['question','situation','establishes','prerequisite','terms'])
    for lesson in content['lessons']:
        for checkpoint in lesson['checkpoints']:
            reading = checkpoint['reading']
            assert isinstance(reading.get('before',4),int) and 4 <= reading.get('before',4) <= 30
            assert all(reading[k] for k in ['reviewed','caller','statement','inputs','result','syntax'])
            for target in reading['next']:
                topic = next(t for t in content['lessons'] if t['id']==target['lesson'])
                assert target['checkpoint'] in {c['id'] for c in topic['checkpoints']}
    index = Path('data/learning/index.sqlite')
    if index.exists():
        with TestClient(create_app(index),base_url='http://localhost') as client:
            resolved = client.get('/api/learning').json()
            dataset = client.get('/api/dataset').json()['metadata']
            for lesson in resolved['lessons']:
                for checkpoint in lesson['checkpoints']:
                    assert checkpoint['available'] and checkpoint['dataset_id']==dataset['dataset_id']
                    selection=checkpoint['selection']
                    anchor=selection['location']
                    source=client.get('/api/source',params=anchor).json()
                    line=source['lines'][anchor['line']-source['start']]
                    if selection.get('edge'):
                        assert selection['edge']['target_name'] in line


def test_memory_journey_keeps_existing_selectors_and_exposes_the_actual_branch():
    lesson = next(l for l in curriculum()['lessons'] if l['id'] == 'fork-memory')
    assert [s['checkpoint'] for s in lesson['guided_path']['steps']] == ['memory-setup', 'memory-choice']
    assert lesson['guided_path']['comparison_segment'] in {s['id'] for s in lesson['walkthrough']}
    assert [c['selector']['callee'] for c in lesson['checkpoints']] == ['copy_mm', 'dup_mm']
    assert all((c['reading'].get('steps') or c['reading'].get('groups')) and c['reading']['prerequisites'] for c in lesson['checkpoints'])
    assert [g['title'] for g in lesson['checkpoints'][1]['reading']['groups']] == ['Existing memory', 'Sharing requested?', 'Separate context']
    assert 'not the contents of an individual C variable' in lesson['guided_path']['definition']
    index = Path('data/learning/index.sqlite')
    if not index.exists():
        import pytest
        pytest.skip('Pinned kernel dataset unavailable; content assertions above are not source validation')
    with TestClient(create_app(index), base_url='http://localhost') as client:
        resolved = next(l for l in client.get('/api/learning').json()['lessons'] if l['id'] == 'fork-memory')
        first, second = resolved['checkpoints']
        assert first['available'] and second['available']
        def excerpt(checkpoint):
            return '\n'.join(client.get('/api/source', params={**checkpoint['selection']['location'],
                'before': checkpoint['reading'].get('before', 4), 'after': 12}).json()['lines'])
        text = excerpt(first)
        assert 'retval = copy_mm(clone_flags, p);\n\tif (retval)\n\t\tgoto bad_fork_cleanup_signal;' in text
        text = excerpt(second)
        for statement in ['oldmm = current->mm;', 'if (clone_flags & CLONE_VM)', 'mmget(oldmm);',
                          'mm = oldmm;', '} else {', 'mm = dup_mm(tsk, current->mm);',
                          'if (!mm)', 'return -ENOMEM;', 'tsk->mm = mm;', 'tsk->active_mm = mm;', 'return 0;']:
            assert statement in text
        # The helper documents NULL rather than the ERR_PTR convention used by other kernel APIs.
        edge = second['selection']['edge']
        locs = client.get('/api/symbol', params={'id': edge['target_id']}).json()['locations']
        definition = next(loc for loc in locs if loc['is_definition'])
        text = '\n'.join(client.get('/api/source', params={**definition, 'before': 12, 'after': 3}).json()['lines'])
        assert 'Return: the duplicated mm or NULL on failure.' in text


def test_reading_structure_keeps_evidence_and_code_context_separate():
    chapters = curriculum()['chapters']
    for c in chapters:
        assert c['orientation']['heading'] and c['orientation']['prerequisite']
        assert c['reflection_answer']
        assert not c['checkpoints'] and not c.get('experiment') and not c.get('walkthrough')
        assert c['flow']['question'] and c['flow']['relationships']
        assert all(e.get('label') for e in c['flow']['edges'])
        for concept in c['concepts']:
            if concept.get('code'):
                assert all(concept.get(k) for k in ['code_kind', 'code_context', 'code_syntax'])
        # Retired chapter worksheets must not imply that a linked lab was run here.
        assert 'containment' not in c
    c2 = chapters[1]
    assert 'security_connection' in c2
    assert c2['availability'] == dict(reading=True, walkthrough=False, experiment=False, checkpoint=False)
