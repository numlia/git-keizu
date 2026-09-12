import { describe, expect, it, vi } from "vitest";

// src/fileHistory.ts imports isValidCommitHash from src/utils.ts, which loads the vscode module.
vi.mock("vscode", () => ({
  env: { clipboard: { writeText: vi.fn() } },
  workspace: { getConfiguration: vi.fn(() => ({ get: vi.fn() })) }
}));

import {
  applyLineageRules,
  applyMergeRules,
  buildAncestryQueryArgs,
  buildLineageQueryArgs,
  buildMergeQueryArgs,
  type FileHistoryRecordEntry,
  type FileHistoryRecordGroup,
  type LineageResult,
  type MergeResult,
  normalizeFileHistoryPath,
  parseAncestryGraph,
  parseFileHistoryRecords,
  resolveFileHistoryEntries
} from "../../src/fileHistory";
import type { FileHistoryEntry } from "../../src/types";

/* ------------------------------------------------------------------ */
/* Constants and helpers                                              */
/* ------------------------------------------------------------------ */

const CUR = "src/current-name.txt";
const LEG = "src/legacy-name.txt";
const F = "src/f.txt";
const OTHER = "src/other.txt";
const RS = "\x1e";
const NUL = "\0";

/** Deterministic 40-hex commit hash from a small integer. */
const H = (n: number): string => n.toString(16).padStart(40, "0");

/** One `--format=%x1e%H%x00%P%x00 --name-status -z` record with the given entries. */
function rec(hash: string, parents: string[], ...entries: string[][]): string {
  const body = entries.map((e) => `${e.join(NUL)}${NUL}`).join("");
  return `${RS}${hash}${NUL}${parents.join(" ")}${NUL}${NUL}\n${body}`;
}

function entryOf(status: string, oldPath: string, newPath = oldPath): FileHistoryRecordEntry {
  return { status: status as FileHistoryRecordEntry["status"], oldPath, newPath };
}

/** Build a record group whose records each hold the given entry lists. */
function group(
  hash: string,
  parentHashes: string[],
  ...recordEntries: FileHistoryRecordEntry[][]
): FileHistoryRecordGroup {
  return {
    hash,
    parentHashes,
    records: recordEntries.map((entries) => ({ hash, parentHashes, entries }))
  };
}

function lineageOf(entries: FileHistoryEntry[], historicalPaths: string[]): LineageResult {
  return { entries, historicalPaths, boundary: null };
}

function mergeOf(entries: FileHistoryEntry[], birthCandidateHashes: string[]): MergeResult {
  return { entries, birthCandidateHashes };
}

function fileEntry(
  hash: string,
  type: FileHistoryEntry["type"],
  historicalPath: string,
  overrides: Partial<FileHistoryEntry> = {}
): FileHistoryEntry {
  return {
    hash,
    parentHashes: [],
    type,
    oldFilePath: historicalPath,
    newFilePath: historicalPath,
    historicalPath,
    isMerge: false,
    ...overrides
  };
}

function graphOf(lines: string[][]): string {
  return `${lines.map((line) => line.join(" ")).join("\n")}\n`;
}

interface Summary {
  hash: string;
  type: string;
  isMerge: boolean;
  historicalPath: string;
}

function summarize(entries: FileHistoryEntry[]): Summary[] {
  return entries.map((e) => ({
    hash: e.hash,
    type: e.type,
    isMerge: e.isMerge,
    historicalPath: e.historicalPath
  }));
}

const S = (hash: string, type: string, isMerge: boolean, historicalPath: string): Summary => ({
  hash,
  type,
  isMerge,
  historicalPath
});

/* ------------------------------------------------------------------ */
/* S1: normalizeFileHistoryPath()                                     */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/src/fileHistory-test.md
describe("normalizeFileHistoryPath (S1)", () => {
  it("replaces backslashes with slashes (TC-001)", () => {
    // Case: TC-001
    // Given: a Windows style path
    // When: the path is normalized
    const result = normalizeFileHistoryPath("src\\a.txt");

    // Then: the separator is converted and the path is accepted
    expect(result).toBe("src/a.txt");
  });

  it("keeps hyphen, space and glob characters (TC-002)", () => {
    // Case: TC-002
    // Given: a path starting with a hyphen and containing space and glob characters
    // When: the path is normalized
    const result = normalizeFileHistoryPath("-weird name *.txt");

    // Then: the path is returned unchanged because it is passed after `--` as one element
    expect(result).toBe("-weird name *.txt");
  });

  it("rejects an empty path (TC-003)", () => {
    // Case: TC-003
    // Given: the empty string
    // When/Then: the result is null
    expect(normalizeFileHistoryPath("")).toBeNull();
  });

  it("rejects an absolute path (TC-004)", () => {
    // Case: TC-004
    // Given: a path starting with `/`
    // When/Then: the result is null
    expect(normalizeFileHistoryPath("/etc/x")).toBeNull();
  });

  it("rejects a drive letter path (TC-005)", () => {
    // Case: TC-005
    // Given: a path starting with `C:`
    // When/Then: the result is null
    expect(normalizeFileHistoryPath("C:/x")).toBeNull();
  });

  it("rejects a parent directory component (TC-006)", () => {
    // Case: TC-006
    // Given: a path containing `..`
    // When/Then: the result is null
    expect(normalizeFileHistoryPath("a/../b")).toBeNull();
  });

  it("rejects a current directory component (TC-007)", () => {
    // Case: TC-007
    // Given: a path starting with `./`
    // When/Then: the result is null
    expect(normalizeFileHistoryPath("./a")).toBeNull();
  });

  it("rejects an embedded NUL byte (TC-008)", () => {
    // Case: TC-008
    // Given: a path containing U+0000, which collides with the -z field separator
    // When/Then: the result is null
    expect(normalizeFileHistoryPath("a\u0000b")).toBeNull();
  });

  it("rejects an embedded record separator (TC-009)", () => {
    // Case: TC-009
    // Given: a path containing U+001E, which collides with the %x1e record separator
    // When/Then: the result is null
    expect(normalizeFileHistoryPath("a\u001eb")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* S2: build*QueryArgs()                                              */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/src/fileHistory-test.md
describe("buildLineageQueryArgs / buildMergeQueryArgs / buildAncestryQueryArgs (S2)", () => {
  it("builds the exact lineage query args (TC-010)", () => {
    // Case: TC-010
    // Given: an anchor hash and a requested path
    // When: the lineage args are built
    const args = buildLineageQueryArgs("abc123", "src/a.txt");

    // Then: the argument array matches the contract exactly
    expect(args).toEqual([
      "--literal-pathspecs",
      "log",
      "--topo-order",
      "--follow",
      "--format=%x1e%H%x00%P%x00",
      "--name-status",
      "--find-renames",
      "--diff-filter=AMDR",
      "-z",
      "abc123",
      "--",
      "src/a.txt"
    ]);
  });

  it("keeps a hyphen / space / glob path as one unquoted trailing element (TC-011)", () => {
    // Case: TC-011
    // Given: a path that would be misparsed by a shell
    // When: the lineage args are built
    const args = buildLineageQueryArgs("abc123", "-weird name *.txt");

    // Then: the path is the single element after `--` with no quoting
    expect(args.slice(-3)).toEqual(["abc123", "--", "-weird name *.txt"]);
  });

  it("builds merge args without a boundary exclusion (TC-012)", () => {
    // Case: TC-012
    // Given: no birth boundary and two historical paths
    // When: the merge args are built
    const args = buildMergeQueryArgs("abc123", null, ["a", "b"]);

    // Then: the array matches exactly and contains no `^` element
    expect(args).toEqual([
      "--literal-pathspecs",
      "log",
      "--topo-order",
      "--merges",
      "--diff-merges=separate",
      "--format=%x1e%H%x00%P%x00",
      "--name-status",
      "--find-renames",
      "--diff-filter=AMDR",
      "-z",
      "abc123",
      "--",
      "a",
      "b"
    ]);
    expect(args.filter((a) => a.startsWith("^"))).toEqual([]);
  });

  it("places ^boundary right after the anchor (TC-013)", () => {
    // Case: TC-013
    // Given: a birth boundary hash
    // When: the merge args are built
    const args = buildMergeQueryArgs("abc123", "def456", ["a"]);

    // Then: `^def456` follows the anchor, then `--`, then the path
    const anchorIndex = args.indexOf("abc123");
    expect(args[anchorIndex + 1]).toBe("^def456");
    expect(args[anchorIndex + 2]).toBe("--");
    expect(args[args.length - 1]).toBe("a");
  });

  it("keeps the historical path insertion order after -- (TC-014)", () => {
    // Case: TC-014
    // Given: requested path followed by the rename source
    // When: the merge args are built
    const args = buildMergeQueryArgs("abc123", null, [CUR, LEG]);

    // Then: everything after `--` keeps the insertion order
    expect(args.slice(args.indexOf("--") + 1)).toEqual([CUR, LEG]);
  });

  it("builds ancestry args without ^ when there are no boundary parents (TC-015)", () => {
    // Case: TC-015
    // Given: an empty boundary parent list
    // When/Then: only rev-list --parents <anchor> is produced
    expect(buildAncestryQueryArgs("abc123", [])).toEqual(["rev-list", "--parents", "abc123"]);
  });

  it("adds one ^ per boundary parent (TC-016)", () => {
    // Case: TC-016
    // Given: two boundary parents
    // When/Then: each parent becomes one `^` element in order
    expect(buildAncestryQueryArgs("abc123", ["p1", "p2"])).toEqual([
      "rev-list",
      "--parents",
      "abc123",
      "^p1",
      "^p2"
    ]);
  });

  it("does not mutate a frozen historical path array (TC-017)", () => {
    // Case: TC-017
    // Given: a frozen readonly path list
    const frozen: readonly string[] = Object.freeze(["a", "b"]);

    // When: the merge args are built
    const args = buildMergeQueryArgs("abc123", null, frozen);

    // Then: no exception, the result is a different array, and the input is unchanged
    expect(args).not.toBe(frozen);
    expect(frozen).toEqual(["a", "b"]);
    expect(args.slice(-2)).toEqual(["a", "b"]);
  });
});

/* ------------------------------------------------------------------ */
/* S3: parseFileHistoryRecords()                                      */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/src/fileHistory-test.md
describe("parseFileHistoryRecords (S3)", () => {
  const h1 = H(1);
  const p1 = H(2);
  const p2 = H(3);

  it("returns an empty array for empty stdout (TC-018)", () => {
    // Case: TC-018
    // Given: no output at all
    // When/Then: zero records is a success, not null
    expect(parseFileHistoryRecords("")).toEqual([]);
  });

  it("parses one M record into a single group (TC-019)", () => {
    // Case: TC-019
    // Given: the measured lineage record layout
    const stdout = rec(h1, [p1], ["M", CUR]);

    // When: the output is parsed
    const groups = parseFileHistoryRecords(stdout);

    // Then: one group with one record whose entry has old = new
    expect(groups).toEqual([
      {
        hash: h1,
        parentHashes: [p1],
        records: [{ hash: h1, parentHashes: [p1], entries: [entryOf("M", CUR)] }]
      }
    ]);
  });

  it("parses an R record with score into old and new paths (TC-020)", () => {
    // Case: TC-020
    // Given: the measured merge record layout with R077
    const stdout = rec(h1, [p1, p2], ["R077", LEG, CUR]);

    // When: the output is parsed
    const groups = parseFileHistoryRecords(stdout);

    // Then: both parents are kept and the score is dropped from the status
    expect(groups).not.toBeNull();
    expect(groups![0].parentHashes).toEqual([p1, p2]);
    expect(groups![0].records[0].entries).toEqual([entryOf("R", LEG, CUR)]);
  });

  it("parses a root commit with an empty parent field (TC-021)", () => {
    // Case: TC-021
    // Given: a record whose %P is empty
    const groups = parseFileHistoryRecords(rec(h1, [], ["A", F]));

    // When/Then: parentHashes is an empty array
    expect(groups).not.toBeNull();
    expect(groups![0].parentHashes).toEqual([]);
  });

  it("folds consecutive records of one hash into one group in output order (TC-022)", () => {
    // Case: TC-022
    // Given: two records of h1 with two entries each, then one record of p1
    const stdout = [
      rec(h1, [p1, p2], ["A", F], ["M", OTHER]),
      rec(h1, [p1, p2], ["D", F], ["M", OTHER]),
      rec(p1, [p2], ["M", F])
    ].join("");

    // When: the output is parsed
    const groups = parseFileHistoryRecords(stdout);

    // Then: two groups, the first holds both records with entries in Git order
    expect(groups).not.toBeNull();
    expect(groups).toHaveLength(2);
    expect(groups![0].records).toHaveLength(2);
    expect(groups![0].records[0].entries).toEqual([entryOf("A", F), entryOf("M", OTHER)]);
    expect(groups![0].records[1].entries).toEqual([entryOf("D", F), entryOf("M", OTHER)]);
    expect(groups!.map((g) => g.hash)).toEqual([h1, p1]);
  });

  it("returns null when stdout does not start with the record separator (TC-023)", () => {
    // Case: TC-023
    // Given: leading garbage before the first separator
    // When/Then: the whole result is null
    expect(parseFileHistoryRecords(`x${rec(h1, [p1], ["M", F])}`)).toBeNull();
  });

  it("returns null when the empty field after parents is not empty (TC-024)", () => {
    // Case: TC-024
    // Given: a non-empty field where the layout requires an empty one
    const stdout = `${RS}${h1}${NUL}${p1}${NUL}zz${NUL}\nM${NUL}${F}${NUL}`;

    // When/Then: null
    expect(parseFileHistoryRecords(stdout)).toBeNull();
  });

  it("returns null when the trailing NUL is missing (TC-025)", () => {
    // Case: TC-025
    // Given: a record whose last path is not NUL terminated
    const stdout = `${RS}${h1}${NUL}${p1}${NUL}${NUL}\nM${NUL}${F}`;

    // When/Then: null
    expect(parseFileHistoryRecords(stdout)).toBeNull();
  });

  it("returns null for a record without entries (TC-026)", () => {
    // Case: TC-026
    // Given: only the header fields (the combined-only shape)
    const stdout = `${RS}${h1}${NUL}${p1}${NUL}${NUL}`;

    // When/Then: null
    expect(parseFileHistoryRecords(stdout)).toBeNull();
  });

  it("returns null when the status is not preceded by LF (TC-027)", () => {
    // Case: TC-027
    // Given: entries that start directly after the empty field
    const stdout = `${RS}${h1}${NUL}${p1}${NUL}${NUL}M${NUL}${F}${NUL}`;

    // When/Then: null
    expect(parseFileHistoryRecords(stdout)).toBeNull();
  });

  it("returns null for the unknown statuses T, C100 and AM (TC-028)", () => {
    // Case: TC-028
    // Given: three statuses outside --diff-filter=AMDR
    const inputs = [
      rec(h1, [p1], ["T", F]),
      rec(h1, [p1], ["C100", F, OTHER]),
      rec(h1, [p1], ["AM", F])
    ];

    // When/Then: each is rejected as a whole
    for (const input of inputs) {
      expect(parseFileHistoryRecords(input)).toBeNull();
    }
  });

  it("returns null for an R status with a two digit score (TC-029)", () => {
    // Case: TC-029
    // Given: `R99`
    // When/Then: null because only R + 3 digits is accepted
    expect(parseFileHistoryRecords(rec(h1, [p1], ["R99", LEG, CUR]))).toBeNull();
  });

  it("accepts R999 as a rename (TC-030)", () => {
    // Case: TC-030
    // Given: the maximum three digit score
    const groups = parseFileHistoryRecords(rec(h1, [p1], ["R999", LEG, CUR]));

    // When/Then: one group whose entry status is R
    expect(groups).toHaveLength(1);
    expect(groups![0].records[0].entries[0].status).toBe("R");
  });

  it("returns null when the path field after M is missing (TC-031)", () => {
    // Case: TC-031
    // Given: a status token with no following path
    const stdout = `${RS}${h1}${NUL}${p1}${NUL}${NUL}\nM${NUL}`;

    // When/Then: null
    expect(parseFileHistoryRecords(stdout)).toBeNull();
  });

  it("returns null when the path is an empty string (TC-032)", () => {
    // Case: TC-032
    // Given: `M\0\0`
    // When/Then: an empty path is rejected like a missing one
    expect(parseFileHistoryRecords(rec(h1, [p1], ["M", ""]))).toBeNull();
  });

  it("returns null when the R new path is missing (TC-033)", () => {
    // Case: TC-033
    // Given: `R100\0old.txt\0` only
    // When/Then: null
    expect(parseFileHistoryRecords(rec(h1, [p1], ["R100", "old.txt"]))).toBeNull();
  });

  it("returns null for an invalid commit hash (TC-034)", () => {
    // Case: TC-034
    // Given: `zz` as the hash field
    // When/Then: null
    expect(parseFileHistoryRecords(rec("zz", [p1], ["M", F]))).toBeNull();
  });

  it("returns null for an invalid parent hash (TC-035)", () => {
    // Case: TC-035
    // Given: `g1` inside the parent list
    // When/Then: null
    expect(parseFileHistoryRecords(rec(h1, ["g1"], ["M", F]))).toBeNull();
  });

  it("returns null instead of a partial result when a later record is malformed (TC-036)", () => {
    // Case: TC-036
    // Given: a valid first record followed by a malformed second one
    const stdout = `${rec(h1, [p1], ["M", F])}${rec(p1, [p2], ["T", F])}`;

    // When/Then: fail-closed, no array of the valid prefix
    expect(parseFileHistoryRecords(stdout)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* S4: applyLineageRules()                                            */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/src/fileHistory-test.md
describe("applyLineageRules (S4)", () => {
  const fix = H(0x16);
  const updRenamed = H(0x14);
  const rename = H(0x13);
  const updLegacy = H(0x11);
  const base = H(0x10);
  const mergeHash = H(0x15);

  function similarGroups(): FileHistoryRecordGroup[] {
    return [
      group(fix, [mergeHash], [entryOf("M", CUR)]),
      group(updRenamed, [rename], [entryOf("M", CUR)]),
      group(rename, [updLegacy], [entryOf("R", LEG, CUR)]),
      group(updLegacy, [base], [entryOf("M", LEG)]),
      group(base, [], [entryOf("A", LEG)])
    ];
  }

  it("walks the similar lineage switching the tracked path at the rename (TC-037)", () => {
    // Case: TC-037
    // Given: the five similar lineage groups with fix as anchor
    // When: the lineage rules are applied
    const result = applyLineageRules(similarGroups(), fix, CUR);

    // Then: five entries M M R M A, both historical paths, and base as the boundary
    expect(result).not.toBeNull();
    expect(result!.entries.map((e) => e.type)).toEqual(["M", "M", "R", "M", "A"]);
    expect(result!.historicalPaths).toEqual([CUR, LEG]);
    expect(result!.boundary).toEqual({ hash: base, parentHashes: [] });
  });

  it("gives the R entry old = legacy, new = historical = current (TC-038)", () => {
    // Case: TC-038
    // Given: the similar lineage
    const result = applyLineageRules(similarGroups(), fix, CUR)!;

    // When: the rename entry is read
    const renameEntry = result.entries.find((e) => e.hash === rename)!;

    // Then: the three path values follow the R contract
    expect(renameEntry.oldFilePath).toBe(LEG);
    expect(renameEntry.newFilePath).toBe(CUR);
    expect(renameEntry.historicalPath).toBe(CUR);
  });

  it("selects the legacy path for groups after the rename (TC-039)", () => {
    // Case: TC-039
    // Given: the similar lineage
    const result = applyLineageRules(similarGroups(), fix, CUR)!;

    // When: the update legacy entry is read
    const legacyEntry = result.entries.find((e) => e.hash === updLegacy)!;

    // Then: old, new and historical path all equal the legacy path
    expect(legacyEntry.oldFilePath).toBe(LEG);
    expect(legacyEntry.newFilePath).toBe(LEG);
    expect(legacyEntry.historicalPath).toBe(LEG);
  });

  it("prefers the R entry over an M entry on the same tracked path (TC-040)", () => {
    // Case: TC-040
    // Given: a first record holding both `M current` and `R legacy -> current`
    const groups = [group(fix, [base], [entryOf("M", CUR), entryOf("R", LEG, CUR)])];

    // When: the rules are applied
    const result = applyLineageRules(groups, fix, CUR)!;

    // Then: the rename wins and legacy is appended to the historical paths
    expect(result.entries[0].type).toBe("R");
    expect(result.historicalPaths).toEqual([CUR, LEG]);
  });

  it("returns null when the first record only has unrelated entries (TC-041)", () => {
    // Case: TC-041
    // Given: a group whose first record does not touch the tracked path
    const groups = [group(fix, [base], [entryOf("M", OTHER)])];

    // When/Then: null
    expect(applyLineageRules(groups, fix, CUR)).toBeNull();
  });

  it("only inspects the first record of a group (TC-042)", () => {
    // Case: TC-042
    // Given: the matching entry sits in the second record only
    const groups = [group(fix, [base], [entryOf("M", OTHER)], [entryOf("M", CUR)])];

    // When/Then: null because the second record is not consulted
    expect(applyLineageRules(groups, fix, CUR)).toBeNull();
  });

  it("stops at a non-anchor D without including it (TC-043)", () => {
    // Case: TC-043
    // Given: anchor M, then a D group, then an older group
    const del = H(0x22);
    const older = H(0x21);
    const groups = [
      group(fix, [del], [entryOf("M", F)]),
      group(del, [older], [entryOf("D", F)]),
      group(older, [], [entryOf("A", F)])
    ];

    // When: the rules are applied
    const result = applyLineageRules(groups, fix, F)!;

    // Then: only the anchor entry, the D group is the boundary, the older group is ignored
    expect(result.entries.map((e) => e.hash)).toEqual([fix]);
    expect(result.boundary).toEqual({ hash: del, parentHashes: [older] });
  });

  it("includes the anchor's own D entry and keeps walking (TC-044)", () => {
    // Case: TC-044
    // Given: the anchor itself deletes the file
    const del = H(0x17);
    const groups = [group(del, [fix], [entryOf("D", CUR)]), ...similarGroups()];

    // When: the rules are applied with the delete commit as anchor
    const result = applyLineageRules(groups, del, CUR)!;

    // Then: the D entry is first and the remaining five entries follow (7 in the similar case)
    expect(result.entries[0].type).toBe("D");
    expect(result.entries[0].hash).toBe(del);
    expect(result.entries).toHaveLength(6);
    expect(result.boundary).toEqual({ hash: base, parentHashes: [] });
  });

  it("includes a non-merge A as the last entry and boundary (TC-045)", () => {
    // Case: TC-045
    // Given: an A group with one parent followed by an older group
    const older = H(0x21);
    const groups = [
      group(fix, [base], [entryOf("M", F)]),
      group(base, [older], [entryOf("A", F)]),
      group(older, [], [entryOf("M", F)])
    ];

    // When: the rules are applied
    const result = applyLineageRules(groups, fix, F)!;

    // Then: the A entry is included with isMerge false, the boundary is that group
    expect(result.entries.map((e) => e.hash)).toEqual([fix, base]);
    expect(result.entries[1].type).toBe("A");
    expect(result.entries[1].isMerge).toBe(false);
    expect(result.boundary).toEqual({ hash: base, parentHashes: [older] });
  });

  it("does not stop at a merge A (TC-046)", () => {
    // Case: TC-046
    // Given: an A group with two parents followed by another group
    const birth = H(0x25);
    const older = H(0x21);
    const groups = [
      group(birth, [H(0x31), H(0x32)], [entryOf("A", F)]),
      group(older, [], [entryOf("M", F)])
    ];

    // When: the rules are applied
    const result = applyLineageRules(groups, birth, F)!;

    // Then: the merge A is included with isMerge true and the next group is still walked
    expect(result.entries.map((e) => e.hash)).toEqual([birth, older]);
    expect(result.entries[0].type).toBe("A");
    expect(result.entries[0].isMerge).toBe(true);
  });

  it("reaches the end with a null boundary when nothing stops the walk (TC-047)", () => {
    // Case: TC-047
    // Given: groups that are all M
    const groups = [
      group(fix, [updRenamed], [entryOf("M", F)]),
      group(updRenamed, [base], [entryOf("M", F)])
    ];

    // When: the rules are applied
    const result = applyLineageRules(groups, fix, F)!;

    // Then: every group is an entry and the boundary is null
    expect(result.entries).toHaveLength(2);
    expect(result.boundary).toBeNull();
  });

  it("returns the empty lineage for zero groups (TC-048)", () => {
    // Case: TC-048
    // Given: no groups
    // When/Then: no entries, only the requested path, no boundary
    expect(applyLineageRules([], fix, F)).toEqual({
      entries: [],
      historicalPaths: [F],
      boundary: null
    });
  });

  it("does not mutate frozen groups (TC-049)", () => {
    // Case: TC-049
    // Given: deeply frozen groups and an equal unfrozen copy
    const frozen = similarGroups().map((g) =>
      Object.freeze({
        ...g,
        parentHashes: Object.freeze([...g.parentHashes]) as unknown as string[],
        records: Object.freeze(
          g.records.map((r) =>
            Object.freeze({
              ...r,
              entries: Object.freeze(
                r.entries.map((e) => Object.freeze({ ...e }))
              ) as unknown as FileHistoryRecordEntry[]
            })
          )
        ) as unknown as FileHistoryRecordGroup["records"]
      })
    );
    const snapshot = similarGroups();

    // When: the rules are applied
    // Then: no exception and the input still equals the snapshot
    expect(() => applyLineageRules(frozen, fix, CUR)).not.toThrow();
    expect(frozen).toEqual(snapshot);
  });
});

/* ------------------------------------------------------------------ */
/* S5: applyMergeRules()                                              */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/src/fileHistory-test.md
describe("applyMergeRules (S5)", () => {
  const m1 = H(0x41);
  const m2 = H(0x42);
  const pa = H(0x43);
  const pb = H(0x44);
  const NO_LINEAGE: ReadonlySet<string> = new Set();

  it("folds an R077 record into one merge entry (TC-050)", () => {
    // Case: TC-050
    // Given: a two parent group with one R record and both historical paths
    const groups = [group(m1, [pa, pb], [entryOf("R", LEG, CUR)])];

    // When: the merge rules are applied
    const result = applyMergeRules(groups, [CUR, LEG], NO_LINEAGE)!;

    // Then: one R entry with rename paths, isMerge true, and no birth candidate
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toEqual({
      hash: m1,
      parentHashes: [pa, pb],
      type: "R",
      oldFilePath: LEG,
      newFilePath: CUR,
      historicalPath: CUR,
      isMerge: true
    });
    expect(result.birthCandidateHashes).toEqual([]);
  });

  it("collapses two records of one merge into one entry (TC-051)", () => {
    // Case: TC-051
    // Given: two records (one per parent) that both modify the current path
    const groups = [group(m1, [pa, pb], [entryOf("M", CUR)], [entryOf("M", CUR)])];

    // When: the merge rules are applied
    const result = applyMergeRules(groups, [CUR], NO_LINEAGE)!;

    // Then: exactly one entry whose type comes from the first selected record
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].type).toBe("M");
  });

  it("marks groups whose every parent record adds the path as birth candidates (TC-052)", () => {
    // Case: TC-052
    // Given: two groups that each have two A records
    const groups = [
      group(m1, [pa, pb], [entryOf("A", F)], [entryOf("A", F)]),
      group(m2, [pa, pb], [entryOf("A", F)], [entryOf("A", F)])
    ];

    // When: the merge rules are applied
    const result = applyMergeRules(groups, [F], NO_LINEAGE)!;

    // Then: both entries are A and the candidate list keeps Git order
    expect(result.entries.map((e) => e.type)).toEqual(["A", "A"]);
    expect(result.birthCandidateHashes).toEqual([m1, m2]);
  });

  it("does not treat a single A record of a two parent merge as a candidate (TC-053)", () => {
    // Case: TC-053
    // Given: fewer records than parents
    const groups = [group(m1, [pa, pb], [entryOf("A", F)])];

    // When: the merge rules are applied
    const result = applyMergeRules(groups, [F], NO_LINEAGE)!;

    // Then: type A but no candidate
    expect(result.entries[0].type).toBe("A");
    expect(result.birthCandidateHashes).toEqual([]);
  });

  it("does not treat an A + M pair as a candidate (TC-054)", () => {
    // Case: TC-054
    // Given: records A and M for the two parents
    const groups = [group(m1, [pa, pb], [entryOf("A", F)], [entryOf("M", F)])];

    // When: the merge rules are applied
    const result = applyMergeRules(groups, [F], NO_LINEAGE)!;

    // Then: the type is the first record's status and no candidate is produced
    expect(result.entries[0].type).toBe("A");
    expect(result.birthCandidateHashes).toEqual([]);
  });

  it("selects the first entry whose newPath is a historical path (TC-055)", () => {
    // Case: TC-055
    // Given: a record with an unrelated entry before the matching one
    const groups = [group(m1, [pa, pb], [entryOf("M", OTHER), entryOf("M", CUR)])];

    // When: the merge rules are applied
    const result = applyMergeRules(groups, [CUR], NO_LINEAGE)!;

    // Then: the current path entry is used and the unrelated path never appears
    expect(result.entries[0].historicalPath).toBe(CUR);
    expect(result.entries[0].newFilePath).toBe(CUR);
  });

  it("returns null when no record selects an entry (TC-056)", () => {
    // Case: TC-056
    // Given: every record only touches unrelated paths
    const groups = [group(m1, [pa, pb], [entryOf("M", OTHER)], [entryOf("M", OTHER)])];

    // When/Then: null
    expect(applyMergeRules(groups, [CUR], NO_LINEAGE)).toBeNull();
  });

  it("skips records without a selection and never marks them as birth (TC-057)", () => {
    // Case: TC-057
    // Given: one unrelated record and one A record
    const groups = [group(m1, [pa, pb], [entryOf("M", OTHER)], [entryOf("A", CUR)])];

    // When: the merge rules are applied
    const result = applyMergeRules(groups, [CUR], NO_LINEAGE)!;

    // Then: one entry typed by the selected record and no candidate
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].type).toBe("A");
    expect(result.birthCandidateHashes).toEqual([]);
  });

  it("returns null when a group has a single parent (TC-058)", () => {
    // Case: TC-058
    // Given: a group with one parent among the merge query output
    const groups = [group(m1, [pa], [entryOf("M", CUR)])];

    // When/Then: null
    expect(applyMergeRules(groups, [CUR], NO_LINEAGE)).toBeNull();
  });

  it("drops entries whose hash is already in the lineage (TC-059)", () => {
    // Case: TC-059
    // Given: a candidate-shaped group whose hash the lineage already produced
    const groups = [group(m1, [pa, pb], [entryOf("A", F)], [entryOf("A", F)])];

    // When: the merge rules are applied with that hash in the lineage set
    const result = applyMergeRules(groups, [F], new Set([m1]))!;

    // Then: no entry for that hash
    expect(result.entries.map((e) => e.hash)).not.toContain(m1);
    expect(result.entries).toEqual([]);
  });

  it("drops lineage hashes from the birth candidates too (TC-060)", () => {
    // Case: TC-060
    // Given: the same input as TC-059
    const groups = [group(m1, [pa, pb], [entryOf("A", F)], [entryOf("A", F)])];

    // When: the merge rules are applied
    const result = applyMergeRules(groups, [F], new Set([m1]))!;

    // Then: the candidate list does not contain the hash either
    expect(result.birthCandidateHashes).not.toContain(m1);
    expect(result.birthCandidateHashes).toEqual([]);
  });

  it("returns empty results for zero groups (TC-061)", () => {
    // Case: TC-061
    // Given: the empty merge query output
    // When/Then: empty entries and candidates
    expect(applyMergeRules([], [F], NO_LINEAGE)).toEqual({ entries: [], birthCandidateHashes: [] });
  });
});

/* ------------------------------------------------------------------ */
/* S6: parseAncestryGraph()                                           */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/src/fileHistory-test.md
describe("parseAncestryGraph (S6)", () => {
  const h1 = H(1);
  const h2 = H(2);
  const h3 = H(3);
  const p1 = H(4);
  const p2 = H(5);

  it("maps each commit to its parents and ignores blank lines (TC-062)", () => {
    // Case: TC-062
    // Given: two lines and a trailing blank line
    const graph = parseAncestryGraph(`${h1} ${p1} ${p2}\n${h2} ${p1}\n\n`);

    // When/Then: size 2 with the parent arrays
    expect(graph).not.toBeNull();
    expect(graph!.size).toBe(2);
    expect(graph!.get(h1)).toEqual([p1, p2]);
    expect(graph!.get(h2)).toEqual([p1]);
  });

  it("maps a root commit to an empty parent array (TC-063)", () => {
    // Case: TC-063
    // Given: a line with only the commit hash
    const graph = parseAncestryGraph(`${h3}\n`);

    // When/Then: the value is []
    expect(graph!.get(h3)).toEqual([]);
  });

  it("returns an empty Map for empty stdout (TC-064)", () => {
    // Case: TC-064
    // Given: no output
    const graph = parseAncestryGraph("");

    // When/Then: a Map of size 0, not null
    expect(graph).not.toBeNull();
    expect(graph!.size).toBe(0);
  });

  it("returns null when a token is not a commit hash (TC-065)", () => {
    // Case: TC-065
    // Given: `zz` inside a line
    // When/Then: null
    expect(parseAncestryGraph(`${h1} zz\n`)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* S7: resolveFileHistoryEntries()                                    */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/src/fileHistory-test.md
describe("resolveFileHistoryEntries (S7)", () => {
  it("returns the plain concatenation when ancestry is null (TC-066)", () => {
    // Case: TC-066
    // Given: two lineage entries, one merge entry, and no ancestry graph
    const lineage = lineageOf([fileEntry(H(1), "M", F), fileEntry(H(2), "A", F)], [F]);
    const merge = mergeOf([fileEntry(H(3), "M", F, { isMerge: true })], []);

    // When: the entries are resolved
    const result = resolveFileHistoryEntries({ requestedPath: F, lineage, merge, ancestry: null });

    // Then: lineage entries first, then merge entries, same order
    expect(result).toEqual([...lineage.entries, ...merge.entries]);
  });

  it("excludes proper ancestors of a requested path candidate (TC-067)", () => {
    // Case: TC-067
    // Given: the CE3 shape: old A in lineage, delete merge D and recreate A* in merge
    const editNew = H(0x48);
    const recreate = H(0x47);
    const mU2 = H(0x46);
    const q = H(0x45);
    const delMerge = H(0x44);
    const mU1 = H(0x43);
    const p = H(0x42);
    const oldAdd = H(0x41);
    const init = H(0x40);
    const lineage = lineageOf([fileEntry(editNew, "M", F), fileEntry(oldAdd, "A", F)], [F]);
    const merge = mergeOf(
      [
        fileEntry(recreate, "A", F, { isMerge: true }),
        fileEntry(delMerge, "D", F, { isMerge: true })
      ],
      [recreate]
    );
    const ancestry = parseAncestryGraph(
      graphOf([
        [editNew, recreate],
        [recreate, mU2, q],
        [mU2, delMerge],
        [q, delMerge],
        [delMerge, mU1, p],
        [mU1, oldAdd],
        [p, oldAdd],
        [oldAdd, init]
      ])
    );

    // When: the entries are resolved
    const result = resolveFileHistoryEntries({ requestedPath: F, lineage, merge, ancestry });

    // Then: edit M and recreate A* remain; old A and delete merge D are gone
    expect(summarize(result)).toEqual([S(editNew, "M", false, F), S(recreate, "A", true, F)]);
  });

  it("accepts a rename source candidate that is an ancestor of every R entry (TC-068)", () => {
    // Case: TC-068
    // Given: the CE6 shape: birth merge on legacy, then a rename, then a fix
    const fix = H(0x75);
    const rename = H(0x74);
    const birth = H(0x73);
    const mU = H(0x72);
    const xU = H(0x71);
    const init = H(0x70);
    const lineage = lineageOf(
      [
        fileEntry(fix, "M", CUR),
        fileEntry(rename, "R", CUR, { oldFilePath: LEG, newFilePath: CUR })
      ],
      [CUR, LEG]
    );
    const merge = mergeOf([fileEntry(birth, "A", LEG, { isMerge: true })], [birth]);
    const ancestry = parseAncestryGraph(
      graphOf([[fix, rename], [rename, birth], [birth, mU, xU], [mU, init], [xU, init], [init]])
    );

    // When: the entries are resolved
    const result = resolveFileHistoryEntries({ requestedPath: CUR, lineage, merge, ancestry });

    // Then: three entries including the candidate
    expect(summarize(result)).toEqual([
      S(fix, "M", false, CUR),
      S(rename, "R", false, CUR),
      S(birth, "A", true, LEG)
    ]);
  });

  it("keeps an invalid rename source candidate as a plain merge entry (TC-069)", () => {
    // Case: TC-069
    // Given: the CE5 shape: the legacy path is reused after the rename
    const fix = H(0x68);
    const reuseMerge = H(0x67);
    const mUY = H(0x66);
    const reuseX = H(0x65);
    const mergeRF = H(0x64);
    const updRenamed = H(0x63);
    const rename = H(0x62);
    const updLegacy = H(0x61);
    const base = H(0x60);
    const lineage = lineageOf(
      [
        fileEntry(fix, "M", CUR),
        fileEntry(updRenamed, "M", CUR),
        fileEntry(rename, "R", CUR, { oldFilePath: LEG, newFilePath: CUR }),
        fileEntry(updLegacy, "M", LEG),
        fileEntry(base, "A", LEG)
      ],
      [CUR, LEG]
    );
    const merge = mergeOf(
      [
        fileEntry(reuseMerge, "A", LEG, { isMerge: true }),
        fileEntry(mergeRF, "R", CUR, { oldFilePath: LEG, newFilePath: CUR, isMerge: true })
      ],
      [reuseMerge]
    );
    const ancestry = parseAncestryGraph(
      graphOf([
        [fix, reuseMerge],
        [reuseMerge, mUY, reuseX],
        [mUY, mergeRF],
        [reuseX, mergeRF],
        [mergeRF, updLegacy, updRenamed],
        [updRenamed, rename],
        [rename, updLegacy],
        [updLegacy, base],
        [base]
      ])
    );

    // When: the entries are resolved
    const result = resolveFileHistoryEntries({ requestedPath: CUR, lineage, merge, ancestry });

    // Then: all seven entries remain and the candidate stays as a normal A merge entry
    expect(result).toHaveLength(7);
    const candidate = result.find((e) => e.hash === reuseMerge)!;
    expect(candidate.type).toBe("A");
    expect(candidate.isMerge).toBe(true);
    expect(result.map((e) => e.hash)).toContain(base);
  });

  it("ignores a candidate whose path matches no R entry and is not the requested path (TC-070)", () => {
    // Case: TC-070
    // Given: a candidate on an unrelated path that is an ancestor of the lineage A
    const fix = H(0x83);
    const cand = H(0x82);
    const base = H(0x81);
    const init = H(0x80);
    const lineage = lineageOf([fileEntry(fix, "M", CUR), fileEntry(base, "A", CUR)], [CUR]);
    const merge = mergeOf([fileEntry(cand, "A", OTHER, { isMerge: true })], [cand]);
    const ancestry = parseAncestryGraph(
      graphOf([[fix, cand], [cand, base, init], [base, init], [init]])
    );

    // When: the entries are resolved
    const result = resolveFileHistoryEntries({ requestedPath: CUR, lineage, merge, ancestry });

    // Then: nothing is excluded and the candidate itself remains
    expect(result.map((e) => e.hash)).toEqual([fix, base, cand]);
  });

  it("excludes a valid candidate that is a proper ancestor of another valid candidate (TC-071)", () => {
    // Case: TC-071
    // Given: C2 is an ancestor of C1 and both are valid requested path candidates
    const edit = H(0x95);
    const c1 = H(0x94);
    const x = H(0x93);
    const y = H(0x92);
    const c2 = H(0x91);
    const root = H(0x90);
    const lineage = lineageOf([fileEntry(edit, "M", F)], [F]);
    const merge = mergeOf(
      [fileEntry(c1, "A", F, { isMerge: true }), fileEntry(c2, "A", F, { isMerge: true })],
      [c1, c2]
    );
    const ancestry = parseAncestryGraph(
      graphOf([[edit, c1], [c1, x, y], [x, c2], [y, c2], [c2, root], [root]])
    );

    // When: the entries are resolved
    const result = resolveFileHistoryEntries({ requestedPath: F, lineage, merge, ancestry });

    // Then: C1 stays and C2 is excluded
    expect(result.map((e) => e.hash)).toContain(c1);
    expect(result.map((e) => e.hash)).not.toContain(c2);
  });

  it("keeps both candidates when they are not ancestors of each other (TC-072)", () => {
    // Case: TC-072
    // Given: two valid candidates on separate branches joined by an unrelated merge
    const anchor = H(0xa5);
    const join = H(0xa4);
    const c1 = H(0xa3);
    const c2 = H(0xa2);
    const p = H(0xa1);
    const q = H(0xa0);
    const lineage = lineageOf([fileEntry(anchor, "M", F)], [F]);
    const merge = mergeOf(
      [fileEntry(c1, "A", F, { isMerge: true }), fileEntry(c2, "A", F, { isMerge: true })],
      [c1, c2]
    );
    const ancestry = parseAncestryGraph(
      graphOf([[anchor, join], [join, c1, c2], [c1, p], [c2, q], [p], [q]])
    );

    // When: the entries are resolved
    // Then: no exception and all three entries remain
    const result = resolveFileHistoryEntries({ requestedPath: F, lineage, merge, ancestry });
    expect(result.map((e) => e.hash)).toEqual([anchor, c1, c2]);
  });

  it("treats a candidate missing from the ancestry Map as having no ancestors (TC-073)", () => {
    // Case: TC-073
    // Given: an empty Map and one candidate
    const cand = H(0xb1);
    const lineage = lineageOf([fileEntry(H(0xb2), "M", F)], [F]);
    const merge = mergeOf([fileEntry(cand, "A", F, { isMerge: true })], [cand]);

    // When: the entries are resolved
    // Then: no exception and the combined list is returned unchanged
    let result: FileHistoryEntry[] = [];
    expect(() => {
      result = resolveFileHistoryEntries({ requestedPath: F, lineage, merge, ancestry: new Map() });
    }).not.toThrow();
    expect(result).toEqual([...lineage.entries, ...merge.entries]);
  });

  it("returns an empty array for zero entries (TC-074)", () => {
    // Case: TC-074
    // Given: no lineage, no merge, an empty Map
    const result = resolveFileHistoryEntries({
      requestedPath: F,
      lineage: lineageOf([], [F]),
      merge: mergeOf([], []),
      ancestry: new Map()
    });

    // When/Then: []
    expect(result).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* S8: fixture composition parse -> lineage -> merge -> ancestry      */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/src/fileHistory-test.md
describe("measured fixture composition (S8)", () => {
  interface PipelineResult {
    lineage: LineageResult;
    merge: MergeResult;
    ancestryArgs: string[] | null;
    entries: FileHistoryEntry[];
  }

  /**
   * Replays the DataSource orchestration (plan 3.7) on fixture stdout strings.
   * `ancestryStdout === null` asserts that the ancestry query would not run.
   */
  function runPipeline(
    anchor: string,
    requestedPath: string,
    lineageStdout: string,
    mergeStdout: string,
    ancestryStdout: string | null
  ): PipelineResult {
    const lineage = applyLineageRules(
      parseFileHistoryRecords(lineageStdout)!,
      anchor,
      requestedPath
    )!;
    const merge = applyMergeRules(
      parseFileHistoryRecords(mergeStdout)!,
      lineage.historicalPaths,
      new Set(lineage.entries.map((e) => e.hash))
    )!;
    const needsAncestry =
      merge.birthCandidateHashes.length > 0 && lineage.entries.length + merge.entries.length >= 2;
    expect(needsAncestry).toBe(ancestryStdout !== null);
    const ancestryArgs = needsAncestry
      ? buildAncestryQueryArgs(
          anchor,
          lineage.boundary === null ? [] : lineage.boundary.parentHashes
        )
      : null;
    const ancestry = ancestryStdout === null ? null : parseAncestryGraph(ancestryStdout);
    const entries = resolveFileHistoryEntries({ requestedPath, lineage, merge, ancestry });
    return { lineage, merge, ancestryArgs, entries };
  }

  it("resolves the similar fixture to six entries without an ancestry query (TC-075)", () => {
    // Case: TC-075
    // Given: the measured similar lineage and merge stdout
    const base = H(0x10);
    const updLegacy = H(0x11);
    const docs = H(0x12);
    const rename = H(0x13);
    const updRenamed = H(0x14);
    const mergeHash = H(0x15);
    const fix = H(0x16);
    const lineageStdout = [
      rec(fix, [mergeHash], ["M", CUR]),
      rec(updRenamed, [rename], ["M", CUR]),
      rec(rename, [updLegacy], ["R100", LEG, CUR]),
      rec(updLegacy, [base], ["M", LEG]),
      rec(base, [], ["A", LEG])
    ].join("");
    const mergeStdout = rec(mergeHash, [docs, updRenamed], ["R077", LEG, CUR]);

    // When: the pipeline runs
    const result = runPipeline(fix, CUR, lineageStdout, mergeStdout, null);

    // Then: six entries with the measured types and historical paths, no birth candidate
    expect(result.merge.birthCandidateHashes).toEqual([]);
    expect(summarize(result.entries)).toEqual([
      S(fix, "M", false, CUR),
      S(updRenamed, "M", false, CUR),
      S(rename, "R", false, CUR),
      S(updLegacy, "M", false, LEG),
      S(base, "A", false, LEG),
      S(mergeHash, "R", true, CUR)
    ]);
  });

  it("resolves the evil fixture with a D boundary and a birth merge exclusion (TC-076)", () => {
    // Case: TC-076
    // Given: the measured evil stdout where the lineage stops at old incarnation: delete f
    const addF = H(0x20);
    const editF = H(0x21);
    const delF = H(0x22);
    const unrelA = H(0x23);
    const unrelB = H(0x24);
    const evil = H(0x25);
    const editNew = H(0x26);
    const lineageStdout = [
      rec(editNew, [evil], ["M", F]),
      rec(delF, [editF], ["D", F]),
      rec(editF, [addF], ["M", F]),
      rec(addF, [], ["A", F])
    ].join("");
    const mergeStdout = [
      rec(evil, [unrelA, unrelB], ["A", F]),
      rec(evil, [unrelA, unrelB], ["A", F])
    ].join("");
    const ancestryStdout = graphOf([
      [editNew, evil],
      [evil, unrelA, unrelB],
      [unrelA, delF],
      [unrelB, delF],
      [delF, editF]
    ]);

    // When: the pipeline runs
    const result = runPipeline(editNew, F, lineageStdout, mergeStdout, ancestryStdout);

    // Then: the boundary is the delete commit and only edit new f + evil merge remain
    expect(result.lineage.boundary).toEqual({ hash: delF, parentHashes: [editF] });
    expect(summarize(result.entries)).toEqual([S(editNew, "M", false, F), S(evil, "A", true, F)]);
    expect(result.entries.map((e) => e.hash)).not.toContain(addF);
  });

  const ce3 = {
    init: H(0x40),
    addF: H(0x41),
    pU: H(0x42),
    mU1: H(0x43),
    delMerge: H(0x44),
    qU: H(0x45),
    mU2: H(0x46),
    recreate: H(0x47),
    editNew: H(0x48)
  };
  const ce3MergeStdout = [
    rec(ce3.recreate, [ce3.mU2, ce3.qU], ["A", F]),
    rec(ce3.recreate, [ce3.mU2, ce3.qU], ["A", F]),
    rec(ce3.delMerge, [ce3.mU1, ce3.pU], ["D", F]),
    rec(ce3.delMerge, [ce3.mU1, ce3.pU], ["D", F])
  ].join("");
  const ce3GraphBelowRecreate = [
    [ce3.recreate, ce3.mU2, ce3.qU],
    [ce3.mU2, ce3.delMerge],
    [ce3.qU, ce3.delMerge],
    [ce3.delMerge, ce3.mU1, ce3.pU],
    [ce3.mU1, ce3.addF],
    [ce3.pU, ce3.addF],
    [ce3.addF, ce3.init]
  ];

  it("resolves CE3 to edit new f and the recreate merge only (TC-077)", () => {
    // Case: TC-077
    // Given: the measured CE3 stdout (delete by merge, recreate by merge)
    const lineageStdout = [
      rec(ce3.editNew, [ce3.recreate], ["M", F]),
      rec(ce3.addF, [ce3.init], ["A", F])
    ].join("");
    const ancestryStdout = graphOf([[ce3.editNew, ce3.recreate], ...ce3GraphBelowRecreate]);

    // When: the pipeline runs
    const result = runPipeline(ce3.editNew, F, lineageStdout, ce3MergeStdout, ancestryStdout);

    // Then: two entries; old incarnation: add f and the delete merge are excluded
    expect(summarize(result.entries)).toEqual([
      S(ce3.editNew, "M", false, F),
      S(ce3.recreate, "A", true, F)
    ]);
    expect(result.entries.map((e) => e.hash)).not.toContain(ce3.addF);
    expect(result.entries.map((e) => e.hash)).not.toContain(ce3.delMerge);
  });

  it("resolves CE5 to seven entries with no exclusion (TC-078)", () => {
    // Case: TC-078
    // Given: the measured CE5 stdout where the legacy path is reused by an unrelated file
    const c = {
      base: H(0x60),
      updLegacy: H(0x61),
      rename: H(0x62),
      updRenamed: H(0x63),
      mergeRF: H(0x64),
      reuseX: H(0x65),
      mUY: H(0x66),
      reuseMerge: H(0x67),
      fix: H(0x68)
    };
    const lineageStdout = [
      rec(c.fix, [c.reuseMerge], ["M", CUR]),
      rec(c.updRenamed, [c.rename], ["M", CUR]),
      rec(c.rename, [c.updLegacy], ["R100", LEG, CUR]),
      rec(c.updLegacy, [c.base], ["M", LEG]),
      rec(c.base, [], ["A", LEG])
    ].join("");
    const mergeStdout = [
      rec(c.reuseMerge, [c.mUY, c.reuseX], ["A", LEG]),
      rec(c.reuseMerge, [c.mUY, c.reuseX], ["A", LEG]),
      rec(c.mergeRF, [c.updLegacy, c.updRenamed], ["R077", LEG, CUR])
    ].join("");
    const ancestryStdout = graphOf([
      [c.fix, c.reuseMerge],
      [c.reuseMerge, c.mUY, c.reuseX],
      [c.mUY, c.mergeRF],
      [c.reuseX, c.mergeRF],
      [c.mergeRF, c.updLegacy, c.updRenamed],
      [c.updRenamed, c.rename],
      [c.rename, c.updLegacy],
      [c.updLegacy, c.base],
      [c.base]
    ]);

    // When: the pipeline runs
    const result = runPipeline(c.fix, CUR, lineageStdout, mergeStdout, ancestryStdout);

    // Then: seven entries, the reuse merge stays as A* and base A remains
    expect(summarize(result.entries)).toEqual([
      S(c.fix, "M", false, CUR),
      S(c.updRenamed, "M", false, CUR),
      S(c.rename, "R", false, CUR),
      S(c.updLegacy, "M", false, LEG),
      S(c.base, "A", false, LEG),
      S(c.reuseMerge, "A", true, LEG),
      S(c.mergeRF, "R", true, CUR)
    ]);
  });

  it("resolves CE6 with a rename source candidate and no boundary (TC-079)", () => {
    // Case: TC-079
    // Given: the measured CE6 stdout (birth by merge, then a normal rename)
    const c = {
      init: H(0x70),
      xU: H(0x71),
      mU: H(0x72),
      birth: H(0x73),
      rename: H(0x74),
      fix: H(0x75)
    };
    const lineageStdout = [
      rec(c.fix, [c.rename], ["M", CUR]),
      rec(c.rename, [c.birth], ["R100", LEG, CUR])
    ].join("");
    const mergeStdout = [
      rec(c.birth, [c.mU, c.xU], ["A", LEG]),
      rec(c.birth, [c.mU, c.xU], ["A", LEG])
    ].join("");
    const ancestryStdout = graphOf([
      [c.fix, c.rename],
      [c.rename, c.birth],
      [c.birth, c.mU, c.xU],
      [c.mU, c.init],
      [c.xU, c.init],
      [c.init]
    ]);

    // When: the pipeline runs
    const result = runPipeline(c.fix, CUR, lineageStdout, mergeStdout, ancestryStdout);

    // Then: null boundary, ancestry args without `^`, and three entries
    expect(result.lineage.boundary).toBeNull();
    expect(result.ancestryArgs).toEqual(["rev-list", "--parents", c.fix]);
    expect(summarize(result.entries)).toEqual([
      S(c.fix, "M", false, CUR),
      S(c.rename, "R", false, CUR),
      S(c.birth, "A", true, LEG)
    ]);
  });

  it("keeps the anchor itself when it is the valid candidate in CE7 (TC-080)", () => {
    // Case: TC-080
    // Given: CE3's stdout with the recreate merge as the anchor
    const lineageStdout = rec(ce3.addF, [ce3.init], ["A", F]);
    const ancestryStdout = graphOf(ce3GraphBelowRecreate);

    // When: the pipeline runs
    const result = runPipeline(ce3.recreate, F, lineageStdout, ce3MergeStdout, ancestryStdout);

    // Then: only the recreate merge remains
    expect(summarize(result.entries)).toEqual([S(ce3.recreate, "A", true, F)]);
    for (const excluded of [ce3.addF, ce3.delMerge]) {
      expect(result.entries.map((e) => e.hash)).not.toContain(excluded);
    }
  });
});
