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
