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
  // Given: contextMenu DOM element exists before module loads
  contextMenuEl = document.createElement("ul");
  contextMenuEl.id = "contextMenu";
  document.body.appendChild(contextMenuEl);

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
    showRecentActions: false
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
    showContextMenu(
      createMouseEvent(100, 100),
      items,
      sourceElem,
      ["commit.merge", "commit.createBranch"]
    );

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
    showContextMenu(
      createMouseEvent(100, 100),
      items,
      sourceElem,
      ["commit.merge", "commit.createBranch"]
    );

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
    showContextMenu(
      createMouseEvent(100, 100),
      items,
      sourceElem,
      ["commit.addTag", "commit.createBranch"]
    );

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
