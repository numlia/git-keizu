import { describe, expect, it } from "vitest";

import { parseWorktreeList } from "../../src/worktree";

describe("parseWorktreeList", () => {
  // TC-001: Normal porcelain output (main + feature branch)
  it("parses standard porcelain output with main and feature branch into 2-entry map", () => {
    // Given: porcelain output with main worktree and a feature branch worktree
    const stdout = [
      "worktree /home/user/project",
      "HEAD abc1234567890",
      "branch refs/heads/main",
      "",
      "worktree /home/user/project-feature",
      "HEAD def4567890123",
      "branch refs/heads/feature/login",
      ""
    ].join("\n");

    // When: parsing the output
    const result = parseWorktreeList(stdout);

    // Then: returns 2-entry map with correct keys and values
    expect(Object.keys(result)).toHaveLength(2);
    expect(result["main"]).toEqual({ path: "/home/user/project", isMain: true });
    expect(result["feature/login"]).toEqual({
      path: "/home/user/project-feature",
      isMain: false
    });
  });

  // TC-002: Empty string input
  it("returns empty map for empty string input", () => {
    // Given: empty string
    const stdout = "";

    // When: parsing the output
    const result = parseWorktreeList(stdout);

    // Then: returns empty map
    expect(result).toEqual({});
  });

  // TC-003: Main worktree only (single entry)
  it("returns single entry with isMain=true for main worktree only", () => {
    // Given: porcelain output with only the main worktree
    const stdout = [
      "worktree /home/user/project",
      "HEAD abc1234567890",
      "branch refs/heads/main",
      ""
    ].join("\n");

    // When: parsing the output
    const result = parseWorktreeList(stdout);

    // Then: returns 1 entry with isMain=true
    expect(Object.keys(result)).toHaveLength(1);
    expect(result["main"]).toEqual({ path: "/home/user/project", isMain: true });
  });

  // TC-004: Detached HEAD entry is skipped
  it("skips detached HEAD entries without branch line", () => {
    // Given: porcelain output with main worktree and a detached HEAD entry
    const stdout = [
      "worktree /home/user/project",
      "HEAD abc1234567890",
      "branch refs/heads/main",
      "",
      "worktree /home/user/project-detached",
      "HEAD def4567890123",
      "detached",
      ""
    ].join("\n");

    // When: parsing the output
    const result = parseWorktreeList(stdout);

    // Then: only the main worktree is in the result
    expect(Object.keys(result)).toHaveLength(1);
    expect(result["main"]).toEqual({ path: "/home/user/project", isMain: true });
  });

  // TC-005: Bare entry is skipped
  it("skips bare entries", () => {
    // Given: porcelain output with a bare entry followed by a normal worktree
    const stdout = [
      "worktree /home/user/project.git",
      "HEAD abc1234567890",
      "bare",
      "",
      "worktree /home/user/project-work",
      "HEAD def4567890123",
      "branch refs/heads/develop",
      ""
    ].join("\n");

    // When: parsing the output
    const result = parseWorktreeList(stdout);

    // Then: only the develop worktree is in the result, bare is skipped
    expect(Object.keys(result)).toHaveLength(1);
    expect(result["develop"]).toEqual({
      path: "/home/user/project-work",
      isMain: false
    });
  });

  // TC-006: Multiple worktrees (main + 3 feature branches)
  it("parses 4 worktrees with only first entry having isMain=true", () => {
    // Given: porcelain output with main + 3 feature branches
    const stdout = [
      "worktree /home/user/project",
      "HEAD aaa1111111111",
      "branch refs/heads/main",
      "",
      "worktree /home/user/project-feat-a",
      "HEAD bbb2222222222",
      "branch refs/heads/feature-a",
      "",
      "worktree /home/user/project-feat-b",
      "HEAD ccc3333333333",
      "branch refs/heads/feature-b",
      "",
      "worktree /home/user/project-feat-c",
      "HEAD ddd4444444444",
      "branch refs/heads/feature-c",
      ""
    ].join("\n");

    // When: parsing the output
    const result = parseWorktreeList(stdout);

    // Then: returns 4 entries, only first is main
    expect(Object.keys(result)).toHaveLength(4);
    expect(result["main"].isMain).toBe(true);
    expect(result["feature-a"].isMain).toBe(false);
    expect(result["feature-b"].isMain).toBe(false);
    expect(result["feature-c"].isMain).toBe(false);
  });

  // TC-007: refs/heads/ prefix is stripped from branch name
  it("strips refs/heads/ prefix from branch names", () => {
    // Given: porcelain output with refs/heads/ prefixed branch
    const stdout = [
      "worktree /home/user/project",
      "HEAD abc1234567890",
      "branch refs/heads/feature/nested/branch",
      ""
    ].join("\n");

    // When: parsing the output
    const result = parseWorktreeList(stdout);

    // Then: key is the stripped branch name
    expect(Object.keys(result)).toHaveLength(1);
    expect(result["feature/nested/branch"]).toBeDefined();
    expect(result["feature/nested/branch"].path).toBe("/home/user/project");
  });

  // TC-008: Unknown fields are ignored (forward compatibility)
  it("ignores unknown fields and parses successfully", () => {
    // Given: porcelain output with unknown fields (e.g., locked, prunable)
    const stdout = [
      "worktree /home/user/project",
      "HEAD abc1234567890",
      "branch refs/heads/main",
      "locked",
      "prunable",
      ""
    ].join("\n");

    // When: parsing the output
    const result = parseWorktreeList(stdout);

    // Then: parsed successfully ignoring unknown fields
    expect(Object.keys(result)).toHaveLength(1);
    expect(result["main"]).toEqual({ path: "/home/user/project", isMain: true });
  });

  // TC-009: Mixed detached + branch entries
  it("includes only entries with branch line when mixed with detached", () => {
    // Given: porcelain output with detached HEAD interspersed with branch entries
    const stdout = [
      "worktree /home/user/project",
      "HEAD abc1234567890",
      "branch refs/heads/main",
      "",
      "worktree /home/user/project-detached",
      "HEAD def4567890123",
      "detached",
      "",
      "worktree /home/user/project-feature",
      "HEAD ghi7890123456",
      "branch refs/heads/feature-x",
      ""
    ].join("\n");

    // When: parsing the output
    const result = parseWorktreeList(stdout);

    // Then: only branch entries are included
    expect(Object.keys(result)).toHaveLength(2);
    expect(result["main"]).toBeDefined();
    expect(result["feature-x"]).toBeDefined();
  });

  // TC-010: isMain flag is true only for the first entry
  it("sets isMain=true only for the first entry", () => {
    // Given: porcelain output with main as the first entry
    const stdout = [
      "worktree /home/user/project",
      "HEAD abc1234567890",
      "branch refs/heads/main",
      "",
      "worktree /home/user/project-dev",
      "HEAD def4567890123",
      "branch refs/heads/develop",
      ""
    ].join("\n");

    // When: parsing the output
    const result = parseWorktreeList(stdout);

    // Then: only the first entry has isMain=true
    expect(result["main"].isMain).toBe(true);
    expect(result["develop"].isMain).toBe(false);
  });

  // TC-011: Path with spaces is preserved correctly
  it("preserves paths containing spaces", () => {
    // Given: porcelain output with space-containing path
    const stdout = [
      "worktree /home/user/my project/main repo",
      "HEAD abc1234567890",
      "branch refs/heads/main",
      ""
    ].join("\n");

    // When: parsing the output
    const result = parseWorktreeList(stdout);

    // Then: path with spaces is correctly preserved
    expect(result["main"].path).toBe("/home/user/my project/main repo");
  });
});
