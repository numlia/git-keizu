// Generated from docs/testing/perspectives/src/gitExecutable-test.md.
import * as cp from "node:child_process";
import { EventEmitter } from "node:events";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
  spawn: vi.fn()
}));

import { resolveGitExecutable } from "../../src/gitExecutable";

const GIT_VERSION_ARGS = ["--version"];
const FALLBACK_GIT = "git";
const SUCCESS_EXIT_CODE = 0;
const FAILURE_EXIT_CODE = 1;

type ProbeBehaviour = { kind: "exit"; code: number } | { kind: "error" };

function createMockProcess(behaviour: ProbeBehaviour): cp.ChildProcess {
  const proc = new EventEmitter();
  queueMicrotask(() => {
    if (behaviour.kind === "error") {
      proc.emit("error", new Error("spawn ENOENT"));
      return;
    }
    proc.emit("exit", behaviour.code);
  });
  return proc as unknown as cp.ChildProcess;
}

function setupSpawnBehaviours(behaviours: Record<string, ProbeBehaviour>): void {
  const mock = cp.spawn as unknown as ReturnType<typeof vi.fn>;
  mock.mockImplementation((command: unknown) => {
    const behaviour = behaviours[command as string];
    if (behaviour === undefined) {
      throw new Error(`Unexpected spawn command: ${String(command)}`);
    }
    return createMockProcess(behaviour);
  });
}

function spawnedCommands(): string[] {
  const mock = cp.spawn as unknown as ReturnType<typeof vi.fn>;
  return mock.mock.calls.map((call) => call[0] as string);
}

describe("resolveGitExecutable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves the first candidate when its probe exits 0 (TC-001)", async () => {
    // Given: a single candidate whose --version probe exits 0
    setupSpawnBehaviours({ "/usr/bin/git": { kind: "exit", code: SUCCESS_EXIT_CODE } });

    // When: resolveGitExecutable is called with that candidate
    const result = await resolveGitExecutable(["/usr/bin/git"]);

    // Then: the candidate is returned and spawn is called exactly once with ("/usr/bin/git", ["--version"])
    expect(result).toBe("/usr/bin/git");
    expect(cp.spawn).toHaveBeenCalledTimes(1);
    expect(cp.spawn).toHaveBeenCalledWith("/usr/bin/git", GIT_VERSION_ARGS);
  });

  it("moves on to the next candidate when spawn emits an error event (TC-002)", async () => {
    // Given: the first candidate fails with a spawn "error" event (ENOENT) and the second exits 0
    setupSpawnBehaviours({
      "/bad/git": { kind: "error" },
      "/usr/bin/git": { kind: "exit", code: SUCCESS_EXIT_CODE }
    });

    // When: resolveGitExecutable is called with both candidates
    const result = await resolveGitExecutable(["/bad/git", "/usr/bin/git"]);

    // Then: the second candidate is returned and spawn probed the candidates in order
    expect(result).toBe("/usr/bin/git");
    expect(cp.spawn).toHaveBeenCalledTimes(2);
    expect(spawnedCommands()).toEqual(["/bad/git", "/usr/bin/git"]);
  });

  it("moves on to the next candidate when the probe exits non-zero (TC-003)", async () => {
    // Given: the first candidate exits 1 and the second exits 0
    setupSpawnBehaviours({
      "/old/git": { kind: "exit", code: FAILURE_EXIT_CODE },
      "/usr/bin/git": { kind: "exit", code: SUCCESS_EXIT_CODE }
    });

    // When: resolveGitExecutable is called with both candidates
    const result = await resolveGitExecutable(["/old/git", "/usr/bin/git"]);

    // Then: the promise resolves (no rejection on exit 1) to the second candidate after two probes
    expect(result).toBe("/usr/bin/git");
    expect(cp.spawn).toHaveBeenCalledTimes(2);
    expect(spawnedCommands()).toEqual(["/old/git", "/usr/bin/git"]);
  });

  it("probes git directly when the candidate list is empty (TC-004)", async () => {
    // Given: an empty candidate list and a git probe that exits 0
    setupSpawnBehaviours({ [FALLBACK_GIT]: { kind: "exit", code: SUCCESS_EXIT_CODE } });

    // When: resolveGitExecutable is called with []
    const result = await resolveGitExecutable([]);

    // Then: spawn is called exactly once with ("git", ["--version"]) and "git" is returned
    expect(cp.spawn).toHaveBeenCalledTimes(1);
    expect(cp.spawn).toHaveBeenCalledWith(FALLBACK_GIT, GIT_VERSION_ARGS);
    expect(result).toBe(FALLBACK_GIT);
  });

  it("falls back to git without rejecting when every probe fails (TC-005)", async () => {
    // Given: both candidates and the final git probe all fail with spawn errors
    setupSpawnBehaviours({
      "/bad1": { kind: "error" },
      "/bad2": { kind: "error" },
      [FALLBACK_GIT]: { kind: "error" }
    });

    // When: resolveGitExecutable is called with the failing candidates
    const result = await resolveGitExecutable(["/bad1", "/bad2"]);

    // Then: spawn probed "/bad1" -> "/bad2" -> "git" and the promise resolves to "git"
    expect(cp.spawn).toHaveBeenCalledTimes(3);
    expect(spawnedCommands()).toEqual(["/bad1", "/bad2", FALLBACK_GIT]);
    expect(result).toBe(FALLBACK_GIT);
  });

  it("skips structurally invalid empty-string candidates without probing them (TC-006)", async () => {
    // Given: an empty-string candidate followed by a valid candidate that exits 0
    setupSpawnBehaviours({ "/usr/bin/git": { kind: "exit", code: SUCCESS_EXIT_CODE } });

    // When: resolveGitExecutable is called with ["", "/usr/bin/git"]
    const result = await resolveGitExecutable(["", "/usr/bin/git"]);

    // Then: spawn is never called with "" and only probes "/usr/bin/git" once, which is returned
    expect(cp.spawn).toHaveBeenCalledTimes(1);
    expect(cp.spawn).not.toHaveBeenCalledWith("", GIT_VERSION_ARGS);
    expect(cp.spawn).toHaveBeenCalledWith("/usr/bin/git", GIT_VERSION_ARGS);
    expect(result).toBe("/usr/bin/git");
  });
});
