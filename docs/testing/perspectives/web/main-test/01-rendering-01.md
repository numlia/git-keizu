# Test Perspectives: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-03-22T14:25:09Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: rendering

## S1: Rendering stash rows (row structure and labels)

> Origin: Feature 001 (menu-bar-enhancement) Task 3.4
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                     | Notes                     |
| ------- | ----------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------- |
| TC-001  | A commit node with commit.stash !== null        | Normal - standard                                                          | The row element's CSS classes include both `"commit"` and `"stash"` | -                         |
| TC-002  | commit.stash.selector is `"stash@{0}"`          | Normal - standard                                                          | The label shows `"@{0}"` (the "stash" prefix is removed)            | selector.substring(5)     |
| TC-003  | commit.stash.selector is `"stash@{12}"`         | Boundary - multi-digit index                                               | The label shows `"@{12}"`                                           | Two-digit index           |
| TC-004  | A commit node with commit.stash !== null        | Normal - standard                                                          | The data-hash attribute is set to the stash's commit hash           | -                         |
| TC-005  | A normal commit node with commit.stash === null | Normal - non-stash                                                         | The row element's CSS classes do not include `"stash"`              | Existing behavior is kept |

## S7: calculateCdvHeight() computing the CDV height

> Origin: Feature 004 (webview-ux-polish) (aidd-spec-tasks-test)
> Added: 2026-02-26
> Status: active
> Supersedes: -

**Signature**: `private calculateCdvHeight(): number`
**Target path**: `web/main.ts`

| Case ID | Input / Precondition                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                   | Notes                                          |
| ------- | ------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------- |
| TC-050  | innerHeight=800, controlsHeight=50   | Normal - standard                                                          | 250 (CDV_DEFAULT_HEIGHT)                          | available=695 > 250                            |
| TC-051  | innerHeight=355, controlsHeight=50   | Boundary - available == default                                            | 250                                               | available=250, exactly at the boundary         |
| TC-052  | innerHeight=354, controlsHeight=50   | Boundary - available == default-1                                          | 249                                               | available=249 < 250                            |
| TC-053  | innerHeight=205, controlsHeight=50   | Boundary - available == min                                                | 100 (CDV_MIN_HEIGHT)                              | available=100, exactly at the minimum boundary |
| TC-054  | innerHeight=204, controlsHeight=50   | Boundary - available == min-1                                              | 100 (CDV_MIN_HEIGHT)                              | available=99 → clamped to 100                  |
| TC-055  | innerHeight=0                        | Boundary - zero viewport                                                   | 100 (CDV_MIN_HEIGHT)                              | Negative available → clamped to 100            |
| TC-056  | The #controls element does not exist | Boundary - missing element                                                 | Computed from the whole viewport minus the margin | controlsHeight=0 fallback                      |

## S8: showCommitDetails() applying the CDV height and controlling scroll

> Origin: Feature 004 (webview-ux-polish) (aidd-spec-tasks-test)
> Added: 2026-02-26
> Status: active
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                   | Notes                                   |
| ------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------- |
| TC-057  | The CDV fits fully inside the viewport (offsetTop > scrollTop, offsetTop + expandY < scrollTop + viewHeight)          | Normal - standard                                                          | scrollTop does not change                                                         | Scroll position kept                    |
| TC-058  | The top of the CDV is above the viewport (offsetTop - CDV_SCROLL_PADDING < scrollTop)                                 | Normal - top overflow                                                      | scrollTop = offsetTop - CDV_SCROLL_PADDING                                        | Scrolls when it overflows at the top    |
| TC-059  | The bottom of the CDV is below the viewport (offsetTop + expandY + CDV_SCROLL_BOTTOM_OFFSET > scrollTop + viewHeight) | Normal - bottom overflow                                                   | scrollTop = offsetTop + expandY - viewHeight + CDV_SCROLL_BOTTOM_OFFSET           | Scrolls when it overflows at the bottom |
| TC-060  | Call showCommitDetails()                                                                                              | Normal - standard                                                          | The CDV element's style.height is set to the result of calculateCdvHeight() in px | Dynamic height applied                  |
| TC-061  | Call showCommitDetails()                                                                                              | Normal - standard                                                          | renderGraph() is called after the CDV height is applied                           | Drawing coordinates updated             |

## S9: updateCommitDetailsHeight() handling resize

> Origin: Feature 004 (webview-ux-polish) (aidd-spec-tasks-test)
> Added: 2026-02-26
> Status: active
> Supersedes: -

**Signature**: `private updateCommitDetailsHeight(): void`
**Target path**: `web/main.ts`

| Case ID | Input / Precondition                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                      | Notes                                      |
| ------- | -------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------ |
| TC-062  | CDV shown + resize event (outer dimensions change) | Normal - standard                                                          | The CDV height is recalculated and style.height updated, and renderGraph() is called | -                                          |
| TC-063  | CDV hidden + resize event                          | Normal - no CDV                                                            | The CDV height does not change, and existing behavior is kept                        | expandedCommit === null                    |
| TC-064  | CDV shown + inner resize (outer unchanged)         | Normal - inner resize                                                      | The CDV height is recalculated and updated (handles panel width changes)             | Existing renderGraph behavior + CDV update |

## S15: Switching the file list view (Tree/List toggle)

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                | Notes                    |
| ------- | ------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------ |
| TC-101  | Click the toggle with fileViewType="tree"              | Normal - standard                                                          | fileViewType changes to "list", and the flat list rendering function is called | tree → list              |
| TC-102  | Click the toggle with fileViewType="list"              | Normal - standard                                                          | fileViewType changes to "tree", and the tree rendering function is called      | list → tree              |
| TC-103  | After clicking the toggle                              | Normal - standard                                                          | A saveRepoState message containing the new fileViewType is sent                | Persistence              |
| TC-104  | Initial display: GitRepoState.fileViewType = "list"    | Normal - standard                                                          | The initial render is the list view                                            | Restores the saved value |
| TC-105  | Initial display: GitRepoState.fileViewType = undefined | Boundary - default                                                         | The initial render is the tree view (same as the current behavior)             | Default value            |
| TC-106  | Display of the toggle icon                             | Normal - standard                                                          | The icon for the current mode is shown (Tree icon or List icon)                | Visual feedback          |

## S17: Commit details display improvements

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                    | Notes                          |
| ------- | --------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------ |
| TC-112  | Commit details are shown          | Normal - standard                                                          | Display order: Commit → Parents → Author → Committer → Date        | Display order changed          |
| TC-113  | Committer has committerEmail set  | Normal - standard                                                          | Shown in the form "Committer: {name} <{email}>" with a mailto link | Same format as the Author line |
| TC-114  | committerEmail is an empty string | Boundary - empty email                                                     | Only the committer name is shown (the email part is omitted)       | Defensive display              |

## S20: renderTable() generating the commitMessage wrapper

> Origin: Feature 010 (mute-branch-label-fix) (aidd-spec-tasks-test)
> Added: 2026-03-05
> Status: active
> Supersedes: -

**Signature**: `private renderTable(): void`
**Target path**: `web/main.ts:610`

| Case ID | Input / Precondition                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                    | Notes                                |
| ------- | ------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------ |
| TC-123  | Row HTML for a normal commit (mute=false)         | Normal - standard                                                          | The message text is wrapped in `<span class="commitMessage">`      | Applies to every commit row          |
| TC-124  | Row HTML for a muted commit (mute=true)           | Normal - muted                                                             | The message text is wrapped in `<span class="commitMessage">`      | Works with CSS for the muted display |
| TC-125  | Row HTML for the commit matching currentHash      | Normal - current                                                           | In the form `<span class="commitMessage"><b>メッセージ</b></span>` | bold is inside the wrapper           |
| TC-126  | Row HTML for a commit not matching currentHash    | Normal - standard                                                          | In the form `<span class="commitMessage">メッセージ</span>`        | plain text                           |
| TC-127  | Row HTML for a commit with reference labels       | Normal - with refs                                                         | The `.gitRef` span is outside (right before) `.commitMessage`      | Labels are outside the wrapper       |
| TC-128  | Row HTML for the HEAD commit (with commitHeadDot) | Normal - HEAD                                                              | The `.commitHeadDot` span is outside `.commitMessage`              | The HEAD dot is outside the wrapper  |

## S35: Rendering the worktree icon and data attributes

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: superseded
> Supersedes: -
> Superseded By: S48

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                           | Notes               |
| ------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------- |
| TC-194  | A label whose branch name exists in worktreeMap                                               | Normal - standard                                                          | The span includes the worktree CSS class, the data-worktree-path attribute, and the worktree icon element | REQ-2.1             |
| TC-195  | A label whose branch name does not exist in worktreeMap                                       | Normal - no worktree                                                       | Rendered as before (no worktree CSS class, no icon)                                                       | REQ-2.1-TC2         |
| TC-196  | The title attribute of the worktree icon                                                      | Normal - standard                                                          | title="Worktree: <path>" is set                                                                           | REQ-2.2             |
| TC-197  | The worktree path contains HTML special characters (for example a path containing `<script>`) | Boundary - XSS prevention                                                  | The data-worktree-path value has escapeHtml() applied                                                     | Security            |
| TC-198  | A remote branch (even if worktreeMap has an entry)                                            | Normal - exclusion                                                         | The worktree icon is not shown                                                                            | REQ-2.1-TC3         |
| TC-199  | Passing worktreeInfo to the context menu (with a worktree)                                    | Normal - standard                                                          | worktreeInfo contains path and isMainWorktree                                                             | REQ-2.3             |
| TC-200  | Passing worktreeInfo to the context menu (without a worktree)                                 | Normal - null                                                              | worktreeInfo is null                                                                                      | REQ-2.3             |
| TC-201  | worktreeMap is an empty object                                                                | Boundary - empty map                                                       | All branch labels are rendered as before (no worktree-related display)                                    | Backward compatible |
