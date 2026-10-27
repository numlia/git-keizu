# Test Perspectives: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-03-22T14:25:09Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: state-response

## S4: Fetch button

> Origin: Feature 001 (menu-bar-enhancement) Task 6.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                | Notes                             |
| ------- | ----------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------- |
| TC-027  | Click the fetch button                    | Normal - standard                                                          | A fetch message containing currentRepo is sent                 | Verifies the postMessage call     |
| TC-028  | fetch response status === null            | Normal - standard                                                          | The graph is refreshed automatically (refresh(true) is called) | -                                 |
| TC-029  | fetch response status === "error message" | Exception - handled error                                                  | An error dialog is shown                                       | Verifies the showErrorDialog call |

## S13: Automatic loading (observeWebviewScroll extension)

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                              | Notes                        |
| ------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------- |
| TC-092  | scrollTop+clientHeight >= scrollHeight-25, config=true, moreAvailable=true, isLoading=false | Normal - standard                                                          | Loading fires: isLoadingMoreCommits=true, maxCommits increases, requestLoadCommits is called | All guard conditions met     |
| TC-093  | config.loadMoreCommitsAutomatically=false                                                   | Validation - config disabled                                               | Automatic loading does not fire                                                              | When the setting is disabled |
| TC-094  | moreCommitsAvailable=false                                                                  | Boundary - no more commits                                                 | Automatic loading does not fire                                                              | All commits already loaded   |
| TC-095  | isLoadingMoreCommits=true (loading)                                                         | Boundary - already loading                                                 | Automatic loading does not fire (prevents double firing)                                     | Guard condition              |
| TC-096  | Scroll position is 26px or more from the end                                                | Boundary - threshold not met                                               | Automatic loading does not fire                                                              | Threshold not reached        |
| TC-097  | Scroll position is exactly 25px from the end                                                | Boundary - exact threshold                                                 | Automatic loading fires                                                                      | Exactly at the boundary      |
| TC-098  | The load completion callback runs                                                           | Normal - completion                                                        | isLoadingMoreCommits is reset to false                                                       | State restored               |

## S14: selectRepo() selects a repository

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**Signature**: `selectRepo(repo: string): void`
**Target path**: `web/main.ts`

| Case ID | Input / Precondition            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                      | Notes              |
| ------- | ------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------ |
| TC-099  | repo exists in gitRepos         | Normal - standard                                                          | currentRepo is set, repoDropdown is updated, refresh(true) is called | Normal selection   |
| TC-100  | repo does not exist in gitRepos | Boundary - unknown repo                                                    | Nothing happens (silently)                                           | Unknown repository |

## S16: Author Dropdown UI

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: superseded
> Supersedes: -
> Superseded By: S42

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                         | Notes                        |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------- |
| TC-107  | A loadCommits response is received (authorFilter not set)    | Normal - standard                                                          | Unique Author names are extracted from commits[].author, sorted and set in the Dropdown | Building the initial list    |
| TC-108  | Select Author "Alice"                                        | Normal - standard                                                          | A loadCommits message containing authorFilter: "Alice" is sent                          | Filter request               |
| TC-109  | Select "All Authors"                                         | Normal - standard                                                          | A loadCommits message without authorFilter is sent (all commits shown)                  | Filter cleared               |
| TC-110  | A loadCommits response is received while authorFilter is set | Normal - filtered                                                          | The Author Dropdown list is not updated (the initial list is kept)                      | List stability               |
| TC-111  | commits have 0 Authors (empty commit array)                  | Boundary - empty                                                           | The Dropdown shows only "All Authors"                                                   | Empty repository and similar |

## S21: loadCommits() supports an Author list provided by the server

> Origin: Feature 011 (author-filter-fix) (aidd-spec-tasks-test)
> Added: 2026-03-05
> Status: superseded
> Supersedes: -
> Superseded By: S42

**Signature**: `public loadCommits(commits, commitHead, moreAvailable, hard, authors?)`
**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                | Notes                                               |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| TC-129  | authorFilter=null, authors=["Alice","Bob"]                     | Normal - standard                                                          | The dropdown is updated with the authors list (provided by the server)                                         | Uses the list sorted on the server as is            |
| TC-130  | authorFilter=null, authors=undefined                           | Normal - fallback                                                          | Authors are extracted from commits, deduplicated and sorted, and the dropdown is updated (the previous method) | Confirms the fallback behavior                      |
| TC-131  | authorFilter=null, authors=[]                                  | Boundary - empty authors                                                   | The dropdown shows only "All Authors"                                                                          | Cases such as an empty repository                   |
| TC-132  | authorFilter="Alice", authors=["Alice","Bob"]                  | Normal - filtered                                                          | The dropdown update is skipped (because authorFilter !== null)                                                 | Keeps the list stable while a filter is selected    |
| TC-133  | authorFilter=null, authors=["Charlie","Alice","Bob"] (ordered) | Normal - order                                                             | authors is set in the dropdown as is (not re-sorted on the client)                                             | Design that trusts the order provided by the server |

## S22: Branch multi-select state management

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                 | Notes               |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------- |
| TC-134  | Initial state (selectedBranches not set)                  | Normal - standard                                                          | selectedBranches is an empty array [] (equivalent to "Show All")                | Default value       |
| TC-135  | ["main", "dev"] is passed to the Branch dropdown callback | Normal - standard                                                          | selectedBranches is updated to ["main", "dev"] and requestLoadCommits is called | Multiple selection  |
| TC-136  | [] is passed to the Branch dropdown callback              | Normal - standard                                                          | selectedBranches is updated to [] and requestLoadCommits is called              | "Show All" selected |
| TC-137  | requestLoadCommits is called (selectedBranches=["main"])  | Normal - standard                                                          | The sent message contains branches: ["main"]                                    | Array parameter     |
| TC-138  | requestLoadCommits is called (selectedBranches=[])        | Boundary - empty                                                           | The sent message contains branches: []                                          | All branches shown  |

## S23: Author multi-select state management

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: superseded
> Supersedes: -
> Superseded By: S42

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                 | Notes                                  |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------- |
| TC-139  | Initial state (selectedAuthors not set)                    | Normal - standard                                                          | selectedAuthors is an empty array [] (equivalent to "Show All")                 | Default value                          |
| TC-140  | ["Alice", "Bob"] is passed to the Author dropdown callback | Normal - standard                                                          | selectedAuthors is updated to ["Alice", "Bob"] and requestLoadCommits is called | Multiple selection                     |
| TC-141  | [] is passed to the Author dropdown callback               | Normal - standard                                                          | selectedAuthors is updated to [] and requestLoadCommits is called               | "Show All" selected                    |
| TC-142  | requestLoadCommits is called (selectedAuthors=["Alice"])   | Normal - standard                                                          | The sent message contains authors: ["Alice"]                                    | Array parameter                        |
| TC-143  | loadCommits is received (selectedAuthors=[])               | Normal - standard                                                          | The Author dropdown is updated with the received author list                    | Empty array = no filter                |
| TC-144  | loadCommits is received (selectedAuthors=["Alice"])        | Normal - filtered                                                          | The Author dropdown is not updated (list stability kept)                        | Not updated while a filter is selected |

## S24: Backward-compatible WebViewState migration

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                  | Notes               |
| ------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------- |
| TC-145  | getState returns the old format (currentBranch: "main")       | Normal - migration                                                         | selectedBranches is converted to ["main"]                        | string → [string]   |
| TC-146  | getState returns the old format (currentBranch: null)         | Boundary - null migration                                                  | selectedBranches is converted to []                              | null → []           |
| TC-147  | getState returns the old format (authorFilter: "Alice")       | Normal - migration                                                         | selectedAuthors is converted to ["Alice"]                        | string → [string]   |
| TC-148  | getState returns the old format (authorFilter: null)          | Boundary - null migration                                                  | selectedAuthors is converted to []                               | null → []           |
| TC-149  | getState returns the new format (selectedBranches: ["a","b"]) | Normal - new format                                                        | selectedBranches is used as is as ["a","b"]                      | No migration needed |
| TC-150  | setState is called                                            | Normal - standard                                                          | selectedBranches and selectedAuthors are saved in the new format | -                   |

## S25: Branch dropdown constants

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                               | Notes                      |
| ------- | ------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------- |
| TC-151  | ALL_BRANCHES_LABEL constant           | Normal - standard                                                          | The value equals "Show All"                                   | Removes a magic string     |
| TC-152  | ALL_BRANCHES_VALUE constant           | Normal - standard                                                          | The value equals ""                                           | Removes a magic string     |
| TC-153  | REMOTE_BRANCH_PREFIX constant         | Normal - standard                                                          | The value equals "remotes/"                                   | Removes a magic string     |
| TC-154  | Substring handling of remote branches | Normal - standard                                                          | REMOTE_BRANCH_PREFIX.length is used as the substring argument | Removes the magic number 8 |

## S26: Branch consistency check on the loadBranches response

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                            | Notes                    |
| ------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------ |
| TC-155  | selectedBranches=["main","dev"], both exist in gitBranches              | Normal - standard                                                          | selectedBranches stays ["main","dev"]                                      | Consistent               |
| TC-156  | selectedBranches=["main","deleted-branch"], "deleted-branch" is missing | Normal - removed                                                           | selectedBranches is filtered to ["main"]                                   | Removed branches dropped |
| TC-157  | None of selectedBranches exist in gitBranches (all removed)             | Boundary - all removed                                                     | The HEAD branch or an empty array, depending on showCurrentBranchByDefault | Fallback                 |

## S27: saveState() saves scrollTop

> Origin: Feature 013 (scroll-position-restore) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**Signature**: `private saveState(): void`
**Target path**: `web/main.ts:526-542`

| Case ID | Input / Precondition                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                | Notes        |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- | ------------ |
| TC-158  | saveState() is called with scrollContainerElem.scrollTop = 500 | Normal - standard                                                          | The saved state object contains scrollTop: 500 | -            |
| TC-159  | saveState() is called with scrollContainerElem.scrollTop = 0   | Boundary - zero                                                            | The saved state object contains scrollTop: 0   | Top position |

## S28: Restoring scrollTop from prevState

> Origin: Feature 013 (scroll-position-restore) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**Target path**: `web/main.ts:222-260`

| Case ID | Input / Precondition                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                             | Notes                  |
| ------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| TC-160  | prevState.scrollTop = 300, the repository is valid            | Normal - standard                                                          | scrollContainerElem.scrollTop is set to 300                 | -                      |
| TC-161  | prevState.scrollTop is undefined (data from an older version) | Boundary - backward compat                                                 | scrollContainerElem.scrollTop is not changed (stays 0)      | Backward compatibility |
| TC-162  | prevState is null (first display)                             | Boundary - no prevState                                                    | Restoring scrollTop is skipped                              | New window             |
| TC-163  | prevState.scrollTop = 0                                       | Boundary - zero value                                                      | scrollContainerElem.scrollTop is set to 0 (explicitly zero) | Saved value is zero    |

## S29: setShowRecentActions() runtime sync

> Origin: Feature 039 (show-recent-actions-runtime-sync) (light-spec-plan)
> Added: 2026-05-10
> Status: active
> Supersedes: -

**Signature**: `public setShowRecentActions(showRecentActions: boolean): void`
**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                                                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                         | Notes                                          |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| TC-214  | Call `setShowRecentActions(false)` with `viewState.showRecentActions = true`. currentRepo / scrollTop / expandedCommit / repos are set beforehand | Normal - standard                                                          | `viewState.showRecentActions` is updated to `false`. None of `vscode.setState` / `requestLoadCommits` / `refresh` / `renderShowLoading` / `currentRepo` / `viewState.repos` / scroll position / `expandedCommit` change | Verifies that only the runtime flag is updated |
| TC-215  | Call `setShowRecentActions(true)` with `viewState.showRecentActions = false`                                                                      | Normal - standard                                                          | `viewState.showRecentActions` is updated to `true`. No other state changes or side effects occur                                                                                                                        | Switching back to shown uses the same path     |
