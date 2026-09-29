// file-history.gif: open a commit, start Highlight File History on a file that was renamed
// earlier, and step back with the arrow key until the rename commit.
// Usage: node capture-file-history.mjs <demo-repo-path>
import {
  clickAt,
  installCursor,
  moveCursor,
  POINTER_PARK,
  pressKey,
  requireRepoPath,
  ROW_CLICK_OFFSET_X,
  startScreencast,
  stopScreencast,
  withGitKeizu
} from "./lib.mjs";

const CURSOR_START = { x: 1000, y: 560 };
/** Hovering the file name first reveals the row's action icons before the history icon is clicked. */
const FILE_NAME_OFFSET_X = 60;
const FINAL_HOLD_SECONDS = 2;
const STEP_PAUSE_MS = 1300;
// Two steps from "Highlight the selected trail" land on "Rename renderer module to map".
const DOWN_STEPS = 2;

await withGitKeizu(requireRepoPath(process.argv), async ({ page, view }) => {
  const commitRow = (message) => view.locator(".commit", { hasText: message }).first();

  let cursor = await installCursor(page, CURSOR_START);
  const recording = await startScreencast(page, "file-history");
  await page.waitForTimeout(900);

  cursor = await clickAt(page, cursor, commitRow("Highlight the selected trail"), {
    offsetX: ROW_CLICK_OFFSET_X
  });
  await page.waitForTimeout(1300);

  const fileRowBox = await view.locator(".gitFile", { hasText: "map.ts" }).first().boundingBox();
  if (fileRowBox === null) throw new Error("The map.ts row is not visible in the commit details");
  cursor = await moveCursor(page, cursor, {
    x: fileRowBox.x + FILE_NAME_OFFSET_X,
    y: fileRowBox.y + fileRowBox.height / 2
  });
  await page.waitForTimeout(500);
  cursor = await clickAt(page, cursor, view.locator(".gitFileAction.highlightFileHistory").first());
  await view.locator("#fileHistoryBar").waitFor({ state: "visible" });
  await moveCursor(page, cursor, POINTER_PARK);
  await page.waitForTimeout(2200);

  for (let step = 0; step < DOWN_STEPS; step++) {
    await pressKey(page, "ArrowDown", "↓");
    await page.waitForTimeout(STEP_PAUSE_MS);
  }
  await page.waitForTimeout(1200);

  await stopScreencast(recording, FINAL_HOLD_SECONDS);
});
