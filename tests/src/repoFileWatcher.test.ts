import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: {
    createFileSystemWatcher: vi.fn()
  }
}));

vi.mock("../../src/utils", () => ({
  getPathFromUri: vi.fn()
}));

import * as vscode from "vscode";

import { RepoFileWatcher } from "../../src/repoFileWatcher";
import { getPathFromUri } from "../../src/utils";

const mockedCreateFSWatcher = vscode.workspace.createFileSystemWatcher as Mock;
const mockedGetPathFromUri = getPathFromUri as Mock;

interface MockWatcher {
  onDidCreate: Mock;
  onDidChange: Mock;
  onDidDelete: Mock;
  dispose: Mock;
}

const REPO = "/path/to/repo";
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

describe("RepoFileWatcher", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function startWatcher(callback: Mock, repo = REPO) {
    const rfWatcher = new RepoFileWatcher(callback);
    const mockWatcher = createMockWatcher();
    mockedCreateFSWatcher.mockReturnValue(mockWatcher);
    rfWatcher.start(repo);
    const triggerRefresh = mockWatcher.onDidChange.mock.calls[0][0] as (uri: {
      fsPath: string;
    }) => void;
    return { rfWatcher, mockWatcher, triggerRefresh };
  }

  function mockUriPath(relativePath: string, repo = REPO): { fsPath: string } {
    const fullPath = relativePath === "" ? `${repo}/` : `${repo}/${relativePath}`;
    mockedGetPathFromUri.mockReturnValue(fullPath);
    return { fsPath: fullPath };
  }

  // ─── S1: constructor ───────────────────────────────────────────────

  describe("constructor", () => {
    it("TC-001: should create instance with null watcher and default state", () => {
      // Case: TC-001
      // Given: A callback function
      const callback = vi.fn();

      // When: Creating a new RepoFileWatcher
      const watcher = new RepoFileWatcher(callback);

      // Then: Instance created; fsWatcher is null (stop is safe no-op)
      expect(watcher).toBeInstanceOf(RepoFileWatcher);
      watcher.stop();
    });
  });

  // ─── S2: start ─────────────────────────────────────────────────────

  describe("start", () => {
    it("TC-002: should create watcher and register 3 event listeners", () => {
      // Case: TC-002
      const callback = vi.fn();
      const rfWatcher = new RepoFileWatcher(callback);
      const mockWatcher = createMockWatcher();
      mockedCreateFSWatcher.mockReturnValue(mockWatcher);

      // Given: No existing watcher (fresh instance)
      // When: Starting with a repo path
      rfWatcher.start(REPO);

      // Then: createFileSystemWatcher called with correct glob; 3 listeners registered
      expect(mockedCreateFSWatcher).toHaveBeenCalledTimes(1);
      expect(mockedCreateFSWatcher).toHaveBeenCalledWith(`${REPO}/**`);
      expect(mockWatcher.onDidCreate).toHaveBeenCalledTimes(1);
      expect(mockWatcher.onDidChange).toHaveBeenCalledTimes(1);
      expect(mockWatcher.onDidDelete).toHaveBeenCalledTimes(1);
    });

    it("TC-003: should dispose existing watcher before creating new one", () => {
      // Case: TC-003
      const callback = vi.fn();
      const rfWatcher = new RepoFileWatcher(callback);
      const firstWatcher = createMockWatcher();
      const secondWatcher = createMockWatcher();
      mockedCreateFSWatcher.mockReturnValueOnce(firstWatcher).mockReturnValueOnce(secondWatcher);

      // Given: Watcher already started
      rfWatcher.start(REPO);

      // When: Starting with a new repo
      const newRepo = "/new/repo";
      rfWatcher.start(newRepo);

      // Then: Old watcher disposed, new watcher created with new glob
      expect(firstWatcher.dispose).toHaveBeenCalledTimes(1);
      expect(mockedCreateFSWatcher).toHaveBeenCalledTimes(2);
      expect(mockedCreateFSWatcher).toHaveBeenLastCalledWith(`${newRepo}/**`);
    });

    it("TC-004: should create watcher with '/**' glob for empty string repo", () => {
      // Case: TC-004
      const callback = vi.fn();
      const rfWatcher = new RepoFileWatcher(callback);
      const mockWatcher = createMockWatcher();
      mockedCreateFSWatcher.mockReturnValue(mockWatcher);

      // Given: No existing watcher
      // When: Starting with empty string
      rfWatcher.start("");

      // Then: Glob pattern is "/**"
      expect(mockedCreateFSWatcher).toHaveBeenCalledWith("/**");
    });

    it("TC-005: should create watcher with double-slash glob for trailing-slash repo", () => {
      // Case: TC-005
      const callback = vi.fn();
      const rfWatcher = new RepoFileWatcher(callback);
      const mockWatcher = createMockWatcher();
      mockedCreateFSWatcher.mockReturnValue(mockWatcher);

      // Given: No existing watcher
      // When: Starting with trailing slash path
      rfWatcher.start(`${REPO}/`);

      // Then: Glob pattern contains double slash
      expect(mockedCreateFSWatcher).toHaveBeenCalledWith(`${REPO}//**`);
    });
  });

  // ─── S3: stop ──────────────────────────────────────────────────────

  describe("stop", () => {
    it("TC-006: should dispose watcher and set to null", () => {
      // Case: TC-006
      const callback = vi.fn();
      const rfWatcher = new RepoFileWatcher(callback);
      const mockWatcher = createMockWatcher();
      mockedCreateFSWatcher.mockReturnValue(mockWatcher);

      // Given: Watcher is active
      rfWatcher.start(REPO);

      // When: Calling stop
      rfWatcher.stop();

      // Then: dispose called once
      expect(mockWatcher.dispose).toHaveBeenCalledTimes(1);
    });

    it("TC-007: should do nothing when no watcher exists", () => {
      // Case: TC-007
      // Given: No watcher started
      const callback = vi.fn();
      const rfWatcher = new RepoFileWatcher(callback);

      // When: Calling stop
      // Then: No error thrown
      expect(() => rfWatcher.stop()).not.toThrow();
    });

    it("TC-008: should handle consecutive stop calls safely", () => {
      // Case: TC-008
      const callback = vi.fn();
      const rfWatcher = new RepoFileWatcher(callback);
      const mockWatcher = createMockWatcher();
      mockedCreateFSWatcher.mockReturnValue(mockWatcher);

      // Given: Watcher is active
      rfWatcher.start(REPO);

      // When: Calling stop twice
      rfWatcher.stop();
      rfWatcher.stop();

      // Then: dispose called only once, no error on second call
      expect(mockWatcher.dispose).toHaveBeenCalledTimes(1);
    });
  });

  // ─── S4: mute ──────────────────────────────────────────────────────

  describe("mute", () => {
    it("TC-009: should block refresh callback when muted", () => {
      // Case: TC-009
      const callback = vi.fn();
      const { rfWatcher, triggerRefresh } = startWatcher(callback);
      const uri = mockUriPath("src/index.ts");

      // Given: Initial state (muted=false)
      // When: Calling mute then triggering file change
      rfWatcher.mute();

      // Then: Callback not called (muted blocks refresh)
      triggerRefresh(uri);
      vi.runAllTimers();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ─── S5: unmute ────────────────────────────────────────────────────

  describe("unmute", () => {
    it("TC-010: should set muted to false and resumeAt to now + 1500ms", () => {
      // Case: TC-010
      const BASE_TIME = 10000;
      vi.setSystemTime(new Date(BASE_TIME));
      const callback = vi.fn();
      const { rfWatcher, triggerRefresh } = startWatcher(callback);
      const uri = mockUriPath("src/index.ts");

      // Given: Watcher is muted
      rfWatcher.mute();

      // When: Calling unmute at BASE_TIME
      rfWatcher.unmute();

      // Then: Events during grace period are blocked
      triggerRefresh(uri);
      vi.runAllTimers();
      expect(callback).not.toHaveBeenCalled();

      // Then: Events after grace period pass through
      vi.setSystemTime(new Date(BASE_TIME + GRACE_PERIOD_MS));
      triggerRefresh(uri);
      vi.runAllTimers();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("TC-011: should set resumeAt precisely to Date.now() + 1500", () => {
      // Case: TC-011
      const BASE_TIME = 10000;
      vi.setSystemTime(new Date(BASE_TIME));
      const callback = vi.fn();
      const { rfWatcher, triggerRefresh } = startWatcher(callback);
      const uri = mockUriPath("src/index.ts");

      // Given: unmute sets resumeAt = 10000 + 1500 = 11500
      rfWatcher.unmute();

      // When: Triggering at resumeAt - 1 (11499)
      vi.setSystemTime(new Date(BASE_TIME + GRACE_PERIOD_MS - 1));
      triggerRefresh(uri);
      vi.runAllTimers();

      // Then: Blocked (11499 < 11500 is true)
      expect(callback).not.toHaveBeenCalled();

      // When: Triggering at exactly resumeAt (11500)
      vi.setSystemTime(new Date(BASE_TIME + GRACE_PERIOD_MS));
      triggerRefresh(uri);
      vi.runAllTimers();

      // Then: Passes through (11500 < 11500 is false)
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ─── S6: refresh - mute/resumeAt guard ─────────────────────────────

  describe("refresh - mute/resumeAt guard", () => {
    it("TC-012: should early return when muted", () => {
      // Case: TC-012
      const callback = vi.fn();
      const { rfWatcher, triggerRefresh } = startWatcher(callback);
      const uri = mockUriPath("src/index.ts");

      // Given: Watcher is muted
      rfWatcher.mute();

      // When: Matching file change fires
      triggerRefresh(uri);
      vi.runAllTimers();

      // Then: Callback not called
      expect(callback).not.toHaveBeenCalled();
    });

    it("TC-013: should early return when within grace period", () => {
      // Case: TC-013
      const BASE_TIME = 10000;
      vi.setSystemTime(new Date(BASE_TIME));
      const callback = vi.fn();
      const { rfWatcher, triggerRefresh } = startWatcher(callback);
      const uri = mockUriPath("src/index.ts");

      // Given: unmute sets resumeAt to BASE_TIME + 1500
      rfWatcher.unmute();

      // When: File change during grace period (time = BASE_TIME)
      triggerRefresh(uri);
      vi.runAllTimers();

      // Then: Callback not called
      expect(callback).not.toHaveBeenCalled();
    });

    it("TC-014: should pass through when time equals resumeAt exactly", () => {
      // Case: TC-014
      const BASE_TIME = 10000;
      vi.setSystemTime(new Date(BASE_TIME));
      const callback = vi.fn();
      const { rfWatcher, triggerRefresh } = startWatcher(callback);
      const uri = mockUriPath("src/index.ts");

      // Given: unmute sets resumeAt = 11500
      rfWatcher.unmute();

      // When: File change at exactly resumeAt (< is strict)
      vi.setSystemTime(new Date(BASE_TIME + GRACE_PERIOD_MS));
      triggerRefresh(uri);
      vi.runAllTimers();

      // Then: Callback fires (11500 < 11500 is false)
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("TC-015: should invoke callback when past grace period", () => {
      // Case: TC-015
      const BASE_TIME = 10000;
      vi.setSystemTime(new Date(BASE_TIME));
      const callback = vi.fn();
      const { rfWatcher, triggerRefresh } = startWatcher(callback);
      const uri = mockUriPath("src/index.ts");

      // Given: unmute sets resumeAt = 11500
      rfWatcher.unmute();

      // When: File change after grace period
      vi.setSystemTime(new Date(BASE_TIME + GRACE_PERIOD_MS + 500));
      triggerRefresh(uri);
      vi.runAllTimers();

      // Then: Callback fires
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ─── S7: refresh - fileChangeRegex filter ──────────────────────────

  describe("refresh - fileChangeRegex filter", () => {
    function testRegexMatch(relativePath: string, shouldMatch: boolean) {
      const callback = vi.fn();
      const { triggerRefresh } = startWatcher(callback);
      const uri = mockUriPath(relativePath);

      triggerRefresh(uri);
      vi.runAllTimers();

      if (shouldMatch) {
        expect(callback).toHaveBeenCalledTimes(1);
      } else {
        expect(callback).not.toHaveBeenCalled();
      }
    }

    it("TC-016: should match .git/config (pattern 1)", () => {
      // Case: TC-016
      // Given: URI path = .git/config after repo prefix removal
      // When: File change event fires
      // Then: Pattern 1 matches, callback scheduled
      testRegexMatch(".git/config", true);
    });

    it("TC-017: should match .git/refs/heads/main (pattern 1)", () => {
      // Case: TC-017
      // Given: URI path = .git/refs/heads/main
      // When: File change event fires
      // Then: Pattern 1 matches, callback scheduled
      testRegexMatch(".git/refs/heads/main", true);
    });

    it("TC-018: should match src/index.ts (pattern 2)", () => {
      // Case: TC-018
      // Given: URI path = src/index.ts (non-.git file)
      // When: File change event fires
      // Then: Pattern 2 matches, callback scheduled
      testRegexMatch("src/index.ts", true);
    });

    it("TC-019: should match .gitignore (pattern 3)", () => {
      // Case: TC-019
      // Given: URI path = .gitignore
      // When: File change event fires
      // Then: Pattern 3 matches, callback scheduled
      testRegexMatch(".gitignore", true);
    });

    it("TC-020: should not match .git/objects/ab/cd1234", () => {
      // Case: TC-020
      // Given: URI path = .git/objects/ab/cd1234 (git object)
      // When: File change event fires
      // Then: No pattern matches, early return
      testRegexMatch(".git/objects/ab/cd1234", false);
    });

    it("TC-021: should not match .git/hooks/pre-commit", () => {
      // Case: TC-021
      // Given: URI path = .git/hooks/pre-commit (git hook)
      // When: File change event fires
      // Then: No pattern matches, early return
      testRegexMatch(".git/hooks/pre-commit", false);
    });

    it("TC-022: should not match .git/logs/HEAD", () => {
      // Case: TC-022
      // Given: URI path = .git/logs/HEAD (git log)
      // When: File change event fires
      // Then: No pattern matches, early return
      testRegexMatch(".git/logs/HEAD", false);
    });

    it("TC-023: should not match .git/COMMIT_EDITMSG", () => {
      // Case: TC-023
      // Given: URI path = .git/COMMIT_EDITMSG
      // When: File change event fires
      // Then: No pattern matches, early return
      testRegexMatch(".git/COMMIT_EDITMSG", false);
    });

    it("TC-024: should not match .git/ (directory only)", () => {
      // Case: TC-024
      // Given: URI path = .git/ (no filename after slash)
      // When: File change event fires
      // Then: No pattern matches, early return
      testRegexMatch(".git/", false);
    });

    it("TC-025: should not match .git (no trailing slash)", () => {
      // Case: TC-025
      // Given: URI path = .git (exact)
      // When: File change event fires
      // Then: No pattern matches, early return
      testRegexMatch(".git", false);
    });

    it("TC-026: should match empty string after prefix removal (pattern 2)", () => {
      // Case: TC-026
      // Given: URI path = empty string (repo prefix fully consumed)
      // When: File change event fires
      // Then: Pattern 2 matches (empty doesn't start with .git)
      testRegexMatch("", true);
    });

    it("TC-027: should match .git/refs/heads/ with empty branch name (pattern 1)", () => {
      // Case: TC-027
      // Given: URI path = .git/refs/heads/ (trailing slash, no branch name)
      // When: File change event fires
      // Then: Pattern 1 matches (refs/heads/.* accepts empty)
      testRegexMatch(".git/refs/heads/", true);
    });
  });

  // ─── S8: refresh - debounce ────────────────────────────────────────

  describe("refresh - debounce", () => {
    it("TC-028: should schedule callback with 750ms debounce", () => {
      // Case: TC-028
      const callback = vi.fn();
      const { triggerRefresh } = startWatcher(callback);
      const uri = mockUriPath("src/index.ts");

      // Given: No existing refreshTimeout
      // When: Single file change event
      triggerRefresh(uri);

      // Then: Callback not yet called
      expect(callback).not.toHaveBeenCalled();

      // Then: After 750ms debounce, callback fires
      vi.advanceTimersByTime(DEBOUNCE_MS);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("TC-029: should debounce 3 rapid changes into single callback", () => {
      // Case: TC-029
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      const callback = vi.fn();
      const { triggerRefresh } = startWatcher(callback);
      const uri = mockUriPath("src/index.ts");
      clearTimeoutSpy.mockClear();

      // Given: Three rapid file changes
      // When: Events fire within debounce window
      triggerRefresh(uri);
      triggerRefresh(uri);
      triggerRefresh(uri);

      // Then: clearTimeout called twice (2nd and 3rd clear previous)
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);

      // Then: Only last callback fires after 750ms
      vi.advanceTimersByTime(DEBOUNCE_MS);
      expect(callback).toHaveBeenCalledTimes(1);

      clearTimeoutSpy.mockRestore();
    });

    it("TC-030: should not call clearTimeout when refreshTimeout is null", () => {
      // Case: TC-030
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      const callback = vi.fn();
      const { triggerRefresh } = startWatcher(callback);
      const uri = mockUriPath("src/index.ts");
      clearTimeoutSpy.mockClear();

      // Given: refreshTimeout is null (first event)
      // When: File change event fires
      triggerRefresh(uri);

      // Then: clearTimeout not called, only setTimeout
      expect(clearTimeoutSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(DEBOUNCE_MS);
      expect(callback).toHaveBeenCalledTimes(1);

      clearTimeoutSpy.mockRestore();
    });

    it("TC-031: should clearTimeout existing timer before setting new one", () => {
      // Case: TC-031
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      const callback = vi.fn();
      const { triggerRefresh } = startWatcher(callback);
      const uri = mockUriPath("src/index.ts");

      // Given: First event sets a refreshTimeout
      triggerRefresh(uri);
      clearTimeoutSpy.mockClear();

      // When: Second event fires
      triggerRefresh(uri);

      // Then: clearTimeout called once for the existing timer
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);

      // Then: Only second timer's callback fires
      vi.advanceTimersByTime(DEBOUNCE_MS);
      expect(callback).toHaveBeenCalledTimes(1);

      clearTimeoutSpy.mockRestore();
    });
  });
});
