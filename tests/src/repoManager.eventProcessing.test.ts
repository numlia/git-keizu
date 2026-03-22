import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createManager,
  createUri,
  fsMocks,
  type RepoManagerWithPrivate,
  resetRepoManagerTestEnvironment,
  WATCHER_DEBOUNCE_MS
} from "./repoManager.testUtils";

const PREVIOUS_TIMEOUT_DELAY_MS = WATCHER_DEBOUNCE_MS * 5;

type StatResult = Awaited<ReturnType<typeof fsMocks.stat>>;

function createStatResult(directory: boolean): StatResult {
  return {
    isDirectory: () => directory
  } as unknown as StatResult;
}

describe("RepoManager watcher event handling and queued processing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRepoManagerTestEnvironment();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("watcher event handlers", () => {
    it('TC-064: onWatcherCreate ignores paths that contain "/.git/"', async () => {
      // Case: TC-064
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;

      // Given: The created path points inside the .git directory
      // When: onWatcherCreate is executed
      await internal.onWatcherCreate(createUri("/workspace/repo/.git/config"));

      // Then: The path is filtered out and no debounce timer is scheduled
      expect(internal.createEventPaths).toEqual([]);
      expect(internal.processCreateEventsTimeout).toBeNull();
    });

    it('TC-065: onWatcherCreate trims a trailing "/.git" suffix before queueing the path', async () => {
      // Case: TC-065
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;

      // Given: The created path ends with "/.git"
      // When: onWatcherCreate is executed
      await internal.onWatcherCreate(createUri("/workspace/repo/.git"));

      // Then: The trimmed repo path is queued and a debounce timer is scheduled
      expect(internal.createEventPaths).toEqual(["/workspace/repo"]);
      expect(internal.processCreateEventsTimeout).not.toBeNull();
    });

    it("TC-066: onWatcherCreate ignores duplicate paths that are already queued", async () => {
      // Case: TC-066
      const queuedPath = "/workspace/repo";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      internal.createEventPaths = [queuedPath];

      // Given: The created path already exists in the create-event queue
      // When: onWatcherCreate is executed
      await internal.onWatcherCreate(createUri(queuedPath));

      // Then: The queue remains unchanged and no debounce timer is scheduled
      expect(internal.createEventPaths).toEqual([queuedPath]);
      expect(internal.processCreateEventsTimeout).toBeNull();
    });

    it("TC-067: onWatcherCreate queues a new path and schedules processing when no timer exists", async () => {
      // Case: TC-067
      const newPath = "/workspace/repo";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;

      // Given: The path is new and no create-event timeout is currently set
      // When: onWatcherCreate is executed
      await internal.onWatcherCreate(createUri(newPath));

      // Then: The path is queued and a debounce timer is created
      expect(internal.createEventPaths).toEqual([newPath]);
      expect(internal.processCreateEventsTimeout).not.toBeNull();
    });

    it("TC-068: onWatcherCreate clears the existing timer before scheduling a new one", async () => {
      // Case: TC-068
      const newPath = "/workspace/repo";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      const previousTimeout = setTimeout(() => undefined, PREVIOUS_TIMEOUT_DELAY_MS);
      internal.processCreateEventsTimeout = previousTimeout;

      // Given: A create-event timer is already active
      // When: onWatcherCreate is executed for a new path
      await internal.onWatcherCreate(createUri(newPath));

      // Then: The previous timer is cleared and replaced with a new debounce timer
      expect(clearTimeoutSpy).toHaveBeenCalledWith(previousTimeout);
      expect(internal.createEventPaths).toEqual([newPath]);
      expect(internal.processCreateEventsTimeout).not.toBe(previousTimeout);
    });

    it('TC-069: onWatcherChange ignores paths that contain "/.git/"', () => {
      // Case: TC-069
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;

      // Given: The changed path points inside the .git directory
      // When: onWatcherChange is executed
      internal.onWatcherChange(createUri("/workspace/repo/.git/config"));

      // Then: The path is filtered out and no debounce timer is scheduled
      expect(internal.changeEventPaths).toEqual([]);
      expect(internal.processChangeEventsTimeout).toBeNull();
    });

    it('TC-070: onWatcherChange trims a trailing "/.git" suffix before queueing the path', () => {
      // Case: TC-070
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;

      // Given: The changed path ends with "/.git"
      // When: onWatcherChange is executed
      internal.onWatcherChange(createUri("/workspace/repo/.git"));

      // Then: The trimmed repo path is queued and a debounce timer is scheduled
      expect(internal.changeEventPaths).toEqual(["/workspace/repo"]);
      expect(internal.processChangeEventsTimeout).not.toBeNull();
    });

    it("TC-071: onWatcherChange ignores duplicate paths that are already queued", () => {
      // Case: TC-071
      const queuedPath = "/workspace/repo";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      internal.changeEventPaths = [queuedPath];

      // Given: The changed path already exists in the change-event queue
      // When: onWatcherChange is executed
      internal.onWatcherChange(createUri(queuedPath));

      // Then: The queue remains unchanged and no debounce timer is scheduled
      expect(internal.changeEventPaths).toEqual([queuedPath]);
      expect(internal.processChangeEventsTimeout).toBeNull();
    });

    it("TC-072: onWatcherChange queues a new path and schedules processing", () => {
      // Case: TC-072
      const newPath = "/workspace/repo";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;

      // Given: The path is new to the change-event queue
      // When: onWatcherChange is executed
      internal.onWatcherChange(createUri(newPath));

      // Then: The path is queued and a debounce timer is created
      expect(internal.changeEventPaths).toEqual([newPath]);
      expect(internal.processChangeEventsTimeout).not.toBeNull();
    });

    it('TC-073: onWatcherDelete ignores paths that contain "/.git/"', () => {
      // Case: TC-073
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const removeSpy = vi.spyOn(internal, "removeReposWithinFolder").mockReturnValue(false);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: The deleted path points inside the .git directory
      // When: onWatcherDelete is executed
      internal.onWatcherDelete(createUri("/workspace/repo/.git/config"));

      // Then: The path is filtered out and no repo removal or notification occurs
      expect(removeSpy).not.toHaveBeenCalled();
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('TC-074: onWatcherDelete trims a trailing "/.git" suffix and sends repos when removals occur', () => {
      // Case: TC-074
      const trimmedPath = "/workspace/repo";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const removeSpy = vi.spyOn(internal, "removeReposWithinFolder").mockReturnValue(true);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: The deleted path ends with "/.git" and removing repos under the trimmed path reports changes
      // When: onWatcherDelete is executed
      internal.onWatcherDelete(createUri("/workspace/repo/.git"));

      // Then: The trimmed path is passed to removeReposWithinFolder and sendRepos is called once
      expect(removeSpy).toHaveBeenCalledWith(trimmedPath);
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it("TC-075: onWatcherDelete sends repos when a normal path removal reports changes", () => {
      // Case: TC-075
      const deletedPath = "/workspace/repo";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const removeSpy = vi.spyOn(internal, "removeReposWithinFolder").mockReturnValue(true);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: The deleted path is a normal folder path and removing repos under it reports changes
      // When: onWatcherDelete is executed
      internal.onWatcherDelete(createUri(deletedPath));

      // Then: removeReposWithinFolder is called for the path and sendRepos is triggered once
      expect(removeSpy).toHaveBeenCalledWith(deletedPath);
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it("TC-076: onWatcherDelete skips sendRepos when no repos are removed", () => {
      // Case: TC-076
      const deletedPath = "/workspace/repo";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const removeSpy = vi.spyOn(internal, "removeReposWithinFolder").mockReturnValue(false);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: The deleted path does not match any tracked repos
      // When: onWatcherDelete is executed
      internal.onWatcherDelete(createUri(deletedPath));

      // Then: removeReposWithinFolder is called but sendRepos is not triggered
      expect(removeSpy).toHaveBeenCalledWith(deletedPath);
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });

  describe("queued event processing", () => {
    it("TC-077: processCreateEvents does nothing when the create queue is empty", async () => {
      // Case: TC-077
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const searchSpy = vi.spyOn(internal, "searchDirectoryForRepos").mockResolvedValue(false);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: The create-event queue is empty
      // When: processCreateEvents is executed
      await internal.processCreateEvents();

      // Then: No search or notification occurs and the timeout field is cleared to null
      expect(searchSpy).not.toHaveBeenCalled();
      expect(sendSpy).not.toHaveBeenCalled();
      expect(internal.processCreateEventsTimeout).toBeNull();
    });

    it("TC-078: processCreateEvents searches a queued directory and sends repos when changes are found", async () => {
      // Case: TC-078
      const queuedPath = "/workspace/repo";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      internal.createEventPaths = [queuedPath];
      fsMocks.stat.mockResolvedValue(createStatResult(true));
      const searchSpy = vi.spyOn(internal, "searchDirectoryForRepos").mockResolvedValue(true);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: The queue contains one directory path and searching it reports repo changes
      // When: processCreateEvents is executed
      await internal.processCreateEvents();

      // Then: The directory is searched once, sendRepos is triggered, and the queue is drained
      expect(searchSpy).toHaveBeenCalledWith(queuedPath, internal.maxDepthOfRepoSearch);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(internal.createEventPaths).toEqual([]);
    });

    it("TC-079: processCreateEvents skips non-directory paths", async () => {
      // Case: TC-079
      const queuedPath = "/workspace/file.txt";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      internal.createEventPaths = [queuedPath];
      fsMocks.stat.mockResolvedValue(createStatResult(false));
      const searchSpy = vi.spyOn(internal, "searchDirectoryForRepos").mockResolvedValue(false);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: The queue contains one path that is not a directory
      // When: processCreateEvents is executed
      await internal.processCreateEvents();

      // Then: The path is skipped, no search occurs, and no notification is sent
      expect(searchSpy).not.toHaveBeenCalled();
      expect(sendSpy).not.toHaveBeenCalled();
      expect(internal.createEventPaths).toEqual([]);
    });

    it("TC-080: processCreateEvents drains multiple paths and sends repos once when at least one search reports changes", async () => {
      // Case: TC-080
      const queuedPathA = "/workspace/a";
      const queuedPathB = "/workspace/b";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      internal.createEventPaths = [queuedPathA, queuedPathB];
      fsMocks.stat.mockResolvedValue(createStatResult(true));
      const searchSpy = vi
        .spyOn(internal, "searchDirectoryForRepos")
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: The queue contains two directories and only one search reports changes
      // When: processCreateEvents is executed
      await internal.processCreateEvents();

      // Then: Both paths are processed and sendRepos is triggered exactly once after the loop
      expect(searchSpy).toHaveBeenNthCalledWith(1, queuedPathA, internal.maxDepthOfRepoSearch);
      expect(searchSpy).toHaveBeenNthCalledWith(2, queuedPathB, internal.maxDepthOfRepoSearch);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(internal.createEventPaths).toEqual([]);
    });

    it("TC-081: processChangeEvents does nothing when the change queue is empty", async () => {
      // Case: TC-081
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      const removeSpy = vi.spyOn(internal, "removeReposWithinFolder").mockReturnValue(false);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: The change-event queue is empty
      // When: processChangeEvents is executed
      await internal.processChangeEvents();

      // Then: No removal or notification occurs and the timeout field is cleared to null
      expect(removeSpy).not.toHaveBeenCalled();
      expect(sendSpy).not.toHaveBeenCalled();
      expect(internal.processChangeEventsTimeout).toBeNull();
    });

    it("TC-082: processChangeEvents removes repos and sends repos when a queued path no longer exists", async () => {
      // Case: TC-082
      const missingPath = "/workspace/repo";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      internal.changeEventPaths = [missingPath];
      fsMocks.stat.mockRejectedValue(new Error("ENOENT"));
      const removeSpy = vi.spyOn(internal, "removeReposWithinFolder").mockReturnValue(true);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: The queue contains one path that no longer exists and removing repos under it reports changes
      // When: processChangeEvents is executed
      await internal.processChangeEvents();

      // Then: The missing path triggers repo removal, sendRepos is called once, and the queue is drained
      expect(removeSpy).toHaveBeenCalledWith(missingPath);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(internal.changeEventPaths).toEqual([]);
    });

    it("TC-083: processChangeEvents skips removal when the queued path still exists", async () => {
      // Case: TC-083
      const existingPath = "/workspace/repo";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      internal.changeEventPaths = [existingPath];
      fsMocks.stat.mockResolvedValue(createStatResult(false));
      const removeSpy = vi.spyOn(internal, "removeReposWithinFolder").mockReturnValue(false);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: The queue contains one path that still exists
      // When: processChangeEvents is executed
      await internal.processChangeEvents();

      // Then: No repo removal or notification occurs and the queue is drained
      expect(removeSpy).not.toHaveBeenCalled();
      expect(sendSpy).not.toHaveBeenCalled();
      expect(internal.changeEventPaths).toEqual([]);
    });

    it("TC-084: processChangeEvents skips sendRepos when a missing path causes no repo removals", async () => {
      // Case: TC-084
      const missingPath = "/workspace/repo";
      const { manager } = createManager();
      const internal = manager as RepoManagerWithPrivate;
      internal.changeEventPaths = [missingPath];
      fsMocks.stat.mockRejectedValue(new Error("ENOENT"));
      const removeSpy = vi.spyOn(internal, "removeReposWithinFolder").mockReturnValue(false);
      const sendSpy = vi.spyOn(internal, "sendRepos").mockImplementation(() => undefined);

      // Given: The queue contains one missing path but removing repos under it reports no changes
      // When: processChangeEvents is executed
      await internal.processChangeEvents();

      // Then: removeReposWithinFolder is called once, sendRepos is not triggered, and the queue is drained
      expect(removeSpy).toHaveBeenCalledWith(missingPath);
      expect(sendSpy).not.toHaveBeenCalled();
      expect(internal.changeEventPaths).toEqual([]);
    });
  });
});
