import { describe, expect, it } from "vitest";

import {
  BranchCleanupAheadBehind,
  BranchCleanupAncestry,
  BranchCleanupLastCommit,
  BranchCleanupResult,
  BranchCleanupRow,
  BranchCleanupTreeDifference,
  BranchCleanupUpstream,
  BranchCleanupWorktree,
  CheckoutBranchResult,
  DetachedWorktreeInfo,
  PushTarget,
  RemoteBranchTarget,
  RequestCheckoutBranch,
  RequestLoadBranchCleanup,
  RequestMessage,
  RequestPush,
  ResponseCheckoutBranch,
  ResponseLoadBranchCleanup,
  ResponseLoadCommits,
  ResponseMessage,
  ResponseOpenWorktreeInNewWindow,
  ResponsePush,
  ResponseRevealWorktreeInOS,
  UNCOMMITTED_CHANGES_HASH,
  VALID_UNCOMMITTED_RESET_MODES,
  WorktreeCollection,
  WorktreeInfo
} from "../../src/types";

describe("UNCOMMITTED_CHANGES_HASH", () => {
  it("equals '*' for backward compatibility (TC-001)", () => {
    // Given: UNCOMMITTED_CHANGES_HASH is imported
    // When: its value is referenced
    // Then: it matches "*"
    expect(UNCOMMITTED_CHANGES_HASH).toBe("*");
  });
});

describe("VALID_UNCOMMITTED_RESET_MODES", () => {
  it('includes "mixed" (TC-002)', () => {
    // Given: VALID_UNCOMMITTED_RESET_MODES is imported
    // When: has() is called with "mixed"
    // Then: returns true
    expect(VALID_UNCOMMITTED_RESET_MODES.has("mixed")).toBe(true);
  });

  it('includes "hard" (TC-003)', () => {
    // Given: VALID_UNCOMMITTED_RESET_MODES is imported
    // When: has() is called with "hard"
    // Then: returns true
    expect(VALID_UNCOMMITTED_RESET_MODES.has("hard")).toBe(true);
  });

  it("contains exactly 2 modes (TC-004)", () => {
    // Given: VALID_UNCOMMITTED_RESET_MODES is imported
    // When: its size is checked
    // Then: it equals 2
    expect(VALID_UNCOMMITTED_RESET_MODES.size).toBe(2);
  });

  it('rejects "soft" as an invalid mode (TC-005)', () => {
    // Given: VALID_UNCOMMITTED_RESET_MODES is imported
    // When: has() is called with "soft"
    // Then: returns false (soft is not valid for uncommitted reset)
    expect(VALID_UNCOMMITTED_RESET_MODES.has("soft")).toBe(false);
  });

  it("rejects empty string (TC-006)", () => {
    // Given: VALID_UNCOMMITTED_RESET_MODES is imported
    // When: has() is called with ""
    // Then: returns false
    expect(VALID_UNCOMMITTED_RESET_MODES.has("")).toBe(false);
  });

  it('rejects uppercase "MIXED" (TC-007)', () => {
    // Given: VALID_UNCOMMITTED_RESET_MODES is imported
    // When: has() is called with "MIXED"
    // Then: returns false (case-sensitive matching)
    expect(VALID_UNCOMMITTED_RESET_MODES.has("MIXED")).toBe(false);
  });
});

// S2: worktree Open/Reveal 応答の status 必須化
// @see docs/testing/perspectives/src/types-test.md
describe("worktree open/reveal response status requirement", () => {
  it("requires status on ResponseOpenWorktreeInNewWindow and accepts null and string (TC-008)", () => {
    // Case: TC-008
    // Given: object literals for the openWorktreeInNewWindow response type
    // @ts-expect-error status is mandatory: omitting it must be a type error
    const missingStatus: ResponseOpenWorktreeInNewWindow = {
      command: "openWorktreeInNewWindow"
    };
    const successResponse: ResponseOpenWorktreeInNewWindow = {
      command: "openWorktreeInNewWindow",
      status: null
    };
    const failureResponse: ResponseOpenWorktreeInNewWindow = {
      command: "openWorktreeInNewWindow",
      status: "msg"
    };

    // When: the assignable literals are inspected at runtime
    // Then: status null and status "msg" are both valid values of the required field
    expect(missingStatus.command).toBe("openWorktreeInNewWindow");
    expect(successResponse.status).toBeNull();
    expect(failureResponse.status).toBe("msg");
  });

  it("requires status on ResponseRevealWorktreeInOS and accepts null and string (TC-009)", () => {
    // Case: TC-009
    // Given: object literals for the revealWorktreeInOS response type
    // @ts-expect-error status is mandatory: omitting it must be a type error
    const missingStatus: ResponseRevealWorktreeInOS = {
      command: "revealWorktreeInOS"
    };
    const successResponse: ResponseRevealWorktreeInOS = {
      command: "revealWorktreeInOS",
      status: null
    };
    const failureResponse: ResponseRevealWorktreeInOS = {
      command: "revealWorktreeInOS",
      status: "msg"
    };

    // When: the assignable literals are inspected at runtime
    // Then: status null and status "msg" are both valid values of the required field
    expect(missingStatus.command).toBe("revealWorktreeInOS");
    expect(successResponse.status).toBeNull();
    expect(failureResponse.status).toBe("msg");
  });
});

// S6: remote checkout target・結果と二段階 Push の型契約
// @see docs/testing/perspectives/src/types-test.md
describe("RemoteBranchTarget and RequestCheckoutBranch contract", () => {
  it("keeps remote and branch names as separate strings (TC-044)", () => {
    // Case: TC-044
    // Given: a valid remote target
    const target: RemoteBranchTarget = { remoteName: "origin", branchName: "main" };

    // When: the target is inspected
    // Then: both names remain independently available
    expect(target.remoteName).toBe("origin");
    expect(target.branchName).toBe("main");
  });

  it("requires remoteName on the remote target (TC-045)", () => {
    // Case: TC-045
    // Given: a target missing remoteName
    // @ts-expect-error remoteName is mandatory
    const missingRemoteName: RemoteBranchTarget = { branchName: "main" };

    // When: the invalid literal is inspected at runtime
    // Then: TypeScript reports the omission and the field is absent
    expect(missingRemoteName.remoteName).toBeUndefined();
  });

  it("requires branchName on the remote target (TC-046)", () => {
    // Case: TC-046
    // Given: a target missing branchName
    // @ts-expect-error branchName is mandatory
    const missingBranchName: RemoteBranchTarget = { remoteName: "origin" };

    // When: the invalid literal is inspected at runtime
    // Then: TypeScript reports the omission and the field is absent
    expect(missingBranchName.branchName).toBeUndefined();
  });

  it("accepts a local checkout request with remoteBranch null (TC-047)", () => {
    // Case: TC-047
    // Given: a local checkout request
    const localRequest: RequestCheckoutBranch = {
      command: "checkoutBranch",
      repo: "/r",
      branchName: "main",
      remoteBranch: null
    };

    // When: the request is narrowed by remoteBranch
    // Then: the local path preserves null exactly
    expect(localRequest.remoteBranch).toBeNull();
  });

  it("accepts a structured remote checkout request (TC-048)", () => {
    // Case: TC-048
    // Given: a remote checkout request
    const remoteRequest: RequestCheckoutBranch = {
      command: "checkoutBranch",
      repo: "/r",
      branchName: "main",
      remoteBranch: { remoteName: "origin", branchName: "main" }
    };

    // When: the request is narrowed by remoteBranch
    // Then: both target fields remain available
    if (remoteRequest.remoteBranch !== null) {
      expect(remoteRequest.remoteBranch.remoteName).toBe("origin");
      expect(remoteRequest.remoteBranch.branchName).toBe("main");
    }
  });

  it("requires remoteBranch on every checkout request (TC-049)", () => {
    // Case: TC-049
    // Given: a checkout request missing remoteBranch
    // @ts-expect-error remoteBranch is mandatory
    const missingRemoteBranch: RequestCheckoutBranch = {
      command: "checkoutBranch",
      repo: "/r",
      branchName: "main"
    };

    // When: the invalid literal is inspected at runtime
    // Then: TypeScript reports the omission and the field is absent
    expect(missingRemoteBranch.remoteBranch).toBeUndefined();
  });
});

describe("CheckoutBranchResult discriminated union", () => {
  it("accepts the branchExists variant without a status field (TC-050)", () => {
    // Case: TC-050
    // Given: the branchExists variant of the checkout result
    const result: CheckoutBranchResult = { kind: "branchExists" };

    // When: the value is narrowed by kind
    // Then: the variant carries no status field
    expect(result.kind).toBe("branchExists");
    if (result.kind === "branchExists") {
      // @ts-expect-error the branchExists variant has no status field
      expect(result.status).toBeUndefined();
    }
  });

  it("accepts the invalidRef variant (TC-051)", () => {
    // Case: TC-051
    // Given: the invalidRef variant of the checkout result
    const result: CheckoutBranchResult = { kind: "invalidRef" };

    // When: the assignable literal is inspected at runtime
    // Then: the discriminant is preserved
    expect(result.kind).toBe("invalidRef");
  });

  it("accepts remoteNotFound without a status field (TC-052)", () => {
    // Case: TC-052
    // Given: the remoteNotFound variant of the checkout result
    const result: CheckoutBranchResult = { kind: "remoteNotFound" };

    // When: the value is narrowed by kind
    // Then: the variant carries no status field
    expect(result.kind).toBe("remoteNotFound");
    if (result.kind === "remoteNotFound") {
      // @ts-expect-error the remoteNotFound variant has no status field
      expect(result.status).toBeUndefined();
    }
  });

  it("accepts pullFailed with a string status (TC-053)", () => {
    // Case: TC-053
    // Given: a valid pullFailed result
    const result: CheckoutBranchResult = { kind: "pullFailed", status: "CONFLICT" };

    // When: the result is narrowed by kind
    // Then: status remains a string
    if (result.kind === "pullFailed") expect(result.status).toBe("CONFLICT");
  });

  it("requires status on pullFailed (TC-054)", () => {
    // Case: TC-054
    // Given: pullFailed without status
    // @ts-expect-error status is mandatory on pullFailed
    const missingStatus: CheckoutBranchResult = { kind: "pullFailed" };

    // When: the invalid literal is inspected at runtime
    // Then: TypeScript reports the omission and status is absent
    expect(missingStatus.status).toBeUndefined();
  });

  it("rejects null status on pullFailed (TC-055)", () => {
    // Case: TC-055
    // Given: pullFailed with a null status
    // @ts-expect-error pullFailed status cannot be null
    const nullStatus: CheckoutBranchResult = { kind: "pullFailed", status: null };

    // When: the invalid literal is inspected at runtime
    // Then: TypeScript reports the invalid null while runtime preserves it
    expect(nullStatus.status).toBeNull();
  });

  it("accepts the completed variant and exposes status after narrowing (TC-056)", () => {
    // Case: TC-056
    // Given: the completed variant with a null status
    const result: CheckoutBranchResult = { kind: "completed", status: null };

    // When: the value is narrowed by kind
    // Then: status is reachable and keeps its null value
    expect(result.kind).toBe("completed");
    if (result.kind === "completed") {
      expect(result.status).toBeNull();
    }
  });

  it("requires status on the completed variant (TC-057)", () => {
    // Case: TC-057
    // Given: a completed literal without the mandatory status field
    // @ts-expect-error status is mandatory on the completed variant
    const missingStatus: CheckoutBranchResult = { kind: "completed" };

    // When: the literal is inspected at runtime
    // Then: only the discriminant is present
    expect(missingStatus.kind).toBe("completed");
  });

  it("rejects a kind outside the union (TC-058)", () => {
    // Case: TC-058
    // Given: a literal using a kind that is not part of the union
    // @ts-expect-error "unknown" is not a member of CheckoutBranchResult
    const unknownKind: CheckoutBranchResult = { kind: "unknown" };

    // When: the literal is inspected at runtime
    // Then: the unsupported discriminant is what was written
    expect(unknownKind.kind).toBe("unknown");
  });

  it("narrows exhaustively across all five result kinds (TC-059)", () => {
    // Case: TC-059
    // Given: a switch that handles every CheckoutBranchResult kind
    function describeResult(result: CheckoutBranchResult): string {
      switch (result.kind) {
        case "branchExists":
        case "invalidRef":
        case "remoteNotFound":
          return result.kind;
        case "pullFailed":
          return result.status;
        case "completed":
          return result.status ?? "completed";
        default: {
          const exhaustive: never = result;
          return exhaustive;
        }
      }
    }

    // When: every variant is passed through the switch
    // Then: each branch returns its discriminant-specific value
    expect(describeResult({ kind: "branchExists" })).toBe("branchExists");
    expect(describeResult({ kind: "invalidRef" })).toBe("invalidRef");
    expect(describeResult({ kind: "remoteNotFound" })).toBe("remoteNotFound");
    expect(describeResult({ kind: "pullFailed", status: "CONFLICT" })).toBe("CONFLICT");
    expect(describeResult({ kind: "completed", status: null })).toBe("completed");
  });
});

describe("ResponseCheckoutBranch discriminated union", () => {
  it("accepts a branchExists response (TC-060)", () => {
    // Case: TC-060
    // Given: a branchExists response
    const response: ResponseCheckoutBranch = { command: "checkoutBranch", kind: "branchExists" };

    // When: its discriminant is read
    // Then: it compiles without a status field
    expect(response.kind).toBe("branchExists");
  });

  it("accepts an invalidRef response (TC-061)", () => {
    // Case: TC-061
    // Given: an invalidRef response
    const response: ResponseCheckoutBranch = { command: "checkoutBranch", kind: "invalidRef" };

    // When: its discriminant is read
    // Then: it compiles without a status field
    expect(response.kind).toBe("invalidRef");
  });

  it("accepts a remoteNotFound response (TC-062)", () => {
    // Case: TC-062
    // Given: a remoteNotFound response
    const response: ResponseCheckoutBranch = {
      command: "checkoutBranch",
      kind: "remoteNotFound"
    };

    // When: its discriminant is read
    // Then: it compiles without a status field
    expect(response.kind).toBe("remoteNotFound");
  });

  it("accepts a pullFailed response with string status (TC-063)", () => {
    // Case: TC-063
    // Given: a pullFailed response
    const response: ResponseCheckoutBranch = {
      command: "checkoutBranch",
      kind: "pullFailed",
      status: "CONFLICT"
    };

    // When: the response is narrowed by kind
    // Then: status remains a string
    if (response.kind === "pullFailed") expect(response.status).toBe("CONFLICT");
  });

  it("accepts a completed response with null status (TC-064)", () => {
    // Case: TC-064
    // Given: a completed response
    const response: ResponseCheckoutBranch = {
      command: "checkoutBranch",
      kind: "completed",
      status: null
    };

    // When: the response is narrowed by kind
    // Then: completed preserves null exactly
    if (response.kind === "completed") expect(response.status).toBeNull();
  });

  it("requires status on pullFailed and completed responses (TC-065)", () => {
    // Case: TC-065
    // Given: status-bearing variants with status omitted
    // @ts-expect-error pullFailed status is mandatory
    const pullFailed: ResponseCheckoutBranch = { command: "checkoutBranch", kind: "pullFailed" };
    // @ts-expect-error completed status is mandatory
    const completed: ResponseCheckoutBranch = { command: "checkoutBranch", kind: "completed" };

    // When: the invalid literals are inspected at runtime
    // Then: the omitted fields remain absent while TypeScript reports both errors
    expect(pullFailed.status).toBeUndefined();
    expect(completed.status).toBeUndefined();
  });

  it("narrows exhaustively across all five response kinds (TC-066)", () => {
    // Case: TC-066
    // Given: a switch that handles every ResponseCheckoutBranch kind
    function describeResponse(response: ResponseCheckoutBranch): string {
      switch (response.kind) {
        case "branchExists":
        case "invalidRef":
        case "remoteNotFound":
          return response.kind;
        case "pullFailed":
          return response.status;
        case "completed":
          return response.status ?? "completed";
        default: {
          const exhaustive: never = response;
          return exhaustive;
        }
      }
    }

    // When: every variant is passed through the switch
    // Then: all five kinds reach a defined branch
    expect(describeResponse({ command: "checkoutBranch", kind: "branchExists" })).toBe(
      "branchExists"
    );
    expect(describeResponse({ command: "checkoutBranch", kind: "invalidRef" })).toBe("invalidRef");
    expect(describeResponse({ command: "checkoutBranch", kind: "remoteNotFound" })).toBe(
      "remoteNotFound"
    );
    expect(
      describeResponse({ command: "checkoutBranch", kind: "pullFailed", status: "CONFLICT" })
    ).toBe("CONFLICT");
    expect(describeResponse({ command: "checkoutBranch", kind: "completed", status: null })).toBe(
      "completed"
    );
  });
});

describe("RequestPush two-phase contract", () => {
  it("accepts the initial request with a null selectedRemote (TC-067)", () => {
    // Case: TC-067
    // Given: the first request of a push operation
    const request: RequestPush = {
      command: "push",
      repo: "/r",
      operationId: "op-1",
      selectedRemote: null
    };

    // When: the assignable literal is inspected at runtime
    // Then: no remote has been selected yet
    expect(request.operationId).toBe("op-1");
    expect(request.selectedRemote).toBeNull();
  });

  it("accepts the follow-up request carrying the selected remote (TC-068)", () => {
    // Case: TC-068
    // Given: the second request of the same push operation
    const request: RequestPush = {
      command: "push",
      repo: "/r",
      operationId: "op-1",
      selectedRemote: "origin"
    };

    // When: the assignable literal is inspected at runtime
    // Then: the selected remote is carried alongside the same operation id
    expect(request.operationId).toBe("op-1");
    expect(request.selectedRemote).toBe("origin");
  });

  it("requires operationId on the request (TC-069)", () => {
    // Case: TC-069
    // Given: a request literal without the correlation id
    // @ts-expect-error operationId is mandatory on RequestPush
    const missingOperationId: RequestPush = {
      command: "push",
      repo: "/r",
      selectedRemote: null
    };

    // When: the literal is inspected at runtime
    // Then: the correlation id is absent
    expect(missingOperationId.command).toBe("push");
  });

  it("requires selectedRemote on the request (TC-070)", () => {
    // Case: TC-070
    // Given: a request literal without the selection field
    // @ts-expect-error selectedRemote is mandatory and must not be optional
    const missingSelectedRemote: RequestPush = {
      command: "push",
      repo: "/r",
      operationId: "op-1"
    };

    // When: the literal is inspected at runtime
    // Then: the selection field is absent
    expect(missingSelectedRemote.command).toBe("push");
  });
});

describe("ResponsePush phase union", () => {
  it("accepts the selectRemote variant and exposes its fields after narrowing (TC-071)", () => {
    // Case: TC-071
    // Given: the selectRemote phase response
    const response: ResponsePush = {
      command: "push",
      repo: "/r",
      operationId: "op-1",
      phase: "selectRemote",
      remotes: ["origin"],
      defaultRemote: "origin"
    };

    // When: the value is narrowed by phase
    // Then: repo, remotes and defaultRemote are reachable
    expect(response.phase).toBe("selectRemote");
    if (response.phase === "selectRemote") {
      expect(response.repo).toBe("/r");
      expect(response.remotes).toEqual(["origin"]);
      expect(response.defaultRemote).toBe("origin");
    }
  });

  it("accepts the noRemotes variant without phase-specific fields (TC-072)", () => {
    // Case: TC-072
    // Given: the noRemotes phase response
    const response: ResponsePush = {
      command: "push",
      repo: "/r",
      operationId: "op-1",
      phase: "noRemotes"
    };

    // When: the value is narrowed by phase
    // Then: the selectRemote fields are not part of this variant
    expect(response.phase).toBe("noRemotes");
    if (response.phase === "noRemotes") {
      // @ts-expect-error the noRemotes variant has no remotes field
      expect(response.remotes).toBeUndefined();
    }
  });

  it("accepts the completed variant and exposes status after narrowing (TC-073)", () => {
    // Case: TC-073
    // Given: the completed phase response
    const response: ResponsePush = {
      command: "push",
      repo: "/r",
      operationId: "op-1",
      phase: "completed",
      status: null
    };

    // When: the value is narrowed by phase
    // Then: status is reachable and keeps its null value
    expect(response.phase).toBe("completed");
    if (response.phase === "completed") {
      expect(response.status).toBeNull();
    }
  });

  it("requires status on the completed variant (TC-074)", () => {
    // Case: TC-074
    // Given: a completed response literal without status
    // @ts-expect-error status is mandatory on the completed variant
    const missingStatus: ResponsePush = {
      command: "push",
      repo: "/r",
      operationId: "op-1",
      phase: "completed"
    };

    // When: the literal is inspected at runtime
    // Then: the phase discriminant is present without a status
    expect(missingStatus.phase).toBe("completed");
  });

  it("requires defaultRemote on the selectRemote variant (TC-075)", () => {
    // Case: TC-075
    // Given: a selectRemote response literal without defaultRemote
    // @ts-expect-error defaultRemote is mandatory on the selectRemote variant
    const missingDefaultRemote: ResponsePush = {
      command: "push",
      repo: "/r",
      operationId: "op-1",
      phase: "selectRemote",
      remotes: ["origin"]
    };

    // When: the literal is inspected at runtime
    // Then: the phase discriminant is present without a default
    expect(missingDefaultRemote.phase).toBe("selectRemote");
  });

  it("requires operationId on every response variant (TC-076)", () => {
    // Case: TC-076
    // Given: one literal per phase, each missing the correlation id
    // @ts-expect-error operationId is mandatory on the selectRemote variant
    const selectRemote: ResponsePush = {
      command: "push",
      repo: "/r",
      phase: "selectRemote",
      remotes: ["origin"],
      defaultRemote: "origin"
    };
    // @ts-expect-error operationId is mandatory on the noRemotes variant
    const noRemotes: ResponsePush = { command: "push", repo: "/r", phase: "noRemotes" };
    // @ts-expect-error operationId is mandatory on the completed variant
    const completed: ResponsePush = {
      command: "push",
      repo: "/r",
      phase: "completed",
      status: null
    };

    // When: the literals are inspected at runtime
    // Then: all three phases are represented without a correlation id
    expect(selectRemote.phase).toBe("selectRemote");
    expect(noRemotes.phase).toBe("noRemotes");
    expect(completed.phase).toBe("completed");
  });

  it("requires repo on every response variant (TC-077)", () => {
    // Case: TC-077
    // Given: one literal per phase, each missing the repository path
    // @ts-expect-error repo is mandatory on the selectRemote variant
    const selectRemote: ResponsePush = {
      command: "push",
      operationId: "op-1",
      phase: "selectRemote",
      remotes: ["origin"],
      defaultRemote: "origin"
    };
    // @ts-expect-error repo is mandatory on the noRemotes variant
    const noRemotes: ResponsePush = { command: "push", operationId: "op-1", phase: "noRemotes" };
    // @ts-expect-error repo is mandatory on the completed variant
    const completed: ResponsePush = {
      command: "push",
      operationId: "op-1",
      phase: "completed",
      status: null
    };

    // When: the literals are inspected at runtime
    // Then: all three phases are represented without a repository path
    expect(selectRemote.phase).toBe("selectRemote");
    expect(noRemotes.phase).toBe("noRemotes");
    expect(completed.phase).toBe("completed");
  });

  it("narrows exhaustively on phase (TC-078)", () => {
    // Case: TC-078
    // Given: a switch that handles all three phases and asserts the rest is never
    function describePhase(response: ResponsePush): string {
      switch (response.phase) {
        case "selectRemote":
          return response.defaultRemote;
        case "noRemotes":
          return "none";
        case "completed":
          return response.status ?? "ok";
        default: {
          const exhaustive: never = response;
          return exhaustive;
        }
      }
    }

    // When: each variant is passed through the switch
    // Then: every phase reaches its own branch
    expect(
      describePhase({
        command: "push",
        repo: "/r",
        operationId: "op-1",
        phase: "selectRemote",
        remotes: ["origin"],
        defaultRemote: "origin"
      })
    ).toBe("origin");
    expect(
      describePhase({ command: "push", repo: "/r", operationId: "op-1", phase: "noRemotes" })
    ).toBe("none");
    expect(
      describePhase({
        command: "push",
        repo: "/r",
        operationId: "op-1",
        phase: "completed",
        status: null
      })
    ).toBe("ok");
  });
});

// S5: PushTarget の local / upstream branch 分離
// @see docs/testing/perspectives/src/types-test.md
describe("PushTarget branch contract", () => {
  it("requires distinct local and upstream branch names (TC-043)", () => {
    // Case: TC-043
    // Given: a valid target whose local and upstream branch names differ
    const target: PushTarget = {
      remoteName: "origin",
      localBranchName: "feature/local",
      upstreamBranchName: "main"
    };
    // @ts-expect-error localBranchName is mandatory
    const missingLocal: PushTarget = { remoteName: "origin", upstreamBranchName: "main" };
    // @ts-expect-error upstreamBranchName is mandatory
    const missingUpstream: PushTarget = {
      remoteName: "origin",
      localBranchName: "feature/local"
    };

    // When: the target is inspected
    // Then: both sides of the push refspec remain independently available
    expect(target.localBranchName).toBe("feature/local");
    expect(target.upstreamBranchName).toBe("main");
    expect(missingLocal.localBranchName).toBeUndefined();
    expect(missingUpstream.upstreamBranchName).toBeUndefined();
  });
});

// S7: detached worktree と WorktreeCollection の型契約
// @see docs/testing/perspectives/src/types-test.md
describe("DetachedWorktreeInfo contract", () => {
  it("accepts a detached entry carrying path, isMain and head (TC-079)", () => {
    // Case: TC-079
    // Given: a detached worktree entry literal
    const entry: DetachedWorktreeInfo = { path: "/tmp/wt8", isMain: false, head: "abc1234" };

    // When: the entry is inspected
    // Then: head is available as a string alongside the inherited fields
    expect(entry.head).toBe("abc1234");
    expect(entry.path).toBe("/tmp/wt8");
    expect(entry.isMain).toBe(false);
  });

  it("requires head on a detached entry (TC-080)", () => {
    // Case: TC-080
    // Given: a detached entry literal without head
    // @ts-expect-error head is mandatory: omitting it must be a type error
    const missingHead: DetachedWorktreeInfo = { path: "/tmp/wt8", isMain: false };

    // When: the literal is inspected at runtime
    // Then: head is absent, confirming it cannot be made optional
    expect(missingHead.head).toBeUndefined();
  });

  it("requires the inherited path field on a detached entry (TC-081)", () => {
    // Case: TC-081
    // Given: a detached entry literal without path
    // @ts-expect-error path is inherited from WorktreeInfo and mandatory
    const missingPath: DetachedWorktreeInfo = { isMain: false, head: "abc1234" };

    // When: the literal is inspected at runtime
    // Then: path is absent, confirming the extends relationship is enforced
    expect(missingPath.path).toBeUndefined();
  });

  it("requires the inherited isMain field on a detached entry (TC-082)", () => {
    // Case: TC-082
    // Given: a detached entry literal without isMain
    // @ts-expect-error isMain is inherited from WorktreeInfo and mandatory
    const missingIsMain: DetachedWorktreeInfo = { path: "/tmp/wt8", head: "abc1234" };

    // When: the literal is inspected at runtime
    // Then: isMain is absent, so main and linked stay distinguishable by type
    expect(missingIsMain.isMain).toBeUndefined();
  });

  it("assigns a detached entry to the WorktreeInfo base type (TC-083)", () => {
    // Case: TC-083
    // Given: a detached entry assigned to its base type
    const detached: DetachedWorktreeInfo = { path: "/tmp/wt8", isMain: false, head: "abc1234" };
    const base: WorktreeInfo = detached;

    // When: the base-typed value is inspected
    // Then: the assignment compiles and the base fields are readable
    expect(base.path).toBe("/tmp/wt8");
    expect(base.isMain).toBe(false);
  });

  it("rejects a base worktree entry as a detached collection element (TC-084)", () => {
    // Case: TC-084
    // Given: a base entry literal assigned to a detached collection element
    // @ts-expect-error a value without head is not a DetachedWorktreeInfo
    const element: WorktreeCollection["detached"][number] = { path: "/tmp/wt8", isMain: false };

    // When: the literal is inspected at runtime
    // Then: head is absent, so head-less values cannot be mixed into detached
    expect(element.head).toBeUndefined();
  });
});

// S7: detached worktree と WorktreeCollection の型契約
// @see docs/testing/perspectives/src/types-test.md
describe("WorktreeCollection contract", () => {
  it("accepts an empty collection (TC-085)", () => {
    // Case: TC-085
    // Given: an empty collection literal matching the Git failure fallback
    const collection: WorktreeCollection = { branches: {}, detached: [] };

    // When: both sides of the collection are inspected
    // Then: branches is a map and detached is an array
    expect(collection.branches).toEqual({});
    expect(Array.isArray(collection.detached)).toBe(true);
  });

  it("requires the branches field (TC-086)", () => {
    // Case: TC-086
    // Given: a collection literal without branches
    // @ts-expect-error branches is mandatory: omitting it must be a type error
    const missingBranches: WorktreeCollection = { detached: [] };

    // When: the literal is inspected at runtime
    // Then: branches is absent, so a one-sided collection is rejected
    expect(missingBranches.branches).toBeUndefined();
  });

  it("requires the detached field (TC-087)", () => {
    // Case: TC-087
    // Given: a collection literal without detached
    // @ts-expect-error detached is mandatory: omitting it must be a type error
    const missingDetached: WorktreeCollection = { branches: {} };

    // When: the literal is inspected at runtime
    // Then: detached is absent, so a one-sided collection is rejected
    expect(missingDetached.detached).toBeUndefined();
  });

  it("keeps the existing branch entry shape without head (TC-088)", () => {
    // Case: TC-088
    // Given: a branch map literal assigned to the branches side of the collection
    const branches: WorktreeCollection["branches"] = {
      "feature/x": { path: "/wt/x", isMain: false }
    };

    // When: the branch entry is inspected
    // Then: the assignment compiles without requiring head
    expect(branches["feature/x"]).toEqual({ path: "/wt/x", isMain: false });
  });
});

// S7: detached worktree と WorktreeCollection の型契約
// @see docs/testing/perspectives/src/types-test.md
describe("ResponseLoadCommits worktrees field contract", () => {
  const BASE_RESPONSE: Omit<ResponseLoadCommits, "worktrees"> = {
    command: "loadCommits",
    commits: [],
    head: null,
    moreCommitsAvailable: false,
    hard: true
  };

  it("allows the worktrees field to be omitted (TC-089)", () => {
    // Case: TC-089
    // Given: a response literal without the worktrees field
    const response: ResponseLoadCommits = { ...BASE_RESPONSE };

    // When: the response is inspected
    // Then: the assignment compiles and worktrees stays undefined
    expect(response.worktrees).toBeUndefined();
  });

  it("carries a worktree collection in the response (TC-090)", () => {
    // Case: TC-090
    // Given: a response literal carrying both sides of the collection
    const response: ResponseLoadCommits = {
      ...BASE_RESPONSE,
      worktrees: {
        branches: { main: { path: "/r", isMain: true } },
        detached: [{ path: "/tmp/wt8", isMain: false, head: "abc1234" }]
      }
    };

    // When: the collection is read back from the response
    // Then: branches and detached are both reachable with their values intact
    expect(response.worktrees).toEqual({
      branches: { main: { path: "/r", isMain: true } },
      detached: [{ path: "/tmp/wt8", isMain: false, head: "abc1234" }]
    });
  });

  it("rejects the legacy flat worktree map in the response (TC-091)", () => {
    // Case: TC-091
    // Given: a response literal using the pre-collection flat map shape
    const response: ResponseLoadCommits = {
      ...BASE_RESPONSE,
      // @ts-expect-error the flat WorktreeMap shape is no longer assignable
      worktrees: { main: { path: "/r", isMain: true } }
    };

    // When: the collection side of the field is inspected at runtime
    // Then: branches is absent, confirming the flat shape is not a collection
    expect(response.worktrees!.branches).toBeUndefined();
  });
});

// S8: branch cleanup 診断の fact union と message 型契約
// @see docs/testing/perspectives/src/types-test.md
describe("branch cleanup fact unions", () => {
  it("accepts the 4 ancestry literals and rejects a verdict word (TC-092)", () => {
    // Case: TC-092
    // Given: the four ancestry literals and a verdict-style word
    const ancestor: BranchCleanupAncestry = "ancestor";
    const notAncestor: BranchCleanupAncestry = "notAncestor";
    const unknown: BranchCleanupAncestry = "unknown";
    const notSelected: BranchCleanupAncestry = "notSelected";
    // @ts-expect-error a one-word safety verdict is not part of the union
    const verdict: BranchCleanupAncestry = "safe";

    // When/Then: the four union members hold their literal values
    expect(ancestor).toBe("ancestor");
    expect(notAncestor).toBe("notAncestor");
    expect(unknown).toBe("unknown");
    expect(notSelected).toBe("notSelected");
    expect(verdict).toBe("safe");
  });

  it("accepts the 4 tree difference literals and rejects an outside value (TC-093)", () => {
    // Case: TC-093
    // Given: the four tree difference literals and an outside value
    const same: BranchCleanupTreeDifference = "same";
    const different: BranchCleanupTreeDifference = "different";
    const unknown: BranchCleanupTreeDifference = "unknown";
    const notSelected: BranchCleanupTreeDifference = "notSelected";
    // @ts-expect-error "differ" is not part of the union
    const outside: BranchCleanupTreeDifference = "differ";

    // When/Then: the four union members hold their literal values
    expect(same).toBe("same");
    expect(different).toBe("different");
    expect(unknown).toBe("unknown");
    expect(notSelected).toBe("notSelected");
    expect(outside).toBe("differ");
  });

  it("requires both numbers on the known aheadBehind variant (TC-094)", () => {
    // Case: TC-094
    // Given: a complete known literal and one missing ahead
    const known: BranchCleanupAheadBehind = { kind: "known", ahead: 0, behind: 0 };
    // @ts-expect-error ahead is mandatory on the known variant
    const missingAhead: BranchCleanupAheadBehind = { kind: "known", behind: 0 };

    // When/Then: the complete literal keeps both numbers
    expect(known).toEqual({ kind: "known", ahead: 0, behind: 0 });
    expect(missingAhead.kind).toBe("known");
  });

  it("keeps unknown and notSelected aheadBehind as separate number-free variants (TC-095)", () => {
    // Case: TC-095
    // Given: the unknown and notSelected variants
    const unknown: BranchCleanupAheadBehind = { kind: "unknown" };
    const notSelected: BranchCleanupAheadBehind = { kind: "notSelected" };

    // When: each value is narrowed by kind
    // Then: neither failure variant exposes the ahead number
    expect(unknown.kind).toBe("unknown");
    if (unknown.kind === "unknown") {
      // @ts-expect-error ahead only exists on the known variant
      expect(unknown.ahead).toBeUndefined();
    }
    expect(notSelected.kind).toBe("notSelected");
    if (notSelected.kind === "notSelected") {
      // @ts-expect-error ahead only exists on the known variant
      expect(notSelected.ahead).toBeUndefined();
    }
  });

  it("requires name on the present and gone upstream variants (TC-096)", () => {
    // Case: TC-096
    // Given: name-less present / gone literals and complete counterparts
    // @ts-expect-error present requires a name
    const namelessPresent: BranchCleanupUpstream = { kind: "present" };
    // @ts-expect-error gone requires a name
    const namelessGone: BranchCleanupUpstream = { kind: "gone" };
    const present: BranchCleanupUpstream = { kind: "present", name: "origin/x" };
    const gone: BranchCleanupUpstream = { kind: "gone", name: "origin/x" };

    // When/Then: the complete literals compile and keep their names
    expect(namelessPresent.kind).toBe("present");
    expect(namelessGone.kind).toBe("gone");
    expect(present).toEqual({ kind: "present", name: "origin/x" });
    expect(gone).toEqual({ kind: "gone", name: "origin/x" });
  });

  it("keeps unset and unknown upstream as separate name-free variants (TC-097)", () => {
    // Case: TC-097
    // Given: the unset and unknown variants
    const unset: BranchCleanupUpstream = { kind: "unset" };
    const unknown: BranchCleanupUpstream = { kind: "unknown" };

    // When: each value is narrowed by kind
    // Then: neither variant exposes a name
    expect(unset.kind).toBe("unset");
    if (unset.kind === "unset") {
      // @ts-expect-error name only exists on present / gone
      expect(unset.name).toBeUndefined();
    }
    expect(unknown.kind).toBe("unknown");
    if (unknown.kind === "unknown") {
      // @ts-expect-error name only exists on present / gone
      expect(unknown.name).toBeUndefined();
    }
  });

  it("requires path and isMain on the used worktree variant (TC-098)", () => {
    // Case: TC-098
    // Given: a complete used literal and literals missing path / isMain
    const used: BranchCleanupWorktree = { kind: "used", path: "/wt", isMain: false };
    // @ts-expect-error path is mandatory on the used variant
    const missingPath: BranchCleanupWorktree = { kind: "used", isMain: false };
    // @ts-expect-error isMain is mandatory on the used variant
    const missingIsMain: BranchCleanupWorktree = { kind: "used", path: "/wt" };

    // When/Then: the complete literal keeps both fields
    expect(used).toEqual({ kind: "used", path: "/wt", isMain: false });
    expect(missingPath.kind).toBe("used");
    expect(missingIsMain.kind).toBe("used");
  });

  it("keeps unused and unknown worktree as separate path-free variants (TC-099)", () => {
    // Case: TC-099
    // Given: the unused and unknown variants
    const unused: BranchCleanupWorktree = { kind: "unused" };
    const unknown: BranchCleanupWorktree = { kind: "unknown" };

    // When: each value is narrowed by kind
    // Then: neither variant exposes a path
    expect(unused.kind).toBe("unused");
    if (unused.kind === "unused") {
      // @ts-expect-error path only exists on the used variant
      expect(unused.path).toBeUndefined();
    }
    expect(unknown.kind).toBe("unknown");
    if (unknown.kind === "unknown") {
      // @ts-expect-error path only exists on the used variant
      expect(unknown.path).toBeUndefined();
    }
  });

  it("requires unixSeconds on the known lastCommit variant and accepts 0 (TC-100)", () => {
    // Case: TC-100
    // Given: a known literal with the epoch 0 and one missing unixSeconds
    const known: BranchCleanupLastCommit = { kind: "known", unixSeconds: 0 };
    // @ts-expect-error unixSeconds is mandatory on the known variant
    const missingSeconds: BranchCleanupLastCommit = { kind: "known" };

    // When/Then: the complete literal keeps the epoch value
    expect(known).toEqual({ kind: "known", unixSeconds: 0 });
    expect(missingSeconds.kind).toBe("known");
  });

  it("accepts a complete row literal (TC-101)", () => {
    // Case: TC-101
    // Given: a row literal carrying every fact field
    const row: BranchCleanupRow = {
      branchName: "feature/x",
      isCurrent: false,
      ancestry: "ancestor",
      aheadBehind: { kind: "known", ahead: 1, behind: 2 },
      treeDifference: "different",
      upstream: { kind: "present", name: "origin/feature/x" },
      worktree: { kind: "unused" },
      lastCommit: { kind: "known", unixSeconds: 1700000100 },
      remotes: ["origin"]
    };

    // When/Then: each fact field is reachable with its union value intact
    expect(row.ancestry).toBe("ancestor");
    expect(row.aheadBehind).toEqual({ kind: "known", ahead: 1, behind: 2 });
    expect(row.upstream).toEqual({ kind: "present", name: "origin/feature/x" });
    expect(row.worktree).toEqual({ kind: "unused" });
    expect(row.lastCommit).toEqual({ kind: "known", unixSeconds: 1700000100 });
  });

  it("rejects a row literal missing the ancestry fact (TC-102)", () => {
    // Case: TC-102
    // Given: a row literal without ancestry
    // @ts-expect-error every fact field of the row is mandatory
    const row: BranchCleanupRow = {
      branchName: "feature/x",
      isCurrent: false,
      aheadBehind: { kind: "unknown" },
      treeDifference: "unknown",
      upstream: { kind: "unset" },
      worktree: { kind: "unused" },
      lastCommit: { kind: "unknown" },
      remotes: null
    };

    // When/Then: the incomplete literal is only observable through its present fields
    expect(row.branchName).toBe("feature/x");
  });

  it("allows null remotes but not an omitted remotes field (TC-103)", () => {
    // Case: TC-103
    // Given: a row with the failure value null and one omitting the field
    const failedRemotes: BranchCleanupRow = {
      branchName: "feature/x",
      isCurrent: false,
      ancestry: "unknown",
      aheadBehind: { kind: "unknown" },
      treeDifference: "unknown",
      upstream: { kind: "unset" },
      worktree: { kind: "unknown" },
      lastCommit: { kind: "unknown" },
      remotes: null
    };
    // @ts-expect-error remotes may be null but never omitted
    const omittedRemotes: BranchCleanupRow = {
      branchName: "feature/x",
      isCurrent: false,
      ancestry: "unknown",
      aheadBehind: { kind: "unknown" },
      treeDifference: "unknown",
      upstream: { kind: "unset" },
      worktree: { kind: "unknown" },
      lastCommit: { kind: "unknown" }
    };

    // When/Then: the failure null is distinguishable from omission
    expect(failedRemotes.remotes).toBeNull();
    expect(omittedRemotes.remotes).toBeUndefined();
  });

  it("allows null isCurrent for a detached snapshot (TC-104)", () => {
    // Case: TC-104
    // Given: a row whose isCurrent is null
    const row: BranchCleanupRow = {
      branchName: "feature/x",
      isCurrent: null,
      ancestry: "unknown",
      aheadBehind: { kind: "unknown" },
      treeDifference: "unknown",
      upstream: { kind: "unset" },
      worktree: { kind: "unknown" },
      lastCommit: { kind: "unknown" },
      remotes: null
    };

    // When/Then: the null value stays distinguishable from false
    expect(row.isCurrent).toBeNull();
  });

  it("accepts the ok result variant and narrows to its fields (TC-105)", () => {
    // Case: TC-105
    // Given: an ok result without a comparison target
    const result: BranchCleanupResult = { kind: "ok", compareBranch: null, rows: [] };

    // When: the result is narrowed by kind
    // Then: rows and compareBranch are reachable
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.rows).toEqual([]);
      expect(result.compareBranch).toBeNull();
    }
  });

  it("keeps rows out of the error result variant (TC-106)", () => {
    // Case: TC-106
    // Given: an error result
    const result: BranchCleanupResult = { kind: "error", status: "fatal" };

    // When: the result is narrowed by kind
    // Then: the error variant has no rows field
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      // @ts-expect-error rows only exists on the ok variant
      expect(result.rows).toBeUndefined();
      expect(result.status).toBe("fatal");
    }
  });

  it("rejects an unknown result kind (TC-107)", () => {
    // Case: TC-107
    // Given: a literal outside the result union
    // @ts-expect-error "partial" is not a BranchCleanupResult kind
    const result: BranchCleanupResult = { kind: "partial" };

    // When/Then: the value is only observable through its kind
    expect(result.kind).toBe("partial");
  });

  it("requires compareBranch on the request (TC-108)", () => {
    // Case: TC-108
    // Given: a complete request literal and one omitting compareBranch
    const request: RequestLoadBranchCleanup = {
      command: "loadBranchCleanup",
      repo: "/r",
      requestId: 1,
      compareBranch: null
    };
    // @ts-expect-error compareBranch may be null but never omitted
    const omitted: RequestLoadBranchCleanup = {
      command: "loadBranchCleanup",
      repo: "/r",
      requestId: 1
    };

    // When/Then: the complete literal keeps its fields
    expect(request.compareBranch).toBeNull();
    expect(omitted.compareBranch).toBeUndefined();
  });

  it("joins the request into the RequestMessage union (TC-109)", () => {
    // Case: TC-109
    // Given: a diagnostic request assigned to the message union
    const message: RequestMessage = {
      command: "loadBranchCleanup",
      repo: "/r",
      requestId: 1,
      compareBranch: null
    };

    // When: the union is narrowed by command
    // Then: the diagnostic fields are reachable
    expect(message.command).toBe("loadBranchCleanup");
    if (message.command === "loadBranchCleanup") {
      expect(message.requestId).toBe(1);
      expect(message.compareBranch).toBeNull();
    }
  });

  it("requires requestId on the response and joins the ResponseMessage union (TC-110)", () => {
    // Case: TC-110
    // Given: a complete response assigned to both types and one missing requestId
    const response: ResponseLoadBranchCleanup = {
      command: "loadBranchCleanup",
      repo: "/r",
      requestId: 1,
      result: { kind: "ok", compareBranch: null, rows: [] }
    };
    const message: ResponseMessage = response;
    // @ts-expect-error requestId is mandatory for the freshness echo
    const missingRequestId: ResponseLoadBranchCleanup = {
      command: "loadBranchCleanup",
      repo: "/r",
      result: { kind: "ok", compareBranch: null, rows: [] }
    };

    // When: the union is narrowed by command
    // Then: repo and requestId echo fields are reachable
    expect(message.command).toBe("loadBranchCleanup");
    if (message.command === "loadBranchCleanup") {
      expect(message.repo).toBe("/r");
      expect(message.requestId).toBe(1);
    }
    expect(missingRequestId.requestId).toBeUndefined();
  });

  it("narrows the ancestry union exhaustively (TC-111)", () => {
    // Case: TC-111
    // Given: a switch that enumerates the four ancestry literals
    const label = (value: BranchCleanupAncestry): string => {
      switch (value) {
        case "ancestor":
          return "a";
        case "notAncestor":
          return "n";
        case "unknown":
          return "u";
        case "notSelected":
          return "s";
        default: {
          const exhaustive: never = value;
          return exhaustive;
        }
      }
    };

    // When/Then: every literal reaches its own case and the default stays unreachable
    expect(label("ancestor")).toBe("a");
    expect(label("notAncestor")).toBe("n");
    expect(label("unknown")).toBe("u");
    expect(label("notSelected")).toBe("s");
  });
});
