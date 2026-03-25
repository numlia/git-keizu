// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../web/dialogs", () => ({
  showCheckboxDialog: vi.fn(),
  showConfirmationDialog: vi.fn(),
  showFormDialog: vi.fn(),
  showSelectDialog: vi.fn()
}));

vi.mock("../../web/utils", () => ({
  abbrevCommit: vi.fn((h: string) => h.substring(0, 8)),
  escapeHtml: vi.fn((str: string) => str),
  sendMessage: vi.fn(),
  getRepoName: vi.fn((repoPath: string) => {
    const i = Math.max(repoPath.lastIndexOf("/"), repoPath.lastIndexOf("\\"));
    return i >= 0 ? repoPath.substring(i + 1) : repoPath;
  }),
  ELLIPSIS: "&#8230;"
}));

import { buildCommitContextMenuItems } from "../../web/commitMenu";
import { showFormDialog } from "../../web/dialogs";
import { sendMessage } from "../../web/utils";

const REPO = "/test/repo";
const HASH = "abc1234567890def";
const PARENT_HASHES = ["parent1234567890"];

function createMockElement(): HTMLElement {
  return document.createElement("div");
}

function getCreateBranchItem() {
  const items = buildCommitContextMenuItems(REPO, HASH, PARENT_HASHES, [], {}, createMockElement());
  // "Create Branch..." is the second item (index 1)
  return items[1]!;
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

  function getMergeItem() {
    const items = buildCommitContextMenuItems(
      REPO,
      HASH,
      PARENT_HASHES,
      [],
      {},
      createMockElement()
    );
    // "Merge into current branch..." is after the second null separator
    return items.find((item) => item !== null && item.title.includes("Merge into current branch"))!;
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

  function getCherryPickItem(parentHashes: string[] = PARENT_HASHES) {
    const items = buildCommitContextMenuItems(
      REPO,
      HASH,
      parentHashes,
      MOCK_COMMITS,
      MOCK_LOOKUP,
      createMockElement()
    );
    return items.find((item) => item !== null && item.title.includes("Cherry Pick"))!;
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

  function getCreateWorktreeItem() {
    const items = buildCommitContextMenuItems(
      REPO,
      HASH,
      PARENT_HASHES,
      [],
      {},
      createMockElement()
    );
    return items.find((item) => item !== null && item.title.includes("Create Worktree Here"))!;
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
