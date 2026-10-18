# Reading, C, and containment

The companion's recurring question is: **What authority does this process have, where did it come from, and what would actually restrict it?** Learn the ordinary systems-programming mechanism first, then examine that question against a concrete example. No score, deadline, chapter gate, mandatory note or experiment is imposed.

## Three independent places

- **Book position** is changed by `Keep my reading place here` or your explicit settings edit. Browsing a later chapter or opening source does not advance it.
- **Saved lab segment** is chosen with `Save this lab segment` in a code walkthrough. Selecting another segment, reading an explanation or visiting source does not replace that stopping point.
- **Recent exploration** records the last reading topic and last successfully loaded source link separately. These are navigation history, not completion or demonstrated understanding.

The home presents each separately. A discussion reminder from a private local profile is also separate from experiment status.

## Chapter 2 companion Lab 001

Open [Lab 001 at the fork segment](http://127.0.0.1:8000/#learn/fork-memory?view=code&segment=fork). The stable investigation ID remains `fork-memory`, preserving existing notes. Its primary reference is now Chapter 2 companion Lab 001; Chapter 24, §24.2.2 is the optional deeper reading.

The selected canonical segment contains:

```c
pid_t child_pid = fork();
```

Choose **Save this lab segment** when that is where you want to return. Home → **Resume saved lab segment** then reopens that exact segment. The book bookmark stays at Chapter 2 unless you explicitly move it. You need not mark anything completed or run. Old records without a saved lab remain without one; the migration does not infer a stopping point from browsing history.

The walkthrough covers headers, `pid_t`, declarations and initialization, the three return cases, assignment versus comparison, format strings, `&status`, `waitpid`, short-circuit conditions, buffering, `_exit`, and cleanup. You can choose any segment or display the complete source.

## Optional lesson paths

A developed investigation offers a neutral scenario and one prediction question, an optional local thought field, a revealed explanation, separately revealed explanatory diagram, complete commented code, selectable code segments, an optional experiment/variation, a containment inventory, and reviewed source checkpoints when available. They are alternative paths, not an enforced sequence.

Expected output has its own reveal. Neither revealing output nor reading code changes the self-reported `Not run`, `Read or reasoned through`, or `I ran it myself` status. Automated project validation does not change a learner's status.

## Investigation collection

| Investigation ID | Focus | Canonical file | Kernel checkpoint mapping |
| --- | --- | --- | --- |
| `fork-memory` | Chapter 2 Lab 001: fork return values and private state | `fork_variables.c` | Reviewed |
| `process-identity` | IDs, types, casts and formatted observation | `process_identity.c` | Reviewed |
| `shared-offset` | Descriptor entries and shared open file descriptions | `fork_file_offset.c` | Reviewed |
| `process-inheritance` | Descriptor inheritance, explicit close and close-on-exec | `inherited_authority.c` | Reviewed |
| `exit-wait` | Returned child PID versus encoded status | `exit_wait.c` | Reviewed |
| `exec-replacement` | Arguments, program-image replacement and retained context | `exec_identity.c` | Reviewed |
| `launcher-preparation` | Explicit arguments/environment and child-only cwd | `launcher_prepare.c` | No authored mapping |
| `child-supervision` | Readiness, signal setup, targeted termination and reaping | `supervise_child.c` | No authored mapping |
| `seccomp-boundary` | An actual denied syscall versus an allowed one | `seccomp_boundary.c` | No authored mapping |

Nine original files have eleven canonical execution cases, eight documented variations, two launcher mutation checks and two simulated zero-baseline checks; the current report records 23 passing cases. The original six were deeply revised, with explicit error blocks and detailed comments. Short successful transfers have their own diagnostics instead of printing an unrelated `errno`. The descriptor helper uses checked `strtol`; flag updates preserve existing bits. The two `execl` demos document why the supplied `./program` path must remain usable. The launch-preparation example resolves its executable before changing the child directory.

All displayed code and downloads come from the same packaged `.c` file. Numbered walkthrough bounds are computed at response time from stable `/* @step id */` markers in that file, rather than maintained as independent snippets. The API includes a SHA-256 used by the consistency checks.

The full-book library also has short original code illustrations and comparison tables. These excerpts are explicitly separate from complete runtime-validated investigations; omitted surrounding error handling or setup is stated in their context.

## Containment track and limits

Learn → **Containment investigations** organizes optional stages from process identity/private memory, descriptor references, exec and launch preparation, through status/signals and supervision. Later reading covers credentials/capabilities, resource limits, namespaces, filesystem/network access and composition under a threat model. The seccomp stage has a real finite experiment.

Each developed connection identifies the subject, resource, authority origin, operation, enforcing mechanism, remaining authority, and the experiment's evidential limits. Private variables, cooperating mutexes, access checks, resource ceilings, lifecycle supervision and syscall mediation are distinct mechanisms.

| Modern mechanism | Requirements | Availability in this pass |
| --- | --- | --- |
| Seccomp BPF demo | Linux `CONFIG_SECCOMP=y`, `CONFIG_SECCOMP_FILTER=y`, suitable headers, native aarch64 or x86-64 code path, permission to set `no_new_privs` and install a filter | Executed successfully on the documented aarch64 VM; x86-64 execution not validated |
| Namespaces | Type-specific kernel configuration, capabilities/user-namespace mappings, and local creation/join policy | Reading only; no namespace integration or host sysctl changes |
| cgroup v2 | Unified hierarchy, enabled controllers and a writable delegated subtree | Reading only; no cgroup writes or delegation setup |
| Landlock | Kernel feature enabled in the active LSM configuration, supported queried ABI, compatible headers/syscalls and permission to restrict self | Reading only; no installed ruleset or runtime validation |

The launcher observes the worker’s actual directory identity, included DEMO_ROLE and omitted KSE_OMITTED_SENTINEL, compares the parent directory, and reads only its owned outside demo file to show remaining authority. Omitting child chdir or copying the inherited environment fails regression execution.

The seccomp walkthrough gives separate numbered aarch64/x86-64 instruction tables and denied/allowed traces. It introduces syscall numbers, byte offsets, bit tests, jump offsets and array-length calculation. A zero getppid (parent outside the PID namespace) or UID zero is valid; only -1 indicates failure from syscall.

The seccomp demo checks the native ABI (including rejection of the x32 number space in its x86-64 branch), denies `getppid` with `EPERM`, and leaves other native syscalls allowed. It is deliberately **not a composed sandbox**. `no_new_privs` and this prctl filter install are per-thread. The program has one thread, uses no TSYNC, and changes no existing sibling thread. Both restrictions are inherited by children and retained across allowed exec; the launching shell is unaffected. Exit 77 or failed installation reports unavailable and fails mechanism validation; it never counts as success. No privileged host change or weakened protection is used.

The supervisor explicitly sets only its child's SIGTERM/SIGALRM dispositions and mask. A five-second child alarm is a finite backstop; the readiness pipe determines normal ordering. This is not a hostile-descendant supervisor or a general shutdown policy for signals that can be caught or ignored.

See the current [kernel seccomp documentation](https://docs.kernel.org/userspace-api/seccomp_filter.html), [namespaces manual](https://man7.org/linux/man-pages/man7/namespaces.7.html), [cgroup v2 documentation](https://docs.kernel.org/admin-guide/cgroup-v2.html), and [Landlock documentation](https://docs.kernel.org/userspace-api/landlock.html). These modern extensions are distinguished from the book's historical baseline.

## Complete chapter library

All 64 core chapter records have individually authored situations, prerequisite reminders and connected main explanations visible before reflection. Each optional reflection answer follows the explanation it depends on. Distinct optional concept sections supply exact interfaces, assumptions, counterexamples, vocabulary, references and review metadata. Selected concepts add code excerpts or comparisons. Search includes titles, prompts, interfaces, glossary definitions and synonyms, with matching investigations shown separately as curated suggestions. Subject filtering remains available.

Availability distinguishes reading, code walkthrough, runnable experiment and authored/reviewed source mapping. Chapter coverage does not mean every chapter has a kernel walkthrough. Appendices and published exercise solutions are not reproduced. The companion is independent of the author/publisher; it distributes no PDF or book examples.

Diagram models include ownership, alternate outcomes, lifecycle states and loops. In particular, Chapter 5 shows two descriptor entries; Chapter 17 scopes ACL classes and masks; Chapter 20 separates ignore/block/pending/delivery; Chapter 24 names shared mappings as an exception; Chapter 30 loops back to the predicate; and Chapter 61 makes application acknowledgment conditional on an application protocol. Annotated nodes reveal additional explanation; simple nodes are static. Every edge has a text representation. Diagrams remain authored material, never compiler calls or runtime traces.

## Source navigation and unavailable states

The existing fourteen checkpoint specifications still resolve only against successful, unambiguous evidence in the pinned Linux 7.2.11 revision. No mappings were manufactured for the three new experiments. A call selector binds caller, callee, source file and TU; definition selectors require an unambiguous successful definition.

Guided and full source windows page from their actual displayed boundaries without gaps. The selected evidence anchor remains independent of the browsed window. `Return to call site` recovers the selected call; trail notes attach to `Add selected location`, not an incidental page center; spelling/definition selections explicitly change the selected location. A checkpoint is marked opened only after its exact source excerpt was served with the registered hash checks.

Lesson tabs and segment changes produce URLs for the visible activity. Unsupported views/segments show an explicit fallback. Returning to a checkpoint’s originating activity restores its view and segment independently of the saved lab. Within the open page, revisited reading activities restore window positions; new activities focus their heading and bring it into view. Source links restore the encoded source window/evidence anchor, bringing the selected line into view rather than promising an exact previous window pixel. Refresh restores the activity and encoded source window, not an exact pixel offset or every open disclosure.

Source URLs carry dataset identity, symbol, source anchor, browsed window, evidence record, optional originating checkpoint and lesson return activity, query/path filters and view settings. Refresh and copied links restore these; native Back/Forward traverses source visits. Dataset mismatches and invalid links clear the stale view and explain the failure. A source-read failure keeps the evidence but offers an explicit retry after the tree is restored.

The API distinguishes no mapping, missing index, wrong dataset kind, wrong revision, missing facts, facts only in unsuccessful TUs, ambiguity, and source-read failure. Missing, incompatible, corrupt or incomplete indexes leave reading and code available with an explicit reading-only notice.

Explorer search starts with reviewed starting points and recent symbol selections instead of anonymous fields. It distinguishes pending, empty and failed queries and offers kind/definition filters. Curated concept suggestions are labeled separately from compiler matches. Graph controls distinguish unique loaded neighbors from evidence records; grouped edges expose each loaded call site/TU record, including partial/successful provenance, and selected evidence is highlighted. Full names and actions have keyboard alternatives. More unrequested evidence still requires `Load more evidence`.

## Private setup, migration and recovery

Copy the generic profile only if you want a local starting point:

```sh
mkdir -p data
cp examples/reader.json data/reader-profile.json
```

Supported fields are `reading_lesson`, `reading_reference`, `interests`, `study_environment`, `discussion_context`, and optional `active_lab` with a valid investigation/segment pair. For an explicitly chosen Lab 001 start:

```json
"active_lab": {"lesson": "fork-memory", "segment": "fork"}
```

Alternatively set `KSE_PROFILE` to an external JSON file. The profile seeds a fresh browser; explicit browser choices take precedence. A profile field arriving after an unrelated action does not erase that action. The raw continuity document is never served or embedded in the shared collection.

Reader state is now schema **2**, retaining the original `kse-reader-v1` storage key for migration. Valid schema-1 notes, book position, interests and self-reported states migrate without inferring a saved lab, completion or execution. The old last-lesson field remains reading history; a separately validated source-link record retains the last successful source exploration.

Unreadable, oversized or unsupported-version records enter quarantine. Automatic writes remain blocked across navigation and editing; the original raw value is retained. Download it from **Your reading place and notes**. A valid import or an explicitly previewed fresh start is required to replace it. A failed backup or save leaves the original retained.

Parsing, file import, ordinary edits/saves and valid exports share one compact serialization and a 2 MiB UTF-8 byte limit. Topic count is at most 500; per-topic visited keys are at most 500; thinking/observation fields each allow 10,000 JavaScript UTF-16 code units. Existing field limits apply equally everywhere. Import validates supported shapes, field lengths, note states and safe record keys. Final merged records are validated before backup or replacement. Oversized edits are rejected before entering reader state; storage-quota failures retain the previous raw record and permit export of valid unsaved work. It previews book/lab/source positions, topic count, overlapping topics and self-reported runs. **Merge** retains other current topics but uses incoming values for matching topics and positions; **Replace** uses the incoming supported record. Before either, the prior raw value is stored under a timestamped browser-backup key. Backups can be downloaded or previewed for recovery from the settings drawer. Export an additional file copy when importing important notes.

Notes are local plaintext, with no multiuser or cross-tab conflict-resolution service. `localhost` and `127.0.0.1` have separate storage, as do different browsers; export/import is the explicit transfer mechanism. No notes or profiles are uploaded. Personal profiles, PDFs, continuity files, generated indexes and source trees remain excluded from Git.

## Authoring and correction workflow

- `explorer/chapters.json`: stable chapter IDs/numbers, references, concept sections, terms, availability, diagrams and selected containment inventories. Edition/page provenance is stated in review metadata.
- `explorer/lessons.json`: focused investigations, optional track/modern-reading records, prompts, explanations, walkthrough annotations, experiment instructions, concrete containment inventories and checkpoint selectors.
- `explorer/experiments/*.c`: canonical complete source. Add unique `/* @step id */` markers matching the walkthrough IDs; do not duplicate source snippets in JSON.
- `explorer/learning.py`: derives source/ranges and resolves compiler mappings. Other revisions/architectures require separately reviewed selectors and validation.

For developed investigation predictions, keep initial titles/prompts neutral and worked models behind reveal controls. Reading guides instead teach the central idea visibly before their optional reflection; do not hide necessary definitions behind a prediction gate. Give concepts a situation, explanation, assumptions, counterexample, APIs and primary references; provide a simpler static representation when interaction adds no explanation. Keep node IDs unique and every edge tied to a node; label branches and loops. Availability must reflect delivered paths, not planned work.

For a correction, record the topic ID, disputed statement, supporting primary reference, affected runtime/source version and date. Reachable documentation links and passing UI tests do not certify semantic correctness. Review subtle API behavior against the linked contract before changing prose, and validate any claimed runtime or compiler mapping separately.

## Statement-level authoring contract

Each walkthrough segment supplies `situation`, `prerequisite`, `steps`, `change`, and optional deeper `explanation`/instruction `tables`, alongside its stable ID and canonical marker-derived bounds. Start with an actual variable, file, descriptor or process and describe before/operation/after/observation. Introduce return values before interpreting them, storage and addresses before output pointers, and ordinary branches before short-circuit expressions. Keep each numbered item to one connected reasoning step. Explain the statement’s purpose in this particular program and what changing it would affect.

Use **What happens**, **How the code expresses it**, and optional **Why Linux behaves this way** as connected entry points. The first view must stand alone; glossary links are support, not a prerequisite scavenger hunt. Explain C syntax separately from interface contracts, Linux behavior, and a pinned implementation. Local assumptions must name the thread model, object/lifetime, I/O mode and other conditions actually used. Defer copy-on-write until the private-variable behavior is understood.

Keep complete source and error handling. Display-only brace context ignores comments/quoted braces and retains enclosing/neighboring brace pairs with explicit omission markers; it is an authored display aid, not a C parser or compiler evidence. Test every downloadable source and each variation offered as runnable. Say exactly which literals, setup, checks and expected output must change, including signal mask/disposition preparation. Put full hashes under provenance. Do not repeat introductions as concept sections or add generic containment warnings solely to fill a template.

Before accepting content, manually ask whether a newcomer can explain the first statement, name each new term, follow both branches and explain why waiting/cleanup exists. Count/rendering checks cannot establish learning quality. Review scoped counterexamples and supported observations separately. See [the follow-up pass](FOLLOWUP_PASS.md) and [current runtime report](followup-experiment-validation.json).

## Guided Explorer questions and annotations

Explorer has two optional paths: a short source visit from a familiar C question, or free symbol/relationship search with a personal trail. The five questions cover creation, descriptor inheritance, program replacement, child-result collection and process identity. Each connects to an existing code segment. Unavailable source mappings retain the question and a precise reason; reading requires no index.

Extend existing lesson records rather than maintaining another semantic catalog. `explorer_start` supplies `question`, `situation`, `establishes`, `prerequisite`, `segment`, `checkpoint` and searchable `terms`. Its checkpoint ID must refer to that lesson’s existing reviewed selector. Each checkpoint’s optional `reading` contains `reviewed`, `caller`/`callee` responsibilities, `statement`, `inputs`, `result`, `syntax` and `next` references with a question. An optional bounded integer `before` widens the initial guided excerpt when the important condition lies beyond the default four preceding lines; paging uses that same size. Review actual source, return conventions and nearby failure branches. Do not derive semantic descriptions from symbol names alone.

Resolution still requires the pinned revision, successful unambiguous evidence and the current dataset. The UI applies responsibilities only to IDs from available resolved checkpoints on that dataset, and statement guidance only at the matching evidence location. When two lessons share the same compiler fact, the currently guided lesson’s reading and containment framing take precedence. Unannotated symbols get structural orientation and an inspection method. Type declarations, definitions, references, macro spelling/expansion and unresolved calls need distinct explanations. A declared-type relation may unwrap pointer/array/reference types; it is not a call.

Recommended next steps must reference reviewed checkpoints and explain their question. Other graph navigation remains available but is not a ranked teaching recommendation. `journey` retains the originating question separately from the current checkpoint’s owning lesson; `returnTo` retains its Learn activity. A guide-only link resolves before the source URL is written. Userspace/library/syscall teaching links are authored cross-layer connections; graph arrows are compiler facts inside this index. Runtime observation remains separate. See [EXPLORER_PASS.md](EXPLORER_PASS.md) for new validation and remaining coverage limits.

### Connected guided paths

A lesson may add `guided_path` to its existing `explorer_start` and reviewed checkpoints. Its `steps` list references existing checkpoint IDs with descriptive titles; `connection` supplies an authored stopping point and `comparison_segment` links to existing C source. The process-creation path currently uses this model for memory setup → sharing choice → C connection. Connection-stage route validation and the focused presentation currently support only this path; another journey requires explicit route/presentation review and new end-to-end checks. Do not add compiler selectors simply to fill a path.

Introduce the visit's narrower responsibility before entry (`explorer_start.purpose` / `introduction`), and say where the trace starts. Each checkpoint may supply `reading.steps`, local `prerequisites`, and a scoped `names` table. Show the essential steps beside source by default in the focused path; leave prerequisite reminders, full definitions, implementation detail and provenance optional. Explain actual arguments, assignments, branch conditions, failure handling and result types. Never substitute a userspace errno convention for an internal kernel return contract. Review both paths of a decision and distinguish binary bit operations from unary address operations.

Path positions are navigation, never completion. The existing lesson/checkpoint identifiers select the reviewed step; `stage=connection` selects the final authored connection. `full=true` is a deliberate definition/free-exploration detour, retaining that position and `returnTo`. All parameters must restore on refresh and history, and invalid positions must offer a readable route back to the starting questions. Changing steps or comparing C variables must not update book position or the explicitly saved lab. Availability still depends on the pinned dataset and resolved evidence, not the presence of prose. See [the memory journey handoff](MEMORY_JOURNEY_PASS.md).

For a checkpoint with a longer essential explanation, `reading.groups` can replace `reading.steps`: each group has a descriptive `title` and short `steps` paragraphs, rendered together without tabs. Keep the sequence connected and retain the source/return contracts. The memory journey's shared `guided_path.definition` is shown before its introductory explanation, including direct source entry. Its names table is a native disclosure initially open on entry; a manual collapse remains effective through rerenders on that checkpoint. This is a display default, with no storage field or learning-progress meaning.

## Authoring newcomer reading guides

Use a concrete situation → plain account → technical name → chapter connection, with exact qualifications beside the claim. `orientation.heading` names the concrete idea and `orientation.prerequisite` supplies a short reminder of needed earlier ideas. `reading` introduces the situation; `explanation` is the individually authored main path, not a generic prefix. `prompt` is a reflection after that account and `reflection_answer` is its optional explanation. Existing records without orientation retain the compatible investigation view. No reader schema or saved-position migration is needed.

`security_connection` supports the existing containment activity route with concrete attempted operations and remaining access, rather than copied experimental inventories. `related_context` clarifies a partial comparison when an existing investigation implements a different mechanism. Do not imply a chapter has an experiment or checkpoint merely because it links to one. Every current chapter still reports no dedicated runnable investigation or reviewed kernel checkpoint.

A diagram supplies `question` and `relationships` before the drawing, and meaningful edge labels in the accessible text representation. Preserve object-reference arrows, alternatives, loops and state transitions where they fit; do not turn every topic into a call chain. Optional code requires `code_kind`, `code_context` and `code_syntax` before the illustration. State the actual missing setup/error handling, identify complete examples versus fragments/pseudocode, and never imply a reading illustration ran.

Review the meaning of every main-path sentence, glossary term, concept assumption/counterexample, reflection and relationship. Check prerequisite order, not word counts. Inspect rendered examples from early/middle/late chapters, keyboard and enlarged/narrow layouts. See [the complete editorial record and limits](CURRICULUM_READING_REVIEW.md).

A guide may add `explanation_headings`, aligned one-for-one with its `explanation` paragraphs, when visible stages help the reader. These are plain subheadings immediately above the corresponding paragraph; the field is optional and does not change older guides or saved data. Keep necessary definitions in those stages and move implementation layers into existing optional concepts. A reflection about a faulty method must spell out that method rather than silently switching away from the correct approach just explained. For condition waiting, distinguish the coordinated release/wait contract from the separate predicate-recheck requirement. See the focused follow-up in [the reading review](CURRICULUM_READING_REVIEW.md#focused-follow-up-chapters-2-20-and-30-2026-10-17).
