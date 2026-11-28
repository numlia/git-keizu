# Full-history search calibration

| Product limit                             | Selected commits | Worst measured time |   Budget |
| ----------------------------------------- | ---------------: | ------------------: | -------: |
| Ordinary graph reload before confirmation |           20,000 |            811.4 ms | 2,000 ms |
| Full-history search batch                 |           26,000 |            491.7 ms |   500 ms |

All four reload candidates passed. Their worst times were 441.7 ms at 1,000 commits, 514.2 ms at 5,000, 628.5 ms at 10,000 and 811.4 ms at 20,000. A batch of 27,000 took up to 513.7 ms. Every larger candidate exceeded the budget on at least one trial. An interactive search still pauses after adding 1,000 new matches per action.

## Measurement

The measurements used Git Keizu at `96c7abb` on 2026-11-23, Ubuntu 24.04.1 under WSL2/WSLg, an Intel Core i9-12900H (20 guest logical CPUs), 11.68 GiB of guest memory, Git 2.43.0 and Linux VS Code 1.107.1. Playwright 1.62.1 drove the 1280 × 800 development host with the repository's README capture settings. The fast-import repository had 100,000 linear commits with the identical subject `history-search-benchmark`, one branch and a reachable commit graph. Its tip was `60df37bdecdc5ab09cfa16934152f1b71e70c1dc`.

Both paths ran with the literal queries `not-present-in-history` and `history-search-benchmark`, with case sensitivity disabled. A monotonic timer in the webview started immediately before posting each product request to VS Code.

- For reloads, the open search widget re-evaluated the full graph load. Timing ended on the second animation frame after the product's render callback. Each sample checked mounted table rows, corresponding SVG nodes, visible highlights, loaded count and match count.
- For batches, each trial started a new Git scan using the normal request, snapshot checks, log reader, response transport and widget matcher. The isolated measurement build scanned every returned commit, suppressed the interaction pause and stopped before fetching a second batch. Timing ended after the batch handler returned. Each sample checked position, count, EOF, examined rows and distinct unread matches.

## Recalculate the limits

The [raw measurements](history-search-calibration.csv) include 8 redraw conditions and 600 batch conditions. Batch candidates range from 1,000 to 100,000 in increments of 1,000, with 0, 50,000 and 90,000 commits skipped. Each condition records a warmup. Discard rows with fewer commits received than requested (280 short EOFs). For each remaining candidate, take the maximum of columns `run1_ms` through `run5_ms` across both queries and all valid offsets. Choose the largest candidate with a maximum at or below its budget. The selection uses all 1,640 scored timings.
