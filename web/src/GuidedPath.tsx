import type { GuidedContext, Topic } from "./learningTypes";
import { checkpointContext } from "./explorerTeaching";

// Path position is navigation only. It never writes a saved lab or completion state.
export function GuidedPath({
  lesson,
  context,
  onVisit,
}: {
  lesson: Topic;
  context: GuidedContext;
  onVisit: (context: GuidedContext) => void;
}) {
  const path = lesson.guided_path!;
  const position =
    context.stage === "connection"
      ? path.steps.length
      : path.steps.findIndex((s) => s.checkpoint === context.checkpoint.id);
  return (
    <nav className="guided-path" aria-label="Recommended memory journey">
      <p>
        Position {position + 1} of {path.steps.length + 1} · Choose any step
      </p>
      <ol>
        {path.steps.map((step, index) => {
          const checkpoint = lesson.checkpoints.find(
            (c) => c.id === step.checkpoint,
          )!;
          return (
            <li key={step.checkpoint}>
              <button
                aria-current={position === index ? "step" : undefined}
                disabled={!checkpoint.available}
                onClick={() =>
                  onVisit({
                    ...checkpointContext(lesson, checkpoint),
                    journey: context.journey,
                    returnTo: context.returnTo,
                  })
                }
              >
                {index + 1}. {step.title}
              </button>
              {!checkpoint.available && <small>{checkpoint.reason}</small>}
            </li>
          );
        })}
        <li>
          <button
            aria-current={context.stage ? "step" : undefined}
            disabled={
              !lesson.checkpoints.find(
                (c) => c.id === path.steps.at(-1)!.checkpoint,
              )?.available
            }
            onClick={() =>
              onVisit({
                ...context,
                checkpoint: lesson.checkpoints.find(
                  (c) => c.id === path.steps.at(-1)!.checkpoint,
                )!,
                stage: "connection",
              })
            }
          >
            {path.steps.length + 1}. {path.connection_title}
          </button>
        </li>
      </ol>
    </nav>
  );
}

export function JourneyConnection({
  lesson,
  context,
  onDeeper,
}: {
  lesson: Topic;
  context: GuidedContext;
  onDeeper: () => void;
}) {
  return (
    <section
      className="journey-connection explorer-orientation"
      aria-label="Connection to the C experiment"
    >
      <h2 tabIndex={-1}>A useful stopping point</h2>
      <p className="small-copy">
        Authored explanation · Two static checkpoints and the interface contract
      </p>
      {lesson.guided_path!.connection.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <div className="explorer-actions">
        <a
          className="primary-link"
          href={context.returnTo || "#learn/fork-memory?view=code&segment=fork"}
        >
          Return to the C fork experiment
        </a>
        <button onClick={onDeeper}>Optional: explore deeper</button>
        <a
          href={`#learn/${lesson.id}?view=code&segment=${lesson.guided_path!.comparison_segment}`}
        >
          Compare the parent and child variables
        </a>
      </div>
      <details>
        <summary>Contracts and remaining questions</summary>
        <p>
          Assumptions: one thread, successful ordinary fork, an ordinary private
          int. Explicit shared mappings are a contrasting case. This visit does
          not follow write faults, page-table copying, or all cleanup helpers.
        </p>
        {lesson.references
          ?.filter((r) => /fork\.2|clone\.2/.test(r.title))
          .map((r) => (
            <p key={r.url}>
              <a href={r.url}>{r.title}</a>
            </p>
          ))}
      </details>
    </section>
  );
}
