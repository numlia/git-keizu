import * as crypto from "node:crypto";
import { EventEmitter } from "node:events";

import { vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn()
}));

vi.mock("node:https", () => ({
  get: vi.fn()
}));

vi.mock("../../src/gitGraphView", () => ({
  GitKeizuView: class GitKeizuView {
    public sendMessage() {}
  }
}));

import * as fs from "node:fs/promises";
import * as https from "node:https";

import { AvatarManager } from "../../src/avatarManager";
import type { DataSource } from "../../src/dataSource";
import type { ExtensionState } from "../../src/extensionState";
import type { GitKeizuView } from "../../src/gitGraphView";
import type { Avatar, AvatarCache } from "../../src/types";

export const ASYNC_FLUSH_TURNS = 5;
export const AVATAR_STORAGE_PATH = "/mock/avatar-storage";
export const DEFAULT_EMAIL = "avatar@example.com";
export const DEFAULT_IMAGE_BYTES = "avatar-bytes";
export const DEFAULT_REPO_PATH = "/mock/repo";
export const DEFAULT_TIME_ISO = "2026-03-22T09:08:02.893Z";
export const DEFAULT_TIME_MS = new Date(DEFAULT_TIME_ISO).getTime();
export const FETCH_AVATAR_COMMAND = "fetchAvatar";
export const FOUR_DAYS_MS = 345_600_000;
export const FOURTEEN_DAYS_MS = 1_209_600_000;
export const GITHUB_HOSTNAME = "api.github.com";
export const GITHUB_RATE_LIMIT_HEADER = "x-ratelimit-remaining";
export const GITHUB_RATE_LIMIT_RESET_HEADER = "x-ratelimit-reset";
export const GITHUB_REMOTE_OWNER = "owner";
export const GITHUB_REMOTE_REPO = "repo";
export const GITHUB_REMOTE_URL = `https://github.com/${GITHUB_REMOTE_OWNER}/${GITHUB_REMOTE_REPO}.git`;
export const GITLAB_API_HOSTNAME = "gitlab.com";
export const GITLAB_RATE_LIMIT_HEADER = "ratelimit-remaining";
export const GITLAB_RATE_LIMIT_RESET_HEADER = "ratelimit-reset";
export const GITLAB_REMOTE_URL = "https://gitlab.com/group/project.git";
export const GRAVATAR_DEFAULT_IDENTICON = "identicon";
export const GRAVATAR_DEFAULT_MISSING = "404";
export const IMAGE_CONTENT_TYPE_PNG = "image/png; charset=utf-8";
export const IMAGE_CONTENT_TYPE_SVG = "image/svg+xml";
export const INVALID_GITHUB_REMOTE_URL = `https://github.com/${GITHUB_REMOTE_OWNER}`;
export const INVALID_IMAGE_HOST_URL = "https://example.com/avatar.png";
export const INVALID_IMAGE_URL = "not a url";
export const NETWORK_ERROR_MESSAGE = "network failed";
export const NON_IMAGE_CONTENT_TYPE = "text/html";
export const SHORT_COMMITS = ["commit-0", "commit-1", "commit-2"];
export const LONG_COMMITS = [
  "commit-0",
  "commit-1",
  "commit-2",
  "commit-3",
  "commit-4",
  "commit-5",
  "commit-6",
  "commit-7",
  "commit-8"
] as const;
export const SVG_IMAGE_NAME = "avatar.svg+xml";
export const TEN_MINUTES_MS = 600_000;
export const TEN_SECONDS_MS = 10_000;
export const FIVE_MINUTES_MS = 300_000;
export const URL_REPLACE_ERROR_FRAGMENT = "replace";
export const PNG_IMAGE_NAME = "avatar.png";
export const SECONDARY_PNG_IMAGE_NAME = "avatar-2.png";
export const IDENTICON_IMAGE_NAME = "identicon.png";

export interface AvatarRequestItem {
  email: string;
  repo: string;
  commits: string[];
  checkAfter: number;
  attempts: number;
}

export interface GitHubRemoteSource {
  type: "github";
  owner: string;
  repo: string;
}

export interface GitLabRemoteSource {
  type: "gitlab";
}

export interface GravatarRemoteSource {
  type: "gravatar";
}

export type RemoteSource = GitHubRemoteSource | GitLabRemoteSource | GravatarRemoteSource;

export interface AvatarRequestQueueWithPrivate {
  queue: AvatarRequestItem[];
  itemsAvailableCallback: () => void;
  add: (email: string, repo: string, commits: string[], immediate: boolean) => void;
  addItem: (item: AvatarRequestItem, checkAfter: number, failedAttempt: boolean) => void;
  hasItems: () => boolean;
  takeItem: () => AvatarRequestItem | null;
  insertItem: (item: AvatarRequestItem) => void;
}

export type AvatarManagerWithPrivate = AvatarManager & {
  avatarStorageFolder: string;
  avatars: AvatarCache;
  fetchAvatarsInterval: () => Promise<void>;
  fetchFromGitLab: (avatarRequest: AvatarRequestItem) => void;
  fetchFromGithub: (avatarRequest: AvatarRequestItem, owner: string, repo: string) => void;
  fetchFromGravatar: (avatarRequest: AvatarRequestItem) => Promise<void>;
  getRemoteSource: (avatarRequest: AvatarRequestItem) => Promise<RemoteSource>;
  githubTimeout: number;
  gitLabTimeout: number;
  interval: ReturnType<typeof setInterval> | null;
  downloadAvatarImage: (email: string, imageUrl: string) => Promise<string | null>;
  queue: AvatarRequestQueueWithPrivate;
  remoteSourceCache: { [repo: string]: RemoteSource };
  saveAvatar: (email: string, image: string, identicon: boolean) => void;
  sendAvatarToWebView: (email: string, onError: () => void) => Promise<void>;
  view: GitKeizuView | null;
};

export interface MockDataSource {
  getRemoteUrl: ReturnType<typeof vi.fn>;
}

export interface MockExtensionState {
  clearAvatarCache: ReturnType<typeof vi.fn>;
  getAvatarCache: ReturnType<typeof vi.fn>;
  getAvatarStoragePath: ReturnType<typeof vi.fn>;
  removeAvatarFromCache: ReturnType<typeof vi.fn>;
  saveAvatar: ReturnType<typeof vi.fn>;
}

export interface AvatarManagerHarness {
  dataSource: MockDataSource;
  extensionState: MockExtensionState;
  manager: AvatarManagerWithPrivate;
  queue: AvatarRequestQueueWithPrivate;
  sendMessage: ReturnType<typeof vi.fn>;
  view: GitKeizuView;
}

export interface MockHttpsResponseOptions {
  chunks?: Buffer[];
  headers?: Record<string, string>;
  statusCode: number;
}

interface MockIncomingMessage extends EventEmitter {
  headers: Record<string, string>;
  statusCode?: number;
}

interface MockClientRequest extends EventEmitter {}

export const fsMocks = {
  readFile: vi.mocked(fs.readFile),
  writeFile: vi.mocked(fs.writeFile)
};

export const httpsGetMock = vi.mocked(https.get);

export function createAvatarCacheEntry(overrides: Partial<Avatar> = {}): Avatar {
  return {
    image: PNG_IMAGE_NAME,
    identicon: false,
    timestamp: DEFAULT_TIME_MS,
    ...overrides
  };
}

export function createAvatarRequest(overrides: Partial<AvatarRequestItem> = {}): AvatarRequestItem {
  return {
    email: overrides.email ?? DEFAULT_EMAIL,
    repo: overrides.repo ?? DEFAULT_REPO_PATH,
    commits: [...(overrides.commits ?? SHORT_COMMITS)],
    checkAfter: overrides.checkAfter ?? 0,
    attempts: overrides.attempts ?? 0
  };
}

export function createAvatarManager(
  options: {
    avatarCache?: AvatarCache;
    clearCallsAfterCreate?: boolean;
    suppressQueueCallback?: boolean;
  } = {}
): AvatarManagerHarness {
  const avatarCache = options.avatarCache ?? {};
  const dataSource: MockDataSource = {
    getRemoteUrl: vi.fn().mockResolvedValue(null)
  };
  const extensionState: MockExtensionState = {
    clearAvatarCache: vi.fn(),
    getAvatarCache: vi.fn(() => avatarCache),
    getAvatarStoragePath: vi.fn(() => AVATAR_STORAGE_PATH),
    removeAvatarFromCache: vi.fn(),
    saveAvatar: vi.fn()
  };

  const manager = new AvatarManager(
    dataSource as unknown as DataSource,
    extensionState as unknown as ExtensionState
  ) as AvatarManagerWithPrivate;

  if (options.suppressQueueCallback !== false) {
    manager.queue.itemsAvailableCallback = vi.fn();
  }

  const sendMessage = vi.fn();
  const view = Object.create(null) as GitKeizuView & { sendMessage: typeof sendMessage };
  view.sendMessage = sendMessage;

  if (options.clearCallsAfterCreate !== false) {
    vi.clearAllMocks();
  }

  return {
    dataSource,
    extensionState,
    manager,
    queue: manager.queue,
    sendMessage,
    view
  };
}

export function createGravatarUrl(
  email: string,
  defaultImage: typeof GRAVATAR_DEFAULT_IDENTICON | typeof GRAVATAR_DEFAULT_MISSING
): string {
  const hash = crypto.createHash("md5").update(email).digest("hex");
  return `https://secure.gravatar.com/avatar/${hash}?s=54&d=${defaultImage}`;
}

export function createStoredAvatarName(email: string, format: string): string {
  const hash = crypto.createHash("sha256").update(email).digest("hex");
  return `${hash}.${format}`;
}

export function createDataUri(fileName: string, rawData: string): string {
  const fileExtension = fileName.split(".")[1];
  const encoded = Buffer.from(rawData).toString("base64");
  return `data:image/${fileExtension};base64,${encoded}`;
}

export async function flushAsyncWork(turns: number = ASYNC_FLUSH_TURNS): Promise<void> {
  for (let index = 0; index < turns; index += 1) {
    await Promise.resolve();
  }
}

export function mockHttpsError(message: string = NETWORK_ERROR_MESSAGE): MockClientRequest {
  const request = new EventEmitter() as MockClientRequest;
  httpsGetMock.mockImplementationOnce(() => {
    queueMicrotask(() => {
      request.emit("error", new Error(message));
    });
    return request as unknown as ReturnType<typeof https.get>;
  });
  return request;
}

export function mockHttpsResponse(options: MockHttpsResponseOptions): MockClientRequest {
  const request = new EventEmitter() as MockClientRequest;

  httpsGetMock.mockImplementationOnce((_requestOptions, callback) => {
    const response = new EventEmitter() as MockIncomingMessage;
    response.statusCode = options.statusCode;
    response.headers = options.headers ?? {};

    if (callback !== undefined) {
      callback(response);
    }

    queueMicrotask(() => {
      for (const chunk of options.chunks ?? []) {
        response.emit("data", chunk);
      }
      response.emit("end");
    });

    return request as unknown as ReturnType<typeof https.get>;
  });

  return request;
}

export function resetAvatarManagerTestEnvironment(): void {
  vi.clearAllMocks();
  vi.useRealTimers();
  fsMocks.readFile.mockReset();
  fsMocks.writeFile.mockReset();
  httpsGetMock.mockReset();
}

export function useFixedTime(timestamp: number = DEFAULT_TIME_MS): void {
  vi.useFakeTimers();
  vi.setSystemTime(timestamp);
}
