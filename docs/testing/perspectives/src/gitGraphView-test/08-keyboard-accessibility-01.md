# Test Perspectives: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-10-07T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: keyboard-accessibility

## S42: Toolbar buttons, labels, DOM order, list name and status notice element in the host-generated HTML

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: superseded
> Superseded By: S43
> Supersedes: -
> Signature: HTML inside `#controls` of `private getHtmlForWebview(...)` (`#branchCleanupBtn` / `#searchBtn` / `#fetchBtn` / `#currentBtn` / `#refreshBtn` as `button type="button"`, the opener button names of `#repoSelect` / `#branchSelect` / `#authorSelect`, keeping the DOM order of the `label` and checkbox of `#showRemoteBranchesControl`) / `aria-label` of `#commitTable` (`hostT("Commit history")`) / the notice element with `role="status"` `aria-live="polite"` (`hostT("Git Keizu status")`)
> Target Path: `src/gitGraphView.ts:755-851, 1086-1088` (`#controls` 798-806, `#statusNotice` 809, `#commitTable` 814 of `getHtmlForWebview()`, and `toolbarButton()`)
> Test File: `tests/src/gitGraphView.test.ts`

Perspectives for implementation item 1 of Task 9 in the implementation plan. Existing IDs and DOM order are kept, and no settings, protocol messages or dependencies are added. The generated HTML is parsed with `JSDOM` to observe attributes and order, and `hostT` returns English values through a mock of `vscode.l10n.t`. Key handling and `disabled` syncing on the Webview side belong to `web/main-test/13-keyboard-accessibility-01.md` S69 / `-02.md` S77, and dictionary values belong to `l10n/bundle.l10n-test.md` / `l10n/bundle.l10n.ja-test.md`; they are not in this table.

| Case ID | Input / Precondition                                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                      | Notes                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| TC-410  | `#branchCleanupBtn` / `#searchBtn` / `#fetchBtn` / `#currentBtn` / `#refreshBtn` in the generated HTML | Normal - standard buttons and names                                        | The 5 elements are `button` with `type="button"`, their IDs are unchanged, and their names (`aria-label` or `title`) match the return values of `hostT("Branch Cleanup")` / `hostT("Search")` / `hostT("Fetch --prune")` / `hostT("Current")` / `hostT("Refresh")`                                                                                                   | K44 / A8.1-6                                                                                      |
| TC-411  | HTML around `#repoSelect` / `#branchSelect` / `#authorSelect`                                          | Normal - supplying the Dropdown opener button names                        | The label text next to each `div.dropdown` (`hostT("Repo:")` etc.) is passed through an attribute the Webview-side Dropdown can use as the opener button name (`data-label`, or a `span` with an `id` referenced by `aria-labelledby`)                                                                                                                               | K44. Task 9: "name the repo/branch/author Dropdown opener buttons with the existing toolbar text" |
| TC-412  | Structure of `#showRemoteBranchesControl`                                                              | Normal - label and DOM order of the remote checkbox                        | The children of `label#showRemoteBranchesControl` are, in order, `input#showRemoteBranchesCheckbox[type="checkbox"][value="1"][checked]` → `span.customCheckbox` → the text `hostT("Show Remote Branches")`, the same order as before the change                                                                                                                     | K44. "Keep the label and DOM order of the remote checkbox"                                        |
| TC-413  | Order of the child elements of `#controls`                                                             | Normal - toolbar DOM order                                                 | The order is `#repoControl` → `#branchControl` → `#authorControl` → `#showRemoteBranchesControl` → `#branchCleanupBtn` → `#searchBtn` → `#fetchBtn` → `#currentBtn` → `#refreshBtn`, and there are 0 elements with a `tabindex` attribute inside `#controls` (no positive tabindex, order follows the DOM)                                                           | K44 / R4.3                                                                                        |
| TC-414  | Attributes of `#commitTable`                                                                           | Normal - list name                                                         | `aria-label` is the return value of `hostT("Commit history")`                                                                                                                                                                                                                                                                                                        | K44 / K45                                                                                         |
| TC-415  | Notice element around `#content` / `#scrollContainer`                                                  | Normal - separate status element                                           | There is exactly 1 element with `role="status"` and `aria-live="polite"`, its name is `hostT("Git Keizu status")`, it is not a descendant of `#commitGraph` / `#commitTable`, and `#commitGraph` and `#commitTable` themselves have no `aria-live`                                                                                                                   | K44 / R4.8 "Do not make re-rendering the whole graph re-read as a live region"                    |
| TC-416  | Compare the set of `id`s in the whole generated HTML with the one before the change                    | Validation - keeping existing IDs                                          | All existing IDs remain (`repoSelect` / `branchSelect` / `authorSelect` / `showRemoteBranchesCheckbox` / `branchCleanupBtn` / `searchBtn` / `fetchBtn` / `currentBtn` / `refreshBtn` / `branchCleanupPanel` / `scrollContainer` / `scrollShadow` / `content` / `commitGraph` / `commitTable` / `footer` / `dialogBacking` / `dialog`), and there are 0 duplicate IDs | Task 9: "keep existing IDs"                                                                       |
| TC-417  | JSON of `viewState` and `contributes.configuration` of `package.json`                                  | Validation - fixed viewState keys and setting count                        | The keys of `viewState` include `worktreePath`, and the number of `git-keizu.*` settings is 33 (including `worktreePathTemplate`)                                                                                                                                                                                                                                    | §3.1 / R6                                                                                         |

### Failure-source inventory (include-or-justify) — added by Feature 061-05 (S42)

| Failure source                                       | Covering case or reason for exclusion                              |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| Toolbar items are not buttons or have no name        | TC-410                                                             |
| Dropdown opener button names are not passed          | TC-411                                                             |
| Label / order of the remote checkbox changes         | TC-412                                                             |
| DOM order, positive tabindex                         | TC-413                                                             |
| Missing list name or status element, graph made live | TC-414, TC-415                                                     |
| Existing IDs lost or duplicated                      | TC-416                                                             |
| Settings or protocol messages added                  | TC-417                                                             |
| External dependencies, exceptions                    | excluded(HTML generation is string assembly and `hostT` is mocked) |

### Task 12 test mapping (Feature 061-05) — S42

- This section was replaced by S43 (only TC-411 changed its contract. The other cases carry over to S43; for the test method mapping see "Task 12 test mapping" in S43)

## S43: Toolbar buttons, labels, DOM order, list name and status notice element in the host-generated HTML (Dropdown names from the webview dictionary)

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: S42
> Signature: HTML inside `#controls` of `private getHtmlForWebview(...)` (`#branchCleanupBtn` / `#searchBtn` / `#fetchBtn` / `#currentBtn` / `#refreshBtn` via `toolbarButton(id, name)`, the `span.unselectable` label text of `#repoControl` / `#branchControl` / `#authorControl` placed next to `div.dropdown`, and `#showRemoteBranchesControl`) / `#commitTable[aria-label=hostT("Commit history")]` / `#statusNotice[role="status"][aria-live="polite"][aria-label=hostT("Git Keizu status")]`
> Target Path: `src/gitGraphView.ts:755-851, 1086-1088` (`#controls` 798-806, `#statusNotice` 809, `#commitTable` 814 of `getHtmlForWebview()`, and `toolbarButton()`)
> Test File: `tests/src/gitGraphView.test.ts`

S42 TC-411 was a contract in which the host passes the Dropdown opener button names through `data-label` / `aria-labelledby`. Task 9 instead names the opener buttons through the `label` argument of the webview-side `Dropdown` (webview dictionary entries such as `t("toolbar.repo")`), and the host only keeps placing the `span.unselectable` display text next to `div.dropdown` as before (`web/dropdown-test.md` S11 TC-039 verifies that the name exists). This section replaces TC-411, and S42 TC-410 and TC-412 to TC-417 carry over with unchanged expected results (the tests keep the same Case IDs and stay in describe `GitKeizuView host HTML toolbar buttons, list name and status notice (S42)`).

| Case ID | Input / Precondition                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                     | Notes                                                                                                         |
| ------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| TC-418  | HTML around `#repoControl` / `#branchControl` / `#authorControl` | Normal - label text next to its mount                                      | Each wrapper has a `span.unselectable` (text `hostT("Repo:")` / `hostT("Branches:")` / `hostT("Authors:")`) and a `div.dropdown` (`#repoSelect` / `#branchSelect` / `#authorSelect`), and the host adds no `data-label` / `aria-labelledby`. The opener button name comes from the webview side (`web/dropdown-test.md` S11 TC-039) | Replaces S42 TC-411 (K44). Task 9 "name them with the existing toolbar text" is met by the webview dictionary |

### Failure-source inventory (include-or-justify) — added by Feature 061-05 (S43)

| Failure source                                           | Covering case or reason for exclusion                                  |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| Label text lost, separated from its mount                | TC-418                                                                 |
| Toolbar buttons, order, list name, status, IDs, settings | Carried-over S42 TC-410, TC-412 to TC-417 (expected results unchanged) |
| External dependencies, exceptions                        | excluded(HTML generation is string assembly and `hostT` is mocked)     |

### Task 12 test mapping (Feature 061-05) — S43

- TC-418: `tests/src/gitGraphView.test.ts` `keeps the dropdown labels next to their mounts (TC-411)` (the `// Case:` comment keeps the old ID and refers to this section)
- Carried over: TC-410 `renders the five toolbar actions as named standard buttons` / TC-412 `keeps the remote checkbox label structure and order` / TC-413 `orders the toolbar children per R4.3 without any tabindex` / TC-414 `names the commit list` / TC-415 `places one polite status element outside the graph and the list` / TC-416 `keeps every existing id and never duplicates one` / TC-417 `includes worktreePath in viewState and worktreePathTemplate in configuration`
- Execution result (2026-10-07): 8 pass
