# Test Perspectives: src/gitGraphView.ts

> Source: `src/gitGraphView.ts`
> Generated: 2026-05-02T01:45:44Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: worktree-actions

## S13: merge/cherry-pick handler extension + viewState dialogDefaults

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09
> Status: active
> Supersedes: -

**Target path**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                         | Notes                             |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------- |
| TC-039  | getHtmlForWebview() call                                     | Normal - standard                                                          | viewState includes dialogDefaults, matching the return value of Config.dialogDefaults() | Settings pipeline                 |
| TC-040  | RequestMergeBranch (squash=true, noCommit=false)             | Normal - standard                                                          | squash=true, noCommit=false are passed to DataSource.mergeBranch                        | -                                 |
| TC-041  | RequestMergeCommit (squash=false, noCommit=true)             | Normal - standard                                                          | squash=false, noCommit=true are passed to DataSource.mergeCommit                        | -                                 |
| TC-042  | RequestCherrypickCommit (recordOrigin=true, noCommit=true)   | Normal - standard                                                          | recordOrigin=true, noCommit=true are passed to DataSource.cherrypickCommit              | -                                 |
| TC-043  | RequestCherrypickCommit (recordOrigin=false, noCommit=false) | Normal - standard                                                          | recordOrigin=false, noCommit=false are passed to DataSource.cherrypickCommit            | Compatible with previous behavior |

## S15: createWorktree/removeWorktree/openTerminal message handlers

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: active
> Supersedes: -

**Target path**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                       | Notes                |
| ------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------- |
| TC-048  | RequestCreateWorktree (no commitHash, openTerminal=false)                        | Normal - standard                                                          | DataSource.addWorktree is called with the correct arguments and ResponseCreateWorktree is sent. No terminal is opened | REQ-3.2              |
| TC-049  | RequestCreateWorktree (with commitHash, openTerminal=true), addWorktree succeeds | Normal - with terminal                                                     | After addWorktree, createTerminal is called with name + cwd and terminal.show() runs                                  | REQ-3.1, REQ-3.1-TC6 |
| TC-050  | RequestCreateWorktree, addWorktree fails (returns an error string)               | Exception - handled error                                                  | ResponseCreateWorktree contains status (the error string), and no terminal is opened                                  | -                    |
| TC-051  | RequestRemoveWorktree                                                            | Normal - standard                                                          | DataSource.removeWorktree is called and ResponseRemoveWorktree is sent                                                | REQ-4.1              |
| TC-052  | RequestOpenTerminal                                                              | Normal - standard                                                          | createTerminal is called with name + cwd and terminal.show() runs. ResponseOpenTerminal is sent                       | REQ-9.1              |

## S16: removeWorktree handler deleting the branch at the same time

> Origin: Feature 019 (worktree-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-15
> Status: active
> Supersedes: -

**Target path**: `src/gitGraphView.ts`

| Case ID | Input / Precondition                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                       | Notes                          |
| ------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------ |
| TC-053  | deleteBranch=true, worktree removal succeeds (null), branch deletion succeeds (null) | Normal - standard                                                          | ResponseRemoveWorktree: status=null, branchStatus=null                                | REQ-4.2-TC1                    |
| TC-054  | deleteBranch=true, worktree removal succeeds (null), branch deletion fails ("error") | Normal - partial success                                                   | ResponseRemoveWorktree: status=null, branchStatus="error message"                     | REQ-4.2-TC2                    |
| TC-055  | deleteBranch=true, worktree removal fails ("error")                                  | Exception - handled error                                                  | ResponseRemoveWorktree: status="error", branchStatus not set. deleteBranch not called | REQ-4.2-TC5                    |
| TC-056  | deleteBranch=false, worktree removal succeeds (null)                                 | Normal - standard                                                          | ResponseRemoveWorktree: status=null, branchStatus not set. deleteBranch not called    | REQ-4.2-TC3                    |
| TC-057  | deleteBranch=undefined (compatibility with older webviews)                           | Boundary - legacy compat                                                   | deleteBranch not called, falls back to false                                          | REQ-4.2 backward compatibility |
| TC-058  | Checking the forceDelete parameter when deleteBranch=true                            | Normal - constraint                                                        | The 3rd argument of dataSource.deleteBranch is fixed to false (safe delete)           | REQ-4.2-TC4                    |

## S22: Separate try/catch and status response for openWorktreeInNewWindow / revealWorktreeInOS

> Origin: フェーズ2 修正 M5 (worktree-command-error-response)
> Added: 2026-07-04T02:44:58Z
> Status: superseded
> Superseded By: S26
> Supersedes: -
> Signature: `case "openWorktreeInNewWindow"` / `case "revealWorktreeInOS"` (`onDidReceiveMessage`)
> Target Path: `src/gitGraphView.ts:638-665`

A fix that wraps the `executeCommand` calls of `openWorktreeInNewWindow` (`vscode.openFolder`) and `revealWorktreeInOS` (`revealFileInOS`) in separate `try/catch` blocks. On success it sends `sendMessage({ command })` (no status), and on failure it sends `sendMessage({ command, status: error instanceof Error ? error.message : String(error) })`. An optional `status?` has been added to both responses in `types.ts`.

| Case ID | Input / Precondition                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                | Notes                           |
| ------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------- |
| TC-080  | `openWorktreeInNewWindow`, `executeCommand("vscode.openFolder", ...)` succeeds      | Normal - open success                                                      | `sendMessage({ command: "openWorktreeInNewWindow" })` is called (no `status` field)            | No status on success            |
| TC-081  | `openWorktreeInNewWindow`, `executeCommand` rejects with `Error("boom")`            | Exception - open command failure                                           | `sendMessage({ command: "openWorktreeInNewWindow", status: "boom" })` is called                | message for an Error instance   |
| TC-082  | `openWorktreeInNewWindow`, `executeCommand` rejects with a non-Error (string `"x"`) | Type - non-Error rejection                                                 | `sendMessage({ command: "openWorktreeInNewWindow", status: "x" })` (`String(error)`) is called | `String(error)` for a non-Error |
| TC-083  | `revealWorktreeInOS`, `executeCommand("revealFileInOS", ...)` succeeds              | Normal - reveal success                                                    | `sendMessage({ command: "revealWorktreeInOS" })` is called (no `status` field)                 | No status on success            |
| TC-084  | `revealWorktreeInOS`, `executeCommand` rejects with `Error("no")`                   | Exception - reveal command failure                                         | `sendMessage({ command: "revealWorktreeInOS", status: "no" })` is called                       | message for an Error instance   |
| TC-085  | `revealWorktreeInOS`, `executeCommand` rejects with a non-Error (string `"y"`)      | Type - non-Error rejection                                                 | `sendMessage({ command: "revealWorktreeInOS", status: "y" })` (`String(error)`) is called      | `String(error)` for a non-Error |

## S26: Required status for openWorktreeInNewWindow / revealWorktreeInOS (null on success)

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: S22
> Signature: `case "openWorktreeInNewWindow"` / `case "revealWorktreeInOS"` (`onDidReceiveMessage`)
> Target Path: `src/gitGraphView.ts:495-522`

A fix that changes the `ResponseMessage` of both commands to a contract with a required `status: GitCommandStatus`. On success it always sends `status: null`, and on failure it sends the error message string as before. This replaces "no status field on success" of S22 (TC-080/TC-083) (the host side of [2]. Making the type required belongs to `src/types-test.md` S2, and the webview-side display to `web/messageHandler-test.md` S11).

| Case ID | Input / Precondition                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                       | Notes                           |
| ------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| TC-100  | `openWorktreeInNewWindow`, `executeCommand("vscode.openFolder", ...)` succeeds      | Normal - null always sent on open success                                  | `sendMessage({ command: "openWorktreeInNewWindow", status: null })` is called once with an exact match (`null`, not an omitted field) | Replaces S22 TC-080             |
| TC-101  | `openWorktreeInNewWindow`, `executeCommand` rejects with `Error("boom")`            | External - open command failure                                            | `sendMessage({ command: "openWorktreeInNewWindow", status: "boom" })` is called once                                                  | message for an Error instance   |
| TC-102  | `openWorktreeInNewWindow`, `executeCommand` rejects with a non-Error (string `"x"`) | Type - non-Error reject (open)                                             | `sendMessage({ command: "openWorktreeInNewWindow", status: "x" })` (`String(error)`) is called once                                   | `String(error)` for a non-Error |
| TC-103  | `revealWorktreeInOS`, `executeCommand("revealFileInOS", ...)` succeeds              | Normal - null always sent on reveal success                                | `sendMessage({ command: "revealWorktreeInOS", status: null })` is called once with an exact match                                     | Replaces S22 TC-083             |
| TC-104  | `revealWorktreeInOS`, `executeCommand` rejects with `Error("no")`                   | External - reveal command failure                                          | `sendMessage({ command: "revealWorktreeInOS", status: "no" })` is called once                                                         | -                               |
| TC-105  | `revealWorktreeInOS`, `executeCommand` rejects with a non-Error (string `"y"`)      | Type - non-Error reject (reveal)                                           | `sendMessage({ command: "revealWorktreeInOS", status: "y" })` (`String(error)`) is called once                                        | -                               |

### Failure-source inventory (include-or-justify) — added by Feature 045 (S26)

| Failure source                                                         | Covering case or reason for exclusion                                                                       |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| status omitted on success (misread as `undefined` on the webview side) | TC-100, TC-103 (detected by an exact match on `status: null`)                                               |
| `executeCommand` failure (Error reject)                                | TC-101, TC-104                                                                                              |
| Reject with a non-Error value                                          | TC-102, TC-105                                                                                              |
| Contract changed for only one of the commands                          | open (TC-100 to TC-102) and reveal (TC-103 to TC-105) are verified separately                               |
| Sending an object without status                                       | excluded(prevented by typecheck because the type is required. Covered by `src/types-test.md` TC-008/TC-009) |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(the handler has no input validation branch. The early return for an unregistered repo is already covered by S21 TC-079)
- Exception: excluded(a reject is converted to a status response in catch and does not throw. Verified as External)
- External: TC-101, TC-104
- Boundary: excluded(the spec has no numeric or empty-value boundaries. `null` is the success contract value and is verified in TC-100/TC-103)
- Type: TC-102, TC-105

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-100, TC-103), 4 failure cases (TC-101, TC-102, TC-104, TC-105), ratio 2.0.

## S41: Detached removal and pre-removal input validation in the removeWorktree handler

> Origin: Feature 053 (detached-worktree-menu) (light-spec-plan)
> Added: 2026-09-13
> Status: active
> Supersedes: -
> Signature: `case "removeWorktree"` (`onDidReceiveMessage`)
> Target Path: `src/gitGraphView.ts:585-610`
> Test File: `tests/src/gitGraphView.test.ts`

S15 TC-051 and S16 TC-053 to TC-058 are kept. `mockDataSource` has only `removeWorktree` and `deleteBranch`, so any other adapter call fails with `TypeError`. The response is checked with `toStrictEqual` on `mocks.postMessage.mock.calls[0][0]`. `TEST_REPO = "/test/repo"`, `MISSING = "Branch name is required to delete the branch."`. TC-399 to TC-405 may be an `it.each` where each input is identifiable.

| Case ID | Input / Precondition                                                                                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                  | Notes |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| TC-398  | `{ command: "removeWorktree", repo: TEST_REPO, worktreePath: "/tmp/wt8", deleteBranch: false }` (no `branchName`), `removeWorktree` returns `null` | Normal - detached removal                                                  | `removeWorktree` called once with `(TEST_REPO, "/tmp/wt8")`, `deleteBranch` 0 times, `postMessage` once with `{ command: "removeWorktree", status: null }`                       | -     |
| TC-399  | `deleteBranch: true`, no `branchName` key                                                                                                          | Validation - missing branch name                                           | `removeWorktree` 0 times, `deleteBranch` 0 times, `postMessage` once with `{ command: "removeWorktree", status: MISSING }` (no `branchStatus` key)                               | -     |
| TC-400  | `deleteBranch: true, branchName: undefined`                                                                                                        | Validation - undefined branch name                                         | Same as TC-399                                                                                                                                                                   | -     |
| TC-401  | `deleteBranch: true, branchName: null`                                                                                                             | Type - null branch name                                                    | Same as TC-399                                                                                                                                                                   | -     |
| TC-402  | `deleteBranch: true, branchName: ""`                                                                                                               | Boundary - empty branch name                                               | Same as TC-399                                                                                                                                                                   | -     |
| TC-403  | `deleteBranch: true, branchName: 42`                                                                                                               | Type - numeric branch name                                                 | Same as TC-399                                                                                                                                                                   | -     |
| TC-404  | `deleteBranch: true, branchName: []`                                                                                                               | Type - array branch name                                                   | Same as TC-399                                                                                                                                                                   | -     |
| TC-405  | `deleteBranch: true, branchName: {}`                                                                                                               | Type - object branch name                                                  | Same as TC-399                                                                                                                                                                   | -     |
| TC-406  | `deleteBranch: "true", branchName: "feature/x"`, `removeWorktree` returns `null`                                                                   | Type - string "true" is not true                                           | `removeWorktree` once, `deleteBranch` 0 times, `postMessage` once with `{ command: "removeWorktree", status: null }`                                                             | -     |
| TC-407  | `deleteBranch: 1, branchName: "feature/x"`                                                                                                         | Type - numeric 1 is not true                                               | Same as TC-406                                                                                                                                                                   | -     |
| TC-408  | The TC-398 request, `removeWorktree` returns `null` (models Git succeeding with only ignored files / hidden untracked files / a missing path)      | Normal - Git success passed through                                        | `removeWorktree` once, `postMessage` once with `{ command: "removeWorktree", status: null }`. Other methods of `mockDataSource` do not exist and are not called (no pre-check)   | -     |
| TC-409  | The TC-398 request, `removeWorktree` returns `"fatal: '/tmp/wt8' is locked"`                                                                       | External - Git refusal passed through                                      | `removeWorktree` once (no retry), `deleteBranch` 0 times, `postMessage` once with `{ command: "removeWorktree", status: "fatal: '/tmp/wt8' is locked" }` (no `branchStatus` key) | -     |

### Failure-source inventory (include-or-justify) — added by Feature 053 (S41)

| Failure source                         | Covering case or reason for exclusion |
| -------------------------------------- | ------------------------------------- |
| Missing rejection before removal       | TC-399 to TC-405                      |
| Truthy conversion                      | TC-406, TC-407                        |
| Success turned into failure, pre-check | TC-408                                |
| Retry or branch deletion on failure    | TC-409                                |
| Compatibility of the detached shape    | TC-398                                |

**Failure-category coverage (diversity floor)**:

- Validation: TC-399, TC-400
- Exception: excluded(the handler does not throw. DataSource failures are expressed as return values)
- External: TC-409
- Boundary: TC-402
- Type: TC-401, TC-403 to TC-407

## S44: Worktree path settings sent to the webview

> Origin: Feature 062-01 (PR #114 follow-up)
> Added: 2026-10-27
> Status: active
> Supersedes: -
> Signature: `viewState.worktreePath` in `getHtmlForWebview()` / `public notifyWorktreePathChanged(): void`, both built by `currentWorktreePathViewState()`
> Target Path: `src/gitGraphView.ts` (`currentWorktreePathViewState`, `notifyWorktreePathChanged`, the `viewState` object of `getHtmlForWebview`)
> Test File: `tests/src/gitGraphView.test.ts`

The webview has no Node `os` / `process`, so the host sends what the path resolver needs: the template from `git-keizu.worktreePathTemplate`, the home directory, the platform, the process working directory and the Windows per-drive working directories (`src/worktreePath-test.md` S3). The same value goes into the initial `viewState` and into the `setWorktreePath` message sent when the setting changes (`src/extension-test.md` S11), and the message does not rebuild the HTML. The setting count and the `worktreePath` key are also fixed by `08-keyboard-accessibility-01.md` S42 TC-417. Fixture: the shared panel mocks of this file with the default `worktreePathTemplate`.

| Case ID | Input / Precondition                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                    | Notes                                  |
| ------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| TC-419  | Create the panel and parse `viewState` from the HTML                  | Normal - initial value                                                     | `viewState.worktreePath` equals `{ template: "${repoPath}/../${repoName}-${branch}", homeDir: homedir(), platform: "win32" or "posix" from process.platform, cwd: process.cwd(), driveCwd: windowsDriveDirectories(process.env) }` | -                                      |
| TC-420  | Open panel, `postMessage` cleared, then `notifyWorktreePathChanged()` | Normal - runtime update without reload                                     | `postMessage` is called once with `{ command: "setWorktreePath", worktreePath: <same value as TC-419> }` and `webview.html` is unchanged                                                                                           | Same pattern as S20 for Recent actions |

### Failure-source inventory (include-or-justify) — S44

| Failure source                                 | Case or reason for exclusion                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| A field the resolver needs is missing or wrong | TC-419, TC-420                                                                                       |
| Setting change regenerates the webview HTML    | TC-420                                                                                               |
| No panel open when the setting changes         | excluded (`src/extension.ts` calls it with optional chaining; see `src/extension-test.md` S4 TC-023) |
| Windows values on a Windows host               | excluded (CI runs on Linux; the resolver side is `src/worktreePath-test.md` S3)                      |
| Exception / External / Type                    | excluded (no throw path; `WorktreePathViewState` is checked by `pnpm run typecheck`)                 |

### Test mapping — S44

`tests/src/gitGraphView.test.ts`: TC-419 `includes the worktree path template in viewState (TC-419)` in describe `GitKeizuView merge/cherry-pick handler and viewState dialogDefaults (S13)`; TC-420 `posts setWorktreePath with the current template without regenerating HTML (TC-420)` in describe `GitKeizuView notifyShowRecentActionsChanged runtime sync`.
