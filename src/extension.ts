import * as vscode from "vscode";

import { AvatarManager } from "./avatarManager";
import { DataSource } from "./dataSource";
import { DiffDocProvider } from "./diffDocProvider";
import { ExtensionState } from "./extensionState";
import { GitGraphView } from "./gitGraphView";
import { RepoManager } from "./repoManager";
import { StatusBarItem } from "./statusBarItem";

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Git Keizu");
  const extensionState = new ExtensionState(context);
  const dataSource = new DataSource();
  const avatarManager = new AvatarManager(dataSource, extensionState);
  const statusBarItem = new StatusBarItem(context);
  const repoManager = new RepoManager(dataSource, extensionState, statusBarItem);

  context.subscriptions.push(
    outputChannel,
    vscode.commands.registerCommand("git-keizu.view", (arg?: unknown) => {
      // When invoked from SCM title bar, arg is a SourceControl object with rootUri property.
      // When invoked from command palette or programmatically, arg may be a Uri or undefined.
      let rootUri: vscode.Uri | undefined;
      if (arg instanceof vscode.Uri) {
        rootUri = arg;
      } else if (arg !== null && arg !== undefined && typeof arg === "object" && "rootUri" in arg) {
        const candidate = (arg as { rootUri?: unknown }).rootUri;
        if (candidate instanceof vscode.Uri) {
          rootUri = candidate;
        }
      }
      GitGraphView.createOrShow(
        context.extensionPath,
        dataSource,
        extensionState,
        avatarManager,
        repoManager,
        rootUri
      );
    }),
    vscode.commands.registerCommand("git-keizu.clearAvatarCache", () => {
      avatarManager.clearCache();
    }),
    vscode.workspace.registerTextDocumentContentProvider(
      DiffDocProvider.scheme,
      new DiffDocProvider(dataSource)
    ),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("git-keizu.showStatusBarItem")) {
        statusBarItem.refresh();
      } else if (e.affectsConfiguration("git-keizu.dateType")) {
        dataSource.generateGitCommandFormats();
      } else if (e.affectsConfiguration("git-keizu.maxDepthOfRepoSearch")) {
        repoManager.maxDepthOfRepoSearchChanged();
      } else if (e.affectsConfiguration("git.path")) {
        dataSource.registerGitPath();
      }
    }),
    repoManager
  );

  outputChannel.appendLine("Extension activated successfully");
}

export function deactivate() {}
