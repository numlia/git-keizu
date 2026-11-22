import assert from "node:assert/strict";
import { isAbsolute } from "node:path";

import { withGitKeizu } from "../../scripts/readme-media/lib.mjs";

// TC-791. Use an existing workspace configured to load 100,000 commits on opening.
const workspace = process.argv[2];
assert(workspace && isAbsolute(workspace), "Pass the absolute path to the VS Code workspace.");
const targetIndex = 90_000;
const tolerancePx = 1;

await withGitKeizu(workspace, async ({ page, view }) => {
  const scroller = view.locator("#scrollContainer");
  const table = view.locator("#commitTable table");
  assert.ok(Number(await table.getAttribute("aria-rowcount")) > 100_000, "Load 100,000 commits");
  const pitch = await table
    .locator("tr.commit td")
    .first()
    .evaluate((cell) => parseFloat(getComputedStyle(cell).lineHeight));
  await scroller.evaluate((el, top) => {
    el.scrollTop = top;
  }, targetIndex * pitch);
  await table.locator(`tr[data-id="${targetIndex}"]`).waitFor();
  const session = await page.context().newCDPSession(page);
  let previousVisible = 0;
  for (const height of [600, 1000]) {
    await session.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height,
      deviceScaleFactor: 1,
      mobile: false
    });
    await page.waitForFunction((expected) => window.innerHeight === expected, height);
    await view.evaluate(
      () =>
        new Promise((done) =>
          requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(done)))
        )
    );
    const sample = await scroller.evaluate((el) => {
      const clip = el.getBoundingClientRect();
      const header = el.querySelector("#tableColHeaders").getBoundingClientRect();
      const rows = Array.from(el.querySelectorAll("tr.commit"));
      const visible = rows.filter((row) => {
        const rect = row.getBoundingClientRect();
        return rect.top >= Math.max(clip.top, header.bottom) && rect.bottom <= clip.bottom;
      });
      const errors = visible.map((row) => {
        const node = document.querySelector(`#commitGraph circle[data-hash="${row.dataset.hash}"]`);
        if (!node) throw new Error(`Missing graph node for row ${row.dataset.id}`);
        const r = row.getBoundingClientRect();
        const n = node.getBoundingClientRect();
        return Math.abs((r.top + r.bottom - n.top - n.bottom) / 2);
      });
      return { top: el.scrollTop, visible: visible.length, maxError: Math.max(...errors) };
    });
    assert.equal(sample.top, targetIndex * pitch);
    assert.ok(sample.visible > previousVisible, `Expected more fully visible rows at ${height}px`);
    assert.ok(sample.maxError <= tolerancePx, `Row/node center error: ${sample.maxError}px`);
    process.stdout.write(
      `TC-791: ${height}px, ${sample.visible} visible rows, max error ${sample.maxError}px\n`
    );
    previousVisible = sample.visible;
  }
});
