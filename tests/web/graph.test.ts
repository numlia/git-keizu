import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GitCommitNode } from "../../src/types";

/* ------------------------------------------------------------------ */
/* Mock DOM                                                           */
/* ------------------------------------------------------------------ */

interface MockElement {
  tagName: string;
  attributes: Map<string, string>;
  children: MockElement[];
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  appendChild(child: unknown): void;
  removeChild(child: unknown): void;
}

function createMockElement(tagName: string): MockElement {
  const attributes = new Map<string, string>();
  const children: MockElement[] = [];
  return {
    tagName,
    attributes,
    children,
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
    },
    getAttribute(name: string) {
      return attributes.get(name) ?? null;
    },
    appendChild(child: unknown) {
      children.push(child as MockElement);
    },
    removeChild(child: unknown) {
      const idx = children.indexOf(child as MockElement);
      if (idx >= 0) children.splice(idx, 1);
    }
  };
}

let allCreatedElements: MockElement[] = [];
let containerElement: MockElement;

vi.stubGlobal("document", {
  createElementNS: vi.fn((_ns: string, localName: string) => {
    const el = createMockElement(localName);
    allCreatedElements.push(el);
    return el;
  }),
  getElementById: vi.fn(() => containerElement)
});

import { Graph, NULL_VERTEX_ID, Vertex } from "../../web/graph";
import type { PathHighlightResult } from "../../web/pathHighlight";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: Config = {
  fetchAvatars: false,
  graphColours: ["#0085d9", "#d9534f", "#428bca", "#5cb85c"],
  graphStyle: "rounded",
  grid: { x: 16, y: 24, offsetX: 8, offsetY: 12, expandY: 160 },
  initialLoadCommits: 300,
  loadMoreCommits: 100,
  mute: { mergeCommits: false, commitsNotAncestorsOfHead: false },
  showCurrentBranchByDefault: false
};

function makeCommit(
  hash: string,
  parentHashes: string[],
  stash: GitCommitNode["stash"]
): GitCommitNode {
  return {
    hash,
    parentHashes,
    author: "Test Author",
    email: "test@example.com",
    date: 1000000,
    message: "test commit",
    refs: [],
    stash
  };
}

function getCircleElements(): MockElement[] {
  return allCreatedElements.filter((e) => e.tagName === "circle");
}

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* S2: Vertex constructor and id property                             */
/* ------------------------------------------------------------------ */

describe("Vertex constructor and id property", () => {
  it("creates vertex with given id and matching y coordinate (TC-003)", () => {
    // Given: id = 5
    const vertex = new Vertex(5);

    // When: getId() and getPoint() are called
    // Then: id and y both equal 5
    expect(vertex.getId()).toBe(5);
    expect(vertex.getPoint().y).toBe(5);
  });

  it("creates nullVertex with NULL_VERTEX_ID (TC-004)", () => {
    // Given: id = NULL_VERTEX_ID (-1)
    const nullVertex = new Vertex(NULL_VERTEX_ID);

    // When: getId() is called
    // Then: id equals -1
    expect(nullVertex.getId()).toBe(-1);
    expect(nullVertex.getId()).toBe(NULL_VERTEX_ID);
  });

  it("creates vertex with id=0 for first commit (TC-005)", () => {
    // Given: id = 0
    const vertex = new Vertex(0);

    // When: getId() and getPoint() are called
    // Then: id and y both equal 0
    expect(vertex.getId()).toBe(0);
    expect(vertex.getPoint().y).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* S3: Vertex.addChild() / children management                       */
/* ------------------------------------------------------------------ */

describe("Vertex.addChild() / children management", () => {
  it("adds one child vertex (TC-006)", () => {
    // Given: a parent vertex and one child vertex
    const parent = new Vertex(0);
    const child = new Vertex(1);

    // When: addChild is called once
    parent.addChild(child);

    // Then: parent has no public children accessor, but the method does not throw
    // Verification via getParents on child after addParent for cross-check
    expect(() => parent.addChild(child)).not.toThrow();
  });

  it("adds multiple child vertices (TC-007)", () => {
    // Given: a parent vertex and three child vertices
    const parent = new Vertex(0);
    const child1 = new Vertex(1);
    const child2 = new Vertex(2);
    const child3 = new Vertex(3);

    // When: addChild is called three times
    parent.addChild(child1);
    parent.addChild(child2);
    parent.addChild(child3);

    // Then: no error is thrown (children are stored internally)
    expect(() => parent.addChild(new Vertex(4))).not.toThrow();
  });

  it("has empty children by default (TC-008)", () => {
    // Given: a newly created vertex
    const vertex = new Vertex(0);

    // When/Then: no addChild has been called, vertex functions normally
    // Vertex should not throw when used without children
    expect(vertex.getId()).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* S4: Vertex.getParents() getter                                    */
/* ------------------------------------------------------------------ */

describe("Vertex.getParents() getter", () => {
  it("returns parents in insertion order after addParent (TC-009)", () => {
    // Given: a vertex with two parents added
    const vertex = new Vertex(2);
    const parent1 = new Vertex(0);
    const parent2 = new Vertex(1);
    vertex.addParent(parent1);
    vertex.addParent(parent2);

    // When: getParents() is called
    const parents = vertex.getParents();

    // Then: returns array of length 2 in insertion order
    expect(parents).toHaveLength(2);
    expect(parents[0]).toBe(parent1);
    expect(parents[1]).toBe(parent2);
  });

  it("returns empty array when no parents added (TC-010)", () => {
    // Given: a vertex with no parents
    const vertex = new Vertex(0);

    // When: getParents() is called
    const parents = vertex.getParents();

    // Then: returns empty array
    expect(parents).toHaveLength(0);
    expect(parents).toEqual([]);
  });

  it("includes nullVertex in parents array (TC-011)", () => {
    // Given: a vertex with a nullVertex parent and a normal parent
    const vertex = new Vertex(1);
    const nullVertex = new Vertex(NULL_VERTEX_ID);
    const normalParent = new Vertex(0);
    vertex.addParent(normalParent);
    vertex.addParent(nullVertex);

    // When: getParents() is called
    const parents = vertex.getParents();

    // Then: both parents are in the array including nullVertex
    expect(parents).toHaveLength(2);
    expect(parents[0]).toBe(normalParent);
    expect(parents[1]).toBe(nullVertex);
    expect(parents[1].getId()).toBe(NULL_VERTEX_ID);
  });
});

/* ------------------------------------------------------------------ */
/* S5: Vertex.isStash public getter                                  */
/* ------------------------------------------------------------------ */

describe("Vertex.isStash public getter", () => {
  it("returns false by default (TC-012)", () => {
    // Given: a newly created vertex (setStash not called)
    const vertex = new Vertex(0);

    // When: isStash is accessed
    // Then: returns false
    expect(vertex.isStash).toBe(false);
  });

  it("returns true after setStash() is called (TC-013)", () => {
    // Given: a vertex with setStash() called
    const vertex = new Vertex(0);
    vertex.setStash();

    // When: isStash is accessed
    // Then: returns true
    expect(vertex.isStash).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* S6: Vertex.isMerge() with nullVertex                              */
/* ------------------------------------------------------------------ */

describe("Vertex.isMerge() with nullVertex", () => {
  it("returns true when two normal parents are added (TC-014)", () => {
    // Given: a vertex with two normal parents
    const vertex = new Vertex(2);
    vertex.addParent(new Vertex(0));
    vertex.addParent(new Vertex(1));

    // When: isMerge() is called
    // Then: returns true
    expect(vertex.isMerge()).toBe(true);
  });

  it("returns true when one normal parent and one nullVertex are added (TC-015)", () => {
    // Given: a vertex with one normal parent and one nullVertex
    const vertex = new Vertex(1);
    vertex.addParent(new Vertex(0));
    vertex.addParent(new Vertex(NULL_VERTEX_ID));

    // When: isMerge() is called
    // Then: returns true (parents.length > 1)
    expect(vertex.isMerge()).toBe(true);
  });

  it("returns false when only one parent is added (TC-016)", () => {
    // Given: a vertex with one parent
    const vertex = new Vertex(1);
    vertex.addParent(new Vertex(0));

    // When: isMerge() is called
    // Then: returns false
    expect(vertex.isMerge()).toBe(false);
  });

  it("returns false when no parents are added (TC-017)", () => {
    // Given: a vertex with no parents
    const vertex = new Vertex(0);

    // When: isMerge() is called
    // Then: returns false
    expect(vertex.isMerge()).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* S1: Graph stash vertex drawing                                    */
/* ------------------------------------------------------------------ */

describe("Graph stash vertex drawing", () => {
  beforeEach(() => {
    allCreatedElements = [];
    containerElement = createMockElement("div");
    vi.clearAllMocks();
  });

  it("draws double circle (outer + inner ring) for stash vertex (TC-001)", () => {
    // Given: a commit node with stash !== null
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const stashCommit = makeCommit("abc123def456", [], {
      selector: "stash@{0}",
      baseHash: "000111",
      untrackedFilesHash: null
    });
    graph.loadCommits([stashCommit], null, { abc123def456: 0 });

    // When: graph is rendered
    allCreatedElements = [];
    graph.render(null);

    // Then: two circles are drawn — outer (stashOuter) and inner (stashInner)
    const circles = getCircleElements();
    expect(circles.length).toBe(2);

    const outerCircle = circles.find((c) => c.attributes.get("class") === "stashOuter");
    const innerCircle = circles.find((c) => c.attributes.get("class") === "stashInner");

    expect(outerCircle).toBeDefined();
    expect(innerCircle).toBeDefined();

    // Outer circle: filled, r=4
    expect(outerCircle!.attributes.get("r")).toBe("4");
    expect(outerCircle!.attributes.has("fill")).toBe(true);

    // Inner circle: ring (stroke), r=2
    expect(innerCircle!.attributes.get("r")).toBe("2");
    expect(innerCircle!.attributes.has("stroke")).toBe(true);
  });

  it("draws single circle for non-stash vertex (TC-002)", () => {
    // Given: a commit node with stash === null (regular commit)
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const regularCommit = makeCommit("abc123def456", [], null);
    graph.loadCommits([regularCommit], null, { abc123def456: 0 });

    // When: graph is rendered
    allCreatedElements = [];
    graph.render(null);

    // Then: exactly one circle is drawn (no stashOuter/stashInner)
    const circles = getCircleElements();
    expect(circles.length).toBe(1);

    const stashOuter = circles.filter((c) => c.attributes.get("class") === "stashOuter");
    const stashInner = circles.filter((c) => c.attributes.get("class") === "stashInner");
    expect(stashOuter.length).toBe(0);
    expect(stashInner.length).toBe(0);

    // The single circle has fill (not stroke-only ring)
    expect(circles[0].attributes.has("fill")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* S7: Graph.loadCommits() nullVertex mechanism                       */
/* ------------------------------------------------------------------ */

describe("Graph.loadCommits() nullVertex mechanism", () => {
  beforeEach(() => {
    allCreatedElements = [];
    containerElement = createMockElement("div");
    vi.clearAllMocks();
  });

  it("links parent and child for in-range parent commit (TC-018)", () => {
    // Given: Two commits where child references parent, both in commitLookup
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [makeCommit("aaa", ["bbb"], null), makeCommit("bbb", [], null)];

    // When: loadCommits is called and graph is rendered
    graph.loadCommits(commits, null, { aaa: 0, bbb: 1 });
    allCreatedElements = [];
    graph.render(null);

    // Then: Two circles drawn (both vertices placed on branches)
    expect(getCircleElements().length).toBe(2);
  });

  it("uses nullVertex for commit with out-of-range parent (TC-019)", () => {
    // Given: A commit whose parent hash is not in commitLookup
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [makeCommit("aaa", ["missing"], null)];

    // When: loadCommits is called
    graph.loadCommits(commits, null, { aaa: 0 });
    allCreatedElements = [];
    graph.render(null);

    // Then: One circle drawn, no crash from nullVertex parent
    expect(getCircleElements().length).toBe(1);
  });

  it("handles merge with one in-range and one out-of-range parent (TC-020)", () => {
    // Given: A merge commit with one parent in commitLookup and one missing
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [makeCommit("aaa", ["bbb", "missing"], null), makeCommit("bbb", [], null)];

    // When: loadCommits is called
    graph.loadCommits(commits, null, { aaa: 0, bbb: 1 });
    allCreatedElements = [];
    graph.render(null);

    // Then: Two circles drawn (merge with nullVertex handled correctly)
    expect(getCircleElements().length).toBe(2);
  });

  it("builds graph without nullVertex when all parents are in commitLookup (TC-021)", () => {
    // Given: Three commits forming a chain, all parents in commitLookup
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [
      makeCommit("aaa", ["bbb"], null),
      makeCommit("bbb", ["ccc"], null),
      makeCommit("ccc", [], null)
    ];

    // When: loadCommits is called
    graph.loadCommits(commits, null, { aaa: 0, bbb: 1, ccc: 2 });
    allCreatedElements = [];
    graph.render(null);

    // Then: Three circles drawn (all in-range, no nullVertex needed)
    expect(getCircleElements().length).toBe(3);
  });

  it("handles empty commits array without error (TC-022)", () => {
    // Given: Empty commits array
    const graph = new Graph("testGraph", DEFAULT_CONFIG);

    // When: loadCommits is called with empty array
    graph.loadCommits([], null, {});
    allCreatedElements = [];
    graph.render(null);

    // Then: No circles drawn, no error
    expect(getCircleElements().length).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* S8: Graph.determinePath() nullVertex guard                         */
/* ------------------------------------------------------------------ */

describe("Graph.determinePath() nullVertex guard", () => {
  beforeEach(() => {
    allCreatedElements = [];
    containerElement = createMockElement("div");
    vi.clearAllMocks();
  });

  it("skips merge branch guard when parent is nullVertex (TC-023)", () => {
    // Given: A merge commit whose second parent is out of range (nullVertex)
    // First parent is in range and will be on a branch
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [
      makeCommit("first", ["second"], null),
      makeCommit("second", ["third", "missing"], null),
      makeCommit("third", [], null)
    ];

    // When: loadCommits processes the graph (determinePath runs internally)
    graph.loadCommits(commits, null, { first: 0, second: 1, third: 2 });
    allCreatedElements = [];

    // Then: Graph renders correctly — nullVertex parent handled as normal branch
    graph.render(null);
    expect(getCircleElements().length).toBe(3);
  });

  it("breaks loop correctly when parentVertex becomes null (TC-024)", () => {
    // Given: A chain where the last vertex has no parents
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [makeCommit("aaa", ["bbb"], null), makeCommit("bbb", [], null)];

    // When: loadCommits builds the graph
    graph.loadCommits(commits, null, { aaa: 0, bbb: 1 });
    allCreatedElements = [];

    // Then: determinePath terminates correctly (break on null parent), graph renders
    graph.render(null);
    expect(getCircleElements().length).toBe(2);
  });

  it("processes remaining nullVertex parents via registerParentProcessed (TC-025)", () => {
    // Given: Multiple commits each with an out-of-range parent
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [
      makeCommit("aaa", ["bbb", "missing1"], null),
      makeCommit("bbb", ["ccc", "missing2"], null),
      makeCommit("ccc", [], null)
    ];

    // When: loadCommits processes all commits
    graph.loadCommits(commits, null, { aaa: 0, bbb: 1, ccc: 2 });
    allCreatedElements = [];

    // Then: Graph renders without infinite loop (nullVertex parents processed)
    graph.render(null);
    expect(getCircleElements().length).toBe(3);
  });
});

/* ------------------------------------------------------------------ */
/* S9: Branch.addLine() numUncommitted condition fix                  */
/* ------------------------------------------------------------------ */

describe("Branch.addLine() numUncommitted condition fix", () => {
  beforeEach(() => {
    allCreatedElements = [];
    containerElement = createMockElement("div");
    vi.clearAllMocks();
  });

  function getLinePathElements(): MockElement[] {
    return allCreatedElements.filter(
      (e) => e.tagName === "path" && e.attributes.get("class") === "line"
    );
  }

  it("tracks numUncommitted correctly for lines at x=0 (TC-026)", () => {
    // Given: Graph with uncommitted changes (hash="*") followed by committed parents at x=0
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [
      makeCommit("*", ["aaa"], null),
      makeCommit("aaa", ["bbb"], null),
      makeCommit("bbb", [], null)
    ];

    // When: loadCommits and render
    graph.loadCommits(commits, null, { "*": 0, aaa: 1, bbb: 2 });
    allCreatedElements = [];
    graph.render(null);

    // Then: Uncommitted lines rendered with gray (#808080) color
    const linePaths = getLinePathElements();
    expect(linePaths.length).toBeGreaterThan(0);
    const hasUncommitted = linePaths.some((p) => p.attributes.get("stroke") === "#808080");
    expect(hasUncommitted).toBe(true);
  });

  it("does not update numUncommitted for committed line at x>0 (TC-027)", () => {
    // Given: Graph with uncommitted change and multiple branches at different x positions
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [
      makeCommit("*", ["bbb"], null),
      makeCommit("aaa", ["ccc"], null),
      makeCommit("bbb", ["ccc"], null),
      makeCommit("ccc", [], null)
    ];

    // When: loadCommits and render
    graph.loadCommits(commits, null, { "*": 0, aaa: 1, bbb: 2, ccc: 3 });
    allCreatedElements = [];
    graph.render(null);

    // Then: Graph renders correctly, uncommitted line preserved as gray
    expect(getCircleElements().length).toBe(4);
    const linePaths = getLinePathElements();
    expect(linePaths.length).toBeGreaterThan(0);
    const hasUncommitted = linePaths.some((p) => p.attributes.get("stroke") === "#808080");
    expect(hasUncommitted).toBe(true);
  });

  it("does not update numUncommitted when p2.y >= numUncommitted (TC-028)", () => {
    // Given: Graph with all committed changes (no uncommitted vertex)
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [
      makeCommit("aaa", ["bbb"], null),
      makeCommit("bbb", ["ccc"], null),
      makeCommit("ccc", [], null)
    ];

    // When: loadCommits and render
    graph.loadCommits(commits, "aaa", { aaa: 0, bbb: 1, ccc: 2 });
    allCreatedElements = [];
    graph.render(null);

    // Then: All lines are committed (no gray #808080 color)
    const linePaths = getLinePathElements();
    expect(linePaths.length).toBeGreaterThan(0);
    const hasUncommitted = linePaths.some((p) => p.attributes.get("stroke") === "#808080");
    expect(hasUncommitted).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* S10: Graph.getMutedCommits() merge commit mute                      */
/* ------------------------------------------------------------------ */

describe("Graph.getMutedCommits() merge commit mute", () => {
  beforeEach(() => {
    allCreatedElements = [];
    containerElement = createMockElement("div");
    vi.clearAllMocks();
  });

  function makeConfigWithMute(mergeCommits: boolean, commitsNotAncestorsOfHead: boolean): Config {
    return {
      ...DEFAULT_CONFIG,
      mute: { mergeCommits, commitsNotAncestorsOfHead }
    };
  }

  it("mutes merge commit (non-stash) when mergeCommits=true (TC-029)", () => {
    // Given: mergeCommits=true, a merge commit with 2 in-range parents (non-stash)
    const config = makeConfigWithMute(true, false);
    const graph = new Graph("testGraph", config);
    const commits = [
      makeCommit("merge1", ["aaa", "bbb"], null),
      makeCommit("aaa", [], null),
      makeCommit("bbb", [], null)
    ];
    graph.loadCommits(commits, null, { merge1: 0, aaa: 1, bbb: 2 });

    // When: getMutedCommits is called
    const muted = graph.getMutedCommits(null);

    // Then: merge commit is muted, non-merge commits are not
    expect(muted[0]).toBe(true);
    expect(muted[1]).toBe(false);
    expect(muted[2]).toBe(false);
  });

  it("does not mute stash merge commit even when mergeCommits=true (TC-030)", () => {
    // Given: mergeCommits=true, a stash commit that is also a merge (2 parents)
    const config = makeConfigWithMute(true, false);
    const graph = new Graph("testGraph", config);
    const commits = [
      makeCommit("stash1", ["aaa", "bbb"], {
        selector: "stash@{0}",
        baseHash: "aaa",
        untrackedFilesHash: null
      }),
      makeCommit("aaa", [], null),
      makeCommit("bbb", [], null)
    ];
    graph.loadCommits(commits, null, { stash1: 0, aaa: 1, bbb: 2 });

    // When: getMutedCommits is called
    const muted = graph.getMutedCommits(null);

    // Then: stash commit is NOT muted despite being a merge
    expect(muted[0]).toBe(false);
  });

  it("does not mute non-merge commit when mergeCommits=true (TC-031)", () => {
    // Given: mergeCommits=true, only non-merge commits (single parent each)
    const config = makeConfigWithMute(true, false);
    const graph = new Graph("testGraph", config);
    const commits = [makeCommit("aaa", ["bbb"], null), makeCommit("bbb", [], null)];
    graph.loadCommits(commits, null, { aaa: 0, bbb: 1 });

    // When: getMutedCommits is called
    const muted = graph.getMutedCommits(null);

    // Then: no commits are muted (none are merges)
    expect(muted[0]).toBe(false);
    expect(muted[1]).toBe(false);
  });

  it("does not mute merge commit when mergeCommits=false (TC-032)", () => {
    // Given: mergeCommits=false, a merge commit present
    const config = makeConfigWithMute(false, false);
    const graph = new Graph("testGraph", config);
    const commits = [
      makeCommit("merge1", ["aaa", "bbb"], null),
      makeCommit("aaa", [], null),
      makeCommit("bbb", [], null)
    ];
    graph.loadCommits(commits, null, { merge1: 0, aaa: 1, bbb: 2 });

    // When: getMutedCommits is called
    const muted = graph.getMutedCommits(null);

    // Then: merge commit is NOT muted (setting disabled)
    expect(muted[0]).toBe(false);
    expect(muted[1]).toBe(false);
    expect(muted[2]).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* S11: Graph.getMutedCommits() HEAD ancestor mute                     */
/* ------------------------------------------------------------------ */

describe("Graph.getMutedCommits() HEAD ancestor mute", () => {
  beforeEach(() => {
    allCreatedElements = [];
    containerElement = createMockElement("div");
    vi.clearAllMocks();
  });

  function makeConfigWithMute(mergeCommits: boolean, commitsNotAncestorsOfHead: boolean): Config {
    return {
      ...DEFAULT_CONFIG,
      mute: { mergeCommits, commitsNotAncestorsOfHead }
    };
  }

  it("does not mute commits reachable from HEAD (TC-033)", () => {
    // Given: commitsNotAncestorsOfHead=true, all commits in a chain from HEAD
    const config = makeConfigWithMute(false, true);
    const graph = new Graph("testGraph", config);
    const commits = [
      makeCommit("aaa", ["bbb"], null),
      makeCommit("bbb", ["ccc"], null),
      makeCommit("ccc", [], null)
    ];
    graph.loadCommits(commits, "aaa", { aaa: 0, bbb: 1, ccc: 2 });

    // When: getMutedCommits is called with HEAD=aaa
    const muted = graph.getMutedCommits("aaa");

    // Then: all commits reachable from HEAD, none muted
    expect(muted[0]).toBe(false);
    expect(muted[1]).toBe(false);
    expect(muted[2]).toBe(false);
  });

  it("mutes commits not reachable from HEAD (TC-034)", () => {
    // Given: commitsNotAncestorsOfHead=true, two disconnected chains
    const config = makeConfigWithMute(false, true);
    const graph = new Graph("testGraph", config);
    const commits = [
      makeCommit("aaa", ["bbb"], null),
      makeCommit("bbb", [], null),
      makeCommit("ddd", ["eee"], null),
      makeCommit("eee", [], null)
    ];
    graph.loadCommits(commits, "aaa", { aaa: 0, bbb: 1, ddd: 2, eee: 3 });

    // When: getMutedCommits is called with HEAD=aaa
    const muted = graph.getMutedCommits("aaa");

    // Then: aaa, bbb reachable (not muted); ddd, eee unreachable (muted)
    expect(muted[0]).toBe(false);
    expect(muted[1]).toBe(false);
    expect(muted[2]).toBe(true);
    expect(muted[3]).toBe(true);
  });

  it("does not mute any commit when commitsNotAncestorsOfHead=false (TC-035)", () => {
    // Given: commitsNotAncestorsOfHead=false, unreachable commits present
    const config = makeConfigWithMute(false, false);
    const graph = new Graph("testGraph", config);
    const commits = [
      makeCommit("aaa", ["bbb"], null),
      makeCommit("bbb", [], null),
      makeCommit("ddd", [], null)
    ];
    graph.loadCommits(commits, "aaa", { aaa: 0, bbb: 1, ddd: 2 });

    // When: getMutedCommits is called with HEAD=aaa
    const muted = graph.getMutedCommits("aaa");

    // Then: no commits muted (setting disabled)
    expect(muted[0]).toBe(false);
    expect(muted[1]).toBe(false);
    expect(muted[2]).toBe(false);
  });

  it("treats all commits as reachable when currentHash is null (TC-036)", () => {
    // Given: commitsNotAncestorsOfHead=true, currentHash=null
    const config = makeConfigWithMute(false, true);
    const graph = new Graph("testGraph", config);
    const commits = [
      makeCommit("aaa", ["bbb"], null),
      makeCommit("bbb", [], null),
      makeCommit("ddd", [], null)
    ];
    graph.loadCommits(commits, null, { aaa: 0, bbb: 1, ddd: 2 });

    // When: getMutedCommits is called with null
    const muted = graph.getMutedCommits(null);

    // Then: all commits treated as reachable, none muted
    expect(muted[0]).toBe(false);
    expect(muted[1]).toBe(false);
    expect(muted[2]).toBe(false);
  });

  it("treats all commits as reachable when currentHash not in commitLookup (TC-037)", () => {
    // Given: commitsNotAncestorsOfHead=true, currentHash not in commitLookup
    const config = makeConfigWithMute(false, true);
    const graph = new Graph("testGraph", config);
    const commits = [makeCommit("aaa", ["bbb"], null), makeCommit("bbb", [], null)];
    graph.loadCommits(commits, null, { aaa: 0, bbb: 1 });

    // When: getMutedCommits is called with unknown hash
    const muted = graph.getMutedCommits("unknown_hash");

    // Then: all commits treated as reachable, none muted
    expect(muted[0]).toBe(false);
    expect(muted[1]).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* S12: Graph.getMutedCommits() combined settings                      */
/* ------------------------------------------------------------------ */

describe("Graph.getMutedCommits() combined settings", () => {
  beforeEach(() => {
    allCreatedElements = [];
    containerElement = createMockElement("div");
    vi.clearAllMocks();
  });

  function makeConfigWithMute(mergeCommits: boolean, commitsNotAncestorsOfHead: boolean): Config {
    return {
      ...DEFAULT_CONFIG,
      mute: { mergeCommits, commitsNotAncestorsOfHead }
    };
  }

  it("mutes merge commit that is also not an ancestor of HEAD (TC-038)", () => {
    // Given: both settings true, a merge commit on a separate branch (unreachable from HEAD)
    const config = makeConfigWithMute(true, true);
    const graph = new Graph("testGraph", config);
    const commits = [
      makeCommit("aaa", ["bbb"], null),
      makeCommit("bbb", [], null),
      makeCommit("merge1", ["ddd", "eee"], null),
      makeCommit("ddd", [], null),
      makeCommit("eee", [], null)
    ];
    graph.loadCommits(commits, "aaa", { aaa: 0, bbb: 1, merge1: 2, ddd: 3, eee: 4 });

    // When: getMutedCommits is called with HEAD=aaa
    const muted = graph.getMutedCommits("aaa");

    // Then: merge1 (index 2) muted for both reasons (merge + non-ancestor)
    expect(muted[2]).toBe(true);
    // ddd, eee also muted (non-ancestor)
    expect(muted[3]).toBe(true);
    expect(muted[4]).toBe(true);
  });

  it("does not mute non-merge ancestor commit when both settings true (TC-039)", () => {
    // Given: both settings true, all commits are non-merge and ancestors of HEAD
    const config = makeConfigWithMute(true, true);
    const graph = new Graph("testGraph", config);
    const commits = [
      makeCommit("aaa", ["bbb"], null),
      makeCommit("bbb", ["ccc"], null),
      makeCommit("ccc", [], null)
    ];
    graph.loadCommits(commits, "aaa", { aaa: 0, bbb: 1, ccc: 2 });

    // When: getMutedCommits is called with HEAD=aaa
    const muted = graph.getMutedCommits("aaa");

    // Then: all commits are non-merge and ancestors, none muted
    expect(muted[0]).toBe(false);
    expect(muted[1]).toBe(false);
    expect(muted[2]).toBe(false);
  });

  it("returns array of same length as commits (TC-040)", () => {
    // Given: a graph with 5 commits
    const config = makeConfigWithMute(true, true);
    const graph = new Graph("testGraph", config);
    const commits = [
      makeCommit("aaa", ["bbb"], null),
      makeCommit("bbb", ["ccc"], null),
      makeCommit("ccc", [], null),
      makeCommit("ddd", ["eee"], null),
      makeCommit("eee", [], null)
    ];
    graph.loadCommits(commits, "aaa", { aaa: 0, bbb: 1, ccc: 2, ddd: 3, eee: 4 });

    // When: getMutedCommits is called
    const muted = graph.getMutedCommits("aaa");

    // Then: returned array length equals commits length
    expect(muted).toHaveLength(commits.length);
    expect(muted).toHaveLength(5);
  });

  it("excludes nullVertex parent from ancestor traversal (TC-041)", () => {
    // Given: commitsNotAncestorsOfHead=true, a commit with out-of-range parent (nullVertex)
    const config = makeConfigWithMute(false, true);
    const graph = new Graph("testGraph", config);
    const commits = [makeCommit("aaa", ["bbb"], null), makeCommit("bbb", ["missing_parent"], null)];
    graph.loadCommits(commits, "aaa", { aaa: 0, bbb: 1 });

    // When: getMutedCommits is called with HEAD=aaa
    const muted = graph.getMutedCommits("aaa");

    // Then: BFS completes safely without following nullVertex, both commits reachable
    expect(muted[0]).toBe(false);
    expect(muted[1]).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* S13: Vertex.getChildren() child vertex read accessor               */
/* ------------------------------------------------------------------ */

describe("Vertex.getChildren() child vertex read accessor", () => {
  it("returns empty array when no children added (TC-042)", () => {
    // Given: a newly created vertex with no children
    const vertex = new Vertex(0);

    // When: getChildren() is called
    const children = vertex.getChildren();

    // Then: returns empty array
    expect(children).toEqual([]);
    expect(children).toHaveLength(0);
  });

  it("returns single child after one addChild call (TC-043)", () => {
    // Given: a vertex with one child added via addChild
    const parent = new Vertex(0);
    const child = new Vertex(1);
    parent.addChild(child);

    // When: getChildren() is called
    const children = parent.getChildren();

    // Then: returns array with one element matching the added child
    expect(children).toHaveLength(1);
    expect(children[0]).toBe(child);
  });

  it("returns children in addChild call order (TC-044)", () => {
    // Given: a vertex with three children added via addChild in order
    const parent = new Vertex(0);
    const child1 = new Vertex(1);
    const child2 = new Vertex(2);
    const child3 = new Vertex(3);
    parent.addChild(child1);
    parent.addChild(child2);
    parent.addChild(child3);

    // When: getChildren() is called
    const children = parent.getChildren();

    // Then: returns array of 3 elements in addChild call order
    expect(children).toHaveLength(3);
    expect(children[0]).toBe(child1);
    expect(children[1]).toBe(child2);
    expect(children[2]).toBe(child3);
  });
});

/* ------------------------------------------------------------------ */
/* S14: Graph.getFirstParentIndex()                                   */
/* ------------------------------------------------------------------ */

describe("Graph.getFirstParentIndex()", () => {
  beforeEach(() => {
    allCreatedElements = [];
    containerElement = createMockElement("div");
    vi.clearAllMocks();
  });

  it("returns parent index for commit with one parent (TC-045)", () => {
    // Given: a linear chain a→b
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [makeCommit("aaa", ["bbb"], null), makeCommit("bbb", [], null)];
    graph.loadCommits(commits, null, { aaa: 0, bbb: 1 });

    // When: getFirstParentIndex is called for vertex 0
    const result = graph.getFirstParentIndex(0);

    // Then: returns index of the single parent
    expect(result).toBe(1);
  });

  it("returns first parent index for merge commit (TC-046)", () => {
    // Given: a merge commit with two parents
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [
      makeCommit("merge", ["aaa", "bbb"], null),
      makeCommit("aaa", [], null),
      makeCommit("bbb", [], null)
    ];
    graph.loadCommits(commits, null, { merge: 0, aaa: 1, bbb: 2 });

    // When: getFirstParentIndex is called for the merge vertex
    const result = graph.getFirstParentIndex(0);

    // Then: returns index of parents[0] (first parent)
    expect(result).toBe(1);
  });

  it("returns -1 for root commit with no parents (TC-047)", () => {
    // Given: a root commit with no parents
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [makeCommit("root", [], null)];
    graph.loadCommits(commits, null, { root: 0 });

    // When: getFirstParentIndex is called for the root
    const result = graph.getFirstParentIndex(0);

    // Then: returns -1 (no parent exists)
    expect(result).toBe(-1);
  });

  it("returns -1 when only parent is nullVertex (TC-048)", () => {
    // Given: a commit whose parent is not in commitLookup (becomes nullVertex)
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [makeCommit("aaa", ["missing"], null)];
    graph.loadCommits(commits, null, { aaa: 0 });

    // When: getFirstParentIndex is called
    const result = graph.getFirstParentIndex(0);

    // Then: returns -1 (nullVertex id === NULL_VERTEX_ID === -1)
    expect(result).toBe(-1);
  });
});

/* ------------------------------------------------------------------ */
/* S15: Graph.getFirstChildIndex()                                    */
/* ------------------------------------------------------------------ */

describe("Graph.getFirstChildIndex()", () => {
  beforeEach(() => {
    allCreatedElements = [];
    containerElement = createMockElement("div");
    vi.clearAllMocks();
  });

  it("returns child index for commit with one child (TC-049)", () => {
    // Given: a chain where vertex 1 (parent) has one child vertex 0
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [makeCommit("child", ["parent"], null), makeCommit("parent", [], null)];
    graph.loadCommits(commits, null, { child: 0, parent: 1 });

    // When: getFirstChildIndex is called for the parent
    const result = graph.getFirstChildIndex(1);

    // Then: returns index of the single child
    expect(result).toBe(0);
  });

  it("returns same-branch child index when multiple children exist (TC-050)", () => {
    // Given: vertex "root" has two children, c1 (same branch) and c2 (different branch)
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [
      makeCommit("c1", ["root"], null),
      makeCommit("c2", ["root"], null),
      makeCommit("root", [], null)
    ];
    graph.loadCommits(commits, null, { c1: 0, c2: 1, root: 2 });

    // When: getFirstChildIndex is called for root (index 2)
    const result = graph.getFirstChildIndex(2);

    // Then: returns same-branch child (index 0), not max-index child (index 1)
    expect(result).toBe(0);
  });

  it("returns max-index child when no child is on the same branch (TC-051)", () => {
    // Given: vertex "root" has two children, but getBranch returns null (defensive fallback)
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [
      makeCommit("c1", ["root"], null),
      makeCommit("c2", ["root"], null),
      makeCommit("root", [], null)
    ];
    graph.loadCommits(commits, null, { c1: 0, c2: 1, root: 2 });

    // When: getBranch returns null, triggering the max-index fallback
    const spy = vi.spyOn(Vertex.prototype, "getBranch").mockReturnValue(null);
    const result = graph.getFirstChildIndex(2);
    spy.mockRestore();

    // Then: returns max index among children (max(0, 1) = 1)
    expect(result).toBe(1);
  });

  it("returns -1 for commit with no children (TC-052)", () => {
    // Given: vertex 0 (newest commit) has no children
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [makeCommit("newest", ["older"], null), makeCommit("older", [], null)];
    graph.loadCommits(commits, null, { newest: 0, older: 1 });

    // When: getFirstChildIndex is called for the newest commit
    const result = graph.getFirstChildIndex(0);

    // Then: returns -1 (no children)
    expect(result).toBe(-1);
  });
});

/* ------------------------------------------------------------------ */
/* S16: Graph.getAlternativeParentIndex()                             */
/* ------------------------------------------------------------------ */

describe("Graph.getAlternativeParentIndex()", () => {
  beforeEach(() => {
    allCreatedElements = [];
    containerElement = createMockElement("div");
    vi.clearAllMocks();
  });

  it("returns second parent index for merge commit (TC-053)", () => {
    // Given: a merge commit with two in-range parents
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [
      makeCommit("merge", ["aaa", "bbb"], null),
      makeCommit("aaa", [], null),
      makeCommit("bbb", [], null)
    ];
    graph.loadCommits(commits, null, { merge: 0, aaa: 1, bbb: 2 });

    // When: getAlternativeParentIndex is called for the merge vertex
    const result = graph.getAlternativeParentIndex(0);

    // Then: returns index of parents[1] (second parent, merge source)
    expect(result).toBe(2);
  });

  it("falls back to single parent index when only one parent exists (TC-054)", () => {
    // Given: a commit with one parent
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [makeCommit("aaa", ["bbb"], null), makeCommit("bbb", [], null)];
    graph.loadCommits(commits, null, { aaa: 0, bbb: 1 });

    // When: getAlternativeParentIndex is called
    const result = graph.getAlternativeParentIndex(0);

    // Then: returns the single parent's index (fallback)
    expect(result).toBe(1);
  });

  it("returns -1 for root commit with no parents (TC-055)", () => {
    // Given: a root commit with no parents
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [makeCommit("root", [], null)];
    graph.loadCommits(commits, null, { root: 0 });

    // When: getAlternativeParentIndex is called
    const result = graph.getAlternativeParentIndex(0);

    // Then: returns -1 (no parents)
    expect(result).toBe(-1);
  });
});

/* ------------------------------------------------------------------ */
/* S17: Graph.getAlternativeChildIndex()                              */
/* ------------------------------------------------------------------ */

describe("Graph.getAlternativeChildIndex()", () => {
  beforeEach(() => {
    allCreatedElements = [];
    containerElement = createMockElement("div");
    vi.clearAllMocks();
  });

  it("returns max-index non-same-branch child when same-branch child exists (TC-056)", () => {
    // Given: vertex "root" has three children: c1 (same branch), c2 and c3 (different branches)
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [
      makeCommit("c1", ["root"], null),
      makeCommit("c2", ["root"], null),
      makeCommit("c3", ["root"], null),
      makeCommit("root", [], null)
    ];
    graph.loadCommits(commits, null, { c1: 0, c2: 1, c3: 2, root: 3 });

    // When: getAlternativeChildIndex is called for root (index 3)
    const result = graph.getAlternativeChildIndex(3);

    // Then: excludes same-branch child (0), returns max of remaining (max(1, 2) = 2)
    expect(result).toBe(2);
  });

  it("returns second-largest-index child when no child is on same branch (TC-057)", () => {
    // Given: vertex "root" has three children, but getBranch returns null (defensive fallback)
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [
      makeCommit("c1", ["root"], null),
      makeCommit("c2", ["root"], null),
      makeCommit("c3", ["root"], null),
      makeCommit("root", [], null)
    ];
    graph.loadCommits(commits, null, { c1: 0, c2: 1, c3: 2, root: 3 });

    // When: getBranch returns null, triggering the second-largest-index fallback
    const spy = vi.spyOn(Vertex.prototype, "getBranch").mockReturnValue(null);
    const result = graph.getAlternativeChildIndex(3);
    spy.mockRestore();

    // Then: sorted indices [0, 1, 2], second-largest = 1
    expect(result).toBe(1);
  });

  it("falls back to single child index when only one child exists (TC-058)", () => {
    // Given: vertex 1 (parent) has exactly one child (vertex 0)
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [makeCommit("child", ["parent"], null), makeCommit("parent", [], null)];
    graph.loadCommits(commits, null, { child: 0, parent: 1 });

    // When: getAlternativeChildIndex is called for the parent
    const result = graph.getAlternativeChildIndex(1);

    // Then: returns the single child's index (fallback)
    expect(result).toBe(0);
  });

  it("returns -1 for commit with no children (TC-059)", () => {
    // Given: vertex 0 (newest commit) has no children
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [makeCommit("newest", ["older"], null), makeCommit("older", [], null)];
    graph.loadCommits(commits, null, { newest: 0, older: 1 });

    // When: getAlternativeChildIndex is called for the newest commit
    const result = graph.getAlternativeChildIndex(0);

    // Then: returns -1 (no children)
    expect(result).toBe(-1);
  });
});

/* ------------------------------------------------------------------ */
/* S18: determinePath() early-break off-screen parent edge (graph-test) */
/* ------------------------------------------------------------------ */

describe("Graph.determinePath() early break off-screen parent edge", () => {
  beforeEach(() => {
    allCreatedElements = [];
    containerElement = createMockElement("div");
    vi.clearAllMocks();
  });

  it("registers trailing nullVertex parents when the loop reaches the end (TC-060)", () => {
    // Case: TC-060
    // Given: a single commit whose two parents are both out of range (nullVertex)
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [makeCommit("aaa", ["missing1", "missing2"], null)];
    const spy = vi.spyOn(Vertex.prototype, "registerParentProcessed");

    // When: loadCommits runs determinePath and the outer loop reaches the end
    graph.loadCommits(commits, null, { aaa: 0 });
    graph.render(null);

    // Then: both trailing nullVertex parents are registered as processed
    expect(spy).toHaveBeenCalledTimes(2);
    expect(getCircleElements().length).toBe(1);
  });

  it("does not register a pending nullVertex parent after an early break (TC-061)", () => {
    // Case: TC-061
    // Given: a merge whose first parent is in range and second is out of range (nullVertex)
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [makeCommit("m", ["a", "missing"], null), makeCommit("a", [], null)];
    const spy = vi.spyOn(Vertex.prototype, "registerParentProcessed");

    // When: the inner loop breaks early (i < vertices.length) after processing parent "a"
    graph.loadCommits(commits, null, { m: 0, a: 1 });
    graph.render(null);

    // Then: the pending nullVertex edge is preserved during the early-break iteration (the
    // guard skips the trailing while); it is registered on a later determinePath pass, so
    // each parent is processed exactly once overall (no over-count, no infinite loop)
    expect(spy).toHaveBeenCalledTimes(2);
    expect(getCircleElements().length).toBe(2);
  });

  it("breaks the trailing while loop on a non-nullVertex parent without registering it (TC-062)", () => {
    // Case: TC-062
    // Given: a merge whose first parent is out of range (null) and second is in range
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [makeCommit("m", ["missing", "a"], null), makeCommit("a", [], null)];
    const spy = vi.spyOn(Vertex.prototype, "registerParentProcessed");

    // When: the loop reaches the end and the trailing while registers the null then breaks
    graph.loadCommits(commits, null, { m: 0, a: 1 });
    graph.render(null);

    // Then: the while breaks on the non-null parent without over-registering it; both parents
    // are processed exactly once across determinePath passes (total 2, no over-registration)
    expect(spy).toHaveBeenCalledTimes(2);
    expect(getCircleElements().length).toBe(2);
  });

  it("keeps the preserved off-screen edge available for remaining processing (TC-063)", () => {
    // Case: TC-063
    // Given: a merge with a preserved off-screen edge and further downstream commits
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [
      makeCommit("m", ["a", "missing"], null),
      makeCommit("a", ["b"], null),
      makeCommit("b", [], null)
    ];

    // When: loadCommits processes all commits after the early break
    expect(() => graph.loadCommits(commits, null, { m: 0, a: 1, b: 2 })).not.toThrow();
    graph.render(null);

    // Then: the graph renders all commits without consuming the preserved edge incorrectly
    expect(getCircleElements().length).toBe(3);
  });

  it("does not enter the trailing while loop when there are no remaining parents (TC-064)", () => {
    // Case: TC-064
    // Given: a single root commit with no parents
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [makeCommit("aaa", [], null)];
    const spy = vi.spyOn(Vertex.prototype, "registerParentProcessed");

    // When: the loop reaches the end with getNextParent() === null
    graph.loadCommits(commits, null, { aaa: 0 });
    graph.render(null);

    // Then: registerParentProcessed is never called
    expect(spy).not.toHaveBeenCalled();
    expect(getCircleElements().length).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* S20: determinePath() terminates when a parent precedes its child   */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/graph-test.md
describe("Graph.determinePath() parent listed before its child (S20)", () => {
  beforeEach(() => {
    allCreatedElements = [];
    containerElement = createMockElement("div");
    vi.clearAllMocks();
  });

  it("consumes a preceding parent on the normal branch path (TC-076)", () => {
    // Case: TC-076
    // Given: commit "c" is listed last although its only parent "a" is the first row
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [
      makeCommit("a", ["b"], null),
      makeCommit("b", [], null),
      makeCommit("c", ["a"], null)
    ];
    const spy = vi.spyOn(Vertex.prototype, "registerParentProcessed");

    // When: loadCommits walks every vertex
    graph.loadCommits(commits, "a", { a: 0, b: 1, c: 2 });
    graph.render(null);

    // Then: each parent edge is processed exactly once and all rows are drawn
    expect(spy).toHaveBeenCalledTimes(2);
    expect(getCircleElements().length).toBe(3);
  });

  it("consumes the preceding parents of a merge reached through its child (TC-077)", () => {
    // Case: TC-077
    // Given: merge "c" is listed last and reached as the parent of "d"; both of its own
    // parents are earlier rows, so the walk that arrived via "d" ends at the bottom with
    // "c" holding two unreachable parents
    const graph = new Graph("testGraph", DEFAULT_CONFIG);
    const commits = [
      makeCommit("a", ["b"], null),
      makeCommit("b", [], null),
      makeCommit("d", ["c"], null),
      makeCommit("c", ["a", "b"], null)
    ];
    const spy = vi.spyOn(Vertex.prototype, "registerParentProcessed");

    // When: loadCommits walks every vertex
    graph.loadCommits(commits, "a", { a: 0, b: 1, d: 2, c: 3 });
    graph.render(null);

    // Then: the four parent edges (a→b, d→c, c→a, c→b) are processed exactly once and all rows are drawn
    expect(spy).toHaveBeenCalledTimes(4);
    expect(getCircleElements().length).toBe(4);
  });
});

/* ------------------------------------------------------------------ */
/* S19: circle data-hash and setFileHistoryHighlight()                */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/graph-test.md
describe("Graph.setFileHistoryHighlight() circle classes (S19)", () => {
  const THREE_COMMITS = [
    makeCommit("h0", ["h1"], null),
    makeCommit("h1", ["h2"], null),
    makeCommit("h2", [], null)
  ];
  const THREE_LOOKUP = { h0: 0, h1: 1, h2: 2 };
  const HIGHLIGHT: GraphFileHistoryHighlight = {
    matchHashes: new Set(["h0", "h2"]),
    currentHash: "h0"
  };
  let graph: Graph;

  function svgElement(): MockElement {
    return allCreatedElements.find((e) => e.tagName === "svg")!;
  }

  function circlesOf(hash: string): MockElement[] {
    return getCircleElements().filter((e) => e.getAttribute("data-hash") === hash);
  }

  function classOf(hash: string): string | null {
    const circles = circlesOf(hash);
    expect(circles).toHaveLength(1);
    return circles[0].getAttribute("class");
  }

  /** Drop the circles of the previous render so the next render can be inspected alone. */
  function forgetCircles(): void {
    allCreatedElements = allCreatedElements.filter((e) => e.tagName !== "circle");
  }

  beforeEach(() => {
    allCreatedElements = [];
    containerElement = createMockElement("div");
    graph = new Graph("testGraph", DEFAULT_CONFIG);
  });

  it("sets data-hash on every circle and no mode class without a highlight (TC-065)", () => {
    // Case: TC-065
    // Given: three commits and no highlight
    graph.loadCommits(THREE_COMMITS, null, THREE_LOOKUP);

    // When: the graph is rendered
    graph.render(null);

    // Then: each circle carries its hash, none has a fileHistory class, the svg has no mode class
    expect(getCircleElements().map((e) => e.getAttribute("data-hash"))).toEqual(["h0", "h1", "h2"]);
    for (const hash of ["h0", "h1", "h2"]) {
      expect(classOf(hash) ?? "").not.toContain("fileHistory");
    }
    expect(svgElement().getAttribute("class") ?? "").not.toContain("fileHistoryMode");
  });

  it("marks the current commit with match and current classes (TC-066)", () => {
    // Case: TC-066
    // Given: a highlight with h0 as current
    graph.loadCommits(THREE_COMMITS, null, THREE_LOOKUP);
    graph.setFileHistoryHighlight(HIGHLIGHT);

    // When: the graph is rendered
    graph.render(null);

    // Then: h0 has exactly "fileHistoryMatch fileHistoryCurrent"
    expect(classOf("h0")).toBe("fileHistoryMatch fileHistoryCurrent");
  });

  it("marks a non-current match with the match class only (TC-067)", () => {
    // Case: TC-067
    // Given: the same highlight
    graph.loadCommits(THREE_COMMITS, null, THREE_LOOKUP);
    graph.setFileHistoryHighlight(HIGHLIGHT);

    // When: the graph is rendered
    graph.render(null);

    // Then: h2 has "fileHistoryMatch"
    expect(classOf("h2")).toBe("fileHistoryMatch");
  });

  it("dims commits outside the match set (TC-068)", () => {
    // Case: TC-068
    // Given: the same highlight
    graph.loadCommits(THREE_COMMITS, null, THREE_LOOKUP);
    graph.setFileHistoryHighlight(HIGHLIGHT);

    // When: the graph is rendered
    graph.render(null);

    // Then: h1 has "fileHistoryDim"
    expect(classOf("h1")).toBe("fileHistoryDim");
  });

  it("puts the mode class on the svg while a highlight is set (TC-069)", () => {
    // Case: TC-069
    // Given: the same highlight
    graph.loadCommits(THREE_COMMITS, null, THREE_LOOKUP);
    graph.setFileHistoryHighlight(HIGHLIGHT);

    // When: the graph is rendered
    graph.render(null);

    // Then: the svg class is exactly "fileHistoryMode"
    expect(svgElement().getAttribute("class")).toBe("fileHistoryMode");
  });

  it("keeps the existing current class in front of the highlight classes (TC-070)", () => {
    // Case: TC-070
    // Given: h0 is HEAD and is the current highlight
    graph.loadCommits(THREE_COMMITS, "h0", THREE_LOOKUP);
    graph.setFileHistoryHighlight(HIGHLIGHT);

    // When: the graph is rendered
    graph.render(null);

    // Then: the HEAD class comes first, space separated
    expect(classOf("h0")).toBe("current fileHistoryMatch fileHistoryCurrent");
  });

  it("marks both stash circles with data-hash and the dim class (TC-071)", () => {
    // Case: TC-071
    // Given: a stash commit that is outside the match set
    const commits = [
      makeCommit("h0", ["h1"], null),
      makeCommit("h1", ["h2"], { selector: "stash@{0}", baseHash: "h2", untrackedFilesHash: null }),
      makeCommit("h2", [], null)
    ];
    graph.loadCommits(commits, null, THREE_LOOKUP);
    graph.setFileHistoryHighlight(HIGHLIGHT);

    // When: the graph is rendered
    graph.render(null);

    // Then: outer and inner circles both carry the hash and the dim class after their own class
    const stashCircles = circlesOf("h1");
    expect(stashCircles).toHaveLength(2);
    expect(stashCircles[0].getAttribute("class")).toBe("stashOuter fileHistoryDim");
    expect(stashCircles[1].getAttribute("class")).toBe("stashInner fileHistoryDim");
  });

  it("removes every highlight class after setFileHistoryHighlight(null) (TC-072)", () => {
    // Case: TC-072
    // Given: a rendered highlight with h0 as HEAD
    graph.loadCommits(THREE_COMMITS, "h0", THREE_LOOKUP);
    graph.setFileHistoryHighlight(HIGHLIGHT);
    graph.render(null);

    // When: the highlight is cleared and the graph re-rendered
    graph.setFileHistoryHighlight(null);
    forgetCircles();
    graph.render(null);

    // Then: the svg class is empty, HEAD keeps "current", the others have no class
    expect(svgElement().getAttribute("class")).toBe("");
    expect(classOf("h0")).toBe("current");
    expect(classOf("h1")).toBeNull();
    expect(classOf("h2")).toBeNull();
  });

  it("renders matches without a current circle when currentHash is null (TC-073)", () => {
    // Case: TC-073
    // Given: a highlight without a current hash
    graph.loadCommits(THREE_COMMITS, null, THREE_LOOKUP);
    graph.setFileHistoryHighlight({ matchHashes: new Set(["h0", "h2"]), currentHash: null });

    // When: the graph is rendered
    graph.render(null);

    // Then: h0 / h2 are matches, no circle is current, the svg is in mode
    expect(classOf("h0")).toBe("fileHistoryMatch");
    expect(classOf("h2")).toBe("fileHistoryMatch");
    expect(
      getCircleElements().filter((e) =>
        (e.getAttribute("class") ?? "").includes("fileHistoryCurrent")
      )
    ).toHaveLength(0);
    expect(svgElement().getAttribute("class")).toBe("fileHistoryMode");
  });

  it("dims every circle for an empty match set (TC-074)", () => {
    // Case: TC-074
    // Given: an empty match set
    graph.loadCommits(THREE_COMMITS, null, THREE_LOOKUP);
    graph.setFileHistoryHighlight({ matchHashes: new Set(), currentHash: null });

    // When: the graph is rendered
    graph.render(null);

    // Then: all three circles are dim and the svg is in mode
    for (const hash of ["h0", "h1", "h2"]) {
      expect(classOf(hash)).toBe("fileHistoryDim");
    }
    expect(svgElement().getAttribute("class")).toBe("fileHistoryMode");
  });

  it("keeps the highlight across a second render (TC-075)", () => {
    // Case: TC-075
    // Given: a rendered highlight
    graph.loadCommits(THREE_COMMITS, null, THREE_LOOKUP);
    graph.setFileHistoryHighlight(HIGHLIGHT);
    graph.render(null);

    // When: the graph is rendered again
    forgetCircles();
    graph.render(null);

    // Then: the classes are unchanged
    expect(classOf("h0")).toBe("fileHistoryMatch fileHistoryCurrent");
    expect(classOf("h2")).toBe("fileHistoryMatch");
    expect(classOf("h1")).toBe("fileHistoryDim");
    expect(svgElement().getAttribute("class")).toBe("fileHistoryMode");
  });
});

/* ------------------------------------------------------------------ */
/* S21: setPathHighlight() line emphasis, rings and boundary marks     */
/* ------------------------------------------------------------------ */

// @see docs/testing/perspectives/web/graph-test.md
describe("Graph.setPathHighlight() logical connection rendering (S21)", () => {
  const CLASS_MODE = "pathHighlightMode";
  const CLASS_SELECTED = "pathHighlightSelected";
  const CLASS_RING = "pathHighlightRing";
  const CLASS_BOUNDARY = "pathHighlightBoundary";
  const RING_RADIUS = "6";
  const BOUNDARY_SIDE = "12";
  const HALF_BOUNDARY_SIDE = 6;
  const CURVE_COMMANDS = /[CQ]/;

  // Straight fixture: a -> b -> c, all in lane 0.
  const STRAIGHT = [
    makeCommit("a", ["b"], null),
    makeCommit("b", ["c"], null),
    makeCommit("c", [], null)
  ];
  // Merge fixture: n's second parent b joins the point registered by the m -> b line.
  const MERGE = [
    makeCommit("m", ["a", "b"], null),
    makeCommit("n", ["c", "b"], null),
    makeCommit("a", [], null),
    makeCommit("c", [], null),
    makeCommit("b", ["r"], null),
    makeCommit("r", [], null)
  ];
  const TWO_UNLOADED_PARENTS = [makeCommit("c1", ["g2", "g1"], null), makeCommit("x", [], null)];
  const UNLOADED_PARENT = [makeCommit("t", ["gap"], null), makeCommit("r", [], null)];
  // S20 TC-076: the parent a of c is listed before its child.
  const REVERSED = [
    makeCommit("a", ["b"], null),
    makeCommit("b", [], null),
    makeCommit("c", ["a"], null)
  ];

  // Expected `d` strings derive from the grid (x 16 / y 24, offset 8 / 12, rounded d = 19.2).
  const STRAIGHT_A_TO_B = "M8,12.0L8,36.0";
  const STRAIGHT_B_TO_C = "M8,36.0L8,60.0";
  const STRAIGHT_WHOLE = "M8,12.0L8,60.0";
  const MERGE_M_TO_A = "M8,12.0L8,60.0";
  const MERGE_M_TO_B = "M8,12.0C8,31.2 24,16.8 24,36.0L24,60.0C24,79.2 8,64.8 8,84.0L8,108.0";
  const MERGE_M_TO_JOIN = "M8,12.0C8,31.2 24,16.8 24,36.0L24,60.0";
  // Without a highlight the lane continues vertically past b, so only the curves are compared.
  const MERGE_M_TO_B_CURVES = "M8,12.0C8,31.2 24,16.8 24,36.0L24,60.0C24,79.2 8,64.8 8,84.0L8,";
  const MERGE_JOIN_TO_B = "M24,60.0C24,79.2 8,64.8 8,84.0L8,108.0";
  const MERGE_N_TO_JOIN = "M40,36.0C40,55.2 24,40.8 24,60.0";
  const MERGE_B_TO_R = "M8,108.0L8,132.0";
  const MERGE_N_TO_C = "M40,36.0L40,60.0C40,79.2 24,64.8 24,84.0";
  const MERGE_B_TO_R_AND_N_TO_JOIN = `${MERGE_B_TO_R}${MERGE_N_TO_JOIN}`;
  // With row 0 or row 2 expanded (expandY 160) the vertical part of m -> b is stretched.
  const MERGE_M_TO_B_EXPANDED =
    "M8,12.0C8,31.2 24,16.8 24,36.0L24,220.0C24,239.2 8,224.8 8,244.0L8,268.0";
  const MERGE_B_TO_R_AFTER_EXPANSION = "M8,268.0L8,292.0";
  const UNLOADED_PARENT_R_LANE_X = "24";

  function lookupOf(commits: GitCommitNode[]): { [hash: string]: number } {
    const lookup: { [hash: string]: number } = {};
    commits.forEach((commit, index) => {
      lookup[commit.hash] = index;
    });
    return lookup;
  }

  function highlightOf(
    hashes: string[],
    edges: [string, string][],
    boundaries: { childHash: string; parentHash: string }[] = []
  ): PathHighlightResult {
    return {
      targetFound: true,
      hashes: new Set(hashes),
      edgeKeys: new Set(edges.map(([child, parent]) => `["${child}","${parent}"]`)),
      boundaries
    };
  }

  function expandedAt(id: number, commits: GitCommitNode[]): ExpandedCommit {
    return {
      id,
      hash: commits[id].hash,
      srcElem: null,
      compareWithHash: null,
      compareWithSrcElem: null,
      commitDetails: null,
      fileTree: null,
      loading: false
    };
  }

  interface RenderOptions {
    style?: Config["graphStyle"];
    expand?: number;
    head?: string | null;
  }

  /** Renders the commits with the highlight and returns the svg; a null highlight is the reference render. */
  function render(
    commits: GitCommitNode[],
    highlight: PathHighlightResult | null,
    options: RenderOptions = {}
  ): { graph: Graph; svg: MockElement } {
    allCreatedElements = [];
    containerElement = createMockElement("div");
    const graph = new Graph("testGraph", {
      ...DEFAULT_CONFIG,
      graphStyle: options.style ?? DEFAULT_CONFIG.graphStyle
    });
    graph.loadCommits(commits, options.head ?? null, lookupOf(commits));
    graph.setPathHighlight(highlight);
    graph.render(options.expand === undefined ? null : expandedAt(options.expand, commits));
    return { graph, svg: containerElement.children[0] };
  }

  function descendants(elem: MockElement, tagName: string): MockElement[] {
    const found: MockElement[] = [];
    const walk = (current: MockElement): void => {
      if (current.tagName === tagName) found.push(current);
      current.children.forEach(walk);
    };
    walk(elem);
    return found;
  }

  function classesOf(elem: MockElement): string[] {
    return (elem.getAttribute("class") ?? "").split(" ").filter((name) => name !== "");
  }

  function linePaths(svg: MockElement): MockElement[] {
    return descendants(svg, "path").filter((path) => classesOf(path).includes("line"));
  }

  function shadowPaths(svg: MockElement): MockElement[] {
    return descendants(svg, "path").filter((path) => classesOf(path).includes("shaddow"));
  }

  function dOf(path: MockElement): string {
    return path.getAttribute("d") ?? "";
  }

  function selectedOf(paths: MockElement[]): string[] {
    return paths.filter((path) => classesOf(path).includes(CLASS_SELECTED)).map(dOf);
  }

  function unselectedOf(paths: MockElement[]): string[] {
    return paths.filter((path) => !classesOf(path).includes(CLASS_SELECTED)).map(dOf);
  }

  function rings(svg: MockElement): MockElement[] {
    return descendants(svg, "circle").filter((circle) => classesOf(circle).includes(CLASS_RING));
  }

  function boundaryRects(svg: MockElement): MockElement[] {
    return descendants(svg, "rect").filter((rect) => classesOf(rect).includes(CLASS_BOUNDARY));
  }

  function hashCircles(svg: MockElement): MockElement[] {
    return descendants(svg, "circle").filter((circle) => circle.getAttribute("data-hash") !== null);
  }

  function circleOf(svg: MockElement, hash: string): MockElement {
    const circle = hashCircles(svg).find((elem) => elem.getAttribute("data-hash") === hash);
    expect(circle).toBeDefined();
    return circle!;
  }

  function centreOf(elem: MockElement): [string | null, string | null] {
    return [elem.getAttribute("cx"), elem.getAttribute("cy")];
  }

  interface Segment {
    command: string;
    coords: string;
    startX: string | null;
    endX: string;
  }

  /**
   * Point sequence of the concatenated paths: drops a move that repeats the current point and
   * merges consecutive vertical segments, the only simplification the renderer applies.
   */
  function pointSequence(paths: MockElement[]): string {
    const tokens =
      paths
        .map(dOf)
        .join("")
        .match(/[MLC][^MLC]*/g) ?? [];
    const segments: Segment[] = [];
    let current: [string, string] | null = null;
    for (const token of tokens) {
      const command = token[0];
      const coords = token.slice(1).trim();
      const [endX, endY] = (coords.split(" ").pop() ?? "").split(",");
      if (command === "M" && current !== null && endX === current[0] && endY === current[1]) {
        continue;
      }
      const previous = segments[segments.length - 1];
      if (
        command === "L" &&
        current !== null &&
        endX === current[0] &&
        previous !== undefined &&
        previous.command === "L" &&
        previous.startX === endX &&
        previous.endX === endX
      ) {
        previous.coords = `${endX},${endY}`;
        current = [endX, endY];
        continue;
      }
      segments.push({ command, coords, startX: current === null ? null : current[0], endX });
      current = [endX, endY];
    }
    return segments.map((segment) => `${segment.command}${segment.coords}`).join("");
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("splits a straight lane at the highlight boundary and rejoins it after clearing (TC-078)", () => {
    // Case: TC-078
    // Given: b -> c highlighted on the straight fixture
    const highlight = highlightOf(["b", "c"], [["b", "c"]]);

    // When: rendered
    const { graph, svg } = render(STRAIGHT, highlight);
    const lines = linePaths(svg);
    const shadows = shadowPaths(svg);

    // Then: two line paths, only the b -> c one selected, shadows match, svg in mode
    expect(lines).toHaveLength(2);
    expect(selectedOf(lines)).toEqual([STRAIGHT_B_TO_C]);
    expect(unselectedOf(lines)).toEqual([STRAIGHT_A_TO_B]);
    expect(shadows.map(dOf)).toEqual(lines.map(dOf));
    expect(selectedOf(shadows)).toEqual([STRAIGHT_B_TO_C]);
    expect(classesOf(svg)).toContain(CLASS_MODE);

    // When: the highlight is cleared and rendered again
    graph.setPathHighlight(null);
    graph.render(null);
    const cleared = containerElement.children[0];

    // Then: one path equal to the two joined, no selected class, no mode class
    expect(linePaths(cleared).map(dOf)).toEqual([STRAIGHT_WHOLE]);
    expect(pointSequence(linePaths(cleared))).toBe(pointSequence(lines));
    expect(selectedOf(descendants(cleared, "path"))).toEqual([]);
    expect(classesOf(cleared)).not.toContain(CLASS_MODE);
  });

  it("highlights the new part and the shared trailing part of m -> b (TC-079)", () => {
    // Case: TC-079
    const { svg } = render(MERGE, highlightOf(["m", "b"], [["m", "b"]]));
    const reference = render(MERGE, null).svg;

    // Then: the whole m -> b line is one selected path; m -> a, b -> r, n's lines are not
    expect(selectedOf(linePaths(svg))).toEqual([MERGE_M_TO_B]);
    expect(unselectedOf(linePaths(svg))).toEqual([
      MERGE_M_TO_A,
      MERGE_B_TO_R_AND_N_TO_JOIN,
      MERGE_N_TO_C
    ]);
    expect(
      linePaths(reference)
        .map(dOf)
        .some((d) => d.startsWith(MERGE_M_TO_B_CURVES))
    ).toBe(true);
    expect(pointSequence(linePaths(svg))).toBe(pointSequence(linePaths(reference)));
    expect(shadowPaths(svg).map(dOf)).toEqual(linePaths(svg).map(dOf));
  });

  it("highlights the n -> b merge line and the shared part from the join point to b (TC-080)", () => {
    // Case: TC-080
    const { svg } = render(MERGE, highlightOf(["n", "b"], [["n", "b"]]));
    const reference = render(MERGE, null).svg;

    // Then: the shared part and the merge line are selected; m -> b before the join is not
    expect(selectedOf(linePaths(svg))).toEqual([MERGE_JOIN_TO_B, MERGE_N_TO_JOIN]);
    expect(unselectedOf(linePaths(svg))).toContain(MERGE_M_TO_JOIN);
    expect(pointSequence(linePaths(svg))).toBe(pointSequence(linePaths(reference)));
  });

  it("leaves b -> r, n -> c and m -> a unselected for the n -> b selection (TC-081)", () => {
    // Case: TC-081
    const { svg } = render(MERGE, highlightOf(["n", "b"], [["n", "b"]]));
    const selected = selectedOf(linePaths(svg));

    // Then: none of the unrelated same-colour or trailing parts is selected
    expect(unselectedOf(linePaths(svg))).toEqual([
      MERGE_M_TO_A,
      MERGE_M_TO_JOIN,
      MERGE_B_TO_R,
      MERGE_N_TO_C
    ]);
    expect(selected).not.toContain(MERGE_B_TO_R);
    expect(selected).not.toContain(MERGE_N_TO_C);
    expect(selected).not.toContain(MERGE_M_TO_A);
  });

  it("keeps the angular point sequence and draws no curve (TC-082)", () => {
    // Case: TC-082
    const { svg } = render(MERGE, highlightOf(["n", "b"], [["n", "b"]]), { style: "angular" });
    const reference = render(MERGE, null, { style: "angular" }).svg;
    const selected = selectedOf(linePaths(svg));

    // Then: same points as the reference, two selected paths without curve commands
    expect(pointSequence(linePaths(svg))).toBe(pointSequence(linePaths(reference)));
    expect(selected).toHaveLength(2);
    for (const d of selected) {
      expect(d).not.toMatch(CURVE_COMMANDS);
    }
  });

  it("keeps the rounded curve of the m -> b path (TC-083)", () => {
    // Case: TC-083
    const { svg } = render(MERGE, highlightOf(["m", "b"], [["m", "b"]]), { style: "rounded" });
    const reference = render(MERGE, null, { style: "rounded" }).svg;
    const selected = selectedOf(linePaths(svg));

    // Then: the selected path has the curve and is the head of the reference lane path
    expect(selected).toEqual([MERGE_M_TO_B]);
    expect(selected[0]).toMatch(CURVE_COMMANDS);
    const referenceLane = linePaths(reference)
      .map(dOf)
      .find((d) => d.startsWith("M8,12.0C"));
    expect(referenceLane).toBeDefined();
    expect(referenceLane!.startsWith(MERGE_M_TO_B_CURVES)).toBe(true);
    expect(pointSequence(linePaths(svg))).toBe(pointSequence(linePaths(reference)));
  });

  it("keeps ownership across the lockedFirst expansion of m (TC-084)", () => {
    // Case: TC-084
    // Given: m (row 0) expanded, so the first m -> b transition (lockedFirst) crosses the expansion
    const { svg } = render(MERGE, highlightOf(["m", "b"], [["m", "b"]]), { expand: 0 });
    const reference = render(MERGE, null, { expand: 0 }).svg;

    // Then: transition and extension are both selected and match the reference geometry
    expect(selectedOf(linePaths(svg))).toEqual([MERGE_M_TO_B_EXPANDED]);
    expect(selectedOf(shadowPaths(svg))).toEqual([MERGE_M_TO_B_EXPANDED]);
    expect(pointSequence(linePaths(svg))).toBe(pointSequence(linePaths(reference)));
  });

  it("keeps ownership across the non-lockedFirst expansion of a (TC-085)", () => {
    // Case: TC-085
    // Given: a (row 2) expanded, so the (1,2) -> (0,3) part of m -> b (lockedFirst false) crosses it
    const { svg } = render(MERGE, highlightOf(["m", "b"], [["m", "b"]]), { expand: 2 });
    const reference = render(MERGE, null, { expand: 2 }).svg;

    // Then: extension and moved transition are selected; n -> b is not; geometry matches
    expect(selectedOf(linePaths(svg))).toEqual([MERGE_M_TO_B_EXPANDED]);
    expect(selectedOf(shadowPaths(svg))).toEqual([MERGE_M_TO_B_EXPANDED]);
    expect(
      unselectedOf(linePaths(svg)).some((d) => d.startsWith(MERGE_B_TO_R_AFTER_EXPANSION))
    ).toBe(true);
    expect(pointSequence(linePaths(svg))).toBe(pointSequence(linePaths(reference)));
  });

  it("draws rings beside the HEAD circle and removes them on clear (TC-086)", () => {
    // Case: TC-086
    const highlight = highlightOf(["m", "b"], [["m", "b"]]);
    const reference = render(MERGE, null, { head: "m" }).svg;
    const { graph, svg } = render(MERGE, highlight, { head: "m" });
    const mCircle = circleOf(svg, "m");

    // Then: two rings at m and b, the HEAD circle unchanged, no extra data-hash circle
    expect(rings(svg).map((ring) => [...centreOf(ring), ring.getAttribute("r")])).toEqual([
      [...centreOf(mCircle), RING_RADIUS],
      [...centreOf(circleOf(svg, "b")), RING_RADIUS]
    ]);
    expect(rings(svg).every((ring) => ring.getAttribute("data-hash") === null)).toBe(true);
    expect(classesOf(mCircle)).toContain("current");
    expect(mCircle.getAttribute("fill")).toBe(circleOf(reference, "m").getAttribute("fill"));
    expect(hashCircles(svg)).toHaveLength(hashCircles(reference).length);

    // When: cleared
    graph.setPathHighlight(null);
    graph.render(null);
    const cleared = containerElement.children[0];

    // Then: no ring, HEAD still current, no mode class
    expect(rings(cleared)).toHaveLength(0);
    expect(classesOf(circleOf(cleared, "m"))).toContain("current");
    expect(classesOf(cleared)).not.toContain(CLASS_MODE);
  });

  it("draws one square for a child with two unloaded parents (TC-087)", () => {
    // Case: TC-087
    const highlight = highlightOf(
      ["c1"],
      [],
      [
        { childHash: "c1", parentHash: "g2" },
        { childHash: "c1", parentHash: "g1" }
      ]
    );
    const reference = render(TWO_UNLOADED_PARENTS, null).svg;
    const { svg } = render(TWO_UNLOADED_PARENTS, highlight);
    const rects = boundaryRects(svg);
    const c1 = circleOf(svg, "c1");

    // Then: one 12 x 12 square centred on c1, no circle for g1 / g2, one ring
    expect(rects).toHaveLength(1);
    expect(rects[0].getAttribute("width")).toBe(BOUNDARY_SIDE);
    expect(rects[0].getAttribute("height")).toBe(BOUNDARY_SIDE);
    expect(Number(rects[0].getAttribute("x")) + HALF_BOUNDARY_SIDE).toBe(
      Number(c1.getAttribute("cx"))
    );
    expect(Number(rects[0].getAttribute("y")) + HALF_BOUNDARY_SIDE).toBe(
      Number(c1.getAttribute("cy"))
    );
    expect(hashCircles(svg).map((circle) => circle.getAttribute("data-hash"))).toEqual(["c1", "x"]);
    expect(hashCircles(svg)).toHaveLength(hashCircles(reference).length);
    expect(rings(svg)).toHaveLength(1);
  });

  it("does not highlight the continuation line to an unloaded parent (TC-088)", () => {
    // Case: TC-088
    const { svg } = render(
      UNLOADED_PARENT,
      highlightOf(["t"], [], [{ childHash: "t", parentHash: "gap" }])
    );
    const lines = linePaths(svg);

    // Then: no selected path, no line reaching r's lane, one ring and one square at t
    expect(selectedOf(descendants(svg, "path"))).toEqual([]);
    expect(circleOf(svg, "r").getAttribute("cx")).toBe(UNLOADED_PARENT_R_LANE_X);
    expect(lines.some((line) => dOf(line).includes(`${UNLOADED_PARENT_R_LANE_X},`))).toBe(false);
    expect(rings(svg).map(centreOf)).toEqual([centreOf(circleOf(svg, "t"))]);
    expect(boundaryRects(svg)).toHaveLength(1);
  });

  it("terminates on reversed input and highlights no line that does not exist (TC-089)", () => {
    // Case: TC-089
    const spy = vi.spyOn(Vertex.prototype, "registerParentProcessed");

    // When: c -> a is highlighted although a precedes c
    const { svg } = render(REVERSED, highlightOf(["c", "a"], [["c", "a"]]));

    // Then: placement finished as in S20 TC-076, no selected path, rings for a and c
    expect(spy).toHaveBeenCalledTimes(2);
    expect(selectedOf(descendants(svg, "path"))).toEqual([]);
    expect(rings(svg).map(centreOf)).toEqual([
      centreOf(circleOf(svg, "a")),
      centreOf(circleOf(svg, "c"))
    ]);
  });
});
