import { t } from "./i18n";
import {
  captureFocusOrigin,
  type FocusCloseReason,
  type FocusOrigin,
  isKeyboardActionBlocked,
  moveFocusPast,
  restoreFocus
} from "./keyboardNavigation";
import { escapeHtml, sendMessage, svgIcons, vscode } from "./utils";

const contextMenu = document.getElementById("contextMenu")!;
let contextMenuSource: HTMLElement | null = null;
const POSITION_OFFSET = 2;
const SUBMENU_HIDE_DELAY_MS = 150;
const MAX_RECENT_ACTIONS = 5;
let activeSubmenuIndex: number | null = null;
const submenuHideTimers = new Map<number, number>();

const KEY_ENTER = "Enter";
const KEY_SPACE = " ";
const KEY_ESCAPE = "Escape";
const KEY_TAB = "Tab";
const KEY_ARROW_UP = "ArrowUp";
const KEY_ARROW_DOWN = "ArrowDown";
const KEY_ARROW_LEFT = "ArrowLeft";
const KEY_ARROW_RIGHT = "ArrowRight";
const KEY_HOME = "Home";
const KEY_END = "End";

const EVENT_KEYDOWN = "keydown";
const EVENT_KEYUP = "keyup";
const EVENT_POINTERDOWN = "pointerdown";
const EVENT_MOUSEDOWN = "mousedown";
const EVENT_CONTEXTMENU = "contextmenu";
const EVENT_MOUSELEAVE = "mouseleave";
const CAPTURE: AddEventListenerOptions = { capture: true };

const ATTR_ROLE = "role";
const ATTR_ARIA_EXPANDED = "aria-expanded";
const ATTR_ARIA_HIDDEN = "aria-hidden";
const ATTR_ARIA_LABEL = "aria-label";
const ATTR_TRUE = "true";
const ATTR_FALSE = "false";
const ROLE_MENU = "menu";
const ROLE_MENUITEM = "menuitem";
const MENU_ITEM_ATTRIBUTES = `role="${ROLE_MENUITEM}" tabindex="-1"`;

const SUBMENU_ID_PREFIX = "contextSubmenu_";
const MENU_ITEM_SELECTOR = "li.contextMenuItem";
const SUBMENU_SELECTOR = "ul.contextMenuSubmenu";
const LABEL_DECORATION_SELECTOR = "li.contextMenuLabel > :not(.contextMenuLabelText)";

const REASON_KEYBOARD: FocusCloseReason = "keyboard";
const REASON_ACTION: FocusCloseReason = "action";
const REASON_OUTSIDE: FocusCloseReason = "outside";
const REASON_TAB: FocusCloseReason = "tab";

// Everything an open menu acts on is captured at open time, so later DOM replacement or a stale
// `li` click can never run an item against a different target.
interface MenuSession {
  readonly items: ContextMenuElement[];
  readonly source: HTMLElement;
  readonly origin: FocusOrigin | null;
  readonly tabSource: HTMLElement;
  readonly tabOrigin: FocusOrigin | null;
  readonly focusOptions: ContextMenuFocusOptions | null;
}
let activeSession: MenuSession | null = null;

// The browser may follow the ContextMenu / Shift+F10 keydown that opened a menu with its own
// `contextmenu` event; only that one event is swallowed. Some platforms dispatch it on the
// launching key's keyup, aimed at the element focused by then (the first menu item), so that
// keyup is cancelled and a contextmenu inside the menu counts as the same press. Only a new key
// press or pointer press counts as an independent input.
interface KeyboardLaunch {
  readonly target: HTMLElement;
  readonly key: string;
  readonly dispose: () => void;
}
let pendingKeyboardLaunch: KeyboardLaunch | null = null;
const KEYBOARD_LAUNCH_INDEPENDENT_EVENTS = [EVENT_KEYDOWN, EVENT_POINTERDOWN, EVENT_MOUSEDOWN];

const titleProbe = document.createElement("span");

function isContextMenuSubmenu(item: ContextMenuElement): item is ContextMenuSubmenu {
  return item !== null && "submenu" in item;
}

function isContextMenuLabel(item: ContextMenuElement): item is ContextMenuLabel {
  return item !== null && "kind" in item && item.kind === "label";
}

function isContextMenuItem(item: ContextMenuElement): item is ContextMenuItem {
  return item !== null && "onClick" in item;
}

function isActionable(item: ContextMenuElement): boolean {
  return isContextMenuItem(item) || isContextMenuSubmenu(item);
}

// Titles are rendered as HTML, so the accessible name is their text content.
function titleLabelAttribute(title: string): string {
  titleProbe.innerHTML = title;
  return `${ATTR_ARIA_LABEL}="${escapeHtml(titleProbe.textContent ?? "")}"`;
}

function buildContextMenuLabelHtml(item: ContextMenuLabel): string {
  return `<li class="contextMenuLabel">${item.icon ?? ""}<span class="contextMenuLabelText">${item.title}</span></li>`;
}

function hideLabelDecorations(list: HTMLElement): void {
  list.querySelectorAll(LABEL_DECORATION_SELECTOR).forEach((decoration) => {
    decoration.setAttribute(ATTR_ARIA_HIDDEN, ATTR_TRUE);
  });
}

function submenuElementId(index: number): string {
  return `${SUBMENU_ID_PREFIX}${index}`;
}

function getSubmenuElement(index: number): HTMLUListElement | null {
  return document.getElementById(submenuElementId(index)) as HTMLUListElement | null;
}

function getSubmenuParentElement(index: number): HTMLElement | null {
  return contextMenu.querySelector<HTMLElement>(
    `li.contextMenuParent[data-submenu-index="${index}"]`
  );
}

function parseMenuIndex(value: string | undefined): number {
  return Number.parseInt(value ?? "", 10);
}

function menuHasFocus(): boolean {
  const active = document.activeElement;
  return (
    active instanceof Element &&
    (contextMenu.contains(active) || active.closest(SUBMENU_SELECTOR) !== null)
  );
}

function clearSubmenuHideTimer(index: number): void {
  const timer = submenuHideTimers.get(index);
  if (timer === undefined) {
    return;
  }

  window.clearTimeout(timer);
  submenuHideTimers.delete(index);
}

function clearAllSubmenuHideTimers(): void {
  submenuHideTimers.forEach((timer) => {
    window.clearTimeout(timer);
  });
  submenuHideTimers.clear();
}

function setSubmenuExpanded(index: number, expanded: boolean): void {
  getSubmenuParentElement(index)?.setAttribute(
    ATTR_ARIA_EXPANDED,
    expanded ? ATTR_TRUE : ATTR_FALSE
  );
}

function hideOtherSubmenus(activeIndex: number): void {
  document.querySelectorAll<HTMLUListElement>(SUBMENU_SELECTOR).forEach((submenuEl) => {
    const submenuIndex = parseMenuIndex(submenuEl.dataset.submenuIndex);
    if (submenuIndex === activeIndex) {
      return;
    }

    submenuEl.classList.remove("active");
    if (!Number.isNaN(submenuIndex)) {
      clearSubmenuHideTimer(submenuIndex);
      setSubmenuExpanded(submenuIndex, false);
    }
  });
}

function hideSubmenu(index: number): void {
  clearSubmenuHideTimer(index);
  const submenuEl = getSubmenuElement(index);
  if (submenuEl !== null) {
    submenuEl.classList.remove("active");
  }
  setSubmenuExpanded(index, false);
  if (activeSubmenuIndex === index) {
    activeSubmenuIndex = null;
  }
}

function scheduleHideSubmenu(index: number): void {
  clearSubmenuHideTimer(index);
  const timer = window.setTimeout(() => {
    // A pointer leaving must not take a submenu away from a keyboard user.
    if (menuHasFocus()) return;
    hideSubmenu(index);
  }, SUBMENU_HIDE_DELAY_MS);
  submenuHideTimers.set(index, timer);
}

function showSubmenu(parentLi: HTMLElement, index: number): void {
  clearSubmenuHideTimer(index);
  hideOtherSubmenus(index);

  const submenuEl = getSubmenuElement(index);
  if (submenuEl === null) {
    return;
  }

  submenuEl.classList.add("active");
  submenuEl.style.visibility = "hidden";

  const parentBounds = parentLi.getBoundingClientRect();
  const submenuBounds = submenuEl.getBoundingClientRect();
  const left =
    parentBounds.right + submenuBounds.width <= window.innerWidth
      ? parentBounds.right
      : Math.max(0, parentBounds.left - submenuBounds.width);
  const maxTop = Math.max(0, window.innerHeight - submenuBounds.height);
  const top = Math.max(0, Math.min(parentBounds.top, maxTop));

  submenuEl.style.left = `${left}px`;
  submenuEl.style.top = `${top}px`;
  submenuEl.style.visibility = "";
  parentLi.setAttribute(ATTR_ARIA_EXPANDED, ATTR_TRUE);
  activeSubmenuIndex = index;
}

function buildSubmenuHtml(items: ContextMenuElement[], parentIndex: number): string {
  let html = "";

  for (let childIndex = 0; childIndex < items.length; childIndex++) {
    const child = items[childIndex];
    if (child === null) {
      html += '<li class="contextMenuDivider"></li>';
      continue;
    }

    if (isContextMenuLabel(child)) {
      html += buildContextMenuLabelHtml(child);
      continue;
    }

    if (isContextMenuItem(child)) {
      html += `<li class="contextMenuItem" ${MENU_ITEM_ATTRIBUTES} ${titleLabelAttribute(child.title)} data-submenu-parent="${parentIndex}" data-submenu-child="${childIndex}">${child.title}</li>`;
    }
  }

  return html;
}

function normalizeRecentActions(recentActions: GG.RecentActionId[]): GG.RecentActionId[] {
  const seen = new Set<GG.RecentActionId>();
  const normalizedRecentActions: GG.RecentActionId[] = [];

  for (const actionId of recentActions) {
    if (seen.has(actionId)) {
      continue;
    }
    seen.add(actionId);
    normalizedRecentActions.push(actionId);
    if (normalizedRecentActions.length === MAX_RECENT_ACTIONS) {
      break;
    }
  }

  return normalizedRecentActions;
}

function collectRecentActionItems(
  items: ContextMenuElement[],
  recentActionItems = new Map<GG.RecentActionId, ContextMenuItem>()
): Map<GG.RecentActionId, ContextMenuItem> {
  for (const item of items) {
    if (item === null) {
      continue;
    }

    if (isContextMenuSubmenu(item)) {
      collectRecentActionItems(item.submenu, recentActionItems);
      continue;
    }

    if (isContextMenuLabel(item)) {
      continue;
    }

    if (item.recentActionId !== undefined && !recentActionItems.has(item.recentActionId)) {
      recentActionItems.set(item.recentActionId, item);
    }
  }

  return recentActionItems;
}

function buildItemsWithRecentActions(
  items: ContextMenuElement[],
  recentActions: GG.RecentActionId[] | undefined
): ContextMenuElement[] {
  if (
    typeof viewState === "undefined" ||
    viewState.showRecentActions !== true ||
    recentActions === undefined ||
    recentActions.length === 0
  ) {
    return items;
  }

  const recentActionItems = collectRecentActionItems(items);
  if (recentActionItems.size < 2) {
    return items;
  }

  const recentItems = normalizeRecentActions(recentActions)
    .map((actionId) => recentActionItems.get(actionId))
    .filter((item): item is ContextMenuItem => item !== undefined);

  if (recentItems.length === 0) {
    return items;
  }

  return [
    { kind: "label", title: t("context.recent"), icon: svgIcons.history },
    ...recentItems,
    null,
    ...items
  ];
}

// Resolves the rendered `li` back to the element captured in the session.
function resolveItem(session: MenuSession, menuItemEl: HTMLElement): ContextMenuElement {
  const { index, submenuParent, submenuChild } = menuItemEl.dataset;
  if (index !== undefined) {
    return session.items[parseMenuIndex(index)] ?? null;
  }
  if (submenuParent !== undefined && submenuChild !== undefined) {
    const parentItem = session.items[parseMenuIndex(submenuParent)];
    return isContextMenuSubmenu(parentItem)
      ? (parentItem.submenu[parseMenuIndex(submenuChild)] ?? null)
      : null;
  }
  return null;
}

// hide → onClick keeps the existing order; a menu closed for any reason runs nothing afterwards.
// Hiding removes the focused `li`, so an action that hands focus to no other UI (dialog, editor)
// returns it to the origin (R4.7); one that did is left alone.
function activateItem(session: MenuSession, item: ContextMenuElement): void {
  if (activeSession !== session || !isContextMenuItem(item)) return;
  hideContextMenu(REASON_ACTION);
  item.onClick();
  const active = document.activeElement;
  if (active === null || active === document.body) focusOrigin(session.origin, session.source);
}

function addSubmenuElements(session: MenuSession): void {
  session.items.forEach((item, index) => {
    if (!isContextMenuSubmenu(item)) {
      return;
    }

    const submenuEl = document.createElement("ul");
    submenuEl.className = "contextMenuSubmenu";
    submenuEl.id = submenuElementId(index);
    submenuEl.dataset.submenuIndex = index.toString();
    submenuEl.setAttribute(ATTR_ROLE, ROLE_MENU);
    titleProbe.innerHTML = item.title;
    submenuEl.setAttribute(ATTR_ARIA_LABEL, titleProbe.textContent ?? "");
    submenuEl.innerHTML = buildSubmenuHtml(item.submenu, index);
    hideLabelDecorations(submenuEl);

    submenuEl.addEventListener("mouseenter", () => {
      clearSubmenuHideTimer(index);
    });
    submenuEl.addEventListener("mouseleave", () => {
      scheduleHideSubmenu(index);
    });
    submenuEl.addEventListener(EVENT_KEYDOWN, handleMenuKeydown);

    submenuEl
      .querySelectorAll<HTMLLIElement>("li.contextMenuItem[data-submenu-parent]")
      .forEach((submenuItemEl) => {
        submenuItemEl.addEventListener("click", (e) => {
          e.stopPropagation();
          activateItem(session, resolveItem(session, submenuItemEl));
        });
      });

    document.body.appendChild(submenuEl);
  });
}

/* === Keyboard launch and in-menu keys === */

function clearKeyboardLaunch(): void {
  const launch = pendingKeyboardLaunch;
  if (launch === null) return;
  pendingKeyboardLaunch = null;
  launch.dispose();
}

function isInsideMenu(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return contextMenu.contains(target) || target.closest(SUBMENU_SELECTOR) !== null;
}

function suppressFollowingContextMenu(event: Event): void {
  const launch = pendingKeyboardLaunch;
  clearKeyboardLaunch();
  if (launch === null) return;
  const target = event.target;
  if ((target instanceof Node && launch.target.contains(target)) || isInsideMenu(target)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

// Cancelling the launching key's keyup keeps the browser from synthesising its contextmenu.
function suppressLaunchKeyup(event: KeyboardEvent): void {
  if (pendingKeyboardLaunch === null || event.key !== pendingKeyboardLaunch.key) return;
  event.preventDefault();
  document.removeEventListener(EVENT_KEYUP, suppressLaunchKeyup, CAPTURE);
}

function trackKeyboardLaunch(target: HTMLElement, key: string): void {
  clearKeyboardLaunch();
  document.addEventListener(EVENT_CONTEXTMENU, suppressFollowingContextMenu, CAPTURE);
  document.addEventListener(EVENT_KEYUP, suppressLaunchKeyup, CAPTURE);
  KEYBOARD_LAUNCH_INDEPENDENT_EVENTS.forEach((type) => {
    document.addEventListener(type, clearKeyboardLaunch, CAPTURE);
  });
  pendingKeyboardLaunch = {
    target,
    key,
    dispose: () => {
      document.removeEventListener(EVENT_CONTEXTMENU, suppressFollowingContextMenu, CAPTURE);
      document.removeEventListener(EVENT_KEYUP, suppressLaunchKeyup, CAPTURE);
      KEYBOARD_LAUNCH_INDEPENDENT_EVENTS.forEach((type) => {
        document.removeEventListener(type, clearKeyboardLaunch, CAPTURE);
      });
    }
  };
}

function anchorPoint(event: ContextMenuTrigger, sourceElem: HTMLElement): Point {
  if (event instanceof KeyboardEvent) {
    const bounds = sourceElem.getBoundingClientRect();
    return { x: bounds.left, y: bounds.bottom };
  }
  return { x: event.clientX, y: event.clientY };
}

function consumeKey(event: KeyboardEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

function menuItemsOf(list: HTMLElement): HTMLElement[] {
  return Array.from(list.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR));
}

function focusMenuItem(item: HTMLElement | undefined): void {
  item?.focus();
}

function openSubmenuFromKeyboard(parentLi: HTMLElement): void {
  const index = parseMenuIndex(parentLi.dataset.submenuIndex);
  if (Number.isNaN(index)) return;
  showSubmenu(parentLi, index);
  const submenuEl = getSubmenuElement(index);
  if (submenuEl !== null) focusMenuItem(menuItemsOf(submenuEl)[0]);
}

function closeSubmenuToParent(submenuEl: HTMLElement): void {
  const index = parseMenuIndex(submenuEl.dataset.submenuIndex);
  if (Number.isNaN(index)) return;
  hideSubmenu(index);
  getSubmenuParentElement(index)?.focus();
}

// Resolves the semantic key first so a regenerated element with the same key wins; an unmarked
// origin is focused directly while it is still connected.
function focusOrigin(origin: FocusOrigin | null, element: HTMLElement): void {
  if ((origin === null || origin.keys.length === 0) && element.isConnected) {
    element.focus();
    if (document.activeElement === element) return;
  }
  restoreFocus(origin, REASON_KEYBOARD);
}

function exitByTab(event: KeyboardEvent, session: MenuSession): void {
  const direction: -1 | 1 = event.shiftKey ? -1 : 1;
  session.focusOptions?.onTabExit();
  hideContextMenu(REASON_TAB);
  if (moveFocusPast(session.tabOrigin, direction)) {
    consumeKey(event);
    return;
  }
  // At either end the origin takes focus back and the native Tab leaves the webview from there.
  focusOrigin(session.tabOrigin, session.tabSource);
}

function handleMenuKeydown(event: KeyboardEvent): void {
  const session = activeSession;
  const list = event.currentTarget;
  const item =
    event.target instanceof Element ? event.target.closest<HTMLElement>(MENU_ITEM_SELECTOR) : null;
  if (session === null || !(list instanceof HTMLElement) || item === null) return;
  if (isKeyboardActionBlocked(event)) return;
  const inSubmenu = list !== contextMenu;
  const items = menuItemsOf(list);

  switch (event.key) {
    case KEY_ARROW_DOWN:
    case KEY_ARROW_UP: {
      consumeKey(event);
      if (!inSubmenu && activeSubmenuIndex !== null) hideSubmenu(activeSubmenuIndex);
      focusMenuItem(items[items.indexOf(item) + (event.key === KEY_ARROW_DOWN ? 1 : -1)]);
      break;
    }
    case KEY_HOME:
    case KEY_END: {
      consumeKey(event);
      if (!inSubmenu && activeSubmenuIndex !== null) hideSubmenu(activeSubmenuIndex);
      focusMenuItem(event.key === KEY_HOME ? items[0] : items[items.length - 1]);
      break;
    }
    case KEY_ARROW_RIGHT: {
      consumeKey(event);
      if (!inSubmenu && item.classList.contains("contextMenuParent")) openSubmenuFromKeyboard(item);
      break;
    }
    case KEY_ARROW_LEFT: {
      consumeKey(event);
      if (inSubmenu) closeSubmenuToParent(list);
      break;
    }
    case KEY_ESCAPE: {
      consumeKey(event);
      if (inSubmenu) {
        closeSubmenuToParent(list);
      } else {
        hideContextMenu(REASON_KEYBOARD);
      }
      break;
    }
    case KEY_ENTER:
    case KEY_SPACE: {
      consumeKey(event);
      if (item.classList.contains("contextMenuParent")) {
        openSubmenuFromKeyboard(item);
      } else {
        activateItem(session, resolveItem(session, item));
      }
      break;
    }
    case KEY_TAB: {
      exitByTab(event, session);
      break;
    }
    default:
      break;
  }
}

export function showContextMenu(
  event: ContextMenuTrigger,
  items: ContextMenuElement[],
  sourceElem: HTMLElement,
  recentActions?: GG.RecentActionId[],
  focusOptions?: ContextMenuFocusOptions
): void {
  hideContextMenuListener();
  const itemsToRender = buildItemsWithRecentActions(items, recentActions);
  const fromKeyboard = event instanceof KeyboardEvent;
  // Labels and dividers alone give the keyboard nothing to focus, so the origin keeps focus.
  if (fromKeyboard && !itemsToRender.some(isActionable)) return;

  const tabSource = focusOptions?.tabOrigin ?? sourceElem;
  const session: MenuSession = {
    items: itemsToRender,
    source: sourceElem,
    origin: captureFocusOrigin(sourceElem),
    tabSource,
    tabOrigin: captureFocusOrigin(tabSource),
    focusOptions: focusOptions ?? null
  };
  let html = "";

  for (let index = 0; index < itemsToRender.length; index++) {
    const item = itemsToRender[index];
    if (item === null) {
      html += '<li class="contextMenuDivider"></li>';
      continue;
    }

    if (isContextMenuLabel(item)) {
      html += buildContextMenuLabelHtml(item);
      continue;
    }

    if (isContextMenuSubmenu(item)) {
      const submenuId = submenuElementId(index);
      html += `<li class="contextMenuItem contextMenuParent" ${MENU_ITEM_ATTRIBUTES} ${titleLabelAttribute(item.title)} aria-haspopup="${ROLE_MENU}" aria-expanded="${ATTR_FALSE}" aria-controls="${submenuId}" aria-owns="${submenuId}" data-submenu-index="${index}">${item.title}<span class="contextMenuArrow">▸</span></li>`;
      continue;
    }

    html += `<li class="contextMenuItem" ${MENU_ITEM_ATTRIBUTES} ${titleLabelAttribute(item.title)} data-index="${index}">${item.title}</li>`;
  }

  contextMenu.setAttribute(ATTR_ROLE, ROLE_MENU);
  contextMenu.style.opacity = "0";
  contextMenu.className = "active";
  contextMenu.innerHTML = html;
  hideLabelDecorations(contextMenu);
  addSubmenuElements(session);

  const anchor = anchorPoint(event, sourceElem);
  const bounds = contextMenu.getBoundingClientRect();
  contextMenu.style.left = `${Math.max(
    0,
    anchor.x + bounds.width < window.innerWidth
      ? anchor.x - POSITION_OFFSET
      : anchor.x - bounds.width + POSITION_OFFSET
  )}px`;
  contextMenu.style.top = `${Math.max(
    0,
    anchor.y + bounds.height < window.innerHeight
      ? anchor.y - POSITION_OFFSET
      : anchor.y - bounds.height + POSITION_OFFSET
  )}px`;
  contextMenu.style.opacity = "1";

  contextMenu
    .querySelectorAll<HTMLLIElement>("li.contextMenuItem[data-index]")
    .forEach((menuItemEl) => {
      menuItemEl.addEventListener("click", (clickEvent) => {
        clickEvent.stopPropagation();
        activateItem(session, resolveItem(session, menuItemEl));
      });
    });

  contextMenu
    .querySelectorAll<HTMLLIElement>("li.contextMenuParent[data-submenu-index]")
    .forEach((parentEl) => {
      const submenuIndex = parseMenuIndex(parentEl.dataset.submenuIndex);
      parentEl.addEventListener("mouseenter", () => {
        if (Number.isNaN(submenuIndex)) {
          return;
        }

        showSubmenu(parentEl, submenuIndex);
      });
      parentEl.addEventListener("mouseleave", () => {
        if (Number.isNaN(submenuIndex)) {
          return;
        }

        scheduleHideSubmenu(submenuIndex);
      });
    });

  contextMenu
    .querySelectorAll<HTMLLIElement>("li.contextMenuItem:not(.contextMenuParent)")
    .forEach((menuItemEl) => {
      menuItemEl.addEventListener("mouseenter", () => {
        if (activeSubmenuIndex !== null) {
          scheduleHideSubmenu(activeSubmenuIndex);
        }
      });
    });

  contextMenu.addEventListener(EVENT_KEYDOWN, handleMenuKeydown);

  if (contextMenuSource !== null) {
    contextMenuSource.classList.remove("contextMenuActive");
  }

  contextMenuSource = sourceElem;
  contextMenuSource.classList.add("contextMenuActive");
  activeSession = session;

  if (fromKeyboard) {
    trackKeyboardLaunch(sourceElem, event.key);
    focusMenuItem(menuItemsOf(contextMenu)[0]);
  }
}

export function recordRecentAction(repo: string, actionId: GG.RecentActionId): void {
  if (typeof viewState === "undefined") {
    return;
  }

  const repoState = viewState.repos[repo];
  if (repoState === undefined) {
    return;
  }

  const updatedRepoState: GG.GitRepoState = {
    ...repoState,
    recentActions: normalizeRecentActions([actionId, ...(repoState.recentActions ?? [])])
  };
  viewState.repos[repo] = updatedRepoState;

  const webviewState = vscode.getState();
  if (webviewState !== null) {
    vscode.setState({
      ...webviewState,
      gitRepos: {
        ...webviewState.gitRepos,
        [repo]: updatedRepoState
      }
    });
  }

  sendMessage({
    command: "saveRepoState",
    repo,
    state: updatedRepoState
  });
}

/**
 * Closes the menu. Without `reason` (programmatic close) and for every reason other than
 * `"keyboard"` focus is left where it is; `"keyboard"` restores the origin.
 */
export function hideContextMenu(reason?: FocusCloseReason): void {
  const session = activeSession;
  activeSession = null;
  contextMenu.removeEventListener(EVENT_KEYDOWN, handleMenuKeydown);
  contextMenu.className = "";
  contextMenu.innerHTML = "";
  contextMenu.style.left = "0px";
  contextMenu.style.top = "0px";
  document.querySelectorAll(SUBMENU_SELECTOR).forEach((submenuEl) => {
    submenuEl.remove();
  });
  clearAllSubmenuHideTimers();
  activeSubmenuIndex = null;
  if (contextMenuSource !== null) {
    contextMenuSource.classList.remove("contextMenuActive");
    contextMenuSource = null;
  }
  if (reason === REASON_KEYBOARD && session !== null) {
    focusOrigin(session.origin, session.source);
  }
}

// Document-level dismissal: a pointer leaving the document never closes a menu that holds focus,
// and a contextmenu raised inside the menu itself is not an outside click.
export function hideContextMenuListener(event?: Event): void {
  if (!contextMenu.classList.contains("active")) return;
  if (event !== undefined && event.type === EVENT_MOUSELEAVE && menuHasFocus()) return;
  if (event !== undefined && event.type === EVENT_CONTEXTMENU && isInsideMenu(event.target)) return;
  hideContextMenu(event === undefined ? undefined : REASON_OUTSIDE);
}

export function isContextMenuActive() {
  return contextMenu.classList.contains("active");
}
