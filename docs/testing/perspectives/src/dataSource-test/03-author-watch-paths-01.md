# Test Perspectives: src/dataSource.ts

> Source: `src/dataSource.ts`
> Generated: 2026-05-02T01:45:44Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: author-watch-paths

## S13: getGitLog()/getCommits() Author filter extension

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                            | Notes                        |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------- |
| TC-084  | authorFilter="John Doe"                                   | Normal - standard                                                          | The git log arguments include `--author=John Doe`                                                          | When a filter is given       |
| TC-085  | authorFilter not given (undefined)                        | Normal - no filter                                                         | The git log arguments do not include `--author`                                                            | Keeps existing behavior      |
| TC-086  | authorFilter="" (empty string)                            | Boundary - empty                                                           | The git log arguments do not include `--author`, or the empty string is equivalent to no filter            | Handling of the empty string |
| TC-087  | authorFilter="Jane O'Brien" (contains special characters) | Normal - special chars                                                     | The git log arguments include `--author=Jane O'Brien`. No shell injection because it goes through spawnGit | Safety check                 |

## S14: commitDetails() committer email extension

> Origin: Feature 006 (git-graph-parity) (aidd-spec-tasks-test)
> Added: 2026-03-01
> Status: active
> Supersedes: -

**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                   | Notes                                        |
| ------- | -------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| TC-088  | The git show output includes %ce (committer email) | Normal - standard                                                          | GitCommitDetails.committerEmail is set to the correct email address                               | Format index 6                               |
| TC-089  | The committer email is an empty string             | Boundary - empty                                                           | GitCommitDetails.committerEmail is an empty string                                                | For example when it is not a noreply address |
| TC-090  | All 7 fields of commitInfo are set correctly       | Normal - standard                                                          | Existing fields (hash, author, email, date, committer) are unchanged, and committerEmail is added | Backward compatibility                       |

## S15: getAuthors() getting the Author list

> Origin: Feature 011 (author-filter-fix) (aidd-spec-tasks-test)
> Added: 2026-03-05
> Status: active
> Supersedes: -

**Signature**: `getAuthors(repo: string): Promise<string[]>`
**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                   | Notes                                           |
| ------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| TC-091  | The repository has commits from 5 authors                                      | Normal - standard                                                          | The 5 author names are returned as an array in alphabetical order | Parsing normal git shortlog output              |
| TC-092  | Empty repository (no HEAD, git shortlog exits with an error)                   | Boundary - empty (no HEAD)                                                 | Returns an empty array `[]`                                       | errorValue fallback of spawnGit                 |
| TC-093  | A repository with only 1 author                                                | Boundary - min (single author)                                             | Returns an array with 1 element                                   | Minimum valid count                             |
| TC-094  | The git shortlog command exits abnormally (non-zero exit code)                 | Exception - handled error                                                  | Returns an empty array `[]`                                       | errorValue fallback of spawnGit                 |
| TC-095  | shortlog output in the form `"    5\tAlice\n   12\tBob\n"`                     | Normal - parse                                                             | Returns `["Alice", "Bob"]` (the count part is removed)            | Verifies tab-separated parsing                  |
| TC-096  | The shortlog output is an empty string (zero commits)                          | Boundary - empty output                                                    | Returns an empty array `[]`                                       | The parser can handle empty input               |
| TC-097  | Author names contain spaces or special characters (for example "Jane O'Brien") | Normal - special chars                                                     | Author names with special characters are returned as is           | The parser keeps the whole string after the tab |

## S16: getCommits() authors integration

> Origin: Feature 011 (author-filter-fix) (aidd-spec-tasks-test)
> Added: 2026-03-05
> Status: active
> Supersedes: -

**Target path**: `src/dataSource.ts`

| Case ID | Input / Precondition                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                   | Notes                                         |
| ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| TC-098  | getCommits() runs normally (getAuthors returns an author list) | Normal - standard                                                          | The returned object includes an `authors` field set to the author list                            | getAuthors is integrated into Promise.all     |
| TC-099  | getAuthors fails and returns an empty array                    | Exception - fallback                                                       | commits/head/moreCommitsAvailable are fetched normally, and authors is returned as an empty array | Does not affect the other Promise.all results |

## S17: getGitLog branches array parameter

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**Signature**: `private getGitLog(repo: string, branches: string[], num: number, showRemoteBranches: boolean, authors: string[])`
**Target path**: `src/dataSource.ts:753-758`

| Case ID | Input / Precondition                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                              | Notes                                          |
| ------- | ------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------- |
| TC-100  | branches=["main","dev"]                          | Normal - standard                                                          | The git log arguments include "main" and "dev" (no --branches/--tags)        | Multiple branches given                        |
| TC-101  | branches=[]                                      | Normal - show all                                                          | The git log arguments include --branches --tags                              | Show all branches (as before)                  |
| TC-102  | branches=["feature/x"]                           | Normal - single                                                            | The git log arguments include "feature/x"                                    | Single branch given                            |
| TC-103  | branches=["main","dev"], showRemoteBranches=true | Normal - standard                                                          | The git log arguments include "main" and "dev", and do not include --remotes | Remotes are not needed when branches are given |
| TC-104  | branches=[], showRemoteBranches=true             | Normal - all + remotes                                                     | The git log arguments include --branches --tags --remotes                    | All branches + remotes                         |
| TC-105  | branches=[], showRemoteBranches=false            | Boundary - all without remotes                                             | The git log arguments include --branches --tags and do not include --remotes | Remotes hidden                                 |

## S18: getGitLog/getCommits authors array parameter

> Origin: Feature 012 (ui-enhancements) (aidd-spec-tasks-test)
> Added: 2026-03-07
> Status: active
> Supersedes: -

**Signature**: `private getGitLog(repo: string, branches: string[], num: number, showRemoteBranches: boolean, authors: string[])`
**Target path**: `src/dataSource.ts:753-758`

| Case ID | Input / Precondition     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                          | Notes                             |
| ------- | ------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------- |
| TC-106  | authors=["Alice","Bob"]  | Normal - standard                                                          | The git log arguments include both --author=Alice and --author=Bob                       | Multiple author filter (OR logic) |
| TC-107  | authors=[]               | Normal - no filter                                                         | The git log arguments do not include the --author flag                                   | No filter (as before)             |
| TC-108  | authors=["Jane O'Brien"] | Normal - special chars                                                     | The git log arguments include --author=Jane O'Brien. No shell injection through spawnGit | Safety with special characters    |
| TC-109  | authors=["Alice"]        | Normal - single                                                            | The git log arguments include --author=Alice                                             | Single author filter              |

## S26: getRepositoryStateWatchPaths() resolving the Git management directories

> Origin: Feature 033 (watch-refresh-scope) Task 1
> Added: 2026-05-02T01:45:44Z
> Status: active
> Supersedes: -
> Signature: `public async getRepositoryStateWatchPaths(repo: string): Promise<string[]>`
> Target Path: `src/dataSource.ts`

| Case ID | Input / Precondition                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                               | Notes                                                 |
| ------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| TC-150  | `git-dir=".git"`, `git-common-dir=".git"`                                    | Boundary - duplicate relative paths                                        | Returns `["/test/repo/.git"]`, and `rev-parse --git-dir` and `rev-parse --git-common-dir` are each called once with `cwd=repo`                | main worktree                                         |
| TC-151  | `git-dir="/main/.git/worktrees/feature-x"`, `git-common-dir="/main/.git"`    | Normal - linked worktree                                                   | Returns `["/main/.git/worktrees/feature-x", "/main/.git"]` with the worktree git-dir first                                                    | linked worktree                                       |
| TC-152  | `git-dir="./.git/worktrees/feature-x"`, `git-common-dir="/shared/repo/.git"` | Normal - mixed relative and absolute                                       | The relative path is resolved to the absolute path `/test/repo/.git/worktrees/feature-x` based on `repo`, and the absolute path is kept as is | Normalization                                         |
| TC-153  | `git-dir=".git"`, `git-common-dir` exits non-zero                            | External - git-common-dir failure                                          | Returns only `["/test/repo/.git"]`, and the failed `git-common-dir` is not in the array                                                       | Partial-success fallback                              |
| TC-154  | `git-dir` gets an error event, `git-common-dir="/main/.git"`                 | External - git-dir failure                                                 | Returns only `["/main/.git"]`, the result of the successful `git-common-dir`                                                                  | error event fallback                                  |
| TC-155  | Both `git-dir` and `git-common-dir` fail                                     | External - all rev-parse failed                                            | Returns an empty array `[]`                                                                                                                   | Final fallback when the watch root cannot be resolved |

## S29: getGitLog() escaping regex metacharacters in `--author`

> Origin: フェーズ2 修正 M1 (author-filter-regex-escape)
> Added: 2026-07-04T02:44:58Z
> Status: active
> Supersedes: -
> Signature: `function escapeRegExp(str: string): string` / `private getGitLog(repo, branches, num, showRemoteBranches, authors: string[])`
> Target Path: `src/dataSource.ts:64-66, 979-981`

`git log --author=<pattern>` interprets the value as a regular expression, so this fix escapes regex metacharacters in author names (`. * + ? ^ $ { } ( ) | [ ] \`) with `\` using `escapeRegExp` before concatenating them to `--author=`. This lets authors containing brackets, such as `dependabot[bot]`, be filtered by the intended exact match. Author names without metacharacters are unchanged after escaping.

| Case ID | Input / Precondition                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                 | Notes                                                                 |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| TC-173  | authors=["dependabot[bot]"]                               | Normal - bracket escape                                                    | The git log arguments include `--author=dependabot\[bot\]` (`[` and `]` are escaped with `\`)                                   | Exact match for bot authors with brackets                             |
| TC-174  | authors=["Jane O'Brien"] (no metacharacters)              | Normal - passthrough unchanged                                             | The git log arguments include `--author=Jane O'Brien` as is (`'` and the space are outside the metacharacter set and unchanged) | Backward compatibility of existing behavior (consistent with S13/S18) |
| TC-175  | authors=["a.b*c"]                                         | Normal - dot and star escape                                               | The git log arguments include `--author=a\.b\*c` (`.` and `*` are escaped with `\`)                                             | Neutralizes any-character and quantifier metacharacters               |
| TC-176  | authors=["a\\b"] (backslash)                              | Boundary - backslash escape                                                | The git log arguments include `--author=a\\b` (`\` is doubled to `\\`)                                                          | Escaping the backslash itself                                         |
| TC-177  | authors=[""] (empty-string author)                        | Boundary - empty author                                                    | The git log arguments include `--author=` (`escapeRegExp("")==="" `). spawn does not throw                                      | The empty string has nothing to replace                               |
| TC-178  | authors=["(a\|b)"] (group and alternation metacharacters) | Boundary - group and alternation escape                                    | The git log arguments include `--author=\(a\|b\)` (`(`, `)`, `\|` are escaped with `\`)                                         | Neutralizes alternation and group metacharacters                      |
