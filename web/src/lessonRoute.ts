import type { Topic } from "./learningTypes";
export function lessonHash(id: string, view = "question", segment?: string) {
  const params = new URLSearchParams({ view });
  if (view === "code" && segment) params.set("segment", segment);
  return "#learn/" + encodeURIComponent(id) + "?" + params;
}
export function lessonActivity(topic: Topic, params: URLSearchParams) {
  const allowed = [
    "question",
    ...(topic.experiment ? ["code", "experiment"] : []),
    ...(topic.containment ? ["containment"] : []),
    ...(topic.checkpoints.length ? ["source"] : []),
  ];
  const requested = params.get("view") || "question";
  let view = allowed.includes(requested) ? requested : "question";
  let warning =
    view === requested
      ? ""
      : "This activity is unavailable; showing the question.";
  const requestedSegment = params.get("segment");
  let segment = topic.walkthrough?.[0]?.id;
  if (requestedSegment) {
    if (
      view === "code" &&
      topic.walkthrough?.some((s) => s.id === requestedSegment)
    )
      segment = requestedSegment;
    else
      warning =
        "This segment is unavailable in this activity; showing a valid starting point.";
  }
  return { view, segment, warning };
}
// Source links may retain a lesson activity, never an external destination.
export function validLessonReturn(
  value: string | undefined,
  lesson: string | undefined,
) {
  if (!value) return undefined;
  if (
    !lesson ||
    value.length > 1000 ||
    !value.startsWith("#learn/" + encodeURIComponent(lesson) + "?")
  )
    throw new Error("Invalid lesson return activity.");
  return value;
}
