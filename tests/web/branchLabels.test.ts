import { describe, expect, it } from "vitest";

import type { GitRef } from "../../src/types";
import { getBranchLabels } from "../../web/branchLabels";

const ref = (hash: string, name: string, type: "head" | "tag" | "remote"): GitRef => ({
  hash,
  name,
  type
});

describe("getBranchLabels", () => {
  // --- Normal cases ---

  it("TC-001: classifies head, tag, and remote, linking remote to matching head", () => {
    // Case: TC-001
    // Given: refs containing one head, one tag, and one remote whose branch name matches the head
    const refs: GitRef[] = [
      ref("a", "main", "head"),
      ref("b", "v1.0", "tag"),
      ref("c", "origin/main", "remote")
    ];

    // When: getBranchLabels is called
    const result = getBranchLabels(refs);

    // Then: each ref is classified correctly and the remote is linked to the head
    expect(result.heads).toEqual([{ name: "main", remotes: ["origin"] }]);
    expect(result.tags).toEqual([ref("b", "v1.0", "tag")]);
    expect(result.remotes).toEqual([]);
  });

  it("TC-002: classifies a single head ref into heads", () => {
    // Case: TC-002
    // Given: refs containing only one head
    const refs: GitRef[] = [ref("a", "main", "head")];

    // When: getBranchLabels is called
    const result = getBranchLabels(refs);

    // Then: head is added with empty remotes, other arrays are empty
    expect(result.heads).toEqual([{ name: "main", remotes: [] }]);
    expect(result.remotes).toEqual([]);
    expect(result.tags).toEqual([]);
  });

  it("TC-003: classifies a single tag ref into tags", () => {
    // Case: TC-003
    // Given: refs containing only one tag
    const refs: GitRef[] = [ref("a", "v1.0", "tag")];

    // When: getBranchLabels is called
    const result = getBranchLabels(refs);

    // Then: tag is added to tags, other arrays are empty
    expect(result.heads).toEqual([]);
    expect(result.remotes).toEqual([]);
    expect(result.tags).toEqual([ref("a", "v1.0", "tag")]);
  });

  it("TC-004: puts remote ref into remainingRemotes when no heads exist", () => {
    // Case: TC-004
    // Given: refs containing only one remote with no matching head
    const refs: GitRef[] = [ref("a", "origin/feature", "remote")];

    // When: getBranchLabels is called
    const result = getBranchLabels(refs);

    // Then: remote goes to remainingRemotes since there are no heads
    expect(result.heads).toEqual([]);
    expect(result.remotes).toEqual([ref("a", "origin/feature", "remote")]);
    expect(result.tags).toEqual([]);
  });

  it("TC-005: links remote to matching head when branch name matches", () => {
    // Case: TC-005
    // Given: a head "main" and a remote "origin/main" whose branch name matches
    const refs: GitRef[] = [ref("a", "main", "head"), ref("b", "origin/main", "remote")];

    // When: getBranchLabels is called
    const result = getBranchLabels(refs);

    // Then: remote name "origin" is added to the head's remotes array
    expect(result.heads).toEqual([{ name: "main", remotes: ["origin"] }]);
    expect(result.remotes).toEqual([]);
    expect(result.tags).toEqual([]);
  });

  it("TC-006: puts remote into remainingRemotes when branch name does not match any head", () => {
    // Case: TC-006
    // Given: a head "main" and a remote "origin/develop" with non-matching branch name
    const refs: GitRef[] = [ref("a", "main", "head"), ref("b", "origin/develop", "remote")];

    // When: getBranchLabels is called
    const result = getBranchLabels(refs);

    // Then: head has no remotes, remote goes to remainingRemotes
    expect(result.heads).toEqual([{ name: "main", remotes: [] }]);
    expect(result.remotes).toEqual([ref("b", "origin/develop", "remote")]);
    expect(result.tags).toEqual([]);
  });

  it("TC-007: links multiple remotes from different origins to the same head", () => {
    // Case: TC-007
    // Given: a head "main" with remotes from "origin" and "upstream"
    const refs: GitRef[] = [
      ref("a", "main", "head"),
      ref("b", "origin/main", "remote"),
      ref("c", "upstream/main", "remote")
    ];

    // When: getBranchLabels is called
    const result = getBranchLabels(refs);

    // Then: both remote names are added to the head's remotes array
    expect(result.heads).toEqual([{ name: "main", remotes: ["origin", "upstream"] }]);
    expect(result.remotes).toEqual([]);
    expect(result.tags).toEqual([]);
  });

  // --- Boundary cases ---

  it("TC-008: returns empty arrays for empty refs input", () => {
    // Case: TC-008
    // Given: an empty refs array
    const refs: GitRef[] = [];

    // When: getBranchLabels is called
    const result = getBranchLabels(refs);

    // Then: all arrays in the result are empty
    expect(result.heads).toEqual([]);
    expect(result.remotes).toEqual([]);
    expect(result.tags).toEqual([]);
  });

  it("TC-009: handles multiple heads with no remotes or tags", () => {
    // Case: TC-009
    // Given: refs containing only two heads
    const refs: GitRef[] = [ref("a", "main", "head"), ref("b", "dev", "head")];

    // When: getBranchLabels is called
    const result = getBranchLabels(refs);

    // Then: both heads are added with empty remotes, other arrays are empty
    expect(result.heads).toEqual([
      { name: "main", remotes: [] },
      { name: "dev", remotes: [] }
    ]);
    expect(result.remotes).toEqual([]);
    expect(result.tags).toEqual([]);
  });

  it("TC-010: handles multiple tags with no heads or remotes", () => {
    // Case: TC-010
    // Given: refs containing only two tags
    const refs: GitRef[] = [ref("a", "v1", "tag"), ref("b", "v2", "tag")];

    // When: getBranchLabels is called
    const result = getBranchLabels(refs);

    // Then: both tags are added, heads and remotes are empty
    expect(result.heads).toEqual([]);
    expect(result.remotes).toEqual([]);
    expect(result.tags).toEqual([ref("a", "v1", "tag"), ref("b", "v2", "tag")]);
  });

  it("TC-011: puts remote into remainingRemotes when no heads exist", () => {
    // Case: TC-011
    // Given: refs containing only one remote with no heads
    const refs: GitRef[] = [ref("a", "origin/feat", "remote")];

    // When: getBranchLabels is called
    const result = getBranchLabels(refs);

    // Then: remote goes to remainingRemotes since there are no heads to match
    expect(result.heads).toEqual([]);
    expect(result.remotes).toEqual([ref("a", "origin/feat", "remote")]);
    expect(result.tags).toEqual([]);
  });

  it("TC-012: puts remote without slash into remainingRemotes", () => {
    // Case: TC-012
    // Given: a remote ref whose name has no slash
    const refs: GitRef[] = [ref("a", "origin", "remote")];

    // When: getBranchLabels is called
    const result = getBranchLabels(refs);

    // Then: slashIndex is -1, so remote goes to remainingRemotes
    expect(result.heads).toEqual([]);
    expect(result.remotes).toEqual([ref("a", "origin", "remote")]);
    expect(result.tags).toEqual([]);
  });

  it("TC-013: puts remote with leading slash into remainingRemotes", () => {
    // Case: TC-013
    // Given: a remote ref whose name starts with a slash (slashIndex === 0)
    const refs: GitRef[] = [ref("a", "/branch", "remote")];

    // When: getBranchLabels is called
    const result = getBranchLabels(refs);

    // Then: slashIndex is 0, which is not > 0, so remote goes to remainingRemotes
    expect(result.heads).toEqual([]);
    expect(result.remotes).toEqual([ref("a", "/branch", "remote")]);
    expect(result.tags).toEqual([]);
  });

  it("TC-014: puts remote with trailing slash into remainingRemotes when branch name is empty", () => {
    // Case: TC-014
    // Given: a head "main" and a remote "origin/" where branch name after slash is empty
    const refs: GitRef[] = [ref("a", "main", "head"), ref("b", "origin/", "remote")];

    // When: getBranchLabels is called
    const result = getBranchLabels(refs);

    // Then: branchName is "", headLookup[""] is undefined, so remote goes to remainingRemotes
    expect(result.heads).toEqual([{ name: "main", remotes: [] }]);
    expect(result.remotes).toEqual([ref("b", "origin/", "remote")]);
    expect(result.tags).toEqual([]);
  });

  it("TC-015: handles remote with multiple slashes by splitting on the first slash", () => {
    // Case: TC-015
    // Given: a head "feature/xyz" and a remote "origin/feature/xyz" with multiple slashes
    const refs: GitRef[] = [
      ref("a", "feature/xyz", "head"),
      ref("b", "origin/feature/xyz", "remote")
    ];

    // When: getBranchLabels is called
    const result = getBranchLabels(refs);

    // Then: first slash splits into remoteName="origin" and branchName="feature/xyz"
    expect(result.heads).toEqual([{ name: "feature/xyz", remotes: ["origin"] }]);
    expect(result.remotes).toEqual([]);
    expect(result.tags).toEqual([]);
  });

  it("TC-016: puts remote with empty string name into remainingRemotes", () => {
    // Case: TC-016
    // Given: a remote ref with an empty string name
    const refs: GitRef[] = [ref("a", "", "remote")];

    // When: getBranchLabels is called
    const result = getBranchLabels(refs);

    // Then: indexOf("/") is -1 for empty string, so remote goes to remainingRemotes
    expect(result.heads).toEqual([]);
    expect(result.remotes).toEqual([ref("a", "", "remote")]);
    expect(result.tags).toEqual([]);
  });

  it("TC-017: correctly resolves headLookup index 0 as a valid match (falsy but numeric)", () => {
    // Case: TC-017
    // Given: a head "main" at index 0 in heads array, and a matching remote
    const refs: GitRef[] = [ref("a", "main", "head"), ref("b", "origin/main", "remote")];

    // When: getBranchLabels is called
    const result = getBranchLabels(refs);

    // Then: typeof 0 === "number" is true, so the remote is correctly linked to the head
    expect(result.heads).toEqual([{ name: "main", remotes: ["origin"] }]);
    expect(result.remotes).toEqual([]);
    expect(result.tags).toEqual([]);
  });
});
