import nodePath from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_WORKTREE_PATH_TEMPLATE,
  resolveWorktreePath,
  sanitizeBranchForPath,
  windowsDriveDirectories,
  type WorktreePathPlatform,
  type WorktreePathVars
} from "../../src/worktreePath";

function placeholder(name: string): string {
  return `${"$"}{${name}}`;
}

/**
 * The Better Worktrees resolver, parameterised by Node's own path API.
 * Git Keizu's resolver must agree with this for every template it accepts.
 */
function referenceResolve(
  template: string,
  vars: WorktreePathVars,
  pathApi: typeof nodePath.posix
): string {
  const effective = template.trim() || DEFAULT_WORKTREE_PATH_TEMPLATE;
  const repoPath = pathApi.resolve(vars.repoPath);
  const values = new Map<string, string>([
    ["repoPath", repoPath],
    ["repoName", pathApi.basename(repoPath)],
    ["branch", sanitizeBranchForPath(vars.branch)]
  ]);
  const expanded = effective.replace(
    /\$\{(\w+)\}/g,
    (match, key: string) => values.get(key) ?? match
  );
  return pathApi.resolve(repoPath, expandHome(expanded, vars.homeDir, pathApi));
}

function expandHome(target: string, homeDir: string, pathApi: typeof nodePath.posix): string {
  if (target === "~") {
    return homeDir;
  }
  if (target.startsWith("~/") || target.startsWith("~\\")) {
    return pathApi.join(homeDir, target.slice(2));
  }
  return target;
}

// S1: sanitizeBranchForPath() branch name as one directory
// @see docs/testing/perspectives/src/worktreePath-test.md
describe("sanitizeBranchForPath", () => {
  it("keeps a plain branch name unchanged (TC-001)", () => {
    // Case: TC-001
    expect(sanitizeBranchForPath("hotfix")).toBe("hotfix");
  });

  it("flattens slashes so a namespaced branch stays one directory (TC-002)", () => {
    // Case: TC-002
    expect(sanitizeBranchForPath("feat/DATA-123-add-page")).toBe("feat-DATA-123-add-page");
  });

  it("flattens backslashes too (TC-003)", () => {
    // Case: TC-003
    expect(sanitizeBranchForPath("feat\\win")).toBe("feat-win");
  });

  it("collapses runs of separators into one (TC-004)", () => {
    // Case: TC-004
    expect(sanitizeBranchForPath("feat//a___b")).toBe("feat-a_b");
  });

  it("strips leading and trailing separators and dots (TC-005)", () => {
    // Case: TC-005
    expect(sanitizeBranchForPath("/feat/x/")).toBe("feat-x");
    expect(sanitizeBranchForPath(".hidden.")).toBe("hidden");
  });

  it("replaces characters that are hostile in a path (TC-006)", () => {
    // Case: TC-006
    expect(sanitizeBranchForPath("feat:a*b?c")).toBe("feat-a-b-c");
  });

  it("never returns a name that starts with a dash (TC-007)", () => {
    // Case: TC-007
    expect(sanitizeBranchForPath("--force")).toBe("force");
  });

  it("falls back to a placeholder when nothing usable is left (TC-008)", () => {
    // Case: TC-008
    expect(sanitizeBranchForPath("///")).toBe("worktree");
    expect(sanitizeBranchForPath("")).toBe("worktree");
  });
});

// S2: resolveWorktreePath() template expansion with POSIX paths (TC-009 to TC-017)
// S3: resolveWorktreePath() Windows paths and platform inference (TC-018 to TC-025)
// @see docs/testing/perspectives/src/worktreePath-test.md
describe("resolveWorktreePath", () => {
  const HOME = "/home/dev";
  const REPO = "/home/dev/repos/api";

  function expectTemplate(template: string, branch: string, expected: string) {
    const vars: WorktreePathVars = { repoPath: REPO, branch, homeDir: HOME, platform: "posix" };
    expect(resolveWorktreePath(template, vars)).toBe(expected);
    expect(resolveWorktreePath(template, vars)).toBe(
      referenceResolve(template, vars, nodePath.posix)
    );
  }

  it("places a worktree beside the repo with the default template (TC-009)", () => {
    // Case: TC-009
    expectTemplate(DEFAULT_WORKTREE_PATH_TEMPLATE, "hotfix", "/home/dev/repos/api-hotfix");
  });

  it("sanitizes the branch when expanding it into a path (TC-010)", () => {
    // Case: TC-010
    expectTemplate(
      DEFAULT_WORKTREE_PATH_TEMPLATE,
      "feat/DATA-123",
      "/home/dev/repos/api-feat-DATA-123"
    );
  });

  it("expands a leading tilde against the home directory (TC-011)", () => {
    // Case: TC-011
    expectTemplate(
      `~/.worktrees/${placeholder("repoName")}/${placeholder("branch")}`,
      "feat/x",
      "/home/dev/.worktrees/api/feat-x"
    );
  });

  it("supports the repoPath placeholder for a nested layout (TC-012)", () => {
    // Case: TC-012
    expectTemplate(
      `${placeholder("repoPath")}/.worktrees/${placeholder("branch")}`,
      "hotfix",
      "/home/dev/repos/api/.worktrees/hotfix"
    );
  });

  it("resolves a relative template against the repo, not the process cwd (TC-013)", () => {
    // Case: TC-013
    expectTemplate(`../side/${placeholder("branch")}`, "hotfix", "/home/dev/repos/side/hotfix");
  });

  it("normalizes away traversal segments (TC-014)", () => {
    // Case: TC-014
    expectTemplate(
      `${placeholder("repoPath")}/../../${placeholder("branch")}`,
      "hotfix",
      "/home/dev/hotfix"
    );
  });

  it("leaves an unknown placeholder alone rather than emptying it (TC-015)", () => {
    // Case: TC-015
    expectTemplate(
      `${placeholder("repoPath")}/${placeholder("nope")}`,
      "hotfix",
      `/home/dev/repos/api/${placeholder("nope")}`
    );
  });

  it("leaves prototype names such as constructor written out (TC-016)", () => {
    // Case: TC-016
    expectTemplate(
      `${placeholder("repoPath")}/${placeholder("constructor")}/${placeholder("toString")}`,
      "hotfix",
      `/home/dev/repos/api/${placeholder("constructor")}/${placeholder("toString")}`
    );
  });

  it("falls back to the default template when the setting is blank (TC-017)", () => {
    // Case: TC-017
    expectTemplate("   ", "hotfix", "/home/dev/repos/api-hotfix");
  });

  it("matches Node's win32 path module for the same templates (TC-018)", () => {
    // Case: TC-018
    const repo = "C:\\src\\api";
    const home = "C:\\Users\\dev";
    const cases: Array<[string, string, string]> = [
      [DEFAULT_WORKTREE_PATH_TEMPLATE, "feat/x", "C:\\src\\api-feat-x"],
      [
        `~/.worktrees/${placeholder("repoName")}/${placeholder("branch")}`,
        "feat/x",
        "C:\\Users\\dev\\.worktrees\\api\\feat-x"
      ],
      [
        `${placeholder("repoPath")}/.worktrees/${placeholder("branch")}`,
        "hotfix",
        "C:\\src\\api\\.worktrees\\hotfix"
      ],
      [`../side/${placeholder("branch")}`, "hotfix", "C:\\src\\side\\hotfix"],
      [`${placeholder("repoPath")}/../../${placeholder("branch")}`, "hotfix", "C:\\hotfix"]
    ];
    for (const [template, branch, expected] of cases) {
      const vars: WorktreePathVars = {
        repoPath: repo,
        branch,
        homeDir: home,
        platform: "win32"
      };
      expect(resolveWorktreePath(template, vars)).toBe(expected);
      expect(resolveWorktreePath(template, vars)).toBe(
        referenceResolve(template, vars, nodePath.win32)
      );
    }
  });

  it("resolves a drive-relative template on another drive the way Node does (TC-019)", () => {
    // Case: TC-019
    const template = `D:worktrees\\${placeholder("branch")}`;
    const vars: WorktreePathVars = {
      repoPath: "C:\\src\\repo",
      branch: "feature",
      homeDir: "C:\\Users\\dev",
      platform: "win32",
      cwd: process.cwd(),
      driveCwd: windowsDriveDirectories(process.env)
    };
    const resolved = resolveWorktreePath(template, vars);
    expect(resolved).toBe(referenceResolve(template, vars, nodePath.win32));
    expect(resolved.startsWith("D:\\")).toBe(true);
  });

  it("uses a drive working directory for a drive-relative template (TC-020)", () => {
    // Case: TC-020
    expect(
      resolveWorktreePath(`D:worktrees\\${placeholder("branch")}`, {
        repoPath: "C:\\src\\repo",
        branch: "feature",
        homeDir: "C:\\Users\\dev",
        platform: "win32",
        cwd: "C:\\Users\\dev",
        driveCwd: { "D:": "D:\\work\\current" }
      })
    ).toBe("D:\\work\\current\\worktrees\\feature");
  });

  it("uses the drive root when that drive has no working directory (TC-021)", () => {
    // Case: TC-021
    expect(
      resolveWorktreePath(`D:worktrees\\${placeholder("branch")}`, {
        repoPath: "C:\\src\\repo",
        branch: "feature",
        homeDir: "C:\\Users\\dev",
        platform: "win32",
        cwd: "C:\\Users\\dev"
      })
    ).toBe("D:\\worktrees\\feature");
  });

  it("keeps a same-drive relative template under the repository (TC-022)", () => {
    // Case: TC-022
    expect(
      resolveWorktreePath(`C:worktrees\\${placeholder("branch")}`, {
        repoPath: "C:\\src\\repo",
        branch: "feature",
        homeDir: "C:\\Users\\dev",
        platform: "win32",
        cwd: "C:\\Users\\dev"
      })
    ).toBe("C:\\src\\repo\\worktrees\\feature");
  });

  it("matches a drive working directory without regard to letter case (TC-023)", () => {
    // Case: TC-023
    expect(
      resolveWorktreePath(`d:worktrees\\${placeholder("branch")}`, {
        repoPath: "C:\\src\\repo",
        branch: "feature",
        homeDir: "C:\\Users\\dev",
        platform: "win32",
        cwd: "C:\\Users\\dev",
        driveCwd: { "D:": "D:\\work\\current" }
      })
    ).toBe("d:\\work\\current\\worktrees\\feature");
  });

  it("uses win32 rules when the repository path is a drive path and platform is omitted (TC-024)", () => {
    // Case: TC-024
    expect(
      resolveWorktreePath(DEFAULT_WORKTREE_PATH_TEMPLATE, {
        repoPath: "C:\\src\\api",
        branch: "hotfix",
        homeDir: "C:\\Users\\dev"
      })
    ).toBe("C:\\src\\api-hotfix");
  });

  it.each(["posix", "win32"] as WorktreePathPlatform[])(
    "agrees with Node %s path for a mixed-separator default expansion (TC-025)",
    (platform) => {
      // Case: TC-025
      const pathApi = platform === "win32" ? nodePath.win32 : nodePath.posix;
      const vars: WorktreePathVars = {
        repoPath: platform === "win32" ? "C:/src/api" : "/src/api",
        branch: "feat/a b",
        homeDir: platform === "win32" ? "C:/Users/dev" : "/Users/dev",
        platform
      };
      expect(resolveWorktreePath(DEFAULT_WORKTREE_PATH_TEMPLATE, vars)).toBe(
        referenceResolve(DEFAULT_WORKTREE_PATH_TEMPLATE, vars, pathApi)
      );
    }
  );
});
