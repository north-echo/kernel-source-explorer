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
        assert len(content['lessons']) == 6
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
        assert not resolve_checkpoint(db, metadata, checkpoint)['available']
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
        assert len(ids) == 70
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
