import { describe, expect, it } from "vitest";

import {
  CheckoutBranchResult,
  RequestPush,
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

// S4: checkout 結果と二段階 Push の型契約（Response への repo 必須化）
// @see docs/testing/perspectives/src/types-test.md
describe("CheckoutBranchResult discriminated union", () => {
  it("accepts the branchExists variant without a status field (TC-026)", () => {
    // Case: TC-026
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

  it("accepts the invalidRef variant (TC-027)", () => {
    // Case: TC-027
    // Given: the invalidRef variant of the checkout result
    const result: CheckoutBranchResult = { kind: "invalidRef" };

    // When: the assignable literal is inspected at runtime
    // Then: the discriminant is preserved
    expect(result.kind).toBe("invalidRef");
  });

  it("accepts the completed variant and exposes status after narrowing (TC-028)", () => {
    // Case: TC-028
    // Given: the completed variant with a null status
    const result: CheckoutBranchResult = { kind: "completed", status: null };

    // When: the value is narrowed by kind
    // Then: status is reachable and keeps its null value
    expect(result.kind).toBe("completed");
    if (result.kind === "completed") {
      expect(result.status).toBeNull();
    }
  });

  it("requires status on the completed variant (TC-029)", () => {
    // Case: TC-029
    // Given: a completed literal without the mandatory status field
    // @ts-expect-error status is mandatory on the completed variant
    const missingStatus: CheckoutBranchResult = { kind: "completed" };

    // When: the literal is inspected at runtime
    // Then: only the discriminant is present
    expect(missingStatus.kind).toBe("completed");
  });

  it("rejects a kind outside the union (TC-030)", () => {
    // Case: TC-030
    // Given: a literal using a kind that is not part of the union
    // @ts-expect-error "unknown" is not a member of CheckoutBranchResult
    const unknownKind: CheckoutBranchResult = { kind: "unknown" };

    // When: the literal is inspected at runtime
    // Then: the unsupported discriminant is what was written
    expect(unknownKind.kind).toBe("unknown");
  });
});

describe("RequestPush two-phase contract", () => {
  it("accepts the initial request with a null selectedRemote (TC-031)", () => {
    // Case: TC-031
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

  it("accepts the follow-up request carrying the selected remote (TC-032)", () => {
    // Case: TC-032
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

  it("requires operationId on the request (TC-033)", () => {
    // Case: TC-033
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

  it("requires selectedRemote on the request (TC-034)", () => {
    // Case: TC-034
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
  it("accepts the selectRemote variant and exposes its fields after narrowing (TC-035)", () => {
    // Case: TC-035
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

  it("accepts the noRemotes variant without phase-specific fields (TC-036)", () => {
    // Case: TC-036
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

  it("accepts the completed variant and exposes status after narrowing (TC-037)", () => {
    // Case: TC-037
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

  it("requires status on the completed variant (TC-038)", () => {
    // Case: TC-038
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

  it("requires defaultRemote on the selectRemote variant (TC-039)", () => {
    // Case: TC-039
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

  it("requires operationId on every response variant (TC-040)", () => {
    // Case: TC-040
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

  it("requires repo on every response variant (TC-041)", () => {
    // Case: TC-041
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

  it("narrows exhaustively on phase (TC-042)", () => {
    // Case: TC-042
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
