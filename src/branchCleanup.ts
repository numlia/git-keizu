import type {
  BranchCleanupAheadBehind,
  BranchCleanupAncestry,
  BranchCleanupLastCommit,
  BranchCleanupRow,
  BranchCleanupTreeDifference,
  BranchCleanupUpstream,
  BranchCleanupWorktree,
  WorktreeCollection
} from "./types";
import { isValidCommitHash } from "./utils";

const eolRegex = /\r\n|\r|\n/g;
const FIELD_SEPARATOR = "\0";
const FORMAT_FIELD_SEPARATOR = "%00";
const REFS_HEADS_PREFIX = "refs/heads/";
const REFS_REMOTES_PREFIX = "refs/remotes/";
const ORIGIN_HEAD_REFNAME = "refs/remotes/origin/HEAD";
const ORIGIN_REMOTE_REF_PREFIX = "refs/remotes/origin/";
const UPSTREAM_GONE_TRACK = "[gone]";
const CURRENT_HEAD_MARK = "*";
const NOT_CURRENT_HEAD_MARK = " ";
const DECIMAL_DIGITS_PATTERN = /^\d+$/;
const AHEAD_BEHIND_SEPARATOR = "\t";
const FALLBACK_BRANCH_MAIN = "main";
const FALLBACK_BRANCH_MASTER = "master";

/**
 * Field indices of one NUL-separated `for-each-ref refs/heads` record. The
 * order must match BRANCH_SNAPSHOT_FORMAT_ATOMS below (all atoms exist in
 * Git 2.32).
 */
const SNAPSHOT_FIELD = {
  REFNAME: 0,
  HEAD: 1,
  UPSTREAM: 2,
  UPSTREAM_TRACK: 3,
  COMMITTER_DATE: 4,
  OBJECT_NAME: 5,
  TREE: 6
} as const;
const BRANCH_SNAPSHOT_FORMAT_ATOMS = [
  "%(refname)",
  "%(HEAD)",
  "%(upstream)",
  "%(upstream:track)",
  "%(committerdate:unix)",
  "%(objectname)",
  "%(tree)"
];
export const BRANCH_SNAPSHOT_FIELD_COUNT = BRANCH_SNAPSHOT_FORMAT_ATOMS.length;
export const BRANCH_SNAPSHOT_FORMAT = BRANCH_SNAPSHOT_FORMAT_ATOMS.join(FORMAT_FIELD_SEPARATOR);

/**
 * Field indices of one NUL-separated `for-each-ref refs/remotes` record. The
 * %(symref) field is only non-empty on symbolic refs such as origin/HEAD.
 */
const REMOTE_REF_FIELD = {
  REFNAME: 0,
  SYMREF: 1
} as const;
const REMOTE_REFS_FORMAT_ATOMS = ["%(refname)", "%(symref)"];
export const REMOTE_REFS_FIELD_COUNT = REMOTE_REFS_FORMAT_ATOMS.length;
export const REMOTE_REFS_FORMAT = REMOTE_REFS_FORMAT_ATOMS.join(FORMAT_FIELD_SEPARATOR);

/**
 * Field indices of the `rev-list --left-right --count` output line
 * ("left<TAB>right"): left counts commits only on the compare side (= behind),
 * right counts commits only on the branch side (= ahead).
 */
const AHEAD_BEHIND_FIELD = {
  LEFT_BEHIND: 0,
  RIGHT_AHEAD: 1
} as const;
const AHEAD_BEHIND_FIELD_COUNT = 2;

/**
 * One local branch of the immutable snapshot taken by a single `for-each-ref
 * refs/heads` run. Facts that failed validation are already mapped to
 * null / unknown here, so later stages never see a raw invalid value.
 */
export interface BranchSnapshotEntry {
  readonly branchName: string;
  readonly isCurrent: boolean | null;
  readonly commitOid: string | null;
  readonly treeOid: string | null;
  readonly upstream: BranchCleanupUpstream;
  readonly lastCommit: BranchCleanupLastCommit;
}

function parseSafeNonNegativeInteger(value: string): number | null {
  if (!DECIMAL_DIGITS_PATTERN.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseIsCurrent(headMark: string): boolean | null {
  if (headMark === CURRENT_HEAD_MARK) return true;
  if (headMark === NOT_CURRENT_HEAD_MARK || headMark === "") return false;
  return null;
}

function parseUpstream(upstreamRef: string, track: string): BranchCleanupUpstream {
  if (upstreamRef === "") return { kind: "unset" };
  let name: string | null = null;
  if (upstreamRef.startsWith(REFS_REMOTES_PREFIX)) {
    name = upstreamRef.substring(REFS_REMOTES_PREFIX.length);
  } else if (upstreamRef.startsWith(REFS_HEADS_PREFIX)) {
    name = upstreamRef.substring(REFS_HEADS_PREFIX.length);
  }
  if (name === null || name === "") return { kind: "unknown" };
  return track === UPSTREAM_GONE_TRACK ? { kind: "gone", name } : { kind: "present", name };
}

/**
 * Parse the NUL-separated `for-each-ref refs/heads` output into snapshot
 * entries, preserving the --sort=refname order. A record whose refname cannot
 * identify a local branch (wrong prefix, wrong field count) is dropped on its
 * own; an invalid commit / tree / date / HEAD / upstream field only degrades
 * that single fact to null / unknown.
 */
export function parseBranchSnapshot(stdout: string): BranchSnapshotEntry[] {
  const entries: BranchSnapshotEntry[] = [];
  const lines = stdout.split(eolRegex);
  for (const line of lines) {
    if (line === "") continue;
    const fields = line.split(FIELD_SEPARATOR);
    if (fields.length !== BRANCH_SNAPSHOT_FIELD_COUNT) continue;
    const refname = fields[SNAPSHOT_FIELD.REFNAME];
    if (!refname.startsWith(REFS_HEADS_PREFIX)) continue;
    const branchName = refname.substring(REFS_HEADS_PREFIX.length);
    if (branchName === "") continue;
    const commitOid = fields[SNAPSHOT_FIELD.OBJECT_NAME];
    const treeOid = fields[SNAPSHOT_FIELD.TREE];
    const unixSeconds = parseSafeNonNegativeInteger(fields[SNAPSHOT_FIELD.COMMITTER_DATE]);
    entries.push({
      branchName,
      isCurrent: parseIsCurrent(fields[SNAPSHOT_FIELD.HEAD]),
      commitOid: isValidCommitHash(commitOid) ? commitOid : null,
      treeOid: isValidCommitHash(treeOid) ? treeOid : null,
      upstream: parseUpstream(
        fields[SNAPSHOT_FIELD.UPSTREAM],
        fields[SNAPSHOT_FIELD.UPSTREAM_TRACK]
      ),
      lastCommit: unixSeconds === null ? { kind: "unknown" } : { kind: "known", unixSeconds }
    });
  }
  return entries;
}

/**
 * Extract the full refnames from the NUL-separated `for-each-ref refs/remotes`
 * output. The names are kept as full refs so that callers can only match them
 * exactly (never by splitting on slashes).
 */
export function parseRemoteRefNames(stdout: string): string[] {
  const refNames: string[] = [];
  for (const line of stdout.split(eolRegex)) {
    if (line === "") continue;
    const fields = line.split(FIELD_SEPARATOR);
    if (fields.length !== REMOTE_REFS_FIELD_COUNT) continue;
    const refname = fields[REMOTE_REF_FIELD.REFNAME];
    if (refname.startsWith(REFS_REMOTES_PREFIX)) refNames.push(refname);
  }
  return refNames;
}

/**
 * Extract the local branch name that origin/HEAD points at from the same
 * `for-each-ref refs/remotes` output, or null when origin/HEAD is absent or
 * does not point into origin. The returned name still has to be matched
 * against the local snapshot before its OID may be used.
 */
export function parseOriginHeadTarget(stdout: string): string | null {
  for (const line of stdout.split(eolRegex)) {
    if (line === "") continue;
    const fields = line.split(FIELD_SEPARATOR);
    if (fields.length !== REMOTE_REFS_FIELD_COUNT) continue;
    if (fields[REMOTE_REF_FIELD.REFNAME] !== ORIGIN_HEAD_REFNAME) continue;
    const symref = fields[REMOTE_REF_FIELD.SYMREF];
    if (!symref.startsWith(ORIGIN_REMOTE_REF_PREFIX)) return null;
    const target = symref.substring(ORIGIN_REMOTE_REF_PREFIX.length);
    return target === "" ? null : target;
  }
  return null;
}

/**
 * Parse the `rev-list --left-right --count` output. Malformed output and
 * counts beyond Number.MAX_SAFE_INTEGER become unknown instead of a lossy
 * number.
 */
export function parseAheadBehind(stdout: string): BranchCleanupAheadBehind {
  const line = stdout.split(eolRegex)[0] ?? "";
  const fields = line.split(AHEAD_BEHIND_SEPARATOR);
  if (fields.length !== AHEAD_BEHIND_FIELD_COUNT) return { kind: "unknown" };
  const behind = parseSafeNonNegativeInteger(fields[AHEAD_BEHIND_FIELD.LEFT_BEHIND]);
  const ahead = parseSafeNonNegativeInteger(fields[AHEAD_BEHIND_FIELD.RIGHT_AHEAD]);
  if (behind === null || ahead === null) return { kind: "unknown" };
  return { kind: "known", ahead, behind };
}

/**
 * Ancestry is decided by the right-hand rev-list count alone: the compare
 * target advancing (behind > 0) never disproves ancestry, while a squash that
 * reproduces the same tree still leaves ahead > 0.
 */
export function deriveAncestry(aheadBehind: BranchCleanupAheadBehind): BranchCleanupAncestry {
  if (aheadBehind.kind === "known") {
    return aheadBehind.ahead === 0 ? "ancestor" : "notAncestor";
  }
  return aheadBehind.kind;
}

/**
 * Resolve the comparison target on the already-taken snapshot only: a name is
 * used solely through its exact snapshot match, so a vanished requested branch
 * falls back to origin/HEAD -> main -> master -> current without ever turning
 * the requested string into a revspec. Returns null when nothing matches
 * (e.g. detached HEAD with none of the fallbacks present).
 */
export function resolveCompareBranch(
  entries: readonly BranchSnapshotEntry[],
  originHeadTarget: string | null,
  requested: string | null
): BranchSnapshotEntry | null {
  const findByName = (name: string | null): BranchSnapshotEntry | undefined =>
    name === null ? undefined : entries.find((entry) => entry.branchName === name);
  return (
    findByName(requested) ??
    findByName(originHeadTarget) ??
    findByName(FALLBACK_BRANCH_MAIN) ??
    findByName(FALLBACK_BRANCH_MASTER) ??
    entries.find((entry) => entry.isCurrent === true) ??
    null
  );
}

/**
 * Collect the remotes that carry this branch by exact full-ref comparison
 * (refs/remotes/<remoteName>/<branchName>). Remote names may themselves
 * contain slashes, so the refs are never split to find the remote part.
 */
export function matchRemoteRefs(
  branchName: string,
  remoteNames: readonly string[],
  remoteRefs: readonly string[]
): string[] {
  const refSet = new Set(remoteRefs);
  return remoteNames.filter((remoteName) =>
    refSet.has(`${REFS_REMOTES_PREFIX}${remoteName}/${branchName}`)
  );
}

function synthesizeComparisonFacts(
  entry: BranchSnapshotEntry,
  compare: BranchSnapshotEntry | null,
  comparisons: ReadonlyMap<string, BranchCleanupAheadBehind>
): Pick<BranchCleanupRow, "ancestry" | "aheadBehind" | "treeDifference"> {
  if (compare === null) {
    return {
      ancestry: "notSelected",
      aheadBehind: { kind: "notSelected" },
      treeDifference: "notSelected"
    };
  }
  const aheadBehind = comparisons.get(entry.branchName) ?? { kind: "unknown" as const };
  return {
    ancestry: deriveAncestry(aheadBehind),
    aheadBehind,
    treeDifference: synthesizeTreeDifference(entry, compare)
  };
}

function synthesizeTreeDifference(
  entry: BranchSnapshotEntry,
  compare: BranchSnapshotEntry
): BranchCleanupTreeDifference {
  if (compare.treeOid === null || entry.treeOid === null) return "unknown";
  return compare.treeOid === entry.treeOid ? "same" : "different";
}

function synthesizeWorktreeFact(
  branchName: string,
  worktrees: WorktreeCollection | null
): BranchCleanupWorktree {
  if (worktrees === null) return { kind: "unknown" };
  const info = worktrees.branches[branchName];
  if (info === undefined) return { kind: "unused" };
  return { kind: "used", path: info.path, isMain: info.isMain };
}

/**
 * Combine the snapshot with the independently collected facts into rows,
 * keeping the snapshot order. A null worktrees / remoteNames / remoteRefs
 * input represents a failed collection and stays visible as unknown / null on
 * every row instead of collapsing into an empty success. Inputs are not
 * mutated; a new array of new row objects is returned.
 */
export function synthesizeRows(
  entries: readonly BranchSnapshotEntry[],
  compare: BranchSnapshotEntry | null,
  comparisons: ReadonlyMap<string, BranchCleanupAheadBehind>,
  worktrees: WorktreeCollection | null,
  remoteNames: readonly string[] | null,
  remoteRefs: readonly string[] | null
): BranchCleanupRow[] {
  return entries.map((entry) => ({
    branchName: entry.branchName,
    isCurrent: entry.isCurrent,
    ...synthesizeComparisonFacts(entry, compare, comparisons),
    upstream: entry.upstream,
    worktree: synthesizeWorktreeFact(entry.branchName, worktrees),
    lastCommit: entry.lastCommit,
    remotes:
      remoteNames === null || remoteRefs === null
        ? null
        : matchRemoteRefs(entry.branchName, remoteNames, remoteRefs)
  }));
}
