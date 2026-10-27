# Test Perspectives: src/config.ts

> Source: `src/config.ts`
> Generated: 2026-05-17T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: existing-settings

## S1: parseKeybinding() parsing shortcut setting values

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**Signature**: `parseKeybinding(value: string, defaultValue: string): string | null`
**Target path**: `src/config.ts`

| Case ID | Input / Precondition                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result               | Notes                                   |
| ------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------- | --------------------------------------- |
| TC-001  | value="CTRL/CMD + F", default="CTRL/CMD + F"                 | Normal - standard                                                          | Returns "f"                   | Regex match -> lowercase conversion     |
| TC-002  | value="CTRL/CMD + Z", default="CTRL/CMD + F"                 | Normal - standard                                                          | Returns "z"                   | Extracts the trailing letter            |
| TC-003  | value="CTRL/CMD + A", default="CTRL/CMD + F"                 | Normal - standard                                                          | Returns "a"                   | First letter of the alphabet            |
| TC-004  | value="UNASSIGNED", default="CTRL/CMD + F"                   | Normal - special value                                                     | Returns null                  | Disables the shortcut                   |
| TC-005  | value="Ctrl+F" (invalid format), default="CTRL/CMD + F"      | Validation - invalid format                                                | Returns "f" (default applied) | Missing slash and spaces                |
| TC-006  | value="" (empty string), default="CTRL/CMD + F"              | Boundary - empty                                                           | Returns "f" (default applied) | Empty input                             |
| TC-007  | value="ctrl/cmd + f" (lowercase), default="CTRL/CMD + F"     | Validation - case mismatch                                                 | Returns "f" (default applied) | The regex allows uppercase only         |
| TC-008  | value="CTRL/CMD + 1" (digit), default="CTRL/CMD + F"         | Validation - non-alpha                                                     | Returns "f" (default applied) | Anything other than a letter is invalid |
| TC-009  | value="CTRL/CMD + F" (extra spaces), default="CTRL/CMD + F"  | Boundary - extra whitespace                                                | Returns "f" (default applied) | Strict regex match                      |
| TC-010  | value="CTRL/CMD + FF" (2 characters), default="CTRL/CMD + F" | Boundary - extra chars                                                     | Returns "f" (default applied) | Only a single letter is allowed         |

## S2: sourceCodeProviderIntegrationLocation() SCM button location setting

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**Signature**: `sourceCodeProviderIntegrationLocation(): string`
**Target path**: `src/config.ts`

| Case ID | Input / Precondition            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result        | Notes                   |
| ------- | ------------------------------- | -------------------------------------------------------------------------- | ---------------------- | ----------------------- |
| TC-011  | Setting not specified (default) | Normal - default                                                           | Returns "Inline"       | Default value           |
| TC-012  | Setting value="More Actions"    | Normal - standard                                                          | Returns "More Actions" | Valid alternative value |
| TC-013  | Setting value="Inline"          | Normal - standard                                                          | Returns "Inline"       | Explicit default        |

## S3: keyboardShortcut\*() keyboard shortcut settings

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**Target path**: `src/config.ts`

| Case ID | Input / Precondition                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes                  |
| ------- | -------------------------------------------- | -------------------------------------------------------------------------- | --------------- | ---------------------- |
| TC-014  | keyboardShortcutFind() default               | Normal - standard                                                          | Returns "f"     | Default "CTRL/CMD + F" |
| TC-015  | keyboardShortcutRefresh() default            | Normal - standard                                                          | Returns "r"     | Default "CTRL/CMD + R" |
| TC-016  | keyboardShortcutScrollToHead() default       | Normal - standard                                                          | Returns "h"     | Default "CTRL/CMD + H" |
| TC-017  | keyboardShortcutScrollToStash() default      | Normal - standard                                                          | Returns "s"     | Default "CTRL/CMD + S" |
| TC-018  | keyboardShortcutFind() set to "CTRL/CMD + A" | Normal - custom                                                            | Returns "a"     | Custom key             |
| TC-019  | keyboardShortcutFind() set to "UNASSIGNED"   | Normal - special value                                                     | Returns null    | Shortcut disabled      |

## S4: loadMoreCommitsAutomatically() automatic loading setting

> Origin: Feature 005 (webview-ux-enhancements) (aidd-spec-tasks-test)
> Added: 2026-02-27
> Status: active
> Supersedes: -

**Signature**: `loadMoreCommitsAutomatically(): boolean`
**Target path**: `src/config.ts`

| Case ID | Input / Precondition            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes               |
| ------- | ------------------------------- | -------------------------------------------------------------------------- | --------------- | ------------------- |
| TC-020  | Setting not specified (default) | Normal - default                                                           | Returns true    | Enabled by default  |
| TC-021  | Setting value=false             | Normal - standard                                                          | Returns false   | Explicitly disabled |

## S5: muteCommitsMergeCommits() merge commit mute setting

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**Signature**: `muteCommitsMergeCommits(): boolean`
**Target path**: `src/config.ts`

| Case ID | Input / Precondition            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes               |
| ------- | ------------------------------- | -------------------------------------------------------------------------- | --------------- | ------------------- |
| TC-022  | Setting not specified (default) | Normal - default                                                           | Returns true    | Enabled by default  |
| TC-023  | Setting value = false           | Normal - standard                                                          | Returns false   | Explicitly disabled |
| TC-024  | Setting value = true            | Normal - standard                                                          | Returns true    | Explicitly enabled  |

## S6: muteCommitsNotAncestorsOfHead() mute setting for non-ancestors

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**Signature**: `muteCommitsNotAncestorsOfHead(): boolean`
**Target path**: `src/config.ts`

| Case ID | Input / Precondition            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes               |
| ------- | ------------------------------- | -------------------------------------------------------------------------- | --------------- | ------------------- |
| TC-025  | Setting not specified (default) | Normal - default                                                           | Returns false   | Disabled by default |
| TC-026  | Setting value = true            | Normal - standard                                                          | Returns true    | Explicitly enabled  |
| TC-027  | Setting value = false           | Normal - standard                                                          | Returns false   | Explicitly disabled |

## S7: dialogDefaults() dialog default settings

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09
> Status: active
> Supersedes: -

**Signature**: `dialogDefaults(): DialogDefaults`
**Target path**: `src/config.ts`

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                       | Notes        |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- | ------------ |
| TC-028  | No settings specified (default)                      | Normal - default                                                           | All default values are returned                       | All defaults |
| TC-029  | dialog.merge.noFastForward=false                     | Normal - custom                                                            | Returns merge.noFastForward=false                     | Custom value |
| TC-030  | dialog.merge.squashCommits=true                      | Normal - custom                                                            | Returns merge.squashCommits=true                      | Custom value |
| TC-031  | dialog.merge.noCommit=true                           | Normal - custom                                                            | Returns merge.noCommit=true                           | Custom value |
| TC-032  | dialog.cherryPick.recordOrigin=true                  | Normal - custom                                                            | Returns cherryPick.recordOrigin=true                  | Custom value |
| TC-033  | dialog.cherryPick.noCommit=true                      | Normal - custom                                                            | Returns cherryPick.noCommit=true                      | Custom value |
| TC-034  | dialog.stashUncommittedChanges.includeUntracked=true | Normal - custom                                                            | Returns stashUncommittedChanges.includeUntracked=true | Custom value |

## S8: commitOrdering() commit display order setting

> Origin: Feature 015 (commit-sort-order) (aidd-spec-tasks-test)
> Added: 2026-03-10
> Status: active
> Supersedes: -

**Signature**: `commitOrdering(): CommitOrdering`
**Target path**: `src/config.ts`

| Case ID | Input / Precondition            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result       | Notes                   |
| ------- | ------------------------------- | -------------------------------------------------------------------------- | --------------------- | ----------------------- |
| TC-035  | Setting not specified (default) | Normal - default                                                           | Returns "date"        | Default value           |
| TC-036  | Setting value="topo"            | Normal - standard                                                          | Returns "topo"        | Valid alternative value |
| TC-037  | Setting value="author-date"     | Normal - standard                                                          | Returns "author-date" | Valid alternative value |

## S9: dialogDefaults() createWorktree/removeWorktree settings

> Origin: Feature 019 (worktree-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-15
> Status: active
> Supersedes: -

**Signature**: `dialogDefaults(): DialogDefaults`
**Target path**: `src/config.ts`

| Case ID | Input / Precondition                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                           | Notes                               |
| ------- | ------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------- |
| TC-038  | dialog.createWorktree.openTerminal not specified | Normal - default                                                           | Returns createWorktree.openTerminal=true  | Default value (backward compatible) |
| TC-039  | dialog.createWorktree.openTerminal=false         | Normal - custom                                                            | Returns createWorktree.openTerminal=false | Custom value                        |
| TC-040  | dialog.removeWorktree.deleteBranch not specified | Normal - default                                                           | Returns removeWorktree.deleteBranch=true  | Default value                       |
| TC-041  | dialog.removeWorktree.deleteBranch=false         | Normal - custom                                                            | Returns removeWorktree.deleteBranch=false | Custom value                        |

## S17: gitPath() resolving the Git executable path

> Origin: test-plan (既存コード網羅)
> Added: 2026-05-17
> Status: superseded
> Superseded By: S18
> Supersedes: -
> Signature: `gitPath(): string`
> Target Path: `src/config.ts`

Evaluates the result of `vscode.workspace.getConfiguration("git").get("path", null)` with a ternary operator and returns the default value `"git"` when it is `null`.

| Case ID | Input / Precondition                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                | Notes                                                                     |
| ------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------- |
| TC-093  | `git.path` is `null` (VS Code default when not set)                | Normal - default fallback                                                  | Returns `"git"`                | false branch of `path !== null`                                           |
| TC-094  | `git.path = "/usr/local/bin/git"`                                  | Normal - configured                                                        | Returns `"/usr/local/bin/git"` | Returned as is in the true branch                                         |
| TC-095  | `git.path = ""` (empty string)                                     | Boundary - empty string                                                    | Returns `""`                   | By spec it only checks `!== null`, so the empty string passes through too |
| TC-096  | `git.path = "C:\\Program Files\\Git\\bin\\git.exe"` (Windows path) | Normal - cross-platform                                                    | Returns the given Windows path | Platform-dependent                                                        |
