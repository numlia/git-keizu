import {
  showActionRunningDialog,
  showCheckboxDialog,
  showConfirmationDialog,
  showRefInputDialog
} from "./dialogs";
import { ELLIPSIS, escapeHtml, sendMessage } from "./utils";

export function buildRefContextMenuItems(
  repo: string,
  refName: string,
  sourceElem: HTMLElement,
  isRemoteCombined: boolean,
  gitBranchHead: string | null
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
    menu = [
      {
        title: `Checkout Branch${ELLIPSIS}`,
        onClick: () => checkoutBranchAction(repo, sourceElem, refName, isRemoteCombined)
      }
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
      menu.push(
        {
          title: `Delete Branch${ELLIPSIS}`,
          onClick: () => {
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
                  forceDelete: forceDelete
                });
              },
              null
            );
          }
        },
        {
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
    let refNameComps = refName.split("/");
    showRefInputDialog(
      `Enter the name of the new branch you would like to create when checking out <b><i>${escapeHtml(refName)}</i></b>:`,
      refNameComps[refNameComps.length - 1],
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
