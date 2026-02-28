// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { GitCommitDetails, GitCommitNode, GitCommitStash } from "../../src/types";
import { UNCOMMITTED_CHANGES_HASH } from "../../src/types";

/* ------------------------------------------------------------------ */
/* Hoisted mocks (shared references for mock factories + assertions)  */
/* ------------------------------------------------------------------ */

const { mockFindWidgetInstance, capturedConfig } = vi.hoisted(() => ({
  capturedConfig: { ref: null as Record<string, unknown> | null },
  mockFindWidgetInstance: {
    show: vi.fn(),
    close: vi.fn(),
    isVisible: vi.fn(() => false),
    refresh: vi.fn(),
    setInputEnabled: vi.fn(),
    getState: vi.fn(() => ({
      text: "",
      currentHash: null,
      visible: false,
      caseSensitive: false,
      regex: false
    })),
    restoreState: vi.fn(),
    getCurrentHash: vi.fn(() => null)
  }
}));

/* ------------------------------------------------------------------ */
/* Mock: dialogs module (prevents document.getElementById side effect) */
/* ------------------------------------------------------------------ */

vi.mock("../../web/dialogs", () => ({
  showCheckboxDialog: vi.fn(),
  showConfirmationDialog: vi.fn(),
  showRefInputDialog: vi.fn(),
  showFormDialog: vi.fn(),
  showSelectDialog: vi.fn(),
  showErrorDialog: vi.fn(),
  showActionRunningDialog: vi.fn(),
  hideDialog: vi.fn(),
  isDialogActive: vi.fn(() => false)
}));

/* ------------------------------------------------------------------ */
/* Mock: findWidget module                                            */
/* ------------------------------------------------------------------ */

vi.mock("../../web/findWidget", () => ({
  FindWidget: vi.fn(function () {
    return mockFindWidgetInstance;
  })
}));

/* ------------------------------------------------------------------ */
/* Mock: graph module                                                 */
/* ------------------------------------------------------------------ */

vi.mock("../../web/graph", () => ({
  Graph: vi.fn(function (_elemId: string, config: Record<string, unknown>) {
    capturedConfig.ref = config;
    return {
      loadCommits: vi.fn(),
      render: vi.fn(),
      clear: vi.fn(),
      getVertexColour: vi.fn(() => 0),
      getWidth: vi.fn(() => 100),
      getHeight: vi.fn(() => 500),
      limitMaxWidth: vi.fn()
    };
  })
}));

/* ------------------------------------------------------------------ */
/* Mock: dropdown module                                              */
/* ------------------------------------------------------------------ */

const { mockRepoDropdownInstance, mockBranchDropdownInstance } = vi.hoisted(() => ({
  mockRepoDropdownInstance: {
    setOptions: vi.fn(),
    refresh: vi.fn(),
    isOpen: vi.fn(() => false),
    close: vi.fn()
  },
  mockBranchDropdownInstance: {
    setOptions: vi.fn(),
    refresh: vi.fn(),
    isOpen: vi.fn(() => false),
    close: vi.fn()
  }
}));

let dropdownCallCount = 0;
vi.mock("../../web/dropdown", () => ({
  Dropdown: vi.fn(function () {
    dropdownCallCount++;
    // First Dropdown instance is repoDropdown, second is branchDropdown
    return dropdownCallCount % 2 === 1 ? mockRepoDropdownInstance : mockBranchDropdownInstance;
  })
}));

/* ------------------------------------------------------------------ */
/* Mock: contextMenu module                                           */
/* ------------------------------------------------------------------ */

vi.mock("../../web/contextMenu", () => ({
  hideContextMenu: vi.fn(),
  hideContextMenuListener: vi.fn(),
  isContextMenuActive: vi.fn(() => false),
  showContextMenu: vi.fn()
}));

/* ------------------------------------------------------------------ */
/* Mock: branchLabels module                                          */
/* ------------------------------------------------------------------ */

vi.mock("../../web/branchLabels", () => ({
  getBranchLabels: vi.fn(() => ({ heads: [], remotes: [], tags: [] }))
}));

/* ------------------------------------------------------------------ */
/* Mock: dates module                                                 */
/* ------------------------------------------------------------------ */

vi.mock("../../web/dates", () => ({
  getCommitDate: vi.fn(() => ({ title: "2026-01-01", value: "2026-01-01" }))
}));

/* ------------------------------------------------------------------ */
/* Mock: fileTree module                                              */
/* ------------------------------------------------------------------ */

vi.mock("../../web/fileTree", () => ({
  alterGitFileTree: vi.fn(),
  generateGitFileTree: vi.fn(() => ({
    type: "folder",
    name: "",
    folderPath: "",
    contents: {},
    open: true
  })),
  generateGitFileTreeHtml: vi.fn(() => "<table></table>")
}));

import { hideContextMenu, isContextMenuActive } from "../../web/contextMenu";
import {
  hideDialog,
  isDialogActive,
  showCheckboxDialog,
  showConfirmationDialog,
  showErrorDialog,
  showFormDialog,
  showRefInputDialog,
  showSelectDialog
} from "../../web/dialogs";
import { generateGitFileTreeHtml } from "../../web/fileTree";
import { buildStashContextMenuItems } from "../../web/stashMenu";
import { buildUncommittedContextMenuItems } from "../../web/uncommittedMenu";
import {
  buildCommitRowAttributes,
  buildStashSelectorDisplay,
  escapeHtml,
  refreshGraphOrDisplayError,
  sendMessage,
  vscode
} from "../../web/utils";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeStash(overrides: Partial<GitCommitStash> = {}): GitCommitStash {
  return {
    selector: "stash@{0}",
    baseHash: "abc123",
    untrackedFilesHash: null,
    ...overrides
  };
}

/* ------------------------------------------------------------------ */
/* Tests: Stash row rendering (Task 3.4)                              */
/* ------------------------------------------------------------------ */

describe("buildCommitRowAttributes", () => {
  it("includes 'commit' and 'stash' CSS classes for stash commit (TC-001)", () => {
    // Given: a commit node with stash !== null
    const hash = "abc123def456";
    const stash = makeStash();

    // When: row attributes are generated
    const result = buildCommitRowAttributes(hash, stash);

    // Then: CSS classes contain both "commit" and "stash"
    expect(result).toContain('class="commit stash"');
  });

  it("includes data-hash attribute with commit hash for stash commit (TC-004)", () => {
    // Given: a stash commit with a specific hash
    const hash = "abc123def456";
    const stash = makeStash();

    // When: row attributes are generated
    const result = buildCommitRowAttributes(hash, stash);

    // Then: data-hash attribute contains the commit hash
    expect(result).toContain(`data-hash="${hash}"`);
  });

  it("does not include 'stash' CSS class for non-stash commit (TC-005)", () => {
    // Given: a commit node with stash === null (regular commit)
    const hash = "abc123def456";

    // When: row attributes are generated
    const result = buildCommitRowAttributes(hash, null);

    // Then: CSS class contains "commit" but NOT "stash"
    expect(result).toContain('class="commit"');
    expect(result).not.toContain("stash");
  });

  it("returns unsavedChanges class with data-hash for uncommitted changes hash", () => {
    // Given: the uncommitted changes hash
    // When: row attributes are generated
    const result = buildCommitRowAttributes(UNCOMMITTED_CHANGES_HASH, null);

    // Then: class is "unsavedChanges" with data-hash="*"
    expect(result).toContain('class="unsavedChanges"');
    expect(result).toContain(`data-hash="${UNCOMMITTED_CHANGES_HASH}"`);
  });
});

describe("buildStashSelectorDisplay", () => {
  it("extracts @{0} from stash@{0} (TC-002)", () => {
    // Given: selector is "stash@{0}"
    const selector = "stash@{0}";

    // When: selector display is generated
    const display = buildStashSelectorDisplay(selector);

    // Then: "@{0}" is returned (stash prefix removed)
    expect(display).toBe("@{0}");
  });

  it("extracts @{12} from stash@{12} for multi-digit index (TC-003)", () => {
    // Given: selector is "stash@{12}" (multi-digit index)
    const selector = "stash@{12}";

    // When: selector display is generated
    const display = buildStashSelectorDisplay(selector);

    // Then: "@{12}" is returned
    expect(display).toBe("@{12}");
  });

  it("produces HTML-safe output when combined with escapeHtml", () => {
    // Given: selector display with characters that escapeHtml processes
    const selector = "stash@{0}";
    const display = escapeHtml(buildStashSelectorDisplay(selector));

    // Then: output is safe and matches expected display
    expect(display).toBe("@{0}");
  });
});

/* ------------------------------------------------------------------ */
/* Tests: Stash context menu (Task 4.4)                               */
/* ------------------------------------------------------------------ */

const MOCK_REPO = "/path/to/repo";
const MOCK_HASH = "abc123def456";
const MOCK_SELECTOR = "stash@{0}";
const MOCK_SOURCE_ELEM = {} as HTMLElement;

describe("buildStashContextMenuItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(vscode.postMessage).mockClear();
  });

  it("returns 7 items (4 actions + separator + 2 copy) for stash context menu (TC-006)", () => {
    // Given: stash !== null commit row
    // When: stash context menu items are built
    const items = buildStashContextMenuItems(MOCK_REPO, MOCK_HASH, MOCK_SELECTOR, MOCK_SOURCE_ELEM);

    // Then: 7 items including separator (null)
    expect(items).toHaveLength(7);
    expect(items[0]).not.toBeNull();
    expect(items[1]).not.toBeNull();
    expect(items[2]).not.toBeNull();
    expect(items[3]).not.toBeNull();
    expect(items[4]).toBeNull();
    expect(items[5]).not.toBeNull();
    expect(items[6]).not.toBeNull();

    // Verify menu item titles
    expect(items[0]!.title).toContain("Apply Stash");
    expect(items[1]!.title).toContain("Create Branch from Stash");
    expect(items[2]!.title).toContain("Pop Stash");
    expect(items[3]!.title).toContain("Drop Stash");
    expect(items[5]!.title).toBe("Copy Stash Name to Clipboard");
    expect(items[6]!.title).toBe("Copy Stash Hash to Clipboard");
  });

  it("shows checkbox dialog with 'Reinstate Index' default false when Apply is clicked (TC-007)", () => {
    // Given: stash context menu items
    const items = buildStashContextMenuItems(MOCK_REPO, MOCK_HASH, MOCK_SELECTOR, MOCK_SOURCE_ELEM);

    // When: "Apply Stash..." is clicked
    items[0]!.onClick();

    // Then: showCheckboxDialog is called with "Reinstate Index" and default false
    expect(showCheckboxDialog).toHaveBeenCalledTimes(1);
    const call = vi.mocked(showCheckboxDialog).mock.calls[0];
    expect(call[1]).toBe("Reinstate Index");
    expect(call[2]).toBe(false);
  });

  it("sends applyStash with reinstateIndex: true when confirmed with Reinstate Index ON (TC-008)", () => {
    // Given: stash context menu items
    const items = buildStashContextMenuItems(MOCK_REPO, MOCK_HASH, MOCK_SELECTOR, MOCK_SOURCE_ELEM);
    items[0]!.onClick();

    // When: dialog is confirmed with reinstateIndex = true
    const onConfirm = vi.mocked(showCheckboxDialog).mock.calls[0][4];
    onConfirm(true);

    // Then: applyStash message is sent with reinstateIndex: true
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "applyStash",
      repo: MOCK_REPO,
      selector: MOCK_SELECTOR,
      reinstateIndex: true
    });
  });

  it("sends applyStash with reinstateIndex: false when confirmed with Reinstate Index OFF (TC-009)", () => {
    // Given: stash context menu items
    const items = buildStashContextMenuItems(MOCK_REPO, MOCK_HASH, MOCK_SELECTOR, MOCK_SOURCE_ELEM);
    items[0]!.onClick();

    // When: dialog is confirmed with reinstateIndex = false
    const onConfirm = vi.mocked(showCheckboxDialog).mock.calls[0][4];
    onConfirm(false);

    // Then: applyStash message is sent with reinstateIndex: false
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "applyStash",
      repo: MOCK_REPO,
      selector: MOCK_SELECTOR,
      reinstateIndex: false
    });
  });

  it("sends popStash message when Pop is confirmed (TC-010)", () => {
    // Given: stash context menu items
    const items = buildStashContextMenuItems(MOCK_REPO, MOCK_HASH, MOCK_SELECTOR, MOCK_SOURCE_ELEM);

    // When: "Pop Stash..." is clicked and confirmed
    items[2]!.onClick();
    expect(showCheckboxDialog).toHaveBeenCalledTimes(1);
    const onConfirm = vi.mocked(showCheckboxDialog).mock.calls[0][4];
    onConfirm(false);

    // Then: popStash message is sent
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "popStash",
      repo: MOCK_REPO,
      selector: MOCK_SELECTOR,
      reinstateIndex: false
    });
  });

  it("shows confirmation dialog when Drop is clicked (TC-011)", () => {
    // Given: stash context menu items
    const items = buildStashContextMenuItems(MOCK_REPO, MOCK_HASH, MOCK_SELECTOR, MOCK_SOURCE_ELEM);

    // When: "Drop Stash..." is clicked
    items[3]!.onClick();

    // Then: showConfirmationDialog is called
    expect(showConfirmationDialog).toHaveBeenCalledTimes(1);
  });

  it("sends dropStash message when Drop is confirmed (TC-012)", () => {
    // Given: stash context menu items
    const items = buildStashContextMenuItems(MOCK_REPO, MOCK_HASH, MOCK_SELECTOR, MOCK_SOURCE_ELEM);
    items[3]!.onClick();

    // When: confirmation dialog is confirmed
    const onConfirm = vi.mocked(showConfirmationDialog).mock.calls[0][1];
    onConfirm();

    // Then: dropStash message is sent
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "dropStash",
      repo: MOCK_REPO,
      selector: MOCK_SELECTOR
    });
  });

  it("shows ref input dialog when Create Branch is clicked (TC-013)", () => {
    // Given: stash context menu items
    const items = buildStashContextMenuItems(MOCK_REPO, MOCK_HASH, MOCK_SELECTOR, MOCK_SOURCE_ELEM);

    // When: "Create Branch from Stash..." is clicked
    items[1]!.onClick();

    // Then: showRefInputDialog is called
    expect(showRefInputDialog).toHaveBeenCalledTimes(1);
  });

  it("sends branchFromStash message when Branch dialog is confirmed (TC-014)", () => {
    // Given: stash context menu items
    const items = buildStashContextMenuItems(MOCK_REPO, MOCK_HASH, MOCK_SELECTOR, MOCK_SOURCE_ELEM);
    items[1]!.onClick();

    // When: branch name is entered and confirmed
    const onConfirm = vi.mocked(showRefInputDialog).mock.calls[0][3];
    onConfirm("new-branch-from-stash");

    // Then: branchFromStash message is sent
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "branchFromStash",
      repo: MOCK_REPO,
      branchName: "new-branch-from-stash",
      selector: MOCK_SELECTOR
    });
  });

  it("sends copyToClipboard with Stash Name when Copy Name is clicked (TC-015)", () => {
    // Given: stash context menu items
    const items = buildStashContextMenuItems(MOCK_REPO, MOCK_HASH, MOCK_SELECTOR, MOCK_SOURCE_ELEM);

    // When: "Copy Stash Name to Clipboard" is clicked
    items[5]!.onClick();

    // Then: copyToClipboard message is sent with type "Stash Name"
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "copyToClipboard",
      type: "Stash Name",
      data: MOCK_SELECTOR
    });
  });

  it("sends copyToClipboard with Stash Hash when Copy Hash is clicked (TC-016)", () => {
    // Given: stash context menu items
    const items = buildStashContextMenuItems(MOCK_REPO, MOCK_HASH, MOCK_SELECTOR, MOCK_SOURCE_ELEM);

    // When: "Copy Stash Hash to Clipboard" is clicked
    items[6]!.onClick();

    // Then: copyToClipboard message is sent with type "Stash Hash"
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "copyToClipboard",
      type: "Stash Hash",
      data: MOCK_HASH
    });
  });
});

/* ------------------------------------------------------------------ */
/* Tests: Uncommitted Changes context menu (Task 5.4)                 */
/* ------------------------------------------------------------------ */

describe("buildUncommittedContextMenuItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(vscode.postMessage).mockClear();
  });

  it("returns 3 items (Stash, Reset, Clean) for uncommitted context menu (TC-017)", () => {
    // Given: Uncommitted Changes row
    // When: uncommitted context menu items are built
    const items = buildUncommittedContextMenuItems(MOCK_REPO, MOCK_SOURCE_ELEM);

    // Then: 3 menu items
    expect(items).toHaveLength(3);
    expect(items[0]).not.toBeNull();
    expect(items[1]).not.toBeNull();
    expect(items[2]).not.toBeNull();

    // Verify menu item titles
    expect(items[0]!.title).toContain("Stash uncommitted changes");
    expect(items[1]!.title).toContain("Reset uncommitted changes");
    expect(items[2]!.title).toContain("Clean untracked files");
  });

  it("shows form dialog with message input and Include Untracked checkbox when Stash is clicked (TC-018)", () => {
    // Given: uncommitted context menu items
    const items = buildUncommittedContextMenuItems(MOCK_REPO, MOCK_SOURCE_ELEM);

    // When: "Stash uncommitted changes..." is clicked
    items[0]!.onClick();

    // Then: showFormDialog is called with text input and checkbox input
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const call = vi.mocked(showFormDialog).mock.calls[0];
    expect(call[0]).toContain("Stash uncommitted changes");
    const inputs = call[1];
    expect(inputs).toHaveLength(2);
    expect(inputs[0].type).toBe("text");
    expect(inputs[0].name).toBe("Message: ");
    expect(inputs[1].type).toBe("checkbox");
    expect(inputs[1].name).toBe("Include Untracked");
  });

  it("sends pushStash with message and includeUntracked: true when Stash confirmed with options (TC-019)", () => {
    // Given: uncommitted context menu items
    const items = buildUncommittedContextMenuItems(MOCK_REPO, MOCK_SOURCE_ELEM);
    items[0]!.onClick();

    // When: form dialog is confirmed with message and Include Untracked ON
    const onConfirm = vi.mocked(showFormDialog).mock.calls[0][3];
    onConfirm(["WIP: work in progress", "checked"]);

    // Then: pushStash message is sent with message and includeUntracked: true
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "pushStash",
      repo: MOCK_REPO,
      message: "WIP: work in progress",
      includeUntracked: true
    });
  });

  it("sends pushStash with empty message and includeUntracked: false when Stash confirmed with defaults (TC-020)", () => {
    // Given: uncommitted context menu items
    const items = buildUncommittedContextMenuItems(MOCK_REPO, MOCK_SOURCE_ELEM);
    items[0]!.onClick();

    // When: form dialog is confirmed with empty message and Include Untracked OFF
    const onConfirm = vi.mocked(showFormDialog).mock.calls[0][3];
    onConfirm(["", "unchecked"]);

    // Then: pushStash message is sent with empty message and includeUntracked: false
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "pushStash",
      repo: MOCK_REPO,
      message: "",
      includeUntracked: false
    });
  });

  it("shows select dialog with Mixed and Hard options when Reset is clicked (TC-021)", () => {
    // Given: uncommitted context menu items
    const items = buildUncommittedContextMenuItems(MOCK_REPO, MOCK_SOURCE_ELEM);

    // When: "Reset uncommitted changes..." is clicked
    items[1]!.onClick();

    // Then: showSelectDialog is called with Mixed and Hard options
    expect(showSelectDialog).toHaveBeenCalledTimes(1);
    const call = vi.mocked(showSelectDialog).mock.calls[0];
    expect(call[0]).toContain("reset uncommitted changes");
    expect(call[1]).toBe("mixed");
    const options = call[2];
    expect(options).toHaveLength(2);
    expect(options[0].value).toBe("mixed");
    expect(options[1].value).toBe("hard");
  });

  it("sends resetUncommitted with mode: mixed after select and confirmation (TC-022)", () => {
    // Given: uncommitted context menu items
    const items = buildUncommittedContextMenuItems(MOCK_REPO, MOCK_SOURCE_ELEM);
    items[1]!.onClick();

    // When: "Mixed" is selected in the select dialog
    const onSelect = vi.mocked(showSelectDialog).mock.calls[0][4];
    onSelect("mixed");

    // Then: confirmation dialog is shown
    expect(showConfirmationDialog).toHaveBeenCalledTimes(1);
    const confirmCall = vi.mocked(showConfirmationDialog).mock.calls[0];
    expect(confirmCall[0]).toContain("mixed");

    // When: confirmation dialog is confirmed
    confirmCall[1]();

    // Then: resetUncommitted message is sent with mode: "mixed"
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "resetUncommitted",
      repo: MOCK_REPO,
      mode: "mixed"
    });
  });

  it("sends resetUncommitted with mode: hard after select and confirmation (TC-023)", () => {
    // Given: uncommitted context menu items
    const items = buildUncommittedContextMenuItems(MOCK_REPO, MOCK_SOURCE_ELEM);
    items[1]!.onClick();

    // When: "Hard" is selected in the select dialog
    const onSelect = vi.mocked(showSelectDialog).mock.calls[0][4];
    onSelect("hard");

    // Then: confirmation dialog is shown with hard mode warning
    expect(showConfirmationDialog).toHaveBeenCalledTimes(1);
    const confirmCall = vi.mocked(showConfirmationDialog).mock.calls[0];
    expect(confirmCall[0]).toContain("hard");
    expect(confirmCall[0]).toContain("cannot be undone");

    // When: confirmation dialog is confirmed
    confirmCall[1]();

    // Then: resetUncommitted message is sent with mode: "hard"
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "resetUncommitted",
      repo: MOCK_REPO,
      mode: "hard"
    });
  });

  it("shows checkbox dialog with 'Clean untracked directories' default false when Clean is clicked (TC-024)", () => {
    // Given: uncommitted context menu items
    const items = buildUncommittedContextMenuItems(MOCK_REPO, MOCK_SOURCE_ELEM);

    // When: "Clean untracked files..." is clicked
    items[2]!.onClick();

    // Then: showCheckboxDialog is called with "Clean untracked directories" and default false
    expect(showCheckboxDialog).toHaveBeenCalledTimes(1);
    const call = vi.mocked(showCheckboxDialog).mock.calls[0];
    expect(call[0]).toContain("clean untracked files");
    expect(call[1]).toBe("Clean untracked directories");
    expect(call[2]).toBe(false);
  });

  it("sends cleanUntrackedFiles with directories: true when Clean confirmed with option ON (TC-025)", () => {
    // Given: uncommitted context menu items
    const items = buildUncommittedContextMenuItems(MOCK_REPO, MOCK_SOURCE_ELEM);
    items[2]!.onClick();

    // When: checkbox dialog is confirmed with directories = true
    const onConfirm = vi.mocked(showCheckboxDialog).mock.calls[0][4];
    onConfirm(true);

    // Then: cleanUntrackedFiles message is sent with directories: true
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "cleanUntrackedFiles",
      repo: MOCK_REPO,
      directories: true
    });
  });

  it("sends cleanUntrackedFiles with directories: false when Clean confirmed with option OFF (TC-026)", () => {
    // Given: uncommitted context menu items
    const items = buildUncommittedContextMenuItems(MOCK_REPO, MOCK_SOURCE_ELEM);
    items[2]!.onClick();

    // When: checkbox dialog is confirmed with directories = false
    const onConfirm = vi.mocked(showCheckboxDialog).mock.calls[0][4];
    onConfirm(false);

    // Then: cleanUntrackedFiles message is sent with directories: false
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "cleanUntrackedFiles",
      repo: MOCK_REPO,
      directories: false
    });
  });
});

/* ------------------------------------------------------------------ */
/* Tests: Fetch button and response handler (Task 6.2)                */
/* ------------------------------------------------------------------ */

describe("fetch button message", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(vscode.postMessage).mockClear();
  });

  it("sends fetch message with correct format including repo (TC-027)", () => {
    // Given: fetch button is clicked (simulated via sendMessage)
    const repo = "/test/repo";

    // When: sendMessage is called with fetch command (as the button handler does)
    sendMessage({ command: "fetch", repo });

    // Then: postMessage is called with { command: "fetch", repo }
    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "fetch",
      repo
    });
  });
});

describe("refreshGraphOrDisplayError", () => {
  let mockRefresh: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefresh = vi.fn();
  });

  it("calls onRefresh when status is null (TC-028)", () => {
    // Given: fetch response with status === null (success)
    const status = null;
    const errorMessage = "Unable to Fetch";

    // When: refreshGraphOrDisplayError is called
    refreshGraphOrDisplayError(status, errorMessage, mockRefresh, vi.mocked(showErrorDialog));

    // Then: onRefresh (graph refresh) is called, error dialog is NOT shown
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("calls showErrorDialog when status is an error message (TC-029)", () => {
    // Given: fetch response with status === "error message" (failure)
    const status = "fatal: Could not resolve host";
    const errorMessage = "Unable to Fetch";

    // When: refreshGraphOrDisplayError is called
    refreshGraphOrDisplayError(status, errorMessage, mockRefresh, vi.mocked(showErrorDialog));

    // Then: showErrorDialog is called with error details, onRefresh is NOT called
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(errorMessage, status, null);
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* Tests: Frontend integration — comparison mode & FindWidget (4.3)   */
/* ------------------------------------------------------------------ */

const COMMIT_HASH_1 = "aaa111aaa111aaa1";
const COMMIT_HASH_2 = "bbb222bbb222bbb2";
const COMMIT_HASH_3 = "ccc333ccc333ccc3";
const DUMMY_HASH = "ddd444ddd444ddd4";
const TEST_REPO = "/test/repo";

const MOCK_COMMITS: GitCommitNode[] = [
  {
    hash: COMMIT_HASH_1,
    parentHashes: [],
    author: "Alice",
    email: "alice@test.com",
    date: 1700000000,
    message: "First commit",
    refs: [],
    stash: null
  },
  {
    hash: COMMIT_HASH_2,
    parentHashes: [COMMIT_HASH_1],
    author: "Bob",
    email: "bob@test.com",
    date: 1700001000,
    message: "Second commit",
    refs: [],
    stash: null
  },
  {
    hash: COMMIT_HASH_3,
    parentHashes: [COMMIT_HASH_2],
    author: "Carol",
    email: "carol@test.com",
    date: 1700002000,
    message: "Third commit",
    refs: [],
    stash: null
  }
];

const MOCK_PREV_STATE: WebViewState = {
  gitRepos: { [TEST_REPO]: { columnWidths: null } },
  gitBranches: ["main"],
  gitBranchHead: "main",
  commits: MOCK_COMMITS,
  commitHead: COMMIT_HASH_1,
  avatars: {},
  currentBranch: "",
  currentRepo: TEST_REPO,
  moreCommitsAvailable: false,
  maxCommits: 300,
  showRemoteBranches: true,
  expandedCommit: null,
  findWidgetState: {
    text: "test-search",
    currentHash: null,
    visible: true,
    caseSensitive: false,
    regex: false
  }
};

function setupTestDOM(): void {
  document.body.innerHTML = [
    '<div id="scrollContainer">',
    '  <div id="commitGraph"></div>',
    '  <div id="commitTable"></div>',
    "</div>",
    '<div id="footer"></div>',
    '<div id="repoControl"><div id="repoSelect"></div></div>',
    '<div id="branchSelect"></div>',
    '<input id="showRemoteBranchesCheckbox" type="checkbox" checked />',
    '<div id="scrollShadow"></div>',
    '<div id="refreshBtn"></div>',
    '<div id="fetchBtn"></div>',
    '<div id="currentBtn"></div>',
    '<div id="searchBtn"></div>'
  ].join("");
}

function setupViewState(): void {
  (globalThis as Record<string, unknown>).viewState = {
    repos: { [TEST_REPO]: { columnWidths: null } },
    lastActiveRepo: TEST_REPO,
    dateFormat: "Date & Time",
    fetchAvatars: false,
    graphColours: ["#0085d9"],
    graphStyle: "rounded",
    initialLoadCommits: 300,
    keybindings: { find: "f", refresh: "r", scrollToHead: "h", scrollToStash: "s" },
    loadMoreCommits: 100,
    loadMoreCommitsAutomatically: true,
    showCurrentBranchByDefault: false
  };
}

function dispatchMessage(data: Record<string, unknown>): void {
  window.dispatchEvent(new MessageEvent("message", { data }));
}

function loadTestCommits(): void {
  // Respond to the auto-request for branches
  dispatchMessage({
    command: "loadBranches",
    branches: ["main"],
    head: "main",
    hard: false,
    isRepo: true
  });
  // Respond to the auto-request for commits
  dispatchMessage({
    command: "loadCommits",
    commits: MOCK_COMMITS,
    head: COMMIT_HASH_1,
    moreCommitsAvailable: false,
    hard: false
  });
}

function resetCommitState(): void {
  // Load commits with dummy hashes to clear any expandedCommit
  const dummyCommits: GitCommitNode[] = [
    {
      hash: DUMMY_HASH,
      parentHashes: [],
      author: "Dummy",
      email: "dummy@test.com",
      date: 1700000000,
      message: "Dummy commit",
      refs: [],
      stash: null
    }
  ];
  dispatchMessage({
    command: "loadCommits",
    commits: dummyCommits,
    head: DUMMY_HASH,
    moreCommitsAvailable: false,
    hard: true
  });
  // Re-load the real commits
  dispatchMessage({
    command: "loadCommits",
    commits: MOCK_COMMITS,
    head: COMMIT_HASH_1,
    moreCommitsAvailable: false,
    hard: true
  });
  vi.clearAllMocks();
}

function clickCommit(hash: string, options?: { ctrlKey?: boolean; metaKey?: boolean }): void {
  const row = document.querySelector(`.commit[data-hash="${hash}"]`);
  if (row === null) throw new Error(`Commit row not found for hash: ${hash}`);
  row.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      ctrlKey: options?.ctrlKey ?? false,
      metaKey: options?.metaKey ?? false
    })
  );
}

function clickUnsavedChanges(options?: { ctrlKey?: boolean; metaKey?: boolean }): void {
  const row = document.querySelector(".unsavedChanges");
  if (row === null) throw new Error("Unsaved changes row not found");
  row.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      ctrlKey: options?.ctrlKey ?? false,
      metaKey: options?.metaKey ?? false
    })
  );
}

function makeCommitDetails(hash: string): GitCommitDetails {
  return {
    hash,
    parents: [],
    author: "",
    email: "",
    date: 0,
    committer: "",
    body: "",
    fileChanges: []
  };
}

/**
 * Mock table layout properties so calculateCdvHeight uses realistic values.
 * jsdom returns 0 for all clientHeight; this sets:
 *   #tableColHeaders.clientHeight = 30 → headerHeight = 31
 *   <table>.clientHeight = 103 → grid.y = (103-31)/3 = 24
 * Total CDV deduction from viewport: 31 (header) + 24 (commit row) = 55
 */
const CDV_HEIGHT_DEDUCTION = 55;

function setupTableLayoutMocks(): void {
  const headerElem = document.getElementById("tableColHeaders");
  if (headerElem) {
    Object.defineProperty(headerElem, "clientHeight", {
      value: 30,
      configurable: true
    });
  }
  const tableDiv = document.getElementById("commitTable");
  const tableBody = tableDiv?.querySelector("table");
  if (tableBody) {
    Object.defineProperty(tableBody, "clientHeight", {
      value: 103,
      configurable: true
    });
  }
  // Trigger renderGraph to update grid.y with mocked values
  window.dispatchEvent(new Event("resize"));
}

function expandCommit(hash: string): void {
  // Click the commit to request details
  clickCommit(hash);
  // Dispatch the commitDetails response
  dispatchMessage({
    command: "commitDetails",
    commitDetails: makeCommitDetails(hash)
  });
  vi.clearAllMocks();
}

function expandCommitWithCompare(fromHash: string, toHash: string): void {
  // Expand the base commit first
  expandCommit(fromHash);
  // Ctrl+click the compare target
  clickCommit(toHash, { ctrlKey: true });
  // Dispatch the compareCommits response with sample fileChanges
  dispatchMessage({
    command: "compareCommits",
    fileChanges: [
      { oldFilePath: "file.ts", newFilePath: "file.ts", type: "M", additions: 5, deletions: 2 }
    ],
    fromHash,
    toHash
  });
  vi.clearAllMocks();
}

/* ------------------------------------------------------------------ */
/* Integration: comparison mode & FindWidget (Task 4.3)               */
/* ------------------------------------------------------------------ */

describe("GitGraphView frontend integration", () => {
  let restoreStateCaptured = false;

  beforeAll(async () => {
    setupTestDOM();
    setupViewState();
    // Set prevState with findWidgetState for TC-048
    vi.mocked(vscode.getState).mockReturnValueOnce(
      MOCK_PREV_STATE as ReturnType<typeof vscode.getState>
    );
    await import("../../web/main");
    // Respond to the auto-request from constructor
    loadTestCommits();
    // Check if restoreState was called during init (for TC-048)
    restoreStateCaptured = mockFindWidgetInstance.restoreState.mock.calls.length > 0;
  });

  beforeEach(() => {
    resetCommitState();
  });

  /* ---------------------------------------------------------------- */
  /* Comparison mode state transitions                                */
  /* ---------------------------------------------------------------- */

  describe("comparison mode state transitions", () => {
    it("normal click sends commitDetails request (TC-030)", () => {
      // Given: no expanded commit, table is rendered with commits
      // When: a commit row is clicked without modifier keys
      clickCommit(COMMIT_HASH_1);

      // Then: commitDetails message is sent with the clicked commit hash
      expect(vscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "commitDetails",
          repo: TEST_REPO,
          commitHash: COMMIT_HASH_1
        })
      );
    });

    it("Ctrl+click different commit enters compare mode (TC-031)", () => {
      // Given: commit 1 is expanded
      expandCommit(COMMIT_HASH_1);

      // When: a different commit is Ctrl+clicked
      clickCommit(COMMIT_HASH_2, { ctrlKey: true });

      // Then: compareCommits message is sent with older commit as fromHash
      expect(vscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "compareCommits",
          repo: TEST_REPO,
          fromHash: COMMIT_HASH_2,
          toHash: COMMIT_HASH_1
        })
      );
    });

    it("Ctrl+click same compare target cancels comparison (TC-032)", () => {
      // Given: compare mode active between commit 1 and commit 2
      expandCommitWithCompare(COMMIT_HASH_1, COMMIT_HASH_2);

      // When: the same compare target (commit 2) is Ctrl+clicked again
      clickCommit(COMMIT_HASH_2, { ctrlKey: true });

      // Then: no compareCommits message is sent (comparison canceled)
      const compareCalls = vi
        .mocked(vscode.postMessage)
        .mock.calls.filter(
          (call) => (call[0] as Record<string, unknown>).command === "compareCommits"
        );
      expect(compareCalls).toHaveLength(0);

      // Then: compareTarget class is removed from commit 2's row
      const row2 = document.querySelector(`.commit[data-hash="${COMMIT_HASH_2}"]`);
      expect(row2).not.toBeNull();
      expect(row2!.classList.contains("compareTarget")).toBe(false);
    });

    it("Ctrl+click different commit changes comparison target (TC-033)", () => {
      // Given: compare mode active between commit 1 and commit 2
      expandCommitWithCompare(COMMIT_HASH_1, COMMIT_HASH_2);

      // When: a different commit (commit 3) is Ctrl+clicked
      clickCommit(COMMIT_HASH_3, { ctrlKey: true });

      // Then: compareCommits message is sent with older commit as fromHash
      expect(vscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "compareCommits",
          fromHash: COMMIT_HASH_3,
          toHash: COMMIT_HASH_1
        })
      );

      // Then: commit 3's row has compareTarget class
      const row3 = document.querySelector(`.commit[data-hash="${COMMIT_HASH_3}"]`);
      expect(row3).not.toBeNull();
      expect(row3!.classList.contains("compareTarget")).toBe(true);

      // Then: commit 2's row does NOT have compareTarget class
      const row2 = document.querySelector(`.commit[data-hash="${COMMIT_HASH_2}"]`);
      expect(row2).not.toBeNull();
      expect(row2!.classList.contains("compareTarget")).toBe(false);
    });

    it("normal click in compare mode cancels compare and shows new detail (TC-034)", () => {
      // Given: compare mode active between commit 1 and commit 2
      expandCommitWithCompare(COMMIT_HASH_1, COMMIT_HASH_2);

      // When: commit 3 is clicked without modifier keys (normal click)
      clickCommit(COMMIT_HASH_3);

      // Then: commitDetails message is sent for commit 3 (not compareCommits)
      expect(vscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "commitDetails",
          commitHash: COMMIT_HASH_3
        })
      );

      // Then: no compareCommits message was sent
      const compareCalls = vi
        .mocked(vscode.postMessage)
        .mock.calls.filter(
          (call) => (call[0] as Record<string, unknown>).command === "compareCommits"
        );
      expect(compareCalls).toHaveLength(0);
    });

    it("Ctrl+click without expanded commit shows normal detail (TC-035)", () => {
      // Given: no expanded commit (clean state from resetCommitState)
      // When: commit 1 is Ctrl+clicked
      clickCommit(COMMIT_HASH_1, { ctrlKey: true });

      // Then: commitDetails message is sent (normal detail, not compareCommits)
      expect(vscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "commitDetails",
          commitHash: COMMIT_HASH_1
        })
      );

      // Then: no compareCommits message was sent
      const compareCalls = vi
        .mocked(vscode.postMessage)
        .mock.calls.filter(
          (call) => (call[0] as Record<string, unknown>).command === "compareCommits"
        );
      expect(compareCalls).toHaveLength(0);
    });

    it("uncommitted changes as expanded commit + Ctrl+click sends compare with fromHash='*' (TC-036)", () => {
      // Given: commits including uncommitted changes as first entry
      const commitsWithUncommitted: GitCommitNode[] = [
        {
          hash: UNCOMMITTED_CHANGES_HASH,
          parentHashes: [],
          author: "*",
          email: "",
          date: 1700003000,
          message: "Uncommitted Changes (3)",
          refs: [],
          stash: null
        },
        ...MOCK_COMMITS
      ];
      dispatchMessage({
        command: "loadCommits",
        commits: commitsWithUncommitted,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });
      vi.clearAllMocks();

      // When: unsaved changes row is clicked to expand it
      clickUnsavedChanges();

      // Then: commitDetails request is sent for "*"
      expect(vscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "commitDetails",
          commitHash: UNCOMMITTED_CHANGES_HASH
        })
      );

      // Simulate commitDetails response for "*"
      dispatchMessage({
        command: "commitDetails",
        commitDetails: makeCommitDetails(UNCOMMITTED_CHANGES_HASH)
      });
      vi.clearAllMocks();

      // When: a regular commit is Ctrl+clicked
      clickCommit(COMMIT_HASH_1, { ctrlKey: true });

      // Then: compareCommits message is sent with fromHash = UNCOMMITTED_CHANGES_HASH
      expect(vscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "compareCommits",
          fromHash: UNCOMMITTED_CHANGES_HASH,
          toHash: COMMIT_HASH_1
        })
      );

      // Restore normal commits for subsequent tests
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });
    });
  });

  /* ---------------------------------------------------------------- */
  /* Comparison response processing                                   */
  /* ---------------------------------------------------------------- */

  describe("comparison response processing", () => {
    it("ResponseCompareCommits with fileChanges shows compare details (TC-037)", () => {
      // Given: commit 1 is expanded
      expandCommit(COMMIT_HASH_1);

      // When: Ctrl+click commit 2 and receive compareCommits response
      clickCommit(COMMIT_HASH_2, { ctrlKey: true });
      dispatchMessage({
        command: "compareCommits",
        fileChanges: [
          {
            oldFilePath: "src/app.ts",
            newFilePath: "src/app.ts",
            type: "M",
            additions: 10,
            deletions: 3
          }
        ],
        fromHash: COMMIT_HASH_1,
        toHash: COMMIT_HASH_2
      });

      // Then: commitDetails DOM element is created with "Comparing" text
      const detailsElem = document.getElementById("commitDetails");
      expect(detailsElem).not.toBeNull();
      expect(detailsElem!.innerHTML).toContain("Comparing");
    });

    it("ResponseCompareCommits with fileChanges: null shows error dialog (TC-038)", () => {
      // Given: commit 1 is expanded
      expandCommit(COMMIT_HASH_1);

      // When: Ctrl+click commit 2 and receive compareCommits response with null fileChanges
      clickCommit(COMMIT_HASH_2, { ctrlKey: true });
      vi.clearAllMocks();
      dispatchMessage({
        command: "compareCommits",
        fileChanges: null,
        fromHash: COMMIT_HASH_1,
        toHash: COMMIT_HASH_2
      });

      // Then: showErrorDialog is called with "Unable to load commit comparison"
      expect(showErrorDialog).toHaveBeenCalledTimes(1);
      expect(showErrorDialog).toHaveBeenCalledWith("Unable to load commit comparison", null, null);
    });

    it("file click in compare mode includes compareWithHash in viewDiff (TC-039)", () => {
      // Given: compare mode active with file tree HTML containing a clickable file
      expandCommit(COMMIT_HASH_1);

      // Override generateGitFileTreeHtml to return a clickable file element
      vi.mocked(generateGitFileTreeHtml).mockReturnValueOnce(
        '<table><tr class="gitFile gitDiffPossible" data-oldfilepath="old.ts" data-newfilepath="new.ts" data-type="M"><td>new.ts</td></tr></table>'
      );

      // Ctrl+click commit 2 and receive compare result
      clickCommit(COMMIT_HASH_2, { ctrlKey: true });
      dispatchMessage({
        command: "compareCommits",
        fileChanges: [
          {
            oldFilePath: "old.ts",
            newFilePath: "new.ts",
            type: "M",
            additions: 5,
            deletions: 2
          }
        ],
        fromHash: COMMIT_HASH_1,
        toHash: COMMIT_HASH_2
      });
      vi.clearAllMocks();

      // When: a file element in the commit details is clicked
      const fileElem = document.querySelector(".gitFile.gitDiffPossible");
      expect(fileElem).not.toBeNull();
      fileElem!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      // Then: viewDiff message includes compareWithHash
      expect(vscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "viewDiff",
          commitHash: COMMIT_HASH_1,
          oldFilePath: "old.ts",
          newFilePath: "new.ts",
          type: "M",
          compareWithHash: COMMIT_HASH_2
        })
      );
    });

    it("accepts ResponseCompareCommits with reordered fromHash/toHash (TC-040)", () => {
      // Given: commit 1 is expanded
      expandCommit(COMMIT_HASH_1);

      // When: Ctrl+click commit 2, then response arrives with hashes in reversed order
      clickCommit(COMMIT_HASH_2, { ctrlKey: true });
      dispatchMessage({
        command: "compareCommits",
        fileChanges: [
          {
            oldFilePath: "src/app.ts",
            newFilePath: "src/app.ts",
            type: "M",
            additions: 3,
            deletions: 1
          }
        ],
        fromHash: COMMIT_HASH_2,
        toHash: COMMIT_HASH_1
      });

      // Then: compare details are shown correctly (set-based validation accepts reordered hashes)
      const detailsElem = document.getElementById("commitDetails");
      expect(detailsElem).not.toBeNull();
      expect(detailsElem!.innerHTML).toContain("Comparing");
    });

    it("restores unsavedChanges srcElem after table re-render (TC-041)", () => {
      // Given: commits with uncommitted changes, uncommitted row is expanded
      const commitsWithUncommitted: GitCommitNode[] = [
        {
          hash: UNCOMMITTED_CHANGES_HASH,
          parentHashes: [],
          author: "*",
          email: "",
          date: 1700003000,
          message: "Uncommitted Changes (3)",
          refs: [],
          stash: null
        },
        ...MOCK_COMMITS
      ];
      dispatchMessage({
        command: "loadCommits",
        commits: commitsWithUncommitted,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });
      vi.clearAllMocks();

      // Expand the unsaved changes row
      clickUnsavedChanges();
      dispatchMessage({
        command: "commitDetails",
        commitDetails: makeCommitDetails(UNCOMMITTED_CHANGES_HASH)
      });

      // When: loadCommits is dispatched again (triggers table re-render)
      dispatchMessage({
        command: "loadCommits",
        commits: commitsWithUncommitted,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });

      // Then: the unsavedChanges row still exists and commitDetails area is present
      const unsavedRow = document.querySelector(".unsavedChanges");
      expect(unsavedRow).not.toBeNull();
      const detailsElem = document.getElementById("commitDetails");
      expect(detailsElem).not.toBeNull();

      // Restore normal commits
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });
    });
  });

  /* ---------------------------------------------------------------- */
  /* Unsaved changes Ctrl+click comparison (bugfix 52a5aa8)           */
  /* ---------------------------------------------------------------- */

  describe("unsaved changes Ctrl+click comparison", () => {
    function loadCommitsWithUncommitted(): void {
      const commitsWithUncommitted: GitCommitNode[] = [
        {
          hash: UNCOMMITTED_CHANGES_HASH,
          parentHashes: [],
          author: "*",
          email: "",
          date: 1700003000,
          message: "Uncommitted Changes (3)",
          refs: [],
          stash: null
        },
        ...MOCK_COMMITS
      ];
      dispatchMessage({
        command: "loadCommits",
        commits: commitsWithUncommitted,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });
      vi.clearAllMocks();
    }

    function restoreNormalCommits(): void {
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });
    }

    it("Ctrl+click unsaved changes row enters compare mode with UNCOMMITTED_CHANGES_HASH as fromHash (TC-042)", () => {
      // Given: commits with uncommitted changes loaded, commit 1 is expanded
      loadCommitsWithUncommitted();
      expandCommit(COMMIT_HASH_1);

      // When: unsaved changes row is Ctrl+clicked
      clickUnsavedChanges({ ctrlKey: true });

      // Then: compareCommits message is sent with UNCOMMITTED_CHANGES_HASH as fromHash
      expect(vscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "compareCommits",
          fromHash: UNCOMMITTED_CHANGES_HASH,
          toHash: COMMIT_HASH_1
        })
      );

      restoreNormalCommits();
    });

    it("Ctrl+click same unsaved changes row cancels comparison (TC-043)", () => {
      // Given: commits with uncommitted changes, compare mode active with unsaved changes
      loadCommitsWithUncommitted();
      expandCommit(COMMIT_HASH_1);
      clickUnsavedChanges({ ctrlKey: true });
      // Simulate compare response
      dispatchMessage({
        command: "compareCommits",
        fileChanges: [
          { oldFilePath: "f.ts", newFilePath: "f.ts", type: "M", additions: 1, deletions: 0 }
        ],
        fromHash: UNCOMMITTED_CHANGES_HASH,
        toHash: COMMIT_HASH_1
      });
      vi.clearAllMocks();

      // When: same unsaved changes row is Ctrl+clicked again
      clickUnsavedChanges({ ctrlKey: true });

      // Then: no compareCommits message is sent (comparison canceled)
      const compareCalls = vi
        .mocked(vscode.postMessage)
        .mock.calls.filter(
          (call) => (call[0] as Record<string, unknown>).command === "compareCommits"
        );
      expect(compareCalls).toHaveLength(0);

      restoreNormalCommits();
    });

    it("normal click on unsaved changes sends commitDetails (TC-044)", () => {
      // Given: commits with uncommitted changes loaded, no expanded commit
      loadCommitsWithUncommitted();

      // When: unsaved changes row is clicked without modifier keys
      clickUnsavedChanges();

      // Then: commitDetails message is sent for UNCOMMITTED_CHANGES_HASH
      expect(vscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "commitDetails",
          commitHash: UNCOMMITTED_CHANGES_HASH
        })
      );

      restoreNormalCommits();
    });
  });

  /* ---------------------------------------------------------------- */
  /* FindWidget integration                                           */
  /* ---------------------------------------------------------------- */

  describe("FindWidget integration", () => {
    it("Ctrl+F triggers FindWidget.show() (TC-045)", () => {
      // Given: the page is loaded with commits rendered
      // When: Ctrl+F keyboard shortcut is pressed
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "f",
          ctrlKey: true,
          bubbles: true
        })
      );

      // Then: FindWidget.show is called with transition = true
      expect(mockFindWidgetInstance.show).toHaveBeenCalledTimes(1);
      expect(mockFindWidgetInstance.show).toHaveBeenCalledWith(true);
    });

    it("search button click triggers FindWidget.show() (TC-046)", () => {
      // Given: the page is loaded with commits rendered
      const searchBtn = document.getElementById("searchBtn");
      expect(searchBtn).not.toBeNull();

      // When: the search button is clicked
      searchBtn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      // Then: FindWidget.show is called with transition = true
      expect(mockFindWidgetInstance.show).toHaveBeenCalledTimes(1);
      expect(mockFindWidgetInstance.show).toHaveBeenCalledWith(true);
    });

    it("saveState includes findWidgetState from FindWidget.getState() (TC-047)", () => {
      // Given: FindWidget.getState returns a specific state
      const expectedFindState = {
        text: "",
        currentHash: null,
        visible: false,
        caseSensitive: false,
        regex: false
      };
      mockFindWidgetInstance.getState.mockReturnValue(expectedFindState);

      // When: an action that triggers saveState occurs (clicking a commit triggers it)
      clickCommit(COMMIT_HASH_1);

      // Then: vscode.setState was called with an object containing findWidgetState
      expect(vscode.setState).toHaveBeenCalled();
      const lastSetStateCall = vi.mocked(vscode.setState).mock.calls.at(-1);
      expect(lastSetStateCall).toBeDefined();
      const savedState = lastSetStateCall![0] as WebViewState;
      expect(savedState.findWidgetState).toEqual(expectedFindState);
    });

    it("restoreState is called with findWidgetState during initialization (TC-048)", () => {
      // Given: prevState had findWidgetState set (configured in beforeAll)
      // When: GitGraphView was constructed (in beforeAll)
      // Then: findWidget.restoreState was called during initialization
      expect(restoreStateCaptured).toBe(true);
    });
  });

  /* ---------------------------------------------------------------- */
  /* calculateCdvHeight() — CDV height calculation (S7)               */
  /* ---------------------------------------------------------------- */

  describe("calculateCdvHeight()", () => {
    const originalInnerHeight = window.innerHeight;

    function setupControlsElement(height: number): void {
      let controls = document.getElementById("controls");
      if (!controls) {
        controls = document.createElement("div");
        controls.id = "controls";
        document.body.appendChild(controls);
      }
      Object.defineProperty(controls, "clientHeight", {
        value: height,
        configurable: true
      });
    }

    function removeControlsElement(): void {
      document.getElementById("controls")?.remove();
    }

    afterEach(() => {
      removeControlsElement();
      vi.stubGlobal("innerHeight", originalInnerHeight);
    });

    beforeEach(() => {
      setupTableLayoutMocks();
    });

    it("returns CDV_DEFAULT_HEIGHT when viewport is large (TC-050)", () => {
      // Given: innerHeight=800, controlsHeight=50 → available=800-50-55=695
      vi.stubGlobal("innerHeight", 800);
      setupControlsElement(50);

      // When: a commit is expanded (triggers calculateCdvHeight via showCommitDetails)
      expandCommit(COMMIT_HASH_1);

      // Then: CDV element height is 250px (CDV_DEFAULT_HEIGHT)
      const cdvElem = document.getElementById("commitDetails");
      expect(cdvElem).not.toBeNull();
      expect(cdvElem!.style.height).toBe("250px");
    });

    it("returns CDV_DEFAULT_HEIGHT when available equals default (TC-051)", () => {
      // Given: innerHeight=355, controlsHeight=50 → available=355-50-55=250 (boundary: == CDV_DEFAULT_HEIGHT)
      vi.stubGlobal("innerHeight", 355);
      setupControlsElement(50);

      // When: a commit is expanded
      expandCommit(COMMIT_HASH_1);

      // Then: CDV element height is 250px (available exactly equals CDV_DEFAULT_HEIGHT)
      const cdvElem = document.getElementById("commitDetails");
      expect(cdvElem).not.toBeNull();
      expect(cdvElem!.style.height).toBe("250px");
    });

    it("returns available height when one below default (TC-052)", () => {
      // Given: innerHeight=354, controlsHeight=50 → available=354-50-55=249 (boundary: CDV_DEFAULT_HEIGHT - 1)
      vi.stubGlobal("innerHeight", 354);
      setupControlsElement(50);

      // When: a commit is expanded
      expandCommit(COMMIT_HASH_1);

      // Then: CDV element height is 249px (available < CDV_DEFAULT_HEIGHT, not clamped)
      const cdvElem = document.getElementById("commitDetails");
      expect(cdvElem).not.toBeNull();
      expect(cdvElem!.style.height).toBe("249px");
    });

    it("returns CDV_MIN_HEIGHT when available equals minimum (TC-053)", () => {
      // Given: innerHeight=205, controlsHeight=50 → available=205-50-55=100 (boundary: == CDV_MIN_HEIGHT)
      vi.stubGlobal("innerHeight", 205);
      setupControlsElement(50);

      // When: a commit is expanded
      expandCommit(COMMIT_HASH_1);

      // Then: CDV element height is 100px (available exactly equals CDV_MIN_HEIGHT)
      const cdvElem = document.getElementById("commitDetails");
      expect(cdvElem).not.toBeNull();
      expect(cdvElem!.style.height).toBe("100px");
    });

    it("clamps to CDV_MIN_HEIGHT when available is below minimum (TC-054)", () => {
      // Given: innerHeight=204, controlsHeight=50 → available=204-50-55=99 (boundary: CDV_MIN_HEIGHT - 1)
      vi.stubGlobal("innerHeight", 204);
      setupControlsElement(50);

      // When: a commit is expanded
      expandCommit(COMMIT_HASH_1);

      // Then: CDV element height is 100px (clamped to CDV_MIN_HEIGHT)
      const cdvElem = document.getElementById("commitDetails");
      expect(cdvElem).not.toBeNull();
      expect(cdvElem!.style.height).toBe("100px");
    });

    it("clamps to CDV_MIN_HEIGHT with zero viewport (TC-055)", () => {
      // Given: innerHeight=0 → available is negative (-55)
      vi.stubGlobal("innerHeight", 0);

      // When: a commit is expanded
      expandCommit(COMMIT_HASH_1);

      // Then: CDV element height is 100px (clamped to CDV_MIN_HEIGHT)
      const cdvElem = document.getElementById("commitDetails");
      expect(cdvElem).not.toBeNull();
      expect(cdvElem!.style.height).toBe("100px");
    });

    it("falls back to controlsHeight=0 when #controls element is missing (TC-056)", () => {
      // Given: innerHeight=280, no #controls element → controlsHeight=0, available=280-0-55=225
      vi.stubGlobal("innerHeight", 280);
      removeControlsElement();

      // When: a commit is expanded
      expandCommit(COMMIT_HASH_1);

      // Then: CDV element height is 225px (viewport - headerHeight - commitRowHeight, without controls)
      const cdvElem = document.getElementById("commitDetails");
      expect(cdvElem).not.toBeNull();
      expect(cdvElem!.style.height).toBe("225px");
    });
  });

  /* ---------------------------------------------------------------- */
  /* showCommitDetails() CDV height & scroll control (S8)             */
  /* ---------------------------------------------------------------- */

  describe("showCommitDetails() CDV height and scroll control", () => {
    const CDV_SCROLL_PADDING = 8;
    const CDV_DEFAULT_HEIGHT = 250;
    const MOCK_COMMIT_ROW_HEIGHT = 24; // grid.y from setupTableLayoutMocks: (103-31)/3

    const originalInnerHeight = window.innerHeight;
    const origGetBCR = HTMLElement.prototype.getBoundingClientRect;
    let scrollContainer: HTMLElement;

    function setupControlsForScroll(height: number): void {
      let controls = document.getElementById("controls");
      if (!controls) {
        controls = document.createElement("div");
        controls.id = "controls";
        document.body.appendChild(controls);
      }
      Object.defineProperty(controls, "clientHeight", {
        value: height,
        configurable: true
      });
    }

    function setupScrollEnvironment(options: {
      scrollTop: number;
      clientHeight: number;
      cdvOffsetTop: number;
    }): void {
      scrollContainer = document.getElementById("scrollContainer")!;
      // Override scrollTop as simple getter/setter to bypass jsdom's scroll clamping
      // (jsdom clamps scrollTop based on scrollHeight - clientHeight)
      let mockScrollTop = options.scrollTop;
      Object.defineProperty(scrollContainer, "scrollTop", {
        get() {
          return mockScrollTop;
        },
        set(value: number) {
          mockScrollTop = value;
        },
        configurable: true
      });
      Object.defineProperty(scrollContainer, "clientHeight", {
        value: options.clientHeight,
        configurable: true
      });
      // Override offsetTop so the CDV element created inside showCommitDetails
      // returns the controlled value instead of jsdom's default 0.
      // Also handle srcElem (the clicked commit row, marked with commitDetailsOpen class)
      // which sits directly above the CDV in the DOM.
      Object.defineProperty(HTMLElement.prototype, "offsetTop", {
        get() {
          if (this.id === "commitDetails") return options.cdvOffsetTop;
          if (this.classList?.contains("commitDetailsOpen"))
            return options.cdvOffsetTop - MOCK_COMMIT_ROW_HEIGHT;
          return 0;
        },
        configurable: true
      });
      // Mock getBoundingClientRect for CDV element so renderGraph reads correct expandY
      // (jsdom returns 0 for all layout properties; renderGraph uses this to set config.grid.expandY)
      HTMLElement.prototype.getBoundingClientRect = function () {
        if (this.id === "commitDetails") {
          const rect = origGetBCR.call(this);
          return new DOMRect(rect.x, rect.y, rect.width, CDV_DEFAULT_HEIGHT);
        }
        return origGetBCR.call(this);
      };
      // Ensure calculateCdvHeight returns CDV_DEFAULT_HEIGHT (250)
      vi.stubGlobal("innerHeight", 800);
      setupControlsForScroll(50);
    }

    afterEach(() => {
      // Remove instance-level scrollTop override to restore jsdom's native behavior
      if (scrollContainer) {
        delete (scrollContainer as Record<string, unknown>).scrollTop;
      }
      HTMLElement.prototype.getBoundingClientRect = origGetBCR;
      Object.defineProperty(HTMLElement.prototype, "offsetTop", {
        get() {
          return 0;
        },
        configurable: true
      });
      document.getElementById("controls")?.remove();
      vi.stubGlobal("innerHeight", originalInnerHeight);
    });

    it("does not change scrollTop when CDV is within viewport (TC-057)", () => {
      // Given: CDV at offsetTop=100, viewport clientHeight=500, scrollTop=0
      //   Top check: 100 - 8 = 92 < 0 → false (not above viewport)
      //   Bottom check: 100 + 250 - 500 = -150 > 0 → false (not below viewport)
      setupScrollEnvironment({ scrollTop: 0, clientHeight: 500, cdvOffsetTop: 100 });

      // When: a commit is expanded (triggers showCommitDetails with scroll logic)
      expandCommit(COMMIT_HASH_1);

      // Then: scrollTop remains unchanged (CDV fully within viewport)
      expect(scrollContainer.scrollTop).toBe(0);
    });

    it("scrolls up when CDV top is above viewport (TC-058)", () => {
      // Given: CDV at offsetTop=100, scrollTop=200 (CDV top is above viewport)
      //   Top check: 100 - 8 = 92 < 200 → true (above viewport)
      setupScrollEnvironment({ scrollTop: 200, clientHeight: 500, cdvOffsetTop: 100 });

      // When: a commit is expanded
      expandCommit(COMMIT_HASH_1);

      // Then: scrollTop = offsetTop - CDV_SCROLL_PADDING = 92
      expect(scrollContainer.scrollTop).toBe(100 - CDV_SCROLL_PADDING);
    });

    it("scrolls down when CDV bottom exceeds viewport (TC-059)", () => {
      // Given: CDV at offsetTop=400, expandY=250, viewHeight=500, scrollTop=100
      //   Top check: 400 - 8 = 392 < 100 → false (not above viewport)
      //   Bottom check: 400 + 250 - 500 = 150 > 100 → true (below viewport)
      //   desiredScroll = 150, maxScroll = srcElem.offsetTop = 400 - 24 = 376
      //   Math.min(150, 376) = 150
      setupScrollEnvironment({ scrollTop: 100, clientHeight: 500, cdvOffsetTop: 400 });

      // When: a commit is expanded
      expandCommit(COMMIT_HASH_1);

      // Then: scrollTop = offsetTop + expandY - viewHeight = 150
      expect(scrollContainer.scrollTop).toBe(400 + CDV_DEFAULT_HEIGHT - 500);
    });

    it("applies calculateCdvHeight result to CDV element style.height (TC-060)", () => {
      // Given: innerHeight=800, controlsHeight=50 → calculateCdvHeight returns 250
      setupScrollEnvironment({ scrollTop: 0, clientHeight: 500, cdvOffsetTop: 100 });

      // When: a commit is expanded
      expandCommit(COMMIT_HASH_1);

      // Then: CDV element style.height is set to calculateCdvHeight result
      const cdvElem = document.getElementById("commitDetails");
      expect(cdvElem).not.toBeNull();
      expect(cdvElem!.style.height).toBe("250px");
    });

    it("executes renderGraph after CDV height is applied (TC-061)", () => {
      // Given: standard scroll environment
      setupScrollEnvironment({ scrollTop: 0, clientHeight: 500, cdvOffsetTop: 100 });

      // When: a commit is expanded
      expandCommit(COMMIT_HASH_1);

      // Then: CDV height is set AND scroll logic executed
      //   (source code order: style.height → renderGraph() → scroll logic)
      const cdvElem = document.getElementById("commitDetails");
      expect(cdvElem).not.toBeNull();
      expect(cdvElem!.style.height).toBe("250px");
      // Scroll logic runs after renderGraph; successful execution proves renderGraph completed
      expect(scrollContainer.scrollTop).toBe(0);
    });
  });

  /* ---------------------------------------------------------------- */
  /* updateCommitDetailsHeight() resize (S9)                          */
  /* ---------------------------------------------------------------- */

  describe("updateCommitDetailsHeight() resize", () => {
    const originalInnerHeight = window.innerHeight;
    const originalOuterWidth = window.outerWidth;
    const originalOuterHeight = window.outerHeight;

    function setupControlsForResize(height: number): void {
      let controls = document.getElementById("controls");
      if (!controls) {
        controls = document.createElement("div");
        controls.id = "controls";
        document.body.appendChild(controls);
      }
      Object.defineProperty(controls, "clientHeight", {
        value: height,
        configurable: true
      });
    }

    afterEach(() => {
      document.getElementById("controls")?.remove();
      vi.stubGlobal("innerHeight", originalInnerHeight);
      vi.stubGlobal("outerWidth", originalOuterWidth);
      vi.stubGlobal("outerHeight", originalOuterHeight);
    });

    beforeEach(() => {
      setupTableLayoutMocks();
    });

    it("does not affect CDV when no commit is expanded on resize (TC-063)", () => {
      // Given: no commit expanded (no CDV visible)

      // When: resize event fires
      window.dispatchEvent(new Event("resize"));

      // Then: no CDV element exists (no height change possible)
      const cdv = document.getElementById("commitDetails");
      expect(cdv).toBeNull();
    });

    it("recalculates CDV height on inner resize when CDV is visible (TC-064)", () => {
      // Given: CDV visible with innerHeight=800, controlsHeight=50 → height=250px
      vi.stubGlobal("innerHeight", 800);
      setupControlsForResize(50);
      expandCommit(COMMIT_HASH_1);
      const cdvBefore = document.getElementById("commitDetails");
      expect(cdvBefore).not.toBeNull();
      expect(cdvBefore!.style.height).toBe("250px");

      // When: inner viewport shrinks (outer dimensions unchanged) and resize fires
      vi.stubGlobal("innerHeight", 250);
      window.dispatchEvent(new Event("resize"));

      // Then: CDV height is recalculated (250 - 50 - 55 = 145px)
      const cdvAfter = document.getElementById("commitDetails");
      expect(cdvAfter).not.toBeNull();
      expect(cdvAfter!.style.height).toBe("145px");
    });

    it("recalculates CDV height on outer resize when CDV is visible (TC-062)", () => {
      // Given: CDV visible with innerHeight=800, controlsHeight=50 → height=250px
      vi.stubGlobal("innerHeight", 800);
      setupControlsForResize(50);
      expandCommit(COMMIT_HASH_1);
      const cdvBefore = document.getElementById("commitDetails");
      expect(cdvBefore).not.toBeNull();
      expect(cdvBefore!.style.height).toBe("250px");

      // When: window outer dimensions change and resize event fires
      vi.stubGlobal("innerHeight", 250);
      vi.stubGlobal("outerWidth", 1920);
      vi.stubGlobal("outerHeight", 1080);
      window.dispatchEvent(new Event("resize"));

      // Then: CDV height is recalculated (250 - 50 - 55 = 145px)
      const cdvAfter = document.getElementById("commitDetails");
      expect(cdvAfter).not.toBeNull();
      expect(cdvAfter!.style.height).toBe("145px");
    });
  });

  /* ---------------------------------------------------------------- */
  /* selectRepo() repository selection (S14)                          */
  /* ---------------------------------------------------------------- */

  describe("selectRepo()", () => {
    it("selects repo, updates dropdown, and refreshes when repo exists (TC-099)", () => {
      // Given: gitRepos contains TEST_REPO (loaded during beforeAll)
      vi.clearAllMocks();

      // When: selectRepo message is dispatched for existing repo
      dispatchMessage({ command: "selectRepo", repo: TEST_REPO });

      // Then: refresh is triggered (loadBranches request sent via vscode.postMessage)
      expect(vscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "loadBranches",
          repo: TEST_REPO
        })
      );
    });

    it("silently ignores selectRepo for unknown repo (TC-100)", () => {
      // Given: gitRepos does not contain "/unknown/repo"
      vi.clearAllMocks();

      // When: selectRepo message is dispatched for unknown repo
      dispatchMessage({ command: "selectRepo", repo: "/unknown/repo" });

      // Then: no postMessage calls (no refresh triggered)
      expect(vscode.postMessage).not.toHaveBeenCalled();
    });
  });

  /* ---------------------------------------------------------------- */
  /* handleKeyboardShortcut() — shortcut key matching (S10)           */
  /* ---------------------------------------------------------------- */

  describe("handleKeyboardShortcut()", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("Ctrl+F triggers findWidget.show(true) (TC-065)", () => {
      // Given: config keybindings.find = "f"
      // When: Ctrl+F is pressed
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "f", ctrlKey: true, bubbles: true })
      );

      // Then: findWidget.show is called with true
      expect(mockFindWidgetInstance.show).toHaveBeenCalledTimes(1);
      expect(mockFindWidgetInstance.show).toHaveBeenCalledWith(true);
    });

    it("Cmd+F triggers findWidget.show(true) on macOS (TC-066)", () => {
      // Given: config keybindings.find = "f"
      // When: Cmd+F is pressed (metaKey)
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "f", metaKey: true, bubbles: true })
      );

      // Then: findWidget.show is called with true
      expect(mockFindWidgetInstance.show).toHaveBeenCalledTimes(1);
      expect(mockFindWidgetInstance.show).toHaveBeenCalledWith(true);
    });

    it("Ctrl+R triggers refresh (TC-067)", () => {
      // Given: config keybindings.refresh = "r"
      // When: Ctrl+R is pressed
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "r", ctrlKey: true, bubbles: true })
      );

      // Then: refresh is triggered (renderShowLoading sets table to loading state)
      const tableElem = document.getElementById("commitTable");
      expect(tableElem).not.toBeNull();
      expect(tableElem!.innerHTML).toContain("Loading");
    });

    it("Ctrl+H scrolls to HEAD commit when commitHead exists (TC-068)", () => {
      // Given: commits loaded with commitHead = COMMIT_HASH_1
      // When: Ctrl+H is pressed
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "h", ctrlKey: true, bubbles: true })
      );

      // Then: scroll occurs (flash class added to HEAD commit row)
      const headRow = document.querySelector(`.commit[data-hash="${COMMIT_HASH_1}"]`);
      expect(headRow).not.toBeNull();
      expect(headRow!.classList.contains("flash")).toBe(true);
    });

    it("Ctrl+H does nothing when commitHead is null (TC-069)", () => {
      // Given: commits loaded but commitHead is not in commitLookup
      //   Load commits with head set to a non-existent hash
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: null,
        moreCommitsAvailable: false,
        hard: true
      });
      vi.clearAllMocks();

      // When: Ctrl+H is pressed
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "h", ctrlKey: true, bubbles: true })
      );

      // Then: no scroll occurs (no flash class on any element)
      const flashElements = document.querySelectorAll(".flash");
      expect(flashElements.length).toBe(0);

      // Restore commits with head
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });
    });

    it("key press without Ctrl/Cmd modifier does nothing (TC-070)", () => {
      // Given: config keybindings.find = "f"
      // When: F is pressed without modifier
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "f", bubbles: true }));

      // Then: findWidget.show is NOT called
      expect(mockFindWidgetInstance.show).not.toHaveBeenCalled();
    });

    it("Ctrl + unmapped key does nothing (TC-071)", () => {
      // Given: "x" is not mapped to any shortcut
      // When: Ctrl+X is pressed
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "x", ctrlKey: true, bubbles: true })
      );

      // Then: no shortcut action is triggered
      expect(mockFindWidgetInstance.show).not.toHaveBeenCalled();
      expect(vscode.postMessage).not.toHaveBeenCalled();
    });

    it("IME composing state suppresses shortcuts (TC-072)", () => {
      // Given: isComposing = true (IME active)
      // When: Ctrl+F is pressed during composition
      const event = new KeyboardEvent("keydown", { key: "f", ctrlKey: true, bubbles: true });
      Object.defineProperty(event, "isComposing", { value: true });
      document.dispatchEvent(event);

      // Then: findWidget.show is NOT called
      expect(mockFindWidgetInstance.show).not.toHaveBeenCalled();
    });

    it("Shift+Ctrl+F still matches find shortcut via toLowerCase (TC-073)", () => {
      // Given: config keybindings.find = "f"
      // When: Shift+Ctrl+F is pressed (key might be uppercase "F")
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "F",
          ctrlKey: true,
          shiftKey: true,
          bubbles: true
        })
      );

      // Then: findWidget.show is called (key.toLowerCase() matches "f")
      expect(mockFindWidgetInstance.show).toHaveBeenCalledTimes(1);
      expect(mockFindWidgetInstance.show).toHaveBeenCalledWith(true);
    });

    it("Ctrl+F does nothing when find shortcut is null (UNASSIGNED) (TC-074)", () => {
      // Given: config keybindings.find is set to null (UNASSIGNED)
      const viewState = (globalThis as Record<string, unknown>).viewState as Record<
        string,
        unknown
      >;
      const keybindings = viewState.keybindings as Record<string, string | null>;
      const originalFind = keybindings.find;
      keybindings.find = null;

      // When: Ctrl+F is pressed
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "f", ctrlKey: true, bubbles: true })
      );

      // Then: findWidget.show is NOT called (shortcut disabled)
      expect(mockFindWidgetInstance.show).not.toHaveBeenCalled();

      // Cleanup: restore original keybinding
      keybindings.find = originalFind;
    });
  });

  /* ---------------------------------------------------------------- */
  /* scrollToStash() — stash navigation (S11)                        */
  /* ---------------------------------------------------------------- */

  describe("scrollToStash()", () => {
    const STASH_HASH_0 = "stash000stash000";
    const STASH_HASH_1 = "stash111stash111";
    const STASH_HASH_2 = "stash222stash222";

    function loadCommitsWithStashes(stashCount: number): void {
      const stashCommits: GitCommitNode[] = [];
      const hashes = [STASH_HASH_0, STASH_HASH_1, STASH_HASH_2];
      for (let i = 0; i < stashCount; i++) {
        stashCommits.push({
          hash: hashes[i],
          parentHashes: [],
          author: "Stasher",
          email: "stash@test.com",
          date: 1700000000 + i * 1000,
          message: `stash@{${i}}`,
          refs: [],
          stash: { selector: `stash@{${i}}`, baseHash: "base", untrackedFilesHash: null }
        });
      }
      const allCommits = [...stashCommits, ...MOCK_COMMITS];
      dispatchMessage({
        command: "loadCommits",
        commits: allCommits,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });
      vi.clearAllMocks();
    }

    function pressScrollToStash(shift: boolean = false): void {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "s",
          ctrlKey: true,
          shiftKey: shift,
          bubbles: true
        })
      );
    }

    beforeEach(() => {
      vi.clearAllMocks();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      // Restore normal commits
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });
    });

    it("forward from initial navigates to first stash (TC-075)", () => {
      // Given: 3 stash commits loaded, navigation index = -1 (initial)
      loadCommitsWithStashes(3);

      // When: Ctrl+S pressed (forward)
      pressScrollToStash();

      // Then: first stash (index 0) receives flash class
      const stashRow = document.querySelector(`.commit[data-hash="${STASH_HASH_0}"]`);
      expect(stashRow).not.toBeNull();
      expect(stashRow!.classList.contains("flash")).toBe(true);
    });

    it("forward from first navigates to second stash (TC-076)", () => {
      // Given: 3 stash commits, already navigated to first
      loadCommitsWithStashes(3);
      pressScrollToStash(); // navigate to index 0
      vi.clearAllMocks();

      // When: Ctrl+S pressed again (forward)
      pressScrollToStash();

      // Then: second stash (index 1) receives flash class
      const stashRow = document.querySelector(`.commit[data-hash="${STASH_HASH_1}"]`);
      expect(stashRow).not.toBeNull();
      expect(stashRow!.classList.contains("flash")).toBe(true);
    });

    it("forward from last wraps to first stash (TC-077)", () => {
      // Given: 3 stash commits, navigated to last (index 2)
      loadCommitsWithStashes(3);
      pressScrollToStash(); // index 0
      pressScrollToStash(); // index 1
      pressScrollToStash(); // index 2
      vi.clearAllMocks();

      // When: Ctrl+S pressed again (forward from end)
      pressScrollToStash();

      // Then: wraps to first stash (index 0)
      const stashRow = document.querySelector(`.commit[data-hash="${STASH_HASH_0}"]`);
      expect(stashRow).not.toBeNull();
      expect(stashRow!.classList.contains("flash")).toBe(true);
    });

    it("backward from initial navigates to last stash (TC-078)", () => {
      // Given: 3 stash commits, navigation index = -1 (initial)
      loadCommitsWithStashes(3);

      // When: Shift+Ctrl+S pressed (backward)
      pressScrollToStash(true);

      // Then: last stash (index 2) receives flash class
      const stashRow = document.querySelector(`.commit[data-hash="${STASH_HASH_2}"]`);
      expect(stashRow).not.toBeNull();
      expect(stashRow!.classList.contains("flash")).toBe(true);
    });

    it("backward from first wraps to last stash (TC-079)", () => {
      // Given: 3 stash commits, navigated to first (index 0)
      loadCommitsWithStashes(3);
      pressScrollToStash(); // forward to index 0
      vi.clearAllMocks();

      // When: Shift+Ctrl+S pressed (backward from first)
      pressScrollToStash(true);

      // Then: wraps to last stash (index 2)
      const stashRow = document.querySelector(`.commit[data-hash="${STASH_HASH_2}"]`);
      expect(stashRow).not.toBeNull();
      expect(stashRow!.classList.contains("flash")).toBe(true);
    });

    it("does nothing when no stash commits exist (TC-080)", () => {
      // Given: no stash commits (regular MOCK_COMMITS only)
      // commits restored by beforeEach via resetCommitState

      // When: Ctrl+S pressed
      pressScrollToStash();

      // Then: no flash class added anywhere (silent no-op)
      const flashElements = document.querySelectorAll(".flash");
      expect(flashElements.length).toBe(0);
    });

    it("resets navigation index after 5s timeout (TC-081)", () => {
      // Given: 3 stash commits, navigated to first
      loadCommitsWithStashes(3);
      pressScrollToStash(); // index 0
      vi.clearAllMocks();

      // When: 5 seconds pass
      vi.advanceTimersByTime(5000);

      // Then: next forward navigation goes to first stash again (index reset to -1)
      pressScrollToStash();
      const stashRow = document.querySelector(`.commit[data-hash="${STASH_HASH_0}"]`);
      expect(stashRow).not.toBeNull();
      expect(stashRow!.classList.contains("flash")).toBe(true);
    });

    it("single stash loops to same stash on forward (TC-082)", () => {
      // Given: only 1 stash commit
      loadCommitsWithStashes(1);
      pressScrollToStash(); // index 0
      vi.clearAllMocks();

      // When: Ctrl+S pressed again (forward from only stash)
      pressScrollToStash();

      // Then: same stash (index 0) receives flash class
      const stashRow = document.querySelector(`.commit[data-hash="${STASH_HASH_0}"]`);
      expect(stashRow).not.toBeNull();
      expect(stashRow!.classList.contains("flash")).toBe(true);
    });
  });

  /* ---------------------------------------------------------------- */
  /* handleEscape() — progressive UI dismiss chain (S12)             */
  /* ---------------------------------------------------------------- */

  describe("handleEscape()", () => {
    function pressEscape(): void {
      document.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape", bubbles: true }));
    }

    function resetAllUIStates(): void {
      vi.mocked(isContextMenuActive).mockReturnValue(false);
      vi.mocked(isDialogActive).mockReturnValue(false);
      mockRepoDropdownInstance.isOpen.mockReturnValue(false);
      mockBranchDropdownInstance.isOpen.mockReturnValue(false);
      mockFindWidgetInstance.isVisible.mockReturnValue(false);
    }

    beforeEach(() => {
      vi.clearAllMocks();
      resetAllUIStates();
    });

    it("closes context menu first when active (TC-083)", () => {
      // Given: context menu is active
      vi.mocked(isContextMenuActive).mockReturnValue(true);
      vi.mocked(isDialogActive).mockReturnValue(true); // also active but lower priority

      // When: Escape is pressed
      pressEscape();

      // Then: only hideContextMenu is called
      expect(hideContextMenu).toHaveBeenCalledTimes(1);
      expect(hideDialog).not.toHaveBeenCalled();
    });

    it("closes dialog when no context menu active (TC-084)", () => {
      // Given: dialog is active, no context menu
      vi.mocked(isDialogActive).mockReturnValue(true);

      // When: Escape is pressed
      pressEscape();

      // Then: only hideDialog is called
      expect(hideDialog).toHaveBeenCalledTimes(1);
      expect(hideContextMenu).not.toHaveBeenCalled();
    });

    it("closes repoDropdown when no menu/dialog active (TC-085)", () => {
      // Given: repoDropdown is open
      mockRepoDropdownInstance.isOpen.mockReturnValue(true);

      // When: Escape is pressed
      pressEscape();

      // Then: only repoDropdown.close() is called
      expect(mockRepoDropdownInstance.close).toHaveBeenCalledTimes(1);
      expect(mockBranchDropdownInstance.close).not.toHaveBeenCalled();
      expect(hideDialog).not.toHaveBeenCalled();
    });

    it("closes branchDropdown when repoDropdown is closed (TC-086)", () => {
      // Given: branchDropdown is open, repoDropdown closed
      mockBranchDropdownInstance.isOpen.mockReturnValue(true);

      // When: Escape is pressed
      pressEscape();

      // Then: only branchDropdown.close() is called
      expect(mockBranchDropdownInstance.close).toHaveBeenCalledTimes(1);
      expect(mockRepoDropdownInstance.close).not.toHaveBeenCalled();
    });

    it("closes repoDropdown first when both dropdowns are open (TC-087)", () => {
      // Given: both dropdowns are open
      mockRepoDropdownInstance.isOpen.mockReturnValue(true);
      mockBranchDropdownInstance.isOpen.mockReturnValue(true);

      // When: Escape is pressed
      pressEscape();

      // Then: only repoDropdown.close() is called (repo priority over branch)
      expect(mockRepoDropdownInstance.close).toHaveBeenCalledTimes(1);
      expect(mockBranchDropdownInstance.close).not.toHaveBeenCalled();
    });

    it("closes FindWidget when no menu/dialog/dropdown active (TC-088)", () => {
      // Given: FindWidget is visible
      mockFindWidgetInstance.isVisible.mockReturnValue(true);

      // When: Escape is pressed
      pressEscape();

      // Then: only findWidget.close() is called
      expect(mockFindWidgetInstance.close).toHaveBeenCalledTimes(1);
      expect(mockRepoDropdownInstance.close).not.toHaveBeenCalled();
    });

    it("closes commit details when all other UI is closed (TC-089)", () => {
      // Given: a commit is expanded (only expandedCommit is active)
      expandCommit(COMMIT_HASH_1);
      vi.clearAllMocks();
      resetAllUIStates();

      // When: Escape is pressed
      pressEscape();

      // Then: commit details element is removed
      const detailsElem = document.getElementById("commitDetails");
      expect(detailsElem).toBeNull();
    });

    it("does nothing when all UI components are closed (TC-090)", () => {
      // Given: all UI components are closed
      // (resetAllUIStates in beforeEach, no expandedCommit)

      // When: Escape is pressed
      pressEscape();

      // Then: no close/hide methods are called
      expect(hideContextMenu).not.toHaveBeenCalled();
      expect(hideDialog).not.toHaveBeenCalled();
      expect(mockRepoDropdownInstance.close).not.toHaveBeenCalled();
      expect(mockBranchDropdownInstance.close).not.toHaveBeenCalled();
      expect(mockFindWidgetInstance.close).not.toHaveBeenCalled();
    });

    it("progressive chain: context menu → dialog on consecutive Escapes (TC-091)", () => {
      // Given: context menu and dialog are both active
      vi.mocked(isContextMenuActive).mockReturnValue(true);
      vi.mocked(isDialogActive).mockReturnValue(true);

      // When: first Escape is pressed
      pressEscape();

      // Then: context menu is closed first
      expect(hideContextMenu).toHaveBeenCalledTimes(1);
      expect(hideDialog).not.toHaveBeenCalled();

      // Given: context menu is now closed
      vi.mocked(isContextMenuActive).mockReturnValue(false);
      vi.clearAllMocks();

      // When: second Escape is pressed
      pressEscape();

      // Then: dialog is closed next
      expect(hideDialog).toHaveBeenCalledTimes(1);
      expect(hideContextMenu).not.toHaveBeenCalled();
    });
  });

  /* ---------------------------------------------------------------- */
  /* Auto-load on scroll (S13)                                        */
  /* ---------------------------------------------------------------- */

  describe("auto-load on scroll (observeWebviewScroll)", () => {
    function setScrollMetrics(scrollTop: number, clientHeight: number, scrollHeight: number): void {
      const container = document.getElementById("scrollContainer")!;
      Object.defineProperty(container, "scrollTop", {
        value: scrollTop,
        writable: true,
        configurable: true
      });
      Object.defineProperty(container, "clientHeight", {
        value: clientHeight,
        configurable: true
      });
      Object.defineProperty(container, "scrollHeight", {
        value: scrollHeight,
        configurable: true
      });
    }

    function fireScroll(): void {
      const container = document.getElementById("scrollContainer")!;
      container.dispatchEvent(new Event("scroll", { bubbles: true }));
    }

    function loadCommitsWithMore(moreAvailable: boolean): void {
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: moreAvailable,
        hard: true
      });
    }

    beforeEach(() => {
      vi.clearAllMocks();
      // Ensure moreCommitsAvailable=true and config.loadMoreCommitsAutomatically=true
      loadCommitsWithMore(true);
      vi.clearAllMocks();
    });

    it("fires auto-load when all guard conditions are met (TC-092)", () => {
      // Given: config enabled, moreAvailable=true, not loading, scroll near bottom
      // scrollTop(475) + clientHeight(500) = 975 >= scrollHeight(1000) - 25 = 975
      setScrollMetrics(475, 500, 1000);

      // When: scroll event fires
      fireScroll();

      // Then: loadCommits request is sent (auto-load triggered)
      expect(vscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "loadCommits",
          hard: true
        })
      );
    });

    it("does not fire when config.loadMoreCommitsAutomatically is false (TC-093)", () => {
      // Given: config disabled via capturedConfig reference
      capturedConfig.ref!.loadMoreCommitsAutomatically = false;
      setScrollMetrics(475, 500, 1000);

      // When: scroll event fires
      fireScroll();

      // Then: no loadCommits request (auto-load NOT triggered)
      expect(vscode.postMessage).not.toHaveBeenCalled();

      // Cleanup: restore config
      capturedConfig.ref!.loadMoreCommitsAutomatically = true;
    });

    it("does not fire when moreCommitsAvailable is false (TC-094)", () => {
      // Given: no more commits available
      loadCommitsWithMore(false);
      vi.clearAllMocks();

      setScrollMetrics(475, 500, 1000);

      // When: scroll event fires
      fireScroll();

      // Then: no loadCommits request
      expect(vscode.postMessage).not.toHaveBeenCalled();

      // Restore state
      loadCommitsWithMore(true);
      vi.clearAllMocks();
    });

    it("does not fire twice while already loading (TC-095)", () => {
      // Given: scroll triggers first auto-load
      setScrollMetrics(475, 500, 1000);
      fireScroll();
      expect(vscode.postMessage).toHaveBeenCalledTimes(1);
      vi.clearAllMocks();

      // When: scroll fires again before loadCommits response arrives
      fireScroll();

      // Then: no additional loadCommits request (double-fire prevention)
      expect(vscode.postMessage).not.toHaveBeenCalled();
    });

    it("does not fire when scroll position is 26px+ from bottom (TC-096)", () => {
      // Given: scroll position is 26px from bottom (threshold not met)
      // scrollTop(474) + clientHeight(500) = 974 < scrollHeight(1000) - 25 = 975
      setScrollMetrics(474, 500, 1000);

      // When: scroll event fires
      fireScroll();

      // Then: no loadCommits request
      expect(vscode.postMessage).not.toHaveBeenCalled();
    });

    it("fires when scroll position is exactly at threshold (25px from bottom) (TC-097)", () => {
      // Given: scroll position is exactly 25px from bottom (boundary)
      // scrollTop(475) + clientHeight(500) = 975 >= scrollHeight(1000) - 25 = 975
      setScrollMetrics(475, 500, 1000);

      // When: scroll event fires
      fireScroll();

      // Then: loadCommits request is sent
      expect(vscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "loadCommits",
          hard: true
        })
      );
    });

    it("resets isLoadingMoreCommits on completion callback (TC-098)", () => {
      // Given: auto-load was triggered
      setScrollMetrics(475, 500, 1000);
      fireScroll();
      expect(vscode.postMessage).toHaveBeenCalledTimes(1);
      vi.clearAllMocks();

      // When: loadCommits response arrives (triggers completion callback)
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: true,
        hard: true
      });
      vi.clearAllMocks();

      // Then: next scroll can trigger auto-load again (isLoadingMoreCommits reset)
      setScrollMetrics(475, 500, 1000);
      fireScroll();
      expect(vscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "loadCommits",
          hard: true
        })
      );
    });
  });
});

/* ------------------------------------------------------------------ */
/* FindWidget backward compatibility (separate module scope)          */
/* ------------------------------------------------------------------ */

describe("GitGraphView findWidgetState backward compatibility", () => {
  it("prevState without findWidgetState does not call restoreState (TC-049)", async () => {
    // Given: a fresh module scope
    vi.resetModules();
    setupTestDOM();
    setupViewState();

    // Re-import utils to get the fresh vscode mock
    const { vscode: freshVscode } = await import("../../web/utils");
    const prevStateWithoutFindWidget = {
      ...MOCK_PREV_STATE,
      findWidgetState: undefined
    };
    vi.mocked(freshVscode.getState).mockReturnValueOnce(
      prevStateWithoutFindWidget as unknown as ReturnType<typeof freshVscode.getState>
    );
    mockFindWidgetInstance.restoreState.mockClear();

    // When: main module is imported (creates GitGraphView)
    await import("../../web/main");

    // Then: FindWidget.restoreState was NOT called
    expect(mockFindWidgetInstance.restoreState).not.toHaveBeenCalled();
  });
});
