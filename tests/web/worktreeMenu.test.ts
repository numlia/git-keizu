// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../web/contextMenu", () => ({ recordRecentAction: vi.fn() }));
vi.mock("../../web/dialogs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../web/dialogs")>();
  return {
    ...actual,
    showConfirmationDialog: vi.fn(actual.showConfirmationDialog),
    showFormDialog: vi.fn(actual.showFormDialog)
  };
});

import { recordRecentAction } from "../../web/contextMenu";
import { vscode } from "../../web/utils";

let menu: typeof import("../../web/worktreeMenu");
let dialogs: typeof import("../../web/dialogs");

const REPO = "/test/repo";
const WORKTREE_PATH = "/tmp/wt8";
const WORKTREE_PATH_WITH_SPACE = "/tmp/my worktree/wt8";
const WORKTREE_PATH_WITH_MARKUP = '/tmp/<script>alert("x")&';
const WORKTREE_PATH_WITH_ENTITY = "/tmp/a'&quot;b";

const TITLE_OPEN_IN_NEW_WINDOW = "Open in New Window";
const TITLE_REVEAL = "Reveal in File Manager";
const TITLE_OPEN_TERMINAL = "Open Terminal Here";
const TITLE_COPY_PATH = "Copy Worktree Path";
const TITLE_REMOVE = "Remove Worktree&#8230;";

const DETACHED_MENU_LENGTH = 6;
const DIVIDER_INDEX = 4;

beforeAll(async () => {
  for (const id of ["dialog", "dialogBacking"]) {
    const el = document.createElement("div");
    el.id = id;
    document.body.appendChild(el);
  }
  menu = await import("../../web/worktreeMenu");
  dialogs = await import("../../web/dialogs");
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  dialogs.hideDialog();
});

function getItem(items: ContextMenuElement[], title: string): ContextMenuItem {
  const found = items.find((item) => item !== null && "title" in item && item.title === title);
  if (found === undefined || found === null || !("onClick" in found)) {
    throw new Error(`Menu item not found: ${title}`);
  }
  return found;
}

function getTitle(item: ContextMenuElement): string | null {
  return item === null ? null : item.title;
}

function getRecentActionId(item: ContextMenuElement): string | undefined {
  return item !== null && "recentActionId" in item ? item.recentActionId : undefined;
}

function getDialog(): HTMLElement {
  return document.getElementById("dialog")!;
}

function openRemoveConfirmation(worktreePath: string) {
  const items = menu.buildDetachedWorktreeContextMenuItems(REPO, worktreePath);
  getItem(items, TITLE_REMOVE).onClick();
}

function clickTerminalItemOfDetachedMenu(worktreePath: string) {
  const items = menu.buildDetachedWorktreeContextMenuItems(REPO, worktreePath);
  getItem(items, TITLE_OPEN_TERMINAL).onClick();
}

// S1: getWorktreeLabelName() / buildWorktreeActionItems() /
// buildDetachedWorktreeContextMenuItems() detached worktree menu 契約
// @see docs/testing/perspectives/web/worktreeMenu-test.md
describe("getWorktreeLabelName", () => {
  it("returns the final path component (TC-001)", () => {
    // Case: TC-001
    expect(menu.getWorktreeLabelName("/tmp/wt8")).toBe("wt8");
  });

  it("ignores a trailing slash (TC-002)", () => {
    // Case: TC-002
    expect(menu.getWorktreeLabelName("/tmp/wt8/")).toBe("wt8");
  });

  it("ignores a trailing backslash on a Windows path (TC-003)", () => {
    // Case: TC-003
    expect(menu.getWorktreeLabelName("C:\\wt\\x\\")).toBe("x");
  });

  it("falls back to the whole path when the final component is empty (TC-004)", () => {
    // Case: TC-004
    expect(menu.getWorktreeLabelName("/")).toBe("/");
  });

  it("falls back to the whole path for a lone backslash (TC-005)", () => {
    // Case: TC-005
    expect(menu.getWorktreeLabelName("\\")).toBe("\\");
  });
});

// @see docs/testing/perspectives/web/worktreeMenu-test.md
describe("buildDetachedWorktreeContextMenuItems", () => {
  it("lists the four worktree actions, a divider and Remove Worktree in order (TC-006)", () => {
    // Case: TC-006
    // When: The detached worktree menu is built
    const items = menu.buildDetachedWorktreeContextMenuItems(REPO, WORKTREE_PATH);

    // Then: Six elements in the confirmed order, with history IDs only on the first three
    expect(items).toHaveLength(DETACHED_MENU_LENGTH);
    expect(items.map(getTitle)).toEqual([
      TITLE_OPEN_IN_NEW_WINDOW,
      TITLE_REVEAL,
      TITLE_OPEN_TERMINAL,
      TITLE_COPY_PATH,
      null,
      TITLE_REMOVE
    ]);
    expect(items[DIVIDER_INDEX]).toBeNull();
    expect(items.slice(0, 3).map(getRecentActionId)).toEqual([
      "ref.openWorktreeInNewWindow",
      "ref.revealWorktreeInOS",
      "ref.openTerminal"
    ]);
    expect("recentActionId" in items[3]!).toBe(false);
    expect("recentActionId" in items[5]!).toBe(false);
  });

  it("requests opening the worktree in a new window and records the action (TC-007)", () => {
    // Case: TC-007
    const items = menu.buildDetachedWorktreeContextMenuItems(REPO, WORKTREE_PATH);

    getItem(items, TITLE_OPEN_IN_NEW_WINDOW).onClick();

    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(vscode.postMessage).mock.calls[0][0]).toStrictEqual({
      command: "openWorktreeInNewWindow",
      repo: REPO,
      path: WORKTREE_PATH
    });
    expect(recordRecentAction).toHaveBeenCalledTimes(1);
    expect(recordRecentAction).toHaveBeenCalledWith(REPO, "ref.openWorktreeInNewWindow");
  });

  it("requests revealing the worktree in the file manager and records the action (TC-008)", () => {
    // Case: TC-008
    const items = menu.buildDetachedWorktreeContextMenuItems(REPO, WORKTREE_PATH);

    getItem(items, TITLE_REVEAL).onClick();

    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(vscode.postMessage).mock.calls[0][0]).toStrictEqual({
      command: "revealWorktreeInOS",
      repo: REPO,
      path: WORKTREE_PATH
    });
    expect(recordRecentAction).toHaveBeenCalledTimes(1);
    expect(recordRecentAction).toHaveBeenCalledWith(REPO, "ref.revealWorktreeInOS");
  });

  it("requests a terminal named after the final path component and records the action (TC-009)", () => {
    // Case: TC-009
    const items = menu.buildDetachedWorktreeContextMenuItems(REPO, WORKTREE_PATH);

    getItem(items, TITLE_OPEN_TERMINAL).onClick();

    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(vscode.postMessage).mock.calls[0][0]).toStrictEqual({
      command: "openTerminal",
      repo: REPO,
      path: WORKTREE_PATH,
      name: "Worktree: wt8"
    });
    expect(recordRecentAction).toHaveBeenCalledTimes(1);
    expect(recordRecentAction).toHaveBeenCalledWith(REPO, "ref.openTerminal");
  });

  it("copies the worktree path without recording a recent action (TC-010)", () => {
    // Case: TC-010
    const items = menu.buildDetachedWorktreeContextMenuItems(REPO, WORKTREE_PATH);

    getItem(items, TITLE_COPY_PATH).onClick();

    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(vscode.postMessage).mock.calls[0][0]).toStrictEqual({
      command: "copyToClipboard",
      type: "worktreePath",
      data: WORKTREE_PATH
    });
    expect(recordRecentAction).toHaveBeenCalledTimes(0);
  });

  it("asks for confirmation before sending any removal request (TC-011)", () => {
    // Case: TC-011
    // When: Remove Worktree is clicked
    openRemoveConfirmation(WORKTREE_PATH_WITH_SPACE);

    // Then: Only the confirmation dialog is opened, with the escaped path and no source element
    expect(dialogs.showConfirmationDialog).toHaveBeenCalledTimes(1);
    const [message, , sourceElem] = vi.mocked(dialogs.showConfirmationDialog).mock.calls[0];
    expect(message).toBe(
      "Are you sure you want to remove the worktree at '&#x2F;tmp&#x2F;my worktree&#x2F;wt8'?"
    );
    expect(sourceElem).toBeNull();
    expect(dialogs.showFormDialog).toHaveBeenCalledTimes(0);
    expect(vscode.postMessage).toHaveBeenCalledTimes(0);
    expect(recordRecentAction).toHaveBeenCalledTimes(0);
  });

  it("renders a Yes / No dialog showing the path without a checkbox (TC-012)", () => {
    // Case: TC-012
    openRemoveConfirmation(WORKTREE_PATH_WITH_SPACE);

    expect(getDialog().textContent).toContain(`'${WORKTREE_PATH_WITH_SPACE}'`);
    expect(document.getElementById("dialogAction")!.textContent).toBe("Yes");
    expect(document.getElementById("dialogDismiss")!.textContent).toBe("No");
    expect(getDialog().querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it("sends one removal request without a branch name after Yes (TC-013)", () => {
    // Case: TC-013
    openRemoveConfirmation(WORKTREE_PATH_WITH_SPACE);

    document.getElementById("dialogAction")!.click();

    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(vscode.postMessage).mock.calls[0][0]).toStrictEqual({
      command: "removeWorktree",
      repo: REPO,
      worktreePath: WORKTREE_PATH_WITH_SPACE,
      deleteBranch: false
    });
    expect(getDialog().className).toBe("");
  });

  it("sends nothing and closes the dialog after No (TC-014)", () => {
    // Case: TC-014
    openRemoveConfirmation(WORKTREE_PATH_WITH_SPACE);

    document.getElementById("dialogDismiss")!.click();

    expect(vscode.postMessage).toHaveBeenCalledTimes(0);
    expect(getDialog().className).toBe("");
  });

  it("sends nothing when the dialog is closed without an answer (TC-015)", () => {
    // Case: TC-015
    openRemoveConfirmation(WORKTREE_PATH_WITH_SPACE);

    dialogs.hideDialog();

    expect(vscode.postMessage).toHaveBeenCalledTimes(0);
    expect(document.getElementById("dialogAction")).toBeNull();
  });

  it("shows markup in the path as text and sends the original path (TC-016)", () => {
    // Case: TC-016
    openRemoveConfirmation(WORKTREE_PATH_WITH_MARKUP);

    // Then: The path is rendered as text, not as an element
    expect(document.querySelectorAll("script")).toHaveLength(0);
    expect(getDialog().textContent).toContain(`'${WORKTREE_PATH_WITH_MARKUP}'`);

    document.getElementById("dialogAction")!.click();

    expect(document.querySelectorAll("script")).toHaveLength(0);
    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    const request = vi.mocked(vscode.postMessage).mock.calls[0][0];
    expect(request.worktreePath).toBe(WORKTREE_PATH_WITH_MARKUP);
  });

  it("keeps entity-like text in the path literal in the dialog and the request (TC-017)", () => {
    // Case: TC-017
    openRemoveConfirmation(WORKTREE_PATH_WITH_ENTITY);

    // Then: "&quot;" stays as written instead of being decoded to a double quote
    expect(getDialog().textContent).toContain(WORKTREE_PATH_WITH_ENTITY);

    document.getElementById("dialogAction")!.click();

    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    const request = vi.mocked(vscode.postMessage).mock.calls[0][0];
    expect(request.worktreePath).toBe(WORKTREE_PATH_WITH_ENTITY);
  });

  it("names the terminal after the final component of a path with a trailing slash (TC-019)", () => {
    // Case: TC-019
    clickTerminalItemOfDetachedMenu("/tmp/wt8/");

    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(vscode.postMessage).mock.calls[0][0].name).toBe("Worktree: wt8");
  });

  it("names the terminal after the final component of a backslash path (TC-020)", () => {
    // Case: TC-020
    clickTerminalItemOfDetachedMenu("C:\\wt\\x\\");

    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(vscode.postMessage).mock.calls[0][0].name).toBe("Worktree: x");
  });

  it("names the terminal after the whole path for the root path (TC-021)", () => {
    // Case: TC-021
    clickTerminalItemOfDetachedMenu("/");

    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(vscode.postMessage).mock.calls[0][0].name).toBe("Worktree: /");
  });
});

// @see docs/testing/perspectives/web/worktreeMenu-test.md
describe("buildWorktreeActionItems", () => {
  it("names the terminal after the given label instead of the path (TC-018)", () => {
    // Case: TC-018
    const items = menu.buildWorktreeActionItems(REPO, WORKTREE_PATH, "feature/x");

    getItem(items, TITLE_OPEN_TERMINAL).onClick();

    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(vscode.postMessage).mock.calls[0][0].name).toBe("Worktree: feature/x");
  });
});
