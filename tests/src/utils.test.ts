import * as fs from "node:fs/promises";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockExecuteCommand = vi.fn();

vi.mock("vscode", () => ({
  env: {
    clipboard: {
      writeText: vi.fn()
    }
  },
  commands: {
    executeCommand: (...args: unknown[]) => mockExecuteCommand(...args)
  },
  Uri: {
    file: (p: string) => ({ scheme: "file", fsPath: p })
  },
  ViewColumn: {
    Active: -1,
    Beside: -2,
    One: 1,
    Two: 2,
    Three: 3,
    Four: 4,
    Five: 5,
    Six: 6,
    Seven: 7,
    Eight: 8,
    Nine: 9
  }
}));

vi.mock("node:fs/promises", () => ({
  access: vi.fn(),
  constants: { F_OK: 0 }
}));

import type { DataSource } from "../../src/dataSource";
import { UNCOMMITTED_CHANGES_HASH } from "../../src/types";
import {
  abbrevCommit,
  doesFileExist,
  evalPromises,
  getPathFromStr,
  openFile
} from "../../src/utils";

describe("abbrevCommit", () => {
  it("returns first 8 characters of a full commit hash", () => {
    expect(abbrevCommit("abcdef1234567890abcdef1234567890abcdef12")).toBe("abcdef12");
  });

  it("returns full string when shorter than 8 characters", () => {
    expect(abbrevCommit("abcde")).toBe("abcde");
  });

  it("returns exactly 8 characters for an 8-char input", () => {
    expect(abbrevCommit("12345678")).toBe("12345678");
  });
});

describe("getPathFromStr", () => {
  it("replaces backslashes with forward slashes", () => {
    expect(getPathFromStr("C:\\Users\\test\\project")).toBe("C:/Users/test/project");
  });

  it("leaves forward slashes unchanged", () => {
    expect(getPathFromStr("/home/user/project")).toBe("/home/user/project");
  });

  it("handles mixed slashes", () => {
    expect(getPathFromStr("C:\\Users/test\\project")).toBe("C:/Users/test/project");
  });

  it("handles empty string", () => {
    expect(getPathFromStr("")).toBe("");
  });

  it("handles consecutive backslashes", () => {
    expect(getPathFromStr("C:\\\\double")).toBe("C://double");
  });
});

describe("evalPromises", () => {
  it("resolves with empty array for empty input", async () => {
    const result = await evalPromises([], 3, async (x: number) => x * 2);
    expect(result).toEqual([]);
  });

  it("handles single element", async () => {
    const result = await evalPromises([5], 3, async (x: number) => x * 2);
    expect(result).toEqual([10]);
  });

  it("processes multiple elements with results in correct order", async () => {
    const result = await evalPromises([1, 2, 3, 4, 5], 2, async (x: number) => x * 10);
    expect(result).toEqual([10, 20, 30, 40, 50]);
  });

  it("respects maxParallel limit", async () => {
    let concurrentCount = 0;
    let maxConcurrent = 0;

    const result = await evalPromises([1, 2, 3, 4, 5], 2, async (x: number) => {
      concurrentCount++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);
      await new Promise((r) => setTimeout(r, 10));
      concurrentCount--;
      return x;
    });

    expect(result).toEqual([1, 2, 3, 4, 5]);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it("rejects when a promise fails (single element)", async () => {
    await expect(
      evalPromises([1], 3, async () => {
        throw new Error("fail");
      })
    ).rejects.toThrow("fail");
  });

  it("rejects when a promise fails (multiple elements)", async () => {
    await expect(
      evalPromises([1, 2, 3], 2, async (x: number) => {
        if (x === 2) throw new Error("fail");
        return x;
      })
    ).rejects.toThrow("fail");
  });
});

// S1: doesFileExist
describe("doesFileExist", () => {
  const mockAccess = vi.mocked(fs.access);

  beforeEach(() => {
    mockAccess.mockReset();
  });

  // TC-001: ファイルが存在する場合 true を返す
  it("returns true when file exists (TC-001)", async () => {
    // Given: fs.access resolves successfully
    mockAccess.mockResolvedValue(undefined);

    // When: doesFileExist is called with an existing path
    const result = await doesFileExist("/repo/src/file.ts");

    // Then: true is returned
    expect(result).toBe(true);
  });

  // TC-002: ファイルが存在しない場合 false を返す
  it("returns false when file does not exist (TC-002)", async () => {
    // Given: fs.access rejects with ENOENT
    mockAccess.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));

    // When: doesFileExist is called with a non-existing path
    const result = await doesFileExist("/repo/src/missing.ts");

    // Then: false is returned
    expect(result).toBe(false);
  });
});

// S2-S5: openFile
describe("openFile", () => {
  const REPO = "/repo";
  const VALID_HASH = "abc123def456";
  const mockAccess = vi.mocked(fs.access);
  const mockDataSource = {
    getNewPathOfRenamedFile: vi.fn()
  } as unknown as DataSource & { getNewPathOfRenamedFile: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAccess.mockReset();
    mockExecuteCommand.mockReset();
    (
      mockDataSource as unknown as { getNewPathOfRenamedFile: ReturnType<typeof vi.fn> }
    ).getNewPathOfRenamedFile.mockReset();
  });

  // S2: path traversal

  // TC-003: ".." セグメントを含むパスはエラーを返す
  it("returns error for path with '..' segment (TC-003)", async () => {
    // Given: filePath contains ".." segment
    const filePath = "../etc/passwd";

    // When: openFile is called with the traversal path
    const result = await openFile(REPO, filePath, VALID_HASH, mockDataSource, -1);

    // Then: error message is returned and vscode.open is not called
    expect(result).toBe("The file path is invalid.");
    expect(mockExecuteCommand).not.toHaveBeenCalled();
  });

  // TC-004: リポジトリ外パスはエラーを返す
  it("returns error when resolved path is outside repo (TC-004)", async () => {
    // Given: filePath that resolves outside the repo root (absolute path escape)
    const filePath = "/etc/passwd";

    // When: openFile is called
    const result = await openFile(REPO, filePath, VALID_HASH, mockDataSource, -1);

    // Then: error message is returned and vscode.open is not called
    expect(result).toBe("The file path is invalid.");
    expect(mockExecuteCommand).not.toHaveBeenCalled();
  });

  // TC-005: リネーム先パスがリポジトリ外の場合エラーを返す
  it("returns error when renamed path resolves outside repo (TC-005)", async () => {
    // Given: file doesn't exist + rename tracking returns a path that resolves outside repo
    mockAccess.mockRejectedValue(new Error("ENOENT"));
    (
      mockDataSource as unknown as { getNewPathOfRenamedFile: ReturnType<typeof vi.fn> }
    ).getNewPathOfRenamedFile.mockResolvedValue("/outside/repo/file.ts");

    // When: openFile is called
    const result = await openFile(REPO, "src/file.ts", VALID_HASH, mockDataSource, -1);

    // Then: error message is returned
    expect(result).toBe("The file path is invalid.");
  });

  // S3: normal open

  // TC-006: 存在するファイルをプレビューモードで開く
  it("opens existing file with preview and correct viewColumn (TC-006)", async () => {
    // Given: file exists
    mockAccess.mockResolvedValue(undefined);
    mockExecuteCommand.mockResolvedValue(undefined);

    // When: openFile is called with ViewColumn.Beside (-2)
    const result = await openFile(REPO, "src/file.ts", VALID_HASH, mockDataSource, -2);

    // Then: null is returned and vscode.open is called with correct args
    expect(result).toBeNull();
    expect(mockExecuteCommand).toHaveBeenCalledWith(
      "vscode.open",
      { scheme: "file", fsPath: "/repo/src/file.ts" },
      { preview: true, viewColumn: -2 }
    );
  });

  // TC-007: ViewColumn.One でファイルを開く
  it("passes ViewColumn.One to vscode.open (TC-007)", async () => {
    // Given: file exists and viewColumn is One (1)
    mockAccess.mockResolvedValue(undefined);
    mockExecuteCommand.mockResolvedValue(undefined);

    // When: openFile is called with ViewColumn.One
    const result = await openFile(REPO, "src/file.ts", VALID_HASH, mockDataSource, 1);

    // Then: viewColumn: 1 is passed to vscode.open
    expect(result).toBeNull();
    expect(mockExecuteCommand).toHaveBeenCalledWith(
      "vscode.open",
      expect.objectContaining({ fsPath: "/repo/src/file.ts" }),
      { preview: true, viewColumn: 1 }
    );
  });

  // S4: rename tracking

  // TC-008: ファイル不在時にリネーム追跡で新パスのファイルを開く
  it("opens renamed file when original doesn't exist (TC-008)", async () => {
    // Given: original file doesn't exist, rename tracking returns "renamed.ts", renamed.ts exists
    mockAccess.mockRejectedValueOnce(new Error("ENOENT")).mockResolvedValueOnce(undefined);
    (
      mockDataSource as unknown as { getNewPathOfRenamedFile: ReturnType<typeof vi.fn> }
    ).getNewPathOfRenamedFile.mockResolvedValue("renamed.ts");
    mockExecuteCommand.mockResolvedValue(undefined);

    // When: openFile is called
    const result = await openFile(REPO, "old.ts", VALID_HASH, mockDataSource, -1);

    // Then: null is returned and vscode.open is called with the renamed path
    expect(result).toBeNull();
    expect(mockExecuteCommand).toHaveBeenCalledWith(
      "vscode.open",
      { scheme: "file", fsPath: "/repo/renamed.ts" },
      { preview: true, viewColumn: -1 }
    );
  });

  // TC-009: リネーム追跡が null を返す場合エラーメッセージ
  it("returns error when rename tracking returns null (TC-009)", async () => {
    // Given: file doesn't exist + rename tracking returns null
    mockAccess.mockRejectedValue(new Error("ENOENT"));
    (
      mockDataSource as unknown as { getNewPathOfRenamedFile: ReturnType<typeof vi.fn> }
    ).getNewPathOfRenamedFile.mockResolvedValue(null);

    // When: openFile is called
    const result = await openFile(REPO, "old.ts", VALID_HASH, mockDataSource, -1);

    // Then: error message about file not existing is returned
    expect(result).toBe("The file old.ts doesn't currently exist in this repository.");
  });

  // TC-010: リネーム先ファイルも存在しない場合エラーメッセージ
  it("returns error when renamed file also doesn't exist (TC-010)", async () => {
    // Given: original file doesn't exist + rename tracking returns path + renamed file also doesn't exist
    mockAccess.mockRejectedValue(new Error("ENOENT"));
    (
      mockDataSource as unknown as { getNewPathOfRenamedFile: ReturnType<typeof vi.fn> }
    ).getNewPathOfRenamedFile.mockResolvedValue("renamed.ts");

    // When: openFile is called
    const result = await openFile(REPO, "old.ts", VALID_HASH, mockDataSource, -1);

    // Then: error message is returned
    expect(result).toBe("The file old.ts doesn't currently exist in this repository.");
  });

  // TC-011: UNCOMMITTED_CHANGES_HASH のときリネーム追跡がスキップされる
  it("skips rename tracking for uncommitted changes hash (TC-011)", async () => {
    // Given: file doesn't exist + commit hash is UNCOMMITTED_CHANGES_HASH
    mockAccess.mockRejectedValue(new Error("ENOENT"));

    // When: openFile is called with UNCOMMITTED_CHANGES_HASH
    const result = await openFile(REPO, "file.ts", UNCOMMITTED_CHANGES_HASH, mockDataSource, -1);

    // Then: rename tracking is skipped and error message is returned
    expect(mockDataSource.getNewPathOfRenamedFile).not.toHaveBeenCalled();
    expect(result).toBe("The file file.ts doesn't currently exist in this repository.");
  });

  // S5: error handling

  // TC-012: vscode.open が例外をスローした場合エラーメッセージ
  it("returns error when vscode.open throws (TC-012)", async () => {
    // Given: file exists but vscode.open throws
    mockAccess.mockResolvedValue(undefined);
    mockExecuteCommand.mockRejectedValue(new Error("editor error"));

    // When: openFile is called
    const result = await openFile(REPO, "src/file.ts", VALID_HASH, mockDataSource, -1);

    // Then: error message is returned
    expect(result).toBe("Visual Studio Code was unable to open src/file.ts.");
  });
});
