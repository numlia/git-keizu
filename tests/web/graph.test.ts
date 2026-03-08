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
