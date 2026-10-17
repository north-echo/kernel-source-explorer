# Review-driven improvement pass

Local implementation on October 16, 2026, against the consolidated `KERNEL_EXPLORER_REVIEW.md` backlog and the subsequent product direction. The supplied external review was byte-identical to the repository copy. The review remains unchanged. No commit, push, publication or remote CI execution was performed for this pass.

## Findings checked before implementation

Source inspection confirmed the paging calculation reused a larger window than the guided excerpt; the selected line doubled as the browsing center; passive topic visits changed the resume destination; unreadable notes loaded fallback state that subsequent navigation could persist; diagrams were rendered before predictions; ordinary explorer URLs carried no selection; and existing unusable indexes could take down curriculum delivery. Experiment inspection confirmed compressed branches, ambiguous short-transfer diagnostics and unchecked `atoi` conversion. The existing compiler-evidence and registered-source safety controls were retained.

## Review resolution

| Finding | Implemented change | Evidence |
| --- | --- | --- |
| R01 Paging | Boundary-derived adjacent windows, separate browse center/evidence anchor, return-to-call-site, explicit selected-anchor label | Arithmetic boundary checks; guided/full real-kernel paging, reload and history checks |
| R02 Continuity | Independent book position, explicitly saved lab segment, last reading topic and last successfully loaded source link | Migration/import checks and independent-position browser regression; source visits preserve saved lab |
| R03 Notes | Schema-2 validation/migration; quarantined invalid records; paused writes; raw download; import preview; merge/replace; retained recoverable backups | Corruption navigation/edit test; v1 preservation; unsupported-version rejection; export/import round trip |
| R04 Code | All nine canonical sources have numbered highlighting and marker-derived segments; the original six have detailed C explanations | All downloads/displayed lines/segment bounds match; source hashes match actual Linux execution report |
| R05 Predictions | Neutral investigation titles; thought field before worked model; explanations, diagrams and expected output revealed separately | No model/code in the initial prediction; reveals preserve not-run state |
| R06 Diagrams | Ownership, branching and loop models across the collection; corrected six flagged diagrams; substantive node annotations or static nodes; equivalent edge text | Diagram topology checks; browser interaction on all six flagged examples; desktop/phone screenshots |
| R07 Depth | All 64 chapters have three optional concept sections with situations, API names, assumptions/counterexamples, vocabulary, references and availability; selected original code/tables | Curriculum integrity checks and representative reading UI checks; this is still a companion rather than a section-by-section replacement for TLPI |
| R08 Links | Dataset-bound URLs restore symbol, evidence, anchor/window, origin checkpoint, query/path and graph/search view filters; Back/Forward traverses visits | Real ordinary/checkpoint direct links, reload, history and stale-dataset clearing regressions |
| R09 Discovery | Reviewed starts, recent symbol selections, curated reading suggestions, expanded curriculum/API/glossary search, kind/definition filters, pending/empty/error states | Fixture/API filtering and controlled delayed/failed-search tests |
| R10 Graph | Unique loaded neighbors counted separately from evidence; keyboard/full-name controls and grouped evidence chooser; selection highlighted | Actual repeated fixture evidence selection with TU/status/origin; existing direct-call canvas navigation retained |
| R11 Availability | Distinct missing mapping/index, fixture/revision mismatch, missing/partial/ambiguous facts and source failures; reading-only fallback for corrupt/incompatible metadata/schema | Real corrupt/incompatible SQLite API checks, resolver reasons, reading-only browser display and source retry regression |
| R12 Mobile/access | Compact reading menu and dataset details; current question higher; dedicated catalog; route titles/focus and skip link; scrollable code/tables | 390×844 learning/code/guided/full views, keyboard controls and 150% CSS-zoom reading check; screenshots inspected |
| R13 Diagnostics | Short counts separate from errno, checked numeric parsing, preserved descriptor flags, path/sentinel explanation, troubleshooting and variability | Eleven finite Linux execution cases; canonical/download checks |
| R14 References | Primary per-topic links, review/edition provenance, scoped historical/current behavior, correction instructions | Link-reachability report and selected primary semantic checks; reachability/UI tests are not technical certification |

## Additional investigations and containment

The original six examples remain separate finite programs, with stable investigation IDs so existing annotations migrate. Lab 001 now belongs to the Chapter 2 companion, with Chapter 24 deeper reading retained. Three new complete programs cover explicit launch inputs/cwd, readiness and signal supervision, and real seccomp syscall rejection. No extra kernel edges or mappings were authored for them.

Containment inventories identify who holds what authority, where it came from, the permitted/restricted operation, actual enforcement, remaining authority and evidence limits. The optional track keeps state isolation, access control, resource ceilings, lifecycle management and syscall mediation distinct. Namespaces, cgroups, Landlock, network policy and a composed sandbox remain reading/design material with requirements and unavailability stated.

The seccomp experiment is a deliberately weak deny-one policy. It is useful as a mechanism observation and does not meaningfully confine all file/network behavior. Its actual success is recorded below; an unsupported probe or exit 77 is not passed validation. The supervisor signals only its own fork-created child and has a finite child backstop; it is not a production hostile-descendant supervisor.

## Validation actually performed

- **28 Python checks** passed locally, including the installed pinned-kernel checkpoint test. Twenty-seven do not require the real kernel dataset.
- **19 fixture/learning Playwright checks** passed: sixteen browser flows and three pure state/route/paging checks.
- **Five additional real-kernel browser flows** passed, including contiguous guided/full paging, stable anchors, reloadable evidence/checkpoint links, Back/Forward, mismatched datasets, source failure/retry, and saved-lab independence.
- TypeScript checking and the production UI build passed. The existing native fixture compiler tests were rerun by pytest; the whole kernel was not rebuilt or reindexed in this pass.
- **Nine programs, eleven runtime cases** compiled with `-std=c11 -Wall -Wextra -Werror` and ran unprivileged: Ubuntu 26.04 aarch64, Clang 22.1.2, effective UID 501, running Linux **7.0.0-28-generic**. `CONFIG_SECCOMP=y` and `CONFIG_SECCOMP_FILTER=y` were read from that runtime's `/boot/config-*`. The actual before/after syscall test showed `getppid` allowed before, rejected with `EPERM` after, and `getpid` still allowed. [Runtime report and source hashes](improvement-experiment-validation.json).
- All fourteen existing checkpoints still resolved against the successful, unambiguous facts in the seven-TU Linux **7.2.11** index; their excerpts passed the registered source-hash checks. This source version is different from the runtime above.
- Documentation link reachability was checked, four bad URLs were corrected, and primary manual mirrors were used where publisher requests returned 403. [Reference report](reference-validation.json). Selected ACL, signal, condition-variable, socket and modern-mechanism semantics were checked against primary documentation.
- Desktop, 390×844 and enlarged-text (150% CSS zoom) views were inspected. Screenshots use generic test profiles, not private reader context. Browser checks include keyboard selection and code/source overflow handling. This is representative testing, not a complete assistive-technology audit.
- Fedora, x86-64 execution, Windows, and runtime Landlock/namespaces/cgroups were **not validated**. The dedicated Linux test VM was returned to its original stopped state after results were copied.
- Remote CI was not run because this pass was not pushed. Existing CI definitions remain available for a separately authorized publication.

## Remaining limits

All 64 chapters now have richer reading support, but there are nine complete runtime-validated investigations, not 64 full labs. Short chapter code illustrations are labeled separately from complete tested programs. The appendices and published solutions are not reproduced; there is no grading or conversational model service.

Only seven kernel TUs are indexed. The fourteen existing mappings remain arm64/revision-specific, and absence of a relationship is not absence of behavior. Indirect targets are not inferred. Graph grouping covers loaded evidence; records outside a server page still require loading. Neither static call evidence nor a small runtime observation establishes a complete security boundary.

Import is explicit and bounded to 2 MiB. Records are plaintext browser-local data; there is no encrypted/multiuser store or automatic cross-browser/cross-tab reconciliation. Merge conflicts use the documented incoming-topic policy and preserve a raw backup; the interface does not attempt prose-level merging of two predictions.

The three new programs are independently scoped building blocks, not an integrated hardened launcher. Seccomp's x86-64 code path is present but unexecuted here. There is no automatic namespace creation, cgroup delegation, Landlock ruleset, network-policy integration, privileged configuration or composed sandbox attestation.

Dependency tooling emits the existing Python/Node deprecation warnings, and the production build retains the graph-library chunk-size advisory. These did not prevent passing checks.

## Open and resume

Run `make web` and `make serve` in the project after setup, then open **http://127.0.0.1:8000**. The current local service uses the installed verified dataset; reading/code still work without it.

Open **http://127.0.0.1:8000/#learn/fork-memory?view=code&segment=fork** to reach the canonical `pid_t child_pid = fork();` segment. Choose **Save this lab segment** when selecting that stopping point; Home → **Resume saved lab segment** then returns there. This is an explicit position choice. The pass does not silently assign a lab to old state or claim the learner ran it.
