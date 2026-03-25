import type { GitCommitNode, GitResetMode } from "../src/types";
import { showConfirmationDialog, showFormDialog, showSelectDialog } from "./dialogs";
import { abbrevCommit, ELLIPSIS, getRepoName, sendMessage } from "./utils";

export function buildCommitContextMenuItems(
  repo: string,
  hash: string,
  parentHashes: string[],
  commits: GitCommitNode[],
  commitLookup: { [hash: string]: number },
  sourceElem: HTMLElement
): ContextMenuElement[] {
  return [
    {
      title: `Add Tag${ELLIPSIS}`,
      onClick: () => {
        showFormDialog(
          `Add tag to commit <b><i>${abbrevCommit(hash)}</i></b>:`,
          [
            { type: "text-ref" as const, name: "Name: ", default: "" },
            {
              type: "select" as const,
              name: "Type: ",
              default: "annotated",
              options: [
                { name: "Annotated", value: "annotated" },
                { name: "Lightweight", value: "lightweight" }
              ]
            },
            {
              type: "text" as const,
              name: "Message: ",
              default: "",
              placeholder: "Optional"
            }
          ],
          "Add Tag",
          (values) => {
            sendMessage({
              command: "addTag",
              repo: repo,
              tagName: values[0],
              commitHash: hash,
              lightweight: values[1] === "lightweight",
              message: values[2]
            });
          },
          sourceElem
        );
      }
    },
    {
      title: `Create Branch${ELLIPSIS}`,
      onClick: () => {
        showFormDialog(
          `Enter the name of the branch you would like to create from commit <b><i>${abbrevCommit(hash)}</i></b>:`,
          [
            { type: "text-ref" as const, name: "Name: ", default: "" },
            { type: "checkbox" as const, name: "Check out", value: true }
          ],
          "Create Branch",
          (values) => {
            sendMessage({
              command: "createBranch",
              repo: repo,
              branchName: values[0],
              commitHash: hash,
              checkout: values[1] === "checked"
            });
          },
          sourceElem
        );
      }
    },
    {
      title: `Create Worktree Here${ELLIPSIS}`,
      onClick: () => {
        const repoName = getRepoName(repo);
        const pathPrefix = `../${repoName}-`;
        showFormDialog(
          `Create worktree at commit <b><i>${abbrevCommit(hash)}</i></b>:`,
          [
            { type: "text-ref" as const, name: "Branch Name: ", default: "" },
            { type: "text" as const, name: "Path: ", default: pathPrefix, placeholder: null },
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
              path: values[1],
              branchName: values[0],
              commitHash: hash,
              openTerminal: values[2] === "checked"
            });
          },
          sourceElem,
          (dialogEl) => {
            const branchInput = dialogEl.querySelector("#dialogInput0") as HTMLInputElement;
            const pathInput = dialogEl.querySelector("#dialogInput1") as HTMLInputElement;
            let lastBranchName = "";
            branchInput.addEventListener("input", () => {
              const currentPath = pathInput.value;
              const expectedPath = `${pathPrefix}${lastBranchName}`;
              if (currentPath === expectedPath || currentPath === pathPrefix) {
                pathInput.value = `${pathPrefix}${branchInput.value}`;
              }
              lastBranchName = branchInput.value;
            });
          }
        );
      }
    },
    null,
    {
      title: `Checkout${ELLIPSIS}`,
      onClick: () => {
        showConfirmationDialog(
          `Are you sure you want to checkout commit <b><i>${abbrevCommit(hash)}</i></b>? This will result in a 'detached HEAD' state.`,
          () => {
            sendMessage({
              command: "checkoutCommit",
              repo: repo,
              commitHash: hash
            });
          },
          sourceElem
        );
      }
    },
    {
      title: `Cherry Pick${ELLIPSIS}`,
      onClick: () => {
        const cherryPickCheckboxes: DialogCheckboxInput[] = [
          {
            type: "checkbox",
            name: "Record Origin",
            value: viewState.dialogDefaults.cherryPick.recordOrigin,
            info: "Record that this commit was the origin of the cherry pick by appending a line to the original commit message that indicates where it was cherry picked from."
          },
          {
            type: "checkbox",
            name: "No Commit",
            value: viewState.dialogDefaults.cherryPick.noCommit,
            info: "Cherry picked changes will be staged but not committed, so that you can review and/or modify the result before committing."
          }
        ];
        if (parentHashes.length === 1) {
          showFormDialog(
            `Are you sure you want to cherry pick commit <b><i>${abbrevCommit(hash)}</i></b>?`,
            cherryPickCheckboxes,
            "Yes, cherry pick commit",
            (values) => {
              sendMessage({
                command: "cherrypickCommit",
                repo: repo,
                commitHash: hash,
                parentIndex: 0,
                recordOrigin: values[0] === "checked",
                noCommit: values[1] === "checked"
              });
            },
            sourceElem
          );
        } else {
          let options = parentHashes.map((parentHash, index) => ({
            name: `${abbrevCommit(parentHash)}${
              typeof commitLookup[parentHash] === "number"
                ? `: ${commits[commitLookup[parentHash]].message}`
                : ""
            }`,
            value: (index + 1).toString()
          }));
          showFormDialog(
            `Are you sure you want to cherry pick merge commit <b><i>${abbrevCommit(hash)}</i></b>? Choose the parent hash on the main branch, to cherry pick the commit relative to:`,
            [
              {
                type: "select" as const,
                name: "Parent: ",
                options: options,
                default: "1"
              },
              ...cherryPickCheckboxes
            ],
            "Yes, cherry pick commit",
            (values) => {
              sendMessage({
                command: "cherrypickCommit",
                repo: repo,
                commitHash: hash,
                parentIndex: parseInt(values[0], 10),
                recordOrigin: values[1] === "checked",
                noCommit: values[2] === "checked"
              });
            },
            sourceElem
          );
        }
      }
    },
    {
      title: `Revert${ELLIPSIS}`,
      onClick: () => {
        if (parentHashes.length === 1) {
          showConfirmationDialog(
            `Are you sure you want to revert commit <b><i>${abbrevCommit(hash)}</i></b>?`,
            () => {
              sendMessage({
                command: "revertCommit",
                repo: repo,
                commitHash: hash,
                parentIndex: 0
              });
            },
            sourceElem
          );
        } else {
          let options = parentHashes.map((parentHash, index) => ({
            name: `${abbrevCommit(parentHash)}${
              typeof commitLookup[parentHash] === "number"
                ? `: ${commits[commitLookup[parentHash]].message}`
                : ""
            }`,
            value: (index + 1).toString()
          }));
          showSelectDialog(
            `Are you sure you want to revert merge commit <b><i>${abbrevCommit(hash)}</i></b>? Choose the parent hash on the main branch, to revert the commit relative to:`,
            "1",
            options,
            "Yes, revert commit",
            (parentIndex) => {
              sendMessage({
                command: "revertCommit",
                repo: repo,
                commitHash: hash,
                parentIndex: parseInt(parentIndex, 10)
              });
            },
            sourceElem
          );
        }
      }
    },
    null,
    {
      title: `Merge into current branch${ELLIPSIS}`,
      onClick: () => {
        const noFfDefault = viewState.dialogDefaults.merge.noFastForward;
        showFormDialog(
          `Are you sure you want to merge commit <b><i>${abbrevCommit(hash)}</i></b> into the current branch?`,
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
              command: "mergeCommit",
              repo: repo,
              commitHash: hash,
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
    },
    {
      title: `Reset current branch to this Commit${ELLIPSIS}`,
      onClick: () => {
        showSelectDialog(
          `Are you sure you want to reset the <b>current branch</b> to commit <b><i>${abbrevCommit(hash)}</i></b>?`,
          "mixed",
          [
            { name: "Soft - Keep all changes, but reset head", value: "soft" },
            { name: "Mixed - Keep working tree, but reset index", value: "mixed" },
            { name: "Hard - Discard all changes", value: "hard" }
          ],
          "Yes, reset",
          (mode) => {
            sendMessage({
              command: "resetToCommit",
              repo: repo,
              commitHash: hash,
              resetMode: mode as GitResetMode
            });
          },
          sourceElem
        );
      }
    },
    null,
    {
      title: "Copy Commit Hash to Clipboard",
      onClick: () => {
        sendMessage({ command: "copyToClipboard", type: "Commit Hash", data: hash });
      }
    }
  ];
}
