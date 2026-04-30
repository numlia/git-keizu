# テスト観点表: web/contextMenu.ts

> Source: `web/contextMenu.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: showContextMenu() 位置計算ロジック

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 1.3
> Added: 2026-02-25
> Status: active
> Supersedes: -

**シグネチャ**: `showContextMenu(e: MouseEvent, items: ContextMenuElement[], sourceElem: HTMLElement): void`
**テスト対象パス**: `web/contextMenu.ts`

| Case ID | Input / Precondition                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                  | Notes                                    |
| ------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------- |
| TC-001  | clientX=100, clientY=200, メニューサイズが画面内に収まる                      | Normal - standard                                                          | メニューが (clientX-2, clientY-2) に表示される   | pageX/pageYではなくclientX/clientYを使用 |
| TC-002  | clientX=400, clientY=300, メニューサイズが画面内に収まる                      | Normal - standard                                                          | メニューが正しい位置に表示される                 | 画面中央付近                             |
| TC-003  | clientX = innerWidth - 10, メニュー幅 > 10                                    | Boundary - 右端オーバーフロー                                              | メニューが左方向に反転表示される                 | clientX - menuWidth + 2                  |
| TC-004  | clientY = innerHeight - 10, メニュー高さ > 10                                 | Boundary - 下端オーバーフロー                                              | メニューが上方向に反転表示される                 | clientY - menuHeight + 2                 |
| TC-005  | clientX = innerWidth - 10, clientY = innerHeight - 10, メニューサイズ > 10x10 | Boundary - 右下角オーバーフロー                                            | メニューが両方向に反転表示される                 | 両方向同時反転                           |
| TC-006  | clientX=0, clientY=0                                                          | Boundary - min (0, 0)                                                      | メニューが (0, 0) に表示される（左上角クランプ） | Math.max(0, ...)により負値にならない     |
| TC-007  | innerHeight=100, clientY=50, メニュー高さ=200 (フリップ時にtopが負になる条件) | Boundary - 上端オーバーフロー                                              | メニューtopが0にクランプされる                   | フリップ後の負値をビューポート上端で制限 |

## S2: Context menu 整理対応 (032)

> Origin: Feature 032 (context-menu-reorg) Task 7
> Added: 2026-04-30
> Status: active
> Supersedes: -

**シグネチャ**: `showContextMenu(e: MouseEvent, items: ContextMenuElement[], sourceElem: HTMLElement): void`
**テスト対象パス**: `web/contextMenu.ts`

| Case ID | Input / Precondition                                                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                   | Notes                            |
| ------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| TC-008  | `items = [item, null, item]`                                                  | Normal - standard                                                          | `#contextMenu li` が 3 要素生成され、class 順が `contextMenuItem`, `contextMenuDivider`, `contextMenuItem` になる | 既存フラット描画の回帰防止       |
| TC-009  | `items = [item, { title: "More...", submenu: [child] }]`                      | Normal - submenu parent                                                    | 親側に `li.contextMenuParent[data-submenu-index="1"]` が 1 件生成され、`document.body` 直下に submenu `ul` が出る | submenu 生成位置の確認           |
| TC-010  | `More...` 親項目に `mouseenter` を dispatch                                   | Normal - hover open                                                        | 対応 submenu に `active` class が付き、`style.left` と `style.top` が px 指定される                               | hover 展開                       |
| TC-011  | 親項目の `getBoundingClientRect().top = innerHeight - 10`, submenu 高さが 120 | Boundary - vertical clamp                                                  | submenu の `style.top` が `0px` 以上で、`innerHeight - submenuHeight` を下回らない値になる                        | 下端オーバーフロー防止           |
| TC-012  | 親項目から `mouseleave` 済み、150ms 未満                                      | Boundary - hide delay                                                      | submenu は `active` のまま残る                                                                                    | hover 移動猶予                   |
| TC-013  | 親項目から `mouseleave` 後に 200ms 経過                                       | Boundary - delayed hide                                                    | submenu から `active` class が外れるか、submenu 要素が除去される                                                  | 非表示タイミング                 |
| TC-014  | 親項目 `mouseleave` 後、150ms 以内に submenu へ `mouseenter`                  | Exception - cancel scheduled hide                                          | 200ms 経過後も submenu が表示されたままになる                                                                     | timer cancel                     |
| TC-015  | submenu 内の通常項目を click                                                  | Normal - submenu click                                                     | 対応する child `onClick` が 1 回呼ばれ、`#contextMenu` から `active` class が外れ、submenu 要素も除去される       | 親メニューごと閉じる             |
| TC-016  | submenu が生成済みの状態で `hideContextMenu()` を呼ぶ                         | Normal - cleanup                                                           | `document.body .contextMenuSubmenu` が 0 件になり、親 sourceElem の `contextMenuActive` class も除去される        | リーク防止                       |
| TC-017  | `ContextMenuElement[]` に `ContextMenuSubmenu` を含む構成を渡す               | Type - structural guard                                                    | `"submenu" in item` 分岐で submenu 要素が通常項目と区別され、通常項目 click handler が親項目には登録されない      | 型拡張とイベント誤配線の回帰防止 |
