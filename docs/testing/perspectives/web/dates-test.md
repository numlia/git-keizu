# テスト観点表: web/dates.ts

> Source: `web/dates.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: switch分岐 - dateFormat による出力形式の切り替え

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**シグネチャ**: `export function getCommitDate(dateVal: number): { title: string; value: string }`
**テスト対象パス**: `web/dates.ts:10-51`

| Case ID | Input / Precondition                                                  | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                  | Notes                               |
| ------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------- |
| TC-001  | dateVal=1700000000, viewState.dateFormat=未設定（default分岐）        | Normal - standard                                                          | value が "D Mon YYYY HH:MM" 形式の文字列。title と value が同一値                | L47 default分岐。実質 "Date & Time" |
| TC-002  | dateVal=1700000000, viewState.dateFormat="Date Only"                  | Normal - branch                                                            | value が "D Mon YYYY" 形式の文字列（時刻なし）。title は "D Mon YYYY HH:MM" 形式 | L17                                 |
| TC-003  | viewState.dateFormat="Relative", dateVal=mockNow/1000-30（diff=30秒） | Normal - branch                                                            | value = "30 seconds ago"。title は "D Mon YYYY HH:MM" 形式                       | L20-46。Date モック必要             |

## S2: Relative分岐 - 時間単位の選択（if/else ifチェーン）

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**シグネチャ**: `export function getCommitDate(dateVal: number): { title: string; value: string }`
**テスト対象パス**: `web/dates.ts:10-51`

| Case ID | Input / Precondition      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result         | Notes                  |
| ------- | ------------------------- | -------------------------------------------------------------------------- | ----------------------- | ---------------------- |
| TC-004  | Relative, diff=120秒      | Normal - branch                                                            | value = "2 minutes ago" | L25。diff/60=2, 複数形 |
| TC-005  | Relative, diff=7200秒     | Normal - branch                                                            | value = "2 hours ago"   | L28。diff/3600=2       |
| TC-006  | Relative, diff=172800秒   | Normal - branch                                                            | value = "2 days ago"    | L31。diff/86400=2      |
| TC-007  | Relative, diff=1209600秒  | Normal - branch                                                            | value = "2 weeks ago"   | L34。diff/604800=2     |
| TC-008  | Relative, diff=5259600秒  | Normal - branch                                                            | value = "2 months ago"  | L37。diff/2629800=2    |
| TC-009  | Relative, diff=63115200秒 | Normal - branch                                                            | value = "2 years ago"   | L40。diff/31557600=2   |

## S3: title プロパティの一貫性

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**シグネチャ**: `export function getCommitDate(dateVal: number): { title: string; value: string }`
**テスト対象パス**: `web/dates.ts:10-51`

| Case ID | Input / Precondition                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                           | Notes              |
| ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------ |
| TC-010  | 各dateFormat("Date & Time", "Date Only", "Relative")で同一dateVal | Normal - standard                                                          | 全フォーマットで title が同一の "D Mon YYYY HH:MM" 形式。value のみフォーマット依存で変化 | L50。3パターン検証 |

## S4: 異常系 - バリデーション不在のエッジケース

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**シグネチャ**: `export function getCommitDate(dateVal: number): { title: string; value: string }`
**テスト対象パス**: `web/dates.ts:10-51`

| Case ID | Input / Precondition                                     | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                 | Notes                      |
| ------- | -------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------- |
| TC-011  | dateVal=NaN, dateFormat="Date & Time"                    | Validation - rejected precondition                                         | new Date(NaN)がInvalid Date。value/titleの dateStr に "NaN" と "undefined"（months[NaN]）を含む | L11-13。バリデーションなし |
| TC-012  | dateVal=Infinity, dateFormat="Date & Time"               | Validation - rejected precondition                                         | new Date(Infinity)がInvalid Date。TC-011と同様、value/titleに "NaN" を含む                      | L11                        |
| TC-013  | Relative, dateValが現在より未来（diff<0）                | Validation - rejected precondition                                         | diff<0 は diff<60 を満たす。value = 負の数値 + " seconds ago"（例: "-30 seconds ago"）          | L23。負値ガードなし        |
| TC-014  | viewState.dateFormat="InvalidFormat"（型定義外の文字列） | Validation - rejected precondition                                         | switch defaultに入り、value = "dateStr timeStr" 形式（"Date & Time"と同じ挙動）                 | L47                        |

## S5: 境界値 - 時間単位の切り替え境界

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**シグネチャ**: `export function getCommitDate(dateVal: number): { title: string; value: string }`
**テスト対象パス**: `web/dates.ts:10-51`

| Case ID | Input / Precondition                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                               | Notes                                  |
| ------- | -------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------- |
| TC-015  | Relative, diff=0秒（dateVal=現在時刻） | Boundary - zero                                                            | value = "0 seconds ago"。Math.round(0)=0, 0!==1で複数形       | L23, L45                               |
| TC-016  | Relative, diff=59秒                    | Boundary - max (second)                                                    | value = "59 seconds ago"。SECONDS_IN_MINUTE(60)の境界-1       | L23                                    |
| TC-017  | Relative, diff=60秒                    | Boundary - min (minute)                                                    | value = "1 minute ago"。60/60=1, 単数形                       | L25。秒→分の切り替え境界               |
| TC-018  | Relative, diff=3599秒                  | Boundary - max (minute)                                                    | value = "60 minutes ago"。3599/60≈59.98, Math.round=60        | L25。SECONDS_IN_HOUR(3600)の境界-1     |
| TC-019  | Relative, diff=3600秒                  | Boundary - min (hour)                                                      | value = "1 hour ago"。3600/3600=1, 単数形                     | L28。分→時の切り替え境界               |
| TC-020  | Relative, diff=86399秒                 | Boundary - max (hour)                                                      | value = "24 hours ago"。86399/3600≈23.99, Math.round=24       | L28。SECONDS_IN_DAY(86400)の境界-1     |
| TC-021  | Relative, diff=86400秒                 | Boundary - min (day)                                                       | value = "1 day ago"。86400/86400=1, 単数形                    | L31。時→日の切り替え境界               |
| TC-022  | Relative, diff=604799秒                | Boundary - max (day)                                                       | value = "7 days ago"。604799/86400≈6.99, Math.round=7         | L31。SECONDS_IN_WEEK(604800)の境界-1   |
| TC-023  | Relative, diff=604800秒                | Boundary - min (week)                                                      | value = "1 week ago"。604800/604800=1, 単数形                 | L34。日→週の切り替え境界               |
| TC-024  | Relative, diff=2629799秒               | Boundary - max (week)                                                      | value = "4 weeks ago"。2629799/604800≈4.35, Math.round=4      | L34。SECONDS_IN_MONTH(2629800)の境界-1 |
| TC-025  | Relative, diff=2629800秒               | Boundary - min (month)                                                     | value = "1 month ago"。2629800/2629800=1, 単数形              | L37。週→月の切り替え境界               |
| TC-026  | Relative, diff=31557599秒              | Boundary - max (month)                                                     | value = "12 months ago"。31557599/2629800≈12.0, Math.round=12 | L37。SECONDS_IN_YEAR(31557600)の境界-1 |
| TC-027  | Relative, diff=31557600秒              | Boundary - min (year)                                                      | value = "1 year ago"。31557600/31557600=1, 単数形             | L40。月→年の切り替え境界               |

## S6: 境界値 - dateVal の極値

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**シグネチャ**: `export function getCommitDate(dateVal: number): { title: string; value: string }`
**テスト対象パス**: `web/dates.ts:10-51`

| Case ID | Input / Precondition                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                      | Notes                 |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------- |
| TC-028  | dateVal=0, dateFormat="Date & Time"                       | Boundary - zero (dateVal)                                                  | UNIXエポック（1970-01-01）の日付文字列。value/titleに "1970" を含む                  | L11。タイムゾーン依存 |
| TC-029  | dateVal=Number.MAX_SAFE_INTEGER, dateFormat="Date & Time" | Boundary - max (dateVal)                                                   | dateVal\*1000がDate有効範囲(8.64e15ms)超過。Invalid Date、value/titleに "NaN" を含む | L11。オーバーフロー   |

## S7: 境界値 - 単数形/複数形（三項演算子）

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**シグネチャ**: `export function getCommitDate(dateVal: number): { title: string; value: string }`
**テスト対象パス**: `web/dates.ts:10-51`

| Case ID | Input / Precondition | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                               | Notes |
| ------- | -------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- | ----- |
| TC-030  | Relative, diff=1秒   | Boundary - singular                                                        | value = "1 second ago"。Math.round(1)=1, 1!==1はfalse→"s"なし | L45   |
| TC-031  | Relative, diff=2秒   | Boundary - plural                                                          | value = "2 seconds ago"。Math.round(2)=2, 2!==1はtrue→"s"あり | L45   |
