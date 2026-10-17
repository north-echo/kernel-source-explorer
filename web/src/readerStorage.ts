import type { ReaderState, TopicNotes } from "./learningTypes";
export const READER_MAX_BYTES = 2 * 1024 * 1024;
export const readerBytes = (raw: string) =>
  new TextEncoder().encode(raw).byteLength;
export const READER_KEY = "kse-reader-v1"; // Keep the original key so existing readers are migrated.
export const defaultReader = (): ReaderState => ({
  version: 2,
  readingLesson: "process-inheritance",
  readingReference: "Chapter 2 · §2.7 Processes",
  interests: [],
  lastLesson: "",
  studyEnvironment: "",
  discussionContext: "",
  notes: {},
});
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const safeKey = (s: string) =>
  !["__proto__", "constructor", "prototype"].includes(s);
const text = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length <= max;
export function parseReader(raw: string): ReaderState {
  if (readerBytes(raw) > READER_MAX_BYTES)
    throw new Error(
      "Notes exceed the 2 MiB UTF-8 limit. The previous stored record is unchanged.",
    );
  const v: unknown = JSON.parse(raw);
  if (!record(v) || ![1, 2].includes(v.version as number))
    throw new Error("Unsupported notes version. Keep a raw copy for recovery.");
  if (
    !text(v.readingLesson, 200) ||
    !text(v.readingReference, 200) ||
    !text(v.lastLesson, 200) ||
    !Array.isArray(v.interests) ||
    v.interests.length > 8 ||
    !v.interests.every((x) => text(x, 80)) ||
    !record(v.notes) ||
    Object.keys(v.notes).length > 500
  )
    throw new Error("The reading record has invalid fields.");
  const notes: Record<string, TopicNotes> = {};
  for (const [id, n] of Object.entries(v.notes)) {
    if (
      !safeKey(id) ||
      !text(id, 200) ||
      !record(n) ||
      !text(n.thinking, 10000) ||
      !text(n.observation, 10000) ||
      !["not-run", "traced", "ran"].includes(n.experiment as string) ||
      !record(n.visited) ||
      Object.keys(n.visited).length > 500 ||
      !Object.entries(n.visited).every(
        ([k, x]) => safeKey(k) && text(k, 200) && text(x, 200),
      )
    )
      throw new Error("An annotation has invalid fields.");
    notes[id] = {
      thinking: n.thinking,
      observation: n.observation,
      experiment: n.experiment as TopicNotes["experiment"],
      visited: { ...n.visited } as Record<string, string>,
    };
  }
  for (const key of ["studyEnvironment", "discussionContext"])
    if (
      v[key] !== undefined &&
      !text(v[key], key === "discussionContext" ? 2000 : 200)
    )
      throw new Error("The profile has an invalid field.");
  let activeLab: ReaderState["activeLab"];
  if (v.version === 2 && v.activeLab !== undefined) {
    if (
      !record(v.activeLab) ||
      !text(v.activeLab.lesson, 200) ||
      !text(v.activeLab.segment, 200)
    )
      throw new Error("Invalid saved lab position.");
    activeLab = { lesson: v.activeLab.lesson, segment: v.activeLab.segment };
  }
  let lastExploration: ReaderState["lastExploration"];
  if (v.version === 2 && v.lastExploration !== undefined) {
    if (
      !record(v.lastExploration) ||
      !text(v.lastExploration.hash, 16000) ||
      !v.lastExploration.hash.startsWith("#explore?") ||
      !text(v.lastExploration.label, 500)
    )
      throw new Error("Invalid source exploration record.");
    lastExploration = {
      hash: v.lastExploration.hash,
      label: v.lastExploration.label,
    };
  }
  return {
    ...defaultReader(),
    ...(lastExploration ? { lastExploration } : {}),
    readingLesson: v.readingLesson,
    readingReference: v.readingReference,
    lastLesson: v.lastLesson,
    interests: v.interests as string[],
    studyEnvironment: (v.studyEnvironment as string) || "",
    discussionContext: (v.discussionContext as string) || "",
    notes,
    ...(activeLab ? { activeLab } : {}),
  };
}
export function mergeReader(
  current: ReaderState,
  incoming: ReaderState,
): ReaderState {
  // Imported positions/profile are explicit; matching note fields use the imported record.
  // Conflicting annotations are retained in a downloadable pre-import backup.
  return parseReader(
    JSON.stringify({
      ...incoming,
      notes: { ...current.notes, ...incoming.notes },
    }),
  );
}
export function downloadRecord(raw: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([raw], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// One compact representation for saving and exporting: both must be reimportable.
export function serializeReader(reader: ReaderState): string {
  const raw = JSON.stringify(reader);
  parseReader(raw);
  return raw;
}
