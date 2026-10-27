# Test Perspectives: web/branchCleanupPanel.ts

> Source: `web/branchCleanupPanel.ts`
> Generated: 2026-08-25T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Storage Mode: single-file

## S1: Open/close and request lifecycle (toggle / refresh / selectRepository / requestId)

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: superseded
> Superseded By: S6
> Supersedes: -
> Signature: `BranchCleanupPanel.toggle(repo: string)` / `refresh(repo: string)` / `selectRepository(repo: string)` / `isOpen(): boolean`
> Target Path: `web/branchCleanupPanel.ts` (open / closed and request creation; update to line ranges after implementation)
> Test File: `tests/web/branchCleanupPanel.test.ts`

Contract: the panel owns open / closed, the current repo, the selected comparison, the latest request and the requestId as private state, and the requestId increases monotonically from 1 (implementation plan §3.3). The graph's internal state and the delete dialog body belong to `web/main-test/09-branch-cleanup-01.md` / `web/refMenu-test/01-branch-actions-01.md` and are not in this table.

| Case ID | Input / Precondition                                                                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                     | Notes                              |
| ------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| TC-001  | Call `toggle("/repo")` while closed                                                                            | Normal - open and first request                                            | `isOpen()` becomes `true`, the loading view is rendered, and `sendMessage` is called once with `{ command: "loadBranchCleanup", repo: "/repo", requestId: 1, compareBranch: null }` | requestId starts at 1              |
| TC-002  | After opening, call `refresh("/repo")` twice                                                                   | Normal - requestId increases monotonically                                 | The `requestId` of the 3 sent requests is `1`, `2`, `3`, increasing monotonically and never reused                                                                                  | -                                  |
| TC-003  | Call `toggle("/repo")` while open                                                                              | Normal - close                                                             | `isOpen()` becomes `false`, the row action buttons are removed from the DOM, and the latest request is invalidated                                                                  | Responses after close: S2 TC-013   |
| TC-004  | Call `refresh("/repo")` while open                                                                             | Normal - re-request while open                                             | `sendMessage` is called with one request carrying a new `requestId`                                                                                                                 | -                                  |
| TC-005  | Call `refresh("/repo")` while closed                                                                           | Boundary - refresh while closed                                            | The call count of `sendMessage` is 0 (no additional message)                                                                                                                        | No request is created while closed |
| TC-006  | Call `selectRepository("/other")` while open with a comparison target selected                                 | Normal - switching repository discards the selection                       | `compareBranch` of later requests returns to `null`, and the request `repo` becomes `"/other"`                                                                                      | Counterexample: repo switch        |
| TC-007  | Call `refresh("/repo")` while open with comparison target `develop` selected                                   | Normal - selection kept within the same repository                         | The re-request is sent with `compareBranch` still `"develop"`                                                                                                                       | -                                  |
| TC-008  | `refresh("/repo")` when the requestId has reached the positive safe integer limit (state injected by the test) | Boundary - requestId exhausted                                             | The call count of `sendMessage` is 0 and the load failure view is rendered (no wrap and reuse)                                                                                      | Exhaustion contract of §3.3        |
| TC-009  | Change the comparison target to `feature/x` while open                                                         | Normal - comparison change                                                 | The loading view is rendered first, and `sendMessage` is called with one request carrying `compareBranch: "feature/x"`                                                              | Loading first                      |

### Failure-source inventory (include-or-justify) — added by Feature 055-03 (S1)

| Failure source                                                | Case or reason for exclusion                                                                                                      |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Creating requests while closed or after close                 | TC-005                                                                                                                            |
| requestId reused or not monotonic                             | TC-002                                                                                                                            |
| Wrap / send when the requestId is exhausted                   | TC-008                                                                                                                            |
| Selection survives a repo switch                              | TC-006                                                                                                                            |
| Selection lost on a same-repo refresh                         | TC-007                                                                                                                            |
| Sending a request without rendering loading                   | TC-001, TC-009 (verify loading comes first)                                                                                       |
| Failure sources of response freshness and validation          | excluded(owned by S2)                                                                                                             |
| Exception / error paths                                       | excluded(the lifecycle methods have no throw branch; failures are verified as display states in S2 / S3)                          |
| External dependency x failure mode                            | excluded(Git failures belong to the host / DataSource owner; the panel receives the response union)                               |
| Boundary values (0 / minimum / maximum / +/-1 / NULL / empty) | excluded(the only numeric input is the requestId; the initial value 1 is covered by TC-001 and exhaustion at the limit by TC-008) |
| Invalid type / format                                         | excluded(runtime validation of the response is owned by S2)                                                                       |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(the lifecycle has no validation branch; validation is owned by S2)
- Exception: excluded(no throw path)
- External: excluded(no external dependency)
- Boundary: TC-005, TC-008
- Type: excluded(owned by S2)
- Normal: TC-001 to TC-004, TC-006, TC-007, TC-009

**Failure/normal ratio (smoke detector)**: 7 normal cases (TC-001 to TC-004, TC-006, TC-007, TC-009), 2 failure cases (TC-005, TC-008). The lifecycle failure sources (stale responses, malformed rows, responses after close) are assigned to S2, and re-deriving the inventory confirmed that this section is by structure mostly normal state transitions.

## S2: Runtime validation and response freshness in handleResponse()

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `BranchCleanupPanel.handleResponse(response: ResponseLoadBranchCleanup): void`
> Target Path: `web/branchCleanupPanel.ts` (response validation; update to line ranges after implementation)
> Test File: `tests/web/branchCleanupPanel.test.ts`

Contract: the response and every row field are runtime-validated from `unknown`, and only a response whose ID matches the latest positive safe integer and whose repo and open state match is rendered (implementation plan §3.1 / §3.3). An error or malformed latest valid response shows the panel failure; a stale response, a response for another repo or a response after close is ignored without changing the DOM.

| Case ID | Input / Precondition                                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                           | Notes                                        |
| ------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| TC-010  | A `kind: "ok"` response whose repo / requestId match the latest request (2 valid rows)                | Normal - rendering the latest valid response                               | The loading view disappears and 2 rows are rendered                                                       | -                                            |
| TC-011  | After request A (id=1) and request B (id=2), receive B's response, then A's response                  | Validation - A/B responses in reverse order                                | Only B's response is rendered, and receiving A's response does not change the DOM (the content stays B's) | Counterexample: reverse-order responses      |
| TC-012  | A response with the latest requestId but a `repo` different from the current repo                     | Validation - response for another repository                               | The DOM does not change (ignored, no failure view either)                                                 | Counterexample: response after a repo switch |
| TC-013  | Open, send a request, close, then receive the response for that requestId                             | Validation - response after close                                          | The DOM does not change, and no rows or action buttons are rendered                                       | Counterexample: response after close         |
| TC-014  | A response with the latest requestId whose row has `ancestry` `"safe"` (outside the union)            | Validation - malformed row                                                 | 0 rows and 0 delete buttons, and the panel's load failure view is rendered                                | Counterexample: invalid row                  |
| TC-015  | A `kind: "error", status: "fatal"` response with the latest requestId                                 | Exception - whole-response error                                           | The load failure view is rendered and there are 0 rows                                                    | Display of the error union                   |
| TC-016  | A response where `result.rows` is not an array or a row is not an object (injected through `unknown`) | Type - structurally invalid response                                       | 0 rows and the load failure view is rendered (no exception thrown)                                        | runtime validation                           |
| TC-017  | A response whose `requestId` is the string `"2"` (latest is 2)                                        | Type - invalid requestId type                                              | The DOM does not change (not implicitly converted to a number and treated as latest)                      | Strict equality                              |

### Failure-source inventory (include-or-justify) — added by Feature 055-03 (S2)

| Failure source                                                | Case or reason for exclusion                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Rendering reverse-order or stale responses                    | TC-011                                                                                                              |
| Rendering a response after a repository switch                | TC-012                                                                                                              |
| Rendering a response after close                              | TC-013                                                                                                              |
| Accepting malformed rows / invalid structure                  | TC-014, TC-016                                                                                                      |
| Swallowing a whole-response error (keeps rendering)           | TC-015                                                                                                              |
| Implicit type conversion of the requestId                     | TC-017                                                                                                              |
| Wrongly ignoring the latest valid response                    | TC-010                                                                                                              |
| External dependency x failure mode                            | excluded(Git failures arrive as the error union; their source is owned by dataSource owner S48)                     |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL) | excluded(the only numeric input is the requestId, owned by S6 TC-044 / TC-051; empty rows are covered by S3 TC-024) |
| Type contract (compile time)                                  | excluded(owned by `src/types-test.md` S8; this section covers runtime validation)                                   |

**Failure-category coverage (diversity floor)**:

- Validation: TC-011 to TC-014
- Exception: TC-015
- External: excluded(no external dependency)
- Boundary: excluded(numeric and empty boundaries are owned by S6 / S3)
- Type: TC-016, TC-017
- Normal: TC-010

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-010), 7 failure cases (TC-011 to TC-017), ratio 7.0. This is a validation and freshness section, so failure cases dominating is as expected by structure.

## S3: Row rendering (display per union, textContent, date and time)

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `BranchCleanupPanel.handleResponse()` rendering path (createElement / textContent)
> Target Path: `web/branchCleanupPanel.ts` (table rendering; update to line ranges after implementation)
> Test File: `tests/web/branchCleanupPanel.test.ts`

Contract: the table is built with createElement and textContent, shows ancestry / ahead-behind / tree / upstream / worktree / date and time explicitly per union variant, and uses different text for `unknown` and `notSelected` (implementation plan §3.3). The existence of the text keys is owned by the l10n owner (`l10n/web/web.l10n.en.json-test.md` S5 / `web.l10n.ja.json-test.md` S6).

| Case ID | Input / Precondition                                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                     | Notes                                  |
| ------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| TC-018  | A row with every fact known (ancestor / ahead 1 behind 2 / same / present / used / known / 1 remote) | Normal - display of a known row                                            | Each cell's `textContent` matches the corresponding l10n text or value (ahead/behind numbers, upstream name, worktree path, remote name)            | -                                      |
| TC-019  | Render a row with `ancestry: "unknown"` and a row with `ancestry: "notSelected"` together            | Normal - different text for unknown / notSelected                          | The cell `textContent` of the 2 rows differ and match the l10n text for unknown and for notSelected respectively                                    | Not collapsed into the same value      |
| TC-020  | A row with `upstream: { kind: "unset" }` and a row with `{ kind: "gone", name: "origin/x" }`         | Normal - different display for upstream unset / gone                       | The cell `textContent` of the unset row and the gone row differ, and the gone row contains the name `origin/x`                                      | -                                      |
| TC-021  | A row with `worktree: { kind: "unused" }` and a row with `{ kind: "unknown" }`                       | Normal - different display for worktree unused / unknown                   | The cell `textContent` of the 2 rows are different texts                                                                                            | A failure is not collapsed into unused |
| TC-022  | Render a row with `branchName: "x<img>"`                                                             | Type - special name not turned into an element                             | There are 0 `img` elements in the panel, and the branch name cell's `textContent` equals `"x<img>"` with `toBe`                                     | Counterexample: special name           |
| TC-023  | A row with `lastCommit: { kind: "known", unixSeconds: 1724500000 }`                                  | Normal - date and time display                                             | `getCommitDate(1724500000)` is called; the value of its return is used for the cell's `textContent` and the title for the element's title attribute | Reuses the existing dates helper       |
| TC-024  | A latest valid response with `rows: []`                                                              | Boundary - 0 rows                                                          | The table has 0 rows, and the l10n text for empty is rendered as `textContent`                                                                      | Counterexample: 0 branches             |
| TC-025  | A latest valid response with 1 row in `rows`                                                         | Boundary - 1 row                                                           | Exactly 1 table row is rendered                                                                                                                     | Counterexample: 1 branch               |
| TC-026  | A row whose `worktree.path` and `upstream.name` contain `<b>bold</b>`                                | Type - path / upstream not turned into elements                            | There are 0 `b` elements in the panel, and each cell's `textContent` contains the input string as is                                                | No innerHTML                           |

### Failure-source inventory (include-or-justify) — added by Feature 055-03 (S3)

| Failure source                                            | Case or reason for exclusion                                                                                   |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Variants displayed the same (unknown / notSelected, etc.) | TC-019 to TC-021                                                                                               |
| HTML interpretation of branch name, path or upstream      | TC-022, TC-026                                                                                                 |
| Degeneration at 0 / 1 rows                                | TC-024, TC-025                                                                                                 |
| Custom date formatting (not using the existing helper)    | TC-023                                                                                                         |
| Known values missing from the display                     | TC-018                                                                                                         |
| Rendering malformed rows                                  | excluded(owned by S2 TC-014 / TC-016)                                                                          |
| Missing text keys / parity                                | excluded(owned by l10n owner S5 / S6)                                                                          |
| Exception / error paths                                   | excluded(rendering only receives validated rows and has no throw branch)                                       |
| External dependency x failure mode                        | excluded(no external dependency)                                                                               |
| Boundary values (0 / minimum / maximum / +/-1 / NULL)     | excluded(the only numeric boundary is the displayed ahead/behind values, included in TC-018; 0 rows is TC-024) |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(response validation is owned by S2; the rendering stage has no validation branch)
- Exception: excluded(no throw path)
- External: excluded(no external dependency)
- Boundary: TC-024, TC-025
- Type: TC-022, TC-026
- Normal: TC-018 to TC-021, TC-023

**Failure/normal ratio (smoke detector)**: 5 normal cases (TC-018 to TC-021, TC-023), 4 failure cases (TC-022, TC-024 to TC-026). With a difference of 1 the inventory was re-derived; the failure sources of the rendering stage are limited to variant confusion, HTML interpretation and degeneration, and the validation failure sources were confirmed to be assigned to S2.

## S4: Eligibility and callbacks of row actions

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `BranchCleanupPanelActions.showBranch(branchName: string)` / `showDeleteDialog(repo: string, branchName: string, remotes: string[])` / `showCreateWorktreeDialog(repo: string, branchName: string, sourceElem: HTMLElement)` and row button creation (Create Worktree is S8)
> Target Path: `web/branchCleanupPanel.ts` (eligibility check and callbacks; update to line ranges after implementation)
> Test File: `tests/web/branchCleanupPanel.test.ts`

Contract: the delete action is shown only on rows that meet every condition: latest loaded, a comparison target exists, the target is not current, the target is not the comparison target, worktree unused, all facts known, and the remote list known (implementation plan §3.3). The dialog body and payload are owned by `web/refMenu-test/01-branch-actions-01.md` S21.

| Case ID | Input / Precondition                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                               | Notes                                 |
| ------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| TC-027  | Click the delete button of a row that meets every eligibility condition | Normal - delete action on an eligible row                                  | The row has 1 delete button, and clicking it calls `actions.showDeleteDialog` once with exactly `(repo, branchName, remotes)` | Arguments are the known remotes       |
| TC-028  | A row with `isCurrent: true`                                            | Validation - current row excluded                                          | The row has 0 delete buttons                                                                                                  | -                                     |
| TC-029  | A row whose branchName equals the comparison target                     | Validation - comparison target row excluded                                | The row has 0 delete buttons                                                                                                  | -                                     |
| TC-030  | A row with `worktree: { kind: "used", ... }`                            | Validation - worktree used excluded                                        | The row has 0 delete buttons                                                                                                  | -                                     |
| TC-031  | A row where some fact is unknown (e.g. `ancestry: "unknown"`)           | Validation - unknown fact excluded                                         | The row has 0 delete buttons                                                                                                  | All-facts-known condition             |
| TC-032  | A row with `remotes: null`                                              | Validation - unknown remote list excluded                                  | The row has 0 delete buttons                                                                                                  | -                                     |
| TC-033  | A response with no comparison target (every row notSelected)            | Validation - all rows excluded without a comparison target                 | Every row has 0 delete buttons                                                                                                | -                                     |
| TC-034  | During the loading view right after a request is sent                   | Validation - excluded while loading                                        | There are 0 delete buttons (the loading view has no row actions)                                                              | Prevents stale actions                |
| TC-035  | Click the "Show in Graph" button of any row (branchName is `a;b`)       | Normal - showBranch callback                                               | `actions.showBranch` is called once with `("a;b")` (nothing but branchName, unmodified)                                       | Special names are also passed as data |

### Failure-source inventory (include-or-justify) — added by Feature 055-03 (S4)

| Failure source                                                   | Case or reason for exclusion                                                                                          |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Delete shown on current / comparison target / worktree used rows | TC-028 to TC-030                                                                                                      |
| Delete shown on unknown fact / remotes null rows                 | TC-031, TC-032                                                                                                        |
| Delete shown with no comparison target or while loading          | TC-033, TC-034                                                                                                        |
| Callback arguments missing or modified                           | TC-027, TC-035                                                                                                        |
| Row actions from a stale response                                | excluded(S2 TC-011 to TC-013 ensure stale responses are not rendered, and action buttons exist only on rendered rows) |
| Wrong dialog body, payload or defaults                           | excluded(owned by `web/refMenu-test/01-branch-actions-01.md` S21)                                                     |
| Wrong filter / scroll on the graph side                          | excluded(owned by `web/main-test/09-branch-cleanup-01.md` S49)                                                        |
| Exception / error paths                                          | excluded(only callback calls; no throw path)                                                                          |
| External dependency x failure mode                               | excluded(no external dependency)                                                                                      |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)    | excluded(no numeric boundary; 0 rows is covered by S3 TC-024 and remotes null by TC-032)                              |
| Invalid type / format                                            | excluded(runtime validation of rows is owned by S2)                                                                   |

**Failure-category coverage (diversity floor)**:

- Validation: TC-028 to TC-034
- Exception: excluded(no throw path)
- External: excluded(no external dependency)
- Boundary: excluded(numeric and empty boundaries are owned by S2 / S3)
- Type: excluded(owned by S2)
- Normal: TC-027, TC-035

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-027, TC-035), 7 failure cases (TC-028 to TC-034), ratio 3.5. The structure places one case per negative eligibility branch, derived from the inventory.

## S5: Comparison target label in syncComparisonOptions() (showing the auto-resolved value)

> Origin: Feature 055-03 follow-up
> Added: 2026-08-29
> Status: active
> Supersedes: -
> Signature: `BranchCleanupPanel.syncComparisonOptions(): void`
> Target Path: `web/branchCleanupPanel.ts` (syncComparisonOptions(), lines 219-234)
> Test File: `tests/web/branchCleanupPanel.test.ts`

Contract: only when automatic selection is active and the view is loaded, `view.compareBranch ?? t("cleanup.state.notSelected")` is passed to `t("cleanup.comparison.autoResolved", resolved)` to build the auto option name; with an explicit selection, loading or failed, `t("cleanup.comparison.auto")` is used (implementation plan §3.1 / §3.2). The auto option value stays `COMPARISON_AUTO_VALUE` (empty string), and the automatic choice in the Request stays `compareBranch: null`. The source of truth for locale-fixed values is owned by the l10n owner (`../l10n/web/web.l10n.en.json-test.md` S7 / `../l10n/web/web.l10n.ja.json-test.md` S8); this table covers only the display branches.

| Case ID | Input / Precondition                                                                                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                          | Notes                                        |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| TC-036  | With automatic selection (`selectedComparison === null`), receive the latest loaded response with `compareBranch: "main"`                            | Normal - auto-resolved label                                               | The auto option name and the dropdown's current display `textContent` become `Automatic (main)`, and the request argument of `sendMessage` stays `compareBranch: null`                                   | Showing the resolved value (main regression) |
| TC-037  | With automatic selection, receive the latest loaded response with `compareBranch: null`                                                              | Boundary - null resolved value                                             | The auto option name equals `Automatic (No comparison target)` (`cleanup.state.notSelected` filled into `{0}`) with `toBe`, and `Automatic ()` is not shown                                              | null is not confused with the empty string   |
| TC-038  | With `develop` explicitly selected (present in the latest `branchNames`), receive a loaded response with `compareBranch: "develop"`                  | Normal - explicit selection not confused                                   | The dropdown's current display `textContent` is `develop`, and the auto option name is `Automatic` (without the resolved form `(`)                                                                       | No resolved label on an explicit selection   |
| TC-039  | After selecting `feature/x`, `feature/x` is absent from `branchNames` of the latest loaded response (`compareBranch: "main"`)                        | Validation - fallback for a vanished selection                             | The current display becomes the auto option, and its name `textContent` becomes `Automatic (main)`                                                                                                       | Counterexample: the selected branch vanished |
| TC-040  | With automatic selection, receive the latest loaded response with `compareBranch: "x<img>"`                                                          | Type - HTML-like name not turned into an element                           | There are 0 `img` elements in the dropdown, and the current display `textContent` equals `Automatic (x<img>)` with `toBe`                                                                                | Rendered only through escapeHtml             |
| TC-041  | With automatic selection, right after a request is sent (loading view, no response yet)                                                              | Normal - label while loading                                               | The auto option name and the current display `textContent` are `Automatic`, without the resolved form `(`                                                                                                | No guessed value shown                       |
| TC-042  | With automatic selection, after the loaded view with `compareBranch: "main"`, a `kind: "error"` response to a refresh shows the failed view          | Exception - label while failed                                             | The auto option name and the current display `textContent` are `Automatic`, without the past resolved value `main`                                                                                       | Counterexample: stale past value             |
| TC-043  | From the loaded view with `compareBranch: "main"`, call `refresh()` on the same repository, then the latest response with `compareBranch: "develop"` | Normal - label sync on a same-repository refresh                           | Before the response the rows stay displayed and the current display keeps the old value `Automatic (main)`; on the latest response it updates to `Automatic (develop)` together with the table re-render | Table and label use the same basis           |

### Failure-source inventory (include-or-justify) — added by Feature 055-03 follow-up (S5)

| Failure source                                                                              | Case or reason for exclusion                                                                                                             |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Resolved label mixed into an explicit selection                                             | TC-038                                                                                                                                   |
| A null resolved value rendered as `Automatic ()` (confusing undetermined with empty string) | TC-037                                                                                                                                   |
| Current display kept for a vanished selection (missing fallback)                            | TC-039                                                                                                                                   |
| HTML interpretation of a branch name (turned into an element)                               | TC-040                                                                                                                                   |
| Past or guessed values shown while loading / failed                                         | TC-041, TC-042                                                                                                                           |
| Table and label on different bases during a refresh                                         | TC-043                                                                                                                                   |
| Resolved value not shown (always `Automatic`)                                               | TC-036                                                                                                                                   |
| Resolved value leaking into the Request payload                                             | TC-036 (verifies `compareBranch: null` is kept through the mock arguments)                                                               |
| Structurally invalid or stale responses                                                     | excluded(owned by S2 TC-011 to TC-017; this section only covers label decisions from a validated view)                                   |
| Drift / parity of locale-fixed values                                                       | excluded(owned by l10n owner S7 / S8)                                                                                                    |
| External dependency x failure mode                                                          | excluded(no external dependency)                                                                                                         |
| Boundary values (0 / minimum / maximum / +/-1 / empty)                                      | excluded(no numeric input; NULL is TC-037, and the empty-string auto value is covered by TC-036 as the `COMPARISON_AUTO_VALUE` contract) |
| Invalid type / format                                                                       | excluded(runtime validation of responses is owned by S2; HTML-like names are covered by TC-040)                                          |

**Failure-category coverage (diversity floor)**:

- Validation: TC-039
- Exception: TC-042
- External: excluded(no external dependency)
- Boundary: TC-037
- Type: TC-040
- Normal: TC-036, TC-038, TC-041, TC-043

**Failure/normal ratio (smoke detector)**: 4 normal cases (TC-036, TC-038, TC-041, TC-043), 4 failure cases (TC-037, TC-039, TC-040, TC-042). Being equal, the inventory was re-derived; the failure sources of the label decision are limited to explicit-selection confusion, null confusion, vanished-selection fallback, HTML interpretation and past values shown while loading / failed, and the response validation failure sources were confirmed to be assigned to S2.

## S6: Open/close and request lifecycle (including keeping the loaded view on a comparison change)

> Origin: Feature 055-03 follow-up
> Added: 2026-08-29
> Status: active
> Supersedes: S1
> Signature: `BranchCleanupPanel.toggle(repo: string)` / `refresh(repo: string)` / `selectRepository(repo: string)` / `isOpen(): boolean`
> Target Path: `web/branchCleanupPanel.ts` (toggle / refresh / selectRepository / requestLoad and the comparison dropdown callback)
> Test File: `tests/web/branchCleanupPanel.test.ts`

Carries over the lifecycle contract of S1 and redefines only the rendering contract of a comparison change. A refresh and a comparison change are treated the same: when the view is loaded, the request is re-sent while the old table stays in the DOM (no loading swap; the delete buttons are disabled with no click listener), and only when the view is not loaded is the loading view rendered first before the request is sent. Monotonic requestId increase, invalidation on close and discarding the selection on a repository switch are the same contract as S1. The graph's internal state and the delete dialog body belong to `web/main-test/09-branch-cleanup-01.md` / `web/refMenu-test/01-branch-actions-01.md` and are not in this table.

| Case ID | Input / Precondition                                                                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                   | Notes                                       |
| ------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| TC-044  | Call `toggle("/repo")` while closed                                                                            | Normal - open and first request                                            | `isOpen()` becomes `true`, the loading view is rendered, and `sendMessage` is called once with `{ command: "loadBranchCleanup", repo: "/repo", requestId: 1, compareBranch: null }`                                                                                                                                               | requestId starts at 1                       |
| TC-045  | After opening, call `refresh("/repo")` twice                                                                   | Normal - requestId increases monotonically                                 | The `requestId` of the 3 sent requests is `1`, `2`, `3`, increasing monotonically and never reused                                                                                                                                                                                                                                | -                                           |
| TC-046  | Call `toggle("/repo")` while open                                                                              | Normal - close                                                             | `isOpen()` becomes `false`, the row action buttons are removed from the DOM, and the latest request is invalidated                                                                                                                                                                                                                | Responses after close: S2 TC-013            |
| TC-047  | Call `refresh("/repo")` while open                                                                             | Normal - re-request while open                                             | `sendMessage` is called with one request carrying a new `requestId`                                                                                                                                                                                                                                                               | -                                           |
| TC-048  | Call `refresh("/repo")` while closed                                                                           | Boundary - refresh while closed                                            | The call count of `sendMessage` is 0 (no additional message)                                                                                                                                                                                                                                                                      | No request is created while closed          |
| TC-049  | Call `selectRepository("/other")` while open with a comparison target selected                                 | Normal - switching repository discards the selection                       | `compareBranch` of later requests returns to `null`, and the request `repo` becomes `"/other"`                                                                                                                                                                                                                                    | Counterexample: repo switch                 |
| TC-050  | Call `refresh("/repo")` while open with comparison target `develop` selected                                   | Normal - selection kept within the same repository                         | The re-request is sent with `compareBranch` still `"develop"`                                                                                                                                                                                                                                                                     | -                                           |
| TC-051  | `refresh("/repo")` when the requestId has reached the positive safe integer limit (state injected by the test) | Boundary - requestId exhausted                                             | The call count of `sendMessage` is 0 and the load failure view is rendered (no wrap and reuse)                                                                                                                                                                                                                                    | Exhaustion contract of §3.3                 |
| TC-052  | Change the comparison target to `feature/x` while open in the loaded view (2 rows, delete buttons present)     | Normal - comparison change (loaded view kept)                              | The 2 old rows stay in the DOM without being replaced by the loading view; the delete buttons have the disabled class and clicking them calls no callback; `sendMessage` is called with one request carrying `compareBranch: "feature/x"`; on the latest response the table updates and the delete buttons are no longer disabled | Prevents flicker (same contract as refresh) |
| TC-053  | Change the comparison target to `feature/x` while open in the failed view                                      | Validation - comparison change from a non-loaded view                      | With no table to keep, the loading view is rendered first, and `sendMessage` is called with one request carrying `compareBranch: "feature/x"`                                                                                                                                                                                     | No stale table left from failed             |

### Failure-source inventory (include-or-justify) — added by Feature 055-03 follow-up (S6)

| Failure source                                                              | Case or reason for exclusion                                                                                                      |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Creating requests while closed or after close                               | TC-048                                                                                                                            |
| requestId reused or not monotonic                                           | TC-045                                                                                                                            |
| Wrap / send when the requestId is exhausted                                 | TC-051                                                                                                                            |
| Selection survives a repo switch                                            | TC-049                                                                                                                            |
| Selection lost on a same-repo refresh                                       | TC-050                                                                                                                            |
| Sending a request without rendering loading (when not loaded)               | TC-044, TC-053                                                                                                                    |
| Old table disappears on a comparison change (flicker from the loading swap) | TC-052                                                                                                                            |
| Stale delete executed while in flight                                       | TC-052 (verifies disabled and no callback)                                                                                        |
| Stale table kept from failed                                                | TC-053                                                                                                                            |
| Failure sources of response freshness and validation                        | excluded(owned by S2)                                                                                                             |
| Exception / error paths                                                     | excluded(the lifecycle methods have no throw branch; failures are verified as display states in S2 / S3)                          |
| External dependency x failure mode                                          | excluded(Git failures belong to the host / DataSource owner; the panel receives the response union)                               |
| Boundary values (0 / minimum / maximum / +/-1 / NULL / empty)               | excluded(the only numeric input is the requestId; the initial value 1 is covered by TC-044 and exhaustion at the limit by TC-051) |
| Invalid type / format                                                       | excluded(runtime validation of the response is owned by S2)                                                                       |

**Failure-category coverage (diversity floor)**:

- Validation: TC-053
- Exception: excluded(no throw path)
- External: excluded(no external dependency)
- Boundary: TC-048, TC-051
- Type: excluded(owned by S2)
- Normal: TC-044 to TC-047, TC-049, TC-050, TC-052

**Failure/normal ratio (smoke detector)**: 7 normal cases (TC-044 to TC-047, TC-049, TC-050, TC-052), 3 failure cases (TC-048, TC-051, TC-053). The S1 structure is carried over; the flicker of a comparison change (discarding the old table) and stale delete execution are assigned to TC-052 as failure sources, and keeping a stale table from failed to TC-053.

## S7: Standard buttons for cleanup actions, disabled during a re-request, focus restoration on re-render

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: Row `button` of `BranchCleanupPanel.handleResponse(response)` (`buildShowButton` / `buildDeleteButton` as `button type="button"`) / `disabled` during `requestInFlight` / `beginFocusUpdate(panel)` → `finishFocusUpdate(update)` around render and the FocusKey of kind `cleanup` / comparison target Dropdown (shared contract)
> Target Path: `web/branchCleanupPanel.ts:133-151, 203-265, 266-302, 340-398, 498-517` (`handleResponse`, `render` / `captureFocus` / `restoreFocus` / `hasEnabledAction`, `buildHeader` / `syncComparisonOptions`, `buildRow` / `buildShowButton` / `buildDeleteButton`, `buildActionButton`)
> Test File: `tests/web/branchCleanupPanel.test.ts`

Perspectives for implementation plan R4.3, R4.7 and Task 10. The S4 checks (eligibility and callbacks) are kept, and the current "during a re-request, add the `disabled` class to a `div` and attach no listener" (`buildDeleteButton`) is aligned to the standard `disabled`. The fixture is the same jsdom with `#branchCleanupPanel` / `#branchCleanupBtn` as S1 to S6, with `actions` given as `vi.fn()` and a `FocusContext` registered.

| Case ID | Input / Precondition                                                                                                                                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                           | Notes                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| TC-054  | Row action elements after accepting a response that contains an eligible row                                                                                                                              | Normal - named standard buttons                                            | "Show in Graph" and "Delete" are `button` elements with `type="button"`, and their `aria-label` matches `t("a11y.actionFor", t("cleanup.action.show"), branchName)` / the same for delete. The branch name `a;b` is also included as a string. The display is only the codicon (`codicon-eye` / `codicon-trash`) with empty `textContent`, and `title` is the action name | K41 / A8.1-6                                                                                  |
| TC-055  | With real focus on the delete button, `refresh(repo)` (re-request, so `requestInFlight`) → re-render → `click` / `Enter` on the button                                                                    | Validation - disabled and not executed during a re-request                 | After the re-render the delete button has the standard `disabled` attribute, `showDeleteDialog` is called 0 times, and `activeElement` is the delete button of the same branch (restored by semantic key)                                                                                                                                                                 | K41 / A8.3-5                                                                                  |
| TC-056  | With real focus on a delete button, accept a response in which that row is gone                                                                                                                           | Normal - vanished row goes to the comparison button                        | `activeElement` is the opener button of the comparison target Dropdown (connected and enabled), `showDeleteDialog` is called 0 times                                                                                                                                                                                                                                      | K41 / A8.3-5. "A vanished cleanup action goes to the comparison button → `#branchCleanupBtn`" |
| TC-057  | A response in TC-056 with no comparison button either (error / empty view)                                                                                                                                | Boundary - with no comparison button, to the toolbar cleanup button        | `activeElement` is `#branchCleanupBtn`                                                                                                                                                                                                                                                                                                                                    | K41 / A8.3-5                                                                                  |
| TC-058  | With the comparison target Dropdown open and real focus on a candidate, temporarily detach and re-attach the Dropdown's DOM for a re-render                                                               | Validation - focusout from an internal detach is not a Tab exit            | The Dropdown does not close (`dropdownOpen` kept, or the same state after re-attach), the change callback is called 0 times, and `activeElement` is the candidate after re-attach                                                                                                                                                                                         | Task 10 implementation item 2                                                                 |
| TC-059  | With real focus on a delete button: a response to `selectRepository(<another repo>)`; separately, a response with a stale `requestId`; separately, moving real focus to `#refreshBtn` before the response | Validation - no restoration on repo change, old response or moving outside | In all 3 cases `activeElement` does not return into the panel (other repo: not taken to the HEAD row etc., stays on `body` or the original position; moving outside: `#refreshBtn`)                                                                                                                                                                                       | A8.3-5                                                                                        |
| TC-060  | Real focus on the "Show in Graph" button and `Enter`, then a re-render in which the same row remains                                                                                                      | Normal - same button when the same action remains                          | `showBranch` is called once with `(branchName)`, and after the re-render `activeElement` is the show button of the same branch                                                                                                                                                                                                                                            | K41                                                                                           |

### Failure-source inventory (include-or-justify) — added by Feature 061-05 (S7)

| Failure source                                             | Case or reason for exclusion                                                |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| Action is not a button or has no name                      | TC-054                                                                      |
| Executable during a re-request                             | TC-055                                                                      |
| Wrong restoration target when it vanishes                  | TC-056, TC-057                                                              |
| focusout from a detach treated as an exit                  | TC-058                                                                      |
| Focus taken on repo change, old response or moving outside | TC-059                                                                      |
| Restoration of the same action                             | TC-060                                                                      |
| Eligibility and dialog payload                             | excluded(owned by S4 and `web/refMenu-test/01-branch-actions-01.md` S21)    |
| External dependency / exception                            | excluded(the callbacks are spies with no external dependency or throw path) |

### Task 12 test mapping (Feature 061-05) — S7

- Tests: `tests/web/branchCleanupPanel.test.ts` describe `BranchCleanupPanel keyboard buttons and focus restoration`. The fixture registers `configureFocusContext` in `beforeEach` and disposes it in `afterEach`. TC-054 to TC-060 each have one `it` with the same number
- Interpretation of TC-055 (Task 10 handoff): in the re-render during a re-request the delete button becomes `disabled` and is no longer a tab stop, so focus at that point moves to the opener button of the comparison target Dropdown. When the response brings back an enabled delete button for the same branch, the pending ticket restores focus to that delete button (the test asserts both points)
- Interpretation of TC-057 (Task 10 handoff): the panel always renders the header (comparison target Dropdown), so the precondition "no comparison button either" does not occur in the current implementation. The test hides the comparison opener button with `hidden` as a stand-in for its absence and confirms restoration to `#branchCleanupBtn` on an error response
- Integration with main (Escape order: comparison target Dropdown → repo Dropdown; the panel does not close) is `web/main-test/13-keyboard-accessibility-01.md` S72 TC-694. Real moves outside (another panel / the VS Code side) are in the manual list at the top of the same shard
- Execution result (2026-10-07): 7 passed

## S8: Create Worktree row action

> Origin: Feature 062-01 (PR #114 follow-up)
> Added: 2026-10-27
> Status: active
> Supersedes: -
> Signature: `BranchCleanupPanelActions.showCreateWorktreeDialog(repo: string, branchName: string, sourceElem: HTMLElement)` and the Create Worktree row button
> Target Path: `web/branchCleanupPanel.ts` (`buildRow`, `buildCreateWorktreeButton`)
> Test File: `tests/web/branchCleanupPanel.test.ts`

Every row gets a Create Worktree button between Show in Graph and Delete. Unlike Delete, it does not depend on the delete eligibility of S4. It stays visible but disabled when the branch is checked out in a worktree (the main checkout included), and while a re-request is in flight. A disabled button attaches no click listener. The dialog itself is `web/refMenu-test/02-worktree-actions-01.md` S23 / S27, and the wiring to it is `web/main-test/09-branch-cleanup-01.md` S87. The loading view (TC-034) and a closed panel (TC-046) carry no Create Worktree button either. Fixture: the jsdom panel of S1 to S7 with `actions` as `vi.fn()` and `REPO = "/repo"`.

| Case ID | Input / Precondition                                                                                                                                                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                                                       | Notes                                                 |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| TC-061  | Rows `feature/x` (worktree unused), `orphan` (worktree unknown), `main` (current, used by the main worktree `/repo`) and `linked` (used by `/repo/.worktrees/linked`); click each button | Validation - checked-out branch disabled                                   | Four buttons with the `codicon-worktree-small` icon and empty text. Titles are `Create Worktree...` for the first two and `Create Worktree... (In use: <path>)` for the last two; only the last two are disabled. The first has `aria-label` `Create Worktree...: feature/x`. Clicking it calls `showCreateWorktreeDialog(REPO, "feature/x", <button>)` once; clicking the disabled ones adds no call | An unknown worktree state does not disable the button |
| TC-062  | Loaded panel, then `refresh(REPO)`; click while the request is in flight, then after the next response                                                                                   | Validation - disabled during a re-request                                  | While in flight the button is disabled and a click makes no call. After the response it is enabled and one click calls `showCreateWorktreeDialog(REPO, "feature/x", <button>)` once                                                                                                                                                                                                                   | Same rule as TC-055 for Delete                        |

### Failure-source inventory (include-or-justify) — S8

| Failure source                                       | Case or reason for exclusion                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| Creating a worktree for a branch that is checked out | TC-061                                                                            |
| Acting on a stale row during a re-request            | TC-062                                                                            |
| Callback arguments lost or changed                   | TC-061, TC-062                                                                    |
| Button missing in the loading view or after close    | excluded (TC-034 and TC-046 also assert zero Create Worktree buttons)             |
| Dialog contents and the suggested path               | excluded (`web/refMenu-test/02-worktree-actions-01.md` S23 / S27)                 |
| Focus restoration after re-render                    | excluded (S7 covers the shared focus key; Create Worktree adds no new focus path) |
| Exception / External / Type                          | excluded (the callback is a spy; row types are validated in S2)                   |

### Test mapping — S8

`tests/web/branchCleanupPanel.test.ts` describe `BranchCleanupPanel row actions`: TC-061 `offers Create Worktree on every row and disables a branch already in a worktree (TC-061)`, TC-062 `disables Create Worktree while a refresh is in flight (TC-062)`.
