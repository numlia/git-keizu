// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../web/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../web/utils")>()),
  sendMessage: vi.fn()
}));

vi.mock("../../web/dates", () => ({
  getCommitDate: vi.fn(() => ({ title: "date-title", value: "date-value" }))
}));

import type * as GG from "../../src/types";
import { BranchCleanupPanel } from "../../web/branchCleanupPanel";
import { getCommitDate } from "../../web/dates";
import { sendMessage } from "../../web/utils";

const REPO = "/repo";
const OTHER_REPO = "/other";
const COMPARE_BRANCH = "main";

interface MockActions {
  showBranch: ReturnType<typeof vi.fn>;
  showDeleteDialog: ReturnType<typeof vi.fn>;
}

let actions: MockActions;
let panel: BranchCleanupPanel;

function makeRow(overrides: Partial<GG.BranchCleanupRow> = {}): GG.BranchCleanupRow {
  return {
    branchName: "feature/x",
    isCurrent: false,
    ancestry: "ancestor",
    aheadBehind: { kind: "known", ahead: 1, behind: 2 },
    treeDifference: "same",
    upstream: { kind: "present", name: "origin/feature/x" },
    worktree: { kind: "unused" },
    lastCommit: { kind: "known", unixSeconds: 1724500000 },
    remotes: ["origin"],
    ...overrides
  };
}

function okResponse(
  requestId: number,
  rows: GG.BranchCleanupRow[],
  compareBranch: string | null = COMPARE_BRANCH,
  repo: string = REPO
): GG.ResponseLoadBranchCleanup {
  return {
    command: "loadBranchCleanup",
    repo,
    requestId,
    result: { kind: "ok", compareBranch, rows }
  };
}

function panelElem(): HTMLElement {
  return document.getElementById("branchCleanupPanel")!;
}

function sentRequests(): GG.RequestLoadBranchCleanup[] {
  return vi.mocked(sendMessage).mock.calls.map((call) => call[0] as GG.RequestLoadBranchCleanup);
}

function messageText(): string | null {
  const message = panelElem().querySelector(".branchCleanupMessage");
  return message === null ? null : message.textContent;
}

function bodyRows(): HTMLTableRowElement[] {
  return [...panelElem().querySelectorAll<HTMLTableRowElement>("tbody tr")];
}

function deleteButtons(scope: ParentNode = panelElem()): HTMLElement[] {
  return [...scope.querySelectorAll<HTMLElement>(".branchCleanupDeleteBtn")];
}

function showButtons(scope: ParentNode = panelElem()): HTMLElement[] {
  return [
    ...scope.querySelectorAll<HTMLElement>(".branchCleanupActionBtn:not(.branchCleanupDeleteBtn)")
  ];
}

function selectComparison(branchName: string): void {
  const dropdown = panelElem().querySelector<HTMLElement>("#branchCleanupComparisonSelect")!;
  dropdown.querySelector<HTMLElement>(".dropdownCurrentValue")!.click();
  const options = [...dropdown.querySelectorAll<HTMLElement>(".dropdownOption")];
  options.find((option) => option.textContent === branchName)!.click();
}

function comparisonCurrentText(): string | null {
  const dropdown = panelElem().querySelector<HTMLElement>("#branchCleanupComparisonSelect")!;
  return dropdown.querySelector<HTMLElement>(".dropdownCurrentValue")!.textContent;
}

function autoOptionText(): string | null {
  const dropdown = panelElem().querySelector<HTMLElement>("#branchCleanupComparisonSelect")!;
  return dropdown.querySelector<HTMLElement>(".dropdownOption")!.textContent;
}

beforeEach(() => {
  document.body.innerHTML = '<div id="branchCleanupPanel" hidden></div>';
  vi.clearAllMocks();
  actions = { showBranch: vi.fn(), showDeleteDialog: vi.fn() };
  panel = new BranchCleanupPanel(actions);
});

// S6: 開閉と request lifecycle（比較先変更時の loaded view 保持を含む）
// @see docs/testing/perspectives/web/branchCleanupPanel-test.md
describe("BranchCleanupPanel lifecycle", () => {
  it("opens with a loading view and the first request id 1 (TC-044)", () => {
    // Case: TC-044
    // Given: a closed panel
    // When: it is toggled open
    panel.toggle(REPO);

    // Then: the panel opens, shows the loading text, and sends exactly one request with id 1
    expect(panel.isOpen()).toBe(true);
    expect(panelElem().hasAttribute("hidden")).toBe(false);
    expect(messageText()).toBe("Loading ...");
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendMessage).mock.calls[0][0]).toEqual({
      command: "loadBranchCleanup",
      repo: REPO,
      requestId: 1,
      compareBranch: null
    });
  });

  it("increments the request id monotonically without reuse (TC-045)", () => {
    // Case: TC-045
    // Given: an open panel
    panel.toggle(REPO);

    // When: it is refreshed twice
    panel.refresh(REPO);
    panel.refresh(REPO);

    // Then: the three requests carry the ids 1, 2, 3
    expect(sentRequests().map((request) => request.requestId)).toEqual([1, 2, 3]);
  });

  it("removes the row actions and invalidates the request on close (TC-046)", () => {
    // Case: TC-046
    // Given: an open panel with a rendered eligible row
    panel.toggle(REPO);
    panel.handleResponse(okResponse(1, [makeRow()]));
    expect(deleteButtons().length).toBeGreaterThan(0);

    // When: the panel is toggled closed
    panel.toggle(REPO);

    // Then: it is closed, hidden, and every row action button is removed from the DOM
    expect(panel.isOpen()).toBe(false);
    expect(panelElem().hasAttribute("hidden")).toBe(true);
    expect(panelElem().childElementCount).toBe(0);
    expect(deleteButtons()).toHaveLength(0);
    expect(showButtons()).toHaveLength(0);
  });

  it("re-requests with a fresh id while open (TC-047)", () => {
    // Case: TC-047
    // Given: an open panel showing a loaded row with a delete action
    panel.toggle(REPO);
    panel.handleResponse(okResponse(1, [makeRow()]));
    expect(deleteButtons()).toHaveLength(1);
    vi.mocked(sendMessage).mockClear();

    // When: it is refreshed
    panel.refresh(REPO);

    // Then: exactly one new request with the next id is sent
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sentRequests()[0].requestId).toBe(2);

    // Then: the loaded table stays rendered without a loading swap; the delete button stays
    // visible in its box but disabled and non-clickable (no height jump, no stale delete)
    // and the fresh response re-enables it
    expect(messageText()).toBeNull();
    expect(bodyRows()).toHaveLength(1);
    const inFlightDeletes = deleteButtons();
    expect(inFlightDeletes).toHaveLength(1);
    expect(inFlightDeletes[0].classList.contains("disabled")).toBe(true);
    inFlightDeletes[0].click();
    expect(actions.showDeleteDialog).not.toHaveBeenCalled();
    expect(showButtons()).toHaveLength(1);
    panel.handleResponse(okResponse(2, [makeRow()]));
    const restoredDeletes = deleteButtons();
    expect(restoredDeletes).toHaveLength(1);
    expect(restoredDeletes[0].classList.contains("disabled")).toBe(false);
  });

  it("sends nothing on a refresh while closed (TC-048)", () => {
    // Case: TC-048
    // Given: a closed panel
    // When: it is refreshed
    panel.refresh(REPO);

    // Then: no message is sent
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("drops the comparison selection on a repository switch (TC-049)", () => {
    // Case: TC-049
    // Given: an open panel with the comparison develop selected
    panel.toggle(REPO);
    panel.handleResponse(
      okResponse(1, [makeRow({ branchName: "develop" }), makeRow({ branchName: "main" })])
    );
    selectComparison("develop");
    expect(sentRequests()[1].compareBranch).toBe("develop");

    // When: the repository is switched and the panel is refreshed
    panel.selectRepository(OTHER_REPO);
    panel.refresh(OTHER_REPO);

    // Then: the next request targets the new repository with the selection reset to null
    const lastRequest = sentRequests()[sentRequests().length - 1];
    expect(lastRequest.repo).toBe(OTHER_REPO);
    expect(lastRequest.compareBranch).toBeNull();
  });

  it("keeps the comparison selection across a same-repository refresh (TC-050)", () => {
    // Case: TC-050
    // Given: an open panel with the comparison develop selected
    panel.toggle(REPO);
    panel.handleResponse(
      okResponse(1, [makeRow({ branchName: "develop" }), makeRow({ branchName: "main" })])
    );
    selectComparison("develop");

    // When: the same repository is refreshed
    panel.refresh(REPO);

    // Then: the re-request still carries develop
    const lastRequest = sentRequests()[sentRequests().length - 1];
    expect(lastRequest.compareBranch).toBe("develop");
  });

  it("stops requesting and shows the failure view when request ids are exhausted (TC-051)", () => {
    // Case: TC-051
    // Given: an open panel whose next request id reached the positive safe integer limit
    panel.toggle(REPO);
    vi.mocked(sendMessage).mockClear();
    (panel as unknown as { nextRequestId: number }).nextRequestId = Number.MAX_SAFE_INTEGER;

    // When: it is refreshed
    panel.refresh(REPO);

    // Then: no request is sent (no wrap-around) and the failure text is rendered
    expect(sendMessage).not.toHaveBeenCalled();
    expect(messageText()).toBe("Unable to load branch information");
  });

  it("keeps the loaded table visible while a comparison change is in flight (TC-052)", () => {
    // Case: TC-052
    // Given: an open panel listing feature/x with a delete action
    panel.toggle(REPO);
    panel.handleResponse(
      okResponse(1, [makeRow({ branchName: "feature/x" }), makeRow({ branchName: "main" })])
    );
    vi.mocked(sendMessage).mockClear();

    // When: the comparison is changed to feature/x
    selectComparison("feature/x");

    // Then: the old rows stay rendered without a loading swap and one request carries the
    // new comparison; the delete button stays visible but disabled and non-clickable
    expect(messageText()).toBeNull();
    expect(bodyRows()).toHaveLength(2);
    const inFlightDeletes = deleteButtons();
    expect(inFlightDeletes).toHaveLength(1);
    expect(inFlightDeletes[0].classList.contains("disabled")).toBe(true);
    inFlightDeletes[0].click();
    expect(actions.showDeleteDialog).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sentRequests()[0]).toEqual({
      command: "loadBranchCleanup",
      repo: REPO,
      requestId: 2,
      compareBranch: "feature/x"
    });

    // Then: the fresh response re-renders the table and re-enables the delete action
    panel.handleResponse(
      okResponse(
        2,
        [makeRow({ branchName: "feature/x" }), makeRow({ branchName: "main" })],
        "feature/x"
      )
    );
    const restoredDeletes = deleteButtons();
    expect(restoredDeletes).toHaveLength(1);
    expect(restoredDeletes[0].classList.contains("disabled")).toBe(false);
  });

  it("renders loading for a comparison change without a loaded table (TC-053)", () => {
    // Case: TC-053
    // Given: an open panel showing the failure view after a failed refresh
    panel.toggle(REPO);
    panel.handleResponse(
      okResponse(1, [makeRow({ branchName: "feature/x" }), makeRow({ branchName: "main" })])
    );
    panel.refresh(REPO);
    panel.handleResponse({
      command: "loadBranchCleanup",
      repo: REPO,
      requestId: 2,
      result: { kind: "error", status: "fatal" }
    });
    expect(messageText()).toBe("Unable to load branch information");
    vi.mocked(sendMessage).mockClear();

    // When: the comparison is changed to feature/x
    selectComparison("feature/x");

    // Then: with no table to preserve, the loading view is rendered before the request
    expect(messageText()).toBe("Loading ...");
    expect(bodyRows()).toHaveLength(0);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sentRequests()[0]).toEqual({
      command: "loadBranchCleanup",
      repo: REPO,
      requestId: 3,
      compareBranch: "feature/x"
    });
  });
});

// S2: handleResponse() の runtime validation と応答鮮度
// @see docs/testing/perspectives/web/branchCleanupPanel-test.md
describe("BranchCleanupPanel.handleResponse validation and freshness", () => {
  it("renders the latest valid ok response (TC-010)", () => {
    // Case: TC-010
    // Given: an open panel awaiting request 1
    panel.toggle(REPO);

    // When: the matching ok response with two valid rows arrives
    panel.handleResponse(
      okResponse(1, [makeRow({ branchName: "alpha" }), makeRow({ branchName: "beta" })])
    );

    // Then: the loading text is gone and two rows are rendered
    expect(messageText()).toBeNull();
    expect(bodyRows()).toHaveLength(2);
  });

  it("renders only the newest request when responses arrive out of order (TC-011)", () => {
    // Case: TC-011
    // Given: request 1 followed by request 2
    panel.toggle(REPO);
    panel.refresh(REPO);

    // When: the response for request 2 arrives before the response for request 1
    panel.handleResponse(okResponse(2, [makeRow({ branchName: "b-branch" })]));
    panel.handleResponse(okResponse(1, [makeRow({ branchName: "a-branch" })]));

    // Then: the DOM keeps the request-2 content and never shows the stale request-1 rows
    const rows = bodyRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].cells[0].textContent).toBe("b-branch");
    expect(panelElem().textContent).not.toContain("a-branch");
  });

  it("ignores a response from another repository (TC-012)", () => {
    // Case: TC-012
    // Given: an open panel awaiting request 1 for /repo
    panel.toggle(REPO);

    // When: a response with the latest id but another repo arrives
    panel.handleResponse(okResponse(1, [makeRow()], COMPARE_BRANCH, OTHER_REPO));

    // Then: the DOM stays on the loading view without rows or a failure message
    expect(messageText()).toBe("Loading ...");
    expect(bodyRows()).toHaveLength(0);
  });

  it("ignores a response arriving after close (TC-013)", () => {
    // Case: TC-013
    // Given: a panel that sent request 1 and was then closed
    panel.toggle(REPO);
    panel.toggle(REPO);

    // When: the response for the closed request arrives
    panel.handleResponse(okResponse(1, [makeRow()]));

    // Then: nothing is rendered
    expect(panelElem().childElementCount).toBe(0);
    expect(bodyRows()).toHaveLength(0);
    expect(deleteButtons()).toHaveLength(0);
  });

  it("shows the failure view for a malformed row (TC-014)", () => {
    // Case: TC-014
    // Given: an open panel awaiting request 1
    panel.toggle(REPO);

    // When: the latest response carries a row with an out-of-union ancestry
    const malformed = okResponse(1, [makeRow({ ancestry: "safe" as GG.BranchCleanupAncestry })]);
    panel.handleResponse(malformed);

    // Then: no row or delete action is rendered and the failure text appears
    expect(bodyRows()).toHaveLength(0);
    expect(deleteButtons()).toHaveLength(0);
    expect(messageText()).toBe("Unable to load branch information");
  });

  it("shows the failure view for a whole-result error (TC-015)", () => {
    // Case: TC-015
    // Given: an open panel awaiting request 1
    panel.toggle(REPO);

    // When: the latest response carries the error union
    panel.handleResponse({
      command: "loadBranchCleanup",
      repo: REPO,
      requestId: 1,
      result: { kind: "error", status: "fatal" }
    });

    // Then: the failure text appears with zero rows
    expect(messageText()).toBe("Unable to load branch information");
    expect(bodyRows()).toHaveLength(0);
  });

  it("survives structurally invalid responses without throwing (TC-016)", () => {
    // Case: TC-016
    // Given: an open panel awaiting request 1
    panel.toggle(REPO);

    // When: rows is not an array and, after a refresh, a row is not an object
    const rowsNotArray = {
      command: "loadBranchCleanup",
      repo: REPO,
      requestId: 1,
      result: { kind: "ok", compareBranch: null, rows: "nope" }
    } as unknown as GG.ResponseLoadBranchCleanup;
    expect(() => panel.handleResponse(rowsNotArray)).not.toThrow();
    expect(messageText()).toBe("Unable to load branch information");
    panel.refresh(REPO);
    const rowNotObject = {
      command: "loadBranchCleanup",
      repo: REPO,
      requestId: 2,
      result: { kind: "ok", compareBranch: null, rows: [42] }
    } as unknown as GG.ResponseLoadBranchCleanup;
    expect(() => panel.handleResponse(rowNotObject)).not.toThrow();

    // Then: both responses degrade to the failure view with zero rows
    expect(messageText()).toBe("Unable to load branch information");
    expect(bodyRows()).toHaveLength(0);
  });

  it("never coerces a string requestId to the latest number (TC-017)", () => {
    // Case: TC-017
    // Given: an open panel whose latest request id is 2
    panel.toggle(REPO);
    panel.refresh(REPO);

    // When: a response with the string "2" arrives
    panel.handleResponse({
      command: "loadBranchCleanup",
      repo: REPO,
      requestId: "2",
      result: { kind: "ok", compareBranch: null, rows: [] }
    } as unknown as GG.ResponseLoadBranchCleanup);

    // Then: the response is ignored and the panel stays on the loading view
    expect(messageText()).toBe("Loading ...");
    expect(bodyRows()).toHaveLength(0);
  });
});

// S3: 行描画（union ごとの表示・textContent・日時）
// @see docs/testing/perspectives/web/branchCleanupPanel-test.md
describe("BranchCleanupPanel row rendering", () => {
  it("renders every known fact of a row (TC-018)", () => {
    // Case: TC-018
    // Given: a fully known row (used worktree, present upstream, known counts)
    panel.toggle(REPO);
    panel.handleResponse(
      okResponse(1, [
        makeRow({
          worktree: { kind: "used", path: "/wt/x", isMain: false }
        })
      ])
    );

    // Then: every cell carries the l10n text or value for its fact
    const cells = bodyRows()[0].cells;
    expect(cells[0].textContent).toBe("feature/x");
    expect(cells[1].textContent).toBe("date-value");
    expect(cells[2].textContent).toBe("Ancestor");
    expect(cells[3].textContent).toBe("1 ahead, 2 behind");
    expect(cells[4].textContent).toBe("Same");
    expect(cells[5].textContent).toBe("origin/feature/x");
    expect(cells[6].textContent).toBe("In use: /wt/x");
  });

  it("renders unknown and notSelected with different wording (TC-019)", () => {
    // Case: TC-019
    // Given: one row with unknown ancestry and one with notSelected ancestry
    panel.toggle(REPO);
    panel.handleResponse(
      okResponse(1, [
        makeRow({ branchName: "alpha", ancestry: "unknown" }),
        makeRow({ branchName: "beta", ancestry: "notSelected" })
      ])
    );

    // Then: the two ancestry cells differ and match their dedicated l10n texts
    const rows = bodyRows();
    expect(rows[0].cells[2].textContent).toBe("Unknown");
    expect(rows[1].cells[2].textContent).toBe("No comparison target");
    expect(rows[0].cells[2].textContent).not.toBe(rows[1].cells[2].textContent);
  });

  it("renders upstream unset and gone differently (TC-020)", () => {
    // Case: TC-020
    // Given: one row with an unset upstream and one whose upstream is gone
    panel.toggle(REPO);
    panel.handleResponse(
      okResponse(1, [
        makeRow({ branchName: "alpha", upstream: { kind: "unset" } }),
        makeRow({ branchName: "beta", upstream: { kind: "gone", name: "origin/x" } })
      ])
    );

    // Then: the cells differ and the gone cell carries the name
    const rows = bodyRows();
    expect(rows[0].cells[5].textContent).toBe("Not set");
    expect(rows[1].cells[5].textContent).toBe("origin/x (gone)");
    expect(rows[1].cells[5].textContent).toContain("origin/x");
    expect(rows[0].cells[5].textContent).not.toBe(rows[1].cells[5].textContent);
  });

  it("renders worktree unused and unknown differently (TC-021)", () => {
    // Case: TC-021
    // Given: one row with an unused worktree and one whose worktree is unknown
    panel.toggle(REPO);
    panel.handleResponse(
      okResponse(1, [
        makeRow({ branchName: "alpha", worktree: { kind: "unused" } }),
        makeRow({ branchName: "beta", worktree: { kind: "unknown" } })
      ])
    );

    // Then: the two worktree cells carry different wording
    const rows = bodyRows();
    expect(rows[0].cells[6].textContent).toBe("Not used");
    expect(rows[1].cells[6].textContent).toBe("Unknown");
    expect(rows[0].cells[6].textContent).not.toBe(rows[1].cells[6].textContent);
  });

  it("keeps an HTML-like branch name as a text node (TC-022)", () => {
    // Case: TC-022
    // Given: a row named x<img>
    panel.toggle(REPO);
    panel.handleResponse(okResponse(1, [makeRow({ branchName: "x<img>" })]));

    // Then: no img element exists and the cell text equals the raw name
    expect(panelElem().querySelectorAll("img")).toHaveLength(0);
    expect(bodyRows()[0].cells[0].textContent).toBe("x<img>");
  });

  it("renders the date through the existing getCommitDate helper (TC-023)", () => {
    // Case: TC-023
    // Given: a row with a known last commit
    panel.toggle(REPO);
    panel.handleResponse(
      okResponse(1, [makeRow({ lastCommit: { kind: "known", unixSeconds: 1724500000 } })])
    );

    // Then: getCommitDate produced the cell value and the title attribute
    expect(getCommitDate).toHaveBeenCalledWith(1724500000);
    const dateCell = bodyRows()[0].cells[1];
    expect(dateCell.textContent).toBe("date-value");
    expect(dateCell.title).toBe("date-title");
  });

  it("renders the empty wording for zero rows (TC-024)", () => {
    // Case: TC-024
    // Given: an open panel
    panel.toggle(REPO);

    // When: the latest valid response carries no rows
    panel.handleResponse(okResponse(1, []));

    // Then: no table row exists and the empty l10n text is shown
    expect(bodyRows()).toHaveLength(0);
    expect(messageText()).toBe("No local branches");
  });

  it("renders exactly one row for a single-branch response (TC-025)", () => {
    // Case: TC-025
    // Given: an open panel
    panel.toggle(REPO);

    // When: the latest valid response carries one row
    panel.handleResponse(okResponse(1, [makeRow()]));

    // Then: exactly one table row is rendered
    expect(bodyRows()).toHaveLength(1);
  });

  it("keeps HTML-like path and upstream values as text nodes (TC-026)", () => {
    // Case: TC-026
    // Given: a row whose worktree path and upstream name contain <b>bold</b>
    panel.toggle(REPO);
    panel.handleResponse(
      okResponse(1, [
        makeRow({
          upstream: { kind: "present", name: "<b>bold</b>" },
          worktree: { kind: "used", path: "<b>bold</b>", isMain: false }
        })
      ])
    );

    // Then: no b element exists and both cells keep the raw string
    expect(panelElem().querySelectorAll("b")).toHaveLength(0);
    const cells = bodyRows()[0].cells;
    expect(cells[5].textContent).toBe("<b>bold</b>");
    expect(cells[6].textContent).toContain("<b>bold</b>");
  });
});

// S4: 行操作の eligibility と callback
// @see docs/testing/perspectives/web/branchCleanupPanel-test.md
describe("BranchCleanupPanel row actions", () => {
  it("offers delete on an eligible row and forwards exact arguments (TC-027)", () => {
    // Case: TC-027
    // Given: a row satisfying every eligibility condition
    panel.toggle(REPO);
    panel.handleResponse(okResponse(1, [makeRow()]));

    // When: its delete button is clicked
    const buttons = deleteButtons(bodyRows()[0]);
    expect(buttons).toHaveLength(1);
    buttons[0].click();

    // Then: the delete callback runs once with the exact repo, branch, and known remotes
    expect(actions.showDeleteDialog).toHaveBeenCalledTimes(1);
    expect(actions.showDeleteDialog).toHaveBeenCalledWith(REPO, "feature/x", ["origin"]);
  });

  it("hides delete on the current branch (TC-028)", () => {
    // Case: TC-028
    // Given: a row that is the current branch
    panel.toggle(REPO);
    panel.handleResponse(okResponse(1, [makeRow({ isCurrent: true })]));

    // Then: the row offers no delete button
    expect(deleteButtons(bodyRows()[0])).toHaveLength(0);
  });

  it("hides delete on the comparison target row (TC-029)", () => {
    // Case: TC-029
    // Given: a row whose name equals the comparison target
    panel.toggle(REPO);
    panel.handleResponse(okResponse(1, [makeRow({ branchName: COMPARE_BRANCH })]));

    // Then: the row offers no delete button
    expect(deleteButtons(bodyRows()[0])).toHaveLength(0);
  });

  it("hides delete on a worktree-used row (TC-030)", () => {
    // Case: TC-030
    // Given: a row whose branch is checked out in a worktree
    panel.toggle(REPO);
    panel.handleResponse(
      okResponse(1, [makeRow({ worktree: { kind: "used", path: "/wt/x", isMain: false } })])
    );

    // Then: the row offers no delete button
    expect(deleteButtons(bodyRows()[0])).toHaveLength(0);
  });

  it("hides delete when any fact is unknown (TC-031)", () => {
    // Case: TC-031
    // Given: a row whose ancestry is unknown
    panel.toggle(REPO);
    panel.handleResponse(okResponse(1, [makeRow({ ancestry: "unknown" })]));

    // Then: the row offers no delete button
    expect(deleteButtons(bodyRows()[0])).toHaveLength(0);
  });

  it("hides delete when the remote list is unknown (TC-032)", () => {
    // Case: TC-032
    // Given: a row whose remotes are null
    panel.toggle(REPO);
    panel.handleResponse(okResponse(1, [makeRow({ remotes: null })]));

    // Then: the row offers no delete button
    expect(deleteButtons(bodyRows()[0])).toHaveLength(0);
  });

  it("hides delete on every row without a comparison target (TC-033)", () => {
    // Case: TC-033
    // Given: a response without a comparison target (all rows notSelected)
    panel.toggle(REPO);
    panel.handleResponse(
      okResponse(
        1,
        [
          makeRow({
            branchName: "alpha",
            ancestry: "notSelected",
            aheadBehind: { kind: "notSelected" },
            treeDifference: "notSelected"
          }),
          makeRow({
            branchName: "beta",
            ancestry: "notSelected",
            aheadBehind: { kind: "notSelected" },
            treeDifference: "notSelected"
          })
        ],
        null
      )
    );

    // Then: no row offers a delete button
    expect(bodyRows()).toHaveLength(2);
    expect(deleteButtons()).toHaveLength(0);
  });

  it("offers no row action while loading (TC-034)", () => {
    // Case: TC-034
    // Given: a panel that just sent its request
    panel.toggle(REPO);

    // Then: the loading view carries no delete or show button
    expect(deleteButtons()).toHaveLength(0);
    expect(showButtons()).toHaveLength(0);
  });

  it("forwards the raw branch name to the show callback (TC-035)", () => {
    // Case: TC-035
    // Given: a row named a;b
    panel.toggle(REPO);
    panel.handleResponse(okResponse(1, [makeRow({ branchName: "a;b" })]));

    // When: its show button is clicked
    const buttons = showButtons(bodyRows()[0]);
    expect(buttons).toHaveLength(1);
    buttons[0].click();

    // Then: the callback receives the unmodified name exactly once
    expect(actions.showBranch).toHaveBeenCalledTimes(1);
    expect(actions.showBranch).toHaveBeenCalledWith("a;b");
  });
});

// S5: syncComparisonOptions() の比較先 label（自動解決値の表示）
// @see docs/testing/perspectives/web/branchCleanupPanel-test.md
describe("BranchCleanupPanel comparison labels", () => {
  it("shows the resolved branch in the automatic label without touching the request (TC-036)", () => {
    // Case: TC-036
    // Given: an open panel with the automatic comparison (nothing selected)
    panel.toggle(REPO);

    // When: the latest loaded response resolves the comparison to main
    panel.handleResponse(okResponse(1, [makeRow()], "main"));

    // Then: the auto option and the current display both read Automatic (main)
    expect(autoOptionText()).toBe("Automatic (main)");
    expect(comparisonCurrentText()).toBe("Automatic (main)");

    // Then: the next request still sends compareBranch null (the resolved name never leaks)
    panel.refresh(REPO);
    expect(sendMessage).toHaveBeenCalledTimes(2);
    const lastRequest = sentRequests()[sentRequests().length - 1];
    expect(lastRequest.compareBranch).toBeNull();
  });

  it("fills the not-selected wording for a null resolved comparison (TC-037)", () => {
    // Case: TC-037
    // Given: an open panel with the automatic comparison
    panel.toggle(REPO);

    // When: the latest loaded response carries compareBranch null
    panel.handleResponse(okResponse(1, [makeRow({ ancestry: "notSelected" })], null));

    // Then: the auto option fills {0} with the not-selected wording, never an empty pair
    expect(autoOptionText()).toBe("Automatic (No comparison target)");
    expect(comparisonCurrentText()).toBe("Automatic (No comparison target)");
  });

  it("keeps the plain automatic label next to an explicit selection (TC-038)", () => {
    // Case: TC-038
    // Given: an open panel listing develop, with develop explicitly selected
    panel.toggle(REPO);
    panel.handleResponse(
      okResponse(1, [makeRow({ branchName: "develop" }), makeRow({ branchName: "main" })])
    );
    selectComparison("develop");

    // When: the loaded response for the explicit selection resolves to develop
    panel.handleResponse(
      okResponse(
        2,
        [makeRow({ branchName: "develop" }), makeRow({ branchName: "main" })],
        "develop"
      )
    );

    // Then: the current display shows the branch name and the auto option stays plain
    expect(comparisonCurrentText()).toBe("develop");
    expect(autoOptionText()).toBe("Automatic");
    expect(autoOptionText()).not.toContain("(");
  });

  it("falls back to the resolved automatic label when the selection disappears (TC-039)", () => {
    // Case: TC-039
    // Given: feature/x is selected from the first loaded response
    panel.toggle(REPO);
    panel.handleResponse(
      okResponse(1, [makeRow({ branchName: "feature/x" }), makeRow({ branchName: "main" })])
    );
    selectComparison("feature/x");

    // When: the latest response no longer lists feature/x and resolves to main
    panel.handleResponse(okResponse(2, [makeRow({ branchName: "main" })], "main"));

    // Then: the current display falls back to the auto option with the resolved name
    expect(autoOptionText()).toBe("Automatic (main)");
    expect(comparisonCurrentText()).toBe("Automatic (main)");
  });

  it("keeps an HTML-like resolved name as text in the label (TC-040)", () => {
    // Case: TC-040
    // Given: an open panel with the automatic comparison
    panel.toggle(REPO);

    // When: the latest loaded response resolves to the HTML-like name x<img>
    panel.handleResponse(okResponse(1, [makeRow()], "x<img>"));

    // Then: no img element is created and the label carries the raw name
    expect(panelElem().querySelectorAll("img")).toHaveLength(0);
    expect(comparisonCurrentText()).toBe("Automatic (x<img>)");
  });

  it("shows the plain automatic label while loading (TC-041)", () => {
    // Case: TC-041
    // Given: an open panel whose request was just sent (no response yet)
    panel.toggle(REPO);

    // Then: the auto option and the current display stay plain without a resolved value
    expect(autoOptionText()).toBe("Automatic");
    expect(comparisonCurrentText()).toBe("Automatic");
    expect(comparisonCurrentText()).not.toContain("(");
  });

  it("drops the stale resolved value from the label on a failed refresh (TC-042)", () => {
    // Case: TC-042
    // Given: a loaded panel showing Automatic (main)
    panel.toggle(REPO);
    panel.handleResponse(okResponse(1, [makeRow()], "main"));
    expect(comparisonCurrentText()).toBe("Automatic (main)");

    // When: the refresh answers with the error union
    panel.refresh(REPO);
    panel.handleResponse({
      command: "loadBranchCleanup",
      repo: REPO,
      requestId: 2,
      result: { kind: "error", status: "fatal" }
    });

    // Then: the label returns to plain Automatic without the past resolved value
    expect(autoOptionText()).toBe("Automatic");
    expect(comparisonCurrentText()).toBe("Automatic");
    expect(comparisonCurrentText()).not.toContain("main");
  });

  it("keeps the old label with the old table and updates both together on refresh (TC-043)", () => {
    // Case: TC-043
    // Given: a loaded panel resolved to main with the row feature/a
    panel.toggle(REPO);
    panel.handleResponse(okResponse(1, [makeRow({ branchName: "feature/a" })], "main"));

    // When: the same repository is refreshed and no response arrived yet
    panel.refresh(REPO);

    // Then: the kept table and the label both still show the old response
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0].cells[0].textContent).toBe("feature/a");
    expect(comparisonCurrentText()).toBe("Automatic (main)");

    // When: the latest response arrives with the row feature/b resolved to develop
    panel.handleResponse(okResponse(2, [makeRow({ branchName: "feature/b" })], "develop"));

    // Then: the table and the label update to the latest response together
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0].cells[0].textContent).toBe("feature/b");
    expect(comparisonCurrentText()).toBe("Automatic (develop)");
  });
});
