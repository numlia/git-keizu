import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createManager,
  createRepoState,
  createWorkspaceFolder,
  getCreatedWatchers,
  type RepoManagerWithPrivate,
  resetRepoManagerTestEnvironment,
  setWorkspaceFolders,
  triggerWorkspaceChange
} from "./repoManager.testUtils";

describe("RepoManager workspace change handling and watcher management", () => {
  beforeEach(() => {
    resetRepoManagerTestEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor workspace folder change handler", () => {
    it("TC-004: sends repos when an added folder search reports repo changes", async () => {
      // Case: TC-004
      const addedFolder = "/workspace/added";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const searchSpy = vi.spyOn(internal, "searchDirectoryForRepos").mockResolvedValue(true);
      const startSpy = vi
        .spyOn(internal, "startWatchingFolder")
        .mockImplementation(() => undefined);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: The registered added-folder handler will find repo changes in the new folder
      // When: A workspace change event with one added folder is triggered
      await triggerWorkspaceChange({
        added: [createWorkspaceFolder(addedFolder)],
        removed: []
      });

      // Then: The folder is searched, watching starts for it, and sendRepos is called once
      expect(searchSpy).toHaveBeenCalledWith(addedFolder, internal.maxDepthOfRepoSearch);
      expect(startSpy).toHaveBeenCalledWith(addedFolder);
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it("TC-005: skips sendRepos when an added folder search reports no repo changes", async () => {
      // Case: TC-005
      const addedFolder = "/workspace/added";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const searchSpy = vi.spyOn(internal, "searchDirectoryForRepos").mockResolvedValue(false);
      const startSpy = vi
        .spyOn(internal, "startWatchingFolder")
        .mockImplementation(() => undefined);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: The registered added-folder handler will not find any repo changes in the new folder
      // When: A workspace change event with one added folder is triggered
      await triggerWorkspaceChange({
        added: [createWorkspaceFolder(addedFolder)],
        removed: []
      });

      // Then: The folder is still searched and watched, but sendRepos is not called
      expect(searchSpy).toHaveBeenCalledWith(addedFolder, internal.maxDepthOfRepoSearch);
      expect(startSpy).toHaveBeenCalledWith(addedFolder);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it("TC-006: sends repos when a removed folder causes repo removals", async () => {
      // Case: TC-006
      const removedFolder = "/workspace/removed";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const removeSpy = vi.spyOn(internal, "removeReposWithinFolder").mockReturnValue(true);
      const stopSpy = vi.spyOn(internal, "stopWatchingFolder").mockImplementation(() => undefined);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: The removed-folder handler will remove repos beneath the removed folder
      // When: A workspace change event with one removed folder is triggered
      await triggerWorkspaceChange({
        added: [],
        removed: [createWorkspaceFolder(removedFolder)]
      });

      // Then: The folder is removed from repo tracking, watching stops, and sendRepos is called once
      expect(removeSpy).toHaveBeenCalledWith(removedFolder);
      expect(stopSpy).toHaveBeenCalledWith(removedFolder);
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it("TC-007: skips sendRepos when a removed folder produces no repo removals", async () => {
      // Case: TC-007
      const removedFolder = "/workspace/removed";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const removeSpy = vi.spyOn(internal, "removeReposWithinFolder").mockReturnValue(false);
      const stopSpy = vi.spyOn(internal, "stopWatchingFolder").mockImplementation(() => undefined);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: The removed-folder handler will not find any repos to remove
      // When: A workspace change event with one removed folder is triggered
      await triggerWorkspaceChange({
        added: [],
        removed: [createWorkspaceFolder(removedFolder)]
      });

      // Then: Watching still stops for the folder, but sendRepos is not called
      expect(removeSpy).toHaveBeenCalledWith(removedFolder);
      expect(stopSpy).toHaveBeenCalledWith(removedFolder);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it("TC-008: skips the added-folder branch when no folders were added", async () => {
      // Case: TC-008
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const searchSpy = vi.spyOn(internal, "searchDirectoryForRepos").mockResolvedValue(false);
      const startSpy = vi
        .spyOn(internal, "startWatchingFolder")
        .mockImplementation(() => undefined);

      // Given: The workspace change event contains no added folders
      // When: The event is triggered
      await triggerWorkspaceChange({
        added: [],
        removed: []
      });

      // Then: The added-folder branch is skipped entirely
      expect(searchSpy).not.toHaveBeenCalled();
      expect(startSpy).not.toHaveBeenCalled();
    });

    it("TC-009: skips the removed-folder branch when no folders were removed", async () => {
      // Case: TC-009
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const removeSpy = vi.spyOn(internal, "removeReposWithinFolder").mockReturnValue(false);
      const stopSpy = vi.spyOn(internal, "stopWatchingFolder").mockImplementation(() => undefined);

      // Given: The workspace change event contains no removed folders
      // When: The event is triggered
      await triggerWorkspaceChange({
        added: [],
        removed: []
      });

      // Then: The removed-folder branch is skipped entirely
      expect(removeSpy).not.toHaveBeenCalled();
      expect(stopSpy).not.toHaveBeenCalled();
    });

    it("TC-010: processes added folders before removed folders when both arrays are non-empty", async () => {
      // Case: TC-010
      const addedFolder = "/workspace/added";
      const removedFolder = "/workspace/removed";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const callOrder: string[] = [];
      vi.spyOn(internal, "searchDirectoryForRepos").mockImplementation(async () => {
        callOrder.push("searchDirectoryForRepos");
        return true;
      });
      vi.spyOn(internal, "startWatchingFolder").mockImplementation(() => {
        callOrder.push("startWatchingFolder");
      });
      vi.spyOn(internal, "removeReposWithinFolder").mockImplementation(() => {
        callOrder.push("removeReposWithinFolder");
        return true;
      });
      vi.spyOn(internal, "stopWatchingFolder").mockImplementation(() => {
        callOrder.push("stopWatchingFolder");
      });
      vi.spyOn(internal, "sendRepos").mockImplementation(() => {
        callOrder.push("sendRepos");
      });

      // Given: Both added and removed folders will report changes
      // When: The workspace change event is triggered with both arrays populated
      await triggerWorkspaceChange({
        added: [createWorkspaceFolder(addedFolder)],
        removed: [createWorkspaceFolder(removedFolder)]
      });

      // Then: Added-folder processing completes before removed-folder processing begins
      expect(callOrder).toEqual([
        "searchDirectoryForRepos",
        "startWatchingFolder",
        "sendRepos",
        "removeReposWithinFolder",
        "stopWatchingFolder",
        "sendRepos"
      ]);
    });
  });

  describe("watcher management helpers", () => {
    it("TC-090: startWatchingFolders starts one watcher for each workspace folder", () => {
      // Case: TC-090
      const folderA = "/workspace/a";
      const folderB = "/workspace/b";
      setWorkspaceFolders([folderA, folderB]);
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const startSpy = vi
        .spyOn(internal, "startWatchingFolder")
        .mockImplementation(() => undefined);

      // Given: Two workspace folders are configured
      // When: startWatchingFolders is executed
      internal.startWatchingFolders();

      // Then: startWatchingFolder is called once for each configured workspace folder
      expect(startSpy).toHaveBeenNthCalledWith(1, folderA);
      expect(startSpy).toHaveBeenNthCalledWith(2, folderB);
    });

    it("TC-091: startWatchingFolders does nothing when workspaceFolders is undefined", () => {
      // Case: TC-091
      setWorkspaceFolders(undefined);
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const startSpy = vi
        .spyOn(internal, "startWatchingFolder")
        .mockImplementation(() => undefined);

      // Given: workspaceFolders is undefined
      // When: startWatchingFolders is executed
      internal.startWatchingFolders();

      // Then: No watcher is started
      expect(startSpy).not.toHaveBeenCalled();
    });

    it("TC-092: startWatchingFolder creates a file system watcher and registers create/change/delete handlers", () => {
      // Case: TC-092
      const folder = "/workspace/repo";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;

      // Given: A valid folder path to watch
      // When: startWatchingFolder is executed
      internal.startWatchingFolder(folder);

      // Then: A watcher is created for "<path>/**", all three handlers are registered, and the watcher is stored
      const watcher = internal.folderWatchers[folder];
      expect(watcher.globPattern).toBe(`${folder}/**`);
      expect(watcher.onDidCreate).toHaveBeenCalledTimes(1);
      expect(watcher.onDidChange).toHaveBeenCalledTimes(1);
      expect(watcher.onDidDelete).toHaveBeenCalledTimes(1);
      expect(getCreatedWatchers()).toHaveLength(1);
    });

    it("TC-093: stopWatchingFolder disposes and removes an existing watcher entry", () => {
      // Case: TC-093
      const folder = "/workspace/repo";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      internal.startWatchingFolder(folder);
      const watcher = internal.folderWatchers[folder];

      // Given: The watcher map contains a watcher for the requested folder
      // When: stopWatchingFolder is executed
      internal.stopWatchingFolder(folder);

      // Then: The watcher is disposed and the map entry is removed
      expect(watcher.dispose).toHaveBeenCalledTimes(1);
      expect(Object.keys(internal.folderWatchers)).toEqual([]);
    });
  });

  // S20: startWatchingFolder / stopWatchingFolder の冪等化
  // @see docs/testing/perspectives/src/repoManager-test.md
  describe("idempotent watcher start/stop", () => {
    it("TC-110: startWatchingFolder called twice for the same path creates only one watcher", () => {
      // Case: TC-110
      const folder = "/workspace/repo";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;

      // Given: A watcher already exists for the normalized path
      internal.startWatchingFolder(folder);
      const firstWatcher = internal.folderWatchers[folder];

      // When: startWatchingFolder is executed again with the same path
      internal.startWatchingFolder(folder);

      // Then: createFileSystemWatcher ran only once, the original watcher survives, and it was never disposed
      expect(getCreatedWatchers()).toHaveLength(1);
      expect(internal.folderWatchers[folder]).toBe(firstWatcher);
      expect(firstWatcher.dispose).not.toHaveBeenCalled();
    });

    it("TC-111: stopWatchingFolder returns safely when the watcher entry does not exist", () => {
      // Case: TC-111
      const missingFolder = "/workspace/missing";
      const registeredFolder = "/workspace/registered";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      internal.startWatchingFolder(registeredFolder);
      const registeredWatcher = internal.folderWatchers[registeredFolder];

      // Given: There is no watcher entry for the requested folder
      // When: stopWatchingFolder is executed for the unregistered path
      const stopMissingWatcher = () => internal.stopWatchingFolder(missingFolder);

      // Then: No TypeError is thrown and no watcher is disposed
      expect(stopMissingWatcher).not.toThrow();
      expect(registeredWatcher.dispose).not.toHaveBeenCalled();
    });

    it("TC-112: stopWatchingFolder disposes once, removes the entry, and repeats as a no-op", () => {
      // Case: TC-112
      const folder = "/workspace/repo";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      internal.startWatchingFolder(folder);
      const watcher = internal.folderWatchers[folder];

      // Given: The watcher map contains a watcher for the requested folder
      // When: stopWatchingFolder is executed and then executed again for the same path
      internal.stopWatchingFolder(folder);
      const secondStop = () => internal.stopWatchingFolder(folder);

      // Then: The first call disposed the watcher once and removed the entry; the second call adds no dispose
      expect(watcher.dispose).toHaveBeenCalledTimes(1);
      expect(Object.keys(internal.folderWatchers)).toEqual([]);
      expect(secondStop).not.toThrow();
      expect(watcher.dispose).toHaveBeenCalledTimes(1);
    });

    it("TC-113: a folder removed during startup still removes repos and sends repos once", async () => {
      // Case: TC-113
      const removedFolder = "/workspace/removed";
      const repoInsideRemovedFolder = `${removedFolder}/repo`;
      const { manager } = createManager({
        repos: { [repoInsideRemovedFolder]: createRepoState() }
      });
      const internal = manager as RepoManagerWithPrivate;
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: startupTasks has not populated folderWatchers yet (startup race window)
      expect(Object.keys(internal.folderWatchers)).toEqual([]);

      // When: A workspace folder removed event fires for the folder containing the repo
      await triggerWorkspaceChange({
        added: [],
        removed: [createWorkspaceFolder(removedFolder)]
      });

      // Then: No TypeError interrupts the handler; the repo is removed and sendRepos runs once
      expect(internal.repos[repoInsideRemovedFolder]).toBeUndefined();
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });
  });
});
