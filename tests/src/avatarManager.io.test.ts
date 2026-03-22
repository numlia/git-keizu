import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AVATAR_STORAGE_PATH,
  createAvatarCacheEntry,
  createAvatarManager,
  createDataUri,
  createStoredAvatarName,
  DEFAULT_EMAIL,
  DEFAULT_IMAGE_BYTES,
  DEFAULT_TIME_MS,
  FETCH_AVATAR_COMMAND,
  flushAsyncWork,
  fsMocks,
  IDENTICON_IMAGE_NAME,
  IMAGE_CONTENT_TYPE_PNG,
  IMAGE_CONTENT_TYPE_SVG,
  INVALID_IMAGE_HOST_URL,
  INVALID_IMAGE_URL,
  mockHttpsError,
  mockHttpsResponse,
  NON_IMAGE_CONTENT_TYPE,
  PNG_IMAGE_NAME,
  resetAvatarManagerTestEnvironment,
  SECONDARY_PNG_IMAGE_NAME,
  useFixedTime
} from "./avatarManager.testUtils";

const HTTP_NOT_FOUND_STATUS = 404;
const IMAGE_HTTP_OK_STATUS = 200;
const IMAGE_HTTP_REQUEST_URL = "https://avatars.githubusercontent.com/u/1.png?size=54";
const IMAGE_READ_ERROR_MESSAGE = "read failed";
const IMAGE_WRITE_ERROR_MESSAGE = "write failed";
const PNG_FORMAT = "png";
const SVG_FORMAT = "svg+xml";
const UNSUPPORTED_IMAGE_CONTENT_TYPE = "image/bmp";

describe("AvatarManager image storage and webview flows", () => {
  beforeEach(() => {
    resetAvatarManagerTestEnvironment();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("downloadAvatarImage", () => {
    it("TC-047: returns null for invalid image URLs without starting an HTTP request", async () => {
      // Case: TC-047
      // Given: The supplied image URL is not parseable by the URL constructor.
      const harness = createAvatarManager();

      // When: downloadAvatarImage is called with that invalid URL string.
      const result = await harness.manager.downloadAvatarImage(DEFAULT_EMAIL, INVALID_IMAGE_URL);

      // Then: The method returns null and never calls https.get.
      expect(result).toBeNull();
      expect(fsMocks.writeFile).not.toHaveBeenCalled();
    });

    it("TC-048: returns null for image URLs on hosts outside the allow list", async () => {
      // Case: TC-048
      // Given: The supplied image URL points to an unapproved hostname.
      const harness = createAvatarManager();

      // When: downloadAvatarImage is called with that disallowed host URL.
      const result = await harness.manager.downloadAvatarImage(
        DEFAULT_EMAIL,
        INVALID_IMAGE_HOST_URL
      );

      // Then: The method returns null and never attempts a network fetch.
      expect(result).toBeNull();
    });

    it("TC-049: returns null when the HTTP response is not an image content type", async () => {
      // Case: TC-049
      // Given: The image download responds with status 200 but a non-image content-type header.
      const harness = createAvatarManager();
      mockHttpsResponse({
        chunks: [Buffer.from(DEFAULT_IMAGE_BYTES)],
        headers: { "content-type": NON_IMAGE_CONTENT_TYPE },
        statusCode: IMAGE_HTTP_OK_STATUS
      });

      // When: downloadAvatarImage processes that response.
      const resultPromise = harness.manager.downloadAvatarImage(
        DEFAULT_EMAIL,
        IMAGE_HTTP_REQUEST_URL
      );
      await flushAsyncWork();
      const result = await resultPromise;

      // Then: The method resolves null and does not attempt to write the file.
      expect(result).toBeNull();
      expect(fsMocks.writeFile).not.toHaveBeenCalled();
    });

    it("TC-050: returns null when the HTTP response uses an unsupported image format", async () => {
      // Case: TC-050
      // Given: The image download responds with status 200 and image/bmp content type.
      const harness = createAvatarManager();
      mockHttpsResponse({
        chunks: [Buffer.from(DEFAULT_IMAGE_BYTES)],
        headers: { "content-type": UNSUPPORTED_IMAGE_CONTENT_TYPE },
        statusCode: IMAGE_HTTP_OK_STATUS
      });

      // When: downloadAvatarImage processes that unsupported image format.
      const resultPromise = harness.manager.downloadAvatarImage(
        DEFAULT_EMAIL,
        IMAGE_HTTP_REQUEST_URL
      );
      await flushAsyncWork();
      const result = await resultPromise;

      // Then: The method resolves null and skips file writes.
      expect(result).toBeNull();
      expect(fsMocks.writeFile).not.toHaveBeenCalled();
    });

    it("TC-051: stores PNG image responses using the sha256-based filename", async () => {
      // Case: TC-051
      // Given: The image download responds with status 200 and a valid PNG content type.
      const harness = createAvatarManager();
      const expectedFileName = createStoredAvatarName(DEFAULT_EMAIL, PNG_FORMAT);
      fsMocks.writeFile.mockResolvedValue(undefined);
      mockHttpsResponse({
        chunks: [Buffer.from(DEFAULT_IMAGE_BYTES)],
        headers: { "content-type": IMAGE_CONTENT_TYPE_PNG },
        statusCode: IMAGE_HTTP_OK_STATUS
      });

      // When: downloadAvatarImage processes that PNG response.
      const resultPromise = harness.manager.downloadAvatarImage(
        DEFAULT_EMAIL,
        IMAGE_HTTP_REQUEST_URL
      );
      await flushAsyncWork();
      const result = await resultPromise;

      // Then: The image bytes are written to the avatar storage path and the PNG filename is returned.
      expect(fsMocks.writeFile).toHaveBeenCalledTimes(1);
      expect(fsMocks.writeFile).toHaveBeenCalledWith(
        `${AVATAR_STORAGE_PATH}/${expectedFileName}`,
        Buffer.from(DEFAULT_IMAGE_BYTES)
      );
      expect(result).toBe(expectedFileName);
    });

    it("TC-052: accepts svg+xml content types and stores them with the svg+xml extension", async () => {
      // Case: TC-052
      // Given: The image download responds with status 200 and an image/svg+xml content type.
      const harness = createAvatarManager();
      const expectedFileName = createStoredAvatarName(DEFAULT_EMAIL, SVG_FORMAT);
      fsMocks.writeFile.mockResolvedValue(undefined);
      mockHttpsResponse({
        chunks: [Buffer.from(DEFAULT_IMAGE_BYTES)],
        headers: { "content-type": IMAGE_CONTENT_TYPE_SVG },
        statusCode: IMAGE_HTTP_OK_STATUS
      });

      // When: downloadAvatarImage processes that SVG response.
      const resultPromise = harness.manager.downloadAvatarImage(
        DEFAULT_EMAIL,
        IMAGE_HTTP_REQUEST_URL
      );
      await flushAsyncWork();
      const result = await resultPromise;

      // Then: The image bytes are written with the svg+xml extension and that filename is returned.
      expect(fsMocks.writeFile).toHaveBeenCalledTimes(1);
      expect(fsMocks.writeFile).toHaveBeenCalledWith(
        `${AVATAR_STORAGE_PATH}/${expectedFileName}`,
        Buffer.from(DEFAULT_IMAGE_BYTES)
      );
      expect(result).toBe(expectedFileName);
    });

    it("TC-053: returns null when writing the downloaded avatar to disk fails", async () => {
      // Case: TC-053
      // Given: The image download is valid but fs.writeFile rejects during persistence.
      const harness = createAvatarManager();
      fsMocks.writeFile.mockRejectedValue(new Error(IMAGE_WRITE_ERROR_MESSAGE));
      mockHttpsResponse({
        chunks: [Buffer.from(DEFAULT_IMAGE_BYTES)],
        headers: { "content-type": IMAGE_CONTENT_TYPE_PNG },
        statusCode: IMAGE_HTTP_OK_STATUS
      });

      // When: downloadAvatarImage attempts to save the image.
      const resultPromise = harness.manager.downloadAvatarImage(
        DEFAULT_EMAIL,
        IMAGE_HTTP_REQUEST_URL
      );
      await flushAsyncWork();
      const result = await resultPromise;

      // Then: The method resolves null after the write failure.
      expect(result).toBeNull();
    });

    it("TC-054: returns null for non-200 image HTTP responses", async () => {
      // Case: TC-054
      // Given: The image download responds with status 404.
      const harness = createAvatarManager();
      mockHttpsResponse({
        headers: { "content-type": IMAGE_CONTENT_TYPE_PNG },
        statusCode: HTTP_NOT_FOUND_STATUS
      });

      // When: downloadAvatarImage processes that non-200 response.
      const resultPromise = harness.manager.downloadAvatarImage(
        DEFAULT_EMAIL,
        IMAGE_HTTP_REQUEST_URL
      );
      await flushAsyncWork();
      const result = await resultPromise;

      // Then: The method resolves null and does not write any file.
      expect(result).toBeNull();
      expect(fsMocks.writeFile).not.toHaveBeenCalled();
    });

    it("TC-055: returns null when the HTTPS request emits an error", async () => {
      // Case: TC-055
      // Given: The HTTPS client emits an error before any response is received.
      const harness = createAvatarManager();
      mockHttpsError();

      // When: downloadAvatarImage waits for the HTTPS request to finish.
      const resultPromise = harness.manager.downloadAvatarImage(
        DEFAULT_EMAIL,
        IMAGE_HTTP_REQUEST_URL
      );
      await flushAsyncWork();
      const result = await resultPromise;

      // Then: The method resolves null.
      expect(result).toBeNull();
    });
  });

  describe("saveAvatar", () => {
    it("TC-056: creates a new cache entry, persists it, and sends it to the webview", () => {
      // Case: TC-056
      // Given: No cached avatar exists for the email and the clock is fixed to a known time.
      useFixedTime();
      const harness = createAvatarManager();
      const sendAvatarToWebViewSpy = vi
        .spyOn(harness.manager, "sendAvatarToWebView")
        .mockResolvedValue(undefined);

      // When: saveAvatar stores a new non-identicon image.
      harness.manager.saveAvatar(DEFAULT_EMAIL, PNG_IMAGE_NAME, false);

      // Then: A fresh cache entry is created, persisted, and sent to the webview with a noop callback.
      expect(harness.manager.avatars[DEFAULT_EMAIL]).toEqual({
        identicon: false,
        image: PNG_IMAGE_NAME,
        timestamp: DEFAULT_TIME_MS
      });
      expect(harness.extensionState.saveAvatar).toHaveBeenCalledTimes(1);
      expect(harness.extensionState.saveAvatar).toHaveBeenCalledWith(
        DEFAULT_EMAIL,
        harness.manager.avatars[DEFAULT_EMAIL]
      );
      expect(sendAvatarToWebViewSpy).toHaveBeenCalledTimes(1);
      expect(sendAvatarToWebViewSpy).toHaveBeenCalledWith(DEFAULT_EMAIL, expect.any(Function));
    });

    it("TC-057: replaces an identicon with a real avatar and updates the timestamp", () => {
      // Case: TC-057
      // Given: The cache currently contains an identicon entry for the email.
      useFixedTime();
      const avatarCache = {
        [DEFAULT_EMAIL]: createAvatarCacheEntry({
          identicon: true,
          image: IDENTICON_IMAGE_NAME,
          timestamp: 0
        })
      };
      const harness = createAvatarManager({ avatarCache });
      vi.spyOn(harness.manager, "sendAvatarToWebView").mockResolvedValue(undefined);

      // When: saveAvatar stores a real avatar image for the same email.
      harness.manager.saveAvatar(DEFAULT_EMAIL, PNG_IMAGE_NAME, false);

      // Then: The cache entry is overwritten with the real image and a refreshed timestamp.
      expect(harness.manager.avatars[DEFAULT_EMAIL]).toEqual({
        identicon: false,
        image: PNG_IMAGE_NAME,
        timestamp: DEFAULT_TIME_MS
      });
    });

    it("TC-058: preserves a real avatar when a later identicon result arrives", () => {
      // Case: TC-058
      // Given: The cache currently contains a real avatar entry for the email.
      useFixedTime();
      const avatarCache = {
        [DEFAULT_EMAIL]: createAvatarCacheEntry({
          identicon: false,
          image: PNG_IMAGE_NAME,
          timestamp: 0
        })
      };
      const harness = createAvatarManager({ avatarCache });
      vi.spyOn(harness.manager, "sendAvatarToWebView").mockResolvedValue(undefined);

      // When: saveAvatar receives an identicon result for the same email.
      harness.manager.saveAvatar(DEFAULT_EMAIL, IDENTICON_IMAGE_NAME, true);

      // Then: The real avatar image remains unchanged while only the timestamp is refreshed.
      expect(harness.manager.avatars[DEFAULT_EMAIL]).toEqual({
        identicon: false,
        image: PNG_IMAGE_NAME,
        timestamp: DEFAULT_TIME_MS
      });
    });

    it("TC-059: overwrites one identicon with another identicon and refreshes the timestamp", () => {
      // Case: TC-059
      // Given: The cache currently contains an identicon entry for the email.
      useFixedTime();
      const avatarCache = {
        [DEFAULT_EMAIL]: createAvatarCacheEntry({
          identicon: true,
          image: IDENTICON_IMAGE_NAME,
          timestamp: 0
        })
      };
      const harness = createAvatarManager({ avatarCache });
      vi.spyOn(harness.manager, "sendAvatarToWebView").mockResolvedValue(undefined);

      // When: saveAvatar receives a newer identicon image.
      harness.manager.saveAvatar(DEFAULT_EMAIL, SECONDARY_PNG_IMAGE_NAME, true);

      // Then: The identicon image is overwritten and the timestamp is refreshed.
      expect(harness.manager.avatars[DEFAULT_EMAIL]).toEqual({
        identicon: true,
        image: SECONDARY_PNG_IMAGE_NAME,
        timestamp: DEFAULT_TIME_MS
      });
    });
  });

  describe("sendAvatarToWebView", () => {
    it("TC-060: returns early when no webview is registered", async () => {
      // Case: TC-060
      // Given: No view is registered on the manager.
      const harness = createAvatarManager();
      const onError = vi.fn();

      // When: sendAvatarToWebView is called without a registered view.
      await harness.manager.sendAvatarToWebView(DEFAULT_EMAIL, onError);

      // Then: No file read occurs and the error callback is not used.
      expect(fsMocks.readFile).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it("TC-061: returns early when the avatar cache has no image for the email", async () => {
      // Case: TC-061
      // Given: A view is registered but the avatar cache has no image entry for the email.
      const harness = createAvatarManager();
      const onError = vi.fn();
      harness.manager.registerView(harness.view);

      // When: sendAvatarToWebView is called for that missing cache entry.
      await harness.manager.sendAvatarToWebView(DEFAULT_EMAIL, onError);

      // Then: No file read occurs and the error callback is not used.
      expect(fsMocks.readFile).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it("TC-062: reads the avatar file and sends a data URI to the registered webview", async () => {
      // Case: TC-062
      // Given: A view is registered, an avatar filename is cached, and reading the file succeeds.
      const harness = createAvatarManager({
        avatarCache: { [DEFAULT_EMAIL]: createAvatarCacheEntry({ image: PNG_IMAGE_NAME }) }
      });
      const onError = vi.fn();
      harness.manager.registerView(harness.view);
      fsMocks.readFile.mockResolvedValue(Buffer.from(DEFAULT_IMAGE_BYTES));

      // When: sendAvatarToWebView loads and sends the avatar file.
      await harness.manager.sendAvatarToWebView(DEFAULT_EMAIL, onError);

      // Then: The webview receives a fetchAvatar message containing the base64 data URI.
      expect(fsMocks.readFile).toHaveBeenCalledTimes(1);
      expect(fsMocks.readFile).toHaveBeenCalledWith(`${AVATAR_STORAGE_PATH}/${PNG_IMAGE_NAME}`);
      expect(harness.sendMessage).toHaveBeenCalledTimes(1);
      expect(harness.sendMessage).toHaveBeenCalledWith({
        command: FETCH_AVATAR_COMMAND,
        email: DEFAULT_EMAIL,
        image: createDataUri(PNG_IMAGE_NAME, DEFAULT_IMAGE_BYTES)
      });
      expect(onError).not.toHaveBeenCalled();
    });

    it("TC-063: skips sendMessage when the view becomes null while waiting for fs.readFile", async () => {
      // Case: TC-063
      // Given: A view is registered but the manager loses that view before the awaited read completes.
      const harness = createAvatarManager({
        avatarCache: { [DEFAULT_EMAIL]: createAvatarCacheEntry({ image: PNG_IMAGE_NAME }) }
      });
      harness.manager.registerView(harness.view);
      fsMocks.readFile.mockImplementation(async () => {
        harness.manager.view = null;
        return Buffer.from(DEFAULT_IMAGE_BYTES);
      });

      // When: sendAvatarToWebView awaits the avatar file read.
      await harness.manager.sendAvatarToWebView(DEFAULT_EMAIL, vi.fn());

      // Then: No webview message is sent after the view becomes null.
      expect(harness.sendMessage).not.toHaveBeenCalled();
    });

    it("TC-064: calls onError when reading the avatar file fails", async () => {
      // Case: TC-064
      // Given: A view is registered, an avatar filename is cached, and fs.readFile rejects.
      const harness = createAvatarManager({
        avatarCache: { [DEFAULT_EMAIL]: createAvatarCacheEntry({ image: PNG_IMAGE_NAME }) }
      });
      const onError = vi.fn();
      harness.manager.registerView(harness.view);
      fsMocks.readFile.mockRejectedValue(new Error(IMAGE_READ_ERROR_MESSAGE));

      // When: sendAvatarToWebView attempts to read the avatar file.
      await harness.manager.sendAvatarToWebView(DEFAULT_EMAIL, onError);

      // Then: The error callback runs exactly once.
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });
});
