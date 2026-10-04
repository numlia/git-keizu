import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SCRIPT_PATH = path.resolve(__dirname, "../../../scripts/readme-media/make-demo-repo.sh");
const TEMP_ROOT_PREFIX = "make-demo-repo-";
// Generation runs real bash + git for 33 commits, 2 worktrees and a stash. Warm runs take
// under a second, but the first cold run on WSL2 exceeded the 5 s default (measured 2026-10-04).
const GENERATION_TIMEOUT_MS = 30_000;
const USAGE_MESSAGE = "usage: make-demo-repo.sh <base-dir>";
const ENOENT = "ENOENT";

const MAIN_BRANCH = "main";
const DARK_THEME_BRANCH = "feature/dark-theme";
const OFFLINE_MODE_BRANCH = "feature/offline-mode";
const RELEASE_BRANCH = "release/1.2";
const REVIEW_TAG = "v1.1.0";
const MAIN_REF = `refs/heads/${MAIN_BRANCH}`;
const DARK_THEME_REF = `refs/heads/${DARK_THEME_BRANCH}`;

// Expected values come from the specification, not from the generated template.
const EXPECTED_LOCAL_CONFIG: ReadonlyArray<readonly [string, string]> = [
  ["user.name", "Mika Sato"],
  ["user.email", "mika@example.com"],
  ["commit.gpgsign", "false"],
  ["tag.gpgsign", "false"],
  ["remote.origin.url", "https://example.com/trailmap.git"],
  ["remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*"],
  ["branch.main.remote", "origin"],
  ["branch.main.merge", "refs/heads/main"],
  ["branch.release/1.2.remote", "origin"],
  ["branch.release/1.2.merge", "refs/heads/release/1.2"],
  ["branch.feature/offline-mode.remote", "origin"],
  ["branch.feature/offline-mode.merge", "refs/heads/feature/offline-mode"],
  ["branch.feature/dark-theme.remote", "origin"],
  ["branch.feature/dark-theme.merge", "refs/heads/feature/dark-theme"]
];
const EXPECTED_BRANCHES = [
  "backport/1.0",
  "feature/dark-theme",
  "feature/offline-mode",
  "feature/trail-photos",
  "fix/search-debounce",
  "hotfix/gps-drift",
  "main",
  "release/1.2",
  "support/1.1"
];
const EXPECTED_TAGS = ["nightly-0926", "v1.0.0", "v1.1.0", "v1.1.0-rc.2", "v1.2.0-rc.1"];
const EXPECTED_STASH_SUBJECTS = ["On main: WIP: trail difficulty colors"];
const EXPECTED_STASH_FILES = ["src/map.ts"];
const STASHED_LINE = '+export const DIFFICULTY_COLORS = ["#2e7d32", "#f9a825", "#c62828"];';
const EXPECTED_STATUS_LINES = [" M CHANGELOG.md", " M src/map.ts"];
const UNSTAGED_MAP_LINE = "+export const DEFAULT_ZOOM = 12;";
const UNSTAGED_CHANGELOG_LINE = "+- Trail difficulty legend";

interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}

interface WorktreeRecord {
  path: string;
  head: string;
  branch: string | null;
  detached: boolean;
}

interface Fixture {
  root: string;
  env: NodeJS.ProcessEnv;
}

/**
 * Run a command without a shell and collect its output. Rejects only when the
 * process cannot be started; a non-zero exit is returned for the caller to judge.
 */
function run(
  command: string,
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd,
      env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout = `${stdout}${chunk}`;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr = `${stderr}${chunk}`;
    });
    child.on("error", reject);
    child.on("close", (exitCode, signal) => {
      resolve({ stdout, stderr, exitCode, signal });
    });
  });
}

/** Run a read-only git query and return its raw stdout; any failure is a test failure. */
async function git(args: readonly string[], cwd: string, env: NodeJS.ProcessEnv): Promise<string> {
  const result = await run("git", args, cwd, env);
  if (result.exitCode !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed in ${cwd} (exit ${result.exitCode}, signal ${result.signal}): ${result.stderr}`
    );
  }
  return result.stdout;
}

function lines(output: string): string[] {
  return output.split("\n").filter((line) => line !== "");
}

function parseWorktreePorcelain(output: string): WorktreeRecord[] {
  return output
    .split("\n\n")
    .map((block) => lines(block))
    .filter((block) => block.length > 0)
    .map((block) => {
      const field = (name: string): string | null => {
        const match = block.find((line) => line === name || line.startsWith(`${name} `));
        return match === undefined ? null : match.slice(name.length).trim();
      };
      const worktreePath = field("worktree");
      const head = field("HEAD");
      if (worktreePath === null || head === null) {
        throw new Error(`Unexpected worktree record: ${JSON.stringify(block)}`);
      }
      return {
        path: worktreePath,
        head,
        branch: field("branch"),
        detached: field("detached") !== null
      };
    });
}

async function createFixture(): Promise<Fixture> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), TEMP_ROOT_PREFIX));
  const home = path.join(root, "home");
  const xdgConfigHome = path.join(root, "xdg");
  const globalConfig = path.join(root, "gitconfig");
  await fs.mkdir(home);
  await fs.mkdir(xdgConfigHome);
  await fs.writeFile(globalConfig, "");
  const { PATH } = process.env;
  if (PATH === undefined) {
    throw new Error("PATH is not set; bash and git cannot be resolved");
  }
  // Only PATH is inherited, so the user's HOME, global config and GIT_* overrides never leak in.
  const env: NodeJS.ProcessEnv = {
    PATH,
    HOME: home,
    XDG_CONFIG_HOME: xdgConfigHome,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: globalConfig,
    LC_ALL: "C"
  };
  return { root, env };
}

// S1: make-demo-repo.sh demo configuration, generated state, and rejections
// @see docs/testing/perspectives/scripts/readme-media/make-demo-repo-test.md
describe("make-demo-repo.sh", () => {
  let fixture: Fixture;

  beforeEach(async () => {
    fixture = await createFixture();
  });

  afterEach(async () => {
    await fs.rm(fixture.root, { recursive: true, force: true });
  });

  it(
    "preserves demo configuration and generated state",
    async () => {
      // Case: TC-001
      // Given: an absolute BASE_DIR under the temporary root that does not exist yet
      const { root, env } = fixture;
      const baseDir = path.join(root, "demo");
      const repo = path.join(baseDir, "trailmap");
      const darkThemeWorktree = path.join(baseDir, "trailmap-dark-theme");
      const reviewWorktree = path.join(baseDir, "trailmap-review");
      const query = (args: readonly string[], cwd = repo) => git(args, cwd, env);
      const revParse = async (ref: string) => (await query(["rev-parse", ref])).trim();
      const localConfig = async (key: string) =>
        (await query(["config", "--local", "--get", key])).trim();

      // When: the script is run once
      const result = await run("bash", [SCRIPT_PATH, baseDir], root, env);

      // Then: it succeeds and leaves the three worktrees plus the retained template
      expect(result.exitCode).toBe(0);
      expect((await fs.stat(repo)).isDirectory()).toBe(true);
      expect((await fs.stat(darkThemeWorktree)).isDirectory()).toBe(true);
      expect((await fs.stat(reviewWorktree)).isDirectory()).toBe(true);
      expect((await fs.stat(path.join(baseDir, "template", "config"))).isFile()).toBe(true);

      // Then: the 14 local settings match the specification exactly
      for (const [key, value] of EXPECTED_LOCAL_CONFIG) {
        expect(await localConfig(key)).toBe(value);
      }

      // Then: HEAD, branches and tags are the documented set
      expect((await query(["symbolic-ref", "HEAD"])).trim()).toBe(MAIN_REF);
      const branches = lines(
        await query(["for-each-ref", "--format=%(refname:short)", "refs/heads"])
      );
      expect([...branches].sort()).toEqual([...EXPECTED_BRANCHES].sort());
      const tags = lines(await query(["for-each-ref", "--format=%(refname:short)", "refs/tags"]));
      expect([...tags].sort()).toEqual([...EXPECTED_TAGS].sort());

      // Then: remote-tracking refs point at the commits recorded before the final local commits
      expect(await revParse(`refs/remotes/origin/${MAIN_BRANCH}`)).toBe(
        await revParse(`${MAIN_BRANCH}~1`)
      );
      expect(await revParse(`refs/remotes/origin/${OFFLINE_MODE_BRANCH}`)).toBe(
        await revParse(`${OFFLINE_MODE_BRANCH}~1`)
      );
      expect(await revParse(`refs/remotes/origin/${RELEASE_BRANCH}`)).toBe(
        await revParse(RELEASE_BRANCH)
      );
      expect(await revParse(`refs/remotes/origin/${DARK_THEME_BRANCH}`)).toBe(
        await revParse(DARK_THEME_BRANCH)
      );
      expect(await revParse(`origin/${MAIN_BRANCH}`)).not.toBe(await revParse(MAIN_BRANCH));
      expect(await revParse(`origin/${OFFLINE_MODE_BRANCH}`)).not.toBe(
        await revParse(OFFLINE_MODE_BRANCH)
      );

      // Then: the main, linked and detached worktrees are as documented (paths via realpath,
      // because the temporary directory may be reached through a symlink)
      const worktrees = parseWorktreePorcelain(await query(["worktree", "list", "--porcelain"]));
      const actualWorktrees = await Promise.all(
        worktrees.map(async (record) => ({ ...record, path: await fs.realpath(record.path) }))
      );
      const expectedWorktrees: WorktreeRecord[] = [
        {
          path: await fs.realpath(repo),
          head: await revParse(MAIN_BRANCH),
          branch: MAIN_REF,
          detached: false
        },
        {
          path: await fs.realpath(darkThemeWorktree),
          head: await revParse(DARK_THEME_BRANCH),
          branch: DARK_THEME_REF,
          detached: false
        },
        {
          path: await fs.realpath(reviewWorktree),
          head: await revParse(`${REVIEW_TAG}^{commit}`),
          branch: null,
          detached: true
        }
      ];
      const byPath = (a: WorktreeRecord, b: WorktreeRecord) => a.path.localeCompare(b.path);
      expect([...actualWorktrees].sort(byPath)).toEqual([...expectedWorktrees].sort(byPath));
      expect(await query(["status", "--porcelain"], darkThemeWorktree)).toBe("");
      expect(await query(["status", "--porcelain"], reviewWorktree)).toBe("");

      // Then: exactly one stash holds the difficulty colours
      expect(lines(await query(["stash", "list", "--format=%s"]))).toEqual(EXPECTED_STASH_SUBJECTS);
      expect(lines(await query(["stash", "show", "--name-only", "stash@{0}"]))).toEqual(
        EXPECTED_STASH_FILES
      );
      expect(await query(["stash", "show", "-p", "stash@{0}"])).toContain(STASHED_LINE);

      // Then: only the two documented unstaged edits remain and nothing is staged
      const status = lines(await query(["status", "--porcelain"]));
      expect([...status].sort()).toEqual([...EXPECTED_STATUS_LINES].sort());
      const diff = await query(["diff"]);
      expect(diff).toContain(UNSTAGED_MAP_LINE);
      expect(diff).toContain(UNSTAGED_CHANGELOG_LINE);
      expect(await query(["diff", "--cached"])).toBe("");
    },
    GENERATION_TIMEOUT_MS
  );

  it("rejects an existing base directory without changing it", async () => {
    // Case: TC-002
    // Given: BASE_DIR already exists and holds a sentinel file with known bytes
    const { root, env } = fixture;
    const baseDir = path.join(root, "existing");
    const sentinel = path.join(baseDir, "sentinel.txt");
    const sentinelBytes = Buffer.from("sentinel bytes before the run\n", "utf8");
    await fs.mkdir(baseDir);
    await fs.writeFile(sentinel, sentinelBytes);

    // When: the script is run against the existing directory
    const result = await run("bash", [SCRIPT_PATH, baseDir], root, env);

    // Then: it fails, the sentinel is untouched and no template or repository was created
    expect(result.exitCode).not.toBe(0);
    expect(await fs.readFile(sentinel)).toEqual(sentinelBytes);
    await expect(fs.stat(path.join(baseDir, "template"))).rejects.toMatchObject({ code: ENOENT });
    await expect(fs.stat(path.join(baseDir, "trailmap"))).rejects.toMatchObject({ code: ENOENT });
  });

  it("requires a base directory argument", async () => {
    // Case: TC-003
    // Given: an empty isolated working directory
    const { root, env } = fixture;
    const cwd = path.join(root, "cwd");
    await fs.mkdir(cwd);

    // When: the script is run without an argument
    const result = await run("bash", [SCRIPT_PATH], cwd, env);

    // Then: it fails with the usage message and leaves the directory empty
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain(USAGE_MESSAGE);
    expect(await fs.readdir(cwd)).toEqual([]);
  });
});
