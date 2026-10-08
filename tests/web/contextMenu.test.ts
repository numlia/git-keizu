// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const MENU_WIDTH = 150;
const MENU_HEIGHT = 200;
const SUBMENU_WIDTH = 120;
const SUBMENU_HEIGHT = 120;
const VIEWPORT_WIDTH = 1000;
const VIEWPORT_HEIGHT = 800;
const OFFSET = 2;

let showContextMenu: typeof import("../../web/contextMenu").showContextMenu;
let hideContextMenu: typeof import("../../web/contextMenu").hideContextMenu;
let hideContextMenuListener: typeof import("../../web/contextMenu").hideContextMenuListener;
let recordRecentAction: typeof import("../../web/contextMenu").recordRecentAction;
let contextMenuEl: HTMLUListElement;

import { configureFocusContext, markFocusTarget } from "../../web/keyboardNavigation";
import { svgIcons, vscode } from "../../web/utils";

beforeAll(async () => {
  // Given: contextMenu and dialog DOM elements exist before any module that reads them loads
  contextMenuEl = document.createElement("ul");
  contextMenuEl.id = "contextMenu";
  document.body.appendChild(contextMenuEl);
  for (const id of ["dialog", "dialogBacking"]) {
    const el = document.createElement("div");
    el.id = id;
    document.body.appendChild(el);
  }

  const mod = await import("../../web/contextMenu");
  showContextMenu = mod.showContextMenu;
  hideContextMenu = mod.hideContextMenu;
  hideContextMenuListener = mod.hideContextMenuListener;
  recordRecentAction = mod.recordRecentAction;
});

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", {
    value: VIEWPORT_WIDTH,
    writable: true
  });
  Object.defineProperty(window, "innerHeight", {
    value: VIEWPORT_HEIGHT,
    writable: true
  });

  contextMenuEl.getBoundingClientRect = vi.fn(
    () =>
      ({
        width: MENU_WIDTH,
        height: MENU_HEIGHT,
        top: 0,
        left: 0,
        right: MENU_WIDTH,
        bottom: MENU_HEIGHT,
        x: 0,
        y: 0,
        toJSON: () => {}
      }) as DOMRect
  );

  (globalThis as Record<string, unknown>).viewState = {
    repos: { "/test/repo": { columnWidths: null } },
    showRecentActions: false,
    dialogDefaults: { removeWorktree: { deleteBranch: true } }
  };
  vi.mocked(vscode.postMessage).mockClear();
  vi.mocked(vscode.getState).mockReturnValue(null);
  vi.mocked(vscode.setState).mockClear();
});

afterEach(() => {
  hideContextMenu();
  vi.useRealTimers();
});

function createMouseEvent(clientX: number, clientY: number): MouseEvent {
  return new MouseEvent("contextmenu", { clientX, clientY, bubbles: true });
}

function createItems(): ContextMenuElement[] {
  return [{ title: "Test Item", onClick: vi.fn() }];
}

function createSubmenuItems(onChildClick = vi.fn()): ContextMenuElement[] {
  return [
    { title: "First Item", onClick: vi.fn() },
    {
      title: "More...",
      submenu: [{ title: "Child Item", onClick: onChildClick }]
    }
  ];
}

function createSourceElem(): HTMLElement {
  const el = document.createElement("span");
  document.body.appendChild(el);
  return el;
}

function getSubmenuElement(): HTMLUListElement {
  return document.querySelector("ul.contextMenuSubmenu") as HTMLUListElement;
}

describe("showContextMenu position calculation", () => {
  it("places menu at (clientX-2, clientY-2) when it fits in viewport (TC-001)", () => {
    // Given: click at (100, 200), menu fits within viewport
    const event = createMouseEvent(100, 200);
    const sourceElem = createSourceElem();

    // When: showContextMenu is called
    showContextMenu(event, createItems(), sourceElem);

    // Then: menu is positioned at (clientX - OFFSET, clientY - OFFSET)
    expect(contextMenuEl.style.left).toBe(`${100 - OFFSET}px`);
    expect(contextMenuEl.style.top).toBe(`${200 - OFFSET}px`);
  });

  it("places menu correctly at center of viewport (TC-002)", () => {
    // Given: click at center area (400, 300), menu fits within viewport
    const event = createMouseEvent(400, 300);
    const sourceElem = createSourceElem();

    // When: showContextMenu is called
    showContextMenu(event, createItems(), sourceElem);

    // Then: menu is positioned at (clientX - OFFSET, clientY - OFFSET)
    expect(contextMenuEl.style.left).toBe(`${400 - OFFSET}px`);
    expect(contextMenuEl.style.top).toBe(`${300 - OFFSET}px`);
  });

  it("flips menu left when it overflows right edge (TC-003)", () => {
    // Given: click near right edge, menu width exceeds remaining space
    const clientX = VIEWPORT_WIDTH - 10;
    const clientY = 200;
    const event = createMouseEvent(clientX, clientY);
    const sourceElem = createSourceElem();

    // When: showContextMenu is called
    showContextMenu(event, createItems(), sourceElem);

    // Then: menu flips left (clientX - menuWidth + OFFSET)
    expect(contextMenuEl.style.left).toBe(`${clientX - MENU_WIDTH + OFFSET}px`);
    expect(contextMenuEl.style.top).toBe(`${clientY - OFFSET}px`);
  });

  it("flips menu up when it overflows bottom edge (TC-004)", () => {
    // Given: click near bottom edge, menu height exceeds remaining space
    const clientX = 100;
    const clientY = VIEWPORT_HEIGHT - 10;
    const event = createMouseEvent(clientX, clientY);
    const sourceElem = createSourceElem();

    // When: showContextMenu is called
    showContextMenu(event, createItems(), sourceElem);

    // Then: menu flips up (clientY - menuHeight + OFFSET)
    expect(contextMenuEl.style.left).toBe(`${clientX - OFFSET}px`);
    expect(contextMenuEl.style.top).toBe(`${clientY - MENU_HEIGHT + OFFSET}px`);
  });

  it("flips menu both directions at bottom-right corner (TC-005)", () => {
    // Given: click near bottom-right corner, overflows both axes
    const clientX = VIEWPORT_WIDTH - 10;
    const clientY = VIEWPORT_HEIGHT - 10;
    const event = createMouseEvent(clientX, clientY);
    const sourceElem = createSourceElem();

    // When: showContextMenu is called
    showContextMenu(event, createItems(), sourceElem);

    // Then: menu flips both left and up
    expect(contextMenuEl.style.left).toBe(`${clientX - MENU_WIDTH + OFFSET}px`);
    expect(contextMenuEl.style.top).toBe(`${clientY - MENU_HEIGHT + OFFSET}px`);
  });

  it("handles (0, 0) coordinates at top-left corner (TC-006)", () => {
    // Given: click at origin (0, 0), menu fits within viewport
    const event = createMouseEvent(0, 0);
    const sourceElem = createSourceElem();

    // When: showContextMenu is called
    showContextMenu(event, createItems(), sourceElem);

    // Then: menu is clamped to (0, 0)
    expect(contextMenuEl.style.left).toBe("0px");
    expect(contextMenuEl.style.top).toBe("0px");
  });

  it("clamps negative top when flipped menu would overflow above viewport (TC-007)", () => {
    // Given: small viewport where flipped menu top would be negative
    Object.defineProperty(window, "innerHeight", { value: 100, writable: true });
    const event = createMouseEvent(100, 50);
    const sourceElem = createSourceElem();

    // When: showContextMenu is called
    showContextMenu(event, createItems(), sourceElem);

    // Then: top is clamped to 0
    expect(contextMenuEl.style.top).toBe("0px");
  });
});

describe("showContextMenu submenu behavior (S2)", () => {
  it("renders dividers and plain items without creating submenu DOM (TC-008)", () => {
    // Case: TC-008
    // Given: a flat menu with one divider
    const sourceElem = createSourceElem();
    const items: ContextMenuElement[] = [
      { title: "First", onClick: vi.fn() },
      null,
      { title: "Second", onClick: vi.fn() }
    ];

    // When: showContextMenu is called
    showContextMenu(createMouseEvent(100, 100), items, sourceElem);

    // Then: top-level DOM matches the expected li classes and no submenu popup is created
    const liClasses = Array.from(contextMenuEl.querySelectorAll("li")).map((el) => el.className);
    expect(liClasses).toEqual(["contextMenuItem", "contextMenuDivider", "contextMenuItem"]);
    expect(document.querySelectorAll("ul.contextMenuSubmenu")).toHaveLength(0);
  });

  it("renders submenu parent li and body-level submenu popup (TC-009)", () => {
    // Case: TC-009
    // Given: a menu containing one submenu parent
    const sourceElem = createSourceElem();

    // When: showContextMenu is called
    showContextMenu(createMouseEvent(100, 100), createSubmenuItems(), sourceElem);

    // Then: parent li and body-level submenu are both created
    const parentLi = contextMenuEl.querySelector(
      'li.contextMenuParent[data-submenu-index="1"]'
    ) as HTMLLIElement | null;
    const submenuEl = getSubmenuElement();
    expect(parentLi).not.toBeNull();
    expect(submenuEl.dataset.submenuIndex).toBe("1");
    expect(submenuEl.parentElement).toBe(document.body);
  });

  it("activates submenu on parent mouseenter and positions it (TC-010)", () => {
    // Case: TC-010
    // Given: a parent item and submenu with measurable bounds
    const sourceElem = createSourceElem();
    showContextMenu(createMouseEvent(100, 100), createSubmenuItems(), sourceElem);
    const parentLi = contextMenuEl.querySelector("li.contextMenuParent") as HTMLLIElement;
    const submenuEl = getSubmenuElement();
    parentLi.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 120,
          height: 24,
          top: 180,
          left: 50,
          right: 170,
          bottom: 204,
          x: 50,
          y: 180,
          toJSON: () => {}
        }) as DOMRect
    );
    submenuEl.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: SUBMENU_WIDTH,
          height: SUBMENU_HEIGHT,
          top: 0,
          left: 0,
          right: SUBMENU_WIDTH,
          bottom: SUBMENU_HEIGHT,
          x: 0,
          y: 0,
          toJSON: () => {}
        }) as DOMRect
    );

    // When: the user hovers the parent item
    parentLi.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

    // Then: submenu becomes active and receives fixed coordinates
    expect(submenuEl.classList.contains("active")).toBe(true);
    expect(submenuEl.style.left).toBe("170px");
    expect(submenuEl.style.top).toBe("180px");
  });

  it("clamps submenu top within the viewport near the bottom edge (TC-011)", () => {
    // Case: TC-011
    // Given: a parent item near the viewport bottom and a tall submenu
    const sourceElem = createSourceElem();
    showContextMenu(createMouseEvent(100, 100), createSubmenuItems(), sourceElem);
    const parentLi = contextMenuEl.querySelector("li.contextMenuParent") as HTMLLIElement;
    const submenuEl = getSubmenuElement();
    Object.defineProperty(window, "innerHeight", { value: 200, writable: true });
    parentLi.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 120,
          height: 24,
          top: 190,
          left: 50,
          right: 170,
          bottom: 214,
          x: 50,
          y: 190,
          toJSON: () => {}
        }) as DOMRect
    );
    submenuEl.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: SUBMENU_WIDTH,
          height: SUBMENU_HEIGHT,
          top: 0,
          left: 0,
          right: SUBMENU_WIDTH,
          bottom: SUBMENU_HEIGHT,
          x: 0,
          y: 0,
          toJSON: () => {}
        }) as DOMRect
    );

    // When: the user hovers the parent item
    parentLi.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

    // Then: submenu top is clamped to stay within the viewport
    expect(submenuEl.style.top).toBe("80px");
  });

  it("keeps submenu visible before the hide delay expires (TC-012)", () => {
    // Case: TC-012
    // Given: fake timers and an open submenu
    vi.useFakeTimers();
    const sourceElem = createSourceElem();
    showContextMenu(createMouseEvent(100, 100), createSubmenuItems(), sourceElem);
    const parentLi = contextMenuEl.querySelector("li.contextMenuParent") as HTMLLIElement;
    const submenuEl = getSubmenuElement();
    parentLi.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 120,
          height: 24,
          top: 100,
          left: 50,
          right: 170,
          bottom: 124,
          x: 50,
          y: 100,
          toJSON: () => {}
        }) as DOMRect
    );
    submenuEl.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: SUBMENU_WIDTH,
          height: SUBMENU_HEIGHT,
          top: 0,
          left: 0,
          right: SUBMENU_WIDTH,
          bottom: SUBMENU_HEIGHT,
          x: 0,
          y: 0,
          toJSON: () => {}
        }) as DOMRect
    );
    parentLi.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

    // When: mouse leaves the parent and the delay has not fully elapsed
    parentLi.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    vi.advanceTimersByTime(100);

    // Then: submenu remains active
    expect(submenuEl.classList.contains("active")).toBe(true);
  });

  it("hides submenu after the hide delay elapses (TC-013)", () => {
    // Case: TC-013
    // Given: fake timers and an open submenu
    vi.useFakeTimers();
    const sourceElem = createSourceElem();
    showContextMenu(createMouseEvent(100, 100), createSubmenuItems(), sourceElem);
    const parentLi = contextMenuEl.querySelector("li.contextMenuParent") as HTMLLIElement;
    const submenuEl = getSubmenuElement();
    parentLi.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 120,
          height: 24,
          top: 100,
          left: 50,
          right: 170,
          bottom: 124,
          x: 50,
          y: 100,
          toJSON: () => {}
        }) as DOMRect
    );
    submenuEl.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: SUBMENU_WIDTH,
          height: SUBMENU_HEIGHT,
          top: 0,
          left: 0,
          right: SUBMENU_WIDTH,
          bottom: SUBMENU_HEIGHT,
          x: 0,
          y: 0,
          toJSON: () => {}
        }) as DOMRect
    );
    parentLi.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

    // When: mouse leaves and the delay fully elapses
    parentLi.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    vi.advanceTimersByTime(200);

    // Then: submenu is no longer active
    expect(submenuEl.classList.contains("active")).toBe(false);
  });

  it("cancels the scheduled hide when the pointer enters the submenu (TC-014)", () => {
    // Case: TC-014
    // Given: fake timers and an open submenu
    vi.useFakeTimers();
    const sourceElem = createSourceElem();
    showContextMenu(createMouseEvent(100, 100), createSubmenuItems(), sourceElem);
    const parentLi = contextMenuEl.querySelector("li.contextMenuParent") as HTMLLIElement;
    const submenuEl = getSubmenuElement();
    parentLi.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 120,
          height: 24,
          top: 100,
          left: 50,
          right: 170,
          bottom: 124,
          x: 50,
          y: 100,
          toJSON: () => {}
        }) as DOMRect
    );
    submenuEl.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: SUBMENU_WIDTH,
          height: SUBMENU_HEIGHT,
          top: 0,
          left: 0,
          right: SUBMENU_WIDTH,
          bottom: SUBMENU_HEIGHT,
          x: 0,
          y: 0,
          toJSON: () => {}
        }) as DOMRect
    );
    parentLi.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    parentLi.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

    // When: the pointer enters the submenu before the timer fires
    submenuEl.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    vi.advanceTimersByTime(200);

    // Then: submenu stays visible
    expect(submenuEl.classList.contains("active")).toBe(true);
  });

  it("invokes submenu item onClick and closes the whole menu on click (TC-015)", () => {
    // Case: TC-015
    // Given: an open submenu with a click spy
    const childClick = vi.fn();
    const sourceElem = createSourceElem();
    showContextMenu(createMouseEvent(100, 100), createSubmenuItems(childClick), sourceElem);
    const parentLi = contextMenuEl.querySelector("li.contextMenuParent") as HTMLLIElement;
    const submenuEl = getSubmenuElement();
    parentLi.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 120,
          height: 24,
          top: 100,
          left: 50,
          right: 170,
          bottom: 124,
          x: 50,
          y: 100,
          toJSON: () => {}
        }) as DOMRect
    );
    submenuEl.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: SUBMENU_WIDTH,
          height: SUBMENU_HEIGHT,
          top: 0,
          left: 0,
          right: SUBMENU_WIDTH,
          bottom: SUBMENU_HEIGHT,
          x: 0,
          y: 0,
          toJSON: () => {}
        }) as DOMRect
    );
    parentLi.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    const submenuItem = submenuEl.querySelector("li.contextMenuItem") as HTMLLIElement;

    // When: the submenu action is clicked
    submenuItem.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Then: the child action runs once and the menu is fully closed
    expect(childClick).toHaveBeenCalledTimes(1);
    expect(contextMenuEl.classList.contains("active")).toBe(false);
    expect(document.querySelectorAll("ul.contextMenuSubmenu")).toHaveLength(0);
  });

  it("removes submenu DOM and source highlight on hideContextMenu (TC-016)", () => {
    // Case: TC-016
    // Given: a shown submenu and an active source element
    const sourceElem = createSourceElem();
    showContextMenu(createMouseEvent(100, 100), createSubmenuItems(), sourceElem);

    // When: hideContextMenu is called
    hideContextMenu();

    // Then: submenu DOM is removed and the source highlight is cleared
    expect(document.querySelectorAll("ul.contextMenuSubmenu")).toHaveLength(0);
    expect(sourceElem.classList.contains("contextMenuActive")).toBe(false);
  });

  it("does not register normal-item click behavior on submenu parents (TC-017)", () => {
    // Case: TC-017
    // Given: a menu with one normal item and one submenu parent
    const firstClick = vi.fn();
    const sourceElem = createSourceElem();
    const items: ContextMenuElement[] = [
      { title: "First Item", onClick: firstClick },
      {
        title: "More...",
        submenu: [{ title: "Child Item", onClick: vi.fn() }]
      }
    ];
    showContextMenu(createMouseEvent(100, 100), items, sourceElem);
    const parentLi = contextMenuEl.querySelector("li.contextMenuParent") as HTMLLIElement;

    // When: the submenu parent is clicked directly
    parentLi.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Then: no regular-item callback is invoked
    expect(firstClick).not.toHaveBeenCalled();
  });
});

describe("showContextMenu recent actions (S3)", () => {
  function getRenderedMenuSnapshot(): Array<{ className: string; text: string; html: string }> {
    return Array.from(contextMenuEl.querySelectorAll("li")).map((el) => ({
      className: el.className,
      text: (el.textContent ?? "").replace("▸", "").trim(),
      html: el.innerHTML
    }));
  }

  it("does not prepend Recent items when showRecentActions is disabled (TC-018)", () => {
    // Case: TC-018
    // Given: matching recent history exists but the setting is disabled
    (globalThis as Record<string, unknown>).viewState = {
      repos: { "/test/repo": { columnWidths: null } },
      showRecentActions: false
    };
    const sourceElem = createSourceElem();
    const items: ContextMenuElement[] = [
      { title: "Create Branch", recentActionId: "commit.createBranch", onClick: vi.fn() },
      { title: "Merge", recentActionId: "commit.merge", onClick: vi.fn() }
    ];

    // When: showContextMenu is called with recentActions
    showContextMenu(createMouseEvent(100, 100), items, sourceElem, [
      "commit.merge",
      "commit.createBranch"
    ]);

    // Then: the menu renders only the original items without a prepended divider block
    expect(getRenderedMenuSnapshot()).toEqual([
      { className: "contextMenuItem", text: "Create Branch", html: "Create Branch" },
      { className: "contextMenuItem", text: "Merge", html: "Merge" }
    ]);
  });

  it("prepends matching Recent items in history order when enabled (TC-019)", () => {
    // Case: TC-019
    // Given: Recent display is enabled and two matching recent actions exist
    (globalThis as Record<string, unknown>).viewState = {
      repos: { "/test/repo": { columnWidths: null } },
      showRecentActions: true
    };
    const sourceElem = createSourceElem();
    const items: ContextMenuElement[] = [
      { title: "Create Branch", recentActionId: "commit.createBranch", onClick: vi.fn() },
      { title: "Merge", recentActionId: "commit.merge", onClick: vi.fn() },
      { title: "Copy", onClick: vi.fn() }
    ];

    // When: showContextMenu is called with recentActions ordered by recency
    showContextMenu(createMouseEvent(100, 100), items, sourceElem, [
      "commit.merge",
      "commit.createBranch"
    ]);

    // Then: matching recent items are prepended before a divider and the normal menu remains intact
    expect(getRenderedMenuSnapshot()).toEqual([
      {
        className: "contextMenuLabel",
        text: "Recent",
        html: '<span class="codicon codicon-history" aria-hidden="true"></span><span class="contextMenuLabelText">Recent</span>'
      },
      { className: "contextMenuItem", text: "Merge", html: "Merge" },
      { className: "contextMenuItem", text: "Create Branch", html: "Create Branch" },
      { className: "contextMenuDivider", text: "", html: "" },
      { className: "contextMenuItem", text: "Create Branch", html: "Create Branch" },
      { className: "contextMenuItem", text: "Merge", html: "Merge" },
      { className: "contextMenuItem", text: "Copy", html: "Copy" }
    ]);
  });

  it("does not create a Recent block when fewer than two eligible actions exist (TC-020)", () => {
    // Case: TC-020
    // Given: Recent display is enabled but the menu has only one recent-eligible item
    (globalThis as Record<string, unknown>).viewState = {
      repos: { "/test/repo": { columnWidths: null } },
      showRecentActions: true
    };
    const sourceElem = createSourceElem();
    const items: ContextMenuElement[] = [
      { title: "Open File", recentActionId: "file.openFile", onClick: vi.fn() },
      { title: "Copy", onClick: vi.fn() }
    ];

    // When: showContextMenu is called with a matching recent action
    showContextMenu(createMouseEvent(100, 100), items, sourceElem, ["file.openFile"]);

    // Then: the menu renders without a prepended Recent block
    expect(getRenderedMenuSnapshot()).toEqual([
      { className: "contextMenuItem", text: "Open File", html: "Open File" },
      { className: "contextMenuItem", text: "Copy", html: "Copy" }
    ]);
  });

  it("can lift submenu actions into Recent while preserving the original submenu (TC-021)", () => {
    // Case: TC-021
    // Given: a submenu child and a top-level item are both recent-eligible
    (globalThis as Record<string, unknown>).viewState = {
      repos: { "/test/repo": { columnWidths: null } },
      showRecentActions: true
    };
    const sourceElem = createSourceElem();
    const items: ContextMenuElement[] = [
      { title: "Create Branch", recentActionId: "commit.createBranch", onClick: vi.fn() },
      {
        title: "More...",
        submenu: [{ title: "Add Tag", recentActionId: "commit.addTag", onClick: vi.fn() }]
      }
    ];

    // When: showContextMenu is called with a submenu action in recent history
    showContextMenu(createMouseEvent(100, 100), items, sourceElem, [
      "commit.addTag",
      "commit.createBranch"
    ]);

    // Then: the recent block contains the submenu item while the original submenu still exists
    expect(getRenderedMenuSnapshot()).toEqual([
      {
        className: "contextMenuLabel",
        text: "Recent",
        html: '<span class="codicon codicon-history" aria-hidden="true"></span><span class="contextMenuLabelText">Recent</span>'
      },
      { className: "contextMenuItem", text: "Add Tag", html: "Add Tag" },
      { className: "contextMenuItem", text: "Create Branch", html: "Create Branch" },
      { className: "contextMenuDivider", text: "", html: "" },
      { className: "contextMenuItem", text: "Create Branch", html: "Create Branch" },
      {
        className: "contextMenuItem contextMenuParent",
        text: "More...",
        html: 'More...<span class="contextMenuArrow">▸</span>'
      }
    ]);
    expect(document.querySelectorAll("ul.contextMenuSubmenu")).toHaveLength(1);
  });

  it("updates local repo state and sends saveRepoState when recording a recent action (TC-022)", () => {
    // Case: TC-022
    // Given: repo state already has one recent action and webview state is available
    const persistedState = {
      gitRepos: {
        "/test/repo": { columnWidths: null, recentActions: ["commit.merge"] }
      }
    } as unknown as WebViewState;
    (globalThis as Record<string, unknown>).viewState = {
      repos: {
        "/test/repo": { columnWidths: null, recentActions: ["commit.merge"] }
      },
      showRecentActions: true
    };
    vi.mocked(vscode.getState).mockReturnValue(persistedState);

    // When: recordRecentAction is called for a new action
    recordRecentAction("/test/repo", "commit.createBranch");

    // Then: local state is updated, webview state is refreshed, and saveRepoState is posted
    expect(viewState.repos["/test/repo"].recentActions).toEqual([
      "commit.createBranch",
      "commit.merge"
    ]);
    expect(vscode.setState).toHaveBeenCalledWith({
      ...persistedState,
      gitRepos: {
        "/test/repo": {
          columnWidths: null,
          recentActions: ["commit.createBranch", "commit.merge"]
        }
      }
    });
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "saveRepoState",
      repo: "/test/repo",
      state: {
        columnWidths: null,
        recentActions: ["commit.createBranch", "commit.merge"]
      }
    });
  });
});

// S5: Recent composition for detached worktree menu items including the removal ID
// @see docs/testing/perspectives/web/contextMenu-test.md
describe("showContextMenu detached worktree menu recent actions (S5)", () => {
  const ITEM_CLASS = "contextMenuItem";
  const DIVIDER_CLASS = "contextMenuDivider";
  const LABEL_CLASS = "contextMenuLabel";
  const MENU_CLASSES = [ITEM_CLASS, DIVIDER_CLASS, LABEL_CLASS];
  const DETACHED_MENU_CLASS_ORDER = [
    ITEM_CLASS,
    ITEM_CLASS,
    ITEM_CLASS,
    ITEM_CLASS,
    DIVIDER_CLASS,
    ITEM_CLASS
  ];

  function createDetachedWorktreeMenuItems(): ContextMenuElement[] {
    return [
      {
        title: "Open in New Window",
        recentActionId: "ref.openWorktreeInNewWindow",
        onClick: vi.fn()
      },
      {
        title: "Reveal in File Manager",
        recentActionId: "ref.revealWorktreeInOS",
        onClick: vi.fn()
      },
      { title: "Open Terminal Here", recentActionId: "ref.openTerminal", onClick: vi.fn() },
      { title: "Copy Worktree Path", onClick: vi.fn() },
      null,
      {
        title: "Remove Worktree&#8230;",
        recentActionId: "ref.removeWorktree",
        onClick: vi.fn()
      }
    ];
  }

  function setShowRecentActions(showRecentActions: boolean): void {
    (globalThis as Record<string, unknown>).viewState = {
      repos: { "/test/repo": { columnWidths: null } },
      showRecentActions
    };
  }

  function getRenderedItems(): HTMLLIElement[] {
    return Array.from(contextMenuEl.querySelectorAll("li"));
  }

  function getClassOrder(elems: HTMLLIElement[]): string[][] {
    return elems.map((el) => MENU_CLASSES.filter((className) => el.classList.contains(className)));
  }

  function countLabels(elems: HTMLLIElement[]): number {
    return elems.filter((el) => el.classList.contains(LABEL_CLASS)).length;
  }

  it("renders only the six menu elements when showRecentActions is disabled (TC-027)", () => {
    // Case: TC-027
    // Given: a matching recent action exists but the setting is disabled
    setShowRecentActions(false);

    // When: the detached worktree menu is shown with recent actions
    showContextMenu(
      createMouseEvent(100, 100),
      createDetachedWorktreeMenuItems(),
      createSourceElem(),
      ["ref.openTerminal"]
    );

    // Then: four items, a divider and one item are rendered without a Recent label
    const rendered = getRenderedItems();
    expect(rendered).toHaveLength(6);
    expect(countLabels(rendered)).toBe(0);
    expect(getClassOrder(rendered)).toEqual(DETACHED_MENU_CLASS_ORDER.map((name) => [name]));
  });

  it("renders no Recent block when the history is empty (TC-028)", () => {
    // Case: TC-028
    // Given: Recent display is enabled and the history is empty
    setShowRecentActions(true);

    // When: the detached worktree menu is shown with an empty history
    showContextMenu(
      createMouseEvent(100, 100),
      createDetachedWorktreeMenuItems(),
      createSourceElem(),
      []
    );

    // Then: only the six menu elements are rendered
    const rendered = getRenderedItems();
    expect(rendered).toHaveLength(6);
    expect(countLabels(rendered)).toBe(0);
  });

  it("prepends the matching recent action above the unchanged menu (TC-029)", () => {
    // Case: TC-029
    // Given: Recent display is enabled and one history entry matches a menu item
    setShowRecentActions(true);

    // When: the detached worktree menu is shown with that history
    showContextMenu(
      createMouseEvent(100, 100),
      createDetachedWorktreeMenuItems(),
      createSourceElem(),
      ["ref.openTerminal"]
    );

    // Then: a Recent label, the matching item and a divider precede the original six elements
    const rendered = getRenderedItems();
    expect(rendered).toHaveLength(9);
    expect(rendered[0].classList.contains(LABEL_CLASS)).toBe(true);
    expect(rendered[0].textContent).toContain("Recent");
    expect(rendered[1].textContent).toBe("Open Terminal Here");
    expect(rendered[2].classList.contains(DIVIDER_CLASS)).toBe(true);
    expect(getClassOrder(rendered.slice(3))).toEqual(
      DETACHED_MENU_CLASS_ORDER.map((name) => [name])
    );
    expect(rendered.slice(3).map((el) => el.textContent)).toEqual([
      "Open in New Window",
      "Reveal in File Manager",
      "Open Terminal Here",
      "Copy Worktree Path",
      "",
      "Remove Worktree…"
    ]);
  });

  it("renders no Recent block when no history entry matches a menu item (TC-030)", () => {
    // Case: TC-030
    // Given: Recent display is enabled and the only history entry belongs to another menu
    setShowRecentActions(true);

    // When: the detached worktree menu is shown with that history
    showContextMenu(
      createMouseEvent(100, 100),
      createDetachedWorktreeMenuItems(),
      createSourceElem(),
      ["commit.merge"]
    );

    // Then: only the six menu elements are rendered
    const rendered = getRenderedItems();
    expect(rendered).toHaveLength(6);
    expect(countLabels(rendered)).toBe(0);
  });
});

// S6: Recent worktree removal composed from the current menu and persisted on confirmation
// @see docs/testing/perspectives/web/contextMenu-test.md
describe("Recent worktree removal integration", () => {
  type BranchTarget = { kind: "branch"; name: string; path: string };
  type DetachedTarget = { kind: "detached"; path: string };
  type RemovalTarget = BranchTarget | DetachedTarget;
  type PostedMessage = { command: string; [key: string]: unknown };
  type PostedCall = { message: PostedMessage; order: number };
  type RenderedItem = { className: string; text: string };
  type RenderedMenu = { main: RenderedItem[]; submenus: RenderedItem[][] };

  const REPO = "/test/repo";
  const OTHER_REPO = "/test/other-repo";
  const GIT_BRANCH_HEAD = "main";
  const REMOVE_ID: GG.RecentActionId = "ref.removeWorktree";
  const REMOVE_TEXT = "Remove Worktree…";
  const SAVE_COMMAND = "saveRepoState";
  const REMOVE_COMMAND = "removeWorktree";
  const LABEL_CLASS = "contextMenuLabel";
  const DIVIDER_CLASS = "contextMenuDivider";
  const MAX_RECENT_ACTIONS = 5;
  const BRANCH_A: BranchTarget = { kind: "branch", name: "feature/a", path: "/tmp/wt-a" };
  const BRANCH_B: BranchTarget = { kind: "branch", name: "feature/b", path: "/tmp/wt-b" };
  const DETACHED_A: DetachedTarget = { kind: "detached", path: "/tmp/detached-a" };
  const DETACHED_B: DetachedTarget = { kind: "detached", path: "/tmp/detached-b" };
  const OLD_ACTIONS: GG.RecentActionId[] = [
    "ref.pull",
    "ref.checkoutBranch",
    "ref.openTerminal",
    "commit.merge",
    "file.openFile"
  ];

  let refMenu: typeof import("../../web/refMenu");
  let worktreeMenu: typeof import("../../web/worktreeMenu");
  let dialogs: typeof import("../../web/dialogs");

  beforeAll(async () => {
    refMenu = await import("../../web/refMenu");
    worktreeMenu = await import("../../web/worktreeMenu");
    dialogs = await import("../../web/dialogs");
  });

  beforeEach(() => {
    setViewState({ [REPO]: [] });
    trackWebviewState(createWebviewState({ [REPO]: [] }));
  });

  afterEach(() => {
    dialogs.hideDialog();
    vi.mocked(vscode.setState).mockReset();
  });

  function createRepoStates(histories: Record<string, GG.RecentActionId[]>): GG.GitRepoSet {
    return Object.fromEntries(
      Object.entries(histories).map(([repo, recentActions]) => [
        repo,
        { columnWidths: null, recentActions: [...recentActions] }
      ])
    );
  }

  function setViewState(
    histories: Record<string, GG.RecentActionId[]>,
    { showRecentActions = true, deleteBranch = true } = {}
  ): void {
    (globalThis as Record<string, unknown>).viewState = {
      repos: createRepoStates(histories),
      showRecentActions,
      dialogDefaults: { removeWorktree: { deleteBranch } }
    };
  }

  function createWebviewState(
    histories: Record<string, GG.RecentActionId[]>,
    otherKeys: Record<string, unknown> = {}
  ): WebViewState {
    return { ...otherKeys, gitRepos: createRepoStates(histories) } as unknown as WebViewState;
  }

  function trackWebviewState(initialState: WebViewState): void {
    let state = initialState;
    vi.mocked(vscode.getState).mockImplementation(() => state);
    vi.mocked(vscode.setState).mockImplementation((nextState) => {
      state = nextState;
    });
  }

  function currentHistory(repo = REPO): GG.RecentActionId[] | undefined {
    return viewState.repos[repo].recentActions;
  }

  function lastSetState(): WebViewState {
    const lastCall = vi.mocked(vscode.setState).mock.lastCall;
    expect(lastCall).toBeDefined();
    return lastCall![0];
  }

  function createTargetSourceElem(target: RemovalTarget): HTMLElement {
    const sourceElem = createSourceElem();
    if (target.kind === "branch") {
      sourceElem.classList.add("head");
    }
    return sourceElem;
  }

  function buildTargetMenu(target: RemovalTarget, sourceElem: HTMLElement): ContextMenuElement[] {
    return target.kind === "branch"
      ? refMenu.buildRefContextMenuItems(
          REPO,
          target.name,
          sourceElem,
          false,
          GIT_BRANCH_HEAD,
          undefined,
          { path: target.path, isMainWorktree: false }
        )
      : worktreeMenu.buildDetachedWorktreeContextMenuItems(REPO, target.path);
  }

  function showTargetMenu(target: RemovalTarget): void {
    const sourceElem = createTargetSourceElem(target);
    showContextMenu(
      createMouseEvent(100, 100),
      buildTargetMenu(target, sourceElem),
      sourceElem,
      currentHistory()
    );
  }

  function toRenderedItem(el: Element): RenderedItem {
    return { className: el.className, text: (el.textContent ?? "").replace("▸", "").trim() };
  }

  function snapshotRenderedMenu(): RenderedMenu {
    return {
      main: Array.from(contextMenuEl.querySelectorAll("li"), toRenderedItem),
      submenus: Array.from(document.querySelectorAll("ul.contextMenuSubmenu"), (submenuEl) =>
        Array.from(submenuEl.querySelectorAll("li"), toRenderedItem)
      )
    };
  }

  function countRenderedLabels(): number {
    return contextMenuEl.querySelectorAll(`li.${LABEL_CLASS}`).length;
  }

  function getRecentBlockElements(): HTMLLIElement[] {
    const rendered = Array.from(contextMenuEl.querySelectorAll("li"));
    expect(rendered[0].classList.contains(LABEL_CLASS)).toBe(true);
    const dividerIndex = rendered.findIndex((el) => el.classList.contains(DIVIDER_CLASS));
    return rendered.slice(1, dividerIndex);
  }

  function getAllRenderedTexts(): string[] {
    return Array.from(
      document.querySelectorAll("#contextMenu li, ul.contextMenuSubmenu li"),
      (el) => el.textContent ?? ""
    );
  }

  // Shows the target's real menu with the current history and checks that the part after the
  // Recent block renders exactly like the same builder output shown without history.
  function showTargetMenuKeepingNormalPart(target: RemovalTarget): RenderedMenu {
    const sourceElem = createTargetSourceElem(target);
    const items = buildTargetMenu(target, sourceElem);
    showContextMenu(createMouseEvent(100, 100), items, sourceElem);
    const withoutHistory = snapshotRenderedMenu();

    showContextMenu(createMouseEvent(100, 100), items, sourceElem, currentHistory());
    const composed = snapshotRenderedMenu();
    const recentCount = getRecentBlockElements().length;
    const normalPart: RenderedMenu = {
      main: composed.main.slice(recentCount + 2),
      submenus: composed.submenus
    };
    expect(normalPart).toStrictEqual(withoutHistory);
    return normalPart;
  }

  function expectRemovalKeepsItsPlace(target: RemovalTarget, normalPart: RenderedMenu): void {
    if (target.kind === "branch") {
      expect(normalPart.submenus).toHaveLength(1);
      expect(normalPart.submenus[0].at(-1)?.text).toBe(REMOVE_TEXT);
      expect(normalPart.main.map((item) => item.text)).not.toContain(REMOVE_TEXT);
      return;
    }
    expect(normalPart.main.at(-1)?.text).toBe(REMOVE_TEXT);
    expect(normalPart.main.at(-2)?.className).toBe(DIVIDER_CLASS);
  }

  function clickNormalRemoval(target: RemovalTarget): void {
    const removalEl =
      target.kind === "branch"
        ? Array.from(
            document.querySelectorAll<HTMLLIElement>("ul.contextMenuSubmenu li.contextMenuItem")
          ).find((el) => el.textContent === REMOVE_TEXT)
        : Array.from(contextMenuEl.querySelectorAll<HTMLLIElement>("li")).at(-1);
    expect(removalEl?.textContent).toBe(REMOVE_TEXT);
    removalEl!.click();
  }

  function clickRecentRemoval(): void {
    const recentRemovalEl = getRecentBlockElements().find((el) => el.textContent === REMOVE_TEXT);
    expect(recentRemovalEl).toBeDefined();
    recentRemovalEl!.click();
  }

  function openRecentRemoval(target: RemovalTarget): void {
    showTargetMenu(target);
    clickRecentRemoval();
  }

  function collectPostedCalls(action: () => void): PostedCall[] {
    const mock = vi.mocked(vscode.postMessage).mock;
    const start = mock.calls.length;
    action();
    return mock.calls.slice(start).map(([message], index) => ({
      message: message as unknown as PostedMessage,
      order: mock.invocationCallOrder[start + index]
    }));
  }

  function clickDialogAction(): void {
    document.getElementById("dialogAction")!.click();
  }

  function clickDialogDismiss(): void {
    document.getElementById("dialogDismiss")!.click();
  }

  function confirmThroughNormalItem(target: RemovalTarget): PostedCall[] {
    showTargetMenu(target);
    clickNormalRemoval(target);
    return collectPostedCalls(clickDialogAction);
  }

  function expectedRemovalRequest(target: RemovalTarget, deleteBranch: boolean): PostedMessage {
    return target.kind === "branch"
      ? {
          command: REMOVE_COMMAND,
          repo: REPO,
          worktreePath: target.path,
          branchName: target.name,
          deleteBranch
        }
      : { command: REMOVE_COMMAND, repo: REPO, worktreePath: target.path, deleteBranch: false };
  }

  function expectSaveThenRemoval(
    calls: PostedCall[],
    expectedRemoval: PostedMessage,
    expectedHistory: GG.RecentActionId[] = [REMOVE_ID]
  ): void {
    const saves = calls.filter((call) => call.message.command === SAVE_COMMAND);
    const removals = calls.filter((call) => call.message.command === REMOVE_COMMAND);
    expect(saves).toHaveLength(1);
    expect(removals).toHaveLength(1);
    expect(saves[0].order).toBeLessThan(removals[0].order);
    expect(saves[0].message).toStrictEqual({
      command: SAVE_COMMAND,
      repo: REPO,
      state: { columnWidths: null, recentActions: expectedHistory }
    });
    expect(removals[0].message).toStrictEqual(expectedRemoval);
  }

  function expectNoSaveOrRemoval(calls: PostedCall[]): void {
    expect(calls.filter((call) => call.message.command === SAVE_COMMAND)).toHaveLength(0);
    expect(calls.filter((call) => call.message.command === REMOVE_COMMAND)).toHaveLength(0);
  }

  function expectPersistedHistory(expectedHistory: GG.RecentActionId[]): void {
    expect(currentHistory()).toStrictEqual(expectedHistory);
    expect(lastSetState().gitRepos[REPO].recentActions).toStrictEqual(expectedHistory);
  }

  function expectDialogFor(target: RemovalTarget, previous: RemovalTarget): void {
    const dialogEl = document.getElementById("dialog")!;
    const text = dialogEl.textContent ?? "";
    expect(dialogEl.className).toBe("active");
    expect(text).toContain(`'${target.path}'`);
    expect(text).not.toContain(previous.path);
    if (previous.kind === "branch") {
      expect(text).not.toContain(previous.name);
    }

    const checkboxes = dialogEl.querySelectorAll('input[type="checkbox"]');
    const actionText = document.getElementById("dialogAction")!.textContent;
    const dismissText = document.getElementById("dialogDismiss")!.textContent;
    if (target.kind === "branch") {
      expect(text).toContain(`'${target.name}'`);
      expect(checkboxes).toHaveLength(1);
      expect([actionText, dismissText]).toStrictEqual(["Remove", "Cancel"]);
      return;
    }
    expect(checkboxes).toHaveLength(0);
    expect([actionText, dismissText]).toStrictEqual(["Yes", "No"]);
  }

  function getDeleteBranchCheckbox(): HTMLInputElement {
    return document.getElementById("dialogInput0") as HTMLInputElement;
  }

  it.each([true, false])(
    "opens branch B's form from Recent after branch A was removed and sends B's request with Also delete branch %s (TC-031)",
    (deleteBranch) => {
      // Case: TC-031
      // Given: branch A was removed through Remove Worktree in its More submenu
      expectSaveThenRemoval(
        confirmThroughNormalItem(BRANCH_A),
        expectedRemovalRequest(BRANCH_A, true)
      );
      expect(currentHistory()).toStrictEqual([REMOVE_ID]);

      // When: branch B's menu is shown with the updated history and Recent removal is chosen
      const normalPart = showTargetMenuKeepingNormalPart(BRANCH_B);
      expectRemovalKeepsItsPlace(BRANCH_B, normalPart);
      clickRecentRemoval();

      // Then: B's form opens, and Cancel adds neither a save nor a removal request
      expectDialogFor(BRANCH_B, BRANCH_A);
      expectNoSaveOrRemoval(collectPostedCalls(clickDialogDismiss));

      // Then: reopening and closing without an answer adds nothing either
      openRecentRemoval(BRANCH_B);
      expectDialogFor(BRANCH_B, BRANCH_A);
      expectNoSaveOrRemoval(collectPostedCalls(() => dialogs.hideDialog()));

      // When: the form is reopened and confirmed with the checkbox set
      openRecentRemoval(BRANCH_B);
      getDeleteBranchCheckbox().checked = deleteBranch;
      const calls = collectPostedCalls(clickDialogAction);

      // Then: one save request precedes B's whole removal request; the history has no duplicate
      expectSaveThenRemoval(calls, expectedRemovalRequest(BRANCH_B, deleteBranch));
      expectPersistedHistory([REMOVE_ID]);
    }
  );

  it("opens detached B's confirmation from Recent after branch A was removed and sends B's request (TC-032)", () => {
    // Case: TC-032
    // Given: branch A was removed through its normal item
    expectSaveThenRemoval(
      confirmThroughNormalItem(BRANCH_A),
      expectedRemovalRequest(BRANCH_A, true)
    );

    // When: detached B's menu is shown with the updated history and Recent removal is chosen
    const normalPart = showTargetMenuKeepingNormalPart(DETACHED_B);
    expectRemovalKeepsItsPlace(DETACHED_B, normalPart);
    clickRecentRemoval();

    // Then: B's Yes / No confirmation opens, and No adds nothing
    expectDialogFor(DETACHED_B, BRANCH_A);
    expectNoSaveOrRemoval(collectPostedCalls(clickDialogDismiss));

    // When: it is reopened and confirmed with Yes
    openRecentRemoval(DETACHED_B);
    const calls = collectPostedCalls(clickDialogAction);

    // Then: one save request precedes B's removal request, which has no branchName key
    expectSaveThenRemoval(calls, expectedRemovalRequest(DETACHED_B, false));
    expectPersistedHistory([REMOVE_ID]);
  });

  it.each([true, false])(
    "opens branch B's form from Recent after detached A was removed and sends B's request with the checkbox default %s (TC-033)",
    (deleteBranchDefault) => {
      // Case: TC-033
      // Given: the Also delete branch default and detached A removed through its normal item
      setViewState({ [REPO]: [] }, { deleteBranch: deleteBranchDefault });
      expectSaveThenRemoval(
        confirmThroughNormalItem(DETACHED_A),
        expectedRemovalRequest(DETACHED_A, false)
      );

      // When: branch B's menu is shown with the updated history and Recent removal is chosen
      const normalPart = showTargetMenuKeepingNormalPart(BRANCH_B);
      expectRemovalKeepsItsPlace(BRANCH_B, normalPart);
      clickRecentRemoval();

      // Then: B's form opens, and Cancel adds nothing
      expectDialogFor(BRANCH_B, DETACHED_A);
      expectNoSaveOrRemoval(collectPostedCalls(clickDialogDismiss));

      // When: the form is reopened and confirmed with the checkbox left at its default
      openRecentRemoval(BRANCH_B);
      expect(getDeleteBranchCheckbox().checked).toBe(deleteBranchDefault);
      const calls = collectPostedCalls(clickDialogAction);

      // Then: one save request precedes B's whole removal request using the default
      expectSaveThenRemoval(calls, expectedRemovalRequest(BRANCH_B, deleteBranchDefault));
      expectPersistedHistory([REMOVE_ID]);
    }
  );

  it("opens detached B's confirmation from Recent after detached A was removed and sends B's request (TC-034)", () => {
    // Case: TC-034
    // Given: detached A was removed through its normal item
    expectSaveThenRemoval(
      confirmThroughNormalItem(DETACHED_A),
      expectedRemovalRequest(DETACHED_A, false)
    );

    // When: detached B's menu is shown with the updated history and Recent removal is chosen
    const normalPart = showTargetMenuKeepingNormalPart(DETACHED_B);
    expectRemovalKeepsItsPlace(DETACHED_B, normalPart);
    clickRecentRemoval();

    // Then: B's confirmation opens without A's path, and No adds nothing
    expectDialogFor(DETACHED_B, DETACHED_A);
    expectNoSaveOrRemoval(collectPostedCalls(clickDialogDismiss));

    // When: it is reopened and confirmed with Yes
    openRecentRemoval(DETACHED_B);
    const calls = collectPostedCalls(clickDialogAction);

    // Then: one save request precedes B's removal request
    expectSaveThenRemoval(calls, expectedRemovalRequest(DETACHED_B, false));
    expectPersistedHistory([REMOVE_ID]);
  });

  it.each([
    {
      caseId: "TC-035",
      label: "the HEAD branch",
      gitBranchHead: BRANCH_B.name,
      worktreeInfo: { path: BRANCH_B.path, isMainWorktree: false },
      history: [REMOVE_ID, "ref.pull"] as GG.RecentActionId[],
      expectedRecent: ["Pull"]
    },
    {
      caseId: "TC-036",
      label: "a branch in the main worktree",
      gitBranchHead: GIT_BRANCH_HEAD,
      worktreeInfo: { path: REPO, isMainWorktree: true },
      history: [REMOVE_ID, "ref.checkoutBranch"] as GG.RecentActionId[],
      expectedRecent: ["Checkout Branch"]
    },
    {
      caseId: "TC-037",
      label: "a branch without a worktree",
      gitBranchHead: GIT_BRANCH_HEAD,
      worktreeInfo: null,
      history: [REMOVE_ID, "ref.checkoutBranch"] as GG.RecentActionId[],
      expectedRecent: ["Checkout Branch"]
    }
  ])(
    "shows no removal in the normal or Recent part for $label ($caseId)",
    ({ gitBranchHead, worktreeInfo, history, expectedRecent }) => {
      // Case: TC-035 / TC-036 / TC-037 (one row each)
      // Given: the removal ID is first in the history
      setViewState({ [REPO]: history });
      const sourceElem = createTargetSourceElem(BRANCH_B);

      // When: the real branch menu without a removal item is shown
      showContextMenu(
        createMouseEvent(100, 100),
        refMenu.buildRefContextMenuItems(
          REPO,
          BRANCH_B.name,
          sourceElem,
          false,
          gitBranchHead,
          undefined,
          worktreeInfo
        ),
        sourceElem,
        currentHistory()
      );

      // Then: Recent holds only the other matching action and no removal is rendered anywhere
      expect(getRecentBlockElements().map((el) => el.textContent)).toStrictEqual(expectedRecent);
      expect(getAllRenderedTexts()).not.toContain(REMOVE_TEXT);
    }
  );

  it.each([
    { entrance: "branch", target: BRANCH_B as RemovalTarget },
    { entrance: "detached", target: DETACHED_B as RemovalTarget }
  ])(
    "records a confirmed removal through the $entrance entrance while Recent display is off (TC-038)",
    ({ target }) => {
      // Case: TC-038
      // Given: Recent display is off and the history is empty
      setViewState({ [REPO]: [] }, { showRecentActions: false });

      // When: the removal is confirmed through the entrance's normal item
      const calls = confirmThroughNormalItem(target);

      // Then: one save request precedes the removal request and the removal ID leads the history
      expectSaveThenRemoval(calls, expectedRemovalRequest(target, true));
      expect(currentHistory()?.[0]).toBe(REMOVE_ID);

      // Then: a following removal-capable menu renders no Recent block
      const sourceElem = createTargetSourceElem(target);
      const items = buildTargetMenu(target, sourceElem);
      showContextMenu(createMouseEvent(100, 100), items, sourceElem);
      const withoutHistory = snapshotRenderedMenu();
      showContextMenu(createMouseEvent(100, 100), items, sourceElem, currentHistory());
      expect(countRenderedLabels()).toBe(0);
      expect(snapshotRenderedMenu().main).toHaveLength(withoutHistory.main.length);
    }
  );

  it("renders no Recent block for branch B when the history is empty (TC-039)", () => {
    // Case: TC-039
    // Given: Recent display is on and the history is empty
    const sourceElem = createTargetSourceElem(BRANCH_B);
    const items = buildTargetMenu(BRANCH_B, sourceElem);
    showContextMenu(createMouseEvent(100, 100), items, sourceElem);
    const withoutHistory = snapshotRenderedMenu();

    // When: branch B's real menu is shown with the empty history
    showContextMenu(createMouseEvent(100, 100), items, sourceElem, currentHistory());

    // Then: no Recent block, and the rendering equals the menu without history
    expect(countRenderedLabels()).toBe(0);
    expect(snapshotRenderedMenu()).toStrictEqual(withoutHistory);
  });

  it("does not synthesize a removal when the current menu has no removal item (TC-040)", () => {
    // Case: TC-040
    // Given: only the removal ID is in the history
    setViewState({ [REPO]: [REMOVE_ID] });
    const sourceElem = createTargetSourceElem(BRANCH_B);

    // When: the real menu of a non-HEAD branch without a worktree is shown
    showContextMenu(
      createMouseEvent(100, 100),
      refMenu.buildRefContextMenuItems(
        REPO,
        BRANCH_B.name,
        sourceElem,
        false,
        GIT_BRANCH_HEAD,
        undefined,
        null
      ),
      sourceElem,
      currentHistory()
    );

    // Then: no Recent block and no removal item anywhere
    expect(countRenderedLabels()).toBe(0);
    expect(getAllRenderedTexts()).not.toContain(REMOVE_TEXT);
  });

  it("renders no Recent block when the removal is the only eligible item (TC-041)", () => {
    // Case: TC-041
    // Given: the history holds the removal ID and the items are only the real removal item
    setViewState({ [REPO]: [REMOVE_ID] });
    const removalOnly = worktreeMenu
      .buildDetachedWorktreeContextMenuItems(REPO, DETACHED_B.path)
      .filter(
        (item) => item !== null && "recentActionId" in item && item.recentActionId === REMOVE_ID
      );
    expect(removalOnly).toHaveLength(1);

    // When: that single-item menu is shown with the history
    showContextMenu(createMouseEvent(100, 100), removalOnly, createSourceElem(), currentHistory());

    // Then: fewer than two eligible kinds means no Recent block
    expect(countRenderedLabels()).toBe(0);
    expect(contextMenuEl.querySelectorAll("li")).toHaveLength(1);
  });

  it("keeps five entries by dropping the oldest when the removal is new, also on a repeated confirmation (TC-042)", () => {
    // Case: TC-042
    // Given: five distinct existing IDs without the removal, in viewState and the webview state
    setViewState({ [REPO]: OLD_ACTIONS });
    trackWebviewState(createWebviewState({ [REPO]: OLD_ACTIONS }));
    const expectedHistory = [REMOVE_ID, ...OLD_ACTIONS.slice(0, MAX_RECENT_ACTIONS - 1)];

    // When: a removal is confirmed through branch A's normal item
    const firstCalls = confirmThroughNormalItem(BRANCH_A);

    // Then: viewState, the save request and setState hold the same five entries
    expectSaveThenRemoval(firstCalls, expectedRemovalRequest(BRANCH_A, true), expectedHistory);
    expectPersistedHistory(expectedHistory);

    // When: another removal is confirmed through detached B's normal item
    const secondCalls = confirmThroughNormalItem(DETACHED_B);

    // Then: the three arrays stay the same
    expectSaveThenRemoval(secondCalls, expectedRemovalRequest(DETACHED_B, false), expectedHistory);
    expectPersistedHistory(expectedHistory);
  });

  it("moves an existing removal entry to the front without duplicating it (TC-043)", () => {
    // Case: TC-043
    // Given: the removal ID sits in the middle of five distinct IDs
    const [old0, old1, old2, old3] = OLD_ACTIONS;
    const history: GG.RecentActionId[] = [old0, old1, REMOVE_ID, old2, old3];
    setViewState({ [REPO]: history });
    trackWebviewState(createWebviewState({ [REPO]: history }));
    const expectedHistory = [REMOVE_ID, old0, old1, old2, old3];

    // When: a removal is confirmed through detached A's normal item
    const calls = confirmThroughNormalItem(DETACHED_A);

    // Then: the removal moves to the front and the other four keep their relative order
    expectSaveThenRemoval(calls, expectedRemovalRequest(DETACHED_A, false), expectedHistory);
    expectPersistedHistory(expectedHistory);
  });

  it("updates only the confirming repository and keeps unrelated webview state (TC-044)", () => {
    // Case: TC-044
    // Given: two repositories with different histories and other top-level webview state keys
    const otherHistory: GG.RecentActionId[] = ["commit.merge", "ref.openTerminal"];
    const unrelatedState = { currentRepo: REPO, gitBranches: [GIT_BRANCH_HEAD], scrollTop: 42 };
    setViewState({ [REPO]: ["ref.pull"], [OTHER_REPO]: otherHistory });
    trackWebviewState(
      createWebviewState({ [REPO]: ["ref.pull"], [OTHER_REPO]: otherHistory }, unrelatedState)
    );

    // When: a removal is confirmed in REPO through branch A's normal item
    const calls = confirmThroughNormalItem(BRANCH_A);

    // Then: only REPO's history changes and every save request targets REPO
    expectSaveThenRemoval(calls, expectedRemovalRequest(BRANCH_A, true), [REMOVE_ID, "ref.pull"]);
    expectPersistedHistory([REMOVE_ID, "ref.pull"]);
    expect(viewState.repos[OTHER_REPO]).toStrictEqual({
      columnWidths: null,
      recentActions: otherHistory
    });
    const { gitRepos, ...otherKeys } = lastSetState();
    expect(gitRepos[OTHER_REPO]).toStrictEqual({ columnWidths: null, recentActions: otherHistory });
    expect(otherKeys).toStrictEqual(unrelatedState);
    expect(
      calls.filter((call) => call.message.command === SAVE_COMMAND).map((call) => call.message.repo)
    ).toStrictEqual([REPO]);
  });
});

/* ------------------------------------------------------------------ */
/* S9 / S10: keyboard launch, movement, activation, closing, Tab exit */
/* @see docs/testing/perspectives/web/contextMenu-test.md S9, S10     */
/* ------------------------------------------------------------------ */

const KEYBOARD_REPO = "/test/repo";
const SOURCE_RECT = { left: 100, top: 200, right: 160, bottom: 220, width: 60, height: 20 };
const SUBMENU_HIDE_WAIT_MS = 200;

interface KeyboardFixture {
  readonly sourceElem: HTMLElement;
  readonly items: ContextMenuElement[];
  readonly itemA: ReturnType<typeof vi.fn>;
  readonly itemB: ReturnType<typeof vi.fn>;
  readonly child1: ReturnType<typeof vi.fn>;
  readonly child2: ReturnType<typeof vi.fn>;
}

function createFocusableElem(): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  document.body.appendChild(el);
  return el;
}

function createKeyboardSourceElem(): HTMLElement {
  const el = createFocusableElem();
  el.getBoundingClientRect = vi.fn(
    () => ({ ...SOURCE_RECT, x: SOURCE_RECT.left, y: SOURCE_RECT.top, toJSON: () => {} }) as DOMRect
  );
  return el;
}

function createKeyboardFixture(): KeyboardFixture {
  const itemA = vi.fn();
  const itemB = vi.fn();
  const child1 = vi.fn();
  const child2 = vi.fn();
  return {
    sourceElem: createKeyboardSourceElem(),
    items: [
      { kind: "label", title: "Heading", icon: svgIcons.history },
      { title: "Item A", onClick: itemA },
      null,
      {
        title: "More",
        submenu: [
          { title: "Child 1", onClick: child1 },
          { title: "Child 2", onClick: child2 }
        ]
      },
      { title: "Item B", onClick: itemB }
    ],
    itemA,
    itemB,
    child1,
    child2
  };
}

function keyboardTrigger(): KeyboardEvent {
  return new KeyboardEvent("keydown", {
    key: "F10",
    shiftKey: true,
    bubbles: true,
    cancelable: true
  });
}

function press(target: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

function release(target: Element, key: string): KeyboardEvent {
  const event = new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

function openByKeyboard(
  fixture: KeyboardFixture,
  focusOptions?: ContextMenuFocusOptions,
  recentActions?: GG.RecentActionId[]
): void {
  fixture.sourceElem.focus();
  showContextMenu(
    keyboardTrigger(),
    fixture.items,
    fixture.sourceElem,
    recentActions,
    focusOptions
  );
}

function rootItem(text: string): HTMLElement {
  return Array.from(contextMenuEl.querySelectorAll<HTMLElement>("li.contextMenuItem")).find((li) =>
    (li.textContent ?? "").startsWith(text)
  )!;
}

function submenuItem(text: string): HTMLElement {
  return Array.from(
    document.querySelectorAll<HTMLElement>("ul.contextMenuSubmenu li.contextMenuItem")
  ).find((li) => (li.textContent ?? "").startsWith(text))!;
}

function activeElem(): Element {
  return document.activeElement!;
}

// Registers the focus context the restore / Tab chain reads; `tabStops` is mutated per test.
function registerKeyboardContext(tabStops: { current: HTMLElement[] }): () => void {
  return configureFocusContext({
    getRepo: () => KEYBOARD_REPO,
    getActiveRow: () => null,
    getTabStops: () => tabStops.current
  });
}

describe("S9: keyboard launch, item movement, activation and submenu expansion", () => {
  const tabStops = { current: [] as HTMLElement[] };
  let disposeContext: () => void;

  beforeEach(() => {
    tabStops.current = [];
    disposeContext = registerKeyboardContext(tabStops);
  });

  afterEach(() => {
    hideContextMenu();
    disposeContext();
    document.body.querySelectorAll("button").forEach((button) => button.remove());
  });

  it("opens from the source rectangle and focuses the first action item (TC-123)", () => {
    // Case: TC-123
    // Given: a focused source element with a known rectangle
    const fixture = createKeyboardFixture();

    // When: the menu is opened from a Shift+F10 keydown
    openByKeyboard(fixture);

    // Then: the position derives from the rectangle (left / bottom) with the existing clamp
    expect(contextMenuEl.classList.contains("active")).toBe(true);
    expect(contextMenuEl.style.left).toBe(`${SOURCE_RECT.left - OFFSET}px`);
    expect(contextMenuEl.style.top).toBe(`${SOURCE_RECT.bottom - OFFSET}px`);
    // Then: the heading is skipped and item A holds the real focus
    expect(activeElem()).toBe(rootItem("Item A"));
    expect(rootItem("Item A").getAttribute("role")).toBe("menuitem");
  });

  it("swallows only the contextmenu generated by the same key press (TC-124)", () => {
    // Case: TC-124
    // Given: the source has a right-click listener that would relaunch the menu (as main does)
    const fixture = createKeyboardFixture();
    const relaunch = vi.fn((e: Event) =>
      showContextMenu(e as MouseEvent, fixture.items, fixture.sourceElem)
    );
    fixture.sourceElem.addEventListener("contextmenu", relaunch);
    openByKeyboard(fixture);
    const renderedBefore = Array.from(contextMenuEl.querySelectorAll("li"));

    // When: the browser's contextmenu for the same press reaches the source
    const native = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 300,
      clientY: 300
    });
    fixture.sourceElem.dispatchEvent(native);

    // Then: the menu is not rebuilt, the event is consumed and focus stays on item A
    expect(relaunch).not.toHaveBeenCalled();
    expect(native.defaultPrevented).toBe(true);
    const renderedAfter = Array.from(contextMenuEl.querySelectorAll("li"));
    expect(renderedAfter).toHaveLength(renderedBefore.length);
    renderedAfter.forEach((li, index) => expect(li).toBe(renderedBefore[index]));
    expect(activeElem()).toBe(rootItem("Item A"));
    expect(contextMenuEl.style.left).toBe(`${SOURCE_RECT.left - OFFSET}px`);

    // Given: a fresh keyboard launch whose keys were released before the browser's contextmenu
    hideContextMenu();
    openByKeyboard(fixture);
    const renderedAfterKeyup = Array.from(contextMenuEl.querySelectorAll("li"));
    release(fixture.sourceElem, "F10");
    release(fixture.sourceElem, "Shift");

    // When: the contextmenu of the same press arrives after the keyup
    const afterKeyup = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    fixture.sourceElem.dispatchEvent(afterKeyup);

    // Then: it is still swallowed once, the menu is not rebuilt and item A keeps focus
    expect(relaunch).not.toHaveBeenCalled();
    expect(afterKeyup.defaultPrevented).toBe(true);
    const renderedFinal = Array.from(contextMenuEl.querySelectorAll("li"));
    expect(renderedFinal).toHaveLength(renderedAfterKeyup.length);
    renderedFinal.forEach((li, index) => expect(li).toBe(renderedAfterKeyup[index]));
    expect(activeElem()).toBe(rootItem("Item A"));
  });

  it("does not suppress the next independent right-click (TC-125)", () => {
    // Case: TC-125
    // Given: a keyboard launch whose same-press contextmenu was already swallowed
    const fixture = createKeyboardFixture();
    const relaunch = vi.fn((e: Event) =>
      showContextMenu(e as MouseEvent, fixture.items, fixture.sourceElem)
    );
    fixture.sourceElem.addEventListener("contextmenu", relaunch);
    openByKeyboard(fixture);
    fixture.sourceElem.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true })
    );
    expect(relaunch).not.toHaveBeenCalled();

    // When: an independent right-click arrives on the same source
    const independent = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 400,
      clientY: 300
    });
    fixture.sourceElem.dispatchEvent(independent);

    // Then: it reaches the listener and opens with pointer coordinates (S1 rule)
    expect(relaunch).toHaveBeenCalledTimes(1);
    expect(independent.defaultPrevented).toBe(false);
    expect(contextMenuEl.style.left).toBe(`${400 - OFFSET}px`);
    expect(contextMenuEl.style.top).toBe(`${300 - OFFSET}px`);

    // When: another element is right-clicked with a mouse event
    showContextMenu(createMouseEvent(250, 150), createItems(), createSourceElem());

    // Then: the new menu uses the pointer position
    expect(contextMenuEl.style.left).toBe(`${250 - OFFSET}px`);
    expect(contextMenuEl.style.top).toBe(`${150 - OFFSET}px`);

    // Given: a keyboard launch whose keys were released without any contextmenu following
    const other = createKeyboardSourceElem();
    const relaunchOther = vi.fn((e: Event) =>
      showContextMenu(e as MouseEvent, fixture.items, other)
    );
    other.addEventListener("contextmenu", relaunchOther);
    openByKeyboard(fixture);
    release(fixture.sourceElem, "F10");
    release(fixture.sourceElem, "Shift");

    // When: an independent right-click arrives on another element
    const onOther = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 320,
      clientY: 240
    });
    other.dispatchEvent(onOther);

    // Then: it opens normally at the pointer position
    expect(relaunchOther).toHaveBeenCalledTimes(1);
    expect(onOther.defaultPrevented).toBe(false);
    expect(contextMenuEl.style.left).toBe(`${320 - OFFSET}px`);
    expect(contextMenuEl.style.top).toBe(`${240 - OFFSET}px`);
  });

  it("moves over action items only and stops at both ends (TC-126)", () => {
    // Case: TC-126
    // Given: an open keyboard menu focused on item A
    const fixture = createKeyboardFixture();
    openByKeyboard(fixture);

    // When / Then: ArrowDown walks A → More → B, skipping the heading and the divider
    let down = press(activeElem(), "ArrowDown");
    expect(down.defaultPrevented).toBe(true);
    expect(activeElem()).toBe(rootItem("More"));
    down = press(activeElem(), "ArrowDown");
    expect(activeElem()).toBe(rootItem("Item B"));

    // When / Then: ArrowDown at the end keeps item B (no wrap) and is consumed
    down = press(activeElem(), "ArrowDown");
    expect(down.defaultPrevented).toBe(true);
    expect(activeElem()).toBe(rootItem("Item B"));

    // When / Then: ArrowUp walks back and stops at item A
    press(activeElem(), "ArrowUp");
    press(activeElem(), "ArrowUp");
    expect(activeElem()).toBe(rootItem("Item A"));
    const up = press(activeElem(), "ArrowUp");
    expect(up.defaultPrevented).toBe(true);
    expect(activeElem()).toBe(rootItem("Item A"));
    expect(contextMenuEl.classList.contains("active")).toBe(true);
  });

  it("jumps to the last and first action item with End and Home (TC-127)", () => {
    // Case: TC-127
    const fixture = createKeyboardFixture();
    openByKeyboard(fixture);

    // When: End then Home
    press(activeElem(), "End");
    expect(activeElem()).toBe(rootItem("Item B"));
    press(activeElem(), "Home");

    // Then: focus is back on item A
    expect(activeElem()).toBe(rootItem("Item A"));
  });

  it("runs the item once on Enter, hiding first, and keeps the recent-action parity with click (TC-128)", () => {
    // Case: TC-128
    // Given: an open keyboard menu focused on item A
    const fixture = createKeyboardFixture();
    openByKeyboard(fixture);
    fixture.itemA.mockImplementation(() => {
      // Then (ordering): the menu is already hidden when the action runs
      expect(contextMenuEl.classList.contains("active")).toBe(false);
    });

    // When: Enter keydown then keyup on item A
    const down = press(activeElem(), "Enter");
    release(fixture.sourceElem, "Enter");

    // Then: the action ran exactly once and the menu is closed
    expect(fixture.itemA).toHaveBeenCalledTimes(1);
    expect(down.defaultPrevented).toBe(true);
    expect(contextMenuEl.classList.contains("active")).toBe(false);

    // Given: Recent actions are enabled and a recent-eligible item is listed
    (globalThis as Record<string, unknown>).viewState = {
      repos: { [KEYBOARD_REPO]: { columnWidths: null } },
      showRecentActions: true
    };
    const merge = vi.fn();
    const recentItems: ContextMenuElement[] = [
      { title: "Create Branch", recentActionId: "commit.createBranch", onClick: vi.fn() },
      { title: "Merge", recentActionId: "commit.merge", onClick: merge }
    ];
    const recentSource = createKeyboardSourceElem();
    const recentActions: GG.RecentActionId[] = ["commit.merge", "commit.createBranch"];

    // When: the lifted Recent entry is run by Enter, then by click on a fresh menu
    recentSource.focus();
    showContextMenu(keyboardTrigger(), recentItems, recentSource, recentActions);
    expect(rootItem("Merge")).toBe(activeElem());
    press(activeElem(), "Enter");
    showContextMenu(createMouseEvent(100, 100), recentItems, recentSource, recentActions);
    rootItem("Merge").dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Then: both paths call the same onClick once each
    expect(merge).toHaveBeenCalledTimes(2);
  });

  it("runs the item once on Space (TC-129)", () => {
    // Case: TC-129
    const fixture = createKeyboardFixture();
    openByKeyboard(fixture);

    // When: Space keydown then keyup on item A
    press(activeElem(), " ");
    release(fixture.sourceElem, " ");

    // Then: one run and the menu is closed
    expect(fixture.itemA).toHaveBeenCalledTimes(1);
    expect(contextMenuEl.classList.contains("active")).toBe(false);
  });

  it("never runs on a repeated Enter, a lone keyup or an IME Enter (TC-130)", () => {
    // Case: TC-130
    const fixture = createKeyboardFixture();
    openByKeyboard(fixture);
    const itemA = rootItem("Item A");

    // When: repeat keydown, keyup alone, and a composing keydown
    press(itemA, "Enter", { repeat: true });
    release(itemA, "Enter");
    press(itemA, "Enter", { isComposing: true });

    // Then: nothing ran and the menu is still open with focus on item A
    expect(fixture.itemA).not.toHaveBeenCalled();
    expect(contextMenuEl.classList.contains("active")).toBe(true);
    expect(activeElem()).toBe(itemA);
  });

  it.each(["ArrowRight", "Enter", " "])(
    "opens the submenu from the parent with %j and focuses its first child (TC-131)",
    (key) => {
      // Case: TC-131
      const fixture = createKeyboardFixture();
      openByKeyboard(fixture);
      const more = rootItem("More");
      more.focus();

      // When: the key is pressed on the parent
      const down = press(more, key);

      // Then: the submenu is active, child 1 has focus and the parent reports expanded
      expect(getSubmenuElement().classList.contains("active")).toBe(true);
      expect(activeElem()).toBe(submenuItem("Child 1"));
      expect(more.getAttribute("aria-expanded")).toBe("true");
      expect(down.defaultPrevented).toBe(true);
      expect(fixture.child1).not.toHaveBeenCalled();
    }
  );

  it("exposes menu / menuitem roles, names and submenu ownership (TC-132)", () => {
    // Case: TC-132
    const fixture = createKeyboardFixture();
    openByKeyboard(fixture);
    const more = rootItem("More");
    const submenuEl = getSubmenuElement();

    // Then: roles and names
    expect(contextMenuEl.getAttribute("role")).toBe("menu");
    expect(rootItem("Item A").getAttribute("role")).toBe("menuitem");
    expect(rootItem("Item A").getAttribute("aria-label")).toBe("Item A");
    expect(rootItem("Item B").getAttribute("aria-label")).toBe("Item B");
    expect(more.getAttribute("role")).toBe("menuitem");
    expect(more.getAttribute("aria-label")).toBe("More");
    expect(submenuItem("Child 1").getAttribute("role")).toBe("menuitem");
    expect(submenuItem("Child 1").getAttribute("aria-label")).toBe("Child 1");
    // Then: submenu ownership from the parent item
    expect(more.getAttribute("aria-haspopup")).toBe("menu");
    expect(more.getAttribute("aria-expanded")).toBe("false");
    expect(more.getAttribute("aria-controls")).toBe(submenuEl.id);
    expect(more.getAttribute("aria-owns")).toBe(submenuEl.id);
    expect(submenuEl.getAttribute("role")).toBe("menu");
    // Then: the heading and divider are not menu items and the heading icon is decorative
    const label = contextMenuEl.querySelector("li.contextMenuLabel")!;
    const divider = contextMenuEl.querySelector("li.contextMenuDivider")!;
    expect(label.getAttribute("role")).toBeNull();
    expect(divider.getAttribute("role")).toBeNull();
    expect(label.querySelector(".codicon")!.getAttribute("aria-hidden")).toBe("true");
  });

  it("does not open a menu without action items and keeps focus on the origin (TC-133)", () => {
    // Case: TC-133
    // Given: only a heading and a divider
    const sourceElem = createKeyboardSourceElem();
    sourceElem.focus();
    const items: ContextMenuElement[] = [{ kind: "label", title: "Heading" }, null];

    // When: opened from the keyboard
    showContextMenu(keyboardTrigger(), items, sourceElem);

    // Then: no menu and the origin keeps focus
    expect(contextMenuEl.classList.contains("active")).toBe(false);
    expect(activeElem()).toBe(sourceElem);
  });

  it("ignores ArrowLeft on the root menu (TC-134)", () => {
    // Case: TC-134
    const fixture = createKeyboardFixture();
    openByKeyboard(fixture);

    // When: ArrowLeft on item A
    press(activeElem(), "ArrowLeft");

    // Then: nothing changes
    expect(activeElem()).toBe(rootItem("Item A"));
    expect(contextMenuEl.classList.contains("active")).toBe(true);
    expect(fixture.itemA).not.toHaveBeenCalled();
  });
});

describe("S10: closing, Tab exit, timers, repository switch, dialog hand-off and target capture", () => {
  const tabStops = { current: [] as HTMLElement[] };
  let disposeContext: () => void;

  beforeEach(() => {
    tabStops.current = [];
    disposeContext = registerKeyboardContext(tabStops);
  });

  afterEach(() => {
    hideContextMenu();
    disposeContext();
    document.body.querySelectorAll("button").forEach((button) => button.remove());
    document.getElementById("dialog")!.innerHTML = "";
  });

  function openSubmenuByKeyboard(fixture: KeyboardFixture): HTMLElement {
    openByKeyboard(fixture);
    const more = rootItem("More");
    more.focus();
    press(more, "ArrowRight");
    expect(activeElem()).toBe(submenuItem("Child 1"));
    return more;
  }

  it("closes only the submenu on Escape and returns to the parent item (TC-135)", () => {
    // Case: TC-135
    const fixture = createKeyboardFixture();
    const more = openSubmenuByKeyboard(fixture);

    // When: Escape inside the submenu
    const esc = press(activeElem(), "Escape");

    // Then: submenu closed, root open, parent focused and collapsed, key consumed
    expect(getSubmenuElement().classList.contains("active")).toBe(false);
    expect(contextMenuEl.classList.contains("active")).toBe(true);
    expect(activeElem()).toBe(more);
    expect(more.getAttribute("aria-expanded")).toBe("false");
    expect(esc.defaultPrevented).toBe(true);
  });

  it("closes the root on Escape and restores the origin; keyup changes nothing (TC-136)", () => {
    // Case: TC-136
    const fixture = createKeyboardFixture();
    const more = openSubmenuByKeyboard(fixture);
    press(activeElem(), "Escape");
    expect(activeElem()).toBe(more);

    // When: Escape keydown on the root parent item, then its keyup
    const esc = press(more, "Escape");

    // Then: the menu is closed and the origin has focus
    expect(contextMenuEl.classList.contains("active")).toBe(false);
    expect(activeElem()).toBe(fixture.sourceElem);
    expect(esc.defaultPrevented).toBe(true);
    release(fixture.sourceElem, "Escape");
    expect(contextMenuEl.classList.contains("active")).toBe(false);
    expect(activeElem()).toBe(fixture.sourceElem);
    expect(fixture.itemA).not.toHaveBeenCalled();
  });

  it("closes only the submenu on ArrowLeft (TC-137)", () => {
    // Case: TC-137
    const fixture = createKeyboardFixture();
    const more = openSubmenuByKeyboard(fixture);

    // When: ArrowLeft inside the submenu
    press(activeElem(), "ArrowLeft");

    // Then: same result as Escape in the submenu
    expect(getSubmenuElement().classList.contains("active")).toBe(false);
    expect(contextMenuEl.classList.contains("active")).toBe(true);
    expect(activeElem()).toBe(more);
    expect(more.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes every menu on Tab and moves past the origin, or past the counter for a list origin (TC-138)", () => {
    // Case: TC-138
    // Given: the source sits between two tab stops
    const previous = createFocusableElem();
    const fixture = createKeyboardFixture();
    const next = createFocusableElem();
    tabStops.current = [previous, fixture.sourceElem, next];

    // When: Tab from item A
    openByKeyboard(fixture);
    press(rootItem("More"), "ArrowRight");
    let tab = press(activeElem(), "Tab");

    // Then: every menu is closed and the next stop has focus
    expect(contextMenuEl.classList.contains("active")).toBe(false);
    expect(document.querySelectorAll("ul.contextMenuSubmenu")).toHaveLength(0);
    expect(activeElem()).toBe(next);
    expect(tab.defaultPrevented).toBe(true);

    // When: Shift+Tab from item A in a fresh menu
    openByKeyboard(fixture);
    tab = press(activeElem(), "Tab", { shiftKey: true });

    // Then: the previous stop has focus
    expect(activeElem()).toBe(previous);
    expect(tab.defaultPrevented).toBe(true);

    // Given: a list-origin menu whose clone is not a tab stop but its counter is
    const counter = createFocusableElem();
    const afterCounter = createFocusableElem();
    tabStops.current = [previous, counter, afterCounter];
    const onTabExit = vi.fn();
    const listFixture = createKeyboardFixture();

    // When: Tab from the list-origin menu
    openByKeyboard(listFixture, { tabOrigin: counter, onTabExit });
    tab = press(activeElem(), "Tab");

    // Then: the list was told to close and focus moved past the counter
    expect(onTabExit).toHaveBeenCalledTimes(1);
    expect(contextMenuEl.classList.contains("active")).toBe(false);
    expect(activeElem()).toBe(afterCounter);
    expect(tab.defaultPrevented).toBe(true);
  });

  it("keeps a focused menu open when the pointer leaves the parent (TC-139)", () => {
    // Case: TC-139
    vi.useFakeTimers();
    // Given: item A focused and the submenu shown by hover
    const fixture = createKeyboardFixture();
    openByKeyboard(fixture);
    const more = rootItem("More");
    more.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(getSubmenuElement().classList.contains("active")).toBe(true);

    // When: the pointer leaves the parent and the delay passes; the root also sees mouseleave
    more.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    vi.advanceTimersByTime(SUBMENU_HIDE_WAIT_MS);
    contextMenuEl.dispatchEvent(new MouseEvent("mouseleave"));

    // Then: both menus stay open
    expect(getSubmenuElement().classList.contains("active")).toBe(true);
    expect(contextMenuEl.classList.contains("active")).toBe(true);

    // Given: focus outside the menu (S2 TC-013 conditions)
    fixture.sourceElem.focus();
    more.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    more.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    vi.advanceTimersByTime(SUBMENU_HIDE_WAIT_MS);

    // Then: the hover timer closes the submenu as before
    expect(getSubmenuElement().classList.contains("active")).toBe(false);
  });

  it("keeps a focused menu open when the pointer leaves the document (TC-140)", () => {
    // Case: TC-140
    // Given: main's document mouseleave listener and a focused menu
    document.addEventListener("mouseleave", hideContextMenuListener);
    try {
      const fixture = createKeyboardFixture();
      openByKeyboard(fixture);

      // When: the pointer leaves the document
      document.dispatchEvent(new MouseEvent("mouseleave"));

      // Then: the menu stays open
      expect(contextMenuEl.classList.contains("active")).toBe(true);

      // When: focus is outside and the pointer leaves again
      fixture.sourceElem.focus();
      document.dispatchEvent(new MouseEvent("mouseleave"));

      // Then: the legacy dismissal applies
      expect(contextMenuEl.classList.contains("active")).toBe(false);
    } finally {
      document.removeEventListener("mouseleave", hideContextMenuListener);
    }
  });

  it("runs nothing from a menu closed for a repository change (TC-141)", () => {
    // Case: TC-141
    const fixture = createKeyboardFixture();
    openByKeyboard(fixture);
    const itemA = rootItem("Item A");

    // When: the repository changes, then the retained item DOM is clicked and Enter-ed
    hideContextMenu("repository");
    itemA.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    press(itemA, "Enter");

    // Then: closed, no action, and focus was not pulled back to the origin
    expect(contextMenuEl.classList.contains("active")).toBe(false);
    expect(fixture.itemA).not.toHaveBeenCalled();
    expect(activeElem()).toBe(document.body);
  });

  it("keeps the action target captured at open time across a source replacement (TC-142)", () => {
    // Case: TC-142
    // Given: a marked source whose menu item closes over its hash
    const originalHash = "aaaaaaaa";
    const seenHashes: string[] = [];
    const sourceElem = createKeyboardSourceElem();
    markFocusTarget(sourceElem, { kind: "row", repo: KEYBOARD_REPO, hash: originalHash });
    const items: ContextMenuElement[] = [
      { title: "Item A", onClick: () => seenHashes.push(originalHash) }
    ];
    sourceElem.focus();
    showContextMenu(keyboardTrigger(), items, sourceElem);

    // When: the source is replaced by an element for another hash, then Enter runs item A
    sourceElem.remove();
    const focusSpy = vi.spyOn(sourceElem, "focus");
    const replacement = createKeyboardSourceElem();
    markFocusTarget(replacement, { kind: "row", repo: KEYBOARD_REPO, hash: "bbbbbbbb" });
    press(rootItem("Item A"), "Enter");

    // Then: the action ran once with the opened hash and the detached element was never focused
    expect(seenHashes).toEqual([originalHash]);
    expect(focusSpy).not.toHaveBeenCalled();
    expect(contextMenuEl.classList.contains("active")).toBe(false);
  });

  it("hands focus to a dialog opened by the action and does not take it back (TC-143)", () => {
    // Case: TC-143
    // Given: item A opens a dialog that focuses its own button
    const fixture = createKeyboardFixture();
    const dialogButton = document.createElement("button");
    dialogButton.type = "button";
    fixture.itemA.mockImplementation(() => {
      document.getElementById("dialog")!.appendChild(dialogButton);
      dialogButton.focus();
    });
    openByKeyboard(fixture);

    // When: Enter on item A
    press(activeElem(), "Enter");
    release(dialogButton, "Enter");

    // Then: the dialog keeps focus
    expect(fixture.itemA).toHaveBeenCalledTimes(1);
    expect(activeElem()).toBe(dialogButton);
    expect(activeElem()).not.toBe(fixture.sourceElem);
  });

  it("leaves focus alone on a programmatic hide without a reason (TC-144)", () => {
    // Case: TC-144
    // Given: focus on a toolbar button while a mouse-opened menu is shown
    const refreshBtn = createFocusableElem();
    refreshBtn.id = "refreshBtn";
    refreshBtn.focus();
    const fixture = createKeyboardFixture();
    showContextMenu(createMouseEvent(100, 100), fixture.items, fixture.sourceElem);
    expect(contextMenuEl.classList.contains("active")).toBe(true);

    // When: the legacy hide runs
    hideContextMenu();

    // Then: the menu is closed and the toolbar button still has focus
    expect(contextMenuEl.classList.contains("active")).toBe(false);
    expect(activeElem()).toBe(refreshBtn);
  });

  it("treats an outside click as a plain exit without restoring the origin (TC-145)", () => {
    // Case: TC-145
    // Given: main's document click listener and a focused menu
    document.addEventListener("click", hideContextMenuListener);
    try {
      const fixture = createKeyboardFixture();
      openByKeyboard(fixture);

      // When: pointerdown then click on empty body space
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      // Then: closed and the origin did not get focus back
      expect(contextMenuEl.classList.contains("active")).toBe(false);
      expect(activeElem()).not.toBe(fixture.sourceElem);
      expect(fixture.itemA).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener("click", hideContextMenuListener);
    }
  });
});

// @see docs/testing/perspectives/web/contextMenu-test.md
describe("S11: focus after a completed action", () => {
  const tabStops = { current: [] as HTMLElement[] };
  let disposeContext: () => void;

  beforeEach(() => {
    tabStops.current = [];
    disposeContext = registerKeyboardContext(tabStops);
  });

  afterEach(() => {
    hideContextMenu();
    disposeContext();
    document.body.querySelectorAll("button").forEach((button) => button.remove());
  });

  it("returns focus to the origin when the action moved it nowhere else (TC-146)", () => {
    // Case: TC-146
    // Given: an open keyboard menu whose item A leaves focus alone
    const fixture = createKeyboardFixture();
    openByKeyboard(fixture);
    expect(activeElem()).toBe(rootItem("Item A"));

    // When: Enter runs item A (the focused li is removed with the menu)
    press(activeElem(), "Enter");
    release(fixture.sourceElem, "Enter");

    // Then: the action ran once, the menu is closed and the origin holds focus again
    expect(fixture.itemA).toHaveBeenCalledTimes(1);
    expect(contextMenuEl.classList.contains("active")).toBe(false);
    expect(activeElem()).toBe(fixture.sourceElem);

    // When: the same through Space
    openByKeyboard(fixture);
    press(activeElem(), " ");
    release(fixture.sourceElem, " ");

    // Then: the origin holds focus again
    expect(fixture.itemA).toHaveBeenCalledTimes(2);
    expect(activeElem()).toBe(fixture.sourceElem);

    // When: a mouse-opened menu whose li took focus from the press is clicked
    showContextMenu(createMouseEvent(100, 100), fixture.items, fixture.sourceElem);
    rootItem("Item B").focus();
    expect(activeElem()).toBe(rootItem("Item B"));
    rootItem("Item B").dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Then: focus does not stay on body either
    expect(fixture.itemB).toHaveBeenCalledTimes(1);
    expect(activeElem()).toBe(fixture.sourceElem);
  });

  it("leaves focus with the element the action focused (TC-147)", () => {
    // Case: TC-147
    // Given: item A hands focus to a toolbar button (as an action opening another UI does)
    const fixture = createKeyboardFixture();
    const refreshBtn = createFocusableElem();
    refreshBtn.id = "refreshBtn";
    fixture.itemA.mockImplementation(() => {
      refreshBtn.focus();
    });
    openByKeyboard(fixture);
    const originFocus = vi.spyOn(fixture.sourceElem, "focus");

    // When: Enter runs item A
    press(activeElem(), "Enter");
    release(refreshBtn, "Enter");

    // Then: the focused element keeps focus and the origin is not focused
    expect(fixture.itemA).toHaveBeenCalledTimes(1);
    expect(activeElem()).toBe(refreshBtn);
    expect(originFocus).not.toHaveBeenCalled();
  });
});

// @see docs/testing/perspectives/web/contextMenu-test.md
describe("S12: contextmenu dispatched on the launching key's keyup", () => {
  const tabStops = { current: [] as HTMLElement[] };
  let disposeContext: () => void;

  beforeEach(() => {
    tabStops.current = [];
    disposeContext = registerKeyboardContext(tabStops);
    document.addEventListener("contextmenu", hideContextMenuListener);
  });

  afterEach(() => {
    document.removeEventListener("contextmenu", hideContextMenuListener);
    hideContextMenu();
    disposeContext();
    document.body.querySelectorAll("button").forEach((button) => button.remove());
  });

  function openByContextMenuKey(fixture: KeyboardFixture): void {
    fixture.sourceElem.focus();
    showContextMenu(
      new KeyboardEvent("keydown", { key: "ContextMenu", bubbles: true, cancelable: true }),
      fixture.items,
      fixture.sourceElem
    );
  }

  function contextMenuAt(target: Element): MouseEvent {
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  }

  function rightClick(target: Element, clientX: number, clientY: number): MouseEvent {
    target.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 2 }));
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY
    });
    target.dispatchEvent(event);
    return event;
  }

  it("keeps the menu open when the keyup contextmenu targets the focused item (TC-148)", () => {
    // Case: TC-148
    // Given: a menu opened by the ContextMenu key, the document closing menus on contextmenu
    const fixture = createKeyboardFixture();
    openByContextMenuKey(fixture);
    const focusedItem = activeElem();
    expect(focusedItem).toBe(rootItem("Item A"));
    const rendered = Array.from(contextMenuEl.querySelectorAll("li"));

    // When: the key is released and the browser's contextmenu lands on the focused item
    release(focusedItem, "ContextMenu");
    const late = contextMenuAt(focusedItem);

    // Then: the event is swallowed, the same li nodes stay and item A keeps focus
    expect(late.defaultPrevented).toBe(true);
    expect(contextMenuEl.classList.contains("active")).toBe(true);
    const after = Array.from(contextMenuEl.querySelectorAll("li"));
    expect(after).toHaveLength(rendered.length);
    after.forEach((li, index) => expect(li).toBe(rendered[index]));
    expect(activeElem()).toBe(focusedItem);
  });

  it("cancels only the launching key's keyup, once (TC-149)", () => {
    // Case: TC-149
    // Given: a menu opened from Shift+F10
    const fixture = createKeyboardFixture();
    openByKeyboard(fixture);

    // When: the launching key and then an unrelated key are released
    const launchKeyup = release(activeElem(), "F10");
    const shiftKeyup = release(activeElem(), "Shift");
    const arrowKeyup = release(activeElem(), "ArrowDown");
    const secondLaunchKeyup = release(activeElem(), "F10");

    // Then: only the first F10 keyup is cancelled and the menu is untouched
    expect(launchKeyup.defaultPrevented).toBe(true);
    expect(shiftKeyup.defaultPrevented).toBe(false);
    expect(arrowKeyup.defaultPrevented).toBe(false);
    expect(secondLaunchKeyup.defaultPrevented).toBe(false);
    expect(contextMenuEl.classList.contains("active")).toBe(true);
    expect(activeElem()).toBe(rootItem("Item A"));
  });

  it("lets an independent right-click open another menu after the swallowed keyup (TC-150)", () => {
    // Case: TC-150
    // Given: the keyup contextmenu of a ContextMenu launch was swallowed on the focused item
    const fixture = createKeyboardFixture();
    openByContextMenuKey(fixture);
    release(activeElem(), "ContextMenu");
    contextMenuAt(activeElem());
    const other = createSourceElem();
    // As main's launchers do, the handler keeps the event from the document-level dismissal.
    const relaunch = vi.fn((e: Event) => {
      e.stopPropagation();
      showContextMenu(e as MouseEvent, createItems(), other);
    });
    other.addEventListener("contextmenu", relaunch);

    // When: another element is right-clicked (pointerdown, then contextmenu)
    const independent = rightClick(other, 250, 150);

    // Then: the click is not suppressed and the new menu opens at the pointer
    expect(independent.defaultPrevented).toBe(false);
    expect(relaunch).toHaveBeenCalledTimes(1);
    expect(contextMenuEl.classList.contains("active")).toBe(true);
    expect(contextMenuEl.style.left).toBe(`${250 - OFFSET}px`);
    expect(contextMenuEl.style.top).toBe(`${150 - OFFSET}px`);
  });

  it("does not treat a right-click inside the menu or its submenu as an outside click (TC-151)", () => {
    // Case: TC-151
    // Given: an open keyboard menu whose same-press suppression is already spent
    const fixture = createKeyboardFixture();
    openByKeyboard(fixture);
    release(activeElem(), "F10");
    contextMenuAt(activeElem());

    // When: item B is right-clicked independently
    const onItem = rightClick(rootItem("Item B"), 120, 210);

    // Then: the menu stays open and the event is left to the browser
    expect(contextMenuEl.classList.contains("active")).toBe(true);
    expect(onItem.defaultPrevented).toBe(false);
    expect(fixture.itemB).not.toHaveBeenCalled();

    // When: the submenu is opened and its child is right-clicked
    rootItem("More").focus();
    press(rootItem("More"), "ArrowRight");
    expect(activeElem()).toBe(submenuItem("Child 1"));
    rightClick(submenuItem("Child 1"), 200, 240);

    // Then: root and submenu stay open with focus unchanged
    expect(contextMenuEl.classList.contains("active")).toBe(true);
    expect(document.querySelector("ul.contextMenuSubmenu.active")).not.toBeNull();
    expect(activeElem()).toBe(submenuItem("Child 1"));
    expect(fixture.child1).not.toHaveBeenCalled();
  });
});
