import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: {
    createFileSystemWatcher: vi.fn()
  }
}));

vi.mock("../../src/utils", () => ({
  getPathFromUri: vi.fn((uri: { fsPath: string }) => uri.fsPath.replace(/\\/g, "/")),
  getPathFromStr: vi.fn((str: string) => str.replace(/\\/g, "/"))
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

type WatcherEvent = "onDidCreate" | "onDidChange" | "onDidDelete";

function startWatcher(
  callback: Mock,
  watchRoots: string[] = [MAIN_GIT_DIR]
): {
  rfWatcher: RepoFileWatcher;
  mockWatchers: MockWatcher[];
  triggerChange: (watcherIndex: number, relativePath: string) => void;
  trigger: (watcherIndex: number, event: WatcherEvent, relativePath: string) => void;
  triggerAbsolutePath: (watcherIndex: number, event: WatcherEvent, fsPath: string) => void;
} {
  const rfWatcher = new RepoFileWatcher(callback);
  const mockWatchers = watchRoots.map(() => createMockWatcher());
  let watcherIndex = 0;
  mockedCreateFSWatcher.mockImplementation(() => mockWatchers[watcherIndex++]);
  rfWatcher.start(watchRoots);

  const triggerAbsolutePath = (
    targetWatcherIndex: number,
    event: WatcherEvent,
    fsPath: string
  ): void => {
    const handler = mockWatchers[targetWatcherIndex][event].mock.calls[0][0] as (uri: {
      fsPath: string;
    }) => void;
    handler({ fsPath });
  };
  const trigger = (targetWatcherIndex: number, event: WatcherEvent, relativePath: string): void => {
    triggerAbsolutePath(
      targetWatcherIndex,
      event,
      createUri(watchRoots[targetWatcherIndex], relativePath).fsPath
    );
  };

  return {
    rfWatcher,
    mockWatchers,
    triggerChange: (targetWatcherIndex, relativePath) =>
      trigger(targetWatcherIndex, "onDidChange", relativePath),
    trigger,
    triggerAbsolutePath
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

describe("RepoFileWatcher start() glob separator normalization (S10)", () => {
  function startWithRoots(watchRoots: string[]): { globArgs: string[] } {
    const callback = vi.fn();
    const mockWatchers = watchRoots.map(() => createMockWatcher());
    let watcherIndex = 0;
    mockedCreateFSWatcher.mockImplementation(() => mockWatchers[watcherIndex++]);
    const rfWatcher = new RepoFileWatcher(callback);
    rfWatcher.start(watchRoots);

    return {
      globArgs: mockedCreateFSWatcher.mock.calls.map((call) => call[0] as string)
    };
  }

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("converts Windows backslash separators to forward slashes in the glob (TC-046)", () => {
    // Case: TC-046
    // Given: A watch root using Windows backslash separators
    // When: start() builds the file system watcher glob
    const { globArgs } = startWithRoots(["C:\\repo\\.git"]);

    // Then: createFileSystemWatcher is called once with a forward-slash glob and no backslash
    expect(mockedCreateFSWatcher).toHaveBeenCalledTimes(1);
    expect(mockedCreateFSWatcher).toHaveBeenCalledWith("C:/repo/.git/**");
    expect(globArgs[0]).not.toContain("\\");
  });

  it("leaves an already-forward-slash POSIX path unchanged (TC-047)", () => {
    // Case: TC-047
    // Given: A watch root already using forward-slash separators
    // When: start() builds the glob
    startWithRoots(["/path/to/repo/.git"]);

    // Then: The glob separators are unchanged
    expect(mockedCreateFSWatcher).toHaveBeenCalledTimes(1);
    expect(mockedCreateFSWatcher).toHaveBeenCalledWith("/path/to/repo/.git/**");
  });

  it("collapses a redundant ./ segment via path.normalize (TC-048)", () => {
    // Case: TC-048
    // Given: A watch root containing a redundant "./" segment
    // When: start() normalizes the path
    startWithRoots(["/path/to/repo/./.git"]);

    // Then: The "/./" segment is collapsed in the glob
    expect(mockedCreateFSWatcher).toHaveBeenCalledTimes(1);
    expect(mockedCreateFSWatcher).toHaveBeenCalledWith("/path/to/repo/.git/**");
  });

  it("creates no watcher for an empty roots array (TC-049)", () => {
    // Case: TC-049
    // Given: An empty watch roots array
    // When: start() is called with no roots
    startWithRoots([]);

    // Then: createFileSystemWatcher is never called
    expect(mockedCreateFSWatcher).toHaveBeenCalledTimes(0);
  });

  it("normalizes an empty-string root to './**' (TC-050)", () => {
    // Case: TC-050
    // Given: A single empty-string watch root
    // When: start() normalizes the empty root
    startWithRoots([""]);

    // Then: path.normalize("") yields "." and the glob becomes "./**"
    expect(mockedCreateFSWatcher).toHaveBeenCalledTimes(1);
    expect(mockedCreateFSWatcher).toHaveBeenCalledWith("./**");
  });

  it("normalizes each root independently for mixed-separator multi-roots (TC-052)", () => {
    // Case: TC-052
    // Given: Two watch roots with mixed backslash and forward-slash separators
    // When: start() builds a glob per root
    const { globArgs } = startWithRoots(["C:\\a\\.git", "/b/.git"]);

    // Then: Each glob is normalized to forward slashes with no backslash
    expect(mockedCreateFSWatcher).toHaveBeenCalledTimes(2);
    expect(mockedCreateFSWatcher).toHaveBeenNthCalledWith(1, "C:/a/.git/**");
    expect(mockedCreateFSWatcher).toHaveBeenNthCalledWith(2, "/b/.git/**");
    expect(globArgs[0]).not.toContain("\\");
    expect(globArgs[1]).not.toContain("\\");
  });
});

describe("RepoFileWatcher muteCount reference counting (S11)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("suppresses matching events after a single mute (TC-053)", () => {
    // Case: TC-053
    // Given: the watcher is muted once (muteCount === 1)
    const callback = vi.fn();
    const { rfWatcher, triggerChange } = startWatcher(callback);
    rfWatcher.mute();

    // When: a watched HEAD change fires
    triggerChange(0, "HEAD");
    vi.runAllTimers();

    // Then: the callback is not scheduled
    expect(callback).not.toHaveBeenCalled();
  });

  it("still suppresses events with nested mutes (TC-054)", () => {
    // Case: TC-054
    // Given: the watcher is muted twice (muteCount === 2)
    const callback = vi.fn();
    const { rfWatcher, triggerChange } = startWatcher(callback);
    rfWatcher.mute();
    rfWatcher.mute();

    // When: a watched HEAD change fires
    triggerChange(0, "HEAD");
    vi.runAllTimers();

    // Then: the callback is not scheduled (muteCount > 0)
    expect(callback).not.toHaveBeenCalled();
  });

  it("remains muted after a partial unmute (TC-055)", () => {
    // Case: TC-055
    // Given: two mutes and one unmute leave muteCount === 1
    const callback = vi.fn();
    const { rfWatcher, triggerChange } = startWatcher(callback);
    rfWatcher.mute();
    rfWatcher.mute();
    rfWatcher.unmute();

    // When: a watched HEAD change fires
    triggerChange(0, "HEAD");
    vi.runAllTimers();

    // Then: the callback is still suppressed
    expect(callback).not.toHaveBeenCalled();
  });

  it("resumes after a fully balanced unmute past the grace period (TC-056)", () => {
    // Case: TC-056
    // Given: two mutes balanced by two unmutes leave muteCount === 0
    const callback = vi.fn();
    vi.setSystemTime(new Date(10_000));
    const { rfWatcher, triggerChange } = startWatcher(callback);
    rfWatcher.mute();
    rfWatcher.mute();
    rfWatcher.unmute();
    rfWatcher.unmute();

    // When: after the grace period, a watched HEAD change fires
    vi.setSystemTime(new Date(10_000 + GRACE_PERIOD_MS + 1));
    triggerChange(0, "HEAD");
    vi.advanceTimersByTime(DEBOUNCE_MS);

    // Then: the callback fires once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not underflow on excess unmute and re-mutes correctly (TC-057)", () => {
    // Case: TC-057
    // Given: an excess unmute at muteCount 0 followed by a single mute
    const callback = vi.fn();
    const { rfWatcher, triggerChange } = startWatcher(callback);
    rfWatcher.unmute();
    rfWatcher.mute();

    // When: a watched HEAD change fires
    triggerChange(0, "HEAD");
    vi.runAllTimers();

    // Then: the single mute still suppresses (muteCount did not go negative)
    expect(callback).not.toHaveBeenCalled();
  });

  it("sets resumeAt to now + 1500ms on unmute (TC-058)", () => {
    // Case: TC-058
    // Given: a mute/unmute cycle at a fixed time sets resumeAt to now + grace period
    const callback = vi.fn();
    vi.setSystemTime(new Date(10_000));
    const { rfWatcher, triggerChange } = startWatcher(callback);
    rfWatcher.mute();
    rfWatcher.unmute();

    // When: a change fires one millisecond before resumeAt (10_000 + 1500)
    vi.setSystemTime(new Date(10_000 + GRACE_PERIOD_MS - 1));
    triggerChange(0, "HEAD");
    vi.runAllTimers();

    // Then: the change is suppressed, confirming resumeAt is at/after now + 1500ms
    expect(callback).not.toHaveBeenCalled();
  });
});

describe("RepoFileWatcher pending debounce timer clearing (S12)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears a pending debounce timer on stop (TC-059)", () => {
    // Case: TC-059
    // Given: a matching change has scheduled a pending refresh timer
    const callback = vi.fn();
    const { rfWatcher, triggerChange } = startWatcher(callback);
    triggerChange(0, "HEAD");
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    // When: stop() is called before the debounce elapses
    rfWatcher.stop();

    // Then: the pending timer is cleared and never fires
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(DEBOUNCE_MS);
    expect(callback).not.toHaveBeenCalled();
  });

  it("does not clear a refresh timer on stop when none is pending (TC-060)", () => {
    // Case: TC-060
    // Given: no matching change has scheduled a refresh timer
    const callback = vi.fn();
    const { rfWatcher } = startWatcher(callback);
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    // When: stop() is called with no pending timer
    rfWatcher.stop();

    // Then: clearTimeout is not called for a refresh timer and no error occurs
    expect(clearTimeoutSpy).not.toHaveBeenCalled();
  });

  it("clears a pending debounce timer on mute and increments muteCount (TC-061)", () => {
    // Case: TC-061
    // Given: a matching change has scheduled a pending refresh timer
    const callback = vi.fn();
    const { rfWatcher, triggerChange } = startWatcher(callback);
    triggerChange(0, "HEAD");
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    // When: mute() is called
    rfWatcher.mute();

    // Then: the pending timer is cleared, and the watcher is now muted (muteCount incremented)
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    triggerChange(0, "HEAD");
    vi.runAllTimers();
    expect(callback).not.toHaveBeenCalled();
  });

  it("does not clear a refresh timer on mute when none is pending but still mutes (TC-062)", () => {
    // Case: TC-062
    // Given: no matching change has scheduled a refresh timer
    const callback = vi.fn();
    const { rfWatcher, triggerChange } = startWatcher(callback);
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    // When: mute() is called
    rfWatcher.mute();

    // Then: clearTimeout is not called, but muteCount is incremented (subsequent change suppressed)
    expect(clearTimeoutSpy).not.toHaveBeenCalled();
    triggerChange(0, "HEAD");
    vi.runAllTimers();
    expect(callback).not.toHaveBeenCalled();
  });

  it("keeps a mute-cleared timer from ever firing (TC-063)", () => {
    // Case: TC-063
    // Given: a matching change scheduled a refresh timer that mute() then cleared
    const callback = vi.fn();
    const { rfWatcher, triggerChange } = startWatcher(callback);
    triggerChange(0, "HEAD");
    rfWatcher.mute();

    // When: time advances well past the debounce window
    vi.advanceTimersByTime(DEBOUNCE_MS * 2);

    // Then: the cleared timer never invokes the callback
    expect(callback).not.toHaveBeenCalled();
  });
});

// S13: refresh(uri) linked worktree の Git 状態監視（`worktrees/` prefix）
// @see docs/testing/perspectives/src/repoFileWatcher-test.md
describe("RepoFileWatcher linked worktree state watching (S13)", () => {
  const WORKTREE_HEAD_PATH = "worktrees/feature-x/HEAD";
  const WINDOWS_GIT_DIR = "C:/repo/.git";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires for a created worktree HEAD file (TC-064)", () => {
    // Case: TC-064
    // Given: the watcher is active for the common Git directory
    const callback = vi.fn();
    const { trigger } = startWatcher(callback);

    // When: a linked worktree HEAD file is created
    trigger(0, "onDidCreate", WORKTREE_HEAD_PATH);
    vi.advanceTimersByTime(DEBOUNCE_MS);

    // Then: the callback runs once after the debounce delay
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires for a changed worktree HEAD file (TC-065)", () => {
    // Case: TC-065
    // Given: the watcher is active for the common Git directory
    const callback = vi.fn();
    const { trigger } = startWatcher(callback);

    // When: the linked worktree HEAD moves
    trigger(0, "onDidChange", WORKTREE_HEAD_PATH);
    vi.advanceTimersByTime(DEBOUNCE_MS);

    // Then: the callback runs once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires for a deleted worktree HEAD file (TC-066)", () => {
    // Case: TC-066
    // Given: the watcher is active for the common Git directory
    const callback = vi.fn();
    const { trigger } = startWatcher(callback);

    // When: the linked worktree HEAD file is removed
    trigger(0, "onDidDelete", WORKTREE_HEAD_PATH);
    vi.advanceTimersByTime(DEBOUNCE_MS);

    // Then: the callback runs once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires for the shortest non-empty descendant of the prefix on create (TC-067)", () => {
    // Case: TC-067
    // Given: the watcher is active for the common Git directory
    const callback = vi.fn();
    const { trigger } = startWatcher(callback);

    // When: the worktree directory itself is created one segment below the prefix
    trigger(0, "onDidCreate", "worktrees/feature-x");
    vi.advanceTimersByTime(DEBOUNCE_MS);

    // Then: the callback runs once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires for the shortest non-empty descendant of the prefix on delete (TC-068)", () => {
    // Case: TC-068
    // Given: the watcher is active for the common Git directory
    const callback = vi.fn();
    const { trigger } = startWatcher(callback);

    // When: the whole worktree directory is removed
    trigger(0, "onDidDelete", "worktrees/feature-x");
    vi.advanceTimersByTime(DEBOUNCE_MS);

    // Then: the callback runs once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires for a created worktree gitdir file (TC-069)", () => {
    // Case: TC-069
    // Given: the watcher is active for the common Git directory
    const callback = vi.fn();
    const { trigger } = startWatcher(callback);

    // When: the gitdir pointer of a new worktree is created
    trigger(0, "onDidCreate", "worktrees/feature-x/gitdir");
    vi.advanceTimersByTime(DEBOUNCE_MS);

    // Then: the callback runs once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires for a deleted worktree gitdir file (TC-070)", () => {
    // Case: TC-070
    // Given: the watcher is active for the common Git directory
    const callback = vi.fn();
    const { trigger } = startWatcher(callback);

    // When: the gitdir pointer is removed
    trigger(0, "onDidDelete", "worktrees/feature-x/gitdir");
    vi.advanceTimersByTime(DEBOUNCE_MS);

    // Then: the callback runs once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires for a changed worktree commondir file (TC-071)", () => {
    // Case: TC-071
    // Given: the watcher is active for the common Git directory
    const callback = vi.fn();
    const { trigger } = startWatcher(callback);

    // When: the commondir pointer of a worktree changes
    trigger(0, "onDidChange", "worktrees/feature-x/commondir");
    vi.advanceTimersByTime(DEBOUNCE_MS);

    // Then: the callback runs once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires for a changed worktree index file (TC-072)", () => {
    // Case: TC-072
    // Given: the watcher is active for the common Git directory
    const callback = vi.fn();
    const { trigger } = startWatcher(callback);

    // When: the per-worktree index changes
    trigger(0, "onDidChange", "worktrees/feature-x/index");
    vi.advanceTimersByTime(DEBOUNCE_MS);

    // Then: the callback runs once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires for a deeply nested worktree descendant (TC-073)", () => {
    // Case: TC-073
    // Given: the watcher is active for the common Git directory
    const callback = vi.fn();
    const { trigger } = startWatcher(callback);

    // When: a multi-level descendant below the worktree directory changes
    trigger(0, "onDidChange", "worktrees/feature-x/logs/HEAD");
    vi.advanceTimersByTime(DEBOUNCE_MS);

    // Then: the callback runs once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("ignores the worktrees prefix itself (TC-074)", () => {
    // Case: TC-074
    // Given: the watcher is active for the common Git directory
    const callback = vi.fn();
    const { trigger } = startWatcher(callback);

    // When: the prefix directory itself is created
    trigger(0, "onDidCreate", "worktrees/");
    vi.runAllTimers();

    // Then: the callback is not called
    expect(callback).not.toHaveBeenCalled();
  });

  it("ignores a prefix match without the trailing separator (TC-075)", () => {
    // Case: TC-075
    // Given: the watcher is active for the common Git directory
    const callback = vi.fn();
    const { trigger } = startWatcher(callback);

    // When: a path equal to the prefix without its separator is created
    trigger(0, "onDidCreate", "worktrees");
    vi.runAllTimers();

    // Then: the callback is not called
    expect(callback).not.toHaveBeenCalled();
  });

  it("ignores Git object paths (TC-076)", () => {
    // Case: TC-076
    // Given: the watcher is active for the common Git directory
    const callback = vi.fn();
    const { trigger } = startWatcher(callback);

    // When: a loose object file changes
    trigger(0, "onDidChange", "objects/ab/cd1234");
    vi.runAllTimers();

    // Then: the callback is not called
    expect(callback).not.toHaveBeenCalled();
  });

  it("ignores working tree source paths (TC-077)", () => {
    // Case: TC-077
    // Given: the watcher is active for the common Git directory
    const callback = vi.fn();
    const { trigger } = startWatcher(callback);

    // When: a working tree source file changes
    trigger(0, "onDidChange", "src/index.ts");
    vi.runAllTimers();

    // Then: the callback is not called
    expect(callback).not.toHaveBeenCalled();
  });

  it("ignores a worktree path from outside every watch root (TC-078)", () => {
    // Case: TC-078
    // Given: the watcher is active for one Git directory only
    const callback = vi.fn();
    const { triggerAbsolutePath } = startWatcher(callback);

    // When: a worktree HEAD from a different repository is delivered to the watcher
    triggerAbsolutePath(0, "onDidChange", `/other/.git/${WORKTREE_HEAD_PATH}`);
    vi.runAllTimers();

    // Then: the callback is not called
    expect(callback).not.toHaveBeenCalled();
  });

  it("still fires for the allowlisted HEAD file (TC-079)", () => {
    // Case: TC-079
    // Given: the watcher is active for the common Git directory
    const callback = vi.fn();
    const { trigger } = startWatcher(callback);

    // When: the repository HEAD changes
    trigger(0, "onDidChange", "HEAD");
    vi.advanceTimersByTime(DEBOUNCE_MS);

    // Then: the existing allowlist entry still fires the callback once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("still fires for an existing branch ref prefix (TC-080)", () => {
    // Case: TC-080
    // Given: the watcher is active for the common Git directory
    const callback = vi.fn();
    const { trigger } = startWatcher(callback);

    // When: a branch ref changes
    trigger(0, "onDidChange", "refs/heads/main");
    vi.advanceTimersByTime(DEBOUNCE_MS);

    // Then: the existing prefix still fires the callback once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("still ignores an existing ref prefix with an empty suffix (TC-081)", () => {
    // Case: TC-081
    // Given: the watcher is active for the common Git directory
    const callback = vi.fn();
    const { trigger } = startWatcher(callback);

    // When: the refs/heads directory itself changes
    trigger(0, "onDidChange", "refs/heads/");
    vi.runAllTimers();

    // Then: the callback is not called
    expect(callback).not.toHaveBeenCalled();
  });

  it("fires for a worktree path reported by the second watch root (TC-082)", () => {
    // Case: TC-082
    // Given: the watcher is active for the linked git-dir and the shared common-dir
    const callback = vi.fn();
    const { trigger } = startWatcher(callback, [LINKED_WORKTREE_GIT_DIR, COMMON_GIT_DIR]);

    // When: the common-dir watcher reports a worktree HEAD change
    trigger(1, "onDidChange", WORKTREE_HEAD_PATH);
    vi.advanceTimersByTime(DEBOUNCE_MS);

    // Then: the callback runs once for the second root
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("debounces a worktree change together with a HEAD change (TC-083)", () => {
    // Case: TC-083
    // Given: the watcher is active and no debounce timer is pending
    const callback = vi.fn();
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const { trigger } = startWatcher(callback);
    clearTimeoutSpy.mockClear();

    // When: a worktree HEAD change and a repository HEAD change arrive within the window
    trigger(0, "onDidChange", WORKTREE_HEAD_PATH);
    trigger(0, "onDidChange", "HEAD");

    // Then: the pending timer is cleared once and only one callback fires
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(DEBOUNCE_MS);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not fire before the debounce delay elapses (TC-084)", () => {
    // Case: TC-084
    // Given: the watcher is active for the common Git directory
    const callback = vi.fn();
    const { trigger } = startWatcher(callback);

    // When: a worktree HEAD change is followed by 749ms
    trigger(0, "onDidChange", WORKTREE_HEAD_PATH);
    vi.advanceTimersByTime(DEBOUNCE_MS - 1);

    // Then: the callback has not run yet
    expect(callback).not.toHaveBeenCalled();
  });

  it("suppresses a worktree change while muted (TC-085)", () => {
    // Case: TC-085
    // Given: the watcher is muted
    const callback = vi.fn();
    const { rfWatcher, trigger } = startWatcher(callback);
    rfWatcher.mute();

    // When: a worktree HEAD change arrives
    trigger(0, "onDidChange", WORKTREE_HEAD_PATH);
    vi.runAllTimers();

    // Then: the callback is not called
    expect(callback).not.toHaveBeenCalled();
  });

  it("suppresses a worktree change during the unmute grace period (TC-086)", () => {
    // Case: TC-086
    // Given: the watcher was unmuted at a fixed time
    const callback = vi.fn();
    const { rfWatcher, trigger } = startWatcher(callback);
    vi.setSystemTime(new Date(10_000));
    rfWatcher.mute();
    rfWatcher.unmute();

    // When: a worktree HEAD change arrives before resumeAt
    vi.setSystemTime(new Date(10_000 + GRACE_PERIOD_MS - 1));
    trigger(0, "onDidChange", WORKTREE_HEAD_PATH);
    vi.runAllTimers();

    // Then: the callback is not called
    expect(callback).not.toHaveBeenCalled();
  });

  it("fires for a backslash-separated worktree path (TC-087)", () => {
    // Case: TC-087
    // Given: the watcher is active for a Windows-style Git directory
    const callback = vi.fn();
    const { triggerAbsolutePath } = startWatcher(callback, [WINDOWS_GIT_DIR]);

    // When: the change arrives with backslash separators below the watch root
    triggerAbsolutePath(0, "onDidChange", `${WINDOWS_GIT_DIR}/worktrees\\feature-x\\HEAD`);
    vi.advanceTimersByTime(DEBOUNCE_MS);

    // Then: separator normalization makes it match the prefix and the callback runs once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("ignores a worktree change after stop (TC-088)", () => {
    // Case: TC-088
    // Given: the watcher has been stopped, clearing its watch roots
    const callback = vi.fn();
    const { rfWatcher, trigger } = startWatcher(callback);
    rfWatcher.stop();

    // When: a worktree HEAD change is delivered to the disposed watcher callback
    trigger(0, "onDidChange", WORKTREE_HEAD_PATH);
    vi.runAllTimers();

    // Then: the callback is not called
    expect(callback).not.toHaveBeenCalled();
  });

  it("ignores a working tree path that shares the worktrees name (TC-089)", () => {
    // Case: TC-089
    // Given: the watcher is active for the Git directory of the repository
    const callback = vi.fn();
    const { triggerAbsolutePath } = startWatcher(callback);

    // When: a same-named path in the working tree changes
    triggerAbsolutePath(0, "onDidChange", `/path/to/repo/${WORKTREE_HEAD_PATH}`);
    vi.runAllTimers();

    // Then: the relative path starts with ".." so the callback is not called
    expect(callback).not.toHaveBeenCalled();
  });
});
