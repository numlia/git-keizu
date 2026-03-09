// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../web/dialogs", () => ({
  showCheckboxDialog: vi.fn(),
  showConfirmationDialog: vi.fn(),
  showFormDialog: vi.fn(),
  showSelectDialog: vi.fn()
}));

vi.mock("../../web/utils", () => ({
  escapeHtml: vi.fn((str: string) => str),
  sendMessage: vi.fn(),
  ELLIPSIS: "&#8230;"
}));

import { showFormDialog } from "../../web/dialogs";
import { buildUncommittedContextMenuItems } from "../../web/uncommittedMenu";

const REPO = "/test/repo";

function createMockElement(): HTMLElement {
  return document.createElement("div");
}

// --- S1: Stash Push Include Untracked デフォルト値 ---

describe("Stash Push Include Untracked default value (S1)", () => {
  function setupViewState(includeUntracked: boolean) {
    (globalThis as Record<string, unknown>).viewState = {
      dialogDefaults: {
        merge: { noFastForward: true, squashCommits: false, noCommit: false },
        cherryPick: { recordOrigin: false, noCommit: false },
        stashUncommittedChanges: { includeUntracked }
      }
    };
  }

  function getStashItem() {
    const items = buildUncommittedContextMenuItems(REPO, createMockElement());
    return items[0]!;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Include Untracked checkbox is ON when setting is true (TC-001)", () => {
    // Given: viewState.dialogDefaults.stashUncommittedChanges.includeUntracked = true
    setupViewState(true);
    const item = getStashItem();

    // When: Stash uncommitted changes is clicked
    item.onClick();

    // Then: Include Untracked checkbox value is true
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    const checkboxInput = inputs[1] as DialogCheckboxInput;
    expect(checkboxInput.value).toBe(true);
  });

  it("Include Untracked checkbox is OFF when setting is false (TC-002)", () => {
    // Given: viewState.dialogDefaults.stashUncommittedChanges.includeUntracked = false
    setupViewState(false);
    const item = getStashItem();

    // When: Stash uncommitted changes is clicked
    item.onClick();

    // Then: Include Untracked checkbox value is false
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    const checkboxInput = inputs[1] as DialogCheckboxInput;
    expect(checkboxInput.value).toBe(false);
  });

  it("Stash dialog has text + checkbox (2 elements) via showFormDialog (TC-003)", () => {
    // Given: Default view state
    setupViewState(false);
    const item = getStashItem();

    // When: Stash uncommitted changes is clicked
    item.onClick();

    // Then: showFormDialog is called with text (Message) + checkbox (Include Untracked)
    expect(showFormDialog).toHaveBeenCalledTimes(1);
    const inputs = vi.mocked(showFormDialog).mock.calls[0][1];
    expect(inputs).toHaveLength(2);
    expect(inputs[0].type).toBe("text");
    expect(inputs[0].name).toBe("Message: ");
    expect(inputs[1].type).toBe("checkbox");
    expect(inputs[1].name).toBe("Include Untracked");
  });
});
