# Test Perspectives: web/main.ts

> Source: `web/main.ts`
> Generated: 2026-05-17T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: load-count

## S39: maxCommits normalization helper (Feature 040)

> Origin: Feature 040 (settings-and-copy-polish) (light-spec-plan)
> Added: 2026-05-17
> Status: active
> Supersedes: -
> Signature: `normalizeCommitLoadCount(value: number, defaultValue: number): number`
> Target Path: `web/main.ts`
> Test File: `tests/web/main.test.ts`

Verifies the `normalizeCommitLoadCount` helper, which keeps the payload of `requestLoadCommits` at 1 or more even when the old webview state (`prevState.maxCommits`) is 0, negative or non-finite, and also after the increment by Load More or automatic loading.

| Case ID | Input / Precondition          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes                                                                    |
| ------- | ----------------------------- | -------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------ |
| TC-216  | `value=0, defaultValue=300`   | Boundary - lower bound                                                     | Returns 1       | 0 is corrected to 1                                                      |
| TC-217  | `value=-50, defaultValue=300` | Validation - negative                                                      | Returns 1       | A negative value is corrected to 1                                       |
| TC-218  | `value=NaN, defaultValue=300` | Validation - non-finite                                                    | Returns 300     | Falls back to the default                                                |
| TC-219  | `value=400, defaultValue=300` | Normal - positive                                                          | Returns 400     | A positive value is kept (a typical value after the Load More increment) |
| TC-220  | `value=NaN, defaultValue=0`   | Validation - degenerate default                                            | Returns 1       | 1 is guaranteed even when the default is also below the lower limit      |

## S88: Browsing and extending the loaded history

> Origin: Feature 061-02 (large history browsing)
> Added: 2026-11-22
> Status: active
> Supersedes: -
> Target Path: `web/main.ts` (loadCommits, scrollToCommit and history rendering)
> Test File: `tests/web/main.test.ts`, `tests/web/main.keyboard.test.ts`, `tests/web/main.pathHighlight.test.ts`

| Case ID | Input / Precondition                                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                       | Notes                                                                 |
| ------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| TC-791  | Load 100,000 ordinary rows, including a long ref label, and resize the viewport at a deep offset.      | Boundary - bounded DOM and full scroll extent                              | The logical scroll height spans the history. At most ceil(viewport height / row height) + 24 commit rows cover the visible range. Columns stay aligned and visible graph nodes stay within 1 px of their row centers. | Verify all exposed rows have logical indices, starting with header 1. |
| TC-792  | Move 100 rows up, then 100 rows down within loaded history.                                            | Normal - loaded navigation                                                 | Each movement displays the expected hashes and aligned graph nodes. Neither movement issues a history request.                                                                                                        | Measure the two directions separately.                                |
| TC-793  | Extend by the configured page size using Load More or an automatic scroll at the loaded end.           | Normal - manual and automatic continuation                                 | Each action requests the current token once, preserves the reading position, and adds the returned page once after the existing rows. The final page removes Load More.                                               | Use 100 new rows for both entry points.                               |
| TC-794  | Deliver a page twice, after a refresh, for a different repo, or with a mismatched token or base count. | Validation - stale response                                                | The logical rows and pending current request remain unchanged by each rejected response. A valid pending response still applies once.                                                                                 | Switch repos and back, or recreate the Webview mid-request.           |
| TC-795  | Move the keyboard target across a mounted boundary, open its details, then close them.                 | Boundary - offscreen selection and details                                 | The target hash is mounted and selected. Its details open in the full table; closing restores bounded rendering at the selected commit.                                                                               | Exercise keyboard navigation and the ordinary details path.           |
| TC-796  | Append while the author menu is closed and open it after its items or selection have changed.          | Normal - author menu refresh                                               | An unchanged closed menu is not rebuilt for each page. Opening shows the current authors and selected values.                                                                                                         | Observe option construction as well as menu content.                  |
| TC-797  | Scroll a selected path out of the window and back.                                                     | Normal - selection across windows                                          | The same logical commit and path remain selected. Remounted rows and connecting edges regain the reference highlight.                                                                                                 | Compare the rendered path to the original selection.                  |
| TC-798  | A soft refresh supersedes a hard refresh after the table has entered its loading state.                | Boundary - overlapping refreshes                                           | The stale response leaves the loading indicator in place. The current response restores the original rows even when the history is identical.                                                                         | Check the hash of every restored row.                                 |
| TC-799  | Close Branch Cleanup at a deep offset so the scroll container grows without a window resize.           | Boundary - viewport growth                                                 | The bottom visible row and its graph node appear at the same scroll offset without fetching history.                                                                                                                  | Deliver only a container resize notification.                         |
| TC-800  | With the selected row offscreen and focus on the list, press Shift+Enter or Alt+Down, then Down.       | Validation - unassigned keys                                               | The unassigned keys preserve the reading position and focus. Down mounts and focuses the next logical row.                                                                                                            | Keep the original selection outside the mounted rows.                 |
| TC-802  | Focus a row, scroll it offscreen, then press Shift+F10 or Context Menu from the list.                  | Boundary - keyboard menu for an offscreen row                              | The row's right-click menu opens and stays open through the browser's contextmenu event. Copy uses the selected commit hash. Closing the menu returns focus to the row.                                               | Include stash and uncommitted rows with their own menus.              |
| TC-803  | Focus a branch label, scroll it offscreen, then press Enter, Space, Shift+F10 or Context Menu.         | Boundary - keyboard menu for an offscreen label                            | The branch menu opens. Escape returns focus to the same label and Copy Branch Name uses its full name. On the commit row itself, Space stays unassigned and Enter opens that commit's details.                        | Exercise both parts of a combined local and remote badge.             |
| TC-804  | Soft-refresh the same commits with a changed date, subject, author name or email, then load more.      | Boundary - commit metadata across a refresh and append                     | The corrected value appears on refresh and remains visible after the next page loads. A change to the working tree timestamp or change count updates only that row.                                                   | Change one field at a time, keeping hashes, parents and refs fixed.   |

TC-791 also has a desktop regression check. Build the extension, configure the [VS Code and Playwright capture environment](../../../../../scripts/readme-media/README.md), and open a workspace whose repository has at least 100,000 commits with `git-keizu.initialLoadCommits` set to 100,000. Run `node tests/browser/history-viewport.mjs /absolute/path/to/workspace.code-workspace` from the repository root. It compares the center of every fully visible commit row to its SVG node at two window heights around row 90,000. TC-795 checks that opening details uses native table row counts and closing them restores the partial table’s indices.

## S89: Author choices during history updates

> Origin: Feature 061-02 (large history browsing)
> Added: 2026-11-22
> Updated: 2026-11-23
> Status: active
> Supersedes: -
> Target Path: `web/main.ts` (updateAuthorMenu)
> Test File: `tests/web/main.keyboard.test.ts`

| Case ID | Input / Precondition                                                                                                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                           | Notes                                           |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| TC-801  | While a page request is pending, open Authors and check a name. Deliver more rows with the same author choices and applied filters.             | Boundary - editing during a page response                                  | The menu stays open with the name checked. Applying sends one history request with that author.                                                           | Exercise both an append and a full replacement. |
| TC-806  | Rename an author in a soft refresh with identical commit rows. Open Authors, check the new name, then repeat the refresh with the same choices. | Boundary - author-only refresh                                             | The menu offers the new name, the old name is absent, and the commit row stays mounted. The second refresh keeps the menu open with the new name checked. | Use the full response to each refresh request.  |

## S90: Opening hidden labels after scrolling their row out of view

> Origin: Feature 061-02 (large history browsing)
> Added: 2026-11-22
> Status: active
> Supersedes: -
> Target Path: `web/main.ts` (renderTable and handleParkedMenuKey)
> Test File: `tests/web/main.keyboard.test.ts`

| Case ID | Input / Precondition                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                  | Notes                                                                   |
| ------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| TC-805  | Focus the +N button, scroll until its row is removed, then press Enter or Space. | Boundary - activation after row removal                                    | The hidden-label list stays open through the remount's scroll event with focus on its first label. Escape returns to the same counter. Moving the counter by scrolling closes the reopened list. | Commit details stay closed. TC-803 covers activation on the row itself. |
