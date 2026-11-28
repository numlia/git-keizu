# Full-history search acceptance

The desktop run used VS Code 1.107.1, Git 2.43.0, a 1280 × 800 window on WSLg, and bundles compiled from `1d70cdf`. The 100,000-commit linear fixture had one branch, no tags, and one matching subject at position 90,000. Its tip was `74c071af34d785dfce30dd61ac8237298d11a5d7`. The initial load was 300 and the ordinary increment was 100.

## Desktop results

Five independent profiles followed one discarded warmup. Times are milliseconds. Both searches were literal and case-insensitive with details closed.

| Operation                                             |      1 |      2 |      3 |      4 |      5 | Median |
| ----------------------------------------------------- | -----: | -----: | -----: | -----: | -----: | -----: |
| Open the first 300 commits from the command palette   |  651.9 |  674.7 |  688.4 |  700.3 |  710.6 |  688.4 |
| Search 99,700 unread commits with no match            | 1782.0 | 1691.7 | 1673.7 | 1760.6 | 1777.4 | 1760.6 |
| Search 99,700 unread commits with a single deep match | 1642.1 | 1676.4 | 1627.5 | 1723.0 | 1673.5 | 1673.5 |
| Next click to visible selection                       | 3046.6 | 3179.3 | 3063.9 | 3295.5 | 3213.0 | 3179.3 |
| Approval click to visible selection                   | 2979.9 | 3113.3 | 2996.2 | 3226.7 | 3142.6 | 3113.3 |
| Next click to next trusted keydown                    | 3092.1 | 3225.5 | 3114.3 | 3361.0 | 3279.7 | 3225.5 |
| Keydown to updated result                             |  338.8 |  338.7 |  349.6 |  351.3 |  366.9 |  349.6 |

The graph showed the expected hash at logical position 90,000 in all five trials, retained 90,100 loaded commits, mounted 52 rows, and accepted a typed character that changed the unique result to zero. Next includes immediate driver approval of the 90,100-commit confirmation. The keydown interval includes the driver's selection checks and focus handling. Display and search endpoints include two animation frames. Dismissing the first confirmation preserved the selection and load depth. Return restored the recorded 800 px scroll offset. A separate details-enabled trial rendered the expected commit details and all 90,100 commit rows, took 44.335 s from Next to visible selection, and accepted the next key at 48.606 s. One wheel event in a fresh graph loaded 400 commits before any load control was used. The common-subject search paused at 1,000 and 2,000 unread matches, then cancellation restored the 300-commit loaded scope.

The earlier viewport prototype on the same fixture had medians of 842 ms to open, 2364 ms for a miss, 2479 ms for the unique hit, and 2422 ms to the visible deep result. The prototype used a 1,000-commit batch and its move did not require confirmation. The [separate calibration](history-search-calibration.md) establishes the product's 26,000-commit batch and 20,000-commit confirmation depth.

A separate keyboard trial verified that focus was already in the search field after the deep move. A keyboard event sent to the window changed its query and cleared the match without refocusing the field. The target remained mounted and Return restored the original scroll offset.

## Reproduce the search and navigation trials

From the checkout, create the linear Git history with the same identities, timestamps, subjects and commit order.

```sh
fixture=$(mktemp -d)
git init -q -b main "$fixture"
python3 - <<'PY' | git -C "$fixture" fast-import --quiet
for i in range(100000):
    subject = "unique-deep-target" if i == 10000 else "history-search-benchmark"
    print("commit refs/heads/main")
    print(f"committer Bench <bench@example.invalid> {1600000000 + i} +0000")
    print(f"data {len(subject)}")
    print(subject)
    print()
print("done")
PY
git -C "$fixture" commit-graph write --reachable
git -C "$fixture" rev-parse HEAD
pnpm run compile
```

Set `KEIZU_CAPTURE_VSCODE` to the Linux desktop executable and `KEIZU_CAPTURE_PLAYWRIGHT` to the Playwright Node module. The driver opens a real development host. Give every invocation its own empty profile and keep the same build and fixture for all trials.

```sh
for trial in warmup 1 2 3 4 5 scroll cancel keyboard details; do
  KEIZU_CAPTURE_WORK_DIR="$(mktemp -d)" node tests/browser/history-search.mjs "$fixture" "$trial" || exit 1
done
```

## Case-to-test mapping

All 92 new source-scoped cases and the 14 earlier regressions are listed below. Names are the leaf test names emitted by Vitest. Repeated titles represent parameterized inputs in the linked source. The real-window case TC-836 belongs to `web/main.ts` and runs through [tests/browser/history-search.mjs](../../tests/browser/history-search.mjs) for scan completion, movement, return and subsequent input. Its initial-open series measures the trusted command-palette Enter through the paint of the first 300 commits in a separate fresh-profile series.

### src/dataSource.ts in dataSource.git.test.ts

[tests/src/dataSource.git.test.ts](../../tests/src/dataSource.git.test.ts)

- **TC-390, TC-391**
  - `keeps the ordinary 300 positions while displaying pins, stashes and the working tree (TC-390, TC-391)`
- **TC-395, TC-396, TC-399**
  - `joins the graph prefix to one ordered multi-tip walk with the same parents and refs`
- **TC-397, TC-398**
  - `matches Git's literal author filtering and decodes byte-split UTF-8, separators and CRs`
- **TC-400, TC-408**
  - `leaves bytes after the lookahead on the paused stream and waits for cancellation cleanup before replacement`
- **TC-408**
  - `reaps the real Git child when a search is cancelled with its pipe paused`
- **TC-401**
  - `waits for Git close and discards an invalid batch (empty)`
  - `waits for Git close and discards an invalid batch (valid)`
- **TC-406**
  - `waits for Git close and discards an invalid batch (exit)`
  - `waits for Git close and discards an invalid batch (malformed)`
  - `waits for Git close and discards an invalid batch (incomplete)`
  - `discards a nonterminal batch if Git exits abnormally during postvalidation`
- **TC-402, TC-404, TC-405, TC-407**
  - `verifies before and after every batch and after EOF without starting another walk`
- **TC-403**
  - `discards the next batch if shallow changes without moving a displayed ref`
  - `discards the next batch if graft changes without moving a displayed ref`
  - `discards the next batch if replacement changes without moving a displayed ref`
  - `discards the next batch if core.useReplaceRefs changes without moving a displayed ref`
  - `discards the next batch if worktree map changes without moving a displayed ref`
  - `discards the next batch if mailmap.file changes without moving a displayed ref`
  - `discards the next batch if file contents changes without moving a displayed ref`
  - `discards the next batch if mailmap.blob changes without moving a displayed ref`
  - `discards the next batch if blob contents changes without moving a displayed ref`
  - `discards the next batch if log.mailmap changes without moving a displayed ref`
- **TC-392, TC-393**
  - `distinguishes a visible ref change around a tokenless load from an unreadable input (TC-392, TC-393)`
- **TC-394**
  - `normalizes ref order and observes independently changed HEADs, names, kinds and targets (TC-394)`
- **TC-393, TC-394**
  - `ignores only a successfully enumerated hidden remote for search (TC-393, TC-394)`
- **TC-382**
  - `keeps Japanese history readable when Git's output encoding changes from EUC-JP (TC-382)`
  - `keeps Japanese history readable when Git's output encoding changes from UTF-8 (TC-382)`
  - `reads Japanese subjects from stashes and detached worktree heads in UTF-8 (TC-382)`
  - `preserves Git order, both merge parents and refs across multi-tip and author-filtered walks (TC-382)`
- **TC-389**
  - `keeps a literal author filter across a Git pattern mode change (TC-389)`
- **TC-386**
  - `invalidates the author-filtered page when the worktree mailmap changes (TC-386)`
  - `invalidates the author-filtered page when the external mailmap changes (TC-386)`
  - `invalidates the author-filtered page when the index blob mailmap changes (TC-386)`
  - `refreshes unfiltered author choices after editing an external file (TC-386)`
- **TC-387**
  - `refreshes unfiltered author choices after editing an external symlink (TC-387)`
- **TC-388**
  - `continues past a bare log.mailmap setting and detects a change to false (TC-388)`
- **TC-385**
  - `reloads history after a graft file create with unchanged refs (TC-385)`
  - `reloads history after a graft file edit with unchanged refs (TC-385)`
  - `reloads history after a graft file remove with unchanged refs (TC-385)`
  - `reloads the full range when core.useReplaceRefs changes from true (TC-385)`
  - `reloads the full range when core.useReplaceRefs changes from false (TC-385)`
  - `replaces history when deepening a shallow clone changes parents without moving refs (TC-385)`
  - `falls back to a fresh history after a query change (TC-385)`
  - `falls back to a fresh history after a filter change (TC-385)`
  - `falls back to a fresh history after a token change (TC-385)`
  - `falls back to a fresh history after a refs change (TC-385)`
  - `falls back to a fresh history after a worktree change (TC-385)`
  - `falls back to a fresh history after a dirty change (TC-385)`
  - `falls back to a fresh history after a stash change (TC-385)`

### src/gitGraphView.ts in gitGraphView.test.ts

[tests/src/gitGraphView.test.ts](../../tests/src/gitGraphView.test.ts)

- **TC-426**
  - `relays one 100-commit page without reading or transferring the prefix (TC-422)`
  - `relays the verified ordinary history to the issuing request (TC-426)`
  - `relays the historyChanged ordinary history to the issuing request (TC-426)`
  - `relays the unavailable ordinary history to the issuing request (TC-426)`
- **TC-430**
  - `echoes the search key for both detail outcomes and preserves ordinary responses (TC-430)`
- **TC-423, TC-428, TC-429**
  - `keeps retained identity and rejects old reads, starts and cancels after HTML replacement and disposal`
- **TC-427**
  - `ignores an old generation's cancel and completed batch after an immediate restart`
- **TC-424, TC-425**
  - `checks the active repo, generation and outstanding request for read and verify (ok)`
  - `checks the active repo, generation and outstanding request for read and verify (historyChanged)`
  - `checks the active repo, generation and outstanding request for read and verify (error)`

### web/messageHandler.ts in messageHandler.test.ts

[tests/web/messageHandler.test.ts](../../tests/web/messageHandler.test.ts)

- **TC-097**
  - `checks keyed detail success and failure before touching the graph (TC-097, accepted true)`
  - `checks keyed detail success and failure before touching the graph (TC-097, accepted false)`
  - `shows commit details when the file tree builds successfully (TC-028)`
  - `hides details and shows an error without building a tree when details are null (TC-031)`
- **TC-094**
  - `delivers the ok batch to its original request`
- **TC-095**
  - `delivers the historyChanged batch to its original request`
  - `delivers the error batch to its original request`
- **TC-096**
  - `delivers ok verification without a batch`
  - `delivers historyChanged verification without a batch`
  - `delivers error verification without a batch`
- **TC-093**
  - `routes the terminal page to the incremental handler only (TC-092)`
  - `delivers the full history verification metadata (TC-093)`

### web/findWidget.ts in findWidget.test.ts

[tests/web/findWidget.test.ts](../../tests/web/findWidget.test.ts)

- **TC-509**
  - `checks fix issue with the same model on screen, off screen and unread (TC-509, TC-510, TC-512, TC-513)`
  - `checks ^Ada$ with the same model on screen, off screen and unread (TC-509, TC-510, TC-512, TC-513)`
  - `checks ^feature$ with the same model on screen, off screen and unread (TC-509, TC-510, TC-512, TC-513)`
  - `checks ^origin$ with the same model on screen, off screen and unread (TC-509, TC-510, TC-512, TC-513)`
  - `checks fork/topic with the same model on screen, off screen and unread (TC-509, TC-510, TC-512, TC-513)`
  - `checks v7 with the same model on screen, off screen and unread (TC-509, TC-510, TC-512, TC-513)`
  - `checks 24 Feb 2026 with the same model on screen, off screen and unread (TC-509, TC-510, TC-512, TC-513)`
- **TC-510**
  - `checks @{3} with the same model on screen, off screen and unread (TC-509, TC-510, TC-512, TC-513)`
  - `checks hidden@example.com with the same model on screen, off screen and unread (TC-509, TC-510, TC-512, TC-513)`
- **TC-513**
  - `checks ^12345678(?=a) with the same model on screen, off screen and unread (TC-509, TC-510, TC-512, TC-513)`
  - `checks 8901$ with the same model on screen, off screen and unread (TC-509, TC-510, TC-512, TC-513)`
  - `checks 34567 with the same model on screen, off screen and unread (TC-509, TC-510, TC-512, TC-513)`
  - `prioritizes zero-width errors for ^(?=12345678a) at any model location (TC-511, TC-513)`
- **TC-512**
  - `checks Ada|(?=wt8) with the same model on screen, off screen and unread (TC-509, TC-510, TC-512, TC-513)`
- **TC-511**
  - `prioritizes zero-width errors for ^$ at any model location (TC-511, TC-513)`
  - `prioritizes zero-width errors for Ada|(?=Fix) at any model location (TC-511, TC-513)`
  - `prioritizes zero-width errors for Fix|(?=Issue) at any model location (TC-511, TC-513)`
- **TC-514, TC-516**
  - `clears every match on late regex failure until the text or options change (TC-514, TC-516)`
- **TC-515**
  - `starts only on request and reports the filtered hit at position 400 (TC-515)`
- **TC-519**
  - `navigates loaded hits in row order and hands off unread hits by position, including wraparound (TC-519)`
- **TC-517, TC-518**
  - `renders search states and controls in en (TC-517, TC-518)`
  - `renders search states and controls in ja (TC-517, TC-518)`
- **TC-506**
  - `counts matches on both sides of the mounted row (TC-506)`
- **TC-507**
  - `navigates and wraps outside the window with details set to false (TC-507)`
  - `navigates and wraps outside the window with details set to true (TC-507)`
- **TC-508**
  - `restores current marks on remount and clears them for later windows (TC-508)`

### web/historySearch.ts in historySearch.test.ts

[tests/web/historySearch.test.ts](../../tests/web/historySearch.test.ts)

- **TC-001, TC-002**
  - `retains only hit positions, accepts each awaited batch once and ignores competing requests (TC-001, TC-002)`
- **TC-003**
  - `resumes from the third of four buffered records with host lookahead true (TC-003)`
  - `resumes from the third of four buffered records with host lookahead false (TC-003)`
- **TC-004, TC-005**
  - `rejects an invalid buffered final tail, including after host EOF (TC-004, TC-005)`
- **TC-006**
  - `completes at an exact limit and accepts an empty terminal batch (TC-006)`
- **TC-007**
  - `resumes host-only tails and collects 2001 matches over three operations (TC-007)`
- **TC-008, TC-009**
  - `merges by actual hash and preserves additions already spent in the operation (TC-008, TC-009)`
- **TC-010**
  - `retains verified hits on read failure and restarts with a fresh generation (TC-010)`
- **TC-011, TC-012**
  - `clears earlier hits on a later regex error or changed snapshot (TC-011, TC-012)`
- **TC-013, TC-014**
  - `rejects obsolete views, repositories, generations and request IDs even after cancellation (TC-013, TC-014)`

### web/historySearch.ts in main.keyboard.test.ts

[tests/web/main.keyboard.test.ts](../../tests/web/main.keyboard.test.ts)

- **TC-015**
  - `selects the largest passing batch size at the inclusive time boundary`
  - `reproduces the product batch limit from every full-size measured condition`

### web/main.ts in main.keyboard.test.ts

[tests/web/main.keyboard.test.ts](../../tests/web/main.keyboard.test.ts)

- **TC-835**
  - `selects the largest passing paint size at the inclusive time boundary`
  - `reproduces the product paint limit from every full-size measured condition`
- **TC-809, TC-810**
  - `takes the verified ordinary depth while a larger unpaged request is in flight (TC-809, TC-810)`
- **TC-811**
  - `searches a verified terminal graph with no page token (TC-811)`
- **TC-812**
  - `ends the live search on snapshot with identical graph rows (TC-812, TC-813)`
  - `ends the live search on prefix with identical graph rows (TC-812, TC-813)`
  - `ends the live search on reported with identical graph rows (TC-812, TC-813)`
- **TC-813**
  - `ends the live search on unavailable with identical graph rows (TC-812, TC-813)`
  - `ends the live search on legacy with identical graph rows (TC-812, TC-813)`
- **TC-814, TC-817**
  - `recognizes a changed stash selector on a retained hash and merges matches loaded by hash (TC-814, TC-817)`
- **TC-804**
  - `updates a retained date on soft refresh and append (TC-804)`
  - `updates a retained subject on soft refresh and append (TC-804)`
  - `updates a retained author on soft refresh and append (TC-804)`
  - `updates a retained email on soft refresh and append (TC-804)`
  - `updates only the working tree row when its timestamp changes (TC-804)`
  - `updates only the working tree row when its change count changes (TC-804)`
- **TC-806**
  - `preserves a pending author edit when a soft refresh adds [] (TC-806)`
  - `preserves a pending author edit when a soft refresh adds [ 'topic' ] (TC-806)`
- **TC-807**
  - `keeps pending author edits by name until apply after another author is renamed (TC-807)`
  - `keeps pending author edits by name until cancel after another author is renamed (TC-807)`
- **TC-815**
  - `merges a scroll-triggered page exactly once before any manual load (TC-815)`
- **TC-817**
  - `rechecks a retained row when its message changes (TC-817)`
  - `rechecks a retained row when its author changes (TC-817)`
  - `rechecks a retained row when its date changes (TC-817)`
  - `rechecks a retained row when its refs changes (TC-817)`
- **TC-818**
  - `keeps an unapplied author edit and expires the applied author change (TC-818)`
  - `keeps an unapplied author edit and expires the applied branch change (TC-818)`
  - `keeps an unapplied author edit and expires the applied remote change (TC-818)`
  - `keeps an unapplied author edit and expires the applied ordering change (TC-818)`
- **TC-819, TC-832**
  - `drops the running search and its return point on repo change (TC-819, TC-832)`
  - `drops the paused search and its return point on repo change (TC-819, TC-832)`
  - `drops the complete search and its return point on repo change (TC-819, TC-832)`
  - `drops the readError search and its return point on repo change (TC-819, TC-832)`
- **TC-825**
  - `ignores late approval and extension after cancel (TC-825)`
  - `ignores late approval and extension after close (TC-825)`
  - `ignores late approval and extension after repo (TC-825)`
  - `ignores late approval and extension after webview (TC-825)`
- **TC-829**
  - `rejects old details on both outcomes after redraw, switching matches, and recreating the graph (TC-829)`
- **TC-833**
  - `opening search exits file history (displayed false) and ignores expired search replies (TC-833)`
  - `opening search exits file history (displayed true) and ignores expired search replies (TC-833)`
- **TC-819, TC-834**
  - `restores only the saved find preferences after a paused graph is recreated in another language (TC-819, TC-834)`
- **TC-820**
  - `mounts the only hit at position 400, with details false, and accepts the next key (TC-820)`
  - `mounts the only hit at position 400, with details true, and accepts the next key (TC-820)`
- **TC-830**
  - `keeps the saved scroll when the prior details were still loading (TC-830)`
- **TC-821**
  - `selects a now-loaded pinned match without growing the graph (TC-821)`
- **TC-822, TC-823**
  - `confirms only above the boundary and preserves the current selection on dismissal (TC-822, TC-823)`
- **TC-822**
  - `accepts a depth equal to the calibrated boundary without confirmation (TC-822)`
- **TC-824**
  - `uses the latest ordinary depth and accepts only one move during confirmation and load (TC-824)`
- **TC-826**
  - `reports historyChanged before trying to select a missing target (TC-826)`
  - `reports unavailable before trying to select a missing target (TC-826)`
  - `reports targetMissing before trying to select a missing target (TC-826)`
- **TC-827**
  - `rechecks displayed fields after extension, with a regex error true (TC-827)`
  - `rechecks displayed fields after extension, with a regex error false (TC-827)`
- **TC-828**
  - `resumes path highlighting when the search loads its target at EOF (TC-828)`
- **TC-830, TC-831, TC-832**
  - `restores the scroll after two moves, with the saved details still present true (TC-830, TC-831, TC-832)`
  - `restores the scroll after two moves, with the saved details still present false (TC-830, TC-831, TC-832)`

### web/main.ts in main.test.ts

[tests/web/main.test.ts](../../tests/web/main.test.ts)

- **TC-812, TC-813, TC-816**
  - `updates verified positions only for the accepted request, including unchanged rows (TC-812, TC-813, TC-815, TC-816)`
- **TC-814**
  - `continues through a pinned row moving behind new ordinary positions (TC-814)`
- **TC-794**
  - `keeps the current history when a previous webview replies after reopening (TC-794)`
  - `keeps the outstanding page through wrong repo, token, count and old replacement responses (TC-794)`
  - `drops a late page after refresh and installs the current replacement (TC-794)`
  - `drops a late page after switch away and back and installs the current replacement (TC-794)`
- **TC-808**
  - `keeps the restored branch when an old reply arrives before the current one (TC-808)`
  - `keeps the restored branch when an old reply arrives after the current one (TC-808)`

### web/main.ts in gitGraphView.test.ts

[tests/src/gitGraphView.test.ts](../../tests/src/gitGraphView.test.ts)

- **TC-819**
  - `rebuilds the visible graph when dateType changes (TC-819)`
  - `rebuilds the visible graph when dateFormat changes (TC-819)`

### web/main.ts in fileHistory.test.ts

[tests/web/fileHistory.test.ts](../../tests/web/fileHistory.test.ts)

- **TC-833**
  - `restores the expanded commit before the scroll position (TC-044)`
  - `drops a pending-only request on exit(true) (TC-050)`

### l10n/web/web.l10n.en.json in i18n.test.ts

[tests/web/i18n.test.ts](../../tests/web/i18n.test.ts)

- **TC-106, TC-108**
  - `renders distinct localized find controls, progress and failure reasons`
- **TC-107**
  - `places counts, paused suffixes and confirmation depths in their localized roles`

### l10n/web/web.l10n.ja.json in i18n.test.ts

[tests/web/i18n.test.ts](../../tests/web/i18n.test.ts)

- **TC-106, TC-108**
  - `renders distinct localized find controls, progress and failure reasons`
- **TC-107**
  - `places counts, paused suffixes and confirmation depths in their localized roles`
