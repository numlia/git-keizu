// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../web/dialogs", () => ({
  showErrorDialog: vi.fn()
}));

vi.mock("../../web/fileTree", () => ({
  generateGitFileTree: vi.fn()
}));

import type { ResponseMessage } from "../../src/types";
import { showErrorDialog } from "../../web/dialogs";
import { type GitGraphViewAPI, handleMessage } from "../../web/messageHandler";

function createMockGitGraphView(): GitGraphViewAPI {
  return {
    hideCommitDetails: vi.fn(),
    showCommitDetails: vi.fn(),
    showCompareResult: vi.fn(),
    loadAvatar: vi.fn(),
    loadBranches: vi.fn(),
    loadCommits: vi.fn(),
    loadRepos: vi.fn(),
    refresh: vi.fn(),
    selectRepo: vi.fn()
  };
}

describe("handleMessage pull response", () => {
  let gitGraph: GitGraphViewAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    gitGraph = createMockGitGraphView();
  });

  it("calls refresh on pull success (TC-001)", () => {
    // Given: A pull success response (status = null)
    const msg: ResponseMessage = { command: "pull", status: null };

    // When: handleMessage is called with the success response
    handleMessage(msg, gitGraph);

    // Then: gitGraph.refresh(false) is called for a soft refresh
    expect(gitGraph.refresh).toHaveBeenCalledTimes(1);
    expect(gitGraph.refresh).toHaveBeenCalledWith(false);
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("shows error dialog on pull failure (TC-003)", () => {
    // Given: A pull error response (status = error message string)
    const errorMsg = "error: Your local changes would be overwritten by merge.";
    const msg: ResponseMessage = { command: "pull", status: errorMsg };

    // When: handleMessage is called with the error response
    handleMessage(msg, gitGraph);

    // Then: showErrorDialog is called with "Unable to Pull" and the git error message
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith("Unable to Pull", errorMsg, null);
    expect(gitGraph.refresh).not.toHaveBeenCalled();
  });
});

describe("refreshOrError soft refresh argument (S2)", () => {
  let gitGraph: GitGraphViewAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    gitGraph = createMockGitGraphView();
  });

  it("calls refresh(false) for soft refresh on deleteBranch success (TC-005)", () => {
    // Given: A deleteBranch success response (status = null) routed through refreshOrError
    const msg: ResponseMessage = { command: "deleteBranch", status: null };

    // When: handleMessage is called with the success response
    handleMessage(msg, gitGraph);

    // Then: gitGraph.refresh(false) is called (hard=false means soft refresh)
    expect(gitGraph.refresh).toHaveBeenCalledTimes(1);
    expect(gitGraph.refresh).toHaveBeenCalledWith(false);
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("shows error dialog and skips refresh on deleteBranch failure (TC-006)", () => {
    // Given: A deleteBranch error response (status = error message string)
    const errorMsg = "error: branch 'feature' not found.";
    const msg: ResponseMessage = { command: "deleteBranch", status: errorMsg };

    // When: handleMessage is called with the error response
    handleMessage(msg, gitGraph);

    // Then: showErrorDialog is called and refresh is NOT called
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith("Unable to Delete Branch", errorMsg, null);
    expect(gitGraph.refresh).not.toHaveBeenCalled();
  });
});

describe("handleMessage push response", () => {
  let gitGraph: GitGraphViewAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    gitGraph = createMockGitGraphView();
  });

  it("calls refresh on push success (TC-002)", () => {
    // Given: A push success response (status = null)
    const msg: ResponseMessage = { command: "push", status: null };

    // When: handleMessage is called with the success response
    handleMessage(msg, gitGraph);

    // Then: gitGraph.refresh(false) is called for a soft refresh
    expect(gitGraph.refresh).toHaveBeenCalledTimes(1);
    expect(gitGraph.refresh).toHaveBeenCalledWith(false);
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("shows error dialog on push failure (TC-004)", () => {
    // Given: A push error response (status = error message string)
    const errorMsg = "error: failed to push some refs to 'origin'";
    const msg: ResponseMessage = { command: "push", status: errorMsg };

    // When: handleMessage is called with the error response
    handleMessage(msg, gitGraph);

    // Then: showErrorDialog is called with "Unable to Push" and the git error message
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith("Unable to Push", errorMsg, null);
    expect(gitGraph.refresh).not.toHaveBeenCalled();
  });
});

describe("handleMessage selectRepo response (S3)", () => {
  let gitGraph: GitGraphViewAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    gitGraph = createMockGitGraphView();
  });

  it("routes selectRepo message to gitGraph.selectRepo with repo path (TC-007)", () => {
    // Given: A selectRepo response with a repo path
    const msg: ResponseMessage = { command: "selectRepo", repo: "/path/to/repo" };

    // When: handleMessage is called with the selectRepo response
    handleMessage(msg, gitGraph);

    // Then: gitGraph.selectRepo is called with the repo path
    expect(gitGraph.selectRepo).toHaveBeenCalledTimes(1);
    expect(gitGraph.selectRepo).toHaveBeenCalledWith("/path/to/repo");
  });

  it("completes without error on selectRepo message (TC-008)", () => {
    // Given: A selectRepo response message
    const msg: ResponseMessage = { command: "selectRepo", repo: "/some/other/repo" };

    // When/Then: handleMessage processes without throwing
    expect(() => handleMessage(msg, gitGraph)).not.toThrow();
    expect(gitGraph.selectRepo).toHaveBeenCalledTimes(1);
  });
});

describe("handleMessage deleteRemoteBranch/rebaseBranch response (S4)", () => {
  let gitGraph: GitGraphViewAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    gitGraph = createMockGitGraphView();
  });

  it("calls refresh on deleteRemoteBranch success (TC-009)", () => {
    // Given: A deleteRemoteBranch success response (status = null)
    const msg: ResponseMessage = { command: "deleteRemoteBranch", status: null };

    // When: handleMessage is called with the success response
    handleMessage(msg, gitGraph);

    // Then: gitGraph.refresh(false) is called for a soft refresh
    expect(gitGraph.refresh).toHaveBeenCalledTimes(1);
    expect(gitGraph.refresh).toHaveBeenCalledWith(false);
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("shows error dialog on deleteRemoteBranch failure (TC-010)", () => {
    // Given: A deleteRemoteBranch error response (status = error message string)
    const errorMsg = "error: unable to delete 'feature/x': remote ref does not exist";
    const msg: ResponseMessage = { command: "deleteRemoteBranch", status: errorMsg };

    // When: handleMessage is called with the error response
    handleMessage(msg, gitGraph);

    // Then: showErrorDialog is called with "Unable to Delete Remote Branch" and the git error message
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith("Unable to Delete Remote Branch", errorMsg, null);
    expect(gitGraph.refresh).not.toHaveBeenCalled();
  });

  it("calls refresh on rebaseBranch success (TC-011)", () => {
    // Given: A rebaseBranch success response (status = null)
    const msg: ResponseMessage = { command: "rebaseBranch", status: null };

    // When: handleMessage is called with the success response
    handleMessage(msg, gitGraph);

    // Then: gitGraph.refresh(false) is called for a soft refresh
    expect(gitGraph.refresh).toHaveBeenCalledTimes(1);
    expect(gitGraph.refresh).toHaveBeenCalledWith(false);
    expect(showErrorDialog).not.toHaveBeenCalled();
  });

  it("shows error dialog on rebaseBranch failure (TC-012)", () => {
    // Given: A rebaseBranch error response (status = error message string)
    const errorMsg = "error: could not apply abc1234... Fix typo";
    const msg: ResponseMessage = { command: "rebaseBranch", status: errorMsg };

    // When: handleMessage is called with the error response
    handleMessage(msg, gitGraph);

    // Then: showErrorDialog is called with "Unable to Rebase Branch" and the git error message
    expect(showErrorDialog).toHaveBeenCalledTimes(1);
    expect(showErrorDialog).toHaveBeenCalledWith("Unable to Rebase Branch", errorMsg, null);
    expect(gitGraph.refresh).not.toHaveBeenCalled();
  });
});
