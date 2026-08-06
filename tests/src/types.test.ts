import { describe, expect, it } from "vitest";

import {
  CheckoutBranchResult,
  PushTarget,
  RemoteBranchTarget,
  RequestCheckoutBranch,
  RequestPush,
  ResponseCheckoutBranch,
  ResponseOpenWorktreeInNewWindow,
  ResponsePush,
  ResponseRevealWorktreeInOS,
  UNCOMMITTED_CHANGES_HASH,
  VALID_UNCOMMITTED_RESET_MODES
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
