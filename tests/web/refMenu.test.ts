// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../web/dialogs", () => ({
  showRefInputDialog: vi.fn(),
  showConfirmationDialog: vi.fn(),
  showCheckboxDialog: vi.fn(),
  showActionRunningDialog: vi.fn()
}));

vi.mock("../../web/utils", () => ({
  escapeHtml: vi.fn((str: string) => str),
  sendMessage: vi.fn(),
  ELLIPSIS: "&#8230;"
}));

import { showRefInputDialog } from "../../web/dialogs";
import { buildRefContextMenuItems, checkoutBranchAction } from "../../web/refMenu";
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
