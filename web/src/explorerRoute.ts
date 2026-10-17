import { validLessonReturn } from "./lessonRoute";
import type { Loc } from "./types";
export type ExplorerRoute = {
  guide?: string;
  journey?: string;
  dataset: string;
  symbol: string;
  location?: Loc;
  browse?: number;
  evidence?: number;
  lesson?: string;
  checkpoint?: string;
  returnTo?: string;
  q?: string;
  path?: string;
  direction?: string;
  kind?: string;
  symbolKind?: string;
  definitionsOnly?: boolean;
  full?: boolean;
};
export function explorerHash(route: ExplorerRoute) {
  const p = new URLSearchParams({
    dataset: route.dataset,
    symbol: route.symbol,
  });
  if (route.location) {
    p.set("file", route.location.file);
    p.set("line", String(route.location.line));
    p.set("column", String(route.location.column));
  }
  for (const key of [
    "journey",
    "returnTo",
    "browse",
    "evidence",
    "lesson",
    "checkpoint",
    "q",
    "path",
    "direction",
    "kind",
    "symbolKind",
    "definitionsOnly",
    "full",
  ] as const)
    if (route[key] !== undefined && route[key] !== "")
      p.set(key, String(route[key]));
  return "#explore?" + p;
}
export function readExplorerHash(hash: string): ExplorerRoute | null {
  if (!hash.startsWith("#explore?")) return null;
  if (hash.length > 16000) throw new Error("This source link is too long.");
  const p = new URLSearchParams(hash.slice(9));
  const guide = p.get("guide");
  if (guide) {
    if (!/^[a-z0-9-]{1,100}$/.test(guide))
      throw new Error("Invalid guided question in this link.");
    if (p.has("dataset") || p.has("symbol"))
      throw new Error(
        "Use either a starting question or an exact source link.",
      );
    return { dataset: "", symbol: "", guide };
  }
  const dataset = p.get("dataset") || "",
    symbol = p.get("symbol") || "";
  if (!dataset || symbol.length > 4000)
    throw new Error("This explorer link needs a valid dataset and symbol.");
  if (!symbol && (p.has("file") || p.has("evidence") || p.has("checkpoint")))
    throw new Error("A source/checkpoint link needs a symbol.");
  const positive = (key: string) => {
    const raw = p.get(key);
    if (raw === null) return undefined;
    const n = Number(raw);
    if (!Number.isSafeInteger(n) || n < 1)
      throw new Error("Invalid source position in this link.");
    return n;
  };
  let location: Loc | undefined;
  if (p.has("file")) {
    const file = p.get("file")!;
    const line = positive("line"),
      column = positive("column");
    if (
      file.startsWith("/") ||
      file.includes("\\") ||
      file.split("/").includes("..") ||
      !line ||
      !column
    )
      throw new Error("Invalid source location in this link.");
    location = { file, line, column };
  }
  const direction = p.get("direction") || undefined,
    kind = p.get("kind") || undefined;
  if (direction && !["both", "incoming", "outgoing"].includes(direction))
    throw new Error("Invalid graph direction in this link.");
  if (
    kind &&
    ![
      "all",
      "direct_call",
      "indirect_call",
      "reference",
      "declared_type",
    ].includes(kind)
  )
    throw new Error("Invalid relationship kind in this link.");
  const flag = (key: string) => {
    const v = p.get(key);
    if (v === null) return undefined;
    if (v !== "true" && v !== "false")
      throw new Error("Invalid view flag in this link.");
    return v === "true";
  };
  const journey = p.get("journey") || undefined;
  if (journey && !/^[a-z0-9-]{1,100}$/.test(journey))
    throw new Error("Invalid originating question.");
  return {
    journey,
    returnTo: validLessonReturn(
      p.get("returnTo") || undefined,
      journey || p.get("lesson") || undefined,
    ),
    dataset,
    symbol,
    location,
    direction,
    kind,
    symbolKind: p.get("symbolKind") || undefined,
    definitionsOnly: flag("definitionsOnly"),
    full: flag("full"),
    browse: positive("browse"),
    evidence: positive("evidence"),
    lesson: p.get("lesson") || undefined,
    checkpoint: p.get("checkpoint") || undefined,
    q: (p.get("q") || "").slice(0, 200),
    path: (p.get("path") || "").slice(0, 500),
  };
}
export function adjacentCenter(
  start: number,
  count: number,
  total: number,
  before: number,
  after: number,
  direction: "earlier" | "later",
) {
  return direction === "later"
    ? Math.min(total, start + count + before)
    : Math.max(1, start - 1 - after);
}
