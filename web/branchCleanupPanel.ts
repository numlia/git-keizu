import * as GG from "../src/types";
import { getCommitDate } from "./dates";
import { Dropdown } from "./dropdown";
import { t } from "./i18n";
import {
  beginFocusUpdate,
  finishFocusUpdate,
  type FocusKey,
  type FocusUpdate,
  markFocusTarget
} from "./keyboardNavigation";
import { sendMessage } from "./utils";

/* === Constants === */

const PANEL_ELEMENT_ID = "branchCleanupPanel";
const COMPARISON_DROPDOWN_ID = "branchCleanupComparisonSelect";
const CLASS_DROPDOWN = "dropdown";
const CLASS_HEADER = "branchCleanupHeader";
const CLASS_TITLE = "branchCleanupTitle";
const CLASS_COMPARISON = "branchCleanupComparison";
const CLASS_MESSAGE = "branchCleanupMessage";
const CLASS_ACTION_CELL = "branchCleanupActionCell";
const CLASS_ACTION_BTN = "roundedBtn branchCleanupActionBtn";
const CLASS_DELETE_BTN = "roundedBtn branchCleanupActionBtn branchCleanupDeleteBtn";
const ACTION_BUTTON_SELECTOR = "button.branchCleanupActionBtn";
const ATTR_ARIA_LABEL = "aria-label";
/** Dictionary key that joins an action label and the branch name into one accessible name. */
const ACTION_FOR_KEY = "a11y.actionFor";
const ACTION_SHOW: CleanupAction = "show";
const ACTION_DELETE: CleanupAction = "delete";
const FIRST_REQUEST_ID = 1;
const COMPARISON_AUTO_VALUE = "";

const ANCESTRY_VALUES: ReadonlySet<string> = new Set([
  "ancestor",
  "notAncestor",
  "unknown",
  "notSelected"
]);
const TREE_DIFFERENCE_VALUES: ReadonlySet<string> = new Set([
  "same",
  "different",
  "unknown",
  "notSelected"
]);

/* === Types === */

export interface BranchCleanupPanelActions {
  showBranch(branchName: string): void;
  showDeleteDialog(repo: string, branchName: string, remotes: string[]): void;
}

type PanelView =
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "loaded"; compareBranch: string | null; rows: readonly GG.BranchCleanupRow[] };

type CleanupAction = Extract<FocusKey, { kind: "cleanup" }>["action"];

/* === Panel === */

export class BranchCleanupPanel {
  private readonly actions: BranchCleanupPanelActions;
  private readonly panelElem: HTMLElement;
  private readonly headerElem: HTMLElement;
  private readonly comparisonDropdownElem: HTMLDivElement;
  private readonly comparisonDropdown: Dropdown;
  private open: boolean = false;
  private repo: string | null = null;
  private selectedComparison: string | null = null;
  private latestRequestId: number | null = null;
  private requestInFlight: boolean = false;
  private nextRequestId: number = FIRST_REQUEST_ID;
  private view: PanelView = { kind: "loading" };
  private branchNames: readonly string[] = [];
  private parkedUpdate: FocusUpdate | null = null;

  constructor(actions: BranchCleanupPanelActions) {
    this.actions = actions;
    this.panelElem = document.getElementById(PANEL_ELEMENT_ID)!;
    this.comparisonDropdownElem = document.createElement("div");
    this.comparisonDropdownElem.id = COMPARISON_DROPDOWN_ID;
    this.comparisonDropdownElem.className = CLASS_DROPDOWN;
    this.headerElem = this.buildHeader();
    // Dropdown resolves its element via document.getElementById, so the header must be
    // connected while the component is constructed; render() attaches it again on open.
    this.panelElem.appendChild(this.headerElem);
    this.comparisonDropdown = new Dropdown(
      COMPARISON_DROPDOWN_ID,
      false,
      t("toolbar.branches"),
      (value: string) => {
        this.selectedComparison = value === COMPARISON_AUTO_VALUE ? null : value;
        this.requestLoad(this.view.kind === "loaded");
      }
    );
    this.panelElem.removeChild(this.headerElem);
  }

  public isOpen(): boolean {
    return this.open;
  }

  public toggle(repo: string): void {
    if (this.open) {
      this.close();
    } else {
      this.open = true;
      this.setRepository(repo);
      this.panelElem.removeAttribute("hidden");
      this.requestLoad();
    }
  }

  public refresh(repo: string): void {
    if (!this.open) return;
    const preserveLoadedView = repo === this.repo && this.view.kind === "loaded";
    this.setRepository(repo);
    this.requestLoad(preserveLoadedView);
  }

  public selectRepository(repo: string): void {
    if (repo === this.repo) return;
    this.setRepository(repo);
    if (this.open) {
      this.view = { kind: "loading" };
      this.render();
    }
  }

  public handleResponse(response: GG.ResponseLoadBranchCleanup): void {
    const value: unknown = response;
    if (!this.open || this.latestRequestId === null || this.repo === null) return;
    if (typeof value !== "object" || value === null) return;
    const record = value as Record<string, unknown>;
    if (record.requestId !== this.latestRequestId || record.repo !== this.repo) return;
    this.requestInFlight = false;

    const result = validateResult(record.result);
    if (result === null || result.kind === "error") {
      this.view = { kind: "failed" };
    } else {
      this.view = { kind: "loaded", compareBranch: result.compareBranch, rows: result.rows };
      this.branchNames = result.rows.map((row) => row.branchName);
    }
    this.render();
  }

  /* === State transitions === */

  private close(): void {
    this.open = false;
    this.latestRequestId = null;
    this.requestInFlight = false;
    this.view = { kind: "loading" };
    this.branchNames = [];
    this.parkedUpdate = null;
    this.comparisonDropdown.close();
    this.panelElem.setAttribute("hidden", "");
    clearChildren(this.panelElem);
  }

  private setRepository(repo: string): void {
    if (repo === this.repo) return;
    this.repo = repo;
    this.selectedComparison = null;
    this.branchNames = [];
  }

  private requestLoad(preserveLoadedView: boolean = false): void {
    if (this.repo === null) return;
    if (
      !Number.isSafeInteger(this.nextRequestId) ||
      this.nextRequestId >= Number.MAX_SAFE_INTEGER
    ) {
      this.requestInFlight = false;
      this.view = { kind: "failed" };
      this.render();
      return;
    }
    const requestId = this.nextRequestId;
    this.nextRequestId = requestId + 1;
    this.latestRequestId = requestId;
    this.requestInFlight = true;
    if (!preserveLoadedView) {
      this.view = { kind: "loading" };
    }
    this.render();
    sendMessage({
      command: "loadBranchCleanup",
      repo: this.repo,
      requestId: requestId,
      compareBranch: this.selectedComparison
    });
  }

  /* === Rendering === */

  // The header (with the comparison dropdown) stays connected across renders, so a focused
  // dropdown option is never detached and its own re-render keeps the focus.
  private render(): void {
    const update = this.captureFocus();
    if (this.headerElem.parentNode !== this.panelElem) this.panelElem.prepend(this.headerElem);
    for (const child of Array.from(this.panelElem.children)) {
      if (child !== this.headerElem) child.remove();
    }
    this.syncComparisonOptions();
    const view = this.view;
    if (view.kind === "loading") {
      this.panelElem.appendChild(buildMessage(t("cleanup.loading")));
    } else if (view.kind === "failed") {
      this.panelElem.appendChild(buildMessage(t("cleanup.error")));
    } else if (view.rows.length === 0) {
      this.panelElem.appendChild(buildMessage(t("cleanup.empty")));
    } else if (this.repo !== null) {
      this.panelElem.appendChild(this.buildTable(this.repo, view.compareBranch, view.rows));
    }
    this.restoreFocus(update);
  }

  /* === Focus restoration === */

  // Focus inside the comparison dropdown is the Dropdown's own; the ticket parked by the
  // disabling render is reused there so the response can bring focus back to the same action.
  private captureFocus(): FocusUpdate | null {
    if (this.comparisonDropdownElem.contains(document.activeElement)) return this.parkedUpdate;
    return beginFocusUpdate(this.panelElem);
  }

  // Same enabled action → comparison trigger → toolbar cleanup button (the cleanup key's own
  // fallback). While a re-request disables the delete buttons the ticket is parked, so the
  // response render returns to that button unless the user moved meanwhile.
  private restoreFocus(update: FocusUpdate | null): void {
    this.parkedUpdate = null;
    if (update === null) return;
    if (this.hasEnabledAction(update.origin.keys)) {
      finishFocusUpdate(update);
      return;
    }
    const trigger: FocusKey = { kind: "control", id: COMPARISON_DROPDOWN_ID };
    const origin = { ...update.origin, keys: [trigger, ...update.origin.keys] };
    finishFocusUpdate({ ...update, origin });
    if (this.requestInFlight && update.origin.keys.some((key) => key.kind === "cleanup")) {
      this.parkedUpdate = update;
    }
  }

  private hasEnabledAction(keys: readonly FocusKey[]): boolean {
    const buttons = Array.from(
      this.panelElem.querySelectorAll<HTMLButtonElement>(ACTION_BUTTON_SELECTOR)
    );
    return keys.some(
      (key) =>
        key.kind === "cleanup" &&
        buttons.some(
          (button) =>
            !button.disabled &&
            button.dataset.branch === key.branch &&
            button.dataset.action === key.action
        )
    );
  }

  private buildHeader(): HTMLElement {
    const header = document.createElement("div");
    header.className = CLASS_HEADER;

    const title = document.createElement("span");
    title.className = CLASS_TITLE;
    title.textContent = t("cleanup.title");
    header.appendChild(title);

    const comparisonControl = document.createElement("span");
    comparisonControl.className = CLASS_COMPARISON;
    const comparisonText = document.createElement("span");
    comparisonText.textContent = t("cleanup.comparison");
    comparisonControl.appendChild(comparisonText);
    comparisonControl.appendChild(this.comparisonDropdownElem);
    header.appendChild(comparisonControl);

    return header;
  }

  private syncComparisonOptions(): void {
    const selectedComparison = this.selectedComparison;
    const isExplicitSelection =
      selectedComparison !== null && this.branchNames.indexOf(selectedComparison) > -1;
    const selected = isExplicitSelection ? selectedComparison : COMPARISON_AUTO_VALUE;
    const view = this.view;
    const autoName =
      !isExplicitSelection && view.kind === "loaded"
        ? t("cleanup.comparison.autoResolved", view.compareBranch ?? t("cleanup.state.notSelected"))
        : t("cleanup.comparison.auto");
    const options = [
      { name: autoName, value: COMPARISON_AUTO_VALUE },
      ...this.branchNames.map((name) => ({ name: name, value: name }))
    ];
    this.comparisonDropdown.setOptions(options, selected);
  }

  private buildTable(
    repo: string,
    compareBranch: string | null,
    rows: readonly GG.BranchCleanupRow[]
  ): HTMLTableElement {
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const columnKeys = [
      "cleanup.column.branch",
      "cleanup.column.lastCommit",
      "cleanup.column.ancestry",
      "cleanup.column.aheadBehind",
      "cleanup.column.tree",
      "cleanup.column.upstream",
      "cleanup.column.worktree"
    ];
    for (const key of columnKeys) {
      const th = document.createElement("th");
      th.textContent = t(key);
      headRow.appendChild(th);
    }
    const actionTh = document.createElement("th");
    actionTh.className = CLASS_ACTION_CELL;
    actionTh.textContent = t("cleanup.column.actions");
    headRow.appendChild(actionTh);
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const row of rows) {
      tbody.appendChild(this.buildRow(repo, compareBranch, row));
    }
    table.appendChild(tbody);
    return table;
  }

  private buildRow(
    repo: string,
    compareBranch: string | null,
    row: GG.BranchCleanupRow
  ): HTMLTableRowElement {
    const tr = document.createElement("tr");
    appendCell(tr, row.branchName);

    const dateCell = document.createElement("td");
    if (row.lastCommit.kind === "known") {
      const date = getCommitDate(row.lastCommit.unixSeconds);
      dateCell.textContent = date.value;
      dateCell.title = date.title;
    } else {
      dateCell.textContent = t("cleanup.state.unknown");
    }
    tr.appendChild(dateCell);

    appendCell(tr, ancestryText(row.ancestry));
    appendCell(tr, aheadBehindText(row.aheadBehind));
    appendCell(tr, treeDifferenceText(row.treeDifference));
    appendCell(tr, upstreamText(row.upstream));
    appendCell(tr, worktreeText(row.worktree));

    const actionCell = document.createElement("td");
    actionCell.className = CLASS_ACTION_CELL;
    actionCell.appendChild(this.buildShowButton(repo, row.branchName));
    if (row.remotes !== null && isDeleteEligible(row, compareBranch)) {
      actionCell.appendChild(this.buildDeleteButton(repo, row.branchName, row.remotes));
    }
    tr.appendChild(actionCell);
    return tr;
  }

  private buildShowButton(repo: string, branchName: string): HTMLButtonElement {
    const btn = buildActionButton(repo, branchName, ACTION_SHOW, CLASS_ACTION_BTN);
    btn.addEventListener("click", () => this.actions.showBranch(branchName));
    return btn;
  }

  private buildDeleteButton(
    repo: string,
    branchName: string,
    remotes: string[]
  ): HTMLButtonElement {
    const btn = buildActionButton(repo, branchName, ACTION_DELETE, CLASS_DELETE_BTN);
    if (this.requestInFlight) {
      // While a re-request is in flight the shown rows are stale: keep the button visible in
      // its box so the row height never jumps, but disable it and attach no click listener
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => this.actions.showDeleteDialog(repo, branchName, remotes));
    }
    return btn;
  }
}

/* === Delete eligibility === */

function isDeleteEligible(row: GG.BranchCleanupRow, compareBranch: string | null): boolean {
  return (
    compareBranch !== null &&
    row.isCurrent === false &&
    row.branchName !== compareBranch &&
    row.worktree.kind === "unused" &&
    (row.ancestry === "ancestor" || row.ancestry === "notAncestor") &&
    row.aheadBehind.kind === "known" &&
    (row.treeDifference === "same" || row.treeDifference === "different") &&
    row.upstream.kind !== "unknown" &&
    row.lastCommit.kind === "known" &&
    row.remotes !== null
  );
}

/* === Cell text per union variant === */

function ancestryText(value: GG.BranchCleanupAncestry): string {
  switch (value) {
    case "ancestor":
      return t("cleanup.ancestry.ancestor");
    case "notAncestor":
      return t("cleanup.ancestry.notAncestor");
    case "unknown":
      return t("cleanup.state.unknown");
    case "notSelected":
      return t("cleanup.state.notSelected");
  }
}

function aheadBehindText(value: GG.BranchCleanupAheadBehind): string {
  switch (value.kind) {
    case "known":
      return t("cleanup.aheadBehind.known", value.ahead, value.behind);
    case "unknown":
      return t("cleanup.state.unknown");
    case "notSelected":
      return t("cleanup.state.notSelected");
  }
}

function treeDifferenceText(value: GG.BranchCleanupTreeDifference): string {
  switch (value) {
    case "same":
      return t("cleanup.tree.same");
    case "different":
      return t("cleanup.tree.different");
    case "unknown":
      return t("cleanup.state.unknown");
    case "notSelected":
      return t("cleanup.state.notSelected");
  }
}

function upstreamText(value: GG.BranchCleanupUpstream): string {
  switch (value.kind) {
    case "unset":
      return t("cleanup.upstream.unset");
    case "present":
      return value.name;
    case "gone":
      return t("cleanup.upstream.gone", value.name);
    case "unknown":
      return t("cleanup.state.unknown");
  }
}

function worktreeText(value: GG.BranchCleanupWorktree): string {
  switch (value.kind) {
    case "unused":
      return t("cleanup.worktree.unused");
    case "used":
      return t("cleanup.worktree.used", value.path);
    case "unknown":
      return t("cleanup.state.unknown");
  }
}

/* === DOM helpers === */

function clearChildren(elem: HTMLElement): void {
  while (elem.firstChild !== null) {
    elem.removeChild(elem.firstChild);
  }
}

function appendCell(tr: HTMLTableRowElement, text: string): void {
  const td = document.createElement("td");
  td.textContent = text;
  tr.appendChild(td);
}

function buildMessage(text: string): HTMLElement {
  const message = document.createElement("div");
  message.className = CLASS_MESSAGE;
  message.textContent = text;
  return message;
}

function buildActionButton(
  repo: string,
  branchName: string,
  action: CleanupAction,
  className: string
): HTMLButtonElement {
  const label = action === ACTION_SHOW ? t("cleanup.action.show") : t("cleanup.action.delete");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className;
  btn.textContent = label;
  btn.setAttribute(ATTR_ARIA_LABEL, t(ACTION_FOR_KEY, label, branchName));
  btn.dataset.branch = branchName;
  btn.dataset.action = action;
  markFocusTarget(btn, { kind: "cleanup", repo, branch: branchName, action });
  return btn;
}

/* === Runtime validation === */

function validateResult(value: unknown): GG.BranchCleanupResult | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.kind === "error") {
    return typeof record.status === "string" ? { kind: "error", status: record.status } : null;
  }
  if (record.kind !== "ok") return null;
  const compareBranch = record.compareBranch;
  if (compareBranch !== null && typeof compareBranch !== "string") return null;
  if (!Array.isArray(record.rows)) return null;
  const rows: GG.BranchCleanupRow[] = [];
  for (const rowValue of record.rows) {
    const row = validateRow(rowValue);
    if (row === null) return null;
    rows.push(row);
  }
  return { kind: "ok", compareBranch: compareBranch, rows: rows };
}

function validateRow(value: unknown): GG.BranchCleanupRow | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const branchName = record.branchName;
  if (typeof branchName !== "string" || branchName.length === 0) return null;
  const isCurrent = record.isCurrent;
  if (typeof isCurrent !== "boolean" && isCurrent !== null) return null;
  const ancestry = record.ancestry;
  if (typeof ancestry !== "string" || !ANCESTRY_VALUES.has(ancestry)) return null;
  const treeDifference = record.treeDifference;
  if (typeof treeDifference !== "string" || !TREE_DIFFERENCE_VALUES.has(treeDifference)) {
    return null;
  }
  const aheadBehind = validateAheadBehind(record.aheadBehind);
  if (aheadBehind === null) return null;
  const upstream = validateUpstream(record.upstream);
  if (upstream === null) return null;
  const worktree = validateWorktree(record.worktree);
  if (worktree === null) return null;
  const lastCommit = validateLastCommit(record.lastCommit);
  if (lastCommit === null) return null;
  const remotesValue = record.remotes;
  let remotes: string[] | null;
  if (remotesValue === null) {
    remotes = null;
  } else if (Array.isArray(remotesValue) && remotesValue.every(isString)) {
    remotes = [...remotesValue];
  } else {
    return null;
  }
  return {
    branchName: branchName,
    isCurrent: isCurrent,
    ancestry: ancestry as GG.BranchCleanupAncestry,
    aheadBehind: aheadBehind,
    treeDifference: treeDifference as GG.BranchCleanupTreeDifference,
    upstream: upstream,
    worktree: worktree,
    lastCommit: lastCommit,
    remotes: remotes
  };
}

function validateAheadBehind(value: unknown): GG.BranchCleanupAheadBehind | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.kind === "unknown") return { kind: "unknown" };
  if (record.kind === "notSelected") return { kind: "notSelected" };
  if (
    record.kind === "known" &&
    isNonNegativeSafeInteger(record.ahead) &&
    isNonNegativeSafeInteger(record.behind)
  ) {
    return { kind: "known", ahead: record.ahead, behind: record.behind };
  }
  return null;
}

function validateUpstream(value: unknown): GG.BranchCleanupUpstream | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.kind === "unset") return { kind: "unset" };
  if (record.kind === "unknown") return { kind: "unknown" };
  if ((record.kind === "present" || record.kind === "gone") && typeof record.name === "string") {
    return { kind: record.kind, name: record.name };
  }
  return null;
}

function validateWorktree(value: unknown): GG.BranchCleanupWorktree | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.kind === "unused") return { kind: "unused" };
  if (record.kind === "unknown") return { kind: "unknown" };
  if (
    record.kind === "used" &&
    typeof record.path === "string" &&
    typeof record.isMain === "boolean"
  ) {
    return { kind: "used", path: record.path, isMain: record.isMain };
  }
  return null;
}

function validateLastCommit(value: unknown): GG.BranchCleanupLastCommit | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.kind === "unknown") return { kind: "unknown" };
  if (
    record.kind === "known" &&
    typeof record.unixSeconds === "number" &&
    Number.isSafeInteger(record.unixSeconds)
  ) {
    return { kind: "known", unixSeconds: record.unixSeconds };
  }
  return null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
