import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({}));

vi.mock("node:fs/promises", () => ({
  stat: vi.fn(),
  mkdir: vi.fn(),
  readdir: vi.fn(),
  unlink: vi.fn()
}));

vi.mock("../../src/utils", () => ({
  getPathFromStr: vi.fn((str: string) => str.replace(/\\/g, "/"))
}));

import * as fs from "node:fs/promises";

import type { ExtensionContext, Memento } from "vscode";

import { ExtensionState } from "../../src/extensionState";
import type { Avatar, GitRepoSet } from "../../src/types";
import { getPathFromStr } from "../../src/utils";

const GLOBAL_STORAGE_PATH = "/storage/path";
const AVATAR_DIR = "/storage/path/avatars";

type FsStatResult = Awaited<ReturnType<typeof fs.stat>>;
type MockExtensionContext = Pick<
  ExtensionContext,
  "globalState" | "workspaceState" | "globalStoragePath"
>;

interface MockMemento extends Pick<Memento, "get" | "update"> {
  get: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
}

function createMockMemento(): MockMemento {
  return {
    get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
    update: vi.fn().mockResolvedValue(undefined)
  };
}

function createExistingDirectoryStat(): FsStatResult {
  return {
    isDirectory: () => true
  } as unknown as FsStatResult;
}

function createMockContext(globalStoragePath = GLOBAL_STORAGE_PATH): MockExtensionContext {
  return {
    globalState: createMockMemento(),
    workspaceState: createMockMemento(),
    globalStoragePath
  };
}

function toExtensionContext(context: MockExtensionContext): ExtensionContext {
  return context as unknown as ExtensionContext;
}

const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("ExtensionState", () => {
  let mockContext: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
    vi.mocked(fs.stat).mockResolvedValue(createExistingDirectoryStat());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // constructor
  // ==========================================================================
  describe("constructor", () => {
    it("TC-001: stores globalState, workspaceState, and normalized globalStoragePath", async () => {
      // Case: TC-001
      // Given: A valid ExtensionContext with backslash-containing globalStoragePath
      const context = createMockContext("C:\\Users\\test\\.storage");
      vi.mocked(fs.stat).mockResolvedValue(createExistingDirectoryStat());

      // When: ExtensionState is constructed
      const state = new ExtensionState(toExtensionContext(context));
      await flushPromises();

      // Then: getPathFromStr is called to normalize, and public methods use the stored values
      expect(getPathFromStr).toHaveBeenCalledWith("C:\\Users\\test\\.storage");
      expect(state.getAvatarStoragePath()).toBe("C:/Users/test/.storage/avatars");
      expect(state.getRepos()).toEqual({});
      expect(state.getAvatarCache()).toEqual({});
    });

    it("TC-002: calls initAvatarStorage on construction (fire-and-forget)", async () => {
      // Case: TC-002
      // Given: A valid ExtensionContext
      vi.mocked(fs.stat).mockResolvedValue(createExistingDirectoryStat());

      // When: ExtensionState is constructed
      new ExtensionState(toExtensionContext(mockContext));

      // Then: initAvatarStorage is invoked, evidenced by fs.stat being called
      await flushPromises();
      expect(fs.stat).toHaveBeenCalledWith(AVATAR_DIR);
    });
  });

  // ==========================================================================
  // initAvatarStorage (private, tested indirectly)
  // ==========================================================================
  describe("initAvatarStorage", () => {
    it("TC-003: sets avatarStorageAvailable to true when directory exists", async () => {
      // Case: TC-003
      // Given: Avatar directory already exists (fs.stat succeeds)
      vi.mocked(fs.stat).mockResolvedValue(createExistingDirectoryStat());

      // When: ExtensionState is constructed and initAvatarStorage completes
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // Then: avatarStorageAvailable is true, mkdir is not called
      expect(state.isAvatarStorageAvailable()).toBe(true);
      expect(fs.mkdir).not.toHaveBeenCalled();
    });

    it("TC-004: creates directory and sets available when stat fails but mkdir succeeds", async () => {
      // Case: TC-004
      // Given: Avatar directory does not exist (fs.stat fails), fs.mkdir succeeds
      vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT"));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      // When: ExtensionState is constructed and initAvatarStorage completes
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // Then: avatarStorageAvailable is true, mkdir called with recursive option
      expect(state.isAvatarStorageAvailable()).toBe(true);
      expect(fs.mkdir).toHaveBeenCalledWith(AVATAR_DIR, { recursive: true });
    });

    it("TC-005: keeps avatarStorageAvailable false when both stat and mkdir fail", async () => {
      // Case: TC-005
      // Given: fs.stat fails and fs.mkdir also fails
      vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT"));
      vi.mocked(fs.mkdir).mockRejectedValue(new Error("EPERM"));

      // When: ExtensionState is constructed and initAvatarStorage completes
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // Then: avatarStorageAvailable remains false (silent failure)
      expect(state.isAvatarStorageAvailable()).toBe(false);
    });

    it("TC-006: attempts mkdir as fallback when fs.stat throws", async () => {
      // Case: TC-006
      // Given: fs.stat throws an error
      vi.mocked(fs.stat).mockRejectedValue(new Error("stat error"));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      // When: ExtensionState is constructed and initAvatarStorage completes
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // Then: catch block triggers mkdir fallback, storage becomes available
      expect(fs.mkdir).toHaveBeenCalledWith(AVATAR_DIR, { recursive: true });
      expect(state.isAvatarStorageAvailable()).toBe(true);
    });

    it("TC-007: keeps available false when fs.mkdir throws in inner catch", async () => {
      // Case: TC-007
      // Given: fs.stat fails, then fs.mkdir also throws
      vi.mocked(fs.stat).mockRejectedValue(new Error("stat error"));
      vi.mocked(fs.mkdir).mockRejectedValue(new Error("mkdir error"));

      // When: ExtensionState is constructed and initAvatarStorage completes
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // Then: inner catch block is entered, avatarStorageAvailable stays false
      expect(state.isAvatarStorageAvailable()).toBe(false);
    });
  });

  // ==========================================================================
  // getRepos
  // ==========================================================================
  describe("getRepos", () => {
    it("TC-008: returns stored GitRepoSet from workspaceState", async () => {
      // Case: TC-008
      // Given: workspaceState has a GitRepoSet stored
      const repoSet: GitRepoSet = { "/repo": { columnWidths: null } };
      mockContext.workspaceState.get.mockImplementation((key: string, defaultValue?: unknown) =>
        key === "repoStates" ? repoSet : defaultValue
      );
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: getRepos is called
      const result = state.getRepos();

      // Then: the stored GitRepoSet is returned, get called with correct key
      expect(result).toBe(repoSet);
      expect(mockContext.workspaceState.get).toHaveBeenCalledWith("repoStates", {});
    });

    it("TC-009: returns default empty object when no repos stored", async () => {
      // Case: TC-009
      // Given: workspaceState has no value for repoStates
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: getRepos is called
      const result = state.getRepos();

      // Then: default value {} is returned
      expect(result).toEqual({});
    });
  });

  // ==========================================================================
  // saveRepos
  // ==========================================================================
  describe("saveRepos", () => {
    it("TC-010: updates workspaceState with provided GitRepoSet", async () => {
      // Case: TC-010
      // Given: A GitRepoSet with entries
      const repoSet: GitRepoSet = { "/repo": { columnWidths: null } };
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: saveRepos is called with the GitRepoSet
      state.saveRepos(repoSet);

      // Then: workspaceState.update is called with correct key and value
      expect(mockContext.workspaceState.update).toHaveBeenCalledWith("repoStates", repoSet);
      expect(mockContext.workspaceState.update).toHaveBeenCalledTimes(1);
    });

    it("TC-011: updates workspaceState with empty object", async () => {
      // Case: TC-011
      // Given: An empty GitRepoSet
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: saveRepos is called with empty object
      state.saveRepos({});

      // Then: workspaceState.update is called with empty object
      expect(mockContext.workspaceState.update).toHaveBeenCalledWith("repoStates", {});
      expect(mockContext.workspaceState.update).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // getLastActiveRepo
  // ==========================================================================
  describe("getLastActiveRepo", () => {
    it("TC-012: returns stored repo path from workspaceState", async () => {
      // Case: TC-012
      // Given: workspaceState has a repo path stored
      mockContext.workspaceState.get.mockImplementation((key: string, defaultValue?: unknown) =>
        key === "lastActiveRepo" ? "/path/to/repo" : defaultValue
      );
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: getLastActiveRepo is called
      const result = state.getLastActiveRepo();

      // Then: the stored string path is returned
      expect(result).toBe("/path/to/repo");
      expect(mockContext.workspaceState.get).toHaveBeenCalledWith("lastActiveRepo", null);
    });

    it("TC-013: returns null when no repo stored", async () => {
      // Case: TC-013
      // Given: workspaceState has no value for lastActiveRepo
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: getLastActiveRepo is called
      const result = state.getLastActiveRepo();

      // Then: null is returned (default value)
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // setLastActiveRepo
  // ==========================================================================
  describe("setLastActiveRepo", () => {
    it("TC-014: updates workspaceState with valid repo path", async () => {
      // Case: TC-014
      // Given: A valid repo path string
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: setLastActiveRepo is called with a path
      state.setLastActiveRepo("/path/to/repo");

      // Then: workspaceState.update is called with correct arguments
      expect(mockContext.workspaceState.update).toHaveBeenCalledWith(
        "lastActiveRepo",
        "/path/to/repo"
      );
      expect(mockContext.workspaceState.update).toHaveBeenCalledTimes(1);
    });

    it("TC-015: updates workspaceState with null", async () => {
      // Case: TC-015
      // Given: repo = null
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: setLastActiveRepo is called with null
      state.setLastActiveRepo(null);

      // Then: workspaceState.update is called with null
      expect(mockContext.workspaceState.update).toHaveBeenCalledWith("lastActiveRepo", null);
      expect(mockContext.workspaceState.update).toHaveBeenCalledTimes(1);
    });

    it("TC-016: updates workspaceState with empty string", async () => {
      // Case: TC-016
      // Given: repo = "" (empty string)
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: setLastActiveRepo is called with empty string
      state.setLastActiveRepo("");

      // Then: workspaceState.update is called with empty string
      expect(mockContext.workspaceState.update).toHaveBeenCalledWith("lastActiveRepo", "");
      expect(mockContext.workspaceState.update).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // isAvatarStorageAvailable
  // ==========================================================================
  describe("isAvatarStorageAvailable", () => {
    it("TC-017: returns true after successful initAvatarStorage", async () => {
      // Case: TC-017
      // Given: initAvatarStorage succeeded (fs.stat resolved)
      vi.mocked(fs.stat).mockResolvedValue(createExistingDirectoryStat());
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: isAvatarStorageAvailable is called
      const result = state.isAvatarStorageAvailable();

      // Then: true is returned
      expect(result).toBe(true);
    });

    it("TC-018: returns false in initial state or after failed initAvatarStorage", async () => {
      // Case: TC-018
      // Given: initAvatarStorage failed (both stat and mkdir rejected)
      vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT"));
      vi.mocked(fs.mkdir).mockRejectedValue(new Error("EPERM"));
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: isAvatarStorageAvailable is called
      const result = state.isAvatarStorageAvailable();

      // Then: false is returned
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // getAvatarStoragePath
  // ==========================================================================
  describe("getAvatarStoragePath", () => {
    it("TC-019: returns globalStoragePath joined with 'avatars'", async () => {
      // Case: TC-019
      // Given: globalStoragePath = "/storage/path"
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: getAvatarStoragePath is called
      const result = state.getAvatarStoragePath();

      // Then: returns path joined with "avatars"
      expect(result).toBe("/storage/path/avatars");
    });

    it("TC-020: returns 'avatars' when globalStoragePath is empty string", async () => {
      // Case: TC-020
      // Given: globalStoragePath = "" (empty string)
      const context = createMockContext("");
      vi.mocked(fs.stat).mockResolvedValue(createExistingDirectoryStat());
      const state = new ExtensionState(toExtensionContext(context));
      await flushPromises();

      // When: getAvatarStoragePath is called
      const result = state.getAvatarStoragePath();

      // Then: returns "avatars" (path.join("", "avatars"))
      expect(result).toBe("avatars");
    });
  });

  // ==========================================================================
  // getAvatarCache
  // ==========================================================================
  describe("getAvatarCache", () => {
    it("TC-021: returns stored AvatarCache from globalState", async () => {
      // Case: TC-021
      // Given: globalState has an AvatarCache stored
      const cache = {
        "user@example.com": {
          image: "data:image/png;base64,abc",
          timestamp: 1000,
          identicon: false
        }
      };
      mockContext.globalState.get.mockImplementation((key: string, defaultValue?: unknown) =>
        key === "avatarCache" ? cache : defaultValue
      );
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: getAvatarCache is called
      const result = state.getAvatarCache();

      // Then: the stored AvatarCache is returned
      expect(result).toBe(cache);
      expect(mockContext.globalState.get).toHaveBeenCalledWith("avatarCache", {});
    });

    it("TC-022: returns default empty object when no cache stored", async () => {
      // Case: TC-022
      // Given: globalState has no value for avatarCache
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: getAvatarCache is called
      const result = state.getAvatarCache();

      // Then: default value {} is returned
      expect(result).toEqual({});
    });
  });

  // ==========================================================================
  // saveAvatar
  // ==========================================================================
  describe("saveAvatar", () => {
    const newAvatar: Avatar = {
      image: "data:image/png;base64,new",
      timestamp: 1000,
      identicon: false
    };

    it("TC-023: adds new avatar to empty cache", async () => {
      // Case: TC-023
      // Given: Avatar cache is empty, a new email and avatar
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: saveAvatar is called with new email
      state.saveAvatar("user@example.com", newAvatar);

      // Then: globalState.update is called with the new avatar in cache
      expect(mockContext.globalState.update).toHaveBeenCalledWith("avatarCache", {
        "user@example.com": newAvatar
      });
    });

    it("TC-024: overwrites existing avatar for same email", async () => {
      // Case: TC-024
      // Given: Cache already has an entry for the same email
      const oldAvatar: Avatar = { image: "old", timestamp: 500, identicon: true };
      mockContext.globalState.get.mockImplementation((key: string, defaultValue?: unknown) =>
        key === "avatarCache" ? { "user@example.com": oldAvatar } : defaultValue
      );
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: saveAvatar is called with the same email and new avatar
      state.saveAvatar("user@example.com", newAvatar);

      // Then: globalState.update is called with the overwritten avatar
      expect(mockContext.globalState.update).toHaveBeenCalledWith("avatarCache", {
        "user@example.com": newAvatar
      });
    });

    it("TC-025: saves avatar with empty string email", async () => {
      // Case: TC-025
      // Given: email is empty string
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: saveAvatar is called with empty string email
      state.saveAvatar("", newAvatar);

      // Then: globalState.update is called with empty string key
      expect(mockContext.globalState.update).toHaveBeenCalledWith("avatarCache", {
        "": newAvatar
      });
    });

    it("TC-026: saves avatar with special characters in email", async () => {
      // Case: TC-026
      // Given: email contains special characters
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: saveAvatar is called with email containing special chars
      state.saveAvatar("user+tag@example.com", newAvatar);

      // Then: globalState.update is called with special char key
      expect(mockContext.globalState.update).toHaveBeenCalledWith("avatarCache", {
        "user+tag@example.com": newAvatar
      });
    });
  });

  // ==========================================================================
  // removeAvatarFromCache
  // ==========================================================================
  describe("removeAvatarFromCache", () => {
    const avatar: Avatar = { image: "data:image/png;base64,x", timestamp: 1000, identicon: false };

    it("TC-027: removes existing email from cache", async () => {
      // Case: TC-027
      // Given: Cache has the target email
      mockContext.globalState.get.mockImplementation((key: string, defaultValue?: unknown) =>
        key === "avatarCache" ? { "user@example.com": avatar } : defaultValue
      );
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: removeAvatarFromCache is called with the existing email
      state.removeAvatarFromCache("user@example.com");

      // Then: globalState.update is called with cache without the email
      expect(mockContext.globalState.update).toHaveBeenCalledWith("avatarCache", {});
    });

    it("TC-028: handles removing non-existent email from cache", async () => {
      // Case: TC-028
      // Given: Cache has entries but not the target email
      mockContext.globalState.get.mockImplementation((key: string, defaultValue?: unknown) =>
        key === "avatarCache" ? { "other@example.com": avatar } : defaultValue
      );
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: removeAvatarFromCache is called with non-existent email
      state.removeAvatarFromCache("nonexistent@example.com");

      // Then: globalState.update is called with unchanged cache
      expect(mockContext.globalState.update).toHaveBeenCalledWith("avatarCache", {
        "other@example.com": avatar
      });
    });

    it("TC-029: handles removing from empty cache", async () => {
      // Case: TC-029
      // Given: Cache is empty
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: removeAvatarFromCache is called on empty cache
      state.removeAvatarFromCache("user@example.com");

      // Then: globalState.update is called with empty object
      expect(mockContext.globalState.update).toHaveBeenCalledWith("avatarCache", {});
    });
  });

  // ==========================================================================
  // clearAvatarCache
  // ==========================================================================
  describe("clearAvatarCache", () => {
    it("TC-030: clears cache and deletes avatar files", async () => {
      // Case: TC-030
      // Given: Avatar directory has files
      vi.mocked(fs.readdir).mockResolvedValue(["avatar1.png", "avatar2.png"]);
      vi.mocked(fs.unlink).mockResolvedValue();
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: clearAvatarCache is called
      await state.clearAvatarCache();

      // Then: cache is cleared and each file is unlinked
      expect(mockContext.globalState.update).toHaveBeenCalledWith("avatarCache", {});
      expect(fs.readdir).toHaveBeenCalledWith(AVATAR_DIR);
      expect(fs.unlink).toHaveBeenCalledTimes(2);
      expect(fs.unlink).toHaveBeenCalledWith("/storage/path/avatars/avatar1.png");
      expect(fs.unlink).toHaveBeenCalledWith("/storage/path/avatars/avatar2.png");
    });

    it("TC-031: clears cache before attempting file deletion", async () => {
      // Case: TC-031
      // Given: Avatar directory has files, tracking call order
      const callOrder: string[] = [];
      mockContext.globalState.update.mockImplementation(() => {
        callOrder.push("globalState.update");
        return Promise.resolve();
      });
      vi.mocked(fs.readdir).mockImplementation(() => {
        callOrder.push("fs.readdir");
        return Promise.resolve(["file.png"]);
      });
      vi.mocked(fs.unlink).mockResolvedValue();
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();
      callOrder.length = 0;

      // When: clearAvatarCache is called
      await state.clearAvatarCache();

      // Then: globalState.update is called before fs.readdir
      expect(callOrder.indexOf("globalState.update")).toBeLessThan(callOrder.indexOf("fs.readdir"));
    });

    it("TC-032: handles empty avatar directory", async () => {
      // Case: TC-032
      // Given: Avatar directory exists but is empty
      vi.mocked(fs.readdir).mockResolvedValue([]);
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: clearAvatarCache is called
      await state.clearAvatarCache();

      // Then: cache is cleared, readdir returns empty, unlink is not called
      expect(mockContext.globalState.update).toHaveBeenCalledWith("avatarCache", {});
      expect(fs.readdir).toHaveBeenCalledWith(AVATAR_DIR);
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it("TC-033: handles readdir failure gracefully", async () => {
      // Case: TC-033
      // Given: fs.readdir fails (directory does not exist)
      vi.mocked(fs.readdir).mockRejectedValue(new Error("ENOENT"));
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: clearAvatarCache is called
      await state.clearAvatarCache();

      // Then: cache is already cleared, file deletion is skipped (silent failure)
      expect(mockContext.globalState.update).toHaveBeenCalledWith("avatarCache", {});
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it("TC-034: continues unlinking other files when some unlink calls fail", async () => {
      // Case: TC-034
      // Given: Directory has files, unlink fails for one file
      vi.mocked(fs.readdir).mockResolvedValue(["fail.png", "ok.png"]);
      vi.mocked(fs.unlink).mockImplementation((filePath) => {
        if (String(filePath).includes("fail.png")) {
          return Promise.reject(new Error("EPERM"));
        }
        return Promise.resolve();
      });
      const state = new ExtensionState(toExtensionContext(mockContext));
      await flushPromises();

      // When: clearAvatarCache is called (should not throw)
      await state.clearAvatarCache();

      // Then: both unlink calls are attempted, cache is still cleared
      expect(mockContext.globalState.update).toHaveBeenCalledWith("avatarCache", {});
      expect(fs.unlink).toHaveBeenCalledTimes(2);
      expect(fs.unlink).toHaveBeenCalledWith("/storage/path/avatars/fail.png");
      expect(fs.unlink).toHaveBeenCalledWith("/storage/path/avatars/ok.png");
    });
  });
});
