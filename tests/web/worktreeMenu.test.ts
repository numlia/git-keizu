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

// S2: getWorktreeLabelName() / buildWorktreeActionItems() /
// buildDetachedWorktreeContextMenuItems() detached worktree menu contract with confirmed removal
// recorded in Recent actions
// @see docs/testing/perspectives/web/worktreeMenu-test.md
describe("getWorktreeLabelName", () => {
  it("returns the final path component (TC-022)", () => {
    // Case: TC-022
    expect(menu.getWorktreeLabelName("/tmp/wt8")).toBe("wt8");
  });

  it("ignores a trailing slash (TC-023)", () => {
    // Case: TC-023
    expect(menu.getWorktreeLabelName("/tmp/wt8/")).toBe("wt8");
  });

  it("ignores a trailing backslash on a Windows path (TC-024)", () => {
    // Case: TC-024
    expect(menu.getWorktreeLabelName("C:\\wt\\x\\")).toBe("x");
  });

  it("falls back to the whole path when the final component is empty (TC-025)", () => {
    // Case: TC-025
    expect(menu.getWorktreeLabelName("/")).toBe("/");
  });

  it("falls back to the whole path for a lone backslash (TC-026)", () => {
    // Case: TC-026
    expect(menu.getWorktreeLabelName("\\")).toBe("\\");
  });
});

// @see docs/testing/perspectives/web/worktreeMenu-test.md
describe("buildDetachedWorktreeContextMenuItems", () => {
  it("lists the four worktree actions, a divider and Remove Worktree in order with history IDs on all but Copy (TC-027)", () => {
    // Case: TC-027
    // When: The detached worktree menu is built
    const items = menu.buildDetachedWorktreeContextMenuItems(REPO, WORKTREE_PATH);

    // Then: Six elements in the confirmed order, with history IDs on the first three and Remove Worktree
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
    expect(getRecentActionId(items[5])).toBe("ref.removeWorktree");
  });

  it("requests opening the worktree in a new window and records the action (TC-028)", () => {
    // Case: TC-028
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

  it("requests revealing the worktree in the file manager and records the action (TC-029)", () => {
    // Case: TC-029
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

  it("requests a terminal named after the final path component and records the action (TC-030)", () => {
    // Case: TC-030
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

  it("copies the worktree path without recording a recent action (TC-031)", () => {
    // Case: TC-031
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

  it("asks for confirmation before sending any removal request (TC-032)", () => {
    // Case: TC-032
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

  it("renders a Yes / No dialog showing the path without a checkbox (TC-033)", () => {
    // Case: TC-033
    openRemoveConfirmation(WORKTREE_PATH_WITH_SPACE);

    expect(getDialog().textContent).toContain(`'${WORKTREE_PATH_WITH_SPACE}'`);
    expect(document.getElementById("dialogAction")!.textContent).toBe("Yes");
    expect(document.getElementById("dialogDismiss")!.textContent).toBe("No");
    expect(getDialog().querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it("records Remove Worktree once and then sends one removal request without a branch name after Yes (TC-034)", () => {
    // Case: TC-034
    openRemoveConfirmation(WORKTREE_PATH_WITH_SPACE);

    document.getElementById("dialogAction")!.click();

    // Then: The removal is recorded exactly once, before the unchanged removal request
    expect(recordRecentAction).toHaveBeenCalledTimes(1);
    expect(recordRecentAction).toHaveBeenCalledWith(REPO, "ref.removeWorktree");
    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(recordRecentAction).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(vscode.postMessage).mock.invocationCallOrder[0]
    );
    expect(vi.mocked(vscode.postMessage).mock.calls[0][0]).toStrictEqual({
      command: "removeWorktree",
      repo: REPO,
      worktreePath: WORKTREE_PATH_WITH_SPACE,
      deleteBranch: false
    });
    expect(getDialog().className).toBe("");
  });

  it("records and sends nothing and closes the dialog after No (TC-035)", () => {
    // Case: TC-035
    openRemoveConfirmation(WORKTREE_PATH_WITH_SPACE);

    document.getElementById("dialogDismiss")!.click();

    expect(vscode.postMessage).toHaveBeenCalledTimes(0);
    expect(recordRecentAction).toHaveBeenCalledTimes(0);
    expect(getDialog().className).toBe("");
  });

  it("records and sends nothing when the dialog is closed without an answer (TC-036)", () => {
    // Case: TC-036
    openRemoveConfirmation(WORKTREE_PATH_WITH_SPACE);

    dialogs.hideDialog();

    expect(vscode.postMessage).toHaveBeenCalledTimes(0);
    expect(recordRecentAction).toHaveBeenCalledTimes(0);
    expect(document.getElementById("dialogAction")).toBeNull();
  });

  it("shows markup in the path as text and sends the original path (TC-037)", () => {
    // Case: TC-037
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

  it("keeps entity-like text in the path literal in the dialog and the request (TC-038)", () => {
    // Case: TC-038
    openRemoveConfirmation(WORKTREE_PATH_WITH_ENTITY);

    // Then: "&quot;" stays as written instead of being decoded to a double quote
    expect(getDialog().textContent).toContain(WORKTREE_PATH_WITH_ENTITY);

    document.getElementById("dialogAction")!.click();

    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    const request = vi.mocked(vscode.postMessage).mock.calls[0][0];
    expect(request.worktreePath).toBe(WORKTREE_PATH_WITH_ENTITY);
  });

  it("names the terminal after the final component of a path with a trailing slash (TC-040)", () => {
    // Case: TC-040
    clickTerminalItemOfDetachedMenu("/tmp/wt8/");

    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(vscode.postMessage).mock.calls[0][0].name).toBe("Worktree: wt8");
  });

  it("names the terminal after the final component of a backslash path (TC-041)", () => {
    // Case: TC-041
    clickTerminalItemOfDetachedMenu("C:\\wt\\x\\");

    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(vscode.postMessage).mock.calls[0][0].name).toBe("Worktree: x");
  });

  it("names the terminal after the whole path for the root path (TC-042)", () => {
    // Case: TC-042
    clickTerminalItemOfDetachedMenu("/");

    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(vscode.postMessage).mock.calls[0][0].name).toBe("Worktree: /");
  });
});

// @see docs/testing/perspectives/web/worktreeMenu-test.md
describe("buildWorktreeActionItems", () => {
  it("names the terminal after the given label instead of the path (TC-039)", () => {
    // Case: TC-039
    const items = menu.buildWorktreeActionItems(REPO, WORKTREE_PATH, "feature/x");

    getItem(items, TITLE_OPEN_TERMINAL).onClick();

    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(vscode.postMessage).mock.calls[0][0].name).toBe("Worktree: feature/x");
  });
});
