import { test, expect } from "@playwright/test";
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

test("a beginner starts at process creation, reads the call, opens its callee and returns after refresh", async ({
  page,
}) => {
  await page.goto("/#explore");
  const first = page
    .locator(".guided-starts article")
    .filter({ hasText: "What happens when my program creates a child?" });
  await first
    .getByText("What this visit establishes and what to know first", {
      exact: true,
    })
    .click();
  await expect(first).toContainText("function call and an if branch");
  await page.screenshot({
    path: "../docs/explorer-starts-desktop.png",
    fullPage: true,
  });
  await first.getByRole("link", { name: "Start guided visit" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".explorer-orientation")).toContainText(
    "copy_process",
  );
  await expect(page.locator(".source-line.current")).toContainText(
    "retval = copy_mm(clone_flags, p);",
  );
  await expect(page.locator(".source-line.current mark")).toHaveText("copy_mm");
  await page
    .getByText("Read this statement in small pieces", { exact: true })
    .click();
  await expect(page.locator(".checkpoint-reading")).toContainText(
    "following if (retval)",
  );
  await expect(page.locator(".checkpoint-reading")).toContainText(
    "clone_flags",
  );
  await page.screenshot({
    path: "../docs/explorer-guided-creation.png",
    fullPage: true,
  });
  const original = page.url();
  await page
    .getByRole("button", {
      name: "Inspect called function: copy_mm",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".source-pane .pane-heading h2")).toHaveText(
    "copy_mm",
  );
  await expect(page.locator(".explorer-orientation")).toContainText(
    "Function definition",
  );
  await expect(page.locator(".explorer-orientation")).toContainText(
    "Chooses whether the new task",
  );
  const callee = page.url();
  await page.reload();
  await expect(page).toHaveURL(callee);
  await expect(page.locator(".source-pane .pane-heading h2")).toHaveText(
    "copy_mm",
  );
  await page
    .getByRole("button", { name: "Return to the reviewed checkpoint" })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".source-line.current")).toContainText(
    "retval = copy_mm(clone_flags, p);",
  );
  await page
    .getByRole("link", { name: "Return to Lab 001: Follow a fork call" })
    .click();
  await expect(page.getByLabel("Walkthrough segment")).toHaveValue("fork");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("kse-reader-v1")!).activeLab,
    ),
  ).toBeUndefined();
  expect(original).toContain("journey=fork-memory");
});

test("familiar API suggestions reach real source while retaining search filters", async ({
  page,
}) => {
  await page.goto("/#explore");
  await page.getByRole("button", { name: "Use free exploration" }).click();
  await page.getByLabel("Symbol name").fill("waitpid");
  await page
    .getByLabel("Symbol kind", { exact: true })
    .selectOption("function");
  const suggestions = page.locator(".curated-matches");
  await expect(suggestions).toContainText("not compiler-resolved edges");
  await suggestions
    .getByRole("link", { name: "How does a parent collect a child’s result?" })
    .click();
  await expect(page.locator(".source-line.current")).toContainText(
    "do_wait(&wo)",
  );
  await expect(page.locator(".explorer-orientation")).toContainText("put_user");
  await page
    .getByText("Read this statement in small pieces", { exact: true })
    .click();
  await expect(page.locator(".checkpoint-reading")).toContainText("address");
  await page
    .getByRole("button", { name: "Show full explorer", exact: true })
    .click();
  await expect(page.getByLabel("Symbol name")).toHaveValue("waitpid");
  await expect(page.getByLabel("Symbol kind", { exact: true })).toHaveValue(
    "function",
  );
  await expect(page.locator(".guided-origin")).toContainText(
    "How does a parent collect",
  );
});

test("phone keyboard route preserves original question through reviewed cross-lesson steps", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#explore?guide=process-inheritance");
  await expect(page.locator(".explorer-orientation h2")).toBeFocused();
  await expect
    .poll(() =>
      page
        .locator(".explorer-orientation h2")
        .evaluate((e) => e.getBoundingClientRect().top),
    )
    .toBeGreaterThanOrEqual(0);
  await page.getByText("What can I investigate next?", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", {
      name: "Visit A copied table can retain shared references",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".source-line.current")).toContainText(
    "dup_fd(oldf, NULL)",
  );
  await page.getByText("What can I investigate next?", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", {
      name: "Visit Inspect what duplication retains",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".source-line.current")).toContainText(
    "get_file(f)",
  );
  await expect(page.locator(".guided-origin")).toContainText(
    "How does a child inherit",
  );
  const link = page.url();
  await page.reload();
  await expect(page).toHaveURL(link);
  await expect(page.locator(".guided-origin")).toContainText(
    "How does a child inherit",
  );
  await page.getByRole("button", { name: "Source", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".source-pane .pane-heading h2")).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "../docs/explorer-phone-source.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    document.body.style.zoom = "1.5";
  });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBeTruthy();
  await page.screenshot({
    path: "../docs/explorer-enlarged-phone.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    document.body.style.zoom = "1";
  });
  await page
    .getByRole("link", {
      name: "Return to Follow inherited descriptors",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Walkthrough segment")).toHaveValue("fork");
  // The same compiler fact supports two lessons; preserve the current lesson’s reading guide.
  await page.goto("/#learn/shared-offset?view=source");
  await page
    .locator(".checkpoint")
    .filter({ hasText: "Follow descriptor-table duplication" })
    .getByRole("button", { name: "Open checkpoint" })
    .click();
  await expect(page.locator(".notice-first")).toContainText(
    "a new table alone does not establish new open-file descriptions",
  );
});
