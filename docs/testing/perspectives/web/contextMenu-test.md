# テスト観点表: web/contextMenu.ts

## S1: showContextMenu() 位置計算ロジック

> Origin: Feature 003 (ux-fixes-and-enhancements) Task 1.3
> Added: 2026-02-25

**シグネチャ**: `showContextMenu(e: MouseEvent, items: ContextMenuElement[], sourceElem: HTMLElement): void`
**テスト対象パス**: `web/contextMenu.ts`

| Case ID | Input / Precondition                                                          | Perspective (Equivalence / Boundary) | Expected Result                                  | Notes                                    |
| ------- | ----------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------ | ---------------------------------------- |
| TC-001  | clientX=100, clientY=200, メニューサイズが画面内に収まる                      | Equivalence - normal                 | メニューが (clientX-2, clientY-2) に表示される   | pageX/pageYではなくclientX/clientYを使用 |
| TC-002  | clientX=400, clientY=300, メニューサイズが画面内に収まる                      | Equivalence - normal                 | メニューが正しい位置に表示される                 | 画面中央付近                             |
| TC-003  | clientX = innerWidth - 10, メニュー幅 > 10                                    | Boundary - 右端オーバーフロー        | メニューが左方向に反転表示される                 | clientX - menuWidth + 2                  |
| TC-004  | clientY = innerHeight - 10, メニュー高さ > 10                                 | Boundary - 下端オーバーフロー        | メニューが上方向に反転表示される                 | clientY - menuHeight + 2                 |
| TC-005  | clientX = innerWidth - 10, clientY = innerHeight - 10, メニューサイズ > 10x10 | Boundary - 右下角オーバーフロー      | メニューが両方向に反転表示される                 | 両方向同時反転                           |
| TC-006  | clientX=0, clientY=0                                                          | Boundary - min (0, 0)                | メニューが (0, 0) に表示される（左上角クランプ） | Math.max(0, ...)により負値にならない     |
| TC-007  | innerHeight=100, clientY=50, メニュー高さ=200 (フリップ時にtopが負になる条件) | Boundary - 上端オーバーフロー        | メニューtopが0にクランプされる                   | フリップ後の負値をビューポート上端で制限 |
