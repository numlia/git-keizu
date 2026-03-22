import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createManager,
  createRepoState,
  fsMocks,
  type RepoManagerWithPrivate,
  resetRepoManagerTestEnvironment,
  setWorkspaceFolders
} from "./repoManager.testUtils";

type StatResult = Awaited<ReturnType<typeof fsMocks.stat>>;

function createStatResult(directory: boolean): StatResult {
  return {
    isDirectory: () => directory
  } as unknown as StatResult;
}

describe("RepoManager discovery flows", () => {
  beforeEach(() => {
    resetRepoManagerTestEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("searchDirectoryForRepos", () => {
    it("TC-054: returns false immediately when the directory is already inside a known repo", async () => {
      // Case: TC-054
      const { dataSource, manager } = createManager({
        repos: { "/workspace/repo": createRepoState() }
      });
      const internal = manager as RepoManagerWithPrivate;

      // Given: The target directory is nested under a repo that is already tracked
      // When: searchDirectoryForRepos is executed
      const result = await internal.searchDirectoryForRepos("/workspace/repo/sub", 1);

      // Then: The guard returns false before any repository lookup happens
      expect(result).toBe(false);
      expect(dataSource.isGitRepository).not.toHaveBeenCalled();
    });

    it("TC-055: adds the directory and returns true when the directory itself is a git repository", async () => {
      // Case: TC-055
      const repo = "/workspace/repo";
      const { dataSource, extensionState, manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      dataSource.isGitRepository.mockResolvedValueOnce(true);

      // Given: The target directory is a git repository root
      // When: searchDirectoryForRepos is executed
      const result = await internal.searchDirectoryForRepos(repo, 1);

      // Then: The repo is added, the method returns true, and the updated state is persisted
      expect(result).toBe(true);
      expect(manager.getRepos()).toEqual({ [repo]: createRepoState() });
      expect(extensionState.saveRepos).toHaveBeenCalledTimes(1);
    });

    it("TC-056: recurses into subdirectories and returns true when a child git repository is discovered", async () => {
      // Case: TC-056
      const root = "/workspace/root";
      const childA = `${root}/a`;
      const childB = `${root}/b`;
      const { dataSource, manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      fsMocks.readdir.mockResolvedValue(["a", "b"]);
      fsMocks.stat.mockImplementation(async (path) =>
        createStatResult(path === childA || path === childB)
      );
      dataSource.isGitRepository.mockImplementation(async (path) => path === childB);

      // Given: The root is not a repo, but one child directory is a repo and both children are directories
      // When: searchDirectoryForRepos is executed with maxDepth 1
      const result = await internal.searchDirectoryForRepos(root, 1);

      // Then: The child repo is discovered through recursion and the method returns true
      expect(result).toBe(true);
      expect(manager.getRepos()).toEqual({ [childB]: createRepoState() });
    });

    it("TC-057: returns false without recursing when maxDepth is zero", async () => {
      // Case: TC-057
      const root = "/workspace/root";
      const { dataSource, manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      dataSource.isGitRepository.mockResolvedValueOnce(false);

      // Given: The target directory is not a repo and the recursion depth is zero
      // When: searchDirectoryForRepos is executed
      const result = await internal.searchDirectoryForRepos(root, 0);

      // Then: No directory listing occurs and the method returns false
      expect(result).toBe(false);
      expect(fsMocks.readdir).not.toHaveBeenCalled();
    });

    it("TC-058: skips the .git entry when enumerating child directories", async () => {
      // Case: TC-058
      const root = "/workspace/root";
      const childRepo = `${root}/repo`;
      const gitPath = `${root}/.git`;
      const { dataSource, manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      fsMocks.readdir.mockResolvedValue([".git", "repo"]);
      fsMocks.stat.mockImplementation(async (path) => createStatResult(path === childRepo));
      dataSource.isGitRepository.mockImplementation(async (path) => path === childRepo);

      // Given: The directory contains a .git entry and one real child directory that is a repo
      // When: searchDirectoryForRepos is executed
      const result = await internal.searchDirectoryForRepos(root, 1);

      // Then: The .git entry is skipped, the child repo is found, and the method returns true
      expect(result).toBe(true);
      expect(fsMocks.stat).not.toHaveBeenCalledWith(gitPath);
      expect(manager.getRepos()).toEqual({ [childRepo]: createRepoState() });
    });

    it("TC-059: returns false after exploring all child directories when no repo is found", async () => {
      // Case: TC-059
      const root = "/workspace/root";
      const childA = `${root}/a`;
      const childB = `${root}/b`;
      const { dataSource, manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      fsMocks.readdir.mockResolvedValue(["a", "b"]);
      fsMocks.stat.mockImplementation(async (path) =>
        createStatResult(path === childA || path === childB)
      );
      dataSource.isGitRepository.mockResolvedValue(false);

      // Given: The root and every child directory are not git repositories
      // When: searchDirectoryForRepos is executed
      const result = await internal.searchDirectoryForRepos(root, 1);

      // Then: The full search completes and the method returns false without adding repos
      expect(result).toBe(false);
      expect(manager.getRepos()).toEqual({});
    });

    it("TC-060: returns false when fs.readdir fails while enumerating subdirectories", async () => {
      // Case: TC-060
      const root = "/workspace/root";
      const { dataSource, manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      dataSource.isGitRepository.mockResolvedValueOnce(false);
      fsMocks.readdir.mockRejectedValue(new Error("EACCES"));

      // Given: The root is not a repo and listing the directory contents fails
      // When: searchDirectoryForRepos is executed
      const result = await internal.searchDirectoryForRepos(root, 1);

      // Then: The inner readdir failure is caught and the method returns false
      expect(result).toBe(false);
      expect(manager.getRepos()).toEqual({});
    });

    it("TC-061: returns false when isGitRepository throws an API error", async () => {
      // Case: TC-061
      const root = "/workspace/root";
      const { dataSource, manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      dataSource.isGitRepository.mockRejectedValue(new Error("git API failed"));

      // Given: The data source throws while checking whether the directory is a git repository
      // When: searchDirectoryForRepos is executed
      const result = await internal.searchDirectoryForRepos(root, 1);

      // Then: The outer catch converts the failure into a false result
      expect(result).toBe(false);
      expect(manager.getRepos()).toEqual({});
    });

    it("TC-062: returns false when the target directory path does not exist", async () => {
      // Case: TC-062
      const missingPath = "/workspace/missing";
      const { dataSource, manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      dataSource.isGitRepository.mockRejectedValue(new Error("ENOENT"));

      // Given: The target path does not exist and the repository check fails accordingly
      // When: searchDirectoryForRepos is executed
      const result = await internal.searchDirectoryForRepos(missingPath, 1);

      // Then: The method catches the failure and returns false
      expect(result).toBe(false);
      expect(manager.getRepos()).toEqual({});
    });

    it("TC-063: returns false when the directory contains only files and no subdirectories", async () => {
      // Case: TC-063
      const root = "/workspace/root";
      const { dataSource, manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      dataSource.isGitRepository.mockResolvedValueOnce(false);
      fsMocks.readdir.mockResolvedValue(["file.txt"]);
      fsMocks.stat.mockResolvedValue(createStatResult(false));

      // Given: The root is not a repo and its contents are files rather than directories
      // When: searchDirectoryForRepos is executed
      const result = await internal.searchDirectoryForRepos(root, 1);

      // Then: No recursive search occurs and the method returns false
      expect(result).toBe(false);
      expect(dataSource.isGitRepository).toHaveBeenCalledTimes(1);
      expect(manager.getRepos()).toEqual({});
    });
  });

  describe("searchWorkspaceForRepos", () => {
    it("TC-099: does nothing when workspaceFolders is undefined", async () => {
      // Case: TC-099
      setWorkspaceFolders(undefined);
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const searchSpy = vi.spyOn(internal, "searchDirectoryForRepos").mockResolvedValue(false);
      const sendSpy = vi.spyOn(internal, "sendRepos");

      // Given: vscode.workspace.workspaceFolders is undefined
      // When: searchWorkspaceForRepos is executed
      await internal.searchWorkspaceForRepos();

      // Then: No directory search or notification occurs
      expect(searchSpy).not.toHaveBeenCalled();
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it("TC-100: sends repos when a workspace root search reports changes", async () => {
      // Case: TC-100
      const root = "/workspace/root";
      setWorkspaceFolders([root]);
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const searchSpy = vi.spyOn(internal, "searchDirectoryForRepos").mockResolvedValue(true);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: There is one workspace folder and its search reports repo changes
      // When: searchWorkspaceForRepos is executed
      await internal.searchWorkspaceForRepos();

      // Then: searchDirectoryForRepos is called once and sendRepos is triggered once
      expect(searchSpy).toHaveBeenCalledWith(root, internal.maxDepthOfRepoSearch);
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it("TC-101: skips sendRepos when the workspace root search reports no changes", async () => {
      // Case: TC-101
      const root = "/workspace/root";
      setWorkspaceFolders([root]);
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const searchSpy = vi.spyOn(internal, "searchDirectoryForRepos").mockResolvedValue(false);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: There is one workspace folder and its search reports no changes
      // When: searchWorkspaceForRepos is executed
      await internal.searchWorkspaceForRepos();

      // Then: searchDirectoryForRepos is called once and sendRepos is not triggered
      expect(searchSpy).toHaveBeenCalledWith(root, internal.maxDepthOfRepoSearch);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it("TC-102: searches every workspace folder and sends repos once when at least one search reports changes", async () => {
      // Case: TC-102
      const rootA = "/workspace/a";
      const rootB = "/workspace/b";
      setWorkspaceFolders([rootA, rootB]);
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const searchSpy = vi
        .spyOn(internal, "searchDirectoryForRepos")
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: Two workspace folders are configured and only one of them reports repo changes
      // When: searchWorkspaceForRepos is executed
      await internal.searchWorkspaceForRepos();

      // Then: Both folders are searched and sendRepos is triggered once after the loop
      expect(searchSpy).toHaveBeenNthCalledWith(1, rootA, internal.maxDepthOfRepoSearch);
      expect(searchSpy).toHaveBeenNthCalledWith(2, rootB, internal.maxDepthOfRepoSearch);
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it("TC-103: does nothing when workspaceFolders is an empty array", async () => {
      // Case: TC-103
      setWorkspaceFolders([]);
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const searchSpy = vi.spyOn(internal, "searchDirectoryForRepos").mockResolvedValue(false);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: workspaceFolders is an empty array
      // When: searchWorkspaceForRepos is executed
      await internal.searchWorkspaceForRepos();

      // Then: The loop body does not run and sendRepos is not called
      expect(searchSpy).not.toHaveBeenCalled();
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it("TC-104: passes maxDepth 0 through to searchDirectoryForRepos without sending repos when no changes are found", async () => {
      // Case: TC-104
      const root = "/workspace/root";
      setWorkspaceFolders([root]);
      const { manager } = createManager({ maxDepth: 0 });
      const internal = manager as RepoManagerWithPrivate;
      const searchSpy = vi.spyOn(internal, "searchDirectoryForRepos").mockResolvedValue(false);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: The stored max depth is zero and the root search reports no changes
      // When: searchWorkspaceForRepos is executed
      await internal.searchWorkspaceForRepos();

      // Then: searchDirectoryForRepos receives maxDepth 0 and sendRepos is not called
      expect(searchSpy).toHaveBeenCalledWith(root, 0);
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });
});
