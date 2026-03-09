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
  createBranch: vi.fn(),
  checkoutBranch: vi.fn(),
  deleteRemoteBranch: vi.fn(),
  rebaseBranch: vi.fn(),
  deleteBranch: vi.fn(),
  getCommits: vi.fn(),
  executeCommand: vi.fn(),
  encodeDiffDocUri: vi.fn(),
  mute: vi.fn(),
  unmute: vi.fn(),
  getRepos: vi.fn(),
  mergeBranch: vi.fn(),
  mergeCommit: vi.fn(),
  cherrypickCommit: vi.fn(),
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
    dateFormat: () => "Date & Time",
    fetchAvatars: () => false,
    graphColours: () => ["#0085d9"],
    graphStyle: () => "rounded",
    initialLoadCommits: () => 300,
    keyboardShortcutFind: () => "f",
    keyboardShortcutRefresh: () => "r",
    keyboardShortcutScrollToHead: () => "h",
    keyboardShortcutScrollToStash: () => "s",
    loadMoreCommits: () => 100,
    loadMoreCommitsAutomatically: () => true,
    muteCommitsMergeCommits: () => true,
    muteCommitsNotAncestorsOfHead: () => false,
    showCurrentBranchByDefault: () => false,
    dialogDefaults: () => ({
      merge: { noFastForward: true, squashCommits: false, noCommit: false },
      cherryPick: { recordOrigin: false, noCommit: false },
      stashUncommittedChanges: { includeUntracked: false }
    })
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
  copyToClipboard: vi.fn(),
  getPathFromUri: vi.fn((uri: { fsPath: string }) => uri.fsPath)
}));

import * as vscode from "vscode";

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

  it("routes applyStash message to DataSource.applyStash (TC-001)", async () => {
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

  it("routes popStash message to DataSource.popStash (TC-002)", async () => {
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

  it("routes dropStash message to DataSource.dropStash (TC-003)", async () => {
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

  it("routes branchFromStash message to DataSource.branchFromStash (TC-004)", async () => {
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

  it("routes pushStash message to DataSource.pushStash (TC-005)", async () => {
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

  it("routes resetUncommitted message to DataSource.resetUncommitted (TC-006)", async () => {
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

  it("routes cleanUntrackedFiles message to DataSource.cleanUntrackedFiles (TC-007)", async () => {
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

  it("routes compareCommits message to DataSource.getCommitComparison with correct args (TC-008)", async () => {
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

  it("returns ResponseCompareCommits with fileChanges when comparison succeeds (TC-009)", async () => {
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

  it("returns ResponseCompareCommits with null fileChanges when comparison fails (TC-010)", async () => {
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

  it("generates correct URIs for two-commit comparison when compareWithHash is specified (TC-011)", async () => {
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

  it("maintains existing behavior when compareWithHash is not specified (TC-012)", async () => {
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

describe("GitGraphView pull/push message routing", () => {
  const pullMock = vi.fn();
  const pushMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitGraphView.currentPanel = undefined;

    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    pullMock.mockResolvedValue(null);
    pushMock.mockResolvedValue(null);

    const mockDataSource = {
      applyStash: mocks.applyStash,
      popStash: mocks.popStash,
      dropStash: mocks.dropStash,
      branchFromStash: mocks.branchFromStash,
      pushStash: mocks.pushStash,
      resetUncommitted: mocks.resetUncommitted,
      cleanUntrackedFiles: mocks.cleanUntrackedFiles,
      getCommitComparison: mocks.getCommitComparison,
      pull: pullMock,
      push: pushMock
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

  it("routes pull message to DataSource.pull and returns ResponsePull (TC-013)", async () => {
    // Given: GitGraphView instance with mocked DataSource
    // When: RequestPull message is received
    await mocks.messageHandler.current!({
      command: "pull",
      repo: TEST_REPO
    });

    // Then: DataSource.pull is called with correct repo and ResponsePull is sent
    expect(pullMock).toHaveBeenCalledTimes(1);
    expect(pullMock).toHaveBeenCalledWith(TEST_REPO);
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "pull",
      status: null
    });
  });

  it("routes push message to DataSource.push and returns ResponsePush (TC-014)", async () => {
    // Given: GitGraphView instance with mocked DataSource
    // When: RequestPush message is received
    await mocks.messageHandler.current!({
      command: "push",
      repo: TEST_REPO
    });

    // Then: DataSource.push is called with correct repo and ResponsePush is sent
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith(TEST_REPO);
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "push",
      status: null
    });
  });
});

describe("GitGraphView createOrShow rootUri handling (S6)", () => {
  const SCM_REPO = "/scm/repo/path";
  let mockSetLastActiveRepo: ReturnType<typeof vi.fn>;
  let mockRegisterRepoFromUri: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitGraphView.currentPanel = undefined;

    mockSetLastActiveRepo = vi.fn();
    mockRegisterRepoFromUri = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    GitGraphView.currentPanel?.dispose();
    GitGraphView.currentPanel = undefined;
  });

  function createDeps(reposMap: Record<string, unknown> = { [TEST_REPO]: "Test Repo" }) {
    mocks.getRepos.mockReturnValue(reposMap);

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
      setLastActiveRepo: mockSetLastActiveRepo
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
      checkReposExist: vi.fn(),
      registerRepoFromUri: mockRegisterRepoFromUri
    } as unknown as RepoManager;

    return { mockDataSource, mockExtensionState, mockAvatarManager, mockRepoManager };
  }

  it("sets lastActiveRepo from rootUri.fsPath when panel is new (TC-015)", () => {
    // Given: No existing panel, rootUri is specified
    const deps = createDeps();
    const rootUri = { fsPath: SCM_REPO } as unknown as import("vscode").Uri;

    // When: createOrShow is called with rootUri (first time, creates panel)
    GitGraphView.createOrShow(
      "/test/extension",
      deps.mockDataSource,
      deps.mockExtensionState,
      deps.mockAvatarManager,
      deps.mockRepoManager,
      rootUri
    );

    // Then: setLastActiveRepo is called with rootUri.fsPath
    expect(mockSetLastActiveRepo).toHaveBeenCalledTimes(1);
    expect(mockSetLastActiveRepo).toHaveBeenCalledWith(SCM_REPO);
  });

  it("sends ResponseSelectRepo when panel exists and repo is registered (TC-016)", () => {
    // Given: Panel already exists, SCM_REPO is in registered repos
    const deps = createDeps({ [TEST_REPO]: "Test Repo", [SCM_REPO]: "SCM Repo" });
    GitGraphView.createOrShow(
      "/test/extension",
      deps.mockDataSource,
      deps.mockExtensionState,
      deps.mockAvatarManager,
      deps.mockRepoManager
    );
    vi.clearAllMocks();

    // When: createOrShow is called again with rootUri for a registered repo
    const rootUri = { fsPath: SCM_REPO } as unknown as import("vscode").Uri;
    GitGraphView.createOrShow(
      "/test/extension",
      deps.mockDataSource,
      deps.mockExtensionState,
      deps.mockAvatarManager,
      deps.mockRepoManager,
      rootUri
    );

    // Then: ResponseSelectRepo is sent with the repo path (no registerRepoFromUri)
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "selectRepo",
      repo: SCM_REPO
    });
    expect(mockRegisterRepoFromUri).not.toHaveBeenCalled();
  });

  it("calls registerRepoFromUri then sends selectRepo when repo is unregistered (TC-017)", async () => {
    // Given: Panel already exists, SCM_REPO is NOT in registered repos
    const deps = createDeps({ [TEST_REPO]: "Test Repo" });
    GitGraphView.createOrShow(
      "/test/extension",
      deps.mockDataSource,
      deps.mockExtensionState,
      deps.mockAvatarManager,
      deps.mockRepoManager
    );
    vi.clearAllMocks();

    // When: createOrShow is called with rootUri for unregistered repo
    const rootUri = { fsPath: SCM_REPO } as unknown as import("vscode").Uri;
    GitGraphView.createOrShow(
      "/test/extension",
      deps.mockDataSource,
      deps.mockExtensionState,
      deps.mockAvatarManager,
      deps.mockRepoManager,
      rootUri
    );
    // Wait for async registerRepoFromUri to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Then: registerRepoFromUri is called with rootUri
    expect(mockRegisterRepoFromUri).toHaveBeenCalledTimes(1);
    expect(mockRegisterRepoFromUri).toHaveBeenCalledWith(rootUri);
    // And: ResponseSelectRepo is sent with the repo path
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "selectRepo",
      repo: SCM_REPO
    });
  });

  it("does not send selectRepo when rootUri is not specified (TC-018)", () => {
    // Given: Panel already exists
    const deps = createDeps();
    GitGraphView.createOrShow(
      "/test/extension",
      deps.mockDataSource,
      deps.mockExtensionState,
      deps.mockAvatarManager,
      deps.mockRepoManager
    );
    vi.clearAllMocks();

    // When: createOrShow is called without rootUri (command palette)
    GitGraphView.createOrShow(
      "/test/extension",
      deps.mockDataSource,
      deps.mockExtensionState,
      deps.mockAvatarManager,
      deps.mockRepoManager
    );

    // Then: no selectRepo message is sent
    const selectRepoCalls = mocks.postMessage.mock.calls.filter(
      (call: unknown[]) => (call[0] as Record<string, unknown>).command === "selectRepo"
    );
    expect(selectRepoCalls).toHaveLength(0);
  });
});

describe("GitGraphView viewState keybindings and loadMoreCommitsAutomatically (S7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitGraphView.currentPanel = undefined;
    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
  });

  afterEach(() => {
    GitGraphView.currentPanel?.dispose();
    GitGraphView.currentPanel = undefined;
  });

  function createPanel(): void {
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
  }

  function getPanelHtml(): string {
    const panelMock = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value as {
      webview: { html: string };
    };
    return panelMock.webview.html;
  }

  function parseViewState(html: string): Record<string, unknown> {
    const match = html.match(/var viewState = (.+?);/);
    expect(match).not.toBeNull();
    return JSON.parse(match![1]);
  }

  it("includes keybindings object in viewState (TC-019)", async () => {
    // Given: config returns keybinding values (f, r, h, s)
    // When: panel is created
    createPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Then: viewState in HTML contains keybindings from config
    const viewState = parseViewState(getPanelHtml());
    expect(viewState.keybindings).toEqual({
      find: "f",
      refresh: "r",
      scrollToHead: "h",
      scrollToStash: "s"
    });
  });

  it("includes loadMoreCommitsAutomatically in viewState (TC-020)", async () => {
    // Given: config returns loadMoreCommitsAutomatically = true
    // When: panel is created
    createPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Then: viewState in HTML contains loadMoreCommitsAutomatically
    const viewState = parseViewState(getPanelHtml());
    expect(viewState.loadMoreCommitsAutomatically).toBe(true);
  });
});

describe("GitGraphView deleteRemoteBranch/rebaseBranch message routing (S8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitGraphView.currentPanel = undefined;

    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    mocks.deleteRemoteBranch.mockResolvedValue(null);
    mocks.rebaseBranch.mockResolvedValue(null);

    const mockDataSource = {
      applyStash: mocks.applyStash,
      popStash: mocks.popStash,
      dropStash: mocks.dropStash,
      branchFromStash: mocks.branchFromStash,
      pushStash: mocks.pushStash,
      resetUncommitted: mocks.resetUncommitted,
      cleanUntrackedFiles: mocks.cleanUntrackedFiles,
      getCommitComparison: mocks.getCommitComparison,
      deleteRemoteBranch: mocks.deleteRemoteBranch,
      rebaseBranch: mocks.rebaseBranch
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

  it("routes deleteRemoteBranch message to DataSource.deleteRemoteBranch (TC-021)", async () => {
    // Given: GitGraphView instance with mocked DataSource
    // When: RequestDeleteRemoteBranch message is received
    await mocks.messageHandler.current!({
      command: "deleteRemoteBranch",
      repo: TEST_REPO,
      remoteName: "origin",
      branchName: "feature/x"
    });

    // Then: DataSource.deleteRemoteBranch is called with correct arguments
    expect(mocks.deleteRemoteBranch).toHaveBeenCalledTimes(1);
    expect(mocks.deleteRemoteBranch).toHaveBeenCalledWith(TEST_REPO, "origin", "feature/x");
    expect(mocks.mute).toHaveBeenCalled();
    expect(mocks.unmute).toHaveBeenCalled();
  });

  it("routes rebaseBranch message to DataSource.rebaseBranch (TC-022)", async () => {
    // Given: GitGraphView instance with mocked DataSource
    // When: RequestRebaseBranch message is received
    await mocks.messageHandler.current!({
      command: "rebaseBranch",
      repo: TEST_REPO,
      branchName: "main"
    });

    // Then: DataSource.rebaseBranch is called with correct arguments
    expect(mocks.rebaseBranch).toHaveBeenCalledTimes(1);
    expect(mocks.rebaseBranch).toHaveBeenCalledWith(TEST_REPO, "main");
    expect(mocks.mute).toHaveBeenCalled();
    expect(mocks.unmute).toHaveBeenCalled();
  });

  it("sends ResponseDeleteRemoteBranch with status null on success (TC-023)", async () => {
    // Given: deleteRemoteBranch returns null (success)
    mocks.deleteRemoteBranch.mockResolvedValue(null);

    // When: RequestDeleteRemoteBranch message is received
    await mocks.messageHandler.current!({
      command: "deleteRemoteBranch",
      repo: TEST_REPO,
      remoteName: "origin",
      branchName: "feature/y"
    });

    // Then: ResponseDeleteRemoteBranch is sent with status null
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "deleteRemoteBranch",
      status: null
    });
  });

  it("sends ResponseRebaseBranch with error status on failure (TC-024)", async () => {
    // Given: rebaseBranch returns an error message
    const errorMsg = "CONFLICT (content): Merge conflict in src/file.ts";
    mocks.rebaseBranch.mockResolvedValue(errorMsg);

    // When: RequestRebaseBranch message is received
    await mocks.messageHandler.current!({
      command: "rebaseBranch",
      repo: TEST_REPO,
      branchName: "develop"
    });

    // Then: ResponseRebaseBranch is sent with the error status
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "rebaseBranch",
      status: errorMsg
    });
  });
});

describe("GitGraphView deleteBranch extension (S9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitGraphView.currentPanel = undefined;

    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    mocks.deleteBranch.mockResolvedValue(null);
    mocks.deleteRemoteBranch.mockResolvedValue(null);

    const mockDataSource = {
      applyStash: mocks.applyStash,
      popStash: mocks.popStash,
      dropStash: mocks.dropStash,
      branchFromStash: mocks.branchFromStash,
      pushStash: mocks.pushStash,
      resetUncommitted: mocks.resetUncommitted,
      cleanUntrackedFiles: mocks.cleanUntrackedFiles,
      getCommitComparison: mocks.getCommitComparison,
      deleteBranch: mocks.deleteBranch,
      deleteRemoteBranch: mocks.deleteRemoteBranch,
      rebaseBranch: mocks.rebaseBranch
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

  it("calls deleteRemoteBranch for each remote after successful local delete (TC-025)", async () => {
    // Given: local delete succeeds, deleteOnRemotes has one remote
    mocks.deleteBranch.mockResolvedValue(null);
    mocks.deleteRemoteBranch.mockResolvedValue(null);

    // When: deleteBranch message with deleteOnRemotes is received
    await mocks.messageHandler.current!({
      command: "deleteBranch",
      repo: TEST_REPO,
      branchName: "feature/done",
      forceDelete: false,
      deleteOnRemotes: ["origin"]
    });

    // Then: local delete is called
    expect(mocks.deleteBranch).toHaveBeenCalledTimes(1);
    expect(mocks.deleteBranch).toHaveBeenCalledWith(TEST_REPO, "feature/done", false);

    // Then: refresh is sent after local success
    expect(mocks.postMessage).toHaveBeenCalledWith({ command: "refresh" });

    // Then: deleteRemoteBranch is called for origin
    expect(mocks.deleteRemoteBranch).toHaveBeenCalledTimes(1);
    expect(mocks.deleteRemoteBranch).toHaveBeenCalledWith(TEST_REPO, "origin", "feature/done");
  });

  it("does not call deleteRemoteBranch when deleteOnRemotes is empty (TC-026)", async () => {
    // Given: local delete succeeds, deleteOnRemotes is empty
    mocks.deleteBranch.mockResolvedValue(null);

    // When: deleteBranch message with empty deleteOnRemotes is received
    await mocks.messageHandler.current!({
      command: "deleteBranch",
      repo: TEST_REPO,
      branchName: "feature/local-only",
      forceDelete: false,
      deleteOnRemotes: []
    });

    // Then: local delete is called and response is sent
    expect(mocks.deleteBranch).toHaveBeenCalledTimes(1);
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "deleteBranch",
      status: null
    });

    // Then: deleteRemoteBranch is NOT called
    expect(mocks.deleteRemoteBranch).not.toHaveBeenCalled();

    // Then: no refresh message is sent (handled by frontend refreshOrError)
    const refreshCalls = mocks.postMessage.mock.calls.filter(
      (call: unknown[]) => (call[0] as Record<string, unknown>).command === "refresh"
    );
    expect(refreshCalls).toHaveLength(0);
  });

  it("sends refresh and error dialog when local succeeds but remote fails (TC-027)", async () => {
    // Given: local delete succeeds, remote delete fails
    mocks.deleteBranch.mockResolvedValue(null);
    const remoteError = "error: unable to delete 'feature/done': remote ref does not exist";
    mocks.deleteRemoteBranch.mockResolvedValue(remoteError);

    // When: deleteBranch message with deleteOnRemotes is received
    await mocks.messageHandler.current!({
      command: "deleteBranch",
      repo: TEST_REPO,
      branchName: "feature/done",
      forceDelete: false,
      deleteOnRemotes: ["origin"]
    });

    // Then: ResponseDeleteBranch with local success status
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "deleteBranch",
      status: null
    });

    // Then: refresh is sent
    expect(mocks.postMessage).toHaveBeenCalledWith({ command: "refresh" });

    // Then: error is reported via ResponseDeleteRemoteBranch
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "deleteRemoteBranch",
      status: `origin: ${remoteError}`
    });
  });

  it("does not attempt remote delete when local delete fails (TC-028)", async () => {
    // Given: local delete fails
    const localError = "error: The branch 'feature/done' is not fully merged.";
    mocks.deleteBranch.mockResolvedValue(localError);

    // When: deleteBranch message with deleteOnRemotes is received
    await mocks.messageHandler.current!({
      command: "deleteBranch",
      repo: TEST_REPO,
      branchName: "feature/done",
      forceDelete: false,
      deleteOnRemotes: ["origin"]
    });

    // Then: ResponseDeleteBranch with error status
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "deleteBranch",
      status: localError
    });

    // Then: deleteRemoteBranch is NOT called
    expect(mocks.deleteRemoteBranch).not.toHaveBeenCalled();

    // Then: no refresh is sent
    const refreshCalls = mocks.postMessage.mock.calls.filter(
      (call: unknown[]) => (call[0] as Record<string, unknown>).command === "refresh"
    );
    expect(refreshCalls).toHaveLength(0);
  });
});

describe("GitGraphView loadCommits authorFilter (S10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitGraphView.currentPanel = undefined;

    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    mocks.getCommits.mockResolvedValue({
      commits: [],
      head: null,
      moreCommitsAvailable: false
    });

    const mockDataSource = {
      applyStash: mocks.applyStash,
      popStash: mocks.popStash,
      dropStash: mocks.dropStash,
      branchFromStash: mocks.branchFromStash,
      pushStash: mocks.pushStash,
      resetUncommitted: mocks.resetUncommitted,
      cleanUntrackedFiles: mocks.cleanUntrackedFiles,
      getCommitComparison: mocks.getCommitComparison,
      deleteBranch: mocks.deleteBranch,
      deleteRemoteBranch: mocks.deleteRemoteBranch,
      rebaseBranch: mocks.rebaseBranch,
      getCommits: mocks.getCommits
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

  it("passes authors array to dataSource.getCommits when specified (TC-029)", async () => {
    // Given: loadCommits message with authors array
    // When: RequestLoadCommits message with authors is received
    await mocks.messageHandler.current!({
      command: "loadCommits",
      repo: TEST_REPO,
      branches: ["main"],
      maxCommits: 300,
      showRemoteBranches: true,
      hard: false,
      authors: ["Alice"]
    });

    // Then: getCommits is called with branches and authors arrays
    expect(mocks.getCommits).toHaveBeenCalledTimes(1);
    expect(mocks.getCommits).toHaveBeenCalledWith(TEST_REPO, ["main"], 300, true, ["Alice"]);
  });

  it("passes empty arrays to dataSource.getCommits when no filter (TC-030)", async () => {
    // Given: loadCommits message with empty arrays
    // When: RequestLoadCommits message with empty branches/authors is received
    await mocks.messageHandler.current!({
      command: "loadCommits",
      repo: TEST_REPO,
      branches: [],
      maxCommits: 300,
      showRemoteBranches: true,
      hard: false,
      authors: []
    });

    // Then: getCommits is called with empty arrays
    expect(mocks.getCommits).toHaveBeenCalledTimes(1);
    expect(mocks.getCommits).toHaveBeenCalledWith(TEST_REPO, [], 300, true, []);
  });
});

describe("GitGraphView createBranch + checkout orchestration (S11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitGraphView.currentPanel = undefined;

    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    mocks.createBranch.mockResolvedValue(null);
    mocks.checkoutBranch.mockResolvedValue(null);

    const mockDataSource = {
      applyStash: mocks.applyStash,
      popStash: mocks.popStash,
      dropStash: mocks.dropStash,
      branchFromStash: mocks.branchFromStash,
      pushStash: mocks.pushStash,
      resetUncommitted: mocks.resetUncommitted,
      cleanUntrackedFiles: mocks.cleanUntrackedFiles,
      getCommitComparison: mocks.getCommitComparison,
      createBranch: mocks.createBranch,
      checkoutBranch: mocks.checkoutBranch,
      deleteRemoteBranch: mocks.deleteRemoteBranch,
      rebaseBranch: mocks.rebaseBranch,
      deleteBranch: mocks.deleteBranch,
      getCommits: mocks.getCommits
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

  it("calls checkoutBranch after successful createBranch when checkout=true (TC-031)", async () => {
    // Given: createBranch succeeds
    mocks.createBranch.mockResolvedValue(null);

    // When: createBranch message with checkout=true is received
    await mocks.messageHandler.current!({
      command: "createBranch",
      repo: TEST_REPO,
      branchName: "feature/x",
      commitHash: "abc123",
      checkout: true
    });

    // Then: checkoutBranch is called with branchName
    expect(mocks.createBranch).toHaveBeenCalledTimes(1);
    expect(mocks.createBranch).toHaveBeenCalledWith(TEST_REPO, "feature/x", "abc123");
    expect(mocks.checkoutBranch).toHaveBeenCalledTimes(1);
    expect(mocks.checkoutBranch).toHaveBeenCalledWith(TEST_REPO, "feature/x", null);
  });

  it("returns status null on full success (createBranch + checkoutBranch) (TC-032)", async () => {
    // Given: both createBranch and checkoutBranch succeed
    mocks.createBranch.mockResolvedValue(null);
    mocks.checkoutBranch.mockResolvedValue(null);

    // When: createBranch message with checkout=true is received
    await mocks.messageHandler.current!({
      command: "createBranch",
      repo: TEST_REPO,
      branchName: "feature/x",
      commitHash: "abc123",
      checkout: true
    });

    // Then: status is null (complete success)
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "createBranch",
      status: null
    });
  });

  it("returns partial success message when createBranch succeeds but checkoutBranch fails (TC-033)", async () => {
    // Given: createBranch succeeds, checkoutBranch fails
    mocks.createBranch.mockResolvedValue(null);
    mocks.checkoutBranch.mockResolvedValue("checkout error");

    // When: createBranch message with checkout=true is received
    await mocks.messageHandler.current!({
      command: "createBranch",
      repo: TEST_REPO,
      branchName: "feature/x",
      commitHash: "abc123",
      checkout: true
    });

    // Then: status contains partial success message
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "createBranch",
      status: "Branch 'feature/x' was created, but checkout failed: checkout error"
    });
  });

  it("does not call checkoutBranch when checkout=false (TC-034)", async () => {
    // Given: createBranch succeeds
    mocks.createBranch.mockResolvedValue(null);

    // When: createBranch message with checkout=false is received
    await mocks.messageHandler.current!({
      command: "createBranch",
      repo: TEST_REPO,
      branchName: "feature/x",
      commitHash: "abc123",
      checkout: false
    });

    // Then: checkoutBranch is NOT called, status is null
    expect(mocks.checkoutBranch).not.toHaveBeenCalled();
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "createBranch",
      status: null
    });
  });

  it("returns error and skips checkout when createBranch fails (TC-035)", async () => {
    // Given: createBranch fails
    const errorMsg = "branch already exists";
    mocks.createBranch.mockResolvedValue(errorMsg);

    // When: createBranch message with checkout=true is received
    await mocks.messageHandler.current!({
      command: "createBranch",
      repo: TEST_REPO,
      branchName: "feature/x",
      commitHash: "abc123",
      checkout: true
    });

    // Then: checkoutBranch is NOT called, error status is returned
    expect(mocks.checkoutBranch).not.toHaveBeenCalled();
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "createBranch",
      status: errorMsg
    });
  });

  it("does not call checkoutBranch when checkout is undefined - legacy compat (TC-036)", async () => {
    // Given: createBranch succeeds
    mocks.createBranch.mockResolvedValue(null);

    // When: createBranch message without checkout field (legacy message)
    await mocks.messageHandler.current!({
      command: "createBranch",
      repo: TEST_REPO,
      branchName: "feature/x",
      commitHash: "abc123"
    });

    // Then: checkoutBranch is NOT called (undefined is falsy), status is null
    expect(mocks.checkoutBranch).not.toHaveBeenCalled();
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "createBranch",
      status: null
    });
  });
});

/* ------------------------------------------------------------------ */
/* S12: loadCommits branches/authors array passthrough                  */
/* ------------------------------------------------------------------ */

describe("GitGraphView loadCommits branches/authors array passthrough (S12)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitGraphView.currentPanel = undefined;

    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    mocks.getCommits.mockResolvedValue({
      commits: [],
      head: null,
      moreCommitsAvailable: false,
      authors: []
    });

    const ds = {
      getCommits: mocks.getCommits
    } as unknown as DataSource;

    const es = {
      getLastActiveRepo: vi.fn(() => null),
      isAvatarStorageAvailable: vi.fn(() => false),
      setLastActiveRepo: vi.fn()
    } as unknown as ExtensionState;

    const am = {
      registerView: vi.fn(),
      deregisterView: vi.fn()
    } as unknown as AvatarManager;

    const rm = {
      getRepos: mocks.getRepos,
      registerViewCallback: vi.fn(),
      deregisterViewCallback: vi.fn(),
      setRepoState: vi.fn(),
      checkReposExist: vi.fn()
    } as unknown as RepoManager;

    GitGraphView.createOrShow("/test/extension", ds, es, am, rm);
  });

  afterEach(() => {
    GitGraphView.currentPanel?.dispose();
    GitGraphView.currentPanel = undefined;
  });

  it("passes branches and authors arrays to getCommits (TC-037)", async () => {
    // Given: loadCommits message with branches=["main","dev"] and authors=["Alice"]
    // When: message is received
    await mocks.messageHandler.current!({
      command: "loadCommits",
      repo: TEST_REPO,
      branches: ["main", "dev"],
      maxCommits: 300,
      showRemoteBranches: true,
      hard: false,
      authors: ["Alice"]
    });

    // Then: getCommits is called with the exact arrays
    expect(mocks.getCommits).toHaveBeenCalledTimes(1);
    expect(mocks.getCommits).toHaveBeenCalledWith(TEST_REPO, ["main", "dev"], 300, true, ["Alice"]);
  });

  it("passes empty arrays to getCommits for show-all mode (TC-038)", async () => {
    // Given: loadCommits message with empty branches and authors
    // When: message is received
    await mocks.messageHandler.current!({
      command: "loadCommits",
      repo: TEST_REPO,
      branches: [],
      maxCommits: 300,
      showRemoteBranches: true,
      hard: false,
      authors: []
    });

    // Then: getCommits is called with empty arrays
    expect(mocks.getCommits).toHaveBeenCalledTimes(1);
    expect(mocks.getCommits).toHaveBeenCalledWith(TEST_REPO, [], 300, true, []);
  });
});

describe("GitGraphView merge/cherry-pick handler and viewState dialogDefaults (S13)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitGraphView.currentPanel = undefined;
    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    mocks.mergeBranch.mockResolvedValue(null);
    mocks.mergeCommit.mockResolvedValue(null);
    mocks.cherrypickCommit.mockResolvedValue(null);
  });

  afterEach(() => {
    GitGraphView.currentPanel?.dispose();
    GitGraphView.currentPanel = undefined;
  });

  function createPanel(): void {
    const ds = {
      applyStash: mocks.applyStash,
      popStash: mocks.popStash,
      dropStash: mocks.dropStash,
      branchFromStash: mocks.branchFromStash,
      pushStash: mocks.pushStash,
      resetUncommitted: mocks.resetUncommitted,
      cleanUntrackedFiles: mocks.cleanUntrackedFiles,
      getCommitComparison: mocks.getCommitComparison,
      mergeBranch: mocks.mergeBranch,
      mergeCommit: mocks.mergeCommit,
      cherrypickCommit: mocks.cherrypickCommit
    } as unknown as DataSource;

    const es = {
      getLastActiveRepo: vi.fn(() => null),
      isAvatarStorageAvailable: vi.fn(() => false),
      setLastActiveRepo: vi.fn()
    } as unknown as ExtensionState;

    const am = {
      registerView: vi.fn(),
      deregisterView: vi.fn()
    } as unknown as AvatarManager;

    const rm = {
      getRepos: mocks.getRepos,
      registerViewCallback: vi.fn(),
      deregisterViewCallback: vi.fn(),
      setRepoState: vi.fn(),
      checkReposExist: vi.fn()
    } as unknown as RepoManager;

    GitGraphView.createOrShow("/test/extension", ds, es, am, rm);
  }

  function getPanelHtml(): string {
    const panelMock = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value as {
      webview: { html: string };
    };
    return panelMock.webview.html;
  }

  function parseViewState(html: string): Record<string, unknown> {
    const match = html.match(/var viewState = (.+?);/);
    expect(match).not.toBeNull();
    return JSON.parse(match![1]);
  }

  it("includes dialogDefaults in viewState from Config (TC-039)", async () => {
    // Given: config.dialogDefaults() returns default values
    // When: panel is created
    createPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Then: viewState in HTML contains dialogDefaults matching Config.dialogDefaults()
    const viewState = parseViewState(getPanelHtml());
    expect(viewState.dialogDefaults).toEqual({
      merge: { noFastForward: true, squashCommits: false, noCommit: false },
      cherryPick: { recordOrigin: false, noCommit: false },
      stashUncommittedChanges: { includeUntracked: false }
    });
  });

  it("passes squash=true noCommit=false to DataSource.mergeBranch (TC-040)", async () => {
    // Given: GitGraphView instance with mocked DataSource
    createPanel();

    // When: RequestMergeBranch message is received with squash=true, noCommit=false
    await mocks.messageHandler.current!({
      command: "mergeBranch",
      repo: TEST_REPO,
      branchName: "feature-branch",
      createNewCommit: true,
      squash: true,
      noCommit: false
    });

    // Then: DataSource.mergeBranch is called with squash=true, noCommit=false
    expect(mocks.mergeBranch).toHaveBeenCalledTimes(1);
    expect(mocks.mergeBranch).toHaveBeenCalledWith(TEST_REPO, "feature-branch", true, true, false);
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "mergeBranch",
      status: null
    });
  });

  it("passes squash=false noCommit=true to DataSource.mergeCommit (TC-041)", async () => {
    // Given: GitGraphView instance with mocked DataSource
    createPanel();
    const commitHash = "abc1234567890abcdef1234567890abcdef123456";

    // When: RequestMergeCommit message is received with squash=false, noCommit=true
    await mocks.messageHandler.current!({
      command: "mergeCommit",
      repo: TEST_REPO,
      commitHash,
      createNewCommit: false,
      squash: false,
      noCommit: true
    });

    // Then: DataSource.mergeCommit is called with squash=false, noCommit=true
    expect(mocks.mergeCommit).toHaveBeenCalledTimes(1);
    expect(mocks.mergeCommit).toHaveBeenCalledWith(TEST_REPO, commitHash, false, false, true);
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "mergeCommit",
      status: null
    });
  });

  it("passes recordOrigin=true noCommit=true to DataSource.cherrypickCommit (TC-042)", async () => {
    // Given: GitGraphView instance with mocked DataSource
    createPanel();
    const commitHash = "def4567890abcdef1234567890abcdef12345678";

    // When: RequestCherrypickCommit message is received with recordOrigin=true, noCommit=true
    await mocks.messageHandler.current!({
      command: "cherrypickCommit",
      repo: TEST_REPO,
      commitHash,
      parentIndex: 1,
      recordOrigin: true,
      noCommit: true
    });

    // Then: DataSource.cherrypickCommit is called with recordOrigin=true, noCommit=true
    expect(mocks.cherrypickCommit).toHaveBeenCalledTimes(1);
    expect(mocks.cherrypickCommit).toHaveBeenCalledWith(TEST_REPO, commitHash, 1, true, true);
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "cherrypickCommit",
      status: null
    });
  });

  it("passes recordOrigin=false noCommit=false for legacy compat (TC-043)", async () => {
    // Given: GitGraphView instance with mocked DataSource
    createPanel();
    const commitHash = "1234567890abcdef1234567890abcdef12345678";

    // When: RequestCherrypickCommit message is received with recordOrigin=false, noCommit=false
    await mocks.messageHandler.current!({
      command: "cherrypickCommit",
      repo: TEST_REPO,
      commitHash,
      parentIndex: 0,
      recordOrigin: false,
      noCommit: false
    });

    // Then: DataSource.cherrypickCommit is called with recordOrigin=false, noCommit=false
    expect(mocks.cherrypickCommit).toHaveBeenCalledTimes(1);
    expect(mocks.cherrypickCommit).toHaveBeenCalledWith(TEST_REPO, commitHash, 0, false, false);
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "cherrypickCommit",
      status: null
    });
  });
});
