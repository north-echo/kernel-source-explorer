# Validation and delivery status

Validated on 2026-10-16. The application is implemented and tested against both a small compiler fixture and a real, explicitly bounded kernel build. This does not establish whole-kernel coverage or automatic security analysis.

## Milestones

| Milestone | Delivered | Evidence |
| --- | --- | --- |
| A: vertical slice | Native C++ LibTooling facts, SQLite index, search/neighborhood/source APIs, coordinated React views | Fixture/API checks and Chromium navigation tests |
| B: pinned kernel | Signature-verified Linux 7.2.11; arm64 defconfig; fork, pid and cred TUs | Three successful TUs, zero diagnostics; retained measurements and manually reviewed edges |
| C: exploration | Direction/kind filters, bounded graph/evidence pagination, collapsing, symbol history, source highlighting/context, local saved trails and JSON round-trip | Fixture and kernel browser flows |
| D: focused hardening | Registered source roots, component-wise symlink rejection, content-hash checks, host/origin checks, read-only API, atomic replacement, reproducible instructions | Focused tests, portable export/relocation check, production UI build |

The C++ executable emits JSON facts for one translation unit; the Python CLI invokes it sequentially and owns SQLite ingestion and atomic publication. This keeps Clang code independent from schema/publication policy while retaining the specified C++ compiler analysis and SQLite storage.

## Actual validation

- Native executable compiled against LLVM/Clang 23.1.3 on macOS and 22.1.2 on Ubuntu 26.04 arm64.
- 15 Python tests pass. They exercise real native indexing, not fabricated graph fixtures: exact direct-call columns, duplicate static names, repeated header declarations, macro expansion/spelling, unresolved indirect calls, reliable declared types, deliberate parse errors, skipped TUs, conditional compilation and dataset isolation, SQL input handling, pagination limits, traversal/symlink rejection, changed-source rejection, host/origin controls, atomic interrupted replacement, and portable source export/relocation.
- Two fixture Chromium tests pass: keyboard symbol selection, direct graph-edge selection and exact source navigation, macro spelling navigation, unresolved-call labels, graph collapse/expansion, symbol history, trail save/export/import/restoration, rejection of another dataset's trail, and phone-width overflow checks.
- One real-kernel Chromium test passes: open/search `kernel_clone`, select its call to `copy_process` at `kernel/fork.c:2752`, navigate to `dup_task_struct` at line 2115, and import the four-step reviewed trail to the `alloc_pid` call at line 2308.
- Both browser workflows block requests outside the local host; all UI assets, graph code, fonts, and highlighting work without external resources.
- A fresh temporary Python virtual environment reproduced the pinned installation and passed the same 15 tests. A clean offline npm install from the lockfile and the production rebuild also passed.
- TypeScript checking and the production Vite build pass. npm audit reported zero findings after pinning Vite 7.3.7.
- The fixture and kernel screenshots were visually reviewed. The graph was revised to show eight neighbors at a time after the initial breadth-first layout made large neighborhoods unreadable. Repeated source/target/kind evidence is counted on graph edges; individual evidence records remain in the keyboard-accessible list. Selecting a grouped graph edge opens its first evidence record.

## Observed kernel measurements

Full data: [kernel-validation.json](kernel-validation.json).

| Item | Observed result |
| --- | --- |
| Revision | `a2de78ee6ed8bf8cd99d177c74865a6e8c3cb6ea` |
| Architecture / configuration | arm64 / standard defconfig |
| Configuration SHA-256 | `b2842fbaf5f212052a77c6d5056ab1a20f0b6222e79c5d41d491d0b8b9512537` |
| Requested / successful / failed / partial / skipped TUs | 3 / 3 / 0 / 0 / 0 |
| Symbols | 59,899 |
| Relationship evidence records | 180,708 |
| Unresolved indirect-call records | 192 |
| Recorded source files | 797 |
| Diagnostics | 0 |
| Total indexing elapsed | 26.38 seconds |
| Maximum native child peak RSS | 2,402,422,784 bytes (2.24 GiB) |
| SQLite file | 150,933,504 bytes (143.94 MiB) |

Timing includes sequential compiler runs, JSON parsing and SQLite ingestion. Memory is the highest per-child peak reported by `wait4`, excluding simultaneous Python-driver memory. Relationship totals count translation-unit evidence, including repeated header facts and distinct relationship categories; they are not counts of unique call-graph arcs.

Local in-process API checks for five representative symbols measured search + neighborhood + source together at 18.99–26.80 ms per symbol. Two Chromium runs measured 725 ms and 708 ms from opening the application through search and selection of the `kernel_clone → copy_process` call site. These are individual observations on this environment, not latency guarantees or a benchmark distribution.

The fixture deliberately has two successful TUs, one partial TU, and one skipped TU. Its results are separately labeled in the application. Fixture architecture comes from the compiler target triple, rather than the Python host process architecture (which can differ under Rosetta).

## Known limitations

- Only three kernel translation units and their included declarations are indexed. External callees may have declarations without definitions in the indexed scope. Absence of evidence does not imply absence of a relationship.
- Indirect calls have no inferred target. Function-pointer references, assignments and callbacks are not treated as proof of a call to a particular function. Runtime relationships and possible indirect targets are deferred.
- Declared-type edges cover usable typedef/tag types on supported declarations and function parameters/returns. Local variables, full macro indexing, inheritance, comprehensive type-use analysis and every C construct are outside this prototype.
- Header facts retain separate TU provenance, increasing storage size. No incremental indexing, parallel indexing, database compaction strategy or full-kernel scale validation is implemented.
- A dataset is replaced as a whole. Schema v1 has a rebuild-only policy. Compilation databases must be named `compile_commands.json`; ambiguous multiple commands for the same TU are rejected.
- Source must remain unchanged while indexing. Recorded file hashes detect later changes and refuse stale source browsing, but the indexer does not lock the source tree against concurrent edits. Use a dedicated immutable source/configuration during a run.
- Graph expansion loads one bounded evidence page at a time. The canvas separately pages eight neighbors, aggregates identical source/target/kind evidence with counts, and supports zoom/pan. Selecting a new symbol recenters its neighborhood; arbitrary multi-center graph sessions and per-node pinning are deferred.
- History tracks symbol selections. Source-context shifts and edge-only selections do not create history entries. Trails preserve exact locations and user notes.
- One dataset is selected at service startup. Trails are local to the browser and exact dataset; there is no server-side trail synchronization. Raw OS paths in metadata and compiler USRs are retained as provenance.
- Source reads reject symlinks, even those pointing inside the registered tree, and cap an individual file at 8 MiB. API lists are bounded; symbol declarations are limited to 200 locations, and the coverage panel shows at most 200 diagnostics with the total count.
- Only local, trusted compilation databases/indexes are supported. There is no remote/multiuser deployment, compilation sandbox, authentication layer, or automatic vulnerability analysis. The HTTP service does not compile or run shell commands.
- Only macOS and Linux are supported; indexing uses POSIX `wait4` and safe source serving uses dir-relative `O_NOFOLLOW` opens. Windows was not validated.
- Test tooling emits an AnyIO/Starlette deprecation warning under Python 3.14 and Node 26 emits a Playwright module-registration deprecation warning. They do not affect the passing checks. The graph library currently contributes a large bundle; the build emits a chunk-size advisory.
- No project license has been selected.

## Next steps

1. Expand the bounded kernel scope and measure header-evidence deduplication and peak-memory improvements.
2. Add source-location history and multi-center graph sessions based on real exploration feedback.
3. Add full-text source search and richer type/macro navigation without weakening evidence categories.
4. Validate an x86 configuration, packaging, and repeatable performance distributions before broader datasets or runtime overlays.
