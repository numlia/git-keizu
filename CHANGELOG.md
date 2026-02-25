# Changelog

All notable changes to Git Keizu will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/numlia/git-keizu/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/numlia/git-keizu/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/numlia/git-keizu/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/numlia/git-keizu/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/numlia/git-keizu/releases/tag/v0.1.0
