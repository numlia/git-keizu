import * as path from "node:path";

import * as vscode from "vscode";

import { getPathFromStr, getPathFromUri } from "./utils";

const watchedRepositoryStateFiles = new Set([
  "HEAD",
  "index",
  "config",
  "packed-refs",
  "refs/stash"
]);
const watchedRepositoryStatePrefixes = ["refs/heads/", "refs/remotes/", "refs/tags/"];

function normaliseWatchPath(pathValue: string) {
  return pathValue.split(path.sep).join("/");
}

function isWatchedRepositoryStatePath(pathValue: string) {
  return (
    watchedRepositoryStateFiles.has(pathValue) ||
    watchedRepositoryStatePrefixes.some(
      (prefix) => pathValue.startsWith(prefix) && pathValue !== prefix
    )
  );
}

export class RepoFileWatcher {
  private watchRoots: string[] = [];
  private readonly repoChangeCallback: () => void;
  private fsWatchers: vscode.FileSystemWatcher[] = [];
  private refreshTimeout: NodeJS.Timeout | null = null;
  private muteCount: number = 0;
  private resumeAt: number = 0;

  constructor(repoChangeCallback: () => void) {
    this.repoChangeCallback = repoChangeCallback;
  }

  public start(watchRoots: string[]) {
    this.stop();

    this.watchRoots = watchRoots.map((watchRoot) => getPathFromStr(path.normalize(watchRoot)));
    this.fsWatchers = this.watchRoots.map((watchRoot) => {
      const fsWatcher = vscode.workspace.createFileSystemWatcher(`${watchRoot}/**`);
      fsWatcher.onDidCreate((uri) => this.refresh(uri));
      fsWatcher.onDidChange((uri) => this.refresh(uri));
      fsWatcher.onDidDelete((uri) => this.refresh(uri));
      return fsWatcher;
    });
  }

  public stop() {
    for (const fsWatcher of this.fsWatchers) {
      fsWatcher.dispose();
    }
    this.fsWatchers = [];
    this.watchRoots = [];
  }

  public mute() {
    this.muteCount += 1;
  }

  public unmute() {
    if (this.muteCount > 0) {
      this.muteCount -= 1;
    }
    this.resumeAt = new Date().getTime() + 1500;
  }

  private refresh(uri: vscode.Uri) {
    if (this.muteCount > 0) return;
    const filePath = path.normalize(getPathFromUri(uri));
    const matchingPath = this.watchRoots
      .map((watchRoot) => path.relative(watchRoot, filePath))
      .find(
        (candidate) =>
          candidate !== "" &&
          !candidate.startsWith("..") &&
          !path.isAbsolute(candidate) &&
          isWatchedRepositoryStatePath(normaliseWatchPath(candidate))
      );
    if (matchingPath === undefined) return;
    if (new Date().getTime() < this.resumeAt) return;

    if (this.refreshTimeout !== null) {
      clearTimeout(this.refreshTimeout);
    }
    this.refreshTimeout = setTimeout(() => {
      this.repoChangeCallback();
    }, 750);
  }
}
