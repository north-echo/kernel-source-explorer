import { Fragment, useEffect, useRef, useState } from "react";
import { sourceContext } from "./sourceContext";
import hljs from "highlight.js/lib/core";
import type { Checkpoint, ReaderState, Topic } from "./learningTypes";
export function CodeWalkthrough({
  topic,
  reader,
  updateReader,
  requestedSegment,
  onNavigate,
  onCheckpoint,
}: {
  topic: Topic;
  reader: ReaderState;
  updateReader: (fn: (old: ReaderState) => ReaderState) => void;
  requestedSegment?: string;
  onNavigate: (segment: string) => void;
  onCheckpoint: (stop: Checkpoint) => void;
}) {
  const segments = topic.walkthrough || [];
  const segment =
    segments.find((s) => s.id === requestedSegment) || segments[0];
  const index = segments.indexOf(segment);
  const [complete, setComplete] = useState(false);
  const [copied, setCopied] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    setCopied(false);
  }, [requestedSegment]);
  if (!topic.experiment || !segment) return null;
  const contextLines = sourceContext(
    topic.experiment.source,
    segment.start,
    segment.end,
  );
  const source = topic.experiment.source.split("\n");
  if (source.at(-1) === "") source.pop();
  return (
    <section
      className="code-walkthrough"
      aria-label="Canonical source walkthrough"
    >
      <h2 ref={title} tabIndex={-1}>
        Read and type a small piece
      </h2>
      <p>
        Choose any segment. Each is part of one complete program, not a
        separately runnable snippet. Line numbers always refer to the
        downloadable file.
      </p>
      <label>
        Walkthrough segment
        <select value={segment.id} onChange={(e) => onNavigate(e.target.value)}>
          {segments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} · lines {s.start}–{s.end}
            </option>
          ))}
        </select>
      </label>
      <nav className="code-actions" aria-label="Segment navigation">
        <button
          disabled={index === 0}
          onClick={() => onNavigate(segments[index - 1].id)}
        >
          Previous segment
        </button>
        <button
          disabled={index === segments.length - 1}
          onClick={() => onNavigate(segments[index + 1].id)}
        >
          Next segment
        </button>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Link copied" : "Copy segment link"}
        </button>
      </nav>
      <article className="segment-explanation" key={segment.id}>
        <h3>{segment.title}</h3>
        <h4>What happens</h4>
        <p>{segment.situation}</p>
        <details>
          <summary>Before this statement: a small prerequisite</summary>
          <p>{segment.prerequisite}</p>
        </details>
        <h4>How the code expresses it</h4>
        <ol className="reasoning-steps">
          {segment.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <details>
          <summary>What if we change or remove it?</summary>
          <p>{segment.change}</p>
        </details>
        <details>
          <summary>Why Linux behaves this way — optional depth</summary>
          {segment.explanation.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {segment.tables?.map((table) => (
            <div className="concept-table" tabIndex={0} key={table.title}>
              <table>
                <caption>{table.title}</caption>
                <thead>
                  <tr>
                    {table.columns.map((c) => (
                      <th scope="col" key={c}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </details>
      </article>
      <div className="code-actions">
        <button onClick={() => setComplete(!complete)}>
          {complete ? "Show selected segment" : "Show complete source"}
        </button>
        <a href={"/api/learning/" + topic.id + "/experiment"} download>
          Download {topic.experiment.file}
        </a>
        <button
          onClick={() =>
            updateReader((old) => ({
              ...old,
              activeLab: { lesson: topic.id, segment: segment.id },
            }))
          }
        >
          Save this lab segment
        </button>
      </div>
      {reader.activeLab?.lesson === topic.id &&
        reader.activeLab.segment === segment.id && (
          <p role="status">
            Saved stopping point: {topic.title} / {segment.title}. This records
            a position, not completion.
          </p>
        )}
      <p className="small-copy">
        Highlighted lines {segment.start}–{segment.end}; surrounding lines and
        enclosing braces provide context. Gaps are marked; the complete view
        contains every line. Comments beginning @step are optional navigation
        markers; you may omit them while typing.
      </p>
      <div
        className="canonical-source"
        role="region"
        aria-label="Numbered C source"
        tabIndex={0}
      >
        {source.map((line, i) =>
          complete || contextLines.has(i + 1) ? (
            <Fragment key={i}>
              {!complete && i > 0 && !contextLines.has(i) && (
                <div className="source-gap" aria-label="Lines omitted">
                  … intervening lines; use complete source …
                </div>
              )}
              <div
                className={
                  "canonical-line " +
                  (i + 1 >= segment.start && i + 1 <= segment.end
                    ? "segment-line"
                    : "")
                }
                data-line={i + 1}
              >
                <span aria-hidden="true">{i + 1}</span>
                <code
                  className={
                    line.includes("/* @step ") ? "navigation-marker" : undefined
                  }
                  dangerouslySetInnerHTML={{
                    __html:
                      hljs.highlight(line, { language: "c" }).value || " ",
                  }}
                />
              </div>
            </Fragment>
          ) : null,
        )}
      </div>
      <details>
        <summary>Source provenance</summary>
        <p>
          {topic.experiment.file} · SHA-256:{" "}
          <span className="source-hash">{topic.experiment.sha256}</span>
        </p>
        <p>
          Displayed lines and this download come from the same canonical file.
          Runtime validation and authored teaching explanations remain separate
          evidence.
        </p>
      </details>
      <details>
        <summary>Assumptions and expected variability</summary>
        <p>{topic.experiment.assumptions}</p>
        <p>{topic.experiment.variability}</p>
      </details>
      {topic.checkpoints.some((s) => s.available) && (
        <details>
          <summary>Optional reviewed source checkpoints</summary>
          {topic.checkpoints
            .filter((s) => s.available)
            .map((stop) => (
              <button key={stop.id} onClick={() => onCheckpoint(stop)}>
                {stop.title}
              </button>
            ))}
        </details>
      )}
    </section>
  );
}
