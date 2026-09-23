import type { RecentActionId, RequestMergeBranch, RequestMergeCommit } from "../src/types";
import { recordRecentAction } from "./contextMenu";
import { showFormDialog } from "./dialogs";
import { t } from "./i18n";
import { ELLIPSIS, sendMessage } from "./utils";

export interface MergeOptions {
  createNewCommit: boolean;
  squash: boolean;
  noCommit: boolean;
}

/**
 * Build the "Merge into current branch..." menu item shared by the commit and ref menus.
 */
export function buildMergeMenuItem(
  repo: string,
  recentActionId: RecentActionId,
  getMessage: () => string,
  buildRequest: (options: MergeOptions) => RequestMergeBranch | RequestMergeCommit
): ContextMenuItem {
  return {
    title: `${t("Merge into current branch")}${ELLIPSIS}`,
    recentActionId: recentActionId,
    onClick: () => {
      const noFfDefault = viewState.dialogDefaults.merge.noFastForward;
      showFormDialog(
        getMessage(),
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
          recordRecentAction(repo, recentActionId);
          sendMessage(
            buildRequest({
              createNewCommit: values[0] === "checked",
              squash: values[1] === "checked",
              noCommit: values[2] === "checked"
            })
          );
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
