// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../web/dialogs", () => ({
  showRefInputDialog: vi.fn(),
  showConfirmationDialog: vi.fn(),
  showCheckboxDialog: vi.fn(),
  showFormDialog: vi.fn(),
  showActionRunningDialog: vi.fn()
}));

vi.mock("../../web/utils", () => ({
  escapeHtml: vi.fn((str: string) => str),
  sendMessage: vi.fn(),
  getRepoName: vi.fn((repoPath: string) => {
    const sep = Math.max(repoPath.lastIndexOf("/"), repoPath.lastIndexOf("\\"));
    return sep >= 0 ? repoPath.substring(sep + 1) : repoPath;
  }),
  svgIcons: { alert: "<svg>alert</svg>" },
  ELLIPSIS: "&#8230;"
}));

import {
  showCheckboxDialog,
  showConfirmationDialog,
  showFormDialog,
  showRefInputDialog
} from "../../web/dialogs";
import { buildRefContextMenuItems, checkoutBranchAction, parseRemoteRef } from "../../web/refMenu";
import { getRepoName, sendMessage } from "../../web/utils";

function createMockElement(classes: string[]): HTMLElement {
  const classList = {
    contains: (cls: string) => classes.includes(cls)
  };
  return { classList } as unknown as HTMLElement;
}

const REPO = "/test/repo";

describe("checkoutBranchAction branch name suggestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("suggests 'feature/ebook' from 'origin/feature/ebook' (TC-001)", () => {
    // Given: A remote branch ref "origin/feature/ebook" with isRemoteCombined=true
    const sourceElem = createMockElement(["remote"]);

    // When: checkoutBranchAction is called for a remote combined branch
    checkoutBranchAction(REPO, sourceElem, "origin/feature/ebook", true);

    // Then: showRefInputDialog is called with "feature/ebook" as default branch name
    expect(showRefInputDialog).toHaveBeenCalledTimes(1);
    const defaultBranchName = (showRefInputDialog as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(defaultBranchName).toBe("feature/ebook");
  });

  it("suggests 'main' from 'origin/main' (TC-002)", () => {
    // Given: A remote branch ref "origin/main"
    const sourceElem = createMockElement(["remote"]);

    // When: checkoutBranchAction is called
    checkoutBranchAction(REPO, sourceElem, "origin/main", true);

    // Then: showRefInputDialog is called with "main" as default branch name
    expect(showRefInputDialog).toHaveBeenCalledTimes(1);
    const defaultBranchName = (showRefInputDialog as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(defaultBranchName).toBe("main");
  });

  it("suggests 'a/b/c' from 'origin/a/b/c' for deep nesting (TC-003)", () => {
    // Given: A deeply nested remote branch ref "origin/a/b/c"
    const sourceElem = createMockElement(["remote"]);

    // When: checkoutBranchAction is called
    checkoutBranchAction(REPO, sourceElem, "origin/a/b/c", true);

    // Then: showRefInputDialog is called with "a/b/c" preserving full hierarchy
    expect(showRefInputDialog).toHaveBeenCalledTimes(1);
    const defaultBranchName = (showRefInputDialog as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(defaultBranchName).toBe("a/b/c");
  });

  it("suggests 'feature/x' from 'upstream/feature/x' for non-origin remote (TC-004)", () => {
    // Given: A remote branch ref from "upstream" remote
    const sourceElem = createMockElement(["remote"]);

    // When: checkoutBranchAction is called
    checkoutBranchAction(REPO, sourceElem, "upstream/feature/x", true);

    // Then: showRefInputDialog is called with "feature/x" (upstream prefix removed)
    expect(showRefInputDialog).toHaveBeenCalledTimes(1);
    const defaultBranchName = (showRefInputDialog as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(defaultBranchName).toBe("feature/x");
  });

  it("uses full refName when no slash is present (TC-005)", () => {
    // Given: A branch ref "origin" with no slash (edge case, should not normally occur)
    const sourceElem = createMockElement(["remote"]);

    // When: checkoutBranchAction is called
    checkoutBranchAction(REPO, sourceElem, "origin", true);

    // Then: showRefInputDialog is called with "origin" as-is (no slash to split on)
    expect(showRefInputDialog).toHaveBeenCalledTimes(1);
    const defaultBranchName = (showRefInputDialog as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(defaultBranchName).toBe("origin");
  });

  it("suggests 'x' from 'o/x' for minimal path (TC-006)", () => {
    // Given: A minimal remote branch ref "o/x" (1-char remote + 1-char branch)
    const sourceElem = createMockElement(["remote"]);

    // When: checkoutBranchAction is called
    checkoutBranchAction(REPO, sourceElem, "o/x", true);

    // Then: showRefInputDialog is called with "x" as default branch name
    expect(showRefInputDialog).toHaveBeenCalledTimes(1);
    const defaultBranchName = (showRefInputDialog as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(defaultBranchName).toBe("x");
  });
});

describe("checkoutBranchAction local branch checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends checkoutBranch message directly for local head branch", () => {
    // Given: A local branch element with "head" class (not remote)
    const sourceElem = createMockElement(["head"]);

    // When: checkoutBranchAction is called without isRemoteCombined
    checkoutBranchAction(REPO, sourceElem, "feature/local");

    // Then: sendMessage is called directly without dialog, with remoteBranch=null
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      command: "checkoutBranch",
      repo: REPO,
      branchName: "feature/local",
      remoteBranch: null
    });
    expect(showRefInputDialog).not.toHaveBeenCalled();
  });
});

describe("buildRefContextMenuItems Pull/Push menu items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes Pull and Push items for current branch (TC-007)", () => {
    // Given: A local branch element that is the current branch (gitBranchHead === refName)
    const sourceElem = createMockElement(["head"]);

    // When: buildRefContextMenuItems is called with gitBranchHead matching refName
    const menu = buildRefContextMenuItems(REPO, "main", sourceElem, false, "main");

    // Then: Menu contains Pull and Push items
    const titles = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .map((item) => item.title);
    expect(titles).toContain("Pull");
    expect(titles).toContain("Push");
  });

  it("Pull and Push items have correct titles (TC-008)", () => {
    // Given: A current branch element
    const sourceElem = createMockElement(["head"]);

    // When: buildRefContextMenuItems is called for the current branch
    const menu = buildRefContextMenuItems(REPO, "main", sourceElem, false, "main");

    // Then: Pull is "Pull" and Push is "Push" (exact titles)
    const nonNullItems = menu.filter((item): item is ContextMenuElement => item !== null);
    const pullItem = nonNullItems.find((item) => item.title === "Pull");
    const pushItem = nonNullItems.find((item) => item.title === "Push");
    expect(pullItem).toBeDefined();
    expect(pushItem).toBeDefined();
  });

  it("does not include Pull/Push for non-current branch (TC-009)", () => {
    // Given: A local branch element that is NOT the current branch
    const sourceElem = createMockElement(["head"]);

    // When: buildRefContextMenuItems is called with different gitBranchHead
    const menu = buildRefContextMenuItems(REPO, "feature/x", sourceElem, false, "main");

    // Then: Menu does not contain Pull or Push items
    const titles = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .map((item) => item.title);
    expect(titles).not.toContain("Pull");
    expect(titles).not.toContain("Push");
  });

  it("does not include Pull/Push for remote branch (TC-010)", () => {
    // Given: A remote branch element
    const sourceElem = createMockElement(["remote"]);

    // When: buildRefContextMenuItems is called for a remote branch
    const menu = buildRefContextMenuItems(REPO, "origin/main", sourceElem, false, "main");

    // Then: Menu does not contain Pull or Push items
    const titles = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .map((item) => item.title);
    expect(titles).not.toContain("Pull");
    expect(titles).not.toContain("Push");
  });
});

// --- S3: parseRemoteRef() utility ---

describe("parseRemoteRef remote name separation", () => {
  it("splits 'origin/feature/x' at first slash (TC-011)", () => {
    // Given: A remote ref name with nested branch path
    // When: parseRemoteRef is called
    const result = parseRemoteRef("origin/feature/x");

    // Then: remoteName is "origin", branchName is "feature/x"
    expect(result).toEqual({ remoteName: "origin", branchName: "feature/x" });
  });

  it("splits 'origin/main' into remote and branch (TC-012)", () => {
    // Given: A simple remote ref name
    // When: parseRemoteRef is called
    const result = parseRemoteRef("origin/main");

    // Then: remoteName is "origin", branchName is "main"
    expect(result).toEqual({ remoteName: "origin", branchName: "main" });
  });

  it("preserves deep nesting in branch name for 'upstream/a/b/c' (TC-013)", () => {
    // Given: A deeply nested remote ref name with non-origin remote
    // When: parseRemoteRef is called
    const result = parseRemoteRef("upstream/a/b/c");

    // Then: Only first slash is used as separator
    expect(result).toEqual({ remoteName: "upstream", branchName: "a/b/c" });
  });

  it("handles minimal path 'o/x' (TC-014)", () => {
    // Given: A minimal 1-char remote + 1-char branch ref
    // When: parseRemoteRef is called
    const result = parseRemoteRef("o/x");

    // Then: Correctly splits single characters
    expect(result).toEqual({ remoteName: "o", branchName: "x" });
  });

  it("returns empty remoteName when no slash is present (TC-015)", () => {
    // Given: A ref name without a slash separator (edge case)
    // When: parseRemoteRef is called
    const result = parseRemoteRef("origin");

    // Then: remoteName is empty, branchName contains original value
    expect(result).toEqual({ remoteName: "", branchName: "origin" });
  });
});

// --- S4: Remote branch menu items ---

describe("buildRefContextMenuItems remote branch menu items", () => {
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

  it("includes 'Delete Remote Branch...' for remote branch (TC-016)", () => {
    // Given: A remote branch element
    const sourceElem = createMockElement(["remote"]);

    // When: buildRefContextMenuItems is called for a remote branch
    const menu = buildRefContextMenuItems(REPO, "origin/feature", sourceElem, false, "main");

    // Then: Menu contains "Delete Remote Branch..." item
    const titles = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .map((item) => item.title);
    expect(titles).toContain("Delete Remote Branch&#8230;");
  });

  it("includes 'Merge into current branch...' for remote branch (TC-017)", () => {
    // Given: A remote branch element
    const sourceElem = createMockElement(["remote"]);

    // When: buildRefContextMenuItems is called for a remote branch
    const menu = buildRefContextMenuItems(REPO, "origin/feature", sourceElem, false, "main");

    // Then: Menu contains "Merge into current branch..." item
    const titles = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .map((item) => item.title);
    expect(titles).toContain("Merge into current branch&#8230;");
  });

  it("does not include 'Delete Remote Branch...' for local branch (TC-018)", () => {
    // Given: A local branch element (non-HEAD)
    const sourceElem = createMockElement(["head"]);

    // When: buildRefContextMenuItems is called for a local branch
    const menu = buildRefContextMenuItems(REPO, "feature/x", sourceElem, false, "main");

    // Then: Menu does not contain "Delete Remote Branch..." item
    const titles = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .map((item) => item.title);
    expect(titles).not.toContain("Delete Remote Branch&#8230;");
  });

  it("shows confirmation dialog when Delete Remote Branch is selected (TC-019)", () => {
    // Given: A remote branch element
    const sourceElem = createMockElement(["remote"]);
    const menu = buildRefContextMenuItems(REPO, "origin/feature", sourceElem, false, "main");

    // When: Delete Remote Branch item is clicked
    const deleteItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Delete Remote Branch&#8230;");
    deleteItem!.onClick();

    // Then: showConfirmationDialog is called
    expect(showConfirmationDialog).toHaveBeenCalledTimes(1);
    const dialogMessage = (showConfirmationDialog as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(dialogMessage).toContain("origin/feature");
  });

  it("shows form dialog with 3 checkboxes when Merge (remote) is selected (TC-020)", () => {
    // Given: A remote branch element
    const sourceElem = createMockElement(["remote"]);
    const menu = buildRefContextMenuItems(REPO, "origin/feature", sourceElem, false, "main");

    // When: Merge into current branch item is clicked
    const mergeItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Merge into current branch&#8230;");
    mergeItem!.onClick();

    // Then: showFormDialog is called with 3 checkboxes (No FF, Squash, No Commit)
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const inputs = (showFormDialog as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(inputs).toHaveLength(3);
    expect(inputs[0].name).toBe("Create a new commit even if fast-forward is possible");
    expect(inputs[1].name).toBe("Squash Commits");
    expect(inputs[2].name).toBe("No Commit");
  });
});

// --- S5: Rebase menu items ---

describe("buildRefContextMenuItems Rebase menu items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes 'Rebase current branch on Branch...' for non-HEAD local branch (TC-021)", () => {
    // Given: A local branch element that is NOT the current branch
    const sourceElem = createMockElement(["head"]);

    // When: buildRefContextMenuItems is called with different gitBranchHead
    const menu = buildRefContextMenuItems(REPO, "feature/x", sourceElem, false, "main");

    // Then: Menu contains "Rebase current branch on Branch..." item
    const titles = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .map((item) => item.title);
    expect(titles).toContain("Rebase current branch on Branch&#8230;");
  });

  it("does not include Rebase for HEAD branch (TC-022)", () => {
    // Given: A local branch element that IS the current branch
    const sourceElem = createMockElement(["head"]);

    // When: buildRefContextMenuItems is called for current branch
    const menu = buildRefContextMenuItems(REPO, "main", sourceElem, false, "main");

    // Then: Menu does not contain "Rebase..." item (cannot rebase onto self)
    const titles = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .map((item) => item.title);
    expect(titles).not.toContain("Rebase current branch on Branch&#8230;");
  });

  it("does not include Rebase for remote branch (TC-023)", () => {
    // Given: A remote branch element
    const sourceElem = createMockElement(["remote"]);

    // When: buildRefContextMenuItems is called for a remote branch
    const menu = buildRefContextMenuItems(REPO, "origin/main", sourceElem, false, "main");

    // Then: Menu does not contain "Rebase..." item (only for local branches)
    const titles = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .map((item) => item.title);
    expect(titles).not.toContain("Rebase current branch on Branch&#8230;");
  });

  it("shows confirmation dialog when Rebase is selected (TC-024)", () => {
    // Given: A non-HEAD local branch element
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(REPO, "feature/x", sourceElem, false, "main");

    // When: Rebase item is clicked
    const rebaseItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Rebase current branch on Branch&#8230;");
    rebaseItem!.onClick();

    // Then: showConfirmationDialog is called
    expect(showConfirmationDialog).toHaveBeenCalledTimes(1);
    const dialogMessage = (showConfirmationDialog as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(dialogMessage).toContain("feature/x");
  });
});

// --- S6: Delete Branch dialog extension ---

describe("buildRefContextMenuItems Delete Branch dialog extension", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses showFormDialog with two checkboxes when remotes are provided (TC-025)", () => {
    // Given: A non-HEAD local branch with remotes
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(REPO, "feature/x", sourceElem, false, "main", ["origin"]);

    // When: Delete Branch item is clicked
    const deleteItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Delete Branch&#8230;");
    deleteItem!.onClick();

    // Then: showFormDialog is called with 2 checkbox inputs
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const inputs = (showFormDialog as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toEqual({ type: "checkbox", name: "Force Delete", value: false });
    expect(inputs[1]).toEqual({
      type: "checkbox",
      name: "Delete this branch on the remote",
      value: false
    });
  });

  it("uses showCheckboxDialog when remotes is empty (TC-026)", () => {
    // Given: A non-HEAD local branch without remotes
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(REPO, "feature/x", sourceElem, false, "main", []);

    // When: Delete Branch item is clicked
    const deleteItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Delete Branch&#8230;");
    deleteItem!.onClick();

    // Then: showCheckboxDialog is used (backward compatible)
    expect(showCheckboxDialog).toHaveBeenCalledTimes(1);
    expect(showFormDialog).not.toHaveBeenCalled();
  });

  it("sends deleteOnRemotes with remotes when remote checkbox is checked (TC-027)", () => {
    // Given: A non-HEAD local branch with remotes
    const sourceElem = createMockElement(["head"]);
    const remotes = ["origin"];
    const menu = buildRefContextMenuItems(REPO, "feature/x", sourceElem, false, "main", remotes);

    // When: Delete Branch is clicked and form is submitted with remote delete checked
    const deleteItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Delete Branch&#8230;");
    deleteItem!.onClick();
    const callback = (showFormDialog as ReturnType<typeof vi.fn>).mock.calls[0][3];
    callback(["checked", "checked"]);

    // Then: sendMessage includes deleteOnRemotes with the remotes array
    expect(sendMessage).toHaveBeenCalledWith({
      command: "deleteBranch",
      repo: REPO,
      branchName: "feature/x",
      forceDelete: true,
      deleteOnRemotes: ["origin"]
    });
  });

  it("sends deleteOnRemotes as empty array when remote checkbox is unchecked (TC-028)", () => {
    // Given: A non-HEAD local branch with remotes
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(REPO, "feature/x", sourceElem, false, "main", ["origin"]);

    // When: Delete Branch is clicked and form is submitted with remote delete unchecked
    const deleteItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Delete Branch&#8230;");
    deleteItem!.onClick();
    const callback = (showFormDialog as ReturnType<typeof vi.fn>).mock.calls[0][3];
    callback(["unchecked", "unchecked"]);

    // Then: sendMessage includes deleteOnRemotes as empty array
    expect(sendMessage).toHaveBeenCalledWith({
      command: "deleteBranch",
      repo: REPO,
      branchName: "feature/x",
      forceDelete: false,
      deleteOnRemotes: []
    });
  });
});

// --- S7: Merge ダイアログ拡張（3 checkbox フォーム） ---

describe("buildMergeBranchMenuItem Merge dialog (S7)", () => {
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

  function getMergeItem(refName = "feature/x") {
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(REPO, refName, sourceElem, false, "main");
    return menu.find((item) => item !== null && item.title === "Merge into current branch&#8230;")!;
  }

  it("calls showFormDialog with 3 checkboxes (No FF / Squash / No Commit) (TC-029)", () => {
    // Given: A non-HEAD local branch
    const item = getMergeItem();

    // When: Merge into current branch is clicked
    item.onClick();

    // Then: showFormDialog is called with 3 checkbox inputs
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect(inputs).toHaveLength(3);
    expect(inputs[0].type).toBe("checkbox");
    expect(inputs[0].name).toBe("Create a new commit even if fast-forward is possible");
    expect(inputs[1].type).toBe("checkbox");
    expect(inputs[1].name).toBe("Squash Commits");
    expect(inputs[2].type).toBe("checkbox");
    expect(inputs[2].name).toBe("No Commit");
  });

  it("3 checkboxes reflect viewState.dialogDefaults.merge values (TC-030)", () => {
    // Given: Custom dialog defaults
    (globalThis as Record<string, unknown>).viewState = {
      dialogDefaults: {
        merge: { noFastForward: false, squashCommits: true, noCommit: true },
        cherryPick: { recordOrigin: false, noCommit: false },
        stashUncommittedChanges: { includeUntracked: false },
        createWorktree: { openTerminal: true },
        removeWorktree: { deleteBranch: true }
      }
    };
    const item = getMergeItem();

    // When: Merge into current branch is clicked
    item.onClick();

    // Then: checkbox defaults reflect the custom settings
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect((inputs[0] as DialogCheckboxInput).value).toBe(false);
    expect((inputs[1] as DialogCheckboxInput).value).toBe(true);
    expect((inputs[2] as DialogCheckboxInput).value).toBe(true);
  });

  it("callback sends RequestMergeBranch with createNewCommit, squash, noCommit (TC-031)", () => {
    // Given: Merge dialog is shown
    const item = getMergeItem("feature/x");
    item.onClick();

    // When: form is submitted with createNewCommit=true, squash=false, noCommit=true
    const actioned = vi.mocked(showFormDialog).mock.calls[0][3];
    actioned(["checked", "unchecked", "checked"]);

    // Then: sendMessage includes all merge flags
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      command: "mergeBranch",
      repo: REPO,
      branchName: "feature/x",
      createNewCommit: true,
      squash: false,
      noCommit: true
    });
  });

  it("Squash and No Commit checkboxes have info tooltip text (TC-032)", () => {
    // Given: Merge menu item
    const item = getMergeItem();

    // When: Merge into current branch is clicked
    item.onClick();

    // Then: Squash and No Commit checkboxes have info properties
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    const squashInput = inputs[1] as DialogCheckboxInput;
    const noCommitInput = inputs[2] as DialogCheckboxInput;
    expect(squashInput.info).toBeDefined();
    expect(squashInput.info).toContain("single commit");
    expect(noCommitInput.info).toBeDefined();
    expect(noCommitInput.info).toContain("staged but not committed");
  });
});

// --- S8: buildRefContextMenuItems() worktree 関連メニュー項目 ---

describe("buildRefContextMenuItems worktree menu items (S8)", () => {
  const WORKTREE_PATH = "/home/user/project-feature";

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

  function getTitles(menu: ContextMenuElement[]): string[] {
    return menu
      .filter((item): item is ContextMenuElement => item !== null)
      .map((item) => item.title);
  }

  it("includes 'Create Worktree...' for local branch with worktreeInfo=null (TC-033)", () => {
    // Given: A local branch element with no worktree (worktreeInfo is null)
    const sourceElem = createMockElement(["head"]);

    // When: buildRefContextMenuItems is called with worktreeInfo=null
    const menu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      sourceElem,
      false,
      "main",
      undefined,
      null
    );

    // Then: Menu contains "Create Worktree..." item
    const titles = getTitles(menu);
    expect(titles).toContain("Create Worktree&#8230;");
  });

  it("includes 3 worktree items for local branch with worktreeInfo (non-main) (TC-034)", () => {
    // Given: A local branch with worktree info (non-main worktree)
    const sourceElem = createMockElement(["head"]);
    const worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: false };

    // When: buildRefContextMenuItems is called with worktreeInfo
    const menu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      sourceElem,
      false,
      "main",
      undefined,
      worktreeInfo
    );

    // Then: Menu contains Open Terminal Here, Copy Worktree Path, and Remove Worktree
    const titles = getTitles(menu);
    expect(titles).toContain("Open Terminal Here");
    expect(titles).toContain("Copy Worktree Path");
    expect(titles).toContain("Remove Worktree&#8230;");
  });

  it("excludes Remove Worktree for main worktree (TC-035)", () => {
    // Given: A local branch with worktree info (main worktree)
    const sourceElem = createMockElement(["head"]);
    const worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: true };

    // When: buildRefContextMenuItems is called with main worktree info
    const menu = buildRefContextMenuItems(
      REPO,
      "main",
      sourceElem,
      false,
      "main",
      undefined,
      worktreeInfo
    );

    // Then: Menu contains Open Terminal Here and Copy Worktree Path, but NOT Remove Worktree
    const titles = getTitles(menu);
    expect(titles).toContain("Open Terminal Here");
    expect(titles).toContain("Copy Worktree Path");
    expect(titles).not.toContain("Remove Worktree&#8230;");
  });

  it("does not include worktree items for remote branch (TC-036)", () => {
    // Given: A remote branch element
    const sourceElem = createMockElement(["remote"]);

    // When: buildRefContextMenuItems is called for a remote branch
    const menu = buildRefContextMenuItems(
      REPO,
      "origin/feature",
      sourceElem,
      false,
      "main",
      undefined,
      null
    );

    // Then: Menu does not contain any worktree-related items
    const titles = getTitles(menu);
    expect(titles).not.toContain("Create Worktree&#8230;");
    expect(titles).not.toContain("Open Terminal Here");
    expect(titles).not.toContain("Copy Worktree Path");
    expect(titles).not.toContain("Remove Worktree&#8230;");
  });

  it("showFormDialog is called with 2 fields when Create Worktree is selected (TC-037)", () => {
    // Given: A local branch with no worktree
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      sourceElem,
      false,
      "main",
      undefined,
      null
    );

    // When: Create Worktree item is clicked
    const createItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Create Worktree&#8230;");
    createItem!.onClick();

    // Then: showFormDialog is called with Path (text) and Open Terminal (checkbox) fields
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect(inputs).toHaveLength(2);
    expect(inputs[0].type).toBe("text");
    expect(inputs[0].name).toBe("Path: ");
    expect(inputs[1].type).toBe("checkbox");
    expect(inputs[1].name).toBe("Open Terminal");
    expect((inputs[1] as DialogCheckboxInput).value).toBe(true);
  });

  it("Path default value is '../<repoName>-<branchName>' format (TC-038)", () => {
    // Given: A local branch with no worktree
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      sourceElem,
      false,
      "main",
      undefined,
      null
    );

    // When: Create Worktree item is clicked
    const createItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Create Worktree&#8230;");
    createItem!.onClick();

    // Then: Path default is "../repo-feature/x" (getRepoName extracts "repo" from "/test/repo")
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    const pathInput = inputs[0] as DialogTextInput;
    expect(pathInput.default).toBe("../repo-feature/x");
    expect(getRepoName).toHaveBeenCalledWith(REPO);
  });

  it("Open Terminal Here sends openTerminal message (TC-039)", () => {
    // Given: A local branch with worktree info
    const sourceElem = createMockElement(["head"]);
    const worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: false };
    const menu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      sourceElem,
      false,
      "main",
      undefined,
      worktreeInfo
    );

    // When: Open Terminal Here item is clicked
    const openItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Open Terminal Here");
    openItem!.onClick();

    // Then: sendMessage is called with openTerminal command including path and name
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      command: "openTerminal",
      repo: REPO,
      path: WORKTREE_PATH,
      name: "Worktree: feature/x"
    });
  });

  it("Copy Worktree Path sends copyToClipboard message (TC-040)", () => {
    // Given: A local branch with worktree info
    const sourceElem = createMockElement(["head"]);
    const worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: false };
    const menu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      sourceElem,
      false,
      "main",
      undefined,
      worktreeInfo
    );

    // When: Copy Worktree Path item is clicked
    const copyItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Copy Worktree Path");
    copyItem!.onClick();

    // Then: sendMessage is called with copyToClipboard command, type worktreePath
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      command: "copyToClipboard",
      type: "worktreePath",
      data: WORKTREE_PATH
    });
  });

  it("Remove Worktree shows form dialog with branch name and path (TC-041)", () => {
    // Given: A local branch with non-main worktree info
    const sourceElem = createMockElement(["head"]);
    const worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: false };
    const menu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      sourceElem,
      false,
      "main",
      undefined,
      worktreeInfo
    );

    // When: Remove Worktree item is clicked
    const removeItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Remove Worktree&#8230;");
    removeItem!.onClick();

    // Then: showFormDialog is called with message containing branch name and path
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const dialogMessage = vi.mocked(showFormDialog).mock.calls[0][0];
    expect(dialogMessage).toContain("feature/x");
    expect(dialogMessage).toContain(WORKTREE_PATH);
  });
});

// --- S9: Delete Branch dialog worktree warning ---

describe("showDeleteBranchDialog worktree warning (S9)", () => {
  const WORKTREE_PATH = "/home/user/project-feature";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows worktree warning in Delete Branch dialog when branch has worktree (with remotes) (TC-042)", () => {
    // Given: A non-HEAD local branch with worktree AND remotes
    const sourceElem = createMockElement(["head"]);
    const worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: false };
    const menu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      sourceElem,
      false,
      "main",
      ["origin"],
      worktreeInfo
    );

    // When: Delete Branch item is clicked
    const deleteItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Delete Branch&#8230;");
    deleteItem!.onClick();

    // Then: showFormDialog message contains worktree warning with path
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const dialogMessage = vi.mocked(showFormDialog).mock.calls[0][0];
    expect(dialogMessage).toContain(WORKTREE_PATH);
    expect(dialogMessage).toContain("active worktree");
    expect(dialogMessage).toContain("orphan");
  });

  it("shows worktree warning in Delete Branch dialog when branch has worktree (no remotes) (TC-043)", () => {
    // Given: A non-HEAD local branch with worktree but NO remotes
    const sourceElem = createMockElement(["head"]);
    const worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: false };
    const menu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      sourceElem,
      false,
      "main",
      [],
      worktreeInfo
    );

    // When: Delete Branch item is clicked
    const deleteItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Delete Branch&#8230;");
    deleteItem!.onClick();

    // Then: showCheckboxDialog message contains worktree warning with path
    expect(showCheckboxDialog).toHaveBeenCalledTimes(1);
    const dialogMessage = vi.mocked(showCheckboxDialog).mock.calls[0][0];
    expect(dialogMessage).toContain(WORKTREE_PATH);
    expect(dialogMessage).toContain("active worktree");
    expect(dialogMessage).toContain("orphan");
  });

  it("does not show worktree warning when branch has no worktree (TC-044)", () => {
    // Given: A non-HEAD local branch WITHOUT worktree
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      sourceElem,
      false,
      "main",
      ["origin"],
      null
    );

    // When: Delete Branch item is clicked
    const deleteItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Delete Branch&#8230;");
    deleteItem!.onClick();

    // Then: showFormDialog message does NOT contain worktree warning
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const dialogMessage = vi.mocked(showFormDialog).mock.calls[0][0];
    expect(dialogMessage).not.toContain("active worktree");
    expect(dialogMessage).not.toContain("orphan");
  });

  it("does not show worktree warning when worktreeInfo is undefined (TC-045)", () => {
    // Given: A non-HEAD local branch where worktreeInfo is not passed (undefined)
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(REPO, "feature/x", sourceElem, false, "main", []);

    // When: Delete Branch item is clicked
    const deleteItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Delete Branch&#8230;");
    deleteItem!.onClick();

    // Then: showCheckboxDialog message does NOT contain worktree warning
    expect(showCheckboxDialog).toHaveBeenCalledTimes(1);
    const dialogMessage = vi.mocked(showCheckboxDialog).mock.calls[0][0];
    expect(dialogMessage).not.toContain("active worktree");
  });
});

// --- S10: Rename Branch dialog worktree warning ---

describe("Rename Branch dialog worktree warning (S10)", () => {
  const WORKTREE_PATH = "/home/user/project-feature";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows worktree warning in Rename Branch dialog when branch has worktree (TC-046)", () => {
    // Given: A local branch with an active worktree
    const sourceElem = createMockElement(["head"]);
    const worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: false };
    const menu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      sourceElem,
      false,
      "main",
      undefined,
      worktreeInfo
    );

    // When: Rename Branch item is clicked
    const renameItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Rename Branch&#8230;");
    renameItem!.onClick();

    // Then: showRefInputDialog message contains worktree warning with path
    expect(showRefInputDialog).toHaveBeenCalledTimes(1);
    const dialogMessage = vi.mocked(showRefInputDialog).mock.calls[0][0];
    expect(dialogMessage).toContain(WORKTREE_PATH);
    expect(dialogMessage).toContain("active worktree");
    expect(dialogMessage).toContain("directory name");
  });

  it("does not show worktree warning in Rename Branch dialog when branch has no worktree (TC-047)", () => {
    // Given: A local branch WITHOUT worktree
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      sourceElem,
      false,
      "main",
      undefined,
      null
    );

    // When: Rename Branch item is clicked
    const renameItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Rename Branch&#8230;");
    renameItem!.onClick();

    // Then: showRefInputDialog message does NOT contain worktree warning
    expect(showRefInputDialog).toHaveBeenCalledTimes(1);
    const dialogMessage = vi.mocked(showRefInputDialog).mock.calls[0][0];
    expect(dialogMessage).not.toContain("active worktree");
  });
});

// --- S11: Create Worktree ダイアログ Open Terminal 設定反映 ---

describe("Create Worktree dialog Open Terminal setting (S11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Open Terminal checkbox is checked when dialogDefaults.createWorktree.openTerminal=true (TC-048)", () => {
    // Given: viewState.dialogDefaults.createWorktree.openTerminal = true
    (globalThis as Record<string, unknown>).viewState = {
      dialogDefaults: {
        merge: { noFastForward: true, squashCommits: false, noCommit: false },
        cherryPick: { recordOrigin: false, noCommit: false },
        stashUncommittedChanges: { includeUntracked: false },
        createWorktree: { openTerminal: true },
        removeWorktree: { deleteBranch: true }
      }
    };
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      sourceElem,
      false,
      "main",
      undefined,
      null
    );

    // When: Create Worktree item is clicked
    const createItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Create Worktree&#8230;");
    createItem!.onClick();

    // Then: Open Terminal checkbox value is true (checked)
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    const openTerminalInput = inputs[1] as DialogCheckboxInput;
    expect(openTerminalInput.value).toBe(true);
  });

  it("Open Terminal checkbox is unchecked when dialogDefaults.createWorktree.openTerminal=false (TC-049)", () => {
    // Given: viewState.dialogDefaults.createWorktree.openTerminal = false
    (globalThis as Record<string, unknown>).viewState = {
      dialogDefaults: {
        merge: { noFastForward: true, squashCommits: false, noCommit: false },
        cherryPick: { recordOrigin: false, noCommit: false },
        stashUncommittedChanges: { includeUntracked: false },
        createWorktree: { openTerminal: false },
        removeWorktree: { deleteBranch: true }
      }
    };
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      sourceElem,
      false,
      "main",
      undefined,
      null
    );

    // When: Create Worktree item is clicked
    const createItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Create Worktree&#8230;");
    createItem!.onClick();

    // Then: Open Terminal checkbox value is false (unchecked)
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    const openTerminalInput = inputs[1] as DialogCheckboxInput;
    expect(openTerminalInput.value).toBe(false);
  });
});

// --- S12: Remove Worktree ブランチ同時削除ダイアログ ---

describe("Remove Worktree branch deletion dialog (S12)", () => {
  const WORKTREE_PATH = "/home/user/project-feature";

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

  function clickRemoveWorktree(
    deleteBranchDefault: boolean
  ): ReturnType<typeof buildRefContextMenuItems> {
    (globalThis as Record<string, unknown>).viewState = {
      dialogDefaults: {
        merge: { noFastForward: true, squashCommits: false, noCommit: false },
        cherryPick: { recordOrigin: false, noCommit: false },
        stashUncommittedChanges: { includeUntracked: false },
        createWorktree: { openTerminal: true },
        removeWorktree: { deleteBranch: deleteBranchDefault }
      }
    };
    const sourceElem = createMockElement(["head"]);
    const worktreeInfo = { path: WORKTREE_PATH, isMainWorktree: false };
    const menu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      sourceElem,
      false,
      "main",
      undefined,
      worktreeInfo
    );
    const removeItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Remove Worktree&#8230;");
    removeItem!.onClick();
    return menu;
  }

  it("showFormDialog is called with checkbox input for Remove Worktree (TC-050)", () => {
    // Given: A non-main worktree with deleteBranch default = true
    // When: Remove Worktree item is clicked
    clickRemoveWorktree(true);

    // Then: showFormDialog is called with one checkbox input
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect(inputs).toHaveLength(1);
    expect(inputs[0].type).toBe("checkbox");
  });

  it("checkbox default is checked when deleteBranch=true (TC-051)", () => {
    // Given: viewState.dialogDefaults.removeWorktree.deleteBranch = true
    // When: Remove Worktree item is clicked
    clickRemoveWorktree(true);

    // Then: Checkbox value is true (checked)
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    const checkbox = inputs[0] as DialogCheckboxInput;
    expect(checkbox.value).toBe(true);
  });

  it("checkbox default is unchecked when deleteBranch=false (TC-052)", () => {
    // Given: viewState.dialogDefaults.removeWorktree.deleteBranch = false
    // When: Remove Worktree item is clicked
    clickRemoveWorktree(false);

    // Then: Checkbox value is false (unchecked)
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    const checkbox = inputs[0] as DialogCheckboxInput;
    expect(checkbox.value).toBe(false);
  });

  it("checkbox has info property with safe delete explanation (TC-053)", () => {
    // Given: Remove Worktree dialog is displayed
    // When: Remove Worktree item is clicked
    clickRemoveWorktree(true);

    // Then: Checkbox info contains safe delete explanation
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    const checkbox = inputs[0] as DialogCheckboxInput;
    expect(checkbox.info).toBeDefined();
    expect(checkbox.info).toContain("unmerged");
  });

  it("sendMessage includes deleteBranch=true when checkbox is checked (TC-054)", () => {
    // Given: Remove Worktree dialog with checkbox checked
    // When: Form dialog callback is invoked with "checked"
    clickRemoveWorktree(true);
    const callback = vi.mocked(showFormDialog).mock.calls[0][3];
    callback(["checked"]);

    // Then: sendMessage is called with deleteBranch: true
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "removeWorktree",
        deleteBranch: true
      })
    );
  });

  it("sendMessage includes deleteBranch=false when checkbox is unchecked (TC-055)", () => {
    // Given: Remove Worktree dialog with checkbox unchecked
    // When: Form dialog callback is invoked with unchecked value
    clickRemoveWorktree(true);
    const callback = vi.mocked(showFormDialog).mock.calls[0][3];
    callback(["unchecked"]);

    // Then: sendMessage is called with deleteBranch: false
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "removeWorktree",
        deleteBranch: false
      })
    );
  });

  it("action button name is 'Remove' (TC-056)", () => {
    // Given: Remove Worktree dialog is displayed
    // When: Remove Worktree item is clicked
    clickRemoveWorktree(true);

    // Then: Action button text is "Remove"
    const actionButton = vi.mocked(showFormDialog).mock.calls[0][2];
    expect(actionButton).toBe("Remove");
  });

  it("dialog message contains branch name and worktree path (TC-057)", () => {
    // Given: Branch "feature/x" with worktree at WORKTREE_PATH
    // When: Remove Worktree item is clicked
    clickRemoveWorktree(true);

    // Then: Dialog message contains both branch name and path
    const dialogMessage = vi.mocked(showFormDialog).mock.calls[0][0];
    expect(dialogMessage).toContain("feature/x");
    expect(dialogMessage).toContain(WORKTREE_PATH);
  });
});
