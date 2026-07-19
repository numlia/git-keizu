import type { GitCommitNode, GitResetMode } from "../src/types";
import { recordRecentAction } from "./contextMenu";
import { showConfirmationDialog, showFormDialog, showSelectDialog } from "./dialogs";
import { t } from "./i18n";
import {
  abbrevCommit,
  ELLIPSIS,
  getRepoName,
  sanitizeBranchNameForPath,
  sendMessage
} from "./utils";

function buildMergeParentOptions(
  parentHashes: string[],
  commits: GitCommitNode[],
  commitLookup: { [hash: string]: number }
): { name: string; value: string }[] {
  return parentHashes.map((parentHash, index) => ({
    name:
      typeof commitLookup[parentHash] === "number"
        ? `${abbrevCommit(parentHash)}: ${commits[commitLookup[parentHash]].message}`
        : abbrevCommit(parentHash),
    value: (index + 1).toString()
  }));
}

export function buildCommitContextMenuItems(
  repo: string,
  hash: string,
  parentHashes: string[],
  commits: GitCommitNode[],
  commitLookup: { [hash: string]: number },
  sourceElem: HTMLElement
): ContextMenuElement[] {
  const addTagItem: ContextMenuItem = {
    title: `${t("Add Tag")}${ELLIPSIS}`,
    recentActionId: "commit.addTag",
    onClick: () => {
      showFormDialog(
        t("Add tag to commit {0}:", `<b><i>${abbrevCommit(hash)}</i></b>`),
        [
          { type: "text-ref" as const, name: t("Name: "), default: "" },
          {
            type: "select" as const,
            name: t("Type: "),
            default: "annotated",
            options: [
              { name: t("Annotated"), value: "annotated" },
              { name: t("Lightweight"), value: "lightweight" }
            ]
          },
          {
            type: "text" as const,
            name: t("Message: "),
            default: "",
            placeholder: t("Optional")
          }
        ],
        t("Add Tag"),
        (values) => {
          recordRecentAction(repo, "commit.addTag");
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
  };
  const createBranchItem: ContextMenuItem = {
    title: `${t("Create Branch")}${ELLIPSIS}`,
    recentActionId: "commit.createBranch",
    onClick: () => {
      showFormDialog(
        t(
          "Enter the name of the branch you would like to create from commit {0}:",
          `<b><i>${abbrevCommit(hash)}</i></b>`
        ),
        [
          { type: "text-ref" as const, name: t("Name: "), default: "" },
          { type: "checkbox" as const, name: t("Check out"), value: true }
        ],
        t("Create Branch"),
        (values) => {
          recordRecentAction(repo, "commit.createBranch");
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
  };
  const createWorktreeItem: ContextMenuItem = {
    title: `${t("Create Worktree Here")}${ELLIPSIS}`,
    recentActionId: "commit.createWorktree",
    onClick: () => {
      const repoName = getRepoName(repo);
      const pathPrefix = `../${repoName}-`;
      showFormDialog(
        t("Create worktree at commit {0}:", `<b><i>${abbrevCommit(hash)}</i></b>`),
        [
          { type: "text-ref" as const, name: t("Branch Name: "), default: "" },
          { type: "text" as const, name: t("Path: "), default: pathPrefix, placeholder: null },
          {
            type: "checkbox" as const,
            name: t("Open Terminal"),
            value: viewState.dialogDefaults.createWorktree.openTerminal
          }
        ],
        t("Create Worktree"),
        (values) => {
          recordRecentAction(repo, "commit.createWorktree");
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
            const expectedPath = `${pathPrefix}${sanitizeBranchNameForPath(lastBranchName)}`;
            if (currentPath === expectedPath || currentPath === pathPrefix) {
              pathInput.value = `${pathPrefix}${sanitizeBranchNameForPath(branchInput.value)}`;
            }
            lastBranchName = branchInput.value;
          });
        }
      );
    }
  };
  const checkoutItem: ContextMenuItem = {
    title: `${t("Checkout")}${ELLIPSIS}`,
    onClick: () => {
      showConfirmationDialog(
        t(
          "Are you sure you want to checkout commit {0}? This will result in a 'detached HEAD' state.",
          `<b><i>${abbrevCommit(hash)}</i></b>`
        ),
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
  };
  const cherryPickItem: ContextMenuItem = {
    title: `${t("Cherry Pick")}${ELLIPSIS}`,
    recentActionId: "commit.cherryPick",
    onClick: () => {
      const cherryPickCheckboxes: DialogCheckboxInput[] = [
        {
          type: "checkbox",
          name: t("Record Origin"),
          value: viewState.dialogDefaults.cherryPick.recordOrigin,
          info: t(
            "Record that this commit was the origin of the cherry pick by appending a line to the original commit message that indicates where it was cherry picked from."
          )
        },
        {
          type: "checkbox",
          name: t("No Commit"),
          value: viewState.dialogDefaults.cherryPick.noCommit,
          info: t(
            "Cherry picked changes will be staged but not committed, so that you can review and/or modify the result before committing."
          )
        }
      ];
      if (parentHashes.length <= 1) {
        showFormDialog(
          t(
            "Are you sure you want to cherry pick commit {0}?",
            `<b><i>${abbrevCommit(hash)}</i></b>`
          ),
          cherryPickCheckboxes,
          t("Yes, cherry pick commit"),
          (values) => {
            recordRecentAction(repo, "commit.cherryPick");
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
        const options = buildMergeParentOptions(parentHashes, commits, commitLookup);
        showFormDialog(
          t(
            "Are you sure you want to cherry pick merge commit {0}? Choose the parent hash on the main branch, to cherry pick the commit relative to:",
            `<b><i>${abbrevCommit(hash)}</i></b>`
          ),
          [
            {
              type: "select" as const,
              name: t("Parent: "),
              options: options,
              default: "1"
            },
            ...cherryPickCheckboxes
          ],
          t("Yes, cherry pick commit"),
          (values) => {
            recordRecentAction(repo, "commit.cherryPick");
            sendMessage({
              command: "cherrypickCommit",
              repo: repo,
              commitHash: hash,
              parentIndex: Number.parseInt(values[0], 10),
              recordOrigin: values[1] === "checked",
              noCommit: values[2] === "checked"
            });
          },
          sourceElem
        );
      }
    }
  };
  const revertItem: ContextMenuItem = {
    title: `${t("Revert")}${ELLIPSIS}`,
    onClick: () => {
      if (parentHashes.length <= 1) {
        showConfirmationDialog(
          t("Are you sure you want to revert commit {0}?", `<b><i>${abbrevCommit(hash)}</i></b>`),
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
        const options = buildMergeParentOptions(parentHashes, commits, commitLookup);
        showSelectDialog(
          t(
            "Are you sure you want to revert merge commit {0}? Choose the parent hash on the main branch, to revert the commit relative to:",
            `<b><i>${abbrevCommit(hash)}</i></b>`
          ),
          "1",
          options,
          t("Yes, revert commit"),
          (parentIndex) => {
            sendMessage({
              command: "revertCommit",
              repo: repo,
              commitHash: hash,
              parentIndex: Number.parseInt(parentIndex, 10)
            });
          },
          sourceElem
        );
      }
    }
  };
  const mergeItem: ContextMenuItem = {
    title: `${t("Merge into current branch")}${ELLIPSIS}`,
    recentActionId: "commit.merge",
    onClick: () => {
      const noFfDefault = viewState.dialogDefaults.merge.noFastForward;
      showFormDialog(
        t(
          "Are you sure you want to merge commit {0} into the current branch?",
          `<b><i>${abbrevCommit(hash)}</i></b>`
        ),
        [
          {
            type: "checkbox",
            name: t("Create a new commit even if fast-forward is possible"),
            value: noFfDefault
          },
          {
            type: "checkbox",
            name: t("Squash Commits"),
            value: viewState.dialogDefaults.merge.squashCommits,
            info: t(
              "Create a single commit on the current branch whose effect is the same as merging this branch. Squash does not create a commit automatically, so the No Commit option has no additional effect when Squash is enabled."
            )
          },
          {
            type: "checkbox",
            name: t("No Commit"),
            value: viewState.dialogDefaults.merge.noCommit,
            info: t(
              "The changes of the merge will be staged but not committed, so that you can review and/or modify the merge result before committing."
            )
          }
        ],
        t("Yes, merge"),
        (values) => {
          recordRecentAction(repo, "commit.merge");
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
  };
  const resetItem: ContextMenuItem = {
    title: `${t("Reset current branch to this Commit")}${ELLIPSIS}`,
    recentActionId: "commit.resetToCommit",
    onClick: () => {
      showSelectDialog(
        t(
          "Are you sure you want to reset the {0} to commit {1}?",
          "<b>current branch</b>",
          `<b><i>${abbrevCommit(hash)}</i></b>`
        ),
        "mixed",
        [
          { name: t("Soft - Keep all changes, but reset head"), value: "soft" },
          { name: t("Mixed - Keep working tree, but reset index"), value: "mixed" },
          { name: t("Hard - Discard all changes"), value: "hard" }
        ],
        t("Yes, reset"),
        (mode) => {
          recordRecentAction(repo, "commit.resetToCommit");
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
  };
  const copyCommitHashItem: ContextMenuItem = {
    title: t("context.copyCommitHash"),
    onClick: () => {
      sendMessage({ command: "copyToClipboard", type: "Commit Hash", data: hash });
    }
  };

  return [
    createBranchItem,
    createWorktreeItem,
    cherryPickItem,
    mergeItem,
    null,
    {
      title: t("context.more"),
      submenu: [addTagItem, checkoutItem, revertItem, resetItem]
    },
    null,
    copyCommitHashItem
  ];
}
