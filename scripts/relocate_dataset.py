#!/usr/bin/env python3
"""Register a moved source snapshot after checking every indexed file hash."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import sqlite3


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('index', type=Path)
    p.add_argument('source_root', type=Path)
    a = p.parse_args()
    root = a.source_root.resolve(strict=True)
    with sqlite3.connect(a.index) as db:
        for path, expected in db.execute('SELECT path,sha256 FROM files'):
            rel = PurePosixPath(path)
            source = (root / path).resolve(strict=True)
            if rel.is_absolute() or '..' in rel.parts or not source.is_relative_to(root):
                raise ValueError('Invalid source path')
            if hashlib.sha256(source.read_bytes()).hexdigest() != expected:
                raise ValueError(f'Source hash mismatch: {path}')
        db.execute("UPDATE metadata SET value=? WHERE key='root'", (json.dumps(str(root)),))
    print('Verified and registered:', root)


if __name__ == '__main__':
    main()
