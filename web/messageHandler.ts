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
}

export function handleMessage(msg: ResponseMessage, gitKeizu: GitKeizuViewAPI): void {
  switch (msg.command) {
    case "addTag":
      refreshOrError(gitKeizu, msg.status, "Unable to Add Tag");
      break;
    case "applyStash":
      refreshOrError(gitKeizu, msg.status, "Unable to Apply Stash");
      break;
    case "branchFromStash":
      refreshOrError(gitKeizu, msg.status, "Unable to Create Branch from Stash");
      break;
    case "checkoutBranch":
      refreshOrError(gitKeizu, msg.status, "Unable to Checkout Branch");
      break;
    case "checkoutCommit":
      refreshOrError(gitKeizu, msg.status, "Unable to Checkout Commit");
      break;
    case "cherrypickCommit":
      refreshOrError(gitKeizu, msg.status, "Unable to Cherry Pick Commit");
      break;
    case "cleanUntrackedFiles":
      refreshOrError(gitKeizu, msg.status, "Unable to Clean Untracked Files");
      break;
    case "commitDetails":
      if (msg.commitDetails === null) {
        gitKeizu.hideCommitDetails();
        showErrorDialog("Unable to load commit details", null, null);
      } else {
        gitKeizu.showCommitDetails(
          msg.commitDetails,
          generateGitFileTree(msg.commitDetails.fileChanges)
        );
      }
      break;
    case "compareCommits":
      if (msg.fileChanges === null) {
        showErrorDialog("Unable to load commit comparison", null, null);
      } else {
        gitKeizu.showCompareResult(msg.fileChanges, msg.fromHash, msg.toHash);
      }
      break;
    case "copyToClipboard":
      if (msg.success === false)
        showErrorDialog(`Unable to Copy ${msg.type} to Clipboard`, null, null);
      break;
    case "createBranch":
      refreshOrError(gitKeizu, msg.status, "Unable to Create Branch");
      break;
    case "createWorktree":
      refreshOrError(gitKeizu, msg.status, "Unable to Create Worktree");
      break;
    case "deleteBranch":
      refreshOrError(gitKeizu, msg.status, "Unable to Delete Branch");
      break;
    case "deleteRemoteBranch":
      refreshOrError(gitKeizu, msg.status, "Unable to Delete Remote Branch");
      break;
    case "deleteTag":
      refreshOrError(gitKeizu, msg.status, "Unable to Delete Tag");
      break;
    case "dropStash":
      refreshOrError(gitKeizu, msg.status, "Unable to Drop Stash");
      break;
    case "fetch":
      refreshOrError(gitKeizu, msg.status, "Unable to Fetch");
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
      refreshOrError(gitKeizu, msg.status, "Unable to Merge Branch");
      break;
    case "openFile":
      if (msg.status !== null) {
        showErrorDialog("Unable to open file", msg.status, null);
      }
      break;
    case "openTerminal":
      break;
    case "mergeCommit":
      refreshOrError(gitKeizu, msg.status, "Unable to Merge Commit");
      break;
    case "rebaseBranch":
      refreshOrError(gitKeizu, msg.status, "Unable to Rebase Branch");
      break;
    case "popStash":
      refreshOrError(gitKeizu, msg.status, "Unable to Pop Stash");
      break;
    case "pull":
      refreshOrError(gitKeizu, msg.status, "Unable to Pull");
      break;
    case "push":
      refreshOrError(gitKeizu, msg.status, "Unable to Push");
      break;
    case "pushStash":
      refreshOrError(gitKeizu, msg.status, "Unable to Stash Changes");
      break;
    case "pushTag":
      hideDialog();
      refreshOrError(gitKeizu, msg.status, "Unable to Push Tag");
      break;
    case "removeWorktree":
      if (msg.status !== null) {
        showErrorDialog("Unable to Remove Worktree", msg.status, null);
      } else {
        gitKeizu.refresh(false);
        if (typeof msg.branchStatus === "string") {
          showErrorDialog("Unable to Delete Branch", msg.branchStatus, null);
        }
      }
      break;
    case "renameBranch":
      refreshOrError(gitKeizu, msg.status, "Unable to Rename Branch");
      break;
    case "refresh":
      gitKeizu.refresh(false);
      break;
    case "resetToCommit":
      refreshOrError(gitKeizu, msg.status, "Unable to Reset to Commit");
      break;
    case "resetUncommitted":
      refreshOrError(gitKeizu, msg.status, "Unable to Reset Uncommitted Changes");
      break;
    case "revertCommit":
      refreshOrError(gitKeizu, msg.status, "Unable to Revert Commit");
      break;
    case "selectRepo":
      gitKeizu.selectRepo(msg.repo);
      break;
    case "viewDiff":
      if (msg.success === false) showErrorDialog("Unable to view diff of file", null, null);
      break;
  }
}

function refreshOrError(gitKeizu: GitKeizuViewAPI, status: string | null, errorMessage: string) {
  refreshGraphOrDisplayError(status, errorMessage, () => gitKeizu.refresh(false), showErrorDialog);
}
