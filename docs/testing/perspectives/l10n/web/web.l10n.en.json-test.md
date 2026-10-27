# Test Perspectives: l10n/web/web.l10n.en.json

> Source: `l10n/web/web.l10n.en.json`
> Generated: 2026-07-19T09:52:44+09:00
> Language: JSON (l10n bundle)
> Test Framework: Vitest
> Storage Mode: single-file

## S1: English translation keys for worktree operation errors (Feature 045)

> Origin: Feature 045 (defensive-fixes) (light-spec-plan)
> Added: 2026-07-19
> Status: active
> Supersedes: -
> Target Path: `l10n/web/web.l10n.en.json`
> Test File: `tests/web/i18n.test.ts`

Verifies that the dedicated error keys `error.openWorktreeInNewWindow` / `error.revealWorktreeInOS`, used to show worktree Open/Reveal failures, are added to the en bundle. The branches that use the keys (the handler's display conditions) are the responsibility of `web/messageHandler-test.md` S11.

| Case ID | Input / Precondition                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                           | Notes                                   |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------- |
| TC-001  | Read `error.openWorktreeInNewWindow` from the en bundle | Normal - new key                                                           | The key exists and its value is a non-empty (`length > 0`) English string | Dedicated key for Open failures added   |
| TC-002  | Read `error.revealWorktreeInOS` from the en bundle      | Normal - new key                                                           | The key exists and its value is a non-empty (`length > 0`) English string | Dedicated key for Reveal failures added |

### Failure-source inventory (include-or-justify) — added in Feature 045 (S1)

| Failure source                                        | Covering case or reason for exclusion                                                              |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Key missing on the en side (added to only one locale) | TC-001, TC-002 (the ja side is covered as a pair with `web.l10n.ja.json-test.md` TC-003 to TC-004) |
| Empty translated value                                | TC-001, TC-002 (include the non-empty check)                                                       |
| Missing branch that uses the key                      | excluded(covered by `web/messageHandler-test.md` S11 TC-033/TC-035)                                |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(the JSON bundle is static data with no validation branches. Missing and empty values are detected by the existence and non-empty checks of TC-001/TC-002)
- Exception: excluded(JSON loading failures are detected by the build/test infrastructure, and the bundle itself has no exception branches)
- External: excluded(no external dependencies)
- Boundary: excluded(no numeric boundaries. empty is covered by the non-empty checks of TC-001/TC-002)
- Type: excluded(values are JSON strings with no type branches)

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-001, TC-002), 0 failure cases. Only existence and non-empty checks on static JSON data with no execution branches, confirming that having 0 failure cases is not a gap in the inventory.

## S2: English translation keys for safe checkout and push target selection (Feature 047)

> Origin: Feature 047 (safe-remote-checkout-and-explicit-push) (light-spec-plan)
> Added: 2026-08-03
> Status: active
> Supersedes: -
> Signature: added key set `error.checkoutBranchExists` / `error.checkoutInvalidRef` / `error.pushNoRemotes` / `push.selectRemote` / `push.selectRemoteAction`
> Target Path: `l10n/web/web.l10n.en.json`
> Test File: `tests/web/i18n.test.ts`

Verifies that the 5 keys used for the reasons a remote checkout is rejected and for the selection UI of the two-step Push (`error.checkoutBranchExists` / `error.checkoutInvalidRef` / `error.pushNoRemotes` / `push.selectRemote` / `push.selectRemoteAction`) are added to the en bundle. The branches that use the keys are the responsibility of `web/messageHandler-test.md` S12 and `web/refMenu-test/01-branch-actions-01.md` S17.

| Case ID | Input / Precondition                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                           | Notes                                   |
| ------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------- |
| TC-003  | Read `error.checkoutBranchExists` from the en bundle                    | Normal - new key                                                           | The key exists and its value is a non-empty (`length > 0`) English string | Rejection reason for an existing branch |
| TC-004  | Read `error.checkoutInvalidRef` from the en bundle                      | Normal - new key                                                           | The key exists and its value is a non-empty (`length > 0`) English string | Rejection reason for an invalid ref     |
| TC-005  | Read `error.pushNoRemotes` from the en bundle                           | Normal - new key                                                           | The key exists and its value is a non-empty (`length > 0`) English string | No registered remotes                   |
| TC-006  | Read `push.selectRemote` from the en bundle                             | Normal - new key                                                           | The key exists and its value is a non-empty (`length > 0`) English string | Prompt of the selection dialog          |
| TC-007  | Read `push.selectRemoteAction` from the en bundle                       | Normal - new key                                                           | The key exists and its value is a non-empty (`length > 0`) English string | Action label of the selection dialog    |
| TC-008  | Read both the en and ja bundles and compare the set of the 5 keys above | Validation - locale parity                                                 | 0 keys are missing from the ja bundle (the set difference is empty)       | Detects additions to only one locale    |

### Failure-source inventory (include-or-justify) — added in Feature 047 (S2)

| Failure source                                        | Covering case or reason for exclusion                                                                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Key missing on the en side                            | TC-003 to TC-007                                                                                                                         |
| Added to only one locale (parity broken)              | TC-008 (the ja side is covered as a pair with `web.l10n.ja.json-test.md` TC-010)                                                         |
| Empty translated value                                | TC-003 to TC-007 (include the non-empty check)                                                                                           |
| Missing branch that uses the key                      | excluded(covered by `web/messageHandler-test.md` S12 TC-036 / TC-037 / TC-041 and `web/refMenu-test/01-branch-actions-01.md` S17 TC-084) |
| Boundary values (0 / minimum / maximum / +/-1 / NULL) | excluded(static JSON has no numeric boundaries. empty is covered by the non-empty check)                                                 |
| External dependency failures / thrown exceptions      | excluded(the bundle is static data with no external dependencies and no throw path)                                                      |

**Failure-category coverage (diversity floor)**:

- Validation: TC-008
- Exception: excluded(JSON loading failures are detected by the test infrastructure, and the bundle itself has no exception branches)
- External: excluded(no external dependencies)
- Boundary: excluded(no numeric boundaries. empty is covered by the non-empty checks of TC-003 to TC-007)
- Type: excluded(values are JSON strings with no type branches)

**Failure/normal ratio (smoke detector)**: 5 normal cases (TC-003 to TC-007), 1 failure case (TC-008). The checks are mainly existence and non-empty checks on static JSON data with no execution branches, confirming that the small number of failure cases is not a gap in the inventory.

## S3: English prompt / error for checkout + pull of a same-name remote branch

> Origin: Feature 051 (remote-checkout-pull) (light-spec-plan)
> Added: 2026-08-06
> Status: active
> Supersedes: -
> Signature: added key `Enter the local branch name for checking out {0}. If a branch with the same name already exists, the selected remote branch will be pulled after checkout:` / `error.checkoutRemoteNotFound`
> Target Path: `l10n/web/web.l10n.en.json`
> Test File: `tests/web/i18n.test.ts`

| Case ID | Input / Precondition                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                       | Notes                                            |
| ------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| TC-009  | Read the Feature 051 prompt source key from the en bundle                            | Normal - checkout + pull prompt                                            | The key exists, and its value is a non-empty English string containing exactly 1 `{0}` placeholder    | Explains the pull when a same-name branch exists |
| TC-010  | Read `error.checkoutRemoteNotFound` from the en bundle                               | Normal - remote not found error                                            | The key exists and its value is a non-empty (`length > 0`) English string                             | Dedicated reason                                 |
| TC-011  | Compare the prompt and error key sets and placeholders in both the en and ja bundles | Validation - locale parity                                                 | 0 keys are missing from the ja bundle, and the prompt's placeholder set is only `{0}` in both locales | Detects one-locale additions / placeholder drift |

### Failure-source inventory (include-or-justify) — added in Feature 051 (S3)

| Failure source                                                | Covering case or reason for exclusion                                                                                                              |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| en prompt key missing or empty                                | TC-009                                                                                                                                             |
| en remoteNotFound key missing or empty                        | TC-010                                                                                                                                             |
| Added to only one locale / placeholder mismatch               | TC-011                                                                                                                                             |
| Branches in the UI that use the prompt / error                | excluded(responsibility of `web/refMenu-test/01-branch-actions-01.md` S20 TC-100 / `web/messageHandler-test/03-git-operation-responses-01.md` S15) |
| Boundary values (0 / minimum / maximum / +/-1 / NULL / empty) | excluded(static JSON has no numeric boundaries, and empty is covered by the non-empty checks of TC-009 / TC-010)                                   |
| External dependency failures / thrown exceptions              | excluded(the bundle is static data with no external dependencies and no throw path)                                                                |
| Invalid types / formats                                       | excluded(the JSON string type is guaranteed by parsing / TypeScript, and the placeholder format is verified in TC-009 / TC-011)                    |

**Failure-category coverage (diversity floor)**:

- Validation: TC-011
- Exception: excluded(no throw path)
- External: excluded(no external dependencies)
- Boundary: excluded(no numeric boundaries. empty is verified in TC-009 / TC-010)
- Type: excluded(bundle values are static string data)

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-009, TC-010), 1 failure case (TC-011). Because the counts are close, the inventory was derived again, confirming that the failure sources of a static locale are limited to missing keys, empty values, parity and placeholders.

## S4: 4 English keys explaining deleteBranch not fully merged

> Origin: Feature 055-01 (light-spec-plan)
> Added: 2026-08-23
> Status: superseded
> Superseded By: S6
> Supersedes: -
> Signature: added key set `error.deleteBranchNotFullyMerged.summary` / `error.deleteBranchNotFullyMerged.reason` / `error.deleteBranchNotFullyMerged.guidance` / `dialog.originalGitOutput`
> Target Path: `l10n/web/web.l10n.en.json`
> Test File: `tests/web/i18n.test.ts`

Verifies that the 4 keys used in the `not fully merged` explanation dialog of `deleteBranch` are added to the en bundle and that their values exactly match the fixed wording of the finalized spec (the English column of `notes/features/055/01/memo-確定仕様.md` §4.4). The branches that use the keys are the responsibility of `web/messageHandler-test/01-basic-responses-01.md` S16 and `web/dialogs-test.md` S7; the `t()` branches of `web/i18n.ts` are not covered in this section.

| Case ID | Input / Precondition                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                            | Notes                                                             |
| ------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| TC-012  | Read the 4 keys above from the en bundle                                | Normal - 4 fixed values                                                    | All 4 keys exist, each value exactly matches the 4 English values of the finalized spec memo §4.4 with `toBe` (the exact match also guarantees non-empty), and extracting `{数字}` (`{digit}`) placeholders from each value yields nothing | Fixed wording that avoids assertive phrasing. Detects value drift |
| TC-013  | Read both the en and ja bundles and compare the set of the 4 keys above | Validation - locale parity                                                 | 0 keys are missing from the ja bundle (the set difference from the en 4-key set is empty)                                                                                                                                                  | Detects additions to only one locale                              |

### Failure-source inventory (include-or-justify) — added in Feature 055-01 (S4)

| Failure source                                              | Covering case or reason for exclusion                                                                      |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Key missing on the en side, or drift from the fixed wording | TC-012                                                                                                     |
| Empty translated value                                      | TC-012 (covered by the exact match with the fixed values)                                                  |
| Placeholders mixed in (the 4 keys have no placeholders)     | TC-012                                                                                                     |
| Added to only one locale (parity broken)                    | TC-013 (the ja side is covered as a pair with `web.l10n.ja.json-test.md` TC-015)                           |
| Missing branch that uses the key                            | excluded(covered by `web/messageHandler-test/01-basic-responses-01.md` S16 and `web/dialogs-test.md` S7)   |
| Boundary values (0 / minimum / maximum / +/-1 / NULL)       | excluded(static JSON has no numeric boundaries. empty is covered by the exact fixed-value match of TC-012) |
| External dependency failures / thrown exceptions            | excluded(the bundle is static data with no external dependencies and no throw path)                        |
| Invalid types / formats                                     | excluded(values are JSON strings with no type branches)                                                    |

**Failure-category coverage (diversity floor)**:

- Validation: TC-013
- Exception: excluded(JSON loading failures are detected by the test infrastructure, and the bundle itself has no exception branches)
- External: excluded(no external dependencies)
- Boundary: excluded(no numeric boundaries. empty is covered by the exact fixed-value match of TC-012)
- Type: excluded(values are JSON strings with no type branches)

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-012), 1 failure case (TC-013). Because the counts are equal, the inventory was derived again, confirming that the failure sources of static JSON data are limited to missing keys, drift, empty values, placeholders and parity, all covered as shown above.

## S5: English key set for the branch cleanup panel

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: added key set: panel title / comparison / column names / known, unknown and notSelected states / loading, error and empty / show and delete actions (key names fixed during the Task 4 implementation)
> Target Path: `l10n/web/web.l10n.en.json`
> Test File: `tests/web/i18n.test.ts`

Verifies that the English key set used to display the branch cleanup panel (title, comparison, column names, the state wording for upstream / worktree / comparison, loading / error / empty, show / delete actions) is added to the en bundle (implementation plan §4 Task 4, implementation item 7). The branches that use the keys are the responsibility of `web/branchCleanupPanel-test.md` S3. That the `unknown` and `notSelected` wordings are not the same value is checked on the display side by TC-019, and the bundle side also verifies that the values differ.

| Case ID | Input / Precondition                                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                             | Notes                                            |
| ------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| TC-014  | Read every key of the panel key set from the en bundle                         | Normal - key set exists                                                    | All keys exist and each value is a non-empty (`length > 0`) English string                                  | The set is fixed in the Task 4 implementation    |
| TC-015  | Compare the unknown wording with the notSelected wording in the en bundle      | Normal - state wordings differ                                             | The unknown and notSelected values do not match each other (not collapsed into the same wording)            | Pins the §3.2 distinction on the bundle side too |
| TC-016  | Read both the en and ja bundles and compare the panel key set and placeholders | Validation - locale parity                                                 | 0 keys are missing from the ja bundle, and for keys with placeholders the `{N}` set matches in both locales | One-locale additions / placeholder drift         |

### Failure-source inventory (include-or-justify) — added in Feature 055-03 (S5)

| Failure source                                        | Covering case or reason for exclusion                                                              |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Key missing or empty on the en side                   | TC-014                                                                                             |
| unknown / notSelected wordings made identical         | TC-015                                                                                             |
| Added to only one locale / placeholder mismatch       | TC-016 (the ja side is covered as a pair with `web.l10n.ja.json-test.md` S6 TC-018)                |
| Missing branch that uses the key                      | excluded(responsibility of `web/branchCleanupPanel-test.md` S3)                                    |
| Boundary values (0 / minimum / maximum / +/-1 / NULL) | excluded(static JSON has no numeric boundaries. empty is covered by the non-empty check of TC-014) |
| External dependency failures / thrown exceptions      | excluded(the bundle is static data with no external dependencies and no throw path)                |
| Invalid types / formats                               | excluded(values are JSON strings with no type branches)                                            |

**Failure-category coverage (diversity floor)**:

- Validation: TC-016
- Exception: excluded(JSON loading failures are detected by the test infrastructure, and the bundle itself has no exception branches)
- External: excluded(no external dependencies)
- Boundary: excluded(no numeric boundaries. empty is covered by the non-empty check of TC-014)
- Type: excluded(values are JSON strings with no type branches)
- Normal: TC-014, TC-015

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-014, TC-015), 1 failure case (TC-016). Because the difference is 1, the inventory was derived again, confirming that the failure sources of a static locale are limited to missing keys, empty values, identical wordings, parity and placeholders.

## S6: Fixed English values explaining deleteBranch not fully merged (055-03 revision)

> Origin: Feature 055-03 follow-up
> Added: 2026-08-29
> Status: active
> Supersedes: S4
> Signature: updated keys `error.deleteBranchNotFullyMerged.summary` / `error.deleteBranchNotFullyMerged.reason` (a 4-key set including the unchanged keys `error.deleteBranchNotFullyMerged.guidance` / `dialog.originalGitOutput`)
> Target Path: `l10n/web/web.l10n.en.json`
> Test File: `tests/web/i18n.test.ts`

The contract that revises the summary / reason of the `not fully merged` explanation to fixed wording (the English column of implementation plan §3.3) that explains the conditional relationship between the upstream and, when no upstream is set, the current branch, and the difference from the panel's compare target. This is a replacement because it swaps S4's "exact match with the 055-01 finalized spec §4.4" for this section's fixed values. guidance and `dialog.originalGitOutput` are not changed from the 055-01 values. The branches that use the keys are the responsibility of `web/messageHandler-test/01-basic-responses-01.md` S16 and `web/dialogs-test.md` S7.

| Case ID | Input / Precondition                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                       | Notes                                                 |
| ------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| TC-017  | Read the 4 keys above from the en bundle                                | Normal - 4 revised fixed values                                            | summary / reason exactly match the fixed English values of implementation plan §3.3 with `toBe`, guidance and `dialog.originalGitOutput` exactly match the existing English values of the 055-01 finalized spec §4.4 with `toBe` (pinning that they are unchanged), and extracting `{数字}` (`{digit}`) placeholders from the 4 values yields nothing | Detects value drift and changes to the unchanged keys |
| TC-018  | Read both the en and ja bundles and compare the set of the 4 keys above | Validation - locale parity                                                 | 0 keys are missing from the ja bundle (the set difference from the en 4-key set is empty)                                                                                                                                                                                                                                                             | Detects revisions to only one locale                  |

### Failure-source inventory (include-or-justify) — added in Feature 055-03 follow-up (S6)

| Failure source                                               | Covering case or reason for exclusion                                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| summary / reason not revised, or drift from the fixed values | TC-017                                                                                                     |
| guidance / `dialog.originalGitOutput` changed by mistake     | TC-017 (covered by the exact match with the existing fixed values)                                         |
| Empty translated value, or placeholders mixed in             | TC-017 (covered by the exact fixed-value match and the empty placeholder extraction)                       |
| Revised in only one locale (parity broken)                   | TC-018 (the ja side is covered as a pair with `web.l10n.ja.json-test.md` S7 TC-020)                        |
| Missing branch that uses the key                             | excluded(covered by `web/messageHandler-test/01-basic-responses-01.md` S16 and `web/dialogs-test.md` S7)   |
| Boundary values (0 / minimum / maximum / +/-1 / NULL)        | excluded(static JSON has no numeric boundaries. empty is covered by the exact fixed-value match of TC-017) |
| External dependency failures / thrown exceptions             | excluded(the bundle is static data with no external dependencies and no throw path)                        |
| Invalid types / formats                                      | excluded(values are JSON strings with no type branches)                                                    |

**Failure-category coverage (diversity floor)**:

- Validation: TC-018
- Exception: excluded(JSON loading failures are detected by the test infrastructure, and the bundle itself has no exception branches)
- External: excluded(no external dependencies)
- Boundary: excluded(no numeric boundaries. empty is covered by the exact fixed-value match of TC-017)
- Type: excluded(values are JSON strings with no type branches)
- Normal: TC-017

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-017), 1 failure case (TC-018). Because the counts are equal, the inventory was derived again, confirming that the failure sources of static JSON data are limited to drift, mistaken changes, empty values, placeholders and parity, all covered as shown above.

## S7: English key for the automatically resolved compare-target label

> Origin: Feature 055-03 follow-up
> Added: 2026-08-29
> Status: active
> Supersedes: -
> Signature: added key `cleanup.comparison.autoResolved` (value `Automatic ({0})`, placeholder set `{0}`)
> Target Path: `l10n/web/web.l10n.en.json`
> Test File: `tests/web/i18n.test.ts`

An additive section verifying that the new key `cleanup.comparison.autoResolved`, which embeds the resolved branch name into the auto option of the compare-target dropdown, is added to the en bundle and that its value exactly matches the fixed value of implementation plan §3.3. The branches that use the key (deciding the label for automatic / explicit and loaded / loading / failed) are the responsibility of `web/branchCleanupPanel-test.md` S5.

| Case ID | Input / Precondition                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                  | Notes                                     |
| ------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| TC-019  | Read `cleanup.comparison.autoResolved` from the en bundle                           | Normal - fixed value of the new key                                        | The key exists, its value exactly matches `Automatic ({0})` with `toBe`, and the set of `{数字}` (`{digit}`) placeholders extracted from the value is only `{0}` | The exact match also guarantees non-empty |
| TC-020  | Read both the en and ja bundles and compare the key's existence and placeholder set | Validation - locale parity                                                 | `cleanup.comparison.autoResolved` exists in the ja bundle (0 missing), and the placeholder set is `{0}` in both locales                                          | One-locale additions / placeholder drift  |

### Failure-source inventory (include-or-justify) — added in Feature 055-03 follow-up (S7)

| Failure source                                                     | Covering case or reason for exclusion                                                                      |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Key missing on the en side, or drift from the fixed value          | TC-019                                                                                                     |
| Missing or extra placeholders (anything other than `{0}` mixed in) | TC-019                                                                                                     |
| Added to only one locale / placeholder mismatch                    | TC-020 (the ja side is covered as a pair with `web.l10n.ja.json-test.md` S8 TC-022)                        |
| Missing branch that uses the key                                   | excluded(responsibility of `web/branchCleanupPanel-test.md` S5)                                            |
| Boundary values (0 / minimum / maximum / +/-1 / NULL)              | excluded(static JSON has no numeric boundaries. empty is covered by the exact fixed-value match of TC-019) |
| External dependency failures / thrown exceptions                   | excluded(the bundle is static data with no external dependencies and no throw path)                        |
| Invalid types / formats                                            | excluded(values are JSON strings with no type branches)                                                    |

**Failure-category coverage (diversity floor)**:

- Validation: TC-020
- Exception: excluded(JSON loading failures are detected by the test infrastructure, and the bundle itself has no exception branches)
- External: excluded(no external dependencies)
- Boundary: excluded(no numeric boundaries. empty is covered by the exact fixed-value match of TC-019)
- Type: excluded(values are JSON strings with no type branches)
- Normal: TC-019

**Failure/normal ratio (smoke detector)**: 1 normal case (TC-019), 1 failure case (TC-020). Because the counts are equal, the inventory was derived again, confirming that the failure sources of a single static locale key are limited to missing keys, drift, placeholders and parity, all covered as shown above.

## S8: 9 English keys for file history

> Origin: Feature 055-07 (light-spec-plan)
> Added: 2026-09-08
> Status: active
> Supersedes: -
> Signature: added keys `context.highlightFileHistory` / `fileHistory.loading` / `fileHistory.position` / `fileHistory.previous` / `fileHistory.next` / `fileHistory.exit` / `fileHistory.notInFirstParentDiff` / `fileHistory.noResults` / `error.fileHistory`
> Target Path: `l10n/web/web.l10n.en.json`
> Test File: `tests/web/i18n.test.ts`

An additive section verifying that the 9 keys of implementation plan §3.10 exist in the en bundle, that their values exactly match the fixed values, and that the placeholder sets match ja. Where the keys are used (menu / bar / error dialog / note) is the responsibility of `web/fileMenu-test.md` S4, `web/fileHistory-test.md` S1 to S3 and `web/main-test/10-file-history-01.md` S51.

| Case ID | Input / Precondition                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                 | Notes                                        |
| ------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| TC-021  | Read the 9 keys from the en bundle                                                           | Normal - fixed values of the 9 keys                                        | All 9 keys exist and their values exactly match `Highlight File History` / `Loading file history ...` / `{0} of {1}` / `Previous match` / `Next match` / `Exit` / `This file's change is not part of the diff against the first parent.` / `No history was found for this file.` / `Unable to load file history` with `toEqual` | The exact match also guarantees non-empty    |
| TC-022  | Extract `{数字}` (`{digit}`) placeholders from the value of `fileHistory.position`           | Normal - placeholder set                                                   | The set has 2 items, `{0}` and `{1}`, and the placeholder sets of the other 8 keys are empty                                                                                                                                                                                                                                    | Only the position display takes arguments    |
| TC-023  | Read both the en and ja bundles and compare the existence and placeholder sets of the 9 keys | Validation - locale parity                                                 | All 9 keys exist in the ja bundle (0 missing), and the placeholder set of each key matches in both locales                                                                                                                                                                                                                      | One-locale additions / placeholder drift     |
| TC-024  | Read the full key set of the en bundle                                                       | Validation - existing keys kept                                            | After adding the 9 keys, no existing keys (`context.openFile`, `error.fetch`, `find.*` and so on) are missing, and no key in the whole bundle has an empty-string value                                                                                                                                                         | Prevents accidental deletion by the addition |

### Failure-source inventory (include-or-justify) — added in Feature 055-07 (S8)

| Failure source                                                 | Covering case or reason for exclusion                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Key missing on the en side, or drift from the fixed values     | TC-021                                                                               |
| Missing or extra placeholders                                  | TC-022                                                                               |
| Added to only one locale / placeholder mismatch                | TC-023 (the ja side is covered as a pair with `web.l10n.ja.json-test.md` S9 TC-026)  |
| Existing keys deleted by mistake, or empty values, when adding | TC-024                                                                               |
| Missing branch that uses the key                               | excluded(responsibility of the owners that use them; see above)                      |
| Boundary values (0 / minimum / maximum / +/-1 / NULL)          | excluded(static JSON has no numeric boundaries. empty is covered by TC-021 / TC-024) |
| External dependency failures / thrown exceptions               | excluded(the bundle is static data with no external dependencies and no throw path)  |
| Invalid types / formats                                        | excluded(values are JSON strings with no type branches)                              |

**Failure-category coverage (diversity floor)**:

- Validation: TC-023, TC-024
- Exception: excluded(JSON loading failures are detected by the test infrastructure, and the bundle itself has no exception branches)
- External: excluded(no external dependencies)
- Boundary: excluded(no numeric boundaries. empty is covered by TC-021 / TC-024)
- Type: excluded(values are JSON strings with no type branches)
- Normal: TC-021, TC-022

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-021, TC-022), 2 failure cases (TC-023, TC-024). Because the counts are equal, the inventory was derived again, confirming that the failure sources of static JSON data are limited to drift, placeholders, parity and accidental deletion, all covered as shown above.

## S9: English key for the detached worktree removal confirmation

> Origin: Feature 053 (detached-worktree-menu) (light-spec-plan)
> Added: 2026-09-13
> Status: active
> Supersedes: -
> Signature: added key `Are you sure you want to remove the worktree at {0}?`
> Target Path: `l10n/web/web.l10n.en.json:240`
> Test File: `tests/web/i18n.test.ts`

| Case ID | Input / Precondition                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                | Notes                                                |
| ------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| TC-025  | Read `l10n/web/web.l10n.en.json` and the key `Are you sure you want to remove the worktree at {0}?` | Normal - key present                                                       | The value is a `string` of length 1 or more and contains `{0}` | The ja side is `web.l10n.ja.json-test.md` S10 TC-027 |

### Failure-source inventory (include-or-justify) — added in Feature 053 (S9)

| Failure source                                                         | Covering case or reason for exclusion    |
| ---------------------------------------------------------------------- | ---------------------------------------- |
| Key missing / empty string                                             | TC-025                                   |
| Placeholder missing                                                    | TC-025                                   |
| Other categories (Validation / Exception / External / Boundary / Type) | excluded(existence check on static JSON) |

## S10: English key for the hidden badge counter

> Origin: Feature 059-02 (light-spec-plan)
> Added: 2026-09-24
> Status: active
> Supersedes: -
> Signature: added key `refs.showHidden` (value `Show {0} hidden badges`, placeholder set `{0}`)
> Target Path: `l10n/web/web.l10n.en.json`
> Test File: `tests/web/i18n.test.ts`

An additive section verifying that the new key used for the counter's title/aria-label is added to the en bundle and that its value exactly matches the fixed value of implementation plan §3.5. Inserting the count is the responsibility of `web/i18n-test.md` S2, and setting it on the counter of `web/refOverflow-test.md` S3.

| Case ID | Input / Precondition                                                                               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                         | Notes                                                            |
| ------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| TC-026  | Read `refs.showHidden` from the en bundle                                                          | Normal - fixed value of the new key                                        | The key exists, its value exactly matches `Show {0} hidden badges` with `toBe`, and the set of `{数字}` (`{digit}`) placeholders extracted from the value is only `{0}` | AC-18                                                            |
| TC-027  | Read both the en and ja bundles and compare the existence and placeholder set of `refs.showHidden` | Validation - locale parity                                                 | `refs.showHidden` exists in the ja bundle, and the placeholder set is `{0}` in both locales                                                                             | Paired with `web.l10n.ja.json-test.md` S11 TC-030 on the ja side |
| TC-028  | Read the full key set of the en bundle                                                             | Validation - existing keys kept                                            | After the addition, no existing keys (`table.description`, `find.*` and so on) are missing, and no key in the whole bundle has an empty-string value                    | Prevents accidental deletion by the addition                     |

### Failure-source inventory (include-or-justify) — added in Feature 059-02 (S10)

| Failure source                                                 | Covering case or reason for exclusion                                                                |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Key missing on the en side, or drift from the fixed value      | TC-026                                                                                               |
| Missing or extra placeholders                                  | TC-026                                                                                               |
| Added to only one locale / placeholder mismatch                | TC-027                                                                                               |
| Existing keys deleted by mistake, or empty values, when adding | TC-028                                                                                               |
| Japanese value                                                 | excluded(responsibility of `web.l10n.ja.json-test.md` S11)                                           |
| Boundaries, external dependencies, exceptions, types           | excluded(static JSON has no numeric boundaries, external dependencies, throw paths or type branches) |

### Feature 059-02 test mapping (S10)

- Test file: describe `hidden ref badge counter label (Feature 059-02)` in `tests/web/i18n.test.ts`. TC-026 to TC-028 are each an `it` (with `en l10n TC-0NN` appended to the name)

## S11: English dictionary for the 12 a11y keys for keyboard operation and screen readers

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: added keys `a11y.commitHistory` / `a11y.operationTarget` / `a11y.detailsOpen` / `a11y.compareBase` / `a11y.compareTarget` / `a11y.head` / `a11y.workingTree` / `a11y.stash` / `a11y.actionFor` / `a11y.commitsLoaded` / `a11y.noCommits` / `a11y.commitOrdering`
> Target Path: `l10n/web/web.l10n.en.json`
> Test File: `tests/web/i18n.test.ts`

The English values of the table in implementation plan Task 11, implementation item 4. An additive section verifying the keys and translations for names and state announcements, and that the placeholder arguments match. Connecting them to the DOM is the responsibility of `web/main-test/13-keyboard-accessibility-02.md` S77, and inserting values through `t()` of `web/i18n-test.md`.

| Case ID | Input / Precondition                                                       | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                       | Notes                                                                              |
| ------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| TC-101  | Read the 12 keys from the en bundle                                        | Normal - key set exists                                                    | All 12 keys exist and their values are non-empty strings                                                                                                                                                                              | K45                                                                                |
| TC-102  | Compare the values of the 12 keys with the Task 11 table                   | Normal - fixed values match                                                | Exactly match `Commit history` / `Navigation target` / `Details open` / `Comparison base` / `Comparison target` / `HEAD` / `Working tree` / `Stash` / `{0}: {1}` / `{0} commits loaded` / `No commits to display` / `Commit ordering` | K45                                                                                |
| TC-103  | Extract the placeholders of `a11y.actionFor` and `a11y.commitsLoaded`      | Validation - arguments match                                               | The placeholder set of `a11y.actionFor` is `{0}` and `{1}`, that of `a11y.commitsLoaded` is `{0}`, and the other 10 keys have no placeholders                                                                                         | K45. Failure source: a name loses part of its text when the arguments do not match |
| TC-104  | Compare the key sets with the `a11y.` prefix in both the en and ja bundles | Validation - locale parity                                                 | The set difference is empty in both directions                                                                                                                                                                                        | Paired with `web.l10n.ja.json-test.md` S12 TC-104 on the ja side                   |
| TC-105  | Scan the sources under `web/` for references to `t("a11y.…")`              | Validation - no unused keys                                                | All 12 keys are referenced from `web/*.ts`, and 0 `a11y.` keys are referenced but missing from the bundle                                                                                                                             | Task 11 done-when condition "no new unused keys ... are added"                     |

### Failure-source inventory (include-or-justify) — added in Feature 061-05 (S11)

| Failure source                           | Covering case or reason for exclusion                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| Missing keys, empty values, wrong values | TC-101, TC-102                                                               |
| Placeholder mismatch                     | TC-103                                                                       |
| Added to only one locale                 | TC-104                                                                       |
| Unused keys, undefined keys              | TC-105                                                                       |
| External dependencies, exceptions, types | excluded(static JSON with no external dependencies, throws or type branches) |

### Task 12 test mapping (Feature 061-05) — S11

- Tests: the end of the describe in `tests/web/i18n.test.ts` (`// @see` this file). TC-101 `English bundle holds the twelve keys with non-empty values (en l10n TC-101)` / TC-102 `English bundle holds exactly the fixed values of the Task 11 table (en l10n TC-102)` / TC-103 `English placeholders exist only on actionFor and commitsLoaded (en l10n TC-103)` / TC-104 `keeps the a11y key sets of both locales in parity (en l10n TC-104 / ja l10n TC-104)` / TC-105 `references every a11y key from web/ and defines every referenced one (en l10n TC-105)`
- Task 11 added `a11y.closeDetails` in addition to the 12 keys of the table. "12 keys" in TC-101 / TC-102 means the set in the Task 11 table, while the parity and reference checks of TC-104 / TC-105 cover every `a11y.` key including `a11y.closeDetails` (the added key is also present in both en / ja and referenced from `web/main.ts`)
- Execution result (2026-10-07): 5 passed
