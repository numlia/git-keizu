import { describe, expect, it, vi } from "vitest";

// src/worktree.ts reaches the vscode module transitively through src/utils.ts.
vi.mock("vscode", () => ({}));

import { parseWorktreeList } from "../../src/worktree";

// S2: parseWorktreeList() porcelain レコードの branch / detached / bare 分類
// @see docs/testing/perspectives/src/worktree-test.md
describe("parseWorktreeList", () => {
  it("keeps branch records in the branches map (TC-012)", () => {
    // Case: TC-012
    // Given: porcelain output with a main branch record and a linked branch record
    const stdout = [
      "worktree /repo",
      "HEAD abc1234",
      "branch refs/heads/main",
      "",
      "worktree /wt/x",
      "HEAD def5678",
      "branch refs/heads/feature/x",
      ""
    ].join("\n");

    // When: the porcelain output is parsed
    const result = parseWorktreeList(stdout);

    // Then: both records land in branches with the first one marked as main
    expect(result.branches).toEqual({
      main: { path: "/repo", isMain: true },
      "feature/x": { path: "/wt/x", isMain: false }
    });
    expect(result.detached).toEqual([]);
  });

  it("strips the refs/heads/ prefix from the branch key (TC-013)", () => {
    // Case: TC-013
    // Given: a record whose branch line carries the refs/heads/ prefix
    const stdout = ["worktree /wt/x", "HEAD abc1234", "branch refs/heads/feature/x", ""].join("\n");

    // When: the porcelain output is parsed
    const result = parseWorktreeList(stdout);

    // Then: the key is the shortened branch name
    expect(Object.keys(result.branches)).toEqual(["feature/x"]);
  });

  it("adds a detached record to the detached list (TC-014)", () => {
    // Case: TC-014
    // Given: a bare first record followed by a detached linked worktree record
    const stdout = [
      "worktree /repo.git",
      "bare",
      "",
      "worktree /tmp/wt8",
      "HEAD abc1234",
      "detached",
      ""
    ].join("\n");

    // When: the porcelain output is parsed
    const result = parseWorktreeList(stdout);

    // Then: the detached record is kept with its path, head and linked flag
    expect(result.detached).toEqual([{ path: "/tmp/wt8", head: "abc1234", isMain: false }]);
    expect(result.branches).toEqual({});
  });

  it("marks only the first record as the main worktree (TC-015)", () => {
    // Case: TC-015
    // Given: a detached first record followed by a branch record
    const stdout = [
      "worktree /repo",
      "HEAD abc1234",
      "detached",
      "",
      "worktree /wt/x",
      "HEAD def5678",
      "branch refs/heads/feature/x",
      ""
    ].join("\n");

    // When: the porcelain output is parsed
    const result = parseWorktreeList(stdout);

    // Then: the leading detached record is main and the later branch record is not
    expect(result.detached[0].isMain).toBe(true);
    expect(result.branches["feature/x"].isMain).toBe(false);
  });

  it("excludes a bare record even when it carries a HEAD (TC-016)", () => {
    // Case: TC-016
    // Given: a bare record with a HEAD line followed by a normal branch record
    const stdout = [
      "worktree /repo.git",
      "HEAD abc1234",
      "bare",
      "",
      "worktree /wt/develop",
      "HEAD def5678",
      "branch refs/heads/develop",
      ""
    ].join("\n");

    // When: the porcelain output is parsed
    const result = parseWorktreeList(stdout);

    // Then: the bare record appears in neither collection
    expect(Object.keys(result.branches)).toEqual(["develop"]);
    expect(result.detached).toHaveLength(0);
  });

  it("drops a record that declares both a branch and detached (TC-017)", () => {
    // Case: TC-017
    // Given: a contradictory record followed by a valid branch record
    const stdout = [
      "worktree /wt/bad",
      "HEAD abc1234",
      "branch refs/heads/x",
      "detached",
      "",
      "worktree /wt/good",
      "HEAD def5678",
      "branch refs/heads/good",
      ""
    ].join("\n");

    // When: the porcelain output is parsed
    const result = parseWorktreeList(stdout);

    // Then: only the valid record survives and parsing continues past the contradiction
    expect(result.branches).toEqual({ good: { path: "/wt/good", isMain: false } });
    expect(result.detached).toEqual([]);
  });

  it("drops a detached record without a HEAD line (TC-018)", () => {
    // Case: TC-018
    // Given: a detached record missing its HEAD line followed by a valid detached record
    const stdout = [
      "worktree /wt/bad",
      "detached",
      "",
      "worktree /wt/good",
      "HEAD def5678",
      "detached",
      ""
    ].join("\n");

    // When: the porcelain output is parsed
    const result = parseWorktreeList(stdout);

    // Then: only the complete record is kept and the parser does not stop
    expect(result.detached).toHaveLength(1);
    expect(result.detached[0].path).toBe("/wt/good");
  });

  it("drops a detached record whose HEAD is not hexadecimal (TC-019)", () => {
    // Case: TC-019
    // Given: a detached record whose HEAD contains non-hexadecimal characters
    const stdout = ["worktree /wt/bad", "HEAD zzzz", "detached", ""].join("\n");

    // When: the porcelain output is parsed
    const result = parseWorktreeList(stdout);

    // Then: the record is excluded and no exception is thrown
    expect(result.detached).toEqual([]);
  });

  it("drops a detached record whose HEAD is below the minimum length (TC-020)", () => {
    // Case: TC-020
    // Given: a detached record whose HEAD is only 3 characters long
    const stdout = ["worktree /wt/bad", "HEAD abc", "detached", ""].join("\n");

    // When: the porcelain output is parsed
    const result = parseWorktreeList(stdout);

    // Then: the record is excluded
    expect(result.detached).toEqual([]);
  });

  it("ignores unknown and valued attributes on a branch record (TC-021)", () => {
    // Case: TC-021
    // Given: the same branch record with and without extra porcelain attributes
    const withAttributes = [
      "worktree /wt/x",
      "HEAD abc1234",
      "branch refs/heads/feature/x",
      "locked",
      "prunable reason gitdir file points to non-existent location",
      ""
    ].join("\n");
    const withoutAttributes = [
      "worktree /wt/x",
      "HEAD abc1234",
      "branch refs/heads/feature/x",
      ""
    ].join("\n");

    // When: both porcelain outputs are parsed
    const result = parseWorktreeList(withAttributes);

    // Then: the extra attributes do not change the parsed entry
    expect(result.branches).toEqual(parseWorktreeList(withoutAttributes).branches);
  });

  it("sorts detached entries by full path in ascending order (TC-022)", () => {
    // Case: TC-022
    // Given: three detached records emitted in descending path order
    const stdout = [
      "worktree /c",
      "HEAD ccc1234",
      "detached",
      "",
      "worktree /b",
      "HEAD bbb1234",
      "detached",
      "",
      "worktree /a",
      "HEAD aaa1234",
      "detached",
      ""
    ].join("\n");

    // When: the porcelain output is parsed
    const result = parseWorktreeList(stdout);

    // Then: the detached entries are returned in ascending path order
    expect(result.detached.map((entry) => entry.path)).toEqual(["/a", "/b", "/c"]);
  });

  it("keeps both detached entries that share the same HEAD (TC-023)", () => {
    // Case: TC-023
    // Given: two detached records at different paths pointing at the same commit
    const stdout = [
      "worktree /wt/a",
      "HEAD abc1234",
      "detached",
      "",
      "worktree /wt/b",
      "HEAD abc1234",
      "detached",
      ""
    ].join("\n");

    // When: the porcelain output is parsed
    const result = parseWorktreeList(stdout);

    // Then: neither entry is deduplicated away, so every worktree keeps its label
    expect(result.detached).toHaveLength(2);
    expect(result.detached[0].head).toBe("abc1234");
    expect(result.detached[1].head).toBe("abc1234");
  });

  it("returns an empty collection for empty input (TC-024)", () => {
    // Case: TC-024
    // Given: an empty porcelain output
    // When: the porcelain output is parsed
    const result = parseWorktreeList("");

    // Then: the empty collection matches the Git failure fallback shape
    expect(result).toEqual({ branches: {}, detached: [] });
  });

  it("drops a detached record without a worktree path (TC-025)", () => {
    // Case: TC-025
    // Given: a record carrying HEAD and detached but no worktree line
    const stdout = ["HEAD abc1234", "detached", ""].join("\n");

    // When: the porcelain output is parsed
    const result = parseWorktreeList(stdout);

    // Then: the record is excluded because its path is empty
    expect(result.detached).toEqual([]);
  });

  it("preserves spaces inside a detached worktree path (TC-026)", () => {
    // Case: TC-026
    // Given: a detached record whose path contains spaces
    const stdout = ["worktree /tmp/my worktree/wt8", "HEAD abc1234", "detached", ""].join("\n");

    // When: the porcelain output is parsed
    const result = parseWorktreeList(stdout);

    // Then: the full path including spaces is preserved
    expect(result.detached[0].path).toBe("/tmp/my worktree/wt8");
  });

  it("returns a single main branch entry for a lone worktree (TC-027)", () => {
    // Case: TC-027
    // Given: porcelain output with only the main branch worktree
    const stdout = ["worktree /repo", "HEAD abc1234", "branch refs/heads/main", ""].join("\n");

    // When: the porcelain output is parsed
    const result = parseWorktreeList(stdout);

    // Then: the single entry is the main worktree and nothing is detached
    expect(Object.keys(result.branches)).toEqual(["main"]);
    expect(result.branches["main"].isMain).toBe(true);
    expect(result.detached).toEqual([]);
  });

  it("ignores blank trailing records (TC-028)", () => {
    // Case: TC-028
    // Given: porcelain output followed by consecutive blank lines
    const stdout = [
      "worktree /repo",
      "HEAD abc1234",
      "branch refs/heads/main",
      "",
      "worktree /wt/x",
      "HEAD def5678",
      "detached",
      "",
      "",
      ""
    ].join("\n");

    // When: the porcelain output is parsed
    const result = parseWorktreeList(stdout);

    // Then: only the two valid records are counted
    expect(Object.keys(result.branches)).toEqual(["main"]);
    expect(result.detached).toHaveLength(1);
  });
});
