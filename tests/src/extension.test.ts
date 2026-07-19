// Generated from docs/testing/perspectives/src/extension-test.md.
import { beforeEach, describe, expect, it, vi } from "vitest";

type RegisteredCommandHandler = (...args: unknown[]) => unknown;
type ConfigurationChangeHandler = (event: {
  affectsConfiguration: (section: string) => boolean;
}) => void;

interface MockDisposable {
  dispose: ReturnType<typeof vi.fn>;
  label: string;
}

interface MockExtensionContext {
  extensionPath: string;
  subscriptions: {
    push: ReturnType<typeof vi.fn>;
  };
}

interface MockConfigurationChangeEvent {
  affectsConfiguration: ReturnType<typeof vi.fn>;
}

const mocks = vi.hoisted(() => {
  class MockUri {
    fsPath: string;

    constructor(fsPath: string) {
      this.fsPath = fsPath;
    }

    static file(fsPath: string): MockUri {
      return new MockUri(fsPath);
    }
  }

  const createDisposable = (label: string) => ({
    dispose: vi.fn(),
    label
  });
  const commandHandlers = new Map<string, (...args: unknown[]) => unknown>();
  const commandDisposables = new Map<string, ReturnType<typeof createDisposable>>();
  const configurationHandler = {
    current: null as
      | ((event: { affectsConfiguration: (section: string) => boolean }) => void)
      | null
  };
  const configurationDisposable = { current: null as ReturnType<typeof createDisposable> | null };
  const textDocumentDisposable = { current: null as ReturnType<typeof createDisposable> | null };
  const outputChannel = {
    appendLine: vi.fn(),
    dispose: vi.fn(),
    label: "output-channel"
  };
  const extensionStateInstance = { label: "extension-state" };
  const dataSourceInstance = {
    generateGitCommandFormats: vi.fn(),
    label: "data-source",
    registerGitPath: vi.fn()
  };
  const avatarManagerInstance = {
    clearCache: vi.fn(),
    dispose: vi.fn(),
    label: "avatar-manager"
  };
  const statusBarItemInstance = {
    label: "status-bar-item",
    refresh: vi.fn()
  };
  const repoManagerInstance = {
    dispose: vi.fn(),
    label: "repo-manager",
    maxDepthOfRepoSearchChanged: vi.fn()
  };
  const diffDocProviderInstance = { current: null as object | null };
  const diffDocProviderConstruct = vi.fn();
  const diffDocProviderDispose = vi.fn();
  const createOutputChannel = vi.fn(() => outputChannel);
  const registerCommand = vi.fn(
    (
      command: string,
      handler: (...args: unknown[]) => unknown
    ): ReturnType<typeof createDisposable> => {
      commandHandlers.set(command, handler);
      const disposable = createDisposable(`command:${command}`);
      commandDisposables.set(command, disposable);
      return disposable;
    }
  );
  const registerTextDocumentContentProvider = vi.fn(
    (_scheme: string, _provider: unknown): ReturnType<typeof createDisposable> => {
      const disposable = createDisposable("text-document-content-provider");
      textDocumentDisposable.current = disposable;
      return disposable;
    }
  );
  const onDidChangeConfiguration = vi.fn(
    (handler: (event: { affectsConfiguration: (section: string) => boolean }) => void) => {
      configurationHandler.current = handler;
      const disposable = createDisposable("configuration-change-listener");
      configurationDisposable.current = disposable;
      return disposable;
    }
  );
  const createOrShow = vi.fn();
  const notifyShowRecentActionsChanged = vi.fn();
  const gitKeizuViewModule = {
    GitKeizuView: {
      createOrShow,
      currentPanel: undefined as
        | { notifyShowRecentActionsChanged: typeof notifyShowRecentActionsChanged }
        | undefined
    }
  };
  const ExtensionStateMock = vi.fn(function (
    this: unknown,
    _context: unknown
  ): typeof extensionStateInstance {
    return extensionStateInstance;
  });
  const DataSourceMock = vi.fn(function (this: unknown): typeof dataSourceInstance {
    return dataSourceInstance;
  });
  const AvatarManagerMock = vi.fn(function (
    this: unknown,
    _dataSource: unknown,
    _extensionState: unknown
  ): typeof avatarManagerInstance {
    return avatarManagerInstance;
  });
  const StatusBarItemMock = vi.fn(function (
    this: unknown,
    _context: unknown
  ): typeof statusBarItemInstance {
    return statusBarItemInstance;
  });
  const RepoManagerMock = vi.fn(function (
    this: unknown,
    _dataSource: unknown,
    _extensionState: unknown,
    _statusBarItem: unknown
  ): typeof repoManagerInstance {
    return repoManagerInstance;
  });
  const diffDocProviderScheme = "git-keizu-diff";
  class DiffDocProviderMock {
    static scheme = diffDocProviderScheme;

    dispose = diffDocProviderDispose;

    constructor(dataSource: unknown) {
      diffDocProviderConstruct(dataSource);
      diffDocProviderInstance.current = this;
    }
  }

  return {
    AvatarManagerMock,
    DataSourceMock,
    DiffDocProviderMock,
    ExtensionStateMock,
    MockUri,
    RepoManagerMock,
    StatusBarItemMock,
    avatarManagerInstance,
    commandDisposables,
    commandHandlers,
    configurationDisposable,
    configurationHandler,
    createDisposable,
    createOrShow,
    createOutputChannel,
    dataSourceInstance,
    diffDocProviderConstruct,
    diffDocProviderDispose,
    diffDocProviderInstance,
    diffDocProviderScheme,
    extensionStateInstance,
    gitKeizuViewModule,
    notifyShowRecentActionsChanged,
    onDidChangeConfiguration,
    outputChannel,
    registerCommand,
    registerTextDocumentContentProvider,
    repoManagerInstance,
    statusBarItemInstance,
    textDocumentDisposable
  };
});

vi.mock("vscode", () => ({
  Uri: mocks.MockUri,
  commands: {
    registerCommand: mocks.registerCommand
  },
  window: {
    createOutputChannel: mocks.createOutputChannel
  },
  workspace: {
    onDidChangeConfiguration: mocks.onDidChangeConfiguration,
    registerTextDocumentContentProvider: mocks.registerTextDocumentContentProvider
  }
}));

vi.mock("../../src/avatarManager", () => ({
  AvatarManager: mocks.AvatarManagerMock
}));

vi.mock("../../src/dataSource", () => ({
  DataSource: mocks.DataSourceMock
}));

vi.mock("../../src/diffDocProvider", () => ({
  DiffDocProvider: mocks.DiffDocProviderMock
}));

vi.mock("../../src/extensionState", () => ({
  ExtensionState: mocks.ExtensionStateMock
}));

vi.mock("../../src/gitGraphView", () => mocks.gitKeizuViewModule);

vi.mock("../../src/repoManager", () => ({
  RepoManager: mocks.RepoManagerMock
}));

vi.mock("../../src/statusBarItem", () => ({
  StatusBarItem: mocks.StatusBarItemMock
}));

import type { ExtensionContext } from "vscode";
import * as vscode from "vscode";

import { activate, deactivate } from "../../src/extension";

const OUTPUT_CHANNEL_NAME = "Git Keizu";
const ACTIVATION_SUCCESS_MESSAGE = "Extension activated successfully";
const VIEW_COMMAND = "git-keizu.view";
const CLEAR_AVATAR_CACHE_COMMAND = "git-keizu.clearAvatarCache";
const SHOW_STATUS_BAR_ITEM_SETTING = "git-keizu.showStatusBarItem";
const DATE_TYPE_SETTING = "git-keizu.dateType";
const MAX_DEPTH_OF_REPO_SEARCH_SETTING = "git-keizu.maxDepthOfRepoSearch";
const GIT_PATH_SETTING = "git.path";
const SHOW_RECENT_ACTIONS_SETTING = "git-keizu.menu.showRecentActions";
const DIFF_DOC_PROVIDER_SCHEME = mocks.diffDocProviderScheme;
const DEFAULT_EXTENSION_PATH = "/test/extension";
const DEFAULT_REPO_PATH = "/repo";
const OUTPUT_FAILED_MESSAGE = "output failed";
const REPO_INIT_FAILED_MESSAGE = "repo init failed";
const PUSH_FAILED_MESSAGE = "push failed";
const LOG_FAILED_MESSAGE = "log failed";
const SHOW_FAILED_MESSAGE = "show failed";
const CLEAR_FAILED_MESSAGE = "clear failed";
const REFRESH_FAILED_MESSAGE = "refresh failed";
const DEFAULT_SUBSCRIPTION_PUSH_RESULT = 8;
const MICROTASK_FLUSH_ROUNDS = 5;
const ZERO_CALLS = 0;
const ONE_CALL = 1;
const TWO_COMMANDS = 2;

function createMockContext(
  pushMock = vi.fn(() => DEFAULT_SUBSCRIPTION_PUSH_RESULT)
): MockExtensionContext {
  return {
    extensionPath: DEFAULT_EXTENSION_PATH,
    subscriptions: {
      push: pushMock
    }
  };
}

function toExtensionContext(context: MockExtensionContext): ExtensionContext {
  return context as unknown as ExtensionContext;
}

function createConfigurationChangeEvent(
  matchingKeys: readonly string[]
): MockConfigurationChangeEvent {
  const matchingKeySet = new Set(matchingKeys);
  return {
    affectsConfiguration: vi.fn((section: string) => matchingKeySet.has(section))
  };
}

function expectThrownError(action: () => void, expectedMessage: string): void {
  let caughtError: unknown;

  try {
    action();
  } catch (error) {
    caughtError = error;
  }

  expect(caughtError).toBeInstanceOf(Error);
  if (caughtError instanceof Error) {
    expect(caughtError.message).toBe(expectedMessage);
  }
}

async function expectRejectedError(
  promise: Promise<unknown>,
  expectedMessage: string
): Promise<void> {
  let caughtError: unknown;

  try {
    await promise;
  } catch (error) {
    caughtError = error;
  }

  expect(caughtError).toBeInstanceOf(Error);
  if (caughtError instanceof Error) {
    expect(caughtError.message).toBe(expectedMessage);
  }
}

async function flushMicrotasks(): Promise<void> {
  for (let round = 0; round < MICROTASK_FLUSH_ROUNDS; round += 1) {
    await Promise.resolve();
  }
}

function getRegisteredCommandHandler(command: string): RegisteredCommandHandler {
  const handler = mocks.commandHandlers.get(command);
  if (handler === undefined) {
    throw new Error(`Registered command handler not found: ${command}`);
  }
  return handler;
}

function getConfigurationChangeHandler(): ConfigurationChangeHandler {
  const handler = mocks.configurationHandler.current;
  if (handler === null) {
    throw new Error("Configuration change handler not found");
  }
  return handler;
}

function getCommandDisposable(command: string): MockDisposable {
  const disposable = mocks.commandDisposables.get(command);
  if (disposable === undefined) {
    throw new Error(`Command disposable not found: ${command}`);
  }
  return disposable;
}

function getTextDocumentDisposable(): MockDisposable {
  const disposable = mocks.textDocumentDisposable.current;
  if (disposable === null) {
    throw new Error("Text document disposable not found");
  }
  return disposable;
}

function getConfigurationDisposable(): MockDisposable {
  const disposable = mocks.configurationDisposable.current;
  if (disposable === null) {
    throw new Error("Configuration disposable not found");
  }
  return disposable;
}

function getDiffDocProviderInstance(): object {
  const instance = mocks.diffDocProviderInstance.current;
  if (instance === null) {
    throw new Error("Diff document provider instance not found");
  }
  return instance;
}

async function activateExtension(context = createMockContext()): Promise<MockExtensionContext> {
  await activate(toExtensionContext(context));
  return context;
}

function getPushedSubscriptions(context: MockExtensionContext): unknown[] {
  const pushCall = context.subscriptions.push.mock.calls[0] as unknown[] | undefined;
  if (pushCall === undefined) {
    throw new Error("subscriptions.push was not called");
  }
  return pushCall;
}

function invokeViewCommand(arg?: unknown): void {
  const handler = getRegisteredCommandHandler(VIEW_COMMAND);
  handler(arg);
}

function invokeClearAvatarCacheCommand(): void {
  const handler = getRegisteredCommandHandler(CLEAR_AVATAR_CACHE_COMMAND);
  handler();
}

function resetMockState(): void {
  vi.clearAllMocks();
  mocks.commandHandlers.clear();
  mocks.commandDisposables.clear();
  mocks.configurationHandler.current = null;
  mocks.configurationDisposable.current = null;
  mocks.textDocumentDisposable.current = null;
  mocks.outputChannel.appendLine.mockReset();
  mocks.outputChannel.dispose.mockReset();
  mocks.dataSourceInstance.generateGitCommandFormats.mockReset();
  mocks.dataSourceInstance.registerGitPath.mockReset();
  mocks.dataSourceInstance.registerGitPath.mockResolvedValue(undefined);
  mocks.avatarManagerInstance.clearCache.mockReset();
  mocks.avatarManagerInstance.dispose.mockReset();
  mocks.statusBarItemInstance.refresh.mockReset();
  mocks.repoManagerInstance.dispose.mockReset();
  mocks.repoManagerInstance.maxDepthOfRepoSearchChanged.mockReset();
  mocks.diffDocProviderInstance.current = null;
  mocks.diffDocProviderConstruct.mockReset();
  mocks.diffDocProviderDispose.mockReset();
  mocks.createOrShow.mockReset();
  mocks.notifyShowRecentActionsChanged.mockReset();
  mocks.gitKeizuViewModule.GitKeizuView.currentPanel = undefined;
  mocks.createOutputChannel.mockReset();
  mocks.createOutputChannel.mockReturnValue(mocks.outputChannel);
  mocks.registerCommand.mockReset();
  mocks.registerCommand.mockImplementation(
    (command: string, handler: RegisteredCommandHandler): MockDisposable => {
      mocks.commandHandlers.set(command, handler);
      const disposable = mocks.createDisposable(`command:${command}`);
      mocks.commandDisposables.set(command, disposable);
      return disposable;
    }
  );
  mocks.registerTextDocumentContentProvider.mockReset();
  mocks.registerTextDocumentContentProvider.mockImplementation(
    (_scheme: string, _provider: unknown): MockDisposable => {
      const disposable = mocks.createDisposable("text-document-content-provider");
      mocks.textDocumentDisposable.current = disposable;
      return disposable;
    }
  );
  mocks.onDidChangeConfiguration.mockReset();
  mocks.onDidChangeConfiguration.mockImplementation(
    (handler: ConfigurationChangeHandler): MockDisposable => {
      mocks.configurationHandler.current = handler;
      const disposable = mocks.createDisposable("configuration-change-listener");
      mocks.configurationDisposable.current = disposable;
      return disposable;
    }
  );
  mocks.ExtensionStateMock.mockReset();
  mocks.ExtensionStateMock.mockImplementation(function (
    this: unknown,
    _context: unknown
  ): typeof mocks.extensionStateInstance {
    return mocks.extensionStateInstance;
  });
  mocks.DataSourceMock.mockReset();
  mocks.DataSourceMock.mockImplementation(
    function (this: unknown): typeof mocks.dataSourceInstance {
      return mocks.dataSourceInstance;
    }
  );
  mocks.AvatarManagerMock.mockReset();
  mocks.AvatarManagerMock.mockImplementation(function (
    this: unknown,
    _dataSource: unknown,
    _extensionState: unknown
  ): typeof mocks.avatarManagerInstance {
    return mocks.avatarManagerInstance;
  });
  mocks.StatusBarItemMock.mockReset();
  mocks.StatusBarItemMock.mockImplementation(function (
    this: unknown,
    _context: unknown
  ): typeof mocks.statusBarItemInstance {
    return mocks.statusBarItemInstance;
  });
  mocks.RepoManagerMock.mockReset();
  mocks.RepoManagerMock.mockImplementation(function (
    this: unknown,
    _dataSource: unknown,
    _extensionState: unknown,
    _statusBarItem: unknown
  ): typeof mocks.repoManagerInstance {
    return mocks.repoManagerInstance;
  });
}

describe("extension", () => {
  beforeEach(() => {
    resetMockState();
  });

  describe("activate", () => {
    describe("initialization and registrations", () => {
      it("TC-001: initializes dependencies, registers disposables, and logs activation success", async () => {
        // Case: TC-001
        // Given: all VS Code APIs and imported collaborators are available and subscriptions.push can record disposables
        const context = createMockContext();

        // When: activate is awaited with the extension context
        const result = await activateExtension(context);

        // Then: all collaborators are constructed, registered, and the activation log is written
        expect(result).toBe(context);
        expect(mocks.createOutputChannel).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.createOutputChannel).toHaveBeenCalledWith(OUTPUT_CHANNEL_NAME);
        expect(mocks.ExtensionStateMock).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.ExtensionStateMock).toHaveBeenCalledWith(context);
        expect(mocks.DataSourceMock).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.DataSourceMock).toHaveBeenCalledWith();
        expect(mocks.dataSourceInstance.registerGitPath).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.AvatarManagerMock).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.AvatarManagerMock).toHaveBeenCalledWith(
          mocks.dataSourceInstance,
          mocks.extensionStateInstance
        );
        expect(mocks.StatusBarItemMock).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.StatusBarItemMock).toHaveBeenCalledWith(context);
        expect(mocks.RepoManagerMock).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.RepoManagerMock).toHaveBeenCalledWith(
          mocks.dataSourceInstance,
          mocks.extensionStateInstance,
          mocks.statusBarItemInstance
        );
        expect(mocks.registerCommand).toHaveBeenCalledTimes(TWO_COMMANDS);
        expect(mocks.registerCommand).toHaveBeenNthCalledWith(
          ONE_CALL,
          VIEW_COMMAND,
          expect.any(Function)
        );
        expect(mocks.registerCommand).toHaveBeenNthCalledWith(
          TWO_COMMANDS,
          CLEAR_AVATAR_CACHE_COMMAND,
          expect.any(Function)
        );
        expect(mocks.diffDocProviderConstruct).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.diffDocProviderConstruct).toHaveBeenCalledWith(mocks.dataSourceInstance);
        expect(mocks.registerTextDocumentContentProvider).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.registerTextDocumentContentProvider).toHaveBeenCalledWith(
          DIFF_DOC_PROVIDER_SCHEME,
          getDiffDocProviderInstance()
        );
        expect(mocks.onDidChangeConfiguration).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.onDidChangeConfiguration).toHaveBeenCalledWith(expect.any(Function));
        expect(context.subscriptions.push).toHaveBeenCalledTimes(ONE_CALL);
        expect(context.subscriptions.push).toHaveBeenCalledWith(
          mocks.outputChannel,
          getCommandDisposable(VIEW_COMMAND),
          getCommandDisposable(CLEAR_AVATAR_CACHE_COMMAND),
          getDiffDocProviderInstance(),
          getTextDocumentDisposable(),
          getConfigurationDisposable(),
          mocks.avatarManagerInstance,
          mocks.repoManagerInstance
        );
        expect(mocks.outputChannel.appendLine).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.outputChannel.appendLine).toHaveBeenCalledWith(ACTIVATION_SUCCESS_MESSAGE);
      });

      it("TC-002: rejects with output channel creation failures before dependency setup starts", async () => {
        // Case: TC-002
        // Given: createOutputChannel throws an error
        const context = createMockContext();
        mocks.createOutputChannel.mockImplementation(() => {
          throw new Error(OUTPUT_FAILED_MESSAGE);
        });

        // When: activate is called and its promise settles
        await expectRejectedError(activate(toExtensionContext(context)), OUTPUT_FAILED_MESSAGE);

        // Then: the same Error and message are propagated and no further setup occurs
        expect(mocks.ExtensionStateMock).not.toHaveBeenCalled();
        expect(mocks.DataSourceMock).not.toHaveBeenCalled();
        expect(mocks.AvatarManagerMock).not.toHaveBeenCalled();
        expect(mocks.StatusBarItemMock).not.toHaveBeenCalled();
        expect(mocks.RepoManagerMock).not.toHaveBeenCalled();
        expect(context.subscriptions.push).not.toHaveBeenCalled();
      });

      it("TC-003: rejects with RepoManager constructor failures before disposables are registered", async () => {
        // Case: TC-003
        // Given: RepoManager construction throws after earlier dependencies are created
        const context = createMockContext();
        mocks.RepoManagerMock.mockImplementation(function (this: unknown): never {
          throw new Error(REPO_INIT_FAILED_MESSAGE);
        });

        // When: activate is called and its promise settles
        await expectRejectedError(activate(toExtensionContext(context)), REPO_INIT_FAILED_MESSAGE);

        // Then: the same Error and message are propagated, earlier constructors ran, and registration never happens
        expect(mocks.AvatarManagerMock).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.StatusBarItemMock).toHaveBeenCalledTimes(ONE_CALL);
        expect(context.subscriptions.push).not.toHaveBeenCalled();
        expect(mocks.outputChannel.appendLine).not.toHaveBeenCalled();
      });

      it("TC-004: rejects with subscription push failures after all disposables are prepared", async () => {
        // Case: TC-004
        // Given: all initialization succeeds but subscriptions.push throws an error
        const pushMock = vi.fn(() => {
          throw new Error(PUSH_FAILED_MESSAGE);
        });
        const context = createMockContext(pushMock);

        // When: activate is called and its promise settles
        await expectRejectedError(activate(toExtensionContext(context)), PUSH_FAILED_MESSAGE);

        // Then: the same Error and message are propagated and the activation log is never written
        expect(mocks.registerCommand).toHaveBeenCalledTimes(TWO_COMMANDS);
        expect(mocks.registerTextDocumentContentProvider).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.onDidChangeConfiguration).toHaveBeenCalledTimes(ONE_CALL);
        expect(pushMock).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.outputChannel.appendLine).not.toHaveBeenCalled();
      });

      it("TC-005: rejects with activation log failures after successful registration", async () => {
        // Case: TC-005
        // Given: registration succeeds but outputChannel.appendLine throws an error
        const context = createMockContext();
        mocks.outputChannel.appendLine.mockImplementation(() => {
          throw new Error(LOG_FAILED_MESSAGE);
        });

        // When: activate is called and its promise settles
        await expectRejectedError(activate(toExtensionContext(context)), LOG_FAILED_MESSAGE);

        // Then: the same Error and message are propagated after subscriptions.push completes
        expect(context.subscriptions.push).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.outputChannel.appendLine).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.outputChannel.appendLine).toHaveBeenCalledWith(ACTIVATION_SUCCESS_MESSAGE);
      });
    });

    // S8: activate() 非同期化と初回 git path 解決の待機
    // S9: DiffDocProvider / AvatarManager の subscriptions 登録
    // @see docs/testing/perspectives/src/extension-test.md
    describe("async activation and subscription ownership", () => {
      it("TC-032: constructs dependent managers only after registerGitPath resolves", async () => {
        // Case: TC-032
        // Given: registerGitPath returns a promise whose resolution the test controls
        const context = createMockContext();
        let resolveRegisterGitPath!: () => void;
        mocks.dataSourceInstance.registerGitPath.mockReturnValue(
          new Promise<void>((resolve) => {
            resolveRegisterGitPath = resolve;
          })
        );

        // When: activate is started, microtasks flush, and the git path resolution completes
        const activatePromise = activate(toExtensionContext(context));
        await flushMicrotasks();
        const avatarManagerCallsBeforeResolve = mocks.AvatarManagerMock.mock.calls.length;
        const repoManagerCallsBeforeResolve = mocks.RepoManagerMock.mock.calls.length;
        resolveRegisterGitPath();
        await activatePromise;

        // Then: managers are constructed only after the resolution, in registerGitPath-first call order
        expect(avatarManagerCallsBeforeResolve).toBe(ZERO_CALLS);
        expect(repoManagerCallsBeforeResolve).toBe(ZERO_CALLS);
        expect(mocks.dataSourceInstance.registerGitPath).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.AvatarManagerMock).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.RepoManagerMock).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.dataSourceInstance.registerGitPath.mock.invocationCallOrder[0]).toBeLessThan(
          mocks.AvatarManagerMock.mock.invocationCallOrder[0]
        );
        expect(mocks.dataSourceInstance.registerGitPath.mock.invocationCallOrder[0]).toBeLessThan(
          mocks.RepoManagerMock.mock.invocationCallOrder[0]
        );
      });

      it("TC-033: does not construct RepoManager while registerGitPath is still pending", async () => {
        // Case: TC-033
        // Given: registerGitPath returns a promise that never resolves during the test
        const context = createMockContext();
        mocks.dataSourceInstance.registerGitPath.mockReturnValue(new Promise<void>(() => {}));

        // When: activate is started and microtasks are flushed without resolving the git path
        void activate(toExtensionContext(context));
        await flushMicrotasks();

        // Then: no Git-command-starting manager has been constructed yet
        expect(mocks.dataSourceInstance.registerGitPath).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.RepoManagerMock).toHaveBeenCalledTimes(ZERO_CALLS);
        expect(mocks.AvatarManagerMock).toHaveBeenCalledTimes(ZERO_CALLS);
      });

      it("TC-034: registers the DiffDocProvider instance itself in subscriptions", async () => {
        // Case: TC-034
        // Given: activation completes and subscriptions.push recorded its arguments
        const context = await activateExtension();

        // When: the pushed subscription elements are inspected
        const pushedSubscriptions = getPushedSubscriptions(context);

        // Then: the exact DiffDocProvider instance (same reference) is among the subscriptions
        expect(pushedSubscriptions).toContain(getDiffDocProviderInstance());
      });

      it("TC-035: registers the provider registration disposable as a separate element", async () => {
        // Case: TC-035
        // Given: activation completes and subscriptions.push recorded its arguments
        const context = await activateExtension();

        // When: the pushed subscription elements are inspected
        const pushedSubscriptions = getPushedSubscriptions(context);

        // Then: the disposable returned by registerTextDocumentContentProvider is a distinct element
        const registrationDisposable = getTextDocumentDisposable();
        expect(pushedSubscriptions).toContain(registrationDisposable);
        expect(registrationDisposable).not.toBe(getDiffDocProviderInstance());
      });

      it("TC-036: registers the AvatarManager instance in subscriptions", async () => {
        // Case: TC-036
        // Given: activation completes and subscriptions.push recorded its arguments
        const context = await activateExtension();

        // When: the pushed subscription elements are inspected
        const pushedSubscriptions = getPushedSubscriptions(context);

        // Then: the exact AvatarManager instance (same reference) is among the subscriptions
        expect(pushedSubscriptions).toContain(mocks.avatarManagerInstance);
      });

      it("TC-037: disposing every subscription disposes DiffDocProvider and AvatarManager once each", async () => {
        // Case: TC-037
        // Given: activation completes and all subscription elements are available
        const context = await activateExtension();
        const pushedSubscriptions = getPushedSubscriptions(context);

        // When: dispose is invoked on every pushed subscription element
        for (const subscription of pushedSubscriptions) {
          (subscription as { dispose?: () => void }).dispose?.();
        }

        // Then: DiffDocProvider.dispose and AvatarManager.dispose are each called exactly once
        expect(mocks.diffDocProviderDispose).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.avatarManagerInstance.dispose).toHaveBeenCalledTimes(ONE_CALL);
      });
    });

    describe("git-keizu.view command", () => {
      it("TC-006: forwards a Uri argument as rootUri to GitKeizuView.createOrShow", async () => {
        // Case: TC-006
        // Given: activate registers the view command and the command is invoked with a Uri argument
        await activateExtension();
        const rootUri = vscode.Uri.file(DEFAULT_REPO_PATH);

        // When: the view command handler is called with the Uri argument
        invokeViewCommand(rootUri);

        // Then: createOrShow receives the same Uri instance as the rootUri argument
        expect(mocks.createOrShow).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.createOrShow).toHaveBeenCalledWith(
          DEFAULT_EXTENSION_PATH,
          mocks.dataSourceInstance,
          mocks.extensionStateInstance,
          mocks.avatarManagerInstance,
          mocks.repoManagerInstance,
          rootUri
        );
      });

      it("TC-007: forwards an object rootUri property when it contains a Uri instance", async () => {
        // Case: TC-007
        // Given: activate registers the view command and the handler receives an object with rootUri: Uri
        await activateExtension();
        const rootUri = vscode.Uri.file(DEFAULT_REPO_PATH);

        // When: the view command handler is called with the SourceControl-like object
        invokeViewCommand({ rootUri });

        // Then: createOrShow receives the nested Uri instance as the rootUri argument
        expect(mocks.createOrShow).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.createOrShow).toHaveBeenCalledWith(
          DEFAULT_EXTENSION_PATH,
          mocks.dataSourceInstance,
          mocks.extensionStateInstance,
          mocks.avatarManagerInstance,
          mocks.repoManagerInstance,
          rootUri
        );
      });

      it("TC-008: falls back to undefined when rootUri exists but is not a Uri instance", async () => {
        // Case: TC-008
        // Given: activate registers the view command and the handler receives object inputs whose rootUri is invalid
        await activateExtension();
        const invalidArguments = [{ rootUri: "not-a-uri" }, { rootUri: null }, { rootUri: {} }];

        // When: the view command handler is called with each invalid rootUri shape
        for (const invalidArgument of invalidArguments) {
          mocks.createOrShow.mockClear();
          invokeViewCommand(invalidArgument);

          // Then: createOrShow receives undefined as the rootUri argument for that invalid shape
          expect(mocks.createOrShow).toHaveBeenCalledTimes(ONE_CALL);
          expect(mocks.createOrShow).toHaveBeenCalledWith(
            DEFAULT_EXTENSION_PATH,
            mocks.dataSourceInstance,
            mocks.extensionStateInstance,
            mocks.avatarManagerInstance,
            mocks.repoManagerInstance,
            undefined
          );
        }
      });

      it("TC-009: falls back to undefined for nullish and primitive command arguments", async () => {
        // Case: TC-009
        // Given: activate registers the view command and the handler receives nullish or primitive arguments
        await activateExtension();
        const invalidArguments = [undefined, null, "repo", ZERO_CALLS, false];

        // When: the view command handler is called with each nullish or primitive value
        for (const invalidArgument of invalidArguments) {
          mocks.createOrShow.mockClear();
          invokeViewCommand(invalidArgument);

          // Then: createOrShow receives undefined as the rootUri argument for that invocation
          expect(mocks.createOrShow).toHaveBeenCalledTimes(ONE_CALL);
          expect(mocks.createOrShow).toHaveBeenCalledWith(
            DEFAULT_EXTENSION_PATH,
            mocks.dataSourceInstance,
            mocks.extensionStateInstance,
            mocks.avatarManagerInstance,
            mocks.repoManagerInstance,
            undefined
          );
        }
      });

      it("TC-010: rethrows createOrShow failures from the view command handler", async () => {
        // Case: TC-010
        // Given: activate registers the view command and GitKeizuView.createOrShow throws an error
        await activateExtension();
        const rootUri = vscode.Uri.file(DEFAULT_REPO_PATH);
        mocks.createOrShow.mockImplementation(() => {
          throw new Error(SHOW_FAILED_MESSAGE);
        });

        // When: the view command handler is called
        const commandAction = () => invokeViewCommand(rootUri);

        // Then: the same Error and message are propagated from the command handler
        expectThrownError(commandAction, SHOW_FAILED_MESSAGE);
      });
    });

    describe("git-keizu.clearAvatarCache command", () => {
      it("TC-011: delegates to AvatarManager.clearCache exactly once", async () => {
        // Case: TC-011
        // Given: activate registers the clearAvatarCache command and AvatarManager.clearCache is observable
        await activateExtension();

        // When: the clearAvatarCache command handler is called
        invokeClearAvatarCacheCommand();

        // Then: AvatarManager.clearCache is invoked exactly once with no arguments
        expect(mocks.avatarManagerInstance.clearCache).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.avatarManagerInstance.clearCache).toHaveBeenCalledWith();
      });

      it("TC-012: rethrows AvatarManager.clearCache failures from the command handler", async () => {
        // Case: TC-012
        // Given: activate registers the clearAvatarCache command and AvatarManager.clearCache throws an error
        await activateExtension();
        mocks.avatarManagerInstance.clearCache.mockImplementation(() => {
          throw new Error(CLEAR_FAILED_MESSAGE);
        });

        // When: the clearAvatarCache command handler is called
        const commandAction = () => invokeClearAvatarCacheCommand();

        // Then: the same Error and message are propagated from the command handler
        expectThrownError(commandAction, CLEAR_FAILED_MESSAGE);
      });
    });

    describe("configuration change routing", () => {
      it("TC-024: refreshes the status bar item when only showStatusBarItem changes", async () => {
        // Case: TC-024
        // Given: activate registers the configuration listener and only showStatusBarItem matches
        await activateExtension();
        const configHandler = getConfigurationChangeHandler();
        const event = createConfigurationChangeEvent([SHOW_STATUS_BAR_ITEM_SETTING]);
        mocks.dataSourceInstance.registerGitPath.mockClear();

        // When: the configuration change handler is called
        configHandler(event);

        // Then: statusBarItem.refresh is called once and no other handlers run
        expect(mocks.statusBarItemInstance.refresh).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.dataSourceInstance.generateGitCommandFormats).not.toHaveBeenCalled();
        expect(mocks.repoManagerInstance.maxDepthOfRepoSearchChanged).not.toHaveBeenCalled();
        expect(mocks.dataSourceInstance.registerGitPath).not.toHaveBeenCalled();
      });

      it("TC-025: regenerates git command formats when only dateType changes", async () => {
        // Case: TC-025
        // Given: activate registers the configuration listener and only dateType matches
        await activateExtension();
        const configHandler = getConfigurationChangeHandler();
        const event = createConfigurationChangeEvent([DATE_TYPE_SETTING]);
        mocks.dataSourceInstance.registerGitPath.mockClear();

        // When: the configuration change handler is called
        configHandler(event);

        // Then: dataSource.generateGitCommandFormats is called once and the other handlers do not run
        expect(mocks.statusBarItemInstance.refresh).not.toHaveBeenCalled();
        expect(mocks.dataSourceInstance.generateGitCommandFormats).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.repoManagerInstance.maxDepthOfRepoSearchChanged).not.toHaveBeenCalled();
        expect(mocks.dataSourceInstance.registerGitPath).not.toHaveBeenCalled();
      });

      it("TC-026: notifies RepoManager when only maxDepthOfRepoSearch changes", async () => {
        // Case: TC-026
        // Given: activate registers the configuration listener and only maxDepthOfRepoSearch matches
        await activateExtension();
        const configHandler = getConfigurationChangeHandler();
        const event = createConfigurationChangeEvent([MAX_DEPTH_OF_REPO_SEARCH_SETTING]);
        mocks.dataSourceInstance.registerGitPath.mockClear();

        // When: the configuration change handler is called
        configHandler(event);

        // Then: repoManager.maxDepthOfRepoSearchChanged is called once and the other handlers do not run
        expect(mocks.statusBarItemInstance.refresh).not.toHaveBeenCalled();
        expect(mocks.dataSourceInstance.generateGitCommandFormats).not.toHaveBeenCalled();
        expect(mocks.repoManagerInstance.maxDepthOfRepoSearchChanged).toHaveBeenCalledTimes(
          ONE_CALL
        );
        expect(mocks.dataSourceInstance.registerGitPath).not.toHaveBeenCalled();
      });

      it("TC-027: registers the git path when only git.path changes", async () => {
        // Case: TC-027
        // Given: activate registers the configuration listener and only git.path matches
        await activateExtension();
        const configHandler = getConfigurationChangeHandler();
        const event = createConfigurationChangeEvent([GIT_PATH_SETTING]);
        mocks.dataSourceInstance.registerGitPath.mockClear();

        // When: the configuration change handler is called
        configHandler(event);

        // Then: dataSource.registerGitPath is called once and the other handlers do not run
        expect(mocks.statusBarItemInstance.refresh).not.toHaveBeenCalled();
        expect(mocks.dataSourceInstance.generateGitCommandFormats).not.toHaveBeenCalled();
        expect(mocks.repoManagerInstance.maxDepthOfRepoSearchChanged).not.toHaveBeenCalled();
        expect(mocks.dataSourceInstance.registerGitPath).toHaveBeenCalledTimes(ONE_CALL);
      });

      it("TC-028: performs no action when no watched setting changes", async () => {
        // Case: TC-028
        // Given: activate registers the configuration listener and no watched setting matches
        await activateExtension();
        const configHandler = getConfigurationChangeHandler();
        const event = createConfigurationChangeEvent([]);
        mocks.dataSourceInstance.registerGitPath.mockClear();

        // When: the configuration change handler is called
        configHandler(event);

        // Then: none of the routed handlers are invoked
        expect(mocks.statusBarItemInstance.refresh).not.toHaveBeenCalled();
        expect(mocks.dataSourceInstance.generateGitCommandFormats).not.toHaveBeenCalled();
        expect(mocks.repoManagerInstance.maxDepthOfRepoSearchChanged).not.toHaveBeenCalled();
        expect(mocks.dataSourceInstance.registerGitPath).not.toHaveBeenCalled();
      });

      it("TC-029: runs both handlers when showStatusBarItem and dateType both match", async () => {
        // Case: TC-029
        // Given: independent if statements and both showStatusBarItem and dateType report true
        await activateExtension();
        const configHandler = getConfigurationChangeHandler();
        const event = createConfigurationChangeEvent([
          SHOW_STATUS_BAR_ITEM_SETTING,
          DATE_TYPE_SETTING
        ]);
        mocks.dataSourceInstance.registerGitPath.mockClear();

        // When: the configuration change handler is called
        configHandler(event);

        // Then: both handlers run once each (old else-if chain only ran refresh)
        expect(mocks.statusBarItemInstance.refresh).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.dataSourceInstance.generateGitCommandFormats).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.repoManagerInstance.maxDepthOfRepoSearchChanged).not.toHaveBeenCalled();
        expect(mocks.dataSourceInstance.registerGitPath).not.toHaveBeenCalled();
      });

      it("TC-030: runs all four handlers when every watched setting matches", async () => {
        // Case: TC-030
        // Given: independent if statements and all four watched settings report true
        await activateExtension();
        const configHandler = getConfigurationChangeHandler();
        const event = createConfigurationChangeEvent([
          SHOW_STATUS_BAR_ITEM_SETTING,
          DATE_TYPE_SETTING,
          MAX_DEPTH_OF_REPO_SEARCH_SETTING,
          GIT_PATH_SETTING
        ]);
        mocks.dataSourceInstance.registerGitPath.mockClear();

        // When: the configuration change handler is called
        configHandler(event);

        // Then: all four routed handlers run exactly once
        expect(mocks.statusBarItemInstance.refresh).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.dataSourceInstance.generateGitCommandFormats).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.repoManagerInstance.maxDepthOfRepoSearchChanged).toHaveBeenCalledTimes(
          ONE_CALL
        );
        expect(mocks.dataSourceInstance.registerGitPath).toHaveBeenCalledTimes(ONE_CALL);
      });

      it("TC-031: propagates a handler failure and skips the later independent ifs", async () => {
        // Case: TC-031
        // Given: showStatusBarItem matches and statusBarItem.refresh throws
        await activateExtension();
        const configHandler = getConfigurationChangeHandler();
        const event = createConfigurationChangeEvent([SHOW_STATUS_BAR_ITEM_SETTING]);
        mocks.dataSourceInstance.registerGitPath.mockClear();
        mocks.statusBarItemInstance.refresh.mockImplementation(() => {
          throw new Error(REFRESH_FAILED_MESSAGE);
        });

        // When: the configuration change handler is called
        const configurationAction = () => configHandler(event);

        // Then: the same Error and message propagate and later ifs are not evaluated
        expectThrownError(configurationAction, REFRESH_FAILED_MESSAGE);
        expect(mocks.dataSourceInstance.generateGitCommandFormats).not.toHaveBeenCalled();
        expect(mocks.repoManagerInstance.maxDepthOfRepoSearchChanged).not.toHaveBeenCalled();
        expect(mocks.dataSourceInstance.registerGitPath).not.toHaveBeenCalled();
      });

      it("TC-021: notifies the open panel when showRecentActions changes alone", async () => {
        // Case: TC-021
        // Given: activate registers the configuration listener and a panel exposes notifyShowRecentActionsChanged
        await activateExtension();
        const configHandler = getConfigurationChangeHandler();
        mocks.gitKeizuViewModule.GitKeizuView.currentPanel = {
          notifyShowRecentActionsChanged: mocks.notifyShowRecentActionsChanged
        };
        const event = createConfigurationChangeEvent([SHOW_RECENT_ACTIONS_SETTING]);
        mocks.dataSourceInstance.registerGitPath.mockClear();

        // When: the configuration change handler is called
        configHandler(event);

        // Then: only notifyShowRecentActionsChanged runs; the other routed handlers are not invoked
        expect(mocks.notifyShowRecentActionsChanged).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.statusBarItemInstance.refresh).not.toHaveBeenCalled();
        expect(mocks.dataSourceInstance.generateGitCommandFormats).not.toHaveBeenCalled();
        expect(mocks.repoManagerInstance.maxDepthOfRepoSearchChanged).not.toHaveBeenCalled();
        expect(mocks.dataSourceInstance.registerGitPath).not.toHaveBeenCalled();
      });

      it("TC-022: notifies showRecentActions even when another watched setting also changes", async () => {
        // Case: TC-022
        // Given: showStatusBarItem and showRecentActions both report true and the panel is open
        await activateExtension();
        const configHandler = getConfigurationChangeHandler();
        mocks.gitKeizuViewModule.GitKeizuView.currentPanel = {
          notifyShowRecentActionsChanged: mocks.notifyShowRecentActionsChanged
        };
        const event = createConfigurationChangeEvent([
          SHOW_STATUS_BAR_ITEM_SETTING,
          SHOW_RECENT_ACTIONS_SETTING
        ]);

        // When: the configuration change handler is called
        configHandler(event);

        // Then: statusBarItem.refresh routes as usual and the recent-actions notification also fires
        expect(mocks.statusBarItemInstance.refresh).toHaveBeenCalledTimes(ONE_CALL);
        expect(mocks.notifyShowRecentActionsChanged).toHaveBeenCalledTimes(ONE_CALL);
      });

      it("TC-023: short-circuits cleanly when no panel is open", async () => {
        // Case: TC-023
        // Given: GitKeizuView.currentPanel is undefined and only showRecentActions matches
        await activateExtension();
        const configHandler = getConfigurationChangeHandler();
        mocks.gitKeizuViewModule.GitKeizuView.currentPanel = undefined;
        const event = createConfigurationChangeEvent([SHOW_RECENT_ACTIONS_SETTING]);

        // When: the configuration change handler is called
        const configurationAction = () => configHandler(event);

        // Then: optional chaining short-circuits and no error or side-effect occurs
        expect(configurationAction).not.toThrow();
        expect(mocks.notifyShowRecentActionsChanged).not.toHaveBeenCalled();
      });
    });
  });

  describe("deactivate", () => {
    it("TC-020: returns undefined and performs no additional work before or after activation", async () => {
      // Case: TC-020
      // Given: deactivate is called once before activation and twice after activation
      const firstResult = deactivate();
      expect(firstResult).toBeUndefined();
      expect(mocks.createOutputChannel).not.toHaveBeenCalled();

      await activateExtension();
      const outputChannelCallCountAfterActivate = mocks.createOutputChannel.mock.calls.length;
      const registerCommandCallCountAfterActivate = mocks.registerCommand.mock.calls.length;
      const logCallCountAfterActivate = mocks.outputChannel.appendLine.mock.calls.length;

      // When: deactivate is called again after activation
      const secondResult = deactivate();
      const thirdResult = deactivate();

      // Then: deactivate keeps returning undefined and does not trigger any new VS Code API calls
      expect(secondResult).toBeUndefined();
      expect(thirdResult).toBeUndefined();
      expect(mocks.createOutputChannel).toHaveBeenCalledTimes(outputChannelCallCountAfterActivate);
      expect(mocks.registerCommand).toHaveBeenCalledTimes(registerCommandCallCountAfterActivate);
      expect(mocks.outputChannel.appendLine).toHaveBeenCalledTimes(logCallCountAfterActivate);
    });
  });
});
