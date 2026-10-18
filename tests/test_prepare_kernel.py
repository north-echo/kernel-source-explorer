"""Translation-unit and configuration selection for scripts/prepare_kernel.py. No kernel or LLVM needed."""
import importlib.util
from pathlib import Path

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
