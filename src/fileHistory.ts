import type { FileHistoryChangeType, FileHistoryEntry } from "./types";
import { isValidCommitHash } from "./utils";

const RECORD_SEPARATOR = "\x1e";
const FIELD_SEPARATOR = "\0";
const ENTRIES_LEAD = "\n";
const PARENT_SEPARATOR = " ";
const LINE_SEPARATOR = "\n";
const PATHSPEC_SEPARATOR = "--";
const EXCLUDE_REVISION_PREFIX = "^";
const RECORD_FORMAT_ARG = "--format=%x1e%H%x00%P%x00";
const LOG_DIFF_ARGS = ["--name-status", "--find-renames", "--diff-filter=AMDR", "-z"];
const STATUS_ADDED = "A";
const STATUS_MODIFIED = "M";
const STATUS_DELETED = "D";
const STATUS_RENAMED = "R";
const RENAME_STATUS_PATTERN = /^R\d{3}$/;
const MERGE_PARENT_MINIMUM = 2;
const PATH_SEPARATOR = "/";
const BACKSLASH_PATTERN = /\\/g;
const DRIVE_LETTER_PATTERN = /^[A-Za-z]:/;
const CURRENT_DIR_COMPONENT = ".";
const PARENT_DIR_COMPONENT = "..";

/**
 * Field indices of one record produced by RECORD_FORMAT_ARG with -z:
 * <hash> NUL <parents> NUL NUL [ LF <entries> ] where the trailing NUL of the
 * last entry leaves an empty final field.
 */
const RECORD_FIELD = {
  HASH: 0,
  PARENTS: 1,
  EMPTY: 2,
  ENTRIES_START: 3
} as const;
const RECORD_FIELD_MINIMUM = RECORD_FIELD.ENTRIES_START;

export interface FileHistoryRecordEntry {
  status: FileHistoryChangeType;
  oldPath: string;
  newPath: string;
}
export interface FileHistoryRecord {
  hash: string;
  parentHashes: string[];
  entries: FileHistoryRecordEntry[];
}
export interface FileHistoryRecordGroup {
  hash: string;
  parentHashes: string[];
  records: FileHistoryRecord[];
}
export interface FileHistoryBoundary {
  hash: string;
  parentHashes: string[];
}
export interface LineageResult {
  entries: FileHistoryEntry[];
  historicalPaths: string[];
  boundary: FileHistoryBoundary | null;
}
export interface MergeResult {
  entries: FileHistoryEntry[];
  birthCandidateHashes: string[];
}
export interface ResolveFileHistoryInput {
  requestedPath: string;
  lineage: LineageResult;
  merge: MergeResult;
  ancestry: Map<string, string[]> | null;
}

/**
 * Normalize a repository-relative path for use as a single pathspec element.
 * Absolute paths, drive letters, `.` / `..` components and the NUL / U+001E
 * bytes used as output separators are rejected with null.
 */
export function normalizeFileHistoryPath(filePath: string): string | null {
  const normalized = filePath.replace(BACKSLASH_PATTERN, PATH_SEPARATOR);
  if (normalized === "") return null;
  if (normalized.startsWith(PATH_SEPARATOR)) return null;
  if (DRIVE_LETTER_PATTERN.test(normalized)) return null;
  if (normalized.includes(FIELD_SEPARATOR) || normalized.includes(RECORD_SEPARATOR)) return null;
  const components = normalized.split(PATH_SEPARATOR);
  if (components.some((c) => c === CURRENT_DIR_COMPONENT || c === PARENT_DIR_COMPONENT)) {
    return null;
  }
  return normalized;
}

export function buildLineageQueryArgs(anchorHash: string, requestedPath: string): string[] {
  return [
    "--literal-pathspecs",
    "log",
    "--topo-order",
    "--follow",
    RECORD_FORMAT_ARG,
    ...LOG_DIFF_ARGS,
    anchorHash,
    PATHSPEC_SEPARATOR,
    requestedPath
  ];
}

export function buildMergeQueryArgs(
  anchorHash: string,
  boundaryHash: string | null,
  historicalPaths: readonly string[]
): string[] {
  const range =
    boundaryHash === null
      ? [anchorHash]
      : [anchorHash, `${EXCLUDE_REVISION_PREFIX}${boundaryHash}`];
  return [
    "--literal-pathspecs",
    "log",
    "--topo-order",
    "--merges",
    "--diff-merges=separate",
    RECORD_FORMAT_ARG,
    ...LOG_DIFF_ARGS,
    ...range,
    PATHSPEC_SEPARATOR,
    ...historicalPaths
  ];
}

export function buildAncestryQueryArgs(
  anchorHash: string,
  boundaryParentHashes: readonly string[]
): string[] {
  return [
    "rev-list",
    "--parents",
    anchorHash,
    ...boundaryParentHashes.map((parent) => `${EXCLUDE_REVISION_PREFIX}${parent}`)
  ];
}

function toSinglePathStatus(status: string): FileHistoryChangeType | null {
  if (status === STATUS_ADDED || status === STATUS_MODIFIED || status === STATUS_DELETED) {
    return status;
  }
  return null;
}

function parseRecordEntries(entryFields: readonly string[]): FileHistoryRecordEntry[] | null {
  if (entryFields.length === 0 || !entryFields[0].startsWith(ENTRIES_LEAD)) return null;
  const tokens = [entryFields[0].substring(ENTRIES_LEAD.length), ...entryFields.slice(1)];
  const entries: FileHistoryRecordEntry[] = [];
  let index = 0;
  while (index < tokens.length) {
    const status = tokens[index];
    const singlePathStatus = toSinglePathStatus(status);
    if (singlePathStatus !== null) {
      const path = tokens[index + 1];
      if (path === undefined || path === "") return null;
      entries.push({ status: singlePathStatus, oldPath: path, newPath: path });
      index += 2;
    } else if (RENAME_STATUS_PATTERN.test(status)) {
      const oldPath = tokens[index + 1];
      const newPath = tokens[index + 2];
      if (oldPath === undefined || oldPath === "" || newPath === undefined || newPath === "") {
        return null;
      }
      entries.push({ status: STATUS_RENAMED, oldPath, newPath });
      index += 3;
    } else {
      return null;
    }
  }
  return entries;
}

function parseRecord(rawRecord: string): FileHistoryRecord | null {
  const fields = rawRecord.split(FIELD_SEPARATOR);
  if (fields.length < RECORD_FIELD_MINIMUM) return null;
  if (fields[RECORD_FIELD.EMPTY] !== "" || fields[fields.length - 1] !== "") return null;
  const hash = fields[RECORD_FIELD.HASH];
  const parentsField = fields[RECORD_FIELD.PARENTS];
  const parentHashes = parentsField === "" ? [] : parentsField.split(PARENT_SEPARATOR);
  if (!isValidCommitHash(hash) || !parentHashes.every((parent) => isValidCommitHash(parent))) {
    return null;
  }
  const entries = parseRecordEntries(fields.slice(RECORD_FIELD.ENTRIES_START, -1));
  if (entries === null) return null;
  return { hash, parentHashes, entries };
}

/**
 * Parse the `--format=%x1e%H%x00%P%x00 --name-status -z` output of the lineage
 * and merge queries. Consecutive records of the same hash (one per parent under
 * `--diff-merges=separate`) are folded into one group in output order. Any
 * malformed record makes the whole result null (no partial results).
 */
export function parseFileHistoryRecords(stdout: string): FileHistoryRecordGroup[] | null {
  if (stdout === "") return [];
  if (!stdout.startsWith(RECORD_SEPARATOR)) return null;
  const groups: FileHistoryRecordGroup[] = [];
  for (const rawRecord of stdout.split(RECORD_SEPARATOR).slice(1)) {
    const record = parseRecord(rawRecord);
    if (record === null) return null;
    const lastIndex = groups.length - 1;
    const last = lastIndex >= 0 ? groups[lastIndex] : null;
    if (last !== null && last.hash === record.hash) {
      groups[lastIndex] = { ...last, records: [...last.records, record] };
    } else {
      groups.push({ hash: record.hash, parentHashes: record.parentHashes, records: [record] });
    }
  }
  return groups;
}

function toBoundary(group: FileHistoryRecordGroup): FileHistoryBoundary {
  return { hash: group.hash, parentHashes: [...group.parentHashes] };
}

function toEntry(
  group: FileHistoryRecordGroup,
  selected: FileHistoryRecordEntry,
  historicalPath: string
): FileHistoryEntry {
  return {
    hash: group.hash,
    parentHashes: [...group.parentHashes],
    type: selected.status,
    oldFilePath: selected.oldPath,
    newFilePath: selected.newPath,
    historicalPath,
    isMerge: group.parentHashes.length >= MERGE_PARENT_MINIMUM
  };
}

function selectLineageEntry(
  record: FileHistoryRecord,
  trackedPath: string
): FileHistoryRecordEntry | null {
  const rename = record.entries.find(
    (entry) => entry.status === STATUS_RENAMED && entry.newPath === trackedPath
  );
  if (rename !== undefined) return rename;
  const other = record.entries.find(
    (entry) => entry.status !== STATUS_RENAMED && entry.newPath === trackedPath
  );
  return other ?? null;
}

/**
 * Walk the lineage query groups (children first, by --topo-order) switching
 * the tracked path at each rename. A deletion outside the anchor commit marks
 * the birth boundary without becoming an entry; a non-merge addition becomes
 * the last entry and the boundary. Returns null when a group has no entry for
 * the tracked path.
 */
export function applyLineageRules(
  groups: readonly FileHistoryRecordGroup[],
  anchorHash: string,
  requestedPath: string
): LineageResult | null {
  const entries: FileHistoryEntry[] = [];
  const historicalPaths: string[] = [requestedPath];
  let trackedPath = requestedPath;
  for (const group of groups) {
    if (group.records.length === 0) return null;
    const selected = selectLineageEntry(group.records[0], trackedPath);
    if (selected === null) return null;
    if (selected.status === STATUS_DELETED && group.hash !== anchorHash) {
      return { entries, historicalPaths, boundary: toBoundary(group) };
    }
    const isRename = selected.status === STATUS_RENAMED;
    const entry = toEntry(group, selected, isRename ? selected.newPath : trackedPath);
    entries.push(entry);
    if (isRename) {
      trackedPath = selected.oldPath;
      historicalPaths.push(selected.oldPath);
    }
    if (selected.status === STATUS_ADDED && !entry.isMerge) {
      return { entries, historicalPaths, boundary: toBoundary(group) };
    }
  }
  return { entries, historicalPaths, boundary: null };
}

/**
 * Fold each `--diff-merges=separate` group into one merge entry chosen from the
 * first record touching a historical path. A group whose every parent record
 * adds the file is a birth-merge candidate. Groups already produced by the
 * lineage query are dropped in favour of the lineage entry.
 */
export function applyMergeRules(
  groups: readonly FileHistoryRecordGroup[],
  historicalPaths: readonly string[],
  lineageHashes: ReadonlySet<string>
): MergeResult | null {
  const pathSet = new Set(historicalPaths);
  const entries: FileHistoryEntry[] = [];
  const birthCandidateHashes: string[] = [];
  for (const group of groups) {
    if (group.parentHashes.length < MERGE_PARENT_MINIMUM) return null;
    const selections = group.records.map(
      (record) => record.entries.find((entry) => pathSet.has(entry.newPath)) ?? null
    );
    const selected = selections.filter((s): s is FileHistoryRecordEntry => s !== null);
    if (selected.length === 0) return null;
    if (lineageHashes.has(group.hash)) continue;
    const isBirth =
      group.records.length === group.parentHashes.length &&
      selected.length === selections.length &&
      selected.every((s) => s.status === STATUS_ADDED);
    entries.push(toEntry(group, selected[0], selected[0].newPath));
    if (isBirth) birthCandidateHashes.push(group.hash);
  }
  return { entries, birthCandidateHashes };
}

/**
 * Parse `rev-list --parents` output into a commit -> parents map. Null when
 * any token is not a commit hash.
 */
export function parseAncestryGraph(stdout: string): Map<string, string[]> | null {
  const graph = new Map<string, string[]>();
  for (const line of stdout.split(LINE_SEPARATOR)) {
    if (line === "") continue;
    const tokens = line.split(PARENT_SEPARATOR);
    if (!tokens.every((token) => isValidCommitHash(token))) return null;
    graph.set(tokens[0], tokens.slice(1));
  }
  return graph;
}

function collectProperAncestors(
  graph: ReadonlyMap<string, readonly string[]>,
  hash: string
): Set<string> {
  const ancestors = new Set<string>();
  const pending: string[] = [...(graph.get(hash) ?? [])];
  for (let index = 0; index < pending.length; index++) {
    const current = pending[index];
    if (ancestors.has(current)) continue;
    ancestors.add(current);
    pending.push(...(graph.get(current) ?? []));
  }
  return ancestors;
}

function isValidBirthCandidate(
  candidate: FileHistoryEntry,
  input: ResolveFileHistoryInput,
  graph: ReadonlyMap<string, readonly string[]>
): boolean {
  if (candidate.historicalPath === input.requestedPath) return true;
  const renames = input.lineage.entries.filter(
    (entry) => entry.type === STATUS_RENAMED && entry.oldFilePath === candidate.historicalPath
  );
  if (renames.length === 0) return false;
  return renames.every((rename) => collectProperAncestors(graph, rename.hash).has(candidate.hash));
}

/**
 * Concatenate lineage and merge entries, then drop every entry that is a
 * proper ancestor of a valid birth-merge candidate (the candidate itself is
 * kept). Without an ancestry graph the concatenation is returned as is.
 */
export function resolveFileHistoryEntries(input: ResolveFileHistoryInput): FileHistoryEntry[] {
  const combined = [...input.lineage.entries, ...input.merge.entries];
  const graph = input.ancestry;
  if (graph === null) return combined;
  const candidateHashes = new Set(input.merge.birthCandidateHashes);
  const excluded = new Set<string>();
  for (const candidate of input.merge.entries) {
    if (!candidateHashes.has(candidate.hash)) continue;
    if (!isValidBirthCandidate(candidate, input, graph)) continue;
    for (const ancestor of collectProperAncestors(graph, candidate.hash)) excluded.add(ancestor);
  }
  return combined.filter((entry) => !excluded.has(entry.hash));
}
