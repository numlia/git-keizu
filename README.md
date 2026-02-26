<div align="center">
  <img src="./resources/icon.png" height="128"/>
  <samp>
    <h1>Git Keizu for Visual Studio Code</h1>
    <h3>View your Git history as a graph, and do common Git actions directly from it</h3>
  </samp>
</div>

![](https://img.shields.io/visual-studio-marketplace/v/numlia-vs.git-keizu)
![](https://img.shields.io/visual-studio-marketplace/i/numlia-vs.git-keizu)
![](https://img.shields.io/open-vsx/v/numlia-vs/git-keizu)
![](https://img.shields.io/open-vsx/dt/numlia-vs/git-keizu)
![](https://img.shields.io/github/license/numlia/git-keizu)

A fork of [neo-git-graph](https://github.com/asispts/neo-git-graph) by asispts, which is itself a fork of [Git Graph](https://github.com/mhutchie/vscode-git-graph) by mhutchie, based on commit [4af8583](https://github.com/mhutchie/vscode-git-graph/commit/4af8583a42082b2c230d2c0187d4eaff4b69c665) (May 9, 2019) — the last version released under the MIT license.

## Features

- **Graph View**: See all your branches, tags, stash entries, and uncommitted changes in one visual graph. The menu bar and column headers stay fixed as you scroll, so controls are always within reach in long histories.
- **Commit Details**: Click on a commit to see what changed and view diffs for any file. The panel height adjusts to your viewport size, and the view only scrolls enough to bring the panel into view — no jarring auto-center on every click.
- **Branch Actions**: Right-click to create, checkout, delete, rename, or merge branches
- **Tag Actions**: Add, delete, and push tags directly from the graph
- **Commit Actions**: Checkout, cherry-pick, revert, or reset to any commit
- **Stash Support**: Stash entries appear in the graph with a distinct visual style; right-click to apply, pop, drop, or create a branch from a stash
- **Uncommitted Changes Actions**: Right-click the Uncommitted Changes row to stash, reset (Mixed/Hard), or clean untracked files
- **Pull/Push for current branch**: Right-click the currently checked-out branch to run `git pull` or `git push` directly from the graph
- **Fetch with automatic prune**: The Fetch button runs `git fetch --prune` — stale remote-tracking references are cleaned up automatically on every fetch
- **Commit Search**: Press Ctrl/Cmd+F to open a search bar with regex mode, case-sensitive mode, match counter (N of M), and prev/next navigation
- **2-Commit Comparison**: Ctrl/Cmd+click a second commit to compare it with the selected commit side-by-side
- **Combined branch/remote labels**: Local and remote branches on the same commit merge into a single pill label — `[main | origin]`. Right-clicking either part opens the appropriate context menu.
- **Smooth refresh**: Git operations update the graph in the background without blanking the view or losing your scroll position
- **Avatar Support**: Optionally fetch commit author avatars from GitHub, GitLab, or Gravatar
- **Multi-Repository**: Support for multiple Git repositories in one workspace
- **Configurable**: Customize graph colors, style, date format, and more

## Security

Git Keizu has undergone a full security audit and remediation (27 issues fixed):

- **Shell injection eliminated** — all git commands use `child_process.spawn()` exclusively; `exec()` has been removed entirely
- **Git binary validation** — the configured `git.path` is validated to be an absolute path pointing to a `git` executable, preventing arbitrary command execution via a malicious `.vscode/settings.json`
- **Commit hash validation** — every operation that accepts a commit hash validates the format before passing it to git
- **Repository path validation** — all messages from the webview are checked against the registered repository list, preventing commands from running against arbitrary directories
- **Path traversal prevention** — file path arguments are checked for `..` sequences
- **SSRF protection** — avatar fetch requests are restricted to an allowlist of known domains (GitHub, GitLab, Gravatar)
- **XSS fixes** — commit parent hashes, avatar data URIs, and other dynamic values are properly HTML-escaped before insertion into the webview

## Installation

Search for `git-keizu` in the Extensions panel.

## Contributing & Support

The codebase has been modernized from its 2019 origins: async/await throughout, ES2020 targets, a Vitest test suite, and oxlint/oxfmt for consistent style.

Bug reports and feedback via [GitHub Issues](https://github.com/numlia/git-keizu/issues) are welcome. This is a personal project maintained in spare time — responses and fixes are not guaranteed, but reports are appreciated.

## License

MIT — see [LICENSE](LICENSE).

> Not affiliated with or endorsed by the original Git Graph or neo-git-graph projects.
