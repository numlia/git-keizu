import * as fs from "node:fs/promises";

import * as vscode from "vscode";

import { getConfig } from "./config";
import { DataSource } from "./dataSource";
import { ExtensionState } from "./extensionState";
import { StatusBarItem } from "./statusBarItem";
import { GitRepoSet, GitRepoState } from "./types";
import { evalPromises, getPathFromUri } from "./utils";

export class RepoManager {
  private readonly dataSource: DataSource;
  private readonly extensionState: ExtensionState;
  private readonly statusBarItem: StatusBarItem;
  private repos: GitRepoSet;
  private maxDepthOfRepoSearch: number;
  private folderWatchers: { [workspace: string]: vscode.FileSystemWatcher } = {};
  private viewCallback: ((repos: GitRepoSet, numRepos: number) => void) | null = null;
  private folderChangeHandler: vscode.Disposable | null;

  private createEventPaths: string[] = [];
  private changeEventPaths: string[] = [];
  private processCreateEventsTimeout: NodeJS.Timeout | null = null;
  private processChangeEventsTimeout: NodeJS.Timeout | null = null;

  constructor(
    dataSource: DataSource,
    extensionState: ExtensionState,
    statusBarItem: StatusBarItem
  ) {
    this.dataSource = dataSource;
    this.extensionState = extensionState;
    this.statusBarItem = statusBarItem;
    this.repos = extensionState.getRepos();
    this.maxDepthOfRepoSearch = getConfig().maxDepthOfRepoSearch();
    this.startupTasks();

    this.folderChangeHandler = vscode.workspace.onDidChangeWorkspaceFolders(async (e) => {
      if (e.added.length > 0) {
        let path,
          changes = false;
        for (let i = 0; i < e.added.length; i++) {
          path = getPathFromUri(e.added[i].uri);
          if (await this.searchDirectoryForRepos(path, this.maxDepthOfRepoSearch)) changes = true;
          this.startWatchingFolder(path);
        }
        if (changes) this.sendRepos();
      }
      if (e.removed.length > 0) {
        let changes = false,
          path;
        for (let i = 0; i < e.removed.length; i++) {
          path = getPathFromUri(e.removed[i].uri);
          if (this.removeReposWithinFolder(path)) changes = true;
          this.stopWatchingFolder(path);
        }
        if (changes) this.sendRepos();
      }
    });
  }

  public dispose() {
    if (this.folderChangeHandler !== null) {
      this.folderChangeHandler.dispose();
      this.folderChangeHandler = null;
    }
    let folders = Object.keys(this.folderWatchers);
    for (let i = 0; i < folders.length; i++) {
      this.stopWatchingFolder(folders[i]);
    }
  }

  public registerViewCallback(viewCallback: (repos: GitRepoSet, numRepos: number) => void) {
    this.viewCallback = viewCallback;
  }

  public deregisterViewCallback() {
    this.viewCallback = null;
  }

  public maxDepthOfRepoSearchChanged() {
    let newDepth = getConfig().maxDepthOfRepoSearch();
    if (newDepth > this.maxDepthOfRepoSearch) {
      this.maxDepthOfRepoSearch = newDepth;
      this.searchWorkspaceForRepos();
    } else {
      this.maxDepthOfRepoSearch = newDepth;
    }
  }

  private async startupTasks() {
    this.removeReposNotInWorkspace();
    if (!(await this.checkReposExist())) this.sendRepos();
    await this.searchWorkspaceForRepos();
    this.startWatchingFolders();
  }

  private removeReposNotInWorkspace() {
    let rootsExact = [],
      rootsFolder = [],
      workspaceFolders = vscode.workspace.workspaceFolders,
      repoPaths = Object.keys(this.repos),
      path;
    if (workspaceFolders !== undefined) {
      for (let i = 0; i < workspaceFolders.length; i++) {
        path = getPathFromUri(workspaceFolders[i].uri);
        rootsExact.push(path);
        rootsFolder.push(`${path}/`);
      }
    }
    for (let i = 0; i < repoPaths.length; i++) {
      if (
        !rootsExact.includes(repoPaths[i]) &&
        !rootsFolder.find((x) => repoPaths[i].startsWith(x))
      )
        this.removeRepo(repoPaths[i]);
    }
  }

  /* Repo Management */
  public getRepos() {
    let repoPaths = Object.keys(this.repos).sort(),
      repos: GitRepoSet = {};
    for (let i = 0; i < repoPaths.length; i++) {
      repos[repoPaths[i]] = this.repos[repoPaths[i]];
    }
    return repos;
  }
  private addRepo(repo: string) {
    this.repos[repo] = { columnWidths: null };
    this.extensionState.saveRepos(this.repos);
  }
  private removeRepo(repo: string) {
    delete this.repos[repo];
    this.extensionState.saveRepos(this.repos);
  }
  private removeReposWithinFolder(path: string) {
    let pathFolder = `${path}/`,
      repoPaths = Object.keys(this.repos),
      changes = false;
    for (let i = 0; i < repoPaths.length; i++) {
      if (repoPaths[i] === path || repoPaths[i].startsWith(pathFolder)) {
        this.removeRepo(repoPaths[i]);
        changes = true;
      }
    }
    return changes;
  }
  private isDirectoryWithinRepos(path: string) {
    let repoPaths = Object.keys(this.repos);
    for (let i = 0; i < repoPaths.length; i++) {
      if (path === repoPaths[i] || path.startsWith(`${repoPaths[i]}/`)) return true;
    }
    return false;
  }
  private sendRepos() {
    let repos = this.getRepos();
    let numRepos = Object.keys(repos).length;
    this.statusBarItem.setNumRepos(numRepos);
    if (this.viewCallback !== null) this.viewCallback(repos, numRepos);
  }
  public async checkReposExist(): Promise<boolean> {
    const repoPaths = Object.keys(this.repos);
    const results = await evalPromises(repoPaths, 3, (p) => this.dataSource.isGitRepository(p));
    let changes = false;
    for (let i = 0; i < repoPaths.length; i++) {
      if (!results[i]) {
        this.removeRepo(repoPaths[i]);
        changes = true;
      }
    }
    if (changes) this.sendRepos();
    return changes;
  }
  public setRepoState(repo: string, state: GitRepoState) {
    if (repo === "__proto__" || repo === "constructor" || repo === "prototype") {
      return;
    }
    this.repos[repo] = state;
    this.extensionState.saveRepos(this.repos);
  }

  /* Repo Searching */
  private async searchWorkspaceForRepos() {
    let rootFolders = vscode.workspace.workspaceFolders,
      changes = false;
    if (rootFolders !== undefined) {
      for (let i = 0; i < rootFolders.length; i++) {
        if (
          await this.searchDirectoryForRepos(
            getPathFromUri(rootFolders[i].uri),
            this.maxDepthOfRepoSearch
          )
        )
          changes = true;
      }
    }
    if (changes) this.sendRepos();
  }
  private async searchDirectoryForRepos(directory: string, maxDepth: number): Promise<boolean> {
    if (this.isDirectoryWithinRepos(directory)) {
      return false;
    }

    try {
      const isRepo = await this.dataSource.isGitRepository(directory);
      if (isRepo) {
        this.addRepo(directory);
        return true;
      }
      if (maxDepth > 0) {
        let dirContents: string[];
        try {
          dirContents = await fs.readdir(directory);
        } catch {
          return false;
        }
        const dirs: string[] = [];
        for (const entry of dirContents) {
          if (entry !== ".git" && (await isDirectory(`${directory}/${entry}`))) {
            dirs.push(`${directory}/${entry}`);
          }
        }
        const results = await evalPromises(dirs, 2, (dir) =>
          this.searchDirectoryForRepos(dir, maxDepth - 1)
        );
        return results.includes(true);
      }
      return false;
    } catch {
      return false;
    }
  }

  /* Workspace Folder Watching */
  private startWatchingFolders() {
    let rootFolders = vscode.workspace.workspaceFolders;
    if (rootFolders !== undefined) {
      for (let i = 0; i < rootFolders.length; i++) {
        this.startWatchingFolder(getPathFromUri(rootFolders[i].uri));
      }
    }
  }
  private startWatchingFolder(path: string) {
    let watcher = vscode.workspace.createFileSystemWatcher(`${path}/**`);
    watcher.onDidCreate((uri) => this.onWatcherCreate(uri));
    watcher.onDidChange((uri) => this.onWatcherChange(uri));
    watcher.onDidDelete((uri) => this.onWatcherDelete(uri));
    this.folderWatchers[path] = watcher;
  }
  private stopWatchingFolder(path: string) {
    this.folderWatchers[path].dispose();
    delete this.folderWatchers[path];
  }
  private async onWatcherCreate(uri: vscode.Uri) {
    let path = getPathFromUri(uri);
    if (path.includes("/.git/")) return;
    if (path.endsWith("/.git")) path = path.slice(0, -5);
    if (this.createEventPaths.includes(path)) return;

    this.createEventPaths.push(path);
    if (this.processCreateEventsTimeout !== null) clearTimeout(this.processCreateEventsTimeout);
    this.processCreateEventsTimeout = setTimeout(() => this.processCreateEvents(), 1000);
  }
  private onWatcherChange(uri: vscode.Uri) {
    let path = getPathFromUri(uri);
    if (path.includes("/.git/")) return;
    if (path.endsWith("/.git")) path = path.slice(0, -5);
    if (this.changeEventPaths.includes(path)) return;

    this.changeEventPaths.push(path);
    if (this.processChangeEventsTimeout !== null) clearTimeout(this.processChangeEventsTimeout);
    this.processChangeEventsTimeout = setTimeout(() => this.processChangeEvents(), 1000);
  }
  private onWatcherDelete(uri: vscode.Uri) {
    let path = getPathFromUri(uri);
    if (path.includes("/.git/")) return;
    if (path.endsWith("/.git")) path = path.slice(0, -5);
    if (this.removeReposWithinFolder(path)) this.sendRepos();
  }
  private async processCreateEvents() {
    let path,
      changes = false;
    while ((path = this.createEventPaths.shift())) {
      if (await isDirectory(path)) {
        if (await this.searchDirectoryForRepos(path, this.maxDepthOfRepoSearch)) changes = true;
      }
    }
    this.processCreateEventsTimeout = null;
    if (changes) this.sendRepos();
  }
  private async processChangeEvents() {
    let path,
      changes = false;
    while ((path = this.changeEventPaths.shift())) {
      if (!(await doesPathExist(path))) {
        if (this.removeReposWithinFolder(path)) changes = true;
      }
    }
    this.processChangeEventsTimeout = null;
    if (changes) this.sendRepos();
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await fs.stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function doesPathExist(path: string): Promise<boolean> {
  try {
    await fs.stat(path);
    return true;
  } catch {
    return false;
  }
}
