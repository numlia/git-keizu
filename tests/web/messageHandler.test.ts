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
    refresh: vi.fn()
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

    // Then: gitGraph.refresh(true) is called for a hard refresh
    expect(gitGraph.refresh).toHaveBeenCalledTimes(1);
    expect(gitGraph.refresh).toHaveBeenCalledWith(true);
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

    // Then: gitGraph.refresh(true) is called for a hard refresh
    expect(gitGraph.refresh).toHaveBeenCalledTimes(1);
    expect(gitGraph.refresh).toHaveBeenCalledWith(true);
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
