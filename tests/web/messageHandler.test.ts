// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../web/dialogs", () => ({
  showErrorDialog: vi.fn()
}));

vi.mock("../../web/fileTree", () => ({
  generateGitFileTree: vi.fn()
}));

vi.mock("../../web/refMenu", () => ({
  showPushRemoteDialog: vi.fn()
}));

import type { GitCommitDetails, ResponseMessage } from "../../src/types";
import { showErrorDialog } from "../../web/dialogs";
import { generateGitFileTree } from "../../web/fileTree";
import { type GitKeizuViewAPI, handleMessage } from "../../web/messageHandler";
import { showPushRemoteDialog } from "../../web/refMenu";

function createMockGitKeizuView(): GitKeizuViewAPI {
  return {
    hideCommitDetails: vi.fn(),
    showCommitDetails: vi.fn(),
    showCompareResult: vi.fn(),
    loadAvatar: vi.fn(),
    loadBranches: vi.fn(),
    loadCommits: vi.fn(),
    loadRepos: vi.fn(),
    refresh: vi.fn(),
    selectRepo: vi.fn(),
    setShowRecentActions: vi.fn()
  };
}

// S13: pull レスポンス処理の維持
// @see docs/testing/perspectives/web/messageHandler-test/03-git-operation-responses-01.md
describe("handleMessage pull response", () => {
  let gitKeizu: GitKeizuViewAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    gitKeizu = createMockGitKeizuView();
  });

  it("calls refresh on pull success (TC-044)", () => {
    // Case: TC-044
    // Given: A pull success response (status = null)
    const msg: ResponseMessage = { command: "pull", status: null };

    // When: handleMessage is called with the success response
    handleMessage(msg, gitKeizu);

    // Then: gitKeizu.refresh("soft") is called
    expect(gitKeizu.refresh).toHaveBeenCalledTimes(1);
    expect(gitKeizu.refresh).toHaveBeenCalledWith("soft");
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("shows error dialog on pull failure (TC-045)", () => {
    // Case: TC-045
    // Given: A pull error response (status = error message string)
    const msg: ResponseMessage = { command: "pull", status: "CONFLICT" };

    // When: handleMessage is called with the error response
    handleMessage(msg, gitKeizu);

    // Then: showErrorDialog is called with "Unable to Pull" and the git error message
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith("Unable to Pull", "CONFLICT", null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });
});

// S16: deleteBranch の not fully merged 分類と説明表示
// @see docs/testing/perspectives/web/messageHandler-test/01-basic-responses-01.md
describe("handleMessage deleteBranch not fully merged explanation", () => {
  const DELETE_BRANCH_ERROR = "Unable to Delete Branch";
  const EXPLANATION_MESSAGES = {
    "error.deleteBranchNotFullyMerged.summary":
      "Git could not confirm that this branch is fully merged into its upstream branch or the current branch.",
    "error.deleteBranchNotFullyMerged.reason":
      "Squash merges and rebases can incorporate the changes without connecting the original commits. The same error also appears when unmerged commits remain.",
    "error.deleteBranchNotFullyMerged.guidance":
      "Before using Force Delete, confirm that the branch has no commits or changes you still need. If it is safe to remove, enable Force Delete in the delete dialog and try again.",
    "dialog.originalGitOutput": "Original Git output"
  };
  const EXPECTED_EXPLANATION = {
    summary: EXPLANATION_MESSAGES["error.deleteBranchNotFullyMerged.summary"],
    reason: EXPLANATION_MESSAGES["error.deleteBranchNotFullyMerged.reason"],
    guidance: EXPLANATION_MESSAGES["error.deleteBranchNotFullyMerged.guidance"],
    rawOutputLabel: EXPLANATION_MESSAGES["dialog.originalGitOutput"]
  };
  let gitKeizu: GitKeizuViewAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    gitKeizu = createMockGitKeizuView();
    globalThis.webviewMessages = { ...globalThis.webviewMessages, ...EXPLANATION_MESSAGES };
  });

  it("shows the explanation dialog for the canonical not-fully-merged failure (TC-064)", () => {
    // Case: TC-064
    // Given: a deleteBranch failure whose status is the canonical two-line not-fully-merged output
    const status =
      "error: the branch 'feature' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D feature'";
    const msg: ResponseMessage = { command: "deleteBranch", status };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: showErrorDialog runs once with the full status and the four explanation values,
    // and the graph is not refreshed
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(
      DELETE_BRANCH_ERROR,
      status,
      null,
      EXPECTED_EXPLANATION
    );
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it("classifies a single-character branch name as known (TC-065)", () => {
    // Case: TC-065
    // Given: a status whose branch name is the minimum single character (+1 length boundary)
    const status = "error: the branch 'x' is not fully merged.";
    const msg: ResponseMessage = { command: "deleteBranch", status };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: the explanation dialog is shown once and the graph is not refreshed
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(
      DELETE_BRANCH_ERROR,
      status,
      null,
      EXPECTED_EXPLANATION
    );
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it("classifies a branch name containing a single quote as known (TC-066)", () => {
    // Case: TC-066
    // Given: a status whose branch name contains a ' character
    const status = "error: the branch 'feature/it's' is not fully merged.";
    const msg: ResponseMessage = { command: "deleteBranch", status };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: the line-start/line-end contract still matches and the explanation dialog is shown once
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(
      DELETE_BRANCH_ERROR,
      status,
      null,
      EXPECTED_EXPLANATION
    );
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it("classifies a multi-line status with surrounding lines as known (TC-067)", () => {
    // Case: TC-067
    // Given: a status whose matching line sits between other lines
    const status =
      "warning: before\nerror: the branch 'feature' is not fully merged.\nIf you are sure...";
    const msg: ResponseMessage = { command: "deleteBranch", status };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: the dialog receives the full three-line status unchanged with the explanation
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(
      DELETE_BRANCH_ERROR,
      status,
      null,
      EXPECTED_EXPLANATION
    );
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it("falls back to the plain dialog for an empty branch name (TC-068)", () => {
    // Case: TC-068
    // Given: a status whose branch name part is empty (-1 length boundary)
    const status = "error: the branch '' is not fully merged.";
    const msg: ResponseMessage = { command: "deleteBranch", status };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: showErrorDialog runs once with exactly three arguments (no explanation)
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(DELETE_BRANCH_ERROR, status, null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it("falls back to the plain dialog when the suffix says fully merged (TC-069)", () => {
    // Case: TC-069
    // Given: a status whose line ends with "' is fully merged." instead of the known suffix
    const status = "error: the branch 'feature' is fully merged.";
    const msg: ResponseMessage = { command: "deleteBranch", status };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: showErrorDialog runs once with exactly three arguments (no explanation)
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(DELETE_BRANCH_ERROR, status, null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it("falls back to the plain dialog for an uppercase status (TC-070)", () => {
    // Case: TC-070
    // Given: an uppercase variant of the known status (classification is case-sensitive)
    const status = "ERROR: THE BRANCH 'feature' IS NOT FULLY MERGED.";
    const msg: ResponseMessage = { command: "deleteBranch", status };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: showErrorDialog runs once with exactly three arguments (no explanation)
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(DELETE_BRANCH_ERROR, status, null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it("falls back to the plain dialog for a localized status (TC-071)", () => {
    // Case: TC-071
    // Given: a localized Git output that does not contain the fixed fragments
    const status = "エラー: ブランチは完全にマージされていません";
    const msg: ResponseMessage = { command: "deleteBranch", status };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: showErrorDialog runs once with exactly three arguments (no explanation)
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(DELETE_BRANCH_ERROR, status, null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it("falls back to the plain dialog for a status with leading whitespace (TC-072)", () => {
    // Case: TC-072
    // Given: the known line preceded by a space (no trimming is applied)
    const status = " error: the branch 'feature' is not fully merged.";
    const msg: ResponseMessage = { command: "deleteBranch", status };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: showErrorDialog runs once with exactly three arguments (no explanation)
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(DELETE_BRANCH_ERROR, status, null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it("falls back to the plain dialog for an ANSI-wrapped status (TC-073)", () => {
    // Case: TC-073
    // Given: the known line wrapped in ANSI escape sequences (no ANSI stripping is applied)
    const status = "\u001b[31merror: the branch 'feature' is not fully merged.\u001b[0m";
    const msg: ResponseMessage = { command: "deleteBranch", status };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: showErrorDialog runs once with exactly three arguments (no explanation)
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(DELETE_BRANCH_ERROR, status, null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it("keeps the plain dialog for an unrelated fatal error (TC-074)", () => {
    // Case: TC-074
    // Given: an unknown deleteBranch failure
    const status = "fatal: branch not found";
    const msg: ResponseMessage = { command: "deleteBranch", status };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: the existing three-argument dialog is kept and the graph is not refreshed
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(DELETE_BRANCH_ERROR, status, null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it('calls refresh("soft") once on deleteBranch success (TC-075)', () => {
    // Case: TC-075
    // Given: a deleteBranch success response (status = null)
    const msg: ResponseMessage = { command: "deleteBranch", status: null };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: the soft refresh runs once and no dialog is shown
    expect(gitKeizu.refresh).toHaveBeenCalledTimes(1);
    expect(gitKeizu.refresh).toHaveBeenCalledWith("soft");
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("does not explain the same status for the pull operation (TC-076)", () => {
    // Case: TC-076
    // Given: a pull failure carrying the same not-fully-merged string
    const status = "error: the branch 'feature' is not fully merged.";
    const msg: ResponseMessage = { command: "pull", status };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: the pull dialog runs once with exactly three arguments (no explanation)
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith("Unable to Pull", status, null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it("does not explain the removeWorktree branchStatus with the same string (TC-077)", () => {
    // Case: TC-077
    // Given: a removeWorktree success whose branchStatus carries the same not-fully-merged string
    const branchStatus = "error: the branch 'feature' is not fully merged.";
    const msg: ResponseMessage = { command: "removeWorktree", status: null, branchStatus };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: the graph refreshes once and the branch dialog keeps exactly three arguments
    expect(gitKeizu.refresh).toHaveBeenCalledTimes(1);
    expect(gitKeizu.refresh).toHaveBeenCalledWith("soft");
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(DELETE_BRANCH_ERROR, branchStatus, null);
  });

  it("falls back to the plain dialog for an empty status string (TC-078)", () => {
    // Case: TC-078
    // Given: a deleteBranch failure with an empty status string (empty boundary)
    const msg: ResponseMessage = { command: "deleteBranch", status: "" };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: showErrorDialog runs once with exactly three arguments (no explanation)
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(DELETE_BRANCH_ERROR, "", null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });
});

// S15: checkout の 5 kind 表示と Push phase の維持
// @see docs/testing/perspectives/web/messageHandler-test/03-git-operation-responses-01.md
describe("handleMessage checkoutBranch response", () => {
  let gitKeizu: GitKeizuViewAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    gitKeizu = createMockGitKeizuView();
  });

  it("shows the dedicated reason for an existing branch (TC-054)", () => {
    // Case: TC-054
    // Given: the host refused the checkout because the branch already exists
    const msg: ResponseMessage = { command: "checkoutBranch", kind: "branchExists" };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: the localized reason is shown and the graph is not refreshed
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(
      "Unable to Checkout Branch",
      "A branch with this name already exists.",
      null
    );
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it("shows the dedicated reason for an invalid ref (TC-055)", () => {
    // Case: TC-055
    // Given: the host refused the checkout because the ref name is invalid
    const msg: ResponseMessage = { command: "checkoutBranch", kind: "invalidRef" };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: the localized reason is shown and the graph is not refreshed
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(
      "Unable to Checkout Branch",
      "The branch name is not a valid Git reference name.",
      null
    );
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it("shows the dedicated reason for a missing remote (TC-056)", () => {
    // Case: TC-056
    // Given: the host reports that the selected remote no longer exists
    globalThis.webviewMessages = {
      ...globalThis.webviewMessages,
      "error.checkoutRemoteNotFound": "The selected remote is not registered in this repository."
    };
    const msg: ResponseMessage = { command: "checkoutBranch", kind: "remoteNotFound" };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: the localized checkout reason is shown without refreshing the graph
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(
      "Unable to Checkout Branch",
      "The selected remote is not registered in this repository.",
      null
    );
    expect(gitKeizu.refresh).toHaveBeenCalledTimes(0);
  });

  it("refreshes the graph on a successful checkout (TC-057)", () => {
    // Case: TC-057
    // Given: the checkout completed without a git error
    const msg: ResponseMessage = { command: "checkoutBranch", kind: "completed", status: null };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: forceRender redraws the active marker without hard-refresh UI side effects
    expect(gitKeizu.refresh).toHaveBeenCalledTimes(1);
    expect(gitKeizu.refresh).toHaveBeenCalledWith("forceRender");
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("shows the git message when the checkout failed (TC-058)", () => {
    // Case: TC-058
    // Given: the checkout completed with a git error
    const msg: ResponseMessage = {
      command: "checkoutBranch",
      kind: "completed",
      status: "fatal: pathspec"
    };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: the git message is shown and the graph is not refreshed
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(
      "Unable to Checkout Branch",
      "fatal: pathspec",
      null
    );
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it("refreshes before showing a pull error after checkout succeeds (TC-059)", () => {
    // Case: TC-059
    // Given: checkout succeeded but pulling the selected remote branch failed
    const msg: ResponseMessage = {
      command: "checkoutBranch",
      kind: "pullFailed",
      status: "CONFLICT"
    };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: force rendering and the pull error dialog each run once in that order
    expect(gitKeizu.refresh).toHaveBeenCalledTimes(1);
    expect(gitKeizu.refresh).toHaveBeenCalledWith("forceRender");
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith("Unable to Pull", "CONFLICT", null);
    const refreshOrder = (gitKeizu.refresh as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    const dialogOrder = (showErrorDialog as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    expect(refreshOrder).toBeLessThan(dialogOrder);
    expect(showErrorDialog).not.toHaveBeenCalledWith("Unable to Checkout Branch", "CONFLICT", null);
  });
});

describe("handleMessage push response", () => {
  let gitKeizu: GitKeizuViewAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    gitKeizu = createMockGitKeizuView();
  });

  it("delegates the selectRemote phase with the repository of the response (TC-060)", () => {
    // Case: TC-060
    // Given: the host asks the user to choose a remote for a named repository
    const msg: ResponseMessage = {
      command: "push",
      repo: "/response/repo",
      operationId: "op-1",
      phase: "selectRemote",
      remotes: ["origin", "upstream"],
      defaultRemote: "origin"
    };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: the response values including its repo are forwarded unmodified
    expect(showPushRemoteDialog).toHaveBeenCalledTimes(1);
    expect(showPushRemoteDialog).toHaveBeenCalledWith(
      "/response/repo",
      "op-1",
      ["origin", "upstream"],
      "origin"
    );
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("shows the dedicated reason when no remote is registered (TC-061)", () => {
    // Case: TC-061
    // Given: the host reports that the repository has no remotes
    const msg: ResponseMessage = {
      command: "push",
      repo: "/r",
      operationId: "op-1",
      phase: "noRemotes"
    };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: the localized reason is shown and no dialog is opened
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(
      "Unable to Push",
      "This repository has no remotes configured.",
      null
    );
    expect(showPushRemoteDialog).not.toHaveBeenCalled();
  });

  it("refreshes the graph on a successful push (TC-062)", () => {
    // Case: TC-062
    // Given: the push completed without a git error
    const msg: ResponseMessage = {
      command: "push",
      repo: "/r",
      operationId: "op-1",
      phase: "completed",
      status: null
    };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: a soft refresh happens and no dialog is shown
    expect(gitKeizu.refresh).toHaveBeenCalledTimes(1);
    expect(gitKeizu.refresh).toHaveBeenCalledWith("soft");
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("shows the git message when the push failed (TC-063)", () => {
    // Case: TC-063
    // Given: the push completed with a git error
    const msg: ResponseMessage = {
      command: "push",
      repo: "/r",
      operationId: "op-1",
      phase: "completed",
      status: "fatal: rejected"
    };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: the existing Push error title is kept and the graph is not refreshed
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith("Unable to Push", "fatal: rejected", null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });
});

describe("handleMessage selectRepo response (S3)", () => {
  let gitKeizu: GitKeizuViewAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    gitKeizu = createMockGitKeizuView();
  });

  it("routes selectRepo message to gitKeizu.selectRepo with repo path (TC-007)", () => {
    // Given: A selectRepo response with a repo path
    const msg: ResponseMessage = { command: "selectRepo", repo: "/path/to/repo" };

    // When: handleMessage is called with the selectRepo response
    handleMessage(msg, gitKeizu);

    // Then: gitKeizu.selectRepo is called with the repo path
    expect(gitKeizu.selectRepo).toHaveBeenCalledTimes(1);
    expect(gitKeizu.selectRepo).toHaveBeenCalledWith("/path/to/repo");
  });

  it("completes without error on selectRepo message (TC-008)", () => {
    // Given: A selectRepo response message
    const msg: ResponseMessage = { command: "selectRepo", repo: "/some/other/repo" };

    // When/Then: handleMessage processes without throwing
    expect(() => handleMessage(msg, gitKeizu)).not.toThrow();
    expect(gitKeizu.selectRepo).toHaveBeenCalledTimes(1);
  });
});

describe("handleMessage deleteRemoteBranch/rebaseBranch response (S4)", () => {
  let gitKeizu: GitKeizuViewAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    gitKeizu = createMockGitKeizuView();
  });

  it("calls refresh on deleteRemoteBranch success (TC-009)", () => {
    // Given: A deleteRemoteBranch success response (status = null)
    const msg: ResponseMessage = { command: "deleteRemoteBranch", status: null };

    // When: handleMessage is called with the success response
    handleMessage(msg, gitKeizu);

    // Then: the soft refresh mode is requested
    expect(gitKeizu.refresh).toHaveBeenCalledTimes(1);
    expect(gitKeizu.refresh).toHaveBeenCalledWith("soft");
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("shows error dialog on deleteRemoteBranch failure (TC-010)", () => {
    // Given: A deleteRemoteBranch error response (status = error message string)
    const errorMsg = "error: unable to delete 'feature/x': remote ref does not exist";
    const msg: ResponseMessage = { command: "deleteRemoteBranch", status: errorMsg };

    // When: handleMessage is called with the error response
    handleMessage(msg, gitKeizu);

    // Then: showErrorDialog is called with "Unable to Delete Remote Branch" and the git error message
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith("Unable to Delete Remote Branch", errorMsg, null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it("calls refresh on rebaseBranch success (TC-011)", () => {
    // Given: A rebaseBranch success response (status = null)
    const msg: ResponseMessage = { command: "rebaseBranch", status: null };

    // When: handleMessage is called with the success response
    handleMessage(msg, gitKeizu);

    // Then: the soft refresh mode is requested
    expect(gitKeizu.refresh).toHaveBeenCalledTimes(1);
    expect(gitKeizu.refresh).toHaveBeenCalledWith("soft");
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("shows error dialog on rebaseBranch failure (TC-012)", () => {
    // Given: A rebaseBranch error response (status = error message string)
    const errorMsg = "error: could not apply abc1234... Fix typo";
    const msg: ResponseMessage = { command: "rebaseBranch", status: errorMsg };

    // When: handleMessage is called with the error response
    handleMessage(msg, gitKeizu);

    // Then: showErrorDialog is called with "Unable to Rebase Branch" and the git error message
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith("Unable to Rebase Branch", errorMsg, null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });
});

describe("handleMessage loadCommits authors pass-through (S5)", () => {
  let gitKeizu: GitKeizuViewAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    gitKeizu = createMockGitKeizuView();
  });

  it("passes authors array to loadCommits (TC-013)", () => {
    // Given: A loadCommits response with authors field
    const msg: ResponseMessage = {
      command: "loadCommits",
      commits: [],
      head: null,
      moreCommitsAvailable: false,
      hard: false,
      authors: ["Alice", "Bob"]
    };

    // When: handleMessage is called with the loadCommits response
    handleMessage(msg, gitKeizu);

    // Then: gitKeizu.loadCommits is called with authors forwarded
    expect(gitKeizu.loadCommits).toHaveBeenCalledTimes(1);
    expect(gitKeizu.loadCommits).toHaveBeenCalledWith(
      [],
      null,
      false,
      false,
      ["Alice", "Bob"],
      undefined
    );
  });

  it("passes undefined when authors field is absent (TC-014)", () => {
    // Given: A loadCommits response without authors field
    const msg: ResponseMessage = {
      command: "loadCommits",
      commits: [],
      head: null,
      moreCommitsAvailable: false,
      hard: false
    };

    // When: handleMessage is called with the loadCommits response
    handleMessage(msg, gitKeizu);

    // Then: gitKeizu.loadCommits is called with authors as undefined
    expect(gitKeizu.loadCommits).toHaveBeenCalledTimes(1);
    expect(gitKeizu.loadCommits).toHaveBeenCalledWith([], null, false, false, undefined, undefined);
  });
});

describe("handleMessage createWorktree/removeWorktree/openTerminal response (S6)", () => {
  let gitKeizu: GitKeizuViewAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    gitKeizu = createMockGitKeizuView();
  });

  it("calls refresh on createWorktree success (TC-015)", () => {
    // Given: A createWorktree success response (status = null)
    const msg: ResponseMessage = { command: "createWorktree", status: null };

    // When: handleMessage is called with the success response
    handleMessage(msg, gitKeizu);

    // Then: the soft refresh mode is requested
    expect(gitKeizu.refresh).toHaveBeenCalledTimes(1);
    expect(gitKeizu.refresh).toHaveBeenCalledWith("soft");
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("shows error dialog on createWorktree failure (TC-016)", () => {
    // Given: A createWorktree error response (status = error message string)
    const errorMsg = "fatal: 'feature/x' is already checked out at '/path/to/worktree'";
    const msg: ResponseMessage = { command: "createWorktree", status: errorMsg };

    // When: handleMessage is called with the error response
    handleMessage(msg, gitKeizu);

    // Then: showErrorDialog is called with "Unable to Create Worktree" and the git error message
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith("Unable to Create Worktree", errorMsg, null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it("calls refresh on removeWorktree success (TC-017)", () => {
    // Given: A removeWorktree success response (status = null)
    const msg: ResponseMessage = { command: "removeWorktree", status: null };

    // When: handleMessage is called with the success response
    handleMessage(msg, gitKeizu);

    // Then: the soft refresh mode is requested
    expect(gitKeizu.refresh).toHaveBeenCalledTimes(1);
    expect(gitKeizu.refresh).toHaveBeenCalledWith("soft");
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("shows error dialog on removeWorktree failure (TC-018)", () => {
    // Given: A removeWorktree error response (status = error message string)
    const errorMsg = "fatal: 'feature/y' contains modified or untracked files";
    const msg: ResponseMessage = { command: "removeWorktree", status: errorMsg };

    // When: handleMessage is called with the error response
    handleMessage(msg, gitKeizu);

    // Then: showErrorDialog is called with "Unable to Remove Worktree" and the git error message
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith("Unable to Remove Worktree", errorMsg, null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it("completes as no-op on openTerminal response (TC-019)", () => {
    // Given: An openTerminal response (no status field)
    const msg: ResponseMessage = { command: "openTerminal" };

    // When: handleMessage is called with the openTerminal response
    handleMessage(msg, gitKeizu);

    // Then: No refresh or error dialog — terminal launch is handled by extension host
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
    expect(showErrorDialog).not.toHaveBeenCalled();
  });
});

// --- S7: removeWorktree ブランチ削除結果の表示 ---

describe("handleMessage removeWorktree branch deletion result (S7)", () => {
  let gitKeizu: GitKeizuViewAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    gitKeizu = createMockGitKeizuView();
  });

  it("refreshes graph when status=null and branchStatus=undefined (TC-020)", () => {
    // Given: removeWorktree success, branch deletion not requested
    const msg: ResponseMessage = { command: "removeWorktree", status: null };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: Graph refreshes, no error dialog
    expect(gitKeizu.refresh).toHaveBeenCalledTimes(1);
    expect(gitKeizu.refresh).toHaveBeenCalledWith("soft");
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("refreshes graph when status=null and branchStatus=null (TC-021)", () => {
    // Given: Both worktree and branch deletion succeeded
    const msg: ResponseMessage = {
      command: "removeWorktree",
      status: null,
      branchStatus: null
    };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: Graph refreshes, no error dialog
    expect(gitKeizu.refresh).toHaveBeenCalledTimes(1);
    expect(gitKeizu.refresh).toHaveBeenCalledWith("soft");
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("refreshes graph and shows branch error when status=null and branchStatus=string (TC-022)", () => {
    // Given: Worktree deleted but branch deletion failed
    const branchError = "error: The branch 'feature/x' is not fully merged.";
    const msg: ResponseMessage = {
      command: "removeWorktree",
      status: null,
      branchStatus: branchError
    };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: Graph refreshes AND branch deletion error dialog is shown
    expect(gitKeizu.refresh).toHaveBeenCalledTimes(1);
    expect(gitKeizu.refresh).toHaveBeenCalledWith("soft");
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith("Unable to Delete Branch", branchError, null);
  });

  it("shows worktree error dialog when status=string (TC-023)", () => {
    // Given: Worktree deletion failed
    const wtError = "fatal: 'feature/y' contains modified or untracked files";
    const msg: ResponseMessage = { command: "removeWorktree", status: wtError };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: Error dialog shown, no refresh
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith("Unable to Remove Worktree", wtError, null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });
});

// S8: openFile レスポンスハンドラ
describe("handleMessage openFile response (S8)", () => {
  let gitKeizu: GitKeizuViewAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    gitKeizu = createMockGitKeizuView();
  });

  // TC-024: 成��レスポンス（status null）で何もしない
  it("does nothing on success response with status null (TC-024)", () => {
    // Given: ResponseOpenFile with status=null (success)
    const msg: ResponseMessage = { command: "openFile", status: null };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: showErrorDialog is not called, no gitKeizu methods called
    expect(showErrorDialog).not.toHaveBeenCalled();
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
    expect(gitKeizu.hideCommitDetails).not.toHaveBeenCalled();
  });

  // TC-025: エラーレスポンスでエラーダイアログが表示される
  it("shows error dialog on error response (TC-025)", () => {
    // Given: ResponseOpenFile with status="error message"
    const errorMessage = "The file src/file.ts doesn't currently exist in this repository.";
    const msg: ResponseMessage = { command: "openFile", status: errorMessage };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: showErrorDialog is called with the error details
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith("Unable to open file", errorMessage, null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });
});

// S9: setShowRecentActions レスポンスハンドラ
describe("handleMessage setShowRecentActions response (S9)", () => {
  let gitKeizu: GitKeizuViewAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    gitKeizu = createMockGitKeizuView();
  });

  it("routes showRecentActions=true to gitKeizu.setShowRecentActions (TC-026)", () => {
    // Given: ResponseSetShowRecentActions with true
    const msg: ResponseMessage = {
      command: "setShowRecentActions",
      showRecentActions: true
    };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: setShowRecentActions(true) is called once and no other API runs
    expect(gitKeizu.setShowRecentActions).toHaveBeenCalledTimes(1);
    expect(gitKeizu.setShowRecentActions).toHaveBeenCalledWith(true);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("routes showRecentActions=false to gitKeizu.setShowRecentActions (TC-027)", () => {
    // Given: ResponseSetShowRecentActions with false
    const msg: ResponseMessage = {
      command: "setShowRecentActions",
      showRecentActions: false
    };

    // When: handleMessage is called
    handleMessage(msg, gitKeizu);

    // Then: setShowRecentActions(false) is called once and no other API runs
    expect(gitKeizu.setShowRecentActions).toHaveBeenCalledTimes(1);
    expect(gitKeizu.setShowRecentActions).toHaveBeenCalledWith(false);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
    expect(showErrorDialog).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* S10: commitDetails fileTree generation try/catch (messageHandler)   */
/* ------------------------------------------------------------------ */

function makeCommitDetails(): GitCommitDetails {
  return {
    hash: "abc123",
    parents: [],
    author: "Alice",
    email: "alice@test.com",
    date: 1700000000,
    committer: "Alice",
    committerEmail: "alice@test.com",
    body: "commit body",
    fileChanges: []
  };
}

describe("handleMessage commitDetails try/catch (S10)", () => {
  let gitKeizu: GitKeizuViewAPI;
  const COMMIT_DETAILS_ERROR = "Unable to load commit details";

  beforeEach(() => {
    vi.clearAllMocks();
    gitKeizu = createMockGitKeizuView();
  });

  it("shows commit details when the file tree builds successfully (TC-028)", () => {
    // Case: TC-028
    // Given: a valid commitDetails and generateGitFileTree returning a tree
    const commitDetails = makeCommitDetails();
    const fileTree = { type: "folder", name: "", folderPath: "", contents: {}, open: true };
    vi.mocked(generateGitFileTree).mockReturnValue(
      fileTree as ReturnType<typeof generateGitFileTree>
    );
    const msg: ResponseMessage = { command: "commitDetails", commitDetails };

    // When: handleMessage processes the response
    handleMessage(msg, gitKeizu);

    // Then: showCommitDetails is called once with the details and tree; no error path runs
    expect(gitKeizu.showCommitDetails).toHaveBeenCalledTimes(1);
    expect(gitKeizu.showCommitDetails).toHaveBeenCalledWith(commitDetails, fileTree);
    expect(gitKeizu.hideCommitDetails).not.toHaveBeenCalled();
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("hides details and surfaces the Error message when the tree build throws (TC-029)", () => {
    // Case: TC-029
    // Given: generateGitFileTree throws an Error
    vi.mocked(generateGitFileTree).mockImplementation(() => {
      throw new Error("dup");
    });
    const msg: ResponseMessage = { command: "commitDetails", commitDetails: makeCommitDetails() };

    // When: handleMessage processes the response
    handleMessage(msg, gitKeizu);

    // Then: loading is cleared and the Error message is shown; showCommitDetails is not called
    expect(gitKeizu.hideCommitDetails).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(COMMIT_DETAILS_ERROR, "dup", null);
    expect(gitKeizu.showCommitDetails).not.toHaveBeenCalled();
  });

  it("passes a null message when the tree build throws a non-Error (TC-030)", () => {
    // Case: TC-030
    // Given: generateGitFileTree throws a non-Error value
    vi.mocked(generateGitFileTree).mockImplementation(() => {
      // eslint-disable-next-line no-throw-literal -- intentionally testing the non-Error branch
      throw "x";
    });
    const msg: ResponseMessage = { command: "commitDetails", commitDetails: makeCommitDetails() };

    // When: handleMessage processes the response
    handleMessage(msg, gitKeizu);

    // Then: the error dialog message is null (error is not an Error instance)
    expect(showErrorDialog).toHaveBeenCalledWith(COMMIT_DETAILS_ERROR, null, null);
  });

  it("hides details and shows an error without building a tree when details are null (TC-031)", () => {
    // Case: TC-031
    // Given: commitDetails is null
    const msg: ResponseMessage = { command: "commitDetails", commitDetails: null };

    // When: handleMessage processes the response
    handleMessage(msg, gitKeizu);

    // Then: loading is cleared and an error is shown; the tree builder is never called
    expect(gitKeizu.hideCommitDetails).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(COMMIT_DETAILS_ERROR, null, null);
    expect(generateGitFileTree).not.toHaveBeenCalled();
  });
});

// S11: openWorktreeInNewWindow / revealWorktreeInOS レスポンスのエラー表示
// @see docs/testing/perspectives/web/messageHandler-test.md
describe("worktree open/reveal response error display (S11)", () => {
  const OPEN_WORKTREE_ERROR = "Unable to Open Worktree in New Window";
  const REVEAL_WORKTREE_ERROR = "Unable to Reveal Worktree in File Manager";
  let gitKeizu: GitKeizuViewAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    gitKeizu = createMockGitKeizuView();
  });

  it("does nothing for an openWorktreeInNewWindow success response (TC-032)", () => {
    // Case: TC-032
    // Given: An openWorktreeInNewWindow success response (status = null)
    const msg: ResponseMessage = { command: "openWorktreeInNewWindow", status: null };

    // When: handleMessage processes the response
    handleMessage(msg, gitKeizu);

    // Then: no error dialog is shown and no gitKeizu API is invoked
    expect(showErrorDialog).not.toHaveBeenCalled();
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
    expect(gitKeizu.hideCommitDetails).not.toHaveBeenCalled();
    expect(gitKeizu.selectRepo).not.toHaveBeenCalled();
  });

  it("shows the dedicated open-worktree error dialog once on failure (TC-033)", () => {
    // Case: TC-033
    // Given: An openWorktreeInNewWindow failure response (status = "boom")
    const msg: ResponseMessage = { command: "openWorktreeInNewWindow", status: "boom" };

    // When: handleMessage processes the response
    handleMessage(msg, gitKeizu);

    // Then: showErrorDialog runs once with the operation-specific translation key
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(OPEN_WORKTREE_ERROR, "boom", null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });

  it("does nothing for a revealWorktreeInOS success response (TC-034)", () => {
    // Case: TC-034
    // Given: A revealWorktreeInOS success response (status = null)
    const msg: ResponseMessage = { command: "revealWorktreeInOS", status: null };

    // When: handleMessage processes the response
    handleMessage(msg, gitKeizu);

    // Then: no error dialog is shown and no gitKeizu API is invoked
    expect(showErrorDialog).not.toHaveBeenCalled();
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
    expect(gitKeizu.hideCommitDetails).not.toHaveBeenCalled();
    expect(gitKeizu.selectRepo).not.toHaveBeenCalled();
  });

  it("shows the dedicated reveal-worktree error dialog once on failure (TC-035)", () => {
    // Case: TC-035
    // Given: A revealWorktreeInOS failure response (status = "no")
    const msg: ResponseMessage = { command: "revealWorktreeInOS", status: "no" };

    // When: handleMessage processes the response
    handleMessage(msg, gitKeizu);

    // Then: showErrorDialog runs once with the operation-specific translation key
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith(REVEAL_WORKTREE_ERROR, "no", null);
    expect(gitKeizu.refresh).not.toHaveBeenCalled();
  });
});
