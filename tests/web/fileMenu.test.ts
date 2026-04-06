// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildFileContextMenuItems, resolveFileRow, sendOpenFileAction } from "../../web/fileMenu";
import { vscode } from "../../web/utils";

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const TEST_REPO = "/path/to/repo";
const COMMIT_HASH = "abc123def456";

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

function makeExpandedCommit(hash = COMMIT_HASH) {
  return { hash };
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
/* S2: buildFileContextMenuItems() menu item 構築                     */
/* ------------------------------------------------------------------ */

describe("buildFileContextMenuItems", () => {
  beforeEach(() => {
    vi.mocked(vscode.postMessage).mockClear();
  });

  // TC-007: 有効な row で Open File 1 項目だけ返す
  it("returns single 'Open File' menu item for valid file row (TC-007)", () => {
    // Given: a valid .gitFile row with expandedCommit and repo
    const row = makeFileRow({ newfilepath: "src%2Ffile.ts" });
    const commit = makeExpandedCommit();

    // When: buildFileContextMenuItems is called
    const items = buildFileContextMenuItems(row, commit, TEST_REPO);

    // Then: exactly 1 item with title "Open File"
    expect(items).toHaveLength(1);
    expect(items[0]).not.toBeNull();
    expect(items[0]!.title).toBe("Open File");
  });

  // TC-008: deleted file row でも items が空にならず Open File 1 件を返す
  it("returns 'Open File' for deleted file row (TC-008)", () => {
    // Given: a deleted file row (type=D) with data-newfilepath
    const row = makeFileRow({ newfilepath: "src%2Fdeleted.ts" }, "D");
    const commit = makeExpandedCommit();

    // When: buildFileContextMenuItems is called
    const items = buildFileContextMenuItems(row, commit, TEST_REPO);

    // Then: still returns 1 item
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe("Open File");
  });

  // TC-009: expandedCommit が null のとき空配列を返す
  it("returns empty array when expandedCommit is null (TC-009)", () => {
    // Given: a valid file row but expandedCommit is null
    const row = makeFileRow({ newfilepath: "src%2Ffile.ts" });

    // When: buildFileContextMenuItems is called
    const items = buildFileContextMenuItems(row, null, TEST_REPO);

    // Then: empty array
    expect(items).toEqual([]);
  });

  // TC-010: data-newfilepath 欠落で空配列を返す
  it("returns empty array when data-newfilepath is missing (TC-010)", () => {
    // Given: a .gitFile row without data-newfilepath
    const row = makeFileRow({});
    const commit = makeExpandedCommit();

    // When: buildFileContextMenuItems is called
    const items = buildFileContextMenuItems(row, commit, TEST_REPO);

    // Then: empty array
    expect(items).toEqual([]);
  });

  // TC-011: menu item の onClick が icon click と同一構造の payload を送る
  it("onClick sends same payload structure as direct action (TC-011)", () => {
    // Given: a valid file row and menu items built
    const row = makeFileRow({ newfilepath: "src%2Ffile.ts" });
    const commit = makeExpandedCommit();
    const items = buildFileContextMenuItems(row, commit, TEST_REPO);

    // When: the menu item's onClick is invoked
    items[0]!.onClick();

    // Then: payload matches the icon click structure exactly
    expect(vscode.postMessage).toHaveBeenCalledTimes(1);
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "openFile",
      repo: TEST_REPO,
      filePath: "src/file.ts",
      commitHash: COMMIT_HASH
    });
  });
});
