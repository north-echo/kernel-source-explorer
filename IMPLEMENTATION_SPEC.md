# Linux Kernel Source Explorer — Implementation Specification

Build a local application for exploring Linux kernel source through symbol search, relationship graphs, and linked source code. Use Sourcetrail’s coordinated search, graph, and source views as a design reference.

The application should support learning Linux internals and investigating security-relevant code paths. Prioritize accurate, inspectable relationships and a working end-to-end experience.

## 1. Working approach

Implement the application in this workspace. Inspect existing files and repository instructions first, preserve unrelated work, and reuse suitable infrastructure.

Proceed through the milestones below. Make routine implementation decisions autonomously and document consequential choices. Deliver working code, setup instructions, and evidence of validation.

Use a fresh implementation by default. Do not copy Sourcetrail code, artwork, or branding. Before considering reuse, inspect its license and dependencies and document the implications.

Reference project: https://github.com/CoatiSoftware/Sourcetrail

## 2. Initial scope

Use Linux **7.2.11** as the initial pinned source dataset. This is a deliberate baseline, not a request to follow a moving branch. Resolve and record its exact source revision and provenance.

Support one architecture and one kernel configuration first. Prefer the architecture of the available Linux build environment; explicitly record the choice. Use a reproducible standard configuration unless an existing suitable configuration is available.

The first useful experience must let a user:

1. Open an indexed kernel dataset.
2. Search for a function, structure, or other supported symbol.
3. View its definition and references.
4. Expand its direct relationships in a graph.
5. Click a relationship to inspect the source evidence.
6. See the kernel revision, architecture, configuration, and indexing coverage.

Begin with process creation, centered on `kernel/fork.c` and relevant dependencies. Validate actual symbol names against the pinned source before creating demonstration paths.

A bounded partial index is acceptable for the first milestone. Display its scope prominently.

Do not require installing or booting the indexed kernel.

## 3. Architecture

Use this default architecture unless repository constraints provide a concrete reason to change it:

- **Indexer:** a standalone C++ command-line tool using current, mutually compatible Clang/LLVM LibTooling libraries.
- **Storage:** SQLite for dataset metadata, symbols, source locations, relationships, and diagnostics.
- **Local service:** Python with FastAPI, reading the index and serving source excerpts.
- **Interface:** React and TypeScript, with a graph library such as Cytoscape.js.
- **Communication:** local HTTP APIs.

Pin dependencies and document supported toolchain versions. Keep the first indexer single-process; add parallel indexing only when measurements justify it.

Use compiler-assisted analysis for C. Text search may supplement navigation but must not create relationships presented as compiler-resolved.

Inspect the available environment before installing dependencies or choosing build paths. If Linux indexing is unavailable locally, continue with the application and fixture-based integration, and document the exact remaining Linux validation step. Never present fixture results as a successful kernel index.

## 4. Dataset preparation

Provide reproducible commands or scripts that:

- Obtain and verify the pinned kernel source using appropriate upstream provenance checks.
- Prepare the selected architecture and configuration.
- Generate required headers and sufficient build information.
- Generate `compile_commands.json` using the kernel’s available tooling.
- Index an explicit set of translation units.

Inspect the pinned kernel’s scripts and supported build targets before choosing commands. Do not assume compilation-database generation alone prepares generated headers or compiler command records.

Preserve original compilation commands. Record and explain any normalization required for Clang, including omitted unsupported flags. Never silently substitute a generic set of include paths and defines.

Each dataset must record:

- Kernel release and exact source revision.
- Source provenance and verification result.
- Architecture.
- Configuration contents or retained configuration artifact, plus hash.
- Compiler and indexer versions.
- Compilation-database hash.
- Requested, successful, failed, and skipped translation units.
- Index creation time and schema version.

A changed revision, architecture, or configuration creates a distinct dataset. Do not mix their relationships.

## 5. Indexing semantics and data model

Implement the following first:

- Function declarations and definitions.
- Structures, unions, enums, typedefs, and global variables where Clang provides usable identities.
- Direct function calls.
- Symbol references.
- Declared type relationships where reliably available.

Use compiler-provided symbol identities where possible. Account for file-local symbols, anonymous entities, and repeated header declarations. Do not merge symbols solely because their names match.

Each relationship must retain:

- Dataset ID.
- Source and target symbol identities.
- Relationship kind.
- Source file, line, and column.
- Evidence origin and resolution category.
- Translation-unit provenance.

Store macro expansion and spelling locations separately when available. Make navigation behavior explicit.

Keep these categories distinct:

- **Resolved direct call:** statically resolved callee.
- **Symbol reference:** use of a symbol without implying a call.
- **Unresolved indirect call:** call through a pointer without a resolved target.
- **Possible indirect target:** future analysis result, clearly labeled.
- **Runtime-observed relationship:** reserved for a later tracing feature.

Do not create guessed call edges from matching names. An address taken or function assigned to a callback field is not proof that a particular call reaches it.

Persist diagnostics. A translation unit with errors must not be labeled fully indexed. If partial facts are retained, mark their provenance accordingly.

For the prototype, rebuilding a dataset is acceptable. Publish a replacement atomically so an interrupted build does not destroy a usable index.

## 6. User interface

Provide three coordinated views:

### Search

- Search names with responsive results.
- Display symbol kind, file, and enough context to disambiguate duplicates.
- Support filtering by subsystem or source path.

### Graph

- Center on the selected symbol.
- Expand callers, callees, references, and supported type relationships on demand.
- Label edge kinds and distinguish resolution categories.
- Bound expansion and paginate large neighborhoods.
- Support collapsing nodes and returning to earlier selections.
- Avoid loading the entire kernel graph into the browser.

### Source

- Display source with line numbers and syntax highlighting.
- Highlight selected definitions and relationship evidence.
- Open the exact source location when an edge is selected.
- Provide surrounding context and navigation history.

Keep the active dataset and coverage visible. An empty result must not imply that a relationship cannot exist outside the index.

Use an intentional, readable design suitable for extended code reading. Ensure keyboard navigation and accessible contrast.

## 7. Security and learning features

For the initial release:

- Allow users to save named navigation trails.
- Store ordered symbol/location selections and short user notes.
- Tie trails to the dataset revision.
- Export trails as portable JSON.
- Include one manually verified process-creation demonstration trail.

Later extensions may include:

- System-call entry-point discovery.
- Navigation to capability checks and Linux Security Module hooks.
- Credential, namespace, and file-descriptor exploration.
- Configuration comparison.
- Trace overlays.
- Version-to-version comparison.

Treat these as deferred features. Do not claim automatic security analysis or completeness.

Any explanatory annotation must be distinguishable from source-derived facts. Automated prose must not generate graph evidence.

## 8. Local service boundaries

Bind the service to loopback by default.

Serve source only from registered dataset roots, with path traversal and symlink escape protection. Validate browser origins and host access as appropriate for a local service.

Indexing is an explicit CLI operation. Browsing must not execute compilation commands or arbitrary shell commands.

Use parameterized database queries. Bound graph responses and source excerpt sizes.

The core application must work offline after dependencies, source, and the index are available.

## 9. Implementation milestones

### Milestone A — Reliable vertical slice

Build:

- A small C fixture project.
- The initial indexer and SQLite schema.
- Search and neighborhood APIs.
- A basic coordinated search, graph, and source interface.

Demonstrate a real compiler-resolved call that opens its exact source location.

### Milestone B — Pinned kernel integration

Prepare Linux 7.2.11 and index the bounded process-creation scope.

Show real kernel symbols and relationships, with visible diagnostics and coverage. Manually verify representative relationships against source.

Measure elapsed indexing time, peak memory where available, database size, and translation-unit outcomes.

### Milestone C — Useful exploration

Add graph expansion controls, navigation history, source highlighting, saved trails, and dataset metadata.

Verify the application remains responsive with the kernel dataset.

### Milestone D — Hardening and delivery

Complete focused validation, setup instructions, limitations, and a reproducible demonstration.

Keep the complete application runnable before broadening scope.

## 10. Acceptance criteria

The prototype is complete when:

- A clean setup can reproduce the documented workflow.
- The indexer processes an explicit subset of the pinned kernel build.
- Search returns real indexed symbols with definitions.
- Selecting a symbol updates the graph and source view.
- Selecting a direct-call edge opens its supporting call site.
- Duplicate names remain distinguishable.
- Unresolved indirect calls are visibly distinguished from resolved calls.
- Failed or partially indexed translation units appear in coverage reporting.
- Revision and configuration changes cannot silently contaminate an index.
- A saved trail can be exported and restored.
- The service cannot read outside registered dataset roots.
- Browsing works offline.

Use meaningful fixtures covering direct calls, repeated header declarations, same-name static functions in different files, macro-generated calls, indirect calls, conditional compilation, and parse failures.

Add focused API and UI integration checks for the core navigation flow. Validate representative kernel edges manually. Report observed performance without inventing targets or results.

## 11. Deliverables

Provide:

- Working source code.
- Dependency manifests and reproducible build instructions.
- Kernel preparation and indexing commands or scripts.
- SQLite schema and schema-version policy.
- Fixture tests and integration checks.
- A documented kernel demonstration trail.
- Measured indexing results.
- Known limitations and a short next-step roadmap.

In the final handoff, distinguish what was implemented, what was actually tested against the kernel, and what remains incomplete.

Start by inspecting the workspace and environment, then implement Milestone A. Continue through subsequent milestones wherever the available environment permits.
