# Test Perspectives: web/i18n.ts

> Source: `web/i18n.ts`
> Generated: 2026-05-03T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest

## S1: webview t() helper fallback and placeholder handling

> Origin: Feature 035 (japanese-ui-i18n) Task 8
> Added: 2026-05-03
> Status: active
> Supersedes: -
> Signature: `t(key: string, ...args: (string | number)[]): string; getWebviewLocale(): "en" | "ja"`
> Target Path: `web/i18n.ts`

| Case ID | Input / Precondition                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                          | Notes                                  |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------- |
| TC-001  | The key is in the dictionary and contains `{0}` / `{1}` | Normal - key hit                                                           | Placeholders are replaced in order                       | Main normal case                       |
| TC-002  | The key is not in the dictionary                        | Boundary - key miss                                                        | Returns the key itself                                   | Fallback for a missing key             |
| TC-003  | Not enough placeholder arguments                        | Boundary - missing arg                                                     | Missing arguments become empty strings                   | Compatibility policy with VS Code l10n |
| TC-004  | `globalThis.webviewMessages` is undefined               | Exception - missing global                                                 | Treated as an empty dictionary and falls back to the key | Unit tests / when injection fails      |
| TC-005  | `globalThis.webviewLocale` is `ja` / `en`               | Normal - locale normalize                                                  | Only `ja` gives ja, everything else gives en             | Entry point of the date locale branch  |

## S2: Inserting the number of hidden badges

> Origin: Feature 059-02 (light-spec-plan)
> Added: 2026-09-24
> Status: active
> Supersedes: -
> Signature: `t(key: string, ...args: (string | number)[]): string` (the numeric argument of `t("refs.showHidden", hiddenCount)`)
> Target Path: `web/i18n.ts` (`t`. The implementation does not change)
> Test File: `tests/web/i18n.test.ts`

Confirm with the real dictionaries that `t("refs.showHidden", hiddenCount)`, used for the counter's title/aria-label, can insert a number with the existing `t`. `web/i18n.ts` does not change. The source of truth for the dictionary text is owned by `l10n/web/web.l10n.en.json-test.md` S10 and `l10n/web/web.l10n.ja.json-test.md` S11; this section only covers the result of the insertion.

| Case ID | Input / Precondition                                                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                            | Notes                                            |
| ------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| TC-006  | Read `l10n/web/web.l10n.en.json`, set it to `globalThis.webviewMessages`, and call `t("refs.showHidden", 4)` | Normal - number inserted in English                                        | Returns `Show 4 hidden badges`                                                                                             | AC-18                                            |
| TC-007  | Read `l10n/web/web.l10n.ja.json`, set it to `globalThis.webviewMessages`, and call `t("refs.showHidden", 4)` | Normal - number inserted in Japanese                                       | Returns `非表示のバッジ 4 件を表示`                                                                                        | AC-18                                            |
| TC-008  | With the real en dictionary, call `t("refs.showHidden", n)` with n=9 / 10 / 99 / 100                         | Boundary - counts with a different number of digits                        | Returns `Show 9 hidden badges` / `Show 10 hidden badges` / `Show 99 hidden badges` / `Show 100 hidden badges` respectively | AC-16                                            |
| TC-009  | With the real en dictionary, `t("refs.showHidden", 1000)`                                                    | Boundary - no digit grouping                                               | Returns `Show 1000 hidden badges` (not `1,000`)                                                                            | The number is inserted after `String` conversion |

### Failure-source inventory (include-or-justify) — added by Feature 059-02 (S2)

| Failure source                                                              | Covering case or reason for exclusion                                                |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| The numeric argument cannot be inserted, or is converted to a locale format | TC-006 to TC-009                                                                     |
| The string breaks when the number of digits changes                         | TC-008                                                                               |
| Fallback for a missing key                                                  | excluded(already covered by the existing S1 TC-002. This change does not modify `t`) |
| Wrong text                                                                  | excluded(owned by the perspectives for each l10n dictionary)                         |
| External dependency, exception                                              | excluded(`t` only looks up the dictionary and replaces, with no throw path)          |

### Feature 059-02 test mapping (S2)

- Test file: describe `hidden ref badge counter label (Feature 059-02)` in `tests/web/i18n.test.ts`. TC-006, TC-007, and TC-009 are separate `it`s, and TC-008 runs n=9/10/99/100 with `it.each`. The real dictionary JSON is set to `globalThis.webviewMessages`, and the existing `t` is called as is

## S3: English and Japanese resolution of the path highlight UI translation keys

> Origin: Feature 061-01 (light-spec-plan)
> Added: 2026-10-03
> Status: active
> Supersedes: -
> Signature: `t(key: string, ...args: (string | number)[]): string` (the implementation does not change)
> Target Path: `web/i18n.ts:7-13` (`t`. The implementation does not change)
> Test File: `tests/web/i18n.test.ts`

Confirm that, with the real dictionaries `l10n/web/web.l10n.en.json` / `l10n/web/web.l10n.ja.json` set to `globalThis.webviewMessages`, the existing `t` resolves the 11 keys of implementation plan §3.6 to the expected text instead of falling back to the key itself. Mode values (such as `Direct parents and children`) use the enum value itself as the key. Each case is a parameterized test over the 11 keys (`it.each`) that matches the expected text per key. The DOM structure of the bar belongs to `web/pathHighlightController-test.md` S1 and is not part of this table.

| Case ID | Input / Precondition                                                         | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Notes                                               |
| ------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| TC-010  | Set the real en dictionary and call `t(key)` for each of the 11 keys in §3.6 | Normal - English resolution                                                | Matches with `toBe`: `pathHighlight.menu` → `Highlight path`, `Direct parents and children` → `Direct parents and children`, `Ancestors and descendants` → `Ancestors and descendants`, `First-parent ancestors` → `First-parent ancestors`, `All ancestors` → `All ancestors`, `pathHighlight.mode` → `Mode`, `pathHighlight.loadedOnly` → `Loaded history only`, `pathHighlight.clear` → `Clear path highlight`, `pathHighlight.branchAtSelection` → `Branch at selection`, `pathHighlight.targetOutside` → `Target is outside loaded history`, `pathHighlight.outside` → `Outside loaded history` | All 11 keys exist in the dictionary                 |
| TC-011  | Set the real ja dictionary and call `t(key)` with the same 11 keys           | Normal - Japanese resolution                                               | Matches with `toBe`: `pathHighlight.menu` → `経路を強調`, `Direct parents and children` → `直接の親・子`, `Ancestors and descendants` → `全祖先と全子孫`, `First-parent ancestors` → `第一親の祖先`, `All ancestors` → `全祖先`, `pathHighlight.mode` → `モード`, `pathHighlight.loadedOnly` → `読み込み済みの履歴のみ`, `pathHighlight.clear` → `経路の強調を解除`, `pathHighlight.branchAtSelection` → `選択時点のブランチ`, `pathHighlight.targetOutside` → `対象は読み込み済み履歴の範囲外です`, `pathHighlight.outside` → `読み込み済み履歴の範囲外`                                            | Not the fallback to the English key (the key as is) |

### Failure-source inventory (include-or-justify) — added by Feature 061-01 (S3)

| Failure source                                                 | Covering case or reason for exclusion                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Key missing from the dictionary (falls back to the key itself) | TC-010, TC-011 (`toBe` against the expected text tells it apart from the key string) |
| Wrong or swapped English/Japanese text                         | TC-010, TC-011                                                                       |
| Placeholders, numeric insertion                                | excluded(the 11 keys have no placeholders)                                           |
| External dependency, exception                                 | excluded(`t` only looks up the dictionary and replaces, with no throw path)          |

**Failure-category coverage (diversity floor)**:

- Validation: excluded(as in the table above)
- Exception: excluded(as in the table above)
- External: excluded(as in the table above)
- Boundary: excluded(fallback for a missing key is already covered by S1 TC-002)
- Type: excluded(no type branch)
- Normal: TC-010, TC-011
