import type { GitCommitNode } from "../src/types";
import { UNCOMMITTED_CHANGES_HASH } from "../src/types";

/** Mode values double as translation keys for the UI labels. */
export enum PathHighlightMode {
  Direct = "Direct parents and children",
  AncestorsAndDescendants = "Ancestors and descendants",
  FirstParent = "First-parent ancestors",
  AllAncestors = "All ancestors"
}

export type CommitPathMode =
  | PathHighlightMode.Direct
  | PathHighlightMode.AncestorsAndDescendants
  | PathHighlightMode.FirstParent;

export type BranchPathMode = PathHighlightMode.AllAncestors | PathHighlightMode.FirstParent;

export type PathHighlightSelection = Readonly<{
  repo: string;
  hash: string;
  name: string;
}> &
  (
    | Readonly<{ kind: "commit"; mode: CommitPathMode }>
    | Readonly<{ kind: "branch"; refType: "head" | "remote"; mode: BranchPathMode }>
  );

export interface PathBoundary {
  readonly childHash: string;
  readonly parentHash: string;
}

export interface PathHighlightResult {
  readonly targetFound: boolean;
  readonly hashes: ReadonlySet<string>;
  readonly edgeKeys: ReadonlySet<string>;
  readonly boundaries: readonly PathBoundary[];
}

/** Position of the first parent in the original `parentHashes` array. */
const FIRST_PARENT_INDEX = 0;

const NO_NEIGHBORS: readonly string[] = [];

interface LoadedHistory {
  /** Normal commits (no working tree row, no stash row) keyed by full hash. */
  readonly loaded: ReadonlyMap<string, GitCommitNode>;
  /** Every row hash in the input, including excluded pseudo rows. */
  readonly known: ReadonlySet<string>;
  /** Parent hash -> hashes of the normal commits that list it as a parent. */
  readonly children: ReadonlyMap<string, readonly string[]>;
}

interface Walk {
  readonly visited: ReadonlySet<string>;
  readonly edgeKeys: ReadonlySet<string>;
}

export function pathEdgeKey(childHash: string, parentHash: string): string {
  return JSON.stringify([childHash, parentHash]);
}

export function computePathHighlight(
  commits: readonly GitCommitNode[],
  targetHash: string,
  mode: PathHighlightMode
): PathHighlightResult {
  const history = indexHistory(commits);
  if (!history.loaded.has(targetHash)) {
    return { targetFound: false, hashes: new Set(), edgeKeys: new Set(), boundaries: [] };
  }

  const expand = mode !== PathHighlightMode.Direct;
  const ancestors = traverse(
    targetHash,
    (hash) => loadedParentsOf(history, hash, mode),
    (vertex, parentHash) => pathEdgeKey(vertex, parentHash),
    expand
  );
  const descendants = includesDescendants(mode)
    ? traverse(
        targetHash,
        (hash) => history.children.get(hash) ?? NO_NEIGHBORS,
        (vertex, childHash) => pathEdgeKey(childHash, vertex),
        expand
      )
    : null;

  // Direct mode examines only the target's own parents, not the parents of its direct parents.
  const examined = expand ? ancestors.visited : new Set([targetHash]);
  return {
    targetFound: true,
    hashes: new Set([...ancestors.visited, ...(descendants?.visited ?? [])]),
    edgeKeys: new Set([...ancestors.edgeKeys, ...(descendants?.edgeKeys ?? [])]),
    boundaries: collectBoundaries(commits, history, examined, mode)
  };
}

function isNormalCommit(commit: GitCommitNode): boolean {
  return commit.hash !== UNCOMMITTED_CHANGES_HASH && commit.stash === null;
}

function includesDescendants(mode: PathHighlightMode): boolean {
  return mode === PathHighlightMode.Direct || mode === PathHighlightMode.AncestorsAndDescendants;
}

/** Parents the mode follows, taken from the original order before any filtering. */
function followedParents(commit: GitCommitNode, mode: PathHighlightMode): readonly string[] {
  if (mode !== PathHighlightMode.FirstParent) {
    return commit.parentHashes;
  }
  return commit.parentHashes.length > FIRST_PARENT_INDEX
    ? [commit.parentHashes[FIRST_PARENT_INDEX]]
    : NO_NEIGHBORS;
}

function indexHistory(commits: readonly GitCommitNode[]): LoadedHistory {
  const loaded = new Map<string, GitCommitNode>();
  const known = new Set<string>();
  for (const commit of commits) {
    known.add(commit.hash);
    if (isNormalCommit(commit)) {
      loaded.set(commit.hash, commit);
    }
  }

  const children = new Map<string, string[]>();
  for (const commit of loaded.values()) {
    for (const parentHash of commit.parentHashes) {
      const siblings = children.get(parentHash);
      if (siblings) {
        siblings.push(commit.hash);
      } else {
        children.set(parentHash, [commit.hash]);
      }
    }
  }

  return { loaded, known, children };
}

function loadedParentsOf(
  history: LoadedHistory,
  hash: string,
  mode: PathHighlightMode
): readonly string[] {
  const commit = history.loaded.get(hash);
  if (!commit) {
    return NO_NEIGHBORS;
  }
  return followedParents(commit, mode).filter((parentHash) => history.loaded.has(parentHash));
}

/**
 * Iterative depth-first walk over loaded normal commits. With `expand` false only the
 * start vertex is expanded, which yields its direct neighbours.
 */
function traverse(
  start: string,
  neighborsOf: (hash: string) => readonly string[],
  keyOf: (vertex: string, neighbor: string) => string,
  expand: boolean
): Walk {
  const visited = new Set<string>([start]);
  const edgeKeys = new Set<string>();
  const stack: string[] = [start];
  while (stack.length > 0) {
    const hash = stack.pop();
    if (hash === undefined) {
      break;
    }
    for (const neighbor of neighborsOf(hash)) {
      edgeKeys.add(keyOf(hash, neighbor));
      if (visited.has(neighbor)) {
        continue;
      }
      visited.add(neighbor);
      if (expand) {
        stack.push(neighbor);
      }
    }
  }
  return { visited, edgeKeys };
}

/**
 * Lists unloaded parents of the vertices reached in the ancestor direction, in display
 * order of the child and original parent order. Parents that are excluded pseudo rows are
 * present in the input and therefore not boundaries.
 */
function collectBoundaries(
  commits: readonly GitCommitNode[],
  history: LoadedHistory,
  examined: ReadonlySet<string>,
  mode: PathHighlightMode
): PathBoundary[] {
  const seen = new Set<string>();
  const boundaries: PathBoundary[] = [];
  for (const commit of commits) {
    if (!examined.has(commit.hash)) {
      continue;
    }
    for (const parentHash of followedParents(commit, mode)) {
      const key = pathEdgeKey(commit.hash, parentHash);
      if (history.known.has(parentHash) || seen.has(key)) {
        continue;
      }
      seen.add(key);
      boundaries.push({ childHash: commit.hash, parentHash });
    }
  }
  return boundaries;
}
