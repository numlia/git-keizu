import {
  showActionRunningDialog,
  showCheckboxDialog,
  showConfirmationDialog,
  showFormDialog,
  showRefInputDialog
} from "./dialogs";
import {
  ELLIPSIS,
  escapeHtml,
  getRepoName,
  sanitizeBranchNameForPath,
  sendMessage,
  svgIcons
} from "./utils";

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
      const noFfDefault = viewState.dialogDefaults.merge.noFastForward;
      showFormDialog(
        `Are you sure you want to merge branch <b><i>${escapeHtml(refName)}</i></b> into the current branch?`,
        [
          {
            type: "checkbox",
            name: "Create a new commit even if fast-forward is possible",
            value: noFfDefault
          },
          {
            type: "checkbox",
            name: "Squash Commits",
            value: viewState.dialogDefaults.merge.squashCommits,
            info: "Create a single commit on the current branch whose effect is the same as merging this branch. Squash does not create a commit automatically, so the No Commit option has no additional effect when Squash is enabled."
          },
          {
            type: "checkbox",
            name: "No Commit",
            value: viewState.dialogDefaults.merge.noCommit,
            info: "The changes of the merge will be staged but not committed, so that you can review and/or modify the merge result before committing."
          }
        ],
        "Yes, merge",
        (values) => {
          sendMessage({
            command: "mergeBranch",
            repo: repo,
            branchName: refName,
            createNewCommit: values[0] === "checked",
            squash: values[1] === "checked",
            noCommit: values[2] === "checked"
          });
        },
        null,
        (dialogEl) => {
          const squashInput = dialogEl.querySelector("#dialogInput1") as HTMLInputElement;
          const noFfInput = dialogEl.querySelector("#dialogInput0") as HTMLInputElement;
          if (squashInput.checked) {
            noFfInput.checked = false;
            noFfInput.disabled = true;
          }
          squashInput.addEventListener("change", () => {
            if (squashInput.checked) {
              noFfInput.checked = false;
              noFfInput.disabled = true;
            } else {
              noFfInput.disabled = false;
              noFfInput.checked = noFfDefault;
            }
          });
        }
      );
    }
  };
}

function buildWorktreeWarning(
  worktreeInfo: { path: string; isMainWorktree: boolean } | null | undefined
): string {
  if (worktreeInfo === null || worktreeInfo === undefined) return "";
  return `<br><span class="dialogWarning">${svgIcons.alert} This branch has an active worktree at <b>${escapeHtml(worktreeInfo.path)}</b>. Force deleting will orphan the worktree directory (detached HEAD).</span>`;
}

function showDeleteBranchDialog(
  repo: string,
  refName: string,
  remotes: string[],
  worktreeInfo?: { path: string; isMainWorktree: boolean } | null
): void {
  const worktreeWarning = buildWorktreeWarning(worktreeInfo);
  const message = `Are you sure you want to delete the branch <b><i>${escapeHtml(refName)}</i></b>?${worktreeWarning}`;
  const hasRemotes = remotes.length > 0;
  if (hasRemotes) {
    showFormDialog(
      message,
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
      message,
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
  remotes?: string[],
  worktreeInfo?: { path: string; isMainWorktree: boolean } | null
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
        const renameWorktreeWarning =
          worktreeInfo !== null && worktreeInfo !== undefined
            ? `<br><span class="dialogWarning">${svgIcons.alert} This branch has an active worktree at <b>${escapeHtml(worktreeInfo.path)}</b>. Renaming will not update the worktree directory name.</span>`
            : "";
        showFormDialog(
          `Enter the new name for branch <b><i>${escapeHtml(refName)}</i></b>:${renameWorktreeWarning}`,
          [
            { type: "text-ref", name: "", default: refName },
            { type: "checkbox", name: "Update upstream tracking", value: true }
          ],
          "Rename Branch",
          (values) => {
            sendMessage({
              command: "renameBranch",
              repo: repo,
              oldName: refName,
              newName: values[0],
              updateUpstream: values[1] === "checked"
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
          onClick: () => showDeleteBranchDialog(repo, refName, resolvedRemotes, worktreeInfo)
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
    if (worktreeInfo === null || worktreeInfo === undefined) {
      const repoName = getRepoName(repo);
      const defaultPath = `../${repoName}-${sanitizeBranchNameForPath(refName)}`;
      menu.push(null, {
        title: `Create Worktree${ELLIPSIS}`,
        onClick: () => {
          showFormDialog(
            `Create worktree for branch <b><i>${escapeHtml(refName)}</i></b>:`,
            [
              {
                type: "text" as const,
                name: "Path: ",
                default: defaultPath,
                placeholder: null
              },
              {
                type: "checkbox" as const,
                name: "Open Terminal",
                value: viewState.dialogDefaults.createWorktree.openTerminal
              }
            ],
            "Create Worktree",
            (values) => {
              sendMessage({
                command: "createWorktree",
                repo: repo,
                path: values[0],
                branchName: refName,
                openTerminal: values[1] === "checked"
              });
            },
            sourceElem
          );
        }
      });
    } else {
      menu.push(
        null,
        {
          title: "Open Terminal Here",
          onClick: () => {
            sendMessage({
              command: "openTerminal",
              repo: repo,
              path: worktreeInfo.path,
              name: `Worktree: ${refName}`
            });
          }
        },
        {
          title: "Copy Worktree Path",
          onClick: () => {
            sendMessage({
              command: "copyToClipboard",
              type: "worktreePath",
              data: worktreeInfo.path
            });
          }
        }
      );
      if (!worktreeInfo.isMainWorktree) {
        menu.push({
          title: `Remove Worktree${ELLIPSIS}`,
          onClick: () => {
            showFormDialog(
              `Are you sure you want to remove the worktree for branch '${escapeHtml(refName)}' at '${escapeHtml(worktreeInfo.path)}'?`,
              [
                {
                  type: "checkbox",
                  name: `Also delete branch '${escapeHtml(refName)}' (git branch -d)`,
                  value: viewState.dialogDefaults.removeWorktree.deleteBranch,
                  info: "Uses safe delete — unmerged branches will not be deleted."
                }
              ],
              "Remove",
              (values) => {
                sendMessage({
                  command: "removeWorktree",
                  repo: repo,
                  worktreePath: worktreeInfo.path,
                  branchName: refName,
                  deleteBranch: values[0] === "checked"
                });
              },
              sourceElem
            );
          }
        });
      }
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
