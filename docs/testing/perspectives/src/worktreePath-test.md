# Test perspectives: src/worktreePath.ts

> Source: `src/worktreePath.ts`
> Generated: 2026-10-27T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Storage Mode: single-file

## S1: sanitizeBranchForPath() branch name as one directory

> Origin: Feature 062-01 (PR #114 follow-up)
> Added: 2026-10-27
> Status: active
> Supersedes: `web/utils-test.md` S4
> Signature: `sanitizeBranchForPath(branch: string): string`
> Target Path: `src/worktreePath.ts` (`sanitizeBranchForPath`)
> Test File: `tests/src/worktreePath.test.ts`

The `${branch}` placeholder must expand to a single directory name. The rules follow Better Worktrees: path separators, characters that are illegal in a Windows file name, whitespace and control characters become `-`; runs of `-`, `_` and `.` collapse; leading and trailing `-`, `_` and `.` are dropped; an empty result becomes `worktree`. It replaces `sanitizeBranchNameForPath` in `web/utils.ts`, which did not trim or fall back.

| Case ID | Input / Precondition                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                     | Notes                                       |
| ------- | ---------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------- |
| TC-001  | `branch = "hotfix"`                      | Normal - no change                                                         | Returns `"hotfix"`                  | -                                           |
| TC-002  | `branch = "feat/DATA-123-add-page"`      | Normal - namespaced branch                                                 | Returns `"feat-DATA-123-add-page"`  | `feat/api` and `feat/api/v2` can both exist |
| TC-003  | `branch = "feat\win"`                    | Normal - backslash                                                         | Returns `"feat-win"`                | -                                           |
| TC-004  | `branch = "feat//a___b"`                 | Normal - runs collapse                                                     | Returns `"feat-a_b"`                | `-` and `_` runs collapse separately        |
| TC-005  | `branch = "/feat/x/"`, then `".hidden."` | Boundary - leading and trailing separators                                 | Returns `"feat-x"`, then `"hidden"` | -                                           |
| TC-006  | `branch = "feat:a*b?c"`                  | Validation - characters illegal in a path                                  | Returns `"feat-a-b-c"`              | -                                           |
| TC-007  | `branch = "--force"`                     | Validation - leading dash                                                  | Returns `"force"`                   | A path is never read as an option           |
| TC-008  | `branch = "///"`, then `branch = ""`     | Boundary - nothing usable left                                             | Returns `"worktree"` for both       | -                                           |

### Failure-source inventory (include-or-justify) — S1

| Failure source                                | Case or reason for exclusion                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Namespaced branch spreads over nested folders | TC-002, TC-003                                                                                |
| Repeated or edge separators                   | TC-004, TC-005                                                                                |
| Characters a file system rejects              | TC-006                                                                                        |
| Directory name that looks like an option      | TC-007                                                                                        |
| Empty result                                  | TC-008                                                                                        |
| Whitespace and control characters             | excluded (same character class as TC-006; the default expansion with `feat/a b` is S3 TC-025) |
| Exception / External / Type                   | excluded (pure string function with a `string` parameter)                                     |

## S2: resolveWorktreePath() template expansion with POSIX paths

> Origin: Feature 062-01 (PR #114 follow-up)
> Added: 2026-10-27
> Status: active
> Supersedes: -
> Signature: `resolveWorktreePath(template: string, vars: WorktreePathVars): string`
> Target Path: `src/worktreePath.ts` (`resolveWorktreePath`, `expandHome`, posix `resolve` / `join` / `basename`)
> Test File: `tests/src/worktreePath.test.ts`

Fixture: `REPO = "/home/dev/repos/api"`, `HOME = "/home/dev"`, `platform: "posix"`. Each case checks the literal path and also that it equals a reference resolver: the Better Worktrees algorithm run on Node's `path.posix` (`referenceResolve` in the test file). The caller passes the main worktree as `repoPath`; choosing it is owned by `web/refMenu-test/02-worktree-actions-01.md` S27.

| Case ID | Input / Precondition                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                              | Notes                                |
| ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------ |
| TC-009  | Default template `${repoPath}/../${repoName}-${branch}`, `hotfix` | Normal - default layout                                                    | `/home/dev/repos/api-hotfix`                                 | Beside the repository                |
| TC-010  | Default template, `feat/DATA-123`                                 | Normal - branch sanitized                                                  | `/home/dev/repos/api-feat-DATA-123`                          | S1 rules applied                     |
| TC-011  | `~/.worktrees/${repoName}/${branch}`, `feat/x`                    | Normal - leading `~`                                                       | `/home/dev/.worktrees/api/feat-x`                            | -                                    |
| TC-012  | `${repoPath}/.worktrees/${branch}`, `hotfix`                      | Normal - nested layout                                                     | `/home/dev/repos/api/.worktrees/hotfix`                      | -                                    |
| TC-013  | `../side/${branch}`, `hotfix`                                     | Normal - relative template                                                 | `/home/dev/repos/side/hotfix`                                | Resolved against `repoPath`, not cwd |
| TC-014  | `${repoPath}/../../${branch}`, `hotfix`                           | Boundary - traversal segments                                              | `/home/dev/hotfix`                                           | `..` normalized away                 |
| TC-015  | `${repoPath}/${nope}`, `hotfix`                                   | Validation - unknown placeholder                                           | `/home/dev/repos/api/${nope}` (left as written, not emptied) | -                                    |
| TC-016  | `${repoPath}/${constructor}/${toString}`, `hotfix`                | Validation - names on `Object.prototype`                                   | `/home/dev/repos/api/${constructor}/${toString}`             | Lookup must not hit the prototype    |
| TC-017  | Template `"   "`, `hotfix`                                        | Boundary - blank setting                                                   | `/home/dev/repos/api-hotfix` (default template)              | -                                    |

### Failure-source inventory (include-or-justify) — S2

| Failure source                                    | Case or reason for exclusion                                                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Placeholder expansion and branch sanitizing       | TC-009, TC-010, TC-012                                                                                                                      |
| Home directory expansion                          | TC-011                                                                                                                                      |
| Relative template resolved against the wrong base | TC-013                                                                                                                                      |
| `..` left in the result                           | TC-014                                                                                                                                      |
| Unknown or prototype placeholder emptied          | TC-015, TC-016                                                                                                                              |
| Blank setting                                     | TC-017                                                                                                                                      |
| `~` alone, or a template that is only `~\`        | not covered (follow-up; review S12 of PR #114)                                                                                              |
| Exception / External / Type                       | excluded (pure function; the extension host supplies `homeDir` and the platform, see `src/gitGraphView-test/03-worktree-actions-01.md` S44) |

## S3: resolveWorktreePath() Windows paths and platform inference

> Origin: Feature 062-01 (PR #114 follow-up)
> Added: 2026-10-27
> Status: active
> Supersedes: -
> Signature: `resolveWorktreePath(template: string, vars: WorktreePathVars): string` / `windowsDriveDirectories(env): Record<string, string>`
> Target Path: `src/worktreePath.ts` (`inferWin32`, win32 `resolve` / `join` / `basename`, `driveDirectory`, `lookupDriveCwd`, `windowsDriveDirectories`)
> Test File: `tests/src/worktreePath.test.ts`

The webview has no Node `path`, so the win32 rules are ported. Cases that compare with Node use `path.win32` through the same reference resolver as S2. Paths below are values, not JavaScript string literals. Fixture: `repoPath = C:\src\repo` (or `C:\src\api`), `homeDir = C:\Users\dev`, `branch = "feature"` unless stated.

| Case ID | Input / Precondition                                                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                             | Notes                                         |
| ------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| TC-018  | `platform: "win32"`, `repoPath = C:\src\api`; the default, `~`, nested, relative and traversal templates of S2     | Normal - same templates on win32                                           | `C:\src\api-feat-x`, `C:\Users\dev\.worktrees\api\feat-x`, `C:\src\api\.worktrees\hotfix`, `C:\src\side\hotfix`, `C:\hotfix`; each equals Node `path.win32` | -                                             |
| TC-019  | `D:worktrees\${branch}` with the real `process.cwd()` and `windowsDriveDirectories(process.env)`                   | Normal - drive-relative on another drive                                   | Equals Node `path.win32` and starts with `D:\`                                                                                                              | -                                             |
| TC-020  | `D:worktrees\${branch}`, `driveCwd` maps `D:` to `D:\work\current`                                                 | Normal - drive working directory                                           | `D:\work\current\worktrees\feature`                                                                                                                         | -                                             |
| TC-021  | `D:worktrees\${branch}`, no `driveCwd`                                                                             | Boundary - drive without a working directory                               | `D:\worktrees\feature` (drive root)                                                                                                                         | -                                             |
| TC-022  | `C:worktrees\${branch}` on the repository's drive                                                                  | Normal - same-drive relative                                               | `C:\src\repo\worktrees\feature` (under the repository, not cwd)                                                                                             | -                                             |
| TC-023  | `d:worktrees\${branch}`, `driveCwd` maps `D:` to `D:\work\current`                                                 | Validation - drive letter case                                             | `d:\work\current\worktrees\feature`                                                                                                                         | Lookup ignores case, keeps the written letter |
| TC-024  | Default template, `repoPath = C:\src\api`, `platform` omitted                                                      | Normal - platform inferred                                                 | `C:\src\api-hotfix` (win32 rules chosen from the drive path)                                                                                                | -                                             |
| TC-025  | Default template, `branch = "feat/a b"`, forward-slash paths (`C:/src/api` or `/src/api`), for `posix` and `win32` | Boundary - mixed separators and whitespace                                 | Equals Node `path.posix` / `path.win32` for each platform                                                                                                   | `it.each` over both platforms                 |

### Failure-source inventory (include-or-justify) — S3

| Failure source                                | Case or reason for exclusion                                                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| win32 join / resolve differs from Node        | TC-018, TC-019, TC-025                                                                                                             |
| Drive-relative path on another drive          | TC-019, TC-020, TC-021                                                                                                             |
| Same-drive relative path resolved against cwd | TC-022                                                                                                                             |
| Drive letter case                             | TC-023                                                                                                                             |
| Wrong platform when `platform` is omitted     | TC-024                                                                                                                             |
| UNC paths (`\\server\share\...`)              | not covered (follow-up; review S10 of PR #114)                                                                                     |
| `windowsDriveDirectories` filter (`=C:` keys) | not covered by a fixed fixture: TC-019 reads `process.env`, which has no `=C:` keys on Linux CI (follow-up; review S11 of PR #114) |
| Exception / External / Type                   | excluded (pure functions; no throw path)                                                                                           |

### Test mapping — S1 to S3

`tests/src/worktreePath.test.ts`: describe `sanitizeBranchForPath` holds TC-001 to TC-008 and describe `resolveWorktreePath` holds TC-009 to TC-025, in table order. Each test name ends with its Case ID and starts with a `// Case:` comment.
