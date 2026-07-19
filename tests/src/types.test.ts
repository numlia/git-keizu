import { describe, expect, it } from "vitest";

import {
  ResponseOpenWorktreeInNewWindow,
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
