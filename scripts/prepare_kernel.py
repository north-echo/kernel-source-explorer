#!/usr/bin/env python3
"""Prepare the inspected Linux 7.2.11 build. Run only on a case-sensitive Linux filesystem."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess

RELEASE = '7.2.11'
REVISION = 'a2de78ee6ed8bf8cd99d177c74865a6e8c3cb6ea'
TAG_OBJECT = '8316c24ec1b77dba19ba072ca4fe251b36dc65d3'
SIGNER = '647F28654894E3BD457199BE38DBBDC86092693E'
UPSTREAM = 'https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git'

PROCESS_TUS = ['kernel/fork.c', 'kernel/pid.c', 'kernel/cred.c', 'kernel/exit.c', 'kernel/sys.c', 'fs/exec.c', 'fs/file.c']
# Open path, LSM framework, Landlock, SELinux and seccomp: the units a containment reading needs.
ISOLATION_TUS = ['fs/open.c', 'fs/namei.c', 'security/security.c', 'kernel/seccomp.c',
                 'security/landlock/fs.c', 'security/landlock/cred.c', 'security/landlock/ruleset.c',
                 'security/landlock/syscalls.c', 'security/landlock/task.c', 'security/selinux/hooks.c']
# Where the syscall entry path invokes seccomp in the pinned source. arm64 calls it from its own
# ptrace.c. x86 uses the generic entry code, whose __secure_computing() call sits in an
# __always_inline function in include/linux/entry-common.h and is expanded into do_syscall_64().
SECCOMP_ENTRY = {'arm64': 'arch/arm64/kernel/ptrace.c', 'x86': 'arch/x86/entry/syscall_64.c'}
PROFILES = ('process-lifecycle', 'isolation', 'all')
# Options the isolation units need beyond defconfig. They are applied only when such a unit is
# requested, so the default process-lifecycle preparation keeps the plain defconfig of the
# validated dataset. SELinux additionally requires AUDIT, NET and INET; defconfig provides the last two.
ISOLATION_CONFIG = ['SECURITY', 'SECURITY_NETWORK', 'SECURITY_PATH', 'AUDIT',
                    'SECURITY_SELINUX', 'SECURITY_LANDLOCK', 'SECCOMP', 'SECCOMP_FILTER']


def run(command, **kwargs):
    print('+', ' '.join(map(str, command)), flush=True)
    return subprocess.run(list(map(str, command)), check=True, **kwargs)


def text(command, cwd):
    return subprocess.check_output(command, cwd=cwd, text=True).strip()


def known_tus():
    return PROCESS_TUS + ISOLATION_TUS + list(SECCOMP_ENTRY.values())


def select_tus(arch, profile=None, tus=None):
    """Return the ordered translation units for an explicit --tu list or a profile."""
    if tus:
        selected = list(dict.fromkeys(tus))
        foreign = [tu for tu in selected if tu in SECCOMP_ENTRY.values() and tu != SECCOMP_ENTRY[arch]]
        if foreign:
            raise ValueError(f'{", ".join(foreign)} is not the seccomp entry unit for {arch}; use {SECCOMP_ENTRY[arch]}')
        return selected
    isolation = ISOLATION_TUS + [SECCOMP_ENTRY[arch]]
    return {'process-lifecycle': PROCESS_TUS, 'isolation': isolation, 'all': PROCESS_TUS + isolation}[profile or 'process-lifecycle']


def config_fragment(tus):
    return ISOLATION_CONFIG if any(tu not in PROCESS_TUS for tu in tus) else []


def generator_dirs(source, tus):
    """Directories whose .cmd records the compilation-database generator must scan, in first-use order.
    The process-lifecycle default yields exactly kernel/ then fs/, as before."""
    def top(tu):
        parts = Path(tu).parts
        return source.joinpath(*parts[:2]) if parts[0] == 'arch' else source / parts[0]
    return list(dict.fromkeys(top(tu) for tu in tus))


def missing_config(config_text, fragment):
    enabled = {line.strip() for line in config_text.splitlines()}
    return [option for option in fragment if f'CONFIG_{option}=y' not in enabled]


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--llvm-suffix', default='-22')
    p.add_argument('--jobs', default='4')
    choice = p.add_mutually_exclusive_group()
    choice.add_argument('--profile', choices=PROFILES,
                        help='process-lifecycle (default): the seven validated units. isolation: open path, LSM framework, '
                             'Landlock, SELinux and seccomp, with the needed security options enabled. all: both.')
    choice.add_argument('--tu', action='append', choices=known_tus(),
                        help='Explicit units instead of a profile; repeat for each')
    a = p.parse_args()
    if platform.system() != 'Linux':
        p.error('Preparation requires Linux; macOS case-insensitive checkouts are not valid build roots')
    source, output = a.source.resolve(), a.output.resolve()
    if output.is_relative_to(source):
        p.error('Keep preparation metadata outside the source tree')
    arch = {'aarch64': 'arm64', 'x86_64': 'x86'}.get(platform.machine())
    if not arch:
        p.error('Supported initial build hosts: aarch64 and x86_64')
    try:
        tus = select_tus(arch, a.profile, a.tu)
    except ValueError as error:
        p.error(str(error))
    output.mkdir(parents=True, exist_ok=True)
    if not source.exists():
        run(['git', 'clone', '--depth', '1', '--branch', 'v' + RELEASE, UPSTREAM, source])
    if text(['git', 'rev-parse', 'HEAD'], source) != REVISION or text(['git', 'rev-parse', 'v' + RELEASE], source) != TAG_OBJECT:
        p.error('Source revision or signed tag object does not match the recorded upstream pin')
    if text(['git', 'status', '--porcelain', '--untracked-files=no'], source):
        p.error('Tracked kernel source is modified; use a clean checkout')
    keyring = output / 'keyring'
    keyring.mkdir(mode=0o700, exist_ok=True)
    os.chmod(keyring, 0o700)
    run(['gpg', '--homedir', keyring, '--batch', '--auto-key-locate', 'clear,wkd', '--locate-keys', 'gregkh@kernel.org'])
    env = dict(os.environ, GNUPGHOME=str(keyring))
    verify = subprocess.run(['git', '-c', 'gpg.program=gpg', 'verify-tag', '--raw', 'v' + RELEASE], cwd=source, env=env, text=True, capture_output=True)
    verification = verify.stdout + verify.stderr
    (output / 'signature-verification.txt').write_text(verification)
    valid = [line.split() for line in verification.splitlines() if '[GNUPG:] VALIDSIG ' in line]
    if verify.returncode or not any(SIGNER in (line[2], line[-1]) for line in valid):
        raise RuntimeError('Pinned release signature did not verify against the expected upstream signing fingerprint')
    # The inspected generator accepts directories, archives or modules.order, not individual .o files.
    # Build real object files first so .cmd records and generated headers exist.
    generator = source / 'scripts/clang-tools/gen_compile_commands.py'
    if not generator.is_file() or 'saved)?cmd_' not in generator.read_text():
        raise RuntimeError('Pinned compilation database tooling differs from the inspected implementation')
    fragment = config_fragment(tus)
    make = ['make', '-C', source, f'ARCH={arch}', f'LLVM={a.llvm_suffix}']
    run(make + ['defconfig'])
    if fragment:
        run([source / 'scripts/config', '--file', source / '.config'] + [arg for option in fragment for arg in ('--enable', option)])
        run(make + ['olddefconfig'])
        missing = missing_config((source / '.config').read_text(), fragment)
        if missing:
            raise RuntimeError('Kernel configuration did not enable: ' + ', '.join('CONFIG_' + m for m in missing))
    run(make + [f'-j{a.jobs}', 'prepare'])
    run(make + [f'-j{a.jobs}'] + [tu[:-2] + '.o' for tu in tus])
    original = output / 'compile_commands.original.json'
    run(['python3', generator, '-d', source, '-o', original, *generator_dirs(source, tus)])
    commands = json.loads(original.read_text())
    selected = [c for c in commands if str(Path(c['file']).relative_to(source)) in tus]
    if len(selected) != len(tus):
        raise RuntimeError('Missing or ambiguous kernel compilation commands')
    # Original Clang commands are preserved byte-for-byte in each selected command string.
    # LibTooling only removes output/dependency-generation flags through its standard adjusters.
    (output / 'compile_commands.json').write_text(json.dumps(selected, indent=2) + '\n')
    config = (source / '.config').read_text()
    (output / 'kernel.config').write_text(config)
    metadata = dict(kind='kernel', release=RELEASE, revision=REVISION, architecture=arch,
                    configuration=config, configuration_artifact=str(output / 'kernel.config'),
                    provenance=dict(origin=UPSTREAM, tag='v' + RELEASE, tag_object=TAG_OBJECT,
                                    verification='git verify-tag: valid signature with pinned upstream primary fingerprint',
                                    signer_fingerprint=SIGNER, verification_output=verification),
                    compiler_version=text(['clang' + a.llvm_suffix, '--version'], source),
                    original_compilation_database_hash=hashlib.sha256(original.read_bytes()).hexdigest(),
                    command_normalization='No substitutions or omitted unsupported flags. LibTooling standard syntax-only/output/dependency adjusters only.',
                    requested_translation_units=tus)
    if fragment:
        # Recorded only for non-default preparations, so the default metadata is unchanged.
        metadata.update(profile=a.profile or 'explicit', configuration_fragment=['CONFIG_' + o + '=y' for o in fragment])
    (output / 'metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print('Prepared. Index these explicit TUs:', *[str(source / tu) for tu in tus], sep='\n')


if __name__ == '__main__':
    main()
