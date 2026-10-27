# Test Perspectives: src/worktree.ts

> Source: `src/worktree.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: parseWorktreeList() porcelain output parsing

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: superseded
> Supersedes: -
> Superseded By: S2

**Signature**: `parseWorktreeList(stdout: string): WorktreeMap`
**Target path**: `src/worktree.ts`

| Case ID | Input / Precondition                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                            | Notes                                                             |
| ------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| TC-001  | Regular porcelain output (2 entries: main worktree + feature branch)   | Normal - standard                                                          | A map with 2 entries. Keys are short branch names; values are the path and the isMain flag | main: isMain=true, feature: isMain=false                          |
| TC-002  | Empty string                                                           | Boundary - empty                                                           | Empty map `{}`                                                                             | Empty input                                                       |
| TC-003  | Main worktree only (1 entry)                                           | Boundary - min (single entry)                                              | 1 entry, isMain=true                                                                       | Smallest valid input                                              |
| TC-004  | Output containing a detached HEAD entry                                | Normal - skip detached                                                     | The detached HEAD entry is skipped. Only entries with a branch are included                | Entry without a branch line                                       |
| TC-005  | Output containing a bare entry                                         | Normal - skip bare                                                         | The bare entry is skipped                                                                  | Entry with the bare flag                                          |
| TC-006  | Multiple worktrees (main + 3 feature branches)                         | Normal - multiple                                                          | A map with 4 entries. Only the first entry has isMain=true                                 | -                                                                 |
| TC-007  | Branch line with the refs/heads/ prefix                                | Normal - prefix strip                                                      | The key uses the short name with refs/heads/ removed                                       | branch refs/heads/feature/x → feature/x                           |
| TC-008  | Entry with unknown fields                                              | Normal - forward compat                                                    | Unknown fields are ignored and parsing succeeds                                            | Forward compatibility                                             |
| TC-009  | Mixed output with detached HEAD entries and entries with a branch line | Boundary - mixed                                                           | Only entries with a branch line are included in the map                                    | -                                                                 |
| TC-010  | Main worktree flag detection (first entry)                             | Normal - isMain                                                            | Only the first entry has isMain=true; the second and later are false                       | -                                                                 |
| TC-011  | Worktree whose path contains a space                                   | Normal - space in path                                                     | The path is kept intact                                                                    | The path includes everything after the space on the worktree line |

## S2: parseWorktreeList() classifies porcelain records as branch / detached / bare

> Origin: Feature 052 (detached-worktree-display) (light-spec-plan)
> Added: 2026-08-08
> Status: active
> Supersedes: S1
> Signature: `parseWorktreeList(stdout: string): WorktreeCollection`
> Target Path: `src/worktree.ts` (`parseWorktreeList()`; update to a line range after implementation)
> Test File: `tests/src/worktree.test.ts`

Changes the return value from `WorktreeMap` to `WorktreeCollection` (`branches` / `detached`) and replaces the current contract, which drops every record without a branch line, with a contract that classifies records in the priority order bare → branch → detached. A detached record goes into `detached` only after its `HEAD` commit hash passes the shared helper `isValidCommitHash()`; a conflicting, incomplete or invalid-hash record is excluded on its own and parsing of the other records continues. `detached` is returned in ascending order of full path. This supersedes S1, which fixed "detached HEAD entries are skipped" (TC-004 / TC-009) and a flat map return value. Validation of the hash value range itself belongs to `src/utils-test.md` S7, and Git execution and fallback belong to `src/dataSource-test/02-branch-worktree-03.md` S47.

| Case ID | Input / Precondition                                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                      | Notes                                                             |
| ------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| TC-012  | 2 records: main (`branch refs/heads/main`) and linked (`branch refs/heads/feature/x`) | Normal - branch entries retained                                           | `branches` matches `{ main: { path: "/repo", isMain: true }, "feature/x": { path: "/wt/x", isMain: false } }` with `toEqual`, and `detached` is `[]` | Carries over S1/TC-001, TC-006 and TC-010                         |
| TC-013  | Record with `branch refs/heads/feature/x`                                             | Normal - refs/heads prefix strip                                           | The `branches` key is `"feature/x"` (without `refs/heads/`)                                                                                          | Carries over S1/TC-007                                            |
| TC-014  | Second record with `worktree /tmp/wt8` / `HEAD abc1234` / `detached`                  | Normal - detached entry added                                              | `detached` matches `[{ path: "/tmp/wt8", head: "abc1234", isMain: false }]` with `toEqual`, and `branches` is `{}`                                   | The case that resolves 8.1. Fails with the current implementation |
| TC-015  | First record has `HEAD` + `detached` (no branch); second record has a branch          | Boundary - first record isMain                                             | `detached[0].isMain` is `true`, and `isMain` of the entry in `branches` is `false`                                                                   | Only the first record is main                                     |
| TC-016  | Record with `bare` and `HEAD` + record with a branch                                  | Normal - bare excluded                                                     | `branches` has no key for the bare record, and the length of `detached` is `0`                                                                       | Carries over S1/TC-005. Not treated as detached even with `HEAD`  |
| TC-017  | Record with both `branch refs/heads/x` and `detached` + a valid branch record         | Validation - conflicting attributes                                        | The conflicting record goes into neither `branches` nor `detached`; only the valid record is added to `branches` (1 entry)                           | Conflict exclusion from 4.2-4                                     |
| TC-018  | Record with `worktree` and `detached` but no `HEAD` line + a valid detached record    | Validation - missing HEAD                                                  | The incomplete record is excluded, and the length of `detached` is `1` (valid record only)                                                           | Does not stop the whole parser                                    |
| TC-019  | Record with `HEAD zzzz` (non-hex) and `detached`                                      | Type - invalid head hash                                                   | `detached` is `[]`. No exception is thrown                                                                                                           | Rejected by the shared hash helper                                |
| TC-020  | Record with `HEAD abc` (3 characters) and `detached`                                  | Boundary - head below minimum length                                       | `detached` is `[]`                                                                                                                                   | Fewer than 4 characters is invalid                                |
| TC-021  | Branch record with `locked`, `prunable reason` and an unknown attribute with a value  | Normal - unknown fields ignored                                            | The `branches` entry matches the one without attributes with `toEqual`                                                                               | Carries over S1/TC-008. Contract kept per chapter 5               |
| TC-022  | 3 detached records appear in descending path order (`/c`, `/b`, `/a`)                 | Normal - detached sorted by path                                           | `detached.map((entry) => entry.path)` is `["/a", "/b", "/c"]`                                                                                        | Deterministic response and webview diff detection                 |
| TC-023  | 2 detached records with the same `HEAD abc1234` (different paths)                     | Boundary - duplicate head hash                                             | The length of `detached` is `2`, and `head` of both entries is `"abc1234"` (no deduplication)                                                        | A label is shown for each worktree                                |
| TC-024  | `stdout = ""` (empty string)                                                          | Boundary - empty input                                                     | The return value matches `{ branches: {}, detached: [] }` with `toEqual`                                                                             | Carries over S1/TC-002. Same shape as the empty fallback          |
| TC-025  | Record with no `worktree` line, only `HEAD` and `detached`                            | Validation - empty worktree path                                           | `detached` is `[]`                                                                                                                                   | Empty worktree exclusion from 4.2-4                               |
| TC-026  | Record with `worktree /tmp/my worktree/wt8`, `HEAD` and `detached`                    | Boundary - space in path                                                   | `detached[0].path` is `"/tmp/my worktree/wt8"`                                                                                                       | Carries over S1/TC-011                                            |
| TC-027  | Main worktree only (1 record with a branch)                                           | Boundary - single entry                                                    | `branches` has 1 key with `isMain` `true`, and `detached` is `[]`                                                                                    | Carries over S1/TC-003                                            |
| TC-028  | Output ending with consecutive blank lines that include an empty record               | Boundary - blank trailing record                                           | Empty records are ignored; only the valid records are reflected in `branches` / `detached`                                                           | Separator boundary                                                |

### Failure-source inventory (include-or-justify) — added by Feature 052 (S2)

| Failure source                                                      | Covering case or reason for exclusion                                                                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Drops every detached record (root cause in the current code)        | TC-014, TC-015, TC-022, TC-023                                                                                                                                                 |
| Treats bare as detached                                             | TC-016                                                                                                                                                                         |
| Allows a record to be both branch and detached                      | TC-017                                                                                                                                                                         |
| Lets a missing `HEAD` or invalid hash through                       | TC-018, TC-019, TC-020                                                                                                                                                         |
| Lets a missing `worktree` path through                              | TC-025                                                                                                                                                                         |
| One invalid record makes the whole parser fail                      | TC-017, TC-018 (both also verify that the valid records remain)                                                                                                                |
| Unknown or valued attributes change the classification              | TC-021                                                                                                                                                                         |
| Order of `detached` depends on the input                            | TC-022                                                                                                                                                                         |
| Worktrees with the same hash are deduplicated and lose their labels | TC-023                                                                                                                                                                         |
| Boundary values (empty / minimum / +/-1)                            | TC-020 (hash minimum -1), TC-024 (empty input), TC-027 (smallest valid input), TC-028 (empty record)                                                                           |
| Boundary values (0 / maximum)                                       | excluded(porcelain output has no limit on the number of records, and the maximum hash length boundary belongs to `src/utils-test.md` S7 TC-021 / TC-022)                       |
| Boundary values (NULL)                                              | excluded(the argument is of type `string` and cannot be `null`. The empty string is verified by TC-024)                                                                        |
| External dependency failure (Git execution, spawn)                  | excluded(`parseWorktreeList()` is a pure function with no external dependencies. Fallback on Git failure belongs to `src/dataSource-test/02-branch-worktree-03.md` S47 TC-293) |
| Throwing an exception                                               | excluded(by design per 4.2-4 there is no throw path. Exclusion of invalid records is verified by TC-017 to TC-020 and TC-025)                                                  |
| Errors in the hash value range itself                               | excluded(belongs to `src/utils-test.md` S7 TC-019 to TC-029)                                                                                                                   |

**Failure-category coverage (diversity floor)**:

- Validation: TC-017, TC-018, TC-025
- Exception: excluded(no throw path. Invalid records are verified under Validation / Type / Boundary)
- External: excluded(no external dependencies)
- Boundary: TC-015, TC-020, TC-023, TC-024, TC-026, TC-027, TC-028
- Type: TC-019

**Failure/normal ratio (smoke detector)**: 6 normal cases (TC-012, TC-013, TC-014, TC-016, TC-021, TC-022), 11 failure cases (TC-015, TC-017 to TC-020, TC-023 to TC-028). The ratio is 1.83, which is not close (within 1), so re-deriving the inventory was judged unnecessary.
