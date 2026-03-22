import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  Uri: {
    parse: vi.fn((str: string) => {
      const colonIdx = str.indexOf(":");
      const scheme = colonIdx >= 0 ? str.substring(0, colonIdx) : "";
      const rest = colonIdx >= 0 ? str.substring(colonIdx + 1) : str;
      const qIdx = rest.indexOf("?");
      const path = qIdx >= 0 ? rest.substring(0, qIdx) : rest;
      const query = qIdx >= 0 ? rest.substring(qIdx + 1) : "";
      return { scheme, path, query, toString: () => str };
    })
  },
  workspace: {
    onDidCloseTextDocument: vi.fn(() => ({ dispose: vi.fn() }))
  },
  EventEmitter: vi.fn(function () {
    return { event: vi.fn(), fire: vi.fn(), dispose: vi.fn() };
  })
}));

vi.mock("../../src/dataSource", () => ({
  DataSource: vi.fn()
}));

vi.mock("../../src/utils", () => ({
  getPathFromStr: vi.fn((str: string) => str.replace(/\\/g, "/"))
}));

import * as vscode from "vscode";

import type { DataSource } from "../../src/dataSource";
import { decodeDiffDocUri, DiffDocProvider, encodeDiffDocUri } from "../../src/diffDocProvider";
import { getPathFromStr } from "../../src/utils";

const CLOSE_CALLBACK_ERROR = "Close callback was not registered";

interface MockTextDocument {
  uri: MockUri;
}

interface MockUri {
  path: string;
  query: string;
  toString?: () => string;
}

type CloseTextDocumentHandler = Parameters<typeof vscode.workspace.onDidCloseTextDocument>[0];
type MockDataSource = Pick<DataSource, "getCommitFile">;

function asDataSource(dataSource: MockDataSource): DataSource {
  return dataSource as unknown as DataSource;
}

function asTextDocument(document: MockTextDocument): vscode.TextDocument {
  return document as unknown as vscode.TextDocument;
}

function asUri(uri: MockUri): vscode.Uri {
  return uri as unknown as vscode.Uri;
}

function getCloseCallback(): CloseTextDocumentHandler {
  const closeCallback = vi.mocked(vscode.workspace.onDidCloseTextDocument).mock.calls[0]?.[0];
  if (closeCallback === undefined) {
    throw new Error(CLOSE_CALLBACK_ERROR);
  }
  return closeCallback;
}

// ---------------------------------------------------------------------------
// encodeDiffDocUri
// ---------------------------------------------------------------------------

describe("encodeDiffDocUri", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TC-001: constructs URI with correct scheme, path, and query params", () => {
    // Case: TC-001
    // Given: Valid repo, filePath, and commit
    const repo = "/path/to/repo";
    const filePath = "src/file.ts";
    const commit = "abc123";

    // When: encodeDiffDocUri is called
    const result = encodeDiffDocUri(repo, filePath, commit);

    // Then: URI has correct scheme, path from getPathFromStr, and encoded query params
    expect(result.scheme).toBe("git-keizu");
    expect(result.path).toBe("src/file.ts");
    expect(result.query).toContain("commit=abc123");
    expect(result.query).toContain("repo=%2Fpath%2Fto%2Frepo");
    expect(getPathFromStr).toHaveBeenCalledWith("src/file.ts");
  });

  it("TC-002: encodes space in commit value", () => {
    // Case: TC-002
    // Given: Commit containing a space character
    const repo = "/repo";
    const filePath = "dir/file.ts";
    const commit = "abc def";

    // When: encodeDiffDocUri is called
    const result = encodeDiffDocUri(repo, filePath, commit);

    // Then: Space in commit is percent-encoded as %20
    expect(result.query).toContain("commit=abc%20def");
  });

  it("TC-003: handles empty repo string", () => {
    // Case: TC-003
    // Given: Empty repo string (no input validation in source)
    const repo = "";
    const filePath = "src/file.ts";
    const commit = "abc";

    // When: encodeDiffDocUri is called
    const result = encodeDiffDocUri(repo, filePath, commit);

    // Then: Query contains repo= with empty value
    expect(result.query).toMatch(/repo=(&|$)/);
  });

  it("TC-004: handles empty filePath string", () => {
    // Case: TC-004
    // Given: Empty filePath string
    const repo = "/repo";
    const filePath = "";
    const commit = "abc";

    // When: encodeDiffDocUri is called
    const result = encodeDiffDocUri(repo, filePath, commit);

    // Then: Path is the result of getPathFromStr("") which returns ""
    expect(result.path).toBe("");
    expect(getPathFromStr).toHaveBeenCalledWith("");
  });

  it("TC-005: handles empty commit string", () => {
    // Case: TC-005
    // Given: Empty commit string (no input validation in source)
    const repo = "/repo";
    const filePath = "src/file.ts";
    const commit = "";

    // When: encodeDiffDocUri is called
    const result = encodeDiffDocUri(repo, filePath, commit);

    // Then: Query contains commit= with empty value followed by &
    expect(result.query).toMatch(/commit=&/);
  });

  it("TC-006: encodes URI special characters in repo", () => {
    // Case: TC-006
    // Given: Repo path containing URI special characters ?, &, =
    const repo = "/path?q=1&x=2";
    const filePath = "file.ts";
    const commit = "abc";

    // When: encodeDiffDocUri is called
    const result = encodeDiffDocUri(repo, filePath, commit);

    // Then: Special characters are percent-encoded in repo value
    expect(result.query).toContain("%3F"); // ? → %3F
    expect(result.query).toContain("%26"); // & → %26
    expect(result.query).toContain("%3D"); // = → %3D
  });

  it("TC-007: preserves space in filePath via getPathFromStr", () => {
    // Case: TC-007
    // Given: filePath containing a space
    const repo = "/repo";
    const filePath = "dir/my file.ts";
    const commit = "abc";

    // When: encodeDiffDocUri is called
    const result = encodeDiffDocUri(repo, filePath, commit);

    // Then: Path reflects getPathFromStr result with space preserved
    expect(result.path).toBe("dir/my file.ts");
    expect(getPathFromStr).toHaveBeenCalledWith("dir/my file.ts");
  });

  it("TC-008: normalizes backslash in filePath via getPathFromStr", () => {
    // Case: TC-008
    // Given: filePath with Windows-style backslash
    const repo = "/repo";
    const filePath = "dir\\file.ts";
    const commit = "abc";

    // When: encodeDiffDocUri is called
    const result = encodeDiffDocUri(repo, filePath, commit);

    // Then: Backslash is normalized to forward slash by getPathFromStr
    expect(result.path).toBe("dir/file.ts");
    expect(getPathFromStr).toHaveBeenCalledWith("dir\\file.ts");
  });

  it("TC-009: handles full 40-character SHA hash commit", () => {
    // Case: TC-009
    // Given: Full SHA-1 hash (40 hex characters) as commit
    const repo = "/repo";
    const filePath = "file.ts";
    const fullHash = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

    // When: encodeDiffDocUri is called
    const result = encodeDiffDocUri(repo, filePath, fullHash);

    // Then: Full hash is preserved as-is in query
    expect(result.query).toContain(`commit=${fullHash}`);
  });
});

// ---------------------------------------------------------------------------
// decodeDiffDocUri
// ---------------------------------------------------------------------------

describe("decodeDiffDocUri", () => {
  it("TC-010: decodes standard URI with commit and repo", () => {
    // Case: TC-010
    // Given: URI with valid commit and repo query params
    const uri = {
      query: "commit=abc123&repo=%2Fpath%2Fto%2Frepo",
      path: "/src/file.ts"
    };

    // When: decodeDiffDocUri is called
    const result = decodeDiffDocUri(asUri(uri));

    // Then: All fields are correctly decoded
    expect(result).toEqual({
      filePath: "/src/file.ts",
      commit: "abc123",
      repo: "/path/to/repo"
    });
  });

  it("TC-011: decodes percent-encoded space in commit", () => {
    // Case: TC-011
    // Given: URI with percent-encoded space in commit value
    const uri = {
      query: "commit=abc%20def&repo=%2Frepo",
      path: "/file.ts"
    };

    // When: decodeDiffDocUri is called
    const result = decodeDiffDocUri(asUri(uri));

    // Then: %20 is decoded to space
    expect(result).toEqual({
      filePath: "/file.ts",
      commit: "abc def",
      repo: "/repo"
    });
  });

  it("TC-012: returns undefined for commit and repo when query is empty", () => {
    // Case: TC-012
    // Given: URI with empty query string
    const uri = { query: "", path: "/file.ts" };

    // When: decodeDiffDocUri is called
    const result = decodeDiffDocUri(asUri(uri));

    // Then: filePath is set, commit and repo are undefined
    expect(result.filePath).toBe("/file.ts");
    expect(result.commit).toBeUndefined();
    expect(result.repo).toBeUndefined();
  });

  it("TC-013: returns undefined repo when repo key is absent", () => {
    // Case: TC-013
    // Given: URI with only commit in query (no repo key)
    const uri = { query: "commit=abc", path: "/file.ts" };

    // When: decodeDiffDocUri is called
    const result = decodeDiffDocUri(asUri(uri));

    // Then: commit is decoded, repo is undefined
    expect(result).toEqual({
      filePath: "/file.ts",
      commit: "abc",
      repo: undefined
    });
  });

  it("TC-014: returns undefined commit when commit key is absent", () => {
    // Case: TC-014
    // Given: URI with only repo in query (no commit key)
    const uri = { query: "repo=%2Frepo", path: "/file.ts" };

    // When: decodeDiffDocUri is called
    const result = decodeDiffDocUri(asUri(uri));

    // Then: repo is decoded, commit is undefined
    expect(result).toEqual({
      filePath: "/file.ts",
      commit: undefined,
      repo: "/repo"
    });
  });

  it("TC-015: handles query key without equals sign gracefully", () => {
    // Case: TC-015
    // Given: URI query "key" (no "=" sign); pair[1] is undefined → empty string fallback
    const uri = { query: "key", path: "/file.ts" };

    // When: decodeDiffDocUri is called
    const result = decodeDiffDocUri(asUri(uri));

    // Then: No error; commit and repo remain undefined
    expect(result.filePath).toBe("/file.ts");
    expect(result.commit).toBeUndefined();
    expect(result.repo).toBeUndefined();
  });

  it("TC-016: returns empty string for commit with empty value", () => {
    // Case: TC-016
    // Given: URI with commit= (empty value after =)
    const uri = { query: "commit=&repo=%2Frepo", path: "/file.ts" };

    // When: decodeDiffDocUri is called
    const result = decodeDiffDocUri(asUri(uri));

    // Then: commit is empty string (not undefined), repo is decoded
    expect(result).toEqual({
      filePath: "/file.ts",
      commit: "",
      repo: "/repo"
    });
  });

  it("TC-017: last value wins for duplicate query keys", () => {
    // Case: TC-017
    // Given: URI with duplicate "commit" keys (verifies L75 for-loop overwrite behavior)
    const uri = { query: "commit=first&commit=second", path: "/file.ts" };

    // When: decodeDiffDocUri is called
    const result = decodeDiffDocUri(asUri(uri));

    // Then: Last value ("second") wins for duplicate keys
    expect(result.commit).toBe("second");
  });

  it("TC-018: handles empty path", () => {
    // Case: TC-018
    // Given: URI with empty path
    const uri = { query: "commit=abc&repo=%2Frepo", path: "" };

    // When: decodeDiffDocUri is called
    const result = decodeDiffDocUri(asUri(uri));

    // Then: filePath is empty string
    expect(result).toEqual({
      filePath: "",
      commit: "abc",
      repo: "/repo"
    });
  });

  it("TC-019: decodes special characters in commit value", () => {
    // Case: TC-019
    // Given: URI with encoded special characters %20 (space), %26 (&), %3D (=) in commit
    const uri = {
      query: "commit=%20%26%3D&repo=%2Frepo",
      path: "/file.ts"
    };

    // When: decodeDiffDocUri is called
    const result = decodeDiffDocUri(asUri(uri));

    // Then: Special characters are decoded: space, &, =
    expect(result).toEqual({
      filePath: "/file.ts",
      commit: " &=",
      repo: "/repo"
    });
  });
});

// ---------------------------------------------------------------------------
// DiffDocProvider
// ---------------------------------------------------------------------------

describe("DiffDocProvider", () => {
  let mockDataSource: MockDataSource;
  let provider: DiffDocProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDataSource = { getCommitFile: vi.fn() };
    provider = new DiffDocProvider(asDataSource(mockDataSource));
  });

  // -------------------------------------------------------------------------
  // constructor
  // -------------------------------------------------------------------------

  describe("constructor", () => {
    it("TC-020: subscribes to onDidCloseTextDocument with empty cache", () => {
      // Case: TC-020
      // Given: Valid DataSource mock
      const mockOnClose = vi.mocked(vscode.workspace.onDidCloseTextDocument);

      // When: DiffDocProvider is constructed (done in beforeEach)

      // Then: onDidCloseTextDocument was called with a callback function
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(typeof mockOnClose.mock.calls[0][0]).toBe("function");
    });

    it("TC-021: evicts cache entry when document is closed", async () => {
      // Case: TC-021
      // Given: A document is cached via provideTextDocumentContent
      const uriStr = "git-keizu:/src/file.ts?commit=abc123&repo=%2Frepo";
      const mockUri = {
        query: "commit=abc123&repo=%2Frepo",
        path: "/src/file.ts",
        toString: () => uriStr
      };
      mockDataSource.getCommitFile.mockResolvedValue("file content");
      await provider.provideTextDocumentContent(asUri(mockUri));
      expect(mockDataSource.getCommitFile).toHaveBeenCalledTimes(1);

      // When: The matching document is closed
      const closeCallback = getCloseCallback();
      closeCallback(asTextDocument({ uri: { path: "", query: "", toString: () => uriStr } }));

      // Then: Next access fetches from DataSource again (cache was evicted)
      mockDataSource.getCommitFile.mockResolvedValue("new content");
      const result = await provider.provideTextDocumentContent(asUri(mockUri));
      expect(mockDataSource.getCommitFile).toHaveBeenCalledTimes(2);
      expect(result).toBe("new content");
    });

    it("TC-022: no error when closing document not in cache", () => {
      // Case: TC-022
      // Given: DiffDocProvider with empty cache
      const closeCallback = getCloseCallback();

      // When: Close callback fires for a URI not in cache
      const mockDoc = asTextDocument({
        uri: { path: "", query: "", toString: () => "git-keizu:nonexistent" }
      });

      // Then: No error is thrown
      expect(() => closeCallback(mockDoc)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // dispose
  // -------------------------------------------------------------------------

  describe("dispose", () => {
    it("TC-023: disposes all resources with cached entries", async () => {
      // Case: TC-023
      // Given: DiffDocProvider with 2 cached documents
      const uri1 = {
        query: "commit=a&repo=%2Frepo",
        path: "/file1.ts",
        toString: () => "uri1"
      };
      const uri2 = {
        query: "commit=b&repo=%2Frepo",
        path: "/file2.ts",
        toString: () => "uri2"
      };
      mockDataSource.getCommitFile
        .mockResolvedValueOnce("content1")
        .mockResolvedValueOnce("content2");
      await provider.provideTextDocumentContent(asUri(uri1));
      await provider.provideTextDocumentContent(asUri(uri2));

      const mockOnClose = vi.mocked(vscode.workspace.onDidCloseTextDocument);
      const subscriptionDisposable = mockOnClose.mock.results[0].value;
      const emitterInstance = vi.mocked(vscode.EventEmitter).mock.results[0].value;

      // When: dispose() is called
      provider.dispose();

      // Then: subscription and eventEmitter are disposed
      expect(subscriptionDisposable.dispose).toHaveBeenCalledTimes(1);
      expect(emitterInstance.dispose).toHaveBeenCalledTimes(1);
    });

    it("TC-024: disposes resources safely when cache is empty", () => {
      // Case: TC-024
      // Given: DiffDocProvider with empty cache
      const mockOnClose = vi.mocked(vscode.workspace.onDidCloseTextDocument);
      const subscriptionDisposable = mockOnClose.mock.results[0].value;
      const emitterInstance = vi.mocked(vscode.EventEmitter).mock.results[0].value;

      // When: dispose() is called on empty cache
      provider.dispose();

      // Then: All disposals complete without error
      expect(subscriptionDisposable.dispose).toHaveBeenCalledTimes(1);
      expect(emitterInstance.dispose).toHaveBeenCalledTimes(1);
    });

    it("TC-025: clears all cache entries on dispose", async () => {
      // Case: TC-025
      // Given: DiffDocProvider with multiple cached documents
      const uri1 = {
        query: "commit=a&repo=%2Frepo",
        path: "/file1.ts",
        toString: () => "uri1"
      };
      const uri2 = {
        query: "commit=b&repo=%2Frepo",
        path: "/file2.ts",
        toString: () => "uri2"
      };
      mockDataSource.getCommitFile
        .mockResolvedValueOnce("content1")
        .mockResolvedValueOnce("content2");
      await provider.provideTextDocumentContent(asUri(uri1));
      await provider.provideTextDocumentContent(asUri(uri2));

      // When: dispose() is called
      provider.dispose();

      // Then: Cache is cleared — re-fetching hits DataSource again
      mockDataSource.getCommitFile.mockResolvedValueOnce("fresh");
      const result = await provider.provideTextDocumentContent(asUri(uri1));
      expect(result).toBe("fresh");
      expect(mockDataSource.getCommitFile).toHaveBeenCalledTimes(3);
    });
  });

  // -------------------------------------------------------------------------
  // provideTextDocumentContent
  // -------------------------------------------------------------------------

  describe("provideTextDocumentContent", () => {
    it("TC-026: fetches and caches content on first access", async () => {
      // Case: TC-026
      // Given: Cache miss for the requested URI
      const mockUri = {
        query: "commit=abc123&repo=%2Frepo",
        path: "/src/file.ts",
        toString: () => "git-keizu:/src/file.ts?commit=abc123&repo=%2Frepo"
      };
      mockDataSource.getCommitFile.mockResolvedValue("file content");

      // When: provideTextDocumentContent is called
      const result = await provider.provideTextDocumentContent(asUri(mockUri));

      // Then: getCommitFile is called with decoded params and result is returned
      expect(mockDataSource.getCommitFile).toHaveBeenCalledTimes(1);
      expect(mockDataSource.getCommitFile).toHaveBeenCalledWith("/repo", "abc123", "/src/file.ts");
      expect(result).toBe("file content");
    });

    it("TC-027: returns cached content without calling getCommitFile", async () => {
      // Case: TC-027
      // Given: URI already cached with "cached content"
      const mockUri = {
        query: "commit=abc123&repo=%2Frepo",
        path: "/src/file.ts",
        toString: () => "git-keizu:/src/file.ts?commit=abc123&repo=%2Frepo"
      };
      mockDataSource.getCommitFile.mockResolvedValue("cached content");
      await provider.provideTextDocumentContent(asUri(mockUri));

      // When: Same URI is requested again
      mockDataSource.getCommitFile.mockClear();
      const result = await provider.provideTextDocumentContent(asUri(mockUri));

      // Then: Cached value is returned, getCommitFile is NOT called again
      expect(mockDataSource.getCommitFile).not.toHaveBeenCalled();
      expect(result).toBe("cached content");
    });

    it("TC-028: caches and returns empty string content", async () => {
      // Case: TC-028
      // Given: Cache miss, getCommitFile returns empty string
      const mockUri = {
        query: "commit=abc&repo=%2Frepo",
        path: "/file.ts",
        toString: () => "git-keizu:/file.ts?commit=abc&repo=%2Frepo"
      };
      mockDataSource.getCommitFile.mockResolvedValue("");

      // When: provideTextDocumentContent is called
      const result = await provider.provideTextDocumentContent(asUri(mockUri));

      // Then: Empty string is returned and cached
      expect(result).toBe("");
      mockDataSource.getCommitFile.mockClear();
      const cachedResult = await provider.provideTextDocumentContent(asUri(mockUri));
      expect(cachedResult).toBe("");
      expect(mockDataSource.getCommitFile).not.toHaveBeenCalled();
    });

    it("TC-029: rejects when getCommitFile fails", async () => {
      // Case: TC-029
      // Given: Cache miss, getCommitFile rejects with an Error
      const mockUri = {
        query: "commit=abc&repo=%2Frepo",
        path: "/file.ts",
        toString: () => "git-keizu:/file.ts?commit=abc&repo=%2Frepo"
      };
      mockDataSource.getCommitFile.mockRejectedValue(new Error("git error"));

      // When: provideTextDocumentContent is called
      // Then: Promise rejects with the same error (no try-catch in source)
      await expect(provider.provideTextDocumentContent(asUri(mockUri))).rejects.toThrow(Error);
      await expect(provider.provideTextDocumentContent(asUri(mockUri))).rejects.toThrow(
        "git error"
      );
    });
  });

  // -------------------------------------------------------------------------
  // onDidChange
  // -------------------------------------------------------------------------

  describe("onDidChange", () => {
    it("TC-030: returns the EventEmitter's event", () => {
      // Case: TC-030
      // Given: DiffDocProvider instance
      const emitterInstance = vi.mocked(vscode.EventEmitter).mock.results[0].value;

      // When: onDidChange getter is accessed
      const event = provider.onDidChange;

      // Then: Returns the EventEmitter's event property
      expect(event).toBe(emitterInstance.event);
    });
  });
});
