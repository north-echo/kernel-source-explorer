import { Fragment } from "react";
import type { Concept, Topic, TopicNotes } from "./learningTypes";
import { ConceptFlow } from "./ConceptFlow";

function OptionalConcept({ concept: c }: { concept: Concept }) {
  return (
    <details className="chapter-concept">
      <summary>{c.title}</summary>
      <p>{c.scenario}</p>
      <p>{c.explanation}</p>
      <p>
        <strong>Where this applies:</strong> {c.assumptions}
      </p>
      <p>
        <strong>A different case:</strong> {c.counterexample}
      </p>
      <p>
        <strong>Interfaces to look up:</strong> {c.apis.join(", ")}
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
        <section
          className="reading-code"
          aria-label="Code illustration context"
        >
          <h3>{c.code_kind || "Code fragment"}</h3>
          <p>
            {c.code_context ||
              "An illustration, not a complete runnable program."}
          </p>
          <p>{c.code_syntax}</p>
          <pre>
            <code>{c.code}</code>
          </pre>
        </section>
      )}
      {c.references?.map((r) => (
        <p key={r.url}>
          <a href={r.url} target="_blank" rel="noreferrer">
            {r.title}
          </a>
        </p>
      ))}
    </details>
  );
}

// Reading is available before reflection. The developed investigations retain their
// separate prediction-first view; neither presentation marks an experiment as run.
export function ChapterReading({
  topic,
  notes,
  onThinking,
  revealed,
  onReveal,
}: {
  topic: Topic;
  notes: TopicNotes;
  onThinking: (thinking: string) => void;
  revealed: boolean;
  onReveal: () => void;
}) {
  return (
    <section className="thinking-space chapter-reading">
      <h2>{topic.orientation!.heading}</h2>
      <p className="chapter-situation">{topic.reading}</p>
      <p className="chapter-prerequisite">{topic.orientation!.prerequisite}</p>
      <div className="chapter-main" aria-label="Chapter explanation">
        {topic.explanation.map((p, i) => (
          <Fragment key={i}>
            {topic.explanation_headings?.[i] && (
              <h3>{topic.explanation_headings[i]}</h3>
            )}
            <p>{p}</p>
          </Fragment>
        ))}
      </div>
      <div className="chapter-reflection">
        <h3>{topic.prompt}</h3>
        <p className="small-copy">
          A hypothetical question to reason about; no response is required.
        </p>
        <button
          className="primary-button"
          aria-expanded={revealed}
          onClick={onReveal}
        >
          {revealed ? "Hide explanation" : "Compare with an explanation"}
        </button>
        {revealed && (
          <div className="authored-explanation">
            <p>{topic.reflection_answer}</p>
          </div>
        )}
        <label>
          My thinking (optional)
          <textarea
            value={notes.thinking}
            maxLength={10000}
            onChange={(e) => onThinking(e.target.value)}
            placeholder="What would you like to remember or ask next?"
          />
        </label>
        <p className="save-hint">
          Saved locally as you type. No answer is graded.
        </p>
      </div>
      {topic.flow && (
        <details className="diagram-reveal">
          <summary>Show concept diagram</summary>
          <ConceptFlow key={topic.id} flow={topic.flow} />
        </details>
      )}
      {topic.concepts?.map((c) => (
        <OptionalConcept key={c.title} concept={c} />
      ))}
    </section>
  );
}
