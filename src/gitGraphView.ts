import * as crypto from "node:crypto";
import * as path from "node:path";

import * as vscode from "vscode";

import { AvatarManager } from "./avatarManager";
import { getConfig } from "./config";
import { DataSource } from "./dataSource";
import { encodeDiffDocUri } from "./diffDocProvider";
import { ExtensionState } from "./extensionState";
import { RepoFileWatcher } from "./repoFileWatcher";
import { RepoManager } from "./repoManager";
import {
  GitFileChangeType,
  GitGraphViewState,
  GitRepoSet,
  RequestMessage,
  ResponseMessage,
  UNCOMMITTED_CHANGES_HASH
} from "./types";
import { abbrevCommit, copyToClipboard } from "./utils";

export class GitGraphView {
  public static currentPanel: GitGraphView | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionPath: string;
  private readonly avatarManager: AvatarManager;
  private readonly dataSource: DataSource;
  private readonly extensionState: ExtensionState;
  private readonly repoFileWatcher: RepoFileWatcher;
  private readonly repoManager: RepoManager;
  private disposables: vscode.Disposable[] = [];
  private isGraphViewLoaded: boolean = false;
  private isPanelVisible: boolean = true;
  private currentRepo: string | null = null;

  public static createOrShow(
    extensionPath: string,
    dataSource: DataSource,
    extensionState: ExtensionState,
    avatarManager: AvatarManager,
    repoManager: RepoManager
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (GitGraphView.currentPanel) {
      GitGraphView.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "git-keizu",
      "Git Keizu",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(extensionPath, "media")),
          vscode.Uri.file(path.join(extensionPath, "out"))
        ]
      }
    );

    GitGraphView.currentPanel = new GitGraphView(
      panel,
      extensionPath,
      dataSource,
      extensionState,
      avatarManager,
      repoManager
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionPath: string,
    dataSource: DataSource,
    extensionState: ExtensionState,
    avatarManager: AvatarManager,
    repoManager: RepoManager
  ) {
    this.panel = panel;
    this.extensionPath = extensionPath;
    this.avatarManager = avatarManager;
    this.dataSource = dataSource;
    this.extensionState = extensionState;
    this.repoManager = repoManager;
    this.avatarManager.registerView(this);

    panel.iconPath =
      getConfig().tabIconColourTheme() === "colour"
        ? this.getUri("resources", "webview-icon.svg")
        : {
            light: this.getUri("resources", "webview-icon-light.svg"),
            dark: this.getUri("resources", "webview-icon-dark.svg")
          };

    this.update();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.onDidChangeViewState(
      () => {
        if (this.panel.visible !== this.isPanelVisible) {
          if (this.panel.visible) {
            this.update();
          } else {
            this.currentRepo = null;
            this.repoFileWatcher.stop();
          }
          this.isPanelVisible = this.panel.visible;
        }
      },
      null,
      this.disposables
    );

    this.repoFileWatcher = new RepoFileWatcher(() => {
      if (this.panel.visible) {
        this.sendMessage({ command: "refresh" });
      }
    });
    this.repoManager.registerViewCallback((repos: GitRepoSet, numRepos: number) => {
      if (!this.panel.visible) return;
      if ((numRepos === 0 && this.isGraphViewLoaded) || (numRepos > 0 && !this.isGraphViewLoaded)) {
        this.update();
      } else {
        this.respondLoadRepos(repos);
      }
    });

    this.panel.webview.onDidReceiveMessage(
      async (msg: RequestMessage) => {
        if (this.dataSource === null) return;
        if (
          msg.command !== "copyToClipboard" &&
          msg.command !== "loadRepos" &&
          "repo" in msg &&
          !(msg.repo in this.repoManager.getRepos())
        ) {
          return;
        }
        this.repoFileWatcher.mute();
        switch (msg.command) {
          case "addTag":
            this.sendMessage({
              command: "addTag",
              status: await this.dataSource.addTag(
                msg.repo,
                msg.tagName,
                msg.commitHash,
                msg.lightweight,
                msg.message
              )
            });
            break;
          case "fetchAvatar":
            this.avatarManager.fetchAvatarImage(msg.email, msg.repo, msg.commits);
            break;
          case "checkoutBranch":
            this.sendMessage({
              command: "checkoutBranch",
              status: await this.dataSource.checkoutBranch(
                msg.repo,
                msg.branchName,
                msg.remoteBranch
              )
            });
            break;
          case "checkoutCommit":
            this.sendMessage({
              command: "checkoutCommit",
              status: await this.dataSource.checkoutCommit(msg.repo, msg.commitHash)
            });
            break;
          case "cherrypickCommit":
            this.sendMessage({
              command: "cherrypickCommit",
              status: await this.dataSource.cherrypickCommit(
                msg.repo,
                msg.commitHash,
                msg.parentIndex
              )
            });
            break;
          case "commitDetails":
            this.sendMessage({
              command: "commitDetails",
              commitDetails:
                msg.commitHash === UNCOMMITTED_CHANGES_HASH
                  ? await this.dataSource.getUncommittedDetails(msg.repo)
                  : await this.dataSource.commitDetails(msg.repo, msg.commitHash)
            });
            break;
          case "compareCommits":
            this.sendMessage({
              command: "compareCommits",
              fileChanges: await this.dataSource.getCommitComparison(
                msg.repo,
                msg.fromHash,
                msg.toHash
              ),
              fromHash: msg.fromHash,
              toHash: msg.toHash
            });
            break;
          case "copyToClipboard":
            this.sendMessage({
              command: "copyToClipboard",
              type: msg.type,
              success: await copyToClipboard(msg.data)
            });
            break;
          case "createBranch":
            this.sendMessage({
              command: "createBranch",
              status: await this.dataSource.createBranch(msg.repo, msg.branchName, msg.commitHash)
            });
            break;
          case "deleteBranch":
            this.sendMessage({
              command: "deleteBranch",
              status: await this.dataSource.deleteBranch(msg.repo, msg.branchName, msg.forceDelete)
            });
            break;
          case "deleteTag":
            this.sendMessage({
              command: "deleteTag",
              status: await this.dataSource.deleteTag(msg.repo, msg.tagName)
            });
            break;
          case "loadBranches":
            let branchData = await this.dataSource.getBranches(msg.repo, msg.showRemoteBranches),
              isRepo = true;
            if (branchData.error) {
              // If an error occurred, check to make sure the repo still exists
              isRepo = await this.dataSource.isGitRepository(msg.repo);
            }
            this.sendMessage({
              command: "loadBranches",
              branches: branchData.branches,
              head: branchData.head,
              hard: msg.hard,
              isRepo: isRepo
            });
            if (msg.repo !== this.currentRepo) {
              this.currentRepo = msg.repo;
              this.extensionState.setLastActiveRepo(msg.repo);
              this.repoFileWatcher.start(msg.repo);
            }
            break;
          case "loadCommits":
            this.sendMessage({
              command: "loadCommits",
              ...(await this.dataSource.getCommits(
                msg.repo,
                msg.branchName,
                msg.maxCommits,
                msg.showRemoteBranches
              )),
              hard: msg.hard
            });
            break;
          case "loadRepos":
            if (!msg.check || !(await this.repoManager.checkReposExist())) {
              // If not required to check repos, or no changes were found when checking, respond with repos
              this.respondLoadRepos(this.repoManager.getRepos());
            }
            break;
          case "mergeBranch":
            this.sendMessage({
              command: "mergeBranch",
              status: await this.dataSource.mergeBranch(
                msg.repo,
                msg.branchName,
                msg.createNewCommit
              )
            });
            break;
          case "mergeCommit":
            this.sendMessage({
              command: "mergeCommit",
              status: await this.dataSource.mergeCommit(
                msg.repo,
                msg.commitHash,
                msg.createNewCommit
              )
            });
            break;
          case "pushTag":
            this.sendMessage({
              command: "pushTag",
              status: await this.dataSource.pushTag(msg.repo, msg.tagName)
            });
            break;
          case "renameBranch":
            this.sendMessage({
              command: "renameBranch",
              status: await this.dataSource.renameBranch(msg.repo, msg.oldName, msg.newName)
            });
            break;
          case "resetToCommit":
            this.sendMessage({
              command: "resetToCommit",
              status: await this.dataSource.resetToCommit(msg.repo, msg.commitHash, msg.resetMode)
            });
            break;
          case "revertCommit":
            this.sendMessage({
              command: "revertCommit",
              status: await this.dataSource.revertCommit(msg.repo, msg.commitHash, msg.parentIndex)
            });
            break;
          case "applyStash":
            this.sendMessage({
              command: "applyStash",
              status: await this.dataSource.applyStash(msg.repo, msg.selector, msg.reinstateIndex)
            });
            break;
          case "popStash":
            this.sendMessage({
              command: "popStash",
              status: await this.dataSource.popStash(msg.repo, msg.selector, msg.reinstateIndex)
            });
            break;
          case "dropStash":
            this.sendMessage({
              command: "dropStash",
              status: await this.dataSource.dropStash(msg.repo, msg.selector)
            });
            break;
          case "branchFromStash":
            this.sendMessage({
              command: "branchFromStash",
              status: await this.dataSource.branchFromStash(msg.repo, msg.branchName, msg.selector)
            });
            break;
          case "pushStash":
            this.sendMessage({
              command: "pushStash",
              status: await this.dataSource.pushStash(msg.repo, msg.message, msg.includeUntracked)
            });
            break;
          case "resetUncommitted":
            this.sendMessage({
              command: "resetUncommitted",
              status: await this.dataSource.resetUncommitted(msg.repo, msg.mode)
            });
            break;
          case "cleanUntrackedFiles":
            this.sendMessage({
              command: "cleanUntrackedFiles",
              status: await this.dataSource.cleanUntrackedFiles(msg.repo, msg.directories)
            });
            break;
          case "fetch":
            this.sendMessage({
              command: "fetch",
              status: await this.dataSource.fetch(msg.repo)
            });
            break;
          case "saveRepoState":
            this.repoManager.setRepoState(msg.repo, msg.state);
            break;
          case "viewDiff":
            this.sendMessage({
              command: "viewDiff",
              success: await this.viewDiff(
                msg.repo,
                msg.commitHash,
                msg.oldFilePath,
                msg.newFilePath,
                msg.type,
                msg.compareWithHash
              )
            });
            break;
        }
        this.repoFileWatcher.unmute();
      },
      null,
      this.disposables
    );
  }

  public sendMessage(msg: ResponseMessage) {
    this.panel.webview.postMessage(msg);
  }

  public dispose() {
    GitGraphView.currentPanel = undefined;
    this.panel.dispose();
    this.avatarManager.deregisterView();
    this.repoFileWatcher.stop();
    this.repoManager.deregisterViewCallback();
    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) x.dispose();
    }
  }

  private async update() {
    this.panel.webview.html = await this.getHtmlForWebview();
  }

  private getHtmlForWebview() {
    const config = getConfig(),
      nonce = getNonce();
    const viewState: GitGraphViewState = {
      autoCenterCommitDetailsView: config.autoCenterCommitDetailsView(),
      dateFormat: config.dateFormat(),
      fetchAvatars: config.fetchAvatars() && this.extensionState.isAvatarStorageAvailable(),
      graphColours: config.graphColours(),
      graphStyle: config.graphStyle(),
      initialLoadCommits: config.initialLoadCommits(),
      lastActiveRepo: this.extensionState.getLastActiveRepo(),
      loadMoreCommits: config.loadMoreCommits(),
      repos: this.repoManager.getRepos(),
      showCurrentBranchByDefault: config.showCurrentBranchByDefault()
    };

    let body,
      numRepos = Object.keys(viewState.repos).length,
      colorVars = "",
      colorParams = "";
    for (let i = 0; i < viewState.graphColours.length; i++) {
      colorVars += `--git-graph-color${i}:${viewState.graphColours[i]}; `;
      colorParams += `[data-color="${i}"]{--git-graph-color:var(--git-graph-color${i});} `;
    }
    if (numRepos > 0) {
      body = `<body style="${colorVars}">
			<div id="controls">
				<span id="repoControl"><span class="unselectable">Repo: </span><div id="repoSelect" class="dropdown"></div></span>
				<span id="branchControl"><span class="unselectable">Branch: </span><div id="branchSelect" class="dropdown"></div></span>
				<label id="showRemoteBranchesControl"><input type="checkbox" id="showRemoteBranchesCheckbox" value="1" checked>Show Remote Branches</label>
				<div id="searchBtn" title="Search"></div>
				<div id="fetchBtn" title="Fetch"></div>
				<div id="currentBtn" title="Current"></div>
				<div id="refreshBtn" title="Refresh"></div>
			</div>
			<div id="scrollContainer">
				<div id="scrollShadow"></div>
				<div id="content">
					<div id="commitGraph"></div>
					<div id="commitTable"></div>
				</div>
				<div id="footer"></div>
			</div>
			<ul id="contextMenu"></ul>
			<div id="dialogBacking"></div>
			<div id="dialog"></div>
			<script nonce="${nonce}">var viewState = ${JSON.stringify(viewState)};</script>
			<script src="${this.getCompiledOutputUri("web.min.js")}"></script>
			</body>`;
    } else {
      body = `<body class="unableToLoad" style="${colorVars}">
			<h2>Unable to load Git Graph</h2>
			<p>Either the current workspace does not contain a Git repository, or the Git executable could not be found.</p>
			<p>If you are using a portable Git installation, make sure you have set the Visual Studio Code Setting "git.path" to the path of your portable installation (e.g. "C:\\Program Files\\Git\\bin\\git.exe" on Windows).</p>
			</body>`;
    }
    this.isGraphViewLoaded = numRepos > 0;

    return `<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel.webview.cspSource} 'unsafe-inline'; script-src ${this.panel.webview.cspSource} 'nonce-${nonce}'; img-src data:;">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link rel="stylesheet" type="text/css" href="${this.getMediaUri("main.css")}">
				<link rel="stylesheet" type="text/css" href="${this.getMediaUri("dropdown.css")}">
				<title>Git Keizu</title>
				<style>${colorParams}</style>
			</head>
			${body}
		</html>`;
  }

  private getMediaUri(file: string) {
    return this.panel.webview.asWebviewUri(this.getUri("media", file));
  }

  private getCompiledOutputUri(file: string) {
    return this.panel.webview.asWebviewUri(this.getUri("out", file));
  }

  private getUri(...pathComps: string[]) {
    return vscode.Uri.file(path.join(this.extensionPath, ...pathComps));
  }

  private respondLoadRepos(repos: GitRepoSet) {
    this.sendMessage({
      command: "loadRepos",
      repos: repos,
      lastActiveRepo: this.extensionState.getLastActiveRepo()
    });
  }

  private async viewDiff(
    repo: string,
    commitHash: string,
    oldFilePath: string,
    newFilePath: string,
    type: GitFileChangeType,
    compareWithHash?: string
  ): Promise<boolean> {
    const pathComponents = newFilePath.split("/");
    const fileName = pathComponents[pathComponents.length - 1];

    if (compareWithHash !== undefined) {
      const actualFromHash = commitHash === UNCOMMITTED_CHANGES_HASH ? "HEAD" : commitHash;
      const isWorkingTreeTarget = compareWithHash === UNCOMMITTED_CHANGES_HASH;
      const abbrevFrom =
        commitHash === UNCOMMITTED_CHANGES_HASH ? "Uncommitted" : abbrevCommit(commitHash);
      const abbrevTo = isWorkingTreeTarget ? "Uncommitted" : abbrevCommit(compareWithHash);
      const title = `${fileName} (${abbrevFrom} ↔ ${abbrevTo})`;

      try {
        const leftUri = encodeDiffDocUri(repo, oldFilePath, actualFromHash);
        const rightUri = isWorkingTreeTarget
          ? type === "D"
            ? encodeDiffDocUri(repo, oldFilePath, UNCOMMITTED_CHANGES_HASH)
            : vscode.Uri.file(path.join(repo, newFilePath))
          : encodeDiffDocUri(repo, newFilePath, compareWithHash);

        await vscode.commands.executeCommand("vscode.diff", leftUri, rightUri, title, {
          preview: true
        });
        return true;
      } catch {
        return false;
      }
    }

    if (commitHash === UNCOMMITTED_CHANGES_HASH) {
      const changeDescription = type === "A" ? "Added" : type === "D" ? "Deleted" : "Modified";
      const title = `${fileName} (Uncommitted - ${changeDescription})`;
      try {
        const leftUri =
          type === "A"
            ? encodeDiffDocUri(repo, newFilePath, "HEAD")
            : encodeDiffDocUri(repo, oldFilePath, "HEAD");
        const rightUri =
          type === "D"
            ? encodeDiffDocUri(repo, oldFilePath, UNCOMMITTED_CHANGES_HASH)
            : vscode.Uri.file(path.join(repo, newFilePath));
        await vscode.commands.executeCommand("vscode.diff", leftUri, rightUri, title, {
          preview: true
        });
        return true;
      } catch {
        return false;
      }
    }

    const abbrevHash = abbrevCommit(commitHash);
    const changeDescription =
      type === "A"
        ? `Added in ${abbrevHash}`
        : type === "D"
          ? `Deleted in ${abbrevHash}`
          : `${abbrevHash}^ ↔ ${abbrevHash}`;
    const title = `${fileName} (${changeDescription})`;

    try {
      await vscode.commands.executeCommand(
        "vscode.diff",
        encodeDiffDocUri(repo, oldFilePath, `${commitHash}^`),
        encodeDiffDocUri(repo, newFilePath, commitHash),
        title,
        { preview: true }
      );
      return true;
    } catch {
      return false;
    }
  }
}

function getNonce() {
  return crypto.randomBytes(16).toString("hex");
}
