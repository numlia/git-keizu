import type { WorktreeCollection } from "../src/types";
import { resolveWorktreePath } from "../src/worktreePath";

/**
 * Absolute path of the main worktree in a `git worktree list` result.
 * Linked worktrees are ignored. Returns null when the list has no main entry
 * (for example a bare repository, whose checkout path is already the anchor).
 */
export function mainWorktreePath(worktrees: WorktreeCollection): string | null {
  for (const entry of Object.values(worktrees.branches)) {
    if (entry.isMain) {
      return entry.path;
    }
  }
  for (const entry of worktrees.detached) {
    if (entry.isMain) {
      return entry.path;
    }
  }
  return null;
}

/** Suggested create-worktree path for the repository, from the current view settings. */
export function suggestedWorktreePath(repo: string, branch: string): string {
  const settings = viewState.worktreePath;
  const main = viewState.mainWorktreePaths?.[repo];
  return resolveWorktreePath(settings?.template ?? "", {
    repoPath: main !== undefined && main !== "" ? main : repo,
    branch,
    homeDir: settings?.homeDir ?? "",
    platform: settings?.platform,
    cwd: settings?.cwd,
    driveCwd: settings?.driveCwd
  });
}
