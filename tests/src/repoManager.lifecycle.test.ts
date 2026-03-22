import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  configMock,
  createManager,
  createRepoState,
  createUri,
  flushMicrotasks,
  getCreatedWatchers,
  type RepoManagerWithPrivate,
  resetRepoManagerTestEnvironment
} from "./repoManager.testUtils";

describe("RepoManager lifecycle and public state flows", () => {
  beforeEach(() => {
    resetRepoManagerTestEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const asRegisterUri = (path: string) =>
    createUri(path) as Parameters<RepoManagerWithPrivate["registerRepoFromUri"]>[0];

  describe("registerRepoFromUri", () => {
    it("TC-001: skips registration when the URI points to an already registered repository", async () => {
      // Case: TC-001
      const existingRepo = "/workspace/existing";
      const { dataSource, manager } = createManager({
        repos: { [existingRepo]: createRepoState() }
      });
      const addRepoSpy = vi.spyOn(manager, "addRepo");
      const internal = manager as RepoManagerWithPrivate;
      const sendReposSpy = vi.spyOn(internal, "sendRepos");

      // Given: The repo path is already present in the manager state
      // When: registerRepoFromUri is invoked with the same URI
      await manager.registerRepoFromUri(asRegisterUri(existingRepo));

      // Then: No repository lookup or registration occurs, and the existing state is preserved
      expect(dataSource.isGitRepository).not.toHaveBeenCalled();
      expect(addRepoSpy).not.toHaveBeenCalled();
      expect(sendReposSpy).not.toHaveBeenCalled();
      expect(manager.getRepos()).toEqual({ [existingRepo]: createRepoState() });
    });

    it("TC-002: registers a new repository and notifies the view when the URI is a git repository", async () => {
      // Case: TC-002
      const newRepo = "/workspace/new-repo";
      const { dataSource, manager } = createManager();
      const addRepoSpy = vi.spyOn(manager, "addRepo");
      const internal = manager as RepoManagerWithPrivate;
      const sendReposSpy = vi.spyOn(internal, "sendRepos");
      dataSource.isGitRepository.mockResolvedValueOnce(true);

      // Given: The repo path is not yet registered and the data source recognizes it as a git repository
      // When: registerRepoFromUri is invoked
      await manager.registerRepoFromUri(asRegisterUri(newRepo));

      // Then: addRepo is called for the path and sendRepos notifies downstream consumers once
      expect(dataSource.isGitRepository).toHaveBeenCalledWith(newRepo);
      expect(addRepoSpy).toHaveBeenCalledWith(newRepo);
      expect(sendReposSpy).toHaveBeenCalledTimes(1);
      expect(manager.getRepos()).toEqual({ [newRepo]: createRepoState() });
    });

    it("TC-003: skips registration when the URI is not a git repository", async () => {
      // Case: TC-003
      const nonRepo = "/workspace/not-a-repo";
      const { dataSource, manager } = createManager();
      const addRepoSpy = vi.spyOn(manager, "addRepo");
      const internal = manager as RepoManagerWithPrivate;
      const sendReposSpy = vi.spyOn(internal, "sendRepos");
      dataSource.isGitRepository.mockResolvedValueOnce(false);

      // Given: The repo path is not registered and the data source reports it is not a git repository
      // When: registerRepoFromUri is invoked
      await manager.registerRepoFromUri(asRegisterUri(nonRepo));

      // Then: Registration is skipped and no notification is sent
      expect(dataSource.isGitRepository).toHaveBeenCalledWith(nonRepo);
      expect(addRepoSpy).not.toHaveBeenCalled();
      expect(sendReposSpy).not.toHaveBeenCalled();
      expect(manager.getRepos()).toEqual({});
    });
  });

  describe("dispose", () => {
    it("TC-011: disposes the workspace folder handler and clears the field when it exists", () => {
      // Case: TC-011
      const { manager } = createManager({ clearCallsAfterCreate: false });
      const internal = manager as RepoManagerWithPrivate;
      const handler = internal.folderChangeHandler;

      // Given: The constructor registered a workspace folder change handler
      // When: dispose is called
      manager.dispose();

      // Then: The handler is disposed once and the field is set to null
      expect(handler).not.toBeNull();
      expect(handler?.dispose).toHaveBeenCalledTimes(1);
      expect(internal.folderChangeHandler).toBeNull();
    });

    it("TC-012: completes without error when the workspace folder handler is already null", () => {
      // Case: TC-012
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      internal.folderChangeHandler = null;

      // Given: The handler has already been cleared
      // When: dispose is called
      // Then: No exception is thrown
      expect(() => manager.dispose()).not.toThrow();
    });

    it("TC-013: disposes all folder watchers and removes all watcher entries", () => {
      // Case: TC-013
      const folderA = "/workspace/a";
      const folderB = "/workspace/b";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;

      // Given: Two folder watchers are currently registered
      internal.startWatchingFolder(folderA);
      internal.startWatchingFolder(folderB);
      const watchers = getCreatedWatchers();
      const watcherA = internal.folderWatchers[folderA];
      const watcherB = internal.folderWatchers[folderB];

      // When: dispose is called
      manager.dispose();

      // Then: Every watcher is disposed and the watcher map is emptied
      expect(watchers).toHaveLength(2);
      expect(watcherA.dispose).toHaveBeenCalledTimes(1);
      expect(watcherB.dispose).toHaveBeenCalledTimes(1);
      expect(Object.keys(internal.folderWatchers)).toEqual([]);
    });

    it("TC-014: completes without error when there are no folder watchers", () => {
      // Case: TC-014
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;

      // Given: The watcher map is empty
      expect(Object.keys(internal.folderWatchers)).toEqual([]);

      // When: dispose is called
      // Then: The method completes without running the watcher loop
      expect(() => manager.dispose()).not.toThrow();
      expect(Object.keys(internal.folderWatchers)).toEqual([]);
    });
  });

  describe("view callback management", () => {
    it("TC-015: stores the provided callback during registerViewCallback", () => {
      // Case: TC-015
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const callback = vi.fn();

      // Given: No callback is currently registered
      // When: registerViewCallback is called with a callback function
      manager.registerViewCallback(callback);

      // Then: The callback is stored for later notifications
      expect(internal.viewCallback).toBe(callback);
    });

    it("TC-016: clears the stored callback during deregisterViewCallback", () => {
      // Case: TC-016
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      manager.registerViewCallback(vi.fn());

      // Given: A callback is already registered
      // When: deregisterViewCallback is called
      manager.deregisterViewCallback();

      // Then: The callback reference is set back to null
      expect(internal.viewCallback).toBeNull();
    });

    it("TC-017: sendRepos invokes the callback with sorted repos and the repo count", () => {
      // Case: TC-017
      const repoA = "/workspace/a";
      const repoB = "/workspace/b";
      const { manager, statusBarItem } = createManager();
      const callback = vi.fn();
      const internal = manager as RepoManagerWithPrivate;
      internal.repos = {
        [repoB]: createRepoState({ commitOrdering: "topo" }),
        [repoA]: createRepoState()
      };
      manager.registerViewCallback(callback);

      // Given: A callback is registered and the manager has two repos in unsorted key order
      // When: sendRepos is invoked
      internal.sendRepos();

      // Then: The status bar is updated and the callback receives sorted repos with count 2
      expect(statusBarItem.setNumRepos).toHaveBeenCalledWith(2);
      expect(callback).toHaveBeenCalledTimes(1);
      const [reposArg, numReposArg] = callback.mock.calls[0]! as [
        Record<string, ReturnType<typeof createRepoState>>,
        number
      ];
      expect(Object.keys(reposArg)).toEqual([repoA, repoB]);
      expect(numReposArg).toBe(2);
    });

    it("TC-018: sendRepos updates the status bar and does nothing else when no callback is registered", () => {
      // Case: TC-018
      const repo = "/workspace/repo";
      const { manager, statusBarItem } = createManager({
        repos: { [repo]: createRepoState() }
      });
      const internal = manager as RepoManagerWithPrivate;

      // Given: The manager has one repo and no registered callback
      // When: sendRepos is invoked
      internal.sendRepos();

      // Then: The status bar is updated and no exception is thrown
      expect(statusBarItem.setNumRepos).toHaveBeenCalledWith(1);
    });

    it("TC-019: sendRepos passes an empty repo set and zero count to the callback", () => {
      // Case: TC-019
      const { manager, statusBarItem } = createManager();
      const callback = vi.fn();
      const internal = manager as RepoManagerWithPrivate;
      manager.registerViewCallback(callback);

      // Given: A callback is registered and the repo set is empty
      // When: sendRepos is invoked
      internal.sendRepos();

      // Then: The callback receives an empty repo set and the status bar shows zero repos
      expect(statusBarItem.setNumRepos).toHaveBeenCalledWith(0);
      expect(callback).toHaveBeenCalledWith({}, 0);
    });
  });

  describe("maxDepthOfRepoSearchChanged", () => {
    it("TC-020: updates the stored depth and searches the workspace when the configured depth increases", () => {
      // Case: TC-020
      const { manager } = createManager({ maxDepth: 1 });
      const internal = manager as RepoManagerWithPrivate;
      const searchSpy = vi.spyOn(internal, "searchWorkspaceForRepos").mockResolvedValue(undefined);
      configMock.maxDepthOfRepoSearch.mockReturnValue(3);

      // Given: The current depth is 1 and the configuration now returns 3
      // When: maxDepthOfRepoSearchChanged is called
      manager.maxDepthOfRepoSearchChanged();

      // Then: The stored depth becomes 3 and the workspace search is triggered once
      expect(internal.maxDepthOfRepoSearch).toBe(3);
      expect(searchSpy).toHaveBeenCalledTimes(1);
    });

    it("TC-021: updates the stored depth without searching when the configured depth decreases", () => {
      // Case: TC-021
      const { manager } = createManager({ maxDepth: 3 });
      const internal = manager as RepoManagerWithPrivate;
      const searchSpy = vi.spyOn(internal, "searchWorkspaceForRepos").mockResolvedValue(undefined);
      internal.maxDepthOfRepoSearch = 3;
      configMock.maxDepthOfRepoSearch.mockReturnValue(1);

      // Given: The current depth is 3 and the configuration now returns 1
      // When: maxDepthOfRepoSearchChanged is called
      manager.maxDepthOfRepoSearchChanged();

      // Then: The stored depth becomes 1 and the workspace search is not triggered
      expect(internal.maxDepthOfRepoSearch).toBe(1);
      expect(searchSpy).not.toHaveBeenCalled();
    });

    it("TC-022: keeps the same depth and skips searching when the configured depth is unchanged", () => {
      // Case: TC-022
      const { manager } = createManager({ maxDepth: 2 });
      const internal = manager as RepoManagerWithPrivate;
      const searchSpy = vi.spyOn(internal, "searchWorkspaceForRepos").mockResolvedValue(undefined);
      internal.maxDepthOfRepoSearch = 2;
      configMock.maxDepthOfRepoSearch.mockReturnValue(2);

      // Given: The current depth is already equal to the configured depth
      // When: maxDepthOfRepoSearchChanged is called
      manager.maxDepthOfRepoSearchChanged();

      // Then: The stored depth remains 2 and the workspace search is skipped
      expect(internal.maxDepthOfRepoSearch).toBe(2);
      expect(searchSpy).not.toHaveBeenCalled();
    });
  });

  describe("startupTasks", () => {
    it("TC-095: sendRepos is called when checkReposExist reports no changes", async () => {
      // Case: TC-095
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const removeSpy = vi
        .spyOn(internal, "removeReposNotInWorkspace")
        .mockImplementation(() => undefined);
      const checkSpy = vi.spyOn(internal, "checkReposExist").mockResolvedValue(false);
      const searchSpy = vi.spyOn(internal, "searchWorkspaceForRepos").mockResolvedValue(undefined);
      const watchSpy = vi
        .spyOn(internal, "startWatchingFolders")
        .mockImplementation(() => undefined);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: The startup flow sees no repo removals from checkReposExist
      // When: startupTasks is executed
      await internal.startupTasks();

      // Then: sendRepos is invoked once after the existence check and the orchestration steps still run
      expect(removeSpy).toHaveBeenCalledTimes(1);
      expect(checkSpy).toHaveBeenCalledTimes(1);
      expect(searchSpy).toHaveBeenCalledTimes(1);
      expect(watchSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it("TC-096: sendRepos is not called by startupTasks when checkReposExist already reported changes", async () => {
      // Case: TC-096
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      vi.spyOn(internal, "removeReposNotInWorkspace").mockImplementation(() => undefined);
      vi.spyOn(internal, "checkReposExist").mockResolvedValue(true);
      vi.spyOn(internal, "searchWorkspaceForRepos").mockResolvedValue(undefined);
      vi.spyOn(internal, "startWatchingFolders").mockImplementation(() => undefined);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: checkReposExist reports that it already handled repo changes
      // When: startupTasks is executed
      await internal.startupTasks();

      // Then: startupTasks does not call sendRepos again
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it("TC-097: runs the startup orchestration steps in the expected order", async () => {
      // Case: TC-097
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const callOrder: string[] = [];
      vi.spyOn(internal, "removeReposNotInWorkspace").mockImplementation(() => {
        callOrder.push("removeReposNotInWorkspace");
      });
      vi.spyOn(internal, "checkReposExist").mockImplementation(async () => {
        callOrder.push("checkReposExist");
        return true;
      });
      vi.spyOn(internal, "searchWorkspaceForRepos").mockImplementation(async () => {
        callOrder.push("searchWorkspaceForRepos");
      });
      vi.spyOn(internal, "startWatchingFolders").mockImplementation(() => {
        callOrder.push("startWatchingFolders");
      });

      // Given: The startup steps are independently observable through spies
      // When: startupTasks is executed
      await internal.startupTasks();

      // Then: The methods run in the order remove -> check -> search -> watch
      expect(callOrder).toEqual([
        "removeReposNotInWorkspace",
        "checkReposExist",
        "searchWorkspaceForRepos",
        "startWatchingFolders"
      ]);
    });

    it("TC-098: sends an empty repo set when startup runs with no repos in the initial state", async () => {
      // Case: TC-098
      const { manager, statusBarItem } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const sendSpy = vi.spyOn(internal, "sendRepos");

      // Given: The manager starts with an empty repo set and no workspace folders
      // When: startupTasks is executed with the real method implementations
      await internal.startupTasks();
      await flushMicrotasks();

      // Then: sendRepos is called with the empty repo state and the status bar is updated to zero
      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(statusBarItem.setNumRepos).toHaveBeenCalledWith(0);
      expect(manager.getRepos()).toEqual({});
    });
  });
});
