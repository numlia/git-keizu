import assert from "node:assert/strict";
import { resolve } from "node:path";

import { withGitKeizu } from "../../scripts/readme-media/lib.mjs";

// Owner: docs/testing/perspectives/web/main-test/14-history-search-01.md
// Case: TC-836
const [repository, trial] = process.argv.slice(2);
assert(
  repository && trial,
  "Pass the fixture path and a trial label (warmup, 1–5, scroll, cancel, keyboard or details)."
);
const target = "b01780df679ecb68b2945499e6621896f0bb718f";
const showDetails = trial === "details";
await withGitKeizu(resolve(repository), async ({ page, view }) => {
  const button = (id) => view.locator(`#${id}`);
  const input = button("findInput");
  const count = () =>
    view
      .locator("#commitTable table")
      .evaluate((table) =>
        table.ariaRowCount === null
          ? table.querySelectorAll("tr.commit").length
          : Number(table.ariaRowCount) - 1
      );
  const scroll = () => button("scrollContainer").evaluate((element) => element.scrollTop);
  const frame = () =>
    view.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    );
  const report = { trial };
  await view.evaluate(() => {
    window.times = {};
    window.received = [];
    window.addEventListener("message", ({ data }) => {
      if (data.command === "historySearchBatch")
        window.received.push([data.firstPosition, data.commits?.length, data.hasMore]);
    });
  });
  async function arm(id, event, key) {
    await button(id).evaluate(
      (element, [event, key]) => {
        element.addEventListener(
          event,
          (e) => {
            if (e.isTrusted) window.times[key] = performance.now();
          },
          { once: true, capture: true }
        );
      },
      [event, key]
    );
  }
  async function time(expected, start, end) {
    await view.waitForFunction(
      ({ expected, end, target, showDetails }) => {
        const d = document,
          table = d.querySelector("#commitTable table");
        const pos = d.querySelector("#findPosition").textContent;
        const row = d.querySelector("tr.findCurrentCommit");
        const rect = row?.getBoundingClientRect(),
          box = d.querySelector("#scrollContainer").getBoundingClientRect();
        const details = d.querySelector("#commitDetails");
        const ready =
          expected === "jump"
            ? (table.ariaRowCount === null
                ? table.rows.length - (details ? 2 : 1)
                : Number(table.ariaRowCount) - 1) === 90100 &&
              row?.dataset.hash === target &&
              Number(row.dataset.id) === 89999 &&
              rect.top >= box.top &&
              rect.bottom <= box.bottom &&
              d.querySelector(`circle[data-hash="${target}"]`) &&
              !d.querySelector("#findNext").disabled &&
              (showDetails
                ? details?.previousElementSibling?.dataset.hash === target &&
                  !d.querySelector("#cdvLoading")
                : !details)
            : expected === "key"
              ? pos === "No Results" &&
                d.querySelector("#findScope").textContent === "Searching loaded commits (90100)"
              : pos === expected &&
                d.querySelector("#findStatus").textContent ===
                  "Search complete. Unloaded stashes are excluded.";
        if (ready && !(end in window.times)) {
          window.times[end] = null;
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              window.times[end] = performance.now();
            })
          );
        }
        return Number.isFinite(window.times[end]);
      },
      { expected, end, target, showDetails },
      { timeout: 180000 }
    );
    const ms = await view.evaluate(
      ([start, end]) => window.times[end] - window.times[start],
      [start, end]
    );
    assert(ms > 0);
    return ms;
  }
  async function search(text, position, key) {
    await input.fill(text);
    await view.waitForFunction(
      () =>
        !document.querySelector("#findStart").hidden &&
        !document.querySelector("#findStart").disabled
    );
    await view.evaluate(() => {
      window.received = [];
    });
    await arm("findStart", "click", key);
    await button("findStart").click();
    report[key] = await time(position, key, `${key}End`);
    const batches = await view.evaluate(() => window.received);
    assert.deepEqual(batches, [
      [301, 26000, true],
      [26301, 26000, true],
      [52301, 26000, true],
      [78301, 21700, false]
    ]);
    assert.equal(await count(), 300);
  }
  assert.equal(await count(), 300);
  if (trial === "scroll") {
    // Case: TC-815
    const scroller = button("scrollContainer");
    const box = await scroller.boundingBox();
    await page.mouse.move(box.x + 50, box.y + 100);
    await page.mouse.wheel(0, 20000);
    await view.waitForFunction(
      () => Number(document.querySelector("#commitTable table").ariaRowCount) === 401
    );
    await frame();
    assert.equal(await count(), 400);
    process.stdout.write(`${JSON.stringify({ trial, initial: 300, afterWheel: 400 })}\n`);
    return;
  }
  await button("searchBtn").click();
  if (trial === "cancel") {
    await input.fill("history-search-benchmark");
    await view.waitForFunction(() => !document.querySelector("#findStart").disabled);
    await button("findStart").click();
    await button("findContinue").waitFor({ state: "visible" });
    assert.equal(await button("findPosition").textContent(), "1 of 1300+ (1000+ unloaded)");
    await button("findContinue").click();
    await view.waitForFunction(
      () => document.querySelector("#findPosition").textContent === "1 of 2300+ (2000+ unloaded)"
    );
    await button("findCancel").click();
    assert.equal(await button("findStatus").textContent(), "Full history search cancelled.");
    assert.equal(await button("findScope").textContent(), "Searching loaded commits (300)");
    process.stdout.write(
      `${JSON.stringify({ trial, loaded: 300, paused: [1000, 2000], cancelled: true })}\n`
    );
    return;
  }
  if (showDetails) await button("findOpenCdv").click();
  assert.equal(await button("findOpenCdv").getAttribute("aria-pressed"), String(showDetails));
  await search("not-present-in-history", "No Results", "miss");
  await search("unique-deep-target", "0 of 1 (1 unloaded)", "hit");
  const box = await button("scrollContainer").boundingBox();
  await page.mouse.move(box.x + 50, box.y + 100);
  await page.mouse.wheel(0, 800);
  await view.waitForFunction(() => document.querySelector("#scrollContainer").scrollTop > 0);
  await frame();
  const original = await scroll();
  // Case: TC-823
  await button("findNext").click();
  assert.match(await button("dialog").textContent(), /90,100.*90,000/);
  await button("dialogDismiss").click();
  assert.equal(await count(), 300);
  assert.equal(await button("findReturn").isHidden(), true);
  assert.equal(await button("findPosition").textContent(), "0 of 1 (1 unloaded)");
  assert.equal(await scroll(), original);
  await arm("findNext", "click", "next");
  await button("findNext").click();
  await arm("dialogAction", "click", "approve");
  await button("dialogAction").click();
  report.jump = await time("jump", "next", "shown");
  report.approvalToShown = await view.evaluate(() => window.times.shown - window.times.approve);
  report.mounted = await view.locator("#commitTable tr.commit").count();
  report.hash = await view.locator("tr.findCurrentCommit").getAttribute("data-hash");
  report.depth = await count();
  if (trial === "keyboard") {
    assert.equal(await view.evaluate(() => document.activeElement.id), "findInput");
    await page.keyboard.press("End");
  } else {
    await input.focus();
    await input.press("End");
  }
  await arm("findInput", "keydown", "key");
  await page.keyboard.press("x");
  report.keyUpdate = await time("key", "key", "updated");
  report.nextToKey = await view.evaluate(() => window.times.key - window.times.next);
  assert.equal(await input.inputValue(), "unique-deep-targetx");
  await button("findReturn").click();
  await frame();
  assert.equal(await button("findReturn").isHidden(), true);
  assert.equal(await scroll(), original);
  assert.equal(await count(), 90100);
  assert.equal(await button("commitDetails").count(), 0);
  report.returnedScroll = original;
  process.stdout.write(`${JSON.stringify(report)}\n`);
});
