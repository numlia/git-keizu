# Test Perspectives: src/config.ts

> Source: `src/config.ts`
> Generated: 2026-05-17T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: defaults-schema

## S10: Config fallback defaults vs package.json — simple value comparison (25 settings)

> Origin: Feature 021 (loadMoreCommits-default-mismatch) (aidd-spec-tasks-test)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Target path**: `src/config.ts` (all getter methods)
**Test file**: `tests/src/config-defaults.test.ts`

Verifies that the fallback value of each Config method (with the mock returning the fallback) matches the default value in `contributes.configuration.properties` of `package.json`.

| Case ID | Input / Precondition                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                        | Notes                 |
| ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------- | --------------------- |
| TC-042  | dateFormat fallback                                               | Normal - cross-check                                                       | Matches the package.json default       | string type           |
| TC-043  | dateType fallback                                                 | Normal - cross-check                                                       | Matches the package.json default       | string type           |
| TC-044  | fetchAvatars fallback                                             | Normal - cross-check                                                       | Matches the package.json default       | boolean type          |
| TC-045  | graphStyle fallback                                               | Normal - cross-check                                                       | Matches the package.json default       | string type           |
| TC-046  | initialLoadCommits fallback                                       | Normal - cross-check                                                       | Matches the package.json default       | number type           |
| TC-047  | loadMoreCommits fallback                                          | Normal - cross-check                                                       | Matches the package.json default (100) | Fixed by REQ-9.1      |
| TC-048  | loadMoreCommitsAutomatically fallback                             | Normal - cross-check                                                       | Matches the package.json default       | boolean type          |
| TC-049  | maxDepthOfRepoSearch fallback                                     | Normal - cross-check                                                       | Matches the package.json default       | number type           |
| TC-050  | showCurrentBranchByDefault fallback                               | Normal - cross-check                                                       | Matches the package.json default       | boolean type          |
| TC-051  | showStatusBarItem fallback                                        | Normal - cross-check                                                       | Matches the package.json default       | boolean type          |
| TC-052  | showUncommittedChanges fallback                                   | Normal - cross-check                                                       | Matches the package.json default       | boolean type          |
| TC-053  | tabIconColourTheme fallback                                       | Normal - cross-check                                                       | Matches the package.json default       | string type           |
| TC-054  | sourceCodeProviderIntegrationLocation fallback                    | Normal - cross-check                                                       | Matches the package.json default       | string type           |
| TC-055  | repository.commits.order fallback                                 | Normal - cross-check                                                       | Matches the package.json default       | string type           |
| TC-056  | repository.commits.mute.mergeCommits fallback                     | Normal - cross-check                                                       | Matches the package.json default       | boolean type          |
| TC-057  | repository.commits.mute.commitsThatAreNotAncestorsOfHead fallback | Normal - cross-check                                                       | Matches the package.json default       | boolean type          |
| TC-058  | dialog.merge.noFastForward fallback                               | Normal - cross-check                                                       | Matches the package.json default       | boolean type          |
| TC-059  | dialog.merge.squashCommits fallback                               | Normal - cross-check                                                       | Matches the package.json default       | boolean type          |
| TC-060  | dialog.merge.noCommit fallback                                    | Normal - cross-check                                                       | Matches the package.json default       | boolean type          |
| TC-061  | dialog.cherryPick.recordOrigin fallback                           | Normal - cross-check                                                       | Matches the package.json default       | boolean type          |
| TC-062  | dialog.cherryPick.noCommit fallback                               | Normal - cross-check                                                       | Matches the package.json default       | boolean type          |
| TC-063  | dialog.stashUncommittedChanges.includeUntracked fallback          | Normal - cross-check                                                       | Matches the package.json default       | boolean type          |
| TC-064  | dialog.createWorktree.openTerminal fallback                       | Normal - cross-check                                                       | Matches the package.json default       | boolean type          |
| TC-065  | dialog.removeWorktree.deleteBranch fallback                       | Normal - cross-check                                                       | Matches the package.json default       | boolean type          |
| TC-371  | worktreePathTemplate fallback                                     | Normal - cross-check                                                       | Matches the package.json default       | string type (PR #114) |

## S11: Config fallback defaults vs package.json — comparison after keybinding conversion (4 settings)

> Origin: Feature 021 (loadMoreCommits-default-mismatch) (aidd-spec-tasks-test)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Target path**: `src/config.ts` (keyboardShortcut\* methods + parseKeybinding)
**Test file**: `tests/src/config-defaults.test.ts`

| Case ID | Input / Precondition                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes                            |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------- | --------------- | -------------------------------- |
| TC-066  | keyboardShortcutFind fallback ("CTRL/CMD + F")          | Normal - cross-check + transform                                           | Returns "f"     | After parseKeybinding conversion |
| TC-067  | keyboardShortcutRefresh fallback ("CTRL/CMD + R")       | Normal - cross-check + transform                                           | Returns "r"     | After parseKeybinding conversion |
| TC-068  | keyboardShortcutScrollToHead fallback ("CTRL/CMD + H")  | Normal - cross-check + transform                                           | Returns "h"     | After parseKeybinding conversion |
| TC-069  | keyboardShortcutScrollToStash fallback ("CTRL/CMD + S") | Normal - cross-check + transform                                           | Returns "s"     | After parseKeybinding conversion |

## S12: Config fallback defaults vs package.json — comparison after graphColours filtering

> Origin: Feature 021 (loadMoreCommits-default-mismatch) (aidd-spec-tasks-test)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Target path**: `src/config.ts` (graphColours method)
**Test file**: `tests/src/config-defaults.test.ts`

| Case ID | Input / Precondition                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                     | Notes                                         |
| ------- | ------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| TC-070  | graphColours fallback (array of 12 colours) | Normal - cross-check + filter                                              | Matches the 12-colour array of the package.json default (deepEqual) | Fixed by REQ-9.2. All colours pass the filter |

## S13: openNewTabEditorGroup() editor group setting

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: active
> Supersedes: -

**Signature**: `openNewTabEditorGroup(): vscode.ViewColumn`
**Target path**: `src/config.ts`

| Case ID | Input / Precondition                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                      | Notes                         |
| ------- | ------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------ | ----------------------------- |
| TC-071  | openNewTabEditorGroup setting is not set               | Normal - default fallback                                                  | vscode.ViewColumn.Active is returned | Fallback to the default value |
| TC-072  | openNewTabEditorGroup = "Active"                       | Normal - explicit active                                                   | vscode.ViewColumn.Active is returned | Explicit Active               |
| TC-073  | openNewTabEditorGroup = "Beside"                       | Normal - beside                                                            | vscode.ViewColumn.Beside is returned | Neighbouring group            |
| TC-074  | openNewTabEditorGroup = "One"                          | Normal - numbered group                                                    | vscode.ViewColumn.One is returned    | Numbered group                |
| TC-075  | openNewTabEditorGroup = "Nine"                         | Boundary - max group                                                       | vscode.ViewColumn.Nine is returned   | Highest group number          |
| TC-076  | openNewTabEditorGroup = "InvalidValue" (invalid value) | Validation - invalid value                                                 | vscode.ViewColumn.Active is returned | Fallback behaviour            |
| TC-077  | openNewTabEditorGroup fallback comparison              | Normal - cross-check + mapping                                             | Matches the package.json default     | Through VIEW_COLUMN_MAPPING   |

## S14: showRecentActions setting

> Origin: Feature 034 (context-menu-recent-actions) Task 1
> Added: 2026-05-02
> Status: active
> Supersedes: -
> Signature: `showRecentActions(): boolean`
> Target Path: `src/config.ts`

| Case ID | Input / Precondition                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                        | Notes                        |
| ------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| TC-078  | `menu.showRecentActions` setting is not specified                      | Normal - default                                                           | `showRecentActions()` returns `true`                                                                                   | Default of the new setting   |
| TC-079  | `menu.showRecentActions = false`                                       | Normal - explicit false                                                    | `showRecentActions()` returns `false`                                                                                  | Only rendering is turned OFF |
| TC-080  | Consistency between the fallback getter and the `package.json` default | Normal - cross-check                                                       | In `tests/src/config-defaults.test.ts`, the fallback value of `showRecentActions()` matches the `package.json` default | Static default consistency   |

## S21: maxDepthOfRepoSearch() default of 1 and pass-through of explicit settings

> Origin: Feature 057 (multi-repo-single-folder-workspace) issue #49
> Added: 2026-09-12
> Status: active
> Supersedes: -
> Signature: `maxDepthOfRepoSearch(): number`
> Target Path: `src/config.ts:178-180`
> Test File: `tests/src/config-defaults.test.ts`

S10 TC-049 only checks that the two values match, so it also passes with `0 === 0`. This section pins the concrete default value. How the search depth is interpreted is the responsibility of the repoManager owner and is not covered here.

| Case ID | Input / Precondition                                                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                             | Notes                                 |
| ------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| TC-369  | Call `getConfig().maxDepthOfRepoSearch()` while the `get` mock returns the fallback value as is | Normal - concrete default value                                            | The return value matches the number `1` with `toBe`, and `git-keizu.maxDepthOfRepoSearch.default` in `package.json` also matches the number `1` with `toBe` | Both sides pinned to a concrete value |
| TC-370  | The `get` mock returns `0` for the `"maxDepthOfRepoSearch"` key (fallback for other keys)       | Boundary - explicit setting of 0 is kept                                   | `getConfig().maxDepthOfRepoSearch()` returns the number `0`                                                                                                 | Explicit settings are not overridden  |

### Failure-source inventory (include-or-justify) — added by Feature 057 (S21)

| Failure source                                                            | Covering case or reason for exclusion                        |
| ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Changing only the fallback and forgetting `package.json` (or the reverse) | TC-369                                                       |
| Overriding an explicit setting                                            | TC-370                                                       |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL)             | 0: TC-370. The rest are excluded(the getter has no branches) |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(the getter has no branches)
- Exception: excluded(the getter has no branches)
- External: excluded(`workspaceConfiguration.get()` does not throw under its default-value contract; existing behaviour)
- Boundary: TC-370
- Type: excluded(types are left to the schema)
- Normal: TC-369

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-369), 1 failure case (TC-370). Only the concrete default value changes, and the table above was confirmed to cover all failure sources.

## S22: worktreePathTemplate() suggested worktree path template

> Origin: Feature 062-01 (PR #114 follow-up)
> Added: 2026-10-27
> Status: active
> Supersedes: -
> Signature: `worktreePathTemplate(): string`
> Target Path: `src/config.ts` (`worktreePathTemplate`)
> Test File: `tests/src/config.test.ts`

S10 TC-371 only checks that the fallback matches `package.json`. This section pins the concrete default and checks that an explicit value is passed through. A blank template falls back to the default later, in the resolver (`src/worktreePath-test.md` S2 TC-017), not here.

| Case ID | Input / Precondition                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                | Notes                                     |
| ------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| TC-372  | `worktreePathTemplate` not specified                                             | Normal - default                                                           | Returns `${repoPath}/../${repoName}-${branch}` | Beside the repository                     |
| TC-373  | `worktreePathTemplate` set to `~/.worktrees/${repoName}/${branch}`, then to `""` | Boundary - explicit value, including empty                                 | Returns each value as written                  | The getter does not replace a blank value |

### Failure-source inventory (include-or-justify) — S22

| Failure source                             | Case or reason for exclusion                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Default changed in code only               | TC-372 (and S10 TC-371 against `package.json`)                                                                          |
| Explicit setting ignored or misspelled key | TC-373                                                                                                                  |
| Blank value replaced too early             | TC-373                                                                                                                  |
| Exception / External / Type                | excluded (`workspaceConfiguration.get()` does not throw under its default-value contract; types are left to the schema) |
