import { showCheckboxDialog, showConfirmationDialog, showRefInputDialog } from "./dialogs";
import { ELLIPSIS, escapeHtml, sendMessage } from "./utils";

export function buildStashContextMenuItems(
  repo: string,
  hash: string,
  selector: string,
  sourceElem: HTMLElement
): ContextMenuElement[] {
  return [
    {
      title: `Apply Stash${ELLIPSIS}`,
      onClick: () => {
        showCheckboxDialog(
          `Are you sure you want to apply <b><i>${escapeHtml(selector)}</i></b>?`,
          "Reinstate Index",
          false,
          "Yes, apply stash",
          (reinstateIndex) => {
            sendMessage({
              command: "applyStash",
              repo: repo,
              selector: selector,
              reinstateIndex: reinstateIndex
            });
          },
          sourceElem
        );
      }
    },
    {
      title: `Create Branch from Stash${ELLIPSIS}`,
      onClick: () => {
        showRefInputDialog(
          `Enter the name of the branch you would like to create from <b><i>${escapeHtml(selector)}</i></b>:`,
          "",
          "Create Branch",
          (name) => {
            sendMessage({
              command: "branchFromStash",
              repo: repo,
              branchName: name,
              selector: selector
            });
          },
          sourceElem
        );
      }
    },
    {
      title: `Pop Stash${ELLIPSIS}`,
      onClick: () => {
        showCheckboxDialog(
          `Are you sure you want to pop <b><i>${escapeHtml(selector)}</i></b>? This will remove the stash entry.`,
          "Reinstate Index",
          false,
          "Yes, pop stash",
          (reinstateIndex) => {
            sendMessage({
              command: "popStash",
              repo: repo,
              selector: selector,
              reinstateIndex: reinstateIndex
            });
          },
          sourceElem
        );
      }
    },
    {
      title: `Drop Stash${ELLIPSIS}`,
      onClick: () => {
        showConfirmationDialog(
          `Are you sure you want to drop <b><i>${escapeHtml(selector)}</i></b>? This cannot be undone.`,
          () => {
            sendMessage({
              command: "dropStash",
              repo: repo,
              selector: selector
            });
          },
          sourceElem
        );
      }
    },
    null,
    {
      title: "Copy Stash Name to Clipboard",
      onClick: () => {
        sendMessage({
          command: "copyToClipboard",
          type: "Stash Name",
          data: selector
        });
      }
    },
    {
      title: "Copy Stash Hash to Clipboard",
      onClick: () => {
        sendMessage({
          command: "copyToClipboard",
          type: "Stash Hash",
          data: hash
        });
      }
    }
  ];
}
