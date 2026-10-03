import { describe, expect, it } from "vitest";

import type { GitCommitNode } from "../../src/types";
import { UNCOMMITTED_CHANGES_HASH } from "../../src/types";
import { computePathHighlight, pathEdgeKey, PathHighlightMode } from "../../web/pathHighlight";

/* ------------------------------------------------------------------ */
/* Fixtures                                                           */
/* ------------------------------------------------------------------ */

const { Direct, AncestorsAndDescendants, FirstParent, AllAncestors } = PathHighlightMode;
const ALL_MODES = [Direct, AncestorsAndDescendants, FirstParent, AllAncestors];
const MISSING_TARGET = "Z";
const STASH_HASH = "S1";
// Linear history length for TC-020 (recorded in the perspectives Notes; no timing threshold).
const LONG_HISTORY_LENGTH = 100000;

function node(
  hash: string,
  parentHashes: string[],
  extra: Partial<GitCommitNode> = {}
): GitCommitNode {
  return {
    hash,
    parentHashes,
    author: "a",
    email: "e",
    date: 0,
    message: `m ${hash}`,
    refs: [],
    stash: null,
    ...extra
  };
}

/** Expected edge keys are written as the literal JSON pair, independent of `pathEdgeKey`. */
function edge(childHash: string, parentHash: string): string {
  return `["${childHash}","${parentHash}"]`;
}

function standard(): GitCommitNode[] {
  return [
    node("N", ["M"]),
    node("M", ["A", "B"]),
    node("A", ["R"]),
    node("B", ["R"]),
    node("U", ["R"]),
    node("R", []),
    node("X", [])
  ];
}

function stashRow(): GitCommitNode {
  return node(STASH_HASH, ["M"], {
    stash: { selector: "stash@{0}", baseHash: "M", untrackedFilesHash: null }
  });
}

/** Expected sets of the four TC-001 to TC-004 operations, reused by TC-011. */
const STANDARD_EXPECTATIONS: [
  target: string,
  mode: PathHighlightMode,
  hashes: string[],
  edges: string[]
][] = [
  ["M", Direct, ["N", "M", "A", "B"], [edge("N", "M"), edge("M", "A"), edge("M", "B")]],
  [
    "A",
    AncestorsAndDescendants,
    ["N", "M", "A", "R"],
    [edge("N", "M"), edge("M", "A"), edge("A", "R")]
  ],
  [
    "M",
    AllAncestors,
    ["M", "A", "B", "R"],
    [edge("M", "A"), edge("M", "B"), edge("A", "R"), edge("B", "R")]
  ],
  ["M", FirstParent, ["M", "A", "R"], [edge("M", "A"), edge("A", "R")]]
];

/* ------------------------------------------------------------------ */
/* S1: acceptance rows of plan §3.7                                   */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/pathHighlight-test.md
describe("computePathHighlight() acceptance rows (S1)", () => {
  it("returns the direct parents and children of M (TC-001)", () => {
    // Case: TC-001
    // Given: the standard fixture
    // When: M is computed in Direct mode
    const result = computePathHighlight(standard(), "M", Direct);

    // Then: N, M, A, B with the three connections and no boundary; the key format is the JSON pair
    expect(result.targetFound).toBe(true);
    expect(result.hashes).toEqual(new Set(["N", "M", "A", "B"]));
    expect(result.edgeKeys).toEqual(new Set([edge("N", "M"), edge("M", "A"), edge("M", "B")]));
    expect(result.boundaries).toEqual([]);
    expect(pathEdgeKey("N", "M")).toBe('["N","M"]');
  });

  it("walks ancestors and descendants of A independently (TC-002)", () => {
    // Case: TC-002
    const result = computePathHighlight(standard(), "A", AncestorsAndDescendants);

    // Then: the descendant M does not pull in its other parent B
    expect(result.hashes).toEqual(new Set(["N", "M", "A", "R"]));
    expect(result.edgeKeys).toEqual(new Set([edge("N", "M"), edge("M", "A"), edge("A", "R")]));
    expect(result.boundaries).toEqual([]);
  });

  it("returns all ancestors of M without its child (TC-003)", () => {
    // Case: TC-003
    const result = computePathHighlight(standard(), "M", AllAncestors);

    expect(result.hashes).toEqual(new Set(["M", "A", "B", "R"]));
    expect(result.edgeKeys).toEqual(
      new Set([edge("M", "A"), edge("M", "B"), edge("A", "R"), edge("B", "R")])
    );
    expect(result.boundaries).toEqual([]);
  });

  it("follows only the first parent of M (TC-004)", () => {
    // Case: TC-004
    const result = computePathHighlight(standard(), "M", FirstParent);

    expect(result.hashes).toEqual(new Set(["M", "A", "R"]));
    expect(result.edgeKeys).toEqual(new Set([edge("M", "A"), edge("A", "R")]));
    expect(result.boundaries).toEqual([]);
  });

  it("finds a parentless target with empty sets and no boundary (TC-005)", () => {
    // Case: TC-005
    const result = computePathHighlight(standard(), "R", AllAncestors);

    // Then: found, only R, no connection, no boundary (distinct from TC-012)
    expect(result.targetFound).toBe(true);
    expect(result.hashes).toEqual(new Set(["R"]));
    expect(result.edgeKeys).toEqual(new Set());
    expect(result.boundaries).toEqual([]);
  });

  it("does not substitute the second parent for a missing first parent (TC-006)", () => {
    // Case: TC-006
    const result = computePathHighlight(
      [node("M", ["missing", "B"]), node("B", [])],
      "M",
      FirstParent
    );

    expect(result.hashes).toEqual(new Set(["M"]));
    expect(result.edgeKeys).toEqual(new Set());
    expect(result.boundaries).toEqual([{ childHash: "M", parentHash: "missing" }]);
  });

  it("does not report a second parent the mode never follows (TC-007)", () => {
    // Case: TC-007
    const result = computePathHighlight(
      [node("M", ["A", "missing"]), node("A", [])],
      "M",
      FirstParent
    );

    expect(result.hashes).toEqual(new Set(["M", "A"]));
    expect(result.edgeKeys).toEqual(new Set([edge("M", "A")]));
    expect(result.boundaries).toEqual([]);
  });

  it("does not bridge a missing parent to a loaded commit (TC-008)", () => {
    // Case: TC-008
    const result = computePathHighlight([node("T", ["gap"]), node("R", [])], "T", AllAncestors);

    expect(result.hashes).toEqual(new Set(["T"]));
    expect(result.edgeKeys).toEqual(new Set());
    expect(result.boundaries).toEqual([{ childHash: "T", parentHash: "gap" }]);
  });

  it("extends the path once the missing parent is loaded (TC-009)", () => {
    // Case: TC-009
    const result = computePathHighlight(
      [node("T", ["gap"]), node("R", []), node("gap", ["R"])],
      "T",
      AllAncestors
    );

    expect(result.hashes).toEqual(new Set(["T", "gap", "R"]));
    expect(result.edgeKeys).toEqual(new Set([edge("T", "gap"), edge("gap", "R")]));
    expect(result.boundaries).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* S2: structure, pseudo rows, missing target, boundary order         */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/pathHighlight-test.md
describe("computePathHighlight() structure and pseudo rows (S2)", () => {
  function threeParents(): GitCommitNode[] {
    return [node("O", ["P", "Q", "S"]), node("P", []), node("Q", []), node("S", [])];
  }

  it.each([
    [AllAncestors, ["O", "P", "Q", "S"], [edge("O", "P"), edge("O", "Q"), edge("O", "S")]],
    [FirstParent, ["O", "P"], [edge("O", "P")]]
  ])("handles a merge with three parents in %s mode (TC-010)", (mode, hashes, edges) => {
    // Case: TC-010
    const result = computePathHighlight(threeParents(), "O", mode);

    expect(result.hashes).toEqual(new Set(hashes));
    expect(result.edgeKeys).toEqual(new Set(edges));
    expect(result.boundaries).toEqual([]);
  });

  it.each(STANDARD_EXPECTATIONS)(
    "returns the same sets for %s/%s when the input is reversed (TC-011)",
    (target, mode, hashes, edges) => {
      // Case: TC-011
      const result = computePathHighlight([...standard()].reverse(), target, mode);

      expect(result.hashes).toEqual(new Set(hashes));
      expect(result.edgeKeys).toEqual(new Set(edges));
      expect(result.boundaries).toEqual([]);
    }
  );

  it.each(ALL_MODES)("reports a missing target as not found in %s mode (TC-012)", (mode) => {
    // Case: TC-012
    const result = computePathHighlight(standard(), MISSING_TARGET, mode);

    expect(result.targetFound).toBe(false);
    expect(result.hashes.size).toBe(0);
    expect(result.edgeKeys.size).toBe(0);
    expect(result.boundaries).toEqual([]);
  });

  it("reports not found for an empty input (TC-013)", () => {
    // Case: TC-013
    const result = computePathHighlight([], "M", AllAncestors);

    expect(result.targetFound).toBe(false);
    expect(result.hashes.size).toBe(0);
    expect(result.edgeKeys.size).toBe(0);
    expect(result.boundaries).toEqual([]);
  });

  it("never targets the working tree row (TC-014)", () => {
    // Case: TC-014
    const result = computePathHighlight(
      [node(UNCOMMITTED_CHANGES_HASH, ["N"]), ...standard()],
      UNCOMMITTED_CHANGES_HASH,
      Direct
    );

    expect(result.targetFound).toBe(false);
    expect(result.hashes.size).toBe(0);
    expect(result.edgeKeys.size).toBe(0);
    expect(result.boundaries).toEqual([]);
  });

  it("never targets a stash row (TC-015)", () => {
    // Case: TC-015
    const result = computePathHighlight([...standard(), stashRow()], STASH_HASH, AllAncestors);

    expect(result.targetFound).toBe(false);
    expect(result.hashes.size).toBe(0);
    expect(result.edgeKeys.size).toBe(0);
    expect(result.boundaries).toEqual([]);
  });

  function withPseudoRows(): GitCommitNode[] {
    return [
      node(UNCOMMITTED_CHANGES_HASH, ["N"]),
      ...standard(),
      stashRow(),
      node("W", [STASH_HASH])
    ];
  }

  it.each([
    [
      "M",
      AncestorsAndDescendants,
      ["N", "M", "A", "B", "R"],
      [edge("N", "M"), edge("M", "A"), edge("M", "B"), edge("A", "R"), edge("B", "R")]
    ],
    ["M", Direct, ["N", "M", "A", "B"], [edge("N", "M"), edge("M", "A"), edge("M", "B")]],
    ["W", AllAncestors, ["W"], []]
  ])("skips pseudo rows while walking %s/%s (TC-016)", (target, mode, hashes, edges) => {
    // Case: TC-016
    const result = computePathHighlight(withPseudoRows(), target, mode);

    // Then: pseudo rows are neither vertices, connections nor boundaries
    expect(result.hashes).toEqual(new Set(hashes));
    expect(result.edgeKeys).toEqual(new Set(edges));
    expect(result.boundaries).toEqual([]);
    for (const key of result.edgeKeys) {
      expect(key).not.toContain(UNCOMMITTED_CHANGES_HASH);
      expect(key).not.toContain(STASH_HASH);
    }
  });

  function otherParentMissing(): GitCommitNode[] {
    return [node("N", ["M"]), node("M", ["A", "missing2"]), node("A", ["R"]), node("R", [])];
  }

  it.each([
    ["A", []],
    ["M", [{ childHash: "M", parentHash: "missing2" }]]
  ])(
    "reports a missing parent only for vertices reached as ancestors (%s) (TC-017)",
    (target, boundaries) => {
      // Case: TC-017
      const result = computePathHighlight(otherParentMissing(), target, AncestorsAndDescendants);

      expect(result.hashes).toEqual(new Set(["N", "M", "A", "R"]));
      expect(result.edgeKeys).toEqual(new Set([edge("N", "M"), edge("M", "A"), edge("A", "R")]));
      expect(result.boundaries).toEqual(boundaries);
    }
  );

  it.each([
    [
      "C3,C2,C1",
      [node("C3", ["C1", "C2"]), node("C2", ["C1", "g1"]), node("C1", ["g2", "g1"])],
      [
        { childHash: "C2", parentHash: "g1" },
        { childHash: "C1", parentHash: "g2" },
        { childHash: "C1", parentHash: "g1" }
      ]
    ],
    [
      "C1,C2,C3",
      [node("C1", ["g2", "g1"]), node("C2", ["C1", "g1"]), node("C3", ["C1", "C2"])],
      [
        { childHash: "C1", parentHash: "g2" },
        { childHash: "C1", parentHash: "g1" },
        { childHash: "C2", parentHash: "g1" }
      ]
    ]
  ])(
    "lists boundaries in display order, parent order, once each (%s) (TC-018)",
    (_order, commits, boundaries) => {
      // Case: TC-018
      const result = computePathHighlight(commits, "C3", AllAncestors);

      expect(result.hashes).toEqual(new Set(["C3", "C2", "C1"]));
      expect(result.edgeKeys).toEqual(
        new Set([edge("C3", "C1"), edge("C3", "C2"), edge("C2", "C1")])
      );
      expect(result.boundaries).toEqual(boundaries);
    }
  );

  it.each([
    [
      "the direct parents' own unloaded parent",
      [node("M", ["A", "B"]), node("A", ["gap"]), node("B", [])],
      ["M", "A", "B"],
      [edge("M", "A"), edge("M", "B")],
      []
    ],
    [
      "the target's own unloaded parent",
      [node("M", ["A", "gap"]), node("A", [])],
      ["M", "A"],
      [edge("M", "A")],
      [{ childHash: "M", parentHash: "gap" }]
    ]
  ])(
    "reports only the target's parents as boundaries in Direct mode: %s (TC-021)",
    (_label, commits, hashes, edges, boundaries) => {
      // Case: TC-021
      const result = computePathHighlight(commits, "M", Direct);

      expect(result.hashes).toEqual(new Set(hashes));
      expect(result.edgeKeys).toEqual(new Set(edges));
      expect(result.boundaries).toEqual(boundaries);
    }
  );
});

/* ------------------------------------------------------------------ */
/* S3: input immutability and long linear history                     */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/pathHighlight-test.md
describe("computePathHighlight() immutability and long history (S3)", () => {
  it("leaves a deeply frozen input untouched and returns fresh collections (TC-019)", () => {
    // Case: TC-019
    // Given: the standard fixture frozen down to parentHashes and refs
    const commits = standard();
    for (const commit of commits) {
      Object.freeze(commit.parentHashes);
      Object.freeze(commit.refs);
      Object.freeze(commit);
    }
    Object.freeze(commits);
    const serializedBefore = JSON.stringify(commits);
    const parentArrays = commits.map((commit) => commit.parentHashes);

    // When: M is computed in AllAncestors mode
    const result = computePathHighlight(commits, "M", AllAncestors);

    // Then: same result as TC-003, input unchanged, no input array returned
    expect(result.hashes).toEqual(new Set(["M", "A", "B", "R"]));
    expect(result.edgeKeys).toEqual(
      new Set([edge("M", "A"), edge("M", "B"), edge("A", "R"), edge("B", "R")])
    );
    expect(result.boundaries).toEqual([]);
    expect(JSON.stringify(commits)).toBe(serializedBefore);
    commits.forEach((commit, index) => {
      expect(commit.parentHashes).toBe(parentArrays[index]);
      expect(result.boundaries).not.toBe(commit.parentHashes);
      expect(result.boundaries).not.toBe(commit.refs);
    });
    expect(result.boundaries).not.toBe(commits);
  });

  it.each([
    ["c0", AllAncestors],
    [`c${LONG_HISTORY_LENGTH - 1}`, AncestorsAndDescendants]
  ])(
    "walks a linear history of LONG_HISTORY_LENGTH commits from %s without recursion (TC-020)",
    (target, mode) => {
      // Case: TC-020
      // Given: c0 -> c1 -> ... -> c(n-1) generated from an array
      const commits: GitCommitNode[] = [];
      for (let index = 0; index < LONG_HISTORY_LENGTH; index++) {
        const parents = index < LONG_HISTORY_LENGTH - 1 ? [`c${index + 1}`] : [];
        commits.push(node(`c${index}`, parents));
      }
      const first = "c0";
      const last = `c${LONG_HISTORY_LENGTH - 1}`;
      const secondLast = `c${LONG_HISTORY_LENGTH - 2}`;

      // When: the whole chain is walked
      const result = computePathHighlight(commits, target, mode);

      // Then: every vertex and connection is present, no boundary, no RangeError
      expect(result.hashes.size).toBe(LONG_HISTORY_LENGTH);
      expect(result.hashes.has(first)).toBe(true);
      expect(result.hashes.has(last)).toBe(true);
      expect(result.edgeKeys.size).toBe(LONG_HISTORY_LENGTH - 1);
      expect(result.edgeKeys.has(edge(first, "c1"))).toBe(true);
      expect(result.edgeKeys.has(edge(secondLast, last))).toBe(true);
      expect(result.boundaries).toEqual([]);
    }
  );
});
