import { test, expect } from "@playwright/test";
import {
  relationshipMeaning,
  sourceCategory,
  reviewedEvidence,
} from "../src/explorerTeaching";
import { explorerHash, readExplorerHash } from "../src/explorerRoute";
test.beforeEach(async ({ page }) => {
  await page.route("**/api/reader-profile", (r) =>
    r.fulfill({
      json: {
        reading_lesson: "chapter-02",
        reading_reference: "Chapter 2",
        interests: [],
      },
    }),
  );
});

test("unavailable starting questions remain readable and distinguish API suggestions from compiler results", async ({
  page,
}) => {
  await page.goto("/#explore");
  const welcome = page.getByRole("region", {
    name: "Explorer starting questions",
  });
  await expect(
    welcome.getByRole("heading", {
      name: "What happens when my program creates a child?",
    }),
  ).toBeVisible();
  await expect(welcome.locator("article")).toHaveCount(5);
  await expect(welcome).toContainText(
    "fixture, not the reviewed kernel dataset",
  );
  await expect(
    welcome.getByRole("link", { name: "Start guided visit" }),
  ).toHaveCount(0);
  await welcome.getByRole("button", { name: "Use free exploration" }).click();
  await expect(page.getByLabel("Symbol name")).toBeFocused();
  await page.getByLabel("Symbol name").fill("fork");
  await expect(page.locator(".curated-matches")).toContainText(
    "Teaching links across layers",
  );
  await expect(page.locator(".curated-matches")).toContainText(
    "What happens when my program creates a child?",
  );
  await expect(page.locator(".curated-matches")).toContainText(
    "Source unavailable",
  );
  await page
    .locator(".curated-matches")
    .getByRole("link", {
      name: "What happens when my program creates a child?",
    })
    .click();
  await expect(page.getByRole("alert")).toContainText("fixture");
  await expect(welcome).toBeVisible();
});

test("unannotated definitions and direct-call arrows have structural orientation and token anchors", async ({
  page,
}) => {
  await page.goto("/#explore");
  await page.getByLabel("Symbol name").fill("allocate_pid");
  await page.locator(".result").filter({ hasText: "allocate_pid" }).click();
  const orientation = page.getByRole("region", {
    name: "Selection orientation",
  });
  await expect(orientation).toContainText(
    "No reviewed responsibility description",
  );
  await expect(orientation).toContainText("Function definition");
  await expect(page.locator(".source-line.current mark")).toHaveText(
    "allocate_pid",
  );
  await page.getByLabel("Direction", { exact: true }).selectOption("outgoing");
  await page
    .getByLabel("Relationship", { exact: true })
    .selectOption("direct_call");
  const canvas = page.locator(".graph-canvas");
  const bounds = (await canvas.boundingBox())!;
  await canvas.click({
    position: { x: bounds.width / 2, y: bounds.height / 2 },
  });
  await expect(orientation).toContainText(
    "allocate_pid contains a direct call to helper",
  );
  await expect(orientation).toContainText("caller to callee");
  await expect(page.locator(".source-line.current mark")).toHaveText("helper");
  await page
    .getByText("Neighbor names and grouped evidence", { exact: true })
    .click();
  await page
    .locator(".graph-symbol-names")
    .getByRole("button", { name: "Preview helper", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Preview graph node" }),
  ).toContainText("does not execute code");
  await expect(page.locator(".source-pane .pane-heading h2")).toHaveText(
    "allocate_pid",
  );
  await page
    .getByRole("button", { name: "Open helper definition", exact: true })
    .click();
  await expect(page.locator(".source-line.current")).toContainText(
    "static int helper",
  );
  await page
    .getByRole("region", { name: "Selection orientation" })
    .getByText("What can I investigate next?", { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "See where this function is called",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Direction", { exact: true })).toHaveValue(
    "incoming",
  );
  await expect(page.locator(".evidence-list")).toContainText(
    "allocate_pid → helper",
  );
  const link = page.url();
  await page.reload();
  await expect(page).toHaveURL(link);
  await expect(page.locator(".source-line.current")).toContainText(
    "static int helper",
  );
});

test("unresolved calls supply no target; grouped records and macro spelling are deliberate source choices", async ({
  page,
}) => {
  await page.goto("/#explore");
  await page.getByLabel("Symbol name").fill("spawn_task");
  await page.locator(".result").filter({ hasText: "spawn_task" }).click();
  await page
    .getByLabel("Relationship", { exact: true })
    .selectOption("indirect_call");
  await page.locator(".evidence").first().locator("button").first().focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("region", { name: "Selection orientation" }),
  ).toContainText("compiler supplied no resolved target");
  await expect(
    page
      .getByRole("region", { name: "Selection orientation" })
      .getByRole("button", { name: /Inspect called function/ }),
  ).toHaveCount(0);
  await expect(page.locator(".evidence .follow")).toHaveCount(0);
  await page
    .getByText("Neighbor names and grouped evidence", { exact: true })
    .click();
  await page
    .locator(".graph-symbol-names")
    .getByRole("button", { name: "Preview unresolved call site" })
    .first()
    .click();
  await expect(page.locator(".graph-node-preview")).toContainText(
    "No callee can be opened",
  );
  await page.getByLabel("Relationship", { exact: true }).selectOption("all");
  const group = page
    .locator(".graph-symbol-names button")
    .filter({ hasText: /spawn_task → pid · \d+ evidence records/ });
  await group.click();
  await expect(page.locator(".graph-evidence-chooser")).toContainText(
    "does not follow the callee",
  );
  await page.locator(".graph-evidence-chooser button").first().click();
  await expect(
    page.locator(".graph-evidence-chooser [aria-pressed=true]"),
  ).toHaveCount(1);
  await page
    .locator(".evidence")
    .filter({ hasText: "spawn_task → allocate_pid" })
    .locator("button")
    .first()
    .click();
  await expect(page.locator(".explorer-orientation")).toContainText(
    "Macro expansion location",
  );
  await page.getByRole("button", { name: /Spelling: process.h:9/ }).click();
  await expect(page.locator(".explorer-orientation")).toContainText(
    "Macro spelling location",
  );
  await page
    .getByRole("button", { name: "Return to call site", exact: true })
    .click();
  await expect(page.locator(".explorer-orientation")).toContainText(
    "Macro expansion location",
  );
  await page.screenshot({
    path: "../docs/explorer-fixture-orientation.png",
    fullPage: true,
  });
});

test("teaching matching is dataset-bound and exact source links preserve the originating question", () => {
  expect(readExplorerHash("#explore?guide=fork-memory")).toEqual({
    dataset: "",
    symbol: "",
    guide: "fork-memory",
  });
  expect(() => readExplorerHash("#explore?guide=../bad")).toThrow();
  const route = {
    dataset: "pinned",
    symbol: "caller",
    journey: "process-inheritance",
    lesson: "shared-offset",
    checkpoint: "file-references",
  };
  expect(readExplorerHash(explorerHash(route))).toMatchObject(route);
  expect(
    reviewedEvidence(
      {
        lessons: [
          {
            checkpoints: [
              {
                available: true,
                dataset_id: "other",
                reading: { caller: "Never apply" },
                selection: { symbol_id: "x" },
              },
            ],
          },
        ],
      } as any,
      "current",
    ),
  ).toEqual([]);
  const edge = {
    source_name: "caller",
    target_name: null,
    target_id: null,
    kind: "indirect_call",
  } as any;
  expect(relationshipMeaning(edge)).toContain("no resolved target");
  expect(
    sourceCategory(
      { id: "x", name: "item", kind: "struct" },
      { file: "x.h", line: 2, column: 3 },
      undefined,
      [{ file: "x.h", line: 2, column: 3, is_definition: 1 } as any],
    ),
  ).toBe("Type definition");
});

test("source token anchors use UTF-8 columns without changing the displayed source", async () => {
  const { sourceParts } = await import("../src/SourceToken");
  const text = "\t/* café 🙂 */ helper(x);";
  const prefix = "\t/* café 🙂 */ ";
  const parts = sourceParts(text, Buffer.byteLength(prefix, "utf8") + 1)!;
  expect(parts.token).toBe("helper");
  expect(parts.prefix + parts.token + parts.suffix).toBe(text);
  expect(sourceParts("é helper()", 2)).toBeUndefined();
  expect(sourceParts("helper()", 1)?.prefix).toBe("");
});

test("memory connection routes retain position and origin and reject invented stages", () => {
  const route = {
    dataset: "pinned",
    symbol: "copy_mm",
    lesson: "fork-memory",
    checkpoint: "memory-choice",
    journey: "fork-memory",
    stage: "connection" as const,
    returnTo: "#learn/fork-memory?view=code&segment=child",
    full: true,
    evidence: 42,
    location: { file: "kernel/fork.c", line: 1594, column: 8 },
  };
  expect(readExplorerHash(explorerHash(route))).toMatchObject(route);
  expect(() =>
    readExplorerHash(
      explorerHash(route).replace("stage=connection", "stage=done"),
    ),
  ).toThrow("Invalid guided position");
  expect(() =>
    readExplorerHash(explorerHash({ ...route, checkpoint: "memory-setup" })),
  ).toThrow("Invalid guided position");
});
