# Test Perspectives: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-03-22T14:25:09Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: compare-find

## S5: Compare mode state transitions

> Origin: Feature 002 (menubar-search-diff) Task 4.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                              | Notes                                                 |
| ------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| TC-030  | Plain click (no modifier key)                                                                         | Normal - standard                                                          | Commit details are shown (existing behavior kept)                                                            | -                                                     |
| TC-031  | expandedCommit is set + Ctrl+click on another commit                                                  | Normal - standard                                                          | Enters compare mode. compareCommits is sent with the older commit as fromHash and the newer commit as toHash | Bug fix 52a5aa8: added ordering guarantee             |
| TC-032  | Compare mode + Ctrl+click on the same compare target                                                  | Normal - standard                                                          | Compare mode ends and compareWithHash returns to null                                                        | -                                                     |
| TC-033  | Compare mode + Ctrl+click on another commit                                                           | Normal - standard                                                          | The compare target changes. compareCommits is sent with the older commit as fromHash                         | Bug fix 52a5aa8: added ordering guarantee             |
| TC-034  | Compare mode + plain click (no modifier key)                                                          | Normal - standard                                                          | Compare mode ends + details of the new commit are shown                                                      | -                                                     |
| TC-035  | No expandedCommit + Ctrl+click                                                                        | Boundary - no expanded                                                     | Normal details view (does not enter compare mode)                                                            | REQ-2.7 constraint                                    |
| TC-036  | Uncommitted changes row expanded + Ctrl+click on a commit row                                         | Boundary - uncommitted expanded                                            | A compareCommits message is sent with fromHash=UNCOMMITTED_CHANGES_HASH, toHash=the commit hash              | getCommitOrder pins UNCOMMITTED_CHANGES_HASH to from  |
| TC-037  | ResponseCompareCommits received (with fileChanges)                                                    | Normal - standard                                                          | The compare header and the file list are shown                                                               | -                                                     |
| TC-038  | ResponseCompareCommits received (fileChanges: null)                                                   | Exception - handled error                                                  | showErrorDialog is called                                                                                    | -                                                     |
| TC-039  | File click in compare mode                                                                            | Normal - standard                                                          | The viewDiff message includes compareWithHash                                                                | -                                                     |
| TC-040  | fromHash/toHash of ResponseCompareCommits are in reverse order of expandedCommit.hash/compareWithHash | Normal - reorder tolerance                                                 | Shown correctly (set comparison, order does not matter)                                                      | Bug fix 52a5aa8: handles reordering by getCommitOrder |
| TC-041  | loadCommits received while the uncommitted changes row is expanded (table re-render)                  | Normal - re-render                                                         | srcElem is looked up again and the expanded state is kept                                                    | Bug fix 27d2b61: extended selector                    |
| TC-042  | Commit expanded + Ctrl+click on the uncommitted changes row                                           | Normal - standard                                                          | Enters compare mode. Sent with fromHash=UNCOMMITTED_CHANGES_HASH, toHash=the expanded commit                 | getCommitOrder pins UNCOMMITTED_CHANGES_HASH to from  |
| TC-043  | Comparing with the uncommitted changes row + Ctrl+click on the same uncommitted row                   | Normal - toggle off                                                        | Compare mode ends. The original commit details are shown again                                               | -                                                     |
| TC-044  | Plain click on the uncommitted changes row (no expanded commit)                                       | Normal - non-modifier                                                      | A normal commitDetails request is sent (does not enter compare mode)                                         | Existing behavior kept                                |

## S6: FindWidget integration

> Origin: Feature 002 (menubar-search-diff) Task 4.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                           | Notes                  |
| ------- | ------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------- |
| TC-045  | Ctrl/Cmd+F key pressed                           | Normal - standard                                                          | FindWidget.show() is called                               | -                      |
| TC-046  | Search button click                              | Normal - standard                                                          | FindWidget.show() is called                               | -                      |
| TC-047  | saveState() call                                 | Normal - standard                                                          | findWidgetState is included in WebViewState               | -                      |
| TC-048  | restoreState (with findWidgetState)              | Normal - standard                                                          | FindWidget.restoreState() is called                       | -                      |
| TC-049  | restoreState (no findWidgetState, older version) | Boundary - backward compat                                                 | FindWidget is initialized in the default state (no error) | Backward compatibility |

## S19: Parents link navigation

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                | Notes                     |
| ------- | -------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------- |
| TC-118  | The commit has one parent hash               | Normal - standard                                                          | Shown as a span element with the parentHash class. The data-hash attribute holds the full hash | Clickable                 |
| TC-119  | Display of the parent hash                   | Normal - standard                                                          | Shown shortened to 8 characters                                                                | abbrevCommit() pattern    |
| TC-120  | parent hash click (the commit is loaded)     | Normal - standard                                                          | Scrolls to the commit row and shows the commit details                                         | Calls loadCommitDetails   |
| TC-121  | parent hash click (the commit is not loaded) | Boundary - not found                                                       | Nothing happens (no error shown)                                                               | Fails silently            |
| TC-122  | Merge commit (two parents)                   | Normal - multiple                                                          | Both parent hashes are shown as links                                                          | Supports multiple parents |
