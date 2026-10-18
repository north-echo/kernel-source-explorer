import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import type {
  Curriculum,
  GuidedContext,
  ReaderState,
  Topic,
  TopicNotes,
} from "./learningTypes";
import { emptyNotes } from "./learningTypes";
import { ConceptFlow } from "./ConceptFlow";
import { ChapterReading } from "./ChapterReading";
import { Availability } from "./Availability";
import { BookCatalog } from "./BookCatalog";
import { CodeWalkthrough } from "./CodeWalkthrough";
import { ReaderSettings } from "./ReaderSettings";
import type { RecoveryProps } from "./ReaderSettings";
import "./learning.css";
import { lessonActivity, lessonHash } from "./lessonRoute";
import { showActivity } from "./activityScroll";
type Props = {
  dataset?: string;
  reader: ReaderState;
  updateReader: (fn: (old: ReaderState) => ReaderState) => void;
  storageError: string;
  onExplore: (context: GuidedContext) => void;
} & RecoveryProps;
function route() {
  try {
    const raw = window.location.hash.startsWith("#learn/")
      ? window.location.hash.slice(7)
      : "";
    const [id, query] = raw.split("?");
    return { id: decodeURIComponent(id), params: new URLSearchParams(query) };
  } catch {
    return { id: "", params: new URLSearchParams() };
  }
}
export function Learning({
  dataset,
  reader,
  updateReader,
  storageError,
  onExplore,
  quarantine,
  replaceRecord,
}: Props) {
  const [content, setContent] = useState<Curriculum>();
  const [error, setError] = useState("");
  const [location, setLocation] = useState(route);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [revealedTopics, setRevealedTopics] = useState<Record<string, boolean>>(
    {},
  );
  const [copied, setCopied] = useState(false);
  const previousActivity = useRef("");
  const topicId = location.id;
  const revealed = !!revealedTopics[topicId];
  useEffect(() => {
    const change = () => {
      if (!window.location.hash.startsWith("#explore")) setLocation(route());
      else previousActivity.current = "";
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    api<Curriculum>("learning", dataset, controller.signal)
      .then((v) => {
        setContent(v);
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [dataset]);
  const topics = content ? [...content.lessons, ...content.chapters] : [];
  const topic = topics.find((t) => t.id === topicId);
  const activity = topic
    ? lessonActivity(topic, location.params)
    : { view: "question", segment: undefined, warning: "" };
  const tab = activity.view;
  const navigate = (view: string, segment?: string) => {
    if (topic) window.location.hash = lessonHash(topic.id, view, segment);
  };
  const bookTopic = topics.find((t) => t.id === reader.readingLesson);
  const labTopic = topics.find((t) => t.id === reader.activeLab?.lesson);
  const last = topics.find((t) => t.id === reader.lastLesson);
  useEffect(() => {
    if (window.location.hash.startsWith("#explore")) return;
    setCopied(false);
    setMobileMenu(!!quarantine);
    if (topic) {
      updateReader((old) =>
        old.lastLesson === topic.id ? old : { ...old, lastLesson: topic.id },
      );
      document.title =
        topic.title +
        " · " +
        ({
          question: topic.orientation ? "Reading guide" : "Question",
          code: "C walkthrough",
          experiment: "Experiment",
          containment: "Containment",
          source: "Source checkpoints",
        }[tab] || "Reading") +
        " · Kernel Source Explorer";
    } else
      document.title =
        (topicId === "catalog"
          ? "Chapter library"
          : topicId === "track"
            ? "Containment investigations"
            : "Reading companion") + " · Kernel Source Explorer";
    const heading = document.querySelector<HTMLElement>("#learning-content h1");
    const key = topicId + "/" + tab;
    if (heading) {
      if (previousActivity.current !== key) showActivity(heading);
      previousActivity.current = key;
    }
  }, [location, !!content]);
  const notes = reader.notes[topicId] || emptyNotes();
  function updateNotes(partial: Partial<TopicNotes>) {
    updateReader((old) => ({
      ...old,
      notes: {
        ...old.notes,
        [topicId]: { ...(old.notes[topicId] || emptyNotes()), ...partial },
      },
    }));
  }
  const experiment = topic?.experiment;
  const home = !topic && topicId !== "catalog" && topicId !== "track";
  return (
    <main className="learning-layout">
      <button
        className="mobile-reader-toggle"
        aria-expanded={mobileMenu}
        onClick={() => setMobileMenu(!mobileMenu)}
      >
        Reading navigation and notes
      </button>
      <aside className={"reading-sidebar" + (mobileMenu ? " mobile-open" : "")}>
        <a className="reading-home" href="#learn">
          Reading companion
        </a>
        <nav className="library-navigation" aria-label="Learning navigation">
          <a href="#learn/catalog">Browse all 64 chapters</a>
          <a href="#learn/track">Containment investigations</a>
          <a href="#learn/fork-memory?view=code&segment=fork">
            Chapter 2 companion Lab 001
          </a>
        </nav>
        <details className="investigation-menu">
          <summary>Focused investigations</summary>
          <nav aria-label="Reading topics">
            {content?.lessons.map((t) => (
              <a
                href={"#learn/" + t.id}
                key={t.id}
                aria-current={topicId === t.id ? "page" : undefined}
              >
                <span>
                  {t.chapter === "Modern extension"
                    ? t.chapter
                    : "Chapter " + t.chapter}
                </span>
                <strong>{t.title}</strong>
              </a>
            ))}
          </nav>
        </details>
        <ReaderSettings
          reader={reader}
          updateReader={updateReader}
          quarantine={quarantine}
          replaceRecord={replaceRecord}
        />
      </aside>
      <div className="reading-main" id="learning-content">
        {storageError && (
          <p role="alert" className="reading-error">
            {storageError}
          </p>
        )}
        {error && (
          <p role="alert" className="reading-error">
            {error}
          </p>
        )}
        {content?.index_error && (
          <p role="status" className="reading-error">
            Reading-only mode: {content.index_error}
          </p>
        )}
        {!content && !error && <p>Opening the reading companion…</p>}
        {content && home && (
          <>
            <header className="learning-intro">
              <h1
                id={
                  window.location.hash.startsWith("#explore")
                    ? undefined
                    : "workspace-content"
                }
                tabIndex={-1}
              >
                What are you reading?
              </h1>
              <p>
                Understand one mechanism. Ask where the authority comes from,
                and what would restrict it.
              </p>
            </header>
            <section className="reading-place">
              <div>
                <span>Your book position</span>
                <h2>{reader.readingReference || "Choose a chapter"}</h2>
              </div>
              {bookTopic && (
                <a className="primary-link" href={"#learn/" + bookTopic.id}>
                  {reader.readingLesson === "process-inheritance"
                    ? "Start with processes"
                    : "Open book position"}
                </a>
              )}
            </section>
            <section className="activity-place">
              <h2>Your saved lab</h2>
              {labTopic && reader.activeLab ? (
                <>
                  <p>
                    {labTopic.title} /{" "}
                    {labTopic.walkthrough?.find(
                      (s) => s.id === reader.activeLab?.segment,
                    )?.title || reader.activeLab.segment}
                  </p>
                  <a
                    className="primary-link"
                    href={`#learn/${labTopic.id}?view=code&segment=${encodeURIComponent(reader.activeLab.segment)}`}
                  >
                    Resume saved lab segment
                  </a>
                </>
              ) : (
                <>
                  <p>
                    No lab stopping point selected. Browsing and source visits
                    do not choose one for you.
                  </p>
                  <a href="#learn/fork-memory?view=code&segment=fork">
                    Open Lab 001 at the fork call
                  </a>
                </>
              )}
            </section>
            {reader.lastExploration && (
              <section className="last-source-exploration">
                <h2>Last source exploration</h2>
                <a href={reader.lastExploration.hash}>
                  {reader.lastExploration.label}
                </a>
                <p>
                  This exact source link is checked against the open dataset
                  when you return.
                </p>
              </section>
            )}
            {last && (
              <section className="last-exploration">
                <h2>Last reading exploration</h2>
                <a href={"#learn/" + last.id}>{last.title}</a>
                <p>
                  This is browsing history, separate from your book and saved
                  lab positions.
                </p>
              </section>
            )}
            {reader.discussionContext && (
              <details className="personal-reading-context">
                <summary>Your private thread to pick up</summary>
                <p>{reader.discussionContext}</p>
              </details>
            )}
            <section>
              <h2>Choose a focused investigation</h2>
              <p>
                No scores, deadlines or required exercises. Code, experiments
                and source visits are optional.
              </p>
              <div className="topic-list">
                {content.lessons.map((t) => (
                  <a href={"#learn/" + t.id} key={t.id}>
                    <span className="chapter-number">
                      {t.chapter === "Modern extension" ? "Linux" : t.chapter}
                    </span>
                    <div>
                      <h3>{t.title}</h3>
                      <p>{t.summary}</p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
            <p>
              <a href="#learn/catalog">Browse the full chapter library</a> or{" "}
              <a href="#learn/track">
                follow the containment investigation track
              </a>
              .
            </p>
            <details>
              <summary>About the book and evidence</summary>
              <p>{content.book.baseline}</p>
              <p>{content.book.usage}</p>
            </details>
          </>
        )}
        {content && topicId === "catalog" && (
          <>
            <h1
              id={
                window.location.hash.startsWith("#explore")
                  ? undefined
                  : "workspace-content"
              }
              tabIndex={-1}
            >
              Chapter library
            </h1>
            <BookCatalog
              chapters={content.chapters}
              glossary={content.glossary}
              investigations={content.lessons}
            />
          </>
        )}
        {content && topicId === "track" && (
          <>
            <h1
              id={
                window.location.hash.startsWith("#explore")
                  ? undefined
                  : "workspace-content"
              }
              tabIndex={-1}
            >
              Containment investigations
            </h1>
            <p className="track-question">
              What authority does this process have, where did it come from, and
              what would actually restrict it?
            </p>
            <p>
              Choose any stage. These are optional investigations, not gates.
              Distinguish state isolation, access checks, resource ceilings,
              lifecycle control and syscall filtering.
            </p>
            <ol className="containment-track">
              {content.track.map((stage) => (
                <li key={stage.title}>
                  <h2>{stage.title}</h2>
                  <p>{stage.status}</p>
                  {[...(stage.topics || []), ...(stage.chapters || [])].map(
                    (id) => {
                      const t = topics.find((t) => t.id === id);
                      return t ? (
                        <a key={id} href={"#learn/" + id}>
                          {t.title}
                        </a>
                      ) : null;
                    },
                  )}
                </li>
              ))}
            </ol>
            <h2>Modern Linux reading, with explicit requirements</h2>
            {content.modern.map((m) => (
              <details key={m.title}>
                <summary>
                  {m.title} — {m.availability}
                </summary>
                <p>{m.scope}</p>
                <p>
                  <strong>Requirements:</strong> {m.requirements}
                </p>
                <a href={m.url} target="_blank" rel="noreferrer">
                  Official documentation
                </a>
              </details>
            ))}
          </>
        )}
        {topic && content && (
          <>
            <header className="topic-header">
              <a href="#learn/catalog">All reading topics</a>
              <p className="book-reference">{topic.reference}</p>
              <h1
                id={
                  window.location.hash.startsWith("#explore")
                    ? undefined
                    : "workspace-content"
                }
                tabIndex={-1}
              >
                {topic.title}
              </h1>
              <button
                className="keep-place"
                onClick={() =>
                  updateReader((old) => ({
                    ...old,
                    readingLesson: topic.id,
                    readingReference: topic.reference,
                  }))
                }
              >
                {reader.readingLesson === topic.id &&
                reader.readingReference === topic.reference
                  ? "Reading place kept here"
                  : "Keep my reading place here"}
              </button>
              <Availability topic={topic} />
            </header>
            {activity.warning && <p role="status">{activity.warning}</p>}
            <div className="topic-layout">
              <div className="topic-content">
                <nav className="topic-tabs" aria-label="Ways to explore">
                  {[
                    [
                      "question",
                      topic.orientation
                        ? "Read and consider"
                        : "Think it through",
                    ],
                    ...(experiment
                      ? [
                          ["code", "Read the C code"],
                          ["experiment", "Optional experiment"],
                        ]
                      : []),
                    ...(topic.containment || topic.security_connection
                      ? [["containment", "Containment connection"]]
                      : []),
                    ...(topic.checkpoints.length
                      ? [["source", "Look at the source"]]
                      : []),
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      aria-pressed={tab === id}
                      onClick={() =>
                        navigate(
                          id,
                          id === "code" ? activity.segment : undefined,
                        )
                      }
                    >
                      {label}
                    </button>
                  ))}
                </nav>
                {tab === "question" && topic.orientation && (
                  <ChapterReading
                    key={topic.id}
                    topic={topic}
                    notes={notes}
                    onThinking={(thinking) => updateNotes({ thinking })}
                    revealed={revealed}
                    onReveal={() =>
                      setRevealedTopics((old) => ({
                        ...old,
                        [topicId]: !revealed,
                      }))
                    }
                  />
                )}
                {tab === "question" && !topic.orientation && (
                  <section className="thinking-space">
                    <h2>{topic.prompt}</h2>
                    <label>
                      My thinking (optional)
                      <textarea
                        value={notes.thinking}
                        maxLength={10000}
                        onChange={(e) =>
                          updateNotes({ thinking: e.target.value })
                        }
                        placeholder="What do you expect, and why?"
                      />
                    </label>
                    <p className="save-hint">
                      Saved locally as you type. No answer is graded.
                    </p>
                    <button
                      className="primary-button"
                      aria-expanded={revealed}
                      onClick={() =>
                        setRevealedTopics((old) => ({
                          ...old,
                          [topicId]: !revealed,
                        }))
                      }
                    >
                      {revealed
                        ? "Hide explanation"
                        : "Compare with an explanation"}
                    </button>
                    {revealed && (
                      <div className="authored-explanation">
                        <span className="annotation-label">
                          Companion explanation
                        </span>
                        {topic.explanation.map((p, i) => (
                          <p key={i}>{p}</p>
                        ))}
                        {topic.flow && (
                          <details className="diagram-reveal">
                            <summary>Show concept diagram</summary>
                            <ConceptFlow key={topic.id} flow={topic.flow} />
                          </details>
                        )}
                        {topic.concepts?.map((c) => (
                          <details className="chapter-concept" key={c.title}>
                            <summary>{c.title}</summary>
                            <p>
                              <strong>Situation:</strong> {c.scenario}
                            </p>
                            <p>{c.explanation}</p>
                            <p>
                              <strong>Assumptions:</strong> {c.assumptions}
                            </p>
                            <p>
                              <strong>Counterexample or limit:</strong>{" "}
                              {c.counterexample}
                            </p>
                            <p>
                              <strong>Interfaces:</strong> {c.apis.join(", ")}
                            </p>
                            {c.table && (
                              <div className="concept-table" tabIndex={0}>
                                <table>
                                  <caption>{c.title}</caption>
                                  <thead>
                                    <tr>
                                      {c.table.columns.map((label) => (
                                        <th key={label} scope="col">
                                          {label}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {c.table.rows.map((row, i) => (
                                      <tr key={i}>
                                        {row.map((cell, j) => (
                                          <td key={j}>{cell}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {c.code && (
                              <p className="small-copy">
                                Original code illustration; consult the stated
                                context and error-handling notes. This is
                                separate from a runtime-validated investigation.
                              </p>
                            )}
                            {c.code && (
                              <pre>
                                <code>{c.code}</code>
                              </pre>
                            )}
                            {c.references?.map((r) => (
                              <a
                                key={r.url}
                                href={r.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {r.title}
                              </a>
                            ))}
                          </details>
                        ))}
                        <div className="next-question">
                          <h3>Something to consider</h3>
                          <p>{topic.follow_up}</p>
                        </div>
                      </div>
                    )}
                  </section>
                )}
                {tab === "code" && experiment && (
                  <CodeWalkthrough
                    key={topic.id}
                    topic={topic}
                    reader={reader}
                    updateReader={updateReader}
                    requestedSegment={activity.segment}
                    onNavigate={(segment) => navigate("code", segment)}
                    onCheckpoint={(stop) =>
                      onExplore({
                        lesson: topic,
                        checkpoint: stop,
                        returnTo: lessonHash(
                          topic.id,
                          "code",
                          activity.segment,
                        ),
                      })
                    }
                  />
                )}
                {tab === "experiment" && experiment && (
                  <section className="optional-experiment">
                    <h2>Try it only if you’re curious</h2>
                    <p>{experiment.intro}</p>
                    <p>{experiment.assumptions}</p>
                    {reader.studyEnvironment && (
                      <p className="local-environment">
                        Your environment: {reader.studyEnvironment}
                      </p>
                    )}
                    <a
                      className="primary-link"
                      href={"/api/learning/" + topic.id + "/experiment"}
                      download
                    >
                      Download {experiment.file}
                    </a>
                    <p>
                      The browser does not compile or run anything. Work as a
                      normal unprivileged Linux user.
                    </p>
                    <div className="command-heading">
                      <h3>Compile and run</h3>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              experiment.commands,
                            );
                            setCopied(true);
                          } catch {
                            setCopied(false);
                          }
                        }}
                      >
                        {copied ? "Copied" : "Copy commands"}
                      </button>
                    </div>
                    <pre className="shell-commands">
                      <code>{experiment.commands}</code>
                    </pre>
                    <details className="expected-output">
                      <summary>Compare the expected result when ready</summary>
                      <pre>{experiment.expected}</pre>
                      <p>{experiment.observe}</p>
                      <p>{experiment.variability}</p>
                      <p>
                        Expected behavior does not record an experiment as run
                        by you.
                      </p>
                    </details>
                    <details>
                      <summary>One optional variation</summary>
                      <p>{experiment.variation}</p>
                    </details>
                    <details>
                      <summary>Troubleshooting and cleanup</summary>
                      {experiment.troubleshooting.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </details>
                    <label>
                      My experiment status
                      <select
                        aria-label="My experiment status"
                        value={notes.experiment}
                        onChange={(e) =>
                          updateNotes({
                            experiment: e.target
                              .value as TopicNotes["experiment"],
                          })
                        }
                      >
                        <option value="not-run">Not run</option>
                        <option value="traced">Read or reasoned through</option>
                        <option value="ran">I ran it myself</option>
                      </select>
                    </label>
                    <label>
                      My observation (optional)
                      <textarea
                        value={notes.observation}
                        maxLength={10000}
                        onChange={(e) =>
                          updateNotes({ observation: e.target.value })
                        }
                      />
                    </label>
                  </section>
                )}
                {tab === "containment" && (
                  <section className="containment-connection">
                    <h2>
                      {topic.security_connection
                        ? "What access does this example involve?"
                        : "Follow the authority"}
                    </h2>
                    {topic.security_connection ? (
                      <p>{topic.security_connection}</p>
                    ) : topic.containment ? (
                      <>
                        <p>{topic.containment.kind}</p>
                        <dl>
                          {[
                            ["subject", "Who is constrained"],
                            ["resource", "Resource or authority"],
                            ["origin", "Where it came from"],
                            ["operation", "Operation in question"],
                            ["enforcement", "What enforces the boundary"],
                            ["remaining", "Authority that remains"],
                            [
                              "establishes",
                              "What this establishes and leaves unresolved",
                            ],
                          ].map(([key, label]) => (
                            <div key={key}>
                              <dt>{label}</dt>
                              <dd>
                                {
                                  topic.containment![
                                    key as keyof typeof topic.containment
                                  ]
                                }
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </>
                    ) : (
                      <p>
                        Ask which process owns the resource, how it obtained
                        access, and which mechanism checks the next operation.
                        This reading guide does not implement a restriction
                        experiment.
                      </p>
                    )}
                    <p>
                      <a href="#learn/track">
                        See the containment investigation track
                      </a>
                    </p>
                  </section>
                )}
                {tab === "source" && (
                  <section className="source-invitations">
                    <h2>Follow one responsibility</h2>
                    <p className="layer-bridge">{topic.boundary}</p>
                    {topic.checkpoints.map((stop) => (
                      <article className="checkpoint" key={stop.id}>
                        <h3>{stop.title}</h3>
                        <p>{stop.question}</p>
                        {stop.available && stop.selection ? (
                          <>
                            <button
                              className="primary-button"
                              onClick={() =>
                                onExplore({
                                  lesson: {
                                    id: topic.id,
                                    title: topic.title,
                                    reference: topic.reference,
                                  },
                                  checkpoint: stop,
                                  returnTo: lessonHash(
                                    topic.id,
                                    tab,
                                    activity.segment,
                                  ),
                                })
                              }
                            >
                              Open checkpoint
                            </button>
                            {notes.visited[stop.id] === dataset && (
                              <span className="visited-note">
                                Opened in this dataset
                              </span>
                            )}
                          </>
                        ) : (
                          <p className="checkpoint-unavailable">
                            {stop.reason} You can still use the reading guide
                            and code.
                          </p>
                        )}
                      </article>
                    ))}
                  </section>
                )}
              </div>
              <aside className="topic-margin">
                {topic.number && (
                  <nav
                    className="chapter-neighbors"
                    aria-label="Adjacent chapters"
                  >
                    {content.chapters
                      .filter((c) => Math.abs(c.number! - topic.number!) === 1)
                      .map((c) => (
                        <a key={c.id} href={"#learn/" + c.id}>
                          {c.number! < topic.number! ? "←" : "→"} Chapter{" "}
                          {c.chapter}: {c.title}
                        </a>
                      ))}
                  </nav>
                )}
                {topic.terms.length > 0 && <h2>Words in this topic</h2>}
                {topic.terms.map((term) => (
                  <details key={term}>
                    <summary>{term}</summary>
                    <p>{content.glossary[term]}</p>
                  </details>
                ))}
                {topic.related && topic.related.length > 0 && (
                  <section className="related-investigations">
                    <h2>Related investigations</h2>
                    {topic.orientation && (
                      <p>
                        {topic.related_context ||
                          "These are separate activities, with their own code, experiment and source availability. Reading this guide does not run them."}
                      </p>
                    )}
                    {topic.related.map((id) => {
                      const t = topics.find((t) => t.id === id);
                      return t ? (
                        <a key={id} href={"#learn/" + id}>
                          {t.title}
                        </a>
                      ) : null;
                    })}
                  </section>
                )}
                {!topic.checkpoints.length && (
                  <p className="mapping-status">
                    No authored kernel checkpoint for this topic. The reading, C
                    or protocol explanation can be useful independently of a
                    kernel mapping.
                  </p>
                )}
                <details>
                  <summary>References and content review</summary>
                  {topic.references?.map((r) => (
                    <p key={r.url}>
                      <a href={r.url} target="_blank" rel="noreferrer">
                        {r.title}
                      </a>
                    </p>
                  ))}
                  <p>
                    {topic.review?.date}: {topic.review?.scope}
                  </p>
                  <p>{topic.review?.baseline}</p>
                  <p>{content.book.baseline}</p>
                  <p>
                    Corrections can be reported with the topic ID{" "}
                    <code>{topic.id}</code>, the disputed statement and
                    supporting documentation. A UI test is not a semantic
                    review.
                  </p>
                </details>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
