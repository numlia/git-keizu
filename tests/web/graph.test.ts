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

import { Graph } from "../../web/graph";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: Config = {
  autoCenterCommitDetailsView: false,
  fetchAvatars: false,
  graphColours: ["#0085d9", "#d9534f", "#428bca", "#5cb85c"],
  graphStyle: "rounded",
  grid: { x: 16, y: 24, offsetX: 8, offsetY: 12, expandY: 160 },
  initialLoadCommits: 300,
  loadMoreCommits: 100,
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

describe("Graph stash vertex drawing", () => {
  beforeEach(() => {
    allCreatedElements = [];
    containerElement = createMockElement("div");
    vi.clearAllMocks();
  });

  it("draws double circle (outer + inner ring) for stash vertex (TC-SR-N-06)", () => {
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

  it("draws single circle for non-stash vertex (TC-SR-N-07)", () => {
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
