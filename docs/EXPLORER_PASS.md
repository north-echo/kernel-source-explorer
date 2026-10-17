# Beginner Explorer pass

The process-creation path has since been refined into two connected checkpoints and a C stopping point; see [MEMORY_JOURNEY_PASS.md](MEMORY_JOURNEY_PASS.md) for current behavior and validation.

Implemented locally on October 17, 2026, after reading the repository implementation and the recent improvement/follow-up handoffs. The existing source/notes/curriculum work was preserved; the unrelated untracked `KERNEL_EXPLORER_REVIEW.md` remains untouched. No commit, push, publication or deployment was performed.

## What changed

Explorer now begins with five concrete questions instead of requiring a kernel symbol name. Each offers the familiar C situation, an optional account of what the visit establishes and its prerequisites, a link to the relevant Learn code segment, and a dataset-checked source availability message. Unavailable questions remain readable. Free search and trails are available independently through **Use free exploration**.

| Question | Initial reviewed evidence | C connection |
| --- | --- | --- |
| What happens when my program creates a child? | `copy_process → copy_mm` | Lab 001 / fork |
| How does a child inherit access to an open file? | `copy_process → copy_files` | Descriptor inheritance / fork |
| What changes when a process executes another program? | `do_execveat_common → bprm_execve` | Program replacement / exec |
| How does a parent collect a child’s result? | `kernel_wait4 → do_wait` | Child status / wait |
| What does a process ID identify? | `__arm64_sys_getpid → task_tgid_vnr` | Process identity |

These are authored links to supporting kernel responsibilities, not compiler-resolved paths from the C demo or libc. The C program, library wrapper, system-call boundary and indexed implementation are explained separately. Only the kernel side is indexed here. The architecture-generated getpid name is explained without requiring memorization.

Each selection has a compact orientation: current question, symbol/kind, location category, why selected and what to notice. Reviewed symbol responsibilities are matched by resolved IDs only on the matching dataset. Unannotated symbols receive structural facts, an honest missing-description message and a method for inspecting their definition; no semantic description is synthesized at runtime.

All 14 existing checkpoints have authored reading annotations: statement, important inputs/condition, how its result is used, C/kernel notation and deferred details. The annotations were checked against actual call-site excerpts, function/type definitions and relevant comments in the pinned source. Examples include distinguishing pointer-error conventions from libc errno, get_file’s retained reference and ignored same-pointer return, and wait status copying from the returned child ID. Two excerpts include extra preceding lines so the referenced CLONE_FILES condition and wait-options setup are visible initially. Paging uses the same actual window size, preserving contiguous coverage.

Graph nodes preview opening a definition/declaration; opening requires an explicit action. Arrows select evidence instead of navigating to the callee. The graph explains direct calls, references, declared types, unresolved call-site placeholders, repeated TU/location evidence and bounded coverage. Keyboard controls provide the same preview, evidence-choice and navigation actions. Group choices show their relationship kind; a null indirect target never gains a fabricated destination. A node preview closes when different evidence is selected.

Source identifies definitions, declarations, calls, references and macro spelling/expansion positions. A darker token marks the selected UTF-8 source column where possible; invalid or mid-codepoint columns leave the exact source unchanged. The selected evidence anchor remains separate from the browsed window. **Return to call site/selected location** recovers it after paging. Provenance, spelling alternatives, filters, coverage and trail features remain inspectable.

Reviewed next questions offer deliberately authored checkpoints. Ordinary graph navigation is labeled separately: read a definition, inspect the callee, find callers, read surrounding branches, return to the investigation or add this location with a note. Containment details reuse the existing inventories and state the static visit’s evidence limits. A call path or successful source read is not evidence of a complete sandbox or of experiment execution.

## Continuity and interface review

`#explore?guide=fork-memory` resolves the current dataset before opening the recommended first checkpoint. The resulting exact URL includes dataset, symbol, location, evidence, checkpoint and an originating journey ID. Opening into free exploration retains that question; cross-investigation recommendations preserve the original Learn return activity. Refresh, copied URLs and history restore evidence and context. Direct question initialization does not let the empty-search initializer replace its pending route. Symbol navigation writes one URL, avoiding competing hash events and stale caller locations when opening a callee.

The existing blue/ink/paper styling is retained. Orientation spans above the graph/source. Technical explanations are optional disclosures rather than a mandatory tutorial. On phones, controls move deliberately among orientation, graph and source, with free search later in the selected-symbol layout. Token scrolling occurs inside the source pane instead of moving the page away from the orientation. Enlarged graph controls wrap, and the canvas is contained.

Manual review considered whether the current question stays visible, whether the highlighted token matches the described operation, whether a node preview can be confused with navigation, and whether unannotated/indirect evidence invites guessing. Actual desktop/phone/enlarged screenshots were inspected. This is not a newcomer usability study or a comprehensive assistive-technology audit.

## Validation actually performed

- **30 Python checks passed** on macOS/Python 3.14, including native compiler fixture checks, reading/storage/source API regressions, annotation/start integrity and actual pinned-source checkpoint checks. All five starts and all 14 reviewed selectors resolved on the installed dataset, with readable, hash-verified source; definition/call text was inspected separately from test counts.
- **32 fixture/learning Playwright checks passed** (25 browser flows and seven pure state/route/context/token checks). New coverage includes unavailable questions, familiar API suggestions versus symbol results, unannotated definitions, direct arrow explanations, node preview/open separation, unresolved calls without destinations, grouped evidence choices, macro location categories and UTF-8 token reconstruction. Existing curriculum, hidden predictions, canonical downloads, notes recovery/migration/round trips, quota/size rejection, search states and graph checks remain.
- **Nine real-kernel Chromium journeys passed**, including the three new beginner journeys plus the existing six source/checkpoint regressions. They cover question → explained call → callee definition → refresh → question return; familiar waitpid search → curated source → free search with filters retained; and keyboard phone navigation across reviewed descriptor checkpoints while preserving the originating question. Existing contiguous paging, anchors, stale-dataset rejection, source-read retry and code-activity return remain covered.
- TypeScript and the Vite production build passed. The bundle warning remains (about 752 kB raw / 239 kB gzip), as do existing Node 26 and anyio deprecation warnings. The documented Node 22 setup baseline is unchanged.
- Desktop 1512×982, phone 390×844, keyboard focus/Enter, and 150% enlarged phone source/graph layouts were exercised. Existing enlarged code/reading checks also ran. See [starting questions](explorer-starts-desktop.png), [guided creation](explorer-guided-creation.png), [fixture orientation](explorer-fixture-orientation.png), [phone source](explorer-phone-source.png), and [enlarged phone](explorer-enlarged-phone.png).

This pass read the installed bounded **Linux 7.2.11 arm64** source index at revision `a2de78ee6ed8bf8cd99d177c74865a6e8c3cb6ea`; it did not boot that kernel, rebuild/reindex it, or execute new Linux runtime experiments. The unchanged C sources still match the previous 23-case report, checked by existing hash regressions. That earlier execution used Ubuntu 26.04 aarch64 running **7.0.0-28-generic**; it is historical runtime evidence, not a new result here. Safari, Firefox, Fedora and x86 runtime behavior were not validated. All browser checks used isolated storage and generic test profiles; personal notes were not edited.

## Open and reproduce

The local app remains available at http://127.0.0.1:8000. Recommended first visit: **[What happens when my program creates a child?](http://127.0.0.1:8000/#explore?guide=fork-memory)**. Follow **Continue: examine the memory-sharing choice**, then **Connect this result to the C experiment**. Full definitions remain optional detours with a guided return; navigating does not change your saved lab.

```sh
npm run build --prefix web
.venv/bin/pytest -q
npm run test:e2e --prefix web
npm run test:kernel --prefix web
```

The final command requires the optional matching `data/learning` dataset/source. Restart the Python server after editing packaged curriculum because the content is cached. No additional service or network dependency was introduced.

## Remaining limits

The index still covers seven kernel translation units, not the whole kernel, and reviewed teaching is limited to the existing 14 checkpoint selectors and their endpoint responsibilities. Other symbols retain structural orientation and free navigation. Userspace programs/libc wrappers, complete cross-boundary paths, runtime execution order and unresolved indirect targets are not inferred. Grouping cannot expose evidence that has not been loaded. Exact pixel scroll is not persisted across refresh; encoded source windows and evidence positions are.

The five questions are optional entry points, not a complete operating-systems course or a security certification. Modern containment reading and the existing finite experiments remain separate. No model service, generated semantic-description service, speculative call edge, grading or compulsory progress requirement was added.
