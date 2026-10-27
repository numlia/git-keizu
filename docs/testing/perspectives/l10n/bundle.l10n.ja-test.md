# Test Perspectives: l10n/bundle.l10n.ja.json

> Source: `l10n/bundle.l10n.ja.json`
> Generated: 2026-10-07T00:00:00Z
> Language: JSON (l10n bundle)
> Test Framework: Vitest
> Storage Mode: single-file

## S1: Japanese keys for the list name and status notification in host-generated HTML

> Origin: Feature 061-05 (light-spec-plan)
> Added: 2026-10-07
> Status: active
> Supersedes: -
> Signature: added keys `Commit history` / `Git Keizu status` (values `コミット履歴` / `Git Keizuの状態`)
> Target Path: `l10n/bundle.l10n.ja.json`
> Test File: `tests/src/i18n.test.ts`

The host dictionary additions (Japanese) at the end of item 4 of the Task 11 implementation in the implementation plan. Verification includes the absence of raw key fallback.

| Case ID | Input / Precondition                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                          | Notes                                                  |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| TC-001  | Read `Commit history` and `Git Keizu status` from the ja host bundle | Normal - key presence and values                                           | Both keys exist, their values exactly equal `コミット履歴` / `Git Keizuの状態` respectively, and do not equal the key strings themselves | K45                                                    |
| TC-002  | Read the 9 existing toolbar keys                                     | Normal - existing translations kept                                        | The 9 keys exist and their values are the same as before the change                                                                      | Task 9                                                 |
| TC-003  | Compare the key sets of the en / ja host bundles                     | Validation - locale parity                                                 | The set difference is empty in both directions                                                                                           | The en side pairs with `bundle.l10n-test.md` S1 TC-003 |

### Failure-source inventory (include-or-justify) — added by Feature 061-05 (S1)

| Failure source                             | Covering case or exclusion reason                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| Missing key, wrong value, raw key fallback | TC-001                                                                       |
| Changes to existing translations           | TC-002                                                                       |
| Added to only one locale                   | TC-003                                                                       |
| External dependencies, exceptions, types   | excluded(static JSON with no external dependencies, throws or type branches) |

### Task 12 test mapping (Feature 061-05) — S1

- Tests: `tests/src/i18n.test.ts`. TC-001 `Japanese host bundle translates the list name and status region name (ja TC-001)` / TC-002 `Japanese host bundle keeps the nine toolbar keys translated (ja TC-002)` / TC-003 `adds the two host keys to both locales (en TC-003 / ja TC-003)`
- Execution result (2026-10-07): 3 pass
