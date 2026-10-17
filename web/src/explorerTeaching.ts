import type { Checkpoint, Curriculum, Topic } from "./learningTypes";
import type { Edge, Loc, Location, SymbolInfo } from "./types";
export const sameLocation = (a: Loc | undefined, b: Loc | undefined) =>
  !!a && !!b && a.file === b.file && a.line === b.line && a.column === b.column;
export function reviewedEvidence(
  content: Curriculum | undefined,
  dataset: string | undefined,
) {
  return (
    content?.lessons.flatMap((lesson) =>
      lesson.checkpoints
        .filter(
          (checkpoint) =>
            checkpoint.available &&
            checkpoint.dataset_id === dataset &&
            checkpoint.reading &&
            checkpoint.selection,
        )
        .map((checkpoint) => ({ lesson, checkpoint })),
    ) || []
  );
}
export function sourceCategory(
  symbol: SymbolInfo,
  location: Loc | undefined,
  edge: Edge | undefined,
  locations: Location[],
) {
  if (edge) {
    const spelling =
      edge.spelling_file &&
      sameLocation(location, {
        file: edge.spelling_file,
        line: edge.spelling_line!,
        column: edge.spelling_column!,
      });
    const macro =
      edge.spelling_file &&
      (edge.spelling_file !== edge.file ||
        edge.spelling_line !== edge.line ||
        edge.spelling_column !== edge.column);
    if (spelling && macro) return "Macro spelling location";
    if (!sameLocation(location, edge))
      return "Source position beside selected evidence";
    const name =
      edge.kind === "direct_call"
        ? "Direct call"
        : edge.kind === "indirect_call"
          ? "Unresolved indirect call"
          : edge.kind === "declared_type"
            ? "Declared type relationship"
            : "Symbol reference";
    return (macro ? "Macro expansion location · " : "") + name;
  }
  const matched = locations.find((loc) => sameLocation(loc, location));
  if (!matched) return "Source position without matched declaration evidence";
  if (!matched.is_definition) return "Declaration";
  return symbol.kind === "function"
    ? "Function definition"
    : ["struct", "union", "enum", "typedef"].includes(symbol.kind)
      ? "Type definition"
      : "Symbol definition";
}
export function relationshipMeaning(edge: Edge) {
  if (edge.kind === "indirect_call" && !edge.target_id)
    return `${edge.source_name} contains an indirect call at this location. The compiler supplied no resolved target in this index; no callee is available to open.`;
  if (edge.kind === "direct_call")
    return `${edge.source_name} contains a direct call to ${edge.target_name} at the highlighted source location. The arrow points from caller to callee.`;
  if (edge.kind === "declared_type")
    return `${edge.source_name} has a compiler-recorded declared-type relationship to ${edge.target_name}. This arrow describes a type, not a function call.`;
  return `${edge.source_name} contains a compiler-recorded reference to ${edge.target_name}. A reference is a use of a symbol, not necessarily a call.`;
}
export function matchingQuestions(
  content: Curriculum | undefined,
  query: string,
) {
  const value = query.toLowerCase().trim();
  return (
    content?.lessons.filter(
      (t) =>
        t.explorer_start &&
        `${t.explorer_start.question} ${t.explorer_start.terms.join(" ")} ${t.apis?.join(" ")}`
          .toLowerCase()
          .includes(value),
    ) || []
  );
}
export function checkpointContext(lesson: Topic, checkpoint: Checkpoint) {
  return {
    lesson,
    checkpoint,
    journey: lesson.id,
    returnTo: `#learn/${lesson.id}?view=code&segment=${lesson.explorer_start?.segment || lesson.walkthrough?.[0]?.id || ""}`,
  };
}
