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
  ELLIPSIS: "&#8230;"
}));

import {
  showCheckboxDialog,
  showConfirmationDialog,
  showFormDialog,
  showRefInputDialog
} from "../../web/dialogs";
import { buildRefContextMenuItems, checkoutBranchAction, parseRemoteRef } from "../../web/refMenu";
import { sendMessage } from "../../web/utils";

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

  it("shows checkbox dialog with fast-forward option when Merge (remote) is selected (TC-020)", () => {
    // Given: A remote branch element
    const sourceElem = createMockElement(["remote"]);
    const menu = buildRefContextMenuItems(REPO, "origin/feature", sourceElem, false, "main");

    // When: Merge into current branch item is clicked
    const mergeItem = menu
      .filter((item): item is ContextMenuElement => item !== null)
      .find((item) => item.title === "Merge into current branch&#8230;");
    mergeItem!.onClick();

    // Then: showCheckboxDialog is called with fast-forward option
    expect(showCheckboxDialog).toHaveBeenCalledTimes(1);
    const checkboxLabel = (showCheckboxDialog as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(checkboxLabel).toBe("Create a new commit even if fast-forward is possible");
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
