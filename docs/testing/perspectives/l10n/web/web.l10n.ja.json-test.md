# Test Perspectives: l10n/web/web.l10n.ja.json

> Source: `l10n/web/web.l10n.ja.json`
> Generated: 2026-05-17T00:00:00Z
> Language: JSON (l10n bundle)
> Test Framework: Vitest
> Storage Mode: single-file

## S1: Translation of the commit-based Create Branch dialog (Feature 040)

> Origin: Feature 040 (settings-and-copy-polish) (light-spec-plan)
> Added: 2026-05-17
> Status: active
> Supersedes: -
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

Verifies that the translation key of the commit-based Create Branch dialog is added and the existing stash-based key is kept.

| Case ID | Input / Precondition                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                              | Notes                            |
| ------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------- |
| TC-001  | Load `Enter the name of the branch you would like to create from commit {0}:` | Normal - new key                                                           | A Japanese translation that contains 「コミット」 ("commit") and keeps the `{0}` placeholder | Commit-based key added           |
| TC-002  | Load `Enter the name of the branch you would like to create from {0}:`        | Normal - existing key                                                      | Returns `{0} から作成するブランチ名を入力してください:`                                      | The stash-based key is protected |

## S2: Japanese translation keys for worktree operation errors (Feature 045)

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

Verifies that the dedicated error keys `error.openWorktreeInNewWindow` / `error.revealWorktreeInOS`, used to show worktree Open/Reveal failures, are added to the ja bundle. The branches that use the keys are owned by `web/messageHandler-test.md` S11.

| Case ID | Input / Precondition                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                            | Notes                                  |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------- |
| TC-003  | Load `error.openWorktreeInNewWindow` from the ja bundle | Normal - new key                                                           | The key exists and its value is a non-empty (`length > 0`) Japanese string | Dedicated key for Open failure added   |
| TC-004  | Load `error.revealWorktreeInOS` from the ja bundle      | Normal - new key                                                           | The key exists and its value is a non-empty (`length > 0`) Japanese string | Dedicated key for Reveal failure added |

### Failure-source inventory (include-or-justify) — added by Feature 045 (S2)

| Failure source                                        | Case or reason for exclusion                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Key missing on the ja side (added to only one locale) | TC-003, TC-004 (the en side is covered as a pair by `web.l10n.en.json-test.md` TC-001 to TC-002) |
| Empty translated value                                | TC-003, TC-004 (include the non-empty check)                                                     |
| Missing branch that uses the key                      | excluded(covered by `web/messageHandler-test.md` S11 TC-033/TC-035)                              |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(the JSON bundle is static data with no validation branch; missing or empty values are detected by the existence and non-empty checks of TC-003/TC-004)
- Exception: excluded(JSON load failures are detected by the build/test infrastructure; the bundle itself has no exception branch)
- External: excluded(no external dependency)
- Boundary: excluded(no numeric boundary; empty is covered by the non-empty check of TC-003/TC-004)
- Type: excluded(values are JSON strings with no type branch)

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-003, TC-004), 0 failure cases. Only existence and non-empty checks of static JSON data with no execution branch, so 0 failure cases was confirmed not to be a gap in the inventory.

## S3: Japanese translation keys for safe checkout and push target selection (Feature 047)

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: active
> Supersedes: -
> Signature: Added key set `error.checkoutBranchExists` / `error.checkoutInvalidRef` / `error.pushNoRemotes` / `push.selectRemote` / `push.selectRemoteAction`
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

Verifies that the 5 keys used for remote checkout rejection reasons and the two-step Push selection UI (`error.checkoutBranchExists` / `error.checkoutInvalidRef` / `error.pushNoRemotes` / `push.selectRemote` / `push.selectRemoteAction`) are added to the ja bundle. The branches that use the keys are owned by `web/messageHandler-test.md` S12 and `web/refMenu-test/01-branch-actions-01.md` S17.

| Case ID | Input / Precondition                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                 | Notes                                   |
| ------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------- |
| TC-005  | Load `error.checkoutBranchExists` from the ja bundle                               | Normal - new key                                                           | The key exists and its value is a non-empty (`length > 0`) Japanese string                      | Rejection reason for an existing branch |
| TC-006  | Load `error.checkoutInvalidRef` from the ja bundle                                 | Normal - new key                                                           | The key exists and its value is a non-empty (`length > 0`) Japanese string                      | Rejection reason for an invalid ref     |
| TC-007  | Load `error.pushNoRemotes` from the ja bundle                                      | Normal - new key                                                           | The key exists and its value is a non-empty (`length > 0`) Japanese string                      | No registered remote                    |
| TC-008  | Load `push.selectRemote` from the ja bundle                                        | Normal - new key                                                           | The key exists and its value is a non-empty (`length > 0`) Japanese string                      | Prompt of the selection dialog          |
| TC-009  | Load `push.selectRemoteAction` from the ja bundle                                  | Normal - new key                                                           | The key exists and its value is a non-empty (`length > 0`) Japanese string                      | Action label of the selection dialog    |
| TC-010  | Load both the ja and en bundles and compare the set and values of the 5 keys above | Validation - locale parity and absence of raw key fallback                 | 0 keys are missing from the en bundle, and none of the 5 ja values equals the key string itself | Detects untranslated pass-through       |

### Failure-source inventory (include-or-justify) — added by Feature 047 (S3)

| Failure source                                                         | Case or reason for exclusion                                                                                                             |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Key missing on the ja side                                             | TC-005 to TC-009                                                                                                                         |
| Added to only one locale (broken parity)                               | TC-010 (the en side is covered as a pair by `web.l10n.en.json-test.md` TC-008)                                                           |
| Empty translated value                                                 | TC-005 to TC-009 (include the non-empty check)                                                                                           |
| Untranslated (raw key fallback where the key string becomes the value) | TC-010                                                                                                                                   |
| Missing branch that uses the key                                       | excluded(covered by `web/messageHandler-test.md` S12 TC-036 / TC-037 / TC-041 and `web/refMenu-test/01-branch-actions-01.md` S17 TC-084) |
| Boundary values (0 / minimum / maximum / +/-1 / NULL)                  | excluded(static JSON has no numeric boundary; empty is covered by the non-empty check)                                                   |
| External dependency failure / exception thrown                         | excluded(the bundle is static data with no external dependency or throw path)                                                            |

**Failure-category coverage (diversity floor)**:

- Validation: TC-010
- Exception: excluded(JSON load failures are detected by the test infrastructure; the bundle itself has no exception branch)
- External: excluded(no external dependency)
- Boundary: excluded(no numeric boundary; empty is covered by the non-empty check of TC-005 to TC-009)
- Type: excluded(values are JSON strings with no type branch)

**Failure/normal ratio (smoke detector)**: 5 normal cases (TC-005 to TC-009), 1 failure case (TC-010). The checks are mainly existence and non-empty checks of static JSON data with no execution branch, so the low number of failure cases was confirmed not to be a gap in the inventory.

## S4: Japanese prompt / error for same-name remote checkout + pull

> Origin: Feature 051 (remote-checkout-pull) (light-spec-plan)
> Added: 2026-08-06
> Status: active
> Supersedes: -
> Signature: Added keys `Enter the local branch name for checking out {0}. If a branch with the same name already exists, the selected remote branch will be pulled after checkout:` / `error.checkoutRemoteNotFound`
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

| Case ID | Input / Precondition                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                           | Notes                                         |
| ------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| TC-011  | Load the Feature 051 prompt source key from the ja bundle                            | Normal - checkout + pull prompt                                            | The key exists, its value is a non-empty Japanese string that states 「選択したリモートブランチ」 ("the selected remote branch") and the pull when a same-name branch exists, and it contains exactly 1 `{0}` placeholder | Explanation for the user                      |
| TC-012  | Load `error.checkoutRemoteNotFound` from the ja bundle                               | Normal - remote not found error                                            | The key exists, its value is a non-empty Japanese string, and the value does not equal the raw key `error.checkoutRemoteNotFound`                                                                                         | Prevents raw fallback                         |
| TC-013  | Compare the prompt and error key sets and placeholders in both the ja and en bundles | Validation - locale parity / raw fallback                                  | 0 keys are missing from the en bundle, the prompt's placeholder set equals `{0}` in both locales, and neither of the 2 ja values is the key string itself                                                                 | Detects parity issues and untranslated values |

### Failure-source inventory (include-or-justify) — added by Feature 051 (S4)

| Failure source                                                | Case or reason for exclusion                                                                                                              |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| ja prompt key missing or empty                                | TC-011                                                                                                                                    |
| ja remoteNotFound key missing or empty                        | TC-012                                                                                                                                    |
| raw key fallback / untranslated                               | TC-012, TC-013                                                                                                                            |
| Added to only one locale / placeholder mismatch               | TC-013                                                                                                                                    |
| Branches that use the prompt / error in the UI                | excluded(owned by `web/refMenu-test/01-branch-actions-01.md` S20 TC-100 / `web/messageHandler-test/03-git-operation-responses-01.md` S15) |
| Boundary values (0 / minimum / maximum / +/-1 / NULL / empty) | excluded(static JSON has no numeric boundary; empty is covered by the non-empty checks of TC-011 / TC-012)                                |
| External dependency failure / exception thrown                | excluded(the bundle is static data with no external dependency or throw path)                                                             |
| Invalid type / format                                         | excluded(the JSON string type is guaranteed by parse / TypeScript, and the placeholder format is verified by TC-011 / TC-013)             |

**Failure-category coverage (diversity floor)**:

- Validation: TC-013
- Exception: excluded(no throw path)
- External: excluded(no external dependency)
- Boundary: excluded(no numeric boundary; empty is verified by TC-011 / TC-012)
- Type: excluded(bundle values are static string data)

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-011, TC-012), 1 failure case (TC-013). As the counts are close, the inventory was re-derived and the failure sources of a static locale were confirmed to be limited to missing, empty, parity, placeholder and raw fallback.

## S5: 4 Japanese keys explaining deleteBranch not fully merged

> Origin: Feature 055-01 (light-spec-plan)
> Added: 2026-08-23
> Status: superseded
> Superseded By: S7
> Supersedes: -
> Signature: Added key set `error.deleteBranchNotFullyMerged.summary` / `error.deleteBranchNotFullyMerged.reason` / `error.deleteBranchNotFullyMerged.guidance` / `dialog.originalGitOutput`
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

Verifies that the 4 keys used in the `not fully merged` explanation dialog of `deleteBranch` are added to the ja bundle and that their values exactly match the fixed text of the finalized spec (the Japanese column of §4.4 in `notes/features/055/01/memo-確定仕様.md`). The branches that use the keys are owned by `web/messageHandler-test/01-basic-responses-01.md` S16 and `web/dialogs-test.md` S7, and the `t()` branch of `web/i18n.ts` is not part of this section.

| Case ID | Input / Precondition                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                 | Notes                                                                       |
| ------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| TC-014  | Load the 4 keys above from the ja bundle                                | Normal - 4 fixed values                                                    | All 4 keys exist, each value exactly matches the 4 Japanese values of §4.4 of the finalized spec memo with `toBe` (exact match also ensures non-empty), extracting `{数字}`-style placeholders from each value yields an empty result, and no value equals its key string (no raw key fallback) | Fixed text that avoids assertive wording. Detects untranslated pass-through |
| TC-015  | Load both the ja and en bundles and compare the set of the 4 keys above | Validation - locale parity                                                 | 0 keys are missing from the en bundle (the difference from the ja 4-key set is empty)                                                                                                                                                                                                           | Detects additions to only one locale                                        |

### Failure-source inventory (include-or-justify) — added by Feature 055-01 (S5)

| Failure source                                                         | Case or reason for exclusion                                                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Key missing on the ja side / drift from the fixed text                 | TC-014                                                                                                   |
| Empty translated value                                                 | TC-014 (covered by the exact match with the fixed values)                                                |
| Placeholder mixed in (the 4 keys have no placeholder)                  | TC-014                                                                                                   |
| Untranslated (raw key fallback where the key string becomes the value) | TC-014                                                                                                   |
| Added to only one locale (broken parity)                               | TC-015 (the en side is covered as a pair by `web.l10n.en.json-test.md` TC-013)                           |
| Missing branch that uses the key                                       | excluded(covered by `web/messageHandler-test/01-basic-responses-01.md` S16 and `web/dialogs-test.md` S7) |
| Boundary values (0 / minimum / maximum / +/-1 / NULL)                  | excluded(static JSON has no numeric boundary; empty is covered by the exact fixed-value match of TC-014) |
| External dependency failure / exception thrown                         | excluded(the bundle is static data with no external dependency or throw path)                            |
| Invalid type / format                                                  | excluded(values are JSON strings with no type branch)                                                    |

**Failure-category coverage (diversity floor)**:

- Validation: TC-015
- Exception: excluded(JSON load failures are detected by the test infrastructure; the bundle itself has no exception branch)
- External: excluded(no external dependency)
- Boundary: excluded(no numeric boundary; empty is covered by the exact fixed-value match of TC-014)
- Type: excluded(values are JSON strings with no type branch)

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-014), 1 failure case (TC-015). As the counts are equal, the inventory was re-derived; the failure sources of static JSON data are limited to missing, drift, empty, placeholder, raw fallback and parity, and all are covered as shown above.

## S6: Japanese key set for the branch cleanup panel

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: Added key set: panel title / comparison / column names / known, unknown and notSelected states / loading, error and empty / show and delete actions (key names finalized during the Task 4 implementation)
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

Verifies that the Japanese key set used to display the branch cleanup panel is added to the ja bundle as the same set as en (implementation plan §4 Task 4 implementation item 7). The branches that use the keys are owned by `web/branchCleanupPanel-test.md` S3.

| Case ID | Input / Precondition                                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                          | Notes                                             |
| ------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| TC-016  | Load every key of the panel key set from the ja bundle                         | Normal - key set exists                                                    | Every key exists and each value is a non-empty (`length > 0`) Japanese string                                                                            | The set is finalized in the Task 4 implementation |
| TC-017  | Compare every panel key value in the ja bundle with its key string             | Normal - no raw key fallback                                               | No value equals its key string, and the values for unknown and notSelected differ from each other                                                        | Detects untranslated and identical values         |
| TC-018  | Load both the ja and en bundles and compare the panel key set and placeholders | Validation - locale parity                                                 | 0 keys are missing from the en bundle (the difference is empty in both directions), and for keys with placeholders the `{N}` set matches in both locales | Detects additions to only one locale              |

### Failure-source inventory (include-or-justify) — added by Feature 055-03 (S6)

| Failure source                                                                 | Case or reason for exclusion                                                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Key missing or empty on the ja side                                            | TC-016                                                                                           |
| Untranslated (raw key fallback) / identical values for unknown and notSelected | TC-017                                                                                           |
| Added to only one locale / placeholder mismatch                                | TC-018 (the en side is covered as a pair by `web.l10n.en.json-test.md` S5 TC-016)                |
| Missing branch that uses the key                                               | excluded(owned by `web/branchCleanupPanel-test.md` S3)                                           |
| Boundary values (0 / minimum / maximum / +/-1 / NULL)                          | excluded(static JSON has no numeric boundary; empty is covered by the non-empty check of TC-016) |
| External dependency failure / exception thrown                                 | excluded(the bundle is static data with no external dependency or throw path)                    |
| Invalid type / format                                                          | excluded(values are JSON strings with no type branch)                                            |

**Failure-category coverage (diversity floor)**:

- Validation: TC-018
- Exception: excluded(JSON load failures are detected by the test infrastructure; the bundle itself has no exception branch)
- External: excluded(no external dependency)
- Boundary: excluded(no numeric boundary; empty is covered by the non-empty check of TC-016)
- Type: excluded(values are JSON strings with no type branch)
- Normal: TC-016, TC-017

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-016, TC-017), 1 failure case (TC-018). With a difference of 1 the inventory was re-derived, and the failure sources of a static locale were confirmed to be limited to missing, empty, raw fallback, identical values, parity and placeholder.

## S7: Japanese fixed values explaining deleteBranch not fully merged (055-03 revision)

> Origin: Feature 055-03 follow-up
> Added: 2026-08-29
> Status: active
> Supersedes: S5
> Signature: Updated keys `error.deleteBranchNotFullyMerged.summary` / `error.deleteBranchNotFullyMerged.reason` (a 4-key set including the unchanged keys `error.deleteBranchNotFullyMerged.guidance` / `dialog.originalGitOutput`)
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

Contract: the summary / reason of the `not fully merged` explanation are revised to fixed text (the Japanese column of implementation plan §3.3) that explains the conditional relation of the upstream and, when no upstream is set, the current branch, and the difference from the panel's comparison target. This is a replacement because it replaces S5's "exact match with §4.4 of the 055-01 finalized spec" with the fixed values of this section. guidance and `dialog.originalGitOutput` keep their 055-01 values. The branches that use the keys are owned by `web/messageHandler-test/01-basic-responses-01.md` S16 and `web/dialogs-test.md` S7.

| Case ID | Input / Precondition                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                                                                    | Notes                                                 |
| ------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| TC-019  | Load the 4 keys above from the ja bundle                                | Normal - 4 revised fixed values                                            | summary / reason exactly match the Japanese fixed values of implementation plan §3.3 with `toBe`, guidance and `dialog.originalGitOutput` exactly match the existing Japanese values of §4.4 of the 055-01 finalized spec with `toBe` (pinning that they are unchanged), extracting `{数字}`-style placeholders from the 4 values yields an empty result, and no value equals its key string (no raw key fallback) | Detects value drift and changes to the unchanged keys |
| TC-020  | Load both the ja and en bundles and compare the set of the 4 keys above | Validation - locale parity                                                 | 0 keys are missing from the en bundle (the difference from the ja 4-key set is empty)                                                                                                                                                                                                                                                                                                                              | Detects revisions to only one locale                  |

### Failure-source inventory (include-or-justify) — added by Feature 055-03 follow-up (S7)

| Failure source                                                         | Case or reason for exclusion                                                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| summary / reason not revised / drift from the fixed values             | TC-019                                                                                                   |
| guidance / `dialog.originalGitOutput` changed by mistake               | TC-019 (covered by the exact match with the existing fixed values)                                       |
| Empty translated value / placeholder mixed in                          | TC-019 (covered by the exact fixed-value match and the empty placeholder extraction)                     |
| Untranslated (raw key fallback where the key string becomes the value) | TC-019                                                                                                   |
| Revised in only one locale (broken parity)                             | TC-020 (the en side is covered as a pair by `web.l10n.en.json-test.md` S6 TC-018)                        |
| Missing branch that uses the key                                       | excluded(covered by `web/messageHandler-test/01-basic-responses-01.md` S16 and `web/dialogs-test.md` S7) |
| Boundary values (0 / minimum / maximum / +/-1 / NULL)                  | excluded(static JSON has no numeric boundary; empty is covered by the exact fixed-value match of TC-019) |
| External dependency failure / exception thrown                         | excluded(the bundle is static data with no external dependency or throw path)                            |
| Invalid type / format                                                  | excluded(values are JSON strings with no type branch)                                                    |

**Failure-category coverage (diversity floor)**:

- Validation: TC-020
- Exception: excluded(JSON load failures are detected by the test infrastructure; the bundle itself has no exception branch)
- External: excluded(no external dependency)
- Boundary: excluded(no numeric boundary; empty is covered by the exact fixed-value match of TC-019)
- Type: excluded(values are JSON strings with no type branch)
- Normal: TC-019

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-019), 1 failure case (TC-020). As the counts are equal, the inventory was re-derived; the failure sources of static JSON data are limited to drift, mistaken changes, empty, placeholder, raw fallback and parity, and all are covered as shown above.

## S8: Japanese key for the auto-resolved comparison label

> Origin: Feature 055-03 follow-up
> Added: 2026-08-29
> Status: active
> Supersedes: -
> Signature: Added key `cleanup.comparison.autoResolved` (value `自動 ({0})`, placeholder set `{0}`)
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

Additive section verifying that the new key `cleanup.comparison.autoResolved`, which embeds the resolved branch name into the auto option of the comparison dropdown, is added to the ja bundle and its value exactly matches the fixed value of implementation plan §3.3. The branches that use the key (label decisions for automatic / explicit and loaded / loading / failed) are owned by `web/branchCleanupPanel-test.md` S5.

| Case ID | Input / Precondition                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                      | Notes                               |
| ------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| TC-021  | Load `cleanup.comparison.autoResolved` from the ja bundle                           | Normal - fixed value of the new key                                        | The key exists, its value exactly matches `自動 ({0})` with `toBe`, the set of `{数字}`-style placeholders extracted from the value is only `{0}`, and the value does not equal the key string (no raw key fallback) | Exact match also ensures non-empty  |
| TC-022  | Load both the ja and en bundles and compare the key's existence and placeholder set | Validation - locale parity                                                 | `cleanup.comparison.autoResolved` exists in the en bundle (0 missing), and the placeholder set is `{0}` in both locales                                                                                              | One locale only / placeholder drift |

### Failure-source inventory (include-or-justify) — added by Feature 055-03 follow-up (S8)

| Failure source                                                         | Case or reason for exclusion                                                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Key missing on the ja side / drift from the fixed value                | TC-021                                                                                                   |
| Placeholder missing or extra (anything other than `{0}`)               | TC-021                                                                                                   |
| Untranslated (raw key fallback where the key string becomes the value) | TC-021                                                                                                   |
| Added to only one locale / placeholder mismatch                        | TC-022 (the en side is covered as a pair by `web.l10n.en.json-test.md` S7 TC-020)                        |
| Missing branch that uses the key                                       | excluded(owned by `web/branchCleanupPanel-test.md` S5)                                                   |
| Boundary values (0 / minimum / maximum / +/-1 / NULL)                  | excluded(static JSON has no numeric boundary; empty is covered by the exact fixed-value match of TC-021) |
| External dependency failure / exception thrown                         | excluded(the bundle is static data with no external dependency or throw path)                            |
| Invalid type / format                                                  | excluded(values are JSON strings with no type branch)                                                    |

**Failure-category coverage (diversity floor)**:

- Validation: TC-022
- Exception: excluded(JSON load failures are detected by the test infrastructure; the bundle itself has no exception branch)
- External: excluded(no external dependency)
- Boundary: excluded(no numeric boundary; empty is covered by the exact fixed-value match of TC-021)
- Type: excluded(values are JSON strings with no type branch)
- Normal: TC-021

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-021), 1 failure case (TC-022). As the counts are equal, the inventory was re-derived; the failure sources of a single key in a static locale are limited to missing, drift, placeholder, raw fallback and parity, and all are covered as shown above.

## S9: 9 Japanese keys for file history

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: Added keys `context.highlightFileHistory` / `fileHistory.loading` / `fileHistory.position` / `fileHistory.previous` / `fileHistory.next` / `fileHistory.exit` / `fileHistory.notInFirstParentDiff` / `fileHistory.noResults` / `error.fileHistory`
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

Additive section verifying that the 9 keys of implementation plan §3.10 exist in the ja bundle, their values exactly match the fixed values, there is no raw key fallback, and the placeholder sets match en. Where the keys are used is owned by the same owner as `web.l10n.en.json-test.md` S8.

| Case ID | Input / Precondition                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                   | Notes                                                |
| ------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| TC-023  | Load the 9 keys from the ja bundle                                                           | Normal - fixed values of the 9 keys                                        | All 9 keys exist and the values exactly match `ファイル履歴を強調` / `ファイル履歴を読み込み中 ...` / `{0} / {1}` / `前の一致` / `次の一致` / `解除` / `このファイルの変更は第 1 親との差分にはありません` / `このファイルの履歴が見つかりません` / `ファイル履歴を読み込めません` with `toEqual` | Exact match also ensures non-empty                   |
| TC-024  | Extract `{数字}`-style placeholders from the value of `fileHistory.position`                 | Normal - placeholder set                                                   | The set has 2 entries, `{0}` and `{1}`, and the placeholder sets of the other 8 keys are empty                                                                                                                                                                                                    | The separator is `/`                                 |
| TC-025  | Compare the values of the 9 keys with the key strings                                        | Validation - no raw key fallback                                           | No value of the 9 keys equals its key string (0 untranslated)                                                                                                                                                                                                                                     | Does not rely on the fallback merge in `src/i18n.ts` |
| TC-026  | Load both the ja and en bundles and compare the existence and placeholder sets of the 9 keys | Validation - locale parity                                                 | All 9 keys exist in the en bundle (0 missing), and the placeholder set of each key matches in both locales                                                                                                                                                                                        | One locale only / placeholder drift                  |

### Failure-source inventory (include-or-justify) — added by Feature 055-07 (S9)

| Failure source                                                         | Case or reason for exclusion                                                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Key missing on the ja side / drift from the fixed values               | TC-023                                                                                                   |
| Placeholder missing or extra                                           | TC-024                                                                                                   |
| Untranslated (raw key fallback where the key string becomes the value) | TC-025                                                                                                   |
| Added to only one locale / placeholder mismatch                        | TC-026 (the en side is covered as a pair by `web.l10n.en.json-test.md` S8 TC-023)                        |
| Missing branch that uses the key                                       | excluded(owned by the user of the keys; see `web.l10n.en.json-test.md` S8)                               |
| Boundary values (0 / minimum / maximum / +/-1 / NULL)                  | excluded(static JSON has no numeric boundary; empty is covered by the exact fixed-value match of TC-023) |
| External dependency failure / exception thrown                         | excluded(the bundle is static data with no external dependency or throw path)                            |
| Invalid type / format                                                  | excluded(values are JSON strings with no type branch)                                                    |

**Failure-category coverage (diversity floor)**:

- Validation: TC-025, TC-026
- Exception: excluded(JSON load failures are detected by the test infrastructure; the bundle itself has no exception branch)
- External: excluded(no external dependency)
- Boundary: excluded(no numeric boundary; empty is covered by the exact fixed-value match of TC-023)
- Type: excluded(values are JSON strings with no type branch)
- Normal: TC-023, TC-024

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-023, TC-024), 2 failure cases (TC-025, TC-026). As the counts are equal, the inventory was re-derived; the failure sources of a static locale are limited to missing, drift, placeholder, raw fallback and parity, and all are covered as shown above.

## S10: Japanese key for the detached worktree removal confirmation

> Origin: Feature 053 (detached-worktree-menu) (light-spec-plan)
> Added: 2026-09-13
> Status: active
> Supersedes: -
> Signature: Added key `Are you sure you want to remove the worktree at {0}?`
> Target Path: `l10n/web/web.l10n.ja.json:270`
> Test File: `tests/web/i18n.test.ts`

| Case ID | Input / Precondition                                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                | Notes                                         |
| ------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------- |
| TC-027  | The same key in `l10n/web/web.l10n.ja.json` (`Are you sure you want to remove the worktree at {0}?`) | Normal - key present                                                       | The value is a `string` of length 1 or more and contains `{0}` | en side: `web.l10n.en.json-test.md` S9 TC-025 |

### Failure-source inventory (include-or-justify) — added by Feature 053 (S10)

| Failure source                                                         | Case or reason for exclusion             |
| ---------------------------------------------------------------------- | ---------------------------------------- |
| Key missing / empty string                                             | TC-027                                   |
| Placeholder missing                                                    | TC-027                                   |
| Other categories (Validation / Exception / External / Boundary / Type) | excluded(existence check of static JSON) |

## S11: Japanese key for the hidden badge counter

> Origin: Feature 059-02 (light-spec-plan)
> Added: 2026-09-24
> Status: active
> Supersedes: -
> Signature: Added key `refs.showHidden` (value `非表示のバッジ {0} 件を表示`, placeholder set `{0}`)
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

Additive section verifying that the new key used for the counter's title/aria-label is added to the ja bundle, its value exactly matches the fixed value of implementation plan §3.5, and there is no raw key fallback. Inserting the count is owned by `web/i18n-test.md` S2.

| Case ID | Input / Precondition                                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                            | Notes                                                            |
| ------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| TC-028  | Load `refs.showHidden` from the ja bundle                                                          | Normal - fixed value of the new key                                        | The key exists, its value exactly matches `非表示のバッジ {0} 件を表示` with `toBe`, and the placeholder set is only `{0}` | AC-18                                                            |
| TC-029  | Compare the value of `refs.showHidden` with the key string                                         | Validation - no raw key fallback                                           | The value does not equal the key string `refs.showHidden`                                                                  | Detects untranslated value                                       |
| TC-030  | Load both the ja and en bundles and compare the existence and placeholder set of `refs.showHidden` | Validation - locale parity                                                 | `refs.showHidden` exists in the en bundle, and the placeholder set is `{0}` in both locales                                | Paired with `web.l10n.en.json-test.md` S10 TC-027 on the en side |

### Failure-source inventory (include-or-justify) — added by Feature 059-02 (S11)

| Failure source                                          | Case or reason for exclusion                                                                  |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Key missing on the ja side / drift from the fixed value | TC-028                                                                                        |
| Placeholder missing or extra                            | TC-028                                                                                        |
| Untranslated (raw key fallback)                         | TC-029                                                                                        |
| Added to only one locale / placeholder mismatch         | TC-030                                                                                        |
| English value                                           | excluded(owned by `web.l10n.en.json-test.md` S10)                                             |
| Boundary / external dependency / exception / type       | excluded(static JSON has no numeric boundary, external dependency, throw path or type branch) |

### Feature 059-02 test mapping (S11)

- Test file: describe `hidden ref badge counter label (Feature 059-02)` in `tests/web/i18n.test.ts`. TC-028 to TC-030 are one `it` each (with `ja l10n TC-0NN` added to the name)

## S12: Japanese dictionary for 12 a11y keys for keyboard operation and screen readers

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: Added keys `a11y.commitHistory` / `a11y.operationTarget` / `a11y.detailsOpen` / `a11y.compareBase` / `a11y.compareTarget` / `a11y.head` / `a11y.workingTree` / `a11y.stash` / `a11y.actionFor` / `a11y.commitsLoaded` / `a11y.noCommits` / `a11y.commitOrdering`
> Target Path: `l10n/web/web.l10n.ja.json`
> Test File: `tests/web/i18n.test.ts`

The Japanese values of the table in implementation plan Task 11 implementation item 4. Additive section that also verifies there is no raw key fallback.

| Case ID | Input / Precondition                                                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                    | Notes                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| TC-101  | Load the 12 keys from the ja bundle                                                                                               | Normal - key set exists                                                    | All 12 keys exist, the values are non-empty, and no value equals its key string (no raw key fallback)                                                                                                                              | K45                                                                             |
| TC-102  | Compare the values of the 12 keys with the Task 11 table                                                                          | Normal - fixed values match                                                | Exactly match `コミット履歴` / `操作対象` / `詳細表示中` / `比較の起点` / `比較対象` / `HEAD` / `作業ツリー` / `スタッシュ` / `{0}: {1}` / `{0}件のコミットを読み込みました` / `表示するコミットはありません` / `コミットの並び順` | K45. `HEAD` and `{0}: {1}` have the same value in English and Japanese          |
| TC-103  | Extract the placeholders of `a11y.actionFor` and `a11y.commitsLoaded`                                                             | Validation - arguments match                                               | The same placeholder sets as en (`{0}` `{1}` / `{0}`), and the other 10 keys have no placeholder                                                                                                                                   | K45                                                                             |
| TC-104  | Compare the key sets with the `a11y.` prefix in both the en and ja bundles                                                        | Validation - locale parity                                                 | The difference is empty in both directions                                                                                                                                                                                         | Paired with `web.l10n.en.json-test.md` S11 TC-104 on the en side                |
| TC-105  | In the real UI (VS Code with the ja locale), check the names of the `M` row and the file action buttons in the accessibility tree | Normal - real UI consistent with the dictionary (manual)                   | The row description is `操作対象` / `詳細表示中` / `HEAD`, and the file action name has the form `<操作名>: <path>`, matching the dictionary. Record: VS Code version, OS, locale                                                  | K45 / A8.3-6. Manual. "Make real UI vs. dictionary consistency a separate case" |

### Failure-source inventory (include-or-justify) — added by Feature 061-05 (S12)

| Failure source                                             | Case or reason for exclusion                                            |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| Key missing / empty value / raw key fallback / wrong value | TC-101, TC-102                                                          |
| Placeholder mismatch                                       | TC-103                                                                  |
| Added to only one locale                                   | TC-104                                                                  |
| Inconsistency with the real UI                             | TC-105 (manual)                                                         |
| External dependency / exception / type                     | excluded(static JSON with no external dependency, throw or type branch) |

### Task 12 test mapping (Feature 061-05) — S12

- Tests: `tests/web/i18n.test.ts`. TC-101 `Japanese bundle holds the twelve keys without raw key fallback (ja l10n TC-101)` / TC-102 `Japanese bundle holds exactly the fixed values of the Task 11 table (ja l10n TC-102)` / TC-103 `Japanese placeholders match the English sets (ja l10n TC-103)` / TC-104 `keeps the a11y key sets of both locales in parity (en l10n TC-104 / ja l10n TC-104)`
- Manual case TC-105 (accessibility tree in the ja locale): **not run**. The reason, impact, alternative check and remaining steps are in the manual list at the top of `web/main-test/13-keyboard-accessibility-01.md` (the screen reader row). Alternative check: TC-101 to TC-104 and the attributes (en dictionary) of `web/main-test/13-keyboard-accessibility-02.md` S79 (formerly S77) TC-735 to TC-737
- Execution result (2026-10-07): 4 passed
