# Changelog

All notable changes to Git Keizu will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.2] - 2026-03-08

### Added

- **Arrow key commit navigation**: With a commit's detail panel open, navigate between commits using Arrow keys — no modifier for table order (one row at a time), Ctrl/Cmd for branch-tracking (parent or child on the same branch), and Ctrl/Cmd+Shift to jump to an alternative branch (the merge source on a merge commit, or the alternate child at a branch point). Navigation is disabled in commit comparison mode; key events are consumed to prevent the graph from scrolling while navigating

## [0.5.1] - 2026-03-07

### Added

- **Scroll position restore on tab switch**: When you switch away from the Git Keizu tab and return, the graph now scrolls back to where you left off. The position is saved as part of the webview state whenever a user action triggers a state save (e.g. clicking a commit, expanding details, toggling a filter). Note: passively scrolling the list without performing any action does not trigger a save — if you scroll and immediately switch tabs, the position will revert to the last saved state. Backward-compatible with older saved states (defaults to top).

## [0.5.0] - 2026-03-07

### Added

- **Checkout on branch create**: The Create Branch dialog now includes a "Check out" checkbox (checked by default) — when checked, Git Keizu automatically checks out the new branch immediately after creating it; uncheck to create the branch without switching away from the current branch
- **Multi-select Branch filter**: The Branch dropdown now supports selecting multiple branches simultaneously; each item has a checkbox, "Show All" is the default state, and deselecting all individual branches automatically returns to "Show All"
- **Multi-select Author filter**: The Author dropdown now supports selecting multiple authors simultaneously; each item has a checkbox, "Show All" is the default state, and deselecting all individual authors automatically returns to "Show All"

## [0.2.12] - 2026-03-05

### Fixed

- **Author filter completeness**: The Author dropdown now lists all authors reachable from HEAD (via `git shortlog`) rather than only those in the currently visible commits — authors on older commits beyond the loaded page are no longer missing
- **Author filter excludes "Uncommitted Changes" entry**: The pseudo-commit for uncommitted changes (author `*`) is no longer included in the Author dropdown options

## [0.2.11] - 2026-03-05

### Changed

- **Marketplace metadata**: Extension categories updated from `"Other"` to `["SCM Providers", "Visualization"]` for better discoverability; keywords refreshed to more accurately represent the extension's functionality (`action`/`visualise` replaced with `branch`/`commit`/`history`/`visualize`)
- **Setting descriptions**: Remaining "Git Graph" references in setting descriptions replaced with "Git Keizu"
- **Activation events**: Removed redundant `onCommand:*` activation events — VS Code 1.74+ activates command contributions automatically without explicit declaration

## [0.2.10] - 2026-03-05

### Fixed

- **Muted commit branch label visibility**: Branch, remote, and tag labels on muted commits now render at full opacity; previously the mute opacity was applied to the entire commit row cell, causing reference labels to also appear faded
- **Muted commit column coverage**: The date, author, and commit hash columns now correctly dim when a commit is muted, matching the original Git Graph behavior; previously only the commit message column was affected

## [0.2.9] - 2026-03-04

### Added

- **Mute merge commits**: Merge commits are displayed with muted text (50% opacity) by default, making non-merge commits easier to scan in a busy history. Can be disabled via `git-keizu.repository.commits.mute.mergeCommits` (default: true)
- **Mute non-ancestor commits**: A new opt-in setting `git-keizu.repository.commits.mute.commitsThatAreNotAncestorsOfHead` (default: false) dims commits that are not ancestors of the currently checked-out branch or commit

### Fixed

- **Graph line merging**: Merge commits whose second parent falls outside the loaded commit window now correctly draw the converging branch line instead of rendering as a single straight line
- **Commit color boundary**: The boundary between committed and uncommitted changes in the graph is now computed correctly in all cases

## [0.2.8] - 2026-03-01

### Fixed

- **2-commit comparison state persistence**: Switching away from the Git Keizu tab and returning while in compare mode no longer reverts to single-commit details — comparison state is now preserved across tab switches
- **2-commit comparison summary format**: The compare mode header now reads "Displaying all changes from [older commit] to [newer commit]." with commits shown in chronological order, instead of "Comparing X ↔ Y (N files)"

## [0.2.7] - 2026-03-01

### Fixed

- **Delete remote branch refresh timing**: When deleting a local branch with "Delete this branch on the remote" checked, the graph now refreshes after all remote branches are deleted instead of before, preventing the UI from briefly showing remote branches as still present after deletion

## [0.2.6] - 2026-03-01

### Added

- **Author filter**: New "Author" dropdown in the toolbar — select a commit author to show only their commits in the graph; choose "All Authors" to clear the filter. Author options are built from the currently loaded commits and passed as `--author` to `git log`
- **File view toggle**: A toggle icon button in the commit details panel switches between Tree View (folder hierarchy, default) and List View (flat alphabetical list of full paths); the chosen mode is saved per repository and restored across sessions
- **Delete Remote Branch**: Right-clicking a remote branch label now shows "Delete Remote Branch..." — a confirmation dialog runs `git push <remote> --delete <branch>` on confirmation
- **Merge remote branch**: Right-clicking a remote branch label now shows "Merge into current branch..." with the same confirmation dialog as for local branches
- **Rebase current branch**: Right-clicking any non-HEAD local branch now shows "Rebase current branch on Branch..." — confirms before running `git rebase <branch>`
- **Delete local + remote together**: When deleting a local branch that has a remote tracking counterpart, the Delete Branch dialog now includes a "Delete this branch on the remote" checkbox; when checked, the remote branch is also deleted after the local deletion succeeds (unchecked by default; only shown when a remote tracking branch exists)
- **Committer email in commit details**: The Committer field in the commit details panel now shows `Name <email>` format, matching the Author field
- **Clickable parent hashes**: Parent commit hashes in the commit details panel are now clickable — clicking one scrolls to and opens that commit's details panel

### Changed

- **Commit details field order**: Fields are now ordered Commit → Parents → Author → Committer → Date (previously ...Author → Date → Committer), aligning with the original Git Graph layout
- **Custom checkboxes**: Native OS checkboxes in dialogs and the "Show Remote Branches" control are replaced with theme-aware styled checkboxes
- **Graph column auto-layout**: The auto-layout graph column is now capped at 40% of the viewport width to prevent the graph from dominating wide screens; column width adjusts smoothly when the panel is resized
- **Scroll to expanded commit**: Opening commit details now accounts for the sticky header height, so the selected commit row is never hidden behind the controls bar

## [0.2.4] - 2026-02-28

### Added

- **SCM panel button**: A "View Git Graph" button now appears in the VS Code Source Control panel title bar; clicking it opens the graph and automatically selects the repository associated with the SCM provider. The button position can be set to Inline (title bar) or More Actions (`...` menu) via `git-keizu.sourceCodeProviderIntegrationLocation`
- **Keyboard shortcuts**: Four configurable shortcuts are now available — Find (Ctrl/Cmd+F), Refresh (Ctrl/Cmd+R), Scroll to HEAD (Ctrl/Cmd+H), and Scroll to Stash (Ctrl/Cmd+S); Shift+Stash shortcut moves to the previous stash. Each key can be rebound to any Ctrl/Cmd+letter combination or disabled via `git-keizu.keyboardShortcut.*` settings
- **Escape key staged dismissal**: Pressing Escape closes UI components one at a time in priority order — context menu → dialog → dropdown → find widget → commit details panel — so a single keypress always leaves you at the right state
- **Auto load more commits**: Additional commits load automatically when scrolling near the bottom of the commit list; can be disabled via the `git-keizu.loadMoreCommitsAutomatically` setting (default: enabled)
- **Dropdown overflow handling**: Branch and repository dropdowns are capped at 30% of the viewport width (multi-repo) or 40% (single-repo); names that exceed the width are truncated with an ellipsis and shown in full on hover

## [0.2.3] - 2026-02-26

### Changed

- **Smooth refresh after Git operations**: Branch deletions, fetches, pushes, merges, tags, resets, cherry-picks, and other Git actions now use a soft refresh — the commit table stays visible while new data loads in the background, eliminating the screen flash on every operation and preserving scroll position
- **Commit details panel height**: The panel height is now calculated dynamically from the available viewport space instead of being fixed at 250px; the height adjusts automatically when the VS Code panel is resized
- **Commit details scroll behavior**: When opening a commit's detail panel, the view only scrolls if the panel would extend outside the visible area, keeping your reading position stable; when scrolling is needed, only the minimum displacement to bring the panel into view is applied

### Removed

- **`git-keizu.autoCenterCommitDetailsView` setting**: Removed — the new scroll behavior (scroll only when the panel extends outside the viewport) replaces the old auto-center option

## [0.2.2] - 2026-02-25

### Added

- **Pull/Push for current branch**: Right-click the currently checked-out branch to run `git pull` or `git push`; git's output (success or error) is shown in an info/error dialog
- **Enter key confirmation**: Input dialogs (checkout branch, rename branch, etc.) now confirm on Enter key press

### Changed

- **Fetch uses `--prune`**: The Fetch button now always runs `git fetch --prune`, automatically removing stale remote-tracking references; the button tooltip reflects this
- **Icon redesign**: Extension icon (`icon.png`) and webview icons updated with a cleaner SVG graph layout

### Fixed

- **Context menu clipping**: Context menu now uses the full webview area as its bounding box, preventing items from being hidden behind the controls bar or cut off at screen edges
- **Stash label border color**: Stash label borders now correctly use the graph line color instead of always rendering grey
- **Remote branch checkout — branch name proposal**: Checking out `origin/feature/ebook` now correctly proposes `feature/ebook` as the local name instead of only the last path segment (`ebook`)
- **Remote branch checkout — existing local branch**: Checking out a remote branch when a same-named local branch already exists no longer fails with `fatal: a branch named '...' already exists`
- **Stash dialog auto-focus**: The Message field in the Stash dialog now receives focus automatically when the dialog opens
- **Find widget auto-focus**: The search text box in the Find widget now receives focus automatically when opened

## [0.2.1] - 2026-02-25

### Added

- **Stash support**: Stash entries are now displayed in the commit graph with a double-circle (ring) vertex style to distinguish them from regular commits
- **Stash context menu**: Right-click a stash entry to Apply, Pop, Drop, Create Branch from Stash, or copy the stash name/hash to clipboard
- **Uncommitted Changes context menu**: Right-click the Uncommitted Changes row to stash changes, reset (Mixed/Hard), or clean untracked files
- **Fetch button**: New toolbar button to run `git fetch --all` without a dialog
- **FindWidget**: Commit search bar (Ctrl/Cmd+F) with regex mode, case-sensitive mode, match counter (N of M), prev/next navigation, and state persistence across sessions
- **2-point commit comparison**: Ctrl/Cmd+click a second commit to compare it with the selected commit; click again to dismiss
- **Sticky header**: Menu bar and column headers remain fixed at the top while the commit list scrolls
- **Comprehensive test suite**: 211 tests across 8 test files covering stash operations, FindWidget, graph rendering, message handling, and commit comparison

### Changed

- Refactored `web/main.ts` into dedicated modules: `commitMenu.ts`, `refMenu.ts`, `stashMenu.ts`, `uncommittedMenu.ts`, and `messageHandler.ts`

## [0.2.0] - 2026-02-22

### Added

- Remote tracking information displayed in branch labels
- Vitest testing infrastructure with initial test coverage
- CI/CD publish workflow for VS Marketplace and Open VSX

### Changed

- Renamed extension from neo-git-graph to **Git Keizu**
- Migrated build system to esbuild with ES2020 target
- Refactored `web/main.ts` into submodules (dates, fileTree, contextMenu, dialogs, branchLabels)
- Migrated all `fs` callbacks to `async/await` using `node:fs/promises`
- Migrated all `Promise.then` chains to `async/await`

### Fixed

- XSS vulnerability and regex bug in webview
- Migrated all `cp.exec` calls to `cp.spawn` to prevent command injection
- Additional input validation and security hardening across backend

## [0.1.0] - 2026-02-18

Initial release as Git Keizu — forked from [neo-git-graph](https://github.com/asispts/neo-git-graph) (originally [Git Graph](https://github.com/mhutchie/vscode-git-graph) by mhutchie, MIT).

[Unreleased]: https://github.com/numlia/git-keizu/compare/v0.5.2...HEAD
[0.5.2]: https://github.com/numlia/git-keizu/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/numlia/git-keizu/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/numlia/git-keizu/compare/v0.2.12...v0.5.0
[0.2.12]: https://github.com/numlia/git-keizu/compare/v0.2.11...v0.2.12
[0.2.11]: https://github.com/numlia/git-keizu/compare/v0.2.10...v0.2.11
[0.2.10]: https://github.com/numlia/git-keizu/compare/v0.2.9...v0.2.10
[0.2.9]: https://github.com/numlia/git-keizu/compare/v0.2.8...v0.2.9
[0.2.8]: https://github.com/numlia/git-keizu/compare/v0.2.7...v0.2.8
[0.2.7]: https://github.com/numlia/git-keizu/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/numlia/git-keizu/compare/v0.2.5...v0.2.6
[0.2.4]: https://github.com/numlia/git-keizu/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/numlia/git-keizu/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/numlia/git-keizu/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/numlia/git-keizu/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/numlia/git-keizu/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/numlia/git-keizu/releases/tag/v0.1.0
