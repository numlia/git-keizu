/**
 * Row target decisions, keyboard input guards and semantic focus restoration shared by the
 * webview components. Importing this module has no DOM side effects: listeners are registered
 * by `installKeyboardGuards` / `configureFocusContext` and removed by the returned disposers.
 */

/* === Public types (plan §3.4) === */

export interface RowTarget {
  readonly repo: string;
  readonly hash: string;
  readonly index: number;
}

export type FocusKey =
  | { readonly kind: "row"; readonly repo: string; readonly hash: string }
  | {
      readonly kind: "ref";
      readonly repo: string;
      readonly hash: string;
      readonly refType: "head" | "remote" | "tag" | "stash" | "worktree";
      readonly name: string;
    }
  | {
      readonly kind: "file";
      readonly repo: string;
      readonly hash: string;
      readonly compareWithHash: string | null;
      readonly oldPath: string;
      readonly newPath: string;
      readonly action: "diff" | "open" | "history";
    }
  | {
      readonly kind: "folder";
      readonly repo: string;
      readonly hash: string;
      readonly compareWithHash: string | null;
      readonly path: string;
    }
  | {
      readonly kind: "cleanup";
      readonly repo: string;
      readonly branch: string;
      readonly action: "show" | "delete";
    }
  | { readonly kind: "control"; readonly id: string };

export type FocusCloseReason = "keyboard" | "action" | "outside" | "tab" | "replace" | "repository";

export interface FocusOrigin {
  readonly repo: string | null;
  readonly keys: readonly FocusKey[];
  readonly source: HTMLElement | null;
}

export interface FocusUpdate {
  readonly origin: FocusOrigin;
  readonly root: HTMLElement;
  readonly generation: number;
  readonly focusEpoch: number;
}

export interface FocusContext {
  getRepo(): string | null;
  getActiveRow(): HTMLElement | null;
  getTabStops(): readonly HTMLElement[];
}

/* === Constants === */

const REASON_KEYBOARD: FocusCloseReason = "keyboard";

const EVENT_KEYDOWN = "keydown";
const EVENT_KEYUP = "keyup";
const EVENT_COMPOSITION_START = "compositionstart";
const EVENT_COMPOSITION_END = "compositionend";
const EVENT_FOCUS_IN = "focusin";
const EVENT_POINTER_DOWN = "pointerdown";
const EVENT_WINDOW_BLUR = "blur";
const EVENT_WINDOW_FOCUS = "focus";
const CAPTURE: AddEventListenerOptions = { capture: true };

// Keys whose keydown runs an action; their repeat and composition-related presses are blocked.
const ACTION_KEYS: ReadonlySet<string> = new Set(["Enter", " ", "ContextMenu", "Escape", "F10"]);
// Physical codes of the same keys: during IME composition Chrome reports `key: "Process"`.
const ACTION_CODES: ReadonlySet<string> = new Set([
  "Enter",
  "NumpadEnter",
  "Space",
  "ContextMenu",
  "Escape",
  "F10"
]);

const FOCUS_TARGET_ATTRIBUTE = "data-focus-target";
const COMMIT_TABLE_ID = "commitTable";
const REPO_DROPDOWN_ID = "repoSelect";
const BRANCH_CLEANUP_BUTTON_ID = "branchCleanupBtn";
const ROW_SELECTOR = "tr[data-hash]";
const COUNTER_SELECTOR = ".refOverflowCounter";
const LOCAL_POPUP_SELECTOR = ".refOverflowPopup";
const FOCUSABLE_SELECTOR = "button, [tabindex]";
// Hidden originals, measuring clones and hidden subtrees are never focus candidates.
const INVISIBLE_ANCESTOR_SELECTOR =
  '.refOverflowHidden, .refOverflowMeasure, [hidden], [aria-hidden="true"]';
const DISPLAY_NONE = "none";
const VISIBILITY_HIDDEN = "hidden";

/* === Module state === */

interface GuardState {
  readonly composing: boolean;
  // Physical keys pressed during a composition whose keyup has not arrived yet.
  readonly pendingKeys: ReadonlySet<string>;
}

interface GuardInstall {
  readonly root: Document;
  readonly count: number;
}

interface FocusTracking {
  readonly epoch: number;
  readonly blurred: boolean;
  readonly internalDepth: number;
}

interface ContextRegistration {
  readonly context: FocusContext;
}

interface ParkedKeys {
  readonly root: HTMLElement;
  readonly repo: string | null;
  readonly keys: readonly FocusKey[];
  readonly epoch: number;
}

const INITIAL_GUARD_STATE: GuardState = { composing: false, pendingKeys: new Set() };
const INITIAL_TRACKING: FocusTracking = { epoch: 0, blurred: false, internalDepth: 0 };

let guardState: GuardState = INITIAL_GUARD_STATE;
let guardInstall: GuardInstall | null = null;
let tracking: FocusTracking = INITIAL_TRACKING;
let registrations: readonly ContextRegistration[] = [];
let disposeTracking: (() => void) | null = null;
let parked: ParkedKeys | null = null;

const focusKeys = new WeakMap<HTMLElement, FocusKey>();
const generations = new WeakMap<HTMLElement, number>();

/* === Pure target decision === */

/**
 * Pure: hash match first; a target lost in the same repo clamps the previous index to the new
 * list; a repo change or no previous target uses HEAD, else the first row; empty gives null.
 */
export function reconcileRowTarget(
  previous: RowTarget | null,
  repo: string,
  hashes: readonly string[],
  head: string | null
): RowTarget | null {
  if (hashes.length === 0) return null;
  if (previous !== null && previous.repo === repo) {
    const matched = hashes.indexOf(previous.hash);
    if (matched >= 0) return { repo, hash: hashes[matched], index: matched };
    const clamped = Math.min(Math.max(previous.index, 0), hashes.length - 1);
    return { repo, hash: hashes[clamped], index: clamped };
  }
  const headIndex = head === null ? -1 : hashes.indexOf(head);
  const index = headIndex >= 0 ? headIndex : 0;
  return { repo, hash: hashes[index], index };
}

/* === Input guards === */

function keyIdentity(event: KeyboardEvent): string {
  return event.code !== "" ? event.code : event.key;
}

function isActionKey(event: KeyboardEvent): boolean {
  return ACTION_KEYS.has(event.key) || ACTION_CODES.has(event.code);
}

// Only native buttons fire a default click from a key, so only they get preventDefault.
function isButtonTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLButtonElement;
}

function withPendingKey(state: GuardState, key: string, pending: boolean): GuardState {
  const pendingKeys = new Set(state.pendingKeys);
  if (pending) pendingKeys.add(key);
  else pendingKeys.delete(key);
  return { ...state, pendingKeys };
}

function handleCompositionStart(): void {
  guardState = { ...guardState, composing: true };
}

function handleCompositionEnd(): void {
  guardState = { ...guardState, composing: false };
}

function handleGuardKeydown(event: KeyboardEvent): void {
  const identity = keyIdentity(event);
  const belongsToComposition = event.isComposing || guardState.composing;
  if (belongsToComposition) {
    guardState = withPendingKey(guardState, identity, true);
  } else if (!event.repeat && guardState.pendingKeys.has(identity)) {
    // A fresh press means the matching keyup was lost (e.g. focus left the window).
    guardState = withPendingKey(guardState, identity, false);
  }
  if (
    (belongsToComposition || event.repeat) &&
    isActionKey(event) &&
    isButtonTarget(event.target)
  ) {
    event.preventDefault();
  }
}

function handleGuardKeyup(event: KeyboardEvent): void {
  const identity = keyIdentity(event);
  if (!guardState.pendingKeys.has(identity)) return;
  guardState = withPendingKey(guardState, identity, false);
  if (isActionKey(event) && isButtonTarget(event.target)) event.preventDefault();
}

/**
 * Tracks composition and key state on `root` in the capture phase. Installing twice shares one
 * listener set; the listeners are removed when every disposer has run. Native `<button>`
 * targets get `preventDefault` for repeat / composition presses of action keys (keydown and the
 * matching keyup), so their default click does not fire. Callers owning other button-like
 * elements call `event.preventDefault()` themselves when `isKeyboardActionBlocked` is true.
 */
export function installKeyboardGuards(root: Document): () => void {
  if (guardInstall === null) {
    root.addEventListener(EVENT_COMPOSITION_START, handleCompositionStart, CAPTURE);
    root.addEventListener(EVENT_COMPOSITION_END, handleCompositionEnd, CAPTURE);
    root.addEventListener(EVENT_KEYDOWN, handleGuardKeydown, CAPTURE);
    root.addEventListener(EVENT_KEYUP, handleGuardKeyup, CAPTURE);
    guardInstall = { root, count: 1 };
  } else {
    guardInstall = { ...guardInstall, count: guardInstall.count + 1 };
  }
  let disposed = false;
  return () => {
    if (disposed || guardInstall === null) return;
    disposed = true;
    if (guardInstall.count > 1) {
      guardInstall = { ...guardInstall, count: guardInstall.count - 1 };
      return;
    }
    const installed = guardInstall.root;
    installed.removeEventListener(EVENT_COMPOSITION_START, handleCompositionStart, CAPTURE);
    installed.removeEventListener(EVENT_COMPOSITION_END, handleCompositionEnd, CAPTURE);
    installed.removeEventListener(EVENT_KEYDOWN, handleGuardKeydown, CAPTURE);
    installed.removeEventListener(EVENT_KEYUP, handleGuardKeyup, CAPTURE);
    guardInstall = null;
    guardState = INITIAL_GUARD_STATE;
  };
}

/**
 * True when the event must not run an action: during composition, for any keyup (actions run
 * on keydown only), for repeat of an action key, and for a key still bound to a composition.
 * Without installed guards only the event's own fields are consulted.
 */
export function isKeyboardActionBlocked(event: KeyboardEvent): boolean {
  if (event.isComposing || event.type === EVENT_KEYUP) return true;
  if (event.repeat && isActionKey(event)) return true;
  return guardState.composing || guardState.pendingKeys.has(keyIdentity(event));
}

/* === Focus context and user-move tracking === */

function noteUserMove(blurred: boolean): void {
  tracking = { ...tracking, epoch: tracking.epoch + 1, blurred };
}

function handleFocusIn(): void {
  if (tracking.internalDepth === 0) noteUserMove(false);
}

function handlePointerDown(): void {
  noteUserMove(false);
}

function handleWindowBlur(): void {
  noteUserMove(true);
}

function handleWindowFocus(): void {
  tracking = { ...tracking, blurred: false };
}

function installFocusTracking(): () => void {
  document.addEventListener(EVENT_FOCUS_IN, handleFocusIn, CAPTURE);
  document.addEventListener(EVENT_POINTER_DOWN, handlePointerDown, CAPTURE);
  window.addEventListener(EVENT_WINDOW_BLUR, handleWindowBlur);
  window.addEventListener(EVENT_WINDOW_FOCUS, handleWindowFocus);
  return () => {
    document.removeEventListener(EVENT_FOCUS_IN, handleFocusIn, CAPTURE);
    document.removeEventListener(EVENT_POINTER_DOWN, handlePointerDown, CAPTURE);
    window.removeEventListener(EVENT_WINDOW_BLUR, handleWindowBlur);
    window.removeEventListener(EVENT_WINDOW_FOCUS, handleWindowFocus);
  };
}

/**
 * Registers the context the restore chain reads. The latest registration wins; disposing an
 * older one keeps the newer. User focus moves are tracked while any context is registered.
 */
export function configureFocusContext(context: FocusContext): () => void {
  if (registrations.length === 0) disposeTracking = installFocusTracking();
  const registration: ContextRegistration = { context };
  registrations = [...registrations, registration];
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    registrations = registrations.filter((entry) => entry !== registration);
    if (registrations.length > 0) return;
    disposeTracking?.();
    disposeTracking = null;
    parked = null;
    tracking = INITIAL_TRACKING;
  };
}

function activeContext(): FocusContext | null {
  return registrations.length === 0 ? null : registrations[registrations.length - 1].context;
}

/* === Focus keys === */

/** Stores a typed key on the element; call it again for every regenerated element. */
export function markFocusTarget(element: HTMLElement, key: FocusKey): void {
  focusKeys.set(element, key);
  element.setAttribute(FOCUS_TARGET_ATTRIBUTE, "");
}

function focusKeysEqual(a: FocusKey, b: FocusKey): boolean {
  const left: Record<string, unknown> = a;
  const right: Record<string, unknown> = b;
  const names = Object.keys(left);
  return names.length === Object.keys(right).length && names.every((n) => left[n] === right[n]);
}

function addKey(keys: readonly FocusKey[], key: FocusKey): readonly FocusKey[] {
  return keys.some((existing) => focusKeysEqual(existing, key)) ? keys : [...keys, key];
}

function impliedRowKey(key: FocusKey): FocusKey | null {
  return key.kind === "ref" || key.kind === "file" || key.kind === "folder"
    ? { kind: "row", repo: key.repo, hash: key.hash }
    : null;
}

function repoOfKey(key: FocusKey): string | null {
  return key.kind === "control" ? null : key.repo;
}

/**
 * Captures the element's key and its ancestors' keys as the ordered candidate list, followed by
 * the owning row implied by ref / file / folder keys. Null without a context or element.
 */
export function captureFocusOrigin(element: HTMLElement | null): FocusOrigin | null {
  const context = activeContext();
  if (element === null || context === null) return null;
  let keys: readonly FocusKey[] = [];
  for (let node: HTMLElement | null = element; node !== null; node = node.parentElement) {
    const key = focusKeys.get(node);
    if (key !== undefined) keys = addKey(keys, key);
  }
  const implied = keys.map(impliedRowKey).filter((key): key is FocusKey => key !== null);
  const allKeys = implied.reduce(addKey, keys);
  const repo = allKeys.map(repoOfKey).find((value) => value !== null) ?? context.getRepo();
  return { repo, keys: allKeys, source: element };
}

/* === Element resolution === */

function isEligible(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement) || !element.isConnected) return false;
  if (element.matches(":disabled") || element.closest(INVISIBLE_ANCESTOR_SELECTOR) !== null) {
    return false;
  }
  if (getComputedStyle(element).visibility === VISIBILITY_HIDDEN) return false;
  for (let node: HTMLElement | null = element; node !== null; node = node.parentElement) {
    if (getComputedStyle(node).display === DISPLAY_NONE) return false;
  }
  return true;
}

function focusElement(element: HTMLElement, preventScroll: boolean): boolean {
  tracking = { ...tracking, internalDepth: tracking.internalDepth + 1 };
  try {
    element.focus({ preventScroll });
  } finally {
    tracking = { ...tracking, internalDepth: tracking.internalDepth - 1 };
  }
  return element.ownerDocument.activeElement === element;
}

function tryFocus(
  candidates: readonly (Element | null)[],
  preventScroll: boolean
): HTMLElement | null {
  for (const candidate of candidates) {
    if (isEligible(candidate) && focusElement(candidate, preventScroll)) return candidate;
  }
  return null;
}

function elementsForKey(key: FocusKey): HTMLElement[] {
  const marked = Array.from(document.querySelectorAll<HTMLElement>(`[${FOCUS_TARGET_ATTRIBUTE}]`));
  const matches = marked.filter((element) => {
    const stored = focusKeys.get(element);
    return stored !== undefined && focusKeysEqual(stored, key);
  });
  // A visible local popup clone wins over the (hidden) original label with the same key.
  const inPopup = matches.filter((element) => element.closest(LOCAL_POPUP_SELECTOR) !== null);
  return [...inPopup, ...matches.filter((element) => !inPopup.includes(element))];
}

function rowElements(context: FocusContext, repo: string, hash: string): HTMLElement[] {
  const marked = elementsForKey({ kind: "row", repo, hash });
  const table = document.getElementById(COMMIT_TABLE_ID);
  if (table === null || context.getRepo() !== repo) return marked;
  const byDataset = Array.from(table.querySelectorAll<HTMLElement>(ROW_SELECTOR)).filter(
    (row) => row.dataset.hash === hash && !marked.includes(row)
  );
  return [...marked, ...byDataset];
}

function counterElements(context: FocusContext, repo: string, hash: string): HTMLElement[] {
  const inRows = rowElements(context, repo, hash).flatMap((row) =>
    Array.from(row.querySelectorAll<HTMLElement>(COUNTER_SELECTOR))
  );
  if (context.getRepo() !== repo) return inRows;
  const byDataset = Array.from(document.querySelectorAll<HTMLElement>(COUNTER_SELECTOR)).filter(
    (counter) => counter.dataset.hash === hash && !inRows.includes(counter)
  );
  return [...inRows, ...byDataset];
}

function elementById(id: string): HTMLElement[] {
  const element = document.getElementById(id);
  return element instanceof HTMLElement ? [element] : [];
}

// Candidates for one key in preference order (exact match first, then the key's own fallbacks).
function candidatesForKey(context: FocusContext, key: FocusKey): HTMLElement[] {
  switch (key.kind) {
    case "row":
      return rowElements(context, key.repo, key.hash);
    case "ref":
      return [...elementsForKey(key), ...counterElements(context, key.repo, key.hash)];
    case "control":
      return [...elementsForKey(key), ...elementById(key.id)];
    case "cleanup":
      return [...elementsForKey(key), ...elementById(BRANCH_CLEANUP_BUTTON_ID)];
    default:
      return elementsForKey(key);
  }
}

function keyCandidates(context: FocusContext, origin: FocusOrigin): HTMLElement[] {
  return origin.keys.flatMap((key) => candidatesForKey(context, key));
}

// Active row → named `#commitTable` container → repo button when the list does not exist yet.
function contextFallbacks(context: FocusContext): (Element | null)[] {
  const repoDropdown = document.getElementById(REPO_DROPDOWN_ID);
  return [
    context.getActiveRow(),
    document.getElementById(COMMIT_TABLE_ID),
    repoDropdown === null ? null : repoDropdown.querySelector(FOCUSABLE_SELECTOR)
  ];
}

/* === Restore, tickets and tab stops === */

/**
 * Restores the origin for a `"keyboard"` close: first eligible element for a candidate key, then
 * the context chain. Other reasons never steal focus and return false (`"replace"` uses tickets).
 * True only when the chosen connected element is the real `activeElement`.
 */
export function restoreFocus(origin: FocusOrigin | null, reason: FocusCloseReason): boolean {
  const context = activeContext();
  if (origin === null || context === null || reason !== REASON_KEYBOARD) return false;
  return (
    tryFocus(keyCandidates(context, origin), false) !== null ||
    tryFocus(contextFallbacks(context), false) !== null
  );
}

function ownsPopupOrigin(root: HTMLElement, origin: FocusOrigin, context: FocusContext): boolean {
  const repo = context.getRepo();
  return origin.keys.some(
    (key) =>
      key.kind === "row" &&
      key.repo === repo &&
      rowElements(context, repo, key.hash).some((row) => root.contains(row))
  );
}

// Keys parked while the root showed the loading placeholder survive into the next ticket.
function withParkedKeys(
  root: HTMLElement,
  origin: FocusOrigin,
  context: FocusContext
): FocusOrigin {
  if (
    parked === null ||
    parked.root !== root ||
    parked.epoch !== tracking.epoch ||
    parked.repo !== context.getRepo()
  ) {
    return origin;
  }
  return { ...origin, keys: parked.keys.reduce(addKey, origin.keys) };
}

/**
 * Call right before replacing `root`'s DOM. Returns a ticket only when the real focus is inside
 * `root`, or inside a popup owned by one of its rows (same repo and hash). Bumps the root's
 * generation so older tickets for the same root expire.
 */
export function beginFocusUpdate(root: HTMLElement): FocusUpdate | null {
  const context = activeContext();
  if (context === null) return null;
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || active === document.body) return null;
  const captured = captureFocusOrigin(active);
  if (captured === null) return null;
  if (!root.contains(active) && !ownsPopupOrigin(root, captured, context)) return null;
  const generation = (generations.get(root) ?? 0) + 1;
  generations.set(root, generation);
  return {
    origin: withParkedKeys(root, captured, context),
    root,
    generation,
    focusEpoch: tracking.epoch
  };
}

/**
 * Restores a ticket after the replacement when it is still the latest for its root, the repo and
 * user-move epoch are unchanged, the webview is not blurred, and focus fell to `body` or stayed
 * inside the replaced root. Focus resting elsewhere (toolbar, a connected menu) is left alone.
 * Restores use `focus({ preventScroll: true })`; a container fallback parks the keys.
 */
export function finishFocusUpdate(update: FocusUpdate | null): boolean {
  const context = activeContext();
  if (update === null || context === null) return false;
  if (update.generation !== (generations.get(update.root) ?? 0)) return false;
  if (update.focusEpoch !== tracking.epoch || tracking.blurred) return false;
  if (context.getRepo() !== update.origin.repo) return false;
  const active = document.activeElement;
  if (active !== null && active !== document.body && !update.root.contains(active)) return false;
  const keyed = tryFocus(keyCandidates(context, update.origin), true);
  if (keyed !== null) {
    if (parked !== null && parked.root === update.root) parked = null;
    return true;
  }
  const fallback = tryFocus(contextFallbacks(context), true);
  if (fallback === null) return false;
  if (fallback !== context.getActiveRow()) {
    parked = {
      root: update.root,
      repo: update.origin.repo,
      keys: update.origin.keys,
      epoch: tracking.epoch
    };
  }
  return true;
}

/**
 * Moves to the tab stop after / before the origin (a popup clone resolves to its counter).
 * False at either end so the caller lets native Tab leave the webview; no wrap-around.
 */
export function moveFocusPast(origin: FocusOrigin | null, direction: -1 | 1): boolean {
  const context = activeContext();
  if (origin === null || context === null) return false;
  const stops = context.getTabStops();
  const anchor = [origin.source, ...keyCandidates(context, origin)].find(
    (candidate): candidate is HTMLElement => candidate !== null && stops.includes(candidate)
  );
  if (anchor === undefined) return false;
  const next = stops[stops.indexOf(anchor) + direction];
  if (next === undefined || !isEligible(next)) return false;
  next.focus();
  return document.activeElement === next;
}
