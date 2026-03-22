import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fsMocks,
  repoManagerInternals,
  resetRepoManagerTestEnvironment
} from "./repoManager.testUtils";

type StatResult = Awaited<ReturnType<typeof fsMocks.stat>>;

function createStatResult(directory: boolean): StatResult {
  return {
    isDirectory: () => directory
  } as unknown as StatResult;
}

describe("RepoManager file system utilities", () => {
  beforeEach(() => {
    resetRepoManagerTestEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isDirectory", () => {
    it("TC-085: returns true when fs.stat reports a directory path", async () => {
      // Case: TC-085
      const directoryPath = "/workspace/directory";
      fsMocks.stat.mockResolvedValue(createStatResult(true));

      // Given: fs.stat succeeds and stats.isDirectory() returns true
      // When: isDirectory is executed
      const result = await repoManagerInternals.isDirectory(directoryPath);

      // Then: The helper returns true
      expect(result).toBe(true);
      expect(fsMocks.stat).toHaveBeenCalledWith(directoryPath);
    });

    it("TC-086: returns false when fs.stat reports a file path", async () => {
      // Case: TC-086
      const filePath = "/workspace/file.txt";
      fsMocks.stat.mockResolvedValue(createStatResult(false));

      // Given: fs.stat succeeds and stats.isDirectory() returns false
      // When: isDirectory is executed
      const result = await repoManagerInternals.isDirectory(filePath);

      // Then: The helper returns false
      expect(result).toBe(false);
      expect(fsMocks.stat).toHaveBeenCalledWith(filePath);
    });

    it("TC-087: returns false when fs.stat throws for a missing path", async () => {
      // Case: TC-087
      const missingPath = "/workspace/missing";
      fsMocks.stat.mockRejectedValue(new Error("ENOENT"));

      // Given: fs.stat throws while inspecting the path
      // When: isDirectory is executed
      const result = await repoManagerInternals.isDirectory(missingPath);

      // Then: The helper catches the error and returns false
      expect(result).toBe(false);
      expect(fsMocks.stat).toHaveBeenCalledWith(missingPath);
    });
  });

  describe("doesPathExist", () => {
    it("TC-088: returns true when fs.stat succeeds for the path", async () => {
      // Case: TC-088
      const existingPath = "/workspace/existing";
      fsMocks.stat.mockResolvedValue(createStatResult(false));

      // Given: fs.stat succeeds for the path
      // When: doesPathExist is executed
      const result = await repoManagerInternals.doesPathExist(existingPath);

      // Then: The helper returns true
      expect(result).toBe(true);
      expect(fsMocks.stat).toHaveBeenCalledWith(existingPath);
    });

    it("TC-089: returns false when fs.stat throws for a missing path", async () => {
      // Case: TC-089
      const missingPath = "/workspace/missing";
      fsMocks.stat.mockRejectedValue(new Error("ENOENT"));

      // Given: fs.stat throws while checking the path
      // When: doesPathExist is executed
      const result = await repoManagerInternals.doesPathExist(missingPath);

      // Then: The helper catches the error and returns false
      expect(result).toBe(false);
      expect(fsMocks.stat).toHaveBeenCalledWith(missingPath);
    });
  });
});
