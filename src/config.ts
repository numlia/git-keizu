import * as vscode from "vscode";

import { DateFormat, DateType, GraphStyle, TabIconColourTheme } from "./types";

const KEYBINDING_PATTERN = /^CTRL\/CMD \+ [A-Z]$/;
const UNASSIGNED = "UNASSIGNED";

/**
 * Parse a keybinding setting value into a lowercase key letter or null.
 * - Valid format (e.g. "CTRL/CMD + F") → lowercase letter ("f")
 * - "UNASSIGNED" → null
 * - Invalid value → fallback to parsing defaultValue
 */
export function parseKeybinding(value: string, defaultValue: string): string | null {
  if (value === UNASSIGNED) {
    return null;
  }
  if (KEYBINDING_PATTERN.test(value)) {
    return value.charAt(value.length - 1).toLowerCase();
  }
  // Invalid value — fall back to default
  if (KEYBINDING_PATTERN.test(defaultValue)) {
    return defaultValue.charAt(defaultValue.length - 1).toLowerCase();
  }
  return null;
}

class Config {
  private workspaceConfiguration: vscode.WorkspaceConfiguration;

  constructor() {
    this.workspaceConfiguration = vscode.workspace.getConfiguration("git-keizu");
  }

  public dateFormat(): DateFormat {
    return this.workspaceConfiguration.get("dateFormat", "Date & Time");
  }

  public dateType(): DateType {
    return this.workspaceConfiguration.get("dateType", "Author Date");
  }

  public fetchAvatars() {
    return this.workspaceConfiguration.get("fetchAvatars", false);
  }

  public graphColours() {
    return this.workspaceConfiguration
      .get("graphColours", ["#0085d9", "#d9008f", "#00d90a", "#d98500", "#a300d9", "#ff0000"])
      .filter(
        (v) =>
          v.match(
            /^\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|rgb[a]?\s*\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\))\s*$/
          ) !== null
      );
  }

  public graphStyle(): GraphStyle {
    return this.workspaceConfiguration.get("graphStyle", "rounded");
  }

  public initialLoadCommits() {
    return this.workspaceConfiguration.get("initialLoadCommits", 300);
  }

  public keyboardShortcutFind(): string | null {
    const value = this.workspaceConfiguration.get("keyboardShortcutFind", "CTRL/CMD + F");
    return parseKeybinding(value, "CTRL/CMD + F");
  }

  public keyboardShortcutRefresh(): string | null {
    const value = this.workspaceConfiguration.get("keyboardShortcutRefresh", "CTRL/CMD + R");
    return parseKeybinding(value, "CTRL/CMD + R");
  }

  public keyboardShortcutScrollToHead(): string | null {
    const value = this.workspaceConfiguration.get("keyboardShortcutScrollToHead", "CTRL/CMD + H");
    return parseKeybinding(value, "CTRL/CMD + H");
  }

  public keyboardShortcutScrollToStash(): string | null {
    const value = this.workspaceConfiguration.get("keyboardShortcutScrollToStash", "CTRL/CMD + S");
    return parseKeybinding(value, "CTRL/CMD + S");
  }

  public loadMoreCommits() {
    return this.workspaceConfiguration.get("loadMoreCommits", 75);
  }

  public loadMoreCommitsAutomatically(): boolean {
    return this.workspaceConfiguration.get("loadMoreCommitsAutomatically", true);
  }

  public maxDepthOfRepoSearch() {
    return this.workspaceConfiguration.get("maxDepthOfRepoSearch", 0);
  }

  public showCurrentBranchByDefault() {
    return this.workspaceConfiguration.get("showCurrentBranchByDefault", false);
  }

  public showStatusBarItem() {
    return this.workspaceConfiguration.get("showStatusBarItem", true);
  }

  public showUncommittedChanges() {
    return this.workspaceConfiguration.get("showUncommittedChanges", true);
  }

  public sourceCodeProviderIntegrationLocation(): "Inline" | "More Actions" {
    return this.workspaceConfiguration.get("sourceCodeProviderIntegrationLocation", "Inline");
  }

  public tabIconColourTheme(): TabIconColourTheme {
    return this.workspaceConfiguration.get("tabIconColourTheme", "colour");
  }

  public gitPath(): string {
    let path = vscode.workspace.getConfiguration("git").get("path", null);
    return path !== null ? path : "git";
  }
}

export function getConfig() {
  return new Config();
}
