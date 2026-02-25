import { describe, expect, it } from "vitest";

import { UNCOMMITTED_CHANGES_HASH, VALID_UNCOMMITTED_RESET_MODES } from "../../src/types";

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
