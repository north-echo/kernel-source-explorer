# Validation and limitations

Validated on 2026-10-16. The shared application supports an optional reading companion and free-form source exploration. Personal reading context is separate local data. The kernel index remains bounded, and the tool does not perform automatic security analysis.

## Delivered behavior

- C++ Clang LibTooling analysis, compiler-provided identities, separate direct calls/references/unresolved calls, expansion/spelling locations and TU provenance.
- SQLite schema v1, explicit sequential indexing, persistent diagnostics, coverage and atomic dataset publication.
- Read-only FastAPI search, graph and source APIs with loopback host/origin controls, registered roots, safe component-wise source opening and hash checks.
- React search/graph/source navigation, graph pagination/aggregation, history, exact evidence navigation and portable local trails.
- Six original book-guided topics with optional questions, explanations revealed on request, glossary terms, original C downloads and 14 compiler-backed checkpoints.
- A focused source-reading view with a return to the same topic and explicit reading boundaries.
- Optional private profiles and browser-local reading notes. Reasoning through an experiment and running it are distinct self-reported states. There are no scores, deadlines, required notes or compulsory labs.

## Checks actually run

- **20 Python checks pass locally**, including the optional real-kernel checkpoint test. Without `data/learning/`, the kernel check is explicitly skipped; the other 19 use native compiler fixtures or test the reading/profile boundaries without a kernel.
- **Four fixture/reading Chromium checks pass**: exact graph-edge source navigation; macro and indirect-call behavior; history and trail round-trip; reading-home navigation; hidden explanations; local thought/observation persistence; separate-reader defaults; self-reported experiment state; source-unavailable handling; and phone-width overflow.
- **Two real-kernel Chromium checks pass**: the reviewed process-creation trail and focused source navigation to `begin_new_exec → do_close_on_exec`, including return-to-topic state and verified-source visit recording.
- **Six C programs passed eight unprivileged execution cases**. [Execution results](experiment-validation.json) identify the actual running host kernel as Linux 7.0.0-28-generic on aarch64, effective UID 501. This does not imply execution on the indexed 7.2.11 kernel, on Fedora, or by the learner.
- The native indexer compiled against LLVM/Clang 23.1.3 on macOS and 22.1.2 on Ubuntu 26.04 arm64.
- TypeScript checks and the production build pass. The initial Python installation was also reproduced in a fresh temporary virtual environment; a clean offline npm install from the lockfile rebuilt successfully.
- Browser tests use isolated loopback ports 8765/8766, and the original explorer checks block external resource requests. Screenshots of the reading home, guided source and full explorer were visually inspected.
- Missing/ambiguous/partially indexed checkpoint evidence is rejected. All 14 checkpoints resolved in the seven-unit source dataset and their source excerpts passed hash verification.
- Personal profiles, PDFs, continuity documents, source snapshots and indexes are excluded from Git. Profile responses expose supported fields only, not a continuity document. Public previews use generic test profiles.

Pinned pytest 9.0.3 and setuptools 83.0.0 address the two dependency alerts reported during publication.

The CI workflow runs native/fixture/API checks on Ubuntu 26.04 and passes a hash-verified portable fixture plus built UI to supported Ubuntu 24.04 for Playwright browser checks. It does not download a kernel or claim the optional kernel test succeeded. Its status should be read from GitHub Actions separately from the local results above.

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

- The collection covers selected TLPI topics, not a complete book course or a conversational AI tutor. Free-text answers are neither interpreted nor graded. Personal profile data seeds a new browser; existing saved browser choices take precedence. Exported notes are JSON snapshots; automatic notes import/synchronization is not implemented.
- The book's historical kernel baseline and the modern indexed source are distinct. Cross-layer links between application/library interfaces and kernel checkpoints are curated explanations, not compiler edges or traces. The current getpid mapping is arm64-specific.
- Only seven kernel TUs and their included declarations are indexed. A declaration may have no indexed definition. Absence of evidence does not imply absence of behavior elsewhere.
- Indirect calls have no inferred target. Callback assignments and address-taking references do not establish which implementation will run. No runtime overlays, automatic vulnerability analysis or complete security-boundary assessment is provided.
- Declared-type edges cover usable typedef/tag types on supported declarations and function parameters/returns. Comprehensive local-variable, macro and type-use indexing is deferred.
- Header facts retain separate TU provenance, increasing storage. There is no incremental or parallel indexing, whole-kernel scaling validation or compaction strategy. A dataset is rebuilt as a whole. Schema changes require a version bump and rebuild.
- Source must remain unchanged during indexing. Hashes detect later changes, but the indexer does not lock the tree against concurrent edits. Use a dedicated immutable source/configuration. Compilation databases must be named `compile_commands.json`; ambiguous multiple commands for one TU are rejected.
- Graph responses are bounded. The canvas pages eight neighbors and aggregates equal source/target/kind evidence with counts; a grouped edge opens its first record. Individual records remain in the list. Multi-center sessions and per-node pinning are deferred.
- History tracks symbol selections, not every source-context shift. Saved trails retain exact locations and notes. One dataset is selected at service startup; dataset IDs prevent stale navigation after replacements.
- Notes and personal profiles are local plaintext data, not encrypted or multiuser storage. This local service is intended for one trusted user. The CLI accepts trusted compilation databases; it is not a compilation sandbox.
- Source reads reject symlinks, including ones pointing inside the root, and cap individual files at 8 MiB. Declaration responses are limited to 200 locations, and diagnostics display is bounded with a total count.
- macOS and Linux are supported; `wait4` and safe dir-relative `O_NOFOLLOW` opens are POSIX-specific. Windows was not validated.
- Python 3.14 test tooling and Node 26/Playwright emit deprecation warnings. The production build emits a chunk-size advisory from the graph library bundle. These did not prevent the passing local checks.

## Next steps

Broaden the reading collection from actual reader questions, validate another architecture/configuration, improve header-fact storage and peak memory, and add source-location history. Keep personal continuity outside the shared curriculum and require reviewed source evidence for new kernel checkpoints.
