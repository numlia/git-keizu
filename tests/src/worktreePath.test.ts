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

describe("sanitizeBranchForPath", () => {
  it("keeps a plain branch name unchanged", () => {
    expect(sanitizeBranchForPath("hotfix")).toBe("hotfix");
  });

  it("flattens slashes so a namespaced branch stays one directory", () => {
    expect(sanitizeBranchForPath("feat/DATA-123-add-page")).toBe("feat-DATA-123-add-page");
  });

  it("flattens backslashes too", () => {
    expect(sanitizeBranchForPath("feat\\win")).toBe("feat-win");
  });

  it("collapses runs of separators into one", () => {
    expect(sanitizeBranchForPath("feat//a___b")).toBe("feat-a_b");
  });

  it("strips leading and trailing separators and dots", () => {
    expect(sanitizeBranchForPath("/feat/x/")).toBe("feat-x");
    expect(sanitizeBranchForPath(".hidden.")).toBe("hidden");
  });

  it("replaces characters that are hostile in a path", () => {
    expect(sanitizeBranchForPath("feat:a*b?c")).toBe("feat-a-b-c");
  });

  it("never returns a name that starts with a dash", () => {
    expect(sanitizeBranchForPath("--force")).toBe("force");
  });

  it("falls back to a placeholder when nothing usable is left", () => {
    expect(sanitizeBranchForPath("///")).toBe("worktree");
    expect(sanitizeBranchForPath("")).toBe("worktree");
  });
});

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

  it("places a worktree beside the repo with the default template", () => {
    expectTemplate(DEFAULT_WORKTREE_PATH_TEMPLATE, "hotfix", "/home/dev/repos/api-hotfix");
  });

  it("sanitizes the branch when expanding it into a path", () => {
    expectTemplate(
      DEFAULT_WORKTREE_PATH_TEMPLATE,
      "feat/DATA-123",
      "/home/dev/repos/api-feat-DATA-123"
    );
  });

  it("expands a leading tilde against the home directory", () => {
    expectTemplate(
      `~/.worktrees/${placeholder("repoName")}/${placeholder("branch")}`,
      "feat/x",
      "/home/dev/.worktrees/api/feat-x"
    );
  });

  it("supports the repoPath placeholder for a nested layout", () => {
    expectTemplate(
      `${placeholder("repoPath")}/.worktrees/${placeholder("branch")}`,
      "hotfix",
      "/home/dev/repos/api/.worktrees/hotfix"
    );
  });

  it("resolves a relative template against the repo, not the process cwd", () => {
    expectTemplate(`../side/${placeholder("branch")}`, "hotfix", "/home/dev/repos/side/hotfix");
  });

  it("normalizes away traversal segments", () => {
    expectTemplate(
      `${placeholder("repoPath")}/../../${placeholder("branch")}`,
      "hotfix",
      "/home/dev/hotfix"
    );
  });

  it("leaves an unknown placeholder alone rather than emptying it", () => {
    expectTemplate(
      `${placeholder("repoPath")}/${placeholder("nope")}`,
      "hotfix",
      `/home/dev/repos/api/${placeholder("nope")}`
    );
  });

  it("leaves prototype names such as constructor written out", () => {
    expectTemplate(
      `${placeholder("repoPath")}/${placeholder("constructor")}/${placeholder("toString")}`,
      "hotfix",
      `/home/dev/repos/api/${placeholder("constructor")}/${placeholder("toString")}`
    );
  });

  it("falls back to the default template when the setting is blank", () => {
    expectTemplate("   ", "hotfix", "/home/dev/repos/api-hotfix");
  });

  it("matches Node's win32 path module for the same templates", () => {
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

  it("resolves a drive-relative template on another drive the way Node does", () => {
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

  it("uses a drive working directory for a drive-relative template", () => {
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

  it("uses the drive root when that drive has no working directory", () => {
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

  it("keeps a same-drive relative template under the repository", () => {
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

  it("matches a drive working directory without regard to letter case", () => {
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

  it("uses win32 rules when the repository path is a drive path and platform is omitted", () => {
    expect(
      resolveWorktreePath(DEFAULT_WORKTREE_PATH_TEMPLATE, {
        repoPath: "C:\\src\\api",
        branch: "hotfix",
        homeDir: "C:\\Users\\dev"
      })
    ).toBe("C:\\src\\api-hotfix");
  });

  it.each(["posix", "win32"] as WorktreePathPlatform[])(
    "agrees with Node %s path for a mixed-separator default expansion",
    (platform) => {
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
