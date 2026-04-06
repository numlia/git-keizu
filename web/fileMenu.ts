import { sendMessage } from "./utils";

/** CSS selector for file row elements in both tree and list views. */
const GIT_FILE_SELECTOR = ".gitFile";

/** Dataset key for the encoded new file path on `.gitFile` elements. */
const DATASET_NEW_FILE_PATH_KEY = "newfilepath";

/** Label for the Open File context menu item. */
const OPEN_FILE_LABEL = "Open File";

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
 * Build context menu items for a file row.
 * Returns an empty array when guard conditions prevent action,
 * which signals the caller not to open the menu.
 */
export function buildFileContextMenuItems(
  fileRow: HTMLElement | null,
  expandedCommit: { hash: string } | null,
  repo: string | null
): ContextMenuElement[] {
  if (fileRow === null || expandedCommit === null || repo === null) return [];
  const encodedPath = fileRow.dataset[DATASET_NEW_FILE_PATH_KEY];
  if (encodedPath === undefined) return [];
  return [
    {
      title: OPEN_FILE_LABEL,
      onClick: () => sendOpenFileAction(fileRow, expandedCommit, repo)
    }
  ];
}
