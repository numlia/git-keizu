// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const MENU_WIDTH = 150;
const MENU_HEIGHT = 200;
const VIEWPORT_WIDTH = 1000;
const VIEWPORT_HEIGHT = 800;
const OFFSET = 2;

let showContextMenu: typeof import("../../web/contextMenu").showContextMenu;
let hideContextMenu: typeof import("../../web/contextMenu").hideContextMenu;
let contextMenuEl: HTMLDivElement;

beforeAll(async () => {
  // Given: contextMenu DOM element exists before module loads
  contextMenuEl = document.createElement("div");
  contextMenuEl.id = "contextMenu";
  document.body.appendChild(contextMenuEl);

  const mod = await import("../../web/contextMenu");
  showContextMenu = mod.showContextMenu;
  hideContextMenu = mod.hideContextMenu;
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
});

afterEach(() => {
  hideContextMenu();
});

function createMouseEvent(clientX: number, clientY: number): MouseEvent {
  return new MouseEvent("contextmenu", { clientX, clientY, bubbles: true });
}

function createItems(): ContextMenuElement[] {
  return [{ title: "Test Item", onClick: vi.fn() }];
}

function createSourceElem(): HTMLElement {
  const el = document.createElement("span");
  document.body.appendChild(el);
  return el;
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

    // Then: menu is clamped to (0, 0) — never goes above or left of viewport
    expect(contextMenuEl.style.left).toBe("0px");
    expect(contextMenuEl.style.top).toBe("0px");
  });

  it("clamps negative top when flipped menu would overflow above viewport (TC-007)", () => {
    // Given: small viewport where flipped menu top would be negative
    Object.defineProperty(window, "innerHeight", { value: 100, writable: true });
    const clientX = 100;
    const clientY = 50;
    const event = createMouseEvent(clientX, clientY);
    const sourceElem = createSourceElem();

    // When: showContextMenu is called (menu height 200 > viewport 100)
    showContextMenu(event, createItems(), sourceElem);

    // Then: top is clamped to 0 (not negative)
    expect(contextMenuEl.style.top).toBe("0px");
  });
});
