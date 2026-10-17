import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { parseReader } from "../src/readerStorage";
import {
  adjacentCenter,
  explorerHash,
  readExplorerHash,
} from "../src/explorerRoute";
const oldRecord = () => ({
  version: 1,
  readingLesson: "chapter-02",
  readingReference: "Chapter 2 · §2.7 Processes",
  interests: ["containment"],
  lastLesson: "process-inheritance",
  studyEnvironment: "Linux as ordinary user",
  discussionContext: "Reasoned about fork; no execution implied.",
  notes: {
    "fork-memory": {
      thinking: "My prediction 漢字 🙂",
      observation: "Not yet tried",
      experiment: "traced",
      visited: {},
    },
  },
});
const generic = {
  reading_lesson: "chapter-02",
  reading_reference: "Chapter 2 · §2.7 Processes",
  interests: [],
};

test("schema migration preserves annotations and does not manufacture a lab or run", () => {
  const result = parseReader(JSON.stringify(oldRecord()));
  expect(result.version).toBe(2);
  expect(result.notes["fork-memory"].experiment).toBe("traced");
  expect(result.activeLab).toBeUndefined();
  const source = {
    hash: "#explore?dataset=test&symbol=test",
    label: "A source visit",
  };
  expect(
    parseReader(JSON.stringify({ ...result, lastExploration: source }))
      .lastExploration,
  ).toEqual(source);
  expect(() => parseReader("{broken")).toThrow();
  expect(() =>
    parseReader(JSON.stringify({ ...oldRecord(), version: 99 })),
  ).toThrow();
  expect(() =>
    parseReader(
      JSON.stringify({
        ...oldRecord(),
        notes: {
          x: { thinking: "", observation: "", experiment: "done", visited: {} },
        },
      }),
    ),
  ).toThrow();
});

test("paging calculations cover every line at boundaries for both window sizes", () => {
  for (const [before, after] of [
    [4, 12],
    [12, 30],
  ])
    for (const total of [1, 2, 17, 43, 100, 1000]) {
      let center = 1;
      const seen = new Set<number>();
      let start = 1,
        end = Math.min(total, 1 + after);
      while (true) {
        for (let n = start; n <= end; n++) seen.add(n);
        if (end === total) break;
        const next = adjacentCenter(
          start,
          end - start + 1,
          total,
          before,
          after,
          "later",
        );
        const nextStart = Math.max(1, next - before);
        expect(nextStart).toBeLessThanOrEqual(end + 1);
        expect(nextStart).toBeGreaterThan(start);
        center = next;
        start = nextStart;
        end = Math.min(total, center + after);
      }
      expect(seen.size).toBe(total);
      while (start > 1) {
        const next = adjacentCenter(
          start,
          end - start + 1,
          total,
          before,
          after,
          "earlier",
        );
        const nextEnd = Math.min(total, next + after);
        expect(nextEnd).toBeGreaterThanOrEqual(start - 1);
        expect(Math.max(1, next - before)).toBeLessThan(start);
        center = next;
        start = Math.max(1, center - before);
        end = nextEnd;
      }
    }
});

test("explorer links round trip exact evidence and reject invalid positions", () => {
  const value = {
    dataset: "pinned",
    symbol: "usr with special #?&",
    location: { file: "kernel/fork.c", line: 2280, column: 4 },
    browse: 2310,
    evidence: 8,
    lesson: "fork-memory",
    checkpoint: "copy",
    q: "fork",
    path: "kernel/",
    direction: "outgoing",
    kind: "direct_call",
    symbolKind: "function",
    definitionsOnly: true,
    full: false,
  };
  expect(readExplorerHash(explorerHash(value))).toEqual(value);
  expect(() =>
    readExplorerHash("#explore?dataset=x&symbol=y&file=../bad&line=0&column=1"),
  ).toThrow();
});

test("unreadable notes survive browsing and have explicit recovery with a retained backup", async ({
  page,
}) => {
  await page.route("**/api/reader-profile", (r) =>
    r.fulfill({ json: generic }),
  );
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("kse-reader-v1", "{my unreadable original"),
  );
  await page.reload();
  await page.goto("/#learn/fork-memory");
  await page
    .getByLabel("My thinking (optional)")
    .fill("A new thought while saving is paused");
  await page.goto("/#learn/chapter-30");
  expect(await page.evaluate(() => localStorage.getItem("kse-reader-v1"))).toBe(
    "{my unreadable original",
  );
  await expect(page.locator(".reading-error")).toContainText(
    "Automatic saving is paused",
  );
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download original record" }).click();
  expect(await readFile((await (await downloaded).path())!, "utf8")).toBe(
    "{my unreadable original",
  );
  await page.getByRole("button", { name: "Preview a fresh start" }).click();
  await expect(
    page.getByRole("region", { name: "Import preview" }),
  ).toBeVisible();
  await expect(page.locator(".import-preview")).toContainText("None selected");
  await page.getByRole("button", { name: "Replace with preview" }).click();
  const result = await page.evaluate(() => ({
    current: JSON.parse(localStorage.getItem("kse-reader-v1")!),
    backups: Object.keys(localStorage)
      .filter((k) => k.startsWith("kse-reader-backup-"))
      .map((k) => localStorage.getItem(k)),
  }));
  expect(result.current.version).toBe(2);
  expect(result.backups).toContain("{my unreadable original");
  expect(result.current.activeLab).toBeUndefined();
});

test("v1 notes migrate and export/import preview round trips book, lab and self-report", async ({
  page,
}) => {
  await page.route("**/api/reader-profile", (r) =>
    r.fulfill({ json: generic }),
  );
  await page.goto("/");
  await page.evaluate(
    (v) => localStorage.setItem("kse-reader-v1", JSON.stringify(v)),
    oldRecord(),
  );
  await page.goto("/#learn/fork-memory?view=code&segment=fork");
  await page.reload();
  await expect(page.getByLabel("Walkthrough segment")).toHaveValue("fork");
  await expect(page.locator(".canonical-source")).toContainText(
    "pid_t child_pid = fork();",
  );
  await page.getByRole("button", { name: "Save this lab segment" }).click();
  await page.getByText("Your reading place and notes", { exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export my private notes" }).click();
  const path = (await (await download).path())!;
  const exported = JSON.parse(await readFile(path, "utf8"));
  expect(exported.version).toBe(2);
  expect(exported.activeLab).toEqual({
    lesson: "fork-memory",
    segment: "fork",
  });
  expect(exported.notes["fork-memory"].experiment).toBe("traced");
  await page.getByLabel("Import a notes file").setInputFiles(path);
  await expect(page.locator(".import-preview")).toContainText("Chapter 2");
  await expect(page.locator(".import-preview")).toContainText(
    "0 self-reported runs",
  );
  await page.getByRole("button", { name: "Merge imported notes" }).click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("kse-reader-v1")!),
    ),
  ).toEqual(exported);
  await page
    .getByLabel("Import a notes file")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from("{bad"),
    });
  await expect(page.locator(".reader-settings [role=alert]")).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("kse-reader-v1")!),
    ),
  ).toEqual(exported);
});

test("book, saved lab and passive exploration stay independent across reload", async ({
  page,
}) => {
  await page.route("**/api/reader-profile", (r) =>
    r.fulfill({ json: generic }),
  );
  await page.goto("/#learn/fork-memory?view=code&segment=fork");
  await page.getByRole("button", { name: "Save this lab segment" }).click();
  await page.goto("/#learn/chapter-30");
  await page
    .getByRole("link", { name: "Reading companion", exact: true })
    .click();
  await expect(page.locator(".reading-place")).toContainText("Chapter 2");
  await expect(page.locator(".activity-place")).toContainText("Lab 001");
  await expect(page.locator(".last-exploration")).toContainText(
    "Thread Synchronization",
  );
  await page.reload();
  await page.getByRole("link", { name: "Resume saved lab segment" }).click();
  await expect(page.getByLabel("Walkthrough segment")).toHaveValue("fork");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("kse-reader-v1")!).readingLesson,
    ),
  ).toBe("chapter-02");
});

test("UTF-8 notes use one reloadable serialization and aggregate merges are validated", async () => {
  const {
    defaultReader,
    mergeReader,
    serializeReader,
    readerBytes,
    READER_MAX_BYTES,
  } = await import("../src/readerStorage");
  const note = {
    thinking: "漢字🙂 café",
    observation: "Привет 🌱",
    experiment: "traced" as const,
    visited: {},
  };
  const value = { ...defaultReader(), notes: { unicode: note } };
  expect(parseReader(serializeReader(value))).toEqual(value);
  expect(readerBytes(serializeReader(value))).toBe(
    Buffer.byteLength(serializeReader(value), "utf8"),
  );
  const make = (prefix: string, n: number) => ({
    ...defaultReader(),
    notes: Object.fromEntries(
      Array.from({ length: n }, (_, i) => [prefix + i, note]),
    ),
  });
  expect(() => mergeReader(make("a", 251), make("b", 250))).toThrow(
    /invalid fields/,
  );
  const huge = {
    ...defaultReader(),
    notes: Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [
        "n" + i,
        { ...note, thinking: "漢".repeat(9000) },
      ]),
    ),
  };
  expect(JSON.stringify(huge).length).toBeLessThan(READER_MAX_BYTES);
  expect(() => serializeReader(huge)).toThrow(/UTF-8/);
  const part = (prefix: string) => ({
    ...defaultReader(),
    notes: Object.fromEntries(
      Array.from({ length: 45 }, (_, i) => [
        prefix + i,
        { ...note, thinking: "漢".repeat(9000) },
      ]),
    ),
  });
  expect(() => parseReader(serializeReader(part("a")))).not.toThrow();
  expect(() => mergeReader(part("a"), part("b"))).toThrow(/UTF-8/);
});

test("quota failure keeps the previous raw record and allows a valid export", async ({
  page,
}) => {
  await page.route("**/api/reader-profile", (r) =>
    r.fulfill({ json: generic }),
  );
  await page.goto("/#learn/fork-memory");
  await expect(page.getByLabel("My thinking (optional)")).toBeVisible();
  await page.getByLabel("My thinking (optional)").fill("First saved note");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("kse-reader-v1")))
    .toContain("First saved note");
  const before = await page.evaluate(() =>
    localStorage.getItem("kse-reader-v1"),
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Storage quota exhausted", "QuotaExceededError");
    };
  });
  await page.getByLabel("My thinking (optional)").fill("New recoverable note");
  await expect(page.locator(".reading-error")).toContainText(
    "previous stored record is retained",
  );
  expect(await page.evaluate(() => localStorage.getItem("kse-reader-v1"))).toBe(
    before,
  );
  await page.getByText("Your reading place and notes", { exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export my private notes" }).click();
  const parsed = parseReader(
    await readFile((await (await download).path())!, "utf8"),
  );
  expect(parsed.notes["fork-memory"].thinking).toBe("New recoverable note");
});

test("oversized ordinary edits and oversized final merges preserve the prior record", async ({
  page,
}) => {
  const { defaultReader } = await import("../src/readerStorage");
  const note = {
    thinking: "x".repeat(10000),
    observation: "",
    experiment: "not-run",
    visited: {},
  };
  const nearLimit = {
    ...defaultReader(),
    notes: Object.fromEntries(
      Array.from({ length: 207 }, (_, i) => ["n" + i, note]),
    ),
  };
  await page.goto("/");
  await page.evaluate(
    (v) => localStorage.setItem("kse-reader-v1", JSON.stringify(v)),
    nearLimit,
  );
  await page.goto("/#learn/fork-memory");
  await page.reload();
  await expect(page.getByLabel("My thinking (optional)")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("kse-reader-v1")!).lastLesson,
      ),
    )
    .toBe("fork-memory");
  const before = await page.evaluate(() =>
    localStorage.getItem("kse-reader-v1"),
  );
  await page.getByLabel("My thinking (optional)").fill("漢".repeat(9999));
  await expect(page.locator(".reading-error")).toContainText(
    "edit was not accepted",
  );
  expect(await page.evaluate(() => localStorage.getItem("kse-reader-v1"))).toBe(
    before,
  );
  await page.getByText("Your reading place and notes", { exact: true }).click();
  const incoming = {
    ...defaultReader(),
    notes: { additional: { ...note, thinking: "漢".repeat(9999) } },
  };
  await page
    .getByLabel("Import a notes file")
    .setInputFiles({
      name: "notes.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(incoming)),
    });
  await page.getByRole("button", { name: "Merge imported notes" }).click();
  await expect(page.locator(".reader-settings [role=alert]")).toContainText(
    "Recovery was not applied",
  );
  expect(await page.evaluate(() => localStorage.getItem("kse-reader-v1"))).toBe(
    before,
  );
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) =>
        k.startsWith("kse-reader-backup-"),
      ),
    ),
  ).toEqual([]);
});
