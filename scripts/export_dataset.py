#!/usr/bin/env python3
"""Copy a read-only index and its recorded source files for browsing on another host."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import sqlite3


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('index', type=Path)
    p.add_argument('destination', type=Path)
    a = p.parse_args()
    destination = a.destination.resolve()
    if destination.exists():
        p.error('Destination must not exist; export into a fresh directory')
    with sqlite3.connect(a.index.resolve().as_uri() + '?mode=ro', uri=True) as db:
        db.execute('BEGIN')
        root = Path(json.loads(db.execute("SELECT value FROM metadata WHERE key='root'").fetchone()[0])).resolve()
        destination.mkdir(parents=True)
        for path, expected in db.execute('SELECT path,sha256 FROM files'):
            rel = PurePosixPath(path)
            source = (root / path).resolve()
            if rel.is_absolute() or '..' in rel.parts or not source.is_relative_to(root):
                raise ValueError('Invalid source path in index')
            data = source.read_bytes()
            if hashlib.sha256(data).hexdigest() != expected:
                raise ValueError(f'Source changed since indexing: {path}')
            target = destination / 'source' / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        with sqlite3.connect(destination / 'index.sqlite') as target:
            db.backup(target)
            target.execute("UPDATE metadata SET value=? WHERE key='root'", (json.dumps(str(destination / 'source')),))
    print(destination / 'index.sqlite')


if __name__ == '__main__':
    main()
