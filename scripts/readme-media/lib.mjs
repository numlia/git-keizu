// Shared helpers for the README media captures (see README.md in this folder).
// They drive a separate VS Code with Playwright, draw a visible cursor and keycaps
// (Playwright input has none), and record CDP screencast frames for ffmpeg.
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..", "..");
const WORK_DIR = process.env.KEIZU_CAPTURE_WORK_DIR ?? join(REPO_ROOT, ".tmp", "readme-media");
export const FRAMES_DIR = join(WORK_DIR, "frames");
const PROFILE_DIR = join(WORK_DIR, "profile");
const EXTENSIONS_DIR = join(WORK_DIR, "extensions");
const SETTINGS_TEMPLATE = join(SCRIPT_DIR, "settings.json");
const VSCODE_EXECUTABLE = process.env.KEIZU_CAPTURE_VSCODE ?? "";
const PLAYWRIGHT_MODULE = process.env.KEIZU_CAPTURE_PLAYWRIGHT ?? "playwright";

// render.sh crops the stills with coordinates that assume this window size.
const WINDOW = { width: 1280, height: 800 };
/** Empty spot on the editor tab bar where the pointer rests without hovering anything. */
export const POINTER_PARK = { x: 640, y: 46 };
/** Horizontal click position inside a commit row, clear of labels and the graph. */
export const ROW_CLICK_OFFSET_X = 420;

const STARTUP_TIMEOUT_MS = 60000;
const SETTLE_MS = 2500;
const SIDEBAR_TOGGLE_MS = 400;
const PALETTE_SETTLE_MS = 600;
const POLL_INTERVAL_MS = 250;
const CURSOR_STEPS = 24;
const CURSOR_STEP_MS = 16;
const CLICK_PAUSE_MS = 180;
const RIPPLE_MS = 450;
const KEYCAP_MS = 900;
const CURSOR_ELEMENT_ID = "__captureCursor";
const DEV_HOST_TITLE_PREFIX = "[Extension Development Host] ";
const OPEN_COMMAND = "Git Keizu: View Git Keizu";
const SIDE_BAR_TOGGLES = [
  { selector: ".part.sidebar", shortcut: "Control+B" },
  { selector: ".part.auxiliarybar", shortcut: "Control+Alt+B" }
];

export function requireRepoPath(argv) {
  const repoPath = argv[2];
  if (repoPath === undefined || !existsSync(join(repoPath, ".git"))) {
    throw new Error(
      "usage: node <capture script> <demo-repo-path> (a repository made by make-demo-repo.sh)"
    );
  }
  return repoPath;
}

async function loadElectron() {
  if (!existsSync(VSCODE_EXECUTABLE)) {
    throw new Error(
      "Set KEIZU_CAPTURE_VSCODE to the executable of a Linux VS Code build (see README.md)"
    );
  }
  try {
    const playwright = await import(PLAYWRIGHT_MODULE);
    return playwright._electron;
  } catch (error) {
    throw new Error(
      `Cannot load Playwright from "${PLAYWRIGHT_MODULE}"; set KEIZU_CAPTURE_PLAYWRIGHT (see README.md)`,
      {
        cause: error
      }
    );
  }
}

async function launch(repoPath) {
  const electron = await loadElectron();
  mkdirSync(join(PROFILE_DIR, "User"), { recursive: true });
  copyFileSync(SETTINGS_TEMPLATE, join(PROFILE_DIR, "User", "settings.json"));
  const app = await electron.launch({
    executablePath: VSCODE_EXECUTABLE,
    args: [
      `--extensionDevelopmentPath=${REPO_ROOT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      `--extensions-dir=${EXTENSIONS_DIR}`,
      "--disable-workspace-trust",
      "--skip-welcome",
      "--skip-release-notes",
      "--disable-telemetry",
      "--locale=en",
      "--new-window",
      repoPath
    ]
  });
  try {
    const page = await app.firstWindow();
    await app.evaluate(({ BrowserWindow }, size) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.setContentSize(size.width, size.height);
      win.center();
    }, WINDOW);
    await page.waitForSelector(".monaco-workbench", { timeout: STARTUP_TIMEOUT_MS });
    await page.waitForTimeout(SETTLE_MS);
    return { app, page };
  } catch (error) {
    await app.close();
    throw error;
  }
}

// Layout is remembered per workspace. The palette's "Close" commands are hidden when the bar is
// already closed (the next match then toggles it open), so only visible bars are toggled.
async function closeSideBars(page) {
  for (const { selector, shortcut } of SIDE_BAR_TOGGLES) {
    if (await page.locator(selector).first().isVisible()) {
      await page.keyboard.press(shortcut);
      await page.waitForTimeout(SIDEBAR_TOGGLE_MS);
    }
  }
}

async function openGitKeizu(page) {
  await page.keyboard.press("F1");
  await page.keyboard.type(OPEN_COMMAND);
  await page.waitForTimeout(PALETTE_SETTLE_MS);
  await page.keyboard.press("Enter");
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      if (
        (await frame
          .locator(".commit")
          .count()
          .catch(() => 0)) > 0
      ) {
        await page.waitForTimeout(SETTLE_MS);
        return frame;
      }
    }
    await page.waitForTimeout(POLL_INTERVAL_MS);
  }
  throw new Error("The Git Keizu view did not render any commits");
}

// The development host always prefixes the title; captures should look like a normal install.
async function hideDevelopmentHostTitle(page) {
  await page.evaluate((prefix) => {
    const title = document.querySelector(".titlebar .window-title");
    if (title !== null) title.textContent = title.textContent.replace(prefix, "");
  }, DEV_HOST_TITLE_PREFIX);
}

/** Opens the demo repository in Git Keizu, runs the capture, and always closes VS Code. */
export async function withGitKeizu(repoPath, capture) {
  const { app, page } = await launch(repoPath);
  try {
    await closeSideBars(page);
    const view = await openGitKeizu(page);
    await hideDevelopmentHostTitle(page);
    await capture({ page, view });
  } finally {
    await app.close();
  }
}

export async function installCursor(page, start) {
  await page.evaluate(
    ({ id, x, y }) => {
      const svgNs = "http://www.w3.org/2000/svg";
      const cursor = document.createElement("div");
      cursor.id = id;
      Object.assign(cursor.style, {
        position: "fixed",
        left: "0",
        top: "0",
        zIndex: "2147483647",
        pointerEvents: "none",
        transform: `translate(${x}px, ${y}px)`
      });
      const svg = document.createElementNS(svgNs, "svg");
      svg.setAttribute("width", "22");
      svg.setAttribute("height", "30");
      svg.setAttribute("viewBox", "0 0 22 30");
      const path = document.createElementNS(svgNs, "path");
      path.setAttribute("d", "M1 1 L1 23 L7 17.5 L11 27 L15 25.3 L11 16 L19 16 Z");
      path.setAttribute("fill", "#ffffff");
      path.setAttribute("stroke", "#111111");
      path.setAttribute("stroke-width", "1.6");
      path.setAttribute("stroke-linejoin", "round");
      svg.appendChild(path);
      cursor.appendChild(svg);
      document.body.appendChild(cursor);
    },
    { id: CURSOR_ELEMENT_ID, ...start }
  );
  await page.mouse.move(start.x, start.y);
  return { ...start };
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/** Glides the drawn cursor and the real pointer together; returns the new cursor position. */
export async function moveCursor(page, from, to) {
  for (let step = 1; step <= CURSOR_STEPS; step++) {
    const k = easeInOut(step / CURSOR_STEPS);
    const point = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
    await page.evaluate(
      ({ id, x, y }) => {
        document.getElementById(id).style.transform = `translate(${x}px, ${y}px)`;
      },
      { id: CURSOR_ELEMENT_ID, ...point }
    );
    await page.mouse.move(point.x, point.y);
    await page.waitForTimeout(CURSOR_STEP_MS);
  }
  return { ...to };
}

async function showClickRipple(page, point) {
  await page.evaluate(
    ({ x, y, duration }) => {
      const ripple = document.createElement("div");
      Object.assign(ripple.style, {
        position: "fixed",
        left: `${x - 14}px`,
        top: `${y - 14}px`,
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        border: "3px solid rgba(255, 196, 0, 0.9)",
        zIndex: "2147483646",
        pointerEvents: "none"
      });
      document.body.appendChild(ripple);
      ripple
        .animate(
          [
            { transform: "scale(0.4)", opacity: 1 },
            { transform: "scale(1.4)", opacity: 0 }
          ],
          { duration, easing: "ease-out" }
        )
        .finished.then(() => ripple.remove());
    },
    { ...point, duration: RIPPLE_MS }
  );
}

/**
 * Glides the cursor to an element and clicks it. `offsetX` clicks at that distance from the
 * element's left edge instead of its centre; `modifiers` are held during the click.
 */
export async function clickAt(page, cursor, locator, options = {}) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error(`Element is not visible: ${locator}`);
  const target = {
    x: options.offsetX === undefined ? box.x + box.width / 2 : box.x + options.offsetX,
    y: box.y + box.height / 2
  };
  const moved = await moveCursor(page, cursor, target);
  await page.waitForTimeout(CLICK_PAUSE_MS);
  const modifiers = options.modifiers ?? [];
  for (const key of modifiers) await page.keyboard.down(key);
  await showClickRipple(page, target);
  await page.mouse.click(target.x, target.y, { button: options.button ?? "left" });
  for (const key of modifiers) await page.keyboard.up(key);
  return moved;
}

/** Presses a key and shows its label as a keycap, since key presses are otherwise invisible. */
export async function pressKey(page, key, label) {
  await page.evaluate(
    ({ text, duration }) => {
      const cap = document.createElement("div");
      cap.textContent = text;
      Object.assign(cap.style, {
        position: "fixed",
        right: "36px",
        bottom: "48px",
        minWidth: "44px",
        padding: "8px 14px",
        borderRadius: "8px",
        background: "rgba(30, 30, 30, 0.92)",
        border: "2px solid rgba(255, 196, 0, 0.9)",
        color: "#ffffff",
        font: "600 22px system-ui, sans-serif",
        textAlign: "center",
        zIndex: "2147483647",
        pointerEvents: "none"
      });
      document.body.appendChild(cap);
      cap
        .animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration })
        .finished.then(() => cap.remove());
    },
    { text: label, duration: KEYCAP_MS }
  );
  await page.keyboard.press(key);
}

/** Starts recording every rendered frame of the window into FRAMES_DIR/<name>. */
export async function startScreencast(page, name) {
  const dir = join(FRAMES_DIR, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const file = join(dir, `f${String(frames.length).padStart(5, "0")}.png`);
    frames.push({ file, timestamp: metadata.timestamp });
    writeFileSync(file, Buffer.from(data, "base64"));
    await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
  return { cdp, frames, dir };
}

/** Stops recording and writes an ffmpeg concat list whose durations follow the real frame timing. */
export async function stopScreencast(recording, finalHoldSeconds) {
  await recording.cdp.send("Page.stopScreencast");
  const { frames, dir } = recording;
  if (frames.length === 0) throw new Error(`No frames were recorded into ${dir}`);
  const lines = frames.flatMap((frame, i) => {
    const next = frames[i + 1];
    const duration = next === undefined ? finalHoldSeconds : next.timestamp - frame.timestamp;
    return [`file '${frame.file}'`, `duration ${duration.toFixed(3)}`];
  });
  // The concat demuxer ignores the last duration unless the final file is listed once more.
  lines.push(`file '${frames[frames.length - 1].file}'`);
  writeFileSync(join(dir, "frames.txt"), `${lines.join("\n")}\n`);
}
