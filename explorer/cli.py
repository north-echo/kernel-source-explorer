"""Explicit indexing operations. No compilation commands are executed by the web service."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import sqlite3
import shutil
import subprocess
from types import SimpleNamespace
import tempfile
import time
from datetime import datetime, timezone

SCHEMA_VERSION = 1


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def file_hash(path: Path) -> str:
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def fixture(root: Path, output: Path, compiler: str):
    if compiler == 'clang' and not shutil.which(compiler):
        compiler = shutil.which('clang-22') or shutil.which('clang-23') or compiler
    root = root.resolve()
    output.mkdir(parents=True, exist_ok=True)
    entries = [dict(directory=str(root), file=str(root / name),
                    arguments=[compiler, '-std=gnu11', '-DENABLE_AUDIT=1', '-I' + str(root), '-c', str(root / name)])
               for name in ['process.c', 'other.c', 'broken.c']]
    (output / 'compile_commands.json').write_text(json.dumps(entries, indent=2) + '\n')
    triple = subprocess.check_output([compiler, '-dumpmachine'], text=True).strip()
    metadata = dict(kind='fixture', release='process-fixture-v1', revision='fixture-v1',
                    architecture=triple.split('-')[0], compiler_target=triple,
                    compiler_version=subprocess.check_output([compiler, '--version'], text=True).strip(), configuration='ENABLE_AUDIT=1\n',
                    provenance={'origin': 'repository fixtures/process', 'verification': 'local fixture; not kernel source'})
    (output / 'metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')


def run_native(command):
    # wait4 reports this child alone, rather than the cumulative maximum of prior TUs.
    with tempfile.TemporaryFile() as stdout, tempfile.TemporaryFile() as stderr:
        process = subprocess.Popen(command, stdout=stdout, stderr=stderr)
        _, status, usage = os.wait4(process.pid, 0)
        process.returncode = os.waitstatus_to_exitcode(status)
        stdout.seek(0)
        stderr.seek(0)
        return SimpleNamespace(returncode=process.returncode,
                               stdout=stdout.read().decode('utf-8', errors='replace'),
                               stderr=stderr.read().decode('utf-8', errors='replace'),
                               peak_rss_bytes=int(usage.ru_maxrss * (1 if platform.system() == 'Darwin' else 1024)))


def index(args):
    root, compdb = args.root.resolve(), args.compdb.resolve()
    if compdb.name != 'compile_commands.json':
        raise ValueError('LibTooling requires a file named compile_commands.json; hash and load the same file')
    if not root.is_dir():
        raise ValueError('Dataset root must be a directory')
    metadata = json.loads(args.metadata.read_text())
    for key in ['kind', 'release', 'revision', 'architecture', 'configuration', 'provenance']:
        if not metadata.get(key):
            raise ValueError(f'Missing dataset metadata: {key}')
    if metadata['kind'] == 'kernel' and (metadata['release'] != '7.2.11' or len(metadata['revision']) != 40):
        raise ValueError('Initial kernel dataset requires release 7.2.11 and a full commit ID')
    raw_compdb = compdb.read_bytes()
    commands = json.loads(raw_compdb)
    by_file = {}
    for command in commands:
        directory = Path(command['directory']).resolve()
        path = Path(command['file'])
        path = (directory / path).resolve() if not path.is_absolute() else path.resolve()
        by_file.setdefault(path, []).append(command)
    requested = list(dict.fromkeys(p.resolve() for p in args.tu))
    for path in requested:
        if not path.is_relative_to(root):
            raise ValueError(f'Translation unit outside dataset root: {path}')
        if len(by_file.get(path, [])) > 1:
            raise ValueError(f'Ambiguous compilation commands for {path}; select one explicitly in a dedicated database')
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=output.name + '.', suffix='.tmp', dir=output.parent)
    os.close(fd)
    started = time.monotonic()
    try:
        with sqlite3.connect(name) as db:
            db.executescript(Path(__file__).with_name('schema.sql').read_text())
            files = {}

            def location(loc):
                if not loc or not loc.get('file'):
                    return None
                path = Path(loc['file']).resolve()
                if not path.is_relative_to(root) or not path.is_file():
                    return None
                relative = path.relative_to(root).as_posix()
                if relative not in files:
                    files[relative] = file_hash(path)
                    db.execute('INSERT INTO files VALUES (?,?)', (relative, files[relative]))
                return relative, loc['line'], loc['column']

            versions = set()
            for path in requested:
                command = by_file.get(path, [])
                if not command:
                    db.execute('INSERT INTO translation_units(path,status,elapsed_seconds,reason) VALUES (?,?,?,?)',
                               (str(path.relative_to(root)), 'skipped', 0, 'No compilation database entry'))
                    continue
                before = time.monotonic()
                result = run_native([str(args.indexer.resolve()), '-p', str(compdb.parent), '--root', str(root), str(path)])
                elapsed = time.monotonic() - before
                try:
                    facts = json.loads(result.stdout)
                except json.JSONDecodeError:
                    facts = dict(success=False, symbols=[], locations=[], edges=[], diagnostics=[
                        dict(severity='error', message='Indexer did not return JSON: ' + result.stderr[-8000:])])
                if facts.get('version'):
                    versions.add(facts['version'])
                status = 'successful' if result.returncode == 0 and facts['success'] else 'partial' if facts['locations'] else 'failed'
                tu_id = db.execute('INSERT INTO translation_units(path,status,command_json,elapsed_seconds,peak_rss_bytes,reason) VALUES (?,?,?,?,?,?)',
                                   (str(path.relative_to(root)), status, json.dumps(command[0]), elapsed, result.peak_rss_bytes,
                                    result.stderr[-8000:] or None)).lastrowid
                for diag in facts['diagnostics']:
                    loc = location(diag)
                    db.execute('INSERT INTO diagnostics(tu_id,severity,message,file,line,column) VALUES (?,?,?,?,?,?)',
                               (tu_id, diag['severity'], diag['message'], *(loc or (None, None, None))))
                for symbol in facts['symbols']:
                    db.execute('INSERT OR IGNORE INTO symbols VALUES (?,?,?)', (symbol['id'], symbol['name'], symbol['kind']))
                for loc in facts['locations']:
                    expansion, spelling = location(loc['expansion']), location(loc['spelling'])
                    if expansion:
                        db.execute('INSERT OR IGNORE INTO locations(symbol_id,tu_id,is_definition,file,line,column,spelling_file,spelling_line,spelling_column) VALUES (?,?,?,?,?,?,?,?,?)',
                                   (loc['symbol'], tu_id, int(loc['definition']), *expansion, *(spelling or (None, None, None))))
                for edge in facts['edges']:
                    expansion, spelling = location(edge['expansion']), location(edge['spelling'])
                    if expansion:
                        db.execute('INSERT OR IGNORE INTO relationships(source_id,target_id,tu_id,kind,resolution,file,line,column,spelling_file,spelling_line,spelling_column) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
                                   (edge['source'], edge['target'], tu_id, edge['kind'], edge['resolution'], *expansion, *(spelling or (None, None, None))))
            # Identity includes source contents and requested scope as well as build inputs.
            identity = dict(revision=metadata['revision'], architecture=metadata['architecture'],
                            configuration_hash=digest(metadata['configuration'].encode()),
                            compilation_database_hash=digest(raw_compdb), files=files, schema_version=SCHEMA_VERSION,
                            indexer_sha256=file_hash(args.indexer.resolve()), clang_versions=sorted(versions),
                            scope=[str(p.relative_to(root)) for p in requested])
            metadata.update(identity)
            metadata.update(dataset_id=digest(json.dumps(identity, sort_keys=True).encode()), root=str(root),
                            schema_version=SCHEMA_VERSION, created_at=datetime.now(timezone.utc).isoformat(),
                            indexer_version='0.1.0', clang_versions=sorted(versions),
                            indexer_sha256=file_hash(args.indexer.resolve()),
                            elapsed_seconds=time.monotonic() - started, scope_label=args.scope,
                            peak_rss_bytes=db.execute('SELECT max(peak_rss_bytes) FROM translation_units').fetchone()[0])
            for key, value in metadata.items():
                db.execute('INSERT INTO metadata VALUES (?,?)', (key, json.dumps(value)))
            db.commit()
            report = dict(dataset_id=metadata['dataset_id'], elapsed_seconds=metadata['elapsed_seconds'],
                          translation_units=dict(db.execute('SELECT status,count(*) FROM translation_units GROUP BY status')),
                          peak_rss_bytes=metadata['peak_rss_bytes'],
                          symbols=db.execute('SELECT count(*) FROM symbols').fetchone()[0],
                          relationships=db.execute('SELECT count(*) FROM relationships').fetchone()[0])
        # Full replacement in the same directory; readers retain their old snapshot.
        with open(name, 'rb') as f:
            os.fsync(f.fileno())
        os.replace(name, output)
        report['database_bytes'] = output.stat().st_size
        print(json.dumps(report, indent=2))
    finally:
        if os.path.exists(name):
            os.unlink(name)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='operation', required=True)
    fixture_parser = sub.add_parser('fixture')
    fixture_parser.add_argument('--root', type=Path, default=Path('fixtures/process'))
    fixture_parser.add_argument('--output', type=Path, default=Path('data/fixture-build'))
    fixture_parser.add_argument('--compiler', default='clang')
    idx = sub.add_parser('index')
    idx.add_argument('--root', type=Path, required=True)
    idx.add_argument('--compdb', type=Path, required=True)
    idx.add_argument('--metadata', type=Path, required=True)
    idx.add_argument('--output', type=Path, required=True)
    idx.add_argument('--indexer', type=Path, default=Path('build/indexer/kse-index'))
    idx.add_argument('--scope', required=True)
    idx.add_argument('--tu', type=Path, action='append', required=True)
    args = parser.parse_args()
    if args.operation == 'fixture':
        fixture(args.root, args.output, args.compiler)
    else:
        index(args)


if __name__ == '__main__':
    main()
