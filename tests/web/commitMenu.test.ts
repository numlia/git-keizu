// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../web/dialogs", () => ({
  showCheckboxDialog: vi.fn(),
  showConfirmationDialog: vi.fn(),
  showFormDialog: vi.fn(),
  showSelectDialog: vi.fn()
}));

vi.mock("../../web/contextMenu", () => ({
  recordRecentAction: vi.fn()
}));

vi.mock("../../web/utils", () => {
  const pathUnsafeChars = /[\\/:*?"<>| ]+/g;
  const pathUnsafeCharReplacement = "-";

  return {
    abbrevCommit: vi.fn((h: string) => h.substring(0, 8)),
    escapeHtml: vi.fn((str: string) => str),
    sendMessage: vi.fn(),
    getRepoName: vi.fn((repoPath: string) => {
      const i = Math.max(repoPath.lastIndexOf("/"), repoPath.lastIndexOf("\\"));
      return i >= 0 ? repoPath.substring(i + 1) : repoPath;
    }),
    sanitizeBranchNameForPath: vi.fn((branchName: string) =>
      branchName.replace(pathUnsafeChars, pathUnsafeCharReplacement)
    ),
    ELLIPSIS: "&#8230;"
  };
});

import { buildCommitContextMenuItems } from "../../web/commitMenu";
import { recordRecentAction } from "../../web/contextMenu";
import { showConfirmationDialog, showFormDialog, showSelectDialog } from "../../web/dialogs";
import { sanitizeBranchNameForPath, sendMessage } from "../../web/utils";

const REPO = "/test/repo";
const HASH = "abc1234567890def";
const PARENT_HASHES = ["parent1234567890"];

function isContextMenuItem(item: ContextMenuElement): item is ContextMenuItem {
  return item !== null && "onClick" in item;
}

function isContextMenuSubmenu(item: ContextMenuElement): item is ContextMenuSubmenu {
  return item !== null && "submenu" in item;
}

function createMockElement(): HTMLElement {
  return document.createElement("div");
}

function findTopLevelMenuItem(items: ContextMenuElement[], title: string): ContextMenuItem {
  const item = items.find(
    (menuItem): menuItem is ContextMenuItem =>
      isContextMenuItem(menuItem) && menuItem.title === title
  );
  expect(item).toBeDefined();
  return item!;
}

function getMoreSubmenu(items: ContextMenuElement[]): ContextMenuSubmenu {
  const moreItem = items.find(
    (menuItem): menuItem is ContextMenuSubmenu =>
      isContextMenuSubmenu(menuItem) && menuItem.title === "More..."
  );
  expect(moreItem).toBeDefined();
  return moreItem!;
}

function findSubmenuItem(items: ContextMenuElement[], title: string): ContextMenuItem {
  const submenuItem = getMoreSubmenu(items).submenu.find(
    (menuItem): menuItem is ContextMenuItem =>
      isContextMenuItem(menuItem) && menuItem.title === title
  );
  expect(submenuItem).toBeDefined();
  return submenuItem!;
}

function getCreateBranchItem(): ContextMenuItem {
  const items = buildCommitContextMenuItems(REPO, HASH, PARENT_HASHES, [], {}, createMockElement());
  return findTopLevelMenuItem(items, "Create Branch&#8230;");
}

describe("Create Branch dialog (S1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls showFormDialog with text-ref and checkbox inputs (TC-001)", () => {
    // Given: Create Branch menu item exists
    const item = getCreateBranchItem();

    // When: onClick is triggered
    item.onClick();

    // Then: showFormDialog is called (not showRefInputDialog) with 2 form elements
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const inputs = (showFormDialog as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(inputs).toHaveLength(2);
    expect(inputs[0].type).toBe("text-ref");
    expect(inputs[1].type).toBe("checkbox");
  });

  it("has Check out checkbox defaulting to ON (TC-002)", () => {
    // Given: Create Branch menu item
    const item = getCreateBranchItem();

    // When: onClick is triggered
    item.onClick();

    // Then: checkbox value defaults to true
    const inputs = (showFormDialog as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(inputs[1].value).toBe(true);
  });

  it("sends RequestCreateBranch with checkout=true when checked (TC-003)", () => {
    // Given: Create Branch menu item
    const item = getCreateBranchItem();
    item.onClick();

    // When: form is submitted with a valid branch name and checkbox checked
    const actioned = (showFormDialog as ReturnType<typeof vi.fn>).mock.calls[0][3];
    actioned(["feature/new", "checked"]);

    // Then: sendMessage is called with checkout: true
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      command: "createBranch",
      repo: REPO,
      branchName: "feature/new",
      commitHash: HASH,
      checkout: true
    });
  });

  it("sends RequestCreateBranch with checkout=false when unchecked (TC-004)", () => {
    // Given: Create Branch menu item
    const item = getCreateBranchItem();
    item.onClick();

    // When: form is submitted with checkbox unchecked
    const actioned = (showFormDialog as ReturnType<typeof vi.fn>).mock.calls[0][3];
    actioned(["feature/new", "unchecked"]);

    // Then: sendMessage is called with checkout: false
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      command: "createBranch",
      repo: REPO,
      branchName: "feature/new",
      commitHash: HASH,
      checkout: false
    });
  });

  it("has empty default for branch name input (TC-005)", () => {
    // Given: Create Branch menu item
    const item = getCreateBranchItem();

    // When: onClick is triggered
    item.onClick();

    // Then: text-ref input has empty default (empty name triggers validation block)
    const inputs = (showFormDialog as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(inputs[0].default).toBe("");
  });

  it("uses text-ref type for branch name enabling ref validation (TC-006)", () => {
    // Given: Create Branch menu item
    const item = getCreateBranchItem();

    // When: onClick is triggered
    item.onClick();

    // Then: first input is text-ref type (triggers refInvalid validation in showFormDialog)
    const inputs = (showFormDialog as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(inputs[0].type).toBe("text-ref");
  });
});

// --- S2: Merge ダイアログ拡張（3 checkbox フォーム） ---

describe("Merge dialog (S2)", () => {
  const DEFAULT_DIALOG_DEFAULTS = {
    merge: { noFastForward: true, squashCommits: false, noCommit: false },
    cherryPick: { recordOrigin: false, noCommit: false },
    stashUncommittedChanges: { includeUntracked: false },
    createWorktree: { openTerminal: true },
    removeWorktree: { deleteBranch: true }
  };

  function setupViewState(overrides?: Partial<typeof DEFAULT_DIALOG_DEFAULTS.merge>) {
    (globalThis as Record<string, unknown>).viewState = {
      dialogDefaults: {
        ...DEFAULT_DIALOG_DEFAULTS,
        merge: { ...DEFAULT_DIALOG_DEFAULTS.merge, ...overrides }
      }
    };
  }

  function getMergeItem(): ContextMenuItem {
    const items = buildCommitContextMenuItems(
      REPO,
      HASH,
      PARENT_HASHES,
      [],
      {},
      createMockElement()
    );
    return findTopLevelMenuItem(items, "Merge into current branch&#8230;");
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupViewState();
  });

  it("calls showFormDialog with 3 checkboxes (TC-007)", () => {
    // Given: Merge menu item exists
    const item = getMergeItem();

    // When: onClick is triggered
    item.onClick();

    // Then: showFormDialog is called with 3 checkbox inputs
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect(inputs).toHaveLength(3);
    expect(inputs[0].type).toBe("checkbox");
    expect(inputs[1].type).toBe("checkbox");
    expect(inputs[2].type).toBe("checkbox");
  });

  it("No FF checkbox defaults to viewState.dialogDefaults.merge.noFastForward (TC-008)", () => {
    // Given: viewState.dialogDefaults.merge.noFastForward = true
    setupViewState({ noFastForward: true });
    const item = getMergeItem();

    // When: onClick is triggered
    item.onClick();

    // Then: first checkbox value reflects noFastForward setting
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect(inputs[0].type).toBe("checkbox");
    expect((inputs[0] as DialogCheckboxInput).value).toBe(true);
  });

  it("Squash checkbox defaults to viewState.dialogDefaults.merge.squashCommits (TC-009)", () => {
    // Given: viewState.dialogDefaults.merge.squashCommits = false
    setupViewState({ squashCommits: false });
    const item = getMergeItem();

    // When: onClick is triggered
    item.onClick();

    // Then: second checkbox value reflects squashCommits setting
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect((inputs[1] as DialogCheckboxInput).value).toBe(false);
  });

  it("No Commit checkbox defaults to viewState.dialogDefaults.merge.noCommit (TC-010)", () => {
    // Given: viewState.dialogDefaults.merge.noCommit = false
    setupViewState({ noCommit: false });
    const item = getMergeItem();

    // When: onClick is triggered
    item.onClick();

    // Then: third checkbox value reflects noCommit setting
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect((inputs[2] as DialogCheckboxInput).value).toBe(false);
  });

  it("callback sends RequestMergeCommit with createNewCommit, squash, noCommit (TC-011)", () => {
    // Given: Merge dialog is shown
    const item = getMergeItem();
    item.onClick();

    // When: form is submitted with all options checked
    const actioned = vi.mocked(showFormDialog).mock.calls[0][3];
    actioned(["checked", "checked", "checked"]);

    // Then: sendMessage includes createNewCommit, squash, noCommit
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      command: "mergeCommit",
      repo: REPO,
      commitHash: HASH,
      createNewCommit: true,
      squash: true,
      noCommit: true
    });
  });

  it("Squash checkbox has info tooltip text (TC-012)", () => {
    // Given: Merge menu item
    const item = getMergeItem();

    // When: onClick is triggered
    item.onClick();

    // Then: Squash checkbox has info property with tooltip text
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    const squashInput = inputs[1] as DialogCheckboxInput;
    expect(squashInput.info).toBeDefined();
    expect(squashInput.info).toContain("single commit");
  });

  it("No Commit checkbox has info tooltip text (TC-013)", () => {
    // Given: Merge menu item
    const item = getMergeItem();

    // When: onClick is triggered
    item.onClick();

    // Then: No Commit checkbox has info property with tooltip text
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    const noCommitInput = inputs[2] as DialogCheckboxInput;
    expect(noCommitInput.info).toBeDefined();
    expect(noCommitInput.info).toContain("staged but not committed");
  });

  it("afterCreate callback disables No FF when Squash is initially checked (TC-014)", () => {
    // Given: Squash default is ON
    setupViewState({ squashCommits: true });
    const item = getMergeItem();
    item.onClick();

    // When: afterCreate callback is invoked with mock dialog element
    const afterCreate = vi.mocked(showFormDialog).mock.calls[0][5];
    expect(afterCreate).toBeDefined();

    const mockNoFfInput = { checked: true, disabled: false, addEventListener: vi.fn() };
    const mockSquashInput = {
      checked: true,
      disabled: false,
      addEventListener: vi.fn()
    };
    const mockDialogEl = {
      querySelector: vi.fn((selector: string) => {
        if (selector === "#dialogInput0") return mockNoFfInput;
        if (selector === "#dialogInput1") return mockSquashInput;
        return null;
      })
    } as unknown as HTMLElement;

    afterCreate!(mockDialogEl);

    // Then: No FF is disabled and unchecked
    expect(mockNoFfInput.checked).toBe(false);
    expect(mockNoFfInput.disabled).toBe(true);
  });

  it("Squash OFF restores No FF to enabled with default value (TC-015)", () => {
    // Given: Squash default is OFF, noFastForward default is true
    setupViewState({ noFastForward: true, squashCommits: false });
    const item = getMergeItem();
    item.onClick();

    const afterCreate = vi.mocked(showFormDialog).mock.calls[0][5];
    expect(afterCreate).toBeDefined();

    const mockNoFfInput = { checked: true, disabled: false, addEventListener: vi.fn() };
    const mockSquashInput = {
      checked: false,
      disabled: false,
      addEventListener: vi.fn()
    };
    const mockDialogEl = {
      querySelector: vi.fn((selector: string) => {
        if (selector === "#dialogInput0") return mockNoFfInput;
        if (selector === "#dialogInput1") return mockSquashInput;
        return null;
      })
    } as unknown as HTMLElement;

    afterCreate!(mockDialogEl);

    // When: Squash is toggled ON then OFF
    const changeHandler = mockSquashInput.addEventListener.mock.calls[0][1] as () => void;
    mockSquashInput.checked = true;
    changeHandler();
    expect(mockNoFfInput.disabled).toBe(true);

    mockSquashInput.checked = false;
    changeHandler();

    // Then: No FF is re-enabled with default value
    expect(mockNoFfInput.disabled).toBe(false);
    expect(mockNoFfInput.checked).toBe(true);
  });
});

// --- S3: Cherry-pick ダイアログ拡張（2 checkbox フォーム） ---

describe("Cherry-pick dialog (S3)", () => {
  const MERGE_PARENT_HASHES = ["parent1234567890", "parent2234567890"];
  const MOCK_COMMITS = [
    { message: "first commit" },
    { message: "second commit" }
  ] as unknown as import("../../src/types").GitCommitNode[];
  const MOCK_LOOKUP: { [hash: string]: number } = {
    parent1234567890: 0,
    parent2234567890: 1
  };

  function setupViewState(overrides?: Partial<{ recordOrigin: boolean; noCommit: boolean }>) {
    (globalThis as Record<string, unknown>).viewState = {
      dialogDefaults: {
        merge: { noFastForward: true, squashCommits: false, noCommit: false },
        cherryPick: { recordOrigin: false, noCommit: false, ...overrides },
        stashUncommittedChanges: { includeUntracked: false },
        createWorktree: { openTerminal: true },
        removeWorktree: { deleteBranch: true }
      }
    };
  }

  function getCherryPickItem(parentHashes: string[] = PARENT_HASHES): ContextMenuItem {
    const items = buildCommitContextMenuItems(
      REPO,
      HASH,
      parentHashes,
      MOCK_COMMITS,
      MOCK_LOOKUP,
      createMockElement()
    );
    return findTopLevelMenuItem(items, "Cherry Pick&#8230;");
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupViewState();
  });

  it("normal commit shows showFormDialog with 2 checkboxes (TC-016)", () => {
    // Given: A commit with a single parent
    const item = getCherryPickItem(PARENT_HASHES);

    // When: Cherry Pick is clicked
    item.onClick();

    // Then: showFormDialog is called with 2 checkbox inputs
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect(inputs).toHaveLength(2);
    expect(inputs[0].type).toBe("checkbox");
    expect(inputs[1].type).toBe("checkbox");
  });

  it("merge commit shows showFormDialog with select + 2 checkboxes (TC-017)", () => {
    // Given: A merge commit with multiple parents
    const item = getCherryPickItem(MERGE_PARENT_HASHES);

    // When: Cherry Pick is clicked
    item.onClick();

    // Then: showFormDialog is called with 1 select + 2 checkbox inputs
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect(inputs).toHaveLength(3);
    expect(inputs[0].type).toBe("select");
    expect(inputs[1].type).toBe("checkbox");
    expect(inputs[2].type).toBe("checkbox");
  });

  it("Record Origin checkbox defaults to viewState.dialogDefaults.cherryPick.recordOrigin (TC-018)", () => {
    // Given: viewState.dialogDefaults.cherryPick.recordOrigin = true
    setupViewState({ recordOrigin: true });
    const item = getCherryPickItem(PARENT_HASHES);

    // When: Cherry Pick is clicked
    item.onClick();

    // Then: Record Origin checkbox value is true
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect((inputs[0] as DialogCheckboxInput).value).toBe(true);
  });

  it("No Commit checkbox defaults to viewState.dialogDefaults.cherryPick.noCommit (TC-019)", () => {
    // Given: viewState.dialogDefaults.cherryPick.noCommit = true
    setupViewState({ noCommit: true });
    const item = getCherryPickItem(PARENT_HASHES);

    // When: Cherry Pick is clicked
    item.onClick();

    // Then: No Commit checkbox value is true
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect((inputs[1] as DialogCheckboxInput).value).toBe(true);
  });

  it("callback sends RequestCherrypickCommit with recordOrigin and noCommit (TC-020)", () => {
    // Given: Cherry Pick dialog is shown for normal commit
    const item = getCherryPickItem(PARENT_HASHES);
    item.onClick();

    // When: form is submitted with both options checked
    const actioned = vi.mocked(showFormDialog).mock.calls[0][3];
    actioned(["checked", "checked"]);

    // Then: sendMessage includes recordOrigin=true and noCommit=true
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      command: "cherrypickCommit",
      repo: REPO,
      commitHash: HASH,
      parentIndex: 0,
      recordOrigin: true,
      noCommit: true
    });
  });

  it("both checkboxes have info tooltip text (TC-021)", () => {
    // Given: Cherry Pick menu item
    const item = getCherryPickItem(PARENT_HASHES);

    // When: Cherry Pick is clicked
    item.onClick();

    // Then: both checkboxes have info properties with tooltip text
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    const recordOriginInput = inputs[0] as DialogCheckboxInput;
    const noCommitInput = inputs[1] as DialogCheckboxInput;
    expect(recordOriginInput.info).toBeDefined();
    expect(recordOriginInput.info).toContain("origin of the cherry pick");
    expect(noCommitInput.info).toBeDefined();
    expect(noCommitInput.info).toContain("staged but not committed");
  });
});

// --- S4: Create Worktree Here ダイアログ ---

describe("Create Worktree Here dialog (S4)", () => {
  const DEFAULT_DIALOG_DEFAULTS = {
    merge: { noFastForward: true, squashCommits: false, noCommit: false },
    cherryPick: { recordOrigin: false, noCommit: false },
    stashUncommittedChanges: { includeUntracked: false },
    createWorktree: { openTerminal: true },
    removeWorktree: { deleteBranch: true }
  };

  function setupViewState(overrides?: Partial<typeof DEFAULT_DIALOG_DEFAULTS.createWorktree>) {
    (globalThis as Record<string, unknown>).viewState = {
      dialogDefaults: {
        ...DEFAULT_DIALOG_DEFAULTS,
        createWorktree: { ...DEFAULT_DIALOG_DEFAULTS.createWorktree, ...overrides }
      }
    };
  }

  function getCreateWorktreeItem(): ContextMenuItem {
    const items = buildCommitContextMenuItems(
      REPO,
      HASH,
      PARENT_HASHES,
      [],
      {},
      createMockElement()
    );
    return findTopLevelMenuItem(items, "Create Worktree Here&#8230;");
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupViewState();
  });

  it("calls showFormDialog with text-ref + text + checkbox (3 fields) (TC-022)", () => {
    // Given: Create Worktree Here menu item exists
    const item = getCreateWorktreeItem();

    // When: onClick is triggered
    item.onClick();

    // Then: showFormDialog is called with 3 form inputs
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect(inputs).toHaveLength(3);
    expect(inputs[0].type).toBe("text-ref");
    expect(inputs[1].type).toBe("text");
    expect(inputs[2].type).toBe("checkbox");
  });

  it("Branch Name has empty default enabling text-ref validation (TC-023)", () => {
    // Given: Create Worktree Here menu item
    const item = getCreateWorktreeItem();

    // When: onClick is triggered
    item.onClick();

    // Then: Branch Name (text-ref) has empty default — empty triggers validation block
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect(inputs[0].type).toBe("text-ref");
    expect(inputs[0].default).toBe("");
  });

  it("Path defaults to '../<repoName>-' format (TC-024)", () => {
    // Given: repo is "/test/repo" → repoName = "repo"
    const item = getCreateWorktreeItem();

    // When: onClick is triggered
    item.onClick();

    // Then: Path field default is "../repo-"
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect(inputs[1].default).toBe("../repo-");
  });

  it("Open Terminal checkbox reflects dialogDefaults.createWorktree.openTerminal=true (TC-025/TC-029)", () => {
    // Given: viewState.dialogDefaults.createWorktree.openTerminal = true
    setupViewState({ openTerminal: true });
    const item = getCreateWorktreeItem();

    // When: Create Worktree Here menu item onClick is triggered
    item.onClick();

    // Then: Open Terminal checkbox value is true
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect((inputs[2] as DialogCheckboxInput).value).toBe(true);
  });

  it("Open Terminal checkbox reflects dialogDefaults.createWorktree.openTerminal=false (TC-030)", () => {
    // Given: viewState.dialogDefaults.createWorktree.openTerminal = false
    setupViewState({ openTerminal: false });
    const item = getCreateWorktreeItem();

    // When: Create Worktree Here menu item onClick is triggered
    item.onClick();

    // Then: Open Terminal checkbox value is false
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect((inputs[2] as DialogCheckboxInput).value).toBe(false);
  });

  it("sends RequestCreateWorktree with all fields on submit (TC-026)", () => {
    // Given: Create Worktree Here dialog is shown
    const item = getCreateWorktreeItem();
    item.onClick();

    // When: form is submitted with valid values
    const actioned = vi.mocked(showFormDialog).mock.calls[0][3];
    actioned(["feature/wt", "../repo-feature/wt", "checked"]);

    // Then: sendMessage is called with createWorktree command and all fields
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      command: "createWorktree",
      repo: REPO,
      path: "../repo-feature/wt",
      branchName: "feature/wt",
      commitHash: HASH,
      openTerminal: true
    });
  });

  it("afterCreate callback updates Path dynamically when Branch Name changes (TC-027)", () => {
    // Given: Create Worktree Here dialog is shown
    const item = getCreateWorktreeItem();
    item.onClick();

    const afterCreate = vi.mocked(showFormDialog).mock.calls[0][5];
    expect(afterCreate).toBeDefined();

    // Set up mock dialog elements
    const mockBranchInput = { value: "", addEventListener: vi.fn() } as unknown as HTMLInputElement;
    const mockPathInput = { value: "../repo-" } as unknown as HTMLInputElement;
    const mockDialogEl = {
      querySelector: vi.fn((selector: string) => {
        if (selector === "#dialogInput0") return mockBranchInput;
        if (selector === "#dialogInput1") return mockPathInput;
        return null;
      })
    } as unknown as HTMLElement;

    afterCreate!(mockDialogEl);

    // When: Branch Name input event is triggered with "my-branch"
    const inputHandler = mockBranchInput.addEventListener.mock.calls.find(
      (call: unknown[]) => call[0] === "input"
    )![1] as () => void;
    (mockBranchInput as { value: string }).value = "my-branch";
    inputHandler();

    // Then: Path is updated to "../repo-my-branch"
    expect(mockPathInput.value).toBe("../repo-my-branch");
  });

  it("afterCreate callback stops Path updates after manual Path edit (TC-028)", () => {
    // Given: Create Worktree Here dialog is shown
    const item = getCreateWorktreeItem();
    item.onClick();

    const afterCreate = vi.mocked(showFormDialog).mock.calls[0][5];
    expect(afterCreate).toBeDefined();

    const mockBranchInput = { value: "", addEventListener: vi.fn() } as unknown as HTMLInputElement;
    const mockPathInput = { value: "../repo-" } as unknown as HTMLInputElement;
    const mockDialogEl = {
      querySelector: vi.fn((selector: string) => {
        if (selector === "#dialogInput0") return mockBranchInput;
        if (selector === "#dialogInput1") return mockPathInput;
        return null;
      })
    } as unknown as HTMLElement;

    afterCreate!(mockDialogEl);

    const inputHandler = mockBranchInput.addEventListener.mock.calls.find(
      (call: unknown[]) => call[0] === "input"
    )![1] as () => void;

    // When: User manually edits Path to a custom value
    (mockPathInput as { value: string }).value = "/custom/path";
    (mockBranchInput as { value: string }).value = "new-branch";
    inputHandler();

    // Then: Path remains unchanged (manual edit detected, auto-update stopped)
    expect(mockPathInput.value).toBe("/custom/path");
  });
});

describe("Create Worktree Here path normalization (S6)", () => {
  const DEFAULT_DIALOG_DEFAULTS = {
    merge: { noFastForward: true, squashCommits: false, noCommit: false },
    cherryPick: { recordOrigin: false, noCommit: false },
    stashUncommittedChanges: { includeUntracked: false },
    createWorktree: { openTerminal: true },
    removeWorktree: { deleteBranch: true }
  };

  function setupViewState() {
    (globalThis as Record<string, unknown>).viewState = {
      dialogDefaults: DEFAULT_DIALOG_DEFAULTS
    };
  }

  function getCreateWorktreeItem(): ContextMenuItem {
    const items = buildCommitContextMenuItems(
      REPO,
      HASH,
      PARENT_HASHES,
      [],
      {},
      createMockElement()
    );
    return findTopLevelMenuItem(items, "Create Worktree Here&#8230;");
  }

  function setupPathAutoUpdateHarness() {
    const item = getCreateWorktreeItem();
    item.onClick();

    const afterCreate = vi.mocked(showFormDialog).mock.calls[0][5];
    expect(afterCreate).toBeDefined();

    const addEventListener = vi.fn();
    const mockBranchInput = {
      value: "",
      addEventListener
    } as unknown as HTMLInputElement & { value: string };
    const mockPathInput = { value: "../repo-" } as unknown as HTMLInputElement & {
      value: string;
    };
    const mockDialogEl = {
      querySelector: vi.fn((selector: string) => {
        if (selector === "#dialogInput0") return mockBranchInput;
        if (selector === "#dialogInput1") return mockPathInput;
        return null;
      })
    } as unknown as HTMLElement;

    afterCreate!(mockDialogEl);

    const inputListenerCall = addEventListener.mock.calls.find((call) => call[0] === "input");
    expect(inputListenerCall).toBeDefined();

    return {
      mockBranchInput,
      mockPathInput,
      inputHandler: inputListenerCall![1] as () => void
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupViewState();
  });

  it("updates Path with a normalized branch name for feature/x (TC-031)", () => {
    // Given: Create Worktree Here dialog is shown and Path has not been edited
    const { inputHandler, mockBranchInput, mockPathInput } = setupPathAutoUpdateHarness();

    // When: Branch Name is changed to "feature/x"
    mockBranchInput.value = "feature/x";
    inputHandler();

    // Then: Path is updated to the normalized default path
    expect(mockPathInput.value).toBe("../repo-feature-x");
    expect(vi.mocked(sanitizeBranchNameForPath)).toHaveBeenCalledWith("feature/x");
  });

  it("updates Path with normalized nested segments for a/b/c (TC-032)", () => {
    // Given: Create Worktree Here dialog is shown and Path has not been edited
    const { inputHandler, mockBranchInput, mockPathInput } = setupPathAutoUpdateHarness();

    // When: Branch Name is changed to "a/b/c"
    mockBranchInput.value = "a/b/c";
    inputHandler();

    // Then: Path is updated using the normalized nested branch name
    expect(mockPathInput.value).toBe("../repo-a-b-c");
    expect(vi.mocked(sanitizeBranchNameForPath)).toHaveBeenCalledWith("a/b/c");
  });

  it("uses the normalized previous branch name when deciding whether Path was manually edited (TC-033)", () => {
    // Given: Create Worktree Here dialog is shown and Path is still following automatic updates
    const { inputHandler, mockBranchInput, mockPathInput } = setupPathAutoUpdateHarness();
    mockBranchInput.value = "a/b";
    inputHandler();

    // When: Branch Name changes again from "a/b" to "c/d"
    mockBranchInput.value = "c/d";
    inputHandler();

    // Then: Path continues to auto-update because the previous normalized path matched
    expect(mockPathInput.value).toBe("../repo-c-d");
    expect(vi.mocked(sanitizeBranchNameForPath)).toHaveBeenCalledWith("");
    expect(vi.mocked(sanitizeBranchNameForPath)).toHaveBeenCalledWith("a/b");
    expect(vi.mocked(sanitizeBranchNameForPath)).toHaveBeenCalledWith("c/d");
  });

  it("preserves a manually edited Path after normalization has already run (TC-034)", () => {
    // Given: Create Worktree Here dialog auto-updated Path once, then the user edited Path manually
    const { inputHandler, mockBranchInput, mockPathInput } = setupPathAutoUpdateHarness();
    mockBranchInput.value = "feature/x";
    inputHandler();
    mockPathInput.value = "/custom/path";

    // When: Branch Name changes again to another slash-containing value
    mockBranchInput.value = "other/branch";
    inputHandler();

    // Then: the manually edited Path is preserved instead of being overwritten
    expect(mockPathInput.value).toBe("/custom/path");
  });
});

describe("Commit context menu structure (S7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("TC-035: returns the new top-level order for a regular commit", () => {
    // Case: TC-035
    // Given: a regular commit with one parent
    const items = buildCommitContextMenuItems(
      REPO,
      HASH,
      PARENT_HASHES,
      [],
      {},
      createMockElement()
    );

    // When: the menu array is built

    // Then: the top-level items follow the new layout
    expect(items).toHaveLength(8);
    expect(items[0]?.title).toBe("Create Branch&#8230;");
    expect(items[1]?.title).toBe("Create Worktree Here&#8230;");
    expect(items[2]?.title).toBe("Cherry Pick&#8230;");
    expect(items[3]?.title).toBe("Merge into current branch&#8230;");
    expect(items[4]).toBeNull();
    expect(items[6]).toBeNull();
    expect(items[7]?.title).toBe("Copy Commit Hash to Clipboard");
  });

  it("TC-036: stores Add Tag, Checkout, Revert, and Reset inside the More submenu", () => {
    // Case: TC-036
    // Given: a regular commit menu
    const items = buildCommitContextMenuItems(
      REPO,
      HASH,
      PARENT_HASHES,
      [],
      {},
      createMockElement()
    );

    // When: the More submenu is inspected
    const moreItem = getMoreSubmenu(items);

    // Then: submenu items appear in the expected order
    expect(moreItem.submenu.map((item) => item?.title ?? null)).toEqual([
      "Add Tag&#8230;",
      "Checkout&#8230;",
      "Revert&#8230;",
      "Reset current branch to this Commit&#8230;"
    ]);
  });

  it("TC-037: merge-commit submenu actions preserve their existing dialog paths", () => {
    // Case: TC-037
    // Given: a merge commit with two parents
    const mergeParentHashes = ["parent1234567890", "parent2234567890"];
    const commits = [
      { message: "first commit" },
      { message: "second commit" }
    ] as unknown as import("../../src/types").GitCommitNode[];
    const lookup = { parent1234567890: 0, parent2234567890: 1 };
    const items = buildCommitContextMenuItems(
      REPO,
      HASH,
      mergeParentHashes,
      commits,
      lookup,
      createMockElement()
    );

    // When: Cherry Pick and Revert are triggered from their new locations
    findTopLevelMenuItem(items, "Cherry Pick&#8230;").onClick();
    findSubmenuItem(items, "Revert&#8230;").onClick();

    // Then: merge-specific dialog flows are still used
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    expect(showSelectDialog).toHaveBeenCalledTimes(1);
  });

  it("TC-038: avoids consecutive dividers and nulls at either end", () => {
    // Case: TC-038
    // Given: a regular commit menu
    const items = buildCommitContextMenuItems(
      REPO,
      HASH,
      PARENT_HASHES,
      [],
      {},
      createMockElement()
    );

    // When: divider placement is scanned
    const hasInvalidDividers = items.some(
      (item, index) =>
        item === null && (index === 0 || index === items.length - 1 || items[index + 1] === null)
    );

    // Then: there are no leading, trailing, or consecutive dividers
    expect(hasInvalidDividers).toBe(false);
  });
});

describe("Commit recent action metadata (S8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("assigns recentActionId to the supported top-level actions (TC-039)", () => {
    // Case: TC-039
    // Given: a regular commit menu
    const items = buildCommitContextMenuItems(
      REPO,
      HASH,
      PARENT_HASHES,
      [],
      {},
      createMockElement()
    );

    // When: supported top-level actions are inspected

    // Then: each supported action exposes the expected recentActionId
    expect(findTopLevelMenuItem(items, "Create Branch&#8230;").recentActionId).toBe(
      "commit.createBranch"
    );
    expect(findTopLevelMenuItem(items, "Create Worktree Here&#8230;").recentActionId).toBe(
      "commit.createWorktree"
    );
    expect(findTopLevelMenuItem(items, "Cherry Pick&#8230;").recentActionId).toBe(
      "commit.cherryPick"
    );
    expect(findTopLevelMenuItem(items, "Merge into current branch&#8230;").recentActionId).toBe(
      "commit.merge"
    );
  });

  it("assigns recentActionId to Add Tag and Reset inside the More submenu (TC-040)", () => {
    // Case: TC-040
    // Given: a regular commit menu
    const items = buildCommitContextMenuItems(
      REPO,
      HASH,
      PARENT_HASHES,
      [],
      {},
      createMockElement()
    );

    // When: submenu actions are inspected
    const addTagItem = findSubmenuItem(items, "Add Tag&#8230;");
    const checkoutItem = findSubmenuItem(items, "Checkout&#8230;");
    const revertItem = findSubmenuItem(items, "Revert&#8230;");
    const resetItem = findSubmenuItem(items, "Reset current branch to this Commit&#8230;");

    // Then: Add Tag and Reset are recent-enabled, the rest are not
    expect(addTagItem.recentActionId).toBe("commit.addTag");
    expect(checkoutItem.recentActionId).toBeUndefined();
    expect(revertItem.recentActionId).toBeUndefined();
    expect(resetItem.recentActionId).toBe("commit.resetToCommit");
  });

  it("records the recent action before sending Create Branch on submit (TC-041)", () => {
    // Case: TC-041
    // Given: the Create Branch dialog has been opened
    const item = getCreateBranchItem();
    item.onClick();

    // When: the dialog callback is submitted
    const actioned = vi.mocked(showFormDialog).mock.calls[0][3];
    actioned(["feature/recent", "checked"]);

    // Then: recordRecentAction is called before sendMessage with the matching id
    expect(recordRecentAction).toHaveBeenCalledWith(REPO, "commit.createBranch");
    expect(sendMessage).toHaveBeenCalledWith({
      command: "createBranch",
      repo: REPO,
      branchName: "feature/recent",
      commitHash: HASH,
      checkout: true
    });
    expect(vi.mocked(recordRecentAction).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(sendMessage).mock.invocationCallOrder[0]
    );
  });

  it("uses the commit-origin translation key for the Create Branch dialog prompt (TC-043)", () => {
    // Case: TC-043
    // Given: Create Branch menu item for a commit, Japanese translations injected
    const messages = (globalThis as Record<string, unknown>).webviewMessages as Record<
      string,
      string
    >;
    const commitKey = "Enter the name of the branch you would like to create from commit {0}:";
    messages[commitKey] = "コミット {0} から作成するブランチ名を入力してください:";

    try {
      const item = getCreateBranchItem();

      // When: onClick is triggered
      item.onClick();

      // Then: showFormDialog is called with the Japanese commit-origin prompt
      expect(showFormDialog).toHaveBeenCalledTimes(1);
      const promptArg = (showFormDialog as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(promptArg).toContain("コミット");
      expect(promptArg).toContain("作成するブランチ名を入力してください");
    } finally {
      delete messages[commitKey];
    }
  });

  it("does not record a recent action until the Add Tag dialog is submitted (TC-042)", () => {
    // Case: TC-042
    // Given: the Add Tag dialog is opened from the submenu
    const items = buildCommitContextMenuItems(
      REPO,
      HASH,
      PARENT_HASHES,
      [],
      {},
      createMockElement()
    );
    const addTagItem = findSubmenuItem(items, "Add Tag&#8230;");

    // When: the menu item is clicked but the submit callback is not invoked
    addTagItem.onClick();

    // Then: the dialog opens without recording the action yet
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    expect(recordRecentAction).not.toHaveBeenCalled();
  });
});

// --- S10: merge parent option plain text 生成 (Feature 041) ---

describe("merge parent option plain text generation (S10)", () => {
  const MERGE_PARENT_HASHES = ["parent1234567890", "parent2234567890"];

  function setupViewState() {
    (globalThis as Record<string, unknown>).viewState = {
      dialogDefaults: {
        merge: { noFastForward: true, squashCommits: false, noCommit: false },
        cherryPick: { recordOrigin: false, noCommit: false },
        stashUncommittedChanges: { includeUntracked: false },
        createWorktree: { openTerminal: true },
        removeWorktree: { deleteBranch: true }
      }
    };
  }

  function getCherryPickItem(
    parentHashes: string[],
    commits: import("../../src/types").GitCommitNode[],
    lookup: { [hash: string]: number }
  ): ContextMenuItem {
    const items = buildCommitContextMenuItems(
      REPO,
      HASH,
      parentHashes,
      commits,
      lookup,
      createMockElement()
    );
    return findTopLevelMenuItem(items, "Cherry Pick&#8230;");
  }

  function getRevertItem(
    parentHashes: string[],
    commits: import("../../src/types").GitCommitNode[],
    lookup: { [hash: string]: number }
  ): ContextMenuItem {
    const items = buildCommitContextMenuItems(
      REPO,
      HASH,
      parentHashes,
      commits,
      lookup,
      createMockElement()
    );
    return findSubmenuItem(items, "Revert&#8230;");
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupViewState();
  });

  // Case: TC-044
  it("emits `<hash>: <message>` for parents present in commitLookup (TC-044)", () => {
    // Given: both parents are present in commitLookup with messages
    const commits = [
      { message: "first commit" },
      { message: "second commit" }
    ] as unknown as import("../../src/types").GitCommitNode[];
    const lookup = { parent1234567890: 0, parent2234567890: 1 };

    // When: Cherry Pick is clicked on the merge commit
    getCherryPickItem(MERGE_PARENT_HASHES, commits, lookup).onClick();

    // Then: the select options contain the abbreviated hash and message
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    const selectInput = inputs[0] as DialogSelectInput;
    expect(selectInput.options).toEqual([
      { name: "parent12: first commit", value: "1" },
      { name: "parent22: second commit", value: "2" }
    ]);
  });

  // Case: TC-045
  it("falls back to abbreviated hash only when commitLookup is missing the parent (TC-045)", () => {
    // Given: only one of the parents has an entry in commitLookup
    const commits = [
      { message: "first commit" }
    ] as unknown as import("../../src/types").GitCommitNode[];
    const lookup = { parent1234567890: 0 };

    // When: Cherry Pick is clicked on the merge commit
    getCherryPickItem(MERGE_PARENT_HASHES, commits, lookup).onClick();

    // Then: the missing parent's option has no `: <message>` suffix
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    const selectInput = inputs[0] as DialogSelectInput;
    expect(selectInput.options).toEqual([
      { name: "parent12: first commit", value: "1" },
      { name: "parent22", value: "2" }
    ]);
  });

  // Case: TC-046
  it("passes hostile parent messages through as plain text without escaping (TC-046)", () => {
    // Given: parent messages contain HTML injection payloads
    const hostile1 = "<img src=x onerror=alert(1)>";
    const hostile2 = "</option><script>alert(2)</script>";
    const commits = [
      { message: hostile1 },
      { message: hostile2 }
    ] as unknown as import("../../src/types").GitCommitNode[];
    const lookup = { parent1234567890: 0, parent2234567890: 1 };

    // When: Cherry Pick is invoked
    getCherryPickItem(MERGE_PARENT_HASHES, commits, lookup).onClick();
    const cherryInputs = vi.mocked(showFormDialog).mock.calls[0][1];
    const cherrySelect = cherryInputs[0] as DialogSelectInput;

    // Then: the options carry the message as plain text (no HTML escaping by the helper)
    expect(cherrySelect.options[0].name).toBe(`parent12: ${hostile1}`);
    expect(cherrySelect.options[1].name).toBe(`parent22: ${hostile2}`);

    // When: Revert is invoked for the same merge commit
    vi.clearAllMocks();
    getRevertItem(MERGE_PARENT_HASHES, commits, lookup).onClick();

    // Then: showSelectDialog receives the same plain text option array
    const revertOptions = vi.mocked(showSelectDialog).mock.calls[0][2];
    expect(revertOptions[0].name).toBe(`parent12: ${hostile1}`);
    expect(revertOptions[1].name).toBe(`parent22: ${hostile2}`);
  });

  // Case: TC-047
  it("cherry-pick and revert share the same parent option generator output (TC-047)", () => {
    // Given: identical inputs for both flows
    const commits = [
      { message: "msg-a" },
      { message: "msg-b" }
    ] as unknown as import("../../src/types").GitCommitNode[];
    const lookup = { parent1234567890: 0, parent2234567890: 1 };

    // When: cherry-pick and revert are invoked for the same merge commit
    getCherryPickItem(MERGE_PARENT_HASHES, commits, lookup).onClick();
    const cherryInputs = vi.mocked(showFormDialog).mock.calls[0][1];
    const cherrySelect = cherryInputs[0] as DialogSelectInput;

    vi.clearAllMocks();
    getRevertItem(MERGE_PARENT_HASHES, commits, lookup).onClick();
    const revertOptions = vi.mocked(showSelectDialog).mock.calls[0][2];

    // Then: both option arrays are deep-equal (helper reuse)
    expect(revertOptions).toEqual(cherrySelect.options);
  });
});

// --- S11: Cherry Pick / Revert の root commit 分岐（parentHashes.length <= 1） ---
// @see docs/testing/perspectives/web/commitMenu-test.md
describe("root commit cherry-pick/revert branch (S11)", () => {
  const ROOT_PARENT_HASHES: string[] = [];
  const MERGE_PARENT_HASHES = ["parent1234567890", "parent2234567890"];
  const MERGE_COMMITS = [
    { message: "msg-a" },
    { message: "msg-b" }
  ] as unknown as import("../../src/types").GitCommitNode[];
  const MERGE_LOOKUP = { parent1234567890: 0, parent2234567890: 1 };

  function setupViewState(): void {
    (globalThis as Record<string, unknown>).viewState = {
      dialogDefaults: {
        merge: { noFastForward: true, squashCommits: false, noCommit: false },
        cherryPick: { recordOrigin: false, noCommit: false },
        stashUncommittedChanges: { includeUntracked: false },
        createWorktree: { openTerminal: true },
        removeWorktree: { deleteBranch: true }
      }
    };
  }

  function buildItems(parentHashes: string[]): ContextMenuElement[] {
    return buildCommitContextMenuItems(
      REPO,
      HASH,
      parentHashes,
      parentHashes.length > 1 ? MERGE_COMMITS : [],
      parentHashes.length > 1 ? MERGE_LOOKUP : {},
      createMockElement()
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupViewState();
  });

  it("shows a checkbox-only form and sends parentIndex 0 for a root-commit cherry pick (TC-048)", () => {
    // Case: TC-048
    // Given: a root commit with no parents
    const cherryPickItem = findTopLevelMenuItem(
      buildItems(ROOT_PARENT_HASHES),
      "Cherry Pick&#8230;"
    );

    // When: Cherry Pick is clicked and the dialog is submitted
    cherryPickItem.onClick();

    // Then: showFormDialog receives 2 checkboxes and no select, and the payload carries parentIndex 0
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect(inputs).toHaveLength(2);
    expect(inputs[0].type).toBe("checkbox");
    expect(inputs[1].type).toBe("checkbox");
    const actioned = vi.mocked(showFormDialog).mock.calls[0][3];
    actioned(["checked", "unchecked"]);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      command: "cherrypickCommit",
      repo: REPO,
      commitHash: HASH,
      parentIndex: 0,
      recordOrigin: true,
      noCommit: false
    });
  });

  it("shows a confirmation dialog and sends parentIndex 0 for a root-commit revert (TC-049)", () => {
    // Case: TC-049
    // Given: a root commit with no parents
    const revertItem = findSubmenuItem(buildItems(ROOT_PARENT_HASHES), "Revert&#8230;");

    // When: Revert is clicked and the confirmation is accepted
    revertItem.onClick();

    // Then: showConfirmationDialog runs (no select-bearing form dialog) and parentIndex 0 is sent
    expect(showConfirmationDialog).toHaveBeenCalledTimes(1);
    expect(showFormDialog).not.toHaveBeenCalled();
    expect(showSelectDialog).not.toHaveBeenCalled();
    const confirmed = vi.mocked(showConfirmationDialog).mock.calls[0][1];
    confirmed();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      command: "revertCommit",
      repo: REPO,
      commitHash: HASH,
      parentIndex: 0
    });
  });

  it("keeps the parent select with two options for a two-parent merge cherry pick (TC-050)", () => {
    // Case: TC-050
    // Given: a merge commit with two parents
    const cherryPickItem = findTopLevelMenuItem(
      buildItems(MERGE_PARENT_HASHES),
      "Cherry Pick&#8230;"
    );

    // When: Cherry Pick is clicked and the second parent is selected on submit
    cherryPickItem.onClick();

    // Then: the form keeps a 2-option select plus 2 checkboxes and the selection reaches parentIndex
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect(inputs).toHaveLength(3);
    const select = inputs[0] as DialogSelectInput;
    expect(select.type).toBe("select");
    expect(select.options).toHaveLength(2);
    expect(inputs[1].type).toBe("checkbox");
    expect(inputs[2].type).toBe("checkbox");
    const actioned = vi.mocked(showFormDialog).mock.calls[0][3];
    actioned(["2", "checked", "unchecked"]);
    expect(sendMessage).toHaveBeenCalledWith({
      command: "cherrypickCommit",
      repo: REPO,
      commitHash: HASH,
      parentIndex: 2,
      recordOrigin: true,
      noCommit: false
    });
  });
});
