// Full-window stills for the README Highlights, taken in one session. render.sh crops them.
// Usage: node capture-stills.mjs <demo-repo-path>   (the capture creates a branch in the repo)
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import {
  FRAMES_DIR,
  POINTER_PARK,
  requireRepoPath,
  ROW_CLICK_OFFSET_X,
  withGitKeizu
} from "./lib.mjs";

const OUT_DIR = join(FRAMES_DIR, "stills");
const MENU_SETTLE_MS = 700;
const VIEW_SETTLE_MS = 1500;
/** Vertical click position inside a commit row. */
const ROW_CLICK_Y = 10;
/** Right-clicking a label this close to its far end keeps the menu off the label itself. */
const LABEL_END_INSET = 4;
const SEEDED_BRANCH = "experiment/cluster-markers";
/** Empty spot left of the Branches filter, inside the view and without hover styles. */
const VIEW_BLANK_SPOT = { x: 100, y: 82 };

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

await withGitKeizu(requireRepoPath(process.argv), async ({ page, view }) => {
  const commitRow = (message) => view.locator(".commit", { hasText: message }).first();
  const headLabel = (name) => view.locator(".gitRef.head", { hasText: name }).first();
  const menuItem = (text) => view.locator(".contextMenuItem", { hasText: text }).first();
  const clickRow = (message, options = {}) =>
    commitRow(message).click({ position: { x: ROW_CLICK_OFFSET_X, y: ROW_CLICK_Y }, ...options });
  const shot = async (name, { parkPointer }) => {
    if (parkPointer) await page.mouse.move(POINTER_PARK.x, POINTER_PARK.y);
    await page.waitForTimeout(MENU_SETTLE_MS);
    await page.screenshot({ path: join(OUT_DIR, `${name}.png`) });
  };

  await clickRow("Highlight the selected trail");
  await page.waitForTimeout(VIEW_SETTLE_MS);
  await clickRow("Add trail difficulty legend", { modifiers: ["Control"] });
  await page.waitForTimeout(VIEW_SETTLE_MS);
  await shot("commit-comparison", { parkPointer: true });
  await page.keyboard.press("Escape");

  // Runs a real action first so the per-repository Recent section appears in the next menu.
  await clickRow("Add trail difficulty legend", { button: "right" });
  await menuItem("Create Branch").click();
  await view.locator("#dialogInput0").fill(SEEDED_BRANCH);
  // "Check out" is a styled checkbox that ignores synthetic clicks; checking out would also fail on the demo's local changes.
  await view.locator("#dialogInput1").evaluate((input) => {
    input.checked = false;
  });
  await view.locator("#dialogAction").click();
  await headLabel(SEEDED_BRANCH).waitFor();
  await page.waitForTimeout(VIEW_SETTLE_MS);

  await clickRow("Retry trail requests on network errors", { button: "right" });
  await shot("commit-actions", { parkPointer: false });
  await page.keyboard.press("Escape");

  const worktreeLabel = headLabel("feature/dark-theme");
  const worktreeLabelBox = await worktreeLabel.boundingBox();
  if (worktreeLabelBox === null) throw new Error("The feature/dark-theme label is not visible");
  await worktreeLabel.click({
    button: "right",
    position: {
      x: worktreeLabelBox.width - LABEL_END_INSET,
      y: worktreeLabelBox.height - LABEL_END_INSET / 2
    }
  });
  await shot("worktree-menu", { parkPointer: false });
  await page.keyboard.press("Escape");

  await view.locator(".refOverflowCounter").first().click();
  await shot("graph-overview", { parkPointer: false });
  await page.keyboard.press("Escape");

  await headLabel("feature/offline-mode").click({ button: "right" });
  await menuItem("Highlight path").hover();
  await page.waitForTimeout(MENU_SETTLE_MS);
  await menuItem("All ancestors").click();
  await view.locator("#pathHighlightBar").waitFor({ state: "visible" });
  // The row under the clicked menu item keeps its hover unless the pointer moves inside the view first.
  await page.mouse.move(VIEW_BLANK_SPOT.x, VIEW_BLANK_SPOT.y);
  await shot("path-highlight", { parkPointer: true });
  await view.locator("#pathHighlightClear").click();

  await headLabel("feature/trail-photos").click({ button: "right" });
  await menuItem("More").hover();
  await page.waitForTimeout(MENU_SETTLE_MS);
  await menuItem("Delete Branch").click();
  await view.locator("#dialogAction").click();
  await view.locator("#dialog", { hasText: "fully merged" }).waitFor();
  await shot("branch-delete-explained", { parkPointer: true });
  await page.keyboard.press("Escape");

  await view.locator("#branchCleanupBtn").click();
  await view.locator(".branchCleanupActionBtn").first().waitFor();
  await page.waitForTimeout(VIEW_SETTLE_MS);
  await shot("branch-cleanup", { parkPointer: true });
});
