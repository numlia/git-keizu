import { describe, expect, it } from "vitest";

import {
  arraysEqual,
  buildCommitRowAttributes,
  escapeHtml,
  pad2,
  sanitizeBranchNameForPath,
  svgIcons,
  UNCOMMITTED_CHANGES_HASH,
  unescapeHtml,
  worktreeMapsEqual
} from "../../web/utils";

describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes less-than", () => {
    expect(escapeHtml("<div>")).toBe("&lt;div&gt;");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#x27;s");
  });

  it("escapes forward slashes", () => {
    expect(escapeHtml("a/b")).toBe("a&#x2F;b");
  });

  it("escapes multiple special characters", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;"
    );
  });

  it("returns empty string unchanged", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("returns plain text unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});

describe("unescapeHtml", () => {
  it("unescapes ampersand", () => {
    expect(unescapeHtml("a &amp; b")).toBe("a & b");
  });

  it("unescapes less-than and greater-than", () => {
    expect(unescapeHtml("&lt;div&gt;")).toBe("<div>");
  });

  it("unescapes double quotes", () => {
    expect(unescapeHtml("&quot;hello&quot;")).toBe('"hello"');
  });

  it("unescapes single quotes", () => {
    expect(unescapeHtml("it&#x27;s")).toBe("it's");
  });

  it("unescapes forward slashes", () => {
    expect(unescapeHtml("a&#x2F;b")).toBe("a/b");
  });

  it("round-trips with escapeHtml", () => {
    const original = '<a href="test">it\'s & done</a>';
    expect(unescapeHtml(escapeHtml(original))).toBe(original);
  });
});

describe("sanitizeBranchNameForPath", () => {
  it("replaces a slash with a hyphen (TC-009)", () => {
    // Given: a branch name containing a slash
    const branchName = "feature/x";
    // When: sanitizeBranchNameForPath is called
    const result = sanitizeBranchNameForPath(branchName);
    // Then: the slash is replaced with a hyphen
    expect(result).toBe("feature-x");
  });

  it("replaces multiple slashes across path segments (TC-010)", () => {
    // Given: a branch name containing multiple slashes
    const branchName = "feature/sub/branch";
    // When: sanitizeBranchNameForPath is called
    const result = sanitizeBranchNameForPath(branchName);
    // Then: every slash sequence is normalized to a single hyphen
    expect(result).toBe("feature-sub-branch");
  });

  it("collapses consecutive slashes into one hyphen (TC-011)", () => {
    // Given: a branch name containing consecutive slashes
    const branchName = "feature//x";
    // When: sanitizeBranchNameForPath is called
    const result = sanitizeBranchNameForPath(branchName);
    // Then: the consecutive unsafe characters become one hyphen
    expect(result).toBe("feature-x");
  });

  it("replaces a backslash with a hyphen (TC-012)", () => {
    // Given: a branch name containing a backslash
    const branchName = "path\\file";
    // When: sanitizeBranchNameForPath is called
    const result = sanitizeBranchNameForPath(branchName);
    // Then: the backslash is replaced with a hyphen
    expect(result).toBe("path-file");
  });

  it("replaces a colon with a hyphen (TC-013)", () => {
    // Given: a branch name containing a colon
    const branchName = "fix:bug";
    // When: sanitizeBranchNameForPath is called
    const result = sanitizeBranchNameForPath(branchName);
    // Then: the colon is replaced with a hyphen
    expect(result).toBe("fix-bug");
  });

  it("replaces the remaining unsafe characters with hyphens (TC-014)", () => {
    // Given: a branch name containing asterisk, question mark, quote, angle brackets, and pipe
    const branchName = 'a*b?c"d<e>f|g';
    // When: sanitizeBranchNameForPath is called
    const result = sanitizeBranchNameForPath(branchName);
    // Then: each unsafe character is normalized to a hyphen
    expect(result).toBe("a-b-c-d-e-f-g");
  });

  it("replaces a half-width space with a hyphen (TC-015)", () => {
    // Given: a branch name containing a half-width space
    const branchName = "feature branch";
    // When: sanitizeBranchNameForPath is called
    const result = sanitizeBranchNameForPath(branchName);
    // Then: the space is replaced with a hyphen
    expect(result).toBe("feature-branch");
  });

  it("returns a safe branch name unchanged (TC-016)", () => {
    // Given: a branch name without unsafe characters
    const branchName = "main";
    // When: sanitizeBranchNameForPath is called
    const result = sanitizeBranchNameForPath(branchName);
    // Then: the original string is returned unchanged
    expect(result).toBe("main");
  });

  it("collapses mixed consecutive unsafe characters into one hyphen (TC-017)", () => {
    // Given: a branch name containing mixed consecutive unsafe characters
    const branchName = "feature/ x";
    // When: sanitizeBranchNameForPath is called
    const result = sanitizeBranchNameForPath(branchName);
    // Then: the consecutive unsafe run is replaced by one hyphen
    expect(result).toBe("feature-x");
  });

  it("returns an empty string unchanged (TC-018)", () => {
    // Given: an empty branch name
    const branchName = "";
    // When: sanitizeBranchNameForPath is called
    const result = sanitizeBranchNameForPath(branchName);
    // Then: the empty string is returned unchanged
    expect(result).toBe("");
  });

  it("is idempotent for an already normalized branch name (TC-019)", () => {
    // Given: an already normalized branch name
    const branchName = "feature-x";
    // When: sanitizeBranchNameForPath is called twice
    const once = sanitizeBranchNameForPath(branchName);
    const twice = sanitizeBranchNameForPath(once);
    // Then: the second result matches the first result
    expect(once).toBe("feature-x");
    expect(twice).toBe("feature-x");
    expect(twice).toBe(once);
  });
});

describe("arraysEqual", () => {
  it("returns true for equal arrays", () => {
    expect(arraysEqual([1, 2, 3], [1, 2, 3], (a, b) => a === b)).toBe(true);
  });

  it("returns false for different lengths", () => {
    expect(arraysEqual([1, 2], [1, 2, 3], (a, b) => a === b)).toBe(false);
  });

  it("returns false for different elements", () => {
    expect(arraysEqual([1, 2, 3], [1, 4, 3], (a, b) => a === b)).toBe(false);
  });

  it("returns true for empty arrays", () => {
    expect(arraysEqual([], [], (a, b) => a === b)).toBe(true);
  });

  it("uses custom comparator", () => {
    const a = [{ id: 1 }, { id: 2 }];
    const b = [{ id: 1 }, { id: 2 }];
    expect(arraysEqual(a, b, (x, y) => x.id === y.id)).toBe(true);
  });

  it("detects difference with custom comparator", () => {
    const a = [{ id: 1 }, { id: 2 }];
    const b = [{ id: 1 }, { id: 3 }];
    expect(arraysEqual(a, b, (x, y) => x.id === y.id)).toBe(false);
  });
});

describe("worktreeMapsEqual", () => {
  it("returns true for two empty maps", () => {
    expect(worktreeMapsEqual({}, {})).toBe(true);
  });

  it("returns true for identical maps", () => {
    const a = { main: { path: "/repo", isMain: true }, feat: { path: "/wt", isMain: false } };
    const b = { main: { path: "/repo", isMain: true }, feat: { path: "/wt", isMain: false } };
    expect(worktreeMapsEqual(a, b)).toBe(true);
  });

  it("returns false when key count differs", () => {
    const a = { main: { path: "/repo", isMain: true } };
    const b = {};
    expect(worktreeMapsEqual(a, b)).toBe(false);
  });

  it("returns false when a key is missing in b", () => {
    const a = { main: { path: "/repo", isMain: true }, feat: { path: "/wt", isMain: false } };
    const b = { main: { path: "/repo", isMain: true }, other: { path: "/x", isMain: false } };
    expect(worktreeMapsEqual(a, b)).toBe(false);
  });

  it("returns false when path differs", () => {
    const a = { feat: { path: "/wt-old", isMain: false } };
    const b = { feat: { path: "/wt-new", isMain: false } };
    expect(worktreeMapsEqual(a, b)).toBe(false);
  });

  it("returns false when isMain differs", () => {
    const a = { feat: { path: "/wt", isMain: false } };
    const b = { feat: { path: "/wt", isMain: true } };
    expect(worktreeMapsEqual(a, b)).toBe(false);
  });
});

describe("svgIcons", () => {
  it("fetch icon is a non-empty codicon span string (TC-001)", () => {
    // Given: svgIcons is imported
    // When: fetch property is referenced
    // Then: it is a non-empty string containing a codicon span for git-fetch
    expect(typeof svgIcons.fetch).toBe("string");
    expect(svgIcons.fetch.length).toBeGreaterThan(0);
    expect(svgIcons.fetch).toContain('class="codicon codicon-git-fetch"');
  });

  it("stash icon is a non-empty codicon span string (TC-002)", () => {
    // Given: svgIcons is imported
    // When: stash property is referenced
    // Then: it is a non-empty string containing a codicon span for git-stash
    expect(typeof svgIcons.stash).toBe("string");
    expect(svgIcons.stash.length).toBeGreaterThan(0);
    expect(svgIcons.stash).toContain('class="codicon codicon-git-stash"');
  });
});

describe("pad2", () => {
  it("pads single digit with leading zero", () => {
    expect(pad2(0)).toBe("00");
    expect(pad2(1)).toBe("01");
    expect(pad2(9)).toBe("09");
  });

  it("returns two-digit number as-is", () => {
    expect(pad2(10)).toBe(10);
    expect(pad2(23)).toBe(23);
    expect(pad2(59)).toBe(59);
  });
});

describe("buildCommitRowAttributes muted parameter", () => {
  it("adds mute class for normal commit when muted is true (TC-003)", () => {
    // Given: a normal commit hash with no stash and muted=true
    // When: buildCommitRowAttributes is called
    const result = buildCommitRowAttributes("abc123", null, true);
    // Then: class contains "commit mute" and data-hash is set
    expect(result).toContain('class="commit mute"');
    expect(result).toContain('data-hash="abc123"');
  });

  it("does not add mute class when muted is false (TC-004)", () => {
    // Given: a normal commit hash with no stash and muted=false
    // When: buildCommitRowAttributes is called
    const result = buildCommitRowAttributes("abc123", null, false);
    // Then: class is "commit" without "mute"
    expect(result).toContain('class="commit"');
    expect(result).not.toContain("mute");
  });

  it("does not add mute class for stash commit even when muted is true (TC-005)", () => {
    // Given: a stash commit with muted=true
    const stash = { selector: "stash@{0}", baseHash: "base1", untrackedFilesHash: null };
    // When: buildCommitRowAttributes is called
    const result = buildCommitRowAttributes("abc123", stash, true);
    // Then: class is "commit stash" without "mute"
    expect(result).toContain('class="commit stash"');
    expect(result).not.toContain("mute");
  });

  it("does not add mute class for unsavedChanges even when muted is true (TC-006)", () => {
    // Given: UNCOMMITTED_CHANGES_HASH with muted=true
    // When: buildCommitRowAttributes is called
    const result = buildCommitRowAttributes(UNCOMMITTED_CHANGES_HASH, null, true);
    // Then: class is "unsavedChanges" without "mute"
    expect(result).toContain('class="unsavedChanges"');
    expect(result).not.toContain("mute");
  });

  it("preserves data-hash attribute when muted is true (TC-007)", () => {
    // Given: a normal commit with muted=true
    // When: buildCommitRowAttributes is called
    const result = buildCommitRowAttributes("abc123", null, true);
    // Then: data-hash attribute is preserved
    expect(result).toContain('data-hash="abc123"');
  });
});
