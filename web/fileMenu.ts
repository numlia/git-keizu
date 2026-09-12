import { recordRecentAction } from "./contextMenu";
import { t } from "./i18n";
import { sendMessage, UNCOMMITTED_CHANGES_HASH } from "./utils";

/** CSS selector for file row elements in both tree and list views. */
const GIT_FILE_SELECTOR = ".gitFile";

/** Dataset key for the encoded new file path on `.gitFile` elements. */
const DATASET_NEW_FILE_PATH_KEY = "newfilepath";

/** Dataset key for the file change type on `.gitFile` elements. */
const DATASET_TYPE_KEY = "type";

/** Label for the Open File context menu item. */
const OPEN_FILE_LABEL = t("context.openFile");

/** Label for the Highlight File History context menu item. */
const HIGHLIGHT_FILE_HISTORY_LABEL = t("context.highlightFileHistory");

/** File change types for which file history can be highlighted (typechange `T` is excluded). */
const FILE_HISTORY_MENU_CHANGE_TYPES: ReadonlySet<string> = new Set(["A", "M", "D", "R"]);

/** Subset of the expanded commit state needed to build file menu items. */
export interface FileMenuExpandedCommit {
  hash: string;
  compareWithHash: string | null;
}

/** Caller-provided context for the Highlight File History item. */
export interface FileHistoryMenuContext {
  isStash: boolean;
  onHighlightFileHistory: (anchorHash: string, filePath: string) => void;
}

/**
 * Resolve the closest `.gitFile` ancestor from a DOM target.
 * Returns `null` when the target is not inside a file row.
 */
export function resolveFileRow(target: Element): HTMLElement | null {
  return target.closest<HTMLElement>(GIT_FILE_SELECTOR);
}

/**
 * Send an `openFile` request for the given file row.
 * No-op when `expandedCommit` is null, `repo` is null,
 * `fileRow` is null, or `data-newfilepath` is missing.
 */
export function sendOpenFileAction(
  fileRow: HTMLElement | null,
  expandedCommit: { hash: string } | null,
  repo: string | null
): void {
  if (fileRow === null || expandedCommit === null || repo === null) return;
  const encodedPath = fileRow.dataset[DATASET_NEW_FILE_PATH_KEY];
  if (encodedPath === undefined) return;
  sendMessage({
    command: "openFile",
    repo,
    filePath: decodeURIComponent(encodedPath),
    commitHash: expandedCommit.hash
  });
}

/**
 * File history needs a stable anchor commit: uncommitted changes, stashes and
 * comparison views have none, and typechange rows are not part of the lineage.
 */
function canHighlightFileHistory(
  fileRow: HTMLElement,
  expandedCommit: FileMenuExpandedCommit,
  fileHistory: FileHistoryMenuContext
): boolean {
  const changeType = fileRow.dataset[DATASET_TYPE_KEY];
  return (
    expandedCommit.hash !== UNCOMMITTED_CHANGES_HASH &&
    fileHistory.isStash === false &&
    expandedCommit.compareWithHash === null &&
    changeType !== undefined &&
    FILE_HISTORY_MENU_CHANGE_TYPES.has(changeType)
  );
}

/**
 * Build context menu items for a file row.
 * Returns an empty array when guard conditions prevent action,
 * which signals the caller not to open the menu.
 */
export function buildFileContextMenuItems(
  fileRow: HTMLElement | null,
  expandedCommit: FileMenuExpandedCommit | null,
  repo: string | null,
  fileHistory: FileHistoryMenuContext
): ContextMenuElement[] {
  if (fileRow === null || expandedCommit === null || repo === null) return [];
  const encodedPath = fileRow.dataset[DATASET_NEW_FILE_PATH_KEY];
  if (encodedPath === undefined) return [];
  const openFileItem: ContextMenuElement = {
    title: OPEN_FILE_LABEL,
    recentActionId: "file.openFile",
    onClick: () => {
      recordRecentAction(repo, "file.openFile");
      sendOpenFileAction(fileRow, expandedCommit, repo);
    }
  };
  if (!canHighlightFileHistory(fileRow, expandedCommit, fileHistory)) return [openFileItem];
  return [
    openFileItem,
    {
      title: HIGHLIGHT_FILE_HISTORY_LABEL,
      onClick: () => {
        fileHistory.onHighlightFileHistory(expandedCommit.hash, decodeURIComponent(encodedPath));
      }
    }
  ];
}
