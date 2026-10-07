// @vitest-environment jsdom
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi
} from "vitest";

import type {
  GitCommitDetails,
  GitCommitNode,
  GitCommitStash,
  GitFileChange,
  GitFileChangeType,
  GitRef,
  RequestCommitDetails,
  RequestMessage
} from "../../src/types";
import { UNCOMMITTED_CHANGES_HASH } from "../../src/types";

/* ------------------------------------------------------------------ */
/* Hoisted mocks (shared references for mock factories + assertions)  */
/* ------------------------------------------------------------------ */

const {
  mockFindWidgetInstance,
  capturedConfig,
  mockMutedResult,
  mockGraphNavigation,
  mockGraphHighlight,
  mockFileHistoryInstance,
  capturedFileHistoryCallbacks,
  mockFileHistoryConstructor
} = vi.hoisted(() => {
  const capturedFileHistoryCallbacks = {
    ref: null as Record<string, (...args: never[]) => unknown> | null
  };
  const mockFileHistoryInstance = {
    request: vi.fn(),
    handleResponse: vi.fn(),
    onCommitsRendered: vi.fn(),
    onRepositoryChanged: vi.fn(),
    handleCommitRowClick: vi.fn(),
    navigate: vi.fn<(delta: -1 | 1, useExpandedCommit?: boolean) => string | null>(() => null),
    exit: vi.fn(),
    isActive: vi.fn((): boolean => false),
    isPending: vi.fn((): boolean => false),
    getCurrentHash: vi.fn((): string | null => null),
    getHistoricalPathFor: vi.fn<(hash: string) => string | null>(() => null)
  };
  return {
    capturedConfig: { ref: null as Record<string, unknown> | null },
    mockMutedResult: { value: [] as boolean[] },
    mockGraphNavigation: {
      getFirstParentIndex: vi.fn((): number => -1),
      getFirstChildIndex: vi.fn((): number => -1),
      getAlternativeParentIndex: vi.fn((): number => -1),
      getAlternativeChildIndex: vi.fn((): number => -1)
    },
    mockGraphHighlight: {
      loadCommits: vi.fn(),
      render: vi.fn(),
      setFileHistoryHighlight: vi.fn(),
      setPathHighlight: vi.fn()
    },
    mockFileHistoryInstance,
    capturedFileHistoryCallbacks,
    // A hoisted constructor keeps its call history across vi.resetModules() re-imports.
    mockFileHistoryConstructor: vi.fn(function (
      callbacks: Record<string, (...args: never[]) => unknown>
    ) {
      capturedFileHistoryCallbacks.ref = callbacks;
      return mockFileHistoryInstance;
    }),
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
  };
});

/* ------------------------------------------------------------------ */
/* Mock: fileHistory module (controller is observed, not executed)   */
/* ------------------------------------------------------------------ */

vi.mock("../../web/fileHistory", () => ({
  CLASS_FILE_HISTORY_CURRENT: "fileHistoryCurrent",
  CLASS_FILE_HISTORY_NOTE: "fileHistoryNote",
  FILE_HISTORY_BAR_ID: "fileHistoryBar",
  FileHistoryController: mockFileHistoryConstructor
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
  }),
  getCommitElems: vi.fn(
    () => document.getElementsByClassName("commit") as HTMLCollectionOf<HTMLElement>
  ),
  findCommitElemWithId: vi.fn(
    (elems: HTMLCollectionOf<HTMLElement>, id: number | null): HTMLElement | null => {
      if (id === null) return null;
      const idStr = id.toString();
      for (let i = 0; i < elems.length; i++) {
        if (idStr === elems[i].dataset.id) return elems[i];
      }
      return null;
    }
  )
}));

/* ------------------------------------------------------------------ */
/* Mock: graph module                                                 */
/* ------------------------------------------------------------------ */

vi.mock("../../web/graph", () => ({
  Graph: vi.fn(function (_elemId: string, config: Record<string, unknown>) {
    capturedConfig.ref = config;
    return {
      loadCommits: mockGraphHighlight.loadCommits,
      render: mockGraphHighlight.render,
      clear: vi.fn(),
      getVertexColour: vi.fn(() => 0),
      getMutedCommits: vi.fn(() => mockMutedResult.value),
      getFirstParentIndex: mockGraphNavigation.getFirstParentIndex,
      getFirstChildIndex: mockGraphNavigation.getFirstChildIndex,
      getAlternativeParentIndex: mockGraphNavigation.getAlternativeParentIndex,
      getAlternativeChildIndex: mockGraphNavigation.getAlternativeChildIndex,
      getWidth: vi.fn(() => 100),
      getHeight: vi.fn(() => 500),
      limitMaxWidth: vi.fn(),
      setFileHistoryHighlight: mockGraphHighlight.setFileHistoryHighlight,
      setPathHighlight: mockGraphHighlight.setPathHighlight
    };
  })
}));

/* ------------------------------------------------------------------ */
/* Mock: dropdown module                                              */
/* ------------------------------------------------------------------ */

const { mockRepoDropdownInstance, mockBranchDropdownInstance, mockAuthorDropdownInstance } =
  vi.hoisted(() => ({
    mockRepoDropdownInstance: {
      setOptions: vi.fn(),
      refresh: vi.fn(),
      isOpen: vi.fn(() => false),
      close: vi.fn(),
      cancelAndClose: vi.fn()
    },
    mockBranchDropdownInstance: {
      setOptions: vi.fn(),
      refresh: vi.fn(),
      isOpen: vi.fn(() => false),
      close: vi.fn(),
      cancelAndClose: vi.fn()
    },
    mockAuthorDropdownInstance: {
      setOptions: vi.fn(),
      refresh: vi.fn(),
      isOpen: vi.fn(() => false),
      close: vi.fn(),
      cancelAndClose: vi.fn()
    }
  }));

const DROPDOWN_INSTANCES = [
  mockRepoDropdownInstance,
  mockBranchDropdownInstance,
  mockAuthorDropdownInstance
];
let dropdownCallCount = 0;
let capturedRepoCallback: ((value: string) => void) | null = null;
let capturedBranchCallback: ((values: string[]) => void) | null = null;
let capturedAuthorCallback: ((values: string[]) => void) | null = null;
vi.mock("../../web/dropdown", () => ({
  Dropdown: vi.fn(function (
    _id: string,
    _showInfo: boolean,
    _type: string,
    callback?: ((value: string) => void) | ((values: string[]) => void),
    _multipleAllowed?: boolean
  ) {
    const index = dropdownCallCount % DROPDOWN_INSTANCES.length;
    dropdownCallCount++;
    // 1st=repoDropdown, 2nd=branchDropdown, 3rd=authorDropdown
    if (index === 0 && callback) {
      capturedRepoCallback = callback as (value: string) => void;
    }
    if (index === 1 && callback) {
      capturedBranchCallback = callback as (values: string[]) => void;
    }
    if (index === 2 && callback) {
      capturedAuthorCallback = callback as (values: string[]) => void;
    }
    return DROPDOWN_INSTANCES[index];
  })
}));

/* ------------------------------------------------------------------ */
/* Mock: contextMenu module                                           */
/* ------------------------------------------------------------------ */

vi.mock("../../web/contextMenu", () => ({
  hideContextMenu: vi.fn(),
  hideContextMenuListener: vi.fn(),
  isContextMenuActive: vi.fn(() => false),
  recordRecentAction: vi.fn(),
  showContextMenu: vi.fn()
}));

/* ------------------------------------------------------------------ */
/* Mock: branchLabels module                                          */
/* ------------------------------------------------------------------ */

vi.mock("../../web/branchLabels", () => ({
  getBranchLabels: vi.fn(() => ({ heads: [], remotes: [], tags: [] }))
}));

/* ------------------------------------------------------------------ */
/* Mock: refMenu module                                               */
/* ------------------------------------------------------------------ */

vi.mock("../../web/refMenu", () => ({
  buildRefContextMenuItems: vi.fn(() => []),
  checkoutBranchAction: vi.fn(),
  showDeleteBranchDialog: vi.fn()
}));

/* ------------------------------------------------------------------ */
/* Mock: worktreeMenu module                                          */
/* ------------------------------------------------------------------ */

vi.mock("../../web/worktreeMenu", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../web/worktreeMenu")>();
  return { ...actual, buildDetachedWorktreeContextMenuItems: vi.fn(() => []) };
});

/* ------------------------------------------------------------------ */
/* Mock: branchCleanupPanel module                                    */
/* ------------------------------------------------------------------ */

const { mockBranchCleanupPanelInstance, capturedPanelActions, mockPanelOpen } = vi.hoisted(() => {
  const mockPanelOpen = { value: false };
  return {
    mockPanelOpen,
    capturedPanelActions: {
      ref: null as {
        showBranch: (branchName: string) => void;
        showDeleteDialog: (repo: string, branchName: string, remotes: string[]) => void;
      } | null
    },
    mockBranchCleanupPanelInstance: {
      toggle: vi.fn(),
      refresh: vi.fn(),
      selectRepository: vi.fn(),
      handleResponse: vi.fn(),
      isOpen: vi.fn((): boolean => mockPanelOpen.value)
    }
  };
});

vi.mock("../../web/branchCleanupPanel", () => ({
  BranchCleanupPanel: vi.fn(function (actions: never) {
    capturedPanelActions.ref = actions;
    return mockBranchCleanupPanelInstance;
  })
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
  generateGitFileTreeHtml: vi.fn(() => "<table></table>"),
  generateGitFileListHtml: vi.fn(() => '<ul class="gitFolderContents"></ul>')
}));

import { getBranchLabels } from "../../web/branchLabels";
import {
  hideContextMenu,
  isContextMenuActive,
  recordRecentAction,
  showContextMenu
} from "../../web/contextMenu";
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
import {
  type FileHistoryActionPredicate,
  generateGitFileListHtml,
  generateGitFileTreeHtml
} from "../../web/fileTree";
import { PathHighlightMode } from "../../web/pathHighlight";
import { buildRefContextMenuItems, checkoutBranchAction } from "../../web/refMenu";
import { RefOverflowController } from "../../web/refOverflow";
import { buildStashContextMenuItems } from "../../web/stashMenu";
import { buildUncommittedContextMenuItems } from "../../web/uncommittedMenu";
import {
  buildCommitRowAttributes,
  buildStashSelectorDisplay,
  escapeHtml,
  refreshGraphOrDisplayError,
  sendMessage,
  svgIcons,
  vscode
} from "../../web/utils";
import { buildDetachedWorktreeContextMenuItems } from "../../web/worktreeMenu";

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
  function isContextMenuItem(item: ContextMenuElement): item is ContextMenuItem {
    return item !== null && "onClick" in item;
  }

  function isContextMenuSubmenu(item: ContextMenuElement): item is ContextMenuSubmenu {
    return item !== null && "submenu" in item;
  }

  function getMoreSubmenu(items: ContextMenuElement[]): ContextMenuSubmenu {
    const submenu = items[3];
    expect(isContextMenuSubmenu(submenu)).toBe(true);
    return submenu as ContextMenuSubmenu;
  }

  function getCreateBranchFromStashItem(items: ContextMenuElement[]): ContextMenuItem {
    const item = getMoreSubmenu(items).submenu[0];
    expect(isContextMenuItem(item)).toBe(true);
    return item as ContextMenuItem;
  }

  function getDropStashItem(items: ContextMenuElement[]): ContextMenuItem {
    const item = getMoreSubmenu(items).submenu[1];
    expect(isContextMenuItem(item)).toBe(true);
    return item as ContextMenuItem;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(vscode.postMessage).mockClear();
  });

  it("returns 7 items (Apply, Pop, More, separators, copy actions) for stash context menu (TC-006)", () => {
    // Given: stash !== null commit row
    // When: stash context menu items are built
    const items = buildStashContextMenuItems(MOCK_REPO, MOCK_HASH, MOCK_SELECTOR, MOCK_SOURCE_ELEM);

    // Then: 7 items including separator (null)
    expect(items).toHaveLength(7);
    expect(items[0]).not.toBeNull();
    expect(items[1]).not.toBeNull();
    expect(items[2]).toBeNull();
    expect(items[3]).not.toBeNull();
    expect(items[4]).toBeNull();
    expect(items[5]).not.toBeNull();
    expect(items[6]).not.toBeNull();

    // Verify menu item titles
    expect(items[0]!.title).toContain("Apply Stash");
    expect(items[1]!.title).toContain("Pop Stash");
    expect(items[3]!.title).toContain("More...");
    expect(getMoreSubmenu(items).submenu.map((item) => item?.title ?? null)).toEqual([
      "Create Branch from Stash&#8230;",
      "Drop Stash&#8230;"
    ]);
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
    items[1]!.onClick();
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
    getDropStashItem(items).onClick();

    // Then: showConfirmationDialog is called
    expect(showConfirmationDialog).toHaveBeenCalledTimes(1);
  });

  it("sends dropStash message when Drop is confirmed (TC-012)", () => {
    // Given: stash context menu items
    const items = buildStashContextMenuItems(MOCK_REPO, MOCK_HASH, MOCK_SELECTOR, MOCK_SOURCE_ELEM);
    getDropStashItem(items).onClick();

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
    getCreateBranchFromStashItem(items).onClick();

    // Then: showRefInputDialog is called
    expect(showRefInputDialog).toHaveBeenCalledTimes(1);
  });

  it("sends branchFromStash message when Branch dialog is confirmed (TC-014)", () => {
    // Given: stash context menu items
    const items = buildStashContextMenuItems(MOCK_REPO, MOCK_HASH, MOCK_SELECTOR, MOCK_SOURCE_ELEM);
    getCreateBranchFromStashItem(items).onClick();

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
    (globalThis as Record<string, unknown>).viewState = {
      dialogDefaults: {
        merge: { noFastForward: true, squashCommits: false, noCommit: false },
        cherryPick: { recordOrigin: false, noCommit: false },
        stashUncommittedChanges: { includeUntracked: false },
        createWorktree: { openTerminal: true },
        removeWorktree: { deleteBranch: true }
      }
    };
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
  selectedBranches: [],
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
  },
  selectedAuthors: []
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
    '<div id="authorSelect"></div>',
    '<input id="showRemoteBranchesCheckbox" type="checkbox" checked />',
    '<div id="scrollShadow"></div>',
    '<div id="refreshBtn"></div>',
    '<div id="branchCleanupBtn"></div>',
    '<div id="branchCleanupPanel" hidden></div>',
    '<div id="fetchBtn"></div>',
    '<div id="currentBtn"></div>',
    '<div id="searchBtn"></div>',
    '<div id="controls"></div>'
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
    showCurrentBranchByDefault: false,
    dialogDefaults: {
      merge: { noFastForward: true, squashCommits: false, noCommit: false },
      cherryPick: { recordOrigin: false, noCommit: false },
      stashUncommittedChanges: { includeUntracked: false },
      createWorktree: { openTerminal: true },
      removeWorktree: { deleteBranch: true }
    }
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
    committerEmail: "",
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
const _CDV_HEIGHT_DEDUCTION = 55;

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

/** File history states of the mocked controller that the key and Escape routing depend on. */
interface HistoryMode {
  name: string;
  isActive: boolean;
  isPending: boolean;
}

const HIGHLIGHTED_ONLY: HistoryMode = {
  name: "highlighted only",
  isActive: true,
  isPending: false
};
const INITIAL_PENDING: HistoryMode = {
  name: "the first request pending",
  isActive: false,
  isPending: true
};
const SWITCH_PENDING: HistoryMode = {
  name: "highlighted with a switch pending",
  isActive: true,
  isPending: true
};
const PENDING_MODES = [INITIAL_PENDING, SWITCH_PENDING];
const HISTORY_MODES = [HIGHLIGHTED_ONLY, ...PENDING_MODES];

function enterHistoryMode(mode: HistoryMode): void {
  mockFileHistoryInstance.isActive.mockReturnValue(mode.isActive);
  mockFileHistoryInstance.isPending.mockReturnValue(mode.isPending);
}

function leaveHistoryMode(): void {
  mockFileHistoryInstance.isActive.mockReturnValue(false);
  mockFileHistoryInstance.isPending.mockReturnValue(false);
  mockFileHistoryInstance.navigate.mockReturnValue(null);
}

/* ------------------------------------------------------------------ */
/* Integration: comparison mode & FindWidget (Task 4.3)               */
/* ------------------------------------------------------------------ */

describe("GitKeizuView frontend integration", () => {
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

      // Then: commitDetails DOM element is created with "Displaying all changes from ... to ..." text
      const detailsElem = document.getElementById("commitDetails");
      expect(detailsElem).not.toBeNull();
      expect(detailsElem!.innerHTML).toContain("Displaying all changes from");
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

      // Override generateGitFileTreeHtml to return a file row with its diff button
      vi.mocked(generateGitFileTreeHtml).mockReturnValueOnce(
        '<table><tr class="gitFile gitDiffPossible" data-oldfilepath="old.ts" data-newfilepath="new.ts" data-type="M"><td><button type="button" class="gitFileDiff">new.ts</button></td></tr></table>'
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

      // When: the diff button of a file row in the commit details is clicked
      const fileElem = document.querySelector(".gitFile.gitDiffPossible .gitFileDiff");
      expect(fileElem).not.toBeNull();
      fileElem!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      // Then: viewDiff message includes compareWithHash, with hashes normalized to old→new
      // getCommitOrder treats higher index as older, so COMMIT_HASH_2 (idx 1) becomes commitHash (left)
      expect(vscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "viewDiff",
          commitHash: COMMIT_HASH_2,
          oldFilePath: "old.ts",
          newFilePath: "new.ts",
          type: "M",
          compareWithHash: COMMIT_HASH_1
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
      expect(detailsElem!.innerHTML).toContain("Displaying all changes from");
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
      // When: GitKeizuView was constructed (in beforeAll)
      // Then: findWidget.restoreState was called during initialization
      expect(restoreStateCaptured).toBe(true);
    });
  });

  /* ---------------------------------------------------------------- */
  /* saveState() scrollTop (S27)                                      */
  /* ---------------------------------------------------------------- */

  describe("saveState() scrollTop (S27)", () => {
    let scrollContainer: HTMLElement;

    beforeEach(() => {
      scrollContainer = document.getElementById("scrollContainer")!;
    });

    afterEach(() => {
      delete (scrollContainer as Record<string, unknown>).scrollTop;
    });

    it("saves scrollTop value in vscode.setState (TC-158)", () => {
      // Given: scrollContainerElem.scrollTop = 500
      Object.defineProperty(scrollContainer, "scrollTop", {
        value: 500,
        writable: true,
        configurable: true
      });

      // When: an action that triggers saveState occurs
      clickCommit(COMMIT_HASH_1);

      // Then: vscode.setState was called with scrollTop: 500
      const lastCall = vi.mocked(vscode.setState).mock.calls.at(-1);
      expect(lastCall).toBeDefined();
      const savedState = lastCall![0] as WebViewState;
      expect(savedState.scrollTop).toBe(500);
    });

    it("saves scrollTop: 0 when at top position (TC-159)", () => {
      // Given: scrollContainerElem.scrollTop = 0 (top position)
      Object.defineProperty(scrollContainer, "scrollTop", {
        value: 0,
        writable: true,
        configurable: true
      });

      // When: an action that triggers saveState occurs
      clickCommit(COMMIT_HASH_1);

      // Then: vscode.setState was called with scrollTop: 0
      const lastCall = vi.mocked(vscode.setState).mock.calls.at(-1);
      expect(lastCall).toBeDefined();
      const savedState = lastCall![0] as WebViewState;
      expect(savedState.scrollTop).toBe(0);
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
      //   srcElemTop = 100 - 24 = 76, headerHeight = 1
      //   Top check: 76 < 200 + 1 + 8 = 209 → true (above viewport)
      setupScrollEnvironment({ scrollTop: 200, clientHeight: 500, cdvOffsetTop: 100 });

      // When: a commit is expanded
      expandCommit(COMMIT_HASH_1);

      // Then: scrollTop = srcElemTop - headerHeight - CDV_SCROLL_PADDING = 76 - 1 - 8 = 67
      const headerHeight = 1; // jsdom default: clientHeight=0, +1
      expect(scrollContainer.scrollTop).toBe(
        100 - MOCK_COMMIT_ROW_HEIGHT - headerHeight - CDV_SCROLL_PADDING
      );
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
  /* setShowRecentActions() runtime sync (S29)                        */
  /* ---------------------------------------------------------------- */

  describe("setShowRecentActions()", () => {
    function getViewState(): Record<string, unknown> {
      return (globalThis as Record<string, unknown>).viewState as Record<string, unknown>;
    }

    it("updates viewState.showRecentActions to false without disturbing other state (TC-214)", () => {
      // Given: existing viewState with showRecentActions=true
      const viewState = getViewState();
      viewState.showRecentActions = true;
      const reposBefore = viewState.repos;
      const lastActiveRepoBefore = viewState.lastActiveRepo;
      const scrollContainer = document.getElementById("scrollContainer");
      const scrollTopBefore = scrollContainer?.scrollTop ?? 0;
      vi.clearAllMocks();

      // When: setShowRecentActions(false) message is dispatched
      dispatchMessage({ command: "setShowRecentActions", showRecentActions: false });

      // Then: only the runtime flag is updated; no reload, save, repo, or scroll side effects
      expect(viewState.showRecentActions).toBe(false);
      expect(viewState.repos).toBe(reposBefore);
      expect(viewState.lastActiveRepo).toBe(lastActiveRepoBefore);
      expect(scrollContainer?.scrollTop ?? 0).toBe(scrollTopBefore);
      expect(vscode.setState).not.toHaveBeenCalled();
      expect(vscode.postMessage).not.toHaveBeenCalled();
    });

    it("updates viewState.showRecentActions to true without disturbing other state (TC-215)", () => {
      // Given: existing viewState with showRecentActions=false
      const viewState = getViewState();
      viewState.showRecentActions = false;
      vi.clearAllMocks();

      // When: setShowRecentActions(true) message is dispatched
      dispatchMessage({ command: "setShowRecentActions", showRecentActions: true });

      // Then: viewState.showRecentActions becomes true and no other side effects fire
      expect(viewState.showRecentActions).toBe(true);
      expect(vscode.setState).not.toHaveBeenCalled();
      expect(vscode.postMessage).not.toHaveBeenCalled();
    });
  });

  /* ---------------------------------------------------------------- */
  /* normalizeCommitLoadCount() helper (web/main-test 07-load-count)  */
  /* ---------------------------------------------------------------- */

  describe("normalizeCommitLoadCount()", () => {
    let normalize: typeof import("../../web/main").normalizeCommitLoadCount;

    beforeAll(async () => {
      // main.ts is already loaded by the outer beforeAll; this just retrieves the export
      const mainModule = await import("../../web/main");
      normalize = mainModule.normalizeCommitLoadCount;
    });

    it("normalizes 0 to 1 even when default is large (TC-216)", () => {
      // Case: TC-216
      // Given: a stored maxCommits of 0 (legacy state)
      // When: normalized with default 300
      const result = normalize(0, 300);
      // Then: lower bound 1 is enforced
      expect(result).toBe(1);
    });

    it("normalizes negative value to 1 (TC-217)", () => {
      // Case: TC-217
      // Given: a stored maxCommits of -50 (corrupted state)
      // When: normalized with default 300
      const result = normalize(-50, 300);
      // Then: lower bound 1 is enforced
      expect(result).toBe(1);
    });

    it("falls back to defaultValue when value is not finite (TC-218)", () => {
      // Case: TC-218
      // Given: maxCommits is NaN
      // When: normalized with default 300
      const result = normalize(Number.NaN, 300);
      // Then: the default value is used (and is itself >= 1)
      expect(result).toBe(300);
    });

    it("preserves positive values above the floor (TC-219)", () => {
      // Case: TC-219
      // Given: a typical Load More result of 400 (300 + 100)
      // When: normalized with default 300
      const result = normalize(400, 300);
      // Then: the original value is returned
      expect(result).toBe(400);
    });

    it("uses the floor when defaultValue is itself less than 1 (TC-220)", () => {
      // Case: TC-220
      // Given: a corrupted default and a non-finite incoming value
      // When: normalized
      const result = normalize(Number.NaN, 0);
      // Then: the floor (1) is enforced even when defaultValue would be below it
      expect(result).toBe(1);
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
  /* handleKeyboardShortcut() Arrow key navigation (S29-S31, S46, S64) */
  /* Superseded by 13-keyboard-accessibility-01.md S70 / S71: the keys  */
  /* apply from the focused target row, and move the target even       */
  /* without details or while comparing.                               */
  /* ---------------------------------------------------------------- */

  describe("handleKeyboardShortcut() Arrow key navigation", () => {
    interface ArrowKeySpies {
      preventDefault: ReturnType<typeof vi.spyOn>;
      stopPropagation: ReturnType<typeof vi.spyOn>;
    }

    /** The row that carries the list's tab stop (the row target), with real focus on it. */
    function focusedTargetRow(): HTMLElement {
      const target = document.querySelector<HTMLElement>(
        '#commitTable tr[data-hash][tabindex="0"]'
      );
      if (target === null) throw new Error("No row target");
      target.focus();
      return target;
    }

    function targetHash(): string | undefined {
      return document.querySelector<HTMLElement>('#commitTable tr[data-hash][tabindex="0"]')
        ?.dataset.hash;
    }

    function dispatchArrowKey(
      key: string,
      options?: {
        ctrlKey?: boolean;
        metaKey?: boolean;
        shiftKey?: boolean;
        altKey?: boolean;
        isComposing?: boolean;
        target?: HTMLElement;
      }
    ): ArrowKeySpies {
      const event = new KeyboardEvent("keydown", {
        key,
        ctrlKey: options?.ctrlKey ?? false,
        metaKey: options?.metaKey ?? false,
        shiftKey: options?.shiftKey ?? false,
        altKey: options?.altKey ?? false,
        bubbles: true,
        cancelable: true
      });
      if (options?.isComposing) {
        Object.defineProperty(event, "isComposing", { value: true });
      }
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation");
      (options?.target ?? focusedTargetRow()).dispatchEvent(event);
      return { preventDefault: preventDefaultSpy, stopPropagation: stopPropagationSpy };
    }

    beforeEach(() => {
      vi.clearAllMocks();
      mockGraphNavigation.getFirstParentIndex.mockReturnValue(-1);
      mockGraphNavigation.getFirstChildIndex.mockReturnValue(-1);
      mockGraphNavigation.getAlternativeParentIndex.mockReturnValue(-1);
      mockGraphNavigation.getAlternativeChildIndex.mockReturnValue(-1);
    });

    /* S29: table order navigation */

    describe("table order navigation (S29)", () => {
      it("ArrowDown moves to next commit (TC-164)", () => {
        // Given: commit at index 1 (COMMIT_HASH_2) is expanded
        expandCommit(COMMIT_HASH_2);

        // When: ArrowDown pressed with no modifiers
        dispatchArrowKey("ArrowDown");

        // Then: loadCommitDetails is called for index 2 (COMMIT_HASH_3)
        expect(vscode.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ command: "commitDetails", commitHash: COMMIT_HASH_3 })
        );
      });

      it("ArrowUp moves to previous commit (TC-165)", () => {
        // Given: commit at index 1 (COMMIT_HASH_2) is expanded
        expandCommit(COMMIT_HASH_2);

        // When: ArrowUp pressed with no modifiers
        dispatchArrowKey("ArrowUp");

        // Then: loadCommitDetails is called for index 0 (COMMIT_HASH_1)
        expect(vscode.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ command: "commitDetails", commitHash: COMMIT_HASH_1 })
        );
      });

      it("ArrowUp at table start does nothing (TC-166)", () => {
        // Given: commit at index 0 (COMMIT_HASH_1, first in table) is expanded
        expandCommit(COMMIT_HASH_1);

        // When: ArrowUp pressed
        const spies = dispatchArrowKey("ArrowUp");

        // Then: no navigation occurs
        expect(vscode.postMessage).not.toHaveBeenCalled();
        expect(spies.preventDefault).not.toHaveBeenCalled();
      });

      it("ArrowDown at table end does nothing (TC-167)", () => {
        // Given: commit at index 2 (COMMIT_HASH_3, last in table) is expanded
        expandCommit(COMMIT_HASH_3);

        // When: ArrowDown pressed
        const spies = dispatchArrowKey("ArrowDown");

        // Then: no navigation occurs
        expect(vscode.postMessage).not.toHaveBeenCalled();
        expect(spies.preventDefault).not.toHaveBeenCalled();
      });
    });

    /* S30: branch tracking navigation */

    describe("branch tracking navigation (S30)", () => {
      it("Ctrl+ArrowDown navigates to first parent (TC-168)", () => {
        // Given: commit at index 1 is expanded, getFirstParentIndex returns 2
        expandCommit(COMMIT_HASH_2);
        mockGraphNavigation.getFirstParentIndex.mockReturnValue(2);

        // When: Ctrl+ArrowDown pressed
        dispatchArrowKey("ArrowDown", { ctrlKey: true });

        // Then: loadCommitDetails is called for index 2 (COMMIT_HASH_3)
        expect(vscode.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ command: "commitDetails", commitHash: COMMIT_HASH_3 })
        );
        expect(mockGraphNavigation.getFirstParentIndex).toHaveBeenCalledWith(1);
      });

      it("Ctrl+ArrowUp navigates to first child (TC-169)", () => {
        // Given: commit at index 1 is expanded, getFirstChildIndex returns 0
        expandCommit(COMMIT_HASH_2);
        mockGraphNavigation.getFirstChildIndex.mockReturnValue(0);

        // When: Ctrl+ArrowUp pressed
        dispatchArrowKey("ArrowUp", { ctrlKey: true });

        // Then: loadCommitDetails is called for index 0 (COMMIT_HASH_1)
        expect(vscode.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ command: "commitDetails", commitHash: COMMIT_HASH_1 })
        );
        expect(mockGraphNavigation.getFirstChildIndex).toHaveBeenCalledWith(1);
      });

      it("Ctrl+ArrowDown at branch end does nothing (TC-170)", () => {
        // Given: commit at index 2 is expanded, getFirstParentIndex returns -1
        expandCommit(COMMIT_HASH_3);
        mockGraphNavigation.getFirstParentIndex.mockReturnValue(-1);

        // When: Ctrl+ArrowDown pressed
        const spies = dispatchArrowKey("ArrowDown", { ctrlKey: true });

        // Then: no navigation occurs
        expect(vscode.postMessage).not.toHaveBeenCalled();
        expect(spies.preventDefault).not.toHaveBeenCalled();
      });

      it("Ctrl+ArrowUp at branch start does nothing (TC-171)", () => {
        // Given: commit at index 0 is expanded, getFirstChildIndex returns -1
        expandCommit(COMMIT_HASH_1);
        mockGraphNavigation.getFirstChildIndex.mockReturnValue(-1);

        // When: Ctrl+ArrowUp pressed
        const spies = dispatchArrowKey("ArrowUp", { ctrlKey: true });

        // Then: no navigation occurs
        expect(vscode.postMessage).not.toHaveBeenCalled();
        expect(spies.preventDefault).not.toHaveBeenCalled();
      });
    });

    /* S31: alternative branch navigation */

    describe("alternative branch navigation (S31)", () => {
      it("Ctrl+Shift+ArrowDown navigates to alternative parent (TC-172)", () => {
        // Given: commit at index 1 is expanded, getAlternativeParentIndex returns 2
        expandCommit(COMMIT_HASH_2);
        mockGraphNavigation.getAlternativeParentIndex.mockReturnValue(2);

        // When: Ctrl+Shift+ArrowDown pressed
        dispatchArrowKey("ArrowDown", { ctrlKey: true, shiftKey: true });

        // Then: loadCommitDetails is called for index 2 (COMMIT_HASH_3)
        expect(vscode.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ command: "commitDetails", commitHash: COMMIT_HASH_3 })
        );
        expect(mockGraphNavigation.getAlternativeParentIndex).toHaveBeenCalledWith(1);
      });

      it("Ctrl+Shift+ArrowUp navigates to alternative child (TC-173)", () => {
        // Given: commit at index 1 is expanded, getAlternativeChildIndex returns 0
        expandCommit(COMMIT_HASH_2);
        mockGraphNavigation.getAlternativeChildIndex.mockReturnValue(0);

        // When: Ctrl+Shift+ArrowUp pressed
        dispatchArrowKey("ArrowUp", { ctrlKey: true, shiftKey: true });

        // Then: loadCommitDetails is called for index 0 (COMMIT_HASH_1)
        expect(vscode.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ command: "commitDetails", commitHash: COMMIT_HASH_1 })
        );
        expect(mockGraphNavigation.getAlternativeChildIndex).toHaveBeenCalledWith(1);
      });

      it("Ctrl+Shift+ArrowDown with no alternative falls back (TC-174)", () => {
        // Given: commit at index 1 is expanded, getAlternativeParentIndex returns -1 (no alt)
        expandCommit(COMMIT_HASH_2);
        mockGraphNavigation.getAlternativeParentIndex.mockReturnValue(-1);

        // When: Ctrl+Shift+ArrowDown pressed
        const spies = dispatchArrowKey("ArrowDown", { ctrlKey: true, shiftKey: true });

        // Then: no navigation occurs (fallback: -1 means nothing to navigate to)
        expect(vscode.postMessage).not.toHaveBeenCalled();
        expect(spies.preventDefault).not.toHaveBeenCalled();
      });
    });

    /* S64: normal mode precondition checks */
    // @see docs/testing/perspectives/web/main-test/04-keyboard-selection-02.md

    describe("normal mode precondition checks (S64)", () => {
      it("expandedCommit null moves only the row target (TC-562)", () => {
        // Case: TC-562 (contract replaced by S70 TC-658: the target moves without details)
        // Given: normal mode and no commit is expanded (expandedCommit === null)
        resetCommitState();
        expect(targetHash()).toBe(COMMIT_HASH_1);

        // When: ArrowDown pressed on the target row
        const spies = dispatchArrowKey("ArrowDown");

        // Then: the target moves, no details request, the event is consumed and the history is
        // not asked
        expect(targetHash()).toBe(COMMIT_HASH_2);
        expect(vscode.postMessage).not.toHaveBeenCalled();
        expect(spies.preventDefault).toHaveBeenCalledTimes(1);
        expect(mockFileHistoryInstance.navigate).not.toHaveBeenCalled();
        expect(document.getElementById("commitDetails")).toBeNull();
      });

      it("compareWithHash non-null moves only the row target (TC-563)", () => {
        // Case: TC-563 (contract replaced by S70 TC-663: the target moves, the comparison stays)
        // Given: normal mode and a commit is expanded in comparison mode; the Ctrl+click made
        // the compare target the row target
        expandCommitWithCompare(COMMIT_HASH_2, COMMIT_HASH_3);
        expect(targetHash()).toBe(COMMIT_HASH_3);

        // When: ArrowUp pressed on the target row
        const spies = dispatchArrowKey("ArrowUp");

        // Then: only the target moves; no request, both compare rows unchanged, event consumed
        expect(targetHash()).toBe(COMMIT_HASH_2);
        expect(vscode.postMessage).not.toHaveBeenCalled();
        expect(spies.preventDefault).toHaveBeenCalledTimes(1);
        expect(
          document
            .querySelector(`.commit[data-hash="${COMMIT_HASH_2}"]`)!
            .classList.contains("commitDetailsOpen")
        ).toBe(true);
        expect(
          document
            .querySelector(`.commit[data-hash="${COMMIT_HASH_3}"]`)!
            .classList.contains("compareTarget")
        ).toBe(true);
      });

      it("hash not in commitLookup skips navigation (TC-564)", () => {
        // Case: TC-564
        // Given: expand a commit, then reload with different commits so hash is stale
        expandCommit(COMMIT_HASH_2);
        // Load different commits that don't include COMMIT_HASH_2
        const differentCommits: GitCommitNode[] = [
          {
            hash: COMMIT_HASH_1,
            parentHashes: [],
            author: "Alice",
            email: "alice@test.com",
            date: 1700000000,
            message: "First commit",
            refs: [],
            stash: null
          }
        ];
        dispatchMessage({
          command: "loadCommits",
          commits: differentCommits,
          head: COMMIT_HASH_1,
          moreCommitsAvailable: false,
          hard: true
        });
        vi.clearAllMocks();

        // When: ArrowDown pressed (expandedCommit hash not in new commitLookup)
        const spies = dispatchArrowKey("ArrowDown");

        // Then: no navigation (hash not found in commitLookup) and the event is not consumed
        expect(vscode.postMessage).not.toHaveBeenCalled();
        expect(spies.preventDefault).not.toHaveBeenCalled();
        expect(spies.stopPropagation).not.toHaveBeenCalled();

        // Cleanup: restore original commits
        dispatchMessage({
          command: "loadCommits",
          commits: MOCK_COMMITS,
          head: COMMIT_HASH_1,
          moreCommitsAvailable: false,
          hard: true
        });
      });

      it("isComposing true skips all processing (TC-565)", () => {
        // Case: TC-565
        // Given: normal mode and a commit is expanded
        expandCommit(COMMIT_HASH_2);

        // When: ArrowDown pressed during IME composition
        const spies = dispatchArrowKey("ArrowDown", { isComposing: true });

        // Then: entire handler is skipped and the event is not consumed
        expect(vscode.postMessage).not.toHaveBeenCalled();
        expect(spies.preventDefault).not.toHaveBeenCalled();
        expect(spies.stopPropagation).not.toHaveBeenCalled();
      });

      it("ArrowLeft key skips Arrow processing (TC-566)", () => {
        // Case: TC-566
        // Given: normal mode and a commit is expanded
        expandCommit(COMMIT_HASH_2);

        // When: ArrowLeft pressed
        const spies = dispatchArrowKey("ArrowLeft");

        // Then: Arrow navigation is not triggered and the event is not consumed
        expect(vscode.postMessage).not.toHaveBeenCalled();
        expect(spies.preventDefault).not.toHaveBeenCalled();
        expect(spies.stopPropagation).not.toHaveBeenCalled();
      });
    });

    /* S64: normal mode event control */
    // @see docs/testing/perspectives/web/main-test/04-keyboard-selection-02.md

    describe("normal mode event control (S64)", () => {
      it("successful navigation calls preventDefault and stopPropagation (TC-567)", () => {
        // Case: TC-567
        // Given: normal mode and the commit at index 1 is expanded
        expandCommit(COMMIT_HASH_2);

        // When: ArrowDown pressed (navigates to index 2)
        const spies = dispatchArrowKey("ArrowDown");

        // Then: event is consumed, the adjacent row is requested once and the history is not asked
        expect(spies.preventDefault).toHaveBeenCalledTimes(1);
        expect(spies.stopPropagation).toHaveBeenCalledTimes(1);
        expect(vscode.postMessage).toHaveBeenCalledTimes(1);
        expect(vscode.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ command: "commitDetails", commitHash: COMMIT_HASH_3 })
        );
        expect(mockFileHistoryInstance.navigate).not.toHaveBeenCalled();
      });

      it("failed navigation does not consume event (TC-568)", () => {
        // Case: TC-568
        // Given: normal mode and the commit at index 0 is expanded (table start)
        expandCommit(COMMIT_HASH_1);

        // When: ArrowUp pressed (no previous commit)
        const spies = dispatchArrowKey("ArrowUp");

        // Then: event is not consumed and no details are requested
        expect(spies.preventDefault).not.toHaveBeenCalled();
        expect(spies.stopPropagation).not.toHaveBeenCalled();
        expect(vscode.postMessage).not.toHaveBeenCalled();
      });

      it("Shift-only + ArrowUp moves only the target (TC-767)", () => {
        // Case: TC-569 → TC-767
        // Given: normal mode and a commit is expanded
        expandCommit(COMMIT_HASH_2);

        // When: Shift+ArrowUp pressed (no Ctrl/Cmd)
        const spies = dispatchArrowKey("ArrowUp", { shiftKey: true });

        // Then: the event is consumed and the details stay without a new request
        expect(vscode.postMessage).not.toHaveBeenCalled();
        expect(spies.preventDefault).toHaveBeenCalledTimes(1);
        expect(spies.stopPropagation).toHaveBeenCalledTimes(1);
      });

      it("Alt + ArrowUp skips Arrow processing (TC-570)", () => {
        // Case: TC-570
        // Given: normal mode and a commit is expanded
        expandCommit(COMMIT_HASH_2);

        // When: Alt+ArrowUp pressed
        const spies = dispatchArrowKey("ArrowUp", { altKey: true });

        // Then: Arrow processing is skipped (modifier pattern mismatch), event not consumed
        expect(vscode.postMessage).not.toHaveBeenCalled();
        expect(spies.preventDefault).not.toHaveBeenCalled();
        expect(spies.stopPropagation).not.toHaveBeenCalled();
      });
    });

    /* S46: Arrow ナビゲーション分岐の入力可能要素ガード */
    // @see docs/testing/perspectives/web/main-test/04-keyboard-selection-01.md

    describe("editable event-target guard (S46)", () => {
      const appendedTargets: HTMLElement[] = [];

      function appendTarget<T extends HTMLElement>(element: T): T {
        document.body.appendChild(element);
        appendedTargets.push(element);
        return element;
      }

      function dispatchKeyFromElement(
        target: HTMLElement,
        key: string,
        options?: { ctrlKey?: boolean }
      ): ArrowKeySpies {
        const event = new KeyboardEvent("keydown", {
          key,
          ctrlKey: options?.ctrlKey ?? false,
          bubbles: true,
          cancelable: true
        });
        const preventDefaultSpy = vi.spyOn(event, "preventDefault");
        const stopPropagationSpy = vi.spyOn(event, "stopPropagation");
        target.dispatchEvent(event);
        return { preventDefault: preventDefaultSpy, stopPropagation: stopPropagationSpy };
      }

      afterEach(() => {
        for (const target of appendedTargets.splice(0)) {
          target.remove();
        }
      });

      it("ArrowDown from an input element does not navigate commits (TC-257)", () => {
        // Case: TC-257
        // Given: a commit with a movable index is expanded and an input element exists
        expandCommit(COMMIT_HASH_2);
        const input = appendTarget(document.createElement("input"));

        // When: ArrowDown keydown is dispatched with the input as the event target
        const spies = dispatchKeyFromElement(input, "ArrowDown");

        // Then: no commit details load and the caret events are not consumed
        expect(vscode.postMessage).not.toHaveBeenCalled();
        expect(spies.preventDefault).not.toHaveBeenCalled();
        expect(spies.stopPropagation).not.toHaveBeenCalled();
      });

      it("ArrowUp from a textarea element does not navigate commits (TC-258)", () => {
        // Case: TC-258
        // Given: a commit with a movable index is expanded and a textarea element exists
        expandCommit(COMMIT_HASH_2);
        const textarea = appendTarget(document.createElement("textarea"));

        // When: ArrowUp keydown is dispatched with the textarea as the event target
        const spies = dispatchKeyFromElement(textarea, "ArrowUp");

        // Then: no commit details load and the caret events are not consumed
        expect(vscode.postMessage).not.toHaveBeenCalled();
        expect(spies.preventDefault).not.toHaveBeenCalled();
        expect(spies.stopPropagation).not.toHaveBeenCalled();
      });

      it("ArrowDown from a select element does not navigate commits (TC-259)", () => {
        // Case: TC-259
        // Given: a commit with a movable index is expanded and a select element exists
        expandCommit(COMMIT_HASH_2);
        const select = appendTarget(document.createElement("select"));

        // When: ArrowDown keydown is dispatched with the select as the event target
        const spies = dispatchKeyFromElement(select, "ArrowDown");

        // Then: no commit details load and the dropdown events are not consumed
        expect(vscode.postMessage).not.toHaveBeenCalled();
        expect(spies.preventDefault).not.toHaveBeenCalled();
        expect(spies.stopPropagation).not.toHaveBeenCalled();
      });

      it("ArrowDown from a contenteditable element does not navigate commits (TC-260)", () => {
        // Case: TC-260
        // Given: a commit with a movable index is expanded and a contenteditable element exists
        expandCommit(COMMIT_HASH_2);
        const editableDiv = appendTarget(document.createElement("div"));
        editableDiv.setAttribute("contenteditable", "true");

        // When: ArrowDown keydown is dispatched with the contenteditable div as the event target
        const spies = dispatchKeyFromElement(editableDiv, "ArrowDown");

        // Then: no commit details load and the editing events are not consumed
        expect(vscode.postMessage).not.toHaveBeenCalled();
        expect(spies.preventDefault).not.toHaveBeenCalled();
        expect(spies.stopPropagation).not.toHaveBeenCalled();
      });

      it("ArrowDown from document.body does not navigate (TC-261)", () => {
        // Case: TC-261 (contract replaced by S70: list keys need real focus on a row or label)
        // Given: a commit with an adjacent commit is expanded and the target is document.body
        expandCommit(COMMIT_HASH_2);

        // When: ArrowDown keydown is dispatched with document.body as the event target
        const spies = dispatchKeyFromElement(document.body, "ArrowDown");

        // Then: nothing loads, the target stays and the event is not consumed
        expect(vscode.postMessage).not.toHaveBeenCalled();
        expect(targetHash()).toBe(COMMIT_HASH_2);
        expect(spies.preventDefault).not.toHaveBeenCalled();
        expect(spies.stopPropagation).not.toHaveBeenCalled();
      });

      it("Ctrl+F from an input element leaves the input its own keys (TC-262)", () => {
        // Case: TC-262 (contract replaced by S72 TC-685: shortcuts apply from rows / labels)
        // Given: an input element is the event target
        const input = appendTarget(document.createElement("input"));

        // When: Ctrl+F keydown is dispatched from the input element
        dispatchKeyFromElement(input, "f", { ctrlKey: true });

        // Then: the find widget is not opened from the input
        expect(mockFindWidgetInstance.show).not.toHaveBeenCalled();
      });
    });

    /* S64: file history mode routing */
    // @see docs/testing/perspectives/web/main-test/04-keyboard-selection-02.md

    describe("file history mode (S64)", () => {
      const FIRST_MATCH = "h0";
      const ADJACENT_NON_MATCH = "x1";
      const RETURNED_MATCH = "h1";
      // h1 sits between two dim rows, so a leak into the table order would request x1 or x2.
      const MIDDLE_MATCH = RETURNED_MATCH;
      const OTHER_NON_MATCH = "x2";
      const LAST_MATCH = "h2";
      const MISSING_ROW_HASH = "zz";
      // Names describe table positions, not commit dates.
      const HISTORY_TABLE_HASHES = [
        FIRST_MATCH,
        ADJACENT_NON_MATCH,
        RETURNED_MATCH,
        OTHER_NON_MATCH,
        LAST_MATCH
      ];
      const LAST_MATCH_INDEX = HISTORY_TABLE_HASHES.indexOf(LAST_MATCH);
      const SCROLL_TOP_SENTINEL = 37;
      const ARROW_KEYS = ["ArrowUp", "ArrowDown"];

      interface ArrowModifier {
        name: string;
        init: { ctrlKey?: boolean; metaKey?: boolean };
      }

      const CTRL: ArrowModifier = { name: "Ctrl", init: { ctrlKey: true } };
      const CMD: ArrowModifier = { name: "Cmd", init: { metaKey: true } };

      const appendedTargets: HTMLElement[] = [];

      function appendTarget<T extends HTMLElement>(element: T): T {
        document.body.appendChild(element);
        appendedTargets.push(element);
        return element;
      }

      function createContentEditableHost(): HTMLElement {
        const host = appendTarget(document.createElement("div"));
        host.setAttribute("contenteditable", "true");
        return host;
      }

      function createContentEditableDescendant(): HTMLElement {
        const child = createContentEditableHost().appendChild(document.createElement("span"));
        // jsdom does not implement isContentEditable, which a browser inherits from the host.
        Object.defineProperty(child, "isContentEditable", { value: true, configurable: true });
        return child;
      }

      const EDITABLE_TARGETS: { name: string; create: () => HTMLElement }[] = [
        { name: "an input", create: () => appendTarget(document.createElement("input")) },
        { name: "a textarea", create: () => appendTarget(document.createElement("textarea")) },
        { name: "a select", create: () => appendTarget(document.createElement("select")) },
        { name: "a contenteditable element", create: createContentEditableHost },
        {
          name: "a descendant of a contenteditable element",
          create: createContentEditableDescendant
        }
      ];

      function resolveGraphMovesTo(index: number): void {
        for (const graphMove of Object.values(mockGraphNavigation)) {
          graphMove.mockReturnValue(index);
        }
      }

      function scrollContainer(): HTMLElement {
        return document.getElementById("scrollContainer")!;
      }

      /** Hash of the row the details view sits under, or null while no details are open. */
      function detailsOwnerHash(): string | null {
        const details = document.getElementById("commitDetails");
        if (details === null) return null;
        const owner = details.previousElementSibling;
        return owner instanceof HTMLElement ? (owner.dataset.hash ?? null) : null;
      }

      function expectConsumed(spies: ArrowKeySpies): void {
        expect(spies.preventDefault).toHaveBeenCalledTimes(1);
        expect(spies.stopPropagation).toHaveBeenCalledTimes(1);
      }

      function expectNotConsumed(spies: ArrowKeySpies): void {
        expect(spies.preventDefault).toHaveBeenCalledTimes(0);
        expect(spies.stopPropagation).toHaveBeenCalledTimes(0);
      }

      function expectNoGraphMove(): void {
        for (const [name, graphMove] of Object.entries(mockGraphNavigation)) {
          expect(graphMove, name).toHaveBeenCalledTimes(0);
        }
      }

      function historyCommit(hash: string): GitCommitNode {
        return {
          hash,
          parentHashes: [],
          author: "Alice",
          email: "alice@test.com",
          date: 1700000000,
          message: `Commit ${hash}`,
          refs: [],
          stash: null
        };
      }

      function commitDetailsRequests(): RequestMessage[] {
        return vi
          .mocked(vscode.postMessage)
          .mock.calls.map((call) => call[0])
          .filter((message) => message.command === "commitDetails");
      }

      function commitDetailsRequestFor(hash: string): RequestCommitDetails {
        return {
          command: "commitDetails",
          repo: TEST_REPO,
          commitHash: hash,
          hasParents: false,
          isStash: false
        };
      }

      beforeEach(() => {
        dispatchMessage({
          command: "loadCommits",
          commits: HISTORY_TABLE_HASHES.map(historyCommit),
          head: FIRST_MATCH,
          moreCommitsAvailable: false,
          hard: true
        });
        vi.clearAllMocks();
      });

      afterEach(() => {
        leaveHistoryMode();
        scrollContainer().scrollTop = 0;
        for (const target of appendedTargets.splice(0)) {
          target.remove();
        }
      });

      it("file history regression: ArrowDown without details requests the returned match (TC-571)", () => {
        // Case: TC-571
        // Given: highlighted only, no details open, and the controller resolves ArrowDown to h1
        mockFileHistoryInstance.isActive.mockReturnValue(true);
        mockFileHistoryInstance.navigate.mockReturnValue(RETURNED_MATCH);
        expect(document.getElementById("commitDetails")).toBeNull();

        // When: ArrowDown pressed with no modifiers
        const spies = dispatchArrowKey("ArrowDown");

        // Then: the only request is the details of h1 (none for the adjacent x1)
        expect(commitDetailsRequests()).toEqual([commitDetailsRequestFor(RETURNED_MATCH)]);
        expect(vscode.postMessage).toHaveBeenCalledTimes(1);
        expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(1);
        expect(mockFileHistoryInstance.navigate).toHaveBeenCalledWith(1, true);
        expect(spies.preventDefault).toHaveBeenCalledTimes(1);
        expect(spies.stopPropagation).toHaveBeenCalledTimes(1);
      });

      it("file history regression: ArrowDown with details skips the adjacent non-match (TC-572)", () => {
        // Case: TC-572
        // Given: highlighted only, the details of h0 open, and the controller resolves
        // ArrowDown to h1
        mockFileHistoryInstance.isActive.mockReturnValue(true);
        expandCommit(FIRST_MATCH);
        mockFileHistoryInstance.navigate.mockReturnValue(RETURNED_MATCH);

        // When: ArrowDown pressed with no modifiers
        const spies = dispatchArrowKey("ArrowDown");

        // Then: the only request is the details of h1 (none for the adjacent x1), without
        // falling back to the table order or the graph
        expect(commitDetailsRequests()).toEqual([commitDetailsRequestFor(RETURNED_MATCH)]);
        expect(vscode.postMessage).toHaveBeenCalledTimes(1);
        expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(1);
        expect(mockFileHistoryInstance.navigate).toHaveBeenCalledWith(1, true);
        expect(spies.preventDefault).toHaveBeenCalledTimes(1);
        expect(spies.stopPropagation).toHaveBeenCalledTimes(1);
        for (const graphMove of Object.values(mockGraphNavigation)) {
          expect(graphMove).toHaveBeenCalledTimes(0);
        }
      });

      it("ArrowUp with details requests the returned match above (TC-573)", () => {
        // Case: TC-573
        // Given: highlighted only, the details of h1 open, and the controller resolves ArrowUp
        // to h0
        enterHistoryMode(HIGHLIGHTED_ONLY);
        expandCommit(MIDDLE_MATCH);
        mockFileHistoryInstance.navigate.mockReturnValue(FIRST_MATCH);

        // When: ArrowUp pressed with no modifiers
        const spies = dispatchArrowKey("ArrowUp");

        // Then: the only request is the details of h0 (none for the adjacent x1)
        expect(commitDetailsRequests()).toEqual([commitDetailsRequestFor(FIRST_MATCH)]);
        expect(vscode.postMessage).toHaveBeenCalledTimes(1);
        expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(1);
        expect(mockFileHistoryInstance.navigate).toHaveBeenCalledWith(-1, true);
        expectConsumed(spies);
      });

      it("ArrowDown reloads the details when the destination row is already open (TC-622)", () => {
        // Case: TC-622
        // Given: highlighted only, the details of h1 open, and the controller resolves ArrowDown
        // to the same h1 (the bar buttons moved current away from the open details)
        enterHistoryMode(HIGHLIGHTED_ONLY);
        expandCommit(MIDDLE_MATCH);
        mockFileHistoryInstance.navigate.mockReturnValue(MIDDLE_MATCH);

        // When: ArrowDown pressed with no modifiers
        const spies = dispatchArrowKey("ArrowDown");

        // Then: the details of h1 are requested once and stay under h1 while loading, because a
        // simulated click on the open row would close them and sync current a second time
        expect(commitDetailsRequests()).toEqual([commitDetailsRequestFor(MIDDLE_MATCH)]);
        expect(vscode.postMessage).toHaveBeenCalledTimes(1);
        expect(detailsOwnerHash()).toBe(MIDDLE_MATCH);
        expect(document.getElementById("cdvLoading")).not.toBeNull();
        expect(mockFileHistoryInstance.handleCommitRowClick).toHaveBeenCalledTimes(0);
        expectConsumed(spies);
      });

      it.each(ARROW_KEYS)(
        "%s with details is consumed without moving when there is no destination (TC-574)",
        (key) => {
          // Case: TC-574
          // Given: highlighted only, the details of h1 open between the dim rows x1 and x2, and
          // the controller finds no destination
          enterHistoryMode(HIGHLIGHTED_ONLY);
          expandCommit(MIDDLE_MATCH);
          expect(detailsOwnerHash()).toBe(MIDDLE_MATCH);

          // When: the arrow is pressed with no modifiers
          const spies = dispatchArrowKey(key);

          // Then: the controller was asked once, nothing falls back to the table order or the
          // graph, the event is consumed and the details stay under h1
          expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(1);
          expect(commitDetailsRequests()).toEqual([]);
          expect(vscode.postMessage).toHaveBeenCalledTimes(0);
          expectNoGraphMove();
          expectConsumed(spies);
          expect(detailsOwnerHash()).toBe(MIDDLE_MATCH);
        }
      );

      it.each(ARROW_KEYS)(
        "%s without details is consumed without moving when there is no destination (TC-575)",
        (key) => {
          // Case: TC-575
          // Given: highlighted only, no details open, and the controller finds no destination
          enterHistoryMode(HIGHLIGHTED_ONLY);
          expect(detailsOwnerHash()).toBeNull();

          // When: the arrow is pressed with no modifiers
          const spies = dispatchArrowKey(key);

          // Then: the controller was asked once, no details are requested, the event is consumed
          expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(1);
          expect(commitDetailsRequests()).toEqual([]);
          expect(vscode.postMessage).toHaveBeenCalledTimes(0);
          expectConsumed(spies);
          expect(detailsOwnerHash()).toBeNull();
        }
      );

      it.each([
        { detailsState: "open", hasDetails: true },
        { detailsState: "closed", hasDetails: false }
      ])(
        "ArrowDown with details $detailsState is consumed when the returned hash has no row (TC-576)",
        ({ hasDetails }) => {
          // Case: TC-576
          // Given: highlighted only and the controller returns a hash that has no row
          enterHistoryMode(HIGHLIGHTED_ONLY);
          if (hasDetails) expandCommit(MIDDLE_MATCH);
          mockFileHistoryInstance.navigate.mockReturnValue(MISSING_ROW_HASH);
          const detailsOwnerBefore = detailsOwnerHash();

          // When: ArrowDown pressed with no modifiers
          const spies = dispatchArrowKey("ArrowDown");

          // Then: no details request and no fallback to the table order or the graph, while the
          // event is still consumed
          expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(1);
          expect(commitDetailsRequests()).toEqual([]);
          expect(vscode.postMessage).toHaveBeenCalledTimes(0);
          expectNoGraphMove();
          expectConsumed(spies);
          expect(detailsOwnerHash()).toBe(detailsOwnerBefore);
        }
      );

      describe.each([
        { caseId: "TC-577", mode: HIGHLIGHTED_ONLY, modifier: CTRL },
        { caseId: "TC-578", mode: HIGHLIGHTED_ONLY, modifier: CMD },
        { caseId: "TC-579", mode: INITIAL_PENDING, modifier: CTRL },
        { caseId: "TC-580", mode: INITIAL_PENDING, modifier: CMD },
        { caseId: "TC-581", mode: SWITCH_PENDING, modifier: CTRL },
        { caseId: "TC-582", mode: SWITCH_PENDING, modifier: CMD }
      ])("$modifier.name + arrow while $mode.name ($caseId)", ({ mode, modifier }) => {
        it.each([
          { key: "ArrowUp", shiftKey: false },
          { key: "ArrowUp", shiftKey: true },
          { key: "ArrowDown", shiftKey: false },
          { key: "ArrowDown", shiftKey: true }
        ])("$key with shiftKey=$shiftKey is consumed without moving", ({ key, shiftKey }) => {
          // Case: TC-577 / TC-578 / TC-579 / TC-580 / TC-581 / TC-582
          // Given: the mode, the details of h1 open, a controller and a graph that would both
          // resolve a destination
          enterHistoryMode(mode);
          expandCommit(MIDDLE_MATCH);
          mockFileHistoryInstance.navigate.mockReturnValue(FIRST_MATCH);
          resolveGraphMovesTo(LAST_MATCH_INDEX);

          // When: the arrow is pressed with Ctrl or Cmd, without Alt
          const spies = dispatchArrowKey(key, { ...modifier.init, shiftKey });

          // Then: consumed, and neither the controller nor the graph nor the details are used
          expectConsumed(spies);
          expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(0);
          expectNoGraphMove();
          expect(commitDetailsRequests()).toEqual([]);
          expect(vscode.postMessage).toHaveBeenCalledTimes(0);
          expect(detailsOwnerHash()).toBe(MIDDLE_MATCH);
        });
      });

      describe.each([
        { caseId: "TC-583", mode: INITIAL_PENDING },
        { caseId: "TC-584", mode: SWITCH_PENDING }
      ])("plain arrow while $mode.name ($caseId)", ({ mode }) => {
        it.each([
          { key: "ArrowUp", detailsState: "open", hasDetails: true },
          { key: "ArrowUp", detailsState: "closed", hasDetails: false },
          { key: "ArrowDown", detailsState: "open", hasDetails: true },
          { key: "ArrowDown", detailsState: "closed", hasDetails: false }
        ])(
          "$key with details $detailsState is consumed without moving or scrolling",
          ({ key, hasDetails }) => {
            // Case: TC-583 / TC-584
            // Given: the pending mode, a controller that would resolve a destination, and a
            // known scroll position
            enterHistoryMode(mode);
            if (hasDetails) expandCommit(MIDDLE_MATCH);
            mockFileHistoryInstance.navigate.mockReturnValue(FIRST_MATCH);
            scrollContainer().scrollTop = SCROLL_TOP_SENTINEL;
            const detailsOwnerBefore = detailsOwnerHash();
            expect(detailsOwnerBefore).toBe(hasDetails ? MIDDLE_MATCH : null);

            // When: the arrow is pressed with no modifiers
            const spies = dispatchArrowKey(key);

            // Then: consumed, without asking the controller, requesting details, scrolling or
            // moving the details (the table order navigation is stopped as well)
            expectConsumed(spies);
            expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(0);
            expect(commitDetailsRequests()).toEqual([]);
            expect(vscode.postMessage).toHaveBeenCalledTimes(0);
            expect(scrollContainer().scrollTop).toBe(SCROLL_TOP_SENTINEL);
            expect(detailsOwnerHash()).toBe(detailsOwnerBefore);
          }
        );
      });

      it("moves only on a new key after the pending request is accepted (TC-585)", () => {
        // Case: TC-585
        // Given: ArrowDown was pressed while the first request was pending
        enterHistoryMode(INITIAL_PENDING);
        const pendingSpies = dispatchArrowKey("ArrowDown");
        expectConsumed(pendingSpies);

        // When: the response is accepted and the controller can resolve h1
        enterHistoryMode(HIGHLIGHTED_ONLY);
        mockFileHistoryInstance.navigate.mockReturnValue(RETURNED_MATCH);

        // Then: the key pressed while pending is not replayed
        expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(0);
        expect(commitDetailsRequests()).toEqual([]);

        // When: a new ArrowDown is pressed
        const spies = dispatchArrowKey("ArrowDown");

        // Then: the controller is asked once and the details of h1 are requested once
        expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(1);
        expect(mockFileHistoryInstance.navigate).toHaveBeenCalledWith(1, true);
        expect(commitDetailsRequests()).toEqual([commitDetailsRequestFor(RETURNED_MATCH)]);
        expect(vscode.postMessage).toHaveBeenCalledTimes(1);
        expectConsumed(spies);
      });

      it.each(EDITABLE_TARGETS)(
        "ArrowDown from $name is left alone while highlighted (TC-586)",
        ({ create }) => {
          // Case: TC-586
          // Given: highlighted only, a controller that would resolve h1, and an editable target
          enterHistoryMode(HIGHLIGHTED_ONLY);
          mockFileHistoryInstance.navigate.mockReturnValue(RETURNED_MATCH);
          const target = create();

          // When: ArrowDown is dispatched from the editable target with no modifiers
          const spies = dispatchArrowKey("ArrowDown", { target });

          // Then: the controller is not asked, the event is not consumed, no details request
          expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(0);
          expectNotConsumed(spies);
          expect(commitDetailsRequests()).toEqual([]);
        }
      );

      describe.each(PENDING_MODES)("editable targets while $name (TC-587)", (mode) => {
        it.each(EDITABLE_TARGETS)("ArrowDown from $name is left alone", ({ create }) => {
          // Case: TC-587
          // Given: the pending mode and an editable target
          enterHistoryMode(mode);
          mockFileHistoryInstance.navigate.mockReturnValue(RETURNED_MATCH);
          const target = create();

          // When: ArrowDown is dispatched from the editable target with no modifiers
          const spies = dispatchArrowKey("ArrowDown", { target });

          // Then: the controller is not asked, the event is not consumed, no details request
          expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(0);
          expectNotConsumed(spies);
          expect(commitDetailsRequests()).toEqual([]);
        });
      });

      describe.each(HISTORY_MODES)("modified arrows from an input while $name (TC-588)", (mode) => {
        it.each([
          { key: "ArrowDown", modifier: CTRL },
          { key: "ArrowUp", modifier: CMD }
        ])("$modifier.name + $key is left alone", ({ key, modifier }) => {
          // Case: TC-588
          // Given: the mode, the details of h1 open, a graph that would resolve a destination,
          // and an input target
          enterHistoryMode(mode);
          expandCommit(MIDDLE_MATCH);
          mockFileHistoryInstance.navigate.mockReturnValue(FIRST_MATCH);
          resolveGraphMovesTo(LAST_MATCH_INDEX);
          const target = appendTarget(document.createElement("input"));

          // When: the modified arrow is dispatched from the input
          const spies = dispatchArrowKey(key, { ...modifier.init, target });

          // Then: the controller and the graph are not used and the event is not consumed
          expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(0);
          expectNotConsumed(spies);
          expectNoGraphMove();
          expect(commitDetailsRequests()).toEqual([]);
        });
      });

      describe.each(HISTORY_MODES)("comparison mode while $name (TC-589)", (mode) => {
        it.each([
          { modifierName: "no modifier", init: {}, consumed: true, destination: LAST_MATCH },
          {
            modifierName: CTRL.name,
            init: CTRL.init,
            consumed: false,
            destination: OTHER_NON_MATCH
          }
        ])(
          "ArrowDown with $modifierName bypasses the history",
          ({ init, consumed, destination }) => {
            // Case: TC-589 (contract replaced by S71 TC-680: the comparison wins over the history
            // and a plain arrow moves only the row target)
            // Given: the mode, the details of h1 compared with x2 (the compare target is the row
            // target), a controller and a graph that would both resolve a destination
            enterHistoryMode(mode);
            expandCommitWithCompare(MIDDLE_MATCH, OTHER_NON_MATCH);
            mockFileHistoryInstance.navigate.mockReturnValue(FIRST_MATCH);
            resolveGraphMovesTo(LAST_MATCH_INDEX);

            // When: ArrowDown is pressed on the target row
            const spies = dispatchArrowKey("ArrowDown", init);

            // Then: the history and the graph are not asked, no request is sent, and only a plain
            // arrow moves (and consumes) while the comparison stays
            expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(0);
            expect(spies.preventDefault).toHaveBeenCalledTimes(consumed ? 1 : 0);
            expect(targetHash()).toBe(destination);
            expect(commitDetailsRequests()).toEqual([]);
            expectNoGraphMove();
            expect(detailsOwnerHash()).toBe(MIDDLE_MATCH);
          }
        );
      });

      it.each(HISTORY_MODES)(
        "ArrowDown during IME composition is ignored while $name (TC-590)",
        (mode) => {
          // Case: TC-590
          // Given: the mode and a controller that would resolve h1
          enterHistoryMode(mode);
          mockFileHistoryInstance.navigate.mockReturnValue(RETURNED_MATCH);

          // When: ArrowDown keydown arrives during IME composition
          const spies = dispatchArrowKey("ArrowDown", { isComposing: true });

          // Then: the controller is not asked, the event is not consumed, no details request
          expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(0);
          expectNotConsumed(spies);
          expect(commitDetailsRequests()).toEqual([]);
        }
      );

      it("Ctrl+F from an input neither exits the mode nor opens the find widget (TC-591)", () => {
        // Case: TC-591 (contract replaced by S72 TC-685: shortcuts apply from rows / labels; the
        // exit-before-show order from a row is TC-324)
        // Given: highlighted only and an input target
        enterHistoryMode(HIGHLIGHTED_ONLY);
        const target = appendTarget(document.createElement("input"));

        // When: the configured find shortcut is dispatched from the input
        dispatchArrowKey("f", { ctrlKey: true, target });

        // Then: the input keeps its key: no exit, no show, no history move
        expect(mockFileHistoryInstance.exit).toHaveBeenCalledTimes(0);
        expect(mockFindWidgetInstance.show).toHaveBeenCalledTimes(0);
        expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(0);
      });

      describe.each(HISTORY_MODES)("Shift-only arrows while $name (TC-592)", (mode) => {
        it.each(ARROW_KEYS)("Shift + %s is not captured by the history branch", (key) => {
          // Case: TC-592
          // Given: the mode, the details of h1 open, and a controller that would resolve h0
          enterHistoryMode(mode);
          expandCommit(MIDDLE_MATCH);
          mockFileHistoryInstance.navigate.mockReturnValue(FIRST_MATCH);

          // When: the arrow is pressed with Shift only
          const spies = dispatchArrowKey(key, { shiftKey: true });

          // Then: the controller is not asked, the event is not consumed, no details request
          expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(0);
          expectNotConsumed(spies);
          expect(commitDetailsRequests()).toEqual([]);
        });
      });

      describe.each(HISTORY_MODES)("arrows with Alt while $name (TC-593)", (mode) => {
        it.each([
          { combination: "Alt + ArrowUp", key: "ArrowUp", init: { altKey: true } },
          {
            combination: "Ctrl+Alt + ArrowDown",
            key: "ArrowDown",
            init: { ctrlKey: true, altKey: true }
          },
          {
            combination: "Cmd+Alt + ArrowUp",
            key: "ArrowUp",
            init: { metaKey: true, altKey: true }
          },
          {
            combination: "Ctrl+Shift+Alt + ArrowDown",
            key: "ArrowDown",
            init: { ctrlKey: true, shiftKey: true, altKey: true }
          }
        ])("$combination is not captured by the history branch", ({ key, init }) => {
          // Case: TC-593
          // Given: the mode, the details of h1 open, a controller and a graph that would both
          // resolve a destination
          enterHistoryMode(mode);
          expandCommit(MIDDLE_MATCH);
          mockFileHistoryInstance.navigate.mockReturnValue(FIRST_MATCH);
          resolveGraphMovesTo(LAST_MATCH_INDEX);

          // When: the arrow is pressed with a combination that includes Alt
          const spies = dispatchArrowKey(key, init);

          // Then: nothing moves and the event is not consumed
          expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(0);
          expectNotConsumed(spies);
          expectNoGraphMove();
          expect(commitDetailsRequests()).toEqual([]);
        });
      });
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

  // Superseded by 13-keyboard-accessibility-01.md S72: Escape closes on keydown and the dropdown
  // stages cancel (cancelAndClose) instead of applying (close).
  describe("handleEscape()", () => {
    function pressEscape(): void {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
      );
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

      // Then: only repoDropdown.cancelAndClose() is called
      expect(mockRepoDropdownInstance.cancelAndClose).toHaveBeenCalledTimes(1);
      expect(mockBranchDropdownInstance.cancelAndClose).not.toHaveBeenCalled();
      expect(hideDialog).not.toHaveBeenCalled();
    });

    it("closes branchDropdown when repoDropdown is closed (TC-086)", () => {
      // Given: branchDropdown is open, repoDropdown closed
      mockBranchDropdownInstance.isOpen.mockReturnValue(true);

      // When: Escape is pressed
      pressEscape();

      // Then: only branchDropdown.cancelAndClose() is called
      expect(mockBranchDropdownInstance.cancelAndClose).toHaveBeenCalledTimes(1);
      expect(mockRepoDropdownInstance.cancelAndClose).not.toHaveBeenCalled();
    });

    it("closes repoDropdown first when both dropdowns are open (TC-087)", () => {
      // Given: both dropdowns are open
      mockRepoDropdownInstance.isOpen.mockReturnValue(true);
      mockBranchDropdownInstance.isOpen.mockReturnValue(true);

      // When: Escape is pressed
      pressEscape();

      // Then: only repoDropdown.cancelAndClose() is called (repo priority over branch)
      expect(mockRepoDropdownInstance.cancelAndClose).toHaveBeenCalledTimes(1);
      expect(mockBranchDropdownInstance.cancelAndClose).not.toHaveBeenCalled();
    });

    it("closes FindWidget when no menu/dialog/dropdown active (TC-088)", () => {
      // Given: FindWidget is visible
      mockFindWidgetInstance.isVisible.mockReturnValue(true);

      // When: Escape is pressed
      pressEscape();

      // Then: only findWidget.close() is called
      expect(mockFindWidgetInstance.close).toHaveBeenCalledTimes(1);
      expect(mockRepoDropdownInstance.cancelAndClose).not.toHaveBeenCalled();
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
      expect(mockRepoDropdownInstance.cancelAndClose).not.toHaveBeenCalled();
      expect(mockBranchDropdownInstance.cancelAndClose).not.toHaveBeenCalled();
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

    /* -------------------------------------------------------------- */
    /* S65: handleEscape() priority chain and file history exit       */
    /* -------------------------------------------------------------- */
    // @see docs/testing/perspectives/web/main-test/04-keyboard-selection-02.md

    it("hideContextMenu wins as the first priority (TC-594)", () => {
      // Case: TC-594
      // Given: not highlighted, and only the context menu is active
      vi.mocked(isContextMenuActive).mockReturnValue(true);

      // When: Escape is pressed
      pressEscape();

      // Then: hideContextMenu is called exactly once and lower-priority handlers are untouched
      expect(hideContextMenu).toHaveBeenCalledTimes(1);
      expect(hideDialog).not.toHaveBeenCalled();
      expect(mockRepoDropdownInstance.cancelAndClose).not.toHaveBeenCalled();
      expect(mockFindWidgetInstance.close).not.toHaveBeenCalled();
      expect(mockFileHistoryInstance.exit).not.toHaveBeenCalled();
    });

    it("hideDialog wins as the second priority (TC-595)", () => {
      // Case: TC-595
      // Given: not highlighted, and only the dialog is active (context menu inactive)
      vi.mocked(isDialogActive).mockReturnValue(true);

      // When: Escape is pressed
      pressEscape();

      // Then: hideDialog is called once and no dropdown/findWidget/history handler runs
      expect(hideDialog).toHaveBeenCalledTimes(1);
      expect(hideContextMenu).not.toHaveBeenCalled();
      expect(mockRepoDropdownInstance.cancelAndClose).not.toHaveBeenCalled();
      expect(mockFindWidgetInstance.close).not.toHaveBeenCalled();
      expect(mockFileHistoryInstance.exit).not.toHaveBeenCalled();
    });

    it("repoDropdown.cancelAndClose wins as the third priority (TC-596)", () => {
      // Case: TC-596
      // Given: not highlighted, and only the repo dropdown is open
      mockRepoDropdownInstance.isOpen.mockReturnValue(true);

      // When: Escape is pressed
      pressEscape();

      // Then: only repoDropdown.cancelAndClose() is invoked
      expect(mockRepoDropdownInstance.cancelAndClose).toHaveBeenCalledTimes(1);
      expect(mockBranchDropdownInstance.cancelAndClose).not.toHaveBeenCalled();
      expect(mockAuthorDropdownInstance.cancelAndClose).not.toHaveBeenCalled();
      expect(mockFindWidgetInstance.close).not.toHaveBeenCalled();
      expect(mockFileHistoryInstance.exit).not.toHaveBeenCalled();
    });

    it("findWidget.close runs when all menus/dialogs/dropdowns are inactive (TC-597)", () => {
      // Case: TC-597
      // Given: not highlighted, the find widget is visible and a commit is expanded
      expandCommit(COMMIT_HASH_1);
      mockFindWidgetInstance.isVisible.mockReturnValue(true);

      // When: Escape is pressed
      pressEscape();

      // Then: only findWidget.close() is invoked, the commit details stay open
      expect(mockFindWidgetInstance.close).toHaveBeenCalledTimes(1);
      expect(mockRepoDropdownInstance.cancelAndClose).not.toHaveBeenCalled();
      expect(hideDialog).not.toHaveBeenCalled();
      expect(document.getElementById("commitDetails")).not.toBeNull();
      expect(mockFileHistoryInstance.exit).not.toHaveBeenCalled();
    });

    it("hideCommitDetails runs at the details stage when only expandedCommit is set (TC-598)", () => {
      // Case: TC-598
      // Given: not highlighted, a commit is expanded and no other UI is active
      expandCommit(COMMIT_HASH_1);
      vi.clearAllMocks();
      resetAllUIStates();

      // When: Escape is pressed
      pressEscape();

      // Then: the commit details DOM element is removed (hideCommitDetails was invoked) and the
      // history stage that follows does not exit
      const detailsElem = document.getElementById("commitDetails");
      expect(detailsElem).toBeNull();
      expect(mockFileHistoryInstance.exit).not.toHaveBeenCalled();
    });

    it("no-op when no UI components are active and no commit is expanded (TC-599)", () => {
      // Case: TC-599
      // Given: not highlighted, every UI state is inactive (resetAllUIStates ran in beforeEach)
      // and no expandedCommit

      // When: Escape is pressed
      pressEscape();

      // Then: every hide/close handler and the history exit are left untouched
      expect(hideContextMenu).not.toHaveBeenCalled();
      expect(hideDialog).not.toHaveBeenCalled();
      expect(mockRepoDropdownInstance.cancelAndClose).not.toHaveBeenCalled();
      expect(mockBranchDropdownInstance.cancelAndClose).not.toHaveBeenCalled();
      expect(mockAuthorDropdownInstance.cancelAndClose).not.toHaveBeenCalled();
      expect(mockFindWidgetInstance.close).not.toHaveBeenCalled();
      expect(mockFileHistoryInstance.exit).not.toHaveBeenCalled();
    });

    it("contextMenu takes priority over dialog when both are active (TC-600)", () => {
      // Case: TC-600
      // Given: not highlighted, both contextMenu and dialog are active simultaneously
      vi.mocked(isContextMenuActive).mockReturnValue(true);
      vi.mocked(isDialogActive).mockReturnValue(true);

      // When: Escape is pressed
      pressEscape();

      // Then: hideContextMenu runs once and hideDialog is suppressed by the early return
      expect(hideContextMenu).toHaveBeenCalledTimes(1);
      expect(hideDialog).not.toHaveBeenCalled();
    });

    it("repoDropdown takes priority over branchDropdown when both are open (TC-601)", () => {
      // Case: TC-601
      // Given: not highlighted, both repoDropdown and branchDropdown report isOpen()=true
      mockRepoDropdownInstance.isOpen.mockReturnValue(true);
      mockBranchDropdownInstance.isOpen.mockReturnValue(true);

      // When: Escape is pressed
      pressEscape();

      // Then: only repoDropdown.cancelAndClose() is invoked, branchDropdown.cancelAndClose is suppressed
      expect(mockRepoDropdownInstance.cancelAndClose).toHaveBeenCalledTimes(1);
      expect(mockBranchDropdownInstance.cancelAndClose).not.toHaveBeenCalled();
    });

    // @see docs/testing/perspectives/web/main-test/04-keyboard-selection-02.md
    describe("file history stage (S65)", () => {
      interface StageCloses {
        contextMenu: number;
        dialog: number;
        repoDropdown: number;
        branchDropdown: number;
        authorDropdown: number;
        refList: number;
        findWidget: number;
        fileHistory: number;
      }

      const NO_STAGE_CLOSED: StageCloses = {
        contextMenu: 0,
        dialog: 0,
        repoDropdown: 0,
        branchDropdown: 0,
        authorDropdown: 0,
        refList: 0,
        findWidget: 0,
        fileHistory: 0
      };

      const PRECEDING_STAGES: { caseId: string; stage: keyof StageCloses; open: () => void }[] = [
        {
          caseId: "TC-608",
          stage: "contextMenu",
          open: () => vi.mocked(isContextMenuActive).mockReturnValue(true)
        },
        {
          caseId: "TC-609",
          stage: "dialog",
          open: () => vi.mocked(isDialogActive).mockReturnValue(true)
        },
        {
          caseId: "TC-610",
          stage: "repoDropdown",
          open: () => mockRepoDropdownInstance.isOpen.mockReturnValue(true)
        },
        {
          caseId: "TC-611",
          stage: "branchDropdown",
          open: () => mockBranchDropdownInstance.isOpen.mockReturnValue(true)
        },
        {
          caseId: "TC-612",
          stage: "authorDropdown",
          open: () => mockAuthorDropdownInstance.isOpen.mockReturnValue(true)
        },
        {
          caseId: "TC-613",
          stage: "refList",
          // The list itself is owned by S58; this chain only depends on closePopup() returning true.
          open: () => closePopupSpy.mockReturnValue(true)
        },
        {
          caseId: "TC-614",
          stage: "findWidget",
          open: () => mockFindWidgetInstance.isVisible.mockReturnValue(true)
        }
      ];

      let closePopupSpy: MockInstance<RefOverflowController["closePopup"]>;

      /** How many times each stage of the chain closed its own target. */
      function stageCloses(): StageCloses {
        return {
          contextMenu: vi.mocked(hideContextMenu).mock.calls.length,
          dialog: vi.mocked(hideDialog).mock.calls.length,
          repoDropdown: mockRepoDropdownInstance.cancelAndClose.mock.calls.length,
          branchDropdown: mockBranchDropdownInstance.cancelAndClose.mock.calls.length,
          authorDropdown: mockAuthorDropdownInstance.cancelAndClose.mock.calls.length,
          refList: closePopupSpy.mock.results.filter((result) => result.value === true).length,
          findWidget: mockFindWidgetInstance.close.mock.calls.length,
          fileHistory: mockFileHistoryInstance.exit.mock.calls.length
        };
      }

      function detailsRow(): HTMLElement {
        return document.querySelector<HTMLElement>(`.commit[data-hash="${COMMIT_HASH_1}"]`)!;
      }

      function expectDetailsOpen(): void {
        expect(detailsRow().nextElementSibling!.id).toBe("commitDetails");
        expect(detailsRow().classList.contains("commitDetailsOpen")).toBe(true);
      }

      /** The details stage ran once: the view is removed, the state saved and the graph redrawn. */
      function expectDetailsClosedOnce(): void {
        expect(document.getElementById("commitDetails")).toBeNull();
        expect(detailsRow().classList.contains("commitDetailsOpen")).toBe(false);
        expect(vscode.setState).toHaveBeenCalledTimes(1);
      }

      /** The details stage did not run: nothing was saved or redrawn and no view came back. */
      function expectDetailsStageSkipped(): void {
        expect(document.getElementById("commitDetails")).toBeNull();
        expect(vscode.setState).toHaveBeenCalledTimes(0);
        expect(mockGraphHighlight.render).toHaveBeenCalledTimes(0);
      }

      beforeEach(() => {
        mockAuthorDropdownInstance.isOpen.mockReturnValue(false);
        closePopupSpy = vi.spyOn(RefOverflowController.prototype, "closePopup");
      });

      afterEach(() => {
        closePopupSpy.mockRestore();
        mockAuthorDropdownInstance.isOpen.mockReturnValue(false);
        resetAllUIStates();
        leaveHistoryMode();
      });

      it.each([
        { caseId: "TC-602", mode: HIGHLIGHTED_ONLY },
        { caseId: "TC-603", mode: INITIAL_PENDING },
        { caseId: "TC-604", mode: SWITCH_PENDING }
      ])(
        "closes the details first and exits on the next Escape while $mode.name ($caseId)",
        ({ mode }) => {
          // Case: TC-602 / TC-603 / TC-604
          // Given: the mode with a commit expanded
          enterHistoryMode(mode);
          expandCommit(COMMIT_HASH_1);
          expectDetailsOpen();

          // When: Escape is pressed once
          pressEscape();

          // Then: only the details close and the history is kept
          expectDetailsClosedOnce();
          expect(stageCloses()).toEqual(NO_STAGE_CLOSED);

          // When: Escape is pressed again
          vi.clearAllMocks();
          pressEscape();

          // Then: the history exits once with restore, and the details stage does not run again
          expect(stageCloses()).toEqual({ ...NO_STAGE_CLOSED, fileHistory: 1 });
          expect(mockFileHistoryInstance.exit).toHaveBeenCalledWith(true);
          expectDetailsStageSkipped();
        }
      );

      it.each([
        { caseId: "TC-605", mode: HIGHLIGHTED_ONLY },
        { caseId: "TC-606", mode: INITIAL_PENDING },
        { caseId: "TC-607", mode: SWITCH_PENDING }
      ])("exits on the first Escape without details while $mode.name ($caseId)", ({ mode }) => {
        // Case: TC-605 / TC-606 / TC-607
        // Given: the mode without an expanded commit
        enterHistoryMode(mode);
        expect(document.getElementById("commitDetails")).toBeNull();

        // When: Escape is pressed once
        pressEscape();

        // Then: the history exits once with restore, and the details stage does not run
        expect(stageCloses()).toEqual({ ...NO_STAGE_CLOSED, fileHistory: 1 });
        expect(mockFileHistoryInstance.exit).toHaveBeenCalledWith(true);
        expectDetailsStageSkipped();
      });

      describe.each(PRECEDING_STAGES)("$stage before the history ($caseId)", ({ stage, open }) => {
        it.each(HISTORY_MODES)("closes only its own target while $name", (mode) => {
          // Case: TC-608 / TC-609 / TC-610 / TC-611 / TC-612 / TC-613 / TC-614
          // Given: the mode, a commit expanded, and the preceding stage open
          enterHistoryMode(mode);
          expandCommit(COMMIT_HASH_1);
          open();

          // When: Escape is pressed once
          pressEscape();

          // Then: only that stage closes; the later stages, the details and the history are kept
          expect(stageCloses()).toEqual({ ...NO_STAGE_CLOSED, [stage]: 1 });
          expectDetailsOpen();
          expect(vscode.setState).toHaveBeenCalledTimes(0);
        });
      });

      it("exits the accepted history when the response arrives between two Escapes (TC-615)", () => {
        // Case: TC-615
        // Given: the first request pending with a commit expanded
        enterHistoryMode(INITIAL_PENDING);
        expandCommit(COMMIT_HASH_1);

        // When: Escape is pressed once
        pressEscape();

        // Then: only the details close
        expectDetailsClosedOnce();
        expect(stageCloses()).toEqual(NO_STAGE_CLOSED);

        // When: the response is accepted, then Escape is pressed again
        enterHistoryMode(HIGHLIGHTED_ONLY);
        vi.clearAllMocks();
        pressEscape();

        // Then: the accepted history exits once with restore and the details are not reopened
        expect(stageCloses()).toEqual({ ...NO_STAGE_CLOSED, fileHistory: 1 });
        expect(mockFileHistoryInstance.exit).toHaveBeenCalledWith(true);
        expectDetailsStageSkipped();
      });
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

describe("GitKeizuView findWidgetState backward compatibility", () => {
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

    // When: main module is imported (creates GitKeizuView)
    await import("../../web/main");

    // Then: FindWidget.restoreState was NOT called
    expect(mockFindWidgetInstance.restoreState).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* S15: File View Toggle (Tree/List) (Task 6.2)                       */
/* ------------------------------------------------------------------ */

describe("File View Toggle (Tree/List)", () => {
  let freshVscode: typeof vscode;
  let freshFileTreeHtml: typeof generateGitFileTreeHtml;
  let freshFileListHtml: typeof generateGitFileListHtml;

  beforeAll(async () => {
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewState();

    // Re-import utils and fileTree to get fresh mock references after resetModules
    const utilsMod = await import("../../web/utils");
    freshVscode = utilsMod.vscode;
    vi.mocked(freshVscode.getState).mockReturnValueOnce(null);

    const fileTreeMod = await import("../../web/fileTree");
    freshFileTreeHtml = fileTreeMod.generateGitFileTreeHtml;
    freshFileListHtml = fileTreeMod.generateGitFileListHtml;

    await import("../../web/main");
    loadTestCommits();
  });

  beforeEach(() => {
    resetCommitState();
    setupTableLayoutMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("toggles fileViewType from tree to list and calls generateGitFileListHtml (TC-101)", () => {
    // Given: fileViewType is "tree" (default), commit details are expanded
    expandCommit(COMMIT_HASH_1);
    const toggleBtn = document.getElementById("fileViewToggle");
    expect(toggleBtn).not.toBeNull();

    // When: toggle button is clicked
    toggleBtn!.click();

    // Then: generateGitFileListHtml is called (list mode)
    expect(freshFileListHtml).toHaveBeenCalled();
  });

  it("toggles fileViewType from list to tree and calls generateGitFileTreeHtml (TC-102)", () => {
    // Given: commit details are expanded, ensure starting in list mode
    expandCommit(COMMIT_HASH_1);
    let toggleBtn = document.getElementById("fileViewToggle");
    // If in tree mode, toggle to list first
    if (toggleBtn?.getAttribute("title") === "Switch to List View") {
      toggleBtn.click();
    }
    vi.clearAllMocks();

    // When: toggle button is clicked (list → tree)
    const currentToggle = document.getElementById("fileViewToggle")!;
    currentToggle.click();

    // Then: generateGitFileTreeHtml is called (tree mode)
    expect(freshFileTreeHtml).toHaveBeenCalled();
  });

  it("sends saveRepoState message with new fileViewType after toggle (TC-103)", () => {
    // Given: commit details are expanded, ensure starting in tree mode
    expandCommit(COMMIT_HASH_1);
    let toggleBtn = document.getElementById("fileViewToggle");
    if (toggleBtn?.getAttribute("title") === "Switch to Tree View") {
      toggleBtn.click();
    }
    vi.clearAllMocks();

    // When: toggle button is clicked (tree → list)
    const currentToggle = document.getElementById("fileViewToggle")!;
    currentToggle.click();

    // Then: saveRepoState message is sent with fileViewType: "list"
    expect(freshVscode.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "saveRepoState",
        repo: TEST_REPO,
        state: expect.objectContaining({
          fileViewType: "list"
        })
      })
    );
  });

  it("persists list mode across commit re-expand (TC-104)", () => {
    // Given: ensure starting in tree mode, then toggle to "list"
    expandCommit(COMMIT_HASH_1);
    let toggleBtn = document.getElementById("fileViewToggle");
    if (toggleBtn?.getAttribute("title") === "Switch to Tree View") {
      toggleBtn.click(); // list → tree
    }
    // Now in tree mode; toggle to list
    toggleBtn = document.getElementById("fileViewToggle");
    toggleBtn!.click();

    // When: commit is collapsed and re-expanded (raw dispatch, no clearAllMocks)
    resetCommitState();
    setupTableLayoutMocks();
    clickCommit(COMMIT_HASH_1);
    vi.clearAllMocks();
    dispatchMessage({
      command: "commitDetails",
      commitDetails: makeCommitDetails(COMMIT_HASH_1)
    });

    // Then: generateGitFileListHtml is called (list mode persisted in gitRepos)
    expect(freshFileListHtml).toHaveBeenCalled();
  });

  it("renders in tree mode when GitRepoState.fileViewType is undefined (TC-105)", () => {
    // Given: fileViewType was set to "list" by previous test, toggle back to "tree"
    expandCommit(COMMIT_HASH_1);
    let toggleBtn = document.getElementById("fileViewToggle");
    if (toggleBtn?.getAttribute("title") === "Switch to Tree View") {
      toggleBtn.click();
    }
    resetCommitState();
    setupTableLayoutMocks();

    // When: commit details are expanded (raw dispatch for assertions)
    clickCommit(COMMIT_HASH_1);
    vi.clearAllMocks();
    dispatchMessage({
      command: "commitDetails",
      commitDetails: makeCommitDetails(COMMIT_HASH_1)
    });

    // Then: generateGitFileTreeHtml is called (tree mode)
    expect(freshFileTreeHtml).toHaveBeenCalled();
    expect(freshFileListHtml).not.toHaveBeenCalled();
  });

  it("displays correct toggle icon based on current mode (TC-106)", () => {
    // Given: fileViewType is "tree" (ensured by TC-105 resetting to tree)
    expandCommit(COMMIT_HASH_1);

    // Then: toggle button shows list icon (to switch TO list)
    const toggleBtn = document.getElementById("fileViewToggle");
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn!.getAttribute("title")).toBe("Switch to List View");

    // When: toggled to list mode
    toggleBtn!.click();

    // Then: toggle button now shows tree icon (to switch TO tree)
    const toggleBtnAfter = document.getElementById("fileViewToggle");
    expect(toggleBtnAfter!.getAttribute("title")).toBe("Switch to Tree View");
  });

  // @see docs/testing/perspectives/web/main-test/01-rendering-03.md
  describe("file panel structure and persistent toggle (S62)", () => {
    type FileViewMode = "tree" | "list";

    const FILE_CHANGE: GitFileChange = {
      oldFilePath: "src/file.ts",
      newFilePath: "src/file.ts",
      type: "M",
      additions: 1,
      deletions: 0
    };
    const TREE_ROOT_HTML =
      '<ul class="gitFolderContents"><li><span class="gitFolder" data-folderpath="src"><span class="gitFolderIcon"></span><span class="gitFolderName">src</span></span><ul class="gitFolderContents"><li class="gitFile M gitDiffPossible" data-oldfilepath="src%2Ffile.ts" data-newfilepath="src%2Ffile.ts" data-type="M">file.ts</li></ul></li></ul>';
    const LIST_ROOT_HTML =
      '<ul class="gitFolderContents"><li class="gitFile M gitDiffPossible" data-oldfilepath="src%2Ffile.ts" data-newfilepath="src%2Ffile.ts" data-type="M">src/file.ts</li></ul>';
    const EMPTY_ROOT_HTML = '<ul class="gitFolderContents"></ul>';
    // The toggle offers the mode it switches to, not the mode being displayed.
    const TOGGLE_IN_TREE_VIEW = { icon: svgIcons.listView, title: "Switch to List View" };
    const TOGGLE_IN_LIST_VIEW = { icon: svgIcons.treeView, title: "Switch to Tree View" };

    beforeEach(() => {
      vi.mocked(freshFileTreeHtml).mockReturnValue(TREE_ROOT_HTML);
      vi.mocked(freshFileListHtml).mockReturnValue(LIST_ROOT_HTML);
    });

    afterEach(() => {
      vi.mocked(freshFileTreeHtml).mockReset();
      vi.mocked(freshFileListHtml).mockReset();
    });

    function startInView(fileViewType: FileViewMode): void {
      dispatchMessage({
        command: "loadRepos",
        repos: { [TEST_REPO]: { columnWidths: null, fileViewType } },
        lastActiveRepo: TEST_REPO
      });
    }

    function sendCommitDetails(fileChanges: GitFileChange[]): void {
      dispatchMessage({
        command: "commitDetails",
        commitDetails: { ...makeCommitDetails(COMMIT_HASH_1), fileChanges }
      });
    }

    function openCommitDetails(fileViewType: FileViewMode, fileChanges: GitFileChange[]): void {
      startInView(fileViewType);
      clickCommit(COMMIT_HASH_1);
      sendCommitDetails(fileChanges);
    }

    function onlyElement(selector: string): HTMLElement {
      const elements = document.querySelectorAll<HTMLElement>(selector);
      expect(elements, selector).toHaveLength(1);
      return elements[0];
    }

    function expectSingleRootAndSiblingToggle(): void {
      const panel = onlyElement("#commitDetailsFiles");
      expect(panel.children).toHaveLength(1);
      expect(panel.children[0].matches("ul.gitFolderContents")).toBe(true);
      const toggle = onlyElement("#fileViewToggle");
      expect(toggle.classList.contains("fileViewToggleBtn")).toBe(true);
      expect(panel.contains(toggle)).toBe(false);
      expect(panel.nextElementSibling).toBe(toggle);
      expect(toggle.parentElement).toBe(onlyElement("#commitDetailsClose").parentElement);
    }

    function expectToggleShows(expected: { icon: string; title: string }): void {
      const toggle = onlyElement("#fileViewToggle");
      expect(toggle.innerHTML).toBe(expected.icon);
      expect(toggle.getAttribute("title")).toBe(expected.title);
    }

    // Counting only the messages sent by one click exposes a listener registered twice.
    function clickAndCollectSavedRepoStates(toggle: HTMLElement): unknown[] {
      const sentBeforeClick = vi.mocked(freshVscode.postMessage).mock.calls.length;
      toggle.click();
      return vi
        .mocked(freshVscode.postMessage)
        .mock.calls.slice(sentBeforeClick)
        .map((call) => call[0])
        .filter((message) => (message as { command: string }).command === "saveRepoState");
    }

    function savedRepoState(fileViewType: FileViewMode): Record<string, unknown> {
      return {
        command: "saveRepoState",
        repo: TEST_REPO,
        state: { columnWidths: null, fileViewType }
      };
    }

    it("renders one root list in the panel and one sibling toggle for the tree view (TC-546)", () => {
      // Case: TC-546
      // Given: a repository whose file view type is "tree"
      // When: the details response renders the whole commit details view
      openCommitDetails("tree", [FILE_CHANGE]);

      // Then: the panel holds the root list only and the toggle follows the panel as a sibling
      expectSingleRootAndSiblingToggle();
      expect(freshFileTreeHtml).toHaveBeenCalledTimes(1);
      expect(freshFileListHtml).toHaveBeenCalledTimes(0);
      expectToggleShows(TOGGLE_IN_TREE_VIEW);
    });

    it("renders the same structure for a saved list view (TC-547)", () => {
      // Case: TC-547
      // Given: a repository whose saved file view type is "list"
      // When: the details response renders the whole commit details view
      openCommitDetails("list", [FILE_CHANGE]);

      // Then: the structure matches the tree case, rendered by the list renderer
      expectSingleRootAndSiblingToggle();
      expect(freshFileListHtml).toHaveBeenCalledTimes(1);
      expect(freshFileTreeHtml).toHaveBeenCalledTimes(0);
      expectToggleShows(TOGGLE_IN_LIST_VIEW);
    });

    it("keeps the panel and the toggle while switching tree, list and tree again (TC-548)", () => {
      // Case: TC-548
      // Given: the details rendered in the tree view
      openCommitDetails("tree", [FILE_CHANGE]);
      const panel = onlyElement("#commitDetailsFiles");
      const toggle = onlyElement("#fileViewToggle");
      const treeRoot = panel.children[0];

      // When: the toggle is clicked once (tree to list)
      const savedByFirstClick = clickAndCollectSavedRepoStates(toggle);

      // Then: both nodes survive, only the root list is replaced, one render and one save
      expect(onlyElement("#commitDetailsFiles")).toBe(panel);
      expect(onlyElement("#fileViewToggle")).toBe(toggle);
      expectSingleRootAndSiblingToggle();
      const listRoot = panel.children[0];
      expect(listRoot).not.toBe(treeRoot);
      expect(freshFileListHtml).toHaveBeenCalledTimes(1);
      expect(freshFileTreeHtml).toHaveBeenCalledTimes(1);
      expect(savedByFirstClick).toEqual([savedRepoState("list")]);
      expectToggleShows(TOGGLE_IN_LIST_VIEW);

      // When: the same toggle is clicked again (list to tree)
      const savedBySecondClick = clickAndCollectSavedRepoStates(toggle);

      // Then: the same nodes survive again, with one more tree render and one save
      expect(onlyElement("#commitDetailsFiles")).toBe(panel);
      expect(onlyElement("#fileViewToggle")).toBe(toggle);
      expectSingleRootAndSiblingToggle();
      expect(panel.children[0]).not.toBe(listRoot);
      expect(freshFileTreeHtml).toHaveBeenCalledTimes(2);
      expect(freshFileListHtml).toHaveBeenCalledTimes(1);
      expect(savedBySecondClick).toEqual([savedRepoState("tree")]);
      expectToggleShows(TOGGLE_IN_TREE_VIEW);

      // When: the whole details view is rendered again and its toggle is clicked once
      sendCommitDetails([FILE_CHANGE]);
      expectSingleRootAndSiblingToggle();
      expect(freshFileTreeHtml).toHaveBeenCalledTimes(3);
      const savedAfterRerender = clickAndCollectSavedRepoStates(onlyElement("#fileViewToggle"));

      // Then: the click still causes exactly one render and one save
      expect(freshFileListHtml).toHaveBeenCalledTimes(2);
      expect(freshFileTreeHtml).toHaveBeenCalledTimes(3);
      expect(savedAfterRerender).toEqual([savedRepoState("list")]);
      expectSingleRootAndSiblingToggle();
      expectToggleShows(TOGGLE_IN_LIST_VIEW);
    });

    it("creates the toggle only after the details response replaces the loading view (TC-549)", () => {
      // Case: TC-549
      // Given: a commit row clicked while its details response has not arrived
      startInView("tree");
      clickCommit(COMMIT_HASH_1);

      // Then: the loading view has the loading indicator and the close control but no toggle
      expect(document.querySelectorAll("#fileViewToggle")).toHaveLength(0);
      expect(document.querySelectorAll("#cdvLoading")).toHaveLength(1);
      expect(document.querySelectorAll("#commitDetailsClose")).toHaveLength(1);

      // When: the details response arrives
      sendCommitDetails([FILE_CHANGE]);

      // Then: exactly one toggle exists, outside the file panel
      const toggle = onlyElement("#fileViewToggle");
      expect(onlyElement("#commitDetailsFiles").contains(toggle)).toBe(false);
    });

    it("keeps the root list and the toggle for a commit without file changes (TC-550)", () => {
      // Case: TC-550
      // Given: details without any file change, rendered as an empty root list
      vi.mocked(freshFileTreeHtml).mockReturnValue(EMPTY_ROOT_HTML);

      // When: the details response renders the whole commit details view
      openCommitDetails("tree", []);

      // Then: the empty root list and the sibling toggle are both present
      expect(vi.mocked(freshFileTreeHtml).mock.calls.map((call) => call[1])).toEqual([[]]);
      expectSingleRootAndSiblingToggle();
      expect(document.querySelectorAll("#commitDetailsFiles .gitFile")).toHaveLength(0);
    });
  });
});

/* ------------------------------------------------------------------ */
/* S16-S19: Author Dropdown, Commit details, data-remotes, Parents    */
/* ------------------------------------------------------------------ */

describe("Author, details, remotes & parent navigation", () => {
  let liveVscode: typeof vscode;

  beforeAll(async () => {
    vi.resetModules();
    dropdownCallCount = 0;
    capturedAuthorCallback = null;
    setupTestDOM();
    setupViewState();

    const utilsMod = await import("../../web/utils");
    liveVscode = utilsMod.vscode;
    vi.mocked(liveVscode.getState).mockReturnValueOnce(null);

    await import("../../web/main");
    loadTestCommits();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /* ---------------------------------------------------------------- */
  /* S41: buildAuthorOptions() 全著者 ∪ 選択中著者のマージ             */
  /* ---------------------------------------------------------------- */

  describe("buildAuthorOptions merge via loadCommits (S41)", () => {
    const ALL_AUTHORS_OPTION = { name: "All Authors", value: "" };

    // buildAuthorOptions is module-private; its merge behavior is observed through
    // loadCommits -> authorDropdown.setOptions(options, selected).
    function setSelectedAuthors(values: string[]): void {
      capturedAuthorCallback!(values);
    }

    function dispatchLoadCommits(authors?: string[], commits = MOCK_COMMITS): void {
      dispatchMessage({
        command: "loadCommits",
        commits,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true,
        ...(authors === undefined ? {} : { authors })
      });
    }

    it("does not duplicate a selected author already in the author list (TC-229)", () => {
      // Given: selectedAuthors=["Alice"] with authors=["Alice","Bob"]
      setSelectedAuthors(["Alice"]);
      vi.clearAllMocks();

      // When: loadCommits rebuilds the dropdown
      dispatchLoadCommits(["Alice", "Bob"]);

      // Then: Alice is not appended twice; selected stays ["Alice"]
      expect(mockAuthorDropdownInstance.setOptions).toHaveBeenCalledWith(
        [ALL_AUTHORS_OPTION, { name: "Alice", value: "Alice" }, { name: "Bob", value: "Bob" }],
        ["Alice"]
      );
    });

    it("appends a selected author that is absent from the author list (TC-230)", () => {
      // Given: selectedAuthors=["Bob"] with authors=["Alice"] (Bob not in authors)
      setSelectedAuthors(["Bob"]);
      vi.clearAllMocks();

      // When: loadCommits rebuilds the dropdown
      dispatchLoadCommits(["Alice"]);

      // Then: Bob is appended to the end; selected stays ["Bob"]
      expect(mockAuthorDropdownInstance.setOptions).toHaveBeenCalledWith(
        [ALL_AUTHORS_OPTION, { name: "Alice", value: "Alice" }, { name: "Bob", value: "Bob" }],
        ["Bob"]
      );
    });

    it("produces only All Authors when both lists are empty (TC-231)", () => {
      // Given: selectedAuthors=[] and authors=[] with no commits
      setSelectedAuthors([]);
      vi.clearAllMocks();

      // When: loadCommits rebuilds the dropdown with empty inputs
      dispatchLoadCommits([], []);

      // Then: only the All Authors option is produced; selected is empty
      expect(mockAuthorDropdownInstance.setOptions).toHaveBeenCalledWith([ALL_AUTHORS_OPTION], []);
    });

    it("appends only the out-of-list selected authors (TC-232)", () => {
      // Given: selectedAuthors=["Alice","Charlie"] with authors=["Alice"]
      setSelectedAuthors(["Alice", "Charlie"]);
      vi.clearAllMocks();

      // When: loadCommits rebuilds the dropdown
      dispatchLoadCommits(["Alice"]);

      // Then: Alice stays once, Charlie is appended; selected preserved
      expect(mockAuthorDropdownInstance.setOptions).toHaveBeenCalledWith(
        [
          ALL_AUTHORS_OPTION,
          { name: "Alice", value: "Alice" },
          { name: "Charlie", value: "Charlie" }
        ],
        ["Alice", "Charlie"]
      );
    });

    it("preserves author order and selected order when fully contained (TC-233)", () => {
      // Given: selectedAuthors=["Bob","Alice"] with authors=["Alice","Bob"]
      setSelectedAuthors(["Bob", "Alice"]);
      vi.clearAllMocks();

      // When: loadCommits rebuilds the dropdown
      dispatchLoadCommits(["Alice", "Bob"]);

      // Then: options follow authors order (no dedup append); selected keeps ["Bob","Alice"]
      expect(mockAuthorDropdownInstance.setOptions).toHaveBeenCalledWith(
        [ALL_AUTHORS_OPTION, { name: "Alice", value: "Alice" }, { name: "Bob", value: "Bob" }],
        ["Bob", "Alice"]
      );
    });
  });

  /* ---------------------------------------------------------------- */
  /* S42: loadCommits() Author ドロップダウンの無条件再構築            */
  /* ---------------------------------------------------------------- */

  describe("loadCommits unconditional author dropdown rebuild (S42)", () => {
    const ALL_AUTHORS_OPTION = { name: "All Authors", value: "" };

    function setSelectedAuthors(values: string[]): void {
      capturedAuthorCallback!(values);
    }

    function dispatchLoadCommits(authors: string[] | undefined, commits = MOCK_COMMITS): void {
      dispatchMessage({
        command: "loadCommits",
        commits,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true,
        ...(authors === undefined ? {} : { authors })
      });
    }

    it("rebuilds with server-provided authors when no filter is active (TC-234)", () => {
      // Given: selectedAuthors=[] and server provides ["Alice","Bob"]
      setSelectedAuthors([]);
      vi.clearAllMocks();

      // When: loadCommits is received
      dispatchLoadCommits(["Alice", "Bob"]);

      // Then: setOptions is called with the server list and empty selection
      expect(mockAuthorDropdownInstance.setOptions).toHaveBeenCalledWith(
        [ALL_AUTHORS_OPTION, { name: "Alice", value: "Alice" }, { name: "Bob", value: "Bob" }],
        []
      );
    });

    it("still rebuilds while a filter is active and keeps the selection (TC-235)", () => {
      // Given: selectedAuthors=["Alice"] (filter active) and server provides ["Alice","Bob"]
      setSelectedAuthors(["Alice"]);
      vi.clearAllMocks();

      // When: loadCommits is received
      dispatchLoadCommits(["Alice", "Bob"]);

      // Then: the dropdown is rebuilt (old skip behavior removed) and selection is preserved
      expect(mockAuthorDropdownInstance.setOptions).toHaveBeenCalledWith(
        [ALL_AUTHORS_OPTION, { name: "Alice", value: "Alice" }, { name: "Bob", value: "Bob" }],
        ["Alice"]
      );
    });

    it("falls back to deduplicated sorted commit authors when authors is undefined (TC-236)", () => {
      // Given: selectedAuthors=[] and commit authors are ["Bob","Alice","Bob"]
      setSelectedAuthors([]);
      vi.clearAllMocks();
      const commits = [
        { ...MOCK_COMMITS[0], author: "Bob" },
        { ...MOCK_COMMITS[1], author: "Alice" },
        { ...MOCK_COMMITS[2], author: "Bob" }
      ];

      // When: loadCommits is received without an authors field
      dispatchLoadCommits(undefined, commits);

      // Then: the author list is deduplicated and sorted to ["Alice","Bob"]
      expect(mockAuthorDropdownInstance.setOptions).toHaveBeenCalledWith(
        [ALL_AUTHORS_OPTION, { name: "Alice", value: "Alice" }, { name: "Bob", value: "Bob" }],
        []
      );
    });

    it("shows only All Authors for an empty author list (TC-237)", () => {
      // Given: selectedAuthors=[] and authors=[]
      setSelectedAuthors([]);
      vi.clearAllMocks();

      // When: loadCommits is received with empty authors and commits
      dispatchLoadCommits([], []);

      // Then: only the All Authors option is present
      expect(mockAuthorDropdownInstance.setOptions).toHaveBeenCalledWith([ALL_AUTHORS_OPTION], []);
    });

    it("preserves an out-of-list selected author in the rebuilt options (TC-238)", () => {
      // Given: selectedAuthors=["Charlie"] absent from authors=["Alice","Bob"]
      setSelectedAuthors(["Charlie"]);
      vi.clearAllMocks();

      // When: loadCommits is received
      dispatchLoadCommits(["Alice", "Bob"]);

      // Then: Charlie is merged into the options and remains selected
      expect(mockAuthorDropdownInstance.setOptions).toHaveBeenCalledWith(
        [
          ALL_AUTHORS_OPTION,
          { name: "Alice", value: "Alice" },
          { name: "Bob", value: "Bob" },
          { name: "Charlie", value: "Charlie" }
        ],
        ["Charlie"]
      );

      // Cleanup: clear the filter and drain the in-flight request
      setSelectedAuthors([]);
      dispatchLoadCommits(undefined);
    });

    it('sends authors=["Alice"] when the dropdown selects Alice (TC-239)', () => {
      // Given: no in-flight request and no active filter
      expect(capturedAuthorCallback).not.toBeNull();
      capturedAuthorCallback!([]);
      dispatchLoadCommits(undefined);
      vi.clearAllMocks();

      // When: Alice is selected in the dropdown
      capturedAuthorCallback!(["Alice"]);

      // Then: a loadCommits request is sent carrying authors: ["Alice"]
      expect(liveVscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ command: "loadCommits", authors: ["Alice"] })
      );

      // Cleanup: drain the in-flight request
      dispatchLoadCommits(undefined);
    });

    it("sends authors=[] when All Authors is selected (TC-240)", () => {
      // Given: an active filter with no in-flight request
      expect(capturedAuthorCallback).not.toBeNull();
      capturedAuthorCallback!(["Alice"]);
      dispatchLoadCommits(undefined);
      vi.clearAllMocks();

      // When: All Authors is selected (empty array)
      capturedAuthorCallback!([]);

      // Then: a loadCommits request is sent carrying authors: []
      expect(liveVscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ command: "loadCommits", authors: [] })
      );

      // Cleanup: drain the in-flight request
      dispatchLoadCommits(undefined);
    });
  });

  /* ---------------------------------------------------------------- */
  /* S17: コミット詳細表示改善                                         */
  /* ---------------------------------------------------------------- */

  describe("Commit details display improvements", () => {
    beforeEach(() => {
      resetCommitState();
    });

    it("display order is Commit → Parents → Author → Committer → Date (TC-112)", () => {
      // Given: a commit is expanded with full details
      clickCommit(COMMIT_HASH_2);
      dispatchMessage({
        command: "commitDetails",
        commitDetails: {
          ...makeCommitDetails(COMMIT_HASH_2),
          parents: [COMMIT_HASH_1],
          author: "Bob",
          email: "bob@test.com",
          date: 1700001000,
          committer: "Bob",
          committerEmail: "bob@test.com"
        }
      });

      // Then: labels appear in the correct order
      const detailsElem = document.getElementById("commitDetails");
      expect(detailsElem).not.toBeNull();
      const html = detailsElem!.innerHTML;
      const commitIdx = html.indexOf("<b>Commit: </b>");
      const parentsIdx = html.indexOf("<b>Parents: </b>");
      const authorIdx = html.indexOf("<b>Author: </b>");
      const committerIdx = html.indexOf("<b>Committer: </b>");
      const dateIdx = html.indexOf("<b>Date: </b>");

      expect(commitIdx).toBeGreaterThan(-1);
      expect(parentsIdx).toBeGreaterThan(commitIdx);
      expect(authorIdx).toBeGreaterThan(parentsIdx);
      expect(committerIdx).toBeGreaterThan(authorIdx);
      expect(dateIdx).toBeGreaterThan(committerIdx);
    });

    it("Committer shows email with mailto link (TC-113)", () => {
      // Given: a commit with committerEmail
      clickCommit(COMMIT_HASH_2);
      dispatchMessage({
        command: "commitDetails",
        commitDetails: {
          ...makeCommitDetails(COMMIT_HASH_2),
          committer: "Bob",
          committerEmail: "bob@test.com"
        }
      });

      // Then: Committer line contains mailto link with email
      const detailsElem = document.getElementById("commitDetails");
      const html = detailsElem!.innerHTML;
      expect(html).toContain("mailto:bob%40test.com");
      expect(html).toContain("bob@test.com");
      expect(html).toContain("<b>Committer: </b>");
    });

    it("Committer shows name only when email is empty (TC-114)", () => {
      // Given: a commit with empty committerEmail
      clickCommit(COMMIT_HASH_2);
      dispatchMessage({
        command: "commitDetails",
        commitDetails: {
          ...makeCommitDetails(COMMIT_HASH_2),
          committer: "Bob",
          committerEmail: ""
        }
      });

      // Then: Committer shows name only without mailto link
      const detailsElem = document.getElementById("commitDetails");
      const html = detailsElem!.innerHTML;
      const committerMatch = html.match(/<b>Committer: <\/b>(.*?)<br>/);
      expect(committerMatch).not.toBeNull();
      expect(committerMatch![1]).toBe("Bob");
      expect(committerMatch![1]).not.toContain("mailto:");
    });
  });

  /* ---------------------------------------------------------------- */
  /* S18: data-remotes attribute                                      */
  /* ---------------------------------------------------------------- */

  describe("data-remotes attribute", () => {
    beforeEach(() => {
      resetCommitState();
    });

    it("sets data-remotes on branch with multiple remotes (TC-115)", () => {
      // Given: getBranchLabels returns a head branch with remotes
      vi.mocked(getBranchLabels).mockReturnValue({
        heads: [{ name: "main", remotes: ["origin", "upstream"] }],
        remotes: [],
        tags: []
      });

      // When: commits are loaded (triggers renderTable)
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });

      // Then: the gitRef head span has data-remotes attribute
      const headSpan = document.querySelector(".gitRef.head");
      expect(headSpan).not.toBeNull();
      expect(headSpan!.getAttribute("data-remotes")).toBe("origin,upstream");

      // Cleanup
      vi.mocked(getBranchLabels).mockReturnValue({ heads: [], remotes: [], tags: [] });
    });

    it("omits data-remotes on branch without remotes (TC-116)", () => {
      // Given: getBranchLabels returns a head branch without remotes
      vi.mocked(getBranchLabels).mockReturnValue({
        heads: [{ name: "feature", remotes: [] }],
        remotes: [],
        tags: []
      });

      // When: commits are loaded
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });

      // Then: the gitRef head span does NOT have data-remotes attribute
      const headSpan = document.querySelector(".gitRef.head");
      expect(headSpan).not.toBeNull();
      expect(headSpan!.hasAttribute("data-remotes")).toBe(false);

      // Cleanup
      vi.mocked(getBranchLabels).mockReturnValue({ heads: [], remotes: [], tags: [] });
    });

    it("contextmenu reads data-remotes and passes to buildRefContextMenuItems (TC-117)", () => {
      // Given: a branch with remotes is rendered
      vi.mocked(getBranchLabels).mockReturnValue({
        heads: [{ name: "main", remotes: ["origin"] }],
        remotes: [],
        tags: []
      });
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });
      vi.clearAllMocks();

      // When: contextmenu is triggered on the gitRef element
      const headSpan = document.querySelector(".gitRef.head");
      expect(headSpan).not.toBeNull();
      headSpan!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

      // Then: buildRefContextMenuItems is called with remotes parameter
      expect(buildRefContextMenuItems).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(HTMLElement),
        expect.any(Boolean),
        expect.anything(),
        ["origin"],
        null
      );

      // Cleanup
      vi.mocked(getBranchLabels).mockReturnValue({ heads: [], remotes: [], tags: [] });
    });
  });

  /* ---------------------------------------------------------------- */
  /* S19: Parents link navigation                                     */
  /* ---------------------------------------------------------------- */

  describe("Parents link navigation", () => {
    beforeEach(() => {
      resetCommitState();
    });

    it("displays parent hash as clickable span with data-hash (TC-118)", () => {
      // Given: a commit with one parent
      clickCommit(COMMIT_HASH_2);
      dispatchMessage({
        command: "commitDetails",
        commitDetails: {
          ...makeCommitDetails(COMMIT_HASH_2),
          parents: [COMMIT_HASH_1]
        }
      });

      // Then: parent hash is rendered as a span with parentHash class and data-hash
      const parentSpan = document.querySelector(".parentHash");
      expect(parentSpan).not.toBeNull();
      expect(parentSpan!.getAttribute("data-hash")).toBe(COMMIT_HASH_1);
    });

    it("displays full parent hash without abbreviation (TC-119)", () => {
      // Given: a commit with one parent
      clickCommit(COMMIT_HASH_2);
      dispatchMessage({
        command: "commitDetails",
        commitDetails: {
          ...makeCommitDetails(COMMIT_HASH_2),
          parents: [COMMIT_HASH_1]
        }
      });

      // Then: displayed text is the full hash (not abbreviated)
      const parentSpan = document.querySelector(".parentHash");
      expect(parentSpan).not.toBeNull();
      expect(parentSpan!.textContent).toBe(COMMIT_HASH_1);
    });

    it("clicking loaded parent scrolls and opens details (TC-120)", () => {
      // Given: commit 2 is expanded, parent is commit 1 (which is loaded)
      clickCommit(COMMIT_HASH_2);
      dispatchMessage({
        command: "commitDetails",
        commitDetails: {
          ...makeCommitDetails(COMMIT_HASH_2),
          parents: [COMMIT_HASH_1]
        }
      });
      vi.clearAllMocks();

      // When: parent hash link is clicked
      const parentSpan = document.querySelector(".parentHash");
      expect(parentSpan).not.toBeNull();
      parentSpan!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      // Then: commitDetails request is sent for the parent commit
      expect(liveVscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "commitDetails",
          commitHash: COMMIT_HASH_1
        })
      );
    });

    it("unloaded parent is rendered as plain text without link (TC-121)", () => {
      // Given: commit 1 is expanded with a parent hash that is NOT in commitLookup
      const unknownParentHash = "fff999fff999fff9";
      clickCommit(COMMIT_HASH_1);
      dispatchMessage({
        command: "commitDetails",
        commitDetails: {
          ...makeCommitDetails(COMMIT_HASH_1),
          parents: [unknownParentHash]
        }
      });

      // Then: unknown parent is rendered as plain text (no .parentHash span)
      const parentSpan = document.querySelector(".parentHash");
      expect(parentSpan).toBeNull();

      // And: the hash text is present in the details HTML
      const detailsElem = document.getElementById("commitDetails");
      expect(detailsElem!.innerHTML).toContain(unknownParentHash);
    });

    it("merge commit shows both parent hashes as links (TC-122)", () => {
      // Given: a merge commit with two parents
      const mergeHash = "eee888eee888eee8";
      const mergeCommits: GitCommitNode[] = [
        {
          hash: mergeHash,
          parentHashes: [COMMIT_HASH_1, COMMIT_HASH_2],
          author: "Alice",
          email: "alice@test.com",
          date: 1700003000,
          message: "Merge commit",
          refs: [],
          stash: null
        },
        ...MOCK_COMMITS
      ];
      dispatchMessage({
        command: "loadCommits",
        commits: mergeCommits,
        head: mergeHash,
        moreCommitsAvailable: false,
        hard: true
      });

      // When: merge commit is expanded
      clickCommit(mergeHash);
      dispatchMessage({
        command: "commitDetails",
        commitDetails: {
          ...makeCommitDetails(mergeHash),
          parents: [COMMIT_HASH_1, COMMIT_HASH_2]
        }
      });

      // Then: both parent hashes are rendered as links
      const parentSpans = document.querySelectorAll(".parentHash");
      expect(parentSpans.length).toBe(2);
      expect(parentSpans[0].getAttribute("data-hash")).toBe(COMMIT_HASH_1);
      expect(parentSpans[1].getAttribute("data-hash")).toBe(COMMIT_HASH_2);
    });
  });

  /* ---------------------------------------------------------------- */
  /* S20: renderTable() commitMessage wrapper (mute-branch-label-fix) */
  /* ---------------------------------------------------------------- */

  describe("commitMessage wrapper", () => {
    beforeEach(() => {
      resetCommitState();
      mockMutedResult.value = [];
    });

    afterEach(() => {
      mockMutedResult.value = [];
    });

    it("wraps message text in span.commitMessage for normal commit (TC-123)", () => {
      // Given: a normal commit (mute=false) — COMMIT_HASH_2 is not HEAD
      // When: commit rows are rendered via loadCommits
      // (resetCommitState already loaded MOCK_COMMITS)

      // Then: the non-HEAD commit row contains a .commitMessage span
      const row = document.querySelector(`.commit[data-hash="${COMMIT_HASH_2}"]`);
      expect(row).not.toBeNull();
      const wrapper = row!.querySelector(".commitMessage");
      expect(wrapper).not.toBeNull();
      expect(wrapper!.tagName).toBe("SPAN");
    });

    it("wraps message text in span.commitMessage for muted commit (TC-124)", () => {
      // Given: getMutedCommits returns [true, false, false] (first commit is muted)
      mockMutedResult.value = [true, false, false];
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });

      // When: the muted commit row is examined
      const row = document.querySelector(`.commit.mute[data-hash="${COMMIT_HASH_1}"]`);

      // Then: the muted row contains a .commitMessage span
      expect(row).not.toBeNull();
      const wrapper = row!.querySelector(".commitMessage");
      expect(wrapper).not.toBeNull();
      expect(wrapper!.tagName).toBe("SPAN");
    });

    it("wraps bold message inside commitMessage when currentHash matches (TC-125)", () => {
      // Given: COMMIT_HASH_1 is commitHead (= currentHash)
      // When: the HEAD commit row is rendered
      const row = document.querySelector(`.commit[data-hash="${COMMIT_HASH_1}"]`);

      // Then: message is <span class="commitMessage"><b>message</b></span>
      expect(row).not.toBeNull();
      const wrapper = row!.querySelector(".commitMessage");
      expect(wrapper).not.toBeNull();
      const bold = wrapper!.querySelector("b");
      expect(bold).not.toBeNull();
      expect(bold!.textContent).toBe("First commit");
    });

    it("wraps plain text inside commitMessage when currentHash does not match (TC-126)", () => {
      // Given: COMMIT_HASH_2 is not commitHead (not currentHash)
      // When: the non-HEAD commit row is rendered
      const row = document.querySelector(`.commit[data-hash="${COMMIT_HASH_2}"]`);

      // Then: message is <span class="commitMessage">message</span> (no <b>)
      expect(row).not.toBeNull();
      const wrapper = row!.querySelector(".commitMessage");
      expect(wrapper).not.toBeNull();
      expect(wrapper!.querySelector("b")).toBeNull();
      expect(wrapper!.textContent).toBe("Second commit");
    });

    it("places gitRef spans outside commitMessage wrapper (TC-127)", () => {
      // Given: getBranchLabels returns a head branch for COMMIT_HASH_1
      vi.mocked(getBranchLabels).mockReturnValue({
        heads: [{ name: "main", remotes: [] }],
        remotes: [],
        tags: []
      });
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });

      // When: the commit row with refs is examined
      const row = document.querySelector(`.commit[data-hash="${COMMIT_HASH_1}"]`);
      expect(row).not.toBeNull();
      const td = row!.querySelectorAll("td")[1]; // 2nd td = description column

      // Then: .gitRef is a sibling of .commitMessage (not inside it)
      const gitRef = td.querySelector(".gitRef");
      const commitMessage = td.querySelector(".commitMessage");
      expect(gitRef).not.toBeNull();
      expect(commitMessage).not.toBeNull();
      expect(commitMessage!.querySelector(".gitRef")).toBeNull();

      // Cleanup
      vi.mocked(getBranchLabels).mockReturnValue({ heads: [], remotes: [], tags: [] });
    });

    it("places commitHeadDot outside commitMessage wrapper (TC-128)", () => {
      // Given: COMMIT_HASH_1 is commitHead, so commitHeadDot is rendered
      // When: the HEAD commit row is examined
      const row = document.querySelector(`.commit[data-hash="${COMMIT_HASH_1}"]`);
      expect(row).not.toBeNull();
      const td = row!.querySelectorAll("td")[1]; // 2nd td = description column

      // Then: .commitHeadDot is a sibling of .commitMessage (not inside it)
      const headDot = td.querySelector(".commitHeadDot");
      const commitMessage = td.querySelector(".commitMessage");
      expect(headDot).not.toBeNull();
      expect(commitMessage).not.toBeNull();
      expect(commitMessage!.querySelector(".commitHeadDot")).toBeNull();
    });
  });
});

/* ------------------------------------------------------------------ */
/* S22-S26: Multi-select filter tests (Task 4.4)                       */
/* ------------------------------------------------------------------ */

describe("Multi-select filter state management", () => {
  let liveVscode: typeof vscode;
  // Mock call history is cleared before each test, so the construction-time
  // setState calls have to be captured while beforeAll is still running.
  let initialSavedState: Record<string, unknown> | undefined;

  beforeAll(async () => {
    vi.resetModules();
    dropdownCallCount = 0;
    capturedBranchCallback = null;
    capturedAuthorCallback = null;
    setupTestDOM();
    setupViewState();

    const utilsMod = await import("../../web/utils");
    liveVscode = utilsMod.vscode;
    vi.mocked(liveVscode.getState).mockReturnValueOnce(null);

    await import("../../web/main");
    loadTestCommits();

    const setStateCalls = vi.mocked(liveVscode.setState).mock.calls;
    initialSavedState = setStateCalls[setStateCalls.length - 1]?.[0] as
      | Record<string, unknown>
      | undefined;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /* ---------------------------------------------------------------- */
  /* S22: Branch multi-select state management                         */
  /* ---------------------------------------------------------------- */

  describe("Branch multi-select state (S22)", () => {
    it("initializes selectedBranches as empty array (TC-134)", () => {
      // Given: GitKeizuView was constructed with no prevState
      // When: saveState is called (implicit on construction)
      // Then: setState includes selectedBranches: []
      expect(initialSavedState).toHaveProperty("selectedBranches");
      expect(initialSavedState?.selectedBranches).toEqual([]);
    });

    it("updates selectedBranches on branch dropdown callback (TC-135)", () => {
      // Given: branch dropdown callback was captured
      expect(capturedBranchCallback).not.toBeNull();
      vi.clearAllMocks();

      // When: branch dropdown fires with ["main", "dev"]
      capturedBranchCallback!(["main", "dev"]);

      // Then: requestLoadCommits is sent with branches: ["main", "dev"]
      expect(liveVscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "loadCommits",
          branches: ["main", "dev"]
        })
      );

      // Cleanup: complete the loadCommits request
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });
    });

    it("updates selectedBranches to empty on Show All selection (TC-136)", () => {
      // Given: branch dropdown callback was captured
      expect(capturedBranchCallback).not.toBeNull();
      vi.clearAllMocks();

      // When: branch dropdown fires with [] (Show All)
      capturedBranchCallback!([]);

      // Then: requestLoadCommits is sent with branches: []
      expect(liveVscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "loadCommits",
          branches: []
        })
      );

      // Cleanup
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });
    });

    it("sends branches array in requestLoadCommits (TC-137)", () => {
      // Given: selectedBranches is ["main"]
      expect(capturedBranchCallback).not.toBeNull();
      vi.clearAllMocks();

      // When: branch callback is called with ["main"]
      capturedBranchCallback!(["main"]);

      // Then: sent message contains branches: ["main"]
      const msg = vi.mocked(liveVscode.postMessage).mock.calls[0]?.[0] as Record<string, unknown>;
      expect(msg.branches).toEqual(["main"]);

      // Cleanup
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });
    });

    it("sends empty branches array for show-all (TC-138)", () => {
      // Given: selectedBranches is []
      expect(capturedBranchCallback).not.toBeNull();
      vi.clearAllMocks();

      // When: branch callback is called with []
      capturedBranchCallback!([]);

      // Then: sent message contains branches: []
      const msg = vi.mocked(liveVscode.postMessage).mock.calls[0]?.[0] as Record<string, unknown>;
      expect(msg.branches).toEqual([]);

      // Cleanup
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
  /* S25: Branch dropdown constants                                    */
  /* ---------------------------------------------------------------- */

  describe("Branch dropdown constants (S25)", () => {
    it("ALL_BRANCHES_LABEL is 'Show All' (TC-151)", () => {
      // Given/When: loadBranches response is dispatched
      vi.clearAllMocks();
      dispatchMessage({
        command: "loadBranches",
        branches: ["main"],
        head: "main",
        hard: true,
        isRepo: true
      });

      // Then: first option name is "Show All"
      const call = mockBranchDropdownInstance.setOptions.mock.calls[0];
      expect(call).toBeDefined();
      const options = call[0] as { name: string; value: string }[];
      expect(options[0].name).toBe("Show All");
    });

    it("ALL_BRANCHES_VALUE is empty string (TC-152)", () => {
      // Given/When: loadBranches response is dispatched
      vi.clearAllMocks();
      dispatchMessage({
        command: "loadBranches",
        branches: ["main"],
        head: "main",
        hard: true,
        isRepo: true
      });

      // Then: first option value is ""
      const call = mockBranchDropdownInstance.setOptions.mock.calls[0];
      expect(call).toBeDefined();
      const options = call[0] as { name: string; value: string }[];
      expect(options[0].value).toBe("");
    });

    it("REMOTE_BRANCH_PREFIX strips 'remotes/' from display name (TC-153)", () => {
      // Given: branch list includes a remote branch
      vi.clearAllMocks();
      dispatchMessage({
        command: "loadBranches",
        branches: ["main", "remotes/origin/feature"],
        head: "main",
        hard: true,
        isRepo: true
      });

      // Then: remote branch display name strips "remotes/" prefix
      const call = mockBranchDropdownInstance.setOptions.mock.calls[0];
      const options = call[0] as { name: string; value: string }[];
      const remoteOption = options.find((o) => o.value === "remotes/origin/feature");
      expect(remoteOption).toBeDefined();
      expect(remoteOption!.name).toBe("origin/feature");
    });

    it("uses REMOTE_BRANCH_PREFIX.length instead of magic number 8 (TC-154)", () => {
      // Given: branch list includes a remote branch with long prefix
      vi.clearAllMocks();
      dispatchMessage({
        command: "loadBranches",
        branches: ["remotes/upstream/main"],
        head: null,
        hard: true,
        isRepo: true
      });

      // Then: display name correctly strips "remotes/" (8 chars) via constant
      const call = mockBranchDropdownInstance.setOptions.mock.calls[0];
      const options = call[0] as { name: string; value: string }[];
      const remoteOption = options.find((o) => o.value === "remotes/upstream/main");
      expect(remoteOption).toBeDefined();
      expect(remoteOption!.name).toBe("upstream/main");
    });
  });

  /* ---------------------------------------------------------------- */
  /* S26: loadBranches branch integrity check                          */
  /* ---------------------------------------------------------------- */

  describe("loadBranches branch integrity check (S26)", () => {
    it("preserves selected branches that still exist (TC-155)", () => {
      // Given: selectedBranches=["main","dev"], both exist in gitBranches
      expect(capturedBranchCallback).not.toBeNull();
      capturedBranchCallback!(["main", "dev"]);
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });
      vi.clearAllMocks();

      // When: loadBranches response includes both branches
      dispatchMessage({
        command: "loadBranches",
        branches: ["main", "dev", "feature"],
        head: "main",
        hard: true,
        isRepo: true
      });

      // Then: branchDropdown.setOptions is called with selectedBranches=["main","dev"]
      expect(mockBranchDropdownInstance.setOptions).toHaveBeenCalledWith(expect.any(Array), [
        "main",
        "dev"
      ]);
    });

    it("filters out branches that no longer exist (TC-156)", () => {
      // Given: selectedBranches=["main","deleted-branch"]
      capturedBranchCallback!(["main", "deleted-branch"]);
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });
      vi.clearAllMocks();

      // When: loadBranches response excludes "deleted-branch"
      dispatchMessage({
        command: "loadBranches",
        branches: ["main", "dev"],
        head: "main",
        hard: true,
        isRepo: true
      });

      // Then: branchDropdown.setOptions is called with only ["main"]
      expect(mockBranchDropdownInstance.setOptions).toHaveBeenCalledWith(expect.any(Array), [
        "main"
      ]);
    });

    it("falls back to empty when all selected branches disappear (TC-157)", () => {
      // Given: selectedBranches=["gone1","gone2"], neither exist
      capturedBranchCallback!(["gone1", "gone2"]);
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });
      vi.clearAllMocks();

      // When: loadBranches response has none of the selected branches
      // (showCurrentBranchByDefault=false in setupViewState)
      dispatchMessage({
        command: "loadBranches",
        branches: ["main", "dev"],
        head: "main",
        hard: true,
        isRepo: true
      });

      // Then: branchDropdown.setOptions is called with [] (empty = Show All fallback)
      expect(mockBranchDropdownInstance.setOptions).toHaveBeenCalledWith(expect.any(Array), []);
    });
  });
});

/* ------------------------------------------------------------------ */
/* S28: prevState scrollTop restoration                                */
/* ------------------------------------------------------------------ */

describe("prevState scrollTop restoration (S28)", () => {
  it("restores scrollTop from prevState when repo is valid (TC-160)", async () => {
    // Given: prevState with scrollTop = 300 and valid repo
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewState();

    const scrollContainer = document.getElementById("scrollContainer")!;
    Object.defineProperty(scrollContainer, "scrollTop", {
      value: 0,
      writable: true,
      configurable: true
    });

    const { vscode: freshVscode } = await import("../../web/utils");
    vi.mocked(freshVscode.getState).mockReturnValueOnce({
      ...MOCK_PREV_STATE,
      scrollTop: 300
    } as ReturnType<typeof freshVscode.getState>);

    // When: main module is imported (creates GitKeizuView)
    await import("../../web/main");

    // Then: scrollContainerElem.scrollTop is set to 300
    expect(scrollContainer.scrollTop).toBe(300);
  });

  it("does not change scrollTop when prevState has no scrollTop (TC-161)", async () => {
    // Given: prevState without scrollTop (old version data)
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewState();

    const scrollContainer = document.getElementById("scrollContainer")!;
    const scrollTopSetter = vi.fn();
    let currentScrollTop = 0;
    Object.defineProperty(scrollContainer, "scrollTop", {
      get: () => currentScrollTop,
      set: (v: number) => {
        currentScrollTop = v;
        scrollTopSetter(v);
      },
      configurable: true
    });

    const { vscode: freshVscode } = await import("../../web/utils");
    const prevStateNoScrollTop = { ...MOCK_PREV_STATE };
    vi.mocked(freshVscode.getState).mockReturnValueOnce(
      prevStateNoScrollTop as ReturnType<typeof freshVscode.getState>
    );

    // When: main module is imported (creates GitKeizuView)
    await import("../../web/main");

    // Then: scrollTop setter was never called with a restoration value from prevState
    const restorationCalls = scrollTopSetter.mock.calls.filter((call: [number]) => call[0] !== 0);
    expect(restorationCalls).toHaveLength(0);
    expect(currentScrollTop).toBe(0);
  });

  it("skips scrollTop restoration when prevState is null (TC-162)", async () => {
    // Given: prevState is null (first-time display)
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewState();

    const scrollContainer = document.getElementById("scrollContainer")!;
    Object.defineProperty(scrollContainer, "scrollTop", {
      value: 0,
      writable: true,
      configurable: true
    });

    const { vscode: freshVscode } = await import("../../web/utils");
    vi.mocked(freshVscode.getState).mockReturnValueOnce(null);

    // When: main module is imported (creates GitKeizuView)
    await import("../../web/main");

    // Then: scrollTop remains 0 (no restoration attempted)
    expect(scrollContainer.scrollTop).toBe(0);
  });

  it("explicitly sets scrollTop to 0 when prevState.scrollTop is 0 (TC-163)", async () => {
    // Given: prevState with scrollTop = 0 and valid repo
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewState();

    const scrollContainer = document.getElementById("scrollContainer")!;
    const scrollTopSetter = vi.fn();
    let currentScrollTop = 999;
    Object.defineProperty(scrollContainer, "scrollTop", {
      get: () => currentScrollTop,
      set: (v: number) => {
        currentScrollTop = v;
        scrollTopSetter(v);
      },
      configurable: true
    });

    const { vscode: freshVscode } = await import("../../web/utils");
    vi.mocked(freshVscode.getState).mockReturnValueOnce({
      ...MOCK_PREV_STATE,
      scrollTop: 0
    } as ReturnType<typeof freshVscode.getState>);

    // When: main module is imported (creates GitKeizuView)
    await import("../../web/main");

    // Then: scrollTop is explicitly set to 0
    expect(scrollTopSetter).toHaveBeenCalledWith(0);
    expect(currentScrollTop).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* S24: WebViewState backward compatibility migration                  */
/* ------------------------------------------------------------------ */

describe("WebViewState backward compatibility migration (S24)", () => {
  it("converts legacy currentBranch string to selectedBranches array (TC-145)", async () => {
    // Given: prevState has old format with currentBranch: "main"
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewState();

    const utilsMod = await import("../../web/utils");
    const freshVscode = utilsMod.vscode;
    vi.mocked(freshVscode.getState).mockReturnValueOnce({
      ...MOCK_PREV_STATE,
      currentBranch: "main",
      selectedBranches: undefined
    } as unknown as ReturnType<typeof freshVscode.getState>);

    // When: main module is imported
    await import("../../web/main");

    // Then: setState is called with selectedBranches: ["main"]
    const setStateCalls = vi.mocked(freshVscode.setState).mock.calls;
    const states = setStateCalls.map((c) => c[0] as Record<string, unknown>);
    const withBranches = states.find((s) => s.selectedBranches !== undefined);
    expect(withBranches).toBeDefined();
    expect(withBranches!.selectedBranches).toEqual(["main"]);
  });

  it("converts legacy null currentBranch to empty selectedBranches (TC-146)", async () => {
    // Given: prevState has old format with currentBranch: null
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewState();

    const utilsMod = await import("../../web/utils");
    const freshVscode = utilsMod.vscode;
    vi.mocked(freshVscode.getState).mockReturnValueOnce({
      ...MOCK_PREV_STATE,
      currentBranch: null,
      selectedBranches: undefined
    } as unknown as ReturnType<typeof freshVscode.getState>);

    // When: main module is imported
    await import("../../web/main");

    // Then: setState is called with selectedBranches: []
    const setStateCalls = vi.mocked(freshVscode.setState).mock.calls;
    const states = setStateCalls.map((c) => c[0] as Record<string, unknown>);
    const withBranches = states.find((s) => s.selectedBranches !== undefined);
    expect(withBranches).toBeDefined();
    expect(withBranches!.selectedBranches).toEqual([]);
  });

  it("converts legacy authorFilter string to selectedAuthors array (TC-147)", async () => {
    // Given: prevState has old format with authorFilter: "Alice"
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewState();

    const utilsMod = await import("../../web/utils");
    const freshVscode = utilsMod.vscode;
    vi.mocked(freshVscode.getState).mockReturnValueOnce({
      ...MOCK_PREV_STATE,
      authorFilter: "Alice",
      selectedAuthors: undefined
    } as unknown as ReturnType<typeof freshVscode.getState>);

    // When: main module is imported
    await import("../../web/main");

    // Then: setState is called with selectedAuthors: ["Alice"]
    const setStateCalls = vi.mocked(freshVscode.setState).mock.calls;
    const states = setStateCalls.map((c) => c[0] as Record<string, unknown>);
    const withAuthors = states.find((s) => s.selectedAuthors !== undefined);
    expect(withAuthors).toBeDefined();
    expect(withAuthors!.selectedAuthors).toEqual(["Alice"]);
  });

  it("converts legacy null authorFilter to empty selectedAuthors (TC-148)", async () => {
    // Given: prevState has old format with authorFilter: null
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewState();

    const utilsMod = await import("../../web/utils");
    const freshVscode = utilsMod.vscode;
    vi.mocked(freshVscode.getState).mockReturnValueOnce({
      ...MOCK_PREV_STATE,
      authorFilter: null,
      selectedAuthors: undefined
    } as unknown as ReturnType<typeof freshVscode.getState>);

    // When: main module is imported
    await import("../../web/main");

    // Then: setState is called with selectedAuthors: []
    const setStateCalls = vi.mocked(freshVscode.setState).mock.calls;
    const states = setStateCalls.map((c) => c[0] as Record<string, unknown>);
    const withAuthors = states.find((s) => s.selectedAuthors !== undefined);
    expect(withAuthors).toBeDefined();
    expect(withAuthors!.selectedAuthors).toEqual([]);
  });

  it("preserves new format selectedBranches as-is (TC-149)", async () => {
    // Given: prevState has new format with selectedBranches: ["main"] (exists in gitBranches)
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewState();

    const utilsMod = await import("../../web/utils");
    const freshVscode = utilsMod.vscode;
    vi.mocked(freshVscode.getState).mockReturnValueOnce({
      ...MOCK_PREV_STATE,
      selectedBranches: ["main"]
    } as unknown as ReturnType<typeof freshVscode.getState>);

    // When: main module is imported
    await import("../../web/main");

    // Then: setState includes selectedBranches: ["main"] (preserved, not migrated)
    const setStateCalls = vi.mocked(freshVscode.setState).mock.calls;
    const states = setStateCalls.map((c) => c[0] as Record<string, unknown>);
    const withBranches = states.find(
      (s) => Array.isArray(s.selectedBranches) && (s.selectedBranches as string[]).length === 1
    );
    expect(withBranches).toBeDefined();
    expect(withBranches!.selectedBranches).toEqual(["main"]);
  });

  it("saves state in new format with selectedBranches and selectedAuthors (TC-150)", async () => {
    // Given: normal construction
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewState();

    const utilsMod = await import("../../web/utils");
    const freshVscode = utilsMod.vscode;
    vi.mocked(freshVscode.getState).mockReturnValueOnce(null);

    // When: main module is imported
    await import("../../web/main");

    // Then: setState is called with selectedBranches and selectedAuthors (not currentBranch/authorFilter)
    const setStateCalls = vi.mocked(freshVscode.setState).mock.calls;
    expect(setStateCalls.length).toBeGreaterThan(0);
    const lastState = setStateCalls[setStateCalls.length - 1][0] as Record<string, unknown>;
    expect(lastState).toHaveProperty("selectedBranches");
    expect(lastState).toHaveProperty("selectedAuthors");
    expect(lastState).not.toHaveProperty("currentBranch");
    expect(lastState).not.toHaveProperty("authorFilter");
  });
});

/* ------------------------------------------------------------------ */
/* S34: コミット表示順序 ソート順解決・コンテキストメニュー            */
/* ------------------------------------------------------------------ */

function setupViewStateWithOrdering(globalOrdering: string, repoOrdering?: string): void {
  const repos: Record<string, Record<string, unknown>> = {
    [TEST_REPO]: { columnWidths: null }
  };
  if (repoOrdering !== undefined) {
    repos[TEST_REPO].commitOrdering = repoOrdering;
  }
  (globalThis as Record<string, unknown>).viewState = {
    repos,
    lastActiveRepo: TEST_REPO,
    commitOrdering: globalOrdering,
    dateFormat: "Date & Time",
    fetchAvatars: false,
    graphColours: ["#0085d9"],
    graphStyle: "rounded",
    initialLoadCommits: 300,
    keybindings: { find: "f", refresh: "r", scrollToHead: "h", scrollToStash: "s" },
    loadMoreCommits: 100,
    loadMoreCommitsAutomatically: true,
    showCurrentBranchByDefault: false,
    dialogDefaults: {
      merge: { noFastForward: true, squashCommits: false, noCommit: false },
      cherryPick: { recordOrigin: false, noCommit: false },
      stashUncommittedChanges: { includeUntracked: false },
      createWorktree: { openTerminal: true },
      removeWorktree: { deleteBranch: true }
    }
  };
}

function getLoadCommitsMessages(
  mockPostMessage: ReturnType<typeof vi.fn>
): Record<string, unknown>[] {
  return mockPostMessage.mock.calls
    .map((call: [Record<string, unknown>]) => call[0])
    .filter((msg: Record<string, unknown>) => msg.command === "loadCommits");
}

describe("Commit ordering effective sort order (S34)", () => {
  it('effective ordering is "topo" when repoState="topo" and global="date" (TC-184)', async () => {
    // Given: global commitOrdering="date", repo override="topo"
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewStateWithOrdering("date", "topo");

    const { vscode: freshVscode } = await import("../../web/utils");
    vi.mocked(freshVscode.getState).mockReturnValueOnce(null);
    await import("../../web/main");
    loadTestCommits();

    // Then: loadCommits message has commitOrdering="topo" (repo overrides global)
    const msgs = getLoadCommitsMessages(vi.mocked(freshVscode.postMessage));
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs[msgs.length - 1].commitOrdering).toBe("topo");
  });

  it('effective ordering is "topo" when repoState="default" and global="topo" (TC-185)', async () => {
    // Given: global commitOrdering="topo", repo override="default"
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewStateWithOrdering("topo", "default");

    const { vscode: freshVscode } = await import("../../web/utils");
    vi.mocked(freshVscode.getState).mockReturnValueOnce(null);
    await import("../../web/main");
    loadTestCommits();

    // Then: commitOrdering="topo" (falls back to global because repo is "default")
    const msgs = getLoadCommitsMessages(vi.mocked(freshVscode.postMessage));
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs[msgs.length - 1].commitOrdering).toBe("topo");
  });

  it('effective ordering is "date" when repoState is undefined and global="date" (TC-186)', async () => {
    // Given: global commitOrdering="date", no repo override
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewStateWithOrdering("date");

    const { vscode: freshVscode } = await import("../../web/utils");
    vi.mocked(freshVscode.getState).mockReturnValueOnce(null);
    await import("../../web/main");
    loadTestCommits();

    // Then: commitOrdering="date" (global default used)
    const msgs = getLoadCommitsMessages(vi.mocked(freshVscode.postMessage));
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs[msgs.length - 1].commitOrdering).toBe("date");
  });

  it('effective ordering is "author-date" when repoState="author-date" and global="date" (TC-187)', async () => {
    // Given: global commitOrdering="date", repo override="author-date"
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewStateWithOrdering("date", "author-date");

    const { vscode: freshVscode } = await import("../../web/utils");
    vi.mocked(freshVscode.getState).mockReturnValueOnce(null);
    await import("../../web/main");
    loadTestCommits();

    // Then: commitOrdering="author-date" (repo overrides global)
    const msgs = getLoadCommitsMessages(vi.mocked(freshVscode.postMessage));
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs[msgs.length - 1].commitOrdering).toBe("author-date");
  });

  it('initializes global default from viewState.commitOrdering="topo" (TC-188)', async () => {
    // Given: global commitOrdering="topo", no repo override
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewStateWithOrdering("topo");

    const { vscode: freshVscode } = await import("../../web/utils");
    vi.mocked(freshVscode.getState).mockReturnValueOnce(null);
    await import("../../web/main");
    loadTestCommits();

    // Then: loadCommits uses "topo" as the effective ordering (from global default)
    const msgs = getLoadCommitsMessages(vi.mocked(freshVscode.postMessage));
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs[msgs.length - 1].commitOrdering).toBe("topo");
  });

  it("includes commitOrdering field in requestLoadCommits message (TC-189)", async () => {
    // Given: global commitOrdering="date"
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewStateWithOrdering("date");

    const { vscode: freshVscode } = await import("../../web/utils");
    vi.mocked(freshVscode.getState).mockReturnValueOnce(null);
    await import("../../web/main");
    loadTestCommits();

    // Then: loadCommits message has commitOrdering property
    const msgs = getLoadCommitsMessages(vi.mocked(freshVscode.postMessage));
    expect(msgs.length).toBeGreaterThan(0);
    const msg = msgs[msgs.length - 1];
    expect(msg).toHaveProperty("commitOrdering");
    expect(msg.commitOrdering).toBe("date");
  });
});

describe("Commit ordering context menu (S34)", () => {
  let freshVscode: typeof vscode;
  let freshShowContextMenu: typeof showContextMenu;

  beforeAll(async () => {
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewStateWithOrdering("date", "topo");

    const utilsMod = await import("../../web/utils");
    freshVscode = utilsMod.vscode;
    vi.mocked(freshVscode.getState).mockReturnValueOnce(null);

    const ctxMod = await import("../../web/contextMenu");
    freshShowContextMenu = ctxMod.showContextMenu;

    await import("../../web/main");
    loadTestCommits();
  });

  beforeEach(() => {
    // Clear any pending loadCommitsCallback by dispatching a no-op response
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: false
    });
    vi.mocked(freshShowContextMenu).mockClear();
    vi.mocked(freshVscode.postMessage).mockClear();
  });

  it('shows "Default", "Date", "Author Date", "Topological" menu items on table header right-click (TC-190)', () => {
    // Given: table headers are rendered
    const colHeaders = document.getElementById("tableColHeaders");
    expect(colHeaders).not.toBeNull();

    // When: right-click on table headers
    colHeaders!.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 100, clientY: 50 })
    );

    // Then: showContextMenu is called with 4 items
    expect(freshShowContextMenu).toHaveBeenCalledTimes(1);
    const items = vi.mocked(freshShowContextMenu).mock.calls[0][1];
    expect(items).toHaveLength(4);
    const titles = items.map((item) => item!.title);
    expect(titles.some((t) => t.includes("Default"))).toBe(true);
    expect(titles.some((t) => t.includes("Date") && !t.includes("Author"))).toBe(true);
    expect(titles.some((t) => t.includes("Author Date"))).toBe(true);
    expect(titles.some((t) => t.includes("Topological"))).toBe(true);
  });

  it('shows checkmark on "Topological" when effective ordering is "topo" (TC-191)', () => {
    // Given: effective ordering is "topo" (repo override from beforeAll)
    const colHeaders = document.getElementById("tableColHeaders")!;

    // When: right-click on table headers
    colHeaders.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 100, clientY: 50 })
    );

    // Then: "Topological" has checkmark prefix, others don't
    const items = vi.mocked(freshShowContextMenu).mock.calls[0][1];
    expect(items[0]!.title).toBe("Default");
    expect(items[1]!.title).toBe("Date");
    expect(items[2]!.title).toBe("Author Date");
    expect(items[3]!.title).toBe("\u2713 Topological");
  });

  it('updates repoState and sends saveRepoState when "Author Date" is selected (TC-192)', () => {
    // Given: context menu is shown
    const colHeaders = document.getElementById("tableColHeaders")!;
    colHeaders.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 100, clientY: 50 })
    );
    const items = vi.mocked(freshShowContextMenu).mock.calls[0][1];
    vi.mocked(freshVscode.postMessage).mockClear();

    // When: "Author Date" is clicked
    items[2]!.onClick();

    // Then: saveRepoState message is sent with commitOrdering="author-date"
    const saveStateCalls = vi
      .mocked(freshVscode.postMessage)
      .mock.calls.filter(
        (call) => (call[0] as Record<string, unknown>).command === "saveRepoState"
      );
    expect(saveStateCalls.length).toBeGreaterThan(0);
    const state = (saveStateCalls[0][0] as Record<string, unknown>).state as Record<
      string,
      unknown
    >;
    expect(state.commitOrdering).toBe("author-date");
  });

  it("calls requestLoadCommits with hard refresh when sort order is selected (TC-193)", () => {
    // Given: context menu is shown
    const colHeaders = document.getElementById("tableColHeaders")!;
    colHeaders.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 100, clientY: 50 })
    );
    const items = vi.mocked(freshShowContextMenu).mock.calls[0][1];
    vi.mocked(freshVscode.postMessage).mockClear();

    // When: "Date" is clicked
    items[1]!.onClick();

    // Then: loadCommits message is sent with hard=true
    const loadCommitsCalls = vi
      .mocked(freshVscode.postMessage)
      .mock.calls.filter((call) => (call[0] as Record<string, unknown>).command === "loadCommits");
    expect(loadCommitsCalls.length).toBeGreaterThan(0);
    expect((loadCommitsCalls[0][0] as Record<string, unknown>).hard).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* S55: detached worktree ラベルの描画と contextmenu の振り分け        */
/* ------------------------------------------------------------------ */

// S55: detached worktree ラベルの描画と contextmenu の worktree menu 振り分け
// @see docs/testing/perspectives/web/main-test/01-rendering-02.md
describe("worktree label rendering (S55)", () => {
  const EMPTY_COLLECTION = { branches: {}, detached: [] };

  interface BranchLabels {
    heads?: { name: string; remotes: string[] }[];
    remotes?: { name: string; remote: string }[];
    tags?: { name: string }[];
  }

  function setBranchLabels(labels: BranchLabels): void {
    vi.mocked(getBranchLabels).mockReturnValue({
      heads: labels.heads ?? [],
      remotes: labels.remotes ?? [],
      tags: labels.tags ?? []
    } as unknown as ReturnType<typeof getBranchLabels>);
  }

  function loadWithWorktrees(worktrees: unknown, overrides: Record<string, unknown> = {}): void {
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: true,
      ...(worktrees === undefined ? {} : { worktrees }),
      ...overrides
    });
  }

  function detachedEntry(path: string, head: string, isMain = false) {
    return { path, isMain, head };
  }

  function rowFor(hash: string): HTMLElement {
    const row = document.querySelector<HTMLElement>(`[data-hash="${hash}"]`);
    if (row === null) throw new Error(`Commit row not found for hash: ${hash}`);
    return row;
  }

  function postedCommands(command: string): unknown[] {
    return vi
      .mocked(vscode.postMessage)
      .mock.calls.filter((call) => (call[0] as Record<string, unknown>).command === command);
  }

  beforeEach(() => {
    resetCommitState();
  });

  afterEach(() => {
    setBranchLabels({});
  });

  it("marks a branch label whose entry is a linked worktree (TC-394)", () => {
    // Case: TC-394
    // Given: the branches map holds a linked worktree for the rendered head branch
    setBranchLabels({ heads: [{ name: "feature", remotes: [] }] });

    // When: the collection is loaded
    loadWithWorktrees({
      branches: { feature: { path: "/home/user/feature-wt", isMain: false } },
      detached: []
    });

    // Then: the head label carries the worktree class, path attribute and worktree icon
    const headSpan = document.querySelector(".gitRef.head");
    expect(headSpan).not.toBeNull();
    expect(headSpan!.classList.contains("worktree")).toBe(true);
    expect(headSpan!.getAttribute("data-worktree-path")).toBe("/home/user/feature-wt");
    expect(headSpan!.querySelector(".codicon.codicon-worktree-small")).not.toBeNull();
  });

  it("leaves a branch label untouched when it has no worktree entry (TC-395)", () => {
    // Case: TC-395
    // Given: the rendered head branch is absent from the branches map
    setBranchLabels({ heads: [{ name: "develop", remotes: [] }] });

    // When: the collection is loaded
    loadWithWorktrees(EMPTY_COLLECTION);

    // Then: the head label keeps the plain branch icon and no worktree markers
    const headSpan = document.querySelector(".gitRef.head");
    expect(headSpan).not.toBeNull();
    expect(headSpan!.classList.contains("worktree")).toBe(false);
    expect(headSpan!.hasAttribute("data-worktree-path")).toBe(false);
    expect(headSpan!.querySelector(".codicon.codicon-git-branch")).not.toBeNull();
  });

  it("sets the worktree tooltip on a linked branch label (TC-396)", () => {
    // Case: TC-396
    // Given: the branches map holds a linked worktree path for the head branch
    setBranchLabels({ heads: [{ name: "feature", remotes: [] }] });

    // When: the collection is loaded
    loadWithWorktrees({
      branches: { feature: { path: "/tmp/my-worktree", isMain: false } },
      detached: []
    });

    // Then: the label tooltip states the worktree path
    const headSpan = document.querySelector(".gitRef.head.worktree");
    expect(headSpan).not.toBeNull();
    expect(headSpan!.getAttribute("title")).toBe("Worktree: /tmp/my-worktree");
  });

  it("escapes a branch worktree path containing HTML markup (TC-397)", () => {
    // Case: TC-397
    // Given: the linked worktree path contains a script tag
    const maliciousPath = '/tmp/<script>alert("xss")</script>';
    setBranchLabels({ heads: [{ name: "feature", remotes: [] }] });

    // When: the collection is loaded
    loadWithWorktrees({
      branches: { feature: { path: maliciousPath, isMain: false } },
      detached: []
    });

    // Then: no script element is created and both attributes still decode to the original path
    const headSpan = document.querySelector(".gitRef.head");
    expect(headSpan).not.toBeNull();
    expect(document.querySelectorAll("script")).toHaveLength(0);
    expect(headSpan!.getAttribute("data-worktree-path")).toBe(maliciousPath);
    expect(headSpan!.getAttribute("title")).toBe(`Worktree: ${maliciousPath}`);
  });

  it("never marks a remote label as a worktree (TC-398)", () => {
    // Case: TC-398
    // Given: only a remote label is rendered and the branches map holds the same name
    setBranchLabels({ remotes: [{ name: "origin/feature", remote: "origin" }] });

    // When: the collection is loaded
    loadWithWorktrees({
      branches: { "origin/feature": { path: "/tmp/wt", isMain: false } },
      detached: []
    });

    // Then: the remote label carries no worktree class
    const remoteSpan = document.querySelector(".gitRef.remote");
    expect(remoteSpan).not.toBeNull();
    expect(remoteSpan!.classList.contains("worktree")).toBe(false);
  });

  it("passes the branch worktree info to the ref context menu (TC-399)", () => {
    // Case: TC-399
    // Given: a branch label backed by a worktree entry is rendered
    setBranchLabels({ heads: [{ name: "feature", remotes: [] }] });
    loadWithWorktrees({
      branches: { feature: { path: "/home/user/wt", isMain: true } },
      detached: []
    });
    vi.clearAllMocks();

    // When: the branch label receives a contextmenu event
    document
      .querySelector(".gitRef.head")!
      .dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

    // Then: the menu builder receives the path and main flag from the branches map
    expect(buildRefContextMenuItems).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(HTMLElement),
      expect.any(Boolean),
      expect.anything(),
      undefined,
      { path: "/home/user/wt", isMainWorktree: true }
    );
  });

  it("passes null worktree info for a branch without an entry (TC-400)", () => {
    // Case: TC-400
    // Given: a branch label with no matching entry in the branches map is rendered
    setBranchLabels({ heads: [{ name: "develop", remotes: [] }] });
    loadWithWorktrees(EMPTY_COLLECTION);
    vi.clearAllMocks();

    // When: the branch label receives a contextmenu event
    document
      .querySelector(".gitRef.head")!
      .dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

    // Then: the menu builder receives null worktree info
    expect(buildRefContextMenuItems).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(HTMLElement),
      expect.any(Boolean),
      expect.anything(),
      undefined,
      null
    );
  });

  it("renders every branch label plainly when the branches map is empty (TC-401)", () => {
    // Case: TC-401
    // Given: two head branches are rendered and the branches map is empty
    setBranchLabels({
      heads: [
        { name: "main", remotes: [] },
        { name: "feature", remotes: [] }
      ]
    });

    // When: the collection is loaded
    loadWithWorktrees(EMPTY_COLLECTION);

    // Then: no branch label carries a worktree class or path attribute
    const headSpans = document.querySelectorAll(".gitRef.head");
    expect(headSpans.length).toBeGreaterThanOrEqual(2);
    headSpans.forEach((span) => {
      expect(span.classList.contains("worktree")).toBe(false);
      expect(span.hasAttribute("data-worktree-path")).toBe(false);
    });
  });

  it("renders a detached label on the commit row with a matching hash (TC-402)", () => {
    // Case: TC-402
    // Given: a linked detached worktree points at the first commit
    // When: the collection is loaded
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry("/tmp/wt8", COMMIT_HASH_1)]
    });

    // Then: that row carries exactly one display-only worktree label with the worktree icon
    const labels = rowFor(COMMIT_HASH_1).querySelectorAll(".gitRef.worktree.detachedWorktree");
    expect(labels).toHaveLength(1);
    expect(labels[0].querySelector(".codicon.codicon-worktree-small")).not.toBeNull();
  });

  it("does not label a commit row whose hash differs (TC-403)", () => {
    // Case: TC-403
    // Given: the detached worktree points at the first commit
    // When: the collection is loaded
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry("/tmp/wt8", COMMIT_HASH_1)]
    });

    // Then: a different commit row carries no detached label
    expect(rowFor(COMMIT_HASH_2).querySelectorAll(".detachedWorktree")).toHaveLength(0);
  });

  it("orders multiple detached labels by full path (TC-404)", () => {
    // Case: TC-404
    // Given: two detached worktrees on the same commit are supplied in descending path order
    // When: the collection is loaded
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry("/tmp/b", COMMIT_HASH_1), detachedEntry("/tmp/a", COMMIT_HASH_1)]
    });

    // Then: both labels are rendered in ascending path order
    const labels = rowFor(COMMIT_HASH_1).querySelectorAll(".detachedWorktree");
    expect(labels).toHaveLength(2);
    expect([...labels].map((label) => label.getAttribute("data-worktree-path"))).toEqual([
      "/tmp/a",
      "/tmp/b"
    ]);
  });

  it("does not label the detached main worktree (TC-405)", () => {
    // Case: TC-405
    // Given: the detached entry is the main worktree and its head matches a commit row
    // When: the collection is loaded
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry("/repo", COMMIT_HASH_1, true)]
    });

    // Then: the matching row carries no detached label
    expect(rowFor(COMMIT_HASH_1).querySelectorAll(".detachedWorktree")).toHaveLength(0);
  });

  it("shows the final path component as the label text (TC-406)", () => {
    // Case: TC-406
    // Given: the detached worktree path has several components
    // When: the collection is loaded
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry("/tmp/a/wt8", COMMIT_HASH_1)]
    });

    // Then: the label shows only the final component
    const label = rowFor(COMMIT_HASH_1).querySelector(".detachedWorktree");
    expect(label!.textContent).toBe("wt8");
  });

  it("strips a trailing separator before taking the label text (TC-407)", () => {
    // Case: TC-407
    // Given: the detached worktree path ends with a slash
    // When: the collection is loaded
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry("/tmp/a/wt8/", COMMIT_HASH_1)]
    });

    // Then: the trailing separator is ignored when deriving the label text
    const label = rowFor(COMMIT_HASH_1).querySelector(".detachedWorktree");
    expect(label!.textContent).toBe("wt8");
  });

  it("handles backslash separators in the label text (TC-408)", () => {
    // Case: TC-408
    // Given: the detached worktree path uses Windows backslash separators
    // When: the collection is loaded
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry("C:\\tmp\\a\\wt8", COMMIT_HASH_1)]
    });

    // Then: the final component is derived from the backslash separator too
    const label = rowFor(COMMIT_HASH_1).querySelector(".detachedWorktree");
    expect(label!.textContent).toBe("wt8");
  });

  it("falls back to the full path when the final component is empty (TC-409)", () => {
    // Case: TC-409
    // Given: the detached worktree path is the root separator alone
    // When: the collection is loaded
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry("/", COMMIT_HASH_1)]
    });

    // Then: the label falls back to the full path
    const label = rowFor(COMMIT_HASH_1).querySelector(".detachedWorktree");
    expect(label!.textContent).toBe("/");
  });

  it("escapes a detached worktree path containing HTML markup (TC-410)", () => {
    // Case: TC-410
    // Given: the detached worktree path contains a script tag and an ampersand
    const maliciousPath = '<script>alert("x")&</script>/wt8';

    // When: the collection is loaded
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry(maliciousPath, COMMIT_HASH_1)]
    });

    // Then: no script element is created and the original path is recoverable from the DOM
    const label = rowFor(COMMIT_HASH_1).querySelector(".detachedWorktree");
    expect(document.querySelectorAll("script")).toHaveLength(0);
    expect(label!.getAttribute("data-worktree-path")).toBe(maliciousPath);
    expect(label!.getAttribute("title")).toBe(`Worktree: ${maliciousPath}`);
  });

  it("gives the detached label no branch dataset entry (TC-411)", () => {
    // Case: TC-411
    // Given: a detached label is rendered
    // When: the collection is loaded
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry("/tmp/wt8", COMMIT_HASH_1)]
    });

    // Then: the label carries no data-name, so it cannot be read as a branch ref
    const label = rowFor(COMMIT_HASH_1).querySelector(".detachedWorktree");
    expect(label!.hasAttribute("data-name")).toBe(false);
  });

  it("shows the detached worktree menu on a detached label (TC-412)", () => {
    // Case: TC-412 (menu source is the label's button: 13-keyboard-accessibility-02.md S78 TC-743)
    // Given: the current repo has a recent action and a detached label is rendered
    dispatchMessage({
      command: "loadRepos",
      repos: { [TEST_REPO]: { columnWidths: null, recentActions: ["ref.openTerminal"] } },
      lastActiveRepo: TEST_REPO
    });
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry("/tmp/wt8", COMMIT_HASH_1)]
    });
    vi.clearAllMocks();
    const label = rowFor(COMMIT_HASH_1).querySelector(".detachedWorktree")!;

    // When: the detached label receives a contextmenu event
    label.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

    // Then: the detached worktree menu is built from the label path and shown with recent actions
    expect(buildDetachedWorktreeContextMenuItems).toHaveBeenCalledTimes(1);
    expect(buildDetachedWorktreeContextMenuItems).toHaveBeenCalledWith(TEST_REPO, "/tmp/wt8");
    expect(buildRefContextMenuItems).not.toHaveBeenCalled();
    expect(showContextMenu).toHaveBeenCalledTimes(1);
    const showContextMenuArgs = vi.mocked(showContextMenu).mock.calls[0];
    expect(showContextMenuArgs[1]).toBe(
      vi.mocked(buildDetachedWorktreeContextMenuItems).mock.results[0].value
    );
    // The menu is anchored to the label's operable button (061-05 Task 7), not to the wrapper.
    expect(showContextMenuArgs[2]).toBe(label.querySelector("button.gitRefButton"));
    expect(showContextMenuArgs[3]).toEqual(["ref.openTerminal"]);

    dispatchMessage({
      command: "loadRepos",
      repos: { [TEST_REPO]: { columnWidths: null } },
      lastActiveRepo: TEST_REPO
    });
  });

  it("suppresses checkout on a detached label double click (TC-413)", () => {
    // Case: TC-413
    // Given: a detached label is rendered
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry("/tmp/wt8", COMMIT_HASH_1)]
    });
    vi.clearAllMocks();

    // When: the detached label receives a dblclick event
    rowFor(COMMIT_HASH_1)
      .querySelector(".detachedWorktree")!
      .dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

    // Then: no checkout action runs and no checkout message is posted
    expect(checkoutBranchAction).not.toHaveBeenCalled();
    expect(postedCommands("checkoutBranch")).toHaveLength(0);
  });

  it("stops a detached label click from reaching the commit row (TC-414)", () => {
    // Case: TC-414
    // Given: a detached label is rendered on a commit row
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry("/tmp/wt8", COMMIT_HASH_1)]
    });
    vi.clearAllMocks();

    // When: the detached label receives a click event
    rowFor(COMMIT_HASH_1)
      .querySelector(".detachedWorktree")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Then: the commit row handler does not run, so the row stays collapsed and asks for nothing
    expect(postedCommands("commitDetails")).toHaveLength(0);
    expect(rowFor(COMMIT_HASH_1).classList.contains("commitDetailsOpen")).toBe(false);
  });

  it("treats an omitted worktrees field as an empty collection (TC-415)", () => {
    // Case: TC-415
    // Given: a head branch label is rendered
    setBranchLabels({ heads: [{ name: "main", remotes: [] }] });

    // When: loadCommits arrives without the worktrees field
    loadWithWorktrees(undefined);

    // Then: nothing is rendered as a worktree, matching the empty collection default
    expect(document.querySelectorAll(".detachedWorktree")).toHaveLength(0);
    expect(document.querySelectorAll(".gitRef.worktree")).toHaveLength(0);
  });

  it("re-renders when only a detached head changed (TC-416)", () => {
    // Case: TC-416
    // Given: a detached label is already rendered on the first commit
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry("/tmp/wt8", COMMIT_HASH_1)]
    });
    expect(rowFor(COMMIT_HASH_1).querySelectorAll(".detachedWorktree")).toHaveLength(1);

    // When: the same commits arrive with only the detached head moved, without forcing a render
    loadWithWorktrees(
      { branches: {}, detached: [detachedEntry("/tmp/wt8", COMMIT_HASH_2)] },
      { hard: false }
    );

    // Then: the skip branch is not taken and the label moves to the new row
    expect(rowFor(COMMIT_HASH_1).querySelectorAll(".detachedWorktree")).toHaveLength(0);
    expect(rowFor(COMMIT_HASH_2).querySelectorAll(".detachedWorktree")).toHaveLength(1);
  });

  it("keeps the existing labels on a row that gains a detached label (TC-417)", () => {
    // Case: TC-417
    // Given: the first commit is the HEAD commit, carries a stash and has remote and tag labels
    setBranchLabels({
      remotes: [{ name: "origin/feature", remote: "origin" }],
      tags: [{ name: "v1" }]
    });
    const commitsWithStash: GitCommitNode[] = [
      { ...MOCK_COMMITS[0], stash: makeStash({ baseHash: COMMIT_HASH_2 }) },
      MOCK_COMMITS[1],
      MOCK_COMMITS[2]
    ];

    // When: a detached worktree label is rendered on that row
    loadWithWorktrees(
      { branches: {}, detached: [detachedEntry("/tmp/wt8", COMMIT_HASH_1)] },
      { commits: commitsWithStash }
    );

    // Then: the HEAD dot and the remote, tag and stash labels are each still rendered once
    const row = rowFor(COMMIT_HASH_1);
    expect(row.querySelectorAll(".detachedWorktree")).toHaveLength(1);
    expect(row.querySelectorAll(".commitHeadDot")).toHaveLength(1);
    expect(row.querySelectorAll(".gitRef.remote")).toHaveLength(1);
    expect(row.querySelectorAll(".gitRef.tag")).toHaveLength(1);
    expect(row.querySelectorAll(".gitRef.stash")).toHaveLength(1);
  });

  it("labels no row when the detached head matches no commit (TC-418)", () => {
    // Case: TC-418
    // Given: the detached worktree points at a commit that is not in the table
    // When: the collection is loaded
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry("/tmp/wt8", "fff9999fff9999ff")]
    });

    // Then: no row in the whole table carries a detached label
    expect(document.querySelectorAll(".detachedWorktree")).toHaveLength(0);
  });

  it("keeps branch worktree labels when the detached array is empty (TC-419)", () => {
    // Case: TC-419
    // Given: the collection holds a linked branch worktree and no detached entry
    setBranchLabels({ heads: [{ name: "feature", remotes: [] }] });

    // When: the collection is loaded
    loadWithWorktrees({
      branches: { feature: { path: "/home/user/feature-wt", isMain: false } },
      detached: []
    });

    // Then: no detached label is drawn while the branch worktree label still is
    expect(document.querySelectorAll(".detachedWorktree")).toHaveLength(0);
    const headSpan = document.querySelector(".gitRef.head");
    expect(headSpan!.classList.contains("worktree")).toBe(true);
  });

  it("leaves a branch label plain when its entry is the main worktree (TC-420)", () => {
    // Case: TC-420
    // Given: the branches map marks the rendered head branch as the main worktree
    setBranchLabels({ heads: [{ name: "main", remotes: [] }] });

    // When: the collection is loaded
    loadWithWorktrees({
      branches: { main: { path: "/home/user/repo", isMain: true } },
      detached: []
    });

    // Then: the head label carries no worktree markers and keeps the plain branch icon
    const headSpan = document.querySelector(".gitRef.head");
    expect(headSpan).not.toBeNull();
    expect(headSpan!.classList.contains("worktree")).toBe(false);
    expect(headSpan!.hasAttribute("data-worktree-path")).toBe(false);
    expect(headSpan!.querySelector(".codicon.codicon-worktree-small")).toBeNull();
    expect(headSpan!.querySelector(".codicon.codicon-git-branch")).not.toBeNull();
  });

  it("escapes the detached label text when the final path component is markup (TC-421)", () => {
    // Case: TC-421
    // Given: the last component of the detached worktree path is a script tag
    // (a closing tag cannot appear here: its slash would start a new path component)
    const maliciousPath = '/tmp/<script>alert("x")&';

    // When: the collection is loaded
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry(maliciousPath, COMMIT_HASH_1)]
    });

    // Then: the label shows the markup as literal text instead of creating an element
    const label = rowFor(COMMIT_HASH_1).querySelector(".detachedWorktree");
    expect(label!.textContent).toBe('<script>alert("x")&');
    expect(label!.querySelector("script")).toBeNull();
    expect(document.querySelectorAll("script")).toHaveLength(0);

    // And: the attributes still decode back to the original path
    expect(label!.getAttribute("data-worktree-path")).toBe(maliciousPath);
    expect(label!.getAttribute("title")).toBe(`Worktree: ${maliciousPath}`);
  });

  it("builds the menu from the path of the label that was right-clicked (TC-422)", () => {
    // Case: TC-422
    // Given: two detached labels share one commit row
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry("/tmp/a", COMMIT_HASH_1), detachedEntry("/tmp/b", COMMIT_HASH_1)]
    });
    vi.clearAllMocks();
    const labels = rowFor(COMMIT_HASH_1).querySelectorAll(".detachedWorktree");
    expect(labels).toHaveLength(2);

    // When: the second label receives a contextmenu event
    labels[1].dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

    // Then: only the second label's path reaches the menu builder
    expect(buildDetachedWorktreeContextMenuItems).toHaveBeenCalledTimes(1);
    expect(buildDetachedWorktreeContextMenuItems).toHaveBeenCalledWith(TEST_REPO, "/tmp/b");
    expect(buildDetachedWorktreeContextMenuItems).not.toHaveBeenCalledWith(TEST_REPO, "/tmp/a");
  });

  it("resolves a contextmenu on the label icon to the detached label (TC-423)", () => {
    // Case: TC-423 (menu source is the label's button: 13-keyboard-accessibility-02.md S78 TC-743)
    // Given: a detached label with its worktree icon is rendered
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry("/tmp/wt8", COMMIT_HASH_1)]
    });
    vi.clearAllMocks();
    const label = rowFor(COMMIT_HASH_1).querySelector(".detachedWorktree")!;

    // When: the icon inside the label receives a bubbling contextmenu event
    rowFor(COMMIT_HASH_1)
      .querySelector(".detachedWorktree .codicon")!
      .dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

    // Then: the menu is built for the label path and anchored to the label's button
    expect(buildDetachedWorktreeContextMenuItems).toHaveBeenCalledTimes(1);
    expect(buildDetachedWorktreeContextMenuItems).toHaveBeenCalledWith(TEST_REPO, "/tmp/wt8");
    expect(showContextMenu).toHaveBeenCalledTimes(1);
    expect(vi.mocked(showContextMenu).mock.calls[0][2]).toBe(
      label.querySelector("button.gitRefButton")
    );
  });

  it("restores a path containing markup verbatim from the label attribute (TC-424)", () => {
    // Case: TC-424
    // Given: the detached worktree path contains a script tag and an ampersand
    const maliciousPath = '<script>alert("x")&</script>/wt8';
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry(maliciousPath, COMMIT_HASH_1)]
    });
    vi.clearAllMocks();

    // When: the detached label receives a contextmenu event
    rowFor(COMMIT_HASH_1)
      .querySelector(".detachedWorktree")!
      .dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

    // Then: the menu builder receives the original path string
    expect(buildDetachedWorktreeContextMenuItems).toHaveBeenCalledTimes(1);
    expect(vi.mocked(buildDetachedWorktreeContextMenuItems).mock.calls[0][1]).toBe(maliciousPath);
  });

  it("does not decode entity-like text in the path a second time (TC-425)", () => {
    // Case: TC-425
    // Given: the detached worktree path contains the literal text "&quot;"
    const entityLikePath = "/tmp/a'&quot;b";
    loadWithWorktrees({
      branches: {},
      detached: [detachedEntry(entityLikePath, COMMIT_HASH_1)]
    });
    vi.clearAllMocks();

    // When: the detached label receives a contextmenu event
    rowFor(COMMIT_HASH_1)
      .querySelector(".detachedWorktree")!
      .dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

    // Then: the menu builder receives "&quot;" as written, not a double quote
    expect(buildDetachedWorktreeContextMenuItems).toHaveBeenCalledTimes(1);
    expect(vi.mocked(buildDetachedWorktreeContextMenuItems).mock.calls[0][1]).toBe(entityLikePath);
  });

  it("routes a branch label to the ref menu instead of the worktree menu (TC-426)", () => {
    // Case: TC-426
    // Given: a plain branch label is rendered
    setBranchLabels({ heads: [{ name: "main", remotes: [] }] });
    loadWithWorktrees(EMPTY_COLLECTION);
    vi.clearAllMocks();

    // When: the branch label receives a contextmenu event
    document
      .querySelector(".gitRef.head")!
      .dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

    // Then: only the ref menu builder runs
    expect(buildDetachedWorktreeContextMenuItems).toHaveBeenCalledTimes(0);
    expect(buildRefContextMenuItems).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------ */
/* S36: bindFileViewListeners() openFile クリックハンドラ             */
/* ------------------------------------------------------------------ */

describe("openFile click handler", () => {
  let liveVscode: typeof vscode;
  let liveFileTreeHtml: typeof generateGitFileTreeHtml;

  beforeAll(async () => {
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewState();

    const utilsMod = await import("../../web/utils");
    liveVscode = utilsMod.vscode;
    vi.mocked(liveVscode.getState).mockReturnValueOnce(null);

    const fileTreeMod = await import("../../web/fileTree");
    liveFileTreeHtml = fileTreeMod.generateGitFileTreeHtml;

    await import("../../web/main");
    loadTestCommits();
  });

  beforeEach(() => {
    resetCommitState();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function expandCommitWithFiles(hash: string, fileTreeHtml: string): void {
    vi.mocked(liveFileTreeHtml).mockReturnValueOnce(fileTreeHtml);
    clickCommit(hash);
    dispatchMessage({
      command: "commitDetails",
      commitDetails: {
        ...makeCommitDetails(hash),
        fileChanges: [
          {
            oldFilePath: "src/file.ts",
            newFilePath: "src/file.ts",
            type: "M",
            additions: 1,
            deletions: 0
          }
        ]
      }
    });
    vi.clearAllMocks();
  }

  const FILE_TREE_HTML =
    '<table><tr class="gitFile M gitDiffPossible" data-oldfilepath="src%2Ffile.ts" data-newfilepath="src%2Ffile.ts" data-type="M"><td><span class="gitFileActions"><span class="gitFileAction openFile" title="Open File">icon</span></span></td></tr></table>';

  // TC-202: アイコンクリックで正しいメッセージが送信される
  it("sends openFile message with correct payload on click (TC-202)", () => {
    // Given: a commit is expanded with a file list containing an openFile icon
    expandCommitWithFiles(COMMIT_HASH_1, FILE_TREE_HTML);

    // When: the openFile icon is clicked
    const openFileElem = document.querySelector(".gitFileAction.openFile");
    expect(openFileElem).not.toBeNull();
    openFileElem!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Then: postMessage is called with the correct openFile command
    expect(liveVscode.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "openFile",
        repo: TEST_REPO,
        filePath: "src/file.ts",
        commitHash: COMMIT_HASH_1
      })
    );
  });

  // TC-203: クリック時にイベント伝播が停止される
  it("stops propagation so parent gitFile handler does not fire (TC-203)", () => {
    // Given: a commit is expanded with a file tree
    expandCommitWithFiles(COMMIT_HASH_1, FILE_TREE_HTML);

    // When: the openFile icon is clicked
    const openFileElem = document.querySelector(".gitFileAction.openFile");
    expect(openFileElem).not.toBeNull();
    openFileElem!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Then: only openFile message is sent (no viewDiff from parent .gitFile handler)
    expect(liveVscode.postMessage).toHaveBeenCalledTimes(1);
    expect(liveVscode.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ command: "openFile" })
    );
  });

  // TC-204: expandedCommit が null の場合メッセージが送信されない
  it("does not send message when expandedCommit is null (TC-204)", () => {
    // Given: a commit is expanded then collapsed (expandedCommit becomes null)
    expandCommitWithFiles(COMMIT_HASH_1, FILE_TREE_HTML);

    // Re-click the same commit to collapse (expandedCommit becomes null)
    clickCommit(COMMIT_HASH_1);
    vi.clearAllMocks();

    // Inject an openFile element manually into the DOM for testing
    const container = document.getElementById("commitTable");
    if (container) {
      const span = document.createElement("span");
      span.className = "gitFileAction openFile";
      const li = document.createElement("li");
      li.className = "gitFile M";
      li.dataset.newfilepath = "src%2Ffile.ts";
      li.appendChild(span);
      container.appendChild(li);
    }

    // When: the openFile icon is clicked (but expandedCommit is null)
    const openFileElem = document.querySelector(".gitFileAction.openFile");
    if (openFileElem) {
      openFileElem.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }

    // Then: no message is sent
    expect(liveVscode.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ command: "openFile" })
    );
  });

  // TC-205: URL エンコードされたパスが正しくデコードされる
  it("decodes URI-encoded file path in message (TC-205)", () => {
    // Given: file tree with URL-encoded path containing space
    const encodedHtml =
      '<table><tr class="gitFile M gitDiffPossible" data-oldfilepath="src%2Fmy%20file.ts" data-newfilepath="src%2Fmy%20file.ts" data-type="M"><td><span class="gitFileActions"><span class="gitFileAction openFile" title="Open File">icon</span></span></td></tr></table>';
    expandCommitWithFiles(COMMIT_HASH_1, encodedHtml);

    // When: the openFile icon is clicked
    const openFileElem = document.querySelector(".gitFileAction.openFile");
    expect(openFileElem).not.toBeNull();
    openFileElem!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Then: filePath is decoded to "src/my file.ts"
    expect(liveVscode.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "openFile",
        filePath: "src/my file.ts"
      })
    );
  });

  // TC-206: 日本語ファイル名が正しくデコードされる
  it("decodes Japanese file path correctly (TC-206)", () => {
    // Given: file tree with Japanese file name (URI-encoded)
    const japaneseEncoded = encodeURIComponent("src/テスト.ts");
    const jpHtml = `<table><tr class="gitFile M gitDiffPossible" data-oldfilepath="${japaneseEncoded}" data-newfilepath="${japaneseEncoded}" data-type="M"><td><span class="gitFileActions"><span class="gitFileAction openFile" title="Open File">icon</span></span></td></tr></table>`;
    expandCommitWithFiles(COMMIT_HASH_1, jpHtml);

    // When: the openFile icon is clicked
    const openFileElem = document.querySelector(".gitFileAction.openFile");
    expect(openFileElem).not.toBeNull();
    openFileElem!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Then: filePath is decoded to the Japanese path
    expect(liveVscode.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "openFile",
        filePath: "src/テスト.ts"
      })
    );
  });
});

/* ------------------------------------------------------------------ */
/* S37: bindFileViewListeners() file row context menu 導線            */
/* ------------------------------------------------------------------ */

describe("file row context menu handler", () => {
  let liveVscode: typeof vscode;
  let liveFileTreeHtml: typeof generateGitFileTreeHtml;
  let liveShowContextMenu: typeof showContextMenu;

  beforeAll(async () => {
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewState();

    const utilsMod = await import("../../web/utils");
    liveVscode = utilsMod.vscode;
    vi.mocked(liveVscode.getState).mockReturnValueOnce(null);

    const fileTreeMod = await import("../../web/fileTree");
    liveFileTreeHtml = fileTreeMod.generateGitFileTreeHtml;

    const ctxMenuMod = await import("../../web/contextMenu");
    liveShowContextMenu = ctxMenuMod.showContextMenu;

    await import("../../web/main");
    loadTestCommits();
  });

  beforeEach(() => {
    resetCommitState();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function expandCommitWithFiles(hash: string, fileTreeHtml: string): void {
    vi.mocked(liveFileTreeHtml).mockReturnValueOnce(fileTreeHtml);
    clickCommit(hash);
    dispatchMessage({
      command: "commitDetails",
      commitDetails: {
        ...makeCommitDetails(hash),
        fileChanges: [
          {
            oldFilePath: "src/file.ts",
            newFilePath: "src/file.ts",
            type: "M",
            additions: 1,
            deletions: 0
          }
        ]
      }
    });
    vi.clearAllMocks();
  }

  const TREE_FILE_HTML =
    '<table><tr class="gitFile M gitDiffPossible" data-oldfilepath="src%2Ffile.ts" data-newfilepath="src%2Ffile.ts" data-type="M"><td><span class="gitFileActions"><span class="gitFileAction openFile" title="Open File">icon</span></span></td></tr></table>';

  const LIST_FILE_HTML =
    '<ul class="gitFolderContents"><li class="gitFile M gitDiffPossible" data-oldfilepath="src%2Ffile.ts" data-newfilepath="src%2Ffile.ts" data-type="M"><span class="gitFileIcon">icon</span>src/file.ts<span class="gitFileActions"><span class="gitFileAction openFile" title="Open File">icon</span></span></li></ul>';

  const DELETED_FILE_HTML =
    '<table><tr class="gitFile D" data-oldfilepath="src%2Fdeleted.ts" data-newfilepath="src%2Fdeleted.ts" data-type="D"><td></td></tr></table>';

  // @see docs/testing/perspectives/web/main-test/06-file-actions-01.md
  function rightClickFirstFileRow(): Element {
    const fileRow = document.querySelector(".gitFile");
    expect(fileRow).not.toBeNull();
    fileRow!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    return fileRow!;
  }

  function shownMenuItems(): ContextMenuElement[] {
    expect(liveShowContextMenu).toHaveBeenCalledTimes(1);
    return vi.mocked(liveShowContextMenu).mock.calls[0][1];
  }

  it("shows the two-item menu on a tree row right click (TC-342)", () => {
    // Case: TC-342
    // Given: a commit is expanded with a tree view file list
    expandCommitWithFiles(COMMIT_HASH_1, TREE_FILE_HTML);

    // When: the .gitFile row is right-clicked
    const fileRow = rightClickFirstFileRow();

    // Then: showContextMenu runs once with the row as sourceElem and the fixed two items
    const items = shownMenuItems();
    expect(items).toHaveLength(2);
    expect(items[0]!.title).toBe("Open File");
    expect(items[1]!.title).toBe("Highlight File History");
    expect(vi.mocked(liveShowContextMenu).mock.calls[0][2]).toBe(fileRow);
  });

  it("shows the same two-item menu on a list row right click (TC-343)", () => {
    // Case: TC-343
    // Given: a commit is expanded with a list view file list
    expandCommitWithFiles(COMMIT_HASH_1, LIST_FILE_HTML);

    // When: the .gitFile row is right-clicked
    rightClickFirstFileRow();

    // Then: the same two-item menu is passed
    const items = shownMenuItems();
    expect(items).toHaveLength(2);
    expect(items[0]!.title).toBe("Open File");
    expect(items[1]!.title).toBe("Highlight File History");
  });

  it("prevents default and does not send viewDiff on right click (TC-344)", () => {
    // Case: TC-344
    // Given: a commit is expanded with a gitDiffPossible file row
    expandCommitWithFiles(COMMIT_HASH_1, TREE_FILE_HTML);

    // When: the .gitFile row is right-clicked
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    document.querySelector(".gitFile")!.dispatchEvent(event);

    // Then: the default action is prevented and viewDiff is not sent
    expect(event.defaultPrevented).toBe(true);
    expect(liveVscode.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ command: "viewDiff" })
    );
  });

  it("shows the two-item menu for a deleted file row without an openFile icon (TC-345)", () => {
    // Case: TC-345
    // Given: a commit is expanded with a deleted file row (type D, no .openFile icon)
    expandCommitWithFiles(COMMIT_HASH_1, DELETED_FILE_HTML);

    // When: the deleted .gitFile row is right-clicked
    rightClickFirstFileRow();

    // Then: showContextMenu is still called and D keeps both items
    const items = shownMenuItems();
    expect(items).toHaveLength(2);
    expect(items[0]!.title).toBe("Open File");
    expect(items[1]!.title).toBe("Highlight File History");
  });

  it("sends openFile payload when the Open File item is selected (TC-346)", () => {
    // Case: TC-346
    // Given: a commit is expanded and the right-click menu is shown
    expandCommitWithFiles(COMMIT_HASH_1, TREE_FILE_HTML);
    rightClickFirstFileRow();

    // When: the Open File item's onClick is invoked
    shownMenuItems()[0]!.onClick();

    // Then: the openFile payload is sent and viewDiff is not
    expect(liveVscode.postMessage).toHaveBeenCalledWith({
      command: "openFile",
      repo: TEST_REPO,
      filePath: "src/file.ts",
      commitHash: COMMIT_HASH_1
    });
    expect(liveVscode.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ command: "viewDiff" })
    );
  });

  it("does not show a context menu when expandedCommit is null (TC-347)", () => {
    // Case: TC-347
    // Given: a commit is expanded then collapsed (expandedCommit becomes null)
    expandCommitWithFiles(COMMIT_HASH_1, TREE_FILE_HTML);
    clickCommit(COMMIT_HASH_1);
    vi.clearAllMocks();
    const container = document.getElementById("commitTable")!;
    const li = document.createElement("li");
    li.className = "gitFile M";
    li.dataset.newfilepath = "src%2Ffile.ts";
    container.appendChild(li);

    // When: the injected .gitFile row is right-clicked without an expanded commit
    li.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

    // Then: showContextMenu is not called and no openFile message is sent
    expect(liveShowContextMenu).not.toHaveBeenCalled();
    expect(liveVscode.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ command: "openFile" })
    );
  });

  it("passes exactly Open File and Highlight File History with no dividers (TC-348)", () => {
    // Case: TC-348
    // Given: a valid file row with an expanded commit
    expandCommitWithFiles(COMMIT_HASH_1, TREE_FILE_HTML);

    // When: the .gitFile row is right-clicked
    rightClickFirstFileRow();

    // Then: the items are exactly the two titles in order, with no null divider
    const items = shownMenuItems();
    expect(items.map((item) => (item === null ? null : item.title))).toEqual([
      "Open File",
      "Highlight File History"
    ]);
  });
});

/* ------------------------------------------------------------------ */
/* S54: bindFileViewListeners() 履歴アイコンの描画判定配線とクリック  */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/main-test/06-file-actions-01.md
describe("highlightFileHistory icon wiring and click handler (S54)", () => {
  const STASH_HASH = "eee555eee555eee5";
  const ENCODED_BASE_PATH = "src%2Ffile.ts";
  const DECODED_BASE_PATH = "src/file.ts";
  const GLYPH_SELECTOR = ".highlightFileHistory .codicon-history";
  const ICON_ACTIONS_HTML =
    '<span class="gitFileActions"><span class="gitFileAction openFile" title="Open File">icon</span><span class="gitFileAction highlightFileHistory" title="Highlight File History"><span class="codicon codicon-history"></span></span></span>';
  const ICON_ROW_HTML = `<table><tr class="gitFile M gitDiffPossible" data-oldfilepath="${ENCODED_BASE_PATH}" data-newfilepath="${ENCODED_BASE_PATH}" data-type="M"><td>${ICON_ACTIONS_HTML}</td></tr></table>`;
  const ICON_LIST_HTML = `<ul class="gitFolderContents"><li class="gitFile M gitDiffPossible" data-oldfilepath="${ENCODED_BASE_PATH}" data-newfilepath="${ENCODED_BASE_PATH}" data-type="M"><span class="gitFileIcon">icon</span>${DECODED_BASE_PATH}${ICON_ACTIONS_HTML}</li></ul>`;
  const ICON_ROW_WITHOUT_PATH_HTML = `<table><tr class="gitFile M gitDiffPossible" data-oldfilepath="${ENCODED_BASE_PATH}" data-type="M"><td>${ICON_ACTIONS_HTML}</td></tr></table>`;
  const ICON_ROW_WITHOUT_TYPE_HTML = `<table><tr class="gitFile gitDiffPossible" data-oldfilepath="${ENCODED_BASE_PATH}" data-newfilepath="${ENCODED_BASE_PATH}"><td>${ICON_ACTIONS_HTML}</td></tr></table>`;
  const COMMITS_WITH_UNCOMMITTED: GitCommitNode[] = [
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
  const COMMITS_WITH_STASH: GitCommitNode[] = [
    ...MOCK_COMMITS,
    {
      hash: STASH_HASH,
      parentHashes: [COMMIT_HASH_3],
      author: "Dave",
      email: "dave@test.com",
      date: 1700003000,
      message: "WIP on main",
      refs: [],
      stash: { selector: "stash@{0}", baseHash: COMMIT_HASH_3, untrackedFilesHash: null }
    }
  ];
  const TYPECHANGE_FILE = {
    oldFilePath: DECODED_BASE_PATH,
    newFilePath: DECODED_BASE_PATH,
    type: "T",
    additions: 1,
    deletions: 0
  } as unknown as GitFileChange;
  const UNTYPED_FILE = {
    oldFilePath: DECODED_BASE_PATH,
    newFilePath: DECODED_BASE_PATH,
    additions: 1,
    deletions: 0
  } as unknown as GitFileChange;

  let liveVscode: typeof vscode;
  let liveFileTreeHtml: typeof generateGitFileTreeHtml;
  let liveFileListHtml: typeof generateGitFileListHtml;
  let liveRecordRecentAction: typeof recordRecentAction;

  function iconRowHtml(type: string): string {
    return `<table><tr class="gitFile ${type}" data-oldfilepath="${ENCODED_BASE_PATH}" data-newfilepath="${ENCODED_BASE_PATH}" data-type="${type}"><td>${ICON_ACTIONS_HTML}</td></tr></table>`;
  }

  function makeChange(type: GitFileChangeType): GitFileChange {
    return {
      oldFilePath: DECODED_BASE_PATH,
      newFilePath: DECODED_BASE_PATH,
      type,
      additions: 1,
      deletions: 0
    };
  }

  function loadCommits(commits: GitCommitNode[]): void {
    dispatchMessage({
      command: "loadCommits",
      commits,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: true
    });
  }

  function respondCommitDetails(hash: string): void {
    dispatchMessage({
      command: "commitDetails",
      commitDetails: { ...makeCommitDetails(hash), fileChanges: [makeChange("M")] }
    });
  }

  /** Expands `hash` with the mocked tree HTML; mock call history is kept for inspection. */
  function expandWithTreeHtml(hash: string, treeHtml: string): void {
    vi.mocked(liveFileTreeHtml).mockReturnValueOnce(treeHtml);
    clickCommit(hash);
    respondCommitDetails(hash);
  }

  function expandUncommittedWithTreeHtml(treeHtml: string): void {
    loadCommits(COMMITS_WITH_UNCOMMITTED);
    vi.mocked(liveFileTreeHtml).mockReturnValueOnce(treeHtml);
    clickUnsavedChanges();
    respondCommitDetails(UNCOMMITTED_CHANGES_HASH);
  }

  function expandStashWithTreeHtml(treeHtml: string): void {
    loadCommits(COMMITS_WITH_STASH);
    expandWithTreeHtml(STASH_HASH, treeHtml);
  }

  function treePredicateAt(index: number): FileHistoryActionPredicate {
    const calls = vi.mocked(liveFileTreeHtml).mock.calls;
    expect(calls.length).toBeGreaterThan(index);
    return calls[index][2];
  }

  function latestTreePredicate(): FileHistoryActionPredicate {
    return treePredicateAt(vi.mocked(liveFileTreeHtml).mock.calls.length - 1);
  }

  function glyph(): Element {
    const elem = document.querySelector(GLYPH_SELECTOR);
    expect(elem).not.toBeNull();
    return elem!;
  }

  function clickGlyph(): void {
    glyph().dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  function postedCommands(): string[] {
    return vi
      .mocked(liveVscode.postMessage)
      .mock.calls.map((call) => (call[0] as { command: string }).command);
  }

  function clickFileViewToggle(): void {
    const toggle = document.getElementById("fileViewToggle");
    expect(toggle).not.toBeNull();
    toggle!.click();
  }

  beforeAll(async () => {
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewState();

    const utilsMod = await import("../../web/utils");
    liveVscode = utilsMod.vscode;
    vi.mocked(liveVscode.getState).mockReturnValueOnce(null);

    const fileTreeMod = await import("../../web/fileTree");
    liveFileTreeHtml = fileTreeMod.generateGitFileTreeHtml;
    liveFileListHtml = fileTreeMod.generateGitFileListHtml;

    const ctxMenuMod = await import("../../web/contextMenu");
    liveRecordRecentAction = ctxMenuMod.recordRecentAction;

    await import("../../web/main");
    loadTestCommits();
  });

  beforeEach(() => {
    resetCommitState();
    mockFileHistoryInstance.isActive.mockReturnValue(false);
    mockFileHistoryInstance.isPending.mockReturnValue(false);
    mockFileHistoryInstance.navigate.mockReturnValue(null);
  });

  afterEach(() => {
    // Restore the tree file view so a toggled list mode does not leak into later cases.
    dispatchMessage({
      command: "loadRepos",
      repos: { [TEST_REPO]: { columnWidths: null } },
      lastActiveRepo: TEST_REPO
    });
    vi.clearAllMocks();
  });

  it("passes a tree predicate that follows the four conditions for a normal commit (TC-372)", () => {
    // Case: TC-372
    // Given: a normal commit is expanded with the commitDetails response
    expandWithTreeHtml(COMMIT_HASH_1, "<table></table>");

    // When: the third argument of the tree generator call is taken
    expect(liveFileTreeHtml).toHaveBeenCalledTimes(1);
    const predicate = treePredicateAt(0);

    // Then: it is a function that allows A / M / D / R and rejects T and a missing type
    expect(typeof predicate).toBe("function");
    for (const type of ["A", "M", "D", "R"] as const) {
      expect(predicate(makeChange(type)), type).toBe(true);
    }
    expect(predicate(TYPECHANGE_FILE)).toBe(false);
    expect(predicate(UNTYPED_FILE)).toBe(false);
  });

  it("passes a predicate that rejects rows of uncommitted changes (TC-373)", () => {
    // Case: TC-373
    // Given: the uncommitted changes row is expanded
    expandUncommittedWithTreeHtml("<table></table>");

    // When: the predicate of the latest tree generator call is evaluated for M
    // Then: false
    expect(latestTreePredicate()(makeChange("M"))).toBe(false);
  });

  it("passes a predicate that rejects rows of a stash commit (TC-374)", () => {
    // Case: TC-374
    // Given: a stash commit (stash !== null) is expanded
    expandStashWithTreeHtml("<table></table>");

    // When: the predicate of the latest tree generator call is evaluated for M
    // Then: false
    expect(latestTreePredicate()(makeChange("M"))).toBe(false);
  });

  it("passes a predicate that rejects rows in comparison view (TC-375)", () => {
    // Case: TC-375
    // Given: COMMIT_HASH_1 is expanded and compared with COMMIT_HASH_2
    expandCommit(COMMIT_HASH_1);
    clickCommit(COMMIT_HASH_2, { ctrlKey: true });
    dispatchMessage({
      command: "compareCommits",
      fileChanges: [makeChange("M")],
      fromHash: COMMIT_HASH_1,
      toHash: COMMIT_HASH_2
    });

    // When: the predicate of the comparison render is evaluated for M
    // Then: false
    expect(liveFileTreeHtml).toHaveBeenCalledTimes(1);
    expect(treePredicateAt(0)(makeChange("M"))).toBe(false);
  });

  it("passes the same predicate shape to the list generator after a toggle (TC-376)", () => {
    // Case: TC-376
    // Given: a normal commit is expanded in tree view
    expandWithTreeHtml(COMMIT_HASH_1, "<table></table>");
    vi.clearAllMocks();

    // When: the file view toggle is clicked
    clickFileViewToggle();

    // Then: the list generator runs once with a predicate that allows M and rejects T
    expect(liveFileListHtml).toHaveBeenCalledTimes(1);
    const predicate = vi.mocked(liveFileListHtml).mock.calls[0][1];
    expect(predicate(makeChange("M"))).toBe(true);
    expect(predicate(TYPECHANGE_FILE)).toBe(false);
  });

  it("delegates a glyph click to fileHistory.request without viewDiff (TC-377)", () => {
    // Case: TC-377
    // Given: a normal commit is expanded with the icon row
    expandWithTreeHtml(COMMIT_HASH_1, ICON_ROW_HTML);
    vi.clearAllMocks();

    // When: the history glyph is clicked
    clickGlyph();

    // Then: request runs once with the anchor and decoded path, and no viewDiff is posted
    expect(mockFileHistoryInstance.request).toHaveBeenCalledTimes(1);
    expect(mockFileHistoryInstance.request).toHaveBeenCalledWith(COMMIT_HASH_1, DECODED_BASE_PATH);
    expect(postedCommands()).not.toContain("viewDiff");
  });

  it("decodes a path with a space and Japanese characters (TC-378)", () => {
    // Case: TC-378
    // Given: an icon row whose data-newfilepath is encoded
    const encoded = encodeURIComponent("src/テスト ファイル.ts");
    expandWithTreeHtml(
      COMMIT_HASH_1,
      `<table><tr class="gitFile M gitDiffPossible" data-oldfilepath="${encoded}" data-newfilepath="${encoded}" data-type="M"><td>${ICON_ACTIONS_HTML}</td></tr></table>`
    );
    vi.clearAllMocks();

    // When: the history glyph is clicked
    clickGlyph();

    // Then: the second argument is the fully decoded string
    expect(mockFileHistoryInstance.request).toHaveBeenCalledTimes(1);
    expect(mockFileHistoryInstance.request).toHaveBeenCalledWith(
      COMMIT_HASH_1,
      "src/テスト ファイル.ts"
    );
  });

  it("stops propagation so the gitDiffPossible row posts nothing (TC-379)", () => {
    // Case: TC-379
    // Given: a gitDiffPossible icon row is rendered
    expandWithTreeHtml(COMMIT_HASH_1, ICON_ROW_HTML);
    vi.clearAllMocks();

    // When: the history glyph is clicked
    clickGlyph();

    // Then: postMessage is not called at all
    expect(liveVscode.postMessage).toHaveBeenCalledTimes(0);
  });

  it("rebinds the click handler after switching to list view (TC-380)", () => {
    // Case: TC-380
    // Given: a normal commit is expanded, then toggled to the list fixture
    expandWithTreeHtml(COMMIT_HASH_1, "<table></table>");
    vi.mocked(liveFileListHtml).mockReturnValueOnce(ICON_LIST_HTML);
    clickFileViewToggle();
    vi.clearAllMocks();

    // When: the history glyph of the list row is clicked
    expect(document.querySelector("li.gitFile")).not.toBeNull();
    clickGlyph();

    // Then: request runs once
    expect(mockFileHistoryInstance.request).toHaveBeenCalledTimes(1);
    expect(mockFileHistoryInstance.request).toHaveBeenCalledWith(COMMIT_HASH_1, DECODED_BASE_PATH);
  });

  it("ignores a retained glyph after the commit was collapsed (TC-381)", () => {
    // Case: TC-381
    // Given: the glyph reference is kept and the same commit is clicked to collapse it
    expandWithTreeHtml(COMMIT_HASH_1, ICON_ROW_HTML);
    const retainedGlyph = glyph();
    clickCommit(COMMIT_HASH_1);
    expect(document.getElementById("commitDetails")).toBeNull();
    vi.clearAllMocks();

    // When: the retained glyph is clicked
    retainedGlyph.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Then: no request
    expect(mockFileHistoryInstance.request).toHaveBeenCalledTimes(0);
  });

  it("ignores a history icon placed outside any file row (TC-382)", () => {
    // Case: TC-382
    // Given: a .highlightFileHistory icon in #footer is bound by the same listener pass
    const footer = document.getElementById("footer")!;
    footer.innerHTML =
      '<span class="gitFileAction highlightFileHistory"><span class="codicon codicon-history"></span></span>';
    expandWithTreeHtml(COMMIT_HASH_1, ICON_ROW_HTML);
    vi.clearAllMocks();

    // When: the footer glyph is clicked
    footer.querySelector(GLYPH_SELECTOR)!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Then: no request
    expect(mockFileHistoryInstance.request).toHaveBeenCalledTimes(0);
    footer.innerHTML = "";
  });

  it("ignores a row without data-newfilepath (TC-383)", () => {
    // Case: TC-383
    // Given: an icon row that lacks data-newfilepath
    expandWithTreeHtml(COMMIT_HASH_1, ICON_ROW_WITHOUT_PATH_HTML);
    vi.clearAllMocks();

    // When: the history glyph is clicked
    clickGlyph();

    // Then: no request
    expect(mockFileHistoryInstance.request).toHaveBeenCalledTimes(0);
  });

  it("ignores a glyph click while uncommitted changes are expanded (TC-384)", () => {
    // Case: TC-384
    // Given: the uncommitted changes row is expanded with the icon fixture
    expandUncommittedWithTreeHtml(ICON_ROW_HTML);
    vi.clearAllMocks();

    // When: the history glyph is clicked
    clickGlyph();

    // Then: no request
    expect(mockFileHistoryInstance.request).toHaveBeenCalledTimes(0);
  });

  it("ignores a glyph click while a stash commit is expanded (TC-385)", () => {
    // Case: TC-385
    // Given: a stash commit is expanded with the icon fixture
    expandStashWithTreeHtml(ICON_ROW_HTML);
    vi.clearAllMocks();

    // When: the history glyph is clicked
    clickGlyph();

    // Then: no request
    expect(mockFileHistoryInstance.request).toHaveBeenCalledTimes(0);
  });

  it("ignores a glyph click on typechange and untyped rows (TC-386)", () => {
    // Case: TC-386
    // Given: an icon row with data-type="T" and one without data-type
    for (const html of [iconRowHtml("T"), ICON_ROW_WITHOUT_TYPE_HTML]) {
      resetCommitState();
      expandWithTreeHtml(COMMIT_HASH_1, html);
      vi.clearAllMocks();

      // When: the history glyph is clicked
      clickGlyph();

      // Then: no request for that row
      expect(mockFileHistoryInstance.request, html).toHaveBeenCalledTimes(0);
    }
  });

  it("rejects a glyph click while a commit comparison is pending (TC-387)", () => {
    // Case: TC-387
    // Given: the icon row is expanded and COMMIT_HASH_2 is ctrl+clicked without a response
    expandWithTreeHtml(COMMIT_HASH_1, ICON_ROW_HTML);
    vi.clearAllMocks();
    clickCommit(COMMIT_HASH_2, { ctrlKey: true });

    // When: the still-rendered history glyph is clicked
    clickGlyph();

    // Then: no request, no viewDiff, and exactly one compareCommits was sent
    expect(mockFileHistoryInstance.request).toHaveBeenCalledTimes(0);
    expect(postedCommands()).not.toContain("viewDiff");
    expect(postedCommands().filter((command) => command === "compareCommits")).toHaveLength(1);
  });

  it("rejects a glyph click while an uncommitted comparison is pending (TC-388)", () => {
    // Case: TC-388
    // Given: a list with uncommitted changes, COMMIT_HASH_1 expanded, then meta+click on the row
    loadCommits(COMMITS_WITH_UNCOMMITTED);
    expandWithTreeHtml(COMMIT_HASH_1, ICON_ROW_HTML);
    vi.clearAllMocks();
    clickUnsavedChanges({ metaKey: true });

    // When: the still-rendered history glyph is clicked
    clickGlyph();

    // Then: no request and no viewDiff
    expect(mockFileHistoryInstance.request).toHaveBeenCalledTimes(0);
    expect(postedCommands()).not.toContain("viewDiff");
  });

  it("passes a rejecting predicate once the comparison response arrives (TC-389)", () => {
    // Case: TC-389
    // Given: the pending comparison of TC-387
    expandWithTreeHtml(COMMIT_HASH_1, ICON_ROW_HTML);
    clickCommit(COMMIT_HASH_2, { ctrlKey: true });
    vi.clearAllMocks();

    // When: the compareCommits response is dispatched
    dispatchMessage({
      command: "compareCommits",
      fileChanges: [makeChange("M")],
      fromHash: COMMIT_HASH_1,
      toHash: COMMIT_HASH_2
    });

    // Then: the latest tree generator call received a predicate that rejects M
    expect(liveFileTreeHtml).toHaveBeenCalledTimes(1);
    expect(latestTreePredicate()(makeChange("M"))).toBe(false);
  });

  it("requests again after the comparison is cancelled (TC-390)", () => {
    // Case: TC-390
    // Given: the comparison of TC-389 is shown, then cancelled and the origin's details re-rendered
    expandWithTreeHtml(COMMIT_HASH_1, ICON_ROW_HTML);
    clickCommit(COMMIT_HASH_2, { ctrlKey: true });
    dispatchMessage({
      command: "compareCommits",
      fileChanges: [makeChange("M")],
      fromHash: COMMIT_HASH_1,
      toHash: COMMIT_HASH_2
    });
    clickCommit(COMMIT_HASH_2, { ctrlKey: true });
    vi.mocked(liveFileTreeHtml).mockReturnValueOnce(ICON_ROW_HTML);
    respondCommitDetails(COMMIT_HASH_1);
    vi.clearAllMocks();

    // When: the history glyph is clicked
    clickGlyph();

    // Then: request runs once again
    expect(mockFileHistoryInstance.request).toHaveBeenCalledTimes(1);
    expect(mockFileHistoryInstance.request).toHaveBeenCalledWith(COMMIT_HASH_1, DECODED_BASE_PATH);
  });

  it("requests for A, D and R rows (TC-391)", () => {
    // Case: TC-391
    // Given: icon rows of the other allowed change types
    for (const type of ["A", "D", "R"]) {
      resetCommitState();
      expandWithTreeHtml(COMMIT_HASH_1, iconRowHtml(type));
      vi.clearAllMocks();

      // When: the history glyph is clicked
      clickGlyph();

      // Then: exactly one request whose first argument is the expanded commit hash
      expect(mockFileHistoryInstance.request, type).toHaveBeenCalledTimes(1);
      expect(mockFileHistoryInstance.request.mock.calls[0][0], type).toBe(COMMIT_HASH_1);
    }
  });

  it("delegates while file history is active and while it is pending (TC-392)", () => {
    // Case: TC-392
    // Given: the icon row is expanded
    expandWithTreeHtml(COMMIT_HASH_1, ICON_ROW_HTML);
    vi.clearAllMocks();

    // When: the glyph is clicked while the mode is active
    mockFileHistoryInstance.isActive.mockReturnValue(true);
    clickGlyph();

    // Then: one request with the same arguments
    expect(mockFileHistoryInstance.request).toHaveBeenCalledTimes(1);
    expect(mockFileHistoryInstance.request).toHaveBeenCalledWith(COMMIT_HASH_1, DECODED_BASE_PATH);

    // When: the glyph is clicked while a request is pending
    mockFileHistoryInstance.request.mockClear();
    mockFileHistoryInstance.isActive.mockReturnValue(false);
    mockFileHistoryInstance.isPending.mockReturnValue(true);
    clickGlyph();

    // Then: one request with the same arguments
    expect(mockFileHistoryInstance.request).toHaveBeenCalledTimes(1);
    expect(mockFileHistoryInstance.request).toHaveBeenCalledWith(COMMIT_HASH_1, DECODED_BASE_PATH);
  });

  it("records no recent action for a glyph click (TC-393)", () => {
    // Case: TC-393
    // Given: the icon row is expanded
    expandWithTreeHtml(COMMIT_HASH_1, ICON_ROW_HTML);
    vi.clearAllMocks();

    // When: the history glyph is clicked
    clickGlyph();

    // Then: the request is delegated but no recent action is recorded
    expect(mockFileHistoryInstance.request).toHaveBeenCalledTimes(1);
    expect(liveRecordRecentAction).toHaveBeenCalledTimes(0);
  });
});

/* ------------------------------------------------------------------ */
/* S40: ロード要求の保留と再送 (Feature 041)                          */
/* ------------------------------------------------------------------ */

describe("request queue / refresh contention (S40)", () => {
  let liveVscode: typeof vscode;

  function postedCommands(filter: string): Record<string, unknown>[] {
    return vi
      .mocked(liveVscode.postMessage)
      .mock.calls.map((c) => c[0] as Record<string, unknown>)
      .filter((m) => m.command === filter);
  }

  beforeAll(async () => {
    vi.resetModules();
    dropdownCallCount = 0;
    capturedBranchCallback = null;
    capturedAuthorCallback = null;
    setupTestDOM();
    setupViewState();

    const utilsMod = await import("../../web/utils");
    liveVscode = utilsMod.vscode;
    vi.mocked(liveVscode.getState).mockReturnValueOnce(null);

    await import("../../web/main");
    loadTestCommits();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Case: TC-221
  it("re-sends loadBranches after current loadBranches completes when refresh fires in-flight (TC-221)", () => {
    // Given: refresh button triggers loadBranches; response not yet dispatched
    vi.clearAllMocks();
    const refreshBtn = document.getElementById("refreshBtn")!;
    refreshBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(postedCommands("loadBranches")).toHaveLength(1);

    // When: a second refresh fires while loadBranches is still in flight
    refreshBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Then: no extra loadBranches sent yet (queued)
    expect(postedCommands("loadBranches")).toHaveLength(1);

    // When: current loadBranches response arrives
    dispatchMessage({
      command: "loadBranches",
      branches: ["main"],
      head: "main",
      hard: true,
      isRepo: true
    });

    // Then: queued loadBranches has been sent (now total of 2)
    expect(postedCommands("loadBranches")).toHaveLength(2);

    // Cleanup: complete pending loadCommits and the second loadBranches/loadCommits cascade
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: true
    });
    dispatchMessage({
      command: "loadBranches",
      branches: ["main"],
      head: "main",
      hard: true,
      isRepo: true
    });
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: true
    });
  });

  // Case: TC-222
  it("re-sends loadCommits with latest branches state when filter changes in-flight (TC-222)", () => {
    // Given: a branch filter change is in flight
    vi.clearAllMocks();
    capturedBranchCallback!(["a"]);
    const firstSent = postedCommands("loadCommits");
    expect(firstSent).toHaveLength(1);
    expect(firstSent[0].branches).toEqual(["a"]);

    // When: filter changes again before the current loadCommits response arrives
    capturedBranchCallback!(["main"]);

    // Then: no additional loadCommits has been sent yet (queued)
    expect(postedCommands("loadCommits")).toHaveLength(1);

    // When: the in-flight loadCommits response arrives
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: true
    });

    // Then: the queued loadCommits has been sent with the latest branches state
    const sent = postedCommands("loadCommits");
    expect(sent).toHaveLength(2);
    expect(sent[1].branches).toEqual(["main"]);

    // Cleanup
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: true
    });
  });

  // Case: TC-223
  it("preserves auto Load More callback through queue so isLoadingMoreCommits resets (TC-223)", () => {
    // Given: auto Load More is enabled and there are more commits available
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: true,
      hard: true
    });
    vi.clearAllMocks();

    // Pre-trigger a loadCommits that is still in flight, so auto Load More will queue
    capturedBranchCallback!(["main"]);
    expect(postedCommands("loadCommits")).toHaveLength(1);

    // When: auto Load More fires while the current loadCommits is in flight
    const container = document.getElementById("scrollContainer")!;
    Object.defineProperty(container, "scrollTop", {
      value: 475,
      writable: true,
      configurable: true
    });
    Object.defineProperty(container, "clientHeight", { value: 500, configurable: true });
    Object.defineProperty(container, "scrollHeight", { value: 1000, configurable: true });
    container.dispatchEvent(new Event("scroll", { bubbles: true }));

    // Then: auto load is recorded as in-flight; no additional message yet (queued)
    expect(postedCommands("loadCommits")).toHaveLength(1);

    // When: current loadCommits response arrives → queued one flushes
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: true,
      hard: true
    });
    expect(postedCommands("loadCommits")).toHaveLength(2);

    // When: the queued loadCommits (Load More) response arrives → completion callback runs
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: true,
      hard: true
    });
    vi.clearAllMocks();

    // Then: isLoadingMoreCommits has been reset; another scroll re-fires auto Load More
    container.dispatchEvent(new Event("scroll", { bubbles: true }));
    expect(postedCommands("loadCommits")).toHaveLength(1);

    // Cleanup
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: true
    });
  });

  // Case: TC-224
  it("ORs the hard flag and aggregates callbacks when multiple requests queue (TC-224)", async () => {
    // Given: a loadCommits is in flight; we have private access via module symbols not available,
    // so exercise this via the public dropdown path which uses hard=true, then queue an additional
    // request via re-firing the dropdown (also hard=true) — both callbacks should be aggregated.
    vi.clearAllMocks();
    capturedBranchCallback!(["a"]);
    capturedBranchCallback!(["b"]);
    capturedBranchCallback!(["c"]);
    expect(postedCommands("loadCommits")).toHaveLength(1);

    // When: in-flight response arrives → queued request is flushed with latest state
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: true
    });

    // Then: exactly one queued request is sent (collapsed, latest state), with hard=true
    const sent = postedCommands("loadCommits");
    expect(sent).toHaveLength(2);
    expect(sent[1].branches).toEqual(["c"]);
    expect(sent[1].hard).toBe(true);

    // Cleanup
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: true
    });
  });

  // Case: TC-225
  it("uses the latest filter state for the resend payload, dropping intermediate states (TC-225)", () => {
    // Given: a loadCommits is in flight after filter ["a"]
    vi.clearAllMocks();
    capturedBranchCallback!(["a"]);
    const initial = postedCommands("loadCommits");
    expect(initial).toHaveLength(1);
    expect(initial[0].branches).toEqual(["a"]);

    // When: multiple subsequent filter changes happen while in flight
    capturedBranchCallback!(["b"]);
    capturedBranchCallback!(["c"]);
    capturedBranchCallback!(["d"]);
    expect(postedCommands("loadCommits")).toHaveLength(1);

    // When: in-flight response arrives → resend uses final state ["d"]
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: true
    });
    const sent = postedCommands("loadCommits");
    expect(sent).toHaveLength(2);
    expect(sent[1].branches).toEqual(["d"]);

    // Cleanup
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: true
    });
  });

  // Case: TC-226
  it("flush is a no-op when there is no queued request (TC-226)", () => {
    // Given: no queued request — completing a normal loadCommits should not send extras
    vi.clearAllMocks();
    capturedBranchCallback!(["x"]);
    expect(postedCommands("loadCommits")).toHaveLength(1);

    // When: response arrives without any queued request behind it
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: true
    });

    // Then: no additional loadCommits messages were sent by the flush path
    expect(postedCommands("loadCommits")).toHaveLength(1);
  });

  // Case: TC-227
  it("re-entrant request from inside a completion callback bypasses queue and sends immediately (TC-227)", () => {
    // Given: an in-flight loadCommits whose completion will, indirectly, trigger another request
    // The branchDropdown handler is the public re-entry point used in real flows. Confirm that
    // calling it again at the exact moment we deliver the response does not get queued (because
    // loadCommitsCallback is cleared *before* the user callback runs) and instead is sent immediately.
    vi.clearAllMocks();
    capturedBranchCallback!(["a"]);
    expect(postedCommands("loadCommits")).toHaveLength(1);

    // Deliver the response (callback is internally nulled before user callback runs)
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: true
    });
    expect(postedCommands("loadCommits")).toHaveLength(1);

    // When: another filter change immediately after — should fire as a fresh request, not queue
    capturedBranchCallback!(["b"]);
    expect(postedCommands("loadCommits")).toHaveLength(2);

    // Cleanup
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: true
    });
  });
});

/* ------------------------------------------------------------------ */
/* S47: checkout completion force-renders the active branch            */
/* ------------------------------------------------------------------ */

describe("checkout completion active branch refresh (S47)", () => {
  const CHECKOUT_BRANCHES = ["main", "feature/checkout"];
  const CHECKOUT_COMMITS: GitCommitNode[] = [
    {
      hash: COMMIT_HASH_1,
      parentHashes: [],
      author: "Alice",
      email: "alice@test.com",
      date: 1700000000,
      message: "Shared branch tip",
      refs: CHECKOUT_BRANCHES.map((name) => ({ hash: COMMIT_HASH_1, name, type: "head" })),
      stash: null
    },
    {
      hash: COMMIT_HASH_2,
      parentHashes: [],
      author: "Bob",
      email: "bob@test.com",
      date: 1699999000,
      message: "Shared ancestor",
      refs: [],
      stash: null
    }
  ];

  let liveVscode: typeof vscode;

  function postedCommands(filter: string): Record<string, unknown>[] {
    return vi
      .mocked(liveVscode.postMessage)
      .mock.calls.map((call) => call[0] as Record<string, unknown>)
      .filter((message) => message.command === filter);
  }

  function dispatchCheckoutBranches(hard: boolean): void {
    dispatchMessage({
      command: "loadBranches",
      branches: CHECKOUT_BRANCHES,
      head: "feature/checkout",
      hard,
      isRepo: true
    });
  }

  function dispatchCheckoutCommits(
    hard: boolean,
    commits: GitCommitNode[] = CHECKOUT_COMMITS
  ): void {
    dispatchMessage({
      command: "loadCommits",
      commits,
      head: commits[0]?.hash ?? null,
      moreCommitsAvailable: false,
      hard
    });
  }

  function completeCheckoutRefresh(commits: GitCommitNode[] = CHECKOUT_COMMITS): void {
    dispatchMessage({ command: "checkoutBranch", kind: "completed", status: null });
    const branchRequest = postedCommands("loadBranches")[0];
    dispatchCheckoutBranches(branchRequest.hard as boolean);
    const commitRequest = postedCommands("loadCommits")[0];
    dispatchCheckoutCommits(commitRequest.hard as boolean, commits);
  }

  function activeBranchName(): string | undefined {
    return document.querySelector<HTMLElement>(".gitRef.head.active")?.dataset.name;
  }

  function makeActiveMarkerStale(): void {
    document
      .querySelector<HTMLElement>('.gitRef.head[data-name="feature/checkout"]')!
      .classList.remove("active");
    document.querySelector<HTMLElement>('.gitRef.head[data-name="main"]')!.classList.add("active");
    expect(activeBranchName()).toBe("main");
  }

  beforeEach(async () => {
    vi.resetModules();
    dropdownCallCount = 0;
    capturedBranchCallback = null;
    capturedAuthorCallback = null;
    setupTestDOM();
    setupViewState();

    const utilsMod = await import("../../web/utils");
    liveVscode = utilsMod.vscode;
    vi.mocked(liveVscode.getState).mockReturnValueOnce(null);

    const branchLabelsMod = await import("../../web/branchLabels");
    vi.mocked(branchLabelsMod.getBranchLabels).mockImplementation((refs) => ({
      heads: refs
        .filter((ref) => ref.type === "head")
        .map((ref) => ({ name: ref.name, remotes: [] })),
      remotes: [],
      tags: []
    }));

    await import("../../web/main");
    dispatchCheckoutBranches(false);
    dispatchCheckoutCommits(true);
    expect(activeBranchName()).toBe("feature/checkout");
    makeActiveMarkerStale();
    vi.clearAllMocks();
  });

  // Case: TC-270
  it("force-renders the active branch without showing a loading screen (TC-270)", () => {
    // Given: Git state already reflects the checkout, but the DOM still marks the old branch active
    // When: checkout completion requests a refresh
    dispatchMessage({ command: "checkoutBranch", kind: "completed", status: null });
    const branchRequest = postedCommands("loadBranches")[0];

    // Then: the current graph remains visible while the forced response is pending
    expect(document.getElementById("loadingHeader")).toBeNull();
    expect(document.querySelector(".commit")).not.toBeNull();

    // When: identical Git data is returned
    dispatchCheckoutBranches(branchRequest.hard as boolean);
    const commitRequest = postedCommands("loadCommits")[0];
    dispatchCheckoutCommits(commitRequest.hard as boolean);

    // Then: the graph is forcibly rendered without a manual reload or hard-refresh loading state
    expect(activeBranchName()).toBe("feature/checkout");
    expect(branchRequest.hard).toBe(true);
    expect(commitRequest.hard).toBe(true);
    expect(document.getElementById("loadingHeader")).toBeNull();
  });

  // Case: TC-271
  it("preserves forceRender while a soft branch load is in flight (TC-271)", () => {
    // Given: a passive soft refresh is waiting for its loadBranches response
    dispatchMessage({ command: "pull", status: null });
    expect(postedCommands("loadBranches")).toHaveLength(1);

    // When: checkout completes during the in-flight load and the first response arrives
    dispatchMessage({ command: "checkoutBranch", kind: "completed", status: null });
    expect(postedCommands("loadBranches")).toHaveLength(1);
    dispatchCheckoutBranches(false);

    // Then: the queued checkout refresh is sent as hard=true
    const branchRequests = postedCommands("loadBranches");
    expect(branchRequests).toHaveLength(2);
    const queuedBranchRequest = branchRequests[1];
    dispatchCheckoutBranches(queuedBranchRequest.hard as boolean);

    // Complete the original soft commit load, then the queued checkout commit load
    dispatchCheckoutCommits(false);
    const commitRequests = postedCommands("loadCommits");
    expect(commitRequests).toHaveLength(2);
    const queuedCommitRequest = commitRequests[1];
    dispatchCheckoutCommits(queuedCommitRequest.hard as boolean);

    expect(activeBranchName()).toBe("feature/checkout");
    expect(queuedBranchRequest.hard).toBe(true);
    expect(queuedCommitRequest.hard).toBe(true);
  });

  // Case: TC-272
  it("preserves an expanded commit that remains in the checkout graph (TC-272)", () => {
    // Given: a commit that is present in the checkout result is expanded
    expandCommit(COMMIT_HASH_1);
    expect(document.getElementById("commitDetails")).not.toBeNull();

    // When: checkout force-renders the same commit set
    completeCheckoutRefresh();

    // Then: the details remain expanded without a loading screen
    expect(document.getElementById("commitDetails")).not.toBeNull();
    expect(
      document.querySelector(`[data-hash="${COMMIT_HASH_1}"].commitDetailsOpen`)
    ).not.toBeNull();
    expect(document.getElementById("loadingHeader")).toBeNull();
  });

  // Case: TC-273
  it("closes an expanded commit that is absent from the checkout graph (TC-273)", () => {
    // Given: a commit is expanded before checkout
    expandCommit(COMMIT_HASH_2);
    expect(document.getElementById("commitDetails")).not.toBeNull();

    // When: checkout returns a graph that no longer contains the expanded commit
    completeCheckoutRefresh([CHECKOUT_COMMITS[0]]);

    // Then: the stale details are closed
    expect(document.getElementById("commitDetails")).toBeNull();
  });

  // Case: TC-274
  it("preserves comparison details when both commits remain in the checkout graph (TC-274)", () => {
    // Given: both commits in the current graph are being compared
    expandCommitWithCompare(COMMIT_HASH_1, COMMIT_HASH_2);
    expect(document.querySelector(`[data-hash="${COMMIT_HASH_2}"].compareTarget`)).not.toBeNull();

    // When: checkout force-renders a graph containing both commits
    completeCheckoutRefresh();

    // Then: the comparison remains expanded
    expect(document.getElementById("commitDetails")).not.toBeNull();
    expect(document.querySelector(`[data-hash="${COMMIT_HASH_2}"].compareTarget`)).not.toBeNull();
  });

  // Case: TC-275
  it.each([
    ["base", [CHECKOUT_COMMITS[1]]],
    ["target", [CHECKOUT_COMMITS[0]]]
  ])(
    "closes comparison details when the %s commit is absent from the checkout graph (TC-275)",
    (_missingCommit, remainingCommits) => {
      // Given: two commits are being compared
      expandCommitWithCompare(COMMIT_HASH_1, COMMIT_HASH_2);
      expect(document.getElementById("commitDetails")).not.toBeNull();

      // When: checkout returns a graph containing only the other commit
      completeCheckoutRefresh(remainingCommits);

      // Then: the entire comparison is closed instead of showing stale diff details
      expect(document.getElementById("commitDetails")).toBeNull();
    }
  );

  // Case: TC-276
  it("keeps the existing hard-refresh loading and expanded-state reset behavior (TC-276)", () => {
    // Given: a commit is expanded
    expandCommit(COMMIT_HASH_1);
    expect(document.getElementById("commitDetails")).not.toBeNull();

    // When: the manual hard refresh button is clicked
    document
      .getElementById("refreshBtn")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Then: hard refresh closes the details and shows loading immediately
    expect(document.getElementById("commitDetails")).toBeNull();
    expect(document.getElementById("loadingHeader")).not.toBeNull();
    expect(postedCommands("loadBranches")[0].hard).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* S43: loadAvatar raw email matching                                 */
/* ------------------------------------------------------------------ */

describe("loadAvatar raw email matching (S43)", () => {
  let liveVscode: typeof vscode;

  beforeAll(async () => {
    const utilsMod = await import("../../web/utils");
    liveVscode = utilsMod.vscode;
  });

  beforeEach(() => {
    resetCommitState();
  });

  function addAvatarElem(email: string): HTMLElement {
    const elem = document.createElement("span");
    elem.className = "avatar";
    elem.dataset.email = email;
    document.body.appendChild(elem);
    return elem;
  }

  it("applies the avatar and persists state on a plain email match (TC-241)", () => {
    // Case: TC-241
    // Given: an .avatar element with a plain data-email
    const elem = addAvatarElem("a@x.com");

    // When: a fetchAvatar message arrives for the same email
    dispatchMessage({
      command: "fetchAvatar",
      email: "a@x.com",
      image: "data:image/png;base64,AAA"
    });

    // Then: the element renders the avatar image and state is persisted with the avatar
    expect(elem.innerHTML).toBe('<img class="avatarImg" src="data:image/png;base64,AAA">');
    expect(liveVscode.setState).toHaveBeenCalled();
    const savedState = vi.mocked(liveVscode.setState).mock.calls.at(-1)![0] as WebViewState;
    expect(savedState.avatars["a@x.com"]).toBe("data:image/png;base64,AAA");
  });

  it("matches an email containing HTML special characters (TC-242)", () => {
    // Case: TC-242
    // Given: an .avatar element whose raw data-email contains HTML special characters
    const elem = addAvatarElem("a<b@x.com");

    // When: a fetchAvatar message arrives for the same raw email
    dispatchMessage({ command: "fetchAvatar", email: "a<b@x.com", image: "img" });

    // Then: raw email comparison matches and the element is updated (old escapeHtml compare missed it)
    expect(elem.innerHTML).toBe('<img class="avatarImg" src="img">');
  });

  it("persists state but updates no element when no data-email matches (TC-243)", () => {
    // Case: TC-243
    // Given: an .avatar element for a different email
    const elem = addAvatarElem("other@x.com");

    // When: a fetchAvatar message arrives for an unmatched email
    dispatchMessage({ command: "fetchAvatar", email: "nomatch@x.com", image: "img" });

    // Then: no element is updated but the avatar is still recorded in persisted state
    expect(elem.innerHTML).toBe("");
    const savedState = vi.mocked(liveVscode.setState).mock.calls.at(-1)![0] as WebViewState;
    expect(savedState.avatars["nomatch@x.com"]).toBe("img");
  });

  it("escapes the image value inside the src attribute (TC-244)", () => {
    // Case: TC-244
    // Given: an .avatar element and an image value containing a double quote
    const elem = addAvatarElem("q@x.com");

    // When: a fetchAvatar message arrives with a quote in the image value
    dispatchMessage({ command: "fetchAvatar", email: "q@x.com", image: 'a"b' });

    // Then: the src attribute is escaped and not broken; the img element parses cleanly
    const img = elem.querySelector("img.avatarImg");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe('a"b');
    expect(elem.innerHTML).toContain("&quot;");
  });

  it("updates every element that shares the same data-email (TC-245)", () => {
    // Case: TC-245
    // Given: two .avatar elements with the same data-email
    const first = addAvatarElem("dup@x.com");
    const second = addAvatarElem("dup@x.com");

    // When: a fetchAvatar message arrives for that email
    dispatchMessage({ command: "fetchAvatar", email: "dup@x.com", image: "img" });

    // Then: both matching elements are updated
    expect(first.innerHTML).toBe('<img class="avatarImg" src="img">');
    expect(second.innerHTML).toBe('<img class="avatarImg" src="img">');
  });
});

/* ------------------------------------------------------------------ */
/* S44: gitRef contextmenu/checkout raw dataset.name reads            */
/* ------------------------------------------------------------------ */

describe("gitRef contextmenu and checkout raw dataset.name (S44)", () => {
  beforeEach(() => {
    resetCommitState();
  });

  function renderHead(name: string, remotes: string[], branches?: Record<string, unknown>): void {
    vi.mocked(getBranchLabels).mockReturnValue({
      heads: [{ name, remotes }],
      remotes: [],
      tags: []
    });
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: true,
      worktrees: { branches: branches ?? {}, detached: [] }
    });
    vi.clearAllMocks();
  }

  afterEach(() => {
    vi.mocked(getBranchLabels).mockReturnValue({ heads: [], remotes: [], tags: [] });
  });

  it("passes the raw ref name to buildRefContextMenuItems for a plain name (TC-246)", () => {
    // Case: TC-246
    // Given: a rendered head ref named "main"
    renderHead("main", []);

    // When: the gitRef receives a contextmenu event
    const gitRef = document.querySelector(".gitRef.head");
    gitRef!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

    // Then: buildRefContextMenuItems receives "main" as the raw refName argument
    expect(buildRefContextMenuItems).toHaveBeenCalledWith(
      expect.anything(),
      "main",
      expect.any(HTMLElement),
      false,
      expect.anything(),
      undefined,
      null
    );
  });

  it("passes a special-character ref name raw without double-decoding (TC-247)", () => {
    // Case: TC-247
    // Given: a rendered head ref whose name contains an ampersand
    renderHead("feat&x", []);

    // When: the gitRef receives a contextmenu event
    const gitRef = document.querySelector(".gitRef.head");
    gitRef!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

    // Then: the raw "feat&x" is passed (no unescapeHtml double-decode)
    expect(buildRefContextMenuItems).toHaveBeenCalledWith(
      expect.anything(),
      "feat&x",
      expect.any(HTMLElement),
      false,
      expect.anything(),
      undefined,
      null
    );
  });

  it("looks up the worktree by the raw ref-name key (TC-248)", () => {
    // Case: TC-248
    // Given: a head ref "feat&x" with a matching worktree entry under the raw key
    renderHead("feat&x", [], { "feat&x": { path: "/wt", isMain: false } });

    // When: the gitRef receives a contextmenu event
    const gitRef = document.querySelector(".gitRef.head");
    gitRef!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

    // Then: worktreeInfo is built from the raw-key lookup
    expect(buildRefContextMenuItems).toHaveBeenCalledWith(
      expect.anything(),
      "feat&x",
      expect.any(HTMLElement),
      false,
      expect.anything(),
      undefined,
      { path: "/wt", isMainWorktree: false }
    );
  });

  it("checks out a remote-combined ref using the raw target name (TC-249)", () => {
    // Case: TC-249
    // Given: a head "main" with an "origin" remote-combined label rendered
    renderHead("main", ["origin"]);

    // When: the remote-combined label is double-clicked
    const remoteLabel = document.querySelector(".gitRefHeadRemote");
    expect(remoteLabel).not.toBeNull();
    remoteLabel!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

    // Then: checkoutBranchAction is called with the raw "origin/main" name and remote flag true
    expect(checkoutBranchAction).toHaveBeenCalledWith(
      TEST_REPO,
      expect.any(HTMLElement),
      "origin/main",
      true
    );
  });

  it("checks out a local ref using the raw source name (TC-250)", () => {
    // Case: TC-250
    // Given: a rendered local head ref "main"
    renderHead("main", []);

    // When: the gitRef is double-clicked
    const gitRef = document.querySelector(".gitRef.head");
    gitRef!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

    // Then: checkoutBranchAction is called with the raw source name (no remote flag)
    expect(checkoutBranchAction).toHaveBeenCalledWith(TEST_REPO, expect.any(HTMLElement), "main");
  });

  it("leaves worktreeInfo null when the raw key is not in the worktree map (TC-251)", () => {
    // Case: TC-251
    // Given: a head ref "main" with an empty worktree map
    renderHead("main", [], {});

    // When: the gitRef receives a contextmenu event
    const gitRef = document.querySelector(".gitRef.head");
    gitRef!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

    // Then: worktreeInfo is null (lookup miss, no exception)
    expect(buildRefContextMenuItems).toHaveBeenCalledWith(
      expect.anything(),
      "main",
      expect.any(HTMLElement),
      false,
      expect.anything(),
      undefined,
      null
    );
  });
});

/* ------------------------------------------------------------------ */
/* S45: restore-time loading branch resends commitDetails             */
/* ------------------------------------------------------------------ */

describe("expanded commit restore loading resend (S45)", () => {
  let liveVscode: typeof vscode;

  beforeAll(async () => {
    const utilsMod = await import("../../web/utils");
    liveVscode = utilsMod.vscode;
  });

  beforeEach(() => {
    resetCommitState();
  });

  function reRenderCommits(commits: GitCommitNode[], head: string): void {
    dispatchMessage({
      command: "loadCommits",
      commits,
      head,
      moreCommitsAvailable: false,
      hard: true
    });
  }

  it("resends commitDetails with hasParents/isStash from the looked-up commit (TC-252)", () => {
    // Case: TC-252
    // Given: a commit with parents is clicked (loading state) but no details response arrives
    clickCommit(COMMIT_HASH_2);
    vi.clearAllMocks();

    // When: the table is re-rendered while the expanded commit is still loading
    reRenderCommits(MOCK_COMMITS, COMMIT_HASH_1);

    // Then: commitDetails is re-sent with hasParents true and isStash false
    expect(liveVscode.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "commitDetails",
        repo: TEST_REPO,
        commitHash: COMMIT_HASH_2,
        hasParents: true,
        isStash: false
      })
    );
  });

  it("resends commitDetails with isStash true for a stash commit (TC-254)", () => {
    // Case: TC-254
    // Given: a stash commit is loaded and clicked into the loading state
    const stashHash = "eee555eee555eee5";
    const stashCommits: GitCommitNode[] = [
      {
        hash: stashHash,
        parentHashes: [COMMIT_HASH_1],
        author: "Alice",
        email: "alice@test.com",
        date: 1700003000,
        message: "WIP stash",
        refs: [],
        stash: { selector: "stash@{0}", baseHash: COMMIT_HASH_1, untrackedFilesHash: null }
      },
      ...MOCK_COMMITS
    ];
    reRenderCommits(stashCommits, COMMIT_HASH_1);
    clickCommit(stashHash);
    vi.clearAllMocks();

    // When: the table is re-rendered while the stash commit is still loading
    reRenderCommits(stashCommits, COMMIT_HASH_1);

    // Then: the resent commitDetails marks isStash true
    expect(liveVscode.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "commitDetails",
        commitHash: stashHash,
        isStash: true
      })
    );
  });

  it("does not resend commitDetails when details are already cached (TC-255)", () => {
    // Case: TC-255
    // Given: a commit is expanded and its details/fileTree are cached
    expandCommit(COMMIT_HASH_2);

    // When: the table is re-rendered
    reRenderCommits(MOCK_COMMITS, COMMIT_HASH_1);

    // Then: no commitDetails request is re-sent (the cached-details branch is taken)
    const commitDetailsCalls = vi
      .mocked(liveVscode.postMessage)
      .mock.calls.filter((call) => (call[0] as { command?: string }).command === "commitDetails");
    expect(commitDetailsCalls).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* S49: branch cleanup panel の lifecycle 接続・filter・scroll         */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/main-test/09-branch-cleanup-01.md
describe("Branch cleanup panel wiring (S49)", () => {
  let liveVscode: typeof vscode;
  let freshShowDeleteBranchDialog: ReturnType<typeof vi.fn>;
  let freshGetBranchLabels: ReturnType<typeof vi.mocked<typeof getBranchLabels>>;
  let panelConstructorCallsBefore = 0;
  let panelConstructorCallsAfter = 0;

  beforeAll(async () => {
    vi.resetModules();
    dropdownCallCount = 0;
    capturedRepoCallback = null;
    capturedPanelActions.ref = null;
    mockPanelOpen.value = false;
    setupTestDOM();
    setupViewState();

    const utilsMod = await import("../../web/utils");
    liveVscode = utilsMod.vscode;
    vi.mocked(liveVscode.getState).mockReturnValueOnce(null);

    const refMenuMod = await import("../../web/refMenu");
    freshShowDeleteBranchDialog = vi.mocked(
      refMenuMod.showDeleteBranchDialog
    ) as unknown as ReturnType<typeof vi.fn>;

    const branchLabelsMod = await import("../../web/branchLabels");
    freshGetBranchLabels = vi.mocked(branchLabelsMod.getBranchLabels);

    const panelMod = await import("../../web/branchCleanupPanel");
    const panelConstructor = vi.mocked(panelMod.BranchCleanupPanel);
    panelConstructorCallsBefore = panelConstructor.mock.calls.length;
    await import("../../web/main");
    panelConstructorCallsAfter = panelConstructor.mock.calls.length;
    loadTestCommits();
  });

  beforeEach(() => {
    mockPanelOpen.value = false;
    freshGetBranchLabels.mockImplementation(() => ({ heads: [], remotes: [], tags: [] }));
    resetCommitState();
  });

  function postedMessages(command: string): Record<string, unknown>[] {
    return vi
      .mocked(liveVscode.postMessage)
      .mock.calls.map((call) => call[0] as Record<string, unknown>)
      .filter((message) => message.command === command);
  }

  function renderHeadLabelsFromRefs(): void {
    freshGetBranchLabels.mockImplementation((refs: GitRef[]) => ({
      heads: refs
        .filter((ref) => ref.type === "head")
        .map((ref) => ({ name: ref.name, remotes: [] })),
      remotes: [],
      tags: []
    }));
  }

  function showBranchAndLoad(branchName: string, labelNames: string[]): void {
    renderHeadLabelsFromRefs();
    capturedPanelActions.ref!.showBranch(branchName);
    dispatchMessage({
      command: "loadBranches",
      branches: ["main", branchName],
      head: "main",
      hard: true,
      isRepo: true
    });
    dispatchMessage({
      command: "loadCommits",
      commits: [
        {
          hash: COMMIT_HASH_1,
          parentHashes: [],
          author: "Alice",
          email: "alice@test.com",
          date: 1700000000,
          message: "First commit",
          refs: labelNames.map((name) => ({ name, type: "head" })),
          stash: null
        }
      ],
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: true
    });
  }

  it("creates one panel instance and wires the toolbar toggle (TC-305)", () => {
    // Case: TC-305
    // Given: the module bootstrap constructed the view once
    // Then: exactly one BranchCleanupPanel was constructed during that bootstrap
    expect(panelConstructorCallsAfter - panelConstructorCallsBefore).toBe(1);

    // When: the toolbar button is clicked
    const buttonElem = document.getElementById("branchCleanupBtn")!;
    buttonElem.click();

    // Then: panel.toggle runs once with the current repository
    expect(mockBranchCleanupPanelInstance.toggle).toHaveBeenCalledTimes(1);
    expect(mockBranchCleanupPanelInstance.toggle).toHaveBeenCalledWith(TEST_REPO);

    // Then: the button mirrors the panel's open state after each click
    expect(buttonElem.classList.contains("active")).toBe(false);
    mockPanelOpen.value = true;
    buttonElem.click();
    expect(mockBranchCleanupPanelInstance.toggle).toHaveBeenCalledTimes(2);
    expect(buttonElem.classList.contains("active")).toBe(true);
  });

  it("adds a panel refresh to an open-panel refresh without touching existing requests (TC-306)", () => {
    // Case: TC-306
    // Given: the panel reports being open
    mockPanelOpen.value = true;

    // When: a soft refresh runs (successful fetch response path)
    dispatchMessage({ command: "fetch", status: null });

    // Then: panel.refresh runs once with the current repo and the existing loadBranches
    // request is still sent with its unchanged payload
    expect(mockBranchCleanupPanelInstance.refresh).toHaveBeenCalledTimes(1);
    expect(mockBranchCleanupPanelInstance.refresh).toHaveBeenCalledWith(TEST_REPO);
    const branchRequests = postedMessages("loadBranches");
    expect(branchRequests).toHaveLength(1);
    expect(branchRequests[0]).toEqual({
      command: "loadBranches",
      repo: TEST_REPO,
      showRemoteBranches: true,
      hard: false
    });
  });

  it("sends no diagnostic message on a refresh while the panel is closed (TC-307)", () => {
    // Case: TC-307
    // Given: the panel reports being closed
    mockPanelOpen.value = false;

    // When: a soft refresh runs
    dispatchMessage({ command: "fetch", status: null });

    // Then: the panel is not refreshed and no loadBranchCleanup message is sent
    expect(mockBranchCleanupPanelInstance.refresh).not.toHaveBeenCalled();
    expect(postedMessages("loadBranchCleanup")).toHaveLength(0);
  });

  it("notifies the panel when the repository dropdown switches repos (TC-308)", () => {
    // Case: TC-308
    // Given: the repository dropdown callback captured at bootstrap
    // When: the dropdown switches from the current repo to another one
    capturedRepoCallback!("/other/repo");

    // Then: panel.selectRepository runs once with the new repository
    expect(mockBranchCleanupPanelInstance.selectRepository).toHaveBeenCalledTimes(1);
    expect(mockBranchCleanupPanelInstance.selectRepository).toHaveBeenCalledWith("/other/repo");

    // Restore the original repository for the following tests
    capturedRepoCallback!(TEST_REPO);
    loadTestCommits();
  });

  it("never notifies the panel on same-repository refreshes (TC-309)", () => {
    // Case: TC-309
    // Given: the repository stays the same
    // When: two soft refreshes run
    dispatchMessage({ command: "fetch", status: null });
    dispatchMessage({ command: "fetch", status: null });

    // Then: panel.selectRepository is never called (selection preserved)
    expect(mockBranchCleanupPanelInstance.selectRepository).not.toHaveBeenCalled();
  });

  it("filters the graph to the single branch with one hard reload (TC-310)", () => {
    // Case: TC-310
    // Given: the graph action callback injected into the panel
    // When: showBranch is invoked and the branch list response arrives
    capturedPanelActions.ref!.showBranch("feature/x");
    dispatchMessage({
      command: "loadBranches",
      branches: ["main", "feature/x"],
      head: "main",
      hard: true,
      isRepo: true
    });

    // Then: the dropdown selection is replaced by the single branch and exactly one
    // hard loadCommits request carries that filter
    expect(mockBranchDropdownInstance.setOptions).toHaveBeenCalledWith(expect.anything(), [
      "feature/x"
    ]);
    const commitRequests = postedMessages("loadCommits");
    expect(commitRequests).toHaveLength(1);
    expect(commitRequests[0].branches).toEqual(["feature/x"]);
    expect(commitRequests[0].hard).toBe(true);
  });

  it("scrolls to the exact dataset-matched label after rendering (TC-311)", () => {
    // Case: TC-311
    // Given: a rendered head label whose dataset name matches the requested branch
    showBranchAndLoad("feature/x", ["feature/x"]);

    // Then: the commit row owning the label is scrolled to (flash marks the scroll target)
    const row = document.querySelector(`.commit[data-hash="${COMMIT_HASH_1}"]`)!;
    expect(row.classList.contains("flash")).toBe(true);
    expect(document.querySelectorAll(".flash")).toHaveLength(1);
  });

  it("finds special branch names by dataset equality, never via a selector (TC-312)", () => {
    // Case: TC-312
    // Given: a head label named a;b
    showBranchAndLoad("a;b", ["a;b"]);

    // Then: the label is found by dataset comparison and the row is scrolled to
    expect(
      document.querySelector(`.commit[data-hash="${COMMIT_HASH_1}"]`)!.classList.contains("flash")
    ).toBe(true);

    // Given: a head label named x<img> after a reset
    resetCommitState();
    showBranchAndLoad("x<img>", ["x<img>"]);

    // Then: the HTML-like name also resolves to exactly one scroll target
    expect(document.querySelectorAll(".flash")).toHaveLength(1);
  });

  it("scrolls nowhere when no label matches the branch (TC-313)", () => {
    // Case: TC-313
    // Given: a render without any matching head label
    showBranchAndLoad("feature/x", []);

    // Then: no commit row is flashed and no exception surfaced
    expect(document.querySelector(".flash")).toBeNull();
  });

  it("rejects prefix matches of the branch name (TC-314)", () => {
    // Case: TC-314
    // Given: a render whose only label is feature/x-suffix
    showBranchAndLoad("feature/x", ["feature/x-suffix"]);

    // Then: the prefix match never scrolls
    expect(document.querySelector(".flash")).toBeNull();
  });

  it("forwards the delete callback to the exported dialog unchanged (TC-315)", () => {
    // Case: TC-315
    // Given: the delete action callback injected into the panel
    // When: it fires with a repo, branch, and known remotes
    capturedPanelActions.ref!.showDeleteDialog("/repo", "feature/x", ["origin"]);

    // Then: the exported showDeleteBranchDialog runs once with the exact arguments
    expect(freshShowDeleteBranchDialog).toHaveBeenCalledTimes(1);
    expect(freshShowDeleteBranchDialog).toHaveBeenCalledWith("/repo", "feature/x", ["origin"]);
  });
});

/* ------------------------------------------------------------------ */
/* S50 / S63 / S66: file history wiring, CDV file rows, key movement   */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/main-test/10-file-history-01.md
describe("File history integration (S50 / S63 / S66)", () => {
  const STASH_HASH = "eee555eee555eee5";
  const OTHER_REPO = "/test/other-repo";
  const FILE_HISTORY_NOTE_TEXT =
    "This file's change is not part of the diff against the first parent.";
  const HISTORICAL_PATH = "src/a.txt";
  const MATCH_TREE_HTML =
    '<table><tr class="gitFile M gitDiffPossible" data-oldfilepath="src%2Fa.txt" data-newfilepath="src%2Fa.txt" data-type="M"><td>a</td></tr></table>';
  const MATCH_NESTED_TREE_HTML =
    '<ul class="gitFolderContents"><li><span class="gitFolder" data-folderpath="src"><span class="gitFolderIcon"></span><span class="gitFolderName">src</span></span><ul class="gitFolderContents"><li class="gitFile M gitDiffPossible" data-oldfilepath="src%2Fa.txt" data-newfilepath="src%2Fa.txt" data-type="M">a.txt</li></ul></li></ul>';
  const OTHER_NESTED_TREE_HTML =
    '<ul class="gitFolderContents"><li><span class="gitFolder" data-folderpath="src"><span class="gitFolderIcon"></span><span class="gitFolderName">src</span></span><ul class="gitFolderContents"><li class="gitFile M gitDiffPossible" data-oldfilepath="src%2Fb.txt" data-newfilepath="src%2Fb.txt" data-type="M">b.txt</li></ul></li></ul>';
  const MATCH_LIST_HTML =
    '<ul class="gitFolderContents"><li class="gitFile M gitDiffPossible" data-oldfilepath="src%2Fa.txt" data-newfilepath="src%2Fa.txt" data-type="M">a</li></ul>';
  const OTHER_LIST_HTML =
    '<ul class="gitFolderContents"><li class="gitFile M gitDiffPossible" data-oldfilepath="src%2Fb.txt" data-newfilepath="src%2Fb.txt" data-type="M">b</li></ul>';
  const FILE_HISTORY_CALLBACK_NAMES = [
    "getCommits",
    "getCommitId",
    "getCurrentRepo",
    "getExpandedCommit",
    "getScrollTop",
    "setScrollTop",
    "hideCommitDetails",
    "restoreExpandedCommit",
    "scrollToCommit",
    "closeFindWidget",
    "setGraphHighlight"
  ];
  const EMPTY_FILE_TREE: GitFolder = {
    type: "folder",
    name: "",
    folderPath: "",
    contents: {},
    open: true
  };
  const COMMITS_WITH_STASH: GitCommitNode[] = [
    ...MOCK_COMMITS,
    {
      hash: STASH_HASH,
      parentHashes: [COMMIT_HASH_3],
      author: "Dave",
      email: "dave@test.com",
      date: 1700003000,
      message: "WIP on main",
      refs: [],
      stash: { selector: "stash@{0}", baseHash: COMMIT_HASH_3, untrackedFilesHash: null }
    }
  ];

  let liveVscode: typeof vscode;
  let liveFileTreeHtml: typeof generateGitFileTreeHtml;
  let liveFileListHtml: typeof generateGitFileListHtml;
  let liveBuildFileContextMenuItems: ReturnType<typeof vi.fn>;
  let constructorCallsDuringImport = 0;

  function callbacks(): Record<string, (...args: never[]) => unknown> {
    expect(capturedFileHistoryCallbacks.ref).not.toBeNull();
    return capturedFileHistoryCallbacks.ref!;
  }

  function postedCommands(): string[] {
    return vi
      .mocked(liveVscode.postMessage)
      .mock.calls.map((call) => (call[0] as { command: string }).command);
  }

  function postMessageOrderOf(command: string): number {
    const index = postedCommands().indexOf(command);
    expect(index).toBeGreaterThanOrEqual(0);
    return vi.mocked(liveVscode.postMessage).mock.invocationCallOrder[index];
  }

  function loadCommitsWithStash(): void {
    dispatchMessage({
      command: "loadCommits",
      commits: COMMITS_WITH_STASH,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: true
    });
  }

  function expandCommitWithTree(hash: string, treeHtml: string): void {
    vi.mocked(liveFileTreeHtml).mockReturnValueOnce(treeHtml);
    clickCommit(hash);
    dispatchMessage({ command: "commitDetails", commitDetails: makeCommitDetails(hash) });
  }

  function currentFileRows(): NodeListOf<Element> {
    return document.querySelectorAll(".gitFile.fileHistoryCurrent");
  }

  function notes(): NodeListOf<Element> {
    return document.querySelectorAll(".fileHistoryNote");
  }

  function resetFileHistoryMocks(): void {
    mockFileHistoryInstance.isActive.mockReturnValue(false);
    mockFileHistoryInstance.isPending.mockReturnValue(false);
    mockFileHistoryInstance.navigate.mockReturnValue(null);
    mockFileHistoryInstance.getHistoricalPathFor.mockReturnValue(null);
  }

  beforeAll(async () => {
    vi.resetModules();
    dropdownCallCount = 0;
    capturedRepoCallback = null;
    capturedBranchCallback = null;
    setupTestDOM();
    setupViewState();

    const utilsMod = await import("../../web/utils");
    liveVscode = utilsMod.vscode;
    vi.mocked(liveVscode.getState).mockReturnValueOnce(null);

    const fileTreeMod = await import("../../web/fileTree");
    liveFileTreeHtml = fileTreeMod.generateGitFileTreeHtml;
    liveFileListHtml = fileTreeMod.generateGitFileListHtml;

    // The real fileMenu builder is wrapped so the arguments passed by main.ts can be observed.
    vi.doMock("../../web/fileMenu", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../../web/fileMenu")>();
      return { ...actual, buildFileContextMenuItems: vi.fn(actual.buildFileContextMenuItems) };
    });
    const fileMenuMod = await import("../../web/fileMenu");
    liveBuildFileContextMenuItems = vi.mocked(
      fileMenuMod.buildFileContextMenuItems
    ) as unknown as ReturnType<typeof vi.fn>;

    // The module's listener cleanup disposes the earlier views, so document events reach only
    // the view this import constructs.
    const constructorCallsBefore = mockFileHistoryConstructor.mock.calls.length;
    await import("../../web/main");
    constructorCallsDuringImport =
      mockFileHistoryConstructor.mock.calls.length - constructorCallsBefore;
    loadTestCommits();
  });

  beforeEach(() => {
    resetCommitState();
    resetFileHistoryMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.doUnmock("../../web/fileMenu");
  });

  describe("controller wiring (S50)", () => {
    it("constructs the controller once with the eleven callbacks (TC-316)", () => {
      // Case: TC-316
      // Given: the module bootstrap constructed the view once
      // Then: exactly one controller with the eleven named callbacks
      expect(constructorCallsDuringImport).toBe(1);
      const wired = callbacks();
      expect(Object.keys(wired).sort()).toEqual([...FILE_HISTORY_CALLBACK_NAMES].sort());
      for (const name of FILE_HISTORY_CALLBACK_NAMES) {
        expect(typeof wired[name], name).toBe("function");
      }
    });

    it("resolves getCommitId to the lookup index or null (TC-317)", () => {
      // Case: TC-317
      // Given: the loaded commits
      const wired = callbacks();

      // When: a known and an unknown hash are resolved
      const known = (wired.getCommitId as (hash: string) => number | null)(COMMIT_HASH_2);
      const unknown = (wired.getCommitId as (hash: string) => number | null)("zzz");

      // Then: a numeric index for the known hash, null (not undefined) for the unknown one
      expect(known).toBe(1);
      expect(typeof known).toBe("number");
      expect(unknown).toBeNull();
    });

    it("forwards setGraphHighlight to the graph and re-renders it (TC-318)", () => {
      // Case: TC-318
      // Given: a highlight object
      const highlight = { matchHashes: new Set([COMMIT_HASH_1]), currentHash: COMMIT_HASH_1 };

      // When: the wired callback runs
      (callbacks().setGraphHighlight as (h: GraphFileHistoryHighlight) => void)(highlight);

      // Then: graph.setFileHistoryHighlight receives the same object once, then graph.render runs once
      expect(mockGraphHighlight.setFileHistoryHighlight).toHaveBeenCalledTimes(1);
      expect(mockGraphHighlight.setFileHistoryHighlight).toHaveBeenCalledWith(highlight);
      expect(mockGraphHighlight.render).toHaveBeenCalledTimes(1);
      expect(mockGraphHighlight.setFileHistoryHighlight.mock.invocationCallOrder[0]).toBeLessThan(
        mockGraphHighlight.render.mock.invocationCallOrder[0]
      );
    });

    it("calls onCommitsRendered once after the table is re-rendered (TC-319)", () => {
      // Case: TC-319
      // Given: a loadCommits response
      // When: render() completes
      let rowsAtHook = 0;
      mockFileHistoryInstance.onCommitsRendered.mockImplementationOnce(() => {
        rowsAtHook = document.querySelectorAll(".commit").length;
      });
      dispatchMessage({
        command: "loadCommits",
        commits: MOCK_COMMITS,
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });

      // Then: the hook runs once and sees the regenerated rows
      expect(mockFileHistoryInstance.onCommitsRendered).toHaveBeenCalledTimes(1);
      expect(rowsAtHook).toBe(MOCK_COMMITS.length);
    });

    it("does not call onCommitsRendered for the loading render (TC-320)", () => {
      // Case: TC-320
      // Given: a branch dropdown change that only triggers renderShowLoading()
      // When: the callback fires
      capturedBranchCallback!([]);

      // Then: the hook is not called
      expect(mockFileHistoryInstance.onCommitsRendered).toHaveBeenCalledTimes(0);
      loadTestCommits();
    });

    it("calls onRepositoryChanged before the loadBranches request on dropdown change (TC-321)", () => {
      // Case: TC-321
      // Given: the repo dropdown callback
      // When: the current repo is re-selected
      capturedRepoCallback!(TEST_REPO);

      // Then: the hook runs once, before the loadBranches request is posted
      expect(mockFileHistoryInstance.onRepositoryChanged).toHaveBeenCalledTimes(1);
      expect(mockFileHistoryInstance.onRepositoryChanged.mock.invocationCallOrder[0]).toBeLessThan(
        postMessageOrderOf("loadBranches")
      );
      loadTestCommits();
    });

    it("calls onRepositoryChanged once from selectRepo (TC-322)", () => {
      // Case: TC-322
      // Given: a selectRepo message for the registered repo
      // When: it is handled
      dispatchMessage({ command: "selectRepo", repo: TEST_REPO });

      // Then: the hook runs once
      expect(mockFileHistoryInstance.onRepositoryChanged).toHaveBeenCalledTimes(1);
      loadTestCommits();
    });

    it("calls onRepositoryChanged when loadRepos replaces the current repo (TC-349)", () => {
      // Case: TC-349
      // Given: a repo set that no longer contains the current repo
      // When: loadRepos delivers it
      dispatchMessage({
        command: "loadRepos",
        repos: { [OTHER_REPO]: { columnWidths: null } },
        lastActiveRepo: null
      });

      // Then: the hook runs once, before the hard refresh posts its loadBranches request
      expect(mockFileHistoryInstance.onRepositoryChanged).toHaveBeenCalledTimes(1);
      expect(mockFileHistoryInstance.onRepositoryChanged.mock.invocationCallOrder[0]).toBeLessThan(
        postMessageOrderOf("loadBranches")
      );

      dispatchMessage({
        command: "loadRepos",
        repos: { [TEST_REPO]: { columnWidths: null } },
        lastActiveRepo: TEST_REPO
      });
      loadTestCommits();
    });

    it("exits the mode before showing the find widget (TC-323)", () => {
      // Case: TC-323
      // Given: an active file history mode
      mockFileHistoryInstance.isActive.mockReturnValue(true);

      // When: the search button is clicked
      document
        .getElementById("searchBtn")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));

      // Then: exit(true) runs once before findWidget.show(true)
      expect(mockFileHistoryInstance.exit).toHaveBeenCalledTimes(1);
      expect(mockFileHistoryInstance.exit).toHaveBeenCalledWith(true);
      expect(mockFindWidgetInstance.show).toHaveBeenCalledWith(true);
      expect(mockFileHistoryInstance.exit.mock.invocationCallOrder[0]).toBeLessThan(
        mockFindWidgetInstance.show.mock.invocationCallOrder[0]
      );
    });

    it("exits a pending request when the find keybinding is pressed (TC-324)", () => {
      // Case: TC-324
      // Given: only a pending request
      mockFileHistoryInstance.isPending.mockReturnValue(true);

      // When: the find keybinding is pressed on the row target
      const target = document.querySelector<HTMLElement>('#commitTable tr[tabindex="0"]')!;
      target.focus();
      target.dispatchEvent(
        new KeyboardEvent("keydown", { key: "f", ctrlKey: true, bubbles: true })
      );

      // Then: exit(true) once and show(true) once
      expect(mockFileHistoryInstance.exit).toHaveBeenCalledTimes(1);
      expect(mockFileHistoryInstance.exit).toHaveBeenCalledWith(true);
      expect(mockFindWidgetInstance.show).toHaveBeenCalledTimes(1);
      expect(mockFindWidgetInstance.show).toHaveBeenCalledWith(true);
    });

    it("opens the find widget without exit outside the mode (TC-325)", () => {
      // Case: TC-325
      // Given: neither active nor pending
      // When: the search button is clicked
      document
        .getElementById("searchBtn")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));

      // Then: no exit and one show(true)
      expect(mockFileHistoryInstance.exit).toHaveBeenCalledTimes(0);
      expect(mockFindWidgetInstance.show).toHaveBeenCalledTimes(1);
      expect(mockFindWidgetInstance.show).toHaveBeenCalledWith(true);
    });

    it("calls handleCommitRowClick before the commitDetails request (TC-326)", () => {
      // Case: TC-326
      // Given: a rendered commit row
      // When: it is clicked
      clickCommit(COMMIT_HASH_2);

      // Then: the hook runs once with the hash, before the commitDetails request is posted
      expect(mockFileHistoryInstance.handleCommitRowClick).toHaveBeenCalledTimes(1);
      expect(mockFileHistoryInstance.handleCommitRowClick).toHaveBeenCalledWith(COMMIT_HASH_2);
      expect(mockFileHistoryInstance.handleCommitRowClick.mock.invocationCallOrder[0]).toBeLessThan(
        postMessageOrderOf("commitDetails")
      );
    });

    it("does not call handleCommitRowClick for the uncommitted changes row (TC-327)", () => {
      // Case: TC-327
      // Given: an uncommitted changes row
      dispatchMessage({
        command: "loadCommits",
        commits: [
          {
            hash: UNCOMMITTED_CHANGES_HASH,
            parentHashes: [COMMIT_HASH_1],
            author: "*",
            email: "",
            date: 1700004000,
            message: "Uncommitted Changes",
            refs: [],
            stash: null
          },
          ...MOCK_COMMITS
        ],
        head: COMMIT_HASH_1,
        moreCommitsAvailable: false,
        hard: true
      });
      vi.clearAllMocks();

      // When: the uncommitted row is clicked
      clickUnsavedChanges();

      // Then: the hook is not called while the existing request still goes out
      expect(mockFileHistoryInstance.handleCommitRowClick).toHaveBeenCalledTimes(0);
      expect(liveVscode.postMessage).toHaveBeenCalled();
    });

    it("passes the expanded commit, repo and a non-stash context to the file menu (TC-328)", () => {
      // Case: TC-328
      // Given: a normal commit expanded with a file row
      expandCommitWithTree(COMMIT_HASH_1, MATCH_TREE_HTML);
      vi.clearAllMocks();

      // When: the file row is right-clicked
      document
        .querySelector(".gitFile")!
        .dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

      // Then: the builder is called once with expandedCommit, currentRepo and the context shape
      expect(liveBuildFileContextMenuItems).toHaveBeenCalledTimes(1);
      const args = liveBuildFileContextMenuItems.mock.calls[0];
      expect(args[1]).toBe(callbacks().getExpandedCommit());
      expect(args[2]).toBe(TEST_REPO);
      expect(args[3].isStash).toBe(false);
      expect(typeof args[3].onHighlightFileHistory).toBe("function");
    });

    it("flags a stash commit in the file menu context (TC-329)", () => {
      // Case: TC-329
      // Given: a stash commit expanded with a file row
      loadCommitsWithStash();
      expandCommitWithTree(STASH_HASH, MATCH_TREE_HTML);
      vi.clearAllMocks();

      // When: the file row is right-clicked
      document
        .querySelector(".gitFile")!
        .dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

      // Then: isStash is true
      expect(liveBuildFileContextMenuItems).toHaveBeenCalledTimes(1);
      expect(liveBuildFileContextMenuItems.mock.calls[0][3].isStash).toBe(true);
    });

    it("connects onHighlightFileHistory to controller.request (TC-330)", () => {
      // Case: TC-330
      // Given: the context passed for a normal commit
      expandCommitWithTree(COMMIT_HASH_1, MATCH_TREE_HTML);
      vi.clearAllMocks();
      document
        .querySelector(".gitFile")!
        .dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
      const context = liveBuildFileContextMenuItems.mock.calls[0][3];

      // When: the callback is invoked
      context.onHighlightFileHistory("h", "p");

      // Then: controller.request("h", "p") runs once
      expect(mockFileHistoryInstance.request).toHaveBeenCalledTimes(1);
      expect(mockFileHistoryInstance.request).toHaveBeenCalledWith("h", "p");
    });

    it("delegates loadFileHistory to handleResponse with the same object (TC-331)", () => {
      // Case: TC-331
      // Given: a fileHistory response message
      const response = {
        command: "fileHistory",
        repo: TEST_REPO,
        requestId: 1,
        anchorHash: COMMIT_HASH_1,
        filePath: HISTORICAL_PATH,
        entries: []
      };

      // When: it is dispatched through the message handler
      dispatchMessage(response);

      // Then: handleResponse receives the identical object once
      expect(mockFileHistoryInstance.handleResponse).toHaveBeenCalledTimes(1);
      expect(mockFileHistoryInstance.handleResponse.mock.calls[0][0]).toBe(response);
    });
  });

  describe("restoreExpandedCommit() (S63)", () => {
    function restore(snapshot: FileHistoryExpandedSnapshot): boolean {
      return (callbacks().restoreExpandedCommit as (s: FileHistoryExpandedSnapshot) => boolean)(
        snapshot
      );
    }

    function expanded(): ExpandedCommit | null {
      return (callbacks().getExpandedCommit as () => ExpandedCommit | null)();
    }

    it("re-resolves the row and shows the details from the snapshot (TC-551)", () => {
      // Case: TC-551
      // Given: a rendered row for the snapshot hash
      const details = makeCommitDetails(COMMIT_HASH_1);

      // When: the snapshot is restored
      const result = restore({
        hash: COMMIT_HASH_1,
        compareWithHash: null,
        commitDetails: details,
        fileTree: EMPTY_FILE_TREE
      });

      // Then: true, details after the row, srcElem is the current DOM row, values from the snapshot
      expect(result).toBe(true);
      const row = document.querySelector<HTMLElement>(`.commit[data-hash="${COMMIT_HASH_1}"]`)!;
      expect(row.nextElementSibling!.id).toBe("commitDetails");
      const state = expanded()!;
      expect(state.srcElem).toBe(row);
      expect(state.commitDetails).toBe(details);
      expect(state.fileTree).toBe(EMPTY_FILE_TREE);
      expect(state.loading).toBe(false);
    });

    it("re-resolves the compare row and marks it (TC-552)", () => {
      // Case: TC-552
      // Given: rows for both the snapshot hash and the compare hash
      // When: the snapshot is restored
      const result = restore({
        hash: COMMIT_HASH_1,
        compareWithHash: COMMIT_HASH_2,
        commitDetails: makeCommitDetails(COMMIT_HASH_1),
        fileTree: EMPTY_FILE_TREE
      });

      // Then: the compare row gets compareTarget and is the compareWithSrcElem
      expect(result).toBe(true);
      const compareRow = document.querySelector<HTMLElement>(
        `.commit[data-hash="${COMMIT_HASH_2}"]`
      )!;
      expect(compareRow.classList.contains("compareTarget")).toBe(true);
      expect(expanded()!.compareWithSrcElem).toBe(compareRow);
      expect(expanded()!.compareWithHash).toBe(COMMIT_HASH_2);
    });

    it("restores the details alone when the compare row is unloaded (TC-553)", () => {
      // Case: TC-553
      // Given: a compare hash that is not rendered
      // When: the snapshot is restored
      const result = restore({
        hash: COMMIT_HASH_1,
        compareWithHash: "0000000000000000",
        commitDetails: makeCommitDetails(COMMIT_HASH_1),
        fileTree: EMPTY_FILE_TREE
      });

      // Then: true, compareWithSrcElem null, no compareTarget row, details shown
      expect(result).toBe(true);
      expect(expanded()!.compareWithSrcElem).toBeNull();
      expect(document.querySelectorAll(".compareTarget")).toHaveLength(0);
      expect(document.getElementById("commitDetails")).not.toBeNull();
    });

    it("returns false and leaves the DOM alone when the row is missing (TC-554)", () => {
      // Case: TC-554
      // Given: a snapshot hash that is not rendered
      const tableBefore = document.getElementById("commitTable")!.innerHTML;
      const expandedBefore = expanded();

      // When: the snapshot is restored
      const result = restore({
        hash: "0000000000000000",
        compareWithHash: null,
        commitDetails: makeCommitDetails("0000000000000000"),
        fileTree: EMPTY_FILE_TREE
      });

      // Then: false, no details element, expandedCommit and table unchanged
      expect(result).toBe(false);
      expect(document.getElementById("commitDetails")).toBeNull();
      expect(expanded()).toBe(expandedBefore);
      expect(document.getElementById("commitTable")!.innerHTML).toBe(tableBefore);
    });
  });

  describe("applyFileHistoryToFileRows() (S63)", () => {
    function startInTreeView(): void {
      dispatchMessage({
        command: "loadRepos",
        repos: { [TEST_REPO]: { columnWidths: null, fileViewType: "tree" } },
        lastActiveRepo: TEST_REPO
      });
    }

    function clickFileViewToggle(): void {
      const toggle = document.getElementById("fileViewToggle");
      expect(toggle).not.toBeNull();
      toggle!.click();
    }

    function expectSingleNoteBeforeRootList(): void {
      const noteList = notes();
      expect(noteList).toHaveLength(1);
      const note = noteList[0];
      expect(note.textContent).toBe(FILE_HISTORY_NOTE_TEXT);
      const panel = document.getElementById("commitDetailsFiles");
      expect(panel).not.toBeNull();
      expect(note.parentElement).toBe(panel);
      expect(panel!.firstElementChild).toBe(note);
      const rootList = note.nextElementSibling;
      expect(rootList).not.toBeNull();
      expect(rootList!.matches("ul.gitFolderContents")).toBe(true);
      expect(currentFileRows()).toHaveLength(0);
    }

    it("highlights the file row whose decoded path matches the historical path (TC-555)", () => {
      // Case: TC-555
      // Given: active mode and a historical path that matches the encoded data-newfilepath
      mockFileHistoryInstance.isActive.mockReturnValue(true);
      mockFileHistoryInstance.getHistoricalPathFor.mockReturnValue(HISTORICAL_PATH);

      // When: the commit details view opens
      expandCommitWithTree(COMMIT_HASH_1, MATCH_TREE_HTML);

      // Then: the matching row gets fileHistoryCurrent and no note is inserted
      expect(mockFileHistoryInstance.getHistoricalPathFor).toHaveBeenCalledWith(COMMIT_HASH_1);
      const row = document.querySelector('.gitFile[data-newfilepath="src%2Fa.txt"]')!;
      expect(row.classList.contains("fileHistoryCurrent")).toBe(true);
      expect(currentFileRows()).toHaveLength(1);
      expect(notes()).toHaveLength(0);
    });

    it("inserts the first parent diff note before the root list when no row matches (TC-556)", () => {
      // Case: TC-556
      // Given: active mode and a tree view without the historical path
      startInTreeView();
      mockFileHistoryInstance.isActive.mockReturnValue(true);
      mockFileHistoryInstance.getHistoricalPathFor.mockReturnValue(HISTORICAL_PATH);

      // When: the commit details view opens
      expandCommitWithTree(COMMIT_HASH_1, OTHER_NESTED_TREE_HTML);

      // Then: exactly one note with the fixed text leads the file panel, right before the root
      // list, and no row is highlighted
      expectSingleNoteBeforeRootList();
    });

    it("re-applies the highlight after switching the view in both directions (TC-557)", () => {
      // Case: TC-557
      // Given: active mode and a tree view whose row matches the historical path
      startInTreeView();
      mockFileHistoryInstance.isActive.mockReturnValue(true);
      mockFileHistoryInstance.getHistoricalPathFor.mockReturnValue(HISTORICAL_PATH);
      expandCommitWithTree(COMMIT_HASH_1, MATCH_NESTED_TREE_HTML);
      expect(currentFileRows()).toHaveLength(1);
      const treeRow = currentFileRows()[0];

      // When: the view is switched from the tree to the list
      vi.mocked(liveFileListHtml).mockReturnValueOnce(MATCH_LIST_HTML);
      clickFileViewToggle();

      // Then: the regenerated list row is the only highlighted row and there is no note
      expect(liveFileListHtml).toHaveBeenCalledTimes(1);
      expect(currentFileRows()).toHaveLength(1);
      const listRow = currentFileRows()[0];
      expect(listRow).not.toBe(treeRow);
      expect(listRow.getAttribute("data-newfilepath")).toBe("src%2Fa.txt");
      expect(notes()).toHaveLength(0);

      // When: the view is switched back from the list to the tree
      vi.mocked(liveFileTreeHtml).mockReturnValueOnce(MATCH_NESTED_TREE_HTML);
      clickFileViewToggle();

      // Then: the regenerated tree row is the only highlighted row and there is still no note
      expect(liveFileTreeHtml).toHaveBeenCalledTimes(2);
      expect(liveFileListHtml).toHaveBeenCalledTimes(1);
      expect(currentFileRows()).toHaveLength(1);
      expect(currentFileRows()[0]).not.toBe(listRow);
      expect(currentFileRows()[0].getAttribute("data-newfilepath")).toBe("src%2Fa.txt");
      expect(notes()).toHaveLength(0);
    });

    it("keeps a single note before the root list after switching the view in both directions (TC-558)", () => {
      // Case: TC-558
      // Given: active mode and a tree view without the historical path
      startInTreeView();
      mockFileHistoryInstance.isActive.mockReturnValue(true);
      mockFileHistoryInstance.getHistoricalPathFor.mockReturnValue(HISTORICAL_PATH);
      expandCommitWithTree(COMMIT_HASH_1, OTHER_NESTED_TREE_HTML);
      expectSingleNoteBeforeRootList();

      // When: the view is switched from the tree to the list
      vi.mocked(liveFileListHtml).mockReturnValueOnce(OTHER_LIST_HTML);
      clickFileViewToggle();

      // Then: still exactly one note leading the file panel and no highlighted row
      expect(liveFileListHtml).toHaveBeenCalledTimes(1);
      expectSingleNoteBeforeRootList();

      // When: the view is switched back from the list to the tree
      vi.mocked(liveFileTreeHtml).mockReturnValueOnce(OTHER_NESTED_TREE_HTML);
      clickFileViewToggle();

      // Then: still exactly one note leading the file panel and no highlighted row
      expect(liveFileTreeHtml).toHaveBeenCalledTimes(2);
      expect(liveFileListHtml).toHaveBeenCalledTimes(1);
      expectSingleNoteBeforeRootList();
    });

    it("applies nothing for a commit without a historical path (TC-559)", () => {
      // Case: TC-559
      // Given: active mode but getHistoricalPathFor returns null
      mockFileHistoryInstance.isActive.mockReturnValue(true);

      // When: the commit details view opens
      expandCommitWithTree(COMMIT_HASH_1, MATCH_TREE_HTML);

      // Then: no highlighted row and no note
      expect(currentFileRows()).toHaveLength(0);
      expect(notes()).toHaveLength(0);
    });

    it("applies nothing in comparison mode (TC-560)", () => {
      // Case: TC-560
      // Given: active mode and an expanded commit compared with another commit
      mockFileHistoryInstance.isActive.mockReturnValue(true);
      mockFileHistoryInstance.getHistoricalPathFor.mockReturnValue(HISTORICAL_PATH);
      vi.mocked(liveFileTreeHtml).mockReturnValue(MATCH_TREE_HTML);
      expandCommitWithTree(COMMIT_HASH_1, MATCH_TREE_HTML);
      clickCommit(COMMIT_HASH_2, { ctrlKey: true });

      // When: the comparison response renders the file list
      dispatchMessage({
        command: "compareCommits",
        fileChanges: [
          {
            oldFilePath: HISTORICAL_PATH,
            newFilePath: HISTORICAL_PATH,
            type: "M",
            additions: 1,
            deletions: 0
          }
        ],
        fromHash: COMMIT_HASH_1,
        toHash: COMMIT_HASH_2
      });
      vi.mocked(liveFileTreeHtml).mockReset();
      vi.mocked(liveFileTreeHtml).mockReturnValue("<table></table>");

      // Then: the details are open but no row is highlighted and no note is inserted
      expect(document.getElementById("commitDetails")).not.toBeNull();
      expect(currentFileRows()).toHaveLength(0);
      expect(notes()).toHaveLength(0);
    });

    it("applies nothing while the mode is inactive (TC-561)", () => {
      // Case: TC-561
      // Given: inactive mode even though a historical path would resolve
      mockFileHistoryInstance.getHistoricalPathFor.mockReturnValue(HISTORICAL_PATH);

      // When: the commit details view opens
      expandCommitWithTree(COMMIT_HASH_1, MATCH_TREE_HTML);

      // Then: no highlighted row and no note
      expect(currentFileRows()).toHaveLength(0);
      expect(notes()).toHaveLength(0);
    });
  });

  describe("key movement to the details view (S66)", () => {
    const FIRST_DESTINATION = "h1";
    const SECOND_DESTINATION = "h2";
    const MERGE_MATCH = "m1";
    const RENAMED_PATH = "lib/a.txt";
    const UNRELATED_PATH = "src/b.txt";
    const COMMIT_DETAILS_ERROR_TITLE = "Unable to load commit details";
    // Names describe table positions, not commit dates.
    const HISTORY_COMMITS: GitCommitNode[] = [
      historyCommit("h0"),
      historyCommit("x1"),
      historyCommit(FIRST_DESTINATION),
      historyCommit("x2"),
      historyCommit(SECOND_DESTINATION),
      historyCommit(MERGE_MATCH, ["h0", "x1"])
    ];

    let liveShowErrorDialog: typeof showErrorDialog;
    let liveFileTree: typeof import("../../web/fileTree");
    let actualFileTree: typeof import("../../web/fileTree");

    function historyCommit(hash: string, parentHashes: string[] = []): GitCommitNode {
      return {
        hash,
        parentHashes,
        author: "Alice",
        email: "alice@test.com",
        date: 1700000000,
        message: `Commit ${hash}`,
        refs: [],
        stash: null
      };
    }

    function fileChange(path: string): GitFileChange {
      return { oldFilePath: path, newFilePath: path, type: "M", additions: 1, deletions: 0 };
    }

    function respondWithDetails(hash: string, paths: string[]): void {
      dispatchMessage({
        command: "commitDetails",
        commitDetails: { ...makeCommitDetails(hash), fileChanges: paths.map(fileChange) }
      });
    }

    function commitDetailsRequests(): RequestMessage[] {
      return vi
        .mocked(liveVscode.postMessage)
        .mock.calls.map((call) => call[0])
        .filter((message) => message.command === "commitDetails");
    }

    function commitDetailsRequestFor(hash: string, hasParents = false): RequestCommitDetails {
      return {
        command: "commitDetails",
        repo: TEST_REPO,
        commitHash: hash,
        hasParents,
        isStash: false
      };
    }

    function resolveHistoricalPaths(paths: Record<string, string>): void {
      mockFileHistoryInstance.getHistoricalPathFor.mockImplementation(
        (hash: string) => paths[hash] ?? null
      );
    }

    // The list keys apply from the focused row target (13-keyboard-accessibility-01.md S71).
    function pressArrowDown(): void {
      const target = document.querySelector<HTMLElement>('#commitTable tr[tabindex="0"]')!;
      target.focus();
      target.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })
      );
    }

    function expandedCommit(): ExpandedCommit | null {
      return (callbacks().getExpandedCommit as () => ExpandedCommit | null)();
    }

    function commitRow(hash: string): HTMLElement {
      return document.querySelector<HTMLElement>(`.commit[data-hash="${hash}"]`)!;
    }

    function highlightedPaths(): string[] {
      return Array.from(currentFileRows()).map((row) =>
        decodeURIComponent(row.getAttribute("data-newfilepath")!)
      );
    }

    function moveTwiceBeforeAnyResponse(): void {
      mockFileHistoryInstance.navigate
        .mockReturnValueOnce(FIRST_DESTINATION)
        .mockReturnValueOnce(SECOND_DESTINATION);
      resolveHistoricalPaths({
        [FIRST_DESTINATION]: HISTORICAL_PATH,
        [SECOND_DESTINATION]: RENAMED_PATH
      });
      pressArrowDown();
      pressArrowDown();
    }

    beforeAll(async () => {
      liveShowErrorDialog = (await import("../../web/dialogs")).showErrorDialog;
      liveFileTree = await import("../../web/fileTree");
      actualFileTree =
        await vi.importActual<typeof import("../../web/fileTree")>("../../web/fileTree");
    });

    beforeEach(() => {
      // The file rows are rendered from the response itself instead of canned HTML.
      vi.mocked(liveFileTree.generateGitFileTree).mockImplementation(
        actualFileTree.generateGitFileTree
      );
      vi.mocked(liveFileTreeHtml).mockImplementation(actualFileTree.generateGitFileTreeHtml);
      vi.mocked(liveFileListHtml).mockImplementation(actualFileTree.generateGitFileListHtml);
      dispatchMessage({
        command: "loadCommits",
        commits: HISTORY_COMMITS,
        head: "h0",
        moreCommitsAvailable: false,
        hard: true
      });
      vi.clearAllMocks();
      mockFileHistoryInstance.isActive.mockReturnValue(true);
    });

    afterEach(() => {
      vi.mocked(liveFileTree.generateGitFileTree).mockReset();
      vi.mocked(liveFileTreeHtml).mockReset();
      vi.mocked(liveFileListHtml).mockReset();
      mockFileHistoryInstance.navigate.mockReset();
      mockFileHistoryInstance.getHistoricalPathFor.mockReset();
      resetFileHistoryMocks();
    });

    it("renders the destination details and highlights the historical file row (TC-616)", () => {
      // Case: TC-616
      // Given: highlighted, the controller resolves ArrowDown to h1 whose historical path is
      // src/a.txt
      mockFileHistoryInstance.navigate.mockReturnValue(FIRST_DESTINATION);
      resolveHistoricalPaths({ [FIRST_DESTINATION]: HISTORICAL_PATH });

      // When: ArrowDown is pressed and the successful response for h1 arrives
      pressArrowDown();
      const requests = commitDetailsRequests();
      respondWithDetails(FIRST_DESTINATION, [HISTORICAL_PATH, UNRELATED_PATH]);

      // Then: h1 was the only request, its details follow its row, and only the row of the
      // historical path is highlighted
      expect(requests).toEqual([commitDetailsRequestFor(FIRST_DESTINATION)]);
      expect(commitRow(FIRST_DESTINATION).nextElementSibling!.id).toBe("commitDetails");
      expect(document.getElementById("commitDetailsSummary")).not.toBeNull();
      const fileRow = document.querySelector('.gitFile[data-newfilepath="src%2Fa.txt"]')!;
      expect(fileRow.classList.contains("fileHistoryCurrent")).toBe(true);
      expect(highlightedPaths()).toEqual([HISTORICAL_PATH]);
      expect(notes()).toHaveLength(0);
    });

    it("matches a renamed file by its historical path, not the requested path (TC-617)", () => {
      // Case: TC-617
      // Given: highlighted for src/a.txt, and the controller resolves ArrowDown to h2 where the
      // file was still named lib/a.txt
      mockFileHistoryInstance.navigate.mockReturnValue(SECOND_DESTINATION);
      resolveHistoricalPaths({ [SECOND_DESTINATION]: RENAMED_PATH });

      // When: ArrowDown is pressed and the response for h2 holds both paths
      pressArrowDown();
      respondWithDetails(SECOND_DESTINATION, [RENAMED_PATH, HISTORICAL_PATH]);

      // Then: only the row of lib/a.txt is highlighted
      expect(commitDetailsRequests()).toEqual([commitDetailsRequestFor(SECOND_DESTINATION)]);
      expect(highlightedPaths()).toEqual([RENAMED_PATH]);
      const requestedPathRow = document.querySelector('.gitFile[data-newfilepath="src%2Fa.txt"]')!;
      expect(requestedPathRow.classList.contains("fileHistoryCurrent")).toBe(false);
      expect(notes()).toHaveLength(0);
    });

    it("leads the file list with the first parent note for a matching merge (TC-618)", () => {
      // Case: TC-618
      // Given: highlighted, and the controller resolves ArrowDown to the matching merge m1
      mockFileHistoryInstance.navigate.mockReturnValue(MERGE_MATCH);
      resolveHistoricalPaths({ [MERGE_MATCH]: HISTORICAL_PATH });

      // When: ArrowDown is pressed and the response for m1 does not hold src/a.txt
      pressArrowDown();
      respondWithDetails(MERGE_MATCH, [UNRELATED_PATH]);

      // Then: one note with the fixed text is the first child of the file panel, no row is
      // highlighted
      expect(commitDetailsRequests()).toEqual([commitDetailsRequestFor(MERGE_MATCH, true)]);
      const noteList = notes();
      expect(noteList).toHaveLength(1);
      expect(noteList[0].textContent).toBe(FILE_HISTORY_NOTE_TEXT);
      const panel = document.getElementById("commitDetailsFiles");
      expect(panel).not.toBeNull();
      expect(noteList[0].parentElement).toBe(panel);
      expect(panel!.firstElementChild).toBe(noteList[0]);
      expect(document.querySelectorAll(".gitFile")).toHaveLength(1);
      expect(currentFileRows()).toHaveLength(0);
    });

    it("requests each destination when moving twice before any response (TC-619)", () => {
      // Case: TC-619
      // Given: highlighted, and the controller resolves two ArrowDown presses to h1 then h2
      // When: ArrowDown is pressed twice before any response arrives
      moveTwiceBeforeAnyResponse();

      // Then: two moves, two different requests in order, and h2 is loading under its row
      expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(2);
      expect(mockFileHistoryInstance.navigate).toHaveBeenNthCalledWith(1, 1, true);
      expect(mockFileHistoryInstance.navigate).toHaveBeenNthCalledWith(2, 1, true);
      expect(commitDetailsRequests()).toEqual([
        commitDetailsRequestFor(FIRST_DESTINATION),
        commitDetailsRequestFor(SECOND_DESTINATION)
      ]);
      expect(expandedCommit()!.hash).toBe(SECOND_DESTINATION);
      expect(commitRow(SECOND_DESTINATION).nextElementSibling!.id).toBe("commitDetails");
      expect(document.querySelectorAll("#commitDetails")).toHaveLength(1);
      expect(document.getElementById("cdvLoading")).not.toBeNull();
    });

    it("ignores the late response of the earlier destination (TC-620)", () => {
      // Case: TC-620
      // Given: two moves before any response, so the details of h2 are loading
      moveTwiceBeforeAnyResponse();

      // When: the successful response for h1 arrives first
      respondWithDetails(FIRST_DESTINATION, [HISTORICAL_PATH]);

      // Then: the details of h2 are still loading and nothing of h1 is rendered
      expect(expandedCommit()!.hash).toBe(SECOND_DESTINATION);
      expect(expandedCommit()!.commitDetails).toBeNull();
      expect(document.getElementById("commitDetailsSummary")).toBeNull();
      expect(document.querySelectorAll(".gitFile")).toHaveLength(0);

      // When: the successful response for h2 arrives
      respondWithDetails(SECOND_DESTINATION, [RENAMED_PATH, HISTORICAL_PATH]);

      // Then: the details of h2 are rendered under its row with its historical path highlighted
      expect(expandedCommit()!.commitDetails!.hash).toBe(SECOND_DESTINATION);
      expect(commitRow(SECOND_DESTINATION).nextElementSibling!.id).toBe("commitDetails");
      expect(document.getElementById("commitDetailsSummary")).not.toBeNull();
      expect(highlightedPaths()).toEqual([RENAMED_PATH]);
    });

    it("closes the details on a failed response without touching the history (TC-621)", () => {
      // Case: TC-621
      // Given: highlighted, ArrowDown moved to h1 and its details are loading
      mockFileHistoryInstance.navigate.mockReturnValue(FIRST_DESTINATION);
      pressArrowDown();
      expect(expandedCommit()!.hash).toBe(FIRST_DESTINATION);
      const navigateCalls = mockFileHistoryInstance.navigate.mock.calls.length;
      const rowClickCalls = mockFileHistoryInstance.handleCommitRowClick.mock.calls.length;
      expect(navigateCalls).toBe(1);

      // When: the details response reports a failure
      dispatchMessage({ command: "commitDetails", commitDetails: null });

      // Then: the details close with the existing error, the history neither exits nor moves back
      expect(document.getElementById("commitDetails")).toBeNull();
      expect(expandedCommit()).toBeNull();
      expect(commitRow(FIRST_DESTINATION).classList.contains("commitDetailsOpen")).toBe(false);
      expect(liveShowErrorDialog).toHaveBeenCalledTimes(1);
      expect(liveShowErrorDialog).toHaveBeenCalledWith(COMMIT_DETAILS_ERROR_TITLE, null, null);
      expect(mockFileHistoryInstance.exit).toHaveBeenCalledTimes(0);
      expect(mockFileHistoryInstance.navigate).toHaveBeenCalledTimes(navigateCalls);
      expect(mockFileHistoryInstance.handleCommitRowClick).toHaveBeenCalledTimes(rowClickCalls);
    });
  });
});

/* ------------------------------------------------------------------ */
/* Worktrees in the saved webview state (Feature 056)                 */
/* ------------------------------------------------------------------ */

describe("GitKeizuView worktrees in saved state", () => {
  const MAIN_WORKTREE = {
    branches: { main: { path: "/test/repo", isMain: true } },
    detached: []
  };

  async function importFreshMain(prevState: Record<string, unknown> | null): Promise<void> {
    vi.resetModules();
    setupTestDOM();
    setupViewState();
    const { vscode: freshVscode } = await import("../../web/utils");
    vi.mocked(freshVscode.getState).mockReturnValueOnce(
      prevState as unknown as ReturnType<typeof freshVscode.getState>
    );
    mockGraphHighlight.render.mockClear();
    await import("../../web/main");
  }

  function respondWithMainWorktree(): void {
    dispatchMessage({
      command: "loadBranches",
      branches: ["main"],
      head: "main",
      hard: false,
      isRepo: true
    });
    dispatchMessage({
      command: "loadCommits",
      commits: MOCK_COMMITS,
      head: COMMIT_HASH_1,
      moreCommitsAvailable: false,
      hard: false,
      worktrees: MAIN_WORKTREE
    });
  }

  it("saves the worktree collection received with the commits (TC-369)", async () => {
    // Given: a fresh view without a previous state
    await importFreshMain(null);
    const { vscode: freshVscode } = await import("../../web/utils");

    // When: the commits arrive together with a worktree collection
    respondWithMainWorktree();

    // Then: the last saved state carries that collection
    const lastCall = vi.mocked(freshVscode.setState).mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const savedState = lastCall![0] as WebViewState;
    expect(savedState.worktrees).toEqual(MAIN_WORKTREE);
  });

  it("does not re-render when the restored worktrees match the soft response (TC-370)", async () => {
    // Given: a previous state that already holds the main worktree
    await importFreshMain({ ...MOCK_PREV_STATE, worktrees: MAIN_WORKTREE });
    expect(mockGraphHighlight.render).toHaveBeenCalledTimes(1);

    // When: the soft refresh answers with identical commits and worktrees
    respondWithMainWorktree();

    // Then: the restored render is the only one
    expect(mockGraphHighlight.render).toHaveBeenCalledTimes(1);
  });

  it("re-renders once when a legacy state has no worktrees (TC-371)", async () => {
    // Given: a previous state saved before worktrees were persisted
    await importFreshMain({ ...MOCK_PREV_STATE, worktrees: undefined });
    expect(mockGraphHighlight.render).toHaveBeenCalledTimes(1);

    // When: the soft refresh answers with the main worktree
    respondWithMainWorktree();

    // Then: the worktree difference triggers a second render
    expect(mockGraphHighlight.render).toHaveBeenCalledTimes(2);
  });
});

/* ------------------------------------------------------------------ */
/* S68: path highlight selection across view changes                  */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/main-test/12-path-highlight-01.md
describe("path highlight selection across view changes (S68)", () => {
  const OTHER_REPO = "/test/other-repo";
  const PATH_HEAD = "N";
  const MERGE_SUBJECT = "Merge branch";
  const HIGHLIGHT_TITLE = "Highlight path";
  const DIRECT_TITLE = "Direct parents and children";
  const FIRST_PARENT_TITLE = "First-parent ancestors";
  const TARGET_OUTSIDE_TEXT = "Target is outside loaded history";
  const BRANCH_LABEL_TEXT = "Branch at selection";
  const BAR_ID = "pathHighlightBar";
  const CLEAR_ID = "pathHighlightClear";
  const CLASS_ACTIVE = "active";
  const SCROLL_TOP = 240;
  const FIND_TEXT = "search";
  const PATH_HIGHLIGHT_STATE_KEY = /pathHighlight/i;
  const REFRESH_COMMANDS = ["loadBranches", "loadCommits"];
  const DIRECT_HASHES = new Set(["N", "M", "A", "B"]);
  const ALL_ANCESTOR_HASHES = new Set(["M", "A", "B", "R"]);
  const MOVED_TIP_HASHES = new Set(["N", "M", "A", "B", "R"]);

  type BranchLabels = ReturnType<typeof getBranchLabels>;

  let liveVscode: typeof vscode;

  function pathNode(
    hash: string,
    parentHashes: string[],
    extra: Partial<GitCommitNode> = {}
  ): GitCommitNode {
    return {
      hash,
      parentHashes,
      author: "Alice",
      email: "alice@test.com",
      date: 1700000000,
      message: `m ${hash}`,
      refs: [],
      stash: null,
      ...extra
    };
  }

  function pathRef(hash: string, name: string, type: GitRef["type"]): GitRef {
    return { hash, name, type };
  }

  /** Standard fixture: feature / hotfix / origin/feature on M unless overridden. */
  function pathCommits(refsOfM?: GitRef[], refsOfN: GitRef[] = []): GitCommitNode[] {
    return [
      pathNode("N", ["M"], { refs: refsOfN }),
      pathNode("M", ["A", "B"], {
        message: MERGE_SUBJECT,
        refs: refsOfM ?? [
          pathRef("M", "feature", "head"),
          pathRef("M", "hotfix", "head"),
          pathRef("M", "origin/feature", "remote")
        ]
      }),
      pathNode("A", ["R"]),
      pathNode("B", ["R"]),
      pathNode("U", ["R"]),
      pathNode("R", []),
      pathNode("X", [])
    ];
  }

  /** Mirrors the real label grouping closely enough for head / combined-remote badges. */
  function labelsFromRefs(refs: GitRef[]): BranchLabels {
    const heads = refs
      .filter((entry) => entry.type === "head")
      .map((entry) => ({
        name: entry.name,
        remotes: refs
          .filter((other) => other.type === "remote" && other.name === `origin/${entry.name}`)
          .map(() => "origin")
      }));
    const combined = new Set(
      heads.flatMap((head) => head.remotes.map((remote) => `${remote}/${head.name}`))
    );
    return {
      heads,
      remotes: refs.filter((entry) => entry.type === "remote" && !combined.has(entry.name)),
      tags: refs.filter((entry) => entry.type === "tag")
    };
  }

  function loadPath(commits: GitCommitNode[], hard = true, head = PATH_HEAD): void {
    dispatchMessage({ command: "loadCommits", commits, head, moreCommitsAvailable: false, hard });
  }

  function loadPathRepos(repos: string[]): void {
    dispatchMessage({
      command: "loadRepos",
      repos: Object.fromEntries(repos.map((repo) => [repo, { columnWidths: null }])),
      lastActiveRepo: TEST_REPO
    });
  }

  function commitMenuItems(hash: string): ContextMenuElement[] {
    document
      .querySelector(`.commit[data-hash="${hash}"]`)!
      .dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    const calls = vi.mocked(showContextMenu).mock.calls;
    return calls[calls.length - 1][1];
  }

  function modeItem(items: ContextMenuElement[], title: string): ContextMenuItem {
    const submenu = items.find(
      (item): item is ContextMenuSubmenu =>
        item !== null && "submenu" in item && item.title === HIGHLIGHT_TITLE
    );
    expect(submenu).toBeDefined();
    const item = submenu!.submenu.find(
      (child): child is ContextMenuItem =>
        child !== null && "onClick" in child && child.title === title
    );
    expect(item).toBeDefined();
    return item!;
  }

  function selectCommit(hash: string, title = DIRECT_TITLE): void {
    modeItem(commitMenuItems(hash), title).onClick();
  }

  function badge(name: string): HTMLElement {
    const elem = document.querySelector<HTMLElement>(`.gitRef.head[data-name="${name}"]`);
    expect(elem, `badge ${name}`).not.toBeNull();
    return elem!;
  }

  /** Right-clicks the badge and invokes the highlight callback captured from the mocked builder. */
  function selectBranch(elem: HTMLElement, mode: PathHighlightMode): void {
    elem.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    const calls = vi.mocked(buildRefContextMenuItems).mock.calls;
    const onHighlight = calls[calls.length - 1][7] as
      | ((mode: PathHighlightMode) => void)
      | undefined;
    expect(onHighlight).toBeDefined();
    onHighlight!(mode);
  }

  function barElem(): HTMLElement {
    const elem = document.getElementById(BAR_ID);
    expect(elem).not.toBeNull();
    return elem!;
  }

  function barState(): {
    active: boolean;
    name: string | null;
    kind: string | null;
    hashTitle: string | null;
    mode: string;
    status: string | null;
  } {
    return {
      active: barElem().classList.contains(CLASS_ACTIVE),
      name: document.getElementById("pathHighlightName")!.textContent,
      kind: document.getElementById("pathHighlightKind")!.textContent,
      hashTitle: document.getElementById("pathHighlightHash")!.getAttribute("title"),
      mode: (document.getElementById("pathHighlightMode") as HTMLSelectElement).value,
      status: document.getElementById("pathHighlightStatus")!.textContent
    };
  }

  function boundaryItems(): string[][] {
    return Array.from(barElem().querySelectorAll("details li"), (item) =>
      Array.from(item.querySelectorAll("span"), (span) => span.title)
    );
  }

  function clearPath(): void {
    document.getElementById(CLEAR_ID)!.dispatchEvent(new MouseEvent("click"));
  }

  function pathCalls(): unknown[] {
    return mockGraphHighlight.setPathHighlight.mock.calls.map((call) => call[0]);
  }

  function lastPathCall(): {
    hashes: Set<string>;
    edgeKeys: Set<string>;
    boundaries: unknown[];
  } | null {
    const calls = pathCalls();
    expect(calls.length).toBeGreaterThan(0);
    return calls[calls.length - 1] as ReturnType<typeof lastPathCall>;
  }

  function firstRefreshOrder(): number {
    const calls = vi.mocked(liveVscode.postMessage).mock.calls;
    const orders = calls
      .map((call, index) =>
        REFRESH_COMMANDS.includes((call[0] as { command: string }).command)
          ? vi.mocked(liveVscode.postMessage).mock.invocationCallOrder[index]
          : null
      )
      .filter((order): order is number => order !== null);
    expect(orders.length).toBeGreaterThan(0);
    return Math.min(...orders);
  }

  beforeAll(async () => {
    vi.resetModules();
    dropdownCallCount = 0;
    capturedRepoCallback = null;
    capturedBranchCallback = null;
    capturedAuthorCallback = null;
    setupTestDOM();
    setupViewState();
    const utilsMod = await import("../../web/utils");
    liveVscode = utilsMod.vscode;
    vi.mocked(liveVscode.getState).mockReturnValueOnce(null);
    vi.mocked(getBranchLabels).mockImplementation(labelsFromRefs);
    await import("../../web/main");
    loadTestCommits();
    loadPathRepos([TEST_REPO, OTHER_REPO]);
  });

  afterAll(() => {
    vi.mocked(getBranchLabels).mockReturnValue({ heads: [], remotes: [], tags: [] });
  });

  beforeEach(() => {
    leaveHistoryMode();
    mockFindWidgetInstance.isVisible.mockReturnValue(false);
    loadPathRepos([TEST_REPO, OTHER_REPO]);
    dispatchMessage({ command: "selectRepo", repo: TEST_REPO });
    // Settle the in-flight load so later requests are posted instead of queued.
    dispatchMessage({
      command: "loadBranches",
      branches: ["feature", "hotfix"],
      head: "feature",
      hard: false,
      isRepo: true
    });
    loadPath(pathCommits());
    if (barElem().classList.contains(CLASS_ACTIVE)) clearPath();
    vi.clearAllMocks();
  });

  it.each([
    ["reordered", (commits: GitCommitNode[]) => [...commits].reverse(), true, 1],
    ["identical", (commits: GitCommitNode[]) => commits, false, 0]
  ])(
    "recomputes once for a %s same-repo response and keeps the bar (TC-631)",
    (_label, transform, hard, expectedCalls) => {
      // Case: TC-631
      // Given: M highlighted in Direct mode
      selectCommit("M");
      const before = barState();
      vi.clearAllMocks();

      // When: the same repo answers with the transformed commits
      loadPath(transform(pathCommits()), hard);

      // Then: one recompute between graph.loadCommits and graph.render, or none on the early return
      expect(mockGraphHighlight.setPathHighlight).toHaveBeenCalledTimes(expectedCalls);
      if (expectedCalls > 0) {
        expect(lastPathCall()!.hashes).toEqual(DIRECT_HASHES);
        expect(mockGraphHighlight.loadCommits.mock.invocationCallOrder[0]).toBeLessThan(
          mockGraphHighlight.setPathHighlight.mock.invocationCallOrder[0]
        );
        expect(mockGraphHighlight.setPathHighlight.mock.invocationCallOrder[0]).toBeLessThan(
          mockGraphHighlight.render.mock.invocationCallOrder[0]
        );
      }
      expect(barState()).toEqual(before);
    }
  );

  it("extends the path when the missing first parent is loaded later (TC-632)", () => {
    // Case: TC-632
    // Given: T -> gap with gap unloaded, highlighted by first parent
    loadPath([pathNode("T", ["gap"]), pathNode("R", [])], true, "T");
    selectCommit("T", FIRST_PARENT_TITLE);

    // Then: only T, one boundary, listed in the bar
    expect(lastPathCall()).toMatchObject({
      hashes: new Set(["T"]),
      boundaries: [{ childHash: "T", parentHash: "gap" }]
    });
    expect(boundaryItems()).toEqual([["T", "gap"]]);

    // When: gap -> R arrives in the same repo
    loadPath([pathNode("T", ["gap"]), pathNode("R", []), pathNode("gap", ["R"])], true, "T");

    // Then: the path reaches R and the boundary list disappears
    expect(lastPathCall()).toEqual({
      targetFound: true,
      hashes: new Set(["T", "gap", "R"]),
      edgeKeys: new Set(['["T","gap"]', '["gap","R"]']),
      boundaries: []
    });
    expect(barElem().querySelector("details")).toBeNull();
    expect(barState()).toMatchObject({ hashTitle: "T", mode: FIRST_PARENT_TITLE });
  });

  it("keeps the selection while M is filtered out and recovers without scrolling (TC-633)", () => {
    // Case: TC-633
    // Given: M highlighted and a scrolled container
    selectCommit("M");
    const scrollContainer = document.getElementById("scrollContainer")!;
    Object.defineProperty(scrollContainer, "scrollTop", {
      value: SCROLL_TOP,
      writable: true,
      configurable: true
    });

    // When: a response without M arrives
    loadPath(pathCommits().filter((commit) => commit.hash !== "M"));

    // Then: null to the graph, the bar keeps the target and shows the reason
    expect(pathCalls()[pathCalls().length - 1]).toBeNull();
    expect(barState()).toMatchObject({
      active: true,
      name: MERGE_SUBJECT,
      hashTitle: "M",
      mode: DIRECT_TITLE,
      status: TARGET_OUTSIDE_TEXT
    });
    expect(scrollContainer.scrollTop).toBe(SCROLL_TOP);

    // When: M is back
    loadPath(pathCommits());

    // Then: recomputed, the reason is gone, still not scrolled
    expect(lastPathCall()!.hashes).toEqual(DIRECT_HASHES);
    expect(barState()).toMatchObject({ status: "", hashTitle: "M" });
    expect(scrollContainer.scrollTop).toBe(SCROLL_TOP);
  });

  it.each([
    [
      "moved to N",
      () => pathCommits([pathRef("M", "hotfix", "head")], [pathRef("N", "feature", "head")])
    ],
    ["renamed to feature2", () => pathCommits([pathRef("M", "feature2", "head")])],
    ["deleted", () => pathCommits([pathRef("M", "hotfix", "head")])]
  ])("does not follow a branch %s until it is selected again (TC-634)", (_label, updated) => {
    // Case: TC-634
    // Given: feature (at M) highlighted by all ancestors
    selectBranch(badge("feature"), PathHighlightMode.AllAncestors);
    expect(lastPathCall()!.hashes).toEqual(ALL_ANCESTOR_HASHES);

    // When: the branch moves, is renamed or deleted
    loadPath(updated());

    // Then: the bar still names feature at M and the graph keeps M's ancestors
    expect(barState()).toMatchObject({ name: "feature", kind: BRANCH_LABEL_TEXT, hashTitle: "M" });
    expect(lastPathCall()!.hashes).toEqual(ALL_ANCESTOR_HASHES);

    // When: feature is selected again from N's label
    loadPath(pathCommits([pathRef("M", "hotfix", "head")], [pathRef("N", "feature", "head")]));
    selectBranch(badge("feature"), PathHighlightMode.AllAncestors);

    // Then: the new tip is used
    expect(barState()).toMatchObject({ name: "feature", hashTitle: "N" });
    expect(lastPathCall()!.hashes).toEqual(MOVED_TIP_HASHES);
  });

  it("clears before the other repo is requested from the dropdown (TC-635)", () => {
    // Case: TC-635
    selectCommit("M");
    vi.clearAllMocks();

    // When: another repo is chosen in the dropdown
    capturedRepoCallback!(OTHER_REPO);

    // Then: one null before the refresh request, bar inactive
    expect(pathCalls()).toEqual([null]);
    expect(mockGraphHighlight.setPathHighlight.mock.invocationCallOrder[0]).toBeLessThan(
      firstRefreshOrder()
    );
    expect(barElem().classList.contains(CLASS_ACTIVE)).toBe(false);
  });

  it.each([
    ["another repo", OTHER_REPO, [null], false],
    ["the same repo", TEST_REPO, [], true]
  ])("handles selectRepo for %s (TC-636)", (_label, repo, expectedCalls, expectedActive) => {
    // Case: TC-636
    selectCommit("M");
    const before = barState();
    vi.clearAllMocks();

    // When: selectRepo arrives
    dispatchMessage({ command: "selectRepo", repo });

    // Then: cleared only for another repo
    expect(pathCalls()).toEqual(expectedCalls);
    expect(barElem().classList.contains(CLASS_ACTIVE)).toBe(expectedActive);
    if (expectedActive) expect(barState()).toEqual(before);
  });

  it.each([
    ["without the current repo", [OTHER_REPO], [null], false],
    ["with the current repo", [TEST_REPO, OTHER_REPO], [], true]
  ])("handles a loadRepos response %s (TC-637)", (_label, repos, expectedCalls, expectedActive) => {
    // Case: TC-637
    selectCommit("M");
    const before = barState();
    vi.clearAllMocks();

    // When: the repo list arrives
    loadPathRepos(repos);

    // Then: cleared only when the current repo is gone
    expect(pathCalls()).toEqual(expectedCalls);
    expect(barElem().classList.contains(CLASS_ACTIVE)).toBe(expectedActive);
    if (expectedActive) expect(barState()).toEqual(before);
  });

  it.each([
    [
      "M is filtered out",
      () => loadPath(pathCommits().filter((commit) => commit.hash !== "M")),
      true,
      TARGET_OUTSIDE_TEXT
    ],
    ["the repo changes", () => capturedRepoCallback!(OTHER_REPO), false, ""]
  ])(
    "selects from the captured values after the menu was opened and %s (TC-641)",
    (_label, change, expectedActive, expectedStatus) => {
      // Case: TC-641
      // Given: the menu of M is open
      const direct = modeItem(commitMenuItems("M"), DIRECT_TITLE);
      vi.clearAllMocks();

      // When: the view changes and the mode is clicked afterwards
      change();
      direct.onClick();

      // Then: the missing target is shown from the captured values; a changed repo is rejected
      expect(barElem().classList.contains(CLASS_ACTIVE)).toBe(expectedActive);
      if (expectedActive) {
        expect(barState()).toMatchObject({
          name: MERGE_SUBJECT,
          hashTitle: "M",
          status: expectedStatus
        });
        expect(pathCalls()[pathCalls().length - 1]).toBeNull();
      } else {
        expect(pathCalls().every((call) => call === null)).toBe(true);
      }
    }
  );

  it.each([
    ["starting", () => selectCommit("M")],
    ["clearing", () => clearPath()]
  ])(
    "keeps scroll, filter, search, details and comparison when %s the highlight (TC-642)",
    (label, act) => {
      // Case: TC-642
      // Given: an author filter, a scrolled container, A compared with R and a visible find widget
      capturedAuthorCallback!(["Alice"]);
      loadPath(pathCommits());
      const scrollContainer = document.getElementById("scrollContainer")!;
      Object.defineProperty(scrollContainer, "scrollTop", {
        value: SCROLL_TOP,
        writable: true,
        configurable: true
      });
      expandCommitWithCompare("A", "R");
      mockFindWidgetInstance.isVisible.mockReturnValue(true);
      mockFindWidgetInstance.getState.mockReturnValue({
        text: FIND_TEXT,
        currentHash: null,
        visible: true,
        caseSensitive: false,
        regex: false
      });
      if (label === "clearing") selectCommit("M");
      vi.clearAllMocks();
      const scrollTopBefore = scrollContainer.scrollTop;
      const table = document.querySelector("#commitTable table");
      const details = document.getElementById("commitDetails");
      expect(details).not.toBeNull();
      const compareTarget = document.querySelector(".commit.compareTarget");
      expect(compareTarget).not.toBeNull();

      // When: the highlight is started or cleared
      act();

      // Then: only the graph was re-rendered; nothing else moved, re-rendered, saved or requested
      expect(mockGraphHighlight.render).toHaveBeenCalledTimes(1);
      expect(scrollContainer.scrollTop).toBe(scrollTopBefore);
      expect(document.querySelector("#commitTable table")).toBe(table);
      expect(document.getElementById("commitDetails")).toBe(details);
      expect(document.querySelector(".commit.compareTarget")).toBe(compareTarget);
      expect(mockAuthorDropdownInstance.setOptions).toHaveBeenCalledTimes(0);
      expect(mockFindWidgetInstance.close).toHaveBeenCalledTimes(0);
      expect(mockFindWidgetInstance.show).toHaveBeenCalledTimes(0);
      expect(mockFindWidgetInstance.refresh).toHaveBeenCalledTimes(0);
      expect(mockFileHistoryInstance.exit).toHaveBeenCalledTimes(0);
      expect(liveVscode.setState).toHaveBeenCalledTimes(0);
      expect(liveVscode.postMessage).toHaveBeenCalledTimes(0);
      mockFindWidgetInstance.isVisible.mockReturnValue(false);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    }
  );

  it("leaves click, modifier click, dblclick, arrow keys and Escape unchanged (TC-643)", () => {
    // Case: TC-643 (arrows from the focused row target, Escape on keydown: S70 / S72)
    const pressArrowOnTarget = (key: string): void => {
      const target = document.querySelector<HTMLElement>('#commitTable tr[tabindex="0"]')!;
      target.focus();
      target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    };
    interface InteractionRecord {
      posts: unknown[];
      checkouts: unknown[];
      detailsAfterEscape: boolean;
    }
    const run = (): InteractionRecord => {
      vi.clearAllMocks();
      clickCommit("A");
      dispatchMessage({ command: "commitDetails", commitDetails: makeCommitDetails("A") });
      clickCommit("R", { ctrlKey: true });
      clickCommit("U", { metaKey: true });
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      clickCommit("A");
      dispatchMessage({ command: "commitDetails", commitDetails: makeCommitDetails("A") });
      pressArrowOnTarget("ArrowDown");
      pressArrowOnTarget("ArrowUp");
      badge("feature").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      return {
        posts: vi.mocked(liveVscode.postMessage).mock.calls.map((call) => call[0]),
        checkouts: vi
          .mocked(checkoutBranchAction)
          .mock.calls.map((call) => [call[0], call[2], call[3]]),
        detailsAfterEscape: document.getElementById("commitDetails") !== null
      };
    };

    // Given: the interactions recorded without a highlight
    const baseline = run();
    expect(baseline.posts.map((post) => (post as { command: string }).command)).toEqual([
      "commitDetails",
      "compareCommits",
      "compareCommits",
      "commitDetails",
      "commitDetails",
      "commitDetails"
    ]);
    expect(baseline.checkouts).toEqual([[TEST_REPO, "feature", undefined]]);
    expect(baseline.detailsAfterEscape).toBe(false);

    // When: the same interactions run while M is highlighted
    selectCommit("M");
    const highlighted = run();

    // Then: identical requests and results, the highlight is untouched
    expect(highlighted).toEqual(baseline);
    expect(barState()).toMatchObject({ active: true, hashTitle: "M" });
    expect(pathCalls().every((call) => call !== null)).toBe(true);
  });

  it("starts unselected after the webview is rebuilt and saves no highlight key (TC-638)", async () => {
    // Case: TC-638
    // Given: M highlighted, and the last state saved so far
    selectCommit("M");
    const stateCalls = vi.mocked(liveVscode.setState).mock.calls;
    const savedBefore = stateCalls.length;
    loadPath([...pathCommits()].reverse());
    expect(stateCalls.length).toBeGreaterThan(savedBefore);
    const prevState = stateCalls[stateCalls.length - 1][0] as Record<string, unknown>;

    // Then: no highlight key is persisted
    expect(Object.keys(prevState).filter((key) => PATH_HIGHLIGHT_STATE_KEY.test(key))).toEqual([]);

    // When: a new view is built from that state
    vi.resetModules();
    dropdownCallCount = 0;
    setupTestDOM();
    setupViewState();
    const utilsMod = await import("../../web/utils");
    vi.mocked(utilsMod.vscode.getState).mockReturnValueOnce(
      prevState as ReturnType<typeof utilsMod.vscode.getState>
    );
    mockGraphHighlight.setPathHighlight.mockClear();
    await import("../../web/main");

    // Then: the bar is inactive and the graph never received a highlight
    expect(barElem().classList.contains(CLASS_ACTIVE)).toBe(false);
    expect(pathCalls().every((call) => call === null)).toBe(true);
  });
});
