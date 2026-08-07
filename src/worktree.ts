import type { DetachedWorktreeInfo, WorktreeCollection, WorktreeMap } from "./types";
import { isValidCommitHash } from "./utils";

const REFS_HEADS_PREFIX = "refs/heads/";
const WORKTREE_FIELD_PREFIX = "worktree ";
const HEAD_FIELD_PREFIX = "HEAD ";
const BRANCH_FIELD_PREFIX = "branch ";
const BARE_FIELD = "bare";
const DETACHED_FIELD = "detached";

/**
 * Parse the output of `git worktree list --porcelain` into a WorktreeCollection.
 * Each entry is separated by blank lines and is classified in the order
 * bare (always excluded), branch, detached. A record that is contradictory,
 * incomplete or carries an invalid HEAD is dropped on its own, so the
 * remaining records are still parsed.
 */
export function parseWorktreeList(stdout: string): WorktreeCollection {
  const branches: WorktreeMap = {};
  const detached: DetachedWorktreeInfo[] = [];

  if (stdout === "") {
    return { branches, detached };
  }

  const entries = stdout.split("\n\n");

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i].trim();
    if (entry === "") continue;

    const lines = entry.split("\n");
    let path = "";
    let head = "";
    let branch: string | null = null;
    let isBare = false;
    let isDetached = false;

    for (const line of lines) {
      if (line.startsWith(WORKTREE_FIELD_PREFIX)) {
        path = line.substring(WORKTREE_FIELD_PREFIX.length);
      } else if (line.startsWith(HEAD_FIELD_PREFIX)) {
        head = line.substring(HEAD_FIELD_PREFIX.length);
      } else if (line.startsWith(BRANCH_FIELD_PREFIX)) {
        const fullRef = line.substring(BRANCH_FIELD_PREFIX.length);
        branch = fullRef.startsWith(REFS_HEADS_PREFIX)
          ? fullRef.substring(REFS_HEADS_PREFIX.length)
          : fullRef;
      } else if (line === BARE_FIELD) {
        isBare = true;
      } else if (line === DETACHED_FIELD) {
        isDetached = true;
      }
      // Unknown fields (prunable, locked) are ignored
    }

    if (isBare || path === "") continue;

    const isMain = i === 0;
    if (branch !== null && branch !== "" && !isDetached) {
      branches[branch] = { path, isMain };
    } else if (branch === null && isDetached && isValidCommitHash(head)) {
      detached.push({ path, isMain, head });
    }
  }

  detached.sort((a, b) => a.path.localeCompare(b.path));

  return { branches, detached };
}
