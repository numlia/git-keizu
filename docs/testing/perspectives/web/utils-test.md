# Test Perspectives: web/utils.ts

> Source: `web/utils.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: svgIcons SVG icon checks

> Origin: Feature 001 (menu-bar-enhancement) Task 1.2
> Added: 2026-02-25
> Status: active
> Supersedes: -

**Target path**: `web/utils.ts`

| Case ID | Input / Precondition | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                      | Notes |
| ------- | -------------------- | -------------------------------------------------------------------------- | ------------------------------------ | ----- |
| TC-001  | Read svgIcons.fetch  | Normal - standard                                                          | A non-empty string containing `<svg` | -     |
| TC-002  | Read svgIcons.stash  | Normal - standard                                                          | A non-empty string containing `<svg` | -     |

## S2: buildCommitRowAttributes() muted parameter

> Origin: Feature 009 (merge-commit-fix) (aidd-spec-tasks-test)
> Added: 2026-03-04
> Status: active
> Supersedes: -

**Signature**: `buildCommitRowAttributes(hash: string, stash: GG.GitCommitStash | null, muted: boolean): string`
**Target path**: `web/utils.ts`

| Case ID | Input / Precondition                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                            | Notes                                  |
| ------- | ----------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------- |
| TC-003  | hash="abc123", stash=null, muted=true                 | Normal - standard                                                          | Contains class="commit mute" data-hash="abc123"            | mute applied                           |
| TC-004  | hash="abc123", stash=null, muted=false                | Normal - standard                                                          | Contains class="commit" data-hash="abc123" (no mute)       | mute not applied                       |
| TC-005  | hash="abc123", stash={...}, muted=true                | Normal - special                                                           | Contains class="commit stash" data-hash="abc123" (no mute) | mute does not apply to stashes         |
| TC-006  | hash=UNCOMMITTED_CHANGES_HASH, stash=null, muted=true | Normal - special                                                           | Contains class="unsavedChanges" (no mute)                  | mute does not apply to unsaved changes |
| TC-007  | hash="abc123", stash=null, muted=true                 | Normal - standard                                                          | data-hash="abc123" is included                             | data-hash kept                         |

## S3: svgIcons.worktree icon check

> Origin: Feature 016 (worktree-support) (aidd-spec-tasks-test)
> Added: 2026-03-12
> Status: active
> Supersedes: -

**Target path**: `web/utils.ts`

| Case ID | Input / Precondition   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                      | Notes   |
| ------- | ---------------------- | -------------------------------------------------------------------------- | ------------------------------------ | ------- |
| TC-008  | Read svgIcons.worktree | Normal - standard                                                          | A non-empty string containing `<svg` | REQ-2.1 |

## S4: sanitizeBranchNameForPath() branch name path normalization

> Origin: Feature 024 (worktree-path-normalize) (aidd-spec-tasks-test)
> Added: 2026-03-27
> Status: superseded
> Supersedes: -
> Superseded By: S1（[../src/worktreePath-test.md](../src/worktreePath-test.md)）

**Signature**: `sanitizeBranchNameForPath(branchName: string): string`
**Target path**: `web/utils.ts`

| Case ID | Input / Precondition              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                 | Notes                                                   |
| ------- | --------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| TC-009  | branchName = "feature/x"          | Normal - standard                                                          | Returns `"feature-x"`                                           | REQ-9.1-TC1: / → -                                      |
| TC-010  | branchName = "feature/sub/branch" | Normal - standard                                                          | Returns `"feature-sub-branch"`                                  | REQ-9.1-TC2: multiple slashes                           |
| TC-011  | branchName = "feature//x"         | Normal - consecutive                                                       | Returns `"feature-x"` (consecutive / collapse into a single -)  | REQ-9.1-TC3                                             |
| TC-012  | branchName = "path\\file"         | Normal - standard                                                          | Returns `"path-file"`                                           | REQ-9.1-TC4: backslash                                  |
| TC-013  | branchName = "fix:bug"            | Normal - standard                                                          | Returns `"fix-bug"`                                             | REQ-9.1-TC4: colon                                      |
| TC-014  | branchName = 'a\*b?c"d<e>f\|g'    | Normal - standard                                                          | Returns `"a-b-c-d-e-f-g"`                                       | REQ-9.1-TC4: the remaining 6 characters (\* ? " < > \|) |
| TC-015  | branchName = "feature branch"     | Normal - standard                                                          | Returns `"feature-branch"`                                      | REQ-9.1-TC4: ASCII space                                |
| TC-016  | branchName = "main"               | Normal - no-change                                                         | Returns `"main"` (unchanged)                                    | REQ-9.1-TC5                                             |
| TC-017  | branchName = "feature/ x"         | Normal - consecutive                                                       | Returns `"feature-x"` (/ plus a space collapse into a single -) | REQ-9.1-TC6                                             |
| TC-018  | branchName = ""                   | Boundary - empty                                                           | Returns `""`                                                    | Empty string                                            |
| TC-019  | branchName = "feature-x"          | Normal - idempotent                                                        | Returns `"feature-x"`                                           | Idempotence: f(f(x)) === f(x)                           |

## S5: worktreeCollectionsEqual() collection difference check

> Origin: Feature 052 (detached-worktree-display) (light-spec-plan)
> Added: 2026-08-08
> Status: active
> Supersedes: -
> Signature: `worktreeCollectionsEqual(a: GG.WorktreeCollection, b: GG.WorktreeCollection): boolean`
> Target Path: `web/utils.ts` (`worktreeCollectionsEqual()`; to be updated to a line range after implementation)
> Test File: `tests/web/utils.test.ts`

Adds renaming `worktreeMapsEqual()` to `worktreeCollectionsEqual()` and, in addition to the `branches` keys, `path` and `isMain`, comparing the array length of `detached` and the `path`, `isMain` and `head` at each index. The parser normalizes `detached` into ascending order of full path, so the comparison is index by index, with no set comparison and no re-sort by the caller. The comparison rules for the existing branch map do not change, so S1 to S4 are not superseded. The decision to skip re-rendering itself belongs to `web/main-test/01-rendering-02.md` S48 TC-299.

| Case ID | Input / Precondition                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                              | Notes                                         |
| ------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------- |
| TC-020  | Two collections with 1 branch and 1 detached entry, all fields equal             | Normal - identical collections                                             | Returns `true`                                                               | Equality                                      |
| TC-021  | Both are `{ branches: {}, detached: [] }`                                        | Boundary - both empty                                                      | Returns `true`                                                               | Two empty fallbacks                           |
| TC-022  | Two collections with empty branches and only detached entries, all fields equal  | Normal - detached only                                                     | Returns `true`                                                               | Repository with no branches                   |
| TC-023  | The branches key counts differ, 1 and 2 (detached identical)                     | Boundary - branch count differs                                            | Returns `false`                                                              | Branches difference from 8.3                  |
| TC-024  | Same branches key count, only the key names differ (`feature/x` and `feature/y`) | Validation - branch key mismatch                                           | Returns `false`                                                              | Detected even when counts match               |
| TC-025  | Only the branches `path` differs                                                 | Validation - branch path differs                                           | Returns `false`                                                              | Per-field difference                          |
| TC-026  | Only the branches `isMain` differs                                               | Validation - branch isMain differs                                         | Returns `false`                                                              | Per-field difference                          |
| TC-027  | The detached array lengths differ, 1 and 2 (branches identical)                  | Boundary - detached length differs                                         | Returns `false`                                                              | Detached difference from 8.3                  |
| TC-028  | Only the `path` of detached[0] differs                                           | Validation - detached path differs                                         | Returns `false`                                                              | Per-field difference                          |
| TC-029  | Only the `isMain` of detached[0] differs                                         | Validation - detached isMain differs                                       | Returns `false`                                                              | Per-field difference                          |
| TC-030  | Only the `head` of detached[0] differs                                           | Validation - detached head differs                                         | Returns `false`                                                              | Head difference from 8.3. Detects a HEAD move |
| TC-031  | The detached elements are the same set, only in a different order                | Boundary - detached order differs                                          | Returns `false` (compares index by index, with no set comparison or re-sort) | Relies on the normalization in 4.5            |

### Failure-source inventory (include-or-justify) — added for Feature 052 (S5)

| Failure source                                                   | Covering case or reason for exclusion                                                                                                                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| detached is left out of the comparison                           | TC-027 to TC-031                                                                                                                                                                                        |
| Only a `head` difference is missed (a HEAD move is not detected) | TC-030                                                                                                                                                                                                  |
| The existing branches comparison rules break                     | TC-020, TC-023 to TC-026                                                                                                                                                                                |
| Only the array length is compared, not the element fields        | TC-028 to TC-030                                                                                                                                                                                        |
| A set comparison or re-sort ignores order differences            | TC-031                                                                                                                                                                                                  |
| Boundary values (empty)                                          | TC-021 (both empty), TC-022 (branches empty)                                                                                                                                                            |
| Boundary values (0 / minimum / maximum / +/-1)                   | TC-023 / TC-027 (count difference of +/-1). Not applicable to numeric limits, since a collection has none                                                                                               |
| Boundary values (NULL)                                           | excluded(the arguments have the required type `WorktreeCollection` and cannot be `null`. Turning an omitted response into an empty collection belongs to `web/main-test/01-rendering-02.md` S48 TC-298) |
| External dependency failure                                      | excluded(a pure function with no external dependencies)                                                                                                                                                 |
| Thrown exception                                                 | excluded(a pure function returning `boolean` with no throw path)                                                                                                                                        |
| Calls to the old `worktreeMapsEqual` remain                      | excluded(a static condition checked by a symbol search over runtime code and test imports. Covered by the completion criteria of Task 5)                                                                |

**Failure-category coverage (diversity floor)**:

- Validation: TC-024, TC-025, TC-026, TC-028, TC-029, TC-030
- Exception: excluded(no throw path)
- External: excluded(no external dependencies)
- Boundary: TC-021, TC-023, TC-027, TC-031
- Type: excluded(the argument type is fixed to `WorktreeCollection`, and typecheck rejects invalid types. The type contract belongs to `src/types-test.md` S7)

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-020, TC-022), 10 failure cases (TC-021, TC-023 to TC-031). The ratio is 5.0, which is not close (within 1), so the inventory was judged not to need re-deriving.
