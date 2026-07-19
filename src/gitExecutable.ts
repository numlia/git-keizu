import { spawn } from "node:child_process";

const GIT_VERSION_ARGS: readonly string[] = ["--version"];
const SUCCESS_EXIT_CODE = 0;

export const DEFAULT_GIT_PATH = "git";

function isProbeableCandidate(candidate: string): boolean {
  return candidate !== "";
}

function probeGitExecutable(candidate: string): Promise<boolean> {
  return new Promise((resolve) => {
    const gitProcess = spawn(candidate, [...GIT_VERSION_ARGS]);
    gitProcess.on("error", () => resolve(false));
    gitProcess.on("exit", (code) => resolve(code === SUCCESS_EXIT_CODE));
  });
}

/**
 * Resolve the Git executable by probing each candidate in order with `--version`.
 * A candidate failing to spawn or exiting non-zero moves on to the next candidate.
 * When no candidate succeeds (or none is given), `git` is probed as the final
 * fallback and returned even if that probe fails, preserving the existing
 * no-Git error path instead of rejecting.
 */
export async function resolveGitExecutable(candidates: string[]): Promise<string> {
  for (const candidate of candidates) {
    if (!isProbeableCandidate(candidate)) continue;
    if (await probeGitExecutable(candidate)) return candidate;
  }
  await probeGitExecutable(DEFAULT_GIT_PATH);
  return DEFAULT_GIT_PATH;
}
