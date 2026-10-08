// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UNCOMMITTED_CHANGES_HASH } from "../../src/types";
import {
  beginFocusUpdate,
  captureFocusOrigin,
  configureFocusContext,
  finishFocusUpdate,
  type FocusContext,
  type FocusKey,
  type FocusOrigin,
  installKeyboardGuards,
  isKeyboardActionBlocked,
  markFocusTarget,
  moveFocusPast,
  reconcileRowTarget,
  restoreFocus,
  type RowTarget
} from "../../web/keyboardNavigation";

/* ------------------------------------------------------------------ */
/* Fixtures                                                           */
/* ------------------------------------------------------------------ */

const REPO = "/a";
const OTHER_REPO = "/b";
const HASHES = ["N", "M", "R"];
const STASH_HASH = "stash0";
const SPECIAL_REF_NAME = 'origin/feat/<b>&"]x';
const CLASS_POPUP = "refOverflowPopup";
const CLASS_COUNTER = "refOverflowCounter";
const CLASS_HIDDEN_REF = "refOverflowHidden";
const CLASS_MEASURE = "refOverflowMeasure";
const LOADING_HTML = '<h2 id="loadingHeader">Loading ...</h2>';

const disposers: (() => void)[] = [];

function rowKey(hash: string, repo = REPO): FocusKey {
  return { kind: "row", repo, hash };
}

function refKey(hash: string, name = SPECIAL_REF_NAME): FocusKey {
  return { kind: "ref", repo: REPO, hash, refType: "remote", name };
}

function renderShell(): void {
  document.body.innerHTML = `<div id="controls"><button id="refreshBtn">refresh</button><div id="repoSelect"><button id="repoBtn">repo</button></div></div><div id="commitTable" tabindex="-1"></div><div id="contextMenu"></div><input id="findInput">`;
}

function table(): HTMLElement {
  return document.getElementById("commitTable") as HTMLElement;
}

function renderRows(hashes: readonly string[]): Map<string, HTMLElement> {
  const html = hashes
    .map((hash) => `<tr class="commit" data-hash="${hash}" tabindex="-1"><td></td><td></td></tr>`)
    .join("");
  table().innerHTML = `<table><tbody>${html}</tbody></table>`;
  const rows = new Map<string, HTMLElement>();
  table()
    .querySelectorAll<HTMLElement>("tr")
    .forEach((row) => {
      const hash = row.dataset.hash as string;
      markFocusTarget(row, rowKey(hash));
      rows.set(hash, row);
    });
  return rows;
}

function addRef(row: HTMLElement, key: FocusKey, className = ""): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = `gitRef ${className}`.trim();
  (row.lastElementChild as HTMLElement).appendChild(button);
  markFocusTarget(button, key);
  return button;
}

function addCounter(row: HTMLElement): HTMLButtonElement {
  const counter = document.createElement("button");
  counter.className = CLASS_COUNTER;
  (row.lastElementChild as HTMLElement).appendChild(counter);
  return counter;
}

function addPopupClone(key: FocusKey): HTMLButtonElement {
  const popup = document.createElement("div");
  popup.className = CLASS_POPUP;
  const clone = document.createElement("button");
  markFocusTarget(clone, key);
  popup.appendChild(clone);
  document.body.appendChild(popup);
  return clone;
}

function byId(id: string): HTMLElement {
  return document.getElementById(id) as HTMLElement;
}

function registerContext(overrides: Partial<FocusContext> = {}): FocusContext {
  const context: FocusContext = {
    getRepo: vi.fn(() => REPO),
    getActiveRow: vi.fn(() => null),
    getTabStops: vi.fn(() => []),
    ...overrides
  };
  disposers.push(configureFocusContext(context));
  return context;
}

function installGuards(): () => void {
  const dispose = installKeyboardGuards(document);
  disposers.push(dispose);
  return dispose;
}

function keyEvent(
  type: "keydown" | "keyup",
  key: string,
  init: Partial<KeyboardEventInit> = {}
): KeyboardEvent {
  return new KeyboardEvent(type, { key, bubbles: true, cancelable: true, ...init });
}

function fire(target: EventTarget, event: KeyboardEvent): KeyboardEvent {
  target.dispatchEvent(event);
  return event;
}

function composition(target: EventTarget, type: "compositionstart" | "compositionend"): void {
  target.dispatchEvent(new Event(type, { bubbles: true }));
}

beforeEach(() => {
  renderShell();
});

afterEach(() => {
  while (disposers.length > 0) disposers.pop()?.();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

/* ------------------------------------------------------------------ */
/* S1: reconcileRowTarget                                             */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/keyboardNavigation-test.md
describe("reconcileRowTarget", () => {
  const previous: RowTarget = { repo: REPO, hash: "M", index: 1 };

  // Case: TC-001
  it("selects the HEAD row on first use without touching the DOM", () => {
    const hashes = [...HASHES];
    const querySpy = vi.spyOn(document, "querySelectorAll");
    expect(reconcileRowTarget(null, REPO, hashes, "M")).toEqual({
      repo: REPO,
      hash: "M",
      index: 1
    });
    expect(hashes).toEqual(HASHES);
    expect(querySpy).not.toHaveBeenCalled();
  });

  // Case: TC-002
  it("re-initialises to HEAD when the repo changes even if the hash exists", () => {
    expect(reconcileRowTarget(previous, OTHER_REPO, HASHES, "R")).toEqual({
      repo: OTHER_REPO,
      hash: "R",
      index: 2
    });
  });

  // Case: TC-003
  it.each([
    [["R", "M", "N"], 1],
    [["M", "R", "N"], 0]
  ])("keeps the hash across a same-repo reorder %j", (hashes, index) => {
    expect(reconcileRowTarget(previous, REPO, hashes, "M")).toEqual({
      repo: REPO,
      hash: "M",
      index
    });
  });

  // Case: TC-004
  it("falls back to the row at the previous index when the hash disappears", () => {
    expect(reconcileRowTarget(previous, REPO, ["N", "R"], "N")).toEqual({
      repo: REPO,
      hash: "R",
      index: 1
    });
  });

  // Case: TC-005
  it("clamps a previous index past the end to the last row", () => {
    expect(reconcileRowTarget({ repo: REPO, hash: "R", index: 2 }, REPO, ["N"], "N")).toEqual({
      repo: REPO,
      hash: "N",
      index: 0
    });
  });

  // Case: TC-006
  it.each([
    [null, null],
    [null, "M"],
    [previous, null],
    [previous, "M"]
  ])("returns null for an empty list (previous %j, head %j)", (prev, head) => {
    expect(reconcileRowTarget(prev, REPO, [], head)).toBeNull();
  });

  // Case: TC-007
  it("uses the first row when there is no HEAD", () => {
    expect(reconcileRowTarget(null, REPO, HASHES, null)).toEqual({
      repo: REPO,
      hash: "N",
      index: 0
    });
  });

  // Case: TC-008
  it("uses the first row when HEAD is not loaded", () => {
    expect(reconcileRowTarget(null, REPO, HASHES, "Z")).toEqual({
      repo: REPO,
      hash: "N",
      index: 0
    });
  });

  // Case: TC-009
  it.each(["only", null])("handles a single row with head %j", (head) => {
    expect(reconcileRowTarget(null, REPO, ["only"], head)).toEqual({
      repo: REPO,
      hash: "only",
      index: 0
    });
  });

  // Case: TC-010
  it("treats the working tree row and stash hashes like any other hash", () => {
    const hashes = [UNCOMMITTED_CHANGES_HASH, "M", STASH_HASH];
    const initial = reconcileRowTarget(null, REPO, hashes, "M");
    expect(initial).toEqual({ repo: REPO, hash: "M", index: 1 });
    const workingTree = { repo: REPO, hash: UNCOMMITTED_CHANGES_HASH, index: 0 };
    expect(reconcileRowTarget(workingTree, REPO, hashes, "M")).toEqual(workingTree);
    const stash = { repo: REPO, hash: STASH_HASH, index: 2 };
    expect(reconcileRowTarget(stash, REPO, [UNCOMMITTED_CHANGES_HASH, "M"], "M")).toEqual({
      repo: REPO,
      hash: "M",
      index: 1
    });
  });

  // Case: TC-011
  it.each([
    [{ repo: REPO, hash: "M", index: 1 }, ["X", "M"]],
    [{ repo: REPO, hash: "M", index: 0 }, ["Y", "M"]]
  ])("prefers the hash over the previous index (%j in %j)", (prev, hashes) => {
    expect(reconcileRowTarget(prev, REPO, hashes, hashes[0])).toEqual({
      repo: REPO,
      hash: "M",
      index: 1
    });
  });

  // Case: TC-012
  it("does not mutate the previous target and returns a new object", () => {
    const snapshot = { ...previous };
    const result = reconcileRowTarget(previous, REPO, HASHES, "M");
    expect(previous).toEqual(snapshot);
    expect(result).not.toBe(previous);
  });
});

/* ------------------------------------------------------------------ */
/* S2: input guards                                                   */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/keyboardNavigation-test.md
describe("installKeyboardGuards / isKeyboardActionBlocked", () => {
  let input: HTMLInputElement;
  let button: HTMLButtonElement;

  beforeEach(() => {
    input = document.createElement("input");
    button = document.createElement("button");
    document.body.append(input, button);
  });

  // Case: TC-013, TC-014, TC-015
  it.each(["Enter", "Escape", "ArrowDown", "ArrowUp"])(
    "blocks %s during composition without preventing default",
    (key) => {
      installGuards();
      composition(input, "compositionstart");
      const event = fire(input, keyEvent("keydown", key, { isComposing: true }));
      expect(isKeyboardActionBlocked(event)).toBe(true);
      expect(event.defaultPrevented).toBe(false);
    }
  );

  // Case: TC-016
  it("keeps blocking until the keyup that ends the composition, then allows the next keydown", () => {
    installGuards();
    composition(input, "compositionstart");
    fire(input, keyEvent("keydown", "Enter", { isComposing: true }));
    composition(input, "compositionend");
    const keyup = fire(input, keyEvent("keyup", "Enter"));
    expect(isKeyboardActionBlocked(keyup)).toBe(true);
    const next = fire(input, keyEvent("keydown", "Enter"));
    expect(isKeyboardActionBlocked(next)).toBe(false);
  });

  // Case: TC-017
  it.each(["Enter", " ", "ContextMenu"])("blocks repeat of the action key %j", (key) => {
    installGuards();
    expect(isKeyboardActionBlocked(fire(input, keyEvent("keydown", key, { repeat: true })))).toBe(
      true
    );
  });

  // Case: TC-018
  it.each(["ArrowDown", "a"])("allows repeat of %j", (key) => {
    installGuards();
    const event = fire(input, keyEvent("keydown", key, { repeat: true }));
    expect(isKeyboardActionBlocked(event)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  // Case: TC-019
  it.each(["Enter", " "])("allows a plain %j keydown once and blocks its keyup", (key) => {
    installGuards();
    expect(isKeyboardActionBlocked(fire(input, keyEvent("keydown", key)))).toBe(false);
    expect(isKeyboardActionBlocked(fire(input, keyEvent("keyup", key)))).toBe(true);
  });

  // Case: TC-020
  it("prevents the default button click for composition and repeat presses", () => {
    installGuards();
    const onClick = vi.fn();
    button.addEventListener("click", onClick);
    composition(button, "compositionstart");
    const keydown = fire(button, keyEvent("keydown", "Enter", { isComposing: true }));
    composition(button, "compositionend");
    const keyup = fire(button, keyEvent("keyup", "Enter"));
    expect(keydown.defaultPrevented).toBe(true);
    expect(keyup.defaultPrevented).toBe(true);
    const repeat = fire(button, keyEvent("keydown", "Enter", { repeat: true }));
    expect(repeat.defaultPrevented).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });

  // Case: TC-021
  it("does not prevent a normal button press", () => {
    installGuards();
    expect(fire(button, keyEvent("keydown", "Enter")).defaultPrevented).toBe(false);
    expect(fire(button, keyEvent("keyup", "Enter")).defaultPrevented).toBe(false);
  });

  // Case: TC-022
  it("shares one registration across installs and removes it after the last disposer", () => {
    const first = installGuards();
    installGuards();
    first();
    composition(input, "compositionstart");
    expect(isKeyboardActionBlocked(fire(input, keyEvent("keydown", "Enter")))).toBe(true);
    composition(input, "compositionend");
    fire(input, keyEvent("keyup", "Enter"));
    while (disposers.length > 0) disposers.pop()?.();
    composition(input, "compositionstart");
    const event = fire(input, keyEvent("keydown", "Enter"));
    expect(isKeyboardActionBlocked(event)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  // Case: TC-023
  it("derives the verdict from the event alone when guards are not installed", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const event = fire(input, keyEvent("keydown", "Enter", { isComposing: true }));
    expect(isKeyboardActionBlocked(event)).toBe(true);
    expect(addSpy).not.toHaveBeenCalled();
  });

  // Case: TC-024
  it("keeps the composition key pending across an unrelated keyup", () => {
    installGuards();
    composition(input, "compositionstart");
    fire(input, keyEvent("keydown", "Enter", { isComposing: true }));
    composition(input, "compositionend");
    fire(input, keyEvent("keyup", "Escape"));
    expect(
      isKeyboardActionBlocked(fire(input, keyEvent("keydown", "Enter", { repeat: true })))
    ).toBe(true);
    expect(isKeyboardActionBlocked(fire(input, keyEvent("keyup", "Enter")))).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* S3: focus keys, origin capture, restore and tab stops              */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/keyboardNavigation-test.md
describe("captureFocusOrigin / restoreFocus / moveFocusPast", () => {
  // Case: TC-025
  it("captures the element key followed by its row key without altering names", () => {
    registerContext();
    const rows = renderRows(HASHES);
    const ref = addRef(rows.get("M") as HTMLElement, refKey("M"));
    const origin = captureFocusOrigin(ref);
    expect(origin).not.toBeNull();
    expect(origin?.repo).toBe(REPO);
    expect(origin?.keys).toEqual([refKey("M"), rowKey("M")]);
    expect(origin?.source).toBe(ref);
  });

  // Case: TC-026
  it("restores to a regenerated element with the same key", () => {
    registerContext();
    const oldRef = addRef(renderRows(HASHES).get("M") as HTMLElement, refKey("M"));
    const origin = captureFocusOrigin(oldRef);
    const newRef = addRef(renderRows(HASHES).get("M") as HTMLElement, refKey("M"));
    expect(oldRef.isConnected).toBe(false);
    expect(restoreFocus(origin, "keyboard")).toBe(true);
    expect(document.activeElement).toBe(newRef);
  });

  // Case: TC-027
  it("falls back to the owning row when the key is gone", () => {
    registerContext();
    const origin = captureFocusOrigin(
      addRef(renderRows(HASHES).get("M") as HTMLElement, refKey("M"))
    );
    const rows = renderRows(HASHES);
    expect(restoreFocus(origin, "keyboard")).toBe(true);
    expect(document.activeElement).toBe(rows.get("M"));
  });

  // Case: TC-028
  it("falls back to the active row, then to the named container", () => {
    const origin = (() => {
      const dispose = configureFocusContext({
        getRepo: () => REPO,
        getActiveRow: () => null,
        getTabStops: () => []
      });
      const captured = captureFocusOrigin(
        addRef(renderRows(HASHES).get("M") as HTMLElement, refKey("M"))
      );
      dispose();
      return captured;
    })();
    const rows = renderRows(["N", "R"]);
    registerContext({ getActiveRow: () => rows.get("R") as HTMLElement });
    expect(restoreFocus(origin, "keyboard")).toBe(true);
    expect(document.activeElement).toBe(rows.get("R"));
    while (disposers.length > 0) disposers.pop()?.();
    table().innerHTML = "";
    registerContext();
    expect(restoreFocus(origin, "keyboard")).toBe(true);
    expect(document.activeElement).toBe(table());
  });

  // Case: TC-029
  it("restores a popup clone to its counter, then to the owning row", () => {
    registerContext();
    const rows = renderRows(HASHES);
    const clone = addPopupClone(refKey("M"));
    const origin = captureFocusOrigin(clone);
    (clone.parentElement as HTMLElement).remove();
    const counter = addCounter(rows.get("M") as HTMLElement);
    expect(restoreFocus(origin, "keyboard")).toBe(true);
    expect(document.activeElement).toBe(counter);
    counter.remove();
    expect(restoreFocus(origin, "keyboard")).toBe(true);
    expect(document.activeElement).toBe(rows.get("M"));
  });

  // Case: TC-030
  it.each(["action", "outside", "tab", "repository"] as const)(
    "does not steal focus for reason %j",
    (reason) => {
      registerContext();
      const origin = captureFocusOrigin(
        addRef(renderRows(HASHES).get("M") as HTMLElement, refKey("M"))
      );
      byId("refreshBtn").focus();
      expect(restoreFocus(origin, reason)).toBe(false);
      expect(document.activeElement).toBe(byId("refreshBtn"));
    }
  );

  // Case: TC-031
  it("skips hidden, disabled, disconnected and measuring candidates", () => {
    registerContext();
    const origin = captureFocusOrigin(
      addRef(renderRows(HASHES).get("M") as HTMLElement, refKey("M"))
    );
    const rows = renderRows(HASHES);
    const row = rows.get("M") as HTMLElement;
    addRef(row, refKey("M")).hidden = true;
    addRef(row, refKey("M")).disabled = true;
    const detached = document.createElement("button");
    markFocusTarget(detached, refKey("M"));
    const focusSpy = vi.spyOn(detached, "focus");
    const measure = document.createElement("div");
    measure.className = CLASS_MEASURE;
    document.body.appendChild(measure);
    const measured = document.createElement("button");
    markFocusTarget(measured, refKey("M"));
    measure.appendChild(measured);
    expect(restoreFocus(origin, "keyboard")).toBe(true);
    expect(document.activeElement).toBe(row);
    expect(focusSpy).not.toHaveBeenCalled();
  });

  // Case: TC-032
  it("prefers the visible popup clone over the hidden original label", () => {
    registerContext();
    const rows = renderRows(HASHES);
    const original = addRef(rows.get("M") as HTMLElement, refKey("M"), CLASS_HIDDEN_REF);
    const origin = captureFocusOrigin(original);
    const clone = addPopupClone(refKey("M"));
    expect(restoreFocus(origin, "keyboard")).toBe(true);
    expect(document.activeElement).toBe(clone);
  });

  function tabStopFixture(): {
    stops: HTMLElement[];
    ref1: HTMLElement;
    ref2: HTMLElement;
    fileBtn: HTMLElement;
  } {
    const rows = renderRows(HASHES);
    const row = rows.get("M") as HTMLElement;
    const ref1 = addRef(row, refKey("M", "one"));
    const ref2 = addRef(row, refKey("M", "two"));
    const fileBtn = document.createElement("button");
    table().appendChild(fileBtn);
    const stops = [byId("refreshBtn"), row, ref1, ref2, fileBtn, byId("findInput")];
    registerContext({ getTabStops: () => stops });
    return { stops, ref1, ref2, fileBtn };
  }

  // Case: TC-033
  it("moves to the next and previous tab stop", () => {
    const { ref1, ref2, fileBtn } = tabStopFixture();
    const origin = captureFocusOrigin(ref2);
    expect(moveFocusPast(origin, 1)).toBe(true);
    expect(document.activeElement).toBe(fileBtn);
    expect(moveFocusPast(origin, -1)).toBe(true);
    expect(document.activeElement).toBe(ref1);
  });

  // Case: TC-034
  it("does not wrap at either end", () => {
    tabStopFixture();
    byId("findInput").focus();
    expect(moveFocusPast(captureFocusOrigin(byId("findInput")), 1)).toBe(false);
    expect(document.activeElement).toBe(byId("findInput"));
    byId("refreshBtn").focus();
    expect(moveFocusPast(captureFocusOrigin(byId("refreshBtn")), -1)).toBe(false);
    expect(document.activeElement).toBe(byId("refreshBtn"));
  });

  // Case: TC-035
  it("uses the counter as the anchor for a popup clone origin", () => {
    const rows = renderRows(HASHES);
    const row = rows.get("M") as HTMLElement;
    const counter = addCounter(row);
    const fileBtn = document.createElement("button");
    table().appendChild(fileBtn);
    registerContext({ getTabStops: () => [byId("refreshBtn"), row, counter, fileBtn] });
    const origin = captureFocusOrigin(addPopupClone(refKey("M")));
    expect(moveFocusPast(origin, 1)).toBe(true);
    expect(document.activeElement).toBe(fileBtn);
  });

  // Case: TC-036
  it("returns null / false without side effects when no context is registered", () => {
    const row = renderRows(HASHES).get("M") as HTMLElement;
    const ref = addRef(row, refKey("M"));
    byId("refreshBtn").focus();
    const origin: FocusOrigin = { repo: REPO, keys: [refKey("M")], source: ref };
    expect(captureFocusOrigin(ref)).toBeNull();
    expect(restoreFocus(origin, "keyboard")).toBe(false);
    expect(moveFocusPast(origin, 1)).toBe(false);
    expect(document.activeElement).toBe(byId("refreshBtn"));
  });

  // Case: TC-037
  it("keeps the newest context when an older registration is disposed", () => {
    const { ref2, fileBtn } = tabStopFixture();
    const first = disposers.pop() as () => void;
    const stops = [byId("refreshBtn"), ref2, fileBtn];
    disposers.push(
      configureFocusContext({
        getRepo: () => REPO,
        getActiveRow: () => null,
        getTabStops: () => stops
      })
    );
    first();
    const origin = captureFocusOrigin(ref2);
    expect(moveFocusPast(origin, 1)).toBe(true);
    expect(document.activeElement).toBe(fileBtn);
    while (disposers.length > 0) disposers.pop()?.();
    expect(moveFocusPast(origin, 1)).toBe(false);
    expect(captureFocusOrigin(ref2)).toBeNull();
  });

  // Case: TC-038
  it("keeps the captured keys when the source element is replaced", () => {
    registerContext();
    const origin = captureFocusOrigin(
      addRef(renderRows(HASHES).get("M") as HTMLElement, refKey("M"))
    );
    addRef(renderRows(HASHES).get("R") as HTMLElement, refKey("R", "other"));
    expect(origin?.source.isConnected).toBe(false);
    expect(origin?.keys[0]).toEqual(refKey("M"));
  });

  // Case: TC-039
  it("distinguishes a null element from an unmarked element", () => {
    const rows = renderRows(HASHES);
    registerContext({ getActiveRow: () => rows.get("R") as HTMLElement });
    const plain = document.createElement("div");
    document.body.appendChild(plain);
    expect(captureFocusOrigin(null)).toBeNull();
    const origin = captureFocusOrigin(plain);
    expect(origin?.keys).toEqual([]);
    expect(origin?.source).toBe(plain);
    expect(restoreFocus(origin, "keyboard")).toBe(true);
    expect(document.activeElement).toBe(rows.get("R"));
  });
});

/* ------------------------------------------------------------------ */
/* S4: focus update tickets                                           */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/keyboardNavigation-test.md
describe("beginFocusUpdate / finishFocusUpdate", () => {
  function focusedRef(): HTMLButtonElement {
    const ref = addRef(renderRows(HASHES).get("M") as HTMLElement, refKey("M"));
    ref.focus();
    return ref;
  }

  // Case: TC-040
  it("restores to the regenerated element with preventScroll", () => {
    registerContext();
    installGuards();
    focusedRef();
    const ticket = beginFocusUpdate(table());
    expect(ticket?.root).toBe(table());
    expect(ticket?.origin.keys[0]).toEqual(refKey("M"));
    const newRef = addRef(renderRows(HASHES).get("M") as HTMLElement, refKey("M"));
    const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
    expect(finishFocusUpdate(ticket)).toBe(true);
    expect(document.activeElement).toBe(newRef);
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });

  // Case: TC-041
  it("returns no ticket when focus is outside the root", () => {
    registerContext();
    renderRows(HASHES);
    byId("refreshBtn").focus();
    expect(beginFocusUpdate(table())).toBeNull();
    expect(finishFocusUpdate(null)).toBe(false);
    expect(document.activeElement).toBe(byId("refreshBtn"));
  });

  // Case: TC-042
  it("treats a popup owned by a row of the root as inside it", () => {
    registerContext();
    renderRows(HASHES);
    addPopupClone(refKey("M")).focus();
    const ticket = beginFocusUpdate(table());
    expect(ticket?.origin.keys).toEqual([refKey("M"), rowKey("M")]);
  });

  // Case: TC-043
  it("expires an older ticket when a newer one exists for the same root", () => {
    registerContext();
    focusedRef();
    const older = beginFocusUpdate(table());
    const newer = beginFocusUpdate(table());
    addRef(renderRows(HASHES).get("M") as HTMLElement, refKey("M"));
    expect(finishFocusUpdate(older)).toBe(false);
    expect(document.activeElement).toBe(document.body);
    expect(finishFocusUpdate(newer)).toBe(true);
  });

  // Case: TC-044
  it("does not restore after the repo changed", () => {
    const getRepo = vi.fn(() => REPO);
    registerContext({ getRepo });
    focusedRef();
    const ticket = beginFocusUpdate(table());
    addRef(renderRows(HASHES).get("M") as HTMLElement, refKey("M"));
    getRepo.mockReturnValue(OTHER_REPO);
    expect(finishFocusUpdate(ticket)).toBe(false);
    expect(document.activeElement).toBe(document.body);
  });

  // Case: TC-045
  it("does not restore after the user focused another element", () => {
    registerContext();
    focusedRef();
    const ticket = beginFocusUpdate(table());
    byId("refreshBtn").focus();
    addRef(renderRows(HASHES).get("M") as HTMLElement, refKey("M"));
    expect(finishFocusUpdate(ticket)).toBe(false);
    expect(document.activeElement).toBe(byId("refreshBtn"));
  });

  // Case: TC-046
  it("treats focus falling to body after DOM removal as restorable", () => {
    registerContext();
    const ref = focusedRef();
    const ticket = beginFocusUpdate(table());
    ref.remove();
    expect(document.activeElement).toBe(document.body);
    const newRef = addRef(renderRows(HASHES).get("M") as HTMLElement, refKey("M"));
    expect(finishFocusUpdate(ticket)).toBe(true);
    expect(document.activeElement).toBe(newRef);
  });

  // Case: TC-047
  it("does not restore after the window blurred", () => {
    registerContext();
    focusedRef();
    const ticket = beginFocusUpdate(table());
    window.dispatchEvent(new Event("blur"));
    addRef(renderRows(HASHES).get("M") as HTMLElement, refKey("M"));
    const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
    expect(finishFocusUpdate(ticket)).toBe(false);
    expect(focusSpy).not.toHaveBeenCalled();
  });

  // Case: TC-048
  it("treats pointerdown as a user move", () => {
    registerContext();
    focusedRef();
    const ticket = beginFocusUpdate(table());
    byId("refreshBtn").dispatchEvent(new Event("pointerdown", { bubbles: true }));
    addRef(renderRows(HASHES).get("M") as HTMLElement, refKey("M"));
    expect(finishFocusUpdate(ticket)).toBe(false);
  });

  // Case: TC-049
  it("does not let its own restore invalidate the next ticket", () => {
    registerContext();
    focusedRef();
    const first = beginFocusUpdate(table());
    addRef(renderRows(HASHES).get("M") as HTMLElement, refKey("M"));
    expect(finishFocusUpdate(first)).toBe(true);
    const second = beginFocusUpdate(table());
    expect(second?.focusEpoch).toBe(first?.focusEpoch);
    addRef(renderRows(HASHES).get("M") as HTMLElement, refKey("M"));
    expect(finishFocusUpdate(second)).toBe(true);
  });

  // Case: TC-050
  it("leaves focus in a connected context menu alone", () => {
    registerContext();
    renderRows(HASHES);
    const item = document.createElement("button");
    byId("contextMenu").appendChild(item);
    item.focus();
    const ticket = beginFocusUpdate(table());
    renderRows(HASHES);
    expect(ticket === null || finishFocusUpdate(ticket) === false).toBe(true);
    expect(document.activeElement).toBe(item);
  });

  // Case: TC-051
  it("parks focus on the container while loading and keeps the keys for the next ticket", () => {
    registerContext();
    (renderRows(HASHES).get("M") as HTMLElement).focus();
    const loadingTicket = beginFocusUpdate(table());
    table().innerHTML = LOADING_HTML;
    expect(finishFocusUpdate(loadingTicket)).toBe(true);
    expect(document.activeElement).toBe(table());
    const acceptedTicket = beginFocusUpdate(table());
    expect(acceptedTicket?.origin.keys).toEqual([rowKey("M")]);
    const rows = renderRows(HASHES);
    expect(finishFocusUpdate(acceptedTicket)).toBe(true);
    expect(document.activeElement).toBe(rows.get("M"));
  });

  // Case: TC-052
  it("drops the parked keys when the user leaves during loading", () => {
    registerContext();
    (renderRows(HASHES).get("M") as HTMLElement).focus();
    const loadingTicket = beginFocusUpdate(table());
    table().innerHTML = LOADING_HTML;
    expect(finishFocusUpdate(loadingTicket)).toBe(true);
    byId("refreshBtn").focus();
    const acceptedTicket = beginFocusUpdate(table());
    renderRows(HASHES);
    expect(finishFocusUpdate(acceptedTicket)).toBe(false);
    expect(document.activeElement).toBe(byId("refreshBtn"));
  });

  // Case: TC-053
  it("keeps generations independent per root", () => {
    registerContext();
    const panel = document.createElement("div");
    panel.id = "branchCleanupPanel";
    document.body.appendChild(panel);
    const cleanupKey: FocusKey = { kind: "cleanup", repo: REPO, branch: "feat", action: "show" };
    const renderPanel = (): HTMLButtonElement => {
      panel.innerHTML = "";
      const button = document.createElement("button");
      markFocusTarget(button, cleanupKey);
      panel.appendChild(button);
      return button;
    };
    focusedRef();
    const tableTicket = beginFocusUpdate(table());
    renderPanel().focus();
    const panelTicket = beginFocusUpdate(panel);
    expect(tableTicket?.generation).toBe(1);
    expect(panelTicket?.generation).toBe(1);
    const newButton = renderPanel();
    expect(finishFocusUpdate(panelTicket)).toBe(true);
    expect(document.activeElement).toBe(newButton);
  });

  // Case: TC-054
  it("returns null without a context", () => {
    focusedRef();
    const html = document.body.innerHTML;
    expect(beginFocusUpdate(table())).toBeNull();
    expect(document.body.innerHTML).toBe(html);
    expect(document.activeElement?.className).toBe("gitRef");
  });
});
