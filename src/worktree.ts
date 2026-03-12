import type { WorktreeMap } from "./types";

const REFS_HEADS_PREFIX = "refs/heads/";

/**
 * Parse the output of `git worktree list --porcelain` into a WorktreeMap.
 * Each entry is separated by blank lines. Entries without a `branch` line
 * (detached HEAD, bare) are skipped.
 */
export function parseWorktreeList(stdout: string): WorktreeMap {
  if (stdout === "") {
    return {};
  }

  const result: WorktreeMap = {};
  const entries = stdout.split("\n\n");

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i].trim();
    if (entry === "") continue;

    const lines = entry.split("\n");
    let path = "";
    let branch: string | null = null;

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        path = line.substring("worktree ".length);
      } else if (line.startsWith("branch ")) {
        const fullRef = line.substring("branch ".length);
        branch = fullRef.startsWith(REFS_HEADS_PREFIX)
          ? fullRef.substring(REFS_HEADS_PREFIX.length)
          : fullRef;
      }
      // Unknown fields (HEAD, bare, detached, prunable, locked) are ignored
    }

    if (branch !== null && path !== "") {
      result[branch] = {
        path,
        isMain: i === 0
      };
    }
  }

  return result;
}
