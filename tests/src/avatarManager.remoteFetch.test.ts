import { EventEmitter } from "node:events";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAvatarManager,
  createAvatarRequest,
  createGravatarUrl,
  DEFAULT_EMAIL,
  DEFAULT_TIME_MS,
  FIVE_MINUTES_MS,
  flushAsyncWork,
  GITHUB_HOSTNAME,
  GITHUB_RATE_LIMIT_HEADER,
  GITHUB_RATE_LIMIT_RESET_HEADER,
  GITHUB_REMOTE_OWNER,
  GITHUB_REMOTE_REPO,
  GITLAB_RATE_LIMIT_HEADER,
  GITLAB_RATE_LIMIT_RESET_HEADER,
  GRAVATAR_DEFAULT_IDENTICON,
  GRAVATAR_DEFAULT_MISSING,
  httpsGetMock,
  IDENTICON_IMAGE_NAME,
  INVALID_JSON_RESPONSE_BODY,
  LONG_COMMITS,
  mockHttpsError,
  mockHttpsResponse,
  NETWORK_ERROR_MESSAGE,
  PNG_IMAGE_NAME,
  resetAvatarManagerTestEnvironment,
  SHORT_COMMITS,
  TEN_MINUTES_MS,
  useFixedTime
} from "./avatarManager.testUtils";

const FIRST_CALL_INDEX = 0;
const GITHUB_AVATAR_URL = "https://avatars.githubusercontent.com/u/1";
const GITHUB_AVATAR_URL_WITH_SIZE = `${GITHUB_AVATAR_URL}&size=54`;
const GITHUB_FORBIDDEN_STATUS = 403;
const GITHUB_OK_STATUS = 200;
const GITHUB_SERVER_ERROR_STATUS = 500;
const GITHUB_UNPROCESSABLE_STATUS = 422;
const GITLAB_AVATAR_URL = "https://gitlab.com/uploads/avatar.png";
const GITLAB_OK_STATUS = 200;
const GITLAB_RATE_LIMIT_STATUS = 429;
const GITLAB_SERVER_ERROR_STATUS = 500;
const LONG_HISTORY_RETRY_COMMIT_INDEX = 6;
const RATE_LIMIT_RESET_MS = 1_700_000_000_000;
const RATE_LIMIT_RESET_SECONDS = "1700000000";
const SHORT_HISTORY_RETRY_COMMIT_INDEX = 1;
const REQUEST_TIMEOUT_ERROR = "timeout";

// Simulates an https.get whose socket emits a "timeout" event; the request exposes a destroy
// spy that (like Node's ClientRequest) emits "error" with the passed error when destroyed.
function mockHttpsTimeout(): { destroy: ReturnType<typeof vi.fn> } {
  const request = new EventEmitter();
  const destroy = vi.fn((error?: unknown) => {
    request.emit("error", error);
  });
  (request as unknown as { destroy: typeof destroy }).destroy = destroy;
  httpsGetMock.mockImplementationOnce(() => {
    queueMicrotask(() => {
      request.emit("timeout");
    });
    return request as unknown as ReturnType<typeof httpsGetMock>;
  });
  return { destroy };
}

describe("AvatarManager remote fetch flows", () => {
  beforeEach(() => {
    resetAvatarManagerTestEnvironment();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("fetchFromGithub", () => {
    it("TC-026: defers GitHub requests until githubTimeout expires", () => {
      // Case: TC-026
      // Given: githubTimeout is still in the future for the current system time.
      useFixedTime();
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      harness.manager.githubTimeout = DEFAULT_TIME_MS + 1;
      const queueAddItemSpy = vi
        .spyOn(harness.queue, "addItem")
        .mockImplementation(() => undefined);
      const fetchAvatarsIntervalSpy = vi
        .spyOn(harness.manager, "fetchAvatarsInterval")
        .mockResolvedValue(undefined);

      // When: fetchFromGithub is invoked during that timeout window.
      harness.manager.fetchFromGithub(request, GITHUB_REMOTE_OWNER, GITHUB_REMOTE_REPO);

      // Then: The request is requeued for the timeout instant, the interval restarts, and no HTTP request is sent.
      expect(queueAddItemSpy).toHaveBeenCalledTimes(1);
      expect(queueAddItemSpy).toHaveBeenCalledWith(request, harness.manager.githubTimeout, false);
      expect(fetchAvatarsIntervalSpy).toHaveBeenCalledTimes(1);
      expect(httpsGetMock).not.toHaveBeenCalled();
    });

    it("TC-027: uses the short-history commit index formula for fewer than five commits", async () => {
      // Case: TC-027
      // Given: A request has three commits and one previous attempt, so the short-history branch applies.
      const harness = createAvatarManager();
      const request = createAvatarRequest({ attempts: 1, commits: [...SHORT_COMMITS] });
      const fetchFromGravatarSpy = vi
        .spyOn(harness.manager, "fetchFromGravatar")
        .mockResolvedValue(undefined);
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify({}))],
        statusCode: GITHUB_OK_STATUS
      });

      // When: fetchFromGithub performs the GitHub API request.
      harness.manager.fetchFromGithub(request, GITHUB_REMOTE_OWNER, GITHUB_REMOTE_REPO);
      await flushAsyncWork();

      // Then: The GitHub request path targets the second commit in the list and later falls back to Gravatar.
      const requestOptions = httpsGetMock.mock.calls[FIRST_CALL_INDEX][0];
      expect(requestOptions).toMatchObject({
        hostname: GITHUB_HOSTNAME,
        path: `/repos/${GITHUB_REMOTE_OWNER}/${GITHUB_REMOTE_REPO}/commits/${SHORT_COMMITS[SHORT_HISTORY_RETRY_COMMIT_INDEX]}`
      });
      expect(fetchFromGravatarSpy).toHaveBeenCalledTimes(1);
      expect(fetchFromGravatarSpy).toHaveBeenCalledWith(request);
    });

    it("TC-028: uses the long-history commit index formula for five or more commits", async () => {
      // Case: TC-028
      // Given: A request has nine commits and one previous attempt, so the long-history branch applies.
      const harness = createAvatarManager();
      const request = createAvatarRequest({ attempts: 1, commits: [...LONG_COMMITS] });
      const fetchFromGravatarSpy = vi
        .spyOn(harness.manager, "fetchFromGravatar")
        .mockResolvedValue(undefined);
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify({}))],
        statusCode: GITHUB_OK_STATUS
      });

      // When: fetchFromGithub performs the GitHub API request.
      harness.manager.fetchFromGithub(request, GITHUB_REMOTE_OWNER, GITHUB_REMOTE_REPO);
      await flushAsyncWork();

      // Then: The computed request path targets the long-history retry commit index.
      const requestOptions = httpsGetMock.mock.calls[FIRST_CALL_INDEX][0];
      expect(requestOptions).toMatchObject({
        hostname: GITHUB_HOSTNAME,
        path: `/repos/${GITHUB_REMOTE_OWNER}/${GITHUB_REMOTE_REPO}/commits/${LONG_COMMITS[LONG_HISTORY_RETRY_COMMIT_INDEX]}`
      });
      expect(fetchFromGravatarSpy).toHaveBeenCalledTimes(1);
      expect(fetchFromGravatarSpy).toHaveBeenCalledWith(request);
    });

    it("TC-029: stores the GitHub rate limit reset time when the remaining header reaches zero", async () => {
      // Case: TC-029
      // Given: The GitHub response reports zero remaining requests and a numeric reset timestamp.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      vi.spyOn(harness.manager, "fetchFromGravatar").mockResolvedValue(undefined);
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify({}))],
        headers: {
          [GITHUB_RATE_LIMIT_HEADER]: "0",
          [GITHUB_RATE_LIMIT_RESET_HEADER]: RATE_LIMIT_RESET_SECONDS
        },
        statusCode: GITHUB_OK_STATUS
      });

      // When: fetchFromGithub finishes processing that response.
      harness.manager.fetchFromGithub(request, GITHUB_REMOTE_OWNER, GITHUB_REMOTE_REPO);
      await flushAsyncWork();

      // Then: githubTimeout is updated to the reset timestamp in milliseconds.
      expect(harness.manager.githubTimeout).toBe(RATE_LIMIT_RESET_MS);
    });

    it("TC-030: downloads and saves a GitHub avatar when the commit author includes avatar_url", async () => {
      // Case: TC-030
      // Given: The GitHub commit response contains an author avatar URL and the image download succeeds.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      const downloadAvatarImageSpy = vi
        .spyOn(harness.manager, "downloadAvatarImage")
        .mockResolvedValue(PNG_IMAGE_NAME);
      const saveAvatarSpy = vi.spyOn(harness.manager, "saveAvatar");
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify({ author: { avatar_url: GITHUB_AVATAR_URL } }))],
        statusCode: GITHUB_OK_STATUS
      });

      // When: fetchFromGithub handles the successful GitHub commit response.
      harness.manager.fetchFromGithub(request, GITHUB_REMOTE_OWNER, GITHUB_REMOTE_REPO);
      await flushAsyncWork();

      // Then: The image is downloaded with the size suffix and saved as a non-identicon avatar.
      expect(downloadAvatarImageSpy).toHaveBeenCalledTimes(1);
      expect(downloadAvatarImageSpy).toHaveBeenCalledWith(
        DEFAULT_EMAIL,
        GITHUB_AVATAR_URL_WITH_SIZE
      );
      expect(saveAvatarSpy).toHaveBeenCalledTimes(1);
      expect(saveAvatarSpy).toHaveBeenCalledWith(DEFAULT_EMAIL, PNG_IMAGE_NAME, false);
    });

    it("TC-031: falls back to Gravatar when the GitHub commit response has no usable avatar URL", async () => {
      // Case: TC-031
      // Given: The GitHub commit response succeeds but has no author avatar_url.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      const fetchFromGravatarSpy = vi
        .spyOn(harness.manager, "fetchFromGravatar")
        .mockResolvedValue(undefined);
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify({ author: {} }))],
        statusCode: GITHUB_OK_STATUS
      });

      // When: fetchFromGithub completes that response.
      harness.manager.fetchFromGithub(request, GITHUB_REMOTE_OWNER, GITHUB_REMOTE_REPO);
      await flushAsyncWork();

      // Then: The request falls back to the Gravatar provider.
      expect(fetchFromGravatarSpy).toHaveBeenCalledTimes(1);
      expect(fetchFromGravatarSpy).toHaveBeenCalledWith(request);
    });

    it("TC-084: falls back to Gravatar when the GitHub response body is malformed JSON", async () => {
      // Case: TC-084
      // Given: The GitHub API responds with HTTP 200 and malformed JSON.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      const fetchFromGravatarSpy = vi
        .spyOn(harness.manager, "fetchFromGravatar")
        .mockResolvedValue(undefined);
      const downloadAvatarImageSpy = vi
        .spyOn(harness.manager, "downloadAvatarImage")
        .mockResolvedValue(PNG_IMAGE_NAME);
      const saveAvatarSpy = vi.spyOn(harness.manager, "saveAvatar");
      mockHttpsResponse({
        chunks: [Buffer.from(INVALID_JSON_RESPONSE_BODY)],
        statusCode: GITHUB_OK_STATUS
      });

      // When: fetchFromGithub completes that malformed response.
      harness.manager.fetchFromGithub(request, GITHUB_REMOTE_OWNER, GITHUB_REMOTE_REPO);
      await flushAsyncWork();

      // Then: The request falls back to Gravatar without provider-specific image handling.
      expect(fetchFromGravatarSpy).toHaveBeenCalledTimes(1);
      expect(fetchFromGravatarSpy).toHaveBeenCalledWith(request);
      expect(downloadAvatarImageSpy).not.toHaveBeenCalled();
      expect(saveAvatarSpy).not.toHaveBeenCalled();
    });

    it("TC-032: requeues the request on GitHub 403 without falling back to Gravatar", async () => {
      // Case: TC-032
      // Given: The GitHub API responds with status 403 and a known githubTimeout value.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      harness.manager.githubTimeout = RATE_LIMIT_RESET_MS;
      const queueAddItemSpy = vi
        .spyOn(harness.queue, "addItem")
        .mockImplementation(() => undefined);
      const fetchFromGravatarSpy = vi
        .spyOn(harness.manager, "fetchFromGravatar")
        .mockResolvedValue(undefined);
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify({}))],
        statusCode: GITHUB_FORBIDDEN_STATUS
      });

      // When: fetchFromGithub handles the 403 response.
      harness.manager.fetchFromGithub(request, GITHUB_REMOTE_OWNER, GITHUB_REMOTE_REPO);
      await flushAsyncWork();

      // Then: The request is requeued for githubTimeout and the Gravatar fallback is skipped.
      expect(queueAddItemSpy).toHaveBeenCalledTimes(1);
      expect(queueAddItemSpy).toHaveBeenCalledWith(request, RATE_LIMIT_RESET_MS, false);
      expect(fetchFromGravatarSpy).not.toHaveBeenCalled();
    });

    it("TC-033: retries the next commit on GitHub 422 while attempts remain", async () => {
      // Case: TC-033
      // Given: The GitHub API responds with status 422 and the request still has remaining retry attempts.
      const harness = createAvatarManager();
      const request = createAvatarRequest({ attempts: 1, commits: [...LONG_COMMITS] });
      const queueAddItemSpy = vi.spyOn(harness.queue, "addItem");
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify({}))],
        statusCode: GITHUB_UNPROCESSABLE_STATUS
      });

      // When: fetchFromGithub handles the 422 response.
      harness.manager.fetchFromGithub(request, GITHUB_REMOTE_OWNER, GITHUB_REMOTE_REPO);
      await flushAsyncWork();

      // Then: The request is requeued immediately with failedAttempt=true so attempts can increase.
      expect(queueAddItemSpy).toHaveBeenCalledTimes(1);
      expect(queueAddItemSpy).toHaveBeenCalledWith(request, 0, true);
    });

    it("TC-034: falls back to Gravatar on GitHub 422 when no retry condition remains", async () => {
      // Case: TC-034
      // Given: The GitHub API responds with status 422 but the request can no longer retry another commit.
      const harness = createAvatarManager();
      const request = createAvatarRequest({ attempts: 4, commits: [...SHORT_COMMITS] });
      const fetchFromGravatarSpy = vi
        .spyOn(harness.manager, "fetchFromGravatar")
        .mockResolvedValue(undefined);
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify({}))],
        statusCode: GITHUB_UNPROCESSABLE_STATUS
      });

      // When: fetchFromGithub handles that non-retriable 422 response.
      harness.manager.fetchFromGithub(request, GITHUB_REMOTE_OWNER, GITHUB_REMOTE_REPO);
      await flushAsyncWork();

      // Then: The request falls back to Gravatar instead of queueing another GitHub retry.
      expect(fetchFromGravatarSpy).toHaveBeenCalledTimes(1);
      expect(fetchFromGravatarSpy).toHaveBeenCalledWith(request);
    });

    it("TC-035: applies a ten-minute backoff and requeues on GitHub 5xx responses", async () => {
      // Case: TC-035
      // Given: The current time is fixed and the GitHub API responds with a server error.
      useFixedTime();
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      const queueAddItemSpy = vi.spyOn(harness.queue, "addItem");
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify({}))],
        statusCode: GITHUB_SERVER_ERROR_STATUS
      });

      // When: fetchFromGithub handles the 5xx response.
      harness.manager.fetchFromGithub(request, GITHUB_REMOTE_OWNER, GITHUB_REMOTE_REPO);
      await flushAsyncWork();

      // Then: githubTimeout advances by ten minutes and the request is requeued for that backoff deadline.
      expect(harness.manager.githubTimeout).toBe(DEFAULT_TIME_MS + TEN_MINUTES_MS);
      expect(queueAddItemSpy).toHaveBeenCalledTimes(1);
      expect(queueAddItemSpy).toHaveBeenCalledWith(
        request,
        DEFAULT_TIME_MS + TEN_MINUTES_MS,
        false
      );
    });

    it("TC-036: applies a five-minute backoff and requeues on GitHub network errors", async () => {
      // Case: TC-036
      // Given: The current time is fixed and the HTTPS client emits an error instead of a response.
      useFixedTime();
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      const queueAddItemSpy = vi.spyOn(harness.queue, "addItem");
      mockHttpsError(NETWORK_ERROR_MESSAGE);

      // When: fetchFromGithub receives that network error.
      harness.manager.fetchFromGithub(request, GITHUB_REMOTE_OWNER, GITHUB_REMOTE_REPO);
      await flushAsyncWork();

      // Then: githubTimeout advances by five minutes and the request is requeued for that deadline.
      expect(harness.manager.githubTimeout).toBe(DEFAULT_TIME_MS + FIVE_MINUTES_MS);
      expect(queueAddItemSpy).toHaveBeenCalledTimes(1);
      expect(queueAddItemSpy).toHaveBeenCalledWith(
        request,
        DEFAULT_TIME_MS + FIVE_MINUTES_MS,
        false
      );
    });
  });

  describe("fetchFromGitLab", () => {
    it("TC-037: defers GitLab requests until gitLabTimeout expires", () => {
      // Case: TC-037
      // Given: gitLabTimeout is still in the future for the current system time.
      useFixedTime();
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      harness.manager.gitLabTimeout = DEFAULT_TIME_MS + 1;
      const queueAddItemSpy = vi
        .spyOn(harness.queue, "addItem")
        .mockImplementation(() => undefined);
      const fetchAvatarsIntervalSpy = vi
        .spyOn(harness.manager, "fetchAvatarsInterval")
        .mockResolvedValue(undefined);

      // When: fetchFromGitLab is invoked during that timeout window.
      harness.manager.fetchFromGitLab(request);

      // Then: The request is requeued for gitLabTimeout, the interval restarts, and no HTTP request is sent.
      expect(queueAddItemSpy).toHaveBeenCalledTimes(1);
      expect(queueAddItemSpy).toHaveBeenCalledWith(request, harness.manager.gitLabTimeout, false);
      expect(fetchAvatarsIntervalSpy).toHaveBeenCalledTimes(1);
      expect(httpsGetMock).not.toHaveBeenCalled();
    });

    it("TC-038: stores the GitLab rate limit reset time when the remaining header reaches zero", async () => {
      // Case: TC-038
      // Given: The GitLab response reports zero remaining requests and a numeric reset timestamp.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      vi.spyOn(harness.manager, "fetchFromGravatar").mockResolvedValue(undefined);
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify([]))],
        headers: {
          [GITLAB_RATE_LIMIT_HEADER]: "0",
          [GITLAB_RATE_LIMIT_RESET_HEADER]: RATE_LIMIT_RESET_SECONDS
        },
        statusCode: GITLAB_OK_STATUS
      });

      // When: fetchFromGitLab finishes processing that response.
      harness.manager.fetchFromGitLab(request);
      await flushAsyncWork();

      // Then: gitLabTimeout is updated to the reset timestamp in milliseconds.
      expect(harness.manager.gitLabTimeout).toBe(RATE_LIMIT_RESET_MS);
    });

    it("TC-039: downloads and saves a GitLab avatar when the first user includes avatar_url", async () => {
      // Case: TC-039
      // Given: The GitLab user search response contains an avatar_url and image download succeeds.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      const downloadAvatarImageSpy = vi
        .spyOn(harness.manager, "downloadAvatarImage")
        .mockResolvedValue(PNG_IMAGE_NAME);
      const saveAvatarSpy = vi.spyOn(harness.manager, "saveAvatar");
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify([{ avatar_url: GITLAB_AVATAR_URL }]))],
        statusCode: GITLAB_OK_STATUS
      });

      // When: fetchFromGitLab handles the successful user search response.
      harness.manager.fetchFromGitLab(request);
      await flushAsyncWork();

      // Then: The image is downloaded from the returned URL and saved as a non-identicon avatar.
      expect(downloadAvatarImageSpy).toHaveBeenCalledTimes(1);
      expect(downloadAvatarImageSpy).toHaveBeenCalledWith(DEFAULT_EMAIL, GITLAB_AVATAR_URL);
      expect(saveAvatarSpy).toHaveBeenCalledTimes(1);
      expect(saveAvatarSpy).toHaveBeenCalledWith(DEFAULT_EMAIL, PNG_IMAGE_NAME, false);
    });

    it("TC-040: falls back to Gravatar when the GitLab response has no usable avatar URL", async () => {
      // Case: TC-040
      // Given: The GitLab user search response succeeds but returns no avatar_url.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      const fetchFromGravatarSpy = vi
        .spyOn(harness.manager, "fetchFromGravatar")
        .mockResolvedValue(undefined);
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify([{}]))],
        statusCode: GITLAB_OK_STATUS
      });

      // When: fetchFromGitLab completes that response.
      harness.manager.fetchFromGitLab(request);
      await flushAsyncWork();

      // Then: The request falls back to Gravatar.
      expect(fetchFromGravatarSpy).toHaveBeenCalledTimes(1);
      expect(fetchFromGravatarSpy).toHaveBeenCalledWith(request);
    });

    it("TC-085: falls back to Gravatar when the GitLab response body is malformed JSON", async () => {
      // Case: TC-085
      // Given: The GitLab API responds with HTTP 200 and malformed JSON.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      const fetchFromGravatarSpy = vi
        .spyOn(harness.manager, "fetchFromGravatar")
        .mockResolvedValue(undefined);
      const downloadAvatarImageSpy = vi
        .spyOn(harness.manager, "downloadAvatarImage")
        .mockResolvedValue(PNG_IMAGE_NAME);
      const saveAvatarSpy = vi.spyOn(harness.manager, "saveAvatar");
      mockHttpsResponse({
        chunks: [Buffer.from(INVALID_JSON_RESPONSE_BODY)],
        statusCode: GITLAB_OK_STATUS
      });

      // When: fetchFromGitLab completes that malformed response.
      harness.manager.fetchFromGitLab(request);
      await flushAsyncWork();

      // Then: The request falls back to Gravatar without provider-specific image handling.
      expect(fetchFromGravatarSpy).toHaveBeenCalledTimes(1);
      expect(fetchFromGravatarSpy).toHaveBeenCalledWith(request);
      expect(downloadAvatarImageSpy).not.toHaveBeenCalled();
      expect(saveAvatarSpy).not.toHaveBeenCalled();
    });

    it("TC-041: requeues the request on GitLab 429 without falling back to Gravatar", async () => {
      // Case: TC-041
      // Given: The GitLab API responds with status 429 and a known gitLabTimeout value.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      harness.manager.gitLabTimeout = RATE_LIMIT_RESET_MS;
      const queueAddItemSpy = vi
        .spyOn(harness.queue, "addItem")
        .mockImplementation(() => undefined);
      const fetchFromGravatarSpy = vi
        .spyOn(harness.manager, "fetchFromGravatar")
        .mockResolvedValue(undefined);
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify([]))],
        statusCode: GITLAB_RATE_LIMIT_STATUS
      });

      // When: fetchFromGitLab handles the 429 response.
      harness.manager.fetchFromGitLab(request);
      await flushAsyncWork();

      // Then: The request is requeued for gitLabTimeout and no Gravatar fallback occurs.
      expect(queueAddItemSpy).toHaveBeenCalledTimes(1);
      expect(queueAddItemSpy).toHaveBeenCalledWith(request, RATE_LIMIT_RESET_MS, false);
      expect(fetchFromGravatarSpy).not.toHaveBeenCalled();
    });

    it("TC-042: applies a ten-minute backoff and requeues on GitLab 5xx responses", async () => {
      // Case: TC-042
      // Given: The current time is fixed and the GitLab API responds with a server error.
      useFixedTime();
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      const queueAddItemSpy = vi.spyOn(harness.queue, "addItem");
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify([]))],
        statusCode: GITLAB_SERVER_ERROR_STATUS
      });

      // When: fetchFromGitLab handles the 5xx response.
      harness.manager.fetchFromGitLab(request);
      await flushAsyncWork();

      // Then: gitLabTimeout advances by ten minutes and the request is requeued for that deadline.
      expect(harness.manager.gitLabTimeout).toBe(DEFAULT_TIME_MS + TEN_MINUTES_MS);
      expect(queueAddItemSpy).toHaveBeenCalledTimes(1);
      expect(queueAddItemSpy).toHaveBeenCalledWith(
        request,
        DEFAULT_TIME_MS + TEN_MINUTES_MS,
        false
      );
    });

    it("TC-043: applies a five-minute backoff and requeues on GitLab network errors", async () => {
      // Case: TC-043
      // Given: The current time is fixed and the HTTPS client emits an error instead of a response.
      useFixedTime();
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      const queueAddItemSpy = vi.spyOn(harness.queue, "addItem");
      mockHttpsError(NETWORK_ERROR_MESSAGE);

      // When: fetchFromGitLab receives that network error.
      harness.manager.fetchFromGitLab(request);
      await flushAsyncWork();

      // Then: gitLabTimeout advances by five minutes and the request is requeued for that deadline.
      expect(harness.manager.gitLabTimeout).toBe(DEFAULT_TIME_MS + FIVE_MINUTES_MS);
      expect(queueAddItemSpy).toHaveBeenCalledTimes(1);
      expect(queueAddItemSpy).toHaveBeenCalledWith(
        request,
        DEFAULT_TIME_MS + FIVE_MINUTES_MS,
        false
      );
    });
  });

  describe("fetchFromGravatar", () => {
    it("TC-044: saves the first Gravatar image result without requesting an identicon", async () => {
      // Case: TC-044
      // Given: The first Gravatar download using d=404 succeeds immediately.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      const downloadAvatarImageSpy = vi
        .spyOn(harness.manager, "downloadAvatarImage")
        .mockResolvedValue(PNG_IMAGE_NAME);
      const saveAvatarSpy = vi.spyOn(harness.manager, "saveAvatar");

      // When: fetchFromGravatar is called for that request.
      await harness.manager.fetchFromGravatar(request);

      // Then: The missing-avatar URL is used once and the saved avatar is marked as a real image.
      expect(downloadAvatarImageSpy).toHaveBeenCalledTimes(1);
      expect(downloadAvatarImageSpy).toHaveBeenCalledWith(
        DEFAULT_EMAIL,
        createGravatarUrl(DEFAULT_EMAIL, GRAVATAR_DEFAULT_MISSING)
      );
      expect(saveAvatarSpy).toHaveBeenCalledTimes(1);
      expect(saveAvatarSpy).toHaveBeenCalledWith(DEFAULT_EMAIL, PNG_IMAGE_NAME, false);
    });

    it("TC-045: retries with identicon when the 404-style Gravatar download returns null", async () => {
      // Case: TC-045
      // Given: The first Gravatar download returns null and the second identicon download succeeds.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      const downloadAvatarImageSpy = vi
        .spyOn(harness.manager, "downloadAvatarImage")
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(IDENTICON_IMAGE_NAME);
      const saveAvatarSpy = vi.spyOn(harness.manager, "saveAvatar");

      // When: fetchFromGravatar runs through both download attempts.
      await harness.manager.fetchFromGravatar(request);

      // Then: The identicon URL is requested next and the saved avatar is marked as an identicon.
      expect(downloadAvatarImageSpy).toHaveBeenCalledTimes(2);
      expect(downloadAvatarImageSpy).toHaveBeenNthCalledWith(
        1,
        DEFAULT_EMAIL,
        createGravatarUrl(DEFAULT_EMAIL, GRAVATAR_DEFAULT_MISSING)
      );
      expect(downloadAvatarImageSpy).toHaveBeenNthCalledWith(
        2,
        DEFAULT_EMAIL,
        createGravatarUrl(DEFAULT_EMAIL, GRAVATAR_DEFAULT_IDENTICON)
      );
      expect(saveAvatarSpy).toHaveBeenCalledTimes(1);
      expect(saveAvatarSpy).toHaveBeenCalledWith(DEFAULT_EMAIL, IDENTICON_IMAGE_NAME, true);
    });

    it("TC-046: does not save anything when both Gravatar downloads return null", async () => {
      // Case: TC-046
      // Given: Both the missing-avatar request and identicon retry return null.
      const harness = createAvatarManager();
      const request = createAvatarRequest();
      const downloadAvatarImageSpy = vi
        .spyOn(harness.manager, "downloadAvatarImage")
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const saveAvatarSpy = vi.spyOn(harness.manager, "saveAvatar");

      // When: fetchFromGravatar runs through both failed download attempts.
      await harness.manager.fetchFromGravatar(request);

      // Then: No avatar is saved after the two null results.
      expect(downloadAvatarImageSpy).toHaveBeenCalledTimes(2);
      expect(saveAvatarSpy).not.toHaveBeenCalled();
    });
  });

  describe("request timeout destroy (S23)", () => {
    it("TC-086: destroys the GitHub request and requeues on socket timeout", async () => {
      // Case: TC-086
      // Given: the GitHub request socket times out
      useFixedTime();
      const harness = createAvatarManager();
      const avatarRequest = createAvatarRequest();
      const queueAddItemSpy = vi
        .spyOn(harness.queue, "addItem")
        .mockImplementation(() => undefined);
      const { destroy } = mockHttpsTimeout();

      // When: fetchFromGithub encounters the timeout event
      harness.manager.fetchFromGithub(avatarRequest, GITHUB_REMOTE_OWNER, GITHUB_REMOTE_REPO);
      await flushAsyncWork();

      // Then: req.destroy(Error("timeout")) fires and the error path requeues after 5 minutes
      expect(destroy).toHaveBeenCalledTimes(1);
      expect(destroy).toHaveBeenCalledWith(new Error(REQUEST_TIMEOUT_ERROR));
      expect(harness.manager.githubTimeout).toBe(DEFAULT_TIME_MS + FIVE_MINUTES_MS);
      expect(queueAddItemSpy).toHaveBeenCalledWith(
        avatarRequest,
        DEFAULT_TIME_MS + FIVE_MINUTES_MS,
        false
      );
    });

    it("TC-087: destroys the GitLab request and requeues on socket timeout", async () => {
      // Case: TC-087
      // Given: the GitLab request socket times out
      useFixedTime();
      const harness = createAvatarManager();
      const avatarRequest = createAvatarRequest();
      const queueAddItemSpy = vi
        .spyOn(harness.queue, "addItem")
        .mockImplementation(() => undefined);
      const { destroy } = mockHttpsTimeout();

      // When: fetchFromGitLab encounters the timeout event
      harness.manager.fetchFromGitLab(avatarRequest);
      await flushAsyncWork();

      // Then: req.destroy(Error("timeout")) fires and the error path requeues after 5 minutes
      expect(destroy).toHaveBeenCalledTimes(1);
      expect(destroy).toHaveBeenCalledWith(new Error(REQUEST_TIMEOUT_ERROR));
      expect(harness.manager.gitLabTimeout).toBe(DEFAULT_TIME_MS + FIVE_MINUTES_MS);
      expect(queueAddItemSpy).toHaveBeenCalledWith(
        avatarRequest,
        DEFAULT_TIME_MS + FIVE_MINUTES_MS,
        false
      );
    });

    it("TC-088: destroys the Gravatar download request and saves nothing on timeout", async () => {
      // Case: TC-088
      // Given: the first Gravatar download times out and the identicon download resolves null
      useFixedTime();
      const harness = createAvatarManager();
      const avatarRequest = createAvatarRequest();
      const saveAvatarSpy = vi.spyOn(harness.manager, "saveAvatar");
      const { destroy } = mockHttpsTimeout();
      mockHttpsResponse({ statusCode: 404 });

      // When: fetchFromGravatar runs the download that times out
      await harness.manager.fetchFromGravatar(avatarRequest);
      await flushAsyncWork();

      // Then: req.destroy(Error("timeout")) fires once and no avatar is saved
      expect(destroy).toHaveBeenCalledTimes(1);
      expect(destroy).toHaveBeenCalledWith(new Error(REQUEST_TIMEOUT_ERROR));
      expect(saveAvatarSpy).not.toHaveBeenCalled();
    });

    it("TC-089: does not destroy the GitHub request on a normal 200 response", async () => {
      // Case: TC-089
      // Given: the GitHub request returns a normal 200 response (no timeout)
      const harness = createAvatarManager();
      const avatarRequest = createAvatarRequest();
      const downloadAvatarImageSpy = vi
        .spyOn(harness.manager, "downloadAvatarImage")
        .mockResolvedValue(PNG_IMAGE_NAME);
      const saveAvatarSpy = vi.spyOn(harness.manager, "saveAvatar");
      const httpRequest = mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify({ author: { avatar_url: GITHUB_AVATAR_URL } }))],
        statusCode: GITHUB_OK_STATUS
      });
      const destroy = vi.fn();
      (httpRequest as unknown as { destroy: typeof destroy }).destroy = destroy;

      // When: fetchFromGithub processes the successful response
      harness.manager.fetchFromGithub(avatarRequest, GITHUB_REMOTE_OWNER, GITHUB_REMOTE_REPO);
      await flushAsyncWork();

      // Then: destroy is never called and the normal download/save path runs
      expect(destroy).not.toHaveBeenCalled();
      expect(downloadAvatarImageSpy).toHaveBeenCalledTimes(1);
      expect(saveAvatarSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("rate limit headerless requeue (S24)", () => {
    it("TC-090: requeues a GitHub 403 with a default 5-minute delay when reset is unavailable", async () => {
      // Case: TC-090
      // Given: a GitHub 403 response with no rate-limit reset header (githubTimeout stays 0)
      useFixedTime();
      const harness = createAvatarManager();
      const avatarRequest = createAvatarRequest();
      const queueAddItemSpy = vi
        .spyOn(harness.queue, "addItem")
        .mockImplementation(() => undefined);
      const fetchFromGravatarSpy = vi
        .spyOn(harness.manager, "fetchFromGravatar")
        .mockResolvedValue(undefined);
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify({}))],
        statusCode: GITHUB_FORBIDDEN_STATUS
      });

      // When: fetchFromGithub handles the headerless 403
      harness.manager.fetchFromGithub(avatarRequest, GITHUB_REMOTE_OWNER, GITHUB_REMOTE_REPO);
      await flushAsyncWork();

      // Then: it requeues with failedAttempt=true after a default 5-minute delay
      expect(queueAddItemSpy).toHaveBeenCalledTimes(1);
      expect(queueAddItemSpy).toHaveBeenCalledWith(
        avatarRequest,
        DEFAULT_TIME_MS + FIVE_MINUTES_MS,
        true
      );
      expect(fetchFromGravatarSpy).not.toHaveBeenCalled();
    });

    it("TC-091: requeues a GitHub 403 for githubTimeout when the reset time is known", async () => {
      // Case: TC-091
      // Given: a GitHub 403 with a preset non-zero githubTimeout
      const harness = createAvatarManager();
      const avatarRequest = createAvatarRequest();
      harness.manager.githubTimeout = RATE_LIMIT_RESET_MS;
      const queueAddItemSpy = vi
        .spyOn(harness.queue, "addItem")
        .mockImplementation(() => undefined);
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify({}))],
        statusCode: GITHUB_FORBIDDEN_STATUS
      });

      // When: fetchFromGithub handles the 403 with a known reset time
      harness.manager.fetchFromGithub(avatarRequest, GITHUB_REMOTE_OWNER, GITHUB_REMOTE_REPO);
      await flushAsyncWork();

      // Then: it requeues for githubTimeout with failedAttempt=false
      expect(queueAddItemSpy).toHaveBeenCalledTimes(1);
      expect(queueAddItemSpy).toHaveBeenCalledWith(avatarRequest, RATE_LIMIT_RESET_MS, false);
    });

    it("TC-092: requeues a GitLab 429 with a default 5-minute delay when reset is unavailable", async () => {
      // Case: TC-092
      // Given: a GitLab 429 response with no rate-limit reset header (gitLabTimeout stays 0)
      useFixedTime();
      const harness = createAvatarManager();
      const avatarRequest = createAvatarRequest();
      const queueAddItemSpy = vi
        .spyOn(harness.queue, "addItem")
        .mockImplementation(() => undefined);
      const fetchFromGravatarSpy = vi
        .spyOn(harness.manager, "fetchFromGravatar")
        .mockResolvedValue(undefined);
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify([]))],
        statusCode: GITLAB_RATE_LIMIT_STATUS
      });

      // When: fetchFromGitLab handles the headerless 429
      harness.manager.fetchFromGitLab(avatarRequest);
      await flushAsyncWork();

      // Then: it requeues with failedAttempt=true after a default 5-minute delay
      expect(queueAddItemSpy).toHaveBeenCalledTimes(1);
      expect(queueAddItemSpy).toHaveBeenCalledWith(
        avatarRequest,
        DEFAULT_TIME_MS + FIVE_MINUTES_MS,
        true
      );
      expect(fetchFromGravatarSpy).not.toHaveBeenCalled();
    });

    it("TC-093: requeues a GitLab 429 for gitLabTimeout when the reset time is known", async () => {
      // Case: TC-093
      // Given: a GitLab 429 with a preset non-zero gitLabTimeout
      const harness = createAvatarManager();
      const avatarRequest = createAvatarRequest();
      harness.manager.gitLabTimeout = RATE_LIMIT_RESET_MS;
      const queueAddItemSpy = vi
        .spyOn(harness.queue, "addItem")
        .mockImplementation(() => undefined);
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify([]))],
        statusCode: GITLAB_RATE_LIMIT_STATUS
      });

      // When: fetchFromGitLab handles the 429 with a known reset time
      harness.manager.fetchFromGitLab(avatarRequest);
      await flushAsyncWork();

      // Then: it requeues for gitLabTimeout with failedAttempt=false
      expect(queueAddItemSpy).toHaveBeenCalledTimes(1);
      expect(queueAddItemSpy).toHaveBeenCalledWith(avatarRequest, RATE_LIMIT_RESET_MS, false);
    });

    it("TC-094: uses a 5-minute (300000ms) constant for the headerless requeue delay", async () => {
      // Case: TC-094
      // Given: the retry interval constant mirrored in the test utilities is 5 minutes
      expect(FIVE_MINUTES_MS).toBe(300_000);
      useFixedTime();
      const harness = createAvatarManager();
      const avatarRequest = createAvatarRequest();
      const queueAddItemSpy = vi
        .spyOn(harness.queue, "addItem")
        .mockImplementation(() => undefined);
      vi.spyOn(harness.manager, "fetchFromGravatar").mockResolvedValue(undefined);
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify({}))],
        statusCode: GITHUB_FORBIDDEN_STATUS
      });

      // When: a headerless 403 is requeued
      harness.manager.fetchFromGithub(avatarRequest, GITHUB_REMOTE_OWNER, GITHUB_REMOTE_REPO);
      await flushAsyncWork();

      // Then: the requeue delay past the fetch time equals the 300000ms constant
      const checkAfter = queueAddItemSpy.mock.calls[FIRST_CALL_INDEX][1] as number;
      expect(checkAfter - DEFAULT_TIME_MS).toBe(300_000);
    });

    it("TC-095: bases the headerless requeue on the fetch time, not on githubTimeout (0)", async () => {
      // Case: TC-095
      // Given: a headerless GitHub 403 with githubTimeout still 0
      useFixedTime();
      const harness = createAvatarManager();
      const avatarRequest = createAvatarRequest();
      const queueAddItemSpy = vi
        .spyOn(harness.queue, "addItem")
        .mockImplementation(() => undefined);
      vi.spyOn(harness.manager, "fetchFromGravatar").mockResolvedValue(undefined);
      mockHttpsResponse({
        chunks: [Buffer.from(JSON.stringify({}))],
        statusCode: GITHUB_FORBIDDEN_STATUS
      });

      // When: fetchFromGithub requeues the headerless 403
      harness.manager.fetchFromGithub(avatarRequest, GITHUB_REMOTE_OWNER, GITHUB_REMOTE_REPO);
      await flushAsyncWork();

      // Then: checkAfter is fetch-time + 5 minutes, not githubTimeout(0) + 5 minutes
      expect(queueAddItemSpy).toHaveBeenCalledWith(
        avatarRequest,
        DEFAULT_TIME_MS + FIVE_MINUTES_MS,
        true
      );
      expect(harness.manager.githubTimeout).toBe(0);
    });
  });
});
