import type { GitCommitNode, GitResetMode } from "../src/types";
import {
  showCheckboxDialog,
  showConfirmationDialog,
  showFormDialog,
  showRefInputDialog,
  showSelectDialog
} from "./dialogs";
import { abbrevCommit, ELLIPSIS, sendMessage } from "./utils";

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
        showRefInputDialog(
          `Enter the name of the branch you would like to create from commit <b><i>${abbrevCommit(hash)}</i></b>:`,
          "",
          "Create Branch",
          (name) => {
            sendMessage({
              command: "createBranch",
              repo: repo,
              branchName: name,
              commitHash: hash
            });
          },
          sourceElem
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
        if (parentHashes.length === 1) {
          showConfirmationDialog(
            `Are you sure you want to cherry pick commit <b><i>${abbrevCommit(hash)}</i></b>?`,
            () => {
              sendMessage({
                command: "cherrypickCommit",
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
            `Are you sure you want to cherry pick merge commit <b><i>${abbrevCommit(hash)}</i></b>? Choose the parent hash on the main branch, to cherry pick the commit relative to:`,
            "1",
            options,
            "Yes, cherry pick commit",
            (parentIndex) => {
              sendMessage({
                command: "cherrypickCommit",
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
        showCheckboxDialog(
          `Are you sure you want to merge commit <b><i>${abbrevCommit(hash)}</i></b> into the current branch?`,
          "Create a new commit even if fast-forward is possible",
          true,
          "Yes, merge",
          (createNewCommit) => {
            sendMessage({
              command: "mergeCommit",
              repo: repo,
              commitHash: hash,
              createNewCommit: createNewCommit
            });
          },
          null
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
