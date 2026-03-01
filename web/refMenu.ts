import {
  showActionRunningDialog,
  showCheckboxDialog,
  showConfirmationDialog,
  showFormDialog,
  showRefInputDialog
} from "./dialogs";
import { ELLIPSIS, escapeHtml, sendMessage } from "./utils";

export interface ParsedRemoteRef {
  remoteName: string;
  branchName: string;
}

/**
 * Split a remote-tracking ref name (e.g. "origin/feature/x") into remote name
 * and branch name at the first "/" boundary.
 */
export function parseRemoteRef(refName: string): ParsedRemoteRef {
  const slashIndex = refName.indexOf("/");
  if (slashIndex <= 0) {
    return { remoteName: "", branchName: refName };
  }
  return {
    remoteName: refName.substring(0, slashIndex),
    branchName: refName.substring(slashIndex + 1)
  };
}

function buildMergeBranchMenuItem(repo: string, refName: string): ContextMenuItem {
  return {
    title: `Merge into current branch${ELLIPSIS}`,
    onClick: () => {
      showCheckboxDialog(
        `Are you sure you want to merge branch <b><i>${escapeHtml(refName)}</i></b> into the current branch?`,
        "Create a new commit even if fast-forward is possible",
        true,
        "Yes, merge",
        (createNewCommit) => {
          sendMessage({
            command: "mergeBranch",
            repo: repo,
            branchName: refName,
            createNewCommit: createNewCommit
          });
        },
        null
      );
    }
  };
}

function showDeleteBranchDialog(repo: string, refName: string, remotes: string[]): void {
  const hasRemotes = remotes.length > 0;
  if (hasRemotes) {
    showFormDialog(
      `Are you sure you want to delete the branch <b><i>${escapeHtml(refName)}</i></b>?`,
      [
        { type: "checkbox", name: "Force Delete", value: false },
        {
          type: "checkbox",
          name: "Delete this branch on the remote",
          value: false
        }
      ],
      "Delete Branch",
      (values) => {
        sendMessage({
          command: "deleteBranch",
          repo: repo,
          branchName: refName,
          forceDelete: values[0] === "checked",
          deleteOnRemotes: values[1] === "checked" ? remotes : []
        });
      },
      null
    );
  } else {
    showCheckboxDialog(
      `Are you sure you want to delete the branch <b><i>${escapeHtml(refName)}</i></b>?`,
      "Force Delete",
      false,
      "Delete Branch",
      (forceDelete) => {
        sendMessage({
          command: "deleteBranch",
          repo: repo,
          branchName: refName,
          forceDelete: forceDelete,
          deleteOnRemotes: []
        });
      },
      null
    );
  }
}

export function buildRefContextMenuItems(
  repo: string,
  refName: string,
  sourceElem: HTMLElement,
  isRemoteCombined: boolean,
  gitBranchHead: string | null,
  remotes?: string[]
): ContextMenuElement[] {
  let menu: ContextMenuElement[];
  let copyType: string;
  if (sourceElem.classList.contains("tag")) {
    menu = [
      {
        title: `Delete Tag${ELLIPSIS}`,
        onClick: () => {
          showConfirmationDialog(
            `Are you sure you want to delete the tag <b><i>${escapeHtml(refName)}</i></b>?`,
            () => {
              sendMessage({ command: "deleteTag", repo: repo, tagName: refName });
            },
            null
          );
        }
      },
      {
        title: `Push Tag${ELLIPSIS}`,
        onClick: () => {
          showConfirmationDialog(
            `Are you sure you want to push the tag <b><i>${escapeHtml(refName)}</i></b>?`,
            () => {
              sendMessage({ command: "pushTag", repo: repo, tagName: refName });
              showActionRunningDialog("Pushing Tag");
            },
            null
          );
        }
      }
    ];
    copyType = "Tag Name";
  } else if (isRemoteCombined || sourceElem.classList.contains("remote")) {
    const parsed = parseRemoteRef(refName);
    menu = [
      {
        title: `Checkout Branch${ELLIPSIS}`,
        onClick: () => checkoutBranchAction(repo, sourceElem, refName, isRemoteCombined)
      },
      {
        title: `Delete Remote Branch${ELLIPSIS}`,
        onClick: () => {
          showConfirmationDialog(
            `Are you sure you want to delete the remote branch <b><i>${escapeHtml(refName)}</i></b>?`,
            () => {
              sendMessage({
                command: "deleteRemoteBranch",
                repo: repo,
                remoteName: parsed.remoteName,
                branchName: parsed.branchName
              });
            },
            null
          );
        }
      },
      buildMergeBranchMenuItem(repo, refName)
    ];
    copyType = "Branch Name";
  } else {
    menu = [];
    if (gitBranchHead !== refName) {
      menu.push({
        title: "Checkout Branch",
        onClick: () => checkoutBranchAction(repo, sourceElem, refName)
      });
    }
    if (gitBranchHead === refName) {
      menu.push(
        {
          title: "Pull",
          onClick: () => {
            showConfirmationDialog(
              `Are you sure you want to pull into <b><i>${escapeHtml(refName)}</i></b>?`,
              () => {
                sendMessage({ command: "pull", repo: repo });
              },
              null
            );
          }
        },
        {
          title: "Push",
          onClick: () => {
            showConfirmationDialog(
              `Are you sure you want to push <b><i>${escapeHtml(refName)}</i></b>?`,
              () => {
                sendMessage({ command: "push", repo: repo });
              },
              null
            );
          }
        }
      );
    }
    menu.push({
      title: `Rename Branch${ELLIPSIS}`,
      onClick: () => {
        showRefInputDialog(
          `Enter the new name for branch <b><i>${escapeHtml(refName)}</i></b>:`,
          refName,
          "Rename Branch",
          (newName) => {
            sendMessage({
              command: "renameBranch",
              repo: repo,
              oldName: refName,
              newName: newName
            });
          },
          null
        );
      }
    });
    if (gitBranchHead !== refName) {
      const resolvedRemotes = Array.isArray(remotes) && remotes.length > 0 ? remotes : [];
      menu.push(
        {
          title: `Delete Branch${ELLIPSIS}`,
          onClick: () => showDeleteBranchDialog(repo, refName, resolvedRemotes)
        },
        buildMergeBranchMenuItem(repo, refName),
        {
          title: `Rebase current branch on Branch${ELLIPSIS}`,
          onClick: () => {
            showConfirmationDialog(
              `Are you sure you want to rebase the current branch on <b><i>${escapeHtml(refName)}</i></b>?`,
              () => {
                sendMessage({
                  command: "rebaseBranch",
                  repo: repo,
                  branchName: refName
                });
              },
              null
            );
          }
        }
      );
    }
    copyType = "Branch Name";
  }
  menu.push(null, {
    title: `Copy ${copyType} to Clipboard`,
    onClick: () => {
      sendMessage({ command: "copyToClipboard", type: copyType, data: refName });
    }
  });
  return menu;
}

export function checkoutBranchAction(
  repo: string,
  sourceElem: HTMLElement,
  refName: string,
  isRemoteCombined?: boolean
) {
  if (!isRemoteCombined && sourceElem.classList.contains("head")) {
    sendMessage({
      command: "checkoutBranch",
      repo: repo,
      branchName: refName,
      remoteBranch: null
    });
  } else if (isRemoteCombined || sourceElem.classList.contains("remote")) {
    const parsed = parseRemoteRef(refName);
    const defaultBranchName = parsed.branchName || refName;
    showRefInputDialog(
      `Enter the name of the new branch you would like to create when checking out <b><i>${escapeHtml(refName)}</i></b>:`,
      defaultBranchName,
      "Checkout Branch",
      (newBranch) => {
        sendMessage({
          command: "checkoutBranch",
          repo: repo,
          branchName: newBranch,
          remoteBranch: refName
        });
      },
      null
    );
  }
}
