import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  postMessage: vi.fn(),
  applyStash: vi.fn(),
  popStash: vi.fn(),
  dropStash: vi.fn(),
  branchFromStash: vi.fn(),
  pushStash: vi.fn(),
  resetUncommitted: vi.fn(),
  cleanUntrackedFiles: vi.fn(),
  getCommitComparison: vi.fn(),
  executeCommand: vi.fn(),
  encodeDiffDocUri: vi.fn(),
  mute: vi.fn(),
  unmute: vi.fn(),
  getRepos: vi.fn(),
  messageHandler: { current: null as ((msg: unknown) => Promise<void>) | null }
}));

vi.mock("vscode", () => ({
  window: {
    createWebviewPanel: vi.fn(() => ({
      webview: {
        onDidReceiveMessage: vi.fn((handler: (msg: unknown) => Promise<void>) => {
          mocks.messageHandler.current = handler;
        }),
        postMessage: mocks.postMessage,
        asWebviewUri: vi.fn((uri: unknown) => uri),
        cspSource: "test-csp",
        html: ""
      },
      onDidDispose: vi.fn(),
      onDidChangeViewState: vi.fn(),
      reveal: vi.fn(),
      visible: true,
      iconPath: null,
      dispose: vi.fn()
    })),
    activeTextEditor: undefined
  },
  Uri: {
    file: vi.fn((p: string) => ({ fsPath: p, toString: () => p }))
  },
  ViewColumn: { One: 1 },
  commands: { executeCommand: mocks.executeCommand }
}));

vi.mock("node:crypto", () => ({
  randomBytes: vi.fn(() => ({ toString: () => "test-nonce" }))
}));

vi.mock("../../src/config", () => ({
  getConfig: vi.fn(() => ({
    gitPath: () => "git",
    dateType: () => "Author Date",
    showUncommittedChanges: () => false,
    tabIconColourTheme: () => "colour",
    autoCenterCommitDetailsView: () => false,
    dateFormat: () => "Date & Time",
    fetchAvatars: () => false,
    graphColours: () => ["#0085d9"],
    graphStyle: () => "rounded",
    initialLoadCommits: () => 300,
    loadMoreCommits: () => 100,
    showCurrentBranchByDefault: () => false
  }))
}));

vi.mock("../../src/repoFileWatcher", () => {
  function MockRepoFileWatcher() {
    return {
      mute: mocks.mute,
      unmute: mocks.unmute,
      start: vi.fn(),
      stop: vi.fn()
    };
  }
  return { RepoFileWatcher: MockRepoFileWatcher };
});

vi.mock("../../src/diffDocProvider", () => ({
  encodeDiffDocUri: mocks.encodeDiffDocUri
}));

vi.mock("../../src/utils", () => ({
  abbrevCommit: vi.fn((h: string) => h.substring(0, 8)),
  copyToClipboard: vi.fn()
}));

import type { AvatarManager } from "../../src/avatarManager";
import type { DataSource } from "../../src/dataSource";
import type { ExtensionState } from "../../src/extensionState";
import { GitGraphView } from "../../src/gitGraphView";
import type { RepoManager } from "../../src/repoManager";

const TEST_REPO = "/test/repo";

describe("GitGraphView stash message routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitGraphView.currentPanel = undefined;

    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    mocks.applyStash.mockResolvedValue(null);
    mocks.popStash.mockResolvedValue(null);
    mocks.dropStash.mockResolvedValue(null);
    mocks.branchFromStash.mockResolvedValue(null);
    mocks.pushStash.mockResolvedValue(null);
    mocks.resetUncommitted.mockResolvedValue(null);
    mocks.cleanUntrackedFiles.mockResolvedValue(null);
    mocks.getCommitComparison.mockResolvedValue(null);
    mocks.executeCommand.mockResolvedValue(undefined);
    mocks.encodeDiffDocUri.mockImplementation(
      (_repo: string, filePath: string, commit: string) => ({
        toString: () => `git-keizu:${filePath}?commit=${commit}`
      })
    );

    const mockDataSource = {
      applyStash: mocks.applyStash,
      popStash: mocks.popStash,
      dropStash: mocks.dropStash,
      branchFromStash: mocks.branchFromStash,
      pushStash: mocks.pushStash,
      resetUncommitted: mocks.resetUncommitted,
      cleanUntrackedFiles: mocks.cleanUntrackedFiles,
      getCommitComparison: mocks.getCommitComparison
    } as unknown as DataSource;

    const mockExtensionState = {
      getLastActiveRepo: vi.fn(() => null),
      isAvatarStorageAvailable: vi.fn(() => false),
      setLastActiveRepo: vi.fn()
    } as unknown as ExtensionState;

    const mockAvatarManager = {
      registerView: vi.fn(),
      deregisterView: vi.fn()
    } as unknown as AvatarManager;

    const mockRepoManager = {
      getRepos: mocks.getRepos,
      registerViewCallback: vi.fn(),
      deregisterViewCallback: vi.fn(),
      setRepoState: vi.fn(),
      checkReposExist: vi.fn()
    } as unknown as RepoManager;

    GitGraphView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  });

  afterEach(() => {
    GitGraphView.currentPanel?.dispose();
    GitGraphView.currentPanel = undefined;
  });

  it("routes applyStash message to DataSource.applyStash (TC-BS-N-07)", async () => {
    // Given: GitGraphView instance with mocked DataSource
    // When: RequestApplyStash message is received
    await mocks.messageHandler.current!({
      command: "applyStash",
      repo: TEST_REPO,
      selector: "stash@{0}",
      reinstateIndex: true
    });

    // Then: DataSource.applyStash is called with correct arguments
    expect(mocks.applyStash).toHaveBeenCalledTimes(1);
    expect(mocks.applyStash).toHaveBeenCalledWith(TEST_REPO, "stash@{0}", true);
    expect(mocks.mute).toHaveBeenCalled();
    expect(mocks.unmute).toHaveBeenCalled();
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "applyStash",
      status: null
    });
  });

  it("routes popStash message to DataSource.popStash (TC-BS-N-08)", async () => {
    // Given: GitGraphView instance with mocked DataSource
    // When: RequestPopStash message is received
    await mocks.messageHandler.current!({
      command: "popStash",
      repo: TEST_REPO,
      selector: "stash@{1}",
      reinstateIndex: false
    });

    // Then: DataSource.popStash is called with correct arguments
    expect(mocks.popStash).toHaveBeenCalledTimes(1);
    expect(mocks.popStash).toHaveBeenCalledWith(TEST_REPO, "stash@{1}", false);
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "popStash",
      status: null
    });
  });

  it("routes dropStash message to DataSource.dropStash (TC-BS-N-09)", async () => {
    // Given: GitGraphView instance with mocked DataSource
    // When: RequestDropStash message is received
    await mocks.messageHandler.current!({
      command: "dropStash",
      repo: TEST_REPO,
      selector: "stash@{2}"
    });

    // Then: DataSource.dropStash is called with correct arguments
    expect(mocks.dropStash).toHaveBeenCalledTimes(1);
    expect(mocks.dropStash).toHaveBeenCalledWith(TEST_REPO, "stash@{2}");
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "dropStash",
      status: null
    });
  });

  it("routes branchFromStash message to DataSource.branchFromStash (TC-BS-N-10)", async () => {
    // Given: GitGraphView instance with mocked DataSource
    // When: RequestBranchFromStash message is received
    await mocks.messageHandler.current!({
      command: "branchFromStash",
      repo: TEST_REPO,
      branchName: "my-feature",
      selector: "stash@{0}"
    });

    // Then: DataSource.branchFromStash is called with correct arguments
    expect(mocks.branchFromStash).toHaveBeenCalledTimes(1);
    expect(mocks.branchFromStash).toHaveBeenCalledWith(TEST_REPO, "my-feature", "stash@{0}");
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "branchFromStash",
      status: null
    });
  });

  it("routes pushStash message to DataSource.pushStash (TC-BU-N-08)", async () => {
    // Given: GitGraphView instance with mocked DataSource
    // When: RequestPushStash message is received
    await mocks.messageHandler.current!({
      command: "pushStash",
      repo: TEST_REPO,
      message: "WIP changes",
      includeUntracked: true
    });

    // Then: DataSource.pushStash is called with correct arguments
    expect(mocks.pushStash).toHaveBeenCalledTimes(1);
    expect(mocks.pushStash).toHaveBeenCalledWith(TEST_REPO, "WIP changes", true);
    expect(mocks.mute).toHaveBeenCalled();
    expect(mocks.unmute).toHaveBeenCalled();
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "pushStash",
      status: null
    });
  });

  it("routes resetUncommitted message to DataSource.resetUncommitted (TC-BU-N-09)", async () => {
    // Given: GitGraphView instance with mocked DataSource
    // When: RequestResetUncommitted message is received
    await mocks.messageHandler.current!({
      command: "resetUncommitted",
      repo: TEST_REPO,
      mode: "mixed"
    });

    // Then: DataSource.resetUncommitted is called with correct arguments
    expect(mocks.resetUncommitted).toHaveBeenCalledTimes(1);
    expect(mocks.resetUncommitted).toHaveBeenCalledWith(TEST_REPO, "mixed");
    expect(mocks.mute).toHaveBeenCalled();
    expect(mocks.unmute).toHaveBeenCalled();
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "resetUncommitted",
      status: null
    });
  });

  it("routes cleanUntrackedFiles message to DataSource.cleanUntrackedFiles (TC-BU-N-10)", async () => {
    // Given: GitGraphView instance with mocked DataSource
    // When: RequestCleanUntrackedFiles message is received
    await mocks.messageHandler.current!({
      command: "cleanUntrackedFiles",
      repo: TEST_REPO,
      directories: true
    });

    // Then: DataSource.cleanUntrackedFiles is called with correct arguments
    expect(mocks.cleanUntrackedFiles).toHaveBeenCalledTimes(1);
    expect(mocks.cleanUntrackedFiles).toHaveBeenCalledWith(TEST_REPO, true);
    expect(mocks.mute).toHaveBeenCalled();
    expect(mocks.unmute).toHaveBeenCalled();
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "cleanUntrackedFiles",
      status: null
    });
  });
});

describe("GitGraphView compareCommits message routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitGraphView.currentPanel = undefined;

    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    mocks.getCommitComparison.mockResolvedValue(null);
    mocks.executeCommand.mockResolvedValue(undefined);
    mocks.encodeDiffDocUri.mockImplementation(
      (_repo: string, filePath: string, commit: string) => ({
        toString: () => `git-keizu:${filePath}?commit=${commit}`
      })
    );

    const mockDataSource = {
      applyStash: mocks.applyStash,
      popStash: mocks.popStash,
      dropStash: mocks.dropStash,
      branchFromStash: mocks.branchFromStash,
      pushStash: mocks.pushStash,
      resetUncommitted: mocks.resetUncommitted,
      cleanUntrackedFiles: mocks.cleanUntrackedFiles,
      getCommitComparison: mocks.getCommitComparison
    } as unknown as DataSource;

    const mockExtensionState = {
      getLastActiveRepo: vi.fn(() => null),
      isAvatarStorageAvailable: vi.fn(() => false),
      setLastActiveRepo: vi.fn()
    } as unknown as ExtensionState;

    const mockAvatarManager = {
      registerView: vi.fn(),
      deregisterView: vi.fn()
    } as unknown as AvatarManager;

    const mockRepoManager = {
      getRepos: mocks.getRepos,
      registerViewCallback: vi.fn(),
      deregisterViewCallback: vi.fn(),
      setRepoState: vi.fn(),
      checkReposExist: vi.fn()
    } as unknown as RepoManager;

    GitGraphView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  });

  afterEach(() => {
    GitGraphView.currentPanel?.dispose();
    GitGraphView.currentPanel = undefined;
  });

  it("routes compareCommits message to DataSource.getCommitComparison with correct args (TC-MR-N-01)", async () => {
    // Given: GitGraphView instance with mocked DataSource
    const fromHash = "abc1234567890abcdef1234567890abcdef123456";
    const toHash = "def4567890abcdef1234567890abcdef12345678";

    // When: RequestCompareCommits message is received
    await mocks.messageHandler.current!({
      command: "compareCommits",
      repo: TEST_REPO,
      fromHash,
      toHash
    });

    // Then: DataSource.getCommitComparison is called with repo, fromHash, toHash
    expect(mocks.getCommitComparison).toHaveBeenCalledTimes(1);
    expect(mocks.getCommitComparison).toHaveBeenCalledWith(TEST_REPO, fromHash, toHash);
  });

  it("returns ResponseCompareCommits with fileChanges when comparison succeeds (TC-MR-N-02)", async () => {
    // Given: getCommitComparison returns a file change array
    const fromHash = "abc1234567890abcdef1234567890abcdef123456";
    const toHash = "def4567890abcdef1234567890abcdef12345678";
    const fileChanges = [
      {
        oldFilePath: "src/file.ts",
        newFilePath: "src/file.ts",
        type: "M" as const,
        additions: 10,
        deletions: 5
      }
    ];
    mocks.getCommitComparison.mockResolvedValue(fileChanges);

    // When: RequestCompareCommits message is received
    await mocks.messageHandler.current!({
      command: "compareCommits",
      repo: TEST_REPO,
      fromHash,
      toHash
    });

    // Then: ResponseCompareCommits is sent with correct fileChanges, fromHash, toHash
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "compareCommits",
      fileChanges,
      fromHash,
      toHash
    });
  });

  it("returns ResponseCompareCommits with null fileChanges when comparison fails (TC-MR-A-01)", async () => {
    // Given: getCommitComparison returns null (error case)
    const fromHash = "abc1234567890abcdef1234567890abcdef123456";
    const toHash = "def4567890abcdef1234567890abcdef12345678";
    mocks.getCommitComparison.mockResolvedValue(null);

    // When: RequestCompareCommits message is received
    await mocks.messageHandler.current!({
      command: "compareCommits",
      repo: TEST_REPO,
      fromHash,
      toHash
    });

    // Then: ResponseCompareCommits is sent with null fileChanges
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "compareCommits",
      fileChanges: null,
      fromHash,
      toHash
    });
  });
});

describe("GitGraphView viewDiff with compareWithHash", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitGraphView.currentPanel = undefined;

    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    mocks.getCommitComparison.mockResolvedValue(null);
    mocks.executeCommand.mockResolvedValue(undefined);
    mocks.encodeDiffDocUri.mockImplementation(
      (_repo: string, filePath: string, commit: string) => ({
        toString: () => `git-keizu:${filePath}?commit=${commit}`
      })
    );

    const mockDataSource = {
      applyStash: mocks.applyStash,
      popStash: mocks.popStash,
      dropStash: mocks.dropStash,
      branchFromStash: mocks.branchFromStash,
      pushStash: mocks.pushStash,
      resetUncommitted: mocks.resetUncommitted,
      cleanUntrackedFiles: mocks.cleanUntrackedFiles,
      getCommitComparison: mocks.getCommitComparison
    } as unknown as DataSource;

    const mockExtensionState = {
      getLastActiveRepo: vi.fn(() => null),
      isAvatarStorageAvailable: vi.fn(() => false),
      setLastActiveRepo: vi.fn()
    } as unknown as ExtensionState;

    const mockAvatarManager = {
      registerView: vi.fn(),
      deregisterView: vi.fn()
    } as unknown as AvatarManager;

    const mockRepoManager = {
      getRepos: mocks.getRepos,
      registerViewCallback: vi.fn(),
      deregisterViewCallback: vi.fn(),
      setRepoState: vi.fn(),
      checkReposExist: vi.fn()
    } as unknown as RepoManager;

    GitGraphView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  });

  afterEach(() => {
    GitGraphView.currentPanel?.dispose();
    GitGraphView.currentPanel = undefined;
  });

  it("generates correct URIs for two-commit comparison when compareWithHash is specified (TC-MR-N-03)", async () => {
    // Given: viewDiff message with compareWithHash
    const commitHash = "abc1234567890abcdef1234567890abcdef123456";
    const compareWithHash = "def4567890abcdef1234567890abcdef12345678";

    // When: RequestViewDiff message with compareWithHash is received
    await mocks.messageHandler.current!({
      command: "viewDiff",
      repo: TEST_REPO,
      commitHash,
      oldFilePath: "src/old.ts",
      newFilePath: "src/new.ts",
      type: "M",
      compareWithHash
    });

    // Then: encodeDiffDocUri is called for both left (fromHash) and right (compareWithHash) URIs
    expect(mocks.encodeDiffDocUri).toHaveBeenCalledTimes(2);
    expect(mocks.encodeDiffDocUri).toHaveBeenCalledWith(TEST_REPO, "src/old.ts", commitHash);
    expect(mocks.encodeDiffDocUri).toHaveBeenCalledWith(TEST_REPO, "src/new.ts", compareWithHash);

    // Then: vscode.diff command is executed with the generated URIs
    expect(mocks.executeCommand).toHaveBeenCalledTimes(1);
    expect(mocks.executeCommand).toHaveBeenCalledWith(
      "vscode.diff",
      expect.objectContaining({ toString: expect.any(Function) }),
      expect.objectContaining({ toString: expect.any(Function) }),
      expect.stringContaining("↔"),
      { preview: true }
    );

    // Then: Response indicates success
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "viewDiff",
      success: true
    });
  });

  it("maintains existing behavior when compareWithHash is not specified (TC-MR-N-04)", async () => {
    // Given: viewDiff message without compareWithHash (standard parent comparison)
    const commitHash = "abc1234567890abcdef1234567890abcdef123456";

    // When: RequestViewDiff message without compareWithHash is received
    await mocks.messageHandler.current!({
      command: "viewDiff",
      repo: TEST_REPO,
      commitHash,
      oldFilePath: "src/file.ts",
      newFilePath: "src/file.ts",
      type: "M"
    });

    // Then: encodeDiffDocUri is called with commitHash^ and commitHash (parent comparison)
    expect(mocks.encodeDiffDocUri).toHaveBeenCalledTimes(2);
    expect(mocks.encodeDiffDocUri).toHaveBeenCalledWith(TEST_REPO, "src/file.ts", `${commitHash}^`);
    expect(mocks.encodeDiffDocUri).toHaveBeenCalledWith(TEST_REPO, "src/file.ts", commitHash);

    // Then: Response indicates success
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "viewDiff",
      success: true
    });
  });
});
