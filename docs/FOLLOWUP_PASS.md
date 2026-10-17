# Focused teaching and reliability follow-up

Implemented and validated October 17, 2026. This pass builds on the existing uncommitted improvement work; nothing was committed, pushed, published or deployed. Both the original `KERNEL_EXPLORER_REVIEW.md` and `KERNEL_EXPLORER_FOLLOWUP_REVIEW.md` were read. The follow-up findings were checked against the implementation before edits. Existing contiguous paging, evidence anchors, quarantine/recovery, separate personal positions, diagrams and bounded compiler provenance were retained.

## Corrections

| Finding | Delivered change |
| --- | --- |
| F01, F08 | Tabs and segments navigate through activity URLs. Refresh, copied links and Back/Forward restore the displayed activity. Unsupported views/segments explain their fallback. Checkpoint URLs retain the originating activity, including its code segment; return does not change the explicitly saved lab. New activities focus and expose their heading. Revisits restore reading scroll within the open page, with explanation reveals retained in memory. Segment changes keep control focus instead of stealing it. |
| F02, F06 | The worker calls getcwd/stat and compares device/inode identity to the intended owned directory. It validates DEMO_ROLE and the absence of a parent-only sentinel. Reading an owned file outside cwd demonstrates remaining access. Omitting chdir or passing the inherited environment makes the program fail; tests check nonzero completion and observed disagreement diagnostics. |
| F03 | One 2 MiB UTF-8 byte contract and compact serialization cover parsing, file import, ordinary edits/saves, merges and valid exports. Final aggregate count/size validation occurs before replacement or backup. Invalid edits are rejected; quota failures preserve the prior stored record and allow valid in-memory work to be exported. Raw quarantine/backups remain downloadable even if they are not valid imports. |
| F04, F07 | Raw syscall failure is tested with == -1, admitting valid zero getppid and getuid results. Separate numbered aarch64/x86-64 filter tables and denied/allowed traces explain loads, comparisons, jumps, actions, offsetof, bit tests and length calculation. Calling-thread scope, no_new_privs/filter inheritance and absence of TSYNC are explicit. Architecture and x32 checks, installation failure and allowed controls remain intact. |
| F05 | Removed the repeated introduction recap from every chapter. The two existing distinct concept explanations remain, with 128 chapter/concept-specific assumptions replacing generic templates. There is no minimum-three-sections test or teaching-quality claim based on counts. Broad systems programming remains the organizing material; containment appears where it explains a concrete mechanism. |
| F09, F10 | Cleanup/variability guidance now describes each actual program. Runnable variations name all relevant changes and were executed. The SIGUSR1 variation changes disposition, mask preparation, kill, status check and report. Full hashes are in provenance details; optional @step navigation comments are explained. Walkthroughs add previous/next/copy-link controls and canonical brace context with explicit omitted-line markers. Repeated neighbor labels and definition-only graph wording are corrected. Touched complex frontend files were formatted, preserving the application architecture. |

## Teaching approach and Lab 001

Each of the nine investigations has three connected levels in every code segment: **What happens**, **How the code expresses it**, and optional **Why Linux behaves this way**. There are optional local prerequisites and a separate explanation of changing/removing the statement. Full program source and downloads remain canonical; segment bounds derive from the actual marker lines. Context is a display aid, not compiler evidence or a separately runnable snippet. It retains enclosing/neighboring brace pairs while marking gaps, and the complete view supplies every line.

Lab 001 introduces named storage and initialization in its header/variable segment. At the saved fork segment it introduces a function call and return value before unpacking, in order: `child_pid` as a variable, `pid_t` as its type, `fork()` as a call, the produced value, initialization with `=`, different parent/child results after the same call, then the branches. It explicitly says neither process restarts main. Copy-on-write is optional later detail.

The child segment explains assignment, function arguments, format placeholders, standard output and buffering before fflush/_exit. The parent segment explains why completion must be collected, integer storage and `&status`, the call's two outputs, interrupted waits and variant checking before short-circuit extraction. The learner can stop or change paths anywhere. Predictions and expected results remain separately revealable; no viewing action implies execution or mastery.

Manual editorial review considered whether the first explanation has a concrete subject, whether new terms have a local introduction, whether a newcomer can follow the branch, and why each mechanism exists. All 64 guides' distinct concept prose/counterexamples and the nine investigations were inspected; assumptions were localized. This is an authored review, not evidence from a beginner usability study. Advanced investigations still require more effort than Lab 001.

## New validation

- **29 Python checks passed**, including source-hash validation for all 14 installed reviewed checkpoints on pinned Linux 7.2.11. Other checks use compiler fixtures or curriculum/API/profile boundaries. No new kernel indexing or kernel build was needed.
- **27 fixture/learning Playwright checks passed**: 22 browser flows plus five pure state/route/paging/context checks. These include tab/segment transitions, refresh/Back, invalid routes, independent saved state, UTF-8 export/import, aggregate count/byte rejection, oversized ordinary edits, quota failures, hidden predictions, canonical download/display synchronization, reading-only fallback, diagrams, search and keyboard navigation.
- **Six real-kernel Chromium flows passed** against the pinned dataset, including refreshed checkpoint return to the originating code segment at phone width. Contiguous guided/full paging and exact evidence anchors remain covered.
- TypeScript and Vite production build passed on macOS. Python 3.14 was used locally; Node 26 emitted existing deprecation warnings. Node 22 remains the documented setup baseline. Existing anyio deprecation and Vite bundle-size warnings remain.
- **23 Linux validation cases passed**: 11 canonical runs of nine programs, eight documented variations, two deliberately broken launcher cases correctly rejected, and two simulated zero-result baselines. Each source compiled with `-std=c11 -Wall -Wextra -Werror`. The report records canonical and tested variant hashes, actual stdout/stderr and exit codes.

The runtime environment was **Ubuntu 26.04, aarch64, UID 501, Clang 22.1.2, running Linux 7.0.0-28-generic**. Both seccomp config options were enabled, and real installation followed by denied getppid/allowed getpid observations succeeded. The getuid variation and inherited ignored/blocked SIGUSR1 variation also executed. These are new runs in [followup-experiment-validation.json](followup-experiment-validation.json); earlier reports remain historical evidence.

The optional actual PID-namespace probe failed at uid_map with `Operation not permitted`. No host protection was changed. Simulated zero-baseline cases test acceptance of a valid zero and then install real filters; they do not establish PID-namespace execution or running as UID zero. Fedora, x86-64 execution, and execution on a booted 7.2.11 kernel were not performed. The indexed source is separately pinned to 7.2.11, commit `a2de78ee6ed8bf8cd99d177c74865a6e8c3cb6ea`.

Desktop, 390-pixel phone, keyboard, 150% reading and 200% code views were exercised. Actual Chromium screenshots were visually inspected: [desktop fork](followup-desktop-fork.png), [phone fork](followup-phone-fork.png), [enlarged code](followup-enlarged-code.png), and [instruction tables](followup-seccomp-instructions.png). Source navigation was exercised at desktop/phone widths. The optional interactive browser connector was unavailable; screenshot inspection accompanied repeatable browser interactions. Tests used isolated browser records, leaving personal notes unchanged.

## Reproduce and open

From the repository root, build before running API/browser tests so asset replacement does not race application setup:

```sh
npm run build --prefix web
.venv/bin/pytest -q
npm run test:e2e --prefix web
npm run test:kernel --prefix web
```

The last command needs the optional matching `data/learning` source/index. Run runtime checks as an ordinary Linux user, with a usable compiler and current source:

```sh
python3 scripts/check_experiments.py --compiler clang-22 --output /tmp/kse-validation.json
```

`make serve` opens the local application at **http://127.0.0.1:8000**. The development server is left running on the existing learning dataset. Resume **[Chapter 2 companion Lab 001 / fork](http://127.0.0.1:8000/#learn/fork-memory?view=code&segment=fork)**; choose **Save this lab segment** if this should be Home's explicit stopping point. Opening the link does not advance the book or mark a run. If the book/lab were already saved, their state remains independent of other browsing.

## Remaining limits

The companion offers reading across all chapters and nine developed investigations, not 64 runnable labs or kernel walks. The three newer investigations still have no authored kernel checkpoint. Namespace/cgroup/Landlock material remains reading-only; no additional containment mechanisms were added. The deny-one filter is deliberately not a composed sandbox.

Scroll positions and opened explanations are retained within the open page, not synchronized across browsers or preserved as exact pixels across refresh. Activity URLs and source windows are refreshable. Browser notes still have finite limits and no cross-tab conflict resolution. Source brace context is limited to these reviewed canonical files and is not a general C parser. Safari/Firefox, a newcomer study, whole-kernel validation and remote CI remain outside the evidence recorded here.

See [LEARNING.md](LEARNING.md) for authoring rules, prerequisites, availability and recovery contracts; [VALIDATION.md](VALIDATION.md) for provenance/platform boundaries. No grading, mandatory notes, progress gates, conversational model service, speculative call edges or vulnerability claims were added.
