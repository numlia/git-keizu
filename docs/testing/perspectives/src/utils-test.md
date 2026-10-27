# Test Perspectives: src/utils.ts

> Source: `src/utils.ts`
> Generated: 2026-04-04T12:00:00Z
> Language: TypeScript
> Test Framework: Vitest

## S1: doesFileExist() file existence check

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: active
> Supersedes: -

**Signature**: `doesFileExist(path: string): Promise<boolean>`
**Target path**: `src/utils.ts`

| Case ID | Input / Precondition                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes                               |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------- | --------------- | ----------------------------------- |
| TC-001  | A path for which fs.access resolves normally   | Normal - standard                                                          | Returns true    | Mock of fs.access(path, F_OK)       |
| TC-002  | A path for which fs.access rejects with ENOENT | Normal - non-existent path                                                 | Returns false   | Catches the error and returns false |

## S2: openFile() path traversal check

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: superseded
> Superseded By: S6
> Supersedes: -

**Signature**: `openFile(repo: string, filePath: string, commitHash: string, dataSource: DataSource, viewColumn: vscode.ViewColumn): Promise<string | null>`
**Target path**: `src/utils.ts`

| Case ID | Input / Precondition                                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                   | Notes                                              |
| ------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------- |
| TC-003  | filePath contains a ".." segment (e.g. "../etc/passwd")                         | Validation - path traversal                                                | An error message string is returned. vscode.commands.executeCommand is not called | First-stage check                                  |
| TC-004  | path.resolve(repo, filePath) does not have the repo prefix                      | Validation - prefix escape                                                 | An error message string is returned. vscode.commands.executeCommand is not called | Second-stage check                                 |
| TC-005  | File missing + rename target found + the new path does not have the repo prefix | Validation - renamed path traversal                                        | An error message string is returned                                               | The prefix check also applies to the rename target |

## S3: openFile() normal file open

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: active
> Supersedes: -

**Signature**: `openFile(repo: string, filePath: string, commitHash: string, dataSource: DataSource, viewColumn: vscode.ViewColumn): Promise<string | null>`
**Target path**: `src/utils.ts`

| Case ID | Input / Precondition                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                               | Notes                              |
| ------- | ----------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| TC-006  | The file exists                                 | Normal - standard                                                          | Returns null. vscode.commands.executeCommand is called with "vscode.open", Uri, { preview: true, viewColumn } | Checks preview: true               |
| TC-007  | The file exists and viewColumn = ViewColumn.One | Normal - viewColumn pass-through                                           | The third argument of vscode.open contains viewColumn: ViewColumn.One                                         | Checks the viewColumn pass-through |

## S4: openFile() rename tracking

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: active
> Supersedes: -

**Signature**: `openFile(repo: string, filePath: string, commitHash: string, dataSource: DataSource, viewColumn: vscode.ViewColumn): Promise<string | null>`
**Target path**: `src/utils.ts`

| Case ID | Input / Precondition                                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                   | Notes                                              |
| ------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------- |
| TC-008  | File missing + getNewPathOfRenamedFile returns a new path + the file at the new path exists | Normal - rename success                                                    | Returns null. vscode.open is called with the URI of the new path                  | Successful rename tracking flow                    |
| TC-009  | File missing + getNewPathOfRenamedFile returns null                                         | Exception - no rename found                                                | Returns "The file ... doesn't currently exist in this repository."                | No rename information                              |
| TC-010  | File missing + the file at the rename target path does not exist either                     | Exception - renamed path missing                                           | Returns "The file ... doesn't currently exist in this repository."                | The rename target is also missing                  |
| TC-011  | File missing + commitHash is UNCOMMITTED_CHANGES_HASH                                       | Normal - uncommitted skip                                                  | An error message is returned. Verifies that getNewPathOfRenamedFile is not called | Rename tracking is skipped for uncommitted changes |

## S5: openFile() error handling

> Origin: Feature 026 (commit-detail-open-file) (aidd-spec-tasks-test)
> Added: 2026-04-04
> Status: active
> Supersedes: -

**Signature**: `openFile(repo: string, filePath: string, commitHash: string, dataSource: DataSource, viewColumn: vscode.ViewColumn): Promise<string | null>`
**Target path**: `src/utils.ts`

| Case ID | Input / Precondition                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                     | Notes                         |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------- |
| TC-012  | The file exists + vscode.commands.executeCommand throws | Exception - vscode.open failure                                            | Returns "Visual Studio Code was unable to open ..." | Error conversion in try-catch |

## S6: openFile() path traversal check based on path.relative

> Origin: フェーズ3 修正 L12 (path-relative-traversal-guard)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: S2
> Signature: `openFile(repo: string, filePath: string, commitHash: string, dataSource: DataSource, viewColumn: vscode.ViewColumn): Promise<string | null>`
> Target Path: `src/utils.ts:70-99`

A fix that replaces the old two-stage path traversal check (first stage `filePath.split("/").includes("..")` + second stage `!resolvedPath.startsWith(repo)`) with a single check that rejects the path when the result of `path.relative(repo, path.resolve(repo, filePath))` starts with `".."` or is `path.isAbsolute`. The same relative check applies to the rename target path. The old `startsWith(repo)` wrongly allowed sibling directories that share the prefix, such as `repo="/a"` and `resolvedPath="/ab/x"`, while the relative check reliably rejects this as `"../ab/x"`. Replaces the split-includes + startsWith premise of S2.

| Case ID | Input / Precondition                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                          | Notes                                                                                                             |
| ------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| TC-013  | repo=`/repo`, filePath=`src/a.ts` (inside the repo)                                 | Normal - inside repo allowed                                               | `path.relative` is `"src/a.ts"` (neither starting with `".."` nor absolute), so it passes the guard and proceeds to opening the file                     | Normal path                                                                                                       |
| TC-014  | repo=`/repo`, filePath=`../etc/passwd`                                              | Validation - relative escape rejected                                      | `path.relative` is `"../etc/passwd"`, which starts with `".."`, so `PATH_TRAVERSAL_ERROR` is returned and `vscode.commands.executeCommand` is not called | Relative escape                                                                                                   |
| TC-015  | repo=`/repo`, filePath=`/etc/passwd` (absolute path)                                | Type - absolute path rejected                                              | Rejected by the `path.relative` check after `path.resolve`, returning `PATH_TRAVERSAL_ERROR` (caught by either the `..` start or `isAbsolute`)           | Absolute path. The `isAbsolute` branch shows up across drives on Windows; on POSIX it is caught by the `..` start |
| TC-016  | File missing + `getNewPathOfRenamedFile` returns a new path that escapes the repo   | Validation - renamed path escape rejected                                  | The `path.relative` of the rename target starts with `".."`, so `PATH_TRAVERSAL_ERROR` is returned                                                       | The relative check also applies to the rename target                                                              |
| TC-017  | repo=`/repo`, filePath=`""` (resolves to the repo root itself)                      | Boundary - repo root allowed                                               | `path.relative(repo, repo)` is `""`, neither starting with `".."` nor absolute, so it passes the guard                                                   | repo root boundary                                                                                                |
| TC-018  | repo=`/repo`, resolvedPath is `/repo-evil/x` (sibling directory sharing the prefix) | Boundary - sibling prefix rejected                                         | `path.relative` is `"../repo-evil/x"`, which starts with `".."`, so it is rejected (the old `startsWith("/repo")` wrongly allowed it)                    | Core regression of L12                                                                                            |

## S7: isValidCommitHash() shared helper for the commit hash value range

> Origin: Feature 052 (detached-worktree-display) (light-spec-plan)
> Added: 2026-08-08
> Status: active
> Supersedes: -
> Signature: `isValidCommitHash(hash: string): boolean`
> Target Path: `src/utils.ts` (`isValidCommitHash()`; update to a line range after implementation)
> Test File: `tests/src/utils.test.ts`

An addition that moves the private helper of `src/dataSource.ts` (`/^[0-9a-f]{4,40}$/i`) to `src/utils.ts` and exports it, so that DataSource and `src/worktree.ts` use the same rule. The value range stays as it is, and it fixes that 64-character SHA-256 object IDs are rejected as out of scope for this change. The behavior of each call site at the original location is covered by the existing sections of `src/dataSource-test/`; this section covers only the value range of the helper itself.

| Case ID | Input / Precondition                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result | Notes                                                        |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------ |
| TC-019  | `hash` = 40-character lowercase hex string           | Normal - full length hash                                                  | Returns `true`  | Normal full hash. Also serves as the maximum length boundary |
| TC-020  | `hash` = `"ABCD1234"` (uppercase hex)                | Normal - case insensitive                                                  | Returns `true`  | Keeps the `/i` flag                                          |
| TC-021  | `hash` = `"abcd"` (4 characters)                     | Boundary - minimum length                                                  | Returns `true`  | Lower limit of a short hash                                  |
| TC-022  | `hash` = `"abc"` (3 characters)                      | Boundary - minimum minus one                                               | Returns `false` | Lower limit -1                                               |
| TC-023  | `hash` = 41-character hex string                     | Boundary - maximum plus one                                                | Returns `false` | Upper limit +1                                               |
| TC-024  | `hash` = `""` (empty string)                         | Boundary - empty                                                           | Returns `false` | Empty input                                                  |
| TC-025  | `hash` = 64-character hex string (SHA-256 object ID) | Boundary - sha-256 length rejected                                         | Returns `false` | Explicitly fixes the out-of-scope contract of chapter 6      |
| TC-026  | `hash` = `"zzzz"` (non-hex letters)                  | Type - non-hex character                                                   | Returns `false` | Character class check                                        |
| TC-027  | `hash` = `"abcd\n"` (trailing newline)               | Validation - trailing newline rejected                                     | Returns `false` | Confirms that `$` does not act as a multiline boundary       |
| TC-028  | `hash` = `" abcd"` (leading space)                   | Validation - surrounding whitespace rejected                               | Returns `false` | Rejected without trimming                                    |
| TC-029  | `hash` = `"-abcd"` (option-like string)              | Validation - option-like argument rejected                                 | Returns `false` | Ensures no option is passed to Git arguments                 |

### Failure-source inventory (include-or-justify) — Feature 052 additions (S7)

| Failure source                                                            | Covering case or reason for exclusion                                                                                                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The minimum or maximum length changes in the move                         | TC-019, TC-021, TC-022, TC-023                                                                                                                                           |
| Uppercase hashes wrongly rejected                                         | TC-020                                                                                                                                                                   |
| Non-hex characters accepted                                               | TC-026                                                                                                                                                                   |
| Leading / trailing whitespace or newlines allowed, giving a partial match | TC-027, TC-028                                                                                                                                                           |
| Option-like strings passed to Git arguments                               | TC-029                                                                                                                                                                   |
| 64-character SHA-256 accidentally added                                   | TC-025                                                                                                                                                                   |
| Boundary values (0 / minimum / maximum / +/-1 / empty)                    | TC-021 (minimum), TC-022 (minimum-1), TC-019 (maximum), TC-023 (maximum+1), TC-024 (empty). Length 0 is the same input as TC-024, so they were merged                    |
| Boundary values (NULL)                                                    | excluded(the argument is of type `string` and cannot be `null` / `undefined`. The empty string is verified by TC-024)                                                    |
| External dependency failure                                               | excluded(regular expression check only, with no external dependency)                                                                                                     |
| Exception thrown                                                          | excluded(a pure function returning `boolean` with no throw path)                                                                                                         |
| Behavior change at each DataSource call site                              | excluded(covered per call site by existing sections such as `src/dataSource-test/01-history-diff-01.md` S27 TC-162. This change does not alter the helper's value range) |

**Failure-category coverage (diversity floor)**:

- Validation: TC-027, TC-028, TC-029
- Exception: excluded(no throw path)
- External: excluded(no external dependency)
- Boundary: TC-021, TC-022, TC-023, TC-024, TC-025
- Type: TC-026

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-019, TC-020), 9 failure cases (TC-021 to TC-029; cases whose `Perspective` starts with `Boundary` / `Type` / `Validation` are counted as failure cases). The ratio is 4.5 and not close (within a difference of 1), so re-deriving the inventory was judged unnecessary.
