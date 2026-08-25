import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({}));

import {
  type BranchSnapshotEntry,
  deriveAncestry,
  matchRemoteRefs,
  parseAheadBehind,
  parseBranchSnapshot,
  parseOriginHeadTarget,
  resolveCompareBranch,
  synthesizeRows
} from "../../src/branchCleanup";
import type { BranchCleanupAheadBehind, WorktreeCollection } from "../../src/types";

const NUL = "\0";
const OID_A = "a".repeat(40);
const OID_B = "b".repeat(40);
const OID_C = "c".repeat(40);
const OID_D = "d".repeat(40);
const TREE_A = "1".repeat(40);
const TREE_B = "2".repeat(40);

function snapshotLine(
  refname: string,
  head: string,
  upstream: string,
  track: string,
  date: string,
  objectName: string,
  tree: string
): string {
  return [refname, head, upstream, track, date, objectName, tree].join(NUL);
}

function makeEntry(overrides: Partial<BranchSnapshotEntry> = {}): BranchSnapshotEntry {
  return {
    branchName: "main",
    isCurrent: false,
    commitOid: OID_A,
    treeOid: TREE_A,
    upstream: { kind: "unset" },
    lastCommit: { kind: "known", unixSeconds: 1700000100 },
    ...overrides
  };
}

const EMPTY_WORKTREES: WorktreeCollection = { branches: {}, detached: [] };

// S1: NUL snapshot parse と record / field validation
// @see docs/testing/perspectives/src/branchCleanup-test.md
describe("parseBranchSnapshot", () => {
  it("parses two valid records preserving input order (TC-001)", () => {
    // Case: TC-001
    // Given: two well-formed 7-field records in --sort=refname order
    const stdout = `${snapshotLine("refs/heads/main", "*", "", "", "1700000100", OID_A, TREE_A)}\n${snapshotLine("refs/heads/feature/x", " ", "", "", "1700000200", OID_B, TREE_B)}\n`;

    // When: the snapshot is parsed
    const entries = parseBranchSnapshot(stdout);

    // Then: both entries keep every fact and the input order
    expect(entries).toEqual([
      {
        branchName: "main",
        isCurrent: true,
        commitOid: OID_A,
        treeOid: TREE_A,
        upstream: { kind: "unset" },
        lastCommit: { kind: "known", unixSeconds: 1700000100 }
      },
      {
        branchName: "feature/x",
        isCurrent: false,
        commitOid: OID_B,
        treeOid: TREE_B,
        upstream: { kind: "unset" },
        lastCommit: { kind: "known", unixSeconds: 1700000200 }
      }
    ]);
  });

  it("maps a tracking upstream with empty track to present (TC-002)", () => {
    // Case: TC-002
    // Given: a record whose upstream is refs/remotes/origin/feature/x with empty track
    const stdout = snapshotLine(
      "refs/heads/feature/x",
      " ",
      "refs/remotes/origin/feature/x",
      "",
      "1700000200",
      OID_B,
      TREE_B
    );

    // When: the snapshot is parsed
    const entries = parseBranchSnapshot(stdout);

    // Then: the upstream fact is present with the shortened name
    expect(entries[0].upstream).toEqual({ kind: "present", name: "origin/feature/x" });
  });

  it("maps an empty upstream to unset instead of unknown (TC-003)", () => {
    // Case: TC-003
    // Given: a record whose %(upstream) field is empty
    const stdout = snapshotLine("refs/heads/main", "*", "", "", "1700000100", OID_A, TREE_A);

    // When: the snapshot is parsed
    const entries = parseBranchSnapshot(stdout);

    // Then: the upstream fact is unset (not unknown)
    expect(entries[0].upstream).toEqual({ kind: "unset" });
  });

  it("maps a [gone] track to gone while keeping the name (TC-004)", () => {
    // Case: TC-004
    // Given: a record with an upstream whose track is [gone]
    const stdout = snapshotLine(
      "refs/heads/feature/x",
      " ",
      "refs/remotes/origin/feature/x",
      "[gone]",
      "1700000200",
      OID_B,
      TREE_B
    );

    // When: the snapshot is parsed
    const entries = parseBranchSnapshot(stdout);

    // Then: the upstream fact is gone with the shortened name
    expect(entries[0].upstream).toEqual({ kind: "gone", name: "origin/feature/x" });
  });

  it("drops a non-refs/heads record on its own (TC-005)", () => {
    // Case: TC-005
    // Given: a refs/tags record mixed with one valid record
    const stdout = `${snapshotLine("refs/tags/v1", " ", "", "", "1700000000", OID_C, TREE_A)}\n${snapshotLine("refs/heads/main", "*", "", "", "1700000100", OID_A, TREE_A)}`;

    // When: the snapshot is parsed
    const entries = parseBranchSnapshot(stdout);

    // Then: only the valid record remains with all of its facts intact
    expect(entries).toEqual([
      {
        branchName: "main",
        isCurrent: true,
        commitOid: OID_A,
        treeOid: TREE_A,
        upstream: { kind: "unset" },
        lastCommit: { kind: "known", unixSeconds: 1700000100 }
      }
    ]);
  });

  it("drops a record with fewer than 7 fields on its own (TC-006)", () => {
    // Case: TC-006
    // Given: a 6-field record mixed with one valid record
    const shortRecord = ["refs/heads/broken", " ", "", "", "1700000000", OID_C].join(NUL);
    const stdout = `${shortRecord}\n${snapshotLine("refs/heads/main", "*", "", "", "1700000100", OID_A, TREE_A)}`;

    // When: the snapshot is parsed
    const entries = parseBranchSnapshot(stdout);

    // Then: only the valid record remains with all of its facts intact
    expect(entries).toEqual([
      {
        branchName: "main",
        isCurrent: true,
        commitOid: OID_A,
        treeOid: TREE_A,
        upstream: { kind: "unset" },
        lastCommit: { kind: "known", unixSeconds: 1700000100 }
      }
    ]);
  });

  it("degrades only the commit OID for an invalid %(objectname) (TC-007)", () => {
    // Case: TC-007
    // Given: a record whose object name is not an OID
    const stdout = snapshotLine("refs/heads/main", "*", "", "", "1700000100", "xyz", TREE_A);

    // When: the snapshot is parsed
    const entries = parseBranchSnapshot(stdout);

    // Then: the commit OID is not kept while identity and other facts survive
    expect(entries[0].commitOid).toBeNull();
    expect(entries[0].branchName).toBe("main");
    expect(entries[0].treeOid).toBe(TREE_A);
    expect(entries[0].lastCommit).toEqual({ kind: "known", unixSeconds: 1700000100 });
  });

  it("degrades only the tree OID for an invalid %(tree) (TC-008)", () => {
    // Case: TC-008
    // Given: a record whose tree field is not an OID
    const stdout = snapshotLine("refs/heads/main", "*", "", "", "1700000100", OID_A, "xyz");

    // When: the snapshot is parsed
    const entries = parseBranchSnapshot(stdout);

    // Then: the tree OID is not kept while the other facts survive
    expect(entries[0].treeOid).toBeNull();
    expect(entries[0].branchName).toBe("main");
    expect(entries[0].commitOid).toBe(OID_A);
    expect(entries[0].lastCommit).toEqual({ kind: "known", unixSeconds: 1700000100 });
  });

  it("degrades only the last commit date for a non-numeric date (TC-009)", () => {
    // Case: TC-009
    // Given: a record whose committer date is non-numeric
    const stdout = snapshotLine("refs/heads/main", "*", "", "", "abc", OID_A, TREE_A);

    // When: the snapshot is parsed
    const entries = parseBranchSnapshot(stdout);

    // Then: only the last commit fact becomes unknown
    expect(entries[0].lastCommit).toEqual({ kind: "unknown" });
    expect(entries[0].branchName).toBe("main");
    expect(entries[0].commitOid).toBe(OID_A);
    expect(entries[0].treeOid).toBe(TREE_A);
  });

  it("returns an empty snapshot for empty stdout without throwing (TC-010)", () => {
    // Case: TC-010
    // Given: an empty for-each-ref output
    // When: the snapshot is parsed
    const entries = parseBranchSnapshot("");

    // Then: an empty (successful) snapshot is returned
    expect(entries).toEqual([]);
  });

  it("parses a single valid record (TC-011)", () => {
    // Case: TC-011
    // Given: exactly one valid record
    const stdout = snapshotLine("refs/heads/main", "*", "", "", "1700000100", OID_A, TREE_A);

    // When: the snapshot is parsed
    const entries = parseBranchSnapshot(stdout);

    // Then: one entry is returned with every fact matching the input
    expect(entries).toEqual([
      {
        branchName: "main",
        isCurrent: true,
        commitOid: OID_A,
        treeOid: TREE_A,
        upstream: { kind: "unset" },
        lastCommit: { kind: "known", unixSeconds: 1700000100 }
      }
    ]);
  });

  it("keeps a unix seconds value of 0 as known (TC-012)", () => {
    // Case: TC-012
    // Given: a record whose committer date is the epoch 0
    const stdout = snapshotLine("refs/heads/main", "*", "", "", "0", OID_A, TREE_A);

    // When: the snapshot is parsed
    const entries = parseBranchSnapshot(stdout);

    // Then: the epoch value stays known instead of degrading to unknown
    expect(entries[0].lastCommit).toEqual({ kind: "known", unixSeconds: 0 });
  });

  it("keeps special branch names as plain data (TC-013)", () => {
    // Case: TC-013
    // Given: records named a;b, feat/$(date) and x<img>
    const stdout = [
      snapshotLine("refs/heads/a;b", " ", "", "", "1700000100", OID_A, TREE_A),
      snapshotLine("refs/heads/feat/$(date)", " ", "", "", "1700000100", OID_B, TREE_A),
      snapshotLine("refs/heads/x<img>", " ", "", "", "1700000100", OID_C, TREE_A)
    ].join("\n");

    // When: the snapshot is parsed
    const entries = parseBranchSnapshot(stdout);

    // Then: the names survive unmodified and unfiltered
    expect(entries).toHaveLength(3);
    expect(entries[0].branchName).toBe("a;b");
    expect(entries[1].branchName).toBe("feat/$(date)");
    expect(entries[2].branchName).toBe("x<img>");
  });
});

// S2: 比較先解決（requested / origin/HEAD / main / master / current fallback）
// @see docs/testing/perspectives/src/branchCleanup-test.md
describe("resolveCompareBranch", () => {
  it("uses an exact snapshot match for the requested branch (TC-014)", () => {
    // Case: TC-014
    // Given: a snapshot containing develop and a request for develop
    const develop = makeEntry({ branchName: "develop", commitOid: OID_D });
    const main = makeEntry({ branchName: "main", isCurrent: true });

    // When: the comparison target is resolved
    const resolved = resolveCompareBranch([develop, main], null, "develop");

    // Then: the resolved branch is develop with its own snapshot OID
    expect(resolved).not.toBeNull();
    expect(resolved!.branchName).toBe("develop");
    expect(resolved!.commitOid).toBe(OID_D);
  });

  it("falls back when the requested branch vanished from the snapshot (TC-015)", () => {
    // Case: TC-015
    // Given: the requested branch is absent while origin/HEAD points at an existing local main
    const main = makeEntry({ branchName: "main", commitOid: OID_A });
    const topic = makeEntry({ branchName: "topic", commitOid: OID_B, isCurrent: true });

    // When: the vanished name is requested
    const resolved = resolveCompareBranch([main, topic], "main", "gone-branch");

    // Then: the fallback resolves to main without inventing an OID for the vanished name
    expect(resolved).not.toBeNull();
    expect(resolved!.branchName).toBe("main");
    expect(resolved!.commitOid).toBe(OID_A);
  });

  it("resolves origin/HEAD through the same-name local branch only (TC-016)", () => {
    // Case: TC-016
    // Given: origin/HEAD points at refs/remotes/origin/main and a local main exists
    const originHeadTarget = parseOriginHeadTarget(
      ["refs/remotes/origin/HEAD", "refs/remotes/origin/main"].join(NUL)
    );
    const main = makeEntry({ branchName: "main", commitOid: OID_A });

    // When: the comparison target is resolved with no requested branch
    const resolved = resolveCompareBranch([main], originHeadTarget, null);

    // Then: the local main entry (with the local OID) is used, never a remote-side OID
    expect(originHeadTarget).toBe("main");
    expect(resolved).not.toBeNull();
    expect(resolved!.branchName).toBe("main");
    expect(resolved!.commitOid).toBe(OID_A);
  });

  it("skips an origin/HEAD target that has no same-name local branch (TC-017)", () => {
    // Case: TC-017
    // Given: origin/HEAD points at release but only main exists locally
    const main = makeEntry({ branchName: "main", commitOid: OID_A });
    const topic = makeEntry({ branchName: "topic", commitOid: OID_B, isCurrent: true });

    // When: the comparison target is resolved
    const resolved = resolveCompareBranch([main, topic], "release", null);

    // Then: the origin/HEAD value is skipped and main is used
    expect(resolved).not.toBeNull();
    expect(resolved!.branchName).toBe("main");
  });

  it("falls back to master when origin/HEAD and main are absent (TC-018)", () => {
    // Case: TC-018
    // Given: no origin/HEAD, no main, but a local master
    const master = makeEntry({ branchName: "master", commitOid: OID_A });
    const topic = makeEntry({ branchName: "topic", commitOid: OID_B, isCurrent: true });

    // When: the comparison target is resolved
    const resolved = resolveCompareBranch([master, topic], null, null);

    // Then: master is used
    expect(resolved).not.toBeNull();
    expect(resolved!.branchName).toBe("master");
  });

  it("falls back to the current branch last (TC-019)", () => {
    // Case: TC-019
    // Given: no origin/HEAD, no main, no master, but a current topic branch
    const topic = makeEntry({ branchName: "topic", commitOid: OID_B, isCurrent: true });
    const other = makeEntry({ branchName: "other", commitOid: OID_C });

    // When: the comparison target is resolved
    const resolved = resolveCompareBranch([other, topic], null, null);

    // Then: the current branch is used
    expect(resolved).not.toBeNull();
    expect(resolved!.branchName).toBe("topic");
  });

  it("returns null when detached and every fallback is absent (TC-020)", () => {
    // Case: TC-020
    // Given: no entry is current and no fallback name exists
    const alpha = makeEntry({ branchName: "alpha", commitOid: OID_A });
    const beta = makeEntry({ branchName: "beta", commitOid: OID_B });

    // When: the comparison target is resolved
    const resolved = resolveCompareBranch([alpha, beta], null, null);

    // Then: no default is fabricated
    expect(resolved).toBeNull();
  });

  it("resolves a single current branch to itself (TC-021)", () => {
    // Case: TC-021
    // Given: a snapshot with only the current branch
    const solo = makeEntry({ branchName: "solo", commitOid: OID_A, isCurrent: true });

    // When: the comparison target is resolved with no requested branch
    const resolved = resolveCompareBranch([solo], null, null);

    // Then: the branch becomes its own comparison target
    expect(resolved).not.toBeNull();
    expect(resolved!.branchName).toBe("solo");
  });
});

// S3: ahead/behind parse と remote ref 完全一致
// @see docs/testing/perspectives/src/branchCleanup-test.md
describe("parseAheadBehind / deriveAncestry / matchRemoteRefs", () => {
  it("parses 0 TAB 0 as known and derives ancestor (TC-022)", () => {
    // Case: TC-022
    // Given: rev-list output for identical points
    const parsed = parseAheadBehind("0\t0");

    // When/Then: the counts are known and the right value of 0 derives ancestor
    expect(parsed).toEqual({ kind: "known", ahead: 0, behind: 0 });
    expect(deriveAncestry(parsed)).toBe("ancestor");
  });

  it("parses 3 TAB 2 with left=behind right=ahead and derives notAncestor (TC-023)", () => {
    // Case: TC-023
    // Given: rev-list output with commits on both sides
    const parsed = parseAheadBehind("3\t2");

    // When/Then: left maps to behind, right maps to ahead, and ahead > 0 denies ancestry
    expect(parsed).toEqual({ kind: "known", ahead: 2, behind: 3 });
    expect(deriveAncestry(parsed)).toBe("notAncestor");
  });

  it("keeps ancestry for behind-only counts (TC-024)", () => {
    // Case: TC-024
    // Given: rev-list output where only the compare side advanced
    const parsed = parseAheadBehind("5\t0");

    // When/Then: the left value never disproves ancestry
    expect(parsed).toEqual({ kind: "known", ahead: 0, behind: 5 });
    expect(deriveAncestry(parsed)).toBe("ancestor");
  });

  it("maps malformed rev-list output to unknown (TC-025)", () => {
    // Case: TC-025
    // Given: non-numeric output and output missing the TAB separator
    const nonNumeric = parseAheadBehind("abc");
    const noTab = parseAheadBehind("3 2");

    // When/Then: both degrade to unknown instead of a lossy number
    expect(nonNumeric).toEqual({ kind: "unknown" });
    expect(noTab).toEqual({ kind: "unknown" });
    expect(deriveAncestry(nonNumeric)).toBe("unknown");
  });

  it("maps counts beyond the safe integer range to unknown (TC-026)", () => {
    // Case: TC-026
    // Given: a left count of Number.MAX_SAFE_INTEGER + 2
    const parsed = parseAheadBehind("9007199254740993\t0");

    // When/Then: the lossy value is not reported as known
    expect(parsed).toEqual({ kind: "unknown" });
  });

  it("matches a remote by the exact full ref (TC-027)", () => {
    // Case: TC-027
    // Given: origin carries refs/remotes/origin/feature/x
    const remotes = matchRemoteRefs("feature/x", ["origin"], ["refs/remotes/origin/feature/x"]);

    // When/Then: origin is matched
    expect(remotes).toEqual(["origin"]);
  });

  it("matches a slash-containing remote name without splitting (TC-028)", () => {
    // Case: TC-028
    // Given: a remote named my/remote carrying feat
    const remotes = matchRemoteRefs("feat", ["my", "my/remote"], ["refs/remotes/my/remote/feat"]);

    // When/Then: only the full-ref exact match my/remote is returned
    expect(remotes).toEqual(["my/remote"]);
  });

  it("rejects prefix matches (TC-029)", () => {
    // Case: TC-029
    // Given: only a ref with a -suffix exists
    const remotes = matchRemoteRefs(
      "feature/x",
      ["origin"],
      ["refs/remotes/origin/feature/x-suffix"]
    );

    // When/Then: no prefix or partial match is adopted
    expect(remotes).toEqual([]);
  });

  it("returns an empty array (not null) for an empty successful ref set (TC-030)", () => {
    // Case: TC-030
    // Given: a successfully fetched but empty remote ref list
    const remotes = matchRemoteRefs("feature/x", ["origin"], []);

    // When/Then: the successful empty set stays an array
    expect(remotes).toEqual([]);
  });
});

// S4: 行合成（fact 独立・failure 局所化・反例）
// @see docs/testing/perspectives/src/branchCleanup-test.md
describe("synthesizeRows", () => {
  it("keeps ancestry for a normal merge even when trees differ (TC-031)", () => {
    // Case: TC-031
    // Given: ahead 0 / behind 2 with a compare tree different from the branch tree
    const compare = makeEntry({ branchName: "main", treeOid: TREE_A, isCurrent: true });
    const branch = makeEntry({ branchName: "feature/x", commitOid: OID_B, treeOid: TREE_B });
    const comparisons = new Map<string, BranchCleanupAheadBehind>([
      ["feature/x", { kind: "known", ahead: 0, behind: 2 }]
    ]);

    // When: the rows are synthesized
    const rows = synthesizeRows([branch], compare, comparisons, EMPTY_WORKTREES, [], []);

    // Then: the branch stays an ancestor while the tree difference is reported independently
    expect(rows).toEqual([
      {
        branchName: "feature/x",
        isCurrent: false,
        ancestry: "ancestor",
        aheadBehind: { kind: "known", ahead: 0, behind: 2 },
        treeDifference: "different",
        upstream: { kind: "unset" },
        worktree: { kind: "unused" },
        lastCommit: { kind: "known", unixSeconds: 1700000100 },
        remotes: []
      }
    ]);
  });

  it("keeps notAncestor for a squash even when trees are identical (TC-032)", () => {
    // Case: TC-032
    // Given: ahead 1 / behind 1 with identical compare and branch trees
    const compare = makeEntry({ branchName: "main", treeOid: TREE_A, isCurrent: true });
    const branch = makeEntry({ branchName: "feature/x", commitOid: OID_B, treeOid: TREE_A });
    const comparisons = new Map<string, BranchCleanupAheadBehind>([
      ["feature/x", { kind: "known", ahead: 1, behind: 1 }]
    ]);

    // When: the rows are synthesized
    const rows = synthesizeRows([branch], compare, comparisons, EMPTY_WORKTREES, [], []);

    // Then: the identical tree never turns the branch into an ancestor
    expect(rows).toEqual([
      {
        branchName: "feature/x",
        isCurrent: false,
        ancestry: "notAncestor",
        aheadBehind: { kind: "known", ahead: 1, behind: 1 },
        treeDifference: "same",
        upstream: { kind: "unset" },
        worktree: { kind: "unused" },
        lastCommit: { kind: "known", unixSeconds: 1700000100 },
        remotes: []
      }
    ]);
  });

  it("computes the tree difference independently of an unknown comparison (TC-033)", () => {
    // Case: TC-033
    // Given: an unknown comparison result but valid tree OIDs on both sides
    const compare = makeEntry({ branchName: "main", treeOid: TREE_A, isCurrent: true });
    const branch = makeEntry({ branchName: "feature/x", commitOid: OID_B, treeOid: TREE_A });
    const comparisons = new Map<string, BranchCleanupAheadBehind>([
      ["feature/x", { kind: "unknown" }]
    ]);

    // When: the rows are synthesized
    const rows = synthesizeRows([branch], compare, comparisons, EMPTY_WORKTREES, [], []);

    // Then: ancestry stays unknown while the tree column is still derived from the OIDs
    expect(rows[0].ancestry).toBe("unknown");
    expect(rows[0].aheadBehind).toEqual({ kind: "unknown" });
    expect(rows[0].treeDifference).toBe("same");
  });

  it("maps a matching worktree entry to used (TC-034)", () => {
    // Case: TC-034
    // Given: a worktree collection that carries the branch
    const branch = makeEntry({ branchName: "feature/x", commitOid: OID_B });
    const worktrees: WorktreeCollection = {
      branches: { "feature/x": { path: "/wt/x", isMain: false } },
      detached: []
    };

    // When: the rows are synthesized
    const rows = synthesizeRows([branch], null, new Map(), worktrees, [], []);

    // Then: the worktree fact is used with path and isMain from the input
    expect(rows[0].worktree).toEqual({ kind: "used", path: "/wt/x", isMain: false });
  });

  it("maps a successful collection without the branch to unused (TC-035)", () => {
    // Case: TC-035
    // Given: a successfully fetched worktree collection without the branch
    const branch = makeEntry({ branchName: "feature/x", commitOid: OID_B });

    // When: the rows are synthesized
    const rows = synthesizeRows([branch], null, new Map(), EMPTY_WORKTREES, [], []);

    // Then: the worktree fact is unused
    expect(rows[0].worktree).toEqual({ kind: "unused" });
  });

  it("keeps a failed worktree collection as unknown on every row (TC-036)", () => {
    // Case: TC-036
    // Given: a failed worktree collection (null)
    const alpha = makeEntry({ branchName: "alpha" });
    const beta = makeEntry({ branchName: "beta", commitOid: OID_B });

    // When: the rows are synthesized
    const rows = synthesizeRows([alpha, beta], null, new Map(), null, [], []);

    // Then: every row keeps the failure as unknown instead of unused
    expect(rows[0].worktree).toEqual({ kind: "unknown" });
    expect(rows[1].worktree).toEqual({ kind: "unknown" });
  });

  it("keeps a failed remote list as null on every row (TC-037)", () => {
    // Case: TC-037
    // Given: a failed remote name list (null)
    const alpha = makeEntry({ branchName: "alpha" });
    const beta = makeEntry({ branchName: "beta", commitOid: OID_B });

    // When: the rows are synthesized
    const rows = synthesizeRows([alpha, beta], null, new Map(), EMPTY_WORKTREES, null, []);

    // Then: every row keeps null instead of an empty array
    expect(rows[0].remotes).toBeNull();
    expect(rows[1].remotes).toBeNull();
  });

  it("propagates notSelected when no comparison target exists (TC-038)", () => {
    // Case: TC-038
    // Given: no comparison target
    const alpha = makeEntry({ branchName: "alpha" });
    const beta = makeEntry({ branchName: "beta", commitOid: OID_B });

    // When: the rows are synthesized
    const rows = synthesizeRows([alpha, beta], null, new Map(), EMPTY_WORKTREES, [], []);

    // Then: every comparison fact is notSelected, never unknown
    for (const row of rows) {
      expect(row.ancestry).toBe("notSelected");
      expect(row.treeDifference).toBe("notSelected");
      expect(row.aheadBehind).toEqual({ kind: "notSelected" });
    }
  });

  it("returns an empty array for an empty snapshot (TC-039)", () => {
    // Case: TC-039
    // Given: an empty snapshot
    // When: the rows are synthesized
    const rows = synthesizeRows([], null, new Map(), EMPTY_WORKTREES, [], []);

    // Then: the successful empty state is returned without throwing
    expect(rows).toEqual([]);
  });

  it("does not mutate its inputs and returns a new array (TC-040)", () => {
    // Case: TC-040
    // Given: deep copies of every input taken before the call
    const compare = makeEntry({ branchName: "main", isCurrent: true });
    const entries = [compare, makeEntry({ branchName: "feature/x", commitOid: OID_B })];
    const comparisons = new Map<string, BranchCleanupAheadBehind>([
      ["feature/x", { kind: "known", ahead: 1, behind: 0 }]
    ]);
    const worktrees: WorktreeCollection = {
      branches: { "feature/x": { path: "/wt/x", isMain: false } },
      detached: []
    };
    const remoteNames = ["origin"];
    const remoteRefs = ["refs/remotes/origin/feature/x"];
    const entriesCopy = structuredClone(entries);
    const comparisonsCopy = structuredClone(comparisons);
    const worktreesCopy = structuredClone(worktrees);
    const remoteNamesCopy = structuredClone(remoteNames);
    const remoteRefsCopy = structuredClone(remoteRefs);

    // When: the rows are synthesized
    const rows = synthesizeRows(entries, compare, comparisons, worktrees, remoteNames, remoteRefs);

    // Then: every input equals its pre-call copy and the result is a fresh array
    expect(entries).toEqual(entriesCopy);
    expect(comparisons).toEqual(comparisonsCopy);
    expect(worktrees).toEqual(worktreesCopy);
    expect(remoteNames).toEqual(remoteNamesCopy);
    expect(remoteRefs).toEqual(remoteRefsCopy);
    expect(rows).not.toBe(entries);
  });
});

// S5: HEAD mark・upstream prefix・origin 外 symref の fact 劣化
// @see docs/testing/perspectives/src/branchCleanup-test.md
describe("fact degradation for invalid HEAD mark, upstream prefix and non-origin symref", () => {
  it("degrades only isCurrent to null for an unexpected HEAD mark (TC-041)", () => {
    // Case: TC-041
    // Given: a record whose %(HEAD) field is neither "*", a space, nor empty
    const stdout = snapshotLine("refs/heads/main", "?", "", "", "1700000100", OID_A, TREE_A);

    // When: the snapshot is parsed
    const entries = parseBranchSnapshot(stdout);

    // Then: isCurrent becomes null (not true / false) while the other facts survive
    expect(entries[0].isCurrent).toBeNull();
    expect(entries[0].branchName).toBe("main");
    expect(entries[0].commitOid).toBe(OID_A);
    expect(entries[0].lastCommit).toEqual({ kind: "known", unixSeconds: 1700000100 });
  });

  it("degrades only the upstream fact to unknown for an unexpected ref prefix (TC-042)", () => {
    // Case: TC-042
    // Given: a record whose %(upstream) is neither refs/remotes/ nor refs/heads/
    const stdout = snapshotLine(
      "refs/heads/feature/x",
      " ",
      "refs/foo/bar",
      "",
      "1700000200",
      OID_B,
      TREE_B
    );

    // When: the snapshot is parsed
    const entries = parseBranchSnapshot(stdout);

    // Then: the upstream fact is unknown (not unset / present) while the others survive
    expect(entries[0].upstream).toEqual({ kind: "unknown" });
    expect(entries[0].branchName).toBe("feature/x");
    expect(entries[0].commitOid).toBe(OID_B);
    expect(entries[0].lastCommit).toEqual({ kind: "known", unixSeconds: 1700000200 });
  });

  it("ignores an origin/HEAD symref outside origin and falls back to main (TC-043)", () => {
    // Case: TC-043
    // Given: origin/HEAD whose symref points outside refs/remotes/origin/
    const originHeadTarget = parseOriginHeadTarget(
      ["refs/remotes/origin/HEAD", "refs/remotes/upstream/main"].join(NUL)
    );
    const main = makeEntry({ branchName: "main", commitOid: OID_A });
    const topic = makeEntry({ branchName: "topic", commitOid: OID_B, isCurrent: true });

    // When: the comparison target is resolved with no requested branch
    const resolved = resolveCompareBranch([main, topic], originHeadTarget, null);

    // Then: the non-origin symref yields null and the next fallback (main) is used
    expect(originHeadTarget).toBeNull();
    expect(resolved).not.toBeNull();
    expect(resolved!.branchName).toBe("main");
  });
});
