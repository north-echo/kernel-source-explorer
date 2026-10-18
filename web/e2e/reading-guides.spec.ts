import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.route("**/api/reader-profile", (r) =>
    r.fulfill({
      json: {
        reading_lesson: "chapter-02",
        reading_reference: "Chapter 2",
        interests: [],
      },
    }),
  );
});

test("Chapter 2 teaches before reflection, keeps the lab separate and restores notes/bookmarks", async ({
  page,
}) => {
  await page.goto("/#learn/fork-memory?view=code&segment=fork");
  await page
    .getByRole("button", { name: "Save this lab segment", exact: true })
    .click();
  await page.goto("/#learn/chapter-02");
  const main = page.getByLabel("Chapter explanation");
  await expect(main).toContainText("A program stored in an executable file");
  await expect(main).toContainText(
    "not an experiment performed by reading this guide",
  );
  await expect(main).toContainText(
    "The child can have independent private variables while retaining access",
  );
  await expect(page.getByLabel("Available learning paths")).toContainText(
    "No dedicated experiment",
  );
  await expect(page.getByLabel("Available learning paths")).toContainText(
    "No reviewed kernel checkpoint",
  );
  expect(
    await main.evaluate(
      (el) =>
        !!(
          el.compareDocumentPosition(
            document.querySelector(".chapter-reflection")!,
          ) & Node.DOCUMENT_POSITION_FOLLOWING
        ),
    ),
  ).toBeTruthy();
  await expect(page.locator(".authored-explanation")).toHaveCount(0);
  await page
    .getByLabel("My thinking (optional)")
    .fill("Private memory is a different question from file access.");
  await page
    .getByRole("button", { name: "Keep my reading place here", exact: true })
    .click();
  await page.goto("/#learn/chapter-02?view=containment");
  await expect(page.locator(".containment-connection")).toContainText(
    "hypothetical child",
  );
  await expect(page.locator(".containment-connection")).not.toContainText(
    "What this establishes",
  );
  await page.goBack();
  await expect(page.getByLabel("My thinking (optional)")).toHaveValue(
    "Private memory is a different question from file access.",
  );
  await page
    .getByRole("button", { name: "Compare with an explanation", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".authored-explanation")).toContainText(
    "No. The private integer example",
  );
  await page.reload();
  await expect(main).toContainText("ordinary private integer");
  await expect(page.getByLabel("My thinking (optional)")).toHaveValue(
    "Private memory is a different question from file access.",
  );
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kse-reader-v1")!),
  );
  expect(state.readingLesson).toBe("chapter-02");
  expect(state.activeLab).toEqual({ lesson: "fork-memory", segment: "fork" });
  expect(state.notes["chapter-02"].experiment).toBe("not-run");
  await page
    .locator(".related-investigations")
    .getByRole("link", {
      name: "Lab 001: Follow a fork call",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Read the C code", exact: true })
    .click();
  await expect(page.locator(".canonical-source")).toBeVisible();
  await expect(page.getByLabel("Walkthrough segment")).toHaveValue("headers");
  await page.goto("/#learn/chapter-02");
  await expect(page.getByLabel("My thinking (optional)")).toHaveValue(
    "Private memory is a different question from file access.",
  );
  await page.screenshot({
    path: "../docs/reading-chapter-02.png",
    fullPage: true,
  });
});

test("representative guides expose independent depth, labeled code and truthful activity availability", async ({
  page,
}) => {
  for (const n of [4, 9, 15, 17, 20, 24, 29, 30, 44, 49, 57, 61, 64]) {
    await page.goto(`/#learn/chapter-${String(n).padStart(2, "0")}`);
    await expect(page.getByLabel("Chapter explanation")).toBeVisible();
    await expect(page.locator(".canonical-source")).toHaveCount(0);
    await page.getByText("Show concept diagram", { exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".concept-flow")).toContainText(
      "Authored concept diagram",
    );
    await expect(page.locator(".diagram-scope")).toBeVisible();
    await page.locator(".chapter-concept summary").first().focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".chapter-concept").first()).toHaveAttribute(
      "open",
      "",
    );
    if ([4, 24, 29, 30].includes(n)) {
      await expect(page.getByLabel("Code illustration context")).toBeVisible();
      await expect(page.getByLabel("Code illustration context")).toContainText(
        n === 29 ? "Complete C illustration" : "C fragment",
      );
    }
    if (n === 30)
      await page.screenshot({
        path: "../docs/reading-chapter-30.png",
        fullPage: true,
      });
    await expect(page.getByLabel("Available learning paths")).toContainText(
      "No code walkthrough",
    );
  }
});

test("narrow enlarged reading and code keep keyboard disclosures and history usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const n of [2, 17, 20, 29, 44, 49, 61, 64]) {
    await page.goto(`/#learn/chapter-${String(n).padStart(2, "0")}`);
    await expect(page.locator(".topic-header h1")).toBeFocused();
    await page.evaluate(() => {
      document.body.style.zoom = "1.5";
    });
    await expect(page.getByLabel("Chapter explanation")).toBeVisible();
    await page.getByText("Show concept diagram", { exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".concept-flow")).toBeVisible();
    for (const node of await page
      .locator(".concept-drawing button, .static-concept-node")
      .all()) {
      expect(
        await node.evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
      ).toBeTruthy();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    if (n === 49) {
      await page
        .getByLabel("Chapter explanation")
        .screenshot({
          path: test.info().outputPath("reading-49-main-phone.png"),
        });
      await page.screenshot({
        path: "../docs/reading-chapter-49-phone.png",
        fullPage: true,
      });
    }
    if (n === 29) {
      await page.locator(".chapter-concept summary").first().click();
      await expect(page.locator(".reading-code pre")).toBeVisible();
      expect(
        await page
          .locator(".reading-code pre")
          .evaluate((el) => el.scrollWidth >= el.clientWidth),
      ).toBeTruthy();
    }
    await page.evaluate(() => {
      document.body.style.zoom = "1";
    });
  }
  await page
    .getByRole("link", { name: /Chapter 63: Alternative I\/O Models/ })
    .click();
  await expect(page.locator(".topic-header h1")).toHaveText(
    "Alternative I/O Models",
  );
  await page.goBack();
  await expect(page.locator(".topic-header h1")).toHaveText("Pseudoterminals");
});

test("staged reading keeps deeper mechanisms optional and supports plain guides without headings", async ({ page }) => {
  for (const width of [1512, 390]) {
    await page.setViewportSize({ width, height: 982 });
    for (const n of [2, 20, 30, 4]) {
      await page.goto(`/#learn/chapter-${String(n).padStart(2, "0")}`);
      await expect(page.locator(".topic-header h1")).toBeFocused();
      await page.evaluate((narrow) => { document.body.style.zoom = narrow ? "1.5" : "1"; }, width === 390);
      const main = page.getByLabel("Chapter explanation");
      await expect(main).toBeVisible();
      await expect(page.locator(".chapter-concept[open]")).toHaveCount(0);
      await expect(page.locator(".authored-explanation")).toHaveCount(0);
      if (n === 2) {
        // Protect paragraph-to-heading association, not an editorial word count.
        const stages = await main.locator("h3").evaluateAll((headings) =>
          headings.map((h) => ({ title: h.textContent, paragraph: h.nextElementSibling?.textContent })),
        );
        expect(stages[0].paragraph).toContain("The kernel is the core part");
        expect(stages[2].paragraph).toContain("creates a child process");
        expect(stages[3].paragraph).toContain("retaining access to files");
        await expect(main).not.toContainText("copy-on-write");
        await expect(page.getByText("Optional depth: addresses and copy-on-write", { exact: true })).toBeVisible();
      } else {
        await expect(main.locator("h3")).toHaveCount(0);
      }
      await main.screenshot({ path: test.info().outputPath(`chapter-${n}-${width}-main.png`) });
      await page.getByRole("button", { name: "Compare with an explanation", exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".authored-explanation")).toBeVisible();
      if (n === 30) {
        await expect(page.locator(".chapter-reflection h3")).toContainText("separately starts waiting");
        await expect(page.locator(".authored-explanation")).toContainText("after the consumer unlocks but before");
      }
      for (const summary of await page.locator(".chapter-concept > summary").all()) {
        await summary.focus();
        await page.keyboard.press("Enter");
        await expect(summary.locator("..")).toHaveAttribute("open", "");
        await summary.locator("..").screenshot({ path: test.info().outputPath(`chapter-${n}-${width}-optional-${await summary.textContent()}.png`) });
        await page.keyboard.press("Enter");
        await expect(summary.locator("..")).not.toHaveAttribute("open");
      }
      await page.getByRole("button", { name: "Hide explanation", exact: true }).focus();
      await page.keyboard.press("Enter");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
  }
});
