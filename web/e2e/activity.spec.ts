import { test, expect } from "@playwright/test";

test("visible lesson activities and segments have refreshable URLs independent of saved stops", async ({
  page,
}) => {
  await page.goto("/#learn/fork-memory?view=code&segment=fork");
  await page.getByRole("button", { name: "Save this lab segment" }).click();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("kse-reader-v1")!).activeLab,
  );
  await page.getByRole("button", { name: "Next segment", exact: true }).click();
  await expect(page).toHaveURL(/view=code&segment=child$/);
  await page.reload();
  await expect(page.getByLabel("Walkthrough segment")).toHaveValue("child");
  await page
    .getByRole("button", { name: "Optional experiment", exact: true })
    .click();
  await expect(page).toHaveURL(/view=experiment$/);
  await page.reload();
  await expect(page.locator(".optional-experiment")).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Walkthrough segment")).toHaveValue("child");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("kse-reader-v1")!).activeLab,
    ),
  ).toEqual(saved);
});

test("unsupported activities and segments explain their valid fallback", async ({
  page,
}) => {
  await page.goto("/#learn/chapter-30?view=code&segment=missing");
  await expect(page.getByRole("status")).toContainText("unavailable");
  await expect(page.locator(".thinking-space")).toBeVisible();
  await page.goto("/#learn/fork-memory?view=code&segment=missing");
  await expect(page.getByRole("status")).toContainText(
    "segment is unavailable",
  );
  await expect(page.getByLabel("Walkthrough segment")).toHaveValue("headers");
});

test("phone route transitions expose the heading and preserve a revisited reading position", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#learn/fork-memory");
  await page
    .getByRole("button", { name: "Compare with an explanation" })
    .click();
  await page.evaluate(() => window.scrollTo(0, 650));
  const previous = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => {
    window.location.hash = "#learn/chapter-30";
  });
  await expect
    .poll(() =>
      page
        .locator(".topic-header h1")
        .evaluate((e) => e.getBoundingClientRect().top),
    )
    .toBeGreaterThanOrEqual(0);
  await expect
    .poll(() =>
      page
        .locator(".topic-header h1")
        .evaluate((e) => e.getBoundingClientRect().bottom),
    )
    .toBeLessThan(844);
  await page.goBack();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(previous);
  await page
    .getByRole("button", { name: "Read the C code", exact: true })
    .click();
  await expect(page.getByLabel("Walkthrough segment")).toBeVisible();
  await page.getByRole("button", { name: "Next segment", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/view=code&segment=fork$/);
});

test("walkthrough context retains enclosing control flow without interpreting quoted braces", async () => {
  const { sourceContext } = await import("../src/sourceContext");
  const source = [
    "int main(void) {",
    "  if (child_pid == 0) {",
    '    puts("}"); /* } */',
    "    execve(path, args, env);",
    "    return 1;",
    "  }",
    "  return 0;",
    "}",
  ].join("\n");
  const visible = sourceContext(source, 4, 4);
  for (const line of [1, 2, 4, 6, 8]) expect(visible.has(line)).toBe(true);
});

test("three teaching levels stay optional and render readable code on desktop and phone", async ({
  page,
}) => {
  await page.goto("/#learn/fork-memory?view=code&segment=fork");
  await expect(
    page.getByRole("heading", { name: "What happens", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".reasoning-steps li").first()).toContainText(
    "child_pid names a variable",
  );
  await expect(
    page.locator(".segment-explanation>p").first(),
  ).not.toContainText("copy-on-write");
  await page
    .getByText("Before this statement: a small prerequisite", { exact: true })
    .click();
  await expect(
    page.locator(".segment-explanation details").first(),
  ).toContainText("return value");
  await page.screenshot({
    path: "../docs/followup-desktop-fork.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".segment-explanation").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "../docs/followup-phone-fork.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Show complete source" }).click();
  await page.getByRole("region", { name: "Numbered C source" }).focus();
  await page.keyboard.press("ArrowDown");
  await page.evaluate(() => {
    document.body.style.zoom = "2";
  });
  await expect(
    page.getByRole("region", { name: "Numbered C source" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "../docs/followup-enlarged-code.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    document.body.style.zoom = "1";
  });
  await page.setViewportSize({ width: 1512, height: 982 });
  await page.goto("/#learn/seccomp-boundary?view=code&segment=filter");
  await page
    .getByText("Why Linux behaves this way — optional depth", { exact: true })
    .click();
  await expect(page.getByRole("table")).toHaveCount(2);
  await expect(page.locator(".segment-explanation")).toContainText(
    "target = current index + 1 + offset",
  );
  await page.locator(".concept-table").first().scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "../docs/followup-seccomp-instructions.png",
    fullPage: true,
  });
});
