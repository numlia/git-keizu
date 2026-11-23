import type { Vertex } from "./graph";

// Leave one ordinary tail available for placement and one more for incoming pages.
export const CHECKPOINT_TAIL_ROWS = 4096;
export const MAX_CHECKPOINT_TAIL_ROWS = 8192;

class BranchPrefix {
  private readonly lines: Line[] = [];
  private readonly countBefore = new Map<number, number>();
  private readonly restoredIndices = new Map<number, number>();
  private copied = 0;

  constructor(private readonly branchLines: Line[]) {}

  public markCrossing() {
    const index = this.branchLines.length;
    this.countBefore.set(index, 0);
    return index;
  }

  // A merge can add lines to an earlier branch out of row order. Save the prefix
  // fragments between crossings in insertion order for drawing and highlighting.
  public seal(first: number) {
    for (const [index, line] of this.branchLines.entries()) {
      if (this.countBefore.has(index)) this.countBefore.set(index, this.lines.length);
      if (line.p2.y < first) this.lines.push(line);
    }
  }

  public rewind() {
    this.branchLines.length = 0;
    this.restoredIndices.clear();
    this.copied = 0;
  }

  public restoreCrossing(originalIndex: number) {
    const count = this.countBefore.get(originalIndex);
    if (count === undefined) return false;
    this.restoreLines(count);
    this.restoredIndices.set(originalIndex, this.branchLines.length);
    return true;
  }

  public restoredIndex(originalIndex: number) {
    return this.restoredIndices.get(originalIndex);
  }

  public restoreLines(end = this.lines.length) {
    while (this.copied < end) this.branchLines.push(this.lines[this.copied++]);
  }
}

/** The state needed to replay paths that started before the first mutable row. */
export class GraphLayoutCheckpoint {
  public recording = true;
  public branchCount = 0;
  public colours: number[] = [];
  public width = 0;
  public readonly missing = new Map<string, Array<{ child: Vertex; slot: number }>>();
  private readonly prefixes = new Map<Line[], BranchPrefix>();
  private readonly steps: Array<() => boolean> = [];

  constructor(public readonly first: number) {}

  public recordPath(lines: Line[], resume: () => void) {
    let prefix = this.prefixes.get(lines);
    if (prefix === undefined) {
      prefix = new BranchPrefix(lines);
      this.prefixes.set(lines, prefix);
    }
    const saved = prefix;
    const index = saved.markCrossing();
    this.steps.push(() => {
      if (!saved.restoreCrossing(index)) return false;
      resume();
      return true;
    });
  }

  public recordSharedPath(lines: Line[], index: number, resume: (lineIndex: number) => boolean) {
    this.steps.push(() => {
      const restored = this.prefixes.get(lines)?.restoredIndex(index);
      return restored !== undefined && resume(restored);
    });
  }

  public recordMergeLane(parent: Vertex) {
    const expected = parent.getBranch();
    this.steps.push(() => parent.getBranch() === expected);
  }

  public seal(branchCount: number, colours: number[], width: number) {
    this.branchCount = branchCount;
    this.colours = colours.slice();
    this.width = width;
    for (const prefix of this.prefixes.values()) prefix.seal(this.first);
    this.recording = false;
  }

  public replay() {
    for (const prefix of this.prefixes.values()) prefix.rewind();
    for (const step of this.steps) {
      if (!step()) return false;
    }
    for (const prefix of this.prefixes.values()) prefix.restoreLines();
    return true;
  }
}
