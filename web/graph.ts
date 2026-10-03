import { UNCOMMITTED_CHANGES_HASH } from "../src/types";
import {
  CLASS_FILE_HISTORY_CURRENT,
  CLASS_FILE_HISTORY_DIM,
  CLASS_FILE_HISTORY_MATCH,
  CLASS_FILE_HISTORY_MODE
} from "./fileHistoryClasses";
import type { PathHighlightResult } from "./pathHighlight";
import { pathEdgeKey } from "./pathHighlight";

export const NULL_VERTEX_ID = -1;
const CLASS_FILE_HISTORY_MATCH_CURRENT = `${CLASS_FILE_HISTORY_MATCH} ${CLASS_FILE_HISTORY_CURRENT}`;

// CSS class names of the path highlight rendering (media/main.css owns their styles).
export const CLASS_PATH_HIGHLIGHT_MODE = "pathHighlightMode";
export const CLASS_PATH_HIGHLIGHT_SELECTED = "pathHighlightSelected";
export const CLASS_PATH_HIGHLIGHT_RING = "pathHighlightRing";
export const CLASS_PATH_HIGHLIGHT_BOUNDARY = "pathHighlightBoundary";

/** Radius (px) of the ring drawn around a highlighted commit, outside the 4 px vertex circle. */
export const PATH_HIGHLIGHT_RING_RADIUS = 6;
/** Side (px) of the boundary square: it circumscribes the ring. */
export const PATH_HIGHLIGHT_BOUNDARY_SIZE = PATH_HIGHLIGHT_RING_RADIUS * 2;

const NO_EDGE_KEYS: ReadonlySet<string> = new Set();
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function withHighlightClass(baseClass: string, highlightClass: string | null): string {
  if (highlightClass === null) return baseClass;
  return baseClass === "" ? highlightClass : `${baseClass} ${highlightClass}`;
}

function isNormalCommit(commit: GG.GitCommitNode): boolean {
  return commit.hash !== UNCOMMITTED_CHANGES_HASH && commit.stash === null;
}

function unionEdgeKeys(a: ReadonlySet<string>, b: ReadonlySet<string>): ReadonlySet<string> {
  return new Set([...a, ...b]);
}

function isHighlighted(line: PlacedLine, highlightedEdgeKeys: ReadonlySet<string> | null): boolean {
  if (highlightedEdgeKeys === null) return false;
  for (const key of line.edgeKeys) {
    if (highlightedEdgeKeys.has(key)) return true;
  }
  return false;
}

interface UnavailablePoint {
  connectsTo: VertexOrNull;
  onBranch: Branch;
  /** Index on `onBranch` of the line that starts at this point (the next line added after registration). */
  nextLineIndex: number;
}
type VertexOrNull = Vertex | null;

class Branch {
  private lines: Line[] = [];
  private colour: number;
  private numUncommitted: number = 0;

  constructor(colour: number) {
    this.colour = colour;
  }

  public addLine(
    p1: Point,
    p2: Point,
    isCommitted: boolean,
    lockedFirst: boolean,
    edgeKeys: ReadonlySet<string>
  ) {
    this.lines.push({ p1: p1, p2: p2, lockedFirst: lockedFirst, edgeKeys: edgeKeys });
    if (isCommitted) {
      if (p2.x === 0 && p2.y < this.numUncommitted) this.numUncommitted = p2.y;
    } else {
      this.numUncommitted++;
    }
  }
  public getLineCount() {
    return this.lines.length;
  }
  /**
   * Adds `edgeKeys` to the line at `index` when that line starts at `from`, replacing it with a
   * new object. Returns the end point of the line so the caller can follow the shared range, or
   * null when the index does not hold the expected line.
   */
  public shareEdgeKeys(index: number, from: Point, edgeKeys: ReadonlySet<string>): Point | null {
    const line = this.lines[index];
    if (line === undefined || line.p1.x !== from.x || line.p1.y !== from.y) return null;
    this.lines[index] = { ...line, edgeKeys: unionEdgeKeys(line.edgeKeys, edgeKeys) };
    return line.p2;
  }
  public getColour() {
    return this.colour;
  }
  public draw(
    svg: SVGElement,
    config: Config,
    expandAt: number,
    highlightedEdgeKeys: ReadonlySet<string> | null
  ) {
    let colour = config.graphColours[this.colour % config.graphColours.length],
      i,
      x1,
      y1,
      x2,
      y2,
      lines: PlacedLine[] = [],
      curPath = "",
      curColour = "",
      curSelected = false,
      d = config.grid.y * (config.graphStyle === "angular" ? 0.38 : 0.8);
    const isSelected = (line: PlacedLine) => isHighlighted(line, highlightedEdgeKeys);

    // Convert branch lines into pixel coordinates, respecting expanded commit extensions
    for (i = 0; i < this.lines.length; i++) {
      x1 = this.lines[i].p1.x * config.grid.x + config.grid.offsetX;
      y1 = this.lines[i].p1.y * config.grid.y + config.grid.offsetY;
      x2 = this.lines[i].p2.x * config.grid.x + config.grid.offsetX;
      y2 = this.lines[i].p2.y * config.grid.y + config.grid.offsetY;

      // If a commit is expanded, we needd to stretch the graph for the height of the commit details view
      if (expandAt > -1) {
        if (this.lines[i].p1.y > expandAt) {
          // If the line starts after the expansion, move the whole line lower
          y1 += config.grid.expandY;
          y2 += config.grid.expandY;
        } else if (this.lines[i].p2.y > expandAt) {
          // If the line crosses the expansion
          if (x1 === x2) {
            // The line is vertical, extend the endpoint past the expansion
            y2 += config.grid.expandY;
          } else if (this.lines[i].lockedFirst) {
            // If the line is locked to the first point, the transition stays in its normal position
            lines.push({
              p1: { x: x1, y: y1 },
              p2: { x: x2, y: y2 },
              isCommitted: i >= this.numUncommitted,
              lockedFirst: this.lines[i].lockedFirst,
              edgeKeys: this.lines[i].edgeKeys
            }); // Display the normal transition
            lines.push({
              p1: { x: x2, y: y1 + config.grid.y },
              p2: { x: x2, y: y2 + config.grid.expandY },
              isCommitted: i >= this.numUncommitted,
              lockedFirst: this.lines[i].lockedFirst,
              edgeKeys: this.lines[i].edgeKeys
            }); // Extend the line over the expansion from the transition end point
            continue;
          } else {
            // If the line is locked to the second point, the transition moves to after the expansion
            lines.push({
              p1: { x: x1, y: y1 },
              p2: { x: x1, y: y2 - config.grid.y + config.grid.expandY },
              isCommitted: i >= this.numUncommitted,
              lockedFirst: this.lines[i].lockedFirst,
              edgeKeys: this.lines[i].edgeKeys
            }); // Extend the line over the expansion to the new transition start point
            y1 += config.grid.expandY;
            y2 += config.grid.expandY;
          }
        }
      }
      lines.push({
        p1: { x: x1, y: y1 },
        p2: { x: x2, y: y2 },
        isCommitted: i >= this.numUncommitted,
        lockedFirst: this.lines[i].lockedFirst,
        edgeKeys: this.lines[i].edgeKeys
      });
    }

    // Simplify consecutive lines that are straight by removing the 'middle' point
    i = 0;
    while (i < lines.length - 1) {
      if (
        lines[i].p1.x === lines[i].p2.x &&
        lines[i].p2.x === lines[i + 1].p1.x &&
        lines[i + 1].p1.x === lines[i + 1].p2.x &&
        lines[i].p2.y === lines[i + 1].p1.y &&
        lines[i].isCommitted === lines[i + 1].isCommitted &&
        isSelected(lines[i]) === isSelected(lines[i + 1])
      ) {
        lines[i].p2.y = lines[i + 1].p2.y;
        lines.splice(i + 1, 1);
      } else {
        i++;
      }
    }

    // Iterate through all lines, producing and adding the svg paths to the DOM
    for (i = 0; i < lines.length; i++) {
      x1 = lines[i].p1.x;
      y1 = lines[i].p1.y;
      x2 = lines[i].p2.x;
      y2 = lines[i].p2.y;

      // If the new point belongs to a different path, render the current path and reset it for the new path
      if (
        curPath !== "" &&
        i > 0 &&
        (lines[i].isCommitted !== lines[i - 1].isCommitted ||
          isSelected(lines[i]) !== isSelected(lines[i - 1]))
      ) {
        this.drawPath(svg, curPath, curColour, curSelected);
        curPath = "";
        curColour = "";
      }

      if (curPath === "") curSelected = isSelected(lines[i]);

      // If the path hasn't been started or the new point belongs to a different path, move to p1
      if (curPath === "" || (i > 0 && (x1 !== lines[i - 1].p2.x || y1 !== lines[i - 1].p2.y)))
        curPath += `M${x1.toFixed(0)},${y1.toFixed(1)}`;

      // If the path hasn't been assigned a colour, assign it
      if (curColour === "") curColour = lines[i].isCommitted ? colour : "#808080";

      if (x1 === x2) {
        // If the path is vertical, draw a straight line
        curPath += `L${x2.toFixed(0)},${y2.toFixed(1)}`;
      } else {
        // If the path moves horizontal, draw the appropriate transition
        if (config.graphStyle === "angular") {
          curPath += lines[i].lockedFirst
            ? `L${x2.toFixed(0)},${(y2 - d).toFixed(1)}L${x2.toFixed(0)},${y2.toFixed(1)}`
            : `L${x1.toFixed(0)},${(y1 + d).toFixed(1)}L${x2.toFixed(0)},${y2.toFixed(1)}`;
        } else {
          curPath += `C${x1.toFixed(0)},${(y1 + d).toFixed(1)} ${x2.toFixed(0)},${(y2 - d).toFixed(1)} ${x2.toFixed(0)},${y2.toFixed(1)}`;
        }
      }
    }

    this.drawPath(svg, curPath, curColour, curSelected); // Draw the remaining path
  }
  private drawPath(svg: SVGElement, path: string, colour: string, selected: boolean) {
    const highlightClass = selected ? CLASS_PATH_HIGHLIGHT_SELECTED : null;
    let line1 = document.createElementNS("http://www.w3.org/2000/svg", "path"),
      line2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    line1.setAttribute("class", withHighlightClass("shaddow", highlightClass));
    line1.setAttribute("d", path);
    line2.setAttribute("class", withHighlightClass("line", highlightClass));
    line2.setAttribute("d", path);
    line2.setAttribute("stroke", colour);
    svg.appendChild(line1);
    svg.appendChild(line2);
  }
}

export class Vertex {
  private id: number;
  private x: number = 0;
  private y: number;
  private parents: Vertex[] = [];
  private children: Vertex[] = [];
  private nextParent: number = 0;
  private onBranch: Branch | null = null;
  private isCommitted: boolean = true;
  private isCurrent: boolean = false;
  private _isStash: boolean = false;
  private nextX: number = 0;
  private connections: UnavailablePoint[] = [];

  constructor(id: number) {
    this.id = id;
    this.y = id;
  }

  public getId(): number {
    return this.id;
  }

  public addChild(vertex: Vertex) {
    this.children.push(vertex);
  }

  public getParents(): Vertex[] {
    return this.parents;
  }

  public getChildren(): Vertex[] {
    return this.children;
  }

  public get isStash(): boolean {
    return this._isStash;
  }

  public addParent(vertex: Vertex) {
    this.parents.push(vertex);
  }
  public getNextParent(): Vertex | null {
    if (this.nextParent < this.parents.length) return this.parents[this.nextParent];
    return null;
  }
  /** Index into the original `parentHashes` of the parent currently being placed. */
  public getNextParentIndex(): number {
    return this.nextParent;
  }
  public registerParentProcessed() {
    this.nextParent++;
  }
  public isMerge() {
    return this.parents.length > 1;
  }

  public addToBranch(branch: Branch, x: number) {
    if (this.onBranch === null) {
      this.onBranch = branch;
      this.x = x;
    }
  }
  public isNotOnBranch() {
    return this.onBranch === null;
  }
  public isOnThisBranch(branch: Branch) {
    return this.onBranch === branch;
  }
  public getBranch() {
    return this.onBranch;
  }

  public getPoint(): Point {
    return { x: this.x, y: this.y };
  }
  public getNextPoint(): Point {
    return { x: this.nextX, y: this.y };
  }
  public getIsCommitted() {
    return this.isCommitted;
  }

  public getPointConnectingTo(vertex: VertexOrNull, onBranch: Branch) {
    for (let i = 0; i < this.connections.length; i++) {
      if (this.connections[i].connectsTo === vertex && this.connections[i].onBranch === onBranch)
        return { x: i, y: this.y };
    }
    return null;
  }
  public registerUnavailablePoint(x: number, connectsToVertex: VertexOrNull, onBranch: Branch) {
    if (x === this.nextX) {
      this.nextX = x + 1;
      this.connections[x] = {
        connectsTo: connectsToVertex,
        onBranch: onBranch,
        nextLineIndex: onBranch.getLineCount()
      };
    }
  }
  /** Index on `onBranch` of the line leaving the point at `x`, or null when no such point was registered there. */
  public getLineIndexAfter(x: number, onBranch: Branch): number | null {
    const point = this.connections[x];
    return point !== undefined && point.onBranch === onBranch ? point.nextLineIndex : null;
  }

  public getColour() {
    return this.onBranch !== null ? this.onBranch.getColour() : 0;
  }
  public setNotCommited() {
    this.isCommitted = false;
  }
  public setCurrent() {
    this.isCurrent = true;
  }
  public setStash() {
    this._isStash = true;
  }
  public draw(
    svg: SVGElement,
    config: Config,
    expandOffset: boolean,
    hash: string,
    highlightClass: string | null
  ) {
    if (this.onBranch === null) return;

    let colour = this.isCommitted
      ? config.graphColours[this.onBranch.getColour() % config.graphColours.length]
      : "#808080";
    const centre = this.getCentre(config, expandOffset);
    let cx = `${centre.x}`;
    let cy = `${centre.y}`;

    if (this.isStash) {
      let outerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      outerCircle.setAttribute("cx", cx);
      outerCircle.setAttribute("cy", cy);
      outerCircle.setAttribute("r", "4");
      outerCircle.setAttribute("fill", colour);
      outerCircle.setAttribute("data-hash", hash);
      outerCircle.setAttribute("class", withHighlightClass("stashOuter", highlightClass));
      svg.appendChild(outerCircle);

      let innerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      innerCircle.setAttribute("cx", cx);
      innerCircle.setAttribute("cy", cy);
      innerCircle.setAttribute("r", "2");
      innerCircle.setAttribute("data-hash", hash);
      innerCircle.setAttribute("class", withHighlightClass("stashInner", highlightClass));
      innerCircle.setAttribute("stroke", colour);
      svg.appendChild(innerCircle);
    } else {
      let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", cx);
      circle.setAttribute("cy", cy);
      circle.setAttribute("r", "4");
      circle.setAttribute("data-hash", hash);
      if (this.isCurrent) {
        circle.setAttribute("class", withHighlightClass("current", highlightClass));
        circle.setAttribute("stroke", colour);
      } else {
        if (highlightClass !== null) circle.setAttribute("class", highlightClass);
        circle.setAttribute("fill", colour);
      }
      svg.appendChild(circle);
    }
  }
  /**
   * Draws the path highlight marks on top of the vertex circle: a ring when the commit is on
   * the highlighted path and a square when one of its followed parents is not loaded.
   * The marks carry no data-hash so that lookups of commit circles are unaffected.
   */
  public drawPathHighlightMarks(
    svg: SVGElement,
    config: Config,
    expandOffset: boolean,
    ring: boolean,
    boundary: boolean
  ) {
    if (this.onBranch === null) return;
    const centre = this.getCentre(config, expandOffset);

    if (ring) {
      const circle = document.createElementNS(SVG_NAMESPACE, "circle");
      circle.setAttribute("cx", `${centre.x}`);
      circle.setAttribute("cy", `${centre.y}`);
      circle.setAttribute("r", `${PATH_HIGHLIGHT_RING_RADIUS}`);
      circle.setAttribute("class", CLASS_PATH_HIGHLIGHT_RING);
      svg.appendChild(circle);
    }
    if (boundary) {
      const rect = document.createElementNS(SVG_NAMESPACE, "rect");
      rect.setAttribute("x", `${centre.x - PATH_HIGHLIGHT_RING_RADIUS}`);
      rect.setAttribute("y", `${centre.y - PATH_HIGHLIGHT_RING_RADIUS}`);
      rect.setAttribute("width", `${PATH_HIGHLIGHT_BOUNDARY_SIZE}`);
      rect.setAttribute("height", `${PATH_HIGHLIGHT_BOUNDARY_SIZE}`);
      rect.setAttribute("class", CLASS_PATH_HIGHLIGHT_BOUNDARY);
      svg.appendChild(rect);
    }
  }
  private getCentre(config: Config, expandOffset: boolean): Pixel {
    return {
      x: this.x * config.grid.x + config.grid.offsetX,
      y: this.y * config.grid.y + config.grid.offsetY + (expandOffset ? config.grid.expandY : 0)
    };
  }
}

export class Graph {
  private config: Config;

  private svg: SVGElement;
  private svgGroup: SVGGElement | null = null;
  private svgMaskRect: SVGRectElement;
  private svgGradientStop1: SVGStopElement;
  private svgGradientStop2: SVGStopElement;
  private maxWidth: number = -1;

  private vertices: Vertex[] = [];
  private branches: Branch[] = [];
  private availableColours: number[] = [];
  private commits: GG.GitCommitNode[] = [];
  private commitLookup: { [hash: string]: number } = {};
  private fileHistoryHighlight: GraphFileHistoryHighlight | null = null;
  private pathHighlight: PathHighlightResult | null = null;

  constructor(id: string, config: Config) {
    this.config = config;

    let svgNamespace = "http://www.w3.org/2000/svg";
    let defs = document.createElementNS(svgNamespace, "defs"),
      linearGradient = document.createElementNS(svgNamespace, "linearGradient"),
      mask = document.createElementNS(svgNamespace, "mask");
    this.svg = <SVGElement>document.createElementNS(svgNamespace, "svg");
    this.svgMaskRect = <SVGRectElement>document.createElementNS(svgNamespace, "rect");
    this.svgGradientStop1 = <SVGStopElement>document.createElementNS(svgNamespace, "stop");
    this.svgGradientStop2 = <SVGStopElement>document.createElementNS(svgNamespace, "stop");

    linearGradient.setAttribute("id", "GraphGradient");
    this.svgGradientStop1.setAttribute("stop-color", "white");
    linearGradient.appendChild(this.svgGradientStop1);
    this.svgGradientStop2.setAttribute("stop-color", "black");
    linearGradient.appendChild(this.svgGradientStop2);
    defs.appendChild(linearGradient);
    mask.setAttribute("id", "GraphMask");
    this.svgMaskRect.setAttribute("fill", "url(#GraphGradient)");
    mask.appendChild(this.svgMaskRect);
    defs.appendChild(mask);
    this.svg.appendChild(defs);
    this.setDimensions(0, 0);
    document.getElementById(id)!.appendChild(this.svg);
  }

  public loadCommits(
    commits: GG.GitCommitNode[],
    commitHead: string | null,
    commitLookup: { [hash: string]: number }
  ) {
    this.vertices = [];
    this.branches = [];
    this.availableColours = [];
    this.commits = commits;
    this.commitLookup = commitLookup;

    const nullVertex = new Vertex(NULL_VERTEX_ID);
    let i: number, j: number;
    for (i = 0; i < commits.length; i++) {
      let vertex = new Vertex(i);
      if (commits[i].stash !== null) {
        vertex.setStash();
      }
      this.vertices.push(vertex);
    }
    for (i = 0; i < commits.length; i++) {
      for (j = 0; j < commits[i].parentHashes.length; j++) {
        if (typeof commitLookup[commits[i].parentHashes[j]] === "number") {
          const parentVertex = this.vertices[commitLookup[commits[i].parentHashes[j]]];
          this.vertices[i].addParent(parentVertex);
          parentVertex.addChild(this.vertices[i]);
        } else {
          this.vertices[i].addParent(nullVertex);
        }
      }
    }

    if (commits.length > 0) {
      if (commits[0].hash === "*") {
        this.vertices[0].setCurrent();
        this.vertices[0].setNotCommited();
      } else if (commitHead !== null && typeof commitLookup[commitHead] === "number") {
        this.vertices[commitLookup[commitHead]].setCurrent();
      }
    }

    while ((i = this.findStart()) !== -1) {
      this.determinePath(i);
    }
  }

  public setFileHistoryHighlight(highlight: GraphFileHistoryHighlight | null): void {
    this.fileHistoryHighlight = highlight;
  }

  /** Stores the highlight state only; callers re-render afterwards. Independent of the file history highlight. */
  public setPathHighlight(highlight: PathHighlightResult | null): void {
    this.pathHighlight = highlight;
  }

  private getSvgModeClass(): string {
    const classes: string[] = [];
    if (this.fileHistoryHighlight !== null) classes.push(CLASS_FILE_HISTORY_MODE);
    if (this.pathHighlight !== null) classes.push(CLASS_PATH_HIGHLIGHT_MODE);
    return classes.join(" ");
  }

  private drawPathHighlightMarks(
    group: SVGGElement,
    highlight: PathHighlightResult,
    expandedCommit: ExpandedCommit | null
  ) {
    // One square per child, however many unloaded parents it has.
    const boundaryChildren = new Set(highlight.boundaries.map((boundary) => boundary.childHash));
    for (let i = 0; i < this.vertices.length; i++) {
      const hash = this.commits[i].hash;
      const ring = highlight.hashes.has(hash);
      const boundary = boundaryChildren.has(hash);
      if (!ring && !boundary) continue;
      this.vertices[i].drawPathHighlightMarks(
        group,
        this.config,
        expandedCommit !== null && i > expandedCommit.id,
        ring,
        boundary
      );
    }
  }

  private getFileHistoryHighlightClass(hash: string): string | null {
    const highlight = this.fileHistoryHighlight;
    if (highlight === null) return null;
    if (highlight.currentHash === hash) return CLASS_FILE_HISTORY_MATCH_CURRENT;
    return highlight.matchHashes.has(hash) ? CLASS_FILE_HISTORY_MATCH : CLASS_FILE_HISTORY_DIM;
  }

  public render(expandedCommit: ExpandedCommit | null) {
    let group = <SVGGElement>document.createElementNS("http://www.w3.org/2000/svg", "g"),
      i,
      width = this.getWidth();
    group.setAttribute("mask", "url(#GraphMask)");
    this.svg.setAttribute("class", this.getSvgModeClass());

    const highlightedEdgeKeys = this.pathHighlight !== null ? this.pathHighlight.edgeKeys : null;
    for (i = 0; i < this.branches.length; i++) {
      this.branches[i].draw(
        group,
        this.config,
        expandedCommit !== null ? expandedCommit.id : -1,
        highlightedEdgeKeys
      );
    }
    for (i = 0; i < this.vertices.length; i++) {
      const hash = this.commits[i].hash;
      this.vertices[i].draw(
        group,
        this.config,
        expandedCommit !== null && i > expandedCommit.id,
        hash,
        this.getFileHistoryHighlightClass(hash)
      );
    }
    if (this.pathHighlight !== null) {
      this.drawPathHighlightMarks(group, this.pathHighlight, expandedCommit);
    }

    if (this.svgGroup !== null) this.svg.removeChild(this.svgGroup);
    this.svg.appendChild(group);
    this.svgGroup = group;
    this.setDimensions(width, this.getHeight(expandedCommit));
    this.applyMaxWidth(width);
  }

  public clear() {
    if (this.svgGroup !== null) {
      this.svg.removeChild(this.svgGroup);
      this.svgGroup = null;
      this.setDimensions(0, 0);
    }
  }

  public getWidth() {
    let x = 0,
      i,
      p;
    for (i = 0; i < this.vertices.length; i++) {
      p = this.vertices[i].getNextPoint();
      if (p.x > x) x = p.x;
    }
    return x * this.config.grid.x;
  }

  public getHeight(expandedCommit: ExpandedCommit | null) {
    return (
      this.vertices.length * this.config.grid.y +
      this.config.grid.offsetY -
      this.config.grid.y / 2 +
      (expandedCommit !== null ? this.config.grid.expandY : 0)
    );
  }

  public getVertexColour(v: number) {
    return this.vertices[v].getColour() % this.config.graphColours.length;
  }

  public getMutedCommits(currentHash: string | null): boolean[] {
    const muted = Array.from({ length: this.commits.length }, () => false);
    const muteConfig = this.config.mute;

    // Mute merge commits (excluding stash commits)
    if (muteConfig.mergeCommits) {
      for (let i = 0; i < this.vertices.length; i++) {
        if (this.vertices[i].isMerge() && !this.vertices[i].isStash) {
          muted[i] = true;
        }
      }
    }

    // Mute commits that are not ancestors of HEAD
    if (muteConfig.commitsNotAncestorsOfHead) {
      if (currentHash !== null && typeof this.commitLookup[currentHash] === "number") {
        const reachable = new Set<number>();
        const queue: number[] = [this.commitLookup[currentHash]];

        while (queue.length > 0) {
          const idx = queue.shift()!;
          if (reachable.has(idx)) continue;
          reachable.add(idx);

          for (const parent of this.vertices[idx].getParents()) {
            const parentId = parent.getId();
            if (parentId !== NULL_VERTEX_ID && !reachable.has(parentId)) {
              queue.push(parentId);
            }
          }
        }

        for (let i = 0; i < this.commits.length; i++) {
          if (!reachable.has(i)) {
            muted[i] = true;
          }
        }
      }
      // If currentHash is null or not in commitLookup, treat all as reachable (no mute)
    }

    return muted;
  }

  public getFirstParentIndex(i: number): number {
    const parents = this.vertices[i].getParents();
    return parents.length > 0 ? parents[0].getId() : -1;
  }

  public getFirstChildIndex(i: number): number {
    const children = this.vertices[i].getChildren();
    if (children.length > 1) {
      const childOnSameBranch = this.getSameBranchChild(i, children);
      return childOnSameBranch !== undefined
        ? childOnSameBranch.getId()
        : Math.max(...children.map((child) => child.getId()));
    } else if (children.length === 1) {
      return children[0].getId();
    } else {
      return -1;
    }
  }

  public getAlternativeParentIndex(i: number): number {
    const parents = this.vertices[i].getParents();
    return parents.length > 1 ? parents[1].getId() : parents.length === 1 ? parents[0].getId() : -1;
  }

  public getAlternativeChildIndex(i: number): number {
    const children = this.vertices[i].getChildren();
    if (children.length > 1) {
      const childOnSameBranch = this.getSameBranchChild(i, children);
      if (childOnSameBranch !== undefined) {
        return Math.max(
          ...children.filter((child) => child !== childOnSameBranch).map((child) => child.getId())
        );
      } else {
        const childIndexes = children.map((child) => child.getId()).sort((a, b) => a - b);
        return childIndexes[childIndexes.length - 2];
      }
    } else if (children.length === 1) {
      return children[0].getId();
    } else {
      return -1;
    }
  }

  private getSameBranchChild(i: number, children: Vertex[]): Vertex | undefined {
    const branch = this.vertices[i].getBranch();
    return branch === null ? undefined : children.find((child) => child.isOnThisBranch(branch));
  }

  public limitMaxWidth(maxWidth: number) {
    this.maxWidth = maxWidth;
    this.applyMaxWidth(this.getWidth());
  }

  private setDimensions(width: number, height: number) {
    this.svg.setAttribute("width", `${width}`);
    this.svg.setAttribute("height", `${height}`);
    this.svgMaskRect.setAttribute("width", `${width}`);
    this.svgMaskRect.setAttribute("height", `${height}`);
  }

  private applyMaxWidth(width: number) {
    let offset1 = this.maxWidth > -1 ? (this.maxWidth - 12) / width : 1;
    let offset2 = this.maxWidth > -1 ? this.maxWidth / width : 1;
    this.svgGradientStop1.setAttribute("offset", `${offset1}`);
    this.svgGradientStop2.setAttribute("offset", `${offset2}`);
  }

  /**
   * Ownership keys of the lines placed while walking from `vertex` down to `parentVertex`.
   * Only a loaded parent below the child is reached by the downward walk; unloaded parents
   * (the null vertex), parents listed above their child, missing parents and pseudo rows
   * (working tree, stash) leave the lines without a logical connection.
   */
  private getEdgeKeysToParent(vertex: Vertex, parentVertex: VertexOrNull): ReadonlySet<string> {
    if (parentVertex === null || parentVertex.getId() <= vertex.getId()) return NO_EDGE_KEYS;
    const child = this.commits[vertex.getId()];
    const parent = this.commits[parentVertex.getId()];
    if (child === undefined || parent === undefined) return NO_EDGE_KEYS;
    if (!isNormalCommit(child) || !isNormalCommit(parent)) return NO_EDGE_KEYS;
    const parentHash = child.parentHashes[vertex.getNextParentIndex()];
    if (parentHash === undefined) return NO_EDGE_KEYS;
    return new Set([pathEdgeKey(child.hash, parentHash)]);
  }

  /**
   * A merge that joined an existing point shares the lines from that point down to the
   * parent's point with the connection that placed them. Every line advances one row, so the
   * walk follows the registered next-line index of each point and stops at the parent's row,
   * never spilling past the parent. Coordinates only locate the lines; ancestry comes from
   * `edgeKeys`.
   */
  private shareEdgeKeysToParent(
    branch: Branch,
    from: Point,
    parentVertex: Vertex,
    edgeKeys: ReadonlySet<string>
  ) {
    if (edgeKeys.size === 0) return;
    const end = parentVertex.getPoint();
    let point = from;
    while (point.y < end.y) {
      const row = this.vertices[point.y];
      const index = row !== undefined ? row.getLineIndexAfter(point.x, branch) : null;
      const next = index !== null ? branch.shareEdgeKeys(index, point, edgeKeys) : null;
      if (next === null || next.y !== point.y + 1) return;
      point = next;
    }
  }

  private determinePath(startAt: number) {
    let i = startAt;
    let vertex = this.vertices[i],
      parentVertex = this.vertices[i].getNextParent();
    let lastPoint = vertex.isNotOnBranch() ? vertex.getNextPoint() : vertex.getPoint(),
      curPoint;
    let edgeKeys = this.getEdgeKeysToParent(vertex, parentVertex);

    if (
      parentVertex !== null &&
      parentVertex.getId() !== NULL_VERTEX_ID &&
      vertex.isMerge() &&
      !vertex.isNotOnBranch() &&
      !parentVertex.isNotOnBranch()
    ) {
      // Branch is a merge between two vertices already on branches
      let foundPointToParent = false,
        parentBranch = parentVertex.getBranch()!;
      for (i = startAt + 1; i < this.vertices.length; i++) {
        curPoint = this.vertices[i].getPointConnectingTo(parentVertex, parentBranch); // Check if there is already a point connecting the ith vertex to the required parent
        if (curPoint !== null) {
          foundPointToParent = true; // Parent was found
        } else {
          curPoint = this.vertices[i].getNextPoint(); // Parent couldn't be found, choose the next avaialble point for the vertex
        }
        parentBranch.addLine(
          lastPoint,
          curPoint,
          vertex.getIsCommitted(),
          !foundPointToParent && this.vertices[i] !== parentVertex
            ? lastPoint.x < curPoint.x
            : true,
          edgeKeys
        );
        this.vertices[i].registerUnavailablePoint(curPoint.x, parentVertex, parentBranch);
        lastPoint = curPoint;

        if (foundPointToParent) {
          this.shareEdgeKeysToParent(parentBranch, curPoint, parentVertex, edgeKeys);
          vertex.registerParentProcessed();
          break;
        }
      }
    } else {
      // Branch is normal
      let branch = new Branch(this.getAvailableColour(startAt));
      vertex.addToBranch(branch, lastPoint.x);
      vertex.registerUnavailablePoint(lastPoint.x, vertex, branch);
      for (i = startAt + 1; i < this.vertices.length; i++) {
        curPoint =
          parentVertex === this.vertices[i] && !parentVertex.isNotOnBranch()
            ? this.vertices[i].getPoint()
            : this.vertices[i].getNextPoint();
        branch.addLine(
          lastPoint,
          curPoint,
          vertex.getIsCommitted(),
          lastPoint.x < curPoint.x,
          edgeKeys
        );
        this.vertices[i].registerUnavailablePoint(curPoint.x, parentVertex, branch);
        lastPoint = curPoint;

        if (parentVertex === this.vertices[i]) {
          vertex.registerParentProcessed();
          let parentVertexOnBranch = !parentVertex.isNotOnBranch();
          parentVertex.addToBranch(branch, curPoint.x);
          vertex = parentVertex;
          parentVertex = vertex.getNextParent();
          edgeKeys = this.getEdgeKeysToParent(vertex, parentVertex);
          if (parentVertex === null || parentVertexOnBranch) break;
        }
      }
      // Process remaining nullVertex parents only when the loop reached the end.
      // An early break means an off-screen parent edge is still pending for the
      // remaining children of the current vertex and must not be marked processed.
      // A parent listed before its child (id below the vertex) is equally
      // unreachable by walking down, so it is consumed here as well.
      if (i === this.vertices.length) {
        while (vertex.getNextParent() !== null) {
          const nextParentId = vertex.getNextParent()!.getId();
          if (nextParentId === NULL_VERTEX_ID || nextParentId < vertex.getId()) {
            vertex.registerParentProcessed();
          } else {
            break;
          }
        }
      }
      this.branches.push(branch);
      this.availableColours[branch.getColour()] = i;
    }
  }

  private findStart() {
    for (let i = 0; i < this.vertices.length; i++) {
      if (this.vertices[i].getNextParent() !== null || this.vertices[i].isNotOnBranch()) return i;
    }
    return -1;
  }

  private getAvailableColour(startAt: number) {
    for (let i = 0; i < this.availableColours.length; i++) {
      if (startAt > this.availableColours[i]) {
        return i;
      }
    }
    this.availableColours.push(0);
    return this.availableColours.length - 1;
  }
}
