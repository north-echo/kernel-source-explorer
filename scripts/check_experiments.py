#!/usr/bin/env python3
"""Compile and check the original finite experiments as an unprivileged Linux user."""
import argparse
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--compiler', default='cc')
    p.add_argument('--output', type=Path)
    a = p.parse_args()
    if platform.system() != 'Linux' or os.geteuid() == 0:
        p.error('Run as a normal unprivileged Linux user')
    checks = {
        'inherited_authority': [([], 'helper inherited descriptor=yes data=demo only\nparent descriptor still open=yes\n'),
                                (['--cloexec'], 'helper inherited descriptor=no\nparent descriptor still open=yes\n'),
                                (['--close-child'], 'helper inherited descriptor=no\nparent descriptor still open=yes\n')],
        'process_identity': [([], r'pid=\d+ parent=\d+\n')],
        'fork_variables': [([], 'child value=7\nparent value=42\n')],
        'fork_file_offset': [([], 'parent next byte=c\n')],
        'exit_wait': [([], 'waited for child=yes exit status=42\n')],
        'exec_identity': [([], r'before exec pid=(\d+) value=42\nafter exec pid=\1 value=7\n')],
    }
    results = []
    with tempfile.TemporaryDirectory(prefix='kse-experiments-') as work:
        for name, cases in checks.items():
            executable = Path(work) / name
            subprocess.run([a.compiler, '-std=c11', '-Wall', '-Wextra', '-Werror',
                            str(ROOT / 'explorer/experiments' / (name + '.c')), '-o', str(executable)], check=True, timeout=30)
            for arguments, expected in cases:
                result = subprocess.run([str(executable), *arguments], check=True, text=True, capture_output=True, timeout=5)
                if not re.fullmatch(expected, result.stdout):
                    raise AssertionError(f'{name} {arguments}: unexpected output {result.stdout!r}')
                results.append(dict(experiment=name, arguments=arguments, stdout=result.stdout, result='passed'))
    report = dict(system=platform.system(), running_kernel=platform.release(), architecture=platform.machine(),
                  effective_uid=os.geteuid(), compiler=subprocess.check_output([a.compiler, '--version'], text=True).splitlines()[0],
                  note='Execution on this host is distinct from compiler evidence for the indexed kernel version.', results=results)
    if a.output:
        a.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
