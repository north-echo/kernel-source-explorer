# Validation and limitations

Explorer pass validated locally on 2026-10-17; see [EXPLORER_PASS.md](EXPLORER_PASS.md) for the latest results. See [the focused follow-up report](FOLLOWUP_PASS.md) for new execution and scope; [the earlier improvement report](IMPROVEMENT_PASS.md) records the previous pass. The shared application supports an optional reading companion and free-form source exploration. Personal reading context is separate local data. The kernel index remains bounded, and the tool does not perform automatic security analysis.

## Delivered behavior

- C++ Clang LibTooling analysis, compiler-provided identities, separate direct calls/references/unresolved calls, expansion/spelling locations and TU provenance.
- SQLite schema v1, explicit sequential indexing, persistent diagnostics, coverage and atomic dataset publication.
- Read-only FastAPI search, graph and source APIs with loopback host/origin controls, registered roots, safe component-wise source opening and hash checks.
- React search/graph/source navigation, graph pagination/aggregation, history, exact evidence navigation and portable local trails.
- All 64 chapter guides with distinct optional concept sections, concrete situations, API names, glossary terms, assumptions, counterexamples, references, review metadata, comparison/code illustrations where useful, expanded search and scoped diagrams.
- Nine original focused investigations with canonical commented C, marker-derived numbered walkthroughs, predictions, separate reveals, variations/troubleshooting and concrete containment inventories. The original six retain 14 compiler-backed checkpoints; the new three have no authored mapping.
- A focused source-reading view with an optional compiler-evidenced checkpoint graph, keyboard-accessible call-site/function controls, a return to the same topic and explicit reading boundaries.
- Optional private profiles and browser-local notes with independent book, saved-lab and exploration positions, version-1 migration, invalid-record quarantine, previewed import/merge/replace and retained raw backups. Reasoning through an experiment and running it are distinct self-reported states. There are no scores, deadlines, required notes or compulsory labs.

## Checks actually run

- **30 Python checks pass locally**, including the installed real-kernel checkpoint test. The suite also exercises compiler fixtures and curriculum/profile/API boundaries without a kernel dataset.
- **32 fixture/learning Playwright checks pass**: 25 browser flows plus seven pure state/route/paging/context/token checks. These cover source navigation/trails, corruption preservation, migration/import/export, independent reading/lab state, hidden models, every canonical download and walkthrough range, search loading/empty/failure, grouped evidence and representative keyboard/phone/enlarged layouts.
- **Nine real-kernel Chromium flows pass**: reviewed process creation, guided checkpoint/graph navigation, contiguous guided/full paging with stable anchors and Back/Forward, refreshed ordinary/checkpoint URLs with stale-dataset rejection, and source-read failure/retry, and refreshed return to the originating code segment on a phone.
- **Historical runtime validation: nine C programs passed 23 unprivileged validation cases** (11 canonical, eight variations, two detected launcher mutations, two simulated zero baselines). [Current execution report](followup-experiment-validation.json): Ubuntu 26.04, Linux **7.0.0-28-generic**, aarch64, UID 501, Clang 22.1.2, `-std=c11 -Wall -Wextra -Werror`. Seccomp config was enabled and a real denied/allowed syscall pair passed. Actual PID-namespace creation was refused by the VM (uid_map permission); the two simulated zero results establish branch handling, not namespace or UID-zero execution. The [previous nine-program report](improvement-experiment-validation.json) and [older six-program report](experiment-validation.json) are historical; they do not attest the current changed source hashes. No Fedora, x86-64 or booted-7.2.11 execution is claimed.
- Earlier native builds used LLVM/Clang 23.1.3 on macOS and 22.1.2 on Ubuntu 26.04 arm64; this follow-up did not change or rebuild the indexer.
- TypeScript checks and the production build pass. This pass did not rebuild the whole kernel. In the earlier pass, the initial Python installation was reproduced in a fresh temporary virtual environment; a clean offline npm install from the lockfile rebuilt successfully.
- Browser tests use isolated loopback ports 8765/8766, and the original explorer checks block external resource requests. Screenshots of the reading home, chapter diagrams at desktop/phone widths, guided source and full explorer were visually inspected.
- Missing/ambiguous/partially indexed checkpoint evidence is rejected. All 14 checkpoints resolved in the seven-unit source dataset and their source excerpts passed hash verification.
- Personal profiles, PDFs, continuity documents, source snapshots and indexes are excluded from Git. Profile responses expose supported fields only, not a continuity document. Public previews use generic test profiles.

Primary link reachability and selected subtle semantics were reviewed; see [reference-validation.json](reference-validation.json). These are not a technical certification of every chapter.

Pinned pytest 9.0.3 and setuptools 83.0.0 address the two dependency alerts reported during publication.

The CI workflow runs native/fixture/API checks on Ubuntu 26.04 and passes a hash-verified portable fixture plus built UI to supported Ubuntu 24.04 for Playwright browser checks. It does not download a kernel or claim the optional kernel test succeeded. This pass was not pushed or run in remote CI; previous remote status is not evidence for the current worktree.

## Measured kernel results

Current collection: [learning-validation.json](learning-validation.json).

| Item | Observed result |
| --- | --- |
| Release / revision | 7.2.11 / `a2de78ee6ed8bf8cd99d177c74865a6e8c3cb6ea` |
| Architecture / config | arm64 / standard defconfig |
| Requested / successful / partial / failed / skipped TUs | 7 / 7 / 0 / 0 / 0 |
| Compiler | Clang 22.1.2 |
| Symbols | 91,590 |
| Relationship evidence records | 413,584 |
| Recorded source files | 821 |
| Diagnostics | 0 |
| Indexing elapsed | 55.02 seconds |
| Highest per-child peak RSS | 2,419,965,952 bytes (2.25 GiB) |
| Database size | 335,593,472 bytes (320.05 MiB) |
| Available reading checkpoints | 14 / 14 |

The scope includes fork, pid, cred, exit, sys, exec and file translation units, plus their included declarations. The original three-unit vertical-slice measurements remain in [kernel-validation.json](kernel-validation.json) as historical baseline evidence. It had three successful units, 59,899 symbols and 180,708 records in 26.38 seconds.

Relationship totals count translation-unit evidence, repeated header facts and distinct relationship categories, not unique call-graph arcs. Elapsed indexing includes compiler runs and JSON/SQLite ingestion. Peak RSS is per native child via `wait4`, excluding simultaneous driver memory. Reported timings are observations rather than performance guarantees.

## Known limits

- The collection provides a concise reading companion for all 64 core chapters, not exhaustive section-by-section instruction or a conversational AI tutor. The appendices and published exercise solutions are not reproduced. Nine investigations have complete tested code; only six have reviewed kernel checkpoints. Chapter coverage does not mean equal runtime or source coverage. Free-text answers are neither interpreted nor graded. Personal profile data seeds a new browser; existing saved browser choices take precedence. Validated notes import is explicit, with preview and local backups; automatic cross-browser/cross-tab synchronization is not implemented. Imports are limited to 2 MiB.
- The book's historical kernel baseline and the modern indexed source are distinct. Cross-layer links between application/library interfaces and kernel checkpoints are curated explanations, not compiler edges or traces. The current getpid mapping is arm64-specific.
- Only seven kernel TUs and their included declarations are indexed. A declaration may have no indexed definition. Absence of evidence does not imply absence of behavior elsewhere.
- Indirect calls have no inferred target. Callback assignments and address-taking references do not establish which implementation will run. No runtime overlays, automatic vulnerability analysis or complete security-boundary assessment is provided.
- Declared-type edges cover usable typedef/tag types on supported declarations and function parameters/returns. Comprehensive local-variable, macro and type-use indexing is deferred.
- Header facts retain separate TU provenance, increasing storage. There is no incremental or parallel indexing, whole-kernel scaling validation or compaction strategy. A dataset is rebuilt as a whole. Schema changes require a version bump and rebuild.
- Source must remain unchanged during indexing. Hashes detect later changes, but the indexer does not lock the tree against concurrent edits. Use a dedicated immutable source/configuration. Compilation databases must be named `compile_commands.json`; ambiguous multiple commands for one TU are rejected.
- Graph responses are bounded. The canvas pages eight neighbors and aggregates equal source/target/kind evidence with counts; a grouped edge opens a chooser for its loaded individual records, retaining provenance. Individual records also remain in the list. Multi-center sessions and per-node pinning are deferred.
- Source URL/history state carries evidence anchors, browsed windows, originating checkpoints and view/search settings. Invalid/mismatched links fail clearly. A selected index must still be prepared separately; a link cannot install it. Saved trails retain exact locations and notes. One dataset is selected at service startup; dataset IDs prevent stale navigation after replacements.
- Notes, retained recovery backups and personal profiles are local plaintext data, not encrypted or multiuser storage. This local service is intended for one trusted user. The CLI accepts trusted compilation databases; it is not a compilation sandbox.
- Source reads reject symlinks, including ones pointing inside the root, and cap individual files at 8 MiB. Declaration responses are limited to 200 locations, and diagnostics display is bounded with a total count.
- macOS and Linux are supported; `wait4` and safe dir-relative `O_NOFOLLOW` opens are POSIX-specific. Windows was not validated.
- Python 3.14 test tooling and Node 26/Playwright emit deprecation warnings. The production build emits a chunk-size advisory from the graph library bundle. These did not prevent the passing local checks.

The new seccomp demonstration is a deny-one syscall observation, not a composed sandbox. The launch-preparation and supervision examples do not restrict all inherited authority. Namespaces, cgroups, Landlock and network-policy integration remain reading/design material; none were installed or runtime-validated. The x86-64 filter branch is present but unexecuted in this pass.

## Next steps

Deepen chapter guides and add reviewed source mappings and optional experiments from actual reader questions, validate another architecture/configuration, improve header-fact storage and peak memory, and expand independently reviewed section-specific walkthroughs. Keep personal continuity outside the shared curriculum and require reviewed source evidence for new kernel checkpoints.

## Follow-up regression boundaries

The new checks cover view/segment URLs and invalid-parameter fallback, actual tab/segment/Back/refresh transitions, phone heading visibility and reading-position return, originating checkpoint activity restoration, UTF-8 round trips, aggregate byte/count merge rejection, oversized ordinary-edit rejection and simulated quota failure preserving the prior raw record. Tests use isolated browser state; no personal notes were imported or replaced. Compiler evidence, static authored instruction traces and runtime observations remain separate.

The learning screenshots were visually inspected at desktop, 390-pixel phone width and enlarged text (150% reading and 200% code). Keyboard checks use focus, Enter, skip links and scrollable code. Chromium provides the exercised browser; Safari/Firefox and a newcomer usability study were not performed. The optional interactive browser connector was unavailable, so visual inspection used actual Chromium screenshots from the repeatable browser checks. A TypeScript build and passing render tests alone do not certify pedagogy.

Node 26 emitted existing register()/color deprecation warnings; Node 22 remains the documented setup baseline. Vite emits its existing large-bundle warning (about 734 kB raw / 234 kB gzip). Python emits an existing anyio alias deprecation warning. None failed validation. No remote CI, deployment, commit or push was performed for this worktree.

The latest Explorer tests exercise novice question entry, API suggestions versus exact matches, node previews versus evidence selection, unannotated fallback, unresolved calls, grouped evidence, source token/column orientation, and guided/free refresh. All five starts and 14 selector-bound source annotations were verified against the current pinned dataset. This UI/source pass did not rerun Linux experiments; their unchanged canonical hashes still match the retained report. The new beginner journeys use isolated profiles and include keyboard/phone/150%-zoom transitions. No new model service or inferred semantic/call graph data is used.

## Process-creation memory journey refinement (2026-10-17)

See [MEMORY_JOURNEY_PASS.md](MEMORY_JOURNEY_PASS.md) for the focused handoff and current validation. This adds a connected two-checkpoint path and C stopping point, rather than any new indexed kernel coverage or runtime mechanism. The source-contract regression checks the actual pinned branch, assignments and documented pointer result. Browser regressions exercise primary continuation, guided/full-definition detours, copied links, history, independent C origin/bookmark, phone paging and enlarged source navigation. Test counts describe functional coverage; the handoff records the separate teaching/layout review and remaining assumed knowledge.

## All-chapter newcomer reading revision (2026-10-17)

See [CURRICULUM_READING_REVIEW.md](CURRICULUM_READING_REVIEW.md) for the 64-row editorial record, before/after decisions, primary-reference checks, rendered review, test results and limits. Chapters now expose the central explanation before optional reflection; the nine developed investigations retain prediction-first views. Code context and evidence availability remain distinct. New regressions protect the reading schema, labeled illustrations, legacy containment routes, notes and saved-position continuity, and keyboard/narrow/enlarged disclosure behavior. This is editorial and functional validation, not beginner participant testing or new C/Linux runtime execution.

The focused Chapters 2/20/30 follow-up adds optional paragraph headings and a keyboard/desktop/enlarged-phone regression, with Chapter 4 as the compatible fallback. Its separate results, source-contract references, editorial review and limits are recorded in [the reading-review follow-up](CURRICULUM_READING_REVIEW.md#focused-follow-up-chapters-2-20-and-30-2026-10-17). No Linux runtime rerun or novice participant study is implied.

## CI notes-fixture setup correction (2026-10-18 UTC)

The [GitHub run for 9e19daf](https://github.com/north-echo/kernel-source-explorer/actions/runs/39091114057) passed native/API validation but failed the browser migration/export test: the exported `fork-memory` note was absent. A controlled local reproduction confirmed that inserting a localStorage fixture into an already running app can be overwritten by that app's navigation save before the test reloads. This was test setup racing the mounted app, not evidence that migration removed an existing startup record.

The corrupt, v1-migration and near-limit fixtures now seed their isolated record with an initialization script before application startup. The script leaves an existing record untouched on reload, so migration and subsequent saves are still exercised. The export assertion now compares the entire original note, including non-ASCII thinking, observation and self-reported status. The near-limit edit test additionally asserts that all 207 fixture notes are present before testing rejection. No production storage behavior or learner data changed. The two corrected journeys passed 20 repetitions each (40 checks) locally on macOS/Chromium. The complete 37-check browser suite also passed (25.2 seconds), and git diff --check passed. The temporary intentionally failing reproduction was removed after diagnosis.

The first repair passed migration on GitHub, but [the next run](https://github.com/north-echo/kernel-source-explorer/actions/runs/39092620613) exposed the same live-fixture pattern in the oversized-edit test. That final fixture is now seeded before startup as well; all live reader-record setup writes in the browser suite were audited. All nine recovery checks then passed ten repetitions each (90 checks, 28.9 seconds). The complete 37-check suite passed again after the final fixture correction (22.5 seconds).
