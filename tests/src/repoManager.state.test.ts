import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createManager,
  createRepoState,
  type RepoManagerWithPrivate,
  resetRepoManagerTestEnvironment,
  setWorkspaceFolders
} from "./repoManager.testUtils";

describe("RepoManager repository state management", () => {
  beforeEach(() => {
    resetRepoManagerTestEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getRepos", () => {
    it("TC-023: returns a sorted GitRepoSet with all stored repo states", () => {
      // Case: TC-023
      const repoA = "/workspace/a";
      const repoB = "/workspace/b";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      internal.repos = {
        [repoB]: createRepoState({ commitOrdering: "topo" }),
        [repoA]: createRepoState()
      };

      // Given: The manager contains two repos in unsorted key order
      // When: getRepos is called
      const result = manager.getRepos();

      // Then: Both repo states are returned with keys sorted alphabetically
      expect(Object.keys(result)).toEqual([repoA, repoB]);
      expect(result[repoA]).toEqual(createRepoState());
      expect(result[repoB]).toEqual(createRepoState({ commitOrdering: "topo" }));
    });

    it("TC-024: returns an empty GitRepoSet when no repos are stored", () => {
      // Case: TC-024
      const { manager } = createManager();

      // Given: The manager starts with an empty repo set
      // When: getRepos is called
      const result = manager.getRepos();

      // Then: An empty object is returned
      expect(result).toEqual({});
    });
  });

  describe("addRepo and removeRepo", () => {
    it("TC-025: addRepo stores a new repo with the default state and persists it", () => {
      // Case: TC-025
      const repo = "/path/to/repo";
      const { extensionState, manager } = createManager();

      // Given: The repo is not yet present in the manager
      // When: addRepo is called with a valid path
      manager.addRepo(repo);

      // Then: The repo is stored with the default state and saveRepos is called once
      expect(manager.getRepos()).toEqual({ [repo]: createRepoState() });
      expect(extensionState.saveRepos).toHaveBeenCalledTimes(1);
      expect(extensionState.saveRepos).toHaveBeenCalledWith({ [repo]: createRepoState() });
    });

    it("TC-026: addRepo accepts the empty string as a repo key without validation", () => {
      // Case: TC-026
      const emptyRepo = "";
      const { extensionState, manager } = createManager();

      // Given: The repo key is the empty string
      // When: addRepo is called
      manager.addRepo(emptyRepo);

      // Then: The empty-string key is stored and persisted
      expect(manager.getRepos()).toEqual({ [emptyRepo]: createRepoState() });
      expect(extensionState.saveRepos).toHaveBeenCalledTimes(1);
    });

    it("TC-027: removeRepo deletes a registered repo and persists the updated state", () => {
      // Case: TC-027
      const repo = "/workspace/remove-me";
      const { extensionState, manager } = createManager({
        repos: { [repo]: createRepoState() }
      });
      const internal = manager as RepoManagerWithPrivate;

      // Given: The repo exists in the manager state
      // When: removeRepo is called with the registered key
      internal.removeRepo(repo);

      // Then: The repo is removed and saveRepos is called once with the empty state
      expect(manager.getRepos()).toEqual({});
      expect(extensionState.saveRepos).toHaveBeenCalledTimes(1);
      expect(extensionState.saveRepos).toHaveBeenCalledWith({});
    });

    it("TC-028: removeRepo persists even when the target key is not registered", () => {
      // Case: TC-028
      const existingRepo = "/workspace/existing";
      const missingRepo = "/workspace/missing";
      const { extensionState, manager } = createManager({
        repos: { [existingRepo]: createRepoState() }
      });
      const internal = manager as RepoManagerWithPrivate;

      // Given: The target repo key is not present in the current state
      // When: removeRepo is called with the missing key
      internal.removeRepo(missingRepo);

      // Then: The state remains unchanged and saveRepos is still called once
      expect(manager.getRepos()).toEqual({ [existingRepo]: createRepoState() });
      expect(extensionState.saveRepos).toHaveBeenCalledTimes(1);
      expect(extensionState.saveRepos).toHaveBeenCalledWith({
        [existingRepo]: createRepoState()
      });
    });

    it("TC-029: addRepo overwrites an existing repo state with the default state", () => {
      // Case: TC-029
      const repo = "/workspace/reset";
      const { extensionState, manager } = createManager({
        repos: {
          [repo]: createRepoState({ columnWidths: [10], commitOrdering: "topo" })
        }
      });

      // Given: The repo already exists with a non-default state
      // When: addRepo is called again with the same key
      manager.addRepo(repo);

      // Then: The stored state is reset to the default value and persisted
      expect(manager.getRepos()).toEqual({ [repo]: createRepoState() });
      expect(extensionState.saveRepos).toHaveBeenCalledTimes(1);
      expect(extensionState.saveRepos).toHaveBeenCalledWith({ [repo]: createRepoState() });
    });
  });

  describe("setRepoState", () => {
    it("TC-030: stores the provided GitRepoState for a valid repo key and persists it", () => {
      // Case: TC-030
      const repo = "/valid/path";
      const state = createRepoState({ columnWidths: [12], commitOrdering: "author-date" });
      const { extensionState, manager } = createManager();

      // Given: The repo key is valid and not blocked by the prototype pollution guard
      // When: setRepoState is called
      manager.setRepoState(repo, state);

      // Then: The provided state is stored and saveRepos is called once
      expect(manager.getRepos()).toEqual({ [repo]: state });
      expect(extensionState.saveRepos).toHaveBeenCalledTimes(1);
      expect(extensionState.saveRepos).toHaveBeenCalledWith({ [repo]: state });
    });

    it('TC-031: returns early for "__proto__" and does not persist any changes', () => {
      // Case: TC-031
      const { extensionState, manager } = createManager();

      // Given: The repo key matches the blocked "__proto__" guard
      // When: setRepoState is called
      manager.setRepoState("__proto__", createRepoState({ columnWidths: [1] }));

      // Then: No state is stored and saveRepos is not called
      expect(manager.getRepos()).toEqual({});
      expect(extensionState.saveRepos).not.toHaveBeenCalled();
    });

    it('TC-032: returns early for "constructor" and does not persist any changes', () => {
      // Case: TC-032
      const { extensionState, manager } = createManager();

      // Given: The repo key matches the blocked "constructor" guard
      // When: setRepoState is called
      manager.setRepoState("constructor", createRepoState({ columnWidths: [1] }));

      // Then: No state is stored and saveRepos is not called
      expect(manager.getRepos()).toEqual({});
      expect(extensionState.saveRepos).not.toHaveBeenCalled();
    });

    it('TC-033: returns early for "prototype" and does not persist any changes', () => {
      // Case: TC-033
      const { extensionState, manager } = createManager();

      // Given: The repo key matches the blocked "prototype" guard
      // When: setRepoState is called
      manager.setRepoState("prototype", createRepoState({ columnWidths: [1] }));

      // Then: No state is stored and saveRepos is not called
      expect(manager.getRepos()).toEqual({});
      expect(extensionState.saveRepos).not.toHaveBeenCalled();
    });

    it("TC-034: accepts the empty string as a repo key because it is not guarded", () => {
      // Case: TC-034
      const repo = "";
      const state = createRepoState({ commitOrdering: "date" });
      const { extensionState, manager } = createManager();

      // Given: The repo key is the empty string and does not match the blocked names
      // When: setRepoState is called
      manager.setRepoState(repo, state);

      // Then: The state is stored for the empty-string key and persisted
      expect(manager.getRepos()).toEqual({ [repo]: state });
      expect(extensionState.saveRepos).toHaveBeenCalledTimes(1);
      expect(extensionState.saveRepos).toHaveBeenCalledWith({ [repo]: state });
    });
  });

  describe("checkReposExist", () => {
    it("TC-035: returns false and leaves the state unchanged when all repos still exist", async () => {
      // Case: TC-035
      const repoA = "/workspace/a";
      const repoB = "/workspace/b";
      const repoC = "/workspace/c";
      const { dataSource, manager } = createManager({
        repos: {
          [repoA]: createRepoState(),
          [repoB]: createRepoState(),
          [repoC]: createRepoState()
        }
      });
      const internal = manager as RepoManagerWithPrivate;
      const sendSpy = vi.spyOn(internal, "sendRepos");
      dataSource.isGitRepository.mockResolvedValue(true);

      // Given: All registered repos are still valid git repositories
      // When: checkReposExist is executed
      const result = await manager.checkReposExist();

      // Then: No repos are removed, sendRepos is not called, and the method returns false
      expect(result).toBe(false);
      expect(manager.getRepos()).toEqual({
        [repoA]: createRepoState(),
        [repoB]: createRepoState(),
        [repoC]: createRepoState()
      });
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it("TC-036: removes only the missing repo, sends one notification, and returns true", async () => {
      // Case: TC-036
      const repoA = "/workspace/a";
      const repoB = "/workspace/b";
      const repoC = "/workspace/c";
      const { dataSource, manager } = createManager({
        repos: {
          [repoA]: createRepoState(),
          [repoB]: createRepoState(),
          [repoC]: createRepoState()
        }
      });
      const internal = manager as RepoManagerWithPrivate;
      const sendSpy = vi.spyOn(internal, "sendRepos");
      dataSource.isGitRepository
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      // Given: Exactly one registered repo no longer exists as a git repository
      // When: checkReposExist is executed
      const result = await manager.checkReposExist();

      // Then: Only the missing repo is removed, a single notification is sent, and the method returns true
      expect(result).toBe(true);
      expect(manager.getRepos()).toEqual({
        [repoA]: createRepoState(),
        [repoC]: createRepoState()
      });
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it("TC-037: removes all repos, sends one notification, and returns true when every repo is missing", async () => {
      // Case: TC-037
      const repoA = "/workspace/a";
      const repoB = "/workspace/b";
      const repoC = "/workspace/c";
      const { dataSource, manager } = createManager({
        repos: {
          [repoA]: createRepoState(),
          [repoB]: createRepoState(),
          [repoC]: createRepoState()
        }
      });
      const internal = manager as RepoManagerWithPrivate;
      const sendSpy = vi.spyOn(internal, "sendRepos");
      dataSource.isGitRepository.mockResolvedValue(false);

      // Given: Every registered repo is reported missing by the data source
      // When: checkReposExist is executed
      const result = await manager.checkReposExist();

      // Then: All repos are removed, one notification is sent, and the method returns true
      expect(result).toBe(true);
      expect(manager.getRepos()).toEqual({});
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it("TC-038: returns false and performs no lookups when the repo set is empty", async () => {
      // Case: TC-038
      const { dataSource, manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const sendSpy = vi.spyOn(internal, "sendRepos");

      // Given: There are no repos to check
      // When: checkReposExist is executed
      const result = await manager.checkReposExist();

      // Then: The method returns false, no data source lookups occur, and no notification is sent
      expect(result).toBe(false);
      expect(dataSource.isGitRepository).not.toHaveBeenCalled();
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });

  describe("removeReposNotInWorkspace", () => {
    it("TC-039: leaves repos untouched when every repo is inside one of the workspace folders", () => {
      // Case: TC-039
      const repoA = "/workspace/a";
      const repoB = "/workspace/b/sub";
      setWorkspaceFolders(["/workspace/a", "/workspace/b"]);
      const { manager } = createManager({
        repos: {
          [repoA]: createRepoState(),
          [repoB]: createRepoState()
        }
      });
      const internal = manager as RepoManagerWithPrivate;
      const removeSpy = vi.spyOn(internal, "removeRepo");

      // Given: All repos live under the configured workspace folders
      // When: removeReposNotInWorkspace is executed
      internal.removeReposNotInWorkspace();

      // Then: No repos are removed
      expect(removeSpy).not.toHaveBeenCalled();
      expect(manager.getRepos()).toEqual({
        [repoA]: createRepoState(),
        [repoB]: createRepoState()
      });
    });

    it("TC-040: removes only repos that fall outside the configured workspace folders", () => {
      // Case: TC-040
      const insideRepo = "/workspace/a/repo";
      const outsideRepo = "/outside/repo";
      setWorkspaceFolders(["/workspace/a"]);
      const { manager } = createManager({
        repos: {
          [insideRepo]: createRepoState(),
          [outsideRepo]: createRepoState()
        }
      });
      const internal = manager as RepoManagerWithPrivate;

      // Given: One repo is under the workspace folder and one repo is outside it
      // When: removeReposNotInWorkspace is executed
      internal.removeReposNotInWorkspace();

      // Then: Only the outside repo is removed
      expect(manager.getRepos()).toEqual({ [insideRepo]: createRepoState() });
    });

    it("TC-041: treats undefined workspace folders as no roots and removes every repo", () => {
      // Case: TC-041
      const repoA = "/workspace/a";
      const repoB = "/workspace/b";
      setWorkspaceFolders(undefined);
      const { manager } = createManager({
        repos: {
          [repoA]: createRepoState(),
          [repoB]: createRepoState()
        }
      });
      const internal = manager as RepoManagerWithPrivate;

      // Given: workspaceFolders is undefined
      // When: removeReposNotInWorkspace is executed
      internal.removeReposNotInWorkspace();

      // Then: Every repo is removed because no workspace roots are available
      expect(manager.getRepos()).toEqual({});
    });

    it("TC-042: treats an empty workspace folder array as no roots and removes every repo", () => {
      // Case: TC-042
      const repoA = "/workspace/a";
      const repoB = "/workspace/b";
      setWorkspaceFolders([]);
      const { manager } = createManager({
        repos: {
          [repoA]: createRepoState(),
          [repoB]: createRepoState()
        }
      });
      const internal = manager as RepoManagerWithPrivate;

      // Given: workspaceFolders is an empty array
      // When: removeReposNotInWorkspace is executed
      internal.removeReposNotInWorkspace();

      // Then: Every repo is removed because there are no workspace roots
      expect(manager.getRepos()).toEqual({});
    });

    it("TC-043: preserves a repo whose path exactly matches a workspace folder path", () => {
      // Case: TC-043
      const repo = "/workspace/exact";
      setWorkspaceFolders([repo]);
      const { manager } = createManager({
        repos: { [repo]: createRepoState() }
      });
      const internal = manager as RepoManagerWithPrivate;

      // Given: The repo path exactly matches a workspace folder path
      // When: removeReposNotInWorkspace is executed
      internal.removeReposNotInWorkspace();

      // Then: The exact-match repo is preserved
      expect(manager.getRepos()).toEqual({ [repo]: createRepoState() });
    });
  });

  describe("path matching helpers", () => {
    it("TC-044: removeReposWithinFolder removes a repo whose path exactly matches the target folder", () => {
      // Case: TC-044
      const repo = "/workspace/exact";
      const { extensionState, manager } = createManager({
        repos: { [repo]: createRepoState() }
      });
      const internal = manager as RepoManagerWithPrivate;

      // Given: The target folder path matches one repo exactly
      // When: removeReposWithinFolder is executed
      const result = internal.removeReposWithinFolder(repo);

      // Then: The repo is removed, the method returns true, and the updated state is persisted
      expect(result).toBe(true);
      expect(manager.getRepos()).toEqual({});
      expect(extensionState.saveRepos).toHaveBeenCalledTimes(1);
    });

    it("TC-045: removeReposWithinFolder removes child repos under the target parent folder", () => {
      // Case: TC-045
      const childRepo = "/workspace/parent/sub";
      const { manager } = createManager({
        repos: {
          [childRepo]: createRepoState(),
          "/workspace/elsewhere": createRepoState()
        }
      });
      const internal = manager as RepoManagerWithPrivate;

      // Given: One repo is nested beneath the target folder path
      // When: removeReposWithinFolder is executed for the parent folder
      const result = internal.removeReposWithinFolder("/workspace/parent");

      // Then: The nested repo is removed and the method returns true
      expect(result).toBe(true);
      expect(manager.getRepos()).toEqual({
        "/workspace/elsewhere": createRepoState()
      });
    });

    it("TC-046: removeReposWithinFolder returns false when no repo paths match the target folder", () => {
      // Case: TC-046
      const repo = "/workspace/repo";
      const { manager } = createManager({
        repos: { [repo]: createRepoState() }
      });
      const internal = manager as RepoManagerWithPrivate;

      // Given: No repo path is equal to or nested under the target folder
      // When: removeReposWithinFolder is executed
      const result = internal.removeReposWithinFolder("/workspace/other");

      // Then: No repo is removed and the method returns false
      expect(result).toBe(false);
      expect(manager.getRepos()).toEqual({ [repo]: createRepoState() });
    });

    it("TC-047: removeReposWithinFolder returns false when there are no repos to inspect", () => {
      // Case: TC-047
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;

      // Given: The repo set is empty
      // When: removeReposWithinFolder is executed
      const result = internal.removeReposWithinFolder("/workspace/any");

      // Then: The method returns false and no state changes occur
      expect(result).toBe(false);
      expect(manager.getRepos()).toEqual({});
    });

    it("TC-048: removeReposWithinFolder removes every repo that matches the target folder", () => {
      // Case: TC-048
      const repoA = "/workspace/multi/a";
      const repoB = "/workspace/multi/b";
      const repoC = "/workspace/other";
      const { manager } = createManager({
        repos: {
          [repoA]: createRepoState(),
          [repoB]: createRepoState(),
          [repoC]: createRepoState()
        }
      });
      const internal = manager as RepoManagerWithPrivate;

      // Given: Two repos are nested under the target folder path
      // When: removeReposWithinFolder is executed
      const result = internal.removeReposWithinFolder("/workspace/multi");

      // Then: Both matching repos are removed and the method returns true
      expect(result).toBe(true);
      expect(manager.getRepos()).toEqual({ [repoC]: createRepoState() });
    });

    it("TC-049: isDirectoryWithinRepos returns true when the path exactly matches a repo path", () => {
      // Case: TC-049
      const repo = "/workspace/repo";
      const { manager } = createManager({
        repos: { [repo]: createRepoState() }
      });
      const internal = manager as RepoManagerWithPrivate;

      // Given: The candidate path exactly matches a known repo path
      // When: isDirectoryWithinRepos is executed
      const result = internal.isDirectoryWithinRepos(repo);

      // Then: The method returns true
      expect(result).toBe(true);
    });

    it("TC-050: isDirectoryWithinRepos returns true for a subdirectory of a known repo", () => {
      // Case: TC-050
      const repo = "/workspace/repo";
      const { manager } = createManager({
        repos: { [repo]: createRepoState() }
      });
      const internal = manager as RepoManagerWithPrivate;

      // Given: The candidate path is nested under a known repo path
      // When: isDirectoryWithinRepos is executed
      const result = internal.isDirectoryWithinRepos("/workspace/repo/sub");

      // Then: The method returns true
      expect(result).toBe(true);
    });

    it("TC-051: isDirectoryWithinRepos returns false for an unrelated path", () => {
      // Case: TC-051
      const repo = "/workspace/repo";
      const { manager } = createManager({
        repos: { [repo]: createRepoState() }
      });
      const internal = manager as RepoManagerWithPrivate;

      // Given: The candidate path is unrelated to any known repo path
      // When: isDirectoryWithinRepos is executed
      const result = internal.isDirectoryWithinRepos("/workspace/other");

      // Then: The method returns false
      expect(result).toBe(false);
    });

    it("TC-052: isDirectoryWithinRepos returns false for a prefix-only match without a path separator", () => {
      // Case: TC-052
      const repo = "/workspace/repo";
      const { manager } = createManager({
        repos: { [repo]: createRepoState() }
      });
      const internal = manager as RepoManagerWithPrivate;

      // Given: The candidate path shares only a textual prefix with the repo path
      // When: isDirectoryWithinRepos is executed
      const result = internal.isDirectoryWithinRepos("/workspace/repo2");

      // Then: The method returns false because "/workspace/repo/" does not match
      expect(result).toBe(false);
    });

    it("TC-053: isDirectoryWithinRepos returns false when there are no repos", () => {
      // Case: TC-053
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;

      // Given: The repo set is empty
      // When: isDirectoryWithinRepos is executed
      const result = internal.isDirectoryWithinRepos("/workspace/repo");

      // Then: The method returns false
      expect(result).toBe(false);
    });
  });
});
