import { recordRecentAction } from "./contextMenu";
import { showConfirmationDialog } from "./dialogs";
import { t } from "./i18n";
import { ELLIPSIS, escapeHtml, getRepoName, sendMessage } from "./utils";

const WORKTREE_PATH_TRAILING_SEPARATORS = /[/\\]+$/;

export function getWorktreeLabelName(worktreePath: string): string {
  const finalComponent = getRepoName(worktreePath.replace(WORKTREE_PATH_TRAILING_SEPARATORS, ""));
  return finalComponent === "" ? worktreePath : finalComponent;
}

export function buildWorktreeActionItems(
  repo: string,
  worktreePath: string,
  terminalLabel: string
): ContextMenuItem[] {
  return [
    {
      title: t("Open in New Window"),
      recentActionId: "ref.openWorktreeInNewWindow",
      onClick: () => {
        recordRecentAction(repo, "ref.openWorktreeInNewWindow");
        sendMessage({ command: "openWorktreeInNewWindow", repo: repo, path: worktreePath });
      }
    },
    {
      title: t("Reveal in File Manager"),
      recentActionId: "ref.revealWorktreeInOS",
      onClick: () => {
        recordRecentAction(repo, "ref.revealWorktreeInOS");
        sendMessage({ command: "revealWorktreeInOS", repo: repo, path: worktreePath });
      }
    },
    {
      title: t("Open Terminal Here"),
      recentActionId: "ref.openTerminal",
      onClick: () => {
        recordRecentAction(repo, "ref.openTerminal");
        sendMessage({
          command: "openTerminal",
          repo: repo,
          path: worktreePath,
          name: `Worktree: ${terminalLabel}`
        });
      }
    },
    {
      title: t("Copy Worktree Path"),
      onClick: () => {
        sendMessage({ command: "copyToClipboard", type: "worktreePath", data: worktreePath });
      }
    }
  ];
}

function buildRemoveDetachedWorktreeItem(repo: string, worktreePath: string): ContextMenuItem {
  return {
    title: `${t("Remove Worktree")}${ELLIPSIS}`,
    onClick: () => {
      showConfirmationDialog(
        t("Are you sure you want to remove the worktree at {0}?", `'${escapeHtml(worktreePath)}'`),
        () => {
          sendMessage({
            command: "removeWorktree",
            repo: repo,
            worktreePath: worktreePath,
            deleteBranch: false
          });
        },
        null
      );
    }
  };
}

export function buildDetachedWorktreeContextMenuItems(
  repo: string,
  worktreePath: string
): ContextMenuElement[] {
  return [
    ...buildWorktreeActionItems(repo, worktreePath, getWorktreeLabelName(worktreePath)),
    null,
    buildRemoveDetachedWorktreeItem(repo, worktreePath)
  ];
}
