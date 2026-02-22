import * as vscode from "vscode";

import { getConfig } from "./config";

export class StatusBarItem {
  private statusBarItem: vscode.StatusBarItem;
  private numRepos: number = 0;

  constructor(context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
    this.statusBarItem.text = "Git Keizu";
    this.statusBarItem.tooltip = "View Git Keizu";
    this.statusBarItem.command = "git-keizu.view";
    context.subscriptions.push(this.statusBarItem);
  }

  public setNumRepos(numRepos: number) {
    this.numRepos = numRepos;
    this.refresh();
  }

  public refresh() {
    if (getConfig().showStatusBarItem() && this.numRepos > 0) {
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }
}
