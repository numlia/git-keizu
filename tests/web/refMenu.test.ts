// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../web/dialogs", () => ({
  showRefInputDialog: vi.fn(),
  showConfirmationDialog: vi.fn(),
  showCheckboxDialog: vi.fn(),
  showFormDialog: vi.fn(),
  showActionRunningDialog: vi.fn()
}));

vi.mock("../../web/contextMenu", () => ({
  recordRecentAction: vi.fn()
}));

vi.mock("../../web/utils", () => {
  const pathUnsafeChars = /[\\/:*?"<>| ]+/g;
  const pathUnsafeCharReplacement = "-";

  return {
    escapeHtml: vi.fn((str: string) => str),
    sendMessage: vi.fn(),
    getRepoName: vi.fn((repoPath: string) => {
      const sep = Math.max(repoPath.lastIndexOf("/"), repoPath.lastIndexOf("\\"));
      return sep >= 0 ? repoPath.substring(sep + 1) : repoPath;
    }),
    sanitizeBranchNameForPath: vi.fn((branchName: string) =>
      branchName.replace(pathUnsafeChars, pathUnsafeCharReplacement)
    ),
    svgIcons: { alert: "<svg>alert</svg>" },
    ELLIPSIS: "&#8230;"
  };
});

import { recordRecentAction } from "../../web/contextMenu";
import {
  showCheckboxDialog,
  showConfirmationDialog,
  showFormDialog,
  showRefInputDialog
} from "../../web/dialogs";
import { buildRefContextMenuItems, checkoutBranchAction, parseRemoteRef } from "../../web/refMenu";
import { escapeHtml, getRepoName, sanitizeBranchNameForPath, sendMessage } from "../../web/utils";

function createMockElement(classes: string[]): HTMLElement {
  const classList = {
    contains: (cls: string) => classes.includes(cls)
  };
  return { classList } as unknown as HTMLElement;
}

const REPO = "/test/repo";

function isContextMenuItem(item: ContextMenuElement): item is ContextMenuItem {
  return item !== null && "onClick" in item;
}

function isContextMenuSubmenu(item: ContextMenuElement): item is ContextMenuSubmenu {
  return item !== null && "submenu" in item;
}

function flattenMenuItems(menu: ContextMenuElement[]): ContextMenuItem[] {
  return menu.flatMap((item) => {
    if (item === null) {
      return [];
    }

    if (isContextMenuSubmenu(item)) {
      return flattenMenuItems(item.submenu);
    }

    return isContextMenuItem(item) ? [item] : [];
  });
}

function getTitles(menu: ContextMenuElement[]): string[] {
  return flattenMenuItems(menu).map((item) => item.title);
}

function findMenuItem(menu: ContextMenuElement[], title: string): ContextMenuItem | undefined {
  return flattenMenuItems(menu).find((item) => item.title === title);
}

function getTopLevelSubmenu(
  menu: ContextMenuElement[],
  title = "More..."
): ContextMenuSubmenu | undefined {
  return menu.find(
    (item): item is ContextMenuSubmenu => isContextMenuSubmenu(item) && item.title === title
  );
}

function hasInvalidDividers(menu: ContextMenuElement[]): boolean {
  if (menu.length === 0) {
    return false;
  }

  if (menu[0] === null || menu[menu.length - 1] === null) {
    return true;
  }

  return menu.some((item, index) => item === null && menu[index + 1] === null);
}

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
    const titles = getTitles(menu);
    expect(titles).toContain("Pull");
    expect(titles).toContain("Push");
  });

  it("Pull and Push items have correct titles (TC-008)", () => {
    // Given: A current branch element
    const sourceElem = createMockElement(["head"]);

    // When: buildRefContextMenuItems is called for the current branch
    const menu = buildRefContextMenuItems(REPO, "main", sourceElem, false, "main");

    // Then: Pull is "Pull" and Push is "Push" (exact titles)
    const pullItem = findMenuItem(menu, "Pull");
    const pushItem = findMenuItem(menu, "Push");
    expect(pullItem).toBeDefined();
    expect(pushItem).toBeDefined();
  });

  it("does not include Pull/Push for non-current branch (TC-009)", () => {
    // Given: A local branch element that is NOT the current branch
    const sourceElem = createMockElement(["head"]);

    // When: buildRefContextMenuItems is called with different gitBranchHead
    const menu = buildRefContextMenuItems(REPO, "feature/x", sourceElem, false, "main");

    // Then: Menu does not contain Pull or Push items
    const titles = getTitles(menu);
    expect(titles).not.toContain("Pull");
    expect(titles).not.toContain("Push");
  });

  it("does not include Pull/Push for remote branch (TC-010)", () => {
    // Given: A remote branch element
    const sourceElem = createMockElement(["remote"]);

    // When: buildRefContextMenuItems is called for a remote branch
    const menu = buildRefContextMenuItems(REPO, "origin/main", sourceElem, false, "main");

    // Then: Menu does not contain Pull or Push items
    const titles = getTitles(menu);
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
    const titles = getTitles(menu);
    expect(titles).toContain("Delete Remote Branch&#8230;");
  });

  it("includes 'Merge into current branch...' for remote branch (TC-017)", () => {
    // Given: A remote branch element
    const sourceElem = createMockElement(["remote"]);

    // When: buildRefContextMenuItems is called for a remote branch
    const menu = buildRefContextMenuItems(REPO, "origin/feature", sourceElem, false, "main");

    // Then: Menu contains "Merge into current branch..." item
    const titles = getTitles(menu);
    expect(titles).toContain("Merge into current branch&#8230;");
  });

  it("does not include 'Delete Remote Branch...' for local branch (TC-018)", () => {
    // Given: A local branch element (non-HEAD)
    const sourceElem = createMockElement(["head"]);

    // When: buildRefContextMenuItems is called for a local branch
    const menu = buildRefContextMenuItems(REPO, "feature/x", sourceElem, false, "main");

    // Then: Menu does not contain "Delete Remote Branch..." item
    const titles = getTitles(menu);
    expect(titles).not.toContain("Delete Remote Branch&#8230;");
  });

  it("shows confirmation dialog when Delete Remote Branch is selected (TC-019)", () => {
    // Given: A remote branch element
    const sourceElem = createMockElement(["remote"]);
    const menu = buildRefContextMenuItems(REPO, "origin/feature", sourceElem, false, "main");

    // When: Delete Remote Branch item is clicked
    const deleteItem = findMenuItem(menu, "Delete Remote Branch&#8230;");
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
    const mergeItem = findMenuItem(menu, "Merge into current branch&#8230;");
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
    const titles = getTitles(menu);
    expect(titles).toContain("Rebase current branch on Branch&#8230;");
  });

  it("does not include Rebase for HEAD branch (TC-022)", () => {
    // Given: A local branch element that IS the current branch
    const sourceElem = createMockElement(["head"]);

    // When: buildRefContextMenuItems is called for current branch
    const menu = buildRefContextMenuItems(REPO, "main", sourceElem, false, "main");

    // Then: Menu does not contain "Rebase..." item (cannot rebase onto self)
    const titles = getTitles(menu);
    expect(titles).not.toContain("Rebase current branch on Branch&#8230;");
  });

  it("does not include Rebase for remote branch (TC-023)", () => {
    // Given: A remote branch element
    const sourceElem = createMockElement(["remote"]);

    // When: buildRefContextMenuItems is called for a remote branch
    const menu = buildRefContextMenuItems(REPO, "origin/main", sourceElem, false, "main");

    // Then: Menu does not contain "Rebase..." item (only for local branches)
    const titles = getTitles(menu);
    expect(titles).not.toContain("Rebase current branch on Branch&#8230;");
  });

  it("shows confirmation dialog when Rebase is selected (TC-024)", () => {
    // Given: A non-HEAD local branch element
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(REPO, "feature/x", sourceElem, false, "main");

    // When: Rebase item is clicked
    const rebaseItem = findMenuItem(menu, "Rebase current branch on Branch&#8230;");
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
    const deleteItem = findMenuItem(menu, "Delete Branch&#8230;");
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
    const deleteItem = findMenuItem(menu, "Delete Branch&#8230;");
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
    const deleteItem = findMenuItem(menu, "Delete Branch&#8230;");
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
    const deleteItem = findMenuItem(menu, "Delete Branch&#8230;");
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

  function getMergeItem(refName = "feature/x"): ContextMenuItem {
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(REPO, refName, sourceElem, false, "main");
    return findMenuItem(menu, "Merge into current branch&#8230;")!;
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
    const createItem = findMenuItem(menu, "Create Worktree&#8230;");
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

  it("Path default value uses the normalized branch name (TC-038)", () => {
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
    const createItem = findMenuItem(menu, "Create Worktree&#8230;");
    createItem!.onClick();

    // Then: Path default uses the normalized branch name "../repo-feature-x"
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    const pathInput = inputs[0] as DialogTextInput;
    expect(pathInput.default).toBe("../repo-feature-x");
    expect(getRepoName).toHaveBeenCalledWith(REPO);
    expect(vi.mocked(sanitizeBranchNameForPath)).toHaveBeenCalledWith("feature/x");
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
    const openItem = findMenuItem(menu, "Open Terminal Here");
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
    const copyItem = findMenuItem(menu, "Copy Worktree Path");
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
    const removeItem = findMenuItem(menu, "Remove Worktree&#8230;");
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
    const deleteItem = findMenuItem(menu, "Delete Branch&#8230;");
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
    const deleteItem = findMenuItem(menu, "Delete Branch&#8230;");
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
    const deleteItem = findMenuItem(menu, "Delete Branch&#8230;");
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
    const deleteItem = findMenuItem(menu, "Delete Branch&#8230;");
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
    const renameItem = findMenuItem(menu, "Rename Branch&#8230;");
    renameItem!.onClick();

    // Then: showFormDialog message contains worktree warning with path
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const dialogMessage = vi.mocked(showFormDialog).mock.calls[0][0];
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
    const renameItem = findMenuItem(menu, "Rename Branch&#8230;");
    renameItem!.onClick();

    // Then: showFormDialog message does NOT contain worktree warning
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const dialogMessage = vi.mocked(showFormDialog).mock.calls[0][0];
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
    const createItem = findMenuItem(menu, "Create Worktree&#8230;");
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
    const createItem = findMenuItem(menu, "Create Worktree&#8230;");
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
    const removeItem = findMenuItem(menu, "Remove Worktree&#8230;");
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

describe("Ref context menu structure (S13)", () => {
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

  it("TC-058: keeps the tag menu unchanged", () => {
    // Case: TC-058
    // Given: a tag context source
    const menu = buildRefContextMenuItems(
      REPO,
      "v1.0.0",
      createMockElement(["tag"]),
      false,
      "main"
    );

    // When: the tag menu is built

    // Then: it keeps the original four-element layout
    expect(menu.map((item) => item?.title ?? null)).toEqual([
      "Delete Tag&#8230;",
      "Push Tag&#8230;",
      null,
      "Copy Tag Name to Clipboard"
    ]);
  });

  it("TC-059: places Delete Remote Branch inside the remote More submenu", () => {
    // Case: TC-059
    // Given: a remote branch context source
    const menu = buildRefContextMenuItems(
      REPO,
      "origin/feature",
      createMockElement(["remote"]),
      false,
      "main"
    );

    // When: the top-level remote menu is inspected
    const moreItem = getTopLevelSubmenu(menu);

    // Then: top-level items and submenu contents match the new layout
    expect(menu.map((item) => item?.title ?? null)).toEqual([
      "Checkout Branch&#8230;",
      "Merge into current branch&#8230;",
      null,
      "More...",
      null,
      "Copy Branch Name to Clipboard"
    ]);
    expect(moreItem?.submenu.map((item) => item?.title ?? null)).toEqual([
      "Delete Remote Branch&#8230;"
    ]);
  });

  it("TC-060: moves Rename Branch for HEAD branches into More when no worktree exists", () => {
    // Case: TC-060
    // Given: the current branch without worktree info
    const menu = buildRefContextMenuItems(
      REPO,
      "main",
      createMockElement(["head"]),
      false,
      "main",
      undefined,
      null
    );

    // When: the HEAD branch menu is built
    const moreItem = getTopLevelSubmenu(menu);

    // Then: Pull/Push stay top-level and Rename is only in More
    expect(menu.map((item) => item?.title ?? null)).toEqual([
      "Pull",
      "Push",
      null,
      "More...",
      null,
      "Copy Branch Name to Clipboard"
    ]);
    expect(moreItem?.submenu.map((item) => item?.title ?? null)).toEqual(["Rename Branch&#8230;"]);
  });

  it("TC-061: omits Remove Worktree from HEAD branch worktree menus", () => {
    // Case: TC-061
    // Given: the current branch with main worktree info
    const menu = buildRefContextMenuItems(
      REPO,
      "main",
      createMockElement(["head"]),
      false,
      "main",
      undefined,
      { path: "/tmp/main-worktree", isMainWorktree: true }
    );

    // When: titles are flattened
    const titles = getTitles(menu);

    // Then: worktree actions are present but Remove Worktree is absent
    expect(titles).toContain("Open in New Window");
    expect(titles).toContain("Reveal in File Manager");
    expect(titles).toContain("Open Terminal Here");
    expect(titles).toContain("Copy Worktree Path");
    expect(titles).not.toContain("Remove Worktree&#8230;");
  });

  it("TC-062: uses Create Worktree before More for non-HEAD local branches without worktrees", () => {
    // Case: TC-062
    // Given: a non-HEAD local branch without worktree info
    const menu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      createMockElement(["head"]),
      false,
      "main",
      [],
      null
    );

    // When: the top-level layout is inspected

    // Then: Create Worktree appears before More and Delete Branch is no longer top-level
    expect(menu.map((item) => item?.title ?? null)).toEqual([
      "Checkout Branch",
      "Merge into current branch&#8230;",
      "Rebase current branch on Branch&#8230;",
      null,
      "Create Worktree&#8230;",
      null,
      "More...",
      null,
      "Copy Branch Name to Clipboard"
    ]);
    expect(findMenuItem(menu, "Delete Branch&#8230;")).toBeDefined();
  });

  it("TC-063: includes Rename, Delete, and Remove Worktree in More for non-main worktrees", () => {
    // Case: TC-063
    // Given: a non-HEAD local branch with a non-main worktree
    const menu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      createMockElement(["head"]),
      false,
      "main",
      ["origin"],
      { path: "/tmp/feature-worktree", isMainWorktree: false }
    );

    // When: the More submenu is inspected
    const moreItem = getTopLevelSubmenu(menu);

    // Then: all destructive/secondary actions are grouped inside More
    expect(moreItem?.submenu.map((item) => item?.title ?? null)).toEqual([
      "Rename Branch&#8230;",
      "Delete Branch&#8230;",
      "Remove Worktree&#8230;"
    ]);
  });

  it("TC-064: avoids invalid divider placement across reorganized menu variants", () => {
    // Case: TC-064
    // Given: representative remote, HEAD, and non-HEAD menus
    const remoteMenu = buildRefContextMenuItems(
      REPO,
      "origin/feature",
      createMockElement(["remote"]),
      false,
      "main"
    );
    const headMenu = buildRefContextMenuItems(
      REPO,
      "main",
      createMockElement(["head"]),
      false,
      "main",
      undefined,
      { path: "/tmp/main-worktree", isMainWorktree: true }
    );
    const localMenu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      createMockElement(["head"]),
      false,
      "main",
      ["origin"],
      { path: "/tmp/feature-worktree", isMainWorktree: false }
    );

    // When: divider rules are validated

    // Then: none of the menus contain leading, trailing, or consecutive dividers
    expect(hasInvalidDividers(remoteMenu)).toBe(false);
    expect(hasInvalidDividers(headMenu)).toBe(false);
    expect(hasInvalidDividers(localMenu)).toBe(false);
  });
});

describe("Ref recent action metadata (S14)", () => {
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

  it("assigns recentActionId to supported remote and HEAD actions only (TC-065)", () => {
    // Case: TC-065
    // Given: representative remote and HEAD branch menus
    const remoteMenu = buildRefContextMenuItems(
      REPO,
      "origin/feature",
      createMockElement(["remote"]),
      false,
      "main"
    );
    const headMenu = buildRefContextMenuItems(
      REPO,
      "main",
      createMockElement(["head"]),
      false,
      "main",
      undefined,
      { path: "/tmp/main-worktree", isMainWorktree: true }
    );

    // When: supported items are inspected
    const remoteCheckout = findMenuItem(remoteMenu, "Checkout Branch&#8230;");
    const remoteMerge = findMenuItem(remoteMenu, "Merge into current branch&#8230;");
    const deleteRemote = findMenuItem(remoteMenu, "Delete Remote Branch&#8230;");
    const pullItem = findMenuItem(headMenu, "Pull");
    const pushItem = findMenuItem(headMenu, "Push");
    const openWindow = findMenuItem(headMenu, "Open in New Window");
    const revealItem = findMenuItem(headMenu, "Reveal in File Manager");
    const openTerminal = findMenuItem(headMenu, "Open Terminal Here");

    // Then: supported actions expose ids and non-target actions stay undefined
    expect(remoteCheckout?.recentActionId).toBe("ref.checkoutBranch");
    expect(remoteMerge?.recentActionId).toBe("ref.mergeBranch");
    expect(deleteRemote?.recentActionId).toBe("ref.deleteRemoteBranch");
    expect(pullItem?.recentActionId).toBe("ref.pull");
    expect(pushItem?.recentActionId).toBe("ref.push");
    expect(openWindow?.recentActionId).toBe("ref.openWorktreeInNewWindow");
    expect(revealItem?.recentActionId).toBe("ref.revealWorktreeInOS");
    expect(openTerminal?.recentActionId).toBe("ref.openTerminal");
  });

  it("does not assign recentActionId to tag-only actions (TC-066)", () => {
    // Case: TC-066
    // Given: a tag menu
    const menu = buildRefContextMenuItems(
      REPO,
      "v1.0.0",
      createMockElement(["tag"]),
      false,
      "main"
    );

    // When: tag items are inspected
    const deleteTag = findMenuItem(menu, "Delete Tag&#8230;");
    const pushTag = findMenuItem(menu, "Push Tag&#8230;");

    // Then: tag-only actions are not recent-enabled
    expect(deleteTag?.recentActionId).toBeUndefined();
    expect(pushTag?.recentActionId).toBeUndefined();
  });

  it("records Checkout Branch only when the context-menu path opts in (TC-067)", () => {
    // Case: TC-067
    // Given: a local HEAD branch element
    const sourceElem = createMockElement(["head"]);

    // When: checkoutBranchAction is called directly without record opt-in
    checkoutBranchAction(REPO, sourceElem, "feature/local");

    // Then: sendMessage runs but no recent action is recorded
    expect(recordRecentAction).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith({
      command: "checkoutBranch",
      repo: REPO,
      branchName: "feature/local",
      remoteBranch: null
    });
  });

  it("records Pull before sending the pull request on confirmation (TC-068)", () => {
    // Case: TC-068
    // Given: the current branch menu is built
    const menu = buildRefContextMenuItems(REPO, "main", createMockElement(["head"]), false, "main");
    const pullItem = findMenuItem(menu, "Pull");
    expect(pullItem).toBeDefined();
    pullItem!.onClick();

    // When: the confirmation callback is accepted
    const confirmed = vi.mocked(showConfirmationDialog).mock.calls[0][1];
    confirmed();

    // Then: recordRecentAction is called before sendMessage with ref.pull
    expect(recordRecentAction).toHaveBeenCalledWith(REPO, "ref.pull");
    expect(sendMessage).toHaveBeenCalledWith({ command: "pull", repo: REPO });
    expect(vi.mocked(recordRecentAction).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(sendMessage).mock.invocationCallOrder[0]
    );
  });

  it("records worktree actions before sending Open Terminal Here (TC-069)", () => {
    // Case: TC-069
    // Given: a branch menu with worktree actions
    const menu = buildRefContextMenuItems(
      REPO,
      "feature/x",
      createMockElement(["head"]),
      false,
      "main",
      undefined,
      { path: "/tmp/feature-worktree", isMainWorktree: true }
    );
    const openTerminal = findMenuItem(menu, "Open Terminal Here");
    expect(openTerminal).toBeDefined();

    // When: Open Terminal Here is clicked
    openTerminal!.onClick();

    // Then: recordRecentAction is called before sending openTerminal
    expect(recordRecentAction).toHaveBeenCalledWith(REPO, "ref.openTerminal");
    expect(sendMessage).toHaveBeenCalledWith({
      command: "openTerminal",
      repo: REPO,
      path: "/tmp/feature-worktree",
      name: "Worktree: feature/x"
    });
    expect(vi.mocked(recordRecentAction).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(sendMessage).mock.invocationCallOrder[0]
    );
  });
});

// --- S15: Delete Branch / Delete Remote Branch の Recent actions 連携 ---

describe("buildRefContextMenuItems Delete Branch recent actions (S15)", () => {
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

  it("assigns recentActionId 'ref.deleteBranch' to the Delete Branch item (TC-070)", () => {
    // Case: TC-070
    // Given: a non-HEAD local branch menu (Delete Branch lives in More submenu)
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(REPO, "feature/x", sourceElem, false, "main", ["origin"]);

    // When: the Delete Branch... submenu item is located
    const deleteItem = findMenuItem(menu, "Delete Branch&#8230;");

    // Then: recentActionId is "ref.deleteBranch"
    expect(deleteItem).toBeDefined();
    expect(deleteItem?.recentActionId).toBe("ref.deleteBranch");
  });

  it("records ref.deleteBranch before sendMessage in remotes-present branch (TC-072)", () => {
    // Case: TC-072
    // Given: a non-HEAD local branch with remotes; Delete Branch dialog displayed
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(REPO, "feature/x", sourceElem, false, "main", ["origin"]);
    const deleteItem = findMenuItem(menu, "Delete Branch&#8230;");
    deleteItem!.onClick();

    // When: form dialog callback is invoked (form confirmed)
    const callback = vi.mocked(showFormDialog).mock.calls[0][3];
    callback(["checked", "checked"]);

    // Then: recordRecentAction("ref.deleteBranch") fires before sendMessage(deleteBranch)
    expect(recordRecentAction).toHaveBeenCalledWith(REPO, "ref.deleteBranch");
    expect(sendMessage).toHaveBeenCalledWith({
      command: "deleteBranch",
      repo: REPO,
      branchName: "feature/x",
      forceDelete: true,
      deleteOnRemotes: ["origin"]
    });
    expect(vi.mocked(recordRecentAction).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(sendMessage).mock.invocationCallOrder[0]
    );
  });

  it("records ref.deleteBranch before sendMessage in remotes-empty branch (TC-073)", () => {
    // Case: TC-073
    // Given: a non-HEAD local branch without remotes; Delete Branch dialog displayed
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(REPO, "feature/x", sourceElem, false, "main", []);
    const deleteItem = findMenuItem(menu, "Delete Branch&#8230;");
    deleteItem!.onClick();

    // When: checkbox dialog callback is invoked (force delete confirmed)
    const callback = vi.mocked(showCheckboxDialog).mock.calls[0][4];
    callback(true);

    // Then: recordRecentAction("ref.deleteBranch") fires before sendMessage(deleteBranch)
    expect(recordRecentAction).toHaveBeenCalledWith(REPO, "ref.deleteBranch");
    expect(sendMessage).toHaveBeenCalledWith({
      command: "deleteBranch",
      repo: REPO,
      branchName: "feature/x",
      forceDelete: true,
      deleteOnRemotes: []
    });
    expect(vi.mocked(recordRecentAction).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(sendMessage).mock.invocationCallOrder[0]
    );
  });

  it("does not record or send when Delete Branch dialog is cancelled (TC-075)", () => {
    // Case: TC-075
    // Given: Delete Branch dialog is shown (no callback invocation simulates cancel)
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(REPO, "feature/x", sourceElem, false, "main", ["origin"]);
    const deleteItem = findMenuItem(menu, "Delete Branch&#8230;");

    // When: the user cancels (form dialog callback is never invoked)
    deleteItem!.onClick();

    // Then: neither recordRecentAction nor sendMessage is called
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    expect(recordRecentAction).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});

describe("buildRefContextMenuItems Delete Remote Branch recent actions (S15)", () => {
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

  it("assigns recentActionId 'ref.deleteRemoteBranch' to the Delete Remote Branch item (TC-071)", () => {
    // Case: TC-071
    // Given: a remote branch menu (Delete Remote Branch lives in More submenu)
    const sourceElem = createMockElement(["remote"]);
    const menu = buildRefContextMenuItems(REPO, "origin/feature", sourceElem, false, "main");

    // When: the Delete Remote Branch... submenu item is located
    const deleteRemote = findMenuItem(menu, "Delete Remote Branch&#8230;");

    // Then: recentActionId is "ref.deleteRemoteBranch"
    expect(deleteRemote).toBeDefined();
    expect(deleteRemote?.recentActionId).toBe("ref.deleteRemoteBranch");
  });

  it("records ref.deleteRemoteBranch before sendMessage on confirm (TC-074)", () => {
    // Case: TC-074
    // Given: a remote branch menu; Delete Remote Branch confirm dialog is displayed
    const sourceElem = createMockElement(["remote"]);
    const menu = buildRefContextMenuItems(REPO, "origin/feature", sourceElem, false, "main");
    const deleteRemote = findMenuItem(menu, "Delete Remote Branch&#8230;");
    deleteRemote!.onClick();

    // When: confirmation dialog is accepted
    const confirmed = vi.mocked(showConfirmationDialog).mock.calls[0][1];
    confirmed();

    // Then: recordRecentAction("ref.deleteRemoteBranch") fires before sendMessage(deleteRemoteBranch)
    expect(recordRecentAction).toHaveBeenCalledWith(REPO, "ref.deleteRemoteBranch");
    expect(sendMessage).toHaveBeenCalledWith({
      command: "deleteRemoteBranch",
      repo: REPO,
      remoteName: "origin",
      branchName: "feature"
    });
    expect(vi.mocked(recordRecentAction).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(sendMessage).mock.invocationCallOrder[0]
    );
  });

  it("does not record or send when Delete Remote Branch confirm is cancelled (TC-076)", () => {
    // Case: TC-076
    // Given: Delete Remote Branch confirm dialog is shown (no callback invocation simulates cancel)
    const sourceElem = createMockElement(["remote"]);
    const menu = buildRefContextMenuItems(REPO, "origin/feature", sourceElem, false, "main");
    const deleteRemote = findMenuItem(menu, "Delete Remote Branch&#8230;");

    // When: the user cancels (confirm callback is never invoked)
    deleteRemote!.onClick();

    // Then: neither recordRecentAction nor sendMessage is called
    expect(showConfirmationDialog).toHaveBeenCalledTimes(1);
    expect(recordRecentAction).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});

describe("buildRefContextMenuItems tag menu recent actions exclusion (S15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not assign recentActionId to Delete Tag / Push Tag items (TC-077)", () => {
    // Case: TC-077
    // Given: a tag context menu
    const menu = buildRefContextMenuItems(
      REPO,
      "v1.0.0",
      createMockElement(["tag"]),
      false,
      "main"
    );

    // When: tag-only items are inspected
    const deleteTag = findMenuItem(menu, "Delete Tag&#8230;");
    const pushTag = findMenuItem(menu, "Push Tag&#8230;");

    // Then: tag-only actions remain unassigned (TC-066 と整合)
    expect(deleteTag?.recentActionId).toBeUndefined();
    expect(pushTag?.recentActionId).toBeUndefined();
  });

  // TC-078 (Type - union extension): "ref.deleteBranch" / "ref.deleteRemoteBranch" を
  // GG.RecentActionId として渡せることは、本ファイル内の recordRecentAction 呼び出し箇所
  // (TC-072 / TC-073 / TC-074) が `pnpm run typecheck` を通過することで担保される。
});

// --- S16: Remove Worktree チェックボックス名の raw 引き渡し（単一エスケープ境界） ---
// @see docs/testing/perspectives/web/refMenu-test.md
describe("removeWorktree checkbox raw name (S16)", () => {
  const AMPERSAND_BRANCH = "feature/a&b";
  const AMPERSAND_WORKTREE_PATH = "/home/user/project-a-b";
  const EXPECTED_CHECKBOX_NAME = "Also delete branch 'feature/a&b' (git branch -d)";

  const productionHtmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;"
  };

  function escapeHtmlLikeProduction(str: string): string {
    return str.replace(/[&<>"'/]/g, (match) => productionHtmlEscapes[match]);
  }

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
    vi.mocked(escapeHtml).mockImplementation(escapeHtmlLikeProduction);
  });

  afterEach(() => {
    vi.mocked(escapeHtml).mockImplementation((str: string) => str);
  });

  function openRemoveWorktreeDialog(): void {
    const sourceElem = createMockElement(["head"]);
    const menu = buildRefContextMenuItems(
      REPO,
      AMPERSAND_BRANCH,
      sourceElem,
      false,
      "main",
      undefined,
      { path: AMPERSAND_WORKTREE_PATH, isMainWorktree: false }
    );
    const removeItem = findMenuItem(menu, "Remove Worktree&#8230;");
    expect(removeItem).toBeDefined();
    removeItem!.onClick();
  }

  it("passes the raw branch name to the showFormDialog checkbox (TC-079)", () => {
    // Case: TC-079
    // Given: a worktree branch whose name contains & and / with production-like escaping active
    // When: the Remove Worktree menu action is clicked
    openRemoveWorktreeDialog();

    // Then: the checkbox name argument carries the raw name without &amp; / &#x2F; entities
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect(inputs).toHaveLength(1);
    const checkboxName = (inputs[0] as DialogCheckboxInput).name;
    expect(checkboxName).toBe(EXPECTED_CHECKBOX_NAME);
    expect(checkboxName).not.toContain("&amp;");
    expect(checkboxName).not.toContain("&#x2F;");
  });

  it("renders the checkbox label through the single dialogs escape boundary (TC-080)", async () => {
    // Case: TC-080
    // Given: the captured showFormDialog arguments from the Remove Worktree click
    openRemoveWorktreeDialog();
    const dialogCall = vi.mocked(showFormDialog).mock.calls[0];
    if (document.getElementById("dialog") === null) {
      const dialogElem = document.createElement("div");
      dialogElem.id = "dialog";
      document.body.appendChild(dialogElem);
      const dialogBackingElem = document.createElement("div");
      dialogBackingElem.id = "dialogBacking";
      document.body.appendChild(dialogBackingElem);
    }
    const actualDialogs =
      await vi.importActual<typeof import("../../web/dialogs")>("../../web/dialogs");

    // When: the real showFormDialog renders those arguments into the DOM
    actualDialogs.showFormDialog(dialogCall[0], dialogCall[1], dialogCall[2], vi.fn(), null);

    // Then: the checkbox label shows feature/a&b as-is with no literal double-escape artifacts
    const label = document.querySelector("#dialog label");
    expect(label).not.toBeNull();
    expect(label!.textContent).toContain(AMPERSAND_BRANCH);
    expect(label!.textContent).not.toContain("&amp;");
    expect(label!.textContent).not.toContain("&#x2F;");
    actualDialogs.hideDialog();
  });
});
