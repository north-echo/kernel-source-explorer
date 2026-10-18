# Reproducing the bounded kernel index

## Pin and provenance

- Upstream: https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git
- Release tag: `v7.2.11`
- Signed tag object: `8316c24ec1b77dba19ba072ca4fe251b36dc65d3`
- Commit: `a2de78ee6ed8bf8cd99d177c74865a6e8c3cb6ea`
- Signing primary fingerprint: `647F28654894E3BD457199BE38DBBDC86092693E` (Greg Kroah-Hartman)

The preparation script obtains the release public key through kernel.org's Web Key Directory and requires a valid tag signature from this pinned primary fingerprint. The fingerprint is published in [kernel.org's signature documentation](https://www.kernel.org/signature.html). This uses upstream TLS/WKD plus the documented signing identity; it does not claim an independently established web of trust. Verification output is retained in the preparation directory and dataset metadata. The learning scope covers fork, PID/credentials, exit/wait, identity, exec, and descriptor-table handling.

## Linux preparation

Use a **case-sensitive Linux filesystem**, not a macOS shared source checkout. The observed macOS checkout had case-colliding netfilter paths. A Linux VM can build and index the source without booting the indexed kernel.

Tested environment: Ubuntu 26.04 arm64, 4 virtual CPUs, 6 GiB memory, LLVM 22.1.2, GNU host compiler 15.2.0, CMake 4.2.3. Preparation selects the native architecture (`arm64` on this host, `x86` on x86_64) and the standard `defconfig`. Only arm64 was validated.

```sh
sudo apt-get update
sudo apt-get install -y build-essential cmake clang-22 llvm-22-dev libclang-22-dev \
  libclang-cpp22-dev lld-22 python3 python3-venv flex bison libssl-dev libelf-dev bc git gnupg

# Run from this repository, with a writable Linux-native work directory.
mkdir -p "$HOME/kse"
python3 scripts/prepare_kernel.py \
  --source "$HOME/kse/linux-7.2.11" --output "$HOME/kse/prepared" --llvm-suffix=-22

cmake -S indexer -B build/indexer -DCMAKE_PREFIX_PATH=/usr/lib/llvm-22 -DCMAKE_BUILD_TYPE=Release
cmake --build build/indexer -j2

python3 -m explorer.cli index \
  --root "$HOME/kse/linux-7.2.11" \
  --compdb "$HOME/kse/prepared/compile_commands.json" \
  --metadata "$HOME/kse/prepared/metadata.json" \
  --indexer build/indexer/kse-index \
  --output "$HOME/kse/learning.sqlite" \
  --scope 'Linux 7.2.11 arm64 defconfig: 7 process-lifecycle translation units; partial kernel coverage' \
  --tu "$HOME/kse/linux-7.2.11/kernel/fork.c" \
  --tu "$HOME/kse/linux-7.2.11/kernel/pid.c" \
  --tu "$HOME/kse/linux-7.2.11/kernel/cred.c" \
  --tu "$HOME/kse/linux-7.2.11/kernel/exit.c" \
  --tu "$HOME/kse/linux-7.2.11/kernel/sys.c" \
  --tu "$HOME/kse/linux-7.2.11/fs/exec.c" \
  --tu "$HOME/kse/linux-7.2.11/fs/file.c"
```

Change the scope label appropriately on x86. The script checks the commit and signed tag, rejects tracked modifications, runs `defconfig`, `prepare`, and the seven object builds. It then invokes the pinned `scripts/clang-tools/gen_compile_commands.py` over the kernel and fs directories' actual `.cmd` files. The generator was inspected before selecting these commands: its positional inputs are directories, archives, or `modules.order`, rather than individual object files. Merely generating a compilation database would not prepare headers or command records.

`compile_commands.original.json` retains every discovered kernel command. `compile_commands.json` selects only the seven requested TUs. Original command strings are preserved, including target, include paths, defines, and compiler flags. No unsupported flags were omitted in the validated run. ClangTool applies its standard syntax-only, output-file and dependency-output adjusters; this changes indexing mode without fabricating compiler inputs.

The retained metadata includes full configuration contents and hash, upstream identity and signature result, compiler/indexer versions, indexer binary hash, compilation-database hash, scope, timing, and all translation-unit outcomes. Memory is the maximum per-child `wait4` peak RSS, not total memory for the CLI plus child; per-TU memory and time are also recorded. The full indexing elapsed time includes JSON ingestion and database construction.

<a id="optional-isolation-translation-units"></a>

## Optional: experimental isolation preparation

The default preparation above is the `process-lifecycle` profile and is unchanged. Two experimental preparation profiles add the open path, LSM framework, Landlock, SELinux and seccomp units. They do not change the active learning dataset or provide new reviewed checkpoints. Object builds and compilation-database selection were reported on x86_64 with Clang 18. A new separate arm64/LLVM 22 run built and indexed all 18 units without diagnostics and resolved all 14 existing checkpoints; [verification details and limits](PR3_VERIFICATION.md) distinguish this from runtime experiments and the active learning dataset.

| Profile | Translation units |
| --- | --- |
| `process-lifecycle` (default) | The seven above |
| `isolation` | `fs/open.c`, `fs/namei.c`, `security/security.c`, `kernel/seccomp.c`, `security/landlock/{fs,cred,ruleset,syscalls,task}.c`, `security/selinux/hooks.c`, plus the native seccomp entry unit: `arch/arm64/kernel/ptrace.c` on arm64, `arch/x86/entry/syscall_64.c` on x86 |
| `all` | Both, process-lifecycle first |

On x86, generic-entry `__secure_computing()` is called from an `__always_inline` function in `include/linux/entry-common.h`, so its expansion lives in `do_syscall_64()` in `arch/x86/entry/syscall_64.c`; `kernel/entry/syscall-common.c` no longer contains that call in 7.2.11. arm64 calls `secure_computing()` from its own `syscall_trace_enter()` in `arch/arm64/kernel/ptrace.c`.

`defconfig` does not build all of these, so when any non-default unit is requested the script enables `SECURITY`, `SECURITY_NETWORK`, `SECURITY_PATH`, `AUDIT`, `SECURITY_SELINUX`, `SECURITY_LANDLOCK`, `SECCOMP` and `SECCOMP_FILTER` with `scripts/config`, runs `olddefconfig`, and stops if any of them did not end up `=y`. The fragment is recorded in `metadata.json` (`profile`, `configuration_fragment`) together with the full resulting configuration; the default profile writes neither key, so its metadata is unchanged. The compilation-database generator also scans `security/` and the architecture directory when those units are requested.

Use a separate checkout and output directory, because the configuration differs from the default dataset's:

```sh
python3 scripts/prepare_kernel.py \
  --source "$HOME/kse/linux-7.2.11-all" --output "$HOME/kse/prepared-all" --llvm-suffix=-22 --profile all

# Pass each --tu as an argument; no shell word-splitting is required.
python3 - "$HOME/kse" <<'PY'
import json
from pathlib import Path
import subprocess
import sys

workspace = Path(sys.argv[1])
source = workspace / "linux-7.2.11-all"
prepared = workspace / "prepared-all"
metadata_path = prepared / "metadata.json"
metadata = json.loads(metadata_path.read_text())
command = [
    sys.executable, "-m", "explorer.cli", "index",
    "--root", str(source),
    "--compdb", str(prepared / "compile_commands.json"),
    "--metadata", str(metadata_path),
    "--indexer", "build/indexer/kse-index",
    "--output", str(workspace / "learning-all.sqlite"),
    "--scope", (
        f"Linux 7.2.11 {metadata['architecture']} defconfig + isolation fragment: "
        "process-lifecycle and isolation translation units; partial kernel coverage"
    ),
]
for tu in metadata["requested_translation_units"]:
    command.extend(["--tu", str(source / tu)])
subprocess.run(command, check=True)
PY
```

`--tu` remains available for an explicit list instead of a profile; requesting another architecture's seccomp entry unit is rejected. Existing checkpoints and the active dataset are unchanged by adding these preparation profiles. The `all` profile includes their process-lifecycle units, but that alone does not validate those checkpoints under the changed configuration.

Before adopting an expanded index, run the actual LLVM 22 LibTooling indexer over every requested unit, review all TU outcomes and diagnostics, and verify the existing guided checkpoints against the resulting dataset. Repeat these checks for a changed architecture, configuration, compiler or source revision. Keep the resulting database separate until those checks pass; a successful object build or mocked preparation test is not indexing validation. The example above does not select the new database for the running app.

## Fedora preparation

The separate Fedora 44 aarch64 verification uses VMware Fusion, two CPU cores and 6 GiB RAM. Its running kernel is **7.2.9-201.fc44.aarch64**; the source being prepared remains pinned **7.2.11**. SELinux is enforcing. [The verification report](PR3_VERIFICATION.md) records completed stages and remaining limits; installing development packages does not validate an index.

Install development packages through Fedora's package manager, then perform builds and experiments as a normal user:

```sh
sudo dnf install -y gcc gcc-c++ clang clang-devel llvm-devel lld cmake make \
  flex bison openssl-devel elfutils-libelf-devel bc git gnupg2 python3-pip

# In a separate Linux-native checkout of this repository:
python3 scripts/prepare_kernel.py \
  --source "$HOME/kse/linux-7.2.11-all" --output "$HOME/kse/prepared-all" \
  --llvm-suffix=-22 --profile all --jobs 2
cmake -S indexer -B build/indexer -DCMAKE_BUILD_TYPE=Release
cmake --build build/indexer -j1
```

The observed Fedora packages provide LLVM/Clang **22.1.8**, including the `-22` tool names used by the preparation script; CMake finds the installed LLVM and Clang configuration without Ubuntu's prefix. No tool aliases or unsupported-flag substitutions were needed. The complete expanded index passed separately on this Fedora toolchain; see its exact metrics and scope in the verification report. Use the metadata-driven indexing block above to request all selected units, with a separate output database. The initial 2 GiB VM allocation was heavily swapping; increase available memory before the expanded indexing run. These are observed requirements for this run, not a guarantee of a minimum allocation on every system.

The observed Fedora Btrfs-backed SQLite build spent long periods waiting for filesystem reservations during ingestion. For this verification, only the index output directory was moved to an owned `/tmp` directory (tmpfs); source, configuration, compiler commands, native binary and SQL behavior were unchanged. The index then completed in 137.36 seconds and was copied sequentially back to disk with byte-hash and SQLite-integrity checks. This is a measured workaround for this VM, not evidence of a general Btrfs defect or a production durability test. See [captured diagnostics](pr3-fedora-indexing-diagnosis.json). The upstream [Btrfs reservation helper](https://kernel.googlesource.com/pub/scm/linux/kernel/git/gclement/linux/+/9413cd7792dc03608ec9b1f1f5c74fc54e714ed3/fs/btrfs/space-info.c) documents the wait/flush role of `handle_reserve_ticket`; that separate source reference is not a reviewed Explorer checkpoint or an exact Fedora-kernel mapping.

If reproducing this workaround, first check available tmpfs space and RAM, create a fresh directory with `mktemp -d /tmp/kse-index.XXXXXX`, and use its `index.sqlite` path for the indexing command's `--output` argument. Keep the preparation/source paths on the Linux-native disk. Retain and verify a completed disk copy before relying on the result; tmpfs storage does not survive a reboot. Do not change mount options, disable copy-on-write or weaken host policy to reproduce the check.

## Move the browsing dataset to another host

Export the index and only its recorded source files, with content-hash verification:

```sh
python3 scripts/export_dataset.py "$HOME/kse/learning.sqlite" "$HOME/kse/learning-export"
```

Copy the complete export directory to the browsing machine, for example `data/learning`. Register the new source path only after checking every file:

```sh
python3 scripts/relocate_dataset.py data/learning/index.sqlite data/learning/source
python3 scripts/create_demo_trail.py data/learning/index.sqlite docs/process-creation-trail.json
KSE_INDEX="$PWD/data/learning/index.sqlite" make serve
```

Relocation preserves dataset identity and symbol IDs. The exported tree is a source snapshot for browsing; it is not a complete kernel checkout and cannot reproduce compilation by itself. Keep the Linux preparation directory, configuration, and full checkout to rebuild.

## Process-creation demonstration

The four checkpoints were manually checked against the pinned `kernel/fork.c`, then matched to successful compiler-resolved direct-call records:

| Caller | Callee | Expansion location |
| --- | --- | --- |
| `kernel_clone` | `copy_process` | `kernel/fork.c:2752` |
| `copy_process` | `dup_task_struct` | `kernel/fork.c:2115` |
| `copy_process` | `copy_creds` | `kernel/fork.c:2156` |
| `copy_process` | `alloc_pid` | `kernel/fork.c:2308` |

The last three calls are separate checkpoints inside `copy_process`, not a claim that `dup_task_struct` calls `copy_creds` or `alloc_pid`. The allocation call has a condition and error handling visible in the source. The demonstration script verifies the exact source tokens at the compiler-recorded columns before exporting the portable trail; it cannot create graph evidence.

## Local Lima environment used for validation

A dedicated `kse-linux` VM was created with `template:ubuntu-26.04`, 4 CPUs, 6 GiB RAM and a 30 GiB disk. Its writable home is `/home/lima.guest`. Existing VMs were not modified. The full kernel build root is `/home/lima.guest/kse/linux-7.2.11`, with preparation artifacts and the index alongside it. The host repository was read through Lima's default read-only home mount. The source was cloned into the guest's filesystem before building.

The VM was stopped after validation to release its memory; its files and compiler development packages remain available (`limactl start kse-linux` to resume it). The host received LLVM 23, CMake, Node 22 LTS and browser-test dependencies. Installing Node 22 updated a shared Homebrew library, so the existing Node 26 installation was repaired by reinstalling it (now 26.12.0). No global Node-version switch was made.
