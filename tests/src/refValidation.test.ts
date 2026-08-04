import { describe, expect, it } from "vitest";

import { isSafeRemoteName, isValidRefName } from "../../src/refValidation";

// S1: isValidRefName() / isSafeRemoteName() 純粋検証
// @see docs/testing/perspectives/src/refValidation-test.md
describe("isValidRefName", () => {
  it("accepts a hierarchical branch name (TC-001)", () => {
    // Case: TC-001
    // Given: a slash separated branch name
    // When: isValidRefName is called
    const result = isValidRefName("feature/login");

    // Then: the name is accepted
    expect(result).toBe(true);
  });

  it("accepts a single character ref name (TC-002)", () => {
    // Case: TC-002
    // Given: the shortest possible ref name
    // When: isValidRefName is called
    const result = isValidRefName("a");

    // Then: the name is accepted
    expect(result).toBe(true);
  });

  it("rejects an empty ref name (TC-003)", () => {
    // Case: TC-003
    // Given: an empty string
    // When: isValidRefName is called
    const result = isValidRefName("");

    // Then: the name is rejected
    expect(result).toBe(false);
  });

  it("rejects a ref name starting with an option prefix (TC-004)", () => {
    // Case: TC-004
    // Given: a name Git would read as a command line option
    // When: isValidRefName is called
    const result = isValidRefName("-delete");

    // Then: the name is rejected
    expect(result).toBe(false);
  });

  it("rejects a ref name starting with a slash (TC-005)", () => {
    // Case: TC-005
    // Given: a name whose first segment is empty
    // When: isValidRefName is called
    const result = isValidRefName("/feature");

    // Then: the name is rejected
    expect(result).toBe(false);
  });

  it("rejects a ref name starting with a dot (TC-006)", () => {
    // Case: TC-006
    // Given: a name whose first segment starts with a dot
    // When: isValidRefName is called
    const result = isValidRefName(".feature");

    // Then: the name is rejected
    expect(result).toBe(false);
  });

  it("rejects a ref name ending with a dot (TC-007)", () => {
    // Case: TC-007
    // Given: a name that ends with a dot
    // When: isValidRefName is called
    const result = isValidRefName("feature.");

    // Then: the name is rejected
    expect(result).toBe(false);
  });

  it("rejects a ref name ending with a slash (TC-008)", () => {
    // Case: TC-008
    // Given: a name whose last segment is empty
    // When: isValidRefName is called
    const result = isValidRefName("feature/");

    // Then: the name is rejected
    expect(result).toBe(false);
  });

  it("rejects a ref name ending with the .lock suffix (TC-009)", () => {
    // Case: TC-009
    // Given: a name using the Git reserved lock suffix
    // When: isValidRefName is called
    const result = isValidRefName("feature.lock");

    // Then: the name is rejected
    expect(result).toBe(false);
  });

  it("rejects a ref name containing an empty segment (TC-010)", () => {
    // Case: TC-010
    // Given: a name with consecutive slashes
    // When: isValidRefName is called
    const result = isValidRefName("feature//login");

    // Then: the name is rejected
    expect(result).toBe(false);
  });

  it("rejects a ref name whose later segment starts with a dot (TC-011)", () => {
    // Case: TC-011
    // Given: a name whose second segment starts with a dot
    // When: isValidRefName is called
    const result = isValidRefName("feature/.hidden");

    // Then: the name is rejected
    expect(result).toBe(false);
  });

  it("rejects a ref name containing a revision range sequence (TC-012)", () => {
    // Case: TC-012
    // Given: a name containing ".."
    // When: isValidRefName is called
    const result = isValidRefName("feature..login");

    // Then: the name is rejected
    expect(result).toBe(false);
  });

  it("rejects a ref name containing a reflog sequence (TC-013)", () => {
    // Case: TC-013
    // Given: a name containing "@{"
    // When: isValidRefName is called
    const result = isValidRefName("feature@{1}");

    // Then: the name is rejected
    expect(result).toBe(false);
  });

  it("rejects a ref name containing whitespace (TC-014)", () => {
    // Case: TC-014
    // Given: a name containing a space
    // When: isValidRefName is called
    const result = isValidRefName("feature login");

    // Then: the name is rejected
    expect(result).toBe(false);
  });

  it("rejects a ref name containing a control character (TC-015)", () => {
    // Case: TC-015
    // Given: a name containing the DEL control character
    const refName = `feature${String.fromCharCode(0x7f)}login`;

    // When: isValidRefName is called
    const result = isValidRefName(refName);

    // Then: the name is rejected
    expect(result).toBe(false);
  });

  it("rejects every Git forbidden character (TC-016)", () => {
    // Case: TC-016
    // Given: the seven characters Git forbids in ref names
    const forbiddenCharacters = ["~", "^", ":", "?", "*", "[", "\\"];

    // When: isValidRefName is called for each of them
    const results = forbiddenCharacters.map((character) =>
      isValidRefName(`feature${character}login`)
    );

    // Then: all seven inputs are rejected
    expect(results).toEqual([false, false, false, false, false, false, false]);
  });
});

describe("isSafeRemoteName", () => {
  it("accepts the default remote name (TC-017)", () => {
    // Case: TC-017
    // Given: the default remote name
    // When: isSafeRemoteName is called
    const result = isSafeRemoteName("origin");

    // Then: the name is accepted
    expect(result).toBe(true);
  });

  it("rejects an empty remote name (TC-018)", () => {
    // Case: TC-018
    // Given: an empty string
    // When: isSafeRemoteName is called
    const result = isSafeRemoteName("");

    // Then: the name is rejected
    expect(result).toBe(false);
  });

  it("rejects a remote name starting with an option prefix (TC-019)", () => {
    // Case: TC-019
    // Given: a remote name Git would read as a command line option
    // When: isSafeRemoteName is called
    const result = isSafeRemoteName("-upstream");

    // Then: the name is rejected
    expect(result).toBe(false);
  });
});
