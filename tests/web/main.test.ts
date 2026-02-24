// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { GitCommitDetails, GitCommitNode, GitCommitStash } from "../../src/types";
import { UNCOMMITTED_CHANGES_HASH } from "../../src/types";

/* ------------------------------------------------------------------ */
/* Hoisted mocks (shared references for mock factories + assertions)  */
/* ------------------------------------------------------------------ */

const { mockFindWidgetInstance } = vi.hoisted(() => ({
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
  Graph: vi.fn(function () {
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

vi.mock("../../web/dropdown", () => ({
  Dropdown: vi.fn(function () {
    return {
      setOptions: vi.fn(),
      refresh: vi.fn()
    };
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

import {
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
  it("includes 'commit' and 'stash' CSS classes for stash commit (TC-SR-N-01)", () => {
    // Given: a commit node with stash !== null
    const hash = "abc123def456";
    const stash = makeStash();

    // When: row attributes are generated
    const result = buildCommitRowAttributes(hash, stash);

    // Then: CSS classes contain both "commit" and "stash"
    expect(result).toContain('class="commit stash"');
  });

  it("includes data-hash attribute with commit hash for stash commit (TC-SR-N-04)", () => {
    // Given: a stash commit with a specific hash
    const hash = "abc123def456";
    const stash = makeStash();

    // When: row attributes are generated
    const result = buildCommitRowAttributes(hash, stash);

    // Then: data-hash attribute contains the commit hash
    expect(result).toContain(`data-hash="${hash}"`);
  });

  it("does not include 'stash' CSS class for non-stash commit (TC-SR-N-05)", () => {
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
  it("extracts @{0} from stash@{0} (TC-SR-N-02)", () => {
    // Given: selector is "stash@{0}"
    const selector = "stash@{0}";

    // When: selector display is generated
    const display = buildStashSelectorDisplay(selector);

    // Then: "@{0}" is returned (stash prefix removed)
    expect(display).toBe("@{0}");
  });

  it("extracts @{12} from stash@{12} for multi-digit index (TC-SR-N-03)", () => {
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

  it("returns 7 items (4 actions + separator + 2 copy) for stash context menu (TC-SC-N-01)", () => {
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

  it("shows checkbox dialog with 'Reinstate Index' default false when Apply is clicked (TC-SC-N-02)", () => {
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

  it("sends applyStash with reinstateIndex: true when confirmed with Reinstate Index ON (TC-SC-N-03)", () => {
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

  it("sends applyStash with reinstateIndex: false when confirmed with Reinstate Index OFF (TC-SC-N-04)", () => {
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

  it("sends popStash message when Pop is confirmed (TC-SC-N-05)", () => {
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

  it("shows confirmation dialog when Drop is clicked (TC-SC-N-06)", () => {
    // Given: stash context menu items
    const items = buildStashContextMenuItems(MOCK_REPO, MOCK_HASH, MOCK_SELECTOR, MOCK_SOURCE_ELEM);

    // When: "Drop Stash..." is clicked
    items[3]!.onClick();

    // Then: showConfirmationDialog is called
    expect(showConfirmationDialog).toHaveBeenCalledTimes(1);
  });

  it("sends dropStash message when Drop is confirmed (TC-SC-N-07)", () => {
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

  it("shows ref input dialog when Create Branch is clicked (TC-SC-N-08)", () => {
    // Given: stash context menu items
    const items = buildStashContextMenuItems(MOCK_REPO, MOCK_HASH, MOCK_SELECTOR, MOCK_SOURCE_ELEM);

    // When: "Create Branch from Stash..." is clicked
    items[1]!.onClick();

    // Then: showRefInputDialog is called
    expect(showRefInputDialog).toHaveBeenCalledTimes(1);
  });

  it("sends branchFromStash message when Branch dialog is confirmed (TC-SC-N-09)", () => {
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

  it("sends copyToClipboard with Stash Name when Copy Name is clicked (TC-SC-N-10)", () => {
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

  it("sends copyToClipboard with Stash Hash when Copy Hash is clicked (TC-SC-N-11)", () => {
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

  it("returns 3 items (Stash, Reset, Clean) for uncommitted context menu (TC-UC-N-01)", () => {
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

  it("shows form dialog with message input and Include Untracked checkbox when Stash is clicked (TC-UC-N-02)", () => {
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

  it("sends pushStash with message and includeUntracked: true when Stash confirmed with options (TC-UC-N-03)", () => {
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

  it("sends pushStash with empty message and includeUntracked: false when Stash confirmed with defaults (TC-UC-N-04)", () => {
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

  it("shows select dialog with Mixed and Hard options when Reset is clicked (TC-UC-N-05)", () => {
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

  it("sends resetUncommitted with mode: mixed after select and confirmation (TC-UC-N-06)", () => {
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

  it("sends resetUncommitted with mode: hard after select and confirmation (TC-UC-N-07)", () => {
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

  it("shows checkbox dialog with 'Clean untracked directories' default false when Clean is clicked (TC-UC-N-08)", () => {
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

  it("sends cleanUntrackedFiles with directories: true when Clean confirmed with option ON (TC-UC-N-09)", () => {
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

  it("sends cleanUntrackedFiles with directories: false when Clean confirmed with option OFF (TC-UC-N-10)", () => {
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

  it("sends fetch message with correct format including repo (TC-FT-N-04)", () => {
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

  it("calls onRefresh when status is null (TC-FT-N-05)", () => {
    // Given: fetch response with status === null (success)
    const status = null;
    const errorMessage = "Unable to Fetch";

    // When: refreshGraphOrDisplayError is called
    refreshGraphOrDisplayError(status, errorMessage, mockRefresh, vi.mocked(showErrorDialog));

    // Then: onRefresh (graph refresh) is called, error dialog is NOT shown
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("calls showErrorDialog when status is an error message (TC-FT-A-02)", () => {
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
    autoCenterCommitDetailsView: false,
    dateFormat: "Date & Time",
    fetchAvatars: false,
    graphColours: ["#0085d9"],
    graphStyle: "rounded",
    initialLoadCommits: 300,
    loadMoreCommits: 100,
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
    // Set prevState with findWidgetState for TC-FI-N-11
    vi.mocked(vscode.getState).mockReturnValueOnce(
      MOCK_PREV_STATE as ReturnType<typeof vscode.getState>
    );
    await import("../../web/main");
    // Respond to the auto-request from constructor
    loadTestCommits();
    // Check if restoreState was called during init (for TC-FI-N-11)
    restoreStateCaptured = mockFindWidgetInstance.restoreState.mock.calls.length > 0;
  });

  beforeEach(() => {
    resetCommitState();
  });

  /* ---------------------------------------------------------------- */
  /* Comparison mode state transitions                                */
  /* ---------------------------------------------------------------- */

  describe("comparison mode state transitions", () => {
    it("normal click sends commitDetails request (TC-FI-N-01)", () => {
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

    it("Ctrl+click different commit enters compare mode (TC-FI-N-02)", () => {
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

    it("Ctrl+click same compare target cancels comparison (TC-FI-N-03)", () => {
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

    it("Ctrl+click different commit changes comparison target (TC-FI-N-04)", () => {
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

    it("normal click in compare mode cancels compare and shows new detail (TC-FI-N-05)", () => {
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

    it("Ctrl+click without expanded commit shows normal detail (TC-FI-B-01)", () => {
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

    it("uncommitted changes as expanded commit + Ctrl+click sends compare with fromHash='*' (TC-FI-B-02)", () => {
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
    it("ResponseCompareCommits with fileChanges shows compare details (TC-FI-N-06)", () => {
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

    it("ResponseCompareCommits with fileChanges: null shows error dialog (TC-FI-A-01)", () => {
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

    it("file click in compare mode includes compareWithHash in viewDiff (TC-FI-N-07)", () => {
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

    it("accepts ResponseCompareCommits with reordered fromHash/toHash (TC-FI-N-15)", () => {
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

    it("restores unsavedChanges srcElem after table re-render (TC-FI-N-16)", () => {
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

    it("Ctrl+click unsaved changes row enters compare mode with UNCOMMITTED_CHANGES_HASH as fromHash (TC-FI-N-12)", () => {
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

    it("Ctrl+click same unsaved changes row cancels comparison (TC-FI-N-13)", () => {
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

    it("normal click on unsaved changes sends commitDetails (TC-FI-N-14)", () => {
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
    it("Ctrl+F triggers FindWidget.show() (TC-FI-N-08)", () => {
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

    it("search button click triggers FindWidget.show() (TC-FI-N-09)", () => {
      // Given: the page is loaded with commits rendered
      const searchBtn = document.getElementById("searchBtn");
      expect(searchBtn).not.toBeNull();

      // When: the search button is clicked
      searchBtn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      // Then: FindWidget.show is called with transition = true
      expect(mockFindWidgetInstance.show).toHaveBeenCalledTimes(1);
      expect(mockFindWidgetInstance.show).toHaveBeenCalledWith(true);
    });

    it("saveState includes findWidgetState from FindWidget.getState() (TC-FI-N-10)", () => {
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

    it("restoreState is called with findWidgetState during initialization (TC-FI-N-11)", () => {
      // Given: prevState had findWidgetState set (configured in beforeAll)
      // When: GitGraphView was constructed (in beforeAll)
      // Then: findWidget.restoreState was called during initialization
      expect(restoreStateCaptured).toBe(true);
    });
  });
});

/* ------------------------------------------------------------------ */
/* FindWidget backward compatibility (separate module scope)          */
/* ------------------------------------------------------------------ */

describe("GitGraphView findWidgetState backward compatibility", () => {
  it("prevState without findWidgetState does not call restoreState (TC-FI-B-03)", async () => {
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
