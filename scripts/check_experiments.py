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
import hashlib
import signal
from datetime import datetime, timezone

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
        'launcher_prepare': [([], 'prepared argument=hello env=worker omitted sentinel=absent\nworker cwd matches intended=yes outside demo readable=yes\nparent cwd unchanged=yes\n')],
        'supervise_child': [([], 'child ready=yes terminated=SIGTERM reaped=yes\n')],
        'seccomp_boundary': [([], 'getppid before=allowed after=EPERM getpid=allowed\n')],
    }
    results = []
    def inherited_usr1():
        # Only the test subprocess inherits these settings, never the caller/host.
        signal.signal(signal.SIGUSR1, signal.SIG_IGN)
        signal.pthread_sigmask(signal.SIG_BLOCK, {signal.SIGUSR1})

    with tempfile.TemporaryDirectory(prefix='kse-experiments-') as work:
        def execute(name, source, arguments, expected, case='canonical', failure=None, prepare=None):
            canonical = (ROOT / 'explorer/experiments' / (name + '.c')).read_text()
            path = Path(work) / (name + '.c')
            path.write_text(source)
            executable = Path(work) / name
            subprocess.run([a.compiler, '-std=c11', '-Wall', '-Wextra', '-Werror',
                            str(path), '-o', str(executable)], check=True, timeout=30)
            result = subprocess.run([str(executable), *arguments], text=True,
                                    capture_output=True, timeout=8, preexec_fn=prepare)
            if failure:
                if result.returncode == 0 or failure not in result.stderr:
                    raise AssertionError(f'{name} {case}: mutation was not detected: {result}')
            elif result.returncode != 0 or not re.fullmatch(expected, result.stdout):
                raise AssertionError(f'{name} {case}: unexpected result {result}')
            results.append(dict(source_sha256=hashlib.sha256(canonical.encode()).hexdigest(),
                                tested_source_sha256=hashlib.sha256(source.encode()).hexdigest(),
                                experiment=name, case=case, arguments=arguments, stdout=result.stdout,
                                stderr=result.stderr, exit_code=result.returncode, result='passed'))

        for name, cases in checks.items():
            source = (ROOT / 'explorer/experiments' / (name + '.c')).read_text()
            for arguments, expected in cases:
                execute(name, source, arguments, expected)
            expected = cases[0][1]
            if name == 'fork_variables':
                execute(name, source.replace('value = 7;', 'value = 99;'), [], expected.replace('=7', '=99'), 'variation-child-99')
            elif name == 'fork_file_offset':
                assert all(text in source for text in ['first[2]', 'count != 2', 'two regular-file bytes'])
                variant = source.replace('first[2]', 'first[1]').replace('count != 2', 'count != 1').replace('two regular-file bytes', 'one regular-file byte')
                execute(name, variant, [], expected.replace('byte=c', 'byte=b'), 'variation-one-byte')
            elif name == 'exit_wait':
                execute(name, source.replace('_exit(42)', '_exit(7)'), [], expected.replace('=42', '=7'), 'variation-exit-7')
            elif name == 'exec_identity':
                execute(name, source.replace('"after"', '"again"'), [], expected, 'variation-marker')
            elif name == 'process_identity':
                execute(name, source, [], expected, 'variation-second-observation')
            elif name == 'launcher_prepare':
                execute(name, source.replace('hello', 'goodbye'), [], expected.replace('hello', 'goodbye'), 'variation-argument')
                # An omitted chdir must cause an observed cwd disagreement, not a missing sentence.
                execute(name, source.replace('chdir(working)', '0'), [], '', 'mutation-no-chdir', 'worker cwd disagrees')
                inherited = source.replace('char *environment[] = {"DEMO_ROLE=worker", "PATH=/usr/bin:/bin", NULL};',
                                           'extern char **environ; char **environment = environ;')
                # Keep the included variable correct, so only the omitted sentinel detects copying environ.
                inherited = inherited.replace('setenv("KSE_OMITTED_SENTINEL", "parent-only", 1)',
                                               '(setenv("DEMO_ROLE", "worker", 1) == -1 ? -1 : setenv("KSE_OMITTED_SENTINEL", "parent-only", 1))')
                execute(name, inherited, [], '', 'mutation-inherited-environment', 'worker launch inputs disagree')
            elif name == 'supervise_child':
                execute(name, source.replace('SIGTERM', 'SIGUSR1'), [], expected.replace('SIGTERM', 'SIGUSR1'),
                        'variation-usr1-inherited-ignored-blocked', prepare=inherited_usr1)
            elif name == 'seccomp_boundary':
                variant = source.replace('getppid', 'getuid').replace("Zero is valid if the parent is outside this process's PID namespace.",
                                                                          'UID zero is valid; it must not be treated as a failed syscall.')
                execute(name, variant, [],
                        expected.replace('getppid', 'getuid'), 'variation-getuid')
                # Branch regression, not a claim of creating a PID/user namespace or running as root.
                for syscall in ['getppid', 'getuid']:
                    zero = source.replace('SYS_getppid', 'SYS_' + syscall).replace('getppid before', syscall + ' before')
                    zero = zero.replace('long before = syscall(SYS_' + syscall + ');', 'long before = 0; /* simulated valid baseline only */')
                    execute(name, zero, [], expected.replace('getppid', syscall), 'simulated-zero-' + syscall)
    # Optional actual PID-namespace baseline; refusal is reported without changing policy.
    try:
        probe = subprocess.run(['unshare', '--user', '--map-root-user', '--pid', '--fork',
                                'python3', '-c', 'import os; print(os.getppid())'],
                               capture_output=True, text=True, timeout=5)
        namespace_probe = dict(exit_code=probe.returncode, stdout=probe.stdout, stderr=probe.stderr,
                               observed_zero=probe.returncode == 0 and probe.stdout.strip() == '0')
    except (OSError, subprocess.TimeoutExpired) as error:
        namespace_probe = dict(unavailable=str(error), observed_zero=False)
    config_path = Path('/boot') / ('config-' + platform.release())
    try:
        config = dict(line.split('=', 1) for line in config_path.read_text().splitlines()
                      if line.startswith(('CONFIG_SECCOMP=', 'CONFIG_SECCOMP_FILTER=')))
    except OSError:
        config = {'availability': 'Not readable; successful filter installation is separate runtime evidence.'}
    distribution = platform.freedesktop_os_release()
    report = dict(executed_at=datetime.now(timezone.utc).isoformat(), pid_namespace_probe=namespace_probe, distribution={key: distribution.get(key) for key in ['ID', 'VERSION_ID']}, kernel_configuration=config, system=platform.system(), running_kernel=platform.release(), architecture=platform.machine(),
                  effective_uid=os.geteuid(), compiler=subprocess.check_output([a.compiler, '--version'], text=True).splitlines()[0],
                  mechanism_policy='Exit 77 or installation failure is a failed validation, never a successful seccomp test.',
                  note='Execution on this host is distinct from compiler evidence for the indexed kernel version.', results=results)
    if a.output:
        a.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
