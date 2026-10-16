#!/usr/bin/env python3
"""Export the manually source-reviewed v7.2.11 process-creation trail for this dataset."""
import argparse
import json
from pathlib import Path
import sqlite3

# These are separate calls from copy_process, not an asserted linear call chain.
REVIEWED = [
    ('kernel_clone', 'copy_process', 2752, 'kernel_clone requests creation of the child task via copy_process.'),
    ('copy_process', 'dup_task_struct', 2115, 'Task-structure duplication. Return to copy_process for the next checkpoint.'),
    ('copy_process', 'copy_creds', 2156, 'Credential setup is a separate call in copy_process; inspect its failure handling.'),
    ('copy_process', 'alloc_pid', 2308, 'PID allocation occurs under the pid != &init_struct_pid condition.'),
]


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('index', type=Path)
    p.add_argument('output', type=Path)
    a = p.parse_args()
    with sqlite3.connect(a.index.resolve().as_uri() + '?mode=ro', uri=True) as db:
        db.row_factory = sqlite3.Row
        metadata = {r['key']: json.loads(r['value']) for r in db.execute('SELECT * FROM metadata')}
        if metadata['release'] != '7.2.11' or metadata['revision'] != 'a2de78ee6ed8bf8cd99d177c74865a6e8c3cb6ea':
            raise ValueError('This manually reviewed trail is specific to the pinned 7.2.11 revision')
        steps = []
        for caller, callee, line, note in REVIEWED:
            edge = db.execute('''SELECT r.*,s.name FROM relationships r JOIN symbols s ON s.id=r.source_id
                JOIN symbols t ON t.id=r.target_id JOIN translation_units u ON u.id=r.tu_id
                WHERE s.name=? AND t.name=? AND r.kind='direct_call' AND r.resolution='compiler_resolved'
                AND r.file='kernel/fork.c' AND r.line=? AND u.path='kernel/fork.c' AND u.status='successful' ''',
                              (caller, callee, line)).fetchone()
            if not edge:
                raise ValueError(f'Missing successful compiler evidence for {caller} -> {callee}:{line}')
            path = Path(metadata['root']) / edge['file']
            text = path.read_text().splitlines()[line - 1]
            if not text[edge['column'] - 1:].startswith(callee + '('):
                raise ValueError('Source does not match reviewed call-site token')
            steps.append(dict(symbol=edge['source_id'], name=caller,
                              location=dict(file=edge['file'], line=line, column=edge['column']), note=note))
        trail = dict(version=1, dataset_id=metadata['dataset_id'], revision=metadata['revision'],
                     name='Process creation: reviewed checkpoints', steps=steps)
        a.output.parent.mkdir(parents=True, exist_ok=True)
        a.output.write_text(json.dumps(trail, indent=2) + '\n')
        print(a.output)


if __name__ == '__main__':
    main()
