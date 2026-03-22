import { vi } from "vitest";

const DEFAULT_MAX_DEPTH = 1;
export const WATCHER_DEBOUNCE_MS = 1000;

export interface TestUri {
  fsPath: string;
}

export interface TestWorkspaceFolder {
  uri: TestUri;
}

export interface TestWorkspaceChangeEvent {
  added: TestWorkspaceFolder[];
  removed: TestWorkspaceFolder[];
}

type WorkspaceChangeHandler = (event: TestWorkspaceChangeEvent) => Promise<void> | void;
type WatcherEventHandler = (uri: TestUri) => Promise<void> | void;

const { configMock, workspaceMock } = vi.hoisted(() => {
  const defaultMaxDepth = 1;

  return {
    configMock: {
      maxDepthOfRepoSearch: vi.fn(() => defaultMaxDepth)
    },
    workspaceMock: {
      createFileSystemWatcher: vi.fn(),
      onDidChangeWorkspaceFolders: vi.fn(),
      workspaceFolders: undefined as TestWorkspaceFolder[] | undefined
    }
  };
});

vi.mock("node:fs/promises", () => ({
  readdir: vi.fn(),
  stat: vi.fn()
}));

vi.mock("vscode", () => ({
  workspace: workspaceMock
}));

vi.mock("../../src/config", () => ({
  getConfig: vi.fn(() => configMock)
}));

vi.mock("../../src/utils", async () => {
  const actual = await vi.importActual<typeof import("../../src/utils")>("../../src/utils");

  return {
    ...actual,
    getPathFromUri: vi.fn((uri: TestUri) => uri.fsPath)
  };
});

import * as fs from "node:fs/promises";

import * as vscode from "vscode";

import { getConfig } from "../../src/config";
import type { DataSource } from "../../src/dataSource";
import type { ExtensionState } from "../../src/extensionState";
import { RepoManager, repoManagerTestInternals } from "../../src/repoManager";
import type { StatusBarItem } from "../../src/statusBarItem";
import type { GitRepoSet, GitRepoState } from "../../src/types";
import { getPathFromUri } from "../../src/utils";

export interface MockDisposable {
  dispose: ReturnType<typeof vi.fn>;
}

export interface MockFileSystemWatcher {
  changeHandler: WatcherEventHandler | null;
  createHandler: WatcherEventHandler | null;
  deleteHandler: WatcherEventHandler | null;
  dispose: ReturnType<typeof vi.fn>;
  globPattern: string;
  onDidChange: ReturnType<typeof vi.fn>;
  onDidCreate: ReturnType<typeof vi.fn>;
  onDidDelete: ReturnType<typeof vi.fn>;
}

export interface MockDataSource {
  isGitRepository: ReturnType<typeof vi.fn>;
}

export interface MockExtensionState {
  getRepos: ReturnType<typeof vi.fn>;
  saveRepos: ReturnType<typeof vi.fn>;
}

export interface MockStatusBarItem {
  setNumRepos: ReturnType<typeof vi.fn>;
}

export interface RepoManagerHarness {
  dataSource: MockDataSource;
  extensionState: MockExtensionState;
  manager: RepoManagerWithPrivate;
  statusBarItem: MockStatusBarItem;
}

export type RepoManagerWithPrivate = RepoManager & {
  changeEventPaths: string[];
  createEventPaths: string[];
  folderChangeHandler: MockDisposable | null;
  folderWatchers: Record<string, MockFileSystemWatcher>;
  maxDepthOfRepoSearch: number;
  processChangeEvents: () => Promise<void>;
  processChangeEventsTimeout: ReturnType<typeof setTimeout> | null;
  processCreateEvents: () => Promise<void>;
  processCreateEventsTimeout: ReturnType<typeof setTimeout> | null;
  removeRepo: (repo: string) => void;
  removeReposNotInWorkspace: () => void;
  removeReposWithinFolder: (path: string) => boolean;
  repos: GitRepoSet;
  searchDirectoryForRepos: (directory: string, maxDepth: number) => Promise<boolean>;
  searchWorkspaceForRepos: () => Promise<void>;
  sendRepos: () => void;
  startWatchingFolder: (path: string) => void;
  startWatchingFolders: () => void;
  startupTasks: () => Promise<void>;
  stopWatchingFolder: (path: string) => void;
  onWatcherChange: (uri: TestUri) => void;
  onWatcherCreate: (uri: TestUri) => Promise<void>;
  onWatcherDelete: (uri: TestUri) => void;
  isDirectoryWithinRepos: (path: string) => boolean;
  viewCallback: ((repos: GitRepoSet, numRepos: number) => void) | null;
};

type RepoManagerPrototypeWithStartup = {
  startupTasks: () => Promise<void>;
};

type StatResult = Awaited<ReturnType<typeof fs.stat>>;

export const fsMocks = {
  readdir: vi.mocked(fs.readdir),
  stat: vi.mocked(fs.stat)
};

export const repoManagerInternals = {
  doesPathExist: repoManagerTestInternals.doesPathExist,
  isDirectory: repoManagerTestInternals.isDirectory
};

const workspaceChangeRegistrationError = "Workspace change handler is not registered";

let registeredWorkspaceChangeHandler: WorkspaceChangeHandler | null = null;
const createdWatchers: MockFileSystemWatcher[] = [];

function createDisposable(): MockDisposable {
  return {
    dispose: vi.fn()
  };
}

function createMockFileSystemWatcher(globPattern: string): MockFileSystemWatcher {
  const watcher: MockFileSystemWatcher = {
    changeHandler: null,
    createHandler: null,
    deleteHandler: null,
    dispose: vi.fn(),
    globPattern,
    onDidChange: vi.fn(),
    onDidCreate: vi.fn(),
    onDidDelete: vi.fn()
  };

  watcher.onDidCreate.mockImplementation((handler: WatcherEventHandler) => {
    watcher.createHandler = handler;
    return createDisposable();
  });

  watcher.onDidChange.mockImplementation((handler: WatcherEventHandler) => {
    watcher.changeHandler = handler;
    return createDisposable();
  });

  watcher.onDidDelete.mockImplementation((handler: WatcherEventHandler) => {
    watcher.deleteHandler = handler;
    return createDisposable();
  });

  return watcher;
}

function createStatResult(directory: boolean): StatResult {
  return {
    isDirectory: () => directory
  } as unknown as StatResult;
}

function cloneRepoState(state: GitRepoState): GitRepoState {
  return {
    ...state,
    columnWidths: state.columnWidths === null ? null : [...state.columnWidths]
  };
}

export function cloneRepoSet(repos: GitRepoSet): GitRepoSet {
  return Object.fromEntries(
    Object.entries(repos).map(([repo, state]) => [repo, cloneRepoState(state)])
  );
}

export function createRepoState(overrides: Partial<GitRepoState> = {}): GitRepoState {
  return {
    columnWidths: null,
    ...overrides
  };
}

export function createUri(fsPath: string): TestUri {
  return { fsPath };
}

export function createWorkspaceFolder(path: string): TestWorkspaceFolder {
  return {
    uri: createUri(path)
  };
}

export function setWorkspaceFolders(paths: string[] | undefined): void {
  workspaceMock.workspaceFolders =
    paths === undefined ? undefined : paths.map((path) => createWorkspaceFolder(path));
}

export function getCreatedWatchers(): MockFileSystemWatcher[] {
  return [...createdWatchers];
}

export async function triggerWorkspaceChange(event: TestWorkspaceChangeEvent): Promise<void> {
  if (registeredWorkspaceChangeHandler === null) {
    throw new Error(workspaceChangeRegistrationError);
  }

  await registeredWorkspaceChangeHandler(event);
}

export function getWorkspaceChangeHandler(): WorkspaceChangeHandler | null {
  return registeredWorkspaceChangeHandler;
}

export function flushMicrotasks(): Promise<void> {
  return Promise.resolve().then(() => Promise.resolve());
}

export function resetRepoManagerTestEnvironment(): void {
  vi.clearAllMocks();

  registeredWorkspaceChangeHandler = null;
  createdWatchers.length = 0;

  configMock.maxDepthOfRepoSearch.mockReturnValue(DEFAULT_MAX_DEPTH);
  workspaceMock.workspaceFolders = undefined;

  workspaceMock.onDidChangeWorkspaceFolders.mockImplementation(
    (handler: WorkspaceChangeHandler) => {
      registeredWorkspaceChangeHandler = handler;
      return createDisposable() as unknown as vscode.Disposable;
    }
  );

  workspaceMock.createFileSystemWatcher.mockImplementation((globPattern: string) => {
    const watcher = createMockFileSystemWatcher(globPattern);
    createdWatchers.push(watcher);
    return watcher as unknown as vscode.FileSystemWatcher;
  });

  vi.mocked(getPathFromUri).mockImplementation((uri: TestUri) => uri.fsPath);
  fsMocks.readdir.mockResolvedValue([]);
  fsMocks.stat.mockResolvedValue(createStatResult(false));
}

export function createManager(
  options: {
    clearCallsAfterCreate?: boolean;
    maxDepth?: number;
    repos?: GitRepoSet;
    suppressStartup?: boolean;
    workspaceFolders?: string[];
  } = {}
): RepoManagerHarness {
  if (options.workspaceFolders !== undefined) {
    setWorkspaceFolders(options.workspaceFolders);
  }

  if (options.maxDepth !== undefined) {
    configMock.maxDepthOfRepoSearch.mockReturnValue(options.maxDepth);
  }

  const dataSource: MockDataSource = {
    isGitRepository: vi.fn().mockResolvedValue(false)
  };
  const extensionState: MockExtensionState = {
    getRepos: vi.fn().mockReturnValue(cloneRepoSet(options.repos ?? {})),
    saveRepos: vi.fn()
  };
  const statusBarItem: MockStatusBarItem = {
    setNumRepos: vi.fn()
  };

  let startupSpy: ReturnType<typeof vi.spyOn> | null = null;
  if (options.suppressStartup !== false) {
    startupSpy = vi
      .spyOn(RepoManager.prototype as unknown as RepoManagerPrototypeWithStartup, "startupTasks")
      .mockResolvedValue(undefined);
  }

  const manager = new RepoManager(
    dataSource as unknown as DataSource,
    extensionState as unknown as ExtensionState,
    statusBarItem as unknown as StatusBarItem
  ) as RepoManagerWithPrivate;

  startupSpy?.mockRestore();

  if (options.clearCallsAfterCreate !== false) {
    vi.clearAllMocks();
  }

  return {
    dataSource,
    extensionState,
    manager,
    statusBarItem
  };
}

resetRepoManagerTestEnvironment();

export { configMock, getConfig, getPathFromUri, workspaceMock };
