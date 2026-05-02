import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: {
    createFileSystemWatcher: vi.fn()
  }
}));

vi.mock("../../src/utils", () => ({
  getPathFromUri: vi.fn((uri: { fsPath: string }) => uri.fsPath)
}));

import * as vscode from "vscode";

import { RepoFileWatcher } from "../../src/repoFileWatcher";

const mockedCreateFSWatcher = vscode.workspace.createFileSystemWatcher as Mock;

interface MockWatcher {
  onDidCreate: Mock;
  onDidChange: Mock;
  onDidDelete: Mock;
  dispose: Mock;
}

const MAIN_GIT_DIR = "/path/to/repo/.git";
const LINKED_WORKTREE_GIT_DIR = "/path/to/main/.git/worktrees/feature-x";
const COMMON_GIT_DIR = "/path/to/main/.git";
const DEBOUNCE_MS = 750;
const GRACE_PERIOD_MS = 1500;

function createMockWatcher(): MockWatcher {
  return {
    onDidCreate: vi.fn(),
    onDidChange: vi.fn(),
    onDidDelete: vi.fn(),
    dispose: vi.fn()
  };
}

function createUri(watchRoot: string, relativePath: string): { fsPath: string } {
  return {
    fsPath: relativePath === "" ? watchRoot : `${watchRoot}/${relativePath}`
  };
}

function startWatcher(
  callback: Mock,
  watchRoots: string[] = [MAIN_GIT_DIR]
): {
  rfWatcher: RepoFileWatcher;
  mockWatchers: MockWatcher[];
  triggerChange: (watcherIndex: number, relativePath: string) => void;
} {
  const rfWatcher = new RepoFileWatcher(callback);
  const mockWatchers = watchRoots.map(() => createMockWatcher());
  let watcherIndex = 0;
  mockedCreateFSWatcher.mockImplementation(() => mockWatchers[watcherIndex++]);
  rfWatcher.start(watchRoots);

  return {
    rfWatcher,
    mockWatchers,
    triggerChange: (targetWatcherIndex, relativePath) => {
      const handler = mockWatchers[targetWatcherIndex].onDidChange.mock.calls[0][0] as (uri: {
        fsPath: string;
      }) => void;
      handler(createUri(watchRoots[targetWatcherIndex], relativePath));
    }
  };
}

describe("RepoFileWatcher repository-state watching", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates one watcher per watch root and registers all file event listeners (TC-032)", () => {
    // Case: TC-032
    // Given: Two Git state watch roots for a linked worktree repository
    const callback = vi.fn();
    const watchRoots = [LINKED_WORKTREE_GIT_DIR, COMMON_GIT_DIR];
    const mockWatchers = watchRoots.map(() => createMockWatcher());
    let watcherIndex = 0;
    mockedCreateFSWatcher.mockImplementation(() => mockWatchers[watcherIndex++]);

    // When: RepoFileWatcher.start() is called with both roots
    const rfWatcher = new RepoFileWatcher(callback);
    rfWatcher.start(watchRoots);

    // Then: createFileSystemWatcher is called once per root and all 3 listeners are registered
    expect(mockedCreateFSWatcher).toHaveBeenCalledTimes(2);
    expect(mockedCreateFSWatcher).toHaveBeenNthCalledWith(1, `${LINKED_WORKTREE_GIT_DIR}/**`);
    expect(mockedCreateFSWatcher).toHaveBeenNthCalledWith(2, `${COMMON_GIT_DIR}/**`);
    for (const mockWatcher of mockWatchers) {
      expect(mockWatcher.onDidCreate).toHaveBeenCalledTimes(1);
      expect(mockWatcher.onDidChange).toHaveBeenCalledTimes(1);
      expect(mockWatcher.onDidDelete).toHaveBeenCalledTimes(1);
    }
  });

  it("disposes existing watchers before recreating them for a new root set (TC-033)", () => {
    // Case: TC-033
    // Given: RepoFileWatcher already started for one watch root
    const callback = vi.fn();
    const firstWatcher = createMockWatcher();
    const secondWatcher = createMockWatcher();
    const thirdWatcher = createMockWatcher();
    mockedCreateFSWatcher
      .mockReturnValueOnce(firstWatcher)
      .mockReturnValueOnce(secondWatcher)
      .mockReturnValueOnce(thirdWatcher);
    const rfWatcher = new RepoFileWatcher(callback);
    rfWatcher.start([MAIN_GIT_DIR]);

    // When: start() is called again with linked worktree roots
    rfWatcher.start([LINKED_WORKTREE_GIT_DIR, COMMON_GIT_DIR]);

    // Then: The original watcher is disposed and the new roots are registered
    expect(firstWatcher.dispose).toHaveBeenCalledTimes(1);
    expect(mockedCreateFSWatcher).toHaveBeenCalledTimes(3);
    expect(mockedCreateFSWatcher).toHaveBeenNthCalledWith(2, `${LINKED_WORKTREE_GIT_DIR}/**`);
    expect(mockedCreateFSWatcher).toHaveBeenNthCalledWith(3, `${COMMON_GIT_DIR}/**`);
  });

  it("disposes every active watcher when stop() is called (TC-034)", () => {
    // Case: TC-034
    // Given: RepoFileWatcher is watching two Git state roots
    const callback = vi.fn();
    const { rfWatcher, mockWatchers } = startWatcher(callback, [
      LINKED_WORKTREE_GIT_DIR,
      COMMON_GIT_DIR
    ]);

    // When: stop() is called
    rfWatcher.stop();

    // Then: Each watcher is disposed exactly once
    expect(mockWatchers[0].dispose).toHaveBeenCalledTimes(1);
    expect(mockWatchers[1].dispose).toHaveBeenCalledTimes(1);
  });

  it("ignores working tree file paths that do not map to watched Git state files (TC-035)", () => {
    // Case: TC-035
    // Given: RepoFileWatcher is active for a Git directory root
    const callback = vi.fn();
    const { triggerChange } = startWatcher(callback);

    // When: A non-Git state file path is reported under that root
    triggerChange(0, "src/index.ts");
    vi.runAllTimers();

    // Then: repoChangeCallback is not called
    expect(callback).not.toHaveBeenCalled();
  });

  it("ignores dotfiles such as .gitignore because they are outside the allowed Git state set (TC-036)", () => {
    // Case: TC-036
    // Given: RepoFileWatcher is active for a Git directory root
    const callback = vi.fn();
    const { triggerChange } = startWatcher(callback);

    // When: A .gitignore-like path is reported under the watch root
    triggerChange(0, ".gitignore");
    vi.runAllTimers();

    // Then: repoChangeCallback is not called
    expect(callback).not.toHaveBeenCalled();
  });

  it("fires the callback once after debounce for HEAD changes (TC-037)", () => {
    // Case: TC-037
    // Given: RepoFileWatcher is active and not muted
    const callback = vi.fn();
    const { triggerChange } = startWatcher(callback);

    // When: HEAD changes inside the watched Git root
    triggerChange(0, "HEAD");

    // Then: The callback runs once after the 750ms debounce delay
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(DEBOUNCE_MS);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires the callback for packed-refs changes (TC-038)", () => {
    // Case: TC-038
    // Given: RepoFileWatcher is active and not muted
    const callback = vi.fn();
    const { triggerChange } = startWatcher(callback);

    // When: packed-refs changes inside the watched Git root
    triggerChange(0, "packed-refs");
    vi.advanceTimersByTime(DEBOUNCE_MS);

    // Then: The callback runs once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires the callback for remote ref updates (TC-039)", () => {
    // Case: TC-039
    // Given: RepoFileWatcher is active and not muted
    const callback = vi.fn();
    const { triggerChange } = startWatcher(callback);

    // When: A remote-tracking ref changes
    triggerChange(0, "refs/remotes/origin/main");
    vi.advanceTimersByTime(DEBOUNCE_MS);

    // Then: The callback runs once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("ignores ref directory paths without a concrete ref name (TC-040)", () => {
    // Case: TC-040
    // Given: RepoFileWatcher is active for a Git directory root
    const callback = vi.fn();
    const { triggerChange } = startWatcher(callback);

    // When: A refs/heads directory path without a branch name is reported
    triggerChange(0, "refs/heads/");
    vi.runAllTimers();

    // Then: repoChangeCallback is not called
    expect(callback).not.toHaveBeenCalled();
  });

  it("suppresses matching events while muted (TC-041)", () => {
    // Case: TC-041
    // Given: RepoFileWatcher is muted after start
    const callback = vi.fn();
    const { rfWatcher, triggerChange } = startWatcher(callback);
    rfWatcher.mute();

    // When: A watched Git state file changes
    triggerChange(0, "HEAD");
    vi.runAllTimers();

    // Then: repoChangeCallback is not called
    expect(callback).not.toHaveBeenCalled();
  });

  it("suppresses matching events during the unmute grace period (TC-042)", () => {
    // Case: TC-042
    // Given: RepoFileWatcher is unmuted at a fixed time
    const callback = vi.fn();
    const { rfWatcher, triggerChange } = startWatcher(callback);
    vi.setSystemTime(new Date(10_000));
    rfWatcher.mute();
    rfWatcher.unmute();

    // When: A watched Git state file changes before resumeAt
    vi.setSystemTime(new Date(10_000 + GRACE_PERIOD_MS - 1));
    triggerChange(0, "HEAD");
    vi.runAllTimers();

    // Then: repoChangeCallback is not called
    expect(callback).not.toHaveBeenCalled();
  });

  it("matches watched files from the second watch root in a linked worktree setup (TC-043)", () => {
    // Case: TC-043
    // Given: RepoFileWatcher is watching both the linked worktree git-dir and the shared common-dir
    const callback = vi.fn();
    const { triggerChange } = startWatcher(callback, [LINKED_WORKTREE_GIT_DIR, COMMON_GIT_DIR]);

    // When: A shared ref changes under the common-dir watcher
    triggerChange(1, "refs/heads/main");
    vi.advanceTimersByTime(DEBOUNCE_MS);

    // Then: The callback runs once for the second watch root event
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("debounces rapid matching events across multiple watch roots into one callback (TC-044)", () => {
    // Case: TC-044
    // Given: RepoFileWatcher is active for linked worktree and common-dir roots
    const callback = vi.fn();
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const { triggerChange } = startWatcher(callback, [LINKED_WORKTREE_GIT_DIR, COMMON_GIT_DIR]);
    clearTimeoutSpy.mockClear();

    // When: Matching changes are reported rapidly from different roots
    triggerChange(0, "HEAD");
    triggerChange(1, "refs/remotes/origin/main");

    // Then: The first timeout is cleared and only one callback fires after debounce
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(DEBOUNCE_MS);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("ignores events that are outside every configured watch root (TC-045)", () => {
    // Case: TC-045
    // Given: RepoFileWatcher is active for a linked worktree git-dir only
    const callback = vi.fn();
    const { mockWatchers } = startWatcher(callback, [LINKED_WORKTREE_GIT_DIR]);
    const handler = mockWatchers[0].onDidChange.mock.calls[0][0] as (uri: {
      fsPath: string;
    }) => void;

    // When: A file from the shared common-dir is delivered to the linked worktree watcher callback
    handler(createUri(COMMON_GIT_DIR, "refs/heads/main"));
    vi.runAllTimers();

    // Then: repoChangeCallback is not called because the path is outside the configured root
    expect(callback).not.toHaveBeenCalled();
  });
});
