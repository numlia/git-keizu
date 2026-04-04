import * as GG from "../src/types";
import { UNCOMMITTED_CHANGES_HASH } from "../src/types";
export { UNCOMMITTED_CHANGES_HASH };

const vscode = acquireVsCodeApi();
export { vscode };

/** Codicon HTML snippets keyed by logical icon name (alphabetical order). */
export const svgIcons = {
  alert: '<span class="codicon codicon-warning"></span>',
  arrowDown: '<span class="codicon codicon-arrow-down"></span>',
  arrowUp: '<span class="codicon codicon-arrow-up"></span>',
  branch: '<span class="codicon codicon-git-branch"></span>',
  cdv: '<span class="codicon codicon-eye"></span>',
  close: '<span class="codicon codicon-close"></span>',
  closedFolder: '<span class="codicon codicon-folder"></span>',
  current: '<span class="codicon codicon-target"></span>',
  fetch: '<span class="codicon codicon-git-fetch"></span>',
  file: '<span class="codicon codicon-file"></span>',
  goToFile: '<span class="codicon codicon-go-to-file"></span>',
  info: '<span class="codicon codicon-info"></span>',
  listView: '<span class="codicon codicon-list-flat"></span>',
  loading: '<span class="codicon codicon-loading codicon-modifier-spin"></span>',
  openFolder: '<span class="codicon codicon-folder-opened"></span>',
  refresh: '<span class="codicon codicon-refresh"></span>',
  search: '<span class="codicon codicon-search"></span>',
  stash: '<span class="codicon codicon-git-stash"></span>',
  tag: '<span class="codicon codicon-tag"></span>',
  treeView: '<span class="codicon codicon-list-tree"></span>',
  worktree: '<span class="codicon codicon-worktree-small"></span>'
};
export const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];
const htmlEscapes: { [key: string]: string } = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;"
};
const htmlUnescapes: { [key: string]: string } = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
  "&#x2F;": "/"
};
const htmlEscaper = /[&<>"'/]/g;
const htmlUnescaper = /&lt;|&gt;|&amp;|&quot;|&#x27;|&#x2F;/g;
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

export function worktreeMapsEqual(a: GG.WorktreeMap, b: GG.WorktreeMap): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    const entryB = b[key];
    if (entryB === undefined || a[key].path !== entryB.path || a[key].isMain !== entryB.isMain)
      return false;
  }
  return true;
}
export function pad2(i: number) {
  return i > 9 ? i : `0${i}`;
}

export function escapeHtml(str: string) {
  return str.replace(htmlEscaper, (match) => htmlEscapes[match]);
}
export function unescapeHtml(str: string) {
  return str.replace(htmlUnescaper, (match) => htmlUnescapes[match]);
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
