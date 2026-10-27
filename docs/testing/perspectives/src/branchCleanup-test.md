# Test Perspectives: src/branchCleanup.ts

> Source: `src/branchCleanup.ts`
> Generated: 2026-08-25T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest
> Storage Mode: single-file

## S1: NUL snapshot parsing and record / field validation

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `parseBranchSnapshot(stdout: string): BranchSnapshot` (pure function; update to the exact function name after implementation)
> Target Path: `src/branchCleanup.ts` (NUL snapshot parsing; update to a line range after implementation)
> Test File: `tests/src/branchCleanup.test.ts`

Perspectives for the pure function that converts the NUL-separated 7-field output of `for-each-ref` (`%(refname)` / `%(HEAD)` / `%(upstream)` / `%(upstream:track)` / `%(committerdate:unix)` / `%(objectname)` / `%(tree)`) into an immutable internal snapshot. A record whose `refs/heads/` refname, the snapshot's identity, is invalid is dropped as a whole record; an invalid commit / tree / date / upstream makes only that fact unknown (implementation plan §4 Task 2, implementation item 2). Starting the child process and its arguments are the responsibility of `src/dataSource-test/06-branch-cleanup-01.md` S48 and are not covered here.

| Case ID | Input / Precondition                                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                         | Notes                                               |
| ------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| TC-001  | 2 records with 7 valid fields (`refs/heads/main` current, `refs/heads/feature/x`), NUL-separated | Normal - all fields parsed                                                 | A snapshot with 2 entries is returned; branchName / isCurrent / commit OID / tree OID / unixSeconds match the input with `toEqual`, and the entries stay in input order | Keeps the `--sort=refname` order                    |
| TC-002  | A record whose `%(upstream)` is `refs/remotes/origin/feature/x` and `%(upstream:track)` is empty | Normal - upstream present                                                  | That entry's upstream matches `{ kind: "present", name: "origin/feature/x" }` with `toEqual`                                                                            | Not collapsed into unset / gone                     |
| TC-003  | A record whose `%(upstream)` is an empty string                                                  | Normal - upstream unset                                                    | That entry's upstream matches `{ kind: "unset" }` with `toEqual` (not `unknown`)                                                                                        | Distinguishes unset from a fetch failure            |
| TC-004  | A record with `%(upstream)` and `%(upstream:track)` = `[gone]`                                   | Normal - upstream gone                                                     | That entry's upstream matches `{ kind: "gone", name: "origin/feature/x" }` with `toEqual`                                                                               | gone is not collapsed into unset                    |
| TC-005  | A record with refname `refs/tags/v1` mixed with valid records                                    | Validation - record with invalid refname dropped                           | The invalid record is not in the result, the number of entries equals the number of valid records, and all facts of the valid records are kept                          | Records that cannot form a row identity are dropped |
| TC-006  | A record with fewer than 7 fields mixed with valid records                                       | Validation - record with too few fields dropped                            | The invalid record is not in the result, and all facts of the valid records are kept                                                                                    | Prevents shifted fields from spreading              |
| TC-007  | A record whose `%(objectname)` is not an OID (`xyz`)                                             | Validation - invalid commit OID                                            | That entry does not keep the invalid commit OID for comparison (later synthesis makes ancestry / aheadBehind `unknown`), and branchName / lastCommit are kept           | Localized per fact                                  |
| TC-008  | A record whose `%(tree)` is not an OID                                                           | Validation - invalid tree OID                                              | That entry does not keep the invalid tree OID (later synthesis makes treeDifference `unknown`), and the other facts are kept                                            | Localized per fact                                  |
| TC-009  | A record whose `%(committerdate:unix)` is not numeric (`abc`)                                    | Validation - invalid date                                                  | That entry's lastCommit matches `{ kind: "unknown" }` with `toEqual`, and the other facts are kept                                                                      | -                                                   |
| TC-010  | stdout is an empty string                                                                        | Boundary - 0 records                                                       | A snapshot with 0 entries is returned (no exception; empty is a success state distinct from an error)                                                                   | Entry point of the 0-branch counterexample          |
| TC-011  | Only 1 valid record                                                                              | Boundary - 1 record                                                        | A snapshot with 1 entry is returned, and all facts match the input                                                                                                      | Entry point of the 1-branch counterexample          |
| TC-012  | A record whose `%(committerdate:unix)` is `0`                                                    | Boundary - unix seconds 0                                                  | That entry's lastCommit matches `{ kind: "known", unixSeconds: 0 }` with `toEqual` (0 is not collapsed into unknown)                                                    | Epoch boundary                                      |
| TC-013  | 3 records with refnames `refs/heads/a;b`, `refs/heads/feat/$(date)`, `refs/heads/x<img>`         | Type - special names kept as data                                          | The branchName of the 3 entries matches `a;b` / `feat/$(date)` / `x<img>` respectively with `toBe` (not interpreted, transformed or dropped)                            | Same branch, not interpreted as shell / HTML        |

### Failure-source inventory (include-or-justify) — added in Feature 055-03 (S1)

| Failure source                                          | Covering case or reason for exclusion                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Records with an invalid refname mixed in                | TC-005                                                                                                                                                       |
| Records with too few fields mixed in                    | TC-006                                                                                                                                                       |
| Invalid commit / tree OID                               | TC-007, TC-008                                                                                                                                               |
| Invalid date, or a 0 value collapsed                    | TC-009, TC-012                                                                                                                                               |
| Confusing upstream unset / gone / present               | TC-002 to TC-004                                                                                                                                             |
| Degenerate cases: empty output and 1 record             | TC-010, TC-011                                                                                                                                               |
| Special names interpreted or dropped                    | TC-013                                                                                                                                                       |
| External dependencies × failure modes (Git run failure) | excluded(the child process and failure isolation are the responsibility of `src/dataSource-test/06-branch-cleanup-01.md` S48)                                |
| Exception / error paths                                 | excluded(the pure function does not throw; by contract it drops invalid input or maps it to unknown. The dropping branches are verified in TC-005 to TC-009) |
| Boundary values (minimum / maximum / +/-1 / NULL)       | excluded(the input is a Git output string with no numeric arguments. 0 / empty are covered by TC-010 / TC-012)                                               |

**Failure-category coverage (diversity floor)**:

- Validation: TC-005 to TC-009
- Exception: excluded(by contract there is no throw path, as in the table above)
- External: excluded(no external dependencies. Running Git is the responsibility of the dataSource owner)
- Boundary: TC-010 to TC-012
- Type: TC-013
- Normal: TC-001 to TC-004

**Failure/normal ratio (smoke detector)**: 4 normal cases (TC-001 to TC-004), 9 failure cases (TC-005 to TC-013), ratio 2.25. These are derived from the inventory; no cases were added or removed to balance the ratio.

## S2: Compare-target resolution (requested / origin/HEAD / main / master / current fallback)

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `resolveCompareBranch(snapshot: BranchSnapshot, originHeadTarget: string | null, requested: string | null): ResolvedCompare | null` (pure function; update to the exact function name after implementation)
> Target Path: `src/branchCleanup.ts` (compare-target resolution; update to a line range after implementation)
> Test File: `tests/src/branchCleanup.test.ts`

The contract that the requested branch name's OID is used only after an exact match in the local snapshot, and when it is missing, the fallback runs on the same snapshot in the order origin/HEAD → main → master → current (implementation plan §3.1). When detached and every fallback fails, there is no compare target (null), and no arbitrary default is invented.

| Case ID | Input / Precondition                                                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                              | Notes                                            |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| TC-014  | The snapshot has `develop`, requested = `develop`                                                                            | Normal - requested exact match                                             | The resolved branch name is `develop`, and the compare OID matches the commit OID of the snapshot's `develop` entry with `toBe`              | Only OIDs from Git are used                      |
| TC-015  | requested = `gone-branch` is missing from the snapshot, origin/HEAD points to `main` and local `main` exists                 | Validation - fallback when the requested branch is gone                    | requested is not used, the fallback is evaluated, and the resolved branch name is `main`                                                     | No OID is made up for a vanished name            |
| TC-016  | requested = null, origin/HEAD points to `refs/remotes/origin/main`, and a local `main` with the same name is in the snapshot | Normal - origin/HEAD → local with the same name                            | The resolved branch name is `main`, and the compare OID matches the commit OID of local `main` with `toBe` (the remote-side OID is not used) | Exact match in the local snapshot                |
| TC-017  | origin/HEAD points to `release` but no local with the same name is in the snapshot, local `main` exists                      | Validation - no local with the origin/HEAD name                            | The value from origin/HEAD is not used, and the resolved branch name is `main`                                                               | Counterexample: origin/HEAD pointing to a remote |
| TC-018  | No origin/HEAD, no `main`, `master` is in the snapshot                                                                       | Normal - master fallback                                                   | The resolved branch name is `master`                                                                                                         | -                                                |
| TC-019  | No origin/HEAD, no `main` / `master`, the current branch `topic` exists                                                      | Normal - current fallback                                                  | The resolved branch name is `topic` (the isCurrent entry)                                                                                    | Last fallback                                    |
| TC-020  | Detached (no isCurrent entry) and none of origin/HEAD / `main` / `master` exist                                              | Boundary - detached with no fallback                                       | The resolved result is `null` (no default is synthesized; later all rows become `notSelected`)                                               | Counterexample: detached with no fallback        |
| TC-021  | The snapshot has only the current branch, requested = null                                                                   | Boundary - 1 branch                                                        | The resolved branch name matches that single branch (the current fallback makes it its own compare target)                                   | 1-branch counterexample                          |

### Failure-source inventory (include-or-justify) — added in Feature 055-03 (S2)

| Failure source                                                | Covering case or reason for exclusion                                                                                                          |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Using the name / OID of a vanished requested branch           | TC-015                                                                                                                                         |
| Reusing the OID when origin/HEAD points to a remote           | TC-016, TC-017                                                                                                                                 |
| Wrong fallback order (main / master / current)                | TC-017 to TC-019                                                                                                                               |
| Inventing a compare target when detached                      | TC-020                                                                                                                                         |
| Degenerate 1-branch case                                      | TC-021                                                                                                                                         |
| External dependencies × failure modes                         | excluded(pure function with no external dependencies. Handling an origin/HEAD fetch failure is the responsibility of the dataSource owner S48) |
| Exception / error paths                                       | excluded(by contract it returns null instead of throwing. The null branch is verified in TC-020)                                               |
| Invalid types / formats                                       | excluded(record / field validation of the input snapshot is the responsibility of S1)                                                          |
| Boundary values (0 / minimum / maximum / +/-1 / NULL / empty) | excluded(no numeric arguments. An empty snapshot is covered as 0 branches by S4 TC-039, and null resolution by TC-020)                         |

**Failure-category coverage (diversity floor)**:

- Validation: TC-015, TC-017
- Exception: excluded(no throw path)
- External: excluded(no external dependencies)
- Boundary: TC-020, TC-021
- Type: excluded(input validation is the responsibility of S1)
- Normal: TC-014, TC-016, TC-018, TC-019

**Failure/normal ratio (smoke detector)**: 4 normal cases (TC-014, TC-016, TC-018, TC-019), 4 failure cases (TC-015, TC-017, TC-020, TC-021). Because the counts are equal, the inventory was derived again, confirming that the failure sources of this section are limited to wrong fallback choices and degenerate cases (vanished, no local with the same name, detached, 1 branch), and that invalid input is assigned to S1 and Git failures to the dataSource owner.

## S3: ahead/behind parsing and exact remote ref matching

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `parseAheadBehind(stdout: string): BranchCleanupAheadBehind` / `matchRemoteRefs(branchName: string, remoteNames: readonly string[], remoteRefs: readonly string[]): string[]` (pure functions; update to the exact function names after implementation)
> Target Path: `src/branchCleanup.ts` (ahead/behind parsing and remote matching; update to a line range after implementation)
> Test File: `tests/src/branchCleanup.test.ts`

The contract that parses the output of `rev-list --left-right --count ${compareOid}...${branchOid}` (`left<TAB>right`; left = commits only in the compare target = behind, right = commits only in the branch = ahead) and decides ancestry from the right value only (implementation plan §3.1). Remote matching does not split remote names on slashes and uses only an exact match of `refs/remotes/${remoteName}/${branchName}`.

| Case ID | Input / Precondition                                                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                | Notes                                      |
| ------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| TC-022  | stdout = `0\t0`                                                                                             | Normal - same point                                                        | Matches `{ kind: "known", ahead: 0, behind: 0 }` with `toEqual`, and the ancestry result is `ancestor`                                         | Right value 0 → ancestor                   |
| TC-023  | stdout = `3\t2`                                                                                             | Normal - diverged                                                          | Matches `{ kind: "known", ahead: 2, behind: 3 }` with `toEqual`, and the ancestry result is `notAncestor`                                      | left = behind / right = ahead              |
| TC-024  | stdout = `5\t0`                                                                                             | Normal - behind only                                                       | Matches `{ kind: "known", ahead: 0, behind: 5 }` with `toEqual`, and the ancestry result is `ancestor` (the left value does not deny ancestry) | Basis of the normal-merge counterexample   |
| TC-025  | stdout = `abc`, or `3 2` without a TAB                                                                      | Type - malformed output                                                    | Matches `{ kind: "unknown" }` with `toEqual`, and the ancestry result is also `unknown` (not collapsed into a number)                          | -                                          |
| TC-026  | stdout = `9007199254740993\t0` (above the safe integer range)                                               | Boundary - safe integer exceeded                                           | Matches `{ kind: "unknown" }` with `toEqual` (a number that lost precision is not returned as known)                                           | Number.MAX_SAFE_INTEGER + 2                |
| TC-027  | remoteNames = `["origin"]`, remoteRefs contains `refs/remotes/origin/feature/x`, branchName = `feature/x`   | Normal - exact remote match                                                | The return value matches `["origin"]` with `toEqual`                                                                                           | -                                          |
| TC-028  | remoteNames = `["my", "my/remote"]`, remoteRefs contains `refs/remotes/my/remote/feat`, branchName = `feat` | Normal - remote name containing a slash                                    | The return value contains `my/remote` (matched by an exact match of the full ref, not by splitting the remote name on slashes)                 | Counterexample to slash splitting          |
| TC-029  | remoteRefs contains only `refs/remotes/origin/feature/x-suffix`, branchName = `feature/x`                   | Validation - prefix match rejected                                         | The return value matches `[]` with `toEqual` (no prefix or partial match)                                                                      | Exact match only                           |
| TC-030  | remoteRefs = `[]`                                                                                           | Boundary - 0 remote refs                                                   | The return value matches `[]` with `toEqual` (not `null`; distinguishes a successful empty fetch from a fetch failure)                         | null on failure belongs to S4 / dataSource |

### Failure-source inventory (include-or-justify) — added in Feature 055-03 (S3)

| Failure source                                                                   | Covering case or reason for exclusion                                                                                              |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Swapping left / right                                                            | TC-023, TC-024                                                                                                                     |
| Denying ancestry from the left value (source of the normal-merge counterexample) | TC-024                                                                                                                             |
| Collapsing malformed output into a number                                        | TC-025                                                                                                                             |
| Precision loss above the safe integer range                                      | TC-026                                                                                                                             |
| Wrong match from splitting remote names on slashes                               | TC-028                                                                                                                             |
| Wrongly accepting prefix or partial matches                                      | TC-029                                                                                                                             |
| Confusing an empty set with a fetch failure                                      | TC-030                                                                                                                             |
| External dependencies × failure modes (rev-list run failure)                     | excluded(isolating command failures is the responsibility of `src/dataSource-test/06-branch-cleanup-01.md` S48 TC-317)             |
| Exception / error paths                                                          | excluded(by contract it maps to unknown instead of throwing. The unknown branches are verified in TC-025 / TC-026)                 |
| Boundary values (minimum / +/-1 / NULL)                                          | excluded(0 is covered by TC-022, the upper limit by TC-026 and empty by TC-030. A null input cannot occur under the type contract) |

**Failure-category coverage (diversity floor)**:

- Validation: TC-029
- Exception: excluded(no throw path)
- External: excluded(no external dependencies)
- Boundary: TC-026, TC-030
- Type: TC-025
- Normal: TC-022 to TC-024, TC-027, TC-028

**Failure/normal ratio (smoke detector)**: 5 normal cases (TC-022 to TC-024, TC-027, TC-028), 4 failure cases (TC-025, TC-026, TC-029, TC-030). Because the difference is 1, the inventory was derived again, confirming that the failure sources of parsing / matching are limited to malformed formats, precision, wrong matches and empty sets, and that run failures are assigned to the dataSource owner.

## S4: Row synthesis (independent facts, localized failures, counterexamples)

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `synthesizeRows(snapshot: BranchSnapshot, compare: ResolvedCompare | null, comparisons: ..., worktrees: ..., remotes: ...): BranchCleanupRow[]` (pure function; update to the exact function name and arguments after implementation)
> Target Path: `src/branchCleanup.ts` (row synthesis; update to a line range after implementation)
> Test File: `tests/src/branchCleanup.test.ts`

Perspectives for row synthesis, which combines ancestry (the rev-list right value) and the tree difference (tree OID match) as independent fields and localizes per-fact fetch failures with discriminated unions (implementation plan §3.1 / §3.2). It does not mutate its inputs and returns new arrays and objects.

| Case ID | Input / Precondition                                                                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                               | Notes                                   |
| ------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| TC-031  | ahead 0 / behind 2, compare-target tree OID ≠ branch tree OID                                    | Normal - normal-merge counterexample                                       | The row is synthesized as `ancestry: "ancestor"` and `treeDifference: "different"` (an ancestor even though the tree has moved on)                            | Left side of the §3.1 counterexample    |
| TC-032  | ahead 1 / behind 1, compare-target tree OID = branch tree OID                                    | Normal - squash counterexample                                             | The row is synthesized as `ancestry: "notAncestor"`, `aheadBehind: { kind: "known", ahead: 1, behind: 1 }` and `treeDifference: "same"`                       | Right side of the §3.1 counterexample   |
| TC-033  | The comparison is unknown, both tree OIDs are valid                                              | Normal - tree computed independently                                       | The row keeps `ancestry: "unknown"`, while `treeDifference` is computed as `"same"` / `"different"` from the tree OID comparison (not dragged into unknown)   | Synthesis of a per-row rev-list failure |
| TC-034  | The branches of the worktree collection have an entry (path / isMain) for the branch             | Normal - worktree used                                                     | The row's worktree matches `{ kind: "used", path: "<input path>", isMain: <input value> }` with `toEqual`                                                     | -                                       |
| TC-035  | The worktree collection was fetched successfully and has no entry for the branch                 | Normal - worktree unused                                                   | The row's worktree matches `{ kind: "unused" }` with `toEqual`                                                                                                | -                                       |
| TC-036  | Input where the worktree collection represents a fetch failure (unavailable)                     | Exception - worktree failure kept                                          | The worktree of every row matches `{ kind: "unknown" }` with `toEqual` (not collapsed into `unused`)                                                          | Counterexample: worktree failure        |
| TC-037  | Input where the remote list represents a fetch failure (unavailable)                             | Exception - remote failure kept                                            | The remotes of every row become `null` (not collapsed into `[]`)                                                                                              | Counterexample: remote failure          |
| TC-038  | compare = null (no compare target)                                                               | Boundary - notSelected propagated                                          | The ancestry / treeDifference of every row become `"notSelected"`, and aheadBehind becomes `{ kind: "notSelected" }` (not `unknown`)                          | Downstream of detached with no fallback |
| TC-039  | The snapshot has 0 entries                                                                       | Boundary - 0 branches                                                      | The return value matches `[]` with `toEqual` (no exception; a successful empty state)                                                                         | -                                       |
| TC-040  | Take a deep copy of the snapshot / comparison inputs before the call and compare after synthesis | Validation - input immutability                                            | After the call the inputs match the deep copy with `toEqual` (no mutation), and the returned array is a different reference from the input array (`not.toBe`) | coding-style immutability               |

### Failure-source inventory (include-or-justify) — added in Feature 055-03 (S4)

| Failure source                                                                    | Covering case or reason for exclusion                                                                                         |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Confusing ancestry with the tree difference (collapsing into one overall verdict) | TC-031, TC-032                                                                                                                |
| A comparison unknown spreading into the tree column                               | TC-033                                                                                                                        |
| Collapsing worktree / remote failures into empty or unused                        | TC-036, TC-037                                                                                                                |
| Confusing notSelected with unknown                                                | TC-038                                                                                                                        |
| Degenerate 0-branch case                                                          | TC-039                                                                                                                        |
| Mutating the inputs                                                               | TC-040                                                                                                                        |
| Swapping worktree used / unused                                                   | TC-034, TC-035                                                                                                                |
| External dependencies × failure modes                                             | excluded(pure function with no external dependencies. Where failures arise is the responsibility of the dataSource owner S48) |
| Exception / error paths                                                           | excluded(by contract it maps to unions instead of throwing. Mapping of failure values is verified in TC-036 / TC-037)         |
| Invalid types / formats                                                           | excluded(field validation is the responsibility of S1, and invalid parsing of S3)                                             |
| Boundary values (minimum / maximum / +/-1 / NULL)                                 | excluded(no numeric arguments. 0 / empty / null-like cases are covered by TC-038 / TC-039)                                    |

**Failure-category coverage (diversity floor)**:

- Validation: TC-040
- Exception: TC-036, TC-037
- External: excluded(no external dependencies)
- Boundary: TC-038, TC-039
- Type: excluded(invalid types and formats are the responsibility of S1 / S3)
- Normal: TC-031 to TC-035

**Failure/normal ratio (smoke detector)**: 5 normal cases (TC-031 to TC-035), 5 failure cases (TC-036 to TC-040). Because the counts are equal, the inventory was derived again, confirming that the failure sources of the synthesis stage are limited to keeping failure values, propagation boundaries and immutability, and that invalid input (S1 / S3) and run failures (dataSource S48) are assigned to other sections / owners. Of the 5 normal cases, TC-031 to TC-033 directly pin the counterexample scenarios of §3.1; no cases were added or removed to balance the ratio.

## S5: Fact degradation for the HEAD mark, the upstream prefix and a symref outside origin

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: `parseBranchSnapshot(stdout: string): BranchSnapshotEntry[]` (degradation paths of the HEAD / upstream fields) / `parseOriginHeadTarget(stdout: string): string | null` (symref outside origin)
> Target Path: `src/branchCleanup.ts:97-113` (parseIsCurrent / parseUpstream), `src/branchCleanup.ts:174-186` (parseOriginHeadTarget)
> Test File: `tests/src/branchCleanup.test.ts`

Of the S1 preamble contract "an invalid commit / tree / date / HEAD / upstream makes only that fact unknown", this section additively numbers the invalid HEAD mark and invalid upstream prefix, which had no case rows in S1, and the symref outside origin, which was only described in the S2 contract (found in the Task 6 re-check; the existing S1 to S4 are unchanged). Normal cases and keeping the other facts are covered by the existing cases of S1 to S4.

| Case ID | Input / Precondition                                                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                               | Notes                                         |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| TC-041  | A record whose `%(HEAD)` field is a value other than `*` / space / empty (`?`)                                               | Validation - invalid HEAD mark                                             | That entry's isCurrent becomes `null` (not collapsed into true / false), and branchName / commit OID / lastCommit are kept                                                    | Localized per fact                            |
| TC-042  | A record whose `%(upstream)` is a ref under neither `refs/remotes/` nor `refs/heads/` (`refs/foo/bar`)                       | Validation - invalid upstream prefix                                       | That entry's upstream matches `{ kind: "unknown" }` with `toEqual` (not collapsed into unset / present), and the other facts are kept                                         | Unknown formats are treated as fetch failures |
| TC-043  | The `%(symref)` of origin/HEAD is outside `refs/remotes/origin/` (`refs/remotes/upstream/main`), and main is in the snapshot | Validation - symref outside origin                                         | `parseOriginHeadTarget()` returns `null`, and `resolveCompareBranch()` does not adopt origin/HEAD and resolves `main`, the next in order (values outside origin are not used) | Fallback sequence of S2 TC-016 to TC-018      |

### Failure-source inventory (include-or-justify) — added in Feature 055-03 (S5)

| Failure source                                                | Covering case or reason for exclusion                                                                                                   |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Collapsing an invalid HEAD mark into true / false             | TC-041                                                                                                                                  |
| Collapsing an invalid upstream prefix into unset / present    | TC-042                                                                                                                                  |
| Reusing a symref outside origin as the compare target         | TC-043                                                                                                                                  |
| Normal cases and keeping the other facts                      | excluded(covered by the existing cases S1 TC-001 to TC-004 / S2 TC-014 to TC-021. This section covers degradation paths only)           |
| External dependencies × failure modes                         | excluded(pure function with no external dependencies. Git run failures are the responsibility of the dataSource owner S48)              |
| Exception / error paths                                       | excluded(by contract it maps to null / unknown instead of throwing. The mapping itself is verified in TC-041 to TC-043)                 |
| Boundary values (0 / minimum / maximum / +/-1 / empty / NULL) | excluded(no numeric arguments. Empty fields are covered by S1 TC-003 / TC-010, and an empty symref target by TC-043 on the same branch) |
| Invalid types / formats                                       | excluded(invalid record / field structure is the responsibility of S1 TC-005 to TC-009. This section covers degraded value ranges)      |

**Failure-category coverage (diversity floor)**:

- Validation: TC-041 to TC-043
- Exception: excluded(no throw path)
- External: excluded(no external dependencies)
- Boundary: excluded(numeric and empty boundaries are the responsibility of S1)
- Type: excluded(structural invalidity is the responsibility of S1)
- Normal: excluded(a degradation-only section whose normal cases are covered by the existing cases of S1 / S2)

**Failure/normal ratio (smoke detector)**: 0 normal cases, 3 failure cases (TC-041 to TC-043). This section additively numbers only the degradation paths on top of the normal cases of S1 / S2, confirming that having 0 normal cases is not a gap in the inventory.
