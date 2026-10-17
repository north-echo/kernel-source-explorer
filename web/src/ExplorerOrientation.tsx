import type { Checkpoint, Curriculum, GuidedContext } from "./learningTypes";
import type { Edge, Loc, Location, SymbolInfo } from "./types";
import {
  checkpointContext,
  relationshipMeaning,
  reviewedEvidence,
  sameLocation,
  sourceCategory,
} from "./explorerTeaching";
export function jumpTo(selector: string) {
  const element = document.querySelector<HTMLElement>(selector);
  element?.focus({ preventScroll: true });
  element?.scrollIntoView({ block: "start" });
}
export function ExplorerOrientation({
  content,
  dataset,
  selected,
  focus,
  edge,
  locations,
  guided,
  focused,
  onDefinition,
  onCallee,
  onCallers,
  onSurrounding,
  onCheckpoint,
}: {
  focused?: boolean;
  content?: Curriculum;
  dataset?: string;
  selected: SymbolInfo;
  focus?: Loc;
  edge?: Edge;
  locations: Location[];
  guided?: GuidedContext;
  onDefinition: () => void;
  onCallee: () => void;
  onCallers: () => void;
  onSurrounding: () => void;
  onCheckpoint: (context: GuidedContext) => void;
}) {
  const reviewed = reviewedEvidence(content, dataset);
  const matches = reviewed.filter((item) =>
    edge
      ? item.checkpoint.selection?.edge?.id === edge.id &&
        sameLocation(focus, item.checkpoint.selection.location)
      : sameLocation(item.checkpoint.selection?.location, focus) &&
        item.checkpoint.selection?.symbol_id === selected.id,
  );
  // Shared compiler facts may support more than one lesson; retain this question’s framing.
  const exact =
    matches.find(
      (item) =>
        item.lesson.id === guided?.lesson.id &&
        item.checkpoint.id === guided?.checkpoint.id,
    ) || matches[0];
  const role = reviewed.find(
    (item) =>
      item.checkpoint.selection?.symbol_id === selected.id ||
      item.checkpoint.selection?.edge?.target_id === selected.id,
  );
  const description =
    role &&
    (role.checkpoint.selection?.symbol_id === selected.id
      ? role.checkpoint.reading?.caller
      : role.checkpoint.reading?.callee);
  const reading = exact?.checkpoint.reading;
  const inside = reviewed
    .filter(
      (item) =>
        item.checkpoint.selection?.symbol_id === selected.id &&
        item.checkpoint.id !== exact?.checkpoint.id,
    )
    .filter(
      (item, i, all) =>
        all.findIndex(
          (other) =>
            other.checkpoint.selection?.edge?.id ===
            item.checkpoint.selection?.edge?.id,
        ) === i,
    )
    .slice(0, 2);
  const evidenceHere = !edge || sameLocation(focus, edge);
  const definition = locations.find((l) => l.is_definition);
  const kind = sourceCategory(selected, focus, edge, locations);
  if (focused && exact && (reading?.steps || reading?.groups)) {
    const path = exact.lesson.guided_path;
    const index =
      path?.steps.findIndex((s) => s.checkpoint === exact.checkpoint.id) ?? -1;
    const next = path?.steps[index + 1];
    const checkpoint = exact.lesson.checkpoints.find(
      (c) => c.id === next?.checkpoint,
    );
    return (
      <section
        className="explorer-orientation memory-reading"
        aria-label="Selection orientation"
      >
        <div className="orientation-heading">
          <div>
            <h2 tabIndex={-1}>{selected.name}</h2>
            <p>
              {kind} · {focus?.file}:{focus?.line}:{focus?.column}
            </p>
          </div>
          <nav aria-label="Explorer panes">
            <button onClick={() => jumpTo(".source-pane h2")}>Source</button>
            <button onClick={() => jumpTo(".checkpoint-graph h2")}>
              Graph
            </button>
          </nav>
        </div>
        <p>
          <strong>Why here:</strong>{" "}
          {index === 0
            ? "This call delegates memory setup; the following check decides whether creation can continue."
            : "This call sits in the duplication branch. Read the CLONE_VM choice just above it."}
        </p>
        <section
          className="checkpoint-reading"
          aria-label="Statement breakdown"
        >
          <h3>Read this statement in small pieces</h3>
          {reading.groups ? (
            reading.groups.map((group) => (
              <section className="memory-explanation-group" key={group.title}>
                <h4>{group.title}</h4>
                {group.steps.map((step) => (
                  <p key={step}>{step}</p>
                ))}
              </section>
            ))
          ) : (
            <ol>
              {reading.steps?.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
        </section>
        <div className="explorer-actions recommended-continuation">
          {checkpoint ? (
            <button
              className="primary-link"
              disabled={!checkpoint.available}
              onClick={() =>
                onCheckpoint({
                  ...checkpointContext(exact.lesson, checkpoint),
                  journey: guided?.journey,
                  returnTo: guided?.returnTo,
                })
              }
            >
              Continue: examine the memory-sharing choice
            </button>
          ) : (
            <button
              className="primary-link"
              onClick={() => onCheckpoint({ ...guided!, stage: "connection" })}
            >
              Connect this result to the C experiment
            </button>
          )}
          {checkpoint && !checkpoint.available && <p>{checkpoint.reason}</p>}
        </div>
        {reading.prerequisites?.map((p) => (
          <details key={p.title}>
            <summary>{p.title}</summary>
            <p>{p.text}</p>
          </details>
        ))}
        {reading.names && (
          <details className="memory-names" key={exact.checkpoint.id} open>
            <summary>How the names connect across the two functions</summary>
            <table>
              <caption>Names in this visit</caption>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                {reading.names.map(([name, meaning]) => (
                  <tr key={name}>
                    <th scope="row">{name}</th>
                    <td>{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
        <details className="definition-detours">
          <summary>Optional definitions and deeper exploration</summary>
          <p>
            The highlighted line is a call site. A definition shows the called
            function’s body. Opening it switches to free exploration; Return to
            guided step restores this position.
          </p>
          <div className="explorer-actions">
            <button onClick={onDefinition}>
              Optional: read the full {selected.name} function
            </button>
            {edge?.target_id && (
              <button onClick={onCallee}>
                Optional: read the full {edge.target_name} function
              </button>
            )}
          </div>
          <p>
            {exact.checkpoint.ignore} Reviewed {reading.reviewed} against the
            pinned source. Graph arrows are compiler evidence, not execution
            order.
          </p>
          {exact.lesson.references
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
  return (
    <section
      className="explorer-orientation"
      aria-label="Selection orientation"
    >
      {guided && (
        <p className="orientation-question">
          Question:{" "}
          {content?.lessons.find(
            (l) => l.id === (guided.journey || guided.lesson.id),
          )?.explorer_start?.question || guided.checkpoint.question}
        </p>
      )}
      <div className="orientation-heading">
        <div>
          <h2 tabIndex={-1}>{selected.name}</h2>
          <p>
            {selected.kind} · {kind}{" "}
            {focus && (
              <span>
                at {focus.file}:{focus.line}:{focus.column}
              </span>
            )}
          </p>
        </div>
        <nav aria-label="Explorer panes">
          <button
            onClick={() =>
              jumpTo(".relationships-pane h2, .checkpoint-graph h2")
            }
          >
            Graph
          </button>
          <button onClick={() => jumpTo(".source-pane h2")}>Source</button>
          {!guided && (
            <button onClick={() => jumpTo(".search-pane input")}>Search</button>
          )}
        </nav>
      </div>
      {description ? (
        <p className="authored-responsibility">
          <strong>Reviewed teaching annotation:</strong> {description}
        </p>
      ) : (
        <p>
          No reviewed responsibility description for this symbol. The index
          identifies its kind and source locations; use the definition to
          inspect what it does.
        </p>
      )}
      <p className="selection-reason">
        <strong>Why here:</strong>{" "}
        {edge
          ? evidenceHere
            ? relationshipMeaning(edge)
            : relationshipMeaning(edge).replace(
                "at the highlighted source location",
                `at ${edge.file}:${edge.line}:${edge.column}`,
              ) +
              " The current highlight is a separate source position; Return to call site recovers the evidence anchor."
          : definition && sameLocation(definition, focus)
            ? "This is an indexed definition: start with its signature or type fields."
            : "This location was selected from indexed locations or a source link. Check its category before interpreting it."}
      </p>
      <p className="notice-first">
        <strong>Notice first:</strong>{" "}
        {reading
          ? reading.statement
          : edge
            ? "Match the highlighted token to the selected relationship, then inspect the surrounding condition."
            : "Find the name at the highlighted column and the surrounding declaration or definition."}
      </p>
      {!definition && (
        <p>
          No indexed definition was returned. Its declaration may still be
          inspected in the source picker; a definition may be outside this
          index.
        </p>
      )}
      <div className="explorer-actions">
        <button disabled={!definition} onClick={onDefinition}>
          Read this {selected.kind === "function" ? "function’s" : "symbol’s"}{" "}
          definition
        </button>
        {edge?.target_id && edge.kind === "direct_call" && (
          <button onClick={onCallee}>
            Inspect called function: {edge.target_name}
          </button>
        )}
        {guided && (
          <button onClick={() => onCheckpoint(guided)}>
            Return to the reviewed checkpoint
          </button>
        )}
      </div>
      {reading && (
        <details className="checkpoint-reading">
          <summary>Read this statement in small pieces</summary>
          <p>
            <strong>Inputs or condition:</strong> {reading.inputs}
          </p>
          <p>
            <strong>What uses the result:</strong> {reading.result}
          </p>
          <p>
            <strong>C and kernel notation:</strong> {reading.syntax}
          </p>
          <p>
            <strong>Leave for later:</strong> {exact?.checkpoint.ignore}
          </p>
          <p className="small-copy">
            Authored annotation reviewed {reading.reviewed}; matched to this
            dataset’s resolved evidence selector.
          </p>
        </details>
      )}
      <details className="explorer-next">
        <summary>What can I investigate next?</summary>
        {reading?.next.map((next) => {
          const lesson = content?.lessons.find((l) => l.id === next.lesson);
          const checkpoint = lesson?.checkpoints.find(
            (c) => c.id === next.checkpoint,
          );
          return lesson && checkpoint ? (
            <div key={next.lesson + next.checkpoint}>
              <p>
                <strong>Reviewed next question:</strong> {next.question}
              </p>
              <button
                disabled={!checkpoint.available}
                onClick={() =>
                  onCheckpoint({
                    ...checkpointContext(lesson, checkpoint),
                    journey: guided?.journey || guided?.lesson.id || lesson.id,
                    returnTo:
                      guided?.returnTo ||
                      checkpointContext(lesson, checkpoint).returnTo,
                  })
                }
              >
                Visit {checkpoint.title}
              </button>
              {!checkpoint.available && <p>{checkpoint.reason}</p>}
            </div>
          ) : null;
        })}
        {inside.map((item) => (
          <div key={item.lesson.id + item.checkpoint.id}>
            <p>
              <strong>Reviewed location in this symbol:</strong>{" "}
              {item.checkpoint.question}
            </p>
            <button
              onClick={() =>
                onCheckpoint({
                  ...checkpointContext(item.lesson, item.checkpoint),
                  journey:
                    guided?.journey || guided?.lesson.id || item.lesson.id,
                  returnTo:
                    guided?.returnTo ||
                    checkpointContext(item.lesson, item.checkpoint).returnTo,
                })
              }
            >
              Inspect {item.checkpoint.title}
            </button>
          </div>
        ))}
        <p>
          Ordinary graph navigation helps you inspect evidence; neighbors are
          not ranked teaching recommendations.
        </p>
        <div className="explorer-actions">
          <button disabled={selected.kind !== "function"} onClick={onCallers}>
            See where this function is called
          </button>
          <button onClick={onSurrounding}>
            Examine surrounding branches and errors
          </button>
          <button onClick={() => jumpTo(".trail-panel textarea")}>
            Save this location with a note
          </button>
          {guided && (
            <a href={guided.returnTo || "#learn/" + guided.lesson.id}>
              Return to the investigation
            </a>
          )}
        </div>
      </details>
      <details>
        <summary>A method for inspecting unfamiliar source</summary>
        <ol>
          <li>Find the function signature or type declaration.</li>
          <li>Identify its inputs and any pointed-to records.</li>
          <li>
            Locate the selected operation; a call site is not the callee’s
            definition.
          </li>
          <li>
            Inspect surrounding branches and failure/cleanup paths before
            generalizing.
          </li>
        </ol>
      </details>
      {exact?.lesson.containment && (
        <details>
          <summary>Authority and containment at this checkpoint</summary>
          <p>
            <strong>Resource:</strong> {exact.lesson.containment.resource}
          </p>
          <p>
            <strong>Origin:</strong> {exact.lesson.containment.origin}
          </p>
          <p>
            <strong>Mechanism:</strong> {exact.lesson.containment.enforcement}
          </p>
          <p>
            <strong>Remaining authority:</strong>{" "}
            {exact.lesson.containment.remaining}
          </p>
          <p>
            {exact.lesson.containment.establishes} This source visit is static
            evidence; it does not establish that the experiment ran or that a
            complete sandbox exists.
          </p>
        </details>
      )}
      <p className="explorer-scope">
        Compiler facts describe source relationships, not a runtime trace. The
        graph is bounded by the index, filters and loaded evidence.
      </p>
    </section>
  );
}
