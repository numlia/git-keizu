import type { GitFileChange } from "../src/types";
import { t } from "./i18n";
import { escapeHtml, svgIcons } from "./utils";

const BINARY_FILE_TITLE = ` title="${t("file.binaryTitle")}"`;
/** Class of the button that opens a file's diff (the primary action of a file row). */
const FILE_DIFF_BUTTON_CLASS = "gitFileDiff";
/** Id prefix of a folder's contents list, referenced by the folder button's `aria-controls`. */
const FOLDER_CONTENTS_ID_PREFIX = "gitFolderContents_";
/** Joins an action title and the file path into the button's accessible name. */
const ACTION_NAME_SEPARATOR = ": ";
/** A row whose only reachable control is the wrapper itself becomes a tab stop for its menu. */
const MENU_STOP_TAB_INDEX = ' tabindex="0"';

function actionName(title: string, escapedPath: string): string {
  return `${title}${ACTION_NAME_SEPARATOR}${escapedPath}`;
}

export function generateGitFileTree(gitFiles: GitFileChange[]) {
  let contents: GitFolderContents = {},
    i,
    j,
    path,
    cur: GitFolder;
  let files: GitFolder = {
    type: "folder",
    name: "",
    folderPath: "",
    contents: contents,
    open: true
  };
  for (i = 0; i < gitFiles.length; i++) {
    cur = files;
    path = gitFiles[i].newFilePath.split("/");
    for (j = 0; j < path.length; j++) {
      if (j < path.length - 1) {
        if (cur.contents[path[j]] === undefined || cur.contents[path[j]].type === "file") {
          contents = {};
          cur.contents[path[j]] = {
            type: "folder",
            name: path[j],
            folderPath: path.slice(0, j + 1).join("/"),
            contents: contents,
            open: true
          };
        }
        cur = <GitFolder>cur.contents[path[j]];
      } else {
        cur.contents[path[j]] = { type: "file", name: path[j], index: i };
      }
    }
  }
  return files;
}

/** Decides per row whether the Highlight File History action is rendered. */
export type FileHistoryActionPredicate = (gitFile: GitFileChange) => boolean;

/**
 * Build the HTML for a single file item (used by both tree and list views). The `li` is a
 * non-operable wrapper: the diff button and the action buttons are siblings, never nested, and
 * every button is named by the full new path so list and tree rows read the same.
 * @param gitFile - The file change data
 * @param displayName - Already-escaped display name (basename for tree view, full path for list view)
 * @param showFileHistoryAction - Whether the Highlight File History action is rendered for this row
 */
function buildFileItemHtml(
  gitFile: GitFileChange,
  displayName: string,
  showFileHistoryAction: boolean
): string {
  const diffPossible = gitFile.additions !== null && gitFile.deletions !== null;
  const binaryTitle = diffPossible ? "" : BINARY_FILE_TITLE;
  const renameHtml =
    gitFile.type === "R"
      ? ` <span class="gitFileRename" title="${escapeHtml(t("file.renamed", gitFile.oldFilePath, gitFile.newFilePath))}">R</span>`
      : "";
  const addDelHtml =
    gitFile.type !== "A" && gitFile.type !== "D" && diffPossible
      ? `<span class="gitFileAddDel">(<span class="gitFileAdditions" title="${t(gitFile.additions === 1 ? "file.addition.one" : "file.addition.other", gitFile.additions ?? 0)}">+${gitFile.additions}</span>|<span class="gitFileDeletions" title="${t(gitFile.deletions === 1 ? "file.deletion.one" : "file.deletion.other", gitFile.deletions ?? 0)}">-${gitFile.deletions}</span>)</span>`
      : "";
  const escapedNewPath = escapeHtml(gitFile.newFilePath);
  const openFileTitle = t("context.openFile");
  const fileHistoryTitle = t("context.highlightFileHistory");
  const openFileActionHtml =
    gitFile.type !== "D"
      ? `<button type="button" class="gitFileAction openFile" title="${openFileTitle}" aria-label="${actionName(openFileTitle, escapedNewPath)}">${svgIcons.goToFile}</button>`
      : "";
  const fileHistoryActionHtml = showFileHistoryAction
    ? `<button type="button" class="gitFileAction highlightFileHistory" title="${fileHistoryTitle}" aria-label="${actionName(fileHistoryTitle, escapedNewPath)}">${svgIcons.history}</button>`
    : "";
  const actionsHtml = `${openFileActionHtml}${fileHistoryActionHtml}`;
  const fileActionsHtml =
    actionsHtml !== "" ? `<span class="gitFileActions">${actionsHtml}</span>` : "";
  const diffButtonHtml = `<button type="button" class="${FILE_DIFF_BUTTON_CLASS}"${diffPossible ? "" : " disabled"} aria-label="${escapedNewPath}"><span class="gitFileIcon" aria-hidden="true">${svgIcons.file}</span>${displayName}</button>`;
  const menuStopHtml = !diffPossible && actionsHtml === "" ? MENU_STOP_TAB_INDEX : "";
  const oldPath = encodeURIComponent(gitFile.oldFilePath);
  const newPath = encodeURIComponent(gitFile.newFilePath);
  return `<li class="gitFile ${gitFile.type}${diffPossible ? " gitDiffPossible" : ""}" data-oldfilepath="${oldPath}" data-newfilepath="${newPath}" data-type="${gitFile.type}"${binaryTitle}${menuStopHtml}>${diffButtonHtml}${renameHtml}${addDelHtml}${fileActionsHtml}</li>`;
}

/**
 * A folder is a native button named by its path, with `aria-expanded` and `aria-controls`
 * pointing at its contents list; a closed list is `hidden` so its children leave the tab order.
 */
function buildFolderHtml(folder: GitFolder, contentsId: string): string {
  const icon = folder.open ? svgIcons.openFolder : svgIcons.closedFolder;
  return `<button type="button" class="gitFolder" data-folderpath="${encodeURIComponent(folder.folderPath)}" aria-expanded="${folder.open}" aria-controls="${contentsId}" aria-label="${escapeHtml(folder.folderPath)}"><span class="gitFolderIcon" aria-hidden="true">${icon}</span><span class="gitFolderName">${escapeHtml(folder.name)}</span></button>`;
}

/**
 * @param canHighlightFileHistory - Decides per file row whether the Highlight File History action is rendered
 */
export function generateGitFileTreeHtml(
  folder: GitFolder,
  gitFiles: GitFileChange[],
  canHighlightFileHistory: FileHistoryActionPredicate
): string {
  const isRoot = folder.name === "";
  const contentsId = `${FOLDER_CONTENTS_ID_PREFIX}${encodeURIComponent(folder.folderPath)}`;
  const contentsAttributes = `${isRoot ? "" : ` id="${contentsId}"`}${!folder.open ? " hidden" : ""}`;
  let html = `${isRoot ? "" : buildFolderHtml(folder, contentsId)}<ul class="gitFolderContents${!folder.open ? " hidden" : ""}"${contentsAttributes}>`,
    keys = Object.keys(folder.contents),
    i,
    gitFile,
    gitFolder;
  keys.sort((a, b) =>
    folder.contents[a].type === "folder" && folder.contents[b].type === "file"
      ? -1
      : folder.contents[a].type === "file" && folder.contents[b].type === "folder"
        ? 1
        : folder.contents[a].name < folder.contents[b].name
          ? -1
          : folder.contents[a].name > folder.contents[b].name
            ? 1
            : 0
  );
  for (i = 0; i < keys.length; i++) {
    if (folder.contents[keys[i]].type === "folder") {
      gitFolder = <GitFolder>folder.contents[keys[i]];
      html += `<li${!gitFolder.open ? ' class="closed"' : ""}>${generateGitFileTreeHtml(gitFolder, gitFiles, canHighlightFileHistory)}</li>`;
    } else {
      gitFile = gitFiles[(<GitFile>folder.contents[keys[i]]).index];
      html += buildFileItemHtml(
        gitFile,
        escapeHtml(folder.contents[keys[i]].name),
        canHighlightFileHistory(gitFile)
      );
    }
  }
  return `${html}</ul>`;
}

/**
 * @param canHighlightFileHistory - Decides per file row whether the Highlight File History action is rendered
 */
export function generateGitFileListHtml(
  gitFiles: GitFileChange[],
  canHighlightFileHistory: FileHistoryActionPredicate
): string {
  const sorted = [...gitFiles].sort((a, b) => a.newFilePath.localeCompare(b.newFilePath));
  let html = '<ul class="gitFolderContents">';
  for (const gitFile of sorted) {
    html += buildFileItemHtml(
      gitFile,
      escapeHtml(gitFile.newFilePath),
      canHighlightFileHistory(gitFile)
    );
  }
  return `${html}</ul>`;
}

export function alterGitFileTree(folder: GitFolder, folderPath: string, open: boolean) {
  let path = folderPath.split("/"),
    i,
    cur = folder;
  for (i = 0; i < path.length; i++) {
    if (cur.contents[path[i]] !== undefined) {
      cur = <GitFolder>cur.contents[path[i]];
      if (i === path.length - 1) {
        cur.open = open;
        return;
      }
    } else {
      return;
    }
  }
}
