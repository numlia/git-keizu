# Test Perspectives: l10n/bundle.l10n.json

> Source: `l10n/bundle.l10n.json`
> Generated: 2026-10-07T00:00:00Z
> Language: JSON (l10n bundle)
> Test Framework: Vitest
> Storage Mode: single-file

## S1: English keys for the list name and status notifications in host-generated HTML

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: added keys `Commit history` / `Git Keizu status` (including reuse of the existing toolbar keys `Repo:` / `Branches:` / `Authors:` / `Show Remote Branches` / `Branch Cleanup` / `Search` / `Fetch --prune` / `Current` / `Refresh`)
> Target Path: `l10n/bundle.l10n.json`
> Test File: `tests/src/i18n.test.ts`

Host dictionary additions from the end of implementation plan Task 11, implementation item 4. `hostT()` in `src/gitGraphView.ts` uses them for the name of `#commitTable` and the name of the `role="status"` element. Wiring into the host-generated HTML belongs to `src/gitGraphView-test/08-keyboard-accessibility-01.md` S42, and the existing branch cleanup keys belong to `src/i18n-test.md` S2.

| Case ID | Input / Precondition                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                         | Notes                                                         |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| TC-001  | Read `Commit history` and `Git Keizu status` from the en host bundle | Normal - keys exist with values                                            | Both keys exist, and their values exactly match `Commit history` / `Git Keizu status`   | K45                                                           |
| TC-002  | Read the 9 existing toolbar keys                                     | Normal - existing translations kept                                        | The 9 keys exist and their values are the same as before the change (`Repo:` and so on) | Task 9 "reuse the existing toolbar translations"              |
| TC-003  | Compare the key sets of the en / ja host bundles                     | Validation - locale parity                                                 | The set difference is empty in both directions (0 keys added to only one locale)        | Paired with `bundle.l10n.ja-test.md` S1 TC-003 on the ja side |

### Failure-source inventory (include-or-justify) — added by Feature 061-05 (S1)

| Failure source                       | Covering case or reason for exclusion                                          |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| Missing key or wrong value           | TC-001                                                                         |
| Existing translations changed        | TC-002                                                                         |
| Added to only one locale             | TC-003                                                                         |
| Branches that use the keys           | excluded(owned by `src/gitGraphView-test/08-keyboard-accessibility-01.md` S42) |
| External dependency, exception, type | excluded(static JSON with no external dependency, throw, or type branch)       |

### Task 12 test mapping (Feature 061-05) — S1

- Tests: `tests/src/i18n.test.ts` (`// @see` this file). TC-001 `English host bundle holds the list name and status region name (en TC-001)` / TC-002 `English host bundle keeps the nine toolbar texts unchanged (en TC-002)` / TC-003 `adds the two host keys to both locales (en TC-003 / ja TC-003)`
- Execution result (2026-10-07): 3 passed
