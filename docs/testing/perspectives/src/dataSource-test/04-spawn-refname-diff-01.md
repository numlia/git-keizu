# Test Perspectives: src/dataSource.ts

> Source: `src/dataSource.ts`
> Generated: 2026-07-04T04:29:24Z
> Language: TypeScript
> Test Framework: Vitest
> Responsibility: spawn-refname-diff

## S32: spawnGit() draining the stderr stream

> Origin: フェーズ3 修正 L1 (spawn-stderr-drain)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: -
> Signature: `private spawnGit<T>(args: string[], repo: string, successValue: (stdout: string) => T, errorValue: T): Promise<T>`
> Target Path: `src/dataSource.ts:1244-1247`

A fix that adds `cmd.stderr.on("data", () => {})` to the child process of `spawnGit` so that the stderr stream is always drained (consumed). Without draining, when stderr output exceeds the OS pipe buffer limit (64KB by default on Linux), the child process blocks in the `write` system call, the `close` event never arrives, and the Promise hangs without resolving. The drain handler only discards the data and does not affect stdout parsing.

| Case ID | Input / Precondition                                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                      | Notes                                           |
| ------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| TC-188  | Run spawnGit and check whether a `data` listener is registered on `cmd.stderr`                       | Normal - stderr listener registered                                        | `cmd.stderr.on` is called once for the `"data"` event and a listener function is registered                          | Checks that the drain handler exists            |
| TC-189  | spawnGit exit 0. Emit a large amount of data on stderr (several `data` events), then emit `close(0)` | External - large stderr drained without hang                               | `close` is handled regardless of stderr content, and `successValue(stdout)` resolves once. The Promise does not hang | Avoids stderr piling up in the buffer           |
| TC-190  | spawnGit exit 0. Emit `data` on stderr while also emitting `data` on stdout                          | Boundary - stderr consumed but stdout preserved                            | `successValue` is called only with the string from stdout, and stderr content does not leak into the result          | Draining does not interfere with stdout parsing |

## S33: runGitCommandSpawn() conditional removal of the trailing empty line

> Origin: フェーズ3 修正 L2 (spawn-conditional-trailing-slice)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: -
> Signature: `private runGitCommandSpawn(args: string[], repo: string): Promise<GitCommandStatus>`
> Target Path: `src/dataSource.ts:1219-1226`

A fix that changes output formatting on the close code≠0 path from `lines.slice(0, lines.length - 1).join("\n")`, which always dropped the last line, to a conditional removal that `pop()`s the last element only when `lines[lines.length - 1] === ""`. When git printed an error message without a trailing newline, the old implementation lost the last line (part of the actual message). The empty element is removed only when there is a trailing newline (the last element after splitting is an empty string); otherwise all lines are kept.

| Case ID | Input / Precondition                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                      | Notes                                             |
| ------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| TC-191  | close code=1, stdout=`"error line\n"` (with trailing newline)      | Normal - trailing newline popped                                           | The resolved string is `"error line"` (only the trailing empty line is removed)                                      | Path that pops the trailing empty string          |
| TC-192  | close code=1, stdout=`"fatal: bad revision"` (no trailing newline) | Boundary - no trailing newline preserves last line                         | The resolved string is the whole `"fatal: bad revision"`, and the last line is not lost                              | Regression dropped by the old unconditional slice |
| TC-193  | close code=1, stdout=`"line1\nline2\n"`                            | Boundary - multiline trailing newline                                      | The resolved string is `"line1\nline2"` (only the trailing empty line is removed, middle lines are kept)             | Multiple lines + trailing newline                 |
| TC-194  | close code=1, stdout=`""`, stderr=`""` (both empty)                | Boundary - empty output                                                    | `"".split(eolRegex)` is `[""]`, the last element is an empty string so it is popped, and the resolved string is `""` | Empty output boundary                             |

## S34: addTag()/createBranch() rejecting ref names with a leading hyphen

> Origin: フェーズ3 修正 L4 (ref-name-option-injection-guard)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: -
> Signature: `function isRefNameSafe(refName: string): boolean` / `public addTag(...)` / `public createBranch(repo, branchName, commitHash)`
> Target Path: `src/dataSource.ts:84-87, 746-751, 768-772`

A fix that adds `isRefNameSafe(refName) = !refName.startsWith("-")` and a guard at the start of `addTag` (tagName) and `createBranch` (branchName) that, when the ref name starts with `-`, does not start git and returns `INVALID_REF_NAME_MESSAGE` (`"Invalid ref name."`) with `Promise.resolve`. It prevents option injection, where a ref name with a leading `-` passed as-is to git arguments is interpreted as an option (for example `--delete`). The guard short-circuits before `spawnGit` is called.

| Case ID | Input / Precondition                                                                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                       | Notes                                                |
| ------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| TC-195  | `addTag(repo, "v1.0.0", false, "")` (a normal tag name)                                                   | Normal - valid tag name                                                    | The git `tag` command runs via `spawnGit` and `INVALID_REF_NAME_MESSAGE` is not returned                              | Normal path                                          |
| TC-196  | `createBranch(repo, "feature/x", <有効ハッシュ>)` (a normal branch name; `<有効ハッシュ>` = a valid hash) | Normal - valid branch name                                                 | The git `branch` command runs and `INVALID_REF_NAME_MESSAGE` is not returned                                          | Normal path                                          |
| TC-197  | `addTag(repo, "--delete", false, "")`                                                                     | Validation - leading hyphen tag rejected                                   | `INVALID_REF_NAME_MESSAGE` resolves and `spawnGit` is not called (git not started)                                    | Rejects option injection                             |
| TC-198  | `createBranch(repo, "-D", <有効ハッシュ>)`                                                                | Validation - leading hyphen branch rejected                                | `INVALID_REF_NAME_MESSAGE` resolves and `spawnGit` is not called. The `isValidCommitHash` check is not reached either | The guard short-circuits first                       |
| TC-199  | `addTag(repo, "-", false, "")` (a lone hyphen)                                                            | Boundary - single hyphen                                                   | `"-".startsWith("-")` is true, so `INVALID_REF_NAME_MESSAGE` is returned                                              | Smallest invalid input boundary                      |
| TC-200  | `createBranch(repo, "", <有効ハッシュ>)` (empty branch name)                                              | Boundary - empty ref name                                                  | `"".startsWith("-")` is false, so it passes the guard and proceeds to the following `isValidCommitHash` check         | The empty string is outside the leading-hyphen check |

## S35: getCommitComparison() NUL-delimited diff parsing

> Origin: フェーズ3 修正 L5 (diff-nul-delimited-parse)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: S7
> Signature: `getCommitComparison(repo: string, fromHash: string, toHash: string): Promise<GitFileChange[] | null>`
> Target Path: `src/dataSource.ts:505-616`

A fix that adds `-z` (`NULL_BYTE_OPTION`) to `git diff --name-status` / `--numstat` and changes splitting of the output from `eolRegex` newlines to `NULL_BYTE_SEPARATOR` (NUL), unifying on a cursor-based parse that does not break on file names with path quoting, tabs or newlines. name-status checks the leading status character: `R` (rename) is 3 tokens `status\0old\0new\0` (cursor +3), everything else is 2 tokens `status\0path\0` (+2). It stops at a character not in `VALID_FILE_CHANGE_TYPES`. numstat distinguishes a normal `a\td\tpath\0` record (+1) from the rename form `a\td\t\0old\0new\0` (the path field is an empty string, so `old`/`new` are read from the following tokens, `+3`), and sets `null` for `NaN` addition/deletion counts. This replaces the non-`-z` (tab/newline split) premise of S7.

| Case ID | Input / Precondition                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                       | Notes                                         |
| ------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| TC-201  | Compare 2 commits, name-status stdout=`"M\0src/a.ts\0"`, numstat stdout=`"3\t1\tsrc/a.ts\0"` | Normal - single modified file NUL parse                                    | The `git diff` arguments include `NULL_BYTE_OPTION`, and `[{oldFilePath:"src/a.ts", newFilePath:"src/a.ts", type:"M", additions:3, deletions:1}]` is returned                                         | Normal record +2 / numstat +1                 |
| TC-202  | name-status=`"R\0old.ts\0new.ts\0"`, numstat=`"2\t2\t\0old.ts\0new.ts\0"`                    | Normal - rename triple-token parse                                         | `{oldFilePath:"old.ts", newFilePath:"new.ts", type:"R", additions:2, deletions:2}` is returned. The name-status cursor moves +3, and numstat detects the empty path field, reads old/new and moves +3 | 3 NUL tokens for a rename                     |
| TC-203  | name-status has 1 each of A/M/D/R, with matching numstat                                     | Normal - all change types classified                                       | Each `type` is classified correctly as `A`/`M`/`D`/`R`, and `additions`/`deletions` are set from numstat                                                                                              | `--diff-filter=AMDR` + cursor parse           |
| TC-204  | A numstat record `"-\t-\tbinary.png\0"` (binary, counts are `-`)                             | Boundary - non-numeric numstat                                             | `parseInt("-",10)` is `NaN`, so `additions`/`deletions` are set to `null`                                                                                                                             | `Number.isNaN` → null conversion              |
| TC-205  | toHash=`""` (working tree comparison), ls-files has untracked files                          | Normal - working tree with untracked                                       | With `isToWorkingTree=true`, ls-files also runs and untracked files are included in the result. spawn is called 3 times                                                                               | Working tree path                             |
| TC-206  | name-status stdout has an invalid status character (for example a leading `"X\0..."`)        | Boundary - invalid status char breaks loop                                 | `VALID_FILE_CHANGE_TYPES.has("X")` is false, so the cursor loop `break`s. Later records are not parsed                                                                                                | Stops at an invalid token                     |
| TC-207  | A numstat path is not in fileLookup (does not match name-status)                             | Boundary - numstat orphan skipped                                          | `fileLookup[path]` is `undefined`, so additions/deletions are not set and `fileChanges` stays as built from name-status                                                                               | Parsing robustness (equivalent to old TC-054) |
| TC-208  | Working tree comparison + an untracked file duplicating a newFilePath in the diff output     | Boundary - untracked dedup                                                 | The duplicate file is included only once thanks to the existing `fileLookup` check                                                                                                                    | Deduplication (equivalent to old TC-058)      |
| TC-209  | The `git diff` command ends with an exception (spawn reject)                                 | Exception - handled error                                                  | `null` is returned (catch block)                                                                                                                                                                      | Returns null on error                         |

## S36: getUncommittedDetails() NUL-delimited diff parsing

> Origin: フェーズ3 修正 L5 (diff-nul-delimited-parse)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: S8
> Signature: `getUncommittedDetails(repo: string): Promise<GitCommitDetails | null>`
> Target Path: `src/dataSource.ts:376-465`

A fix that adds `-z` to `git diff HEAD --name-status` / `--numstat` in `getUncommittedDetails` and unifies on the same NUL-delimited cursor parse as S35 (R is +3, others +2, a numstat rename is detected by the empty path field and moves +3, `NaN` → `null`). ls-files (untracked files) is not covered by `-z` and stays as before. This replaces the non-`-z` premise of S8.

| Case ID | Input / Precondition                                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                  | Notes                                    |
| ------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| TC-210  | Staged/unstaged changes + untracked files. name-status/numstat stdout is NUL-delimited     | Normal - diff plus untracked NUL parse                                     | `fileChanges` contains the diff results (from the NUL parse) + untracked files. name-status/numstat/ls-files run in parallel (3) | 3 in parallel + cursor parse             |
| TC-211  | name-status=`"R\0a/old\0a/new\0"`, numstat=`"5\t0\t\0a/old\0a/new\0"`                      | Normal - rename triple-token parse                                         | `{oldFilePath:"a/old", newFilePath:"a/new", type:"R", additions:5, deletions:0}` is in `details.fileChanges`                     | 3 NUL tokens for a rename                |
| TC-212  | Only staged/unstaged changes, no untracked files                                           | Normal - diff only                                                         | `fileChanges` contains only the diff results                                                                                     | ls-files is empty                        |
| TC-213  | A numstat record `"-\t-\t\0old\0new\0"` (binary rename)                                    | Boundary - non-numeric rename numstat                                      | The empty path field leads to reading old/new and moving `+3`, and `additions`/`deletions` are set from `NaN` → `null`           | Rename + non-numeric                     |
| TC-214  | An untracked file duplicates a newFilePath in the diff results                             | Boundary - untracked dedup                                                 | The duplicate file is included only once thanks to the existing `fileLookup` check                                               | Deduplication (equivalent to old TC-064) |
| TC-215  | The start of name-status is an invalid status character (not in `VALID_FILE_CHANGE_TYPES`) | Boundary - invalid status char breaks loop                                 | The cursor loop `break`s and nothing after it is parsed                                                                          | Stops at an invalid token                |
| TC-216  | The ls-files output contains empty tokens                                                  | Boundary - empty untracked token skipped                                   | Empty paths are skipped and only valid untracked files are added                                                                 | `filePath === ""` guard                  |
| TC-217  | `git diff` or `ls-files` throws an exception                                               | Exception - handled error                                                  | `null` is returned (catch block)                                                                                                 | Returns null on error                    |

## S38: Getting untracked files NUL-delimited with ls-files -z

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: the ls-files call in `getUncommittedDetails(repo: string)` / `getCommitComparison(repo, fromHash, toHash="")`
> Target Path: `src/dataSource.ts:400-405, 548-554`

A fix that adds `-z` to `ls-files --others --exclude-standard`, which gets untracked files, and changes newline splitting to NUL splitting. Without `-z`, file names containing `"`, TAB, newline or backslash are wrapped in double quotes with C escapes, which breaks display and opening in the change list (fix for [8]). The NUL parsing on the diff side (S35/S36) is not changed.

| Case ID | Input / Precondition                                                                                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                | Notes                                     |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| TC-221  | `getUncommittedDetails`. Untracked names `quote"name.txt` / `tab\tname.txt` / `new\nline.txt` / `back\\slash.txt` (ls-files stdout is NUL-delimited) | Boundary - untracked names with special characters (uncommitted path)      | The ls-files spawn arguments include `-z`, and the 4 names appear in `newFilePath` of `fileChanges` as raw strings without quoting or escaping | Raw paths restored by NUL splitting       |
| TC-222  | `getCommitComparison` (working tree comparison with `toHash = ""`). The same untracked names with special characters                                 | Boundary - untracked names with special characters (comparison path)       | The ls-files spawn arguments include `-z`, and the untracked files' `newFilePath` appear in the result as raw strings                          | The comparison path has the same contract |

## S39: Shared numstat parser (first and second TAB as delimiters, keeping the rest as the path)

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: private numstat record-splitting helper (combines the 3 call sites; decided at implementation)
> Target Path: `src/dataSource.ts:345-346, 453-454, 597-598`

A fix that combines the numstat record splitting duplicated in 3 places into a shared private helper. It drops splitting on every TAB and `break` on `parts.length !== 3`, finds the first and second TAB positions with `indexOf`, and keeps the whole remainder as the path. An invalid record is ignored on its own and parsing continues with the following records, and the target file's additions/deletions stay `null` (fix for [10]). The rename contract "empty path + 2 paths in the following NUL tokens" and the `null` conversion of binary `-` are kept.

| Case ID | Input / Precondition                                                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                        | Notes                                           |
| ------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| TC-223  | numstat stdout `3\t1\tsrc/a.ts\0` (via getCommitDetails)                                        | Normal - normal record                                                     | The target file's `additions` is set to `3` and `deletions` to `1`, matched to path `src/a.ts`                                                                                         | Uses the first and second TAB as delimiters     |
| TC-224  | numstat stdout `2\t5\tsrc/a\tb.ts\0` + following `1\t1\tsrc/c.ts\0` (via getUncommittedDetails) | Boundary - keeping the rest of a path with a TAB                           | `src/a\tb.ts` (the whole string including the TAB) is matched as the path with additions 2 / deletions 5, and the following `src/c.ts` also gets additions 1 / deletions 1 (no cutoff) | Regression of the old over-split `break`        |
| TC-225  | The same stdout with a TAB in the path (via getCommitComparison)                                | Boundary - path with a TAB (comparison path)                               | The comparison path also keeps the rest of the path, and additions/deletions of the following record are set                                                                           | Checks the merge into the shared helper         |
| TC-226  | Rename record `5\t0\t\0old.ts\0new.ts\0`                                                        | Normal - rename contract kept                                              | Detecting the empty path field, it reads old/new from the 2 following NUL tokens (cursor +3) and sets additions 5 / deletions 0                                                        | Same as the existing rename contract in S35/S36 |
| TC-227  | An invalid record `garbage\0` (no TAB) directly followed by a valid record `2\t2\tsrc/ok.ts\0`  | Validation - ignoring only the invalid record                              | The `additions`/`deletions` of the invalid record's target file stay `null`, and the following `src/ok.ts` gets additions 2 / deletions 2 (the loop does not break)                    | Limits the effect to that record                |

## S40: renameBranch() isRefNameSafe guard on the new branch name

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Signature: `public async renameBranch(repo: string, oldName: string, newName: string, ...)`
> Target Path: `src/dataSource.ts:801-807`

A fix that applies the existing `isRefNameSafe(newName)` to the new branch name at the start of `renameBranch`, so that a name with a leading `-` does not start Git and returns `INVALID_REF_NAME_MESSAGE` (`"Invalid ref name."`). It aligns with the same guard contract as `createBranch` / `addTag` (S34) (fix for [11]).

| Case ID | Input / Precondition                             | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                               | Notes                                |
| ------- | ------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------ |
| TC-228  | `newName = "-D"`                                 | Validation - rejecting a new name with a leading hyphen                    | `INVALID_REF_NAME_MESSAGE` resolves and spawn is called 0 times (Git not started)             | Prevents option interpretation       |
| TC-229  | `newName = "-"` (a lone hyphen)                  | Boundary - smallest invalid input                                          | `INVALID_REF_NAME_MESSAGE` resolves and spawn is called 0 times                               | Same boundary as S34 TC-199          |
| TC-230  | `newName = "feature/renamed"` (a valid new name) | Normal - existing command kept for a valid name                            | `spawnGit` runs once with arguments containing `["branch", "-m", oldName, "feature/renamed"]` | Existing command structure unchanged |

### Failure-source inventory (include-or-justify) - added by Feature 045 (S38 to S40)

| Failure source                                                               | Covering cases or reason for exclusion                                                                                           |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Broken untracked names with special characters (quote/TAB/newline/backslash) | TC-221 (uncommitted path), TC-222 (comparison path)                                                                              |
| numstat cut off by a path with a TAB                                         | TC-224 (uncommitted path), TC-225 (comparison path)                                                                              |
| Losing later records because of an invalid numstat record                    | TC-227                                                                                                                           |
| Breaking the rename contract (empty path + 2 NUL paths)                      | TC-226                                                                                                                           |
| Option interpretation of a new branch name with a leading `-`                | TC-228, TC-229                                                                                                                   |
| Binary `-` numstat (NaN → null)                                              | excluded (already covered by S35 TC-204 / S36 TC-213; the contract is unchanged by this change)                                  |
| A path with a TAB on the getCommitDetails path                               | excluded (the 3 sites are merged into the shared helper, the same branch as TC-224/TC-225. Normal records are covered by TC-223) |
| spawn failure of the git process                                             | excluded (already covered by the existing S32 to S33 and each method's Exception cases (TC-209/TC-217 and others))               |
| Non-string stdout                                                            | excluded (guaranteed by the spawn stdout string-concatenation contract (phase 1 fix M2))                                         |

**Failure-category coverage (diversity floor)**:

- Validation: TC-227, TC-228
- Exception: excluded (S38 to S40 add no new throw branch, and existing error paths are covered by S35 TC-209 / S36 TC-217)
- External: excluded (git output is driven by mock stdout, and process failure modes are covered by existing sections)
- Boundary: TC-221, TC-222, TC-224, TC-225, TC-229
- Type: excluded (non-numeric values in numeric fields (binary `-`) are already covered by the existing TC-204/TC-213)

Numeric boundaries (0 / minimum / maximum / +/-1) are out of scope because the spec has no boundary checks on the value range of additions/deletions; the meaningful boundaries are covered by a path with a TAB (TC-224/TC-225), a lone hyphen (TC-229) and the empty rename path (TC-226).

**Failure/normal ratio (smoke detector)**: 3 normal cases (TC-223, TC-226, TC-230), 7 failure cases (TC-221, TC-222, TC-224, TC-225, TC-227, TC-228, TC-229), ratio 2.3.
