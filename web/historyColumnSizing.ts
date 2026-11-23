import type { GitCommitNode, WorktreeCollection } from "../src/types";
import { getBranchLabels } from "./branchLabels";
import { getCommitDate } from "./dates";
import { getWebviewLocale } from "./i18n";
import { abbrevCommit } from "./utils";

export interface RefBadgeCounts {
  maximum: number;
  atHead: number;
}

/** Intrinsic widths of the loaded history, independent of which rows are mounted. */
export class HistoryColumnSizing {
  private context: CanvasRenderingContext2D | null = null;
  private styleKey = "";
  private count = 0;
  private first?: GitCommitNode;
  private last?: GitCommitNode;
  private head: string | null = null;
  private widths = [0, 0, 0];
  private counts: RefBadgeCounts = { maximum: 0, atHead: 0 };

  public apply(
    table: HTMLTableElement,
    commits: readonly GitCommitNode[],
    head: string | null,
    worktrees: WorktreeCollection,
    avatars: boolean,
    autoLayout: boolean
  ): RefBadgeCounts | null {
    const cell = table.querySelector<HTMLTableCellElement>("tr[data-id] td");
    if (cell === null) return null;
    const style = getComputedStyle(cell);
    const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const key = `${font}/${getWebviewLocale()}/${viewState.dateFormat}/${autoLayout}`;
    if (
      this.styleKey !== key ||
      this.first !== commits[0] ||
      this.count > commits.length ||
      this.last !== commits[this.count - 1] ||
      this.head !== head
    ) {
      this.count = 0;
      this.widths = [0, 0, 0];
      this.counts = { maximum: 0, atHead: 0 };
      this.styleKey = key;
      this.first = commits[0];
      this.head = head;
    }
    if (this.count < commits.length) {
      if (autoLayout && typeof CanvasRenderingContext2D !== "undefined") {
        this.context ??= document.createElement("canvas").getContext("2d");
      }
      const detached = new Map<string, number>();
      for (const entry of worktrees.detached) {
        if (!entry.isMain) detached.set(entry.head, (detached.get(entry.head) ?? 0) + 1);
      }
      for (let index = this.count; index < commits.length; index++) {
        const commit = commits[index];
        if (autoLayout && this.context !== null) {
          this.context.font = commit.stash === null ? font : `italic ${font}`;
          const values = [
            getCommitDate(commit.date).value,
            commit.author,
            abbrevCommit(commit.hash)
          ];
          for (let col = 0; col < values.length; col++) {
            this.widths[col] = Math.max(
              this.widths[col],
              this.context.measureText(values[col]).width
            );
          }
        }
        let badges = (detached.get(commit.hash) ?? 0) + (commit.stash === null ? 0 : 1);
        if (commit.refs.length) {
          const refs = getBranchLabels(commit.refs);
          badges += refs.heads.length + refs.remotes.length + refs.tags.length;
        }
        this.counts.maximum = Math.max(this.counts.maximum, badges);
        if (commit.hash === head) this.counts.atHead = badges;
      }
      this.count = commits.length;
      this.last = commits[this.count - 1];
    }
    if (autoLayout && this.context !== null) {
      const row = table.insertRow();
      row.setAttribute("aria-hidden", "true");
      row.className = "historyColumnSizing";
      row.insertCell();
      row.insertCell();
      for (const [index, width] of this.widths.entries()) {
        const probe = document.createElement("div");
        probe.style.width = `${width}px`;
        if (avatars && index === 1) probe.className = "historyAuthorWithAvatar";
        row.insertCell().appendChild(probe);
      }
    }
    return this.counts;
  }
}
