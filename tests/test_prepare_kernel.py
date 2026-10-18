"""Translation-unit and configuration selection for scripts/prepare_kernel.py. No kernel or LLVM needed."""
import importlib.util
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace

import pytest

REPO = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('prepare_kernel', REPO / 'scripts/prepare_kernel.py')
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)

DEFAULT = ['kernel/fork.c', 'kernel/pid.c', 'kernel/cred.c', 'kernel/exit.c', 'kernel/sys.c', 'fs/exec.c', 'fs/file.c']


@pytest.mark.parametrize('arch', ['arm64', 'x86'])
def test_default_preparation_is_unchanged(arch, tmp_path):
    tus = prepare.select_tus(arch)
    assert tus == DEFAULT
    assert prepare.select_tus(arch, 'process-lifecycle') == DEFAULT
    assert prepare.config_fragment(tus) == []
    assert prepare.generator_dirs(tmp_path, tus) == [tmp_path / 'kernel', tmp_path / 'fs']


@pytest.mark.parametrize('arch, entry', [('arm64', 'arch/arm64/kernel/ptrace.c'), ('x86', 'arch/x86/entry/syscall_64.c')])
def test_isolation_profile_uses_the_native_seccomp_entry(arch, entry, tmp_path):
    tus = prepare.select_tus(arch, 'isolation')
    assert entry in tus and len(set(tus)) == len(tus)
    assert {'fs/open.c', 'security/security.c', 'security/landlock/fs.c', 'security/selinux/hooks.c', 'kernel/seccomp.c'} <= set(tus)
    assert not set(DEFAULT) & set(tus)
    assert 'SECURITY_LANDLOCK' in prepare.config_fragment(tus)
    dirs = prepare.generator_dirs(tmp_path, tus)
    assert tmp_path / 'security' in dirs and tmp_path.joinpath(*Path(entry).parts[:2]) in dirs
    assert tmp_path / 'arch' not in dirs


def test_all_profile_is_both_without_duplicates():
    tus = prepare.select_tus('x86', 'all')
    assert tus[:7] == DEFAULT and tus[7:] == prepare.select_tus('x86', 'isolation')


def test_explicit_units_are_deduplicated_and_checked_against_the_architecture():
    assert prepare.select_tus('x86', tus=['fs/open.c', 'fs/open.c', 'kernel/fork.c']) == ['fs/open.c', 'kernel/fork.c']
    assert prepare.config_fragment(['kernel/fork.c']) == []
    assert prepare.config_fragment(['kernel/fork.c', 'fs/open.c']) == prepare.ISOLATION_CONFIG
    with pytest.raises(ValueError, match='arch/x86/entry/syscall_64.c'):
        prepare.select_tus('x86', tus=['arch/arm64/kernel/ptrace.c'])


def test_every_selectable_unit_is_a_known_choice():
    known = set(prepare.known_tus())
    for arch in prepare.SECCOMP_ENTRY:
        for profile in prepare.PROFILES:
            assert set(prepare.select_tus(arch, profile)) <= known


def test_missing_config_reports_options_left_disabled():
    config = 'CONFIG_SECURITY=y\n# CONFIG_SECURITY_LANDLOCK is not set\nCONFIG_SECCOMP=m\n'
    assert prepare.missing_config(config, ['SECURITY', 'SECURITY_LANDLOCK', 'SECCOMP']) == ['SECURITY_LANDLOCK', 'SECCOMP']
    assert prepare.missing_config(config, []) == []


@pytest.fixture
def preparation_run(tmp_path, monkeypatch):
    """Run the real CLI orchestration with simulated external tools, not a kernel build."""
    source = tmp_path / 'kernel source'
    output = tmp_path / 'prepared'
    generator = source / 'scripts/clang-tools/gen_compile_commands.py'
    generator.parent.mkdir(parents=True)
    generator.write_text('# inspected generator marker: saved)?cmd_\n')
    state = SimpleNamespace(source=source, output=output, commands=[],
                            valid_signature=True, rejected_option=None)
    records = [dict(directory=str(source), file=str(source / tu),
                    command=f'clang-22 -DKEEP_ORIGINAL=1 -c {tu} -o {tu[:-2]}.o')
               for tu in prepare.known_tus()]

    def check_output(command, **kwargs):
        assert kwargs['cwd'] == source
        if command[:2] == ['git', 'rev-parse']:
            value = prepare.REVISION if command[-1] == 'HEAD' else prepare.TAG_OBJECT
        elif command[:2] == ['git', 'status']:
            value = ''
        else:
            assert command == ['clang-22', '--version']
            value = 'simulated clang version 22'
        return value + '\n'

    def run(command, **kwargs):
        command = list(map(str, command))
        state.commands.append(command)
        if 'verify-tag' in command:
            assert kwargs['cwd'] == source
            assert kwargs['env']['GNUPGHOME'] == str(output / 'keyring')
            fingerprint = prepare.SIGNER if state.valid_signature else 'UNTRUSTED'
            return subprocess.CompletedProcess(command, 0, '',
                                               f'[GNUPG:] VALIDSIG {fingerprint}\n')
        assert kwargs['check'] is True
        if command[0] == 'make' and command[-1] == 'defconfig':
            (source / '.config').write_text('CONFIG_BASE=y\n')
        elif command[0] == str(source / 'scripts/config'):
            assert command[1:3] == ['--file', str(source / '.config')]
            with (source / '.config').open('a') as config:
                for flag, option in zip(command[3::2], command[4::2]):
                    assert flag == '--enable'
                    config.write(f'CONFIG_{option}=y\n')
        elif command[0] == 'make' and command[-1] == 'olddefconfig':
            if state.rejected_option:
                config = source / '.config'
                config.write_text(config.read_text().replace(
                    f'CONFIG_{state.rejected_option}=y\n', ''))
        elif command[:2] == ['python3', str(generator)]:
            Path(command[command.index('-o') + 1]).write_text(json.dumps(records))
        return subprocess.CompletedProcess(command, 0)

    def invoke(machine='x86_64', profile=None):
        monkeypatch.setattr(prepare.platform, 'system', lambda: 'Linux')
        monkeypatch.setattr(prepare.platform, 'machine', lambda: machine)
        monkeypatch.setattr(prepare.subprocess, 'check_output', check_output)
        monkeypatch.setattr(prepare.subprocess, 'run', run)
        argv = ['prepare_kernel.py', '--source', str(source), '--output', str(output)]
        if profile:
            argv += ['--profile', profile]
        monkeypatch.setattr(sys, 'argv', argv)
        prepare.main()

    state.invoke = invoke
    return state


@pytest.mark.parametrize('machine,arch', [('aarch64', 'arm64'), ('x86_64', 'x86')])
@pytest.mark.parametrize('profile', [None, 'all'])
def test_main_prepares_before_generating_and_records_realized_inputs(preparation_run, machine, arch, profile):
    state = preparation_run
    state.invoke(machine, profile)
    commands = state.commands
    verification = next(i for i, c in enumerate(commands) if 'verify-tag' in c)
    defconfig = next(i for i, c in enumerate(commands) if c[-1] == 'defconfig')
    prepare_step = next(i for i, c in enumerate(commands) if c[-1] == 'prepare')
    build = next(i for i, c in enumerate(commands) if c[0] == 'make' and c[-1].endswith('.o'))
    generator = next(i for i, c in enumerate(commands) if c[0] == 'python3')
    assert verification < defconfig < prepare_step < build < generator
    assert all(f'ARCH={arch}' in c and 'LLVM=-22' in c for c in commands if c[0] == 'make')
    expected = DEFAULT + (prepare.ISOLATION_TUS + [prepare.SECCOMP_ENTRY[arch]] if profile else [])
    assert [arg for arg in commands[build] if arg.endswith('.o')] == [tu[:-2] + '.o' for tu in expected]
    directories = [str(state.source / 'kernel'), str(state.source / 'fs')]
    if profile:
        directories += [str(state.source / 'security'), str(state.source / 'arch' / arch)]
    assert commands[generator][6:] == directories

    metadata = json.loads((state.output / 'metadata.json').read_text())
    config = (state.source / '.config').read_text()
    assert metadata['configuration'] == (state.output / 'kernel.config').read_text() == config
    assert metadata['requested_translation_units'] == expected
    assert metadata['architecture'] == arch
    assert metadata['revision'] == prepare.REVISION
    assert metadata['original_compilation_database_hash'] == hashlib.sha256(
        (state.output / 'compile_commands.original.json').read_bytes()).hexdigest()
    assert metadata['provenance']['signer_fingerprint'] == prepare.SIGNER
    assert metadata['provenance']['verification_output'] == (state.output / 'signature-verification.txt').read_text()
    records = json.loads((state.output / 'compile_commands.json').read_text())
    assert [str(Path(r['file']).relative_to(state.source)) for r in records] == expected
    original = json.loads((state.output / 'compile_commands.original.json').read_text())
    assert all(record in original for record in records)  # Preserve complete compiler inputs.
    if profile:
        config_step = next(i for i, c in enumerate(commands) if c[0].endswith('/scripts/config'))
        olddefconfig = next(i for i, c in enumerate(commands) if c[-1] == 'olddefconfig')
        assert defconfig < config_step < olddefconfig < prepare_step
        assert metadata['profile'] == 'all'
        assert metadata['configuration_fragment'] == [f'CONFIG_{o}=y' for o in prepare.ISOLATION_CONFIG]
        assert not prepare.missing_config(config, prepare.ISOLATION_CONFIG)
    else:
        assert not any(c[-1] == 'olddefconfig' or c[0].endswith('/scripts/config') for c in commands)
        assert 'profile' not in metadata and 'configuration_fragment' not in metadata
        assert config == 'CONFIG_BASE=y\n'


@pytest.mark.parametrize('failure', ['signature', 'configuration'])
def test_main_stops_before_building_or_publishing_unverified_inputs(preparation_run, failure):
    state = preparation_run
    if failure == 'signature':
        state.valid_signature = False
        message = 'signature did not verify'
    else:
        state.rejected_option = 'SECURITY_LANDLOCK'
        message = 'CONFIG_SECURITY_LANDLOCK'
    with pytest.raises(RuntimeError, match=message):
        state.invoke(profile='all')
    assert not any(c[-1] == 'prepare' or c[-1].endswith('.o') or c[0] == 'python3'
                   for c in state.commands)
    assert not (state.output / 'metadata.json').exists()
    assert not (state.output / 'compile_commands.json').exists()
    if failure == 'signature':
        assert not any(c[0] == 'make' for c in state.commands)


def test_documented_index_command_preserves_argument_boundaries(tmp_path, monkeypatch):
    # Execute the actual documented Python block with an indexer stand-in. This
    # verifies argv construction only; no source build or LLVM indexing occurs.
    workspace = tmp_path / 'workspace with spaces'
    prepared = workspace / 'prepared-all'
    prepared.mkdir(parents=True)
    tus = ['kernel/fork.c', 'security/landlock/fs.c']
    (prepared / 'metadata.json').write_text(json.dumps(dict(
        architecture='arm64', requested_translation_units=tus)))
    document = (REPO / 'docs/KERNEL.md').read_text()
    code = document.split('python3 - "$HOME/kse" <<\'PY\'\n', 1)[1].split('\nPY\n', 1)[0]
    monkeypatch.setattr(sys, 'argv', ['-', str(workspace)])
    calls = []
    monkeypatch.setattr(subprocess, 'run', lambda command, **kwargs: calls.append((command, kwargs)))
    exec(compile(code, 'docs/KERNEL.md:index-example', 'exec'), {})
    (command, kwargs), = calls
    assert kwargs == {'check': True}
    assert command[:4] == [sys.executable, '-m', 'explorer.cli', 'index']
    assert command[command.index('--root') + 1] == str(workspace / 'linux-7.2.11-all')
    assert command[command.index('--compdb') + 1] == str(prepared / 'compile_commands.json')
    assert command[command.index('--output') + 1] == str(workspace / 'learning-all.sqlite')
    assert '7.2.11 arm64' in command[command.index('--scope') + 1]
    assert command[command.index('--tu'):] == [
        arg for tu in tus for arg in ('--tu', str(workspace / 'linux-7.2.11-all' / tu))]
