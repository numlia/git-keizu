import * as GG from "../src/types";
import { UNCOMMITTED_CHANGES_HASH } from "../src/types";
export { UNCOMMITTED_CHANGES_HASH };

const vscode = acquireVsCodeApi();
export { vscode };

/** Codicon HTML snippets keyed by logical icon name (alphabetical order). */
export const svgIcons = {
  alert: '<span class="codicon codicon-warning" aria-hidden="true"></span>',
  arrowDown: '<span class="codicon codicon-arrow-down" aria-hidden="true"></span>',
  arrowUp: '<span class="codicon codicon-arrow-up" aria-hidden="true"></span>',
  branch: '<span class="codicon codicon-git-branch" aria-hidden="true"></span>',
  cdv: '<span class="codicon codicon-eye" aria-hidden="true"></span>',
  close: '<span class="codicon codicon-close" aria-hidden="true"></span>',
  closedFolder: '<span class="codicon codicon-folder" aria-hidden="true"></span>',
  current: '<span class="codicon codicon-target" aria-hidden="true"></span>',
  fetch: '<span class="codicon codicon-git-fetch" aria-hidden="true"></span>',
  file: '<span class="codicon codicon-file" aria-hidden="true"></span>',
  goToFile: '<span class="codicon codicon-go-to-file" aria-hidden="true"></span>',
  history: '<span class="codicon codicon-history" aria-hidden="true"></span>',
  info: '<span class="codicon codicon-info" aria-hidden="true"></span>',
  listView: '<span class="codicon codicon-list-flat" aria-hidden="true"></span>',
  loading: '<span class="codicon codicon-loading codicon-modifier-spin" aria-hidden="true"></span>',
  openFolder: '<span class="codicon codicon-folder-opened" aria-hidden="true"></span>',
  refresh: '<span class="codicon codicon-refresh" aria-hidden="true"></span>',
  search: '<span class="codicon codicon-search" aria-hidden="true"></span>',
  stash: '<span class="codicon codicon-git-stash" aria-hidden="true"></span>',
  tag: '<span class="codicon codicon-tag" aria-hidden="true"></span>',
  treeView: '<span class="codicon codicon-list-tree" aria-hidden="true"></span>',
  worktree: '<span class="codicon codicon-worktree-small" aria-hidden="true"></span>'
};
const htmlEscapes: { [key: string]: string } = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;"
};
const htmlEscaper = /[&<>"'/]/g;
const pathUnsafeChars = /[\\/:*?"<>| ]+/g;
const pathUnsafeCharReplacement = "-";
export const refInvalid = /^[-/].*|[\\" ><~^:?*[]|\.\.|\/\/|\/\.|@{|[./]$|\.lock$|^@$/;
export const ELLIPSIS = "&#8230;";

export function arraysEqual<T>(a: T[], b: T[], equalElements: (a: T, b: T) => boolean) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!equalElements(a[i], b[i])) return false;
  }
  return true;
}

export function worktreeCollectionsEqual(
  a: GG.WorktreeCollection,
  b: GG.WorktreeCollection
): boolean {
  const keysA = Object.keys(a.branches);
  const keysB = Object.keys(b.branches);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    const entryB = b.branches[key];
    if (
      entryB === undefined ||
      a.branches[key].path !== entryB.path ||
      a.branches[key].isMain !== entryB.isMain
    )
      return false;
  }
  return arraysEqual(
    a.detached,
    b.detached,
    (entryA, entryB) =>
      entryA.path === entryB.path && entryA.isMain === entryB.isMain && entryA.head === entryB.head
  );
}
export function pad2(i: number) {
  return i > 9 ? i : `0${i}`;
}

export function escapeHtml(str: string) {
  return str.replace(htmlEscaper, (match) => htmlEscapes[match]);
}

export function sanitizeBranchNameForPath(branchName: string) {
  return branchName.replace(pathUnsafeChars, pathUnsafeCharReplacement);
}

export function addListenerToClass(className: string, event: string, eventListener: EventListener) {
  let elems = document.getElementsByClassName(className),
    i;
  for (i = 0; i < elems.length; i++) {
    elems[i].addEventListener(event, eventListener);
  }
}
export function insertAfter(newNode: HTMLElement, referenceNode: HTMLElement) {
  referenceNode.parentNode!.insertBefore(newNode, referenceNode.nextSibling);
}

export function buildCommitRowAttributes(
  hash: string,
  stash: GG.GitCommitStash | null,
  muted: boolean
): string {
  if (hash === UNCOMMITTED_CHANGES_HASH) {
    return `class="unsavedChanges" data-hash="${UNCOMMITTED_CHANGES_HASH}"`;
  } else if (stash !== null) {
    return `class="commit stash" data-hash="${hash}"`;
  } else {
    return `class="commit${muted ? " mute" : ""}" data-hash="${hash}"`;
  }
}

export function buildStashSelectorDisplay(selector: string): string {
  return selector.substring("stash".length);
}

export function sendMessage(msg: GG.RequestMessage) {
  vscode.postMessage(msg);
}

export function refreshGraphOrDisplayError(
  status: GG.GitCommandStatus,
  errorMessage: string,
  onRefresh: () => void,
  showError: (message: string, reason: string, sourceElem: null) => void
) {
  if (status === null) {
    onRefresh();
  } else {
    showError(errorMessage, status, null);
  }
}
export function getVSCodeStyle(name: string) {
  return document.documentElement.style.getPropertyValue(name);
}

const ABBREV_COMMIT_LENGTH = 8;
export function abbrevCommit(commitHash: string) {
  return commitHash.substring(0, ABBREV_COMMIT_LENGTH);
}

export function getRepoName(repoPath: string): string {
  const separatorIndex = Math.max(repoPath.lastIndexOf("/"), repoPath.lastIndexOf("\\"));
  return separatorIndex >= 0 ? repoPath.substring(separatorIndex + 1) : repoPath;
}
