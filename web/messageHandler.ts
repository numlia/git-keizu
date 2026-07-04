import type {
  GitCommitDetails,
  GitCommitNode,
  GitFileChange,
  GitRepoSet,
  ResponseMessage,
  WorktreeMap
} from "../src/types";
import { hideDialog, showErrorDialog } from "./dialogs";
import { generateGitFileTree } from "./fileTree";
import { t } from "./i18n";
import { refreshGraphOrDisplayError } from "./utils";

export interface GitKeizuViewAPI {
  hideCommitDetails(): void;
  showCommitDetails(commitDetails: GitCommitDetails, fileTree: GitFolder): void;
  showCompareResult(fileChanges: GitFileChange[], fromHash: string, toHash: string): void;
  loadAvatar(email: string, image: string): void;
  loadBranches(branches: string[], head: string | null, hard: boolean, isRepo: boolean): void;
  loadCommits(
    commits: GitCommitNode[],
    head: string | null,
    moreAvailable: boolean,
    hard: boolean,
    authors?: string[],
    worktrees?: WorktreeMap
  ): void;
  loadRepos(repos: GitRepoSet, lastActiveRepo: string | null): void;
  refresh(hard: boolean): void;
  selectRepo(repo: string): void;
  setShowRecentActions(showRecentActions: boolean): void;
}

export function handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void {
  switch (msg.command) {
    case "addTag":
      refreshOrError(gitKeizu, msg.status, t("error.addTag"));
      break;
    case "applyStash":
      refreshOrError(gitKeizu, msg.status, t("error.applyStash"));
      break;
    case "branchFromStash":
      refreshOrError(gitKeizu, msg.status, t("error.branchFromStash"));
      break;
    case "checkoutBranch":
      refreshOrError(gitKeizu, msg.status, t("error.checkoutBranch"));
      break;
    case "checkoutCommit":
      refreshOrError(gitKeizu, msg.status, t("error.checkoutCommit"));
      break;
    case "cherrypickCommit":
      refreshOrError(gitKeizu, msg.status, t("error.cherrypickCommit"));
      break;
    case "cleanUntrackedFiles":
      refreshOrError(gitKeizu, msg.status, t("error.cleanUntrackedFiles"));
      break;
    case "commitDetails":
      if (msg.commitDetails === null) {
        gitKeizu.hideCommitDetails();
        showErrorDialog(t("error.commitDetails"), null, null);
      } else {
        try {
          const fileTree = generateGitFileTree(msg.commitDetails.fileChanges);
          gitKeizu.showCommitDetails(msg.commitDetails, fileTree);
        } catch (error: unknown) {
          gitKeizu.hideCommitDetails();
          showErrorDialog(
            t("error.commitDetails"),
            error instanceof Error ? error.message : null,
            null
          );
        }
      }
      break;
    case "compareCommits":
      if (msg.fileChanges === null) {
        showErrorDialog(t("error.compareCommits"), null, null);
      } else {
        gitKeizu.showCompareResult(msg.fileChanges, msg.fromHash, msg.toHash);
      }
      break;
    case "copyToClipboard":
      if (msg.success === false) showErrorDialog(t("error.copyToClipboard", msg.type), null, null);
      break;
    case "createBranch":
      refreshOrError(gitKeizu, msg.status, t("error.createBranch"));
      break;
    case "createWorktree":
      refreshOrError(gitKeizu, msg.status, t("error.createWorktree"));
      break;
    case "deleteBranch":
      refreshOrError(gitKeizu, msg.status, t("error.deleteBranch"));
      break;
    case "deleteRemoteBranch":
      refreshOrError(gitKeizu, msg.status, t("error.deleteRemoteBranch"));
      break;
    case "deleteTag":
      refreshOrError(gitKeizu, msg.status, t("error.deleteTag"));
      break;
    case "dropStash":
      refreshOrError(gitKeizu, msg.status, t("error.dropStash"));
      break;
    case "fetch":
      refreshOrError(gitKeizu, msg.status, t("error.fetch"));
      break;
    case "fetchAvatar":
      gitKeizu.loadAvatar(msg.email, msg.image);
      break;
    case "loadBranches":
      gitKeizu.loadBranches(msg.branches, msg.head, msg.hard, msg.isRepo);
      break;
    case "loadCommits":
      gitKeizu.loadCommits(
        msg.commits,
        msg.head,
        msg.moreCommitsAvailable,
        msg.hard,
        msg.authors,
        msg.worktrees
      );
      break;
    case "loadRepos":
      gitKeizu.loadRepos(msg.repos, msg.lastActiveRepo);
      break;
    case "mergeBranch":
      refreshOrError(gitKeizu, msg.status, t("error.mergeBranch"));
      break;
    case "openFile":
      if (msg.status !== null) {
        showErrorDialog(t("error.openFile"), msg.status, null);
      }
      break;
    case "openTerminal":
      break;
    case "mergeCommit":
      refreshOrError(gitKeizu, msg.status, t("error.mergeCommit"));
      break;
    case "rebaseBranch":
      refreshOrError(gitKeizu, msg.status, t("error.rebaseBranch"));
      break;
    case "popStash":
      refreshOrError(gitKeizu, msg.status, t("error.popStash"));
      break;
    case "pull":
      refreshOrError(gitKeizu, msg.status, t("error.pull"));
      break;
    case "push":
      refreshOrError(gitKeizu, msg.status, t("error.push"));
      break;
    case "pushStash":
      refreshOrError(gitKeizu, msg.status, t("error.pushStash"));
      break;
    case "pushTag":
      hideDialog();
      refreshOrError(gitKeizu, msg.status, t("error.pushTag"));
      break;
    case "removeWorktree":
      if (msg.status !== null) {
        showErrorDialog(t("error.removeWorktree"), msg.status, null);
      } else {
        gitKeizu.refresh(false);
        if (typeof msg.branchStatus === "string") {
          showErrorDialog(t("error.deleteBranch"), msg.branchStatus, null);
        }
      }
      break;
    case "renameBranch":
      refreshOrError(gitKeizu, msg.status, t("error.renameBranch"));
      break;
    case "refresh":
      gitKeizu.refresh(false);
      break;
    case "resetToCommit":
      refreshOrError(gitKeizu, msg.status, t("error.resetToCommit"));
      break;
    case "resetUncommitted":
      refreshOrError(gitKeizu, msg.status, t("error.resetUncommitted"));
      break;
    case "revertCommit":
      refreshOrError(gitKeizu, msg.status, t("error.revertCommit"));
      break;
    case "selectRepo":
      gitKeizu.selectRepo(msg.repo);
      break;
    case "setShowRecentActions":
      gitKeizu.setShowRecentActions(msg.showRecentActions);
      break;
    case "viewDiff":
      if (msg.success === false) showErrorDialog(t("error.viewDiff"), null, null);
      break;
  }
}

function refreshOrError(gitKeizu: GitKeizuViewAPI, status: string | null, errorMessage: string) {
  refreshGraphOrDisplayError(status, errorMessage, () => gitKeizu.refresh(false), showErrorDialog);
}
