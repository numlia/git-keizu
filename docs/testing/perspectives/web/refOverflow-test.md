# テスト観点表: web/refOverflow.ts

> Source: `web/refOverflow.ts`
> Generated: 2026-09-24T00:00:00Z
> Language: TypeScript
> Test Framework: Vitest

## S1: selectVisibleRefCount() 表示件数の判定

> Origin: Feature 059-02 (light-spec-plan)
> Added: 2026-09-24
> Status: active
> Supersedes: -
> Signature: `export function selectVisibleRefCount(badgeWidths: readonly number[], budget: number, counterWidths: ReadonlyMap<number, number>): number | null`
> Target Path: `web/refOverflow.ts`（`selectVisibleRefCount`。実装前のため実装後に行範囲へ更新）
> Test File: `tests/web/refOverflow.test.ts`

バッジ外幅の配列、上限B、件数別カウンター外幅から、先頭から残すバッジ数を返す純粋関数（対応プラン §3.4）。期待値は対応プラン §3.6「独立した境界入力と期待結果」の8行から転記し、production関数で期待値を作らない。「カウンター外幅 15」のように単一値の行では件数1〜nのすべてへ同じ幅を与える。0（有効な0件表示）とnull（測れない）は `toBe(0)` / `toBeNull()` で区別する。

| Case ID | Input / Precondition                                                                                | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                    | Notes                                                |
| ------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| TC-001  | badgeWidths `[20,30]`、budget 50、counter 件数1〜2=15                                               | Boundary - 合計がBにちょうど一致                                           | 戻り値が `2`（全件表示、counterなし）                                              | §3.6 1行目。AC-13                                    |
| TC-002  | badgeWidths `[20,30]`、budget 40、counter 件数1〜2=15                                               | Normal - 先頭1個とcounter                                                  | 戻り値が `1`（先頭1個と `+1`）                                                     | §3.6 2行目                                           |
| TC-003  | badgeWidths `[80,5,5]`、budget 40、counter 件数1〜3=15                                              | Boundary - 先頭超過で全件折り畳み                                          | 戻り値が `0`（`toBe(0)`。`+3`）。後続の短いバッジを飛び越して `2` 等を返さない     | §3.6 3行目。AC-16                                    |
| TC-004  | badgeWidths `[20.25,30.5]`、budget 35.1、counter 件数1〜2=15                                        | Boundary - 小数幅を丸めない                                                | 戻り値が `0`（`+2`）                                                               | §3.6 4行目。整数丸めなら誤って `1` を返す反例。AC-16 |
| TC-005  | 10px が11個、budget 35、counter 件数1〜9=20・件数10〜11=30                                          | Boundary - 隠れ件数の桁上がり（9→10）                                      | 戻り値が `0`（`+11`）                                                              | §3.6 5行目。AC-16                                    |
| TC-006  | 10px が11個、budget 40、counter 件数1〜9=20・件数10〜11=30                                          | Boundary - 桁数の異なるcounter幅の選択                                     | 戻り値が `2`（先頭2個と `+9`）                                                     | §3.6 6行目。AC-16                                    |
| TC-007  | badgeWidths `[100]`、budget 10、counter 件数1=20                                                    | Validation - counterすら収まらない                                         | 戻り値が `null`（`toBeNull()`）                                                    | §3.6 7行目                                           |
| TC-008  | badgeWidths `[96.4,232.8,284.1,232.8,284.1,232.8]`、budget 420（W=700の60%）、counter 件数1〜6=30.7 | Normal - 長いworktree5個と結合バッジ                                       | 戻り値が `2`（先頭2個と `+4`）                                                     | §3.6 AC-01 の入力。AC-01                             |
| TC-009  | badgeWidths `[]`、budget 50、counterWidths 空Map                                                    | Boundary - empty                                                           | 戻り値が `0`                                                                       | 呼出し元はバッジなしで処理を省略する（§3.4）         |
| TC-010  | badgeWidths `[20,30]`、budget 50、counterWidths 空Map                                               | Boundary - 全件収容時はcounter値不要                                       | 戻り値が `2`（counter幅の欠落でnullにならない）                                    | §3.4「全件収容ならnを返し、カウンター値は不要」      |
| TC-011  | badgeWidths `[20,0]`、budget 50、counter 件数1〜2=15                                                | Validation - 幅0のバッジ                                                   | 戻り値が `null`                                                                    | §3.6 8行目（幅0）                                    |
| TC-012  | badgeWidths `[20,-5]`、budget 50、counter 件数1〜2=15                                               | Validation - 負の幅                                                        | 戻り値が `null`                                                                    | §3.6 8行目（負の幅）                                 |
| TC-013  | badgeWidths `[20,NaN]` / `[20,Infinity]`、budget 50、counter 件数1〜2=15                            | Validation - 非有限の幅                                                    | 各入力で戻り値が `null`                                                            | §3.6 8行目（非有限値）                               |
| TC-014  | badgeWidths `[20,30]`、budget `0` / `-1` / `NaN` / `Infinity`、counter 件数1〜2=15                  | Validation - 無効なbudget                                                  | 各入力で戻り値が `null`                                                            | §3.4「非空でbudgetが非有限または0以下ならnull」      |
| TC-015  | badgeWidths `[20,30]`、budget 40、counterWidths に件数1が無く件数2=15                               | Validation - 必要counter幅の欠落                                           | 戻り値が `null`                                                                    | §3.6 8行目（非収容時の必要counter幅欠落）            |
| TC-016  | badgeWidths `[20,30]`、budget 40、counterWidths が件数1=15だけ（件数2が欠落）                       | Validation - 件数1〜nの全件検証                                            | 戻り値が `null`（k=1で収まる場合も件数nの欠落を無効とする）                        | §3.4「件数1〜nのカウンター幅を検証する」             |
| TC-017  | badgeWidths `[20,30]`、budget 40、件数2のcounter幅が `0` / `-1` / `NaN` / `Infinity`（件数1=15）    | Validation - 無効なcounter幅                                               | 各入力で戻り値が `null`                                                            | §3.4                                                 |
| TC-018  | 先頭50pxと1pxが99個の計100個、budget 45、counter 件数1〜9=20・件数10〜99=30・件数100=40             | Boundary - 隠れ件数の桁上がり（99→100）                                    | 戻り値が `0`（`+100`）                                                             | §3.4の規則から手計算した補助fixture。AC-16           |
| TC-019  | TC-018と同じバッジとcounter、budget 35                                                              | Boundary - 3桁counterが収まらない                                          | 戻り値が `null`（件数99の幅30で代用しない）                                        | §3.4の規則から手計算した補助fixture。AC-16           |
| TC-020  | `Object.freeze` した badgeWidths と、呼出し前にentriesを複製したMapでTC-006を実行                   | Normal - 引数不変                                                          | 例外なく `2` を返し、呼出し後の配列とMapのentriesが呼出し前と `toEqual` で一致する | Task 2 実装内容2                                     |

### 失敗源インベントリ（include-or-justify）— Feature 059-02 追加分（S1）

| 失敗源                                                 | 対応ケースまたは除外理由                            |
| ------------------------------------------------------ | --------------------------------------------------- |
| 全件収容の判定誤り（ちょうど一致を非収容扱い）         | TC-001、TC-010                                      |
| counter幅を加えない、または件数と異なるcounter幅を使う | TC-002、TC-005、TC-006、TC-018、TC-019              |
| 途中の短いバッジを飛び越して採用する                   | TC-003                                              |
| 小数の丸め                                             | TC-004                                              |
| 0件表示と計測不能の混同                                | TC-003、TC-007、TC-009                              |
| 入力検証の欠落（幅・budget・counter幅）                | TC-011〜TC-017                                      |
| 引数の破壊                                             | TC-020                                              |
| 外部依存の失敗                                         | excluded(DOM・翻訳・メニューに依存しない純粋関数)   |
| 例外送出                                               | excluded(無効入力はnullで表し、throw経路を持たない) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-007、TC-011〜TC-017
- Exception: excluded(throw経路なし)
- External: excluded(外部依存なし)
- Boundary: TC-001、TC-003〜TC-006、TC-009、TC-010、TC-018、TC-019
- Type: excluded(引数型はTypeScriptで保証され、非有限値はValidationで扱う)

**失敗系/正常系比（煙感知器）**: 正常系3件（TC-002、TC-008、TC-020）、失敗系17件。

## S2: calculateMinimumDescriptionWidth() 説明セルの最小内幅

> Origin: Feature 059-02 (light-spec-plan)
> Added: 2026-09-24
> Status: active
> Supersedes: -
> Signature: `export function calculateMinimumDescriptionWidth(rows: readonly RefMinimumWidthInput[]): number | null`（`RefMinimumWidthInput` は readonly の `paddingWidth` / `headWidth` / `emWidth` / `maxCounterWidth: number`）
> Target Path: `web/refOverflow.ts`（`calculateMinimumDescriptionWidth` / `REF_BADGE_WIDTH_RATIO` / `DESCRIPTION_MIN_WIDTH`。実装後に行範囲へ更新）
> Test File: `tests/web/refOverflow.test.ts`

各行で `paddingWidth + headWidth + max(maxCounterWidth / 0.6, emWidth / 0.4)` を求め、全行と64の最大をceilする（対応プラン §3.4）。82pxは §3.6 のfixtureから転記した。補助fixtureの期待値は同じ式から手計算し、production関数で作らない。

| Case ID | Input / Precondition                                                                                                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                   | Notes                                                                                     |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| TC-021  | `[{ paddingWidth: 8, headWidth: 15, emWidth: 13, maxCounterWidth: 35 }]`                                                                                          | Normal - 最小幅fixture                                                     | 戻り値が `82`                                                     | §3.6（`ceil(8 + 15 + max(35 / 0.6, 13 / 0.4))`）。途中で丸めると81になる反例を含む。AC-11 |
| TC-022  | TC-021の行と `{ 4, 0, 10, 20 }` の行を、両方の並び順で渡す                                                                                                        | Normal - 複数行の最大                                                      | どちらの順でも戻り値が `82`                                       | 2行目単独は38。先頭行・末尾行の採用ではなく最大値を検出                                   |
| TC-023  | `[]`                                                                                                                                                              | Boundary - empty                                                           | 戻り値が `64`                                                     | §3.4「空配列は64」                                                                        |
| TC-024  | `[{ 8, 0, 13, 20 }]`（式の値は64未満）                                                                                                                            | Boundary - 既存下限64                                                      | 戻り値が `64`（数値。nullではない）                               | 自然幅が有効でM=64になる場合（§3.6）                                                      |
| TC-025  | `[{ 8, 15, 21, 20 }]`                                                                                                                                             | Normal - 説明文40%側が支配                                                 | 戻り値が `76`                                                     | `21 / 0.4` がcounter側より大きい分岐。手計算                                              |
| TC-026  | `[{ 0, 0, 13, 50 }]`                                                                                                                                              | Boundary - padding/HEADの0を許容                                           | 戻り値が `84`                                                     | paddingWidth/headWidthは0以上が有効                                                       |
| TC-027  | paddingWidth `-1`、headWidth `NaN`、headWidth `-1`、emWidth `0`、emWidth `-1`、maxCounterWidth `0`、maxCounterWidth `Infinity` のいずれか1項目だけを無効にした1行 | Validation - 無効な入力項目                                                | 各入力で戻り値が `null`                                           | §3.4 の入力条件                                                                           |
| TC-028  | TC-021の有効行と、emWidth `0` の無効行を含む2行                                                                                                                   | Validation - 無効行の混在                                                  | 戻り値が `null`（有効行だけの最大82を返さない）                   | -                                                                                         |
| TC-029  | `Object.freeze` した行配列でTC-022を実行                                                                                                                          | Normal - 引数不変                                                          | 例外なく `82` を返し、入力の各行が呼出し前と `toEqual` で一致する | Task 2 実装内容2                                                                          |

### 失敗源インベントリ（include-or-justify）— Feature 059-02 追加分（S2）

| 失敗源                               | 対応ケースまたは除外理由                          |
| ------------------------------------ | ------------------------------------------------- |
| 60% / 40% のどちらかの項を欠く       | TC-021、TC-025                                    |
| 途中丸め・ceil忘れ                   | TC-021、TC-025、TC-026                            |
| 全行最大ではなく先頭行などを採用する | TC-022                                            |
| 既存下限64の欠落、64と無効入力の混同 | TC-023、TC-024、TC-027                            |
| 無効入力の見逃し                     | TC-027、TC-028                                    |
| 引数の破壊                           | TC-029                                            |
| 外部依存・例外                       | excluded(純粋関数で外部依存とthrow経路を持たない) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-027、TC-028
- Exception: excluded(throw経路なし)
- External: excluded(外部依存なし)
- Boundary: TC-023、TC-024、TC-026
- Type: excluded(非有限値はValidationで扱う)

**失敗系/正常系比（煙感知器）**: 正常系4件（TC-021、TC-022、TC-025、TC-029）、失敗系5件。

## S3: RefOverflowController 自然幅の計測と行内の折り畳み表示

> Origin: Feature 059-02 (light-spec-plan)
> Added: 2026-09-24
> Status: active
> Supersedes: -
> Signature: `new RefOverflowController(options: RefOverflowOptions)` / `attachTable(table: HTMLTableElement): void` / `detachTable(): void` / `scheduleLayout(): void` / `dispose(): void`（`RefOverflowOptions` は readonly の `onMinimumWidth: (minimum: number | null) => void` と `onRefContextMenu: (event: MouseEvent, badge: HTMLElement) => void`）
> Target Path: `web/refOverflow.ts`（`RefOverflowController` の計測・表示・監視処理。実装後に行範囲へ更新）
> Test File: `tests/web/refOverflow.test.ts`

jsdomはレイアウトしないため、`getBoundingClientRect`・`getComputedStyle`・`ResizeObserver`・`requestAnimationFrame`・`document.fonts` をfixtureに合わせて制御する。controllerと幅判定はモックしない。特記のないW（利用可能幅）は、説明セルのborder-box幅から左右border・左右padding・HEAD丸印の外幅を引いた値としてfixtureで与える。外幅はborder-box幅＋右margin。

| Case ID | Input / Precondition                                                                                                                                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                                        | Notes                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| TC-030  | 説明セル直下に結合バッジ `main` / `origin` 1個と長いworktree5個、W=700（border-box 723、border 0、padding 4/4、HEAD外幅15）、外幅 `[96.4,232.8,284.1,232.8,284.1,232.8]`、counter外幅30.7   | Normal - 先頭2個と+4                                                       | 先頭2個に `.refOverflowHidden` が無く、残り4個に付く。`button.refOverflowCounter` の文字列が `+4` で、2個目の可視refの直後かつ `.commitMessage` の直前に1個ある。可視2個とcounterの外幅合計がB=420以下で、説明文へW−B=280pxが残る                                      | AC-01                                                                                              |
| TC-031  | 2個のrefの `getBoundingClientRect().width` が `[15.25,25.5]`、右margin 5、`offsetWidth` は `[15,25]`。W=58.5（B=35.1）、counter外幅15                                                       | Boundary - 小数の外幅とoffsetWidthの不使用                                 | 可視0個、counter `+2`、2個とも `.refOverflowHidden`                                                                                                                                                                                                                    | §3.6 4行目をDOM経由で再現。AC-16                                                                   |
| TC-032  | 説明セルborder-box 107、左右border 1、左右padding 4、HEAD丸印の幅10と右margin 5、バッジ外幅 `[20,30]`、counter外幅15                                                                        | Boundary - border/padding/HEADの差引き                                     | 可視1個、counter `+1`                                                                                                                                                                                                                                                  | W=82・B=49.2の手計算。border・padding・HEADのいずれかを引き忘れるとB≥50で全件表示になる反例。AC-16 |
| TC-033  | 結合バッジ（`.gitRef` 内に `.gitRefHeadRemote`）を含む行を折り畳む                                                                                                                          | Normal - 結合バッジを1個として計測                                         | 隠れ件数に結合バッジが1件として数えられ、`.refOverflowHidden` は `.gitRef` 側だけに付き `.gitRefHeadRemote` には付かない。`.gitRefHeadRemote` の寸法は外幅合計に加算されない                                                                                           | §3.6 対象と表示の維持                                                                              |
| TC-034  | TC-030の行でWを2300→400→700の順に変えて各回レイアウトを実行                                                                                                                                 | Normal - 幅変更と件数の対応                                                | W=2300ではcounterなし・隠れ0件、W=400では可視1個と `+5`、W=700では可視2個と `+4`                                                                                                                                                                                       | 2300/400は§3.4の規則から手計算。AC-05                                                              |
| TC-035  | バッジを持たない行（HEAD丸印と説明文だけ）                                                                                                                                                  | Boundary - バッジなし                                                      | 説明セルの `innerHTML` がattach前と一致し、counterも `.refOverflowHidden` も無い                                                                                                                                                                                       | AC-13                                                                                              |
| TC-036  | バッジ外幅 `[20,30]`、W=100（B=60）、counter外幅15                                                                                                                                          | Normal - 全件収容                                                          | counterが無く、`.refOverflowHidden` を持つrefが0件                                                                                                                                                                                                                     | AC-13                                                                                              |
| TC-037  | 外幅10のrefが11個。counter候補の幅を文字列で返すモック（`+1`〜`+9`=20、`+10`/`+11`=30）。W=66.67 と W=58.34                                                                                 | Boundary - 候補counterの実測と桁上がり                                     | W=66.67で可視2個と `+9`、W=58.34で可視0個と `+11`。計測されたcounter候補は `button.refOverflowCounter` で文字列 `+1`〜`+11` を持つ                                                                                                                                     | §3.6 5〜6行目をDOM経由で再現。AC-16                                                                |
| TC-038  | stash、チェックアウト中branch、他のlocal branch、remote、tag、ブランチなしworktreeの6個（描画順）、外幅すべて50、counter外幅20、W=250                                                       | Normal - スタッシュを含む順序                                              | 可視はstashとチェックアウト中branchの2個、隠れ4個のDOM順が描画順のまま、counterが `+4`                                                                                                                                                                                 | AC-14                                                                                              |
| TC-039  | 先頭の外幅500・後続 `[20,20]`、counter外幅30、W=700                                                                                                                                         | Boundary - 先頭が上限超過                                                  | 可視0個、3個すべて `.refOverflowHidden`、counter `+3`。refへ幅指定や省略表示用のinline styleを付けない                                                                                                                                                                 | AC-16                                                                                              |
| TC-040  | TC-030の状態でcounterの属性を調べる（en実辞書を `webviewMessages` に設定）                                                                                                                  | Normal - counterの属性と翻訳                                               | `tagName` が `BUTTON`、`type="button"`、`data-ref-overflow-ignore` を持ち、`.gitRef` / `.findMatch` を持たない。`title` と `aria-label` が `t("refs.showHidden", 4)` の戻り値（`Show 4 hidden badges`）と一致                                                          | AC-18                                                                                              |
| TC-041  | 行に click / dblclick リスナーを登録し、counterで click と dblclick を発火                                                                                                                  | Validation - counterからの伝播抑止                                         | 行のclick / dblclickリスナーの呼出しが0回                                                                                                                                                                                                                              | Task 3 実装内容3                                                                                   |
| TC-042  | TC-030の折り畳み後に説明セル内の `.gitRef` を列挙する                                                                                                                                       | Normal - 元refの保持                                                       | `.gitRef` の個数と `data-name` の並びが折り畳み前と一致し、ref名の文字列が変更されていない                                                                                                                                                                             | 元refはDOMから除去しない                                                                           |
| TC-043  | `.findMatch` を含み `.contextMenuActive` を持つ元refがある状態でレイアウトを実行し、計測中の `.refOverflowMeasure` を調べる                                                                 | Normal - 計測用複製の属性                                                  | 計測領域が `aria-hidden="true"` と `data-ref-overflow-ignore` を持ち、`.commit`・`data-id`・`id` を持たない。複製は `.refOverflowHidden` / `.contextMenuActive` を持たず、`.findMatch` 要素を保持する。自然幅は複製の寸法から読まれ、隠れた元refの寸法を判定に使わない | §3.5                                                                                               |
| TC-044  | 同じ寸法のままレイアウトを2回実行し、2回目を `MutationObserver` で記録                                                                                                                      | Boundary - 同一寸法で振動しない                                            | 2回とも可視件数と `onMinimumWidth` の通知値が同じで、2回目はref・counterの属性変更レコードが0件                                                                                                                                                                        | AC-17                                                                                              |
| TC-045  | td padding 4/4、HEAD外幅15、`.commitMessage` の計算済みfont-size 13px、counter候補の最大外幅35                                                                                              | Normal - 最小幅の通知                                                      | `onMinimumWidth` が数値 `82` で呼ばれる                                                                                                                                                                                                                                | §3.6 最小列幅fixture。AC-11                                                                        |
| TC-046  | TC-045と同じ寸法で、全バッジがBに収まりcounterを表示しない行                                                                                                                                | Normal - 表示状態に依存しない最小幅                                        | counterは表示されないが `onMinimumWidth` は `82` で呼ばれる                                                                                                                                                                                                            | §3.4「全件収容でも自然幅のカウンター候補から算出」                                                 |
| TC-047  | td padding 4/4、HEAD丸印なし、font-size 13px、counter候補の最大外幅20                                                                                                                       | Boundary - 有効な最小幅64                                                  | `onMinimumWidth` が数値 `64` で呼ばれ、`null` では呼ばれない                                                                                                                                                                                                           | 対象行なしとの区別。§3.5                                                                           |
| TC-048  | バッジを持つ行が0行の表をattachしてレイアウト                                                                                                                                               | Boundary - 対象行なし                                                      | `onMinimumWidth` が `null` で1回呼ばれる                                                                                                                                                                                                                               | §3.5                                                                                               |
| TC-049  | 折り畳み済みの表で `detachTable()` を呼ぶ                                                                                                                                                   | Normal - detachの後始末                                                    | `onMinimumWidth(null)` が呼ばれ、ヘッダーのResizeObserverが `disconnect` され、`.refOverflowMeasure` がdocumentから消え、予約済みrAFが取り消される（以降のフレームで計測0回）                                                                                          | §3.5                                                                                               |
| TC-050  | 新規行で説明セル幅が0                                                                                                                                                                       | Validation - 計測不能の新規行                                              | `.refOverflowHidden` とcounterが0件（全件表示）、`onMinimumWidth` の呼出し0回、そのフレーム後に `requestAnimationFrame` の追加予約0回                                                                                                                                  | §3.4「新規行なら元の全件表示を保つ」                                                               |
| TC-051  | TC-030の `+4` 表示後、セル幅0へ変わりResizeObserverが通知                                                                                                                                   | Validation - 計測不能時の現状維持                                          | 隠れ4個・counter `+4` がそのまま残り、`onMinimumWidth` の追加呼出し0回、rAFの自己再予約0回                                                                                                                                                                             | §3.4                                                                                               |
| TC-052  | TC-051の後、W=700へ戻りResizeObserverが通知                                                                                                                                                 | Normal - 幅0から正幅への復帰                                               | 次のフレームで先頭2個と `+4` の表示になる                                                                                                                                                                                                                              | AC-17                                                                                              |
| TC-053  | 同一フレーム内で `scheduleLayout()` 3回、window resize、ResizeObserver通知（幅変化あり）を発生                                                                                              | Boundary - 同一フレームの通知集約                                          | `requestAnimationFrame` の呼出しが1回で、計測処理が1回だけ実行される                                                                                                                                                                                                   | AC-17                                                                                              |
| TC-054  | 直前のレイアウトと同じヘッダー幅でResizeObserverが通知                                                                                                                                      | Validation - 自己通知で再レイアウトしない                                  | `requestAnimationFrame` の呼出し0回                                                                                                                                                                                                                                    | §3.5                                                                                               |
| TC-055  | window resize、`document.documentElement` のstyle変更、同class変更、`document.body` のclass変更、`document.fonts.ready` の解決、`document.fonts` の `loadingdone` を別フレームで1つずつ発生 | Normal - 再計測の契機                                                      | 各契機につき `requestAnimationFrame` が1回予約される                                                                                                                                                                                                                   | フォント・テーマ・ズーム変更。AC-17                                                                |
| TC-056  | 表Aでrafを予約した後、表Bを `attachTable`                                                                                                                                                   | Normal - 表の切替                                                          | 表Aのヘッダー監視が `disconnect` され、表Aの説明セルにcounterも `.refOverflowHidden` も付かない。旧計測領域が除去され、表Bだけが折り畳まれる                                                                                                                           | 世代管理。AC-17                                                                                    |
| TC-057  | rAF予約後、コールバック実行前に表をdocumentから取り除く                                                                                                                                     | Boundary - isConnectedの確認                                               | 例外なくコールバックが終わり、取り除いた表のDOM変更0件、`onMinimumWidth` の呼出し0回                                                                                                                                                                                   | §3.5                                                                                               |
| TC-058  | `dispose()` の後に window resize、`documentElement` のstyle変更、`document.fonts` の `loadingdone` を発生                                                                                   | Normal - 長寿命リスナーの解除                                              | `requestAnimationFrame` の呼出し0回で、ResizeObserverの `disconnect` が呼ばれている                                                                                                                                                                                    | §3.5                                                                                               |
| TC-059  | 表を3回続けて `attachTable` した後、window resizeを1回発生                                                                                                                                  | Boundary - 再attachでリスナーを重複させない                                | `requestAnimationFrame` の呼出しが1回                                                                                                                                                                                                                                  | AC-17                                                                                              |
| TC-060  | 実ブラウザで300 / 1,000 / 3,000行を同じデータ・ref数・フォント・viewportで変更前後に描画                                                                                                    | Normal - 手動: 性能記録                                                    | 各行数でrender開始からrAFの後処理とレイアウトが落ち着くまでの時間、CPU条件、試行値、ref総数が前後とも記録され、描画後に自己通知による継続的なレイアウトが発生しない                                                                                                    | 手動確認。理由: jsdomはレイアウト・描画時間を再現しない。時間の合格閾値は設けない（§3.6）          |

### 失敗源インベントリ（include-or-justify）— Feature 059-02 追加分（S3）

| 失敗源                                                 | 対応ケースまたは除外理由                                                |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| 整数幅・border/padding/HEADの差引き誤り                | TC-031、TC-032                                                          |
| 結合バッジの二重計測                                   | TC-033                                                                  |
| 幅変更に追従しない                                     | TC-034、TC-052                                                          |
| バッジなし・全件収容行の表示変更                       | TC-035、TC-036                                                          |
| 候補counterの実測漏れ・桁上がり                        | TC-037                                                                  |
| 順序の破壊・スタッシュの除外                           | TC-038、TC-042                                                          |
| 先頭超過時の省略表示・部分表示                         | TC-039                                                                  |
| counterの属性・翻訳・伝播                              | TC-040、TC-041                                                          |
| 計測用複製の汚染（検索マーク欠落、操作中クラスの残存） | TC-043                                                                  |
| 表示状態に依存した自然幅による振動                     | TC-044、TC-046                                                          |
| 最小幅通知の値・null・64の混同                         | TC-045〜TC-049                                                          |
| 計測不能時の表示破壊・無限再予約                       | TC-050、TC-051                                                          |
| 通知の多重実行・自己通知ループ                         | TC-053、TC-054                                                          |
| 再計測契機の欠落                                       | TC-055                                                                  |
| 旧表への適用・リスナー重複・解除漏れ                   | TC-049、TC-056〜TC-059                                                  |
| 性能退行                                               | TC-060（手動記録）                                                      |
| 外部依存の失敗                                         | excluded(ブラウザ標準APIだけを使い、欠落は計測不能（TC-050）として扱う) |
| 例外送出                                               | excluded(計測不能はnullで表し、throw経路を持たない。切断済み表はTC-057) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-041、TC-050、TC-051、TC-054
- Exception: excluded(throw経路なし)
- External: excluded(外部依存なし)
- Boundary: TC-031、TC-032、TC-035、TC-037、TC-039、TC-044、TC-047、TC-048、TC-053、TC-057、TC-059
- Type: excluded(DOM型はTypeScriptで保証される)

**失敗系/正常系比（煙感知器）**: 正常系16件、失敗系15件。

## S4: RefOverflowController 隠れたバッジ一覧の開閉と操作

> Origin: Feature 059-02 (light-spec-plan)
> Added: 2026-09-24
> Status: active
> Supersedes: -
> Signature: `RefOverflowController.closePopup(): boolean`、counterのclick、`.refOverflowPopup` の生成・配置、documentのcapture click
> Target Path: `web/refOverflow.ts`（一覧の開閉・複製・配置・外側判定。実装後に行範囲へ更新）
> Test File: `tests/web/refOverflow.test.ts`

一覧はbody直下の `.refOverflowPopup` に、隠れた元refの現在DOMを複製して1バッジ1行で表示する。右クリックの受渡し先 `onRefContextMenu` はspyで記録し、メニューの内容とpayloadは `web/main-test/02-context-menu-01.md` の責務。位置のケースは `window.innerWidth` / `innerHeight`、counterと一覧の `getBoundingClientRect` をfixtureで与える。

| Case ID | Input / Precondition                                                                                                                                                                                                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                         | Notes                                                      |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| TC-061  | S3 TC-030の `+4` をclick                                                                                                                                                                                                                       | Normal - 一覧の表示                                                        | body直下に `.refOverflowPopup` が1個あり、`data-ref-overflow-ignore` を持つ。隠れた4個の複製が1行に1個ずつ、`data-name` の並びが元の隠れ順と一致する。一覧は `.commit` と `data-id` を持たない                                          | AC-02                                                      |
| TC-062  | stash、チェックアウト中branch、worktree付きbranch、remote、tag、ブランチなしworktree、結合バッジを隠れさせ一覧を開く                                                                                                                           | Normal - ref全種類の複製                                                   | 各複製のclass一覧が元refから `refOverflowHidden` / `contextMenuActive` を除いたものと一致し、`data-name` / `data-remotes` / `data-worktree-path` / `title`、アイコン要素、表示文字列、`.gitRefHeadRemote` の `data-name` が元と一致する | AC-03、AC-14                                               |
| TC-063  | `data-name` と表示名が `feat/<b>&"'x` の隠れたref                                                                                                                                                                                              | Boundary - 特殊文字                                                        | 複製の `dataset.name` が生の `feat/<b>&"'x` と `toBe` で一致し、表示文字列も一致する。一覧内の `b` 要素と `script` 要素が0個                                                                                                            | 名前をHTMLへ再補間しない                                   |
| TC-064  | 隠れた元refが `.contextMenuActive` を持ち、子孫に `id` 属性を持つ要素を含む                                                                                                                                                                    | Validation - 操作中クラスとidを複製しない                                  | 複製に `.contextMenuActive` が無く、一覧内に `id` 属性を持つ要素が0個                                                                                                                                                                   | §3.5                                                       |
| TC-065  | 隠れた元refの名前の一部が `span.findMatch` で囲まれている                                                                                                                                                                                      | Normal - 検索マークの保持                                                  | 複製内に同じ文字列の `span.findMatch` がある                                                                                                                                                                                            | AC-08                                                      |
| TC-066  | `data-color="3"` の行の隠れたrefで一覧を開く                                                                                                                                                                                                   | Normal - 行の色変数の保持                                                  | 複製から見た `--git-keizu-color` の解決元が元行と同じ色番号になる（一覧側が `data-color="3"` を持つ、またはinline `--git-keizu-color: var(--git-keizu-color3)` を持つ）                                                                 | 一覧はbody直下で元行の祖先を持たないため                   |
| TC-067  | 一覧を開いた同じcounterを再click                                                                                                                                                                                                               | Normal - 同じcounterで閉鎖                                                 | `.refOverflowPopup` が0個になり、続く `closePopup()` が `false` を返す                                                                                                                                                                  | AC-04                                                      |
| TC-068  | 行1の一覧を開いた状態で行2のcounterをclick                                                                                                                                                                                                     | Normal - 別counterで切替                                                   | `.refOverflowPopup` が1個だけで、その内容が行2の隠れた元refの複製である                                                                                                                                                                 | AC-04                                                      |
| TC-069  | 行にclickリスナーを登録してcounterをclick                                                                                                                                                                                                      | Validation - counter clickの伝播抑止                                       | 一覧は開き、行のclickリスナー呼出しが0回                                                                                                                                                                                                | 行選択・詳細表示を起こさない。AC-02                        |
| TC-070  | 一覧内の複製でclickとdblclickを発火（document・行にbubbleリスナーを登録）                                                                                                                                                                      | Validation - 一覧内のclick/dblclick無操作                                  | bubbleリスナーの呼出し0回、`onRefContextMenu` 0回、`postMessage` 0回で、一覧は開いたまま                                                                                                                                                | checkout・行選択なし。AC-15                                |
| TC-071  | 一覧内の複製のアイコン要素、`span.findMatch`、`.gitRefHeadRemote` をtargetにcontextmenuを発火                                                                                                                                                  | Normal - 右クリックの受渡し                                                | 各発火で `onRefContextMenu` が1回、第1引数がそのイベント、第2引数が複製の `.gitRef` 要素（targetの子要素ではない）                                                                                                                      | AC-03、AC-09                                               |
| TC-072  | 一覧を閉じて開き直すことを3回繰り返した後、複製で1回contextmenu                                                                                                                                                                                | Boundary - リスナーの重複なし                                              | `onRefContextMenu` の呼出しが1回                                                                                                                                                                                                        | -                                                          |
| TC-073  | 一覧表示中に `document.body` の空き領域をclick                                                                                                                                                                                                 | Normal - 外側クリックで閉鎖                                                | `.refOverflowPopup` が0個になる                                                                                                                                                                                                         | AC-04                                                      |
| TC-074  | 一覧表示中に一覧内、`#contextMenu` 内、`ul.contextMenuSubmenu` 内をそれぞれclick                                                                                                                                                               | Validation - 外側扱いしない領域                                            | いずれも `.refOverflowPopup` が1個のまま                                                                                                                                                                                                | AC-03                                                      |
| TC-075  | `#contextMenu` 内の項目のbubble clickハンドラが `#contextMenu` をDOMから除去する                                                                                                                                                               | Boundary - capture時点で所属を判定                                         | clickの後も `.refOverflowPopup` が1個のまま                                                                                                                                                                                             | Task 4 実装内容4。AC-03                                    |
| TC-076  | 一覧表示中と非表示中にそれぞれ `closePopup()`                                                                                                                                                                                                  | Normal - closePopupの戻り値                                                | 表示中は `true` を返し一覧が0個になる。非表示中は `false` を返す                                                                                                                                                                        | Task 4 Produces                                            |
| TC-077  | 一覧内の複製に `.contextMenuActive` がある状態で一覧を閉じる。別途、表の行内refに `.contextMenuActive` がある状態で一覧を閉じる                                                                                                                | Normal - 一覧起点メニューだけを閉じる                                      | 前者は `hideContextMenu` が1回、後者は0回                                                                                                                                                                                               | AC-06                                                      |
| TC-078  | viewport 800×600、counterのrect `{ left: 100, top: 200, bottom: 220 }`、一覧 200×150                                                                                                                                                           | Normal - counter直下・左揃え                                               | 一覧の `style.left` が `100px`、`style.top` が `220px`                                                                                                                                                                                  | AC-15                                                      |
| TC-079  | viewport 800×600、counterのrect `{ left: 100, top: 480, bottom: 500 }`、一覧 200×150                                                                                                                                                           | Boundary - 下端超過で上へ反転                                              | `style.top` が `330px`（counter上端から一覧の高さ分上）                                                                                                                                                                                 | AC-15                                                      |
| TC-080  | viewport 800×600、counterのleft 700、一覧幅200                                                                                                                                                                                                 | Boundary - 右端の補正                                                      | `style.left` が `600px`                                                                                                                                                                                                                 | AC-15                                                      |
| TC-081  | viewport 800×600、counterのleft −20                                                                                                                                                                                                            | Boundary - 左端の補正                                                      | `style.left` が `0px`                                                                                                                                                                                                                   | 表の横スクロール時。AC-15                                  |
| TC-082  | viewport 800×300、counterのrect `{ top: 100, bottom: 120 }`、一覧の高さ250                                                                                                                                                                     | Boundary - 上下とも収まらない                                              | `style.top` が `0px` で、top＋高さが300以下                                                                                                                                                                                             | AC-15                                                      |
| TC-083  | 隠れたrefが200個あり、うち1個の名前が300文字                                                                                                                                                                                                   | Boundary - 大量・長い名前                                                  | 一覧に200個の複製があり、300文字の名前が省略されずに `textContent` へ残る                                                                                                                                                               | 実表示のscroll到達はCSS観点の手動ケース。AC-15             |
| TC-084  | 一覧表示中に説明列の幅が変わりResizeObserverが通知（別途、同じ幅で通知）                                                                                                                                                                       | Normal - 再レイアウトで閉鎖・同寸法では維持                                | 幅変化では再レイアウト前に一覧が0個になる。同じ幅の通知では一覧が1個のまま                                                                                                                                                              | AC-06、AC-07                                               |
| TC-085  | 一覧表示中（複製にメニュー起点あり）に `detachTable()`、または別表を `attachTable`                                                                                                                                                             | Normal - 表の切替で閉鎖                                                    | 一覧が0個になり、`hideContextMenu` が1回呼ばれ、旧複製が `isConnected === false`                                                                                                                                                        | AC-06                                                      |
| TC-086  | 一覧表示中に `dispose()` の後、`document.body` をclick                                                                                                                                                                                         | Normal - dispose後の後始末                                                 | 一覧が0個で、clickで例外が起きず、`onRefContextMenu` などの呼出し0回                                                                                                                                                                    | §3.5                                                       |
| TC-098  | viewport 800×600でcounterのrect `{ left: 100, top: 200, bottom: 220 }`、一覧 200×150を開いた後、幅と説明列の幅を変えずに高さを350へ縮めてresize。続けて折り畳みを変えずにcounterのrectを `{ left: 300, top: 250, bottom: 270 }` へ移してresize | Boundary - 維持した一覧の再配置                                            | 両方のレイアウト後も同じ一覧が1個のまま。高さのみのresize後は `style.top` が `50px`、counter移動後は `style.left` が `300px`・`style.top` が `100px`                                                                                    | 高さのみのresizeやcounter移動では一覧を閉じないため。AC-15 |

### 失敗源インベントリ（include-or-justify）— Feature 059-02 追加分（S4）

| 失敗源                                       | 対応ケースまたは除外理由                                             |
| -------------------------------------------- | -------------------------------------------------------------------- |
| 隠れた件数・順序・見た目の不一致             | TC-061、TC-062、TC-065、TC-066                                       |
| 名前の再補間によるXSS・二重復号              | TC-063                                                               |
| 操作中クラスやidの複製                       | TC-064                                                               |
| 開閉・切替の誤り、複数一覧の同時表示         | TC-067、TC-068、TC-076                                               |
| 行選択・詳細・checkoutの誤発火               | TC-069、TC-070                                                       |
| 右クリック対象の誤り・リスナー重複           | TC-071、TC-072                                                       |
| 外側判定の誤り（メニュー操作で一覧が消える） | TC-073〜TC-075                                                       |
| 他所から開いたメニューの巻込み               | TC-077                                                               |
| viewport外への表示                           | TC-078〜TC-082、TC-098                                               |
| 大量・長い名前の欠落                         | TC-083                                                               |
| 再レイアウト・表切替・disposeでの残存        | TC-084〜TC-086                                                       |
| 外部依存の失敗                               | excluded(メニュー表示は `onRefContextMenu` の呼出し先（main）の責務) |
| 例外送出                                     | excluded(throw経路なし。dispose後の操作はTC-086)                     |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-064、TC-069、TC-070、TC-074
- Exception: excluded(throw経路なし)
- External: excluded(外部依存なし)
- Boundary: TC-063、TC-072、TC-075、TC-079〜TC-083、TC-098
- Type: excluded(DOM型はTypeScriptで保証される)

**失敗系/正常系比（煙感知器）**: 正常系14件、失敗系13件。

## S5: RefOverflowController.syncSearchHighlights() 検索一致の同期

> Origin: Feature 059-02 (light-spec-plan)
> Added: 2026-09-24
> Status: active
> Supersedes: -
> Signature: `RefOverflowController.syncSearchHighlights(): void`（counterの `.refOverflowMatch`、開いた一覧の再複製）
> Target Path: `web/refOverflow.ts`（`syncSearchHighlights` と折り畳み後・一覧表示時の同期。実装後に行範囲へ更新）
> Test File: `tests/web/refOverflow.test.ts`

検索マーク（`span.findMatch`）はテスト側で元refへ直接挿入・除去して同期結果を調べる。検索対象の判定とマークの付与・解除は `web/findWidget-test.md` S10 の責務。

| Case ID | Input / Precondition                                                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                              | Notes                                        |
| ------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| TC-087  | `+4` の行で、隠れた元ref1個の子孫に `span.findMatch` を挿入して同期                                  | Normal - 隠れた一致でcounterを強調                                         | counterが `.refOverflowMatch` を持ち、文字列は `+4` のまま                                                                                   | Nは全隠れ件数で一致数ではない。AC-08         |
| TC-088  | 可視refだけ、または `.commitMessage` だけに `span.findMatch` がある状態で同期                        | Validation - 隠れていない一致では強調しない                                | counterが `.refOverflowMatch` を持たない                                                                                                     | AC-10                                        |
| TC-089  | 全件収容でcounterの無い行のrefに `span.findMatch` がある状態で同期                                   | Boundary - counterを生成しない                                             | 当該行の `.refOverflowCounter` が0個                                                                                                         | AC-10                                        |
| TC-090  | TC-087の後、`span.findMatch` を除去して同期                                                          | Normal - 解除の同期                                                        | counterから `.refOverflowMatch` が外れる                                                                                                     | クリア・close・無効regex後の状態。AC-09      |
| TC-091  | 一覧を閉じた状態で隠れた一致を同期                                                                   | Validation - 一覧を自動で開かない                                          | `.refOverflowPopup` が0個のまま                                                                                                              | AC-08                                        |
| TC-092  | 一覧を開き、複製でメニューを開いた（複製が `.contextMenuActive`）後、元refの検索マークを変更して同期 | Normal - 開いた一覧の再複製                                                | `hideContextMenu` が一覧の置換前に1回呼ばれる。一覧は開いたままで、複製の `span.findMatch` が同期後の元refと一致し、変更前のマークが残らない | AC-09                                        |
| TC-093  | 一覧を開いた状態で同期を3回実行した後、複製で1回contextmenu                                          | Boundary - 再複製でリスナーを重複させない                                  | `onRefContextMenu` の呼出しが1回                                                                                                             | -                                            |
| TC-094  | 一覧を開いた状態で同期                                                                               | Validation - 同期で再レイアウトしない                                      | `requestAnimationFrame` の呼出し0回で、一覧が開いたまま                                                                                      | 検索更新だけでは再レイアウトを予約しない     |
| TC-095  | 隠れた元refと同じ文字列がcounter付近にある状態で同期                                                 | Validation - counterへfindMatchを付けない                                  | counter要素とその子孫に `.findMatch` が0個                                                                                                   | 検索解除でbuttonがテキストへ置換されないため |
| TC-096  | 隠れた元refに `span.findMatch` がある状態でcounterをclickして一覧を開く                              | Normal - 開いた時点のマーク表示                                            | 一覧に隠れた全4件の複製があり、一致したrefの複製に `span.findMatch` がある                                                                   | AC-08                                        |
| TC-097  | 3個目のrefだけに `span.findMatch` がある `+4` の行で、Wを広げて3個目が可視になるレイアウトを実行     | Normal - 折り畳み書換え後の同期                                            | レイアウト後にcounterが `.refOverflowMatch` を持たない                                                                                       | Task 5 実装内容4                             |

### 失敗源インベントリ（include-or-justify）— Feature 059-02 追加分（S5）

| 失敗源                                  | 対応ケースまたは除外理由                                     |
| --------------------------------------- | ------------------------------------------------------------ |
| 隠れた一致を見落とす・Nを一致数へ変える | TC-087                                                       |
| 説明文や可視refの一致で誤って強調する   | TC-088、TC-089                                               |
| 古い強調・古いマークが残る              | TC-090、TC-092、TC-097                                       |
| 一覧を自動で開く・閉じる                | TC-091、TC-094                                               |
| 起点メニューの残存、リスナー重複        | TC-092、TC-093                                               |
| counterが検索置換の対象になる           | TC-095                                                       |
| 開いた時点のマークを表示しない          | TC-096                                                       |
| 外部依存・例外                          | excluded(DOMの参照・更新だけで外部依存とthrow経路を持たない) |

**失敗カテゴリ網羅（diversity floor）**:

- Validation: TC-088、TC-091、TC-094、TC-095
- Exception: excluded(throw経路なし)
- External: excluded(外部依存なし)
- Boundary: TC-089、TC-093
- Type: excluded(DOM型はTypeScriptで保証される)

**失敗系/正常系比（煙感知器）**: 正常系5件、失敗系6件。

### Feature 059-02 テスト対応と実行証跡（S1〜S5）

**テスト対応**（`tests/web/refOverflow.test.ts`。各 `it` 名の末尾と `// Case:` にCase IDを記載し、`@see` は本ファイル）:

- S1 TC-001〜TC-020: describe `selectVisibleRefCount`。TC-001〜TC-004・TC-005/TC-006・TC-011〜TC-013・TC-014・TC-017・TC-018/TC-019 は `it.each` で入力ごとに識別。期待値は対応プラン §3.6 の固定値と §3.4 の式からの手計算で、production関数から計算していない。0 は `toBe(0)`、null は `toBeNull()` で直接比較
- S2 TC-021〜TC-029: describe `calculateMinimumDescriptionWidth`（TC-022 は両順、TC-027 は7項目を `it.each`）
- S3 TC-030〜TC-059: describe `RefOverflowController measuring and folding`。寸法は `<style>` fixture（td padding 4/4、ref・counter・HEADの右margin 5、`.commitMessage` 13px）と `Element.prototype.getBoundingClientRect` のspyで与え、`requestAnimationFrame` はキュー、`ResizeObserver` は通知を手動発火する代替、`document.fonts` は `ready` を制御できる `EventTarget` で差し替える（afterEachで復元）。controllerと幅判定はモックしない。元ref（計測領域外）は幅9999を返し、判定に使われないことを同時に検証
- S4 TC-061〜TC-086、TC-098: describe `RefOverflowController hidden-badge list`（TC-078〜TC-082 は `it.each` でviewportとrectを指定）
- S5 TC-087〜TC-097: describe `RefOverflowController.syncSearchHighlights`
- 変異確認（一時的に `web/refOverflow.ts` を改変し、確認後に戻した）: 右margin除外→TC-031・TC-032・TC-037・TC-038・TC-044〜TC-046、border未減算→TC-032、上方反転なし→TC-079・TC-082、折り畳み後の同期なし→TC-097、counter文字列の常時書換えとcounter位置の常時挿入→TC-044、幅変化時の一覧未閉鎖→TC-084、維持した一覧の未再配置→TC-098 がそれぞれ失敗することを確認した

**TC-060 手動確認（実ブラウザ性能記録）**: Chromium 1194 headless（`--headless=new --disable-gpu`）、4 vCPU Intel Xeon 2.10GHz、viewport 1000×500、DejaVu Sans 13px。変更前（`b11c2ed` の `web/` を esbuild でバンドル）と変更後を同一HTML・同一データで比較。5行ごとに AC-01 と同形の ref 7個（バッジ6個）を持つコミットを置き、表を `loadCommits`（hard）で再描画して、描画開始から2フレーム後に強制レイアウトが終わるまでをms計測した。合格閾値は設けない。

| 行数 / ref総数（バッジ数） | CPU                  | 変更前 試行値（ms）                | 変更後 試行値（ms）               |
| -------------------------- | -------------------- | ---------------------------------- | --------------------------------- |
| 300 / 420（360）           | 1x                   | 49.2, 47.1, 56.3, 53.2, 60.4       | 70.5, 73.5, 66.3, 72.0, 77.4      |
| 1,000 / 1,400（1,200）     | 1x                   | 189.6, 181.6, 177.4, 215.6, 197.2  | 230.1, 257.4, 242.3, 244.0, 244.6 |
| 3,000 / 4,200（3,600）     | 1x                   | 444.8, 657.6, 636.4, 962.9, 1278.0 | 768.9, 691.8, 825.8, 657.6, 763.9 |
| 300 / 420（360）           | 4x（CDP throttling） | 223.5, 250.1, 254.5                | 397.9, 379.0, 417.2               |
| 1,000 / 1,400（1,200）     | 4x（CDP throttling） | 829.2, 778.8, 771.2                | 1332.9, 1165.6, 1499.7            |
| 3,000 / 4,200（3,600）     | 4x（CDP throttling） | 2865.1, 2524.9, 3136.8             | 3838.6, 4047.3, 4673.0            |

- 同期描画部分（`loadCommits` の戻りまで）は前後同程度（例 1x 1,000行: 変更前 146.9〜186.6ms、変更後 135.1〜147.6ms）で、差は後続フレームの計測・折り畳みに相当する
- 描画完了後2秒間の `requestAnimationFrame` 追加呼出しと ResizeObserver コールバックは全条件で0回（自己通知による継続レイアウトなし）。変更後の折り畳み結果は 300/1,000/3,000 行で counter 60/200/600個、隠れref 300/1,000/3,000個
- 未検証: VS Code 実 webview 上での同計測。理由: 本環境に VS Code 実行環境がなく、headless Chromium の単体HTMLで代替した。実行スクリプトと結果JSONは作業セッションの scratchpad（`t6/browser.mjs`、`t6/browser-result-4.json`）に置き、リポジトリには含めない
