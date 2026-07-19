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
  addWorktree: vi.fn(),
  removeWorktree: vi.fn(),
  createTerminal: vi.fn(),
  terminalShow: vi.fn(),
  repoFileWatcherStart: vi.fn(),
  repoFileWatcherStop: vi.fn(),
  addTag: vi.fn(),
  resolveRefToHash: vi.fn(),
  reveal: vi.fn(),
  panelDisposeHandler: null as (() => void) | null,
  panelViewStateHandler: null as (() => void) | null,
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
      onDidDispose: vi.fn((handler: () => void) => {
        mocks.panelDisposeHandler = handler;
      }),
      onDidChangeViewState: vi.fn((handler: () => void) => {
        mocks.panelViewStateHandler = handler;
      }),
      reveal: mocks.reveal,
      visible: true,
      iconPath: null,
      dispose: vi.fn()
    })),
    activeTextEditor: undefined,
    createTerminal: mocks.createTerminal
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
  MIN_COMMIT_LOAD_COUNT: 1,
  normalizeCommitLoadCount: (value: number, defaultValue: number) => {
    const count = Number.isFinite(value) ? value : defaultValue;
    return Math.max(1, count);
  },
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
    commitOrdering: () => "date",
    showCurrentBranchByDefault: () => false,
    showRecentActions: () => true,
    dialogDefaults: () => ({
      merge: { noFastForward: true, squashCommits: false, noCommit: false },
      cherryPick: { recordOrigin: false, noCommit: false },
      stashUncommittedChanges: { includeUntracked: false },
      createWorktree: { openTerminal: true },
      removeWorktree: { deleteBranch: true }
    })
  }))
}));

vi.mock("../../src/i18n", () => ({
  getLocale: vi.fn(() => "en"),
  loadWebviewMessages: vi.fn(async () => ({ "toolbar.showAll": "Show All" })),
  t: vi.fn((message: string, ...args: unknown[]) =>
    args.length === 0
      ? message
      : message.replace(/\{(\d+)\}/g, (_match, index) => String(args[Number(index)] ?? ""))
  )
}));

vi.mock("../../src/repoFileWatcher", () => {
  function MockRepoFileWatcher() {
    return {
      mute: mocks.mute,
      unmute: mocks.unmute,
      start: mocks.repoFileWatcherStart,
      stop: mocks.repoFileWatcherStop
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
import { GitKeizuView } from "../../src/gitGraphView";
import type { RepoManager } from "../../src/repoManager";
import { UNCOMMITTED_CHANGES_HASH } from "../../src/types";

const TEST_REPO = "/test/repo";

describe("GitKeizuView stash message routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;

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
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
  });

  it("routes applyStash message to DataSource.applyStash (TC-001)", async () => {
    // Given: GitKeizuView instance with mocked DataSource
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
    // Given: GitKeizuView instance with mocked DataSource
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
    // Given: GitKeizuView instance with mocked DataSource
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
    // Given: GitKeizuView instance with mocked DataSource
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
    // Given: GitKeizuView instance with mocked DataSource
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
    // Given: GitKeizuView instance with mocked DataSource
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
    // Given: GitKeizuView instance with mocked DataSource
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

describe("GitKeizuView compareCommits message routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;

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
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
  });

  it("routes compareCommits message to DataSource.getCommitComparison with correct args (TC-008)", async () => {
    // Given: GitKeizuView instance with mocked DataSource
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

describe("GitKeizuView viewDiff with compareWithHash", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;

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
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
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

describe("GitKeizuView pull/push message routing", () => {
  const pullMock = vi.fn();
  const pushMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;

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
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
  });

  it("routes pull message to DataSource.pull and returns ResponsePull (TC-013)", async () => {
    // Given: GitKeizuView instance with mocked DataSource
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
    // Given: GitKeizuView instance with mocked DataSource
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

describe("GitKeizuView createOrShow rootUri handling (S6)", () => {
  const SCM_REPO = "/scm/repo/path";
  let mockSetLastActiveRepo: ReturnType<typeof vi.fn>;
  let mockRegisterRepoFromUri: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;

    mockSetLastActiveRepo = vi.fn();
    mockRegisterRepoFromUri = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
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
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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
    GitKeizuView.createOrShow(
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
    GitKeizuView.createOrShow(
      "/test/extension",
      deps.mockDataSource,
      deps.mockExtensionState,
      deps.mockAvatarManager,
      deps.mockRepoManager
    );
    vi.clearAllMocks();

    // When: createOrShow is called again with rootUri for a registered repo
    const rootUri = { fsPath: SCM_REPO } as unknown as import("vscode").Uri;
    GitKeizuView.createOrShow(
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
    GitKeizuView.createOrShow(
      "/test/extension",
      deps.mockDataSource,
      deps.mockExtensionState,
      deps.mockAvatarManager,
      deps.mockRepoManager
    );
    vi.clearAllMocks();

    // When: createOrShow is called with rootUri for unregistered repo
    const rootUri = { fsPath: SCM_REPO } as unknown as import("vscode").Uri;
    GitKeizuView.createOrShow(
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
    GitKeizuView.createOrShow(
      "/test/extension",
      deps.mockDataSource,
      deps.mockExtensionState,
      deps.mockAvatarManager,
      deps.mockRepoManager
    );
    vi.clearAllMocks();

    // When: createOrShow is called without rootUri (command palette)
    GitKeizuView.createOrShow(
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

describe("GitKeizuView viewState keybindings and loadMoreCommitsAutomatically (S7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;
    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
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
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow(
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

describe("GitKeizuView getHtmlForWebview avatar storage init await (S25)", () => {
  let getConfigMock: ReturnType<typeof vi.mocked<typeof import("../../src/config").getConfig>>;
  let baseConfig: ReturnType<typeof import("../../src/config").getConfig>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;
    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });

    const configModule = await import("../../src/config");
    getConfigMock = vi.mocked(configModule.getConfig);
    baseConfig = getConfigMock.getMockImplementation()!();
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
    getConfigMock.mockImplementation(
      () => baseConfig as unknown as ReturnType<typeof getConfigMock>
    );
  });

  function setFetchAvatars(enabled: boolean): void {
    getConfigMock.mockImplementation(
      () =>
        ({
          ...baseConfig,
          fetchAvatars: () => enabled
        }) as unknown as ReturnType<typeof getConfigMock>
    );
  }

  function createPanel(storageAvailable: boolean): {
    isAvatarStorageAvailable: ReturnType<typeof vi.fn>;
    waitForAvatarStorage: ReturnType<typeof vi.fn>;
  } {
    const mockDataSource = {} as unknown as DataSource;
    const isAvatarStorageAvailable = vi.fn(() => storageAvailable);
    const waitForAvatarStorage = vi.fn().mockResolvedValue(undefined);
    const mockExtensionState = {
      getLastActiveRepo: vi.fn(() => null),
      isAvatarStorageAvailable,
      waitForAvatarStorage,
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

    GitKeizuView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
    return { isAvatarStorageAvailable, waitForAvatarStorage };
  }

  function parseViewState(): Record<string, unknown> {
    const panelMock = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value as {
      webview: { html: string };
    };
    const match = panelMock.webview.html.match(/var viewState = (.+?);/);
    expect(match).not.toBeNull();
    return JSON.parse(match![1]);
  }

  it("awaits waitForAvatarStorage before evaluating isAvatarStorageAvailable (TC-096)", async () => {
    // Case: TC-096
    // Given: fetchAvatars enabled and storage available so isAvatarStorageAvailable is evaluated
    setFetchAvatars(true);
    const spies = createPanel(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // When/Then: waitForAvatarStorage was awaited before isAvatarStorageAvailable was read
    expect(spies.waitForAvatarStorage).toHaveBeenCalledTimes(1);
    expect(spies.isAvatarStorageAvailable).toHaveBeenCalledTimes(1);
    expect(spies.waitForAvatarStorage.mock.invocationCallOrder[0]).toBeLessThan(
      spies.isAvatarStorageAvailable.mock.invocationCallOrder[0]
    );
  });

  it("sets viewState.fetchAvatars true when enabled and storage available (TC-097)", async () => {
    // Case: TC-097
    // Given: fetchAvatars enabled and storage available after init completes
    setFetchAvatars(true);
    createPanel(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Then: viewState.fetchAvatars is true
    expect(parseViewState().fetchAvatars).toBe(true);
  });

  it("sets viewState.fetchAvatars false when storage is unavailable (TC-098)", async () => {
    // Case: TC-098
    // Given: fetchAvatars enabled but storage unavailable after init completes
    setFetchAvatars(true);
    createPanel(false);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Then: viewState.fetchAvatars is false
    expect(parseViewState().fetchAvatars).toBe(false);
  });

  it("sets viewState.fetchAvatars false when config disables it (TC-099)", async () => {
    // Case: TC-099
    // Given: fetchAvatars disabled by config even though storage is available
    setFetchAvatars(false);
    createPanel(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Then: viewState.fetchAvatars is false (config side wins in the AND condition)
    expect(parseViewState().fetchAvatars).toBe(false);
  });
});

describe("GitKeizuView deleteRemoteBranch/rebaseBranch message routing (S8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;

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
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
  });

  it("routes deleteRemoteBranch message to DataSource.deleteRemoteBranch (TC-021)", async () => {
    // Given: GitKeizuView instance with mocked DataSource
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
    // Given: GitKeizuView instance with mocked DataSource
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

describe("GitKeizuView deleteBranch extension (S9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;

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
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
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

describe("GitKeizuView loadCommits authorFilter (S10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;

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
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
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
      authors: ["Alice"],
      commitOrdering: "date"
    });

    // Then: getCommits is called with branches and authors arrays
    expect(mocks.getCommits).toHaveBeenCalledTimes(1);
    expect(mocks.getCommits).toHaveBeenCalledWith(
      TEST_REPO,
      ["main"],
      300,
      true,
      ["Alice"],
      "date"
    );
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
      authors: [],
      commitOrdering: "date"
    });

    // Then: getCommits is called with empty arrays
    expect(mocks.getCommits).toHaveBeenCalledTimes(1);
    expect(mocks.getCommits).toHaveBeenCalledWith(TEST_REPO, [], 300, true, [], "date");
  });
});

describe("GitKeizuView createBranch + checkout orchestration (S11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;

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
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
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

describe("GitKeizuView loadCommits branches/authors array passthrough (S12)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;

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
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow("/test/extension", ds, es, am, rm);
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
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
      authors: ["Alice"],
      commitOrdering: "date"
    });

    // Then: getCommits is called with the exact arrays
    expect(mocks.getCommits).toHaveBeenCalledTimes(1);
    expect(mocks.getCommits).toHaveBeenCalledWith(
      TEST_REPO,
      ["main", "dev"],
      300,
      true,
      ["Alice"],
      "date"
    );
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
      authors: [],
      commitOrdering: "date"
    });

    // Then: getCommits is called with empty arrays
    expect(mocks.getCommits).toHaveBeenCalledTimes(1);
    expect(mocks.getCommits).toHaveBeenCalledWith(TEST_REPO, [], 300, true, [], "date");
  });
});

describe("GitKeizuView merge/cherry-pick handler and viewState dialogDefaults (S13)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;
    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    mocks.mergeBranch.mockResolvedValue(null);
    mocks.mergeCommit.mockResolvedValue(null);
    mocks.cherrypickCommit.mockResolvedValue(null);
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
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
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow("/test/extension", ds, es, am, rm);
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
      stashUncommittedChanges: { includeUntracked: false },
      createWorktree: { openTerminal: true },
      removeWorktree: { deleteBranch: true }
    });
  });

  it("includes showRecentActions in viewState from Config (TC-065)", async () => {
    // Case: TC-065
    // Given: config.showRecentActions() returns true in the default mock

    // When: panel is created
    createPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Then: viewState in HTML contains showRecentActions=true
    const viewState = parseViewState(getPanelHtml());
    expect(viewState.showRecentActions).toBe(true);
  });

  it("passes squash=true noCommit=false to DataSource.mergeBranch (TC-040)", async () => {
    // Given: GitKeizuView instance with mocked DataSource
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
    // Given: GitKeizuView instance with mocked DataSource
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
    // Given: GitKeizuView instance with mocked DataSource
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
    // Given: GitKeizuView instance with mocked DataSource
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

describe("GitKeizuView viewState commitOrdering / loadCommits handler (S14)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;
    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    mocks.getCommits.mockResolvedValue({
      commits: [],
      head: null,
      moreCommitsAvailable: false,
      authors: []
    });
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
  });

  function createPanel(): void {
    const ds = {
      getCommits: mocks.getCommits
    } as unknown as DataSource;

    const es = {
      getLastActiveRepo: vi.fn(() => null),
      isAvatarStorageAvailable: vi.fn(() => false),
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow("/test/extension", ds, es, am, rm);
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

  it("includes commitOrdering in viewState from Config (TC-044)", async () => {
    // Given: config.commitOrdering() returns "date" (default mock)
    // When: panel is created
    createPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Then: viewState in HTML contains commitOrdering matching Config.commitOrdering()
    const viewState = parseViewState(getPanelHtml());
    expect(viewState.commitOrdering).toBe("date");
  });

  it("passes commitOrdering='topo' to dataSource.getCommits (TC-045)", async () => {
    // Given: GitKeizuView instance with mocked DataSource
    createPanel();

    // When: loadCommits message with commitOrdering="topo" is received
    await mocks.messageHandler.current!({
      command: "loadCommits",
      repo: TEST_REPO,
      branches: ["main"],
      maxCommits: 300,
      showRemoteBranches: true,
      hard: false,
      authors: [],
      commitOrdering: "topo"
    });

    // Then: dataSource.getCommits() is called with commitOrdering="topo"
    expect(mocks.getCommits).toHaveBeenCalledTimes(1);
    expect(mocks.getCommits).toHaveBeenCalledWith(TEST_REPO, ["main"], 300, true, [], "topo");
  });

  it("passes commitOrdering='author-date' to dataSource.getCommits (TC-046)", async () => {
    // Given: GitKeizuView instance with mocked DataSource
    createPanel();

    // When: loadCommits message with commitOrdering="author-date" is received
    await mocks.messageHandler.current!({
      command: "loadCommits",
      repo: TEST_REPO,
      branches: ["main"],
      maxCommits: 300,
      showRemoteBranches: true,
      hard: false,
      authors: [],
      commitOrdering: "author-date"
    });

    // Then: dataSource.getCommits() is called with commitOrdering="author-date"
    expect(mocks.getCommits).toHaveBeenCalledTimes(1);
    expect(mocks.getCommits).toHaveBeenCalledWith(
      TEST_REPO,
      ["main"],
      300,
      true,
      [],
      "author-date"
    );
  });

  it("passes commitOrdering='date' to dataSource.getCommits for default behavior (TC-047)", async () => {
    // Given: GitKeizuView instance with mocked DataSource
    createPanel();

    // When: loadCommits message with commitOrdering="date" is received
    await mocks.messageHandler.current!({
      command: "loadCommits",
      repo: TEST_REPO,
      branches: ["main"],
      maxCommits: 300,
      showRemoteBranches: true,
      hard: false,
      authors: [],
      commitOrdering: "date"
    });

    // Then: dataSource.getCommits() is called with commitOrdering="date"
    expect(mocks.getCommits).toHaveBeenCalledTimes(1);
    expect(mocks.getCommits).toHaveBeenCalledWith(TEST_REPO, ["main"], 300, true, [], "date");
  });

  it("normalizes maxCommits=0 to 1 before calling dataSource.getCommits (TC-068)", async () => {
    // Case: TC-068
    // Given: GitKeizuView instance with mocked DataSource
    createPanel();

    // When: loadCommits message arrives with maxCommits=0
    await mocks.messageHandler.current!({
      command: "loadCommits",
      repo: TEST_REPO,
      branches: ["main"],
      maxCommits: 0,
      showRemoteBranches: true,
      hard: false,
      authors: [],
      commitOrdering: "date"
    });

    // Then: dataSource.getCommits is called with maxCommits=1 (normalized)
    expect(mocks.getCommits).toHaveBeenCalledTimes(1);
    expect(mocks.getCommits).toHaveBeenCalledWith(TEST_REPO, ["main"], 1, true, [], "date");
  });

  it("normalizes negative maxCommits to 1 before calling dataSource.getCommits (TC-069)", async () => {
    // Case: TC-069
    // Given: GitKeizuView instance with mocked DataSource
    createPanel();

    // When: loadCommits message arrives with maxCommits=-10
    await mocks.messageHandler.current!({
      command: "loadCommits",
      repo: TEST_REPO,
      branches: ["main"],
      maxCommits: -10,
      showRemoteBranches: true,
      hard: false,
      authors: [],
      commitOrdering: "date"
    });

    // Then: dataSource.getCommits is called with maxCommits=1 (normalized)
    expect(mocks.getCommits).toHaveBeenCalledTimes(1);
    expect(mocks.getCommits).toHaveBeenCalledWith(TEST_REPO, ["main"], 1, true, [], "date");
  });
});

/* ------------------------------------------------------------------ */
/* S24: viewDiff() HEAD resolveRefToHash 解決と未コミット版数クエリ     */
/* ------------------------------------------------------------------ */

describe("GitKeizuView viewDiff HEAD resolution and version query (S24)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;

    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    mocks.executeCommand.mockResolvedValue(undefined);
    mocks.encodeDiffDocUri.mockImplementation(
      (_repo: string, filePath: string, commit: string) => ({
        toString: () => `git-keizu:${filePath}?commit=${commit}`
      })
    );

    const mockDataSource = {
      resolveRefToHash: mocks.resolveRefToHash
    } as unknown as DataSource;
    const mockExtensionState = {
      getLastActiveRepo: vi.fn(() => null),
      isAvatarStorageAvailable: vi.fn(() => false),
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
  });

  it("resolves HEAD to a fixed hash for the left URI in compare mode (TC-089)", async () => {
    // Case: TC-089
    // Given: compare mode with uncommitted fromHash; resolveRefToHash returns a fixed hash
    mocks.resolveRefToHash.mockResolvedValue("deadbeef");

    // When: viewDiff compares uncommitted changes against another commit
    await mocks.messageHandler.current!({
      command: "viewDiff",
      repo: TEST_REPO,
      commitHash: UNCOMMITTED_CHANGES_HASH,
      oldFilePath: "src/old.ts",
      newFilePath: "src/new.ts",
      type: "M",
      compareWithHash: "def4567890abcdef1234567890abcdef12345678"
    });

    // Then: HEAD is resolved and the resolved hash is used for the left URI
    expect(mocks.resolveRefToHash).toHaveBeenCalledWith(TEST_REPO, "HEAD");
    expect(mocks.encodeDiffDocUri).toHaveBeenCalledWith(TEST_REPO, "src/old.ts", "deadbeef");
  });

  it("uses the commit hash directly for a normal commit in compare mode (TC-090)", async () => {
    // Case: TC-090
    // Given: compare mode where the fromHash is a normal commit
    const commitHash = "abc1234567890abcdef1234567890abcdef123456";

    // When: viewDiff compares a normal commit against another commit
    await mocks.messageHandler.current!({
      command: "viewDiff",
      repo: TEST_REPO,
      commitHash,
      oldFilePath: "src/old.ts",
      newFilePath: "src/new.ts",
      type: "M",
      compareWithHash: "def4567890abcdef1234567890abcdef12345678"
    });

    // Then: resolveRefToHash is not consulted and the commit hash is used directly
    expect(mocks.resolveRefToHash).not.toHaveBeenCalled();
    expect(mocks.encodeDiffDocUri).toHaveBeenCalledWith(TEST_REPO, "src/old.ts", commitHash);
  });

  it("falls back to 'HEAD' when resolveRefToHash returns null in compare mode (TC-091)", async () => {
    // Case: TC-091
    // Given: compare mode with uncommitted fromHash; resolveRefToHash returns null
    mocks.resolveRefToHash.mockResolvedValue(null);

    // When: viewDiff compares uncommitted changes against another commit
    await mocks.messageHandler.current!({
      command: "viewDiff",
      repo: TEST_REPO,
      commitHash: UNCOMMITTED_CHANGES_HASH,
      oldFilePath: "src/old.ts",
      newFilePath: "src/new.ts",
      type: "M",
      compareWithHash: "def4567890abcdef1234567890abcdef12345678"
    });

    // Then: the left URI falls back to the literal "HEAD"
    expect(mocks.encodeDiffDocUri).toHaveBeenCalledWith(TEST_REPO, "src/old.ts", "HEAD");
  });

  it("resolves HEAD and appends a version query in uncommitted delete mode (TC-092)", async () => {
    // Case: TC-092
    // Given: non-compare uncommitted mode, type "D"; resolveRefToHash returns a fixed hash
    mocks.resolveRefToHash.mockResolvedValue("cafe01");

    // When: viewDiff renders a deleted uncommitted file
    await mocks.messageHandler.current!({
      command: "viewDiff",
      repo: TEST_REPO,
      commitHash: UNCOMMITTED_CHANGES_HASH,
      oldFilePath: "src/file.ts",
      newFilePath: "src/file.ts",
      type: "D"
    });

    // Then: the left URI uses the resolved hash and the right URI carries a version query
    expect(mocks.encodeDiffDocUri).toHaveBeenCalledWith(TEST_REPO, "src/file.ts", "cafe01");
    expect(mocks.encodeDiffDocUri).toHaveBeenCalledWith(
      TEST_REPO,
      "src/file.ts",
      UNCOMMITTED_CHANGES_HASH,
      expect.any(String)
    );
  });

  it("returns success=false when vscode.diff rejects in compare mode (TC-093)", async () => {
    // Case: TC-093
    // Given: compare mode and executeCommand rejects
    mocks.resolveRefToHash.mockResolvedValue("deadbeef");
    mocks.executeCommand.mockRejectedValueOnce(new Error("diff editor unavailable"));

    // When: viewDiff message with compareWithHash is dispatched
    await mocks.messageHandler.current!({
      command: "viewDiff",
      repo: TEST_REPO,
      commitHash: "abc1234567890abcdef1234567890abcdef123456",
      oldFilePath: "src/old.ts",
      newFilePath: "src/new.ts",
      type: "M",
      compareWithHash: "def4567890abcdef1234567890abcdef12345678"
    });

    // Then: success=false is posted; the rejection is swallowed by the try/catch
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "viewDiff",
      success: false
    });
  });

  it("returns success=false when vscode.diff rejects in uncommitted mode (TC-094)", async () => {
    // Case: TC-094
    // Given: uncommitted mode and executeCommand rejects
    mocks.resolveRefToHash.mockResolvedValue("cafe01");
    mocks.executeCommand.mockRejectedValueOnce(new Error("diff editor unavailable"));

    // When: viewDiff message for uncommitted changes is dispatched
    await mocks.messageHandler.current!({
      command: "viewDiff",
      repo: TEST_REPO,
      commitHash: UNCOMMITTED_CHANGES_HASH,
      oldFilePath: "src/file.ts",
      newFilePath: "src/file.ts",
      type: "M"
    });

    // Then: success=false is posted; the rejection is swallowed by the try/catch
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "viewDiff",
      success: false
    });
  });

  it("returns success=false when vscode.diff rejects in normal commit mode (TC-095)", async () => {
    // Case: TC-095
    // Given: a normal commit (no compareWithHash) and executeCommand rejects
    mocks.executeCommand.mockRejectedValueOnce(new Error("diff editor unavailable"));

    // When: viewDiff message for a normal commit is dispatched
    await mocks.messageHandler.current!({
      command: "viewDiff",
      repo: TEST_REPO,
      commitHash: "abc1234567890abcdef1234567890abcdef123456",
      oldFilePath: "src/file.ts",
      newFilePath: "src/file.ts",
      type: "M"
    });

    // Then: success=false is posted; the rejection is swallowed by the try/catch
    expect(mocks.resolveRefToHash).not.toHaveBeenCalled();
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "viewDiff",
      success: false
    });
  });
});

/* ------------------------------------------------------------------ */
/* S17: 未登録リポジトリのメッセージガード                              */
/* ------------------------------------------------------------------ */

describe("GitKeizuView unregistered repo guard (S17)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;

    // Only TEST_REPO is registered; unrecognized paths must be rejected
    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    mocks.getCommits.mockResolvedValue({
      commits: [],
      head: null,
      moreCommitsAvailable: false,
      authors: []
    });

    const mockDataSource = {
      getCommits: mocks.getCommits
    } as unknown as DataSource;
    const mockExtensionState = {
      getLastActiveRepo: vi.fn(() => null),
      isAvatarStorageAvailable: vi.fn(() => false),
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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
      checkReposExist: vi.fn(() => false)
    } as unknown as RepoManager;

    GitKeizuView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
  });

  it("drops loadCommits messages for an unregistered repo (TC-073)", async () => {
    // Case: TC-073
    // Given: a loadCommits message targeting a repo path that is NOT in RepoManager.getRepos()
    mocks.postMessage.mockClear();

    // When: the message is dispatched
    await mocks.messageHandler.current!({
      command: "loadCommits",
      repo: "/unknown/repo/path",
      branches: ["main"],
      maxCommits: 100,
      showRemoteBranches: true,
      hard: false,
      authors: [],
      commitOrdering: "date"
    });

    // Then: DataSource.getCommits is not called and no response is posted for the dropped message
    expect(mocks.getCommits).not.toHaveBeenCalled();
    const viewDiffResponses = mocks.postMessage.mock.calls.filter(
      (call) => (call[0] as Record<string, unknown>).command === "loadCommits"
    );
    expect(viewDiffResponses).toHaveLength(0);
  });

  it("bypasses the guard for copyToClipboard even when repo is unregistered (TC-074)", async () => {
    // Case: TC-074
    // Given: a copyToClipboard message that does not include a `repo` property
    mocks.postMessage.mockClear();

    // When: the message is dispatched
    await mocks.messageHandler.current!({
      command: "copyToClipboard",
      type: "Commit Hash",
      data: "abc1234"
    });

    // Then: the handler still posts a copyToClipboard response (guard bypassed)
    expect(mocks.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "copyToClipboard",
        type: "Commit Hash"
      })
    );
  });

  it("bypasses the guard for loadRepos messages without a repo key (TC-075)", async () => {
    // Case: TC-075
    // Given: a loadRepos message without `repo` property (the guard requires `"repo" in msg`)
    mocks.postMessage.mockClear();

    // When: the loadRepos message is dispatched with check=false
    await mocks.messageHandler.current!({
      command: "loadRepos",
      check: false
    });

    // Then: respondLoadRepos posts a loadRepos response back to the webview
    expect(mocks.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "loadRepos"
      })
    );
  });
});

describe("GitKeizuView worktree message handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;

    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    mocks.addWorktree.mockResolvedValue(null);
    mocks.removeWorktree.mockResolvedValue(null);
    mocks.createTerminal.mockReturnValue({ show: mocks.terminalShow });

    const mockDataSource = {
      addWorktree: mocks.addWorktree,
      removeWorktree: mocks.removeWorktree
    } as unknown as DataSource;

    const mockExtensionState = {
      getLastActiveRepo: vi.fn(() => null),
      isAvatarStorageAvailable: vi.fn(() => false),
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
  });

  it("createWorktree without commitHash and openTerminal=false calls addWorktree, no terminal (TC-048)", async () => {
    // Given: GitKeizuView instance with mocked DataSource
    // When: RequestCreateWorktree without commitHash and openTerminal=false
    await mocks.messageHandler.current!({
      command: "createWorktree",
      repo: TEST_REPO,
      path: "/tmp/wt",
      branchName: "feature/x",
      openTerminal: false
    });

    // Then: addWorktree is called with correct args, no terminal created
    expect(mocks.addWorktree).toHaveBeenCalledTimes(1);
    expect(mocks.addWorktree).toHaveBeenCalledWith(TEST_REPO, "/tmp/wt", "feature/x", undefined);
    expect(mocks.createTerminal).not.toHaveBeenCalled();
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "createWorktree",
      status: null
    });
  });

  it("createWorktree with commitHash and openTerminal=true creates terminal on success (TC-049)", async () => {
    // Given: addWorktree succeeds (returns null)
    mocks.addWorktree.mockResolvedValue(null);

    // When: RequestCreateWorktree with commitHash and openTerminal=true
    await mocks.messageHandler.current!({
      command: "createWorktree",
      repo: TEST_REPO,
      path: "/tmp/wt",
      branchName: "new-branch",
      commitHash: "abc1234",
      openTerminal: true
    });

    // Then: addWorktree called, terminal created with name and cwd, show() called
    expect(mocks.addWorktree).toHaveBeenCalledWith(TEST_REPO, "/tmp/wt", "new-branch", "abc1234");
    expect(mocks.createTerminal).toHaveBeenCalledWith({
      name: "Worktree: new-branch",
      cwd: "/tmp/wt"
    });
    expect(mocks.terminalShow).toHaveBeenCalled();
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "createWorktree",
      status: null
    });
  });

  it("createWorktree failure sends error status and does not create terminal (TC-050)", async () => {
    // Given: addWorktree fails with error message
    mocks.addWorktree.mockResolvedValue("fatal: branch already exists");

    // When: RequestCreateWorktree with openTerminal=true
    await mocks.messageHandler.current!({
      command: "createWorktree",
      repo: TEST_REPO,
      path: "/tmp/wt",
      branchName: "existing",
      commitHash: "abc1234",
      openTerminal: true
    });

    // Then: error status sent, no terminal created
    expect(mocks.createTerminal).not.toHaveBeenCalled();
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "createWorktree",
      status: "fatal: branch already exists"
    });
  });

  it("removeWorktree calls DataSource.removeWorktree and sends response (TC-051)", async () => {
    // Given: removeWorktree succeeds
    mocks.removeWorktree.mockResolvedValue(null);

    // When: RequestRemoveWorktree message is received with deleteBranch=false
    await mocks.messageHandler.current!({
      command: "removeWorktree",
      repo: TEST_REPO,
      worktreePath: "/tmp/wt",
      branchName: "feature/x",
      deleteBranch: false
    });

    // Then: removeWorktree is called and response is sent without branchStatus
    expect(mocks.removeWorktree).toHaveBeenCalledTimes(1);
    expect(mocks.removeWorktree).toHaveBeenCalledWith(TEST_REPO, "/tmp/wt");
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "removeWorktree",
      status: null
    });
  });

  it("openTerminal creates terminal with name and cwd, sends response (TC-052)", async () => {
    // Given: GitKeizuView instance
    // When: RequestOpenTerminal message is received
    await mocks.messageHandler.current!({
      command: "openTerminal",
      repo: TEST_REPO,
      path: "/home/user/worktree",
      name: "Worktree: feature/x"
    });

    // Then: createTerminal called with name and cwd, show() called, response sent
    expect(mocks.createTerminal).toHaveBeenCalledWith({
      name: "Worktree: feature/x",
      cwd: "/home/user/worktree"
    });
    expect(mocks.terminalShow).toHaveBeenCalled();
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "openTerminal"
    });
  });
});

// --- S16: removeWorktree ハンドラ ブランチ同時削除 ---

describe("GitKeizuView removeWorktree branch deletion (S16)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;

    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    mocks.removeWorktree.mockResolvedValue(null);
    mocks.deleteBranch.mockResolvedValue(null);

    const mockDataSource = {
      removeWorktree: mocks.removeWorktree,
      deleteBranch: mocks.deleteBranch
    } as unknown as DataSource;

    const mockExtensionState = {
      getLastActiveRepo: vi.fn(() => null),
      isAvatarStorageAvailable: vi.fn(() => false),
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
  });

  it("deleteBranch=true, worktree success, branch success → status:null, branchStatus:null (TC-053)", async () => {
    // Given: removeWorktree and deleteBranch both succeed
    mocks.removeWorktree.mockResolvedValue(null);
    mocks.deleteBranch.mockResolvedValue(null);

    // When: RequestRemoveWorktree with deleteBranch=true
    await mocks.messageHandler.current!({
      command: "removeWorktree",
      repo: TEST_REPO,
      worktreePath: "/tmp/wt",
      branchName: "feature/x",
      deleteBranch: true
    });

    // Then: Both operations called, response has status:null, branchStatus:null
    expect(mocks.removeWorktree).toHaveBeenCalledWith(TEST_REPO, "/tmp/wt");
    expect(mocks.deleteBranch).toHaveBeenCalledWith(TEST_REPO, "feature/x", false);
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "removeWorktree",
      status: null,
      branchStatus: null
    });
  });

  it("deleteBranch=true, worktree success, branch failure → status:null, branchStatus:error (TC-054)", async () => {
    // Given: removeWorktree succeeds, deleteBranch fails
    mocks.removeWorktree.mockResolvedValue(null);
    mocks.deleteBranch.mockResolvedValue("error: branch not fully merged");

    // When: RequestRemoveWorktree with deleteBranch=true
    await mocks.messageHandler.current!({
      command: "removeWorktree",
      repo: TEST_REPO,
      worktreePath: "/tmp/wt",
      branchName: "feature/x",
      deleteBranch: true
    });

    // Then: Response has status:null, branchStatus with error message
    expect(mocks.deleteBranch).toHaveBeenCalledTimes(1);
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "removeWorktree",
      status: null,
      branchStatus: "error: branch not fully merged"
    });
  });

  it("deleteBranch=true, worktree failure → status:error, deleteBranch not called (TC-055)", async () => {
    // Given: removeWorktree fails
    mocks.removeWorktree.mockResolvedValue("fatal: modified files present");

    // When: RequestRemoveWorktree with deleteBranch=true
    await mocks.messageHandler.current!({
      command: "removeWorktree",
      repo: TEST_REPO,
      worktreePath: "/tmp/wt",
      branchName: "feature/x",
      deleteBranch: true
    });

    // Then: deleteBranch is NOT called, response has error status
    expect(mocks.deleteBranch).not.toHaveBeenCalled();
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "removeWorktree",
      status: "fatal: modified files present"
    });
  });

  it("deleteBranch=false, worktree success → status:null, deleteBranch not called (TC-056)", async () => {
    // Given: removeWorktree succeeds
    mocks.removeWorktree.mockResolvedValue(null);

    // When: RequestRemoveWorktree with deleteBranch=false
    await mocks.messageHandler.current!({
      command: "removeWorktree",
      repo: TEST_REPO,
      worktreePath: "/tmp/wt",
      branchName: "feature/x",
      deleteBranch: false
    });

    // Then: deleteBranch is NOT called, response has status:null only
    expect(mocks.deleteBranch).not.toHaveBeenCalled();
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "removeWorktree",
      status: null
    });
  });

  it("deleteBranch=undefined (legacy) → deleteBranch not called (TC-057)", async () => {
    // Given: removeWorktree succeeds, message from old webview without deleteBranch field
    mocks.removeWorktree.mockResolvedValue(null);

    // When: RequestRemoveWorktree without deleteBranch field
    await mocks.messageHandler.current!({
      command: "removeWorktree",
      repo: TEST_REPO,
      worktreePath: "/tmp/wt",
      branchName: "feature/x"
    });

    // Then: deleteBranch is NOT called (backward compatibility)
    expect(mocks.deleteBranch).not.toHaveBeenCalled();
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "removeWorktree",
      status: null
    });
  });

  it("forceDelete parameter is always false when deleteBranch=true (TC-058)", async () => {
    // Given: removeWorktree and deleteBranch both succeed
    mocks.removeWorktree.mockResolvedValue(null);
    mocks.deleteBranch.mockResolvedValue(null);

    // When: RequestRemoveWorktree with deleteBranch=true
    await mocks.messageHandler.current!({
      command: "removeWorktree",
      repo: TEST_REPO,
      worktreePath: "/tmp/wt",
      branchName: "feature/x",
      deleteBranch: true
    });

    // Then: deleteBranch is called with forceDelete=false (safe delete only)
    expect(mocks.deleteBranch).toHaveBeenCalledWith(TEST_REPO, "feature/x", false);
  });
});

describe("GitKeizuView CSS_COLOR_VAR_PREFIX constant verification (S17)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;
    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
  });

  function createPanel(): void {
    const mockDataSource = {} as unknown as DataSource;
    const mockExtensionState = {
      getLastActiveRepo: vi.fn(() => null),
      isAvatarStorageAvailable: vi.fn(() => false),
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow(
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

  it("generates CSS variable definitions with --git-keizu-color prefix (TC-059)", async () => {
    // Given: config returns graphColours with at least one color
    // When: panel is created and HTML is generated
    createPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Then: generated HTML contains --git-keizu-color variable definitions in style attribute
    const html = getPanelHtml();
    expect(html).toContain("--git-keizu-color0:");
  });

  it("generates CSS variable references with var(--git-keizu-color) (TC-060)", async () => {
    // Given: config returns graphColours with at least one color
    // When: panel is created and HTML is generated
    createPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Then: generated HTML contains data-color selectors referencing var(--git-keizu-color)
    const html = getPanelHtml();
    expect(html).toContain("var(--git-keizu-color");
  });
});

describe("GitKeizuView loadBranches watcher orchestration", () => {
  const repoA = "/test/repo-a";
  const repoB = "/test/repo-b";

  function createViewDeps() {
    const getBranches = vi.fn().mockResolvedValue({
      branches: ["main"],
      head: "main",
      error: false
    });
    const getRepositoryStateWatchPaths = vi
      .fn()
      .mockResolvedValue([`${repoA}/.git`, "/shared/.git"]);
    const isGitRepository = vi.fn().mockResolvedValue(true);
    const setLastActiveRepo = vi.fn();

    const dataSource = {
      getBranches,
      getRepositoryStateWatchPaths,
      isGitRepository
    } as unknown as DataSource;

    const extensionState = {
      getLastActiveRepo: vi.fn(() => null),
      isAvatarStorageAvailable: vi.fn(() => false),
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
      setLastActiveRepo
    } as unknown as ExtensionState;

    const avatarManager = {
      registerView: vi.fn(),
      deregisterView: vi.fn()
    } as unknown as AvatarManager;

    const repoManager = {
      getRepos: vi.fn(() => ({ [repoA]: "Repo A", [repoB]: "Repo B" })),
      registerViewCallback: vi.fn(),
      deregisterViewCallback: vi.fn(),
      setRepoState: vi.fn(),
      checkReposExist: vi.fn()
    } as unknown as RepoManager;

    return {
      avatarManager,
      dataSource,
      extensionState,
      getBranches,
      getRepositoryStateWatchPaths,
      isGitRepository,
      repoManager,
      setLastActiveRepo
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    mocks.panelDisposeHandler = null;
    mocks.panelViewStateHandler = null;
    GitKeizuView.currentPanel = undefined;
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
  });

  it("resolves watch roots on repo change and starts RepoFileWatcher with them (TC-061)", async () => {
    // Case: TC-061
    // Given: A fresh GitKeizuView and a loadBranches request for repoA
    const deps = createViewDeps();
    GitKeizuView.createOrShow(
      "/test/extension",
      deps.dataSource,
      deps.extensionState,
      deps.avatarManager,
      deps.repoManager
    );

    // When: loadBranches is received for a new repo
    await mocks.messageHandler.current!({
      command: "loadBranches",
      repo: repoA,
      showRemoteBranches: true,
      hard: false
    });

    // Then: The watch roots are resolved once and RepoFileWatcher.start receives the returned array
    expect(deps.getBranches).toHaveBeenCalledTimes(1);
    expect(deps.getBranches).toHaveBeenCalledWith(repoA, true);
    expect(deps.getRepositoryStateWatchPaths).toHaveBeenCalledTimes(1);
    expect(deps.getRepositoryStateWatchPaths).toHaveBeenCalledWith(repoA);
    expect(deps.setLastActiveRepo).toHaveBeenCalledTimes(1);
    expect(deps.setLastActiveRepo).toHaveBeenCalledWith(repoA);
    expect(mocks.repoFileWatcherStart).toHaveBeenCalledTimes(1);
    expect(mocks.repoFileWatcherStart).toHaveBeenCalledWith([`${repoA}/.git`, "/shared/.git"]);
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "loadBranches",
      branches: ["main"],
      head: "main",
      hard: false,
      isRepo: true
    });
  });

  it("does not restart RepoFileWatcher when loadBranches repeats for the same repo (TC-062)", async () => {
    // Case: TC-062
    // Given: GitKeizuView already loaded repoA once
    const deps = createViewDeps();
    GitKeizuView.createOrShow(
      "/test/extension",
      deps.dataSource,
      deps.extensionState,
      deps.avatarManager,
      deps.repoManager
    );
    await mocks.messageHandler.current!({
      command: "loadBranches",
      repo: repoA,
      showRemoteBranches: false,
      hard: false
    });
    vi.clearAllMocks();

    // When: loadBranches is received again for the same repo
    await mocks.messageHandler.current!({
      command: "loadBranches",
      repo: repoA,
      showRemoteBranches: false,
      hard: true
    });

    // Then: Branches are reloaded but the watcher is not restarted and watch roots are not resolved again
    expect(deps.getBranches).toHaveBeenCalledTimes(1);
    expect(deps.getRepositoryStateWatchPaths).not.toHaveBeenCalled();
    expect(deps.setLastActiveRepo).not.toHaveBeenCalled();
    expect(mocks.repoFileWatcherStart).not.toHaveBeenCalled();
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "loadBranches",
      branches: ["main"],
      head: "main",
      hard: true,
      isRepo: true
    });
  });

  it("checks git repository state on branch-load failure and still starts watching after repo change (TC-063)", async () => {
    // Case: TC-063
    // Given: getBranches reports an error and watch roots resolve for repoB
    const deps = createViewDeps();
    deps.getBranches.mockResolvedValueOnce({
      branches: [],
      head: null,
      error: true
    });
    deps.getRepositoryStateWatchPaths.mockResolvedValueOnce([`${repoB}/.git`]);
    deps.isGitRepository.mockResolvedValueOnce(false);
    GitKeizuView.createOrShow(
      "/test/extension",
      deps.dataSource,
      deps.extensionState,
      deps.avatarManager,
      deps.repoManager
    );

    // When: loadBranches is received for repoB
    await mocks.messageHandler.current!({
      command: "loadBranches",
      repo: repoB,
      showRemoteBranches: false,
      hard: false
    });

    // Then: isGitRepository is queried for the error case and RepoFileWatcher starts with repoB roots
    expect(deps.isGitRepository).toHaveBeenCalledTimes(1);
    expect(deps.isGitRepository).toHaveBeenCalledWith(repoB);
    expect(deps.getRepositoryStateWatchPaths).toHaveBeenCalledTimes(1);
    expect(deps.getRepositoryStateWatchPaths).toHaveBeenCalledWith(repoB);
    expect(mocks.repoFileWatcherStart).toHaveBeenCalledWith([`${repoB}/.git`]);
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "loadBranches",
      branches: [],
      head: null,
      hard: false,
      isRepo: false
    });
  });

  it("stops RepoFileWatcher when the panel becomes hidden (TC-064)", () => {
    // Case: TC-064
    // Given: GitKeizuView is created and the panel view state handler is registered
    const deps = createViewDeps();
    GitKeizuView.createOrShow(
      "/test/extension",
      deps.dataSource,
      deps.extensionState,
      deps.avatarManager,
      deps.repoManager
    );
    const panelMock = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value as {
      visible: boolean;
    };
    expect(mocks.panelViewStateHandler).not.toBeNull();

    // When: The panel transitions from visible to hidden
    panelMock.visible = false;
    mocks.panelViewStateHandler?.();

    // Then: RepoFileWatcher.stop is called once
    expect(mocks.repoFileWatcherStop).toHaveBeenCalledTimes(1);
  });
});

describe("GitKeizuView notifyShowRecentActionsChanged runtime sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;
    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
  });

  function createPanel(): void {
    const mockDataSource = {} as unknown as DataSource;
    const mockExtensionState = {
      getLastActiveRepo: vi.fn(() => null),
      isAvatarStorageAvailable: vi.fn(() => false),
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  }

  it("posts setShowRecentActions message with current config value (TC-066)", async () => {
    // Case: TC-066
    // Given: panel is open and config.showRecentActions() returns true (default mock)
    createPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));
    mocks.postMessage.mockClear();
    const panelMock = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value as {
      webview: { html: string };
    };
    const htmlBefore = panelMock.webview.html;

    // When: notifyShowRecentActionsChanged is called on the open panel
    GitKeizuView.currentPanel!.notifyShowRecentActionsChanged();

    // Then: setShowRecentActions message is posted with showRecentActions: true and HTML is not regenerated
    expect(mocks.postMessage).toHaveBeenCalledTimes(1);
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "setShowRecentActions",
      showRecentActions: true
    });
    expect(panelMock.webview.html).toBe(htmlBefore);
  });

  it("posts setShowRecentActions message when config returns false (TC-067)", async () => {
    // Case: TC-067
    // Given: panel is open and config.showRecentActions() returns false
    const configModule = await import("../../src/config");
    const getConfigMock = vi.mocked(configModule.getConfig);
    const baseConfig = getConfigMock.getMockImplementation()!();
    getConfigMock.mockImplementation(
      () =>
        ({
          ...baseConfig,
          showRecentActions: () => false
        }) as unknown as ReturnType<typeof configModule.getConfig>
    );

    createPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));
    mocks.postMessage.mockClear();

    // When: notifyShowRecentActionsChanged is called
    GitKeizuView.currentPanel!.notifyShowRecentActionsChanged();

    // Then: setShowRecentActions message is posted with showRecentActions: false
    expect(mocks.postMessage).toHaveBeenCalledTimes(1);
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "setShowRecentActions",
      showRecentActions: false
    });

    getConfigMock.mockImplementation(
      () => baseConfig as unknown as ReturnType<typeof configModule.getConfig>
    );
  });
});

/* ------------------------------------------------------------------ */
/* S21: メッセージハンドラ try/finally による unmute 保証              */
/* ------------------------------------------------------------------ */

describe("GitKeizuView message handler try/finally unmute (S21)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;

    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    mocks.addTag.mockResolvedValue(null);

    const mockDataSource = {
      addTag: mocks.addTag
    } as unknown as DataSource;
    const mockExtensionState = {
      getLastActiveRepo: vi.fn(() => null),
      isAvatarStorageAvailable: vi.fn(() => false),
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
  });

  function addTagMessage() {
    return {
      command: "addTag",
      repo: TEST_REPO,
      tagName: "v1",
      commitHash: "abc123",
      lightweight: true,
      message: ""
    };
  }

  it("unmutes once after a handler completes normally (TC-076)", async () => {
    // Case: TC-076
    // Given: a registered repo and addTag resolving successfully
    mocks.addTag.mockResolvedValue(null);

    // When: the addTag handler runs to completion
    await mocks.messageHandler.current!(addTagMessage());

    // Then: mute and unmute are each called exactly once
    expect(mocks.mute).toHaveBeenCalledTimes(1);
    expect(mocks.unmute).toHaveBeenCalledTimes(1);
  });

  it("unmutes once even when a DataSource method throws (TC-077)", async () => {
    // Case: TC-077
    // Given: addTag rejects with an error
    mocks.addTag.mockRejectedValueOnce(new Error("boom"));

    // When: the handler runs and the error propagates
    await expect(mocks.messageHandler.current!(addTagMessage())).rejects.toThrow("boom");

    // Then: the finally block still unmutes exactly once
    expect(mocks.unmute).toHaveBeenCalledTimes(1);
  });

  it("unmutes once even when sendMessage throws (TC-078)", async () => {
    // Case: TC-078
    // Given: posting the addTag response throws
    mocks.addTag.mockResolvedValue(null);
    mocks.postMessage.mockImplementation((message: { command: string }) => {
      if (message.command === "addTag") {
        throw new Error("send failed");
      }
    });

    // When: the handler runs and the send error propagates
    await expect(mocks.messageHandler.current!(addTagMessage())).rejects.toThrow("send failed");

    // Then: the finally block still unmutes exactly once
    expect(mocks.unmute).toHaveBeenCalledTimes(1);
  });

  it("does not mute or unmute when the early-return guard trips (TC-079)", async () => {
    // Case: TC-079
    // Given: a message for an unregistered repo (guard before mute)
    await mocks.messageHandler.current!({ ...addTagMessage(), repo: "/unregistered" });

    // Then: neither mute nor unmute is called (return is outside the try)
    expect(mocks.mute).not.toHaveBeenCalled();
    expect(mocks.unmute).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* S22: worktree コマンドの個別 try/catch と status 応答               */
/* ------------------------------------------------------------------ */

// S26: openWorktreeInNewWindow / revealWorktreeInOS の status 必須送出（成功時 null）
// @see docs/testing/perspectives/src/gitGraphView-test/03-worktree-actions-01.md
describe("GitKeizuView worktree command status responses (S26)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;

    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    mocks.executeCommand.mockResolvedValue(undefined);

    const mockDataSource = {} as unknown as DataSource;
    const mockExtensionState = {
      getLastActiveRepo: vi.fn(() => null),
      isAvatarStorageAvailable: vi.fn(() => false),
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
  });

  it("posts openWorktreeInNewWindow with status null on success (TC-100)", async () => {
    // Case: TC-100
    // Given: executeCommand succeeds
    mocks.executeCommand.mockResolvedValue(undefined);

    // When: openWorktreeInNewWindow is handled
    await mocks.messageHandler.current!({
      command: "openWorktreeInNewWindow",
      repo: TEST_REPO,
      path: "wt"
    });

    // Then: the response carries an explicit status: null (not an omitted field)
    expect(mocks.postMessage).toHaveBeenCalledTimes(1);
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "openWorktreeInNewWindow",
      status: null
    });
  });

  it("posts the Error message as status when openFolder rejects with Error (TC-101)", async () => {
    // Case: TC-101
    // Given: executeCommand rejects with an Error
    mocks.executeCommand.mockRejectedValueOnce(new Error("boom"));

    // When: openWorktreeInNewWindow is handled
    await mocks.messageHandler.current!({
      command: "openWorktreeInNewWindow",
      repo: TEST_REPO,
      path: "wt"
    });

    // Then: status carries the Error message
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "openWorktreeInNewWindow",
      status: "boom"
    });
  });

  it("posts String(error) as status when openFolder rejects with a non-Error (TC-102)", async () => {
    // Case: TC-102
    // Given: executeCommand rejects with a plain string
    mocks.executeCommand.mockRejectedValueOnce("x");

    // When: openWorktreeInNewWindow is handled
    await mocks.messageHandler.current!({
      command: "openWorktreeInNewWindow",
      repo: TEST_REPO,
      path: "wt"
    });

    // Then: status is the String(error) coercion
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "openWorktreeInNewWindow",
      status: "x"
    });
  });

  it("posts revealWorktreeInOS with status null on success (TC-103)", async () => {
    // Case: TC-103
    // Given: executeCommand succeeds
    mocks.executeCommand.mockResolvedValue(undefined);

    // When: revealWorktreeInOS is handled
    await mocks.messageHandler.current!({
      command: "revealWorktreeInOS",
      repo: TEST_REPO,
      path: "wt"
    });

    // Then: the response carries an explicit status: null (not an omitted field)
    expect(mocks.postMessage).toHaveBeenCalledTimes(1);
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "revealWorktreeInOS",
      status: null
    });
  });

  it("posts the Error message as status when revealFileInOS rejects with Error (TC-104)", async () => {
    // Case: TC-104
    // Given: executeCommand rejects with an Error
    mocks.executeCommand.mockRejectedValueOnce(new Error("no"));

    // When: revealWorktreeInOS is handled
    await mocks.messageHandler.current!({
      command: "revealWorktreeInOS",
      repo: TEST_REPO,
      path: "wt"
    });

    // Then: status carries the Error message
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "revealWorktreeInOS",
      status: "no"
    });
  });

  it("posts String(error) as status when revealFileInOS rejects with a non-Error (TC-105)", async () => {
    // Case: TC-105
    // Given: executeCommand rejects with a plain string
    mocks.executeCommand.mockRejectedValueOnce("y");

    // When: revealWorktreeInOS is handled
    await mocks.messageHandler.current!({
      command: "revealWorktreeInOS",
      repo: TEST_REPO,
      path: "wt"
    });

    // Then: status is the String(error) coercion
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: "revealWorktreeInOS",
      status: "y"
    });
  });
});

// S27: script 埋め込み JSON の `<` エスケープ serializer
// @see docs/testing/perspectives/src/gitGraphView-test/02-state-lifecycle-01.md
describe("GitKeizuView script-embedded JSON serializer (S27)", () => {
  const SCRIPT_BREAKOUT_PAYLOAD = "</script><script>alert(1)</script>";
  const NONCE_SCRIPT_OPENING = '<script nonce="test-nonce">';
  const SCRIPT_CLOSING = "</script>";

  let getLocaleMock: ReturnType<typeof vi.mocked<typeof import("../../src/i18n").getLocale>>;
  let loadWebviewMessagesMock: ReturnType<
    typeof vi.mocked<typeof import("../../src/i18n").loadWebviewMessages>
  >;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;
    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });

    const i18nModule = await import("../../src/i18n");
    getLocaleMock = vi.mocked(i18nModule.getLocale);
    loadWebviewMessagesMock = vi.mocked(i18nModule.loadWebviewMessages);
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
  });

  function createPanel(lastActiveRepo: string | null = null): void {
    const mockDataSource = {} as unknown as DataSource;
    const mockExtensionState = {
      getLastActiveRepo: vi.fn(() => lastActiveRepo),
      isAvatarStorageAvailable: vi.fn(() => false),
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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

    GitKeizuView.createOrShow(
      "/test/extension",
      mockDataSource,
      mockExtensionState,
      mockAvatarManager,
      mockRepoManager
    );
  }

  function getPanelHtml(panelIndex: number): string {
    const panelMock = vi.mocked(vscode.window.createWebviewPanel).mock.results[panelIndex]
      .value as { webview: { html: string } };
    return panelMock.webview.html;
  }

  function extractViewStateJson(html: string): string {
    const match = html.match(/var viewState = (.+?);/);
    expect(match).not.toBeNull();
    return match![1];
  }

  function countOccurrences(text: string, search: string): number {
    return text.split(search).length - 1;
  }

  function waitForRender(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  it("embeds normal values as JSON that parses back to the original data (TC-106)", async () => {
    // Case: TC-106
    // Given: locale, webviewMessages, and viewState contain no "<" characters
    createPanel();
    await waitForRender();

    // When: the embedded viewState JSON is extracted and parsed
    const viewStateJson = extractViewStateJson(getPanelHtml(0));
    const parsedViewState = JSON.parse(viewStateJson) as Record<string, unknown>;

    // Then: no escape was applied and the parsed values deep-equal the source data
    expect(viewStateJson).not.toContain("\\u003c");
    expect(parsedViewState.repos).toEqual({ [TEST_REPO]: "Test Repo" });
    expect(parsedViewState.lastActiveRepo).toBeNull();
    expect(parsedViewState.keybindings).toEqual({
      find: "f",
      refresh: "r",
      scrollToHead: "h",
      scrollToStash: "s"
    });
  });

  it("keeps the script element count stable when repo paths contain </script> (TC-107)", async () => {
    // Case: TC-107
    // Given: viewState repos key and lastActiveRepo contain a script breakout payload
    const maliciousRepo = `/repo/${SCRIPT_BREAKOUT_PAYLOAD}`;
    mocks.getRepos.mockReturnValue({ [maliciousRepo]: "Repo" });
    createPanel(maliciousRepo);
    await waitForRender();
    const injectedHtml = getPanelHtml(0);

    // When: a normal render is produced for comparison
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo" });
    createPanel();
    await waitForRender();
    const normalHtml = getPanelHtml(1);

    // Then: the nonce script element count matches the normal render and the embedded JSON
    // contains no literal </script> (the "<" is escaped to < instead)
    expect(countOccurrences(injectedHtml, NONCE_SCRIPT_OPENING)).toBe(
      countOccurrences(normalHtml, NONCE_SCRIPT_OPENING)
    );
    expect(countOccurrences(injectedHtml, SCRIPT_CLOSING)).toBe(
      countOccurrences(normalHtml, SCRIPT_CLOSING)
    );
    const viewStateJson = extractViewStateJson(injectedHtml);
    expect(viewStateJson).not.toContain(SCRIPT_CLOSING);
    expect(viewStateJson).toContain("\\u003c");
  });

  it("serializes reversibly without mutating the input value (TC-108)", async () => {
    // Case: TC-108
    // Given: a value whose string content contains </script>
    createPanel();
    await waitForRender();
    const panel = GitKeizuView.currentPanel as unknown as {
      serializeJsonForScript(value: unknown): string;
    };
    const input = { path: `/repo/${SCRIPT_BREAKOUT_PAYLOAD}` };
    const pristineCopy = { path: `/repo/${SCRIPT_BREAKOUT_PAYLOAD}` };

    // When: the value is serialized and the output is parsed back
    const serialized = panel.serializeJsonForScript(input);
    const restored = JSON.parse(serialized) as { path: string };

    // Then: the output holds no literal </script>, parses back to the exact input string,
    // and the input object itself was not modified by the replacement
    expect(serialized).not.toContain(SCRIPT_CLOSING);
    expect(restored.path).toBe(pristineCopy.path);
    expect(input).toEqual(pristineCopy);
  });

  it("escapes all three embeddings: locale, webviewMessages, and viewState (TC-109)", async () => {
    // Case: TC-109
    // Given: locale, a webview message value, and a repo path all contain the payload
    const maliciousLocale = `en${SCRIPT_BREAKOUT_PAYLOAD}`;
    const maliciousMessages = { "toolbar.showAll": `Show All ${SCRIPT_BREAKOUT_PAYLOAD}` };
    const maliciousRepo = `/repo/${SCRIPT_BREAKOUT_PAYLOAD}`;
    getLocaleMock.mockReturnValueOnce(maliciousLocale);
    loadWebviewMessagesMock.mockResolvedValueOnce(maliciousMessages);
    mocks.getRepos.mockReturnValue({ [maliciousRepo]: "Repo" });

    // When: the webview HTML is rendered
    createPanel();
    await waitForRender();
    const html = getPanelHtml(0);

    // Then: each of the three embedded JSON strings is free of literal </script> and
    // parses back to the injected values
    const localeAndMessagesMatch = html.match(
      /var webviewLocale = (.+); var webviewMessages = (.+);<\/script>/
    );
    expect(localeAndMessagesMatch).not.toBeNull();
    const [, localeJson, messagesJson] = localeAndMessagesMatch!;
    expect(localeJson).not.toContain(SCRIPT_CLOSING);
    expect(messagesJson).not.toContain(SCRIPT_CLOSING);
    expect(JSON.parse(localeJson)).toBe(maliciousLocale);
    expect(JSON.parse(messagesJson)).toEqual(maliciousMessages);
    const viewStateJson = extractViewStateJson(html);
    expect(viewStateJson).not.toContain(SCRIPT_CLOSING);
    expect(JSON.parse(viewStateJson).repos).toEqual({ [maliciousRepo]: "Repo" });
  });
});

/* ------------------------------------------------------------------ */
/* S23: createOrShow() reveal 前の lastActiveRepo 永続化               */
/* ------------------------------------------------------------------ */

describe("GitKeizuView createOrShow reveal persists lastActiveRepo (S23)", () => {
  const SCM_REPO = "/scm/repo/path";
  let mockSetLastActiveRepo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageHandler.current = null;
    GitKeizuView.currentPanel = undefined;
    mockSetLastActiveRepo = vi.fn();
  });

  afterEach(() => {
    GitKeizuView.currentPanel?.dispose();
    GitKeizuView.currentPanel = undefined;
  });

  function createDeps() {
    mocks.getRepos.mockReturnValue({ [TEST_REPO]: "Test Repo", [SCM_REPO]: "SCM Repo" });

    const mockDataSource = {} as unknown as DataSource;
    const mockExtensionState = {
      getLastActiveRepo: vi.fn(() => null),
      isAvatarStorageAvailable: vi.fn(() => false),
      waitForAvatarStorage: vi.fn().mockResolvedValue(undefined),
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
      registerRepoFromUri: vi.fn().mockResolvedValue(undefined)
    } as unknown as RepoManager;

    return { mockDataSource, mockExtensionState, mockAvatarManager, mockRepoManager };
  }

  function show(deps: ReturnType<typeof createDeps>, rootUri?: import("vscode").Uri) {
    GitKeizuView.createOrShow(
      "/test/extension",
      deps.mockDataSource,
      deps.mockExtensionState,
      deps.mockAvatarManager,
      deps.mockRepoManager,
      rootUri
    );
  }

  it("persists the rootUri path when revealing an existing panel (TC-086)", () => {
    // Case: TC-086
    // Given: an existing panel (created without rootUri)
    const deps = createDeps();
    show(deps);
    vi.clearAllMocks();

    // When: createOrShow is called again with a rootUri
    const rootUri = { fsPath: SCM_REPO } as unknown as import("vscode").Uri;
    show(deps, rootUri);

    // Then: setLastActiveRepo is called once with the rootUri path
    expect(mockSetLastActiveRepo).toHaveBeenCalledTimes(1);
    expect(mockSetLastActiveRepo).toHaveBeenCalledWith(SCM_REPO);
  });

  it("does not persist and only reveals when rootUri is undefined (TC-087)", () => {
    // Case: TC-087
    // Given: an existing panel
    const deps = createDeps();
    show(deps);
    vi.clearAllMocks();

    // When: createOrShow is called again without a rootUri
    show(deps);

    // Then: setLastActiveRepo is not called, but the panel is revealed
    expect(mockSetLastActiveRepo).not.toHaveBeenCalled();
    expect(mocks.reveal).toHaveBeenCalledTimes(1);
  });

  it("persists the repo before revealing the panel (TC-088)", () => {
    // Case: TC-088
    // Given: an existing panel
    const deps = createDeps();
    show(deps);
    vi.clearAllMocks();

    // When: createOrShow is called again with a rootUri
    const rootUri = { fsPath: SCM_REPO } as unknown as import("vscode").Uri;
    show(deps, rootUri);

    // Then: setLastActiveRepo is invoked before panel.reveal
    expect(mockSetLastActiveRepo).toHaveBeenCalledTimes(1);
    expect(mocks.reveal).toHaveBeenCalledTimes(1);
    expect(mockSetLastActiveRepo.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.reveal.mock.invocationCallOrder[0]
    );
  });
});
