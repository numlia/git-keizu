// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../web/contextMenu", () => ({
  recordRecentAction: vi.fn()
}));

import { recordRecentAction } from "../../web/contextMenu";
import {
  buildFileContextMenuItems,
  canHighlightFileHistory,
  type FileHistoryMenuContext,
  type FileMenuExpandedCommit,
  resolveFileRow,
  sendHighlightFileHistoryAction,
  sendOpenFileAction
} from "../../web/fileMenu";
import { vscode } from "../../web/utils";

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const TEST_REPO = "/path/to/repo";
const COMMIT_HASH = "abc123def456";
const OPEN_FILE_TITLE = "Open File";
const HIGHLIGHT_TITLE = "Highlight File History";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeFileRow(dataset: Record<string, string> = {}, type = "M"): HTMLElement {
  const li = document.createElement("li");
  li.className = `gitFile ${type} gitDiffPossible`;
  for (const [key, value] of Object.entries(dataset)) {
    li.dataset[key] = value;
  }
  li.dataset.type = type;
  return li;
}

/** A `.gitFile` row whose dataset deliberately lacks `data-type`. */
function makeUntypedFileRow(dataset: Record<string, string>): HTMLElement {
  const li = document.createElement("li");
  li.className = "gitFile gitDiffPossible";
  for (const [key, value] of Object.entries(dataset)) {
    li.dataset[key] = value;
  }
  return li;
}

function makeExpandedCommit(hash = COMMIT_HASH): FileMenuExpandedCommit {
  return { hash, compareWithHash: null };
}

function makeFileHistoryContext(
  overrides: Partial<FileHistoryMenuContext> = {}
): FileHistoryMenuContext {
  return { isStash: false, onHighlightFileHistory: vi.fn(), ...overrides };
}

/* ------------------------------------------------------------------ */
/* S1: file row Open File action request payload 解決                 */
/* ------------------------------------------------------------------ */

describe("sendOpenFileAction", () => {
  beforeEach(() => {
    vi.mocked(vscode.postMessage).mockClear();
  });

  // TC-001: encoded path と expandedCommit.hash ありで正しい payload が送られる
  it("sends openFile message with decoded filePath (TC-001)", () => {
    // Given: a .gitFile row with encoded newfilepath and valid expandedCommit
    const row = makeFileRow({ newfilepath: "src%2Ffile.ts" });
    const commit = makeExpandedCommit();

    // When: sendOpenFileAction is called
    sendOpenFileAction(row, commit, TEST_REPO);

    // Then: postMessage is called once with correct payload
    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "openFile",
      repo: TEST_REPO,
      filePath: "src/file.ts",
      commitHash: COMMIT_HASH
    });
  });

  // TC-002: 日本語・空白を含む URI エンコード済みパスが正しくデコードされる
  it("decodes special characters including Japanese and spaces (TC-002)", () => {
    // Given: a .gitFile row with Japanese and space in encoded path
    const encoded = encodeURIComponent("src/テスト ファイル.ts");
    const row = makeFileRow({ newfilepath: encoded });
    const commit = makeExpandedCommit();

    // When: sendOpenFileAction is called
    sendOpenFileAction(row, commit, TEST_REPO);

    // Then: filePath is fully decoded
    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vscode.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: "src/テスト ファイル.ts"
      })
    );
  });

  // TC-003: expandedCommit が null のとき sendMessage が呼ばれない
  it("does not send message when expandedCommit is null (TC-003)", () => {
    // Given: a valid file row but expandedCommit is null
    const row = makeFileRow({ newfilepath: "src%2Ffile.ts" });

    // When: sendOpenFileAction is called with null expandedCommit
    sendOpenFileAction(row, null, TEST_REPO);

    // Then: no message is sent
    expect(vscode.postMessage).not.toHaveBeenCalled();
  });

  // TC-004: data-newfilepath が存在しないとき sendMessage が呼ばれない
  it("does not send message when data-newfilepath is missing (TC-004)", () => {
    // Given: a .gitFile row without data-newfilepath
    const row = makeFileRow({});
    const commit = makeExpandedCommit();

    // When: sendOpenFileAction is called
    sendOpenFileAction(row, commit, TEST_REPO);

    // Then: no message is sent
    expect(vscode.postMessage).not.toHaveBeenCalled();
  });

  // TC-005: deleted file row でも openFile payload が送られる
  it("sends openFile message for deleted file row (TC-005)", () => {
    // Given: a deleted file row (type=D) with data-newfilepath present
    const row = makeFileRow({ newfilepath: "src%2Fdeleted.ts" }, "D");
    const commit = makeExpandedCommit();

    // When: sendOpenFileAction is called
    sendOpenFileAction(row, commit, TEST_REPO);

    // Then: message is sent (host decides success/failure)
    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vscode.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "openFile",
        filePath: "src/deleted.ts"
      })
    );
  });

  // TC-006: fileRow が null のとき例外を投げず sendMessage が呼ばれない
  it("does not throw and does not send message when fileRow is null (TC-006)", () => {
    // Given: resolveFileRow returns null for a target outside .gitFile
    const span = document.createElement("span");
    const resolved = resolveFileRow(span);

    // When: sendOpenFileAction is called with null fileRow
    sendOpenFileAction(resolved, makeExpandedCommit(), TEST_REPO);

    // Then: no message is sent and no exception is thrown
    expect(vscode.postMessage).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* S4: Highlight File History item の表示条件と callback              */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/fileMenu-test.md
describe("buildFileContextMenuItems Highlight File History item (S4)", () => {
  beforeEach(() => {
    vi.mocked(vscode.postMessage).mockClear();
    vi.mocked(recordRecentAction).mockClear();
  });

  it("returns Open File followed by Highlight File History for a modified row (TC-015)", () => {
    // Case: TC-015
    // Given: a type M row, a normal commit and a non-stash context
    const row = makeFileRow({ newfilepath: "src%2Ffile.ts" });

    // When: the menu items are built
    const items = buildFileContextMenuItems(
      row,
      makeExpandedCommit("abc"),
      TEST_REPO,
      makeFileHistoryContext()
    );

    // Then: exactly two items in the fixed order
    expect(items).toHaveLength(2);
    expect(items[0]!.title).toBe(OPEN_FILE_TITLE);
    expect(items[1]!.title).toBe(HIGHLIGHT_TITLE);
  });

  it("calls onHighlightFileHistory with the anchor and the decoded path (TC-016)", () => {
    // Case: TC-016
    // Given: the base fixture
    const context = makeFileHistoryContext();
    const items = buildFileContextMenuItems(
      makeFileRow({ newfilepath: "src%2Ffile.ts" }),
      makeExpandedCommit("abc"),
      TEST_REPO,
      context
    );

    // When: the second item is clicked
    items[1]!.onClick();

    // Then: the callback receives ("abc", "src/file.ts") once and nothing is posted
    expect(context.onHighlightFileHistory).toHaveBeenCalledTimes(1);
    expect(context.onHighlightFileHistory).toHaveBeenCalledWith("abc", "src/file.ts");
    expect(vscode.postMessage).toHaveBeenCalledTimes(0);
  });

  it("gives the Highlight File History item no recentActionId (TC-017)", () => {
    // Case: TC-017
    // Given: the base fixture
    const items = buildFileContextMenuItems(
      makeFileRow({ newfilepath: "src%2Ffile.ts" }),
      makeExpandedCommit("abc"),
      TEST_REPO,
      makeFileHistoryContext()
    );

    // When: the second item is clicked
    items[1]!.onClick();

    // Then: no recent action id and no recent action recorded
    expect(items[1]!.recentActionId).toBeUndefined();
    expect(recordRecentAction).toHaveBeenCalledTimes(0);
  });

  it("offers the item for A, D and R rows (TC-018)", () => {
    // Case: TC-018
    // Given: rows of the other allowed change types
    for (const type of ["A", "D", "R"]) {
      // When: the menu items are built
      const items = buildFileContextMenuItems(
        makeFileRow({ newfilepath: "src%2Ffile.ts" }, type),
        makeExpandedCommit("abc"),
        TEST_REPO,
        makeFileHistoryContext()
      );

      // Then: two items with the history item second
      expect(items, type).toHaveLength(2);
      expect(items[1]!.title).toBe(HIGHLIGHT_TITLE);
    }
  });

  it("offers only Open File for a typechange row (TC-019)", () => {
    // Case: TC-019
    // Given: a type T row
    // When: the menu items are built
    const items = buildFileContextMenuItems(
      makeFileRow({ newfilepath: "src%2Ffile.ts" }, "T"),
      makeExpandedCommit("abc"),
      TEST_REPO,
      makeFileHistoryContext()
    );

    // Then: a single Open File item
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe(OPEN_FILE_TITLE);
  });

  it("offers only Open File when data-type is missing (TC-020)", () => {
    // Case: TC-020
    // Given: a row without data-type
    // When: the menu items are built
    const items = buildFileContextMenuItems(
      makeUntypedFileRow({ newfilepath: "src%2Ffile.ts" }),
      makeExpandedCommit("abc"),
      TEST_REPO,
      makeFileHistoryContext()
    );

    // Then: a single Open File item
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe(OPEN_FILE_TITLE);
  });

  it("offers only Open File for uncommitted changes (TC-021)", () => {
    // Case: TC-021
    // Given: the uncommitted changes hash as the expanded commit
    // When: the menu items are built
    const items = buildFileContextMenuItems(
      makeFileRow({ newfilepath: "src%2Ffile.ts" }),
      makeExpandedCommit("*"),
      TEST_REPO,
      makeFileHistoryContext()
    );

    // Then: a single Open File item
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe(OPEN_FILE_TITLE);
  });

  it("offers only Open File for a stash commit (TC-022)", () => {
    // Case: TC-022
    // Given: a context flagged as stash
    // When: the menu items are built
    const items = buildFileContextMenuItems(
      makeFileRow({ newfilepath: "src%2Ffile.ts" }),
      makeExpandedCommit("abc"),
      TEST_REPO,
      makeFileHistoryContext({ isStash: true })
    );

    // Then: a single Open File item
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe(OPEN_FILE_TITLE);
  });

  it("offers only Open File in comparison mode (TC-023)", () => {
    // Case: TC-023
    // Given: an expanded commit with a compare target
    // When: the menu items are built
    const items = buildFileContextMenuItems(
      makeFileRow({ newfilepath: "src%2Ffile.ts" }),
      { hash: "abc", compareWithHash: "def" },
      TEST_REPO,
      makeFileHistoryContext()
    );

    // Then: a single Open File item
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe(OPEN_FILE_TITLE);
  });

  it("returns an empty array without a commit context (TC-024)", () => {
    // Case: TC-024
    // Given: expandedCommit null
    // When: the menu items are built
    const items = buildFileContextMenuItems(
      makeFileRow({ newfilepath: "src%2Ffile.ts" }),
      null,
      TEST_REPO,
      makeFileHistoryContext()
    );

    // Then: the existing guard still yields []
    expect(items).toEqual([]);
  });

  it("returns an empty array when data-newfilepath is missing (TC-025)", () => {
    // Case: TC-025
    // Given: a row without data-newfilepath
    // When: the menu items are built
    const items = buildFileContextMenuItems(
      makeFileRow({}),
      makeExpandedCommit("abc"),
      TEST_REPO,
      makeFileHistoryContext()
    );

    // Then: the existing guard still yields []
    expect(items).toEqual([]);
  });

  it("keeps the Open File item's recent action and payload (TC-026)", () => {
    // Case: TC-026
    // Given: the base fixture
    const items = buildFileContextMenuItems(
      makeFileRow({ newfilepath: "src%2Ffile.ts" }),
      makeExpandedCommit("abc"),
      TEST_REPO,
      makeFileHistoryContext()
    );

    // When: the first item is clicked
    items[0]!.onClick();

    // Then: recentActionId, the recent action record and the openFile payload are unchanged
    expect(items[0]!.recentActionId).toBe("file.openFile");
    expect(recordRecentAction).toHaveBeenCalledTimes(1);
    expect(recordRecentAction).toHaveBeenCalledWith(TEST_REPO, "file.openFile");
    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "openFile",
      repo: TEST_REPO,
      filePath: "src/file.ts",
      commitHash: "abc"
    });
  });

  it("decodes spaces and Japanese characters before the callback (TC-027)", () => {
    // Case: TC-027
    // Given: an encoded path with a space and Japanese characters
    const context = makeFileHistoryContext();
    const row = makeFileRow({ newfilepath: encodeURIComponent("src/テスト ファイル.ts") });

    // When: the history item is clicked
    buildFileContextMenuItems(row, makeExpandedCommit("abc"), TEST_REPO, context)[1]!.onClick();

    // Then: the callback receives the fully decoded string
    expect(context.onHighlightFileHistory).toHaveBeenCalledWith("abc", "src/テスト ファイル.ts");
  });
});

/* ------------------------------------------------------------------ */
/* S5: Open File item の維持（4 引数 signature）                       */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/fileMenu-test.md
describe("buildFileContextMenuItems Open File item under the 4-argument signature (S5)", () => {
  beforeEach(() => {
    vi.mocked(vscode.postMessage).mockClear();
    vi.mocked(recordRecentAction).mockClear();
  });

  it("keeps Open File as the first and only Open File item (TC-028)", () => {
    // Case: TC-028
    // Given: a valid .gitFile row with expandedCommit and repo
    const row = makeFileRow({ newfilepath: "src%2Ffile.ts" });

    // When: the menu items are built
    const items = buildFileContextMenuItems(
      row,
      makeExpandedCommit(),
      TEST_REPO,
      makeFileHistoryContext()
    );

    // Then: the first item is Open File and no other item carries that title
    expect(items[0]!.title).toBe(OPEN_FILE_TITLE);
    expect(items.filter((item) => item !== null && item.title === OPEN_FILE_TITLE)).toHaveLength(1);
  });

  it("keeps Open File first for a deleted file row (TC-029)", () => {
    // Case: TC-029
    // Given: a deleted file row (type=D) with data-newfilepath
    const row = makeFileRow({ newfilepath: "src%2Fdeleted.ts" }, "D");

    // When: the menu items are built
    const items = buildFileContextMenuItems(
      row,
      makeExpandedCommit(),
      TEST_REPO,
      makeFileHistoryContext()
    );

    // Then: the menu is not empty and starts with Open File
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]!.title).toBe(OPEN_FILE_TITLE);
  });

  it("sends the same openFile payload as the icon click from the first item (TC-030)", () => {
    // Case: TC-030
    // Given: a valid file row and menu items built
    const row = makeFileRow({ newfilepath: "src%2Ffile.ts" });
    const items = buildFileContextMenuItems(
      row,
      makeExpandedCommit(),
      TEST_REPO,
      makeFileHistoryContext()
    );

    // When: the first item's onClick is invoked
    items[0]!.onClick();

    // Then: exactly one openFile payload with the icon click structure
    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "openFile",
      repo: TEST_REPO,
      filePath: "src/file.ts",
      commitHash: COMMIT_HASH
    });
  });

  it("records the recent action before posting openFile (TC-031)", () => {
    // Case: TC-031
    // Given: a valid Open File menu item
    const row = makeFileRow({ newfilepath: "src%2Ffile.ts" });
    const items = buildFileContextMenuItems(
      row,
      makeExpandedCommit(),
      TEST_REPO,
      makeFileHistoryContext()
    );

    // When: the first item is clicked
    items[0]!.onClick();

    // Then: recordRecentAction(repo, "file.openFile") runs once, before the payload is posted
    expect(recordRecentAction).toHaveBeenCalledTimes(1);
    expect(recordRecentAction).toHaveBeenCalledWith(TEST_REPO, "file.openFile");
    expect(vi.mocked(recordRecentAction).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(vscode.postMessage).mock.invocationCallOrder[0]
    );
  });

  it("records no recent action when the menu cannot be built (TC-032)", () => {
    // Case: TC-032
    // Given: expandedCommit is null so no menu item can be created
    const row = makeFileRow({ newfilepath: "src%2Ffile.ts" });

    // When: the menu items are built
    const items = buildFileContextMenuItems(row, null, TEST_REPO, makeFileHistoryContext());

    // Then: no menu item exists and no recent action is recorded
    expect(items).toEqual([]);
    expect(recordRecentAction).toHaveBeenCalledTimes(0);
  });
});

/* ------------------------------------------------------------------ */
/* S6: 共有判定とアイコン起動                                          */
/* ------------------------------------------------------------------ */

const ANCHOR_HASH = "abc";
const COMPARE_HASH = "def";
const ENCODED_BASE_PATH = "src%2Ffile.ts";

// @see docs/testing/perspectives/web/fileMenu-test.md
describe("canHighlightFileHistory (S6)", () => {
  it("returns true for a modified row on a normal commit (TC-033)", () => {
    // Case: TC-033
    // Given: a normal commit, no stash and change type M
    // When: the shared check runs
    const result = canHighlightFileHistory(makeExpandedCommit(ANCHOR_HASH), false, "M");

    // Then: eligible
    expect(result).toBe(true);
  });

  it("returns true for A, D and R change types (TC-034)", () => {
    // Case: TC-034
    // Given: the other allowed change types
    for (const type of ["A", "D", "R"]) {
      // When: the shared check runs
      const result = canHighlightFileHistory(makeExpandedCommit(ANCHOR_HASH), false, type);

      // Then: eligible
      expect(result, type).toBe(true);
    }
  });

  it("returns false for a typechange row (TC-035)", () => {
    // Case: TC-035
    // Given: change type T
    // When: the shared check runs
    const result = canHighlightFileHistory(makeExpandedCommit(ANCHOR_HASH), false, "T");

    // Then: not eligible
    expect(result).toBe(false);
  });

  it("returns false when the change type is undefined (TC-036)", () => {
    // Case: TC-036
    // Given: a missing data-type
    // When: the shared check runs
    const result = canHighlightFileHistory(makeExpandedCommit(ANCHOR_HASH), false, undefined);

    // Then: not eligible
    expect(result).toBe(false);
  });

  it("returns false for uncommitted changes (TC-037)", () => {
    // Case: TC-037
    // Given: the uncommitted changes hash
    // When: the shared check runs
    const result = canHighlightFileHistory(makeExpandedCommit("*"), false, "M");

    // Then: not eligible
    expect(result).toBe(false);
  });

  it("returns false for a stash commit (TC-038)", () => {
    // Case: TC-038
    // Given: isStash true
    // When: the shared check runs
    const result = canHighlightFileHistory(makeExpandedCommit(ANCHOR_HASH), true, "M");

    // Then: not eligible
    expect(result).toBe(false);
  });

  it("returns false in comparison mode (TC-039)", () => {
    // Case: TC-039
    // Given: a compare target
    // When: the shared check runs
    const result = canHighlightFileHistory(
      { hash: ANCHOR_HASH, compareWithHash: COMPARE_HASH },
      false,
      "M"
    );

    // Then: not eligible
    expect(result).toBe(false);
  });
});

// @see docs/testing/perspectives/web/fileMenu-test.md
describe("sendHighlightFileHistoryAction (S6)", () => {
  beforeEach(() => {
    vi.mocked(vscode.postMessage).mockClear();
    vi.mocked(recordRecentAction).mockClear();
  });

  it("calls onHighlightFileHistory once with the anchor and decoded path (TC-040)", () => {
    // Case: TC-040
    // Given: the base row, commit, repo and context
    const context = makeFileHistoryContext();

    // When: the action runs
    sendHighlightFileHistoryAction(
      makeFileRow({ newfilepath: ENCODED_BASE_PATH }),
      makeExpandedCommit(ANCHOR_HASH),
      TEST_REPO,
      context
    );

    // Then: the callback gets ("abc", "src/file.ts") once; nothing posted or recorded
    expect(context.onHighlightFileHistory).toHaveBeenCalledTimes(1);
    expect(context.onHighlightFileHistory).toHaveBeenCalledWith(ANCHOR_HASH, "src/file.ts");
    expect(vscode.postMessage).toHaveBeenCalledTimes(0);
    expect(recordRecentAction).toHaveBeenCalledTimes(0);
  });

  it("decodes spaces and Japanese characters before the callback (TC-041)", () => {
    // Case: TC-041
    // Given: an encoded path with a space and Japanese characters
    const context = makeFileHistoryContext();
    const row = makeFileRow({ newfilepath: encodeURIComponent("src/テスト ファイル.ts") });

    // When: the action runs
    sendHighlightFileHistoryAction(row, makeExpandedCommit(ANCHOR_HASH), TEST_REPO, context);

    // Then: the second argument is the fully decoded string
    expect(context.onHighlightFileHistory).toHaveBeenCalledTimes(1);
    expect(context.onHighlightFileHistory).toHaveBeenCalledWith(
      ANCHOR_HASH,
      "src/テスト ファイル.ts"
    );
  });

  it("does nothing and does not throw when the file row is null (TC-042)", () => {
    // Case: TC-042
    // Given: resolveFileRow() failed for a target outside .gitFile
    const context = makeFileHistoryContext();
    const resolved = resolveFileRow(document.createElement("span"));

    // When: the action runs with the null row
    expect(() =>
      sendHighlightFileHistoryAction(resolved, makeExpandedCommit(ANCHOR_HASH), TEST_REPO, context)
    ).not.toThrow();

    // Then: no callback
    expect(context.onHighlightFileHistory).toHaveBeenCalledTimes(0);
  });

  it("does nothing when expandedCommit is null (TC-043)", () => {
    // Case: TC-043
    // Given: no commit context
    const context = makeFileHistoryContext();

    // When: the action runs
    sendHighlightFileHistoryAction(
      makeFileRow({ newfilepath: ENCODED_BASE_PATH }),
      null,
      TEST_REPO,
      context
    );

    // Then: no callback
    expect(context.onHighlightFileHistory).toHaveBeenCalledTimes(0);
  });

  it("does nothing when repo is null (TC-044)", () => {
    // Case: TC-044
    // Given: no repo
    const context = makeFileHistoryContext();

    // When: the action runs
    sendHighlightFileHistoryAction(
      makeFileRow({ newfilepath: ENCODED_BASE_PATH }),
      makeExpandedCommit(ANCHOR_HASH),
      null,
      context
    );

    // Then: no callback
    expect(context.onHighlightFileHistory).toHaveBeenCalledTimes(0);
  });

  it("does nothing when data-newfilepath is missing (TC-045)", () => {
    // Case: TC-045
    // Given: a row without data-newfilepath
    const context = makeFileHistoryContext();

    // When: the action runs
    sendHighlightFileHistoryAction(
      makeFileRow({}),
      makeExpandedCommit(ANCHOR_HASH),
      TEST_REPO,
      context
    );

    // Then: no callback
    expect(context.onHighlightFileHistory).toHaveBeenCalledTimes(0);
  });

  it("does nothing on the negative side of each of the four conditions (TC-046)", () => {
    // Case: TC-046
    // Given: five inputs that each fail one condition at click time
    const baseRow = () => makeFileRow({ newfilepath: ENCODED_BASE_PATH });
    const inputs: {
      label: string;
      row: HTMLElement;
      commit: FileMenuExpandedCommit;
      isStash: boolean;
    }[] = [
      { label: "uncommitted", row: baseRow(), commit: makeExpandedCommit("*"), isStash: false },
      { label: "stash", row: baseRow(), commit: makeExpandedCommit(ANCHOR_HASH), isStash: true },
      {
        label: "compare",
        row: baseRow(),
        commit: { hash: ANCHOR_HASH, compareWithHash: COMPARE_HASH },
        isStash: false
      },
      {
        label: "typechange",
        row: makeFileRow({ newfilepath: ENCODED_BASE_PATH }, "T"),
        commit: makeExpandedCommit(ANCHOR_HASH),
        isStash: false
      },
      {
        label: "missing type",
        row: makeUntypedFileRow({ newfilepath: ENCODED_BASE_PATH }),
        commit: makeExpandedCommit(ANCHOR_HASH),
        isStash: false
      }
    ];

    for (const input of inputs) {
      const context = makeFileHistoryContext({ isStash: input.isStash });

      // When: the action runs
      sendHighlightFileHistoryAction(input.row, input.commit, TEST_REPO, context);

      // Then: no callback for that input
      expect(context.onHighlightFileHistory, input.label).toHaveBeenCalledTimes(0);
    }
  });

  it("calls the callback once for A, D and R rows (TC-047)", () => {
    // Case: TC-047
    // Given: rows of the other allowed change types
    for (const type of ["A", "D", "R"]) {
      const context = makeFileHistoryContext();

      // When: the action runs
      sendHighlightFileHistoryAction(
        makeFileRow({ newfilepath: ENCODED_BASE_PATH }, type),
        makeExpandedCommit(ANCHOR_HASH),
        TEST_REPO,
        context
      );

      // Then: exactly one callback whose first argument is the anchor hash
      expect(context.onHighlightFileHistory, type).toHaveBeenCalledTimes(1);
      expect(vi.mocked(context.onHighlightFileHistory).mock.calls[0][0], type).toBe(ANCHOR_HASH);
    }
  });
});
