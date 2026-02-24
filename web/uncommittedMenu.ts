import {
  showCheckboxDialog,
  showConfirmationDialog,
  showFormDialog,
  showSelectDialog
} from "./dialogs";
import { ELLIPSIS, sendMessage } from "./utils";

export function buildUncommittedContextMenuItems(
  repo: string,
  sourceElem: HTMLElement
): ContextMenuElement[] {
  return [
    {
      title: `Stash uncommitted changes${ELLIPSIS}`,
      onClick: () => {
        showFormDialog(
          "Stash uncommitted changes:",
          [
            {
              type: "text" as const,
              name: "Message: ",
              default: "",
              placeholder: "Optional"
            },
            {
              type: "checkbox" as const,
              name: "Include Untracked",
              value: false
            }
          ],
          "Stash Changes",
          (values) => {
            sendMessage({
              command: "pushStash",
              repo: repo,
              message: values[0],
              includeUntracked: values[1] === "checked"
            });
          },
          sourceElem
        );
      }
    },
    {
      title: `Reset uncommitted changes${ELLIPSIS}`,
      onClick: () => {
        showSelectDialog(
          "Select the mode to reset uncommitted changes:",
          "mixed",
          [
            { name: "Mixed - Keep changes in working directory", value: "mixed" },
            { name: "Hard - Discard all changes", value: "hard" }
          ],
          "Reset",
          (mode) => {
            showConfirmationDialog(
              `Are you sure you want to reset uncommitted changes with <b>${mode}</b> mode?${mode === "hard" ? " This will discard all uncommitted changes and cannot be undone." : ""}`,
              () => {
                sendMessage({
                  command: "resetUncommitted",
                  repo: repo,
                  mode: mode
                });
              },
              sourceElem
            );
          },
          sourceElem
        );
      }
    },
    {
      title: `Clean untracked files${ELLIPSIS}`,
      onClick: () => {
        showCheckboxDialog(
          "Are you sure you want to clean untracked files? This cannot be undone.",
          "Clean untracked directories",
          false,
          "Clean",
          (directories) => {
            sendMessage({
              command: "cleanUntrackedFiles",
              repo: repo,
              directories: directories
            });
          },
          sourceElem
        );
      }
    }
  ];
}
