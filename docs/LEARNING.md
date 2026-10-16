# A reading companion, with a separate personal layer

The Learn tab is the default home. It offers reading pointers, one question at a time, explanations hidden until requested, optional source visits, and optional C experiments. There are no scores, deadlines, required notes, chapter gates, or completion checklists. The Explorer tab retains free-form symbol navigation.

## Shared curriculum

The collection accompanies all 64 core chapters in Michael Kerrisk's *The Linux Programming Interface*. Each chapter has printed-page references, an original question, two explanatory paragraphs, a follow-up and an interactive conceptual map. Search the chapter library by number, title or idea, filter by subject, and keep your reading place in any chapter. The appendices and published exercise solutions are not reproduced.

Six focused investigations provide the deeper source and experiment routes listed below. The other chapters currently provide reading guidance and concept maps; they have no dedicated experiment or reviewed kernel checkpoint. It contains original explanations and original C experiments, with chapter/section references to consult in your own copy. It does not bundle the PDF, book examples, or substantial book text. It is an independent companion, unaffiliated with the author or publisher. Reading and experiments remain available without a source index.

| Topic | Reading pointer | Experiment |
| --- | --- | --- |
| A new process, inherited access | Chapter 2, §2.7 | Descriptor inheritance through exec, close-on-exec, and closing in the child |
| What does a process ID identify? | Chapter 6; revisit Chapter 2 | Print process and parent IDs |
| Two processes, two variable values | Chapter 24, §24.2.2 | Child changes a private variable |
| Two descriptors, one file position | Chapter 24, §24.2.1 | Child advances an inherited file offset |
| An exit status the parent can collect | Chapters 25–26 | Wait for and decode normal termination |
| A different program, the same PID | Chapter 27 | Self-exec preserves PID and reinitializes program state |

These are independent reading invitations. The Chapter 24–27 topics are optional later-reading detours, not prerequisites for finishing Chapter 2. The tool does not infer mastery or claim that a discussion was an executed experiment.

## Personal setup

Without a profile, every reader gets generic defaults. To supply a private starting point:

```sh
mkdir -p data
cp examples/reader.json data/reader-profile.json
```

Edit the local file, then start the service. `data/` and `reader-profile*.json` are ignored by Git. Alternatively set `KSE_PROFILE` to a profile file outside the repository:

```sh
KSE_PROFILE=/absolute/path/to/my-reader.json make serve
```

Supported fields:

- `reading_lesson`: an investigation ID from `explorer/lessons.json` or a chapter ID (`chapter-01` through `chapter-64`) from `explorer/chapters.json`.
- `reading_reference`: a short description of your current reading position.
- `interests`: a list of topics you care about.
- `study_environment`: your normal unprivileged Linux environment.
- `discussion_context`: an optional short reminder distinguishing what was discussed from what you personally tried.

Only these fields are returned by the local profile API. A continuity/handoff document is not served or copied into the shared curriculum. A server profile seeds a new browser; an existing browser's saved reading position takes precedence.

Your reading position, thinking, experiment observations and visited checkpoints are stored in this browser's local storage. They are not uploaded or committed. “Your reading place” lets you adjust the position, interests and environment and export a private JSON copy. The browser needs access to the local server, so another user of that same server/browser can access its local profile; this is not a multiuser application or encrypted personal store.

There is no model API or automated grading. The explanations are authored material. The app does not pretend to converse intelligently about a free-text answer.

## Source checkpoints

The collection currently has 14 source checkpoints. Each call checkpoint resolves to an existing successful, compiler-resolved direct call, constrained by caller, callee, source file and translation unit. Definition checkpoints require an unambiguous indexed definition. The resolver rejects missing, ambiguous, partially indexed or mismatched-revision evidence.

Opening a checkpoint shows a focused compiler graph beside the exact source location, with a short reading boundary: what to notice and what can wait. You can hide/show the checkpoint graph, select its arrow to revisit the call site, open a function in the full Explorer, or return to the same topic without losing your place. A definition-only checkpoint shows its definition node without inventing a call. Keyboard-accessible controls accompany the graph canvas. A checkpoint is recorded as opened only after the API successfully serves the hash-verified source excerpt for that location and dataset. Changing datasets requires revisiting source checkpoints to show them as opened in the new dataset.

The book's historical Linux baseline and our Linux 7.2.11 source are distinguished. Application interfaces, C-library wrappers, syscall entry points and kernel helper calls are also distinguished. The experiment's conceptual connection to a kernel checkpoint is an authored annotation, not a compiler-resolved cross-layer call edge or a runtime trace.

## Concept diagrams

Each chapter and focused investigation has an authored conceptual diagram. Select a step to emphasize its incoming/outgoing relationships; a text version of all connections is also available. Branches show alternatives or shared-resource relationships where relevant. These simplified maps are teaching annotations, not compiler-derived call chains or runtime traces. They remain available without an index. The separate checkpoint graph draws only the actual selected compiler evidence.

## Optional experiments

Download a source file, save it in a working directory, and compile/run it in a normal Linux shell. Fedora is suitable; automated execution was validated on an unprivileged Ubuntu VM. Use only the included demo data. The inherited-authority and shared-offset experiments create and immediately unlink their own temporary files. No root access is needed.

The UI never executes code. It displays and downloads the original C sources. “Not run”, “Read or reasoned through”, and “I ran it myself” are separate, self-reported statuses. Opening expected output does not change that status. Automated validation of the project does not mark anything as run by a learner.

To validate the finite experiments yourself on Linux:

```sh
python3 scripts/check_experiments.py --compiler clang-22
```

Actual execution results are in [experiment-validation.json](experiment-validation.json): six programs, eight successful cases, effective UID 501, on Linux 7.0.0-28-generic. This running kernel differs from the indexed Linux 7.2.11 source. No claim is made that the experiments were executed on 7.2.11 or on Fedora.

## Author another reading collection

`explorer/chapters.json` contains the chapter catalog; `explorer/lessons.json` contains the focused investigations. Both keep reading annotations separate from compiler facts. Each chapter defines a stable ID, number, subject, printed-page range, reading reference, original question, explanation, follow-up, related investigation IDs and conceptual nodes/edges. Focused investigations add glossary terms, an original experiment and checkpoint selectors. Keep node IDs unique and every edge tied to existing nodes. `explorer/learning.py` resolves selectors against the index and serves bundled original experiment files. The current collection is pinned to the verified 7.2.11 revision and arm64 syscall naming; other revisions/architectures need a reviewed mapping and validation.

Keep personal study context in a local profile. Do not embed learner history, private paths, copyrighted book pages, credentials or generated graph evidence in a curriculum. Add a focused navigation check for new checkpoint types and validate the actual pinned source before claiming coverage.
