# Test Perspectives: src/i18n.ts

> Source: `src/i18n.ts`
> Generated: 2026-05-03T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest

## S1: host locale / webview dictionary loading

> Origin: Feature 035 (japanese-ui-i18n) Task 8
> Added: 2026-05-03
> Updated: 2026-08-03
> Status: active
> Supersedes: -
> Signature: `getLocale(): "en" | "ja"; loadWebviewMessages(extensionPath: string): Promise<Record<string, string>>; t(message: string, ...args): string`
> Target Path: `src/i18n.ts`

| Case ID | Input / Precondition                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                      | Notes                                                |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| TC-001  | `vscode.env.language` is `ja` / `ja-JP`        | Normal - locale branch                                                     | `getLocale()` returns `ja`                           | Entry point for switching to Japanese display        |
| TC-002  | `vscode.env.language` is an unsupported locale | Normal - fallback                                                          | `getLocale()` returns `en`                           | Unsupported locales use English                      |
| TC-003  | host `t("Hello {0}", "Git Keizu")`             | External - vscode.l10n delegation                                          | Delegates to `vscode.l10n.t` with the same arguments | host translation wrapper                             |
| TC-004  | The same key exists in both ja and en          | Normal - dictionary merge                                                  | The ja value overrides en                            | `l10n/web/web.l10n.ja.json`                          |
| TC-005  | Loading the ja dictionary fails, en succeeds   | Exception - fallback                                                       | Returns the en webview messages                      | Keeps going when a file is missing                   |
| TC-006  | Both ja and en fail or are invalid JSON        | Exception - fallback exhausted                                             | Returns the empty dictionary `{}`                    | Does not stop HTML generation                        |
| TC-007  | en has a key that the ja dictionary does not   | Normal - per-key fallback                                                  | That key is filled with the en value                 | Prevents raw keys from showing for untranslated keys |
| TC-008  | locale is en                                   | Normal - fallback locale short-circuit                                     | Reads only the en dictionary, once                   | Prevents reading the same file twice                 |

## S2: host English and Japanese keys for the branch cleanup toolbar title

> Origin: Feature 055-03 (light-spec-plan)
> Added: 2026-08-25
> Status: active
> Supersedes: -
> Signature: adding the branch cleanup toolbar title key to `l10n/bundle.l10n.json` / `l10n/bundle.l10n.ja.json` (the key name is decided when implementing Task 3)
> Target Path: `l10n/bundle.l10n.json` / `l10n/bundle.l10n.ja.json`
> Test File: `tests/src/i18n.test.ts`

Checks that the English and Japanese keys of the host bundle used for the toolbar title of `#branchCleanupBtn` exist and match (implementation plan §4 Task 3 implementation item 4; the owner in the responsibility table is the host l10n bundle). Keeping existing keys / values belongs to existing cases, and the webview-side locale keys belong to `l10n/web/web.l10n.*.json-test.md`, so neither is covered in this table.

| Case ID | Input / Precondition                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                            | Notes                                        |
| ------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| TC-009  | Read the branch cleanup toolbar title key from the en host bundle       | Normal - en key exists                                                     | The key exists and its value is a non-empty (`length > 0`) English string                                                  | The title added in Task 3                    |
| TC-010  | Read the same key from the ja host bundle                               | Normal - ja key exists                                                     | The key exists, its value is a non-empty Japanese string, and the value is not the key string itself (no raw key fallback) | Detects untranslated pass-through            |
| TC-011  | Read both the en and ja host bundles and compare the sets of added keys | Validation - locale parity                                                 | The en / ja set difference of the added keys is empty in both directions (0 keys added to only one locale)                 | Addresses the Task 3 NO-GO (one locale only) |

### Failure-source inventory (include-or-justify) - added by Feature 055-03 (S2)

| Failure source                                              | Covering cases or reason for exclusion                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Missing key or empty value on the en side                   | TC-009                                                                                     |
| Missing key, empty value or raw key fallback on the ja side | TC-010                                                                                     |
| Added to only one locale (parity broken)                    | TC-011                                                                                     |
| The branch that uses the key (applying it to the title)     | excluded (covered by `src/gitGraphView-test/05-branch-cleanup-01.md` S33 TC-170)           |
| Boundary values (0 / minimum / maximum / +/-1 / NULL)       | excluded (static JSON has no numeric boundaries. empty is covered by the non-empty checks) |
| External dependency failure / thrown exceptions             | excluded (the bundle is static data, with no external dependencies or throw paths)         |
| Invalid type / format                                       | excluded (values are JSON strings, with no type branches)                                  |

**Failure-category coverage (diversity floor)**:

- Validation: TC-011
- Exception: excluded (a JSON load failure is detected by the test infrastructure, and the bundle itself has no exception branch)
- External: excluded (no external dependencies)
- Boundary: excluded (no numeric boundaries. empty is covered by the non-empty checks in TC-009 / TC-010)
- Type: excluded (values are JSON strings, with no type branches)
- Normal: TC-009, TC-010

**Failure/normal ratio (smoke detector)**: 2 normal cases (TC-009, TC-010), 1 failure case (TC-011). Because the difference is 1, the inventory was re-derived; the failure sources of static locales are limited to missing keys, empty values, raw fallback and parity, and all are covered as in the table above.
