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

test("memory journey connects two reviewed calls, an optional detour, and the originating C segment", async ({
  page,
}) => {
  await page.goto("/#explore");
  const first = page
    .locator(".guided-starts article")
    .filter({ hasText: "What happens when my program creates a child?" });
  await expect(first).toContainText("not a trace through the C library", {
    timeout: 15000,
  });
  await first.getByRole("link", { name: "Start guided visit" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".source-line.current")).toContainText(
    "retval = copy_mm(clone_flags, p);",
  );
  await expect(page.locator(".source-line.current mark")).toHaveText("copy_mm");
  await expect(page.getByLabel("Statement breakdown")).toContainText(
    "goto bad_fork_cleanup_signal",
  );
  await expect(page.getByLabel("Statement breakdown")).toContainText(
    "different from userspace fork",
  );
  await page.screenshot({
    path: "../docs/memory-journey-first.png",
    fullPage: true,
  });
  const firstURL = page.url();
  await page
    .getByRole("button", {
      name: "Continue: examine the memory-sharing choice",
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".source-line.current mark")).toHaveText("dup_mm");
  await expect(page.locator(".source-code")).toContainText(
    "if (clone_flags & CLONE_VM)",
  );
  await expect(page.getByLabel("Statement breakdown")).toContainText(
    "receives the new-task pointer as tsk",
  );
  await expect(page.getByLabel("Statement breakdown")).toContainText(
    "NULL on failure",
  );
  await expect(page.locator(".guided-explorer")).toBeVisible();
  await expect(page.getByLabel("Symbol name")).toBeHidden();
  await page.screenshot({
    path: "../docs/memory-journey-choice.png",
    fullPage: true,
  });
  const secondURL = page.url();
  await page.reload();
  await expect(page.locator(".source-line.current mark")).toHaveText("dup_mm");
  await page
    .getByText("Binary & versus an address such as &status", { exact: true })
    .click();
  await expect(page.locator(".memory-reading")).toContainText(
    "number of operands changes the meaning",
  );
  await page
    .getByText("How the names connect across the two functions", {
      exact: true,
    })
    .click();
  await expect(page.getByRole("table")).toContainText(
    "Caller and callee do not need the same variable name",
  );
  await page
    .getByText("Optional definitions and deeper exploration", { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Optional: read the full dup_mm function",
      exact: true,
    })
    .click();
  await expect(page.locator(".source-pane .pane-heading h2")).toHaveText(
    "dup_mm",
  );
  await expect(page.locator(".explorer-orientation")).toContainText(
    "Function definition",
  );
  const detourURL = page.url();
  await page.reload();
  await expect(page).toHaveURL(detourURL);
  await page
    .getByRole("button", { name: "Return to guided step", exact: true })
    .click();
  await expect(page).toHaveURL(secondURL);
  await expect(page.locator(".source-line.current mark")).toHaveText("dup_mm");
  await page
    .getByRole("button", {
      name: "Connect this result to the C experiment",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "A useful stopping point" }),
  ).toBeFocused();
  await expect(page.getByLabel("Connection to the C experiment")).toContainText(
    "not a compiler-resolved edge",
  );
  await expect(page.getByLabel("Connection to the C experiment")).toContainText(
    "does not establish a complete sandbox",
  );
  const endURL = page.url();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A useful stopping point" }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(secondURL);
  await page.goBack();
  await expect(page).toHaveURL(detourURL);
  await page.goBack();
  await expect(page).toHaveURL(secondURL);
  await page.goBack();
  await expect(page).toHaveURL(firstURL);
  await expect(page.locator(".source-line.current mark")).toHaveText("copy_mm");
  await page.goto(endURL);
  await page
    .getByRole("link", {
      name: "Compare the parent and child variables",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Walkthrough segment")).toHaveValue("finish");
  await page.goBack();
  await page
    .getByRole("link", { name: "Return to the C fork experiment", exact: true })
    .click();
  await expect(page.getByLabel("Walkthrough segment")).toHaveValue("fork");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("kse-reader-v1")!).activeLab,
    ),
  ).toBeUndefined();
  await page.goto(firstURL);
  await page
    .getByRole("link", { name: "Choose another starting question" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Start with a question from your C program",
    }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.locator(".source-line.current mark")).toHaveText("copy_mm");
  await page.goForward();
  await expect(
    page.getByRole("heading", {
      name: "Start with a question from your C program",
    }),
  ).toBeVisible();
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

test("phone memory path preserves a chosen C origin and saved bookmark through paging, copied links and detours", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#learn/fork-memory?view=code&segment=fork");
  await page
    .getByRole("button", { name: "Save this lab segment", exact: true })
    .click();
  await page.goto("/#learn/fork-memory?view=code&segment=child");
  await page
    .getByText("Optional reviewed source checkpoints", { exact: true })
    .click();
  await page
    .getByRole("button", { name: /Creation delegates memory setup/ })
    .click();
  await expect(page.locator(".explorer-orientation h2")).toBeFocused();
  const origin = "#learn/fork-memory?view=code&segment=child";
  await page
    .getByRole("button", {
      name: "Continue: examine the memory-sharing choice",
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".source-line.current mark")).toHaveText("dup_mm");
  const source = page.locator(".source-pane");
  const end = Number(
    await page.locator(".source-line").last().getAttribute("data-line"),
  );
  await page.getByRole("button", { name: "Later lines", exact: true }).click();
  await expect(page.locator(".source-line").first()).toHaveAttribute(
    "data-line",
    String(end + 1),
  );
  await expect(page.locator(".source-line.current")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Return to call site", exact: true })
    .click();
  await expect(page.locator(".source-line.current mark")).toHaveText("dup_mm");
  await page.evaluate(() => {
    document.body.style.zoom = "1.5";
  });
  await page.getByRole("button", { name: "Source", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(source.locator(".pane-heading h2")).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "../docs/memory-journey-phone.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    document.body.style.zoom = "1";
  });
  await page
    .getByText("Optional definitions and deeper exploration", { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Optional: read the full copy_mm function",
      exact: true,
    })
    .click();
  const copied = await context.newPage();
  await copied.goto(page.url());
  await expect(copied.locator(".source-pane .pane-heading h2")).toHaveText(
    "copy_mm",
  );
  await expect(copied.locator(".explorer-orientation")).toContainText(
    "Function definition",
  );
  await copied
    .getByRole("button", { name: "Return to guided step", exact: true })
    .click();
  await expect(copied.locator(".source-line.current mark")).toHaveText(
    "dup_mm",
  );
  await copied.close();
  await page
    .getByRole("button", { name: "Return to guided step", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Connect this result to the C experiment",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Optional: explore deeper", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Return to guided step", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A useful stopping point" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Return to the C fork experiment", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(origin.replaceAll("?", "\\?")));
  await expect(page.getByLabel("Walkthrough segment")).toHaveValue("child");
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kse-reader-v1")!),
  );
  expect(state.activeLab).toEqual({ lesson: "fork-memory", segment: "fork" });
  expect(state.readingLesson).toBe("chapter-02");
});
