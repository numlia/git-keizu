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
let recordRecentAction: typeof import("../../web/contextMenu").recordRecentAction;
let contextMenuEl: HTMLUListElement;

import { vscode } from "../../web/utils";

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
        html: '<span class="codicon codicon-history"></span><span class="contextMenuLabelText">Recent</span>'
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
        html: '<span class="codicon codicon-history"></span><span class="contextMenuLabelText">Recent</span>'
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
