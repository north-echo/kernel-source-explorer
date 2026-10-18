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

## Optional: isolation translation units

The default preparation above is the `process-lifecycle` profile and is unchanged. Two further profiles add the units a containment reading needs: the open path, the LSM framework, Landlock, SELinux and seccomp.

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

TUS=$(python3 -c 'import json, sys; print(" ".join("--tu " + sys.argv[2] + "/" + t for t in json.load(open(sys.argv[1]))["requested_translation_units"]))' \
  "$HOME/kse/prepared-all/metadata.json" "$HOME/kse/linux-7.2.11-all")
python3 -m explorer.cli index \
  --root "$HOME/kse/linux-7.2.11-all" \
  --compdb "$HOME/kse/prepared-all/compile_commands.json" \
  --metadata "$HOME/kse/prepared-all/metadata.json" \
  --indexer build/indexer/kse-index \
  --output "$HOME/kse/learning-all.sqlite" \
  --scope 'Linux 7.2.11 <arch> defconfig + isolation fragment: process-lifecycle and isolation translation units; partial kernel coverage' \
  $TUS
```

`--tu` remains available for an explicit list instead of a profile; requesting another architecture's seccomp entry unit is rejected. The existing learning checkpoints are unaffected: they resolve against the process-lifecycle units, which `all` also contains.

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
