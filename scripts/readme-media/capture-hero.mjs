// hero.gif: open a commit, compare two commits, create a worktree from a branch label,
// then show the worktree actions on that label.
// Usage: node capture-hero.mjs <demo-repo-path>   (the capture creates a worktree in the repo)
import {
  clickAt,
  installCursor,
  moveCursor,
  requireRepoPath,
  ROW_CLICK_OFFSET_X,
  startScreencast,
  stopScreencast,
  withGitKeizu
} from "./lib.mjs";

const CURSOR_START = { x: 1000, y: 560 };
const CURSOR_EXIT_OFFSET = { x: 260, y: 140 };
const FINAL_HOLD_SECONDS = 2;
const BRANCH = "feature/offline-mode";

await withGitKeizu(requireRepoPath(process.argv), async ({ page, view }) => {
  const commitRow = (message) => view.locator(".commit", { hasText: message }).first();
  const branchLabel = () => view.locator(".gitRef.head", { hasText: BRANCH }).first();

  let cursor = await installCursor(page, CURSOR_START);
  const recording = await startScreencast(page, "hero");
  await page.waitForTimeout(1200);

  cursor = await clickAt(page, cursor, commitRow("Highlight the selected trail"), {
    offsetX: ROW_CLICK_OFFSET_X
  });
  await page.waitForTimeout(1900);

  cursor = await clickAt(page, cursor, commitRow("Add trail difficulty legend"), {
    offsetX: ROW_CLICK_OFFSET_X,
    modifiers: ["Control"]
  });
  await page.waitForTimeout(2300);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);

  cursor = await clickAt(page, cursor, branchLabel(), { button: "right" });
  await page.waitForTimeout(1100);

  cursor = await clickAt(
    page,
    cursor,
    view.locator(".contextMenuItem", { hasText: "Create Worktree" }).first()
  );
  await page.waitForTimeout(1600);

  cursor = await clickAt(page, cursor, view.locator("#dialogAction"));
  await view.locator(".gitRef.head.worktree", { hasText: BRANCH }).first().waitFor();
  await page.waitForTimeout(900);

  cursor = await clickAt(page, cursor, branchLabel(), { button: "right" });
  await page.waitForTimeout(2000);
  await page.keyboard.press("Escape");
  await moveCursor(page, cursor, {
    x: cursor.x + CURSOR_EXIT_OFFSET.x,
    y: cursor.y + CURSOR_EXIT_OFFSET.y
  });
  await page.waitForTimeout(600);

  await stopScreencast(recording, FINAL_HOLD_SECONDS);
});
