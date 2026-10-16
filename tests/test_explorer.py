import json
from pathlib import Path
import shutil
import sqlite3
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from explorer.api import create_app
from explorer.cli import fixture, index

REPO = Path(__file__).resolve().parents[1]
INDEXER = REPO / 'build/indexer/kse-index'


def build(root, output, builddir, tus=None):
    index(SimpleNamespace(root=root, output=output, compdb=builddir / 'compile_commands.json',
                          metadata=builddir / 'metadata.json', indexer=INDEXER,
                          scope='Automated fixture; not a kernel index',
                          tu=[root / t for t in (tus or ['process.c', 'other.c', 'broken.c', 'skipped.c'])]))


@pytest.fixture
def indexed(tmp_path):
    if not INDEXER.exists():
        pytest.fail('Build the native indexer before running tests')
    root = tmp_path / 'source'
    shutil.copytree(REPO / 'fixtures/process', root)
    builddir = tmp_path / 'commands'
    fixture(root, builddir, 'clang')
    output = tmp_path / 'index.sqlite'
    build(root, output, builddir)
    with TestClient(create_app(output), base_url='http://localhost') as client:
        yield client, root, output, builddir


def symbol(client, name):
    return next(s for s in client.get('/api/symbols', params={'q': name}).json() if s['name'] == name)


def test_direct_call_exact_evidence_and_duplicate_static_identity(indexed):
    client, root, _, _ = indexed
    helpers = client.get('/api/symbols', params={'q': 'helper'}).json()
    assert len(helpers) == 2 and helpers[0]['id'] != helpers[1]['id']
    caller = symbol(client, 'allocate_pid')
    result = client.get('/api/neighborhood', params={'id': caller['id'], 'kind': 'direct_call', 'direction': 'outgoing'}).json()
    assert len(result['edges']) == 1
    edge = result['edges'][0]
    assert edge['target_name'] == 'helper' and edge['resolution'] == 'compiler_resolved'
    line = (root / edge['file']).read_text().splitlines()[edge['line'] - 1]
    assert line[edge['column']-1:].startswith('helper(seed)')
    source = client.get('/api/source', params={'file': edge['file'], 'line': edge['line']}).json()
    assert source['lines'][edge['line'] - source['start']] == line


def test_header_declarations_merge_and_definitions_remain(indexed):
    client, _, _, _ = indexed
    assert len(client.get('/api/symbols', params={'q': 'allocate_pid'}).json()) == 1
    item = symbol(client, 'allocate_pid')
    locs = client.get('/api/symbol', params={'id': item['id']}).json()['locations']
    assert locs[0]['is_definition'] == 1
    assert {l['tu'] for l in locs if l['file'] == 'process.h'} == {'process.c', 'other.c', 'broken.c'}


def test_macro_and_indirect_calls(indexed):
    client, _, _, _ = indexed
    s = symbol(client, 'spawn_task')
    edges = client.get('/api/neighborhood', params={'id': s['id'], 'direction': 'outgoing'}).json()['edges']
    indirect = [e for e in edges if e['kind'] == 'indirect_call']
    assert len(indirect) == 2
    assert all(e['target_id'] is None and e['resolution'] == 'unresolved' for e in indirect)
    macro = next(e for e in edges if e['kind'] == 'direct_call' and e['target_name'] == 'allocate_pid')
    assert (macro['file'], macro['line']) == ('process.c', 7)
    assert (macro['spelling_file'], macro['spelling_line']) == ('process.h', 9)


def test_failed_provenance_and_coverage(indexed):
    client, _, _, _ = indexed
    dataset = client.get('/api/dataset').json()
    assert {t['path']: t['status'] for t in dataset['coverage']} == {
        'process.c': 'successful', 'other.c': 'successful', 'broken.c': 'partial', 'skipped.c': 'skipped'}
    assert dataset['diagnostics'] and all('\x00' not in d['message'] for d in dataset['diagnostics'])
    retained = symbol(client, 'retained_fact')
    assert retained['status'] == 'partial'
    edges = client.get('/api/neighborhood', params={'id': retained['id']}).json()['edges']
    assert all(e['status'] == 'partial' for e in edges)


def test_declared_type(indexed):
    client, _, _, _ = indexed
    s = symbol(client, 'task_t')
    edges = client.get('/api/neighborhood', params={'id': s['id'], 'kind': 'declared_type'}).json()['edges']
    assert any(e['source_name'] == 'task_t' and e['target_name'] == 'task' for e in edges)


def test_pagination_filters_and_query_values(indexed):
    client, _, _, _ = indexed
    assert client.get('/api/symbols', params={'q': "' OR 1=1 --"}).json() == []
    assert client.get('/api/symbols', params={'path': 'other.c', 'q': 'helper'}).json()[0]['file'] == 'other.c'
    s = symbol(client, 'spawn_task')
    first = client.get('/api/neighborhood', params={'id': s['id'], 'limit': 2}).json()
    second = client.get('/api/neighborhood', params={'id': s['id'], 'limit': 2, 'offset': first['next_offset']}).json()
    assert len(first['edges']) == 2 and {e['id'] for e in first['edges']}.isdisjoint(e['id'] for e in second['edges'])
    assert client.get('/api/neighborhood', params={'id': s['id'], 'limit': 1000}).status_code == 422


@pytest.mark.parametrize('file', ['../secret', '/etc/passwd', 'a/../../secret', 'a\\secret'])
def test_source_escape_denied(indexed, file):
    client, _, _, _ = indexed
    assert client.get('/api/source', params={'file': file}).status_code == 403


def test_symlink_source_change_and_excerpt_bounds(indexed):
    client, root, _, _ = indexed
    source = root / 'process.c'
    original = source.read_text()
    source.write_text(original + '\n/* modified */\n')
    assert client.get('/api/source', params={'file': 'process.c'}).status_code == 409
    source.unlink()
    source.symlink_to(root / 'other.c')
    assert client.get('/api/source', params={'file': 'process.c'}).status_code == 403
    assert client.get('/api/source', params={'file': 'other.c', 'after': 201}).status_code == 422
    assert client.get('/api/source', params={'file': 'other.c', 'line': 9000}).status_code == 416


def test_origins_hosts_and_dataset_guards(indexed):
    client, _, _, _ = indexed
    assert client.get('/api/dataset', headers={'Origin': 'https://attacker.example'}).status_code == 403
    assert client.get('/api/dataset', headers={'Host': 'attacker.example'}).status_code == 400
    assert client.get('/api/symbols', headers={'X-KSE-Dataset': 'wrong'}).status_code == 409


def test_config_changes_isolate_dataset_and_conditional_calls(indexed):
    client, root, output, builddir = indexed
    old_id = client.get('/api/dataset').json()['metadata']['dataset_id']
    commands = json.loads((builddir / 'compile_commands.json').read_text())
    for command in commands:
        command['arguments'].remove('-DENABLE_AUDIT=1')
    (builddir / 'compile_commands.json').write_text(json.dumps(commands))
    meta = json.loads((builddir / 'metadata.json').read_text()); meta['configuration'] = 'ENABLE_AUDIT unset\n'
    (builddir / 'metadata.json').write_text(json.dumps(meta))
    build(root, output, builddir)
    assert client.get('/api/dataset').json()['metadata']['dataset_id'] != old_id
    assert client.get('/api/symbols', headers={'X-KSE-Dataset': old_id}).status_code == 409
    s = symbol(client, 'spawn_task')
    edges = client.get('/api/neighborhood', params={'id': s['id'], 'kind': 'direct_call', 'direction': 'outgoing'}).json()['edges']
    assert [e['target_name'] for e in edges] == ['allocate_pid']


def test_atomic_failed_rebuild_preserves_index(indexed):
    client, root, output, builddir = indexed
    before = output.read_bytes()
    with pytest.raises(FileNotFoundError):
        index(SimpleNamespace(root=root, output=output, compdb=builddir / 'compile_commands.json',
                              metadata=builddir / 'metadata.json', indexer=root / 'missing', scope='test', tu=[root / 'process.c']))
    assert output.read_bytes() == before
    assert not list(output.parent.glob('*.tmp'))
    with sqlite3.connect(output) as db:
        assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'


def test_portable_export_and_hash_checked_relocation(indexed, tmp_path):
    import subprocess
    import sys
    client, _, output, _ = indexed
    original_id = client.get('/api/dataset').json()['metadata']['dataset_id']
    exported = tmp_path / 'exported'
    subprocess.run([sys.executable, str(REPO / 'scripts/export_dataset.py'), str(output), str(exported)], check=True)
    moved = tmp_path / 'moved'
    exported.rename(moved)
    subprocess.run([sys.executable, str(REPO / 'scripts/relocate_dataset.py'), str(moved / 'index.sqlite'), str(moved / 'source')], check=True)
    with TestClient(create_app(moved / 'index.sqlite'), base_url='http://localhost') as reader:
        assert reader.get('/api/dataset').json()['metadata']['dataset_id'] == original_id
        assert reader.get('/api/source', params={'file': 'process.c'}).status_code == 200
    (moved / 'source/process.c').write_text('changed\n')
    failed = subprocess.run([sys.executable, str(REPO / 'scripts/relocate_dataset.py'), str(moved / 'index.sqlite'), str(moved / 'source')], capture_output=True)
    assert failed.returncode != 0
