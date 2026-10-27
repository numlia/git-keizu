# Test Perspectives: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-03-22T14:25:09Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: context-menu

## S2: Stash context menu

> Origin: Feature 001 (menu-bar-enhancement) Task 4.4
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                           | Notes                                 |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| TC-006  | Right-click on a commit row with stash !== null            | Normal - standard                                                          | The stash-specific context menu is shown (7 elements: Apply, Pop, separator, More (Create Branch, Drop), separator, Copy Name, Copy Hash) | It must not be the normal commit menu |
| TC-007  | Select "Apply Stash..." from the menu                      | Normal - standard                                                          | A checkbox dialog ("Reinstate Index", default false) is shown                                                                             | -                                     |
| TC-008  | Confirm the Apply dialog with Reinstate Index ON           | Normal - with option                                                       | An applyStash message is sent with reinstateIndex: true                                                                                   | -                                     |
| TC-009  | Confirm the Apply dialog with Reinstate Index OFF          | Normal - standard                                                          | An applyStash message is sent with reinstateIndex: false                                                                                  | -                                     |
| TC-010  | Select "Pop Stash..." from the menu and confirm            | Normal - standard                                                          | A popStash message is sent                                                                                                                | Same dialog pattern as Apply          |
| TC-011  | Select "Drop Stash..." from the menu                       | Normal - standard                                                          | A confirmation dialog (delete confirmation) is shown                                                                                      | -                                     |
| TC-012  | Confirm the Drop confirmation dialog                       | Normal - standard                                                          | A dropStash message is sent                                                                                                               | -                                     |
| TC-013  | Select "Create Branch from Stash..." from the menu         | Normal - standard                                                          | A ref name input dialog (with validation) is shown                                                                                        | refInvalid validation                 |
| TC-014  | Enter a valid branch name in the Branch dialog and confirm | Normal - standard                                                          | A branchFromStash message is sent                                                                                                         | -                                     |
| TC-015  | Select "Copy Stash Name to Clipboard" from the menu        | Normal - standard                                                          | A copyToClipboard message is sent with type: "Stash Name", data: selector                                                                 | No dialog                             |
| TC-016  | Select "Copy Stash Hash to Clipboard" from the menu        | Normal - standard                                                          | A copyToClipboard message is sent with type: "Stash Hash", data: hash                                                                     | No dialog                             |

## S3: Uncommitted Changes context menu

> Origin: Feature 001 (menu-bar-enhancement) Task 5.4
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                           | Notes             |
| ------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------- |
| TC-017  | Right-click on the Uncommitted Changes row                                       | Normal - standard                                                          | The Uncommitted-specific context menu is shown (Stash, Reset, Clean)      | -                 |
| TC-018  | Select "Stash uncommitted changes..." from the menu                              | Normal - standard                                                          | A form dialog (message input + Include Untracked checkbox) is shown       | -                 |
| TC-019  | Enter a message in the Stash dialog + confirm with Include Untracked ON          | Normal - standard                                                          | A pushStash message is sent with message and includeUntracked: true       | -                 |
| TC-020  | Leave the message empty in the Stash dialog + confirm with Include Untracked OFF | Boundary - empty message                                                   | A pushStash message is sent with message: "" and includeUntracked: false  | No --message flag |
| TC-021  | Select "Reset uncommitted changes..." from the menu                              | Normal - standard                                                          | A selection dialog (Mixed / Hard) is shown                                | -                 |
| TC-022  | Select Mixed in the Reset dialog and confirm                                     | Normal - standard                                                          | A resetUncommitted message is sent with mode: "mixed"                     | -                 |
| TC-023  | Select Hard in the Reset dialog and confirm                                      | Normal - standard                                                          | A resetUncommitted message is sent with mode: "hard"                      | -                 |
| TC-024  | Select "Clean untracked files..." from the menu                                  | Normal - standard                                                          | A checkbox dialog ("Clean untracked directories", default false) is shown | -                 |
| TC-025  | Confirm the Clean dialog with directories ON                                     | Normal - with option                                                       | A cleanUntrackedFiles message is sent with directories: true              | -                 |
| TC-026  | Confirm the Clean dialog with directories OFF                                    | Normal - standard                                                          | A cleanUntrackedFiles message is sent with directories: false             | -                 |

## S12: handleEscape() step-by-step UI dismissal chain

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: superseded
> Superseded By: S72（[13-keyboard-accessibility-01.md](13-keyboard-accessibility-01.md)）
> Supersedes: -

**Signature**: `handleEscape(): void`
**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                     | Notes               |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- | ------------------- |
| TC-083  | Context menu is shown                                | Normal - priority 1                                                        | Only hideContextMenu() is called                    | Highest priority    |
| TC-084  | Dialog is shown (no context menu)                    | Normal - priority 2                                                        | Only hideDialog() is called                         | -                   |
| TC-085  | repoDropdown is open (no menu/dialog)                | Normal - priority 3                                                        | Only repoDropdown.close() is called                 | -                   |
| TC-086  | branchDropdown is open (repoDropdown closed)         | Normal - priority 3 alt                                                    | Only branchDropdown.close() is called               | repo→branch order   |
| TC-087  | Both dropdowns are open                              | Normal - both open                                                         | Only repoDropdown.close() is called (checked first) | repo takes priority |
| TC-088  | FindWidget is shown (no menu/dialog/dropdown)        | Normal - priority 4                                                        | Only findWidget.close() is called                   | -                   |
| TC-089  | Commit details are expanded (everything else closed) | Normal - priority 5                                                        | Only hideCommitDetails() is called                  | Lowest priority     |
| TC-090  | All UI components are closed                         | Boundary - nothing active                                                  | Nothing happens                                     | -                   |
| TC-091  | Escape again after the context menu is closed        | Normal - chain progression                                                 | The component with the next priority closes         | Repeated Escape     |

## S18: data-remotes attribute

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                 | Notes                           |
| ------- | --------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------- |
| TC-115  | The branch has remotes=["origin", "upstream"] | Normal - standard                                                          | data-remotes="origin,upstream" is set on the span element                                       | Comma-separated                 |
| TC-116  | The branch has empty remotes (no remote)      | Normal - no remote                                                         | No data-remotes attribute is added to the span element                                          | The attribute itself is omitted |
| TC-117  | The contextmenu handler reads data-remotes    | Normal - standard                                                          | data-remotes is split by commas and passed to the remotes parameter of buildRefContextMenuItems | Integration check               |

## S34: Commit display order - resolving the sort order and the context menu

> Origin: Feature 015 (commit-sort-order) (aidd-spec-tasks-test)
> Added: 2026-03-10
> Status: active
> Supersedes: -

**Target path**: `web/main.ts`

| Case ID | Input / Precondition                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                          | Notes                         |
| ------- | ----------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------- |
| TC-184  | repoState.commitOrdering="topo", global="date"        | Normal - standard                                                          | The effective sort order is "topo" (repository setting takes priority)                   | REQ-9.2 override              |
| TC-185  | repoState.commitOrdering="default", global="topo"     | Normal - fallback                                                          | The effective sort order is "topo" (falls back to the global)                            | "default" uses the global     |
| TC-186  | repoState.commitOrdering=undefined, global="date"     | Normal - unset                                                             | The effective sort order is "date" (falls back to the global)                            | Fallback when unset           |
| TC-187  | repoState.commitOrdering="author-date", global="date" | Normal - standard                                                          | The effective sort order is "author-date" (repository setting takes priority)            | Checks the third option       |
| TC-188  | Initialized with viewState.commitOrdering="topo"      | Normal - init                                                              | The global default is set to "topo"                                                      | Initialization from viewState |
| TC-189  | requestLoadCommits() call                             | Normal - standard                                                          | The request message includes the effective sort order as the commitOrdering field        | Message protocol              |
| TC-190  | Right-click on the table header                       | Normal - standard                                                          | The context menu shows 3 items: "Date", "Author Date", "Topological"                     | REQ-2.2 menu layout           |
| TC-191  | The current effective sort order is "topo"            | Normal - checkmark                                                         | "Topological" shows a checkmark ("✓ " prefix)                                            | Visual identification         |
| TC-192  | Select "Author Date" in the context menu              | Normal - select                                                            | repoState.commitOrdering is updated to "author-date" and a saveRepoState message is sent | Persistence                   |
| TC-193  | Select a sort order in the context menu               | Normal - refresh                                                           | requestLoadCommits is called with a hard refresh (hard=true)                             | Applied immediately           |

## S44: Raw read of dataset.name in gitRef contextmenu/checkout

> Origin: フェーズ3 修正 L16 (ref-dataset-raw-read)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: -
> Signature: the contextmenu handler / checkout handler of `.gitRef` (including the `worktrees` lookup)
> Target Path: `web/main.ts:937-982`

A fix that removes `unescapeHtml(...)` from the reads of `dataset.name` (the ref name) in the contextmenu and checkout handlers of `.gitRef` and uses the raw value as is (5 places in total). `dataset.name` stores the raw ref name, so the old `unescapeHtml` call decoded ref names with special characters twice and broke them. The targets are (1) `refName` in contextmenu (`target.dataset.name` when `isRemoteCombined`, `sourceElem.dataset.name` otherwise), (2) the `worktrees[sourceElem.dataset.name]` lookup, (3) the ref name in both the remote-combined and local branches of checkout.

| Case ID | Input / Precondition                                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                | Notes                  |
| ------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------- |
| TC-246  | Right-click on a `.gitRef` (not remote-combined), `sourceElem.dataset.name="main"`                   | Normal - plain ref name context menu                                       | `refName` is passed to `buildRefContextMenuItems` as the raw value `"main"`                    | Normal ref name        |
| TC-247  | Right-click on an element whose ref name has special characters (e.g. `dataset.name="feat&x"`)       | Boundary - special-char ref raw                                            | `refName` is passed as the raw value `"feat&x"` (no double decoding by the old `unescapeHtml`) | Core regression of L16 |
| TC-248  | `head` and not remote-combined, `worktrees` has an entry under the raw key `sourceElem.dataset.name` | Boundary - worktree raw-key lookup                                         | `worktrees[<raw ref name>]` hits and `worktreeInfo` (path / isMainWorktree) is built           | Raw key match          |
| TC-249  | Double-click a remote-combined (`gitRefHeadRemote`) label to check out                               | Normal - checkout remote raw name                                          | `checkoutBranchAction` is called with the raw value of `target.dataset.name` and `true`        | remote-combined branch |
| TC-250  | Double-click a gitRef that is not remote-combined to check out                                       | Normal - checkout local raw name                                           | `checkoutBranchAction` is called with the raw value of `sourceElem.dataset.name`               | local branch           |
| TC-251  | Right-click a `head` ref with no matching key in `worktrees`                                         | Boundary - worktree lookup miss                                            | `worktrees[<raw ref name>]` is undefined and `worktreeInfo` stays `null` (no exception)        | Miss boundary          |

## S57: Shared ref badge right-click handling and passing values from the list

> Origin: Feature 059-02 (light-spec-plan)
> Added: 2026-09-24
> Updated: 2026-09-25
> Status: superseded
> Superseded By: S78（[13-keyboard-accessibility-02.md](13-keyboard-accessibility-02.md)）
> Supersedes: -
> Signature: `showRefBadgeContextMenu(event: MouseEvent, badge: HTMLElement): void` (shared handling for the contextmenu of inline `.gitRef` and `RefOverflowOptions.onRefContextMenu`)
> Target Path: `web/main.ts` (the shared handling extracted from `addListenerToClass("gitRef", "contextmenu", ...)` and its wiring when the controller is created. Update to a line range after implementation)
> Test File: `tests/web/main.refOverflow.test.ts`

Verifies that right-clicking an inline ref and its copy in the list go through the same shared handling and pass the same values to the existing menu builders. Item branching inside the builders belongs to `web/refMenu-test/` and `web/worktreeMenu-test.md`. TC-445 to TC-454 check that the arguments are equal using the existing menu mocks, and TC-455 uses the real contextMenu in a separate describe. `TEST_REPO = "/test/repo"`.

| Case ID | Input / Precondition                                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                 | Notes                                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| TC-445  | contextmenu on the body of the inline badge of local branch `feature/x` with a worktree (remotes `["origin"]`)      | Normal - existing arguments for an inline ref                              | `buildRefContextMenuItems` is called once with `(TEST_REPO, "feature/x", <badge>, false, gitBranchHead, ["origin"], { path, isMainWorktree })` (the third value is the badge), the 2nd argument of `showContextMenu` is the builder's return value and the 3rd is the badge                                     | Same arguments as before the refactor                                                                             |
| TC-446  | contextmenu on `.gitRefHeadRemote` (`data-name="origin/main"`) of a combined badge                                  | Normal - selecting the combined remote                                     | The builder's 2nd argument is `origin/main`, the 4th is `true`, the 7th is `null`                                                                                                                                                                                                                               | -                                                                                                                 |
| TC-447  | Search wraps the text inside `.gitRefHeadRemote` in `span.findMatch`, and contextmenu targets that `span.findMatch` | Boundary - remote inside a search mark                                     | The builder is called with the same arguments as TC-446 (not the local name `main`)                                                                                                                                                                                                                             | Treated as remote only when the nearest `.gitRefHeadRemote` is inside the badge. AC-09                            |
| TC-448  | contextmenu targeting the icon element of a combined badge, or `.gitRefName`                                        | Boundary - child elements other than the remote                            | The builder's 2nd argument is the local name `main` and the 4th is `false`                                                                                                                                                                                                                                      | -                                                                                                                 |
| TC-449  | The same ref as TC-445 is collapsed, contextmenu on its copy in the list                                            | Normal - same builder arguments from the list                              | The arguments other than the 3rd (the copy element) match TC-445 with `toEqual`, and the 3rd argument of `showContextMenu` is the copy element                                                                                                                                                                  | AC-03                                                                                                             |
| TC-450  | contextmenu on `.gitRefHeadRemote` of a combined badge copy in the list                                             | Normal - combined remote in the list                                       | The builder's 2nd argument is `origin/main` and the 4th is `true`                                                                                                                                                                                                                                               | AC-03                                                                                                             |
| TC-451  | contextmenu on a branchless worktree copy in the list (`data-worktree-path="/tmp/wt8"`)                             | Normal - detached worktree in the list                                     | `buildDetachedWorktreeContextMenuItems` is called once with `(TEST_REPO, "/tmp/wt8")`, and `buildRefContextMenuItems` 0 times                                                                                                                                                                                   | AC-03                                                                                                             |
| TC-452  | contextmenu on the tag copy `v1.0` and on the remote copy `origin/dev` in the list                                  | Normal - tag and remote in the list                                        | The builder's 2nd argument is `v1.0` / `origin/dev` respectively, and the arguments match a right-click on the same ref inline                                                                                                                                                                                  | AC-03                                                                                                             |
| TC-453  | contextmenu on a stash badge both inline and on its copy in the list                                                | Normal - routing stash labels                                              | `buildStashContextMenuItems` is called once inline and once from the list with the same `(TEST_REPO, hash, selector, <original .commit row>)`, and only the 3rd argument of `showContextMenu` differs, being each label (the inline label / the copy in the list). `buildRefContextMenuItems` is called 0 times | Contract updated in 059-01 (2026-09-25). For evidence of the old contract see the execution evidence below. AC-14 |
| TC-454  | contextmenu on a copy in the list with `data-name="feat&x"`                                                         | Boundary - raw value with special characters                               | The builder's 2nd argument matches `feat&x` with `toBe`                                                                                                                                                                                                                                                         | Same raw-value contract as S44 TC-247                                                                             |
| TC-455  | With the real contextMenu, right-click a branch-with-worktree copy in the list and run an item in the More submenu  | Normal - operation through the real menu                                   | The `postMessage` payload (or the confirmation dialog) is identical to running the same item from the same ref inline, and the list stays open while the menu and submenu are used                                                                                                                              | AC-03                                                                                                             |
| TC-456  | Right-click a copy in the list in a repository with `recentActions = ["ref.openTerminal"]`                          | Normal - passing recent actions                                            | The 4th argument of `showContextMenu` matches `["ref.openTerminal"]` with `toEqual`                                                                                                                                                                                                                             | -                                                                                                                 |

### Failure-source inventory (include-or-justify) — added by Feature 059-02 (S57)

| Failure source                                                      | Covering case or reason for exclusion                                                                       |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Inline arguments change due to the refactor                         | TC-445, TC-446                                                                                              |
| remote/local mixed up with a search mark or child element as target | TC-447, TC-448, TC-450                                                                                      |
| Values passed from the list do not match                            | TC-449, TC-451, TC-452, TC-456                                                                              |
| Stash labels routed wrongly (sent to the ref builder)               | TC-453                                                                                                      |
| Special characters decoded twice                                    | TC-454                                                                                                      |
| The list closes or the payload changes when using the real menu     | TC-455                                                                                                      |
| Business branching inside the builders                              | excluded(belongs to `web/refMenu-test/` and `web/worktreeMenu-test.md`)                                     |
| External dependencies, exceptions                                   | excluded(the builders are mocks or the existing implementation, and the shared handling adds no throw path) |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(no branch that rejects input is added. Boundaries of the target check are handled as Boundary)
- Exception: excluded(no throw path)
- External: excluded(see the table above)
- Boundary: TC-447, TC-448, TC-454
- Type: excluded(the Element check on the event target is handled by the TC-447 and TC-448 boundaries)

**Failure/normal ratio (smoke detector)**: 9 normal cases, 3 failure cases. The refactor is mainly about checking that the existing arguments stay equal, and the failure sources are covered by the table above.

### Feature 059-02 test mapping and execution evidence (S57)

- Test file: `tests/web/main.refOverflow.test.ts`. TC-445 to TC-454 and TC-456 are in describe `ref badge right-click from the row and the list (S57)` (as before, `buildRefContextMenuItems` / `buildDetachedWorktreeContextMenuItems` are mocked to record their arguments, and `showContextMenu` is a spy that calls the implementation). TC-455 is in describe `listed badge operations through the real context menu (S57)` and uses the real `buildRefContextMenuItems` and the real contextMenu / dialogs; for both the inline ref and its copy in the list it runs More › Remove Worktree… → confirmation dialog → run, and checks that the dialog HTML and the sent `removeWorktree` content match and that the list stays open while the menu and submenu are used
- 2026-09-24 (result at the time of 059-02): TC-453 checked that `buildStashContextMenuItems` (a spy that calls the implementation) was called 0 times and that the inline ref and the list used the same builder and arguments (except the 3rd argument)
- 2026-09-25 (Feature 059-01): updated the TC-453 contract to "the stash builder is called once inline and once from the list with the same repo/hash/selector/original row, only the display origin differs as each label, and the ref builder is called 0 times". The test update and execution evidence are recorded in Task 2/3 of the implementation plan (the added perspectives are S61 in `02-context-menu-02.md`)
- Real browser check (Chromium headless, real mouse input): right-clicking a copy in the list shows `#contextMenu` and the list stays open, the list stays open after the More submenu (Rename / Delete / Remove Worktree) is shown, Remove Worktree… shows the confirmation dialog, and Copy Branch Name sends `{ command: "copyToClipboard", type: "Branch Name", data: <hidden ref name> }`. Right-clicking a combined remote inside a search mark shows the remote menu (Checkout Branch… / Merge into current branch… / More / Copy), which matches the remote label without a mark and differs from the local side (Pull / Push / More / Copy). A remote mark on a combined badge hidden in the list shows the same remote menu
