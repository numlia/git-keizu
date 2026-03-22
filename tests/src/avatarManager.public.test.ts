import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AVATAR_STORAGE_PATH,
  createAvatarCacheEntry,
  createAvatarManager,
  createAvatarRequest,
  DEFAULT_EMAIL,
  DEFAULT_REPO_PATH,
  DEFAULT_TIME_MS,
  FOUR_DAYS_MS,
  FOURTEEN_DAYS_MS,
  GITHUB_REMOTE_OWNER,
  GITHUB_REMOTE_REPO,
  GITHUB_REMOTE_URL,
  GITLAB_REMOTE_URL,
  IDENTICON_IMAGE_NAME,
  INVALID_GITHUB_REMOTE_URL,
  LONG_COMMITS,
  PNG_IMAGE_NAME,
  resetAvatarManagerTestEnvironment,
  SECONDARY_PNG_IMAGE_NAME,
  TEN_SECONDS_MS,
  URL_REPLACE_ERROR_FRAGMENT,
  useFixedTime
} from "./avatarManager.testUtils";

const GRAVATAR_REMOTE_SOURCE = { type: "gravatar" } as const;
const GITHUB_REMOTE_SOURCE = {
  owner: GITHUB_REMOTE_OWNER,
  repo: GITHUB_REMOTE_REPO,
  type: "github"
} as const;
const GITLAB_REMOTE_SOURCE = { type: "gitlab" } as const;
const INTERVAL_INDEX = 0;
const INTERVAL_CALLBACK_INDEX = 0;

describe("AvatarManager public behavior", () => {
  beforeEach(() => {
    resetAvatarManagerTestEnvironment();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("TC-001: stores storage path, avatar cache, and queue during construction", () => {
      // Case: TC-001
      // Given: ExtensionState returns a known avatar storage path and cache object during construction.
      const avatarCache = { [DEFAULT_EMAIL]: createAvatarCacheEntry() };
      const harness = createAvatarManager({ avatarCache, clearCallsAfterCreate: false });

      // When: AvatarManager is created.
      const { manager } = harness;

      // Then: Constructor state is initialized from ExtensionState and the request queue exists.
      expect(harness.extensionState.getAvatarStoragePath).toHaveBeenCalledTimes(1);
      expect(harness.extensionState.getAvatarCache).toHaveBeenCalledTimes(1);
      expect(manager.avatarStorageFolder).toBe(AVATAR_STORAGE_PATH);
      expect(manager.avatars).toBe(avatarCache);
      expect(manager.queue).toBeDefined();
    });

    it("TC-002: itemsAvailableCallback starts the interval and triggers an immediate fetch", () => {
      // Case: TC-002
      // Given: The manager has not started its polling interval yet.
      useFixedTime();
      const harness = createAvatarManager({ suppressQueueCallback: false });
      const fetchAvatarsIntervalSpy = vi
        .spyOn(harness.manager, "fetchAvatarsInterval")
        .mockResolvedValue(undefined);
      const setIntervalSpy = vi.spyOn(global, "setInterval");

      // When: The queue notifies that items are available for the first time.
      harness.queue.itemsAvailableCallback();

      // Then: The manager schedules the 10-second interval and performs an immediate fetch once.
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(setIntervalSpy.mock.calls[INTERVAL_INDEX][INTERVAL_CALLBACK_INDEX]).toBeTypeOf(
        "function"
      );
      expect(setIntervalSpy.mock.calls[INTERVAL_INDEX][1]).toBe(TEN_SECONDS_MS);
      expect(fetchAvatarsIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it("TC-003: itemsAvailableCallback exits early when an interval is already running", () => {
      // Case: TC-003
      // Given: The manager already has a live polling interval handle.
      useFixedTime();
      const harness = createAvatarManager({ suppressQueueCallback: false });
      const fetchAvatarsIntervalSpy = vi
        .spyOn(harness.manager, "fetchAvatarsInterval")
        .mockResolvedValue(undefined);
      const setIntervalSpy = vi.spyOn(global, "setInterval");
      const existingInterval = setInterval(() => undefined, TEN_SECONDS_MS);
      setIntervalSpy.mockClear();
      harness.manager.interval = existingInterval;

      // When: The queue notifies that items are available again.
      harness.queue.itemsAvailableCallback();

      // Then: No additional interval is registered and no immediate fetch is started.
      expect(setIntervalSpy).not.toHaveBeenCalled();
      expect(fetchAvatarsIntervalSpy).not.toHaveBeenCalled();
    });
  });

  describe("fetchAvatarImage", () => {
    it("TC-004: enqueues an immediate request when the avatar is not cached", () => {
      // Case: TC-004
      // Given: The avatar cache has no entry for the requested email.
      const harness = createAvatarManager();
      const queueAddSpy = vi.spyOn(harness.queue, "add");

      // When: fetchAvatarImage is called for an uncached author.
      harness.manager.fetchAvatarImage(DEFAULT_EMAIL, DEFAULT_REPO_PATH, [...LONG_COMMITS]);

      // Then: The queue receives an immediate fetch request for that email.
      expect(queueAddSpy).toHaveBeenCalledTimes(1);
      expect(queueAddSpy).toHaveBeenCalledWith(
        DEFAULT_EMAIL,
        DEFAULT_REPO_PATH,
        [...LONG_COMMITS],
        true
      );
    });

    it("TC-005: sends a fresh cached avatar to the webview without queueing refresh", () => {
      // Case: TC-005
      // Given: A non-stale avatar image is already cached for the requested email.
      useFixedTime();
      const avatarCache = {
        [DEFAULT_EMAIL]: createAvatarCacheEntry({
          image: PNG_IMAGE_NAME,
          timestamp: DEFAULT_TIME_MS
        })
      };
      const harness = createAvatarManager({ avatarCache });
      const queueAddSpy = vi.spyOn(harness.queue, "add");
      const sendAvatarToWebViewSpy = vi
        .spyOn(harness.manager, "sendAvatarToWebView")
        .mockResolvedValue(undefined);

      // When: fetchAvatarImage is called with that cached email.
      harness.manager.fetchAvatarImage(DEFAULT_EMAIL, DEFAULT_REPO_PATH, [...LONG_COMMITS]);

      // Then: The cached image is sent to the webview and no refresh request is queued.
      expect(sendAvatarToWebViewSpy).toHaveBeenCalledTimes(1);
      expect(sendAvatarToWebViewSpy).toHaveBeenCalledWith(DEFAULT_EMAIL, expect.any(Function));
      expect(queueAddSpy).not.toHaveBeenCalled();
    });

    it("TC-006: refreshes a stale cached avatar after 14 days while sending the current image", () => {
      // Case: TC-006
      // Given: A regular avatar image is cached but older than the 14-day refresh threshold.
      useFixedTime();
      const staleTimestamp = DEFAULT_TIME_MS - FOURTEEN_DAYS_MS - 1;
      const avatarCache = {
        [DEFAULT_EMAIL]: createAvatarCacheEntry({
          image: PNG_IMAGE_NAME,
          timestamp: staleTimestamp
        })
      };
      const harness = createAvatarManager({ avatarCache });
      const queueAddSpy = vi.spyOn(harness.queue, "add");
      const sendAvatarToWebViewSpy = vi
        .spyOn(harness.manager, "sendAvatarToWebView")
        .mockResolvedValue(undefined);

      // When: fetchAvatarImage is called for the stale cached entry.
      harness.manager.fetchAvatarImage(DEFAULT_EMAIL, DEFAULT_REPO_PATH, [...LONG_COMMITS]);

      // Then: The current image is still sent and a background refresh request is scheduled.
      expect(queueAddSpy).toHaveBeenCalledTimes(1);
      expect(queueAddSpy).toHaveBeenCalledWith(
        DEFAULT_EMAIL,
        DEFAULT_REPO_PATH,
        [...LONG_COMMITS],
        false
      );
      expect(sendAvatarToWebViewSpy).toHaveBeenCalledTimes(1);
    });

    it("TC-007: refreshes a stale identicon after four days while sending the cached identicon", () => {
      // Case: TC-007
      // Given: The cached avatar is an identicon older than the shorter 4-day refresh threshold.
      useFixedTime();
      const staleIdenticonTimestamp = DEFAULT_TIME_MS - FOUR_DAYS_MS - 1;
      const avatarCache = {
        [DEFAULT_EMAIL]: createAvatarCacheEntry({
          identicon: true,
          image: IDENTICON_IMAGE_NAME,
          timestamp: staleIdenticonTimestamp
        })
      };
      const harness = createAvatarManager({ avatarCache });
      const queueAddSpy = vi.spyOn(harness.queue, "add");
      const sendAvatarToWebViewSpy = vi
        .spyOn(harness.manager, "sendAvatarToWebView")
        .mockResolvedValue(undefined);

      // When: fetchAvatarImage is called for the stale identicon entry.
      harness.manager.fetchAvatarImage(DEFAULT_EMAIL, DEFAULT_REPO_PATH, [...LONG_COMMITS]);

      // Then: The cached identicon is sent and a non-immediate refresh request is queued.
      expect(queueAddSpy).toHaveBeenCalledTimes(1);
      expect(queueAddSpy).toHaveBeenCalledWith(
        DEFAULT_EMAIL,
        DEFAULT_REPO_PATH,
        [...LONG_COMMITS],
        false
      );
      expect(sendAvatarToWebViewSpy).toHaveBeenCalledTimes(1);
    });

    it("TC-008: does nothing when a cache entry exists with a null image and it is not stale", () => {
      // Case: TC-008
      // Given: The cache contains an entry whose runtime image value is null and still within the freshness window.
      useFixedTime();
      const harness = createAvatarManager();
      Reflect.set(harness.manager.avatars as object, DEFAULT_EMAIL, {
        identicon: false,
        image: null,
        timestamp: DEFAULT_TIME_MS
      });
      const queueAddSpy = vi.spyOn(harness.queue, "add");
      const sendAvatarToWebViewSpy = vi
        .spyOn(harness.manager, "sendAvatarToWebView")
        .mockResolvedValue(undefined);

      // When: fetchAvatarImage is called for that runtime cache entry.
      harness.manager.fetchAvatarImage(DEFAULT_EMAIL, DEFAULT_REPO_PATH, [...LONG_COMMITS]);

      // Then: Neither the webview path nor the queue path is triggered.
      expect(sendAvatarToWebViewSpy).not.toHaveBeenCalled();
      expect(queueAddSpy).not.toHaveBeenCalled();
    });

    it("TC-009: removes the cached avatar and re-queues an immediate fetch when webview send fails", () => {
      // Case: TC-009
      // Given: A fresh cached avatar exists and sendAvatarToWebView invokes its onError callback.
      useFixedTime();
      const avatarCache = {
        [DEFAULT_EMAIL]: createAvatarCacheEntry({
          image: PNG_IMAGE_NAME,
          timestamp: DEFAULT_TIME_MS
        })
      };
      const harness = createAvatarManager({ avatarCache });
      const queueAddSpy = vi.spyOn(harness.queue, "add");
      const removeAvatarFromCacheSpy = vi.spyOn(harness.manager, "removeAvatarFromCache");
      vi.spyOn(harness.manager, "sendAvatarToWebView").mockImplementation(
        async (_email, onError) => {
          onError();
        }
      );

      // When: fetchAvatarImage attempts to send the cached avatar to the webview.
      harness.manager.fetchAvatarImage(DEFAULT_EMAIL, DEFAULT_REPO_PATH, [...LONG_COMMITS]);

      // Then: The cache entry is removed and an immediate retry is queued.
      expect(removeAvatarFromCacheSpy).toHaveBeenCalledTimes(1);
      expect(removeAvatarFromCacheSpy).toHaveBeenCalledWith(DEFAULT_EMAIL);
      expect(queueAddSpy).toHaveBeenCalledTimes(1);
      expect(queueAddSpy).toHaveBeenCalledWith(
        DEFAULT_EMAIL,
        DEFAULT_REPO_PATH,
        [...LONG_COMMITS],
        true
      );
    });
  });

  describe("view registration and cache helpers", () => {
    it("TC-010: registerView stores the supplied view reference", () => {
      // Case: TC-010
      // Given: A manager exists with no view registered yet.
      const harness = createAvatarManager();

      // When: registerView is called with a view mock.
      harness.manager.registerView(harness.view);

      // Then: The manager retains that view instance.
      expect(harness.manager.view).toBe(harness.view);
    });

    it("TC-011: deregisterView clears the stored view reference", () => {
      // Case: TC-011
      // Given: A manager already holds a registered view.
      const harness = createAvatarManager();
      harness.manager.registerView(harness.view);

      // When: deregisterView is called.
      harness.manager.deregisterView();

      // Then: The stored view reference becomes null.
      expect(harness.manager.view).toBeNull();
    });

    it("TC-012: removeAvatarFromCache deletes the local cache entry and updates ExtensionState", () => {
      // Case: TC-012
      // Given: The local avatar cache contains an entry for the requested email.
      const avatarCache = { [DEFAULT_EMAIL]: createAvatarCacheEntry() };
      const harness = createAvatarManager({ avatarCache });

      // When: removeAvatarFromCache is called for that email.
      harness.manager.removeAvatarFromCache(DEFAULT_EMAIL);

      // Then: The local entry is removed and ExtensionState receives the same email.
      expect(harness.manager.avatars[DEFAULT_EMAIL]).toBeUndefined();
      expect(harness.extensionState.removeAvatarFromCache).toHaveBeenCalledTimes(1);
      expect(harness.extensionState.removeAvatarFromCache).toHaveBeenCalledWith(DEFAULT_EMAIL);
    });

    it("TC-013: clearCache replaces the avatar map with an empty object and delegates cleanup", () => {
      // Case: TC-013
      // Given: The manager holds multiple cached avatar entries.
      const avatarCache = {
        [DEFAULT_EMAIL]: createAvatarCacheEntry(),
        "secondary@example.com": createAvatarCacheEntry({ image: SECONDARY_PNG_IMAGE_NAME })
      };
      const harness = createAvatarManager({ avatarCache });
      const previousAvatars = harness.manager.avatars;

      // When: clearCache is called.
      harness.manager.clearCache();

      // Then: The manager swaps in a fresh empty object and asks ExtensionState to clear persisted cache.
      expect(harness.manager.avatars).toEqual({});
      expect(harness.manager.avatars).not.toBe(previousAvatars);
      expect(harness.extensionState.clearAvatarCache).toHaveBeenCalledTimes(1);
    });
  });

  describe("fetchAvatarsInterval", () => {
    it("TC-014: stops the interval when the queue is empty and a timer is active", async () => {
      // Case: TC-014
      // Given: The queue reports no items and the manager has a running interval handle.
      useFixedTime();
      const harness = createAvatarManager();
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");
      const existingInterval = setInterval(() => undefined, TEN_SECONDS_MS);
      harness.manager.interval = existingInterval;

      // When: fetchAvatarsInterval runs with an empty queue.
      await harness.manager.fetchAvatarsInterval();

      // Then: The interval is cleared and the manager resets the handle to null.
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
      expect(clearIntervalSpy).toHaveBeenCalledWith(existingInterval);
      expect(harness.manager.interval).toBeNull();
    });

    it("TC-015: exits quietly when the queue is empty and no interval is running", async () => {
      // Case: TC-015
      // Given: The queue is empty and the manager interval handle is already null.
      const harness = createAvatarManager();
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      // When: fetchAvatarsInterval runs in that idle state.
      await harness.manager.fetchAvatarsInterval();

      // Then: No interval cleanup call occurs.
      expect(clearIntervalSpy).not.toHaveBeenCalled();
    });

    it("TC-016: returns early when the queue reports items but no request is ready yet", async () => {
      // Case: TC-016
      // Given: The queue says items exist but takeItem returns null for the current time.
      const harness = createAvatarManager();
      vi.spyOn(harness.queue, "hasItems").mockReturnValue(true);
      vi.spyOn(harness.queue, "takeItem").mockReturnValue(null);
      const getRemoteSourceSpy = vi.spyOn(harness.manager, "getRemoteSource");
      const fetchFromGithubSpy = vi.spyOn(harness.manager, "fetchFromGithub");
      const fetchFromGitLabSpy = vi.spyOn(harness.manager, "fetchFromGitLab");
      const fetchFromGravatarSpy = vi.spyOn(harness.manager, "fetchFromGravatar");

      // When: fetchAvatarsInterval tries to consume the queue.
      await harness.manager.fetchAvatarsInterval();

      // Then: No remote source lookup or provider fetch happens.
      expect(getRemoteSourceSpy).not.toHaveBeenCalled();
      expect(fetchFromGithubSpy).not.toHaveBeenCalled();
      expect(fetchFromGitLabSpy).not.toHaveBeenCalled();
      expect(fetchFromGravatarSpy).not.toHaveBeenCalled();
    });

    it("TC-017: dispatches GitHub requests to fetchFromGithub", async () => {
      // Case: TC-017
      // Given: The queue yields a request whose remote source resolves to GitHub.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      vi.spyOn(harness.queue, "hasItems").mockReturnValue(true);
      vi.spyOn(harness.queue, "takeItem").mockReturnValue(request);
      vi.spyOn(harness.manager, "getRemoteSource").mockResolvedValue(GITHUB_REMOTE_SOURCE);
      const fetchFromGithubSpy = vi
        .spyOn(harness.manager, "fetchFromGithub")
        .mockImplementation(() => undefined);

      // When: fetchAvatarsInterval processes the ready request.
      await harness.manager.fetchAvatarsInterval();

      // Then: The GitHub fetcher receives the request and parsed owner/repo pair.
      expect(fetchFromGithubSpy).toHaveBeenCalledTimes(1);
      expect(fetchFromGithubSpy).toHaveBeenCalledWith(
        request,
        GITHUB_REMOTE_OWNER,
        GITHUB_REMOTE_REPO
      );
    });

    it("TC-018: dispatches GitLab requests to fetchFromGitLab", async () => {
      // Case: TC-018
      // Given: The queue yields a request whose remote source resolves to GitLab.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      vi.spyOn(harness.queue, "hasItems").mockReturnValue(true);
      vi.spyOn(harness.queue, "takeItem").mockReturnValue(request);
      vi.spyOn(harness.manager, "getRemoteSource").mockResolvedValue(GITLAB_REMOTE_SOURCE);
      const fetchFromGitLabSpy = vi
        .spyOn(harness.manager, "fetchFromGitLab")
        .mockImplementation(() => undefined);

      // When: fetchAvatarsInterval processes the ready request.
      await harness.manager.fetchAvatarsInterval();

      // Then: The GitLab fetcher receives that request exactly once.
      expect(fetchFromGitLabSpy).toHaveBeenCalledTimes(1);
      expect(fetchFromGitLabSpy).toHaveBeenCalledWith(request);
    });

    it("TC-019: dispatches unknown remotes to fetchFromGravatar", async () => {
      // Case: TC-019
      // Given: The queue yields a request whose remote source resolves to Gravatar fallback.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      vi.spyOn(harness.queue, "hasItems").mockReturnValue(true);
      vi.spyOn(harness.queue, "takeItem").mockReturnValue(request);
      vi.spyOn(harness.manager, "getRemoteSource").mockResolvedValue(GRAVATAR_REMOTE_SOURCE);
      const fetchFromGravatarSpy = vi
        .spyOn(harness.manager, "fetchFromGravatar")
        .mockResolvedValue(undefined);

      // When: fetchAvatarsInterval processes the ready request.
      await harness.manager.fetchAvatarsInterval();

      // Then: The Gravatar fallback path receives the request exactly once.
      expect(fetchFromGravatarSpy).toHaveBeenCalledTimes(1);
      expect(fetchFromGravatarSpy).toHaveBeenCalledWith(request);
    });
  });

  describe("getRemoteSource", () => {
    it("TC-020: ignores cached remote source objects because the cache hit check is incorrect", async () => {
      // Case: TC-020
      // Given: remoteSourceCache already contains an object entry for the repo and getRemoteUrl resolves to GitLab.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      harness.manager.remoteSourceCache[DEFAULT_REPO_PATH] = GITHUB_REMOTE_SOURCE;
      harness.dataSource.getRemoteUrl.mockResolvedValue(GITLAB_REMOTE_URL);

      // When: getRemoteSource is called for that repo.
      const result = await harness.manager.getRemoteSource(request);

      // Then: The method still calls DataSource and returns the newly parsed GitLab source.
      expect(harness.dataSource.getRemoteUrl).toHaveBeenCalledTimes(1);
      expect(harness.dataSource.getRemoteUrl).toHaveBeenCalledWith(DEFAULT_REPO_PATH);
      expect(result).toEqual(GITLAB_REMOTE_SOURCE);
    });

    it("TC-021: parses GitHub remotes into owner/repo metadata and caches the result", async () => {
      // Case: TC-021
      // Given: DataSource resolves the repo remote to a GitHub HTTPS URL.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      harness.dataSource.getRemoteUrl.mockResolvedValue(GITHUB_REMOTE_URL);

      // When: getRemoteSource is called.
      const result = await harness.manager.getRemoteSource(request);

      // Then: A GitHub remote source object is returned and cached under the repo path.
      expect(result).toEqual(GITHUB_REMOTE_SOURCE);
      expect(harness.manager.remoteSourceCache[DEFAULT_REPO_PATH]).toEqual(GITHUB_REMOTE_SOURCE);
    });

    it("TC-022: parses GitLab remotes into a gitlab source and caches the result", async () => {
      // Case: TC-022
      // Given: DataSource resolves the repo remote to a GitLab HTTPS URL.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      harness.dataSource.getRemoteUrl.mockResolvedValue(GITLAB_REMOTE_URL);

      // When: getRemoteSource is called.
      const result = await harness.manager.getRemoteSource(request);

      // Then: A gitlab source is returned and cached under the repo path.
      expect(result).toEqual(GITLAB_REMOTE_SOURCE);
      expect(harness.manager.remoteSourceCache[DEFAULT_REPO_PATH]).toEqual(GITLAB_REMOTE_SOURCE);
    });

    it("TC-023: falls back to gravatar for non-GitHub and non-GitLab remotes", async () => {
      // Case: TC-023
      // Given: DataSource resolves the repo remote to an unsupported host.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      harness.dataSource.getRemoteUrl.mockResolvedValue("https://example.com/org/project.git");

      // When: getRemoteSource is called.
      const result = await harness.manager.getRemoteSource(request);

      // Then: The fallback gravatar source is returned and cached.
      expect(result).toEqual(GRAVATAR_REMOTE_SOURCE);
      expect(harness.manager.remoteSourceCache[DEFAULT_REPO_PATH]).toEqual(GRAVATAR_REMOTE_SOURCE);
    });

    it("TC-024: falls back to gravatar when no remote URL is available", async () => {
      // Case: TC-024
      // Given: DataSource resolves the repo remote to null.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      harness.dataSource.getRemoteUrl.mockResolvedValue(null);

      // When: getRemoteSource is called.
      const result = await harness.manager.getRemoteSource(request);

      // Then: The gravatar fallback source is returned.
      expect(result).toEqual(GRAVATAR_REMOTE_SOURCE);
    });

    it("TC-025: rejects with TypeError when a GitHub URL is missing the repo segment", async () => {
      // Case: TC-025
      // Given: DataSource returns a malformed GitHub URL that lacks the repository path segment.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      harness.dataSource.getRemoteUrl.mockResolvedValue(INVALID_GITHUB_REMOTE_URL);

      // When: getRemoteSource is called with that malformed GitHub URL.
      const getRemoteSourcePromise = harness.manager.getRemoteSource(request);

      // Then: The promise rejects with a TypeError whose message mentions the failed replace call.
      await expect(getRemoteSourcePromise).rejects.toThrow(TypeError);
      await expect(harness.manager.getRemoteSource(request)).rejects.toThrow(
        URL_REPLACE_ERROR_FRAGMENT
      );
    });
  });
});
