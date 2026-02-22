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

- **Graph View**: See all your branches, tags, and uncommitted changes in one visual graph
- **Commit Details**: Click on a commit to see what changed, view diffs for any file
- **Branch Actions**: Right-click to create, checkout, delete, rename, or merge branches
- **Tag Actions**: Add, delete, and push tags directly from the graph
- **Commit Actions**: Checkout, cherry-pick, revert, or reset to any commit
- **Avatar Support**: Optionally fetch commit author avatars from GitHub, GitLab, or Gravatar
- **Multi-Repository**: Support for multiple Git repositories in one workspace
- **Configurable**: Customize graph colors, style, date format, and more

## Improvements over neo-git-graph

### Combined branch/remote labels

Local and remote branches that point to the same commit are now merged into a single pill label.

```
Before: [main]  [origin/main]
After:  [main | origin]
```

The remote name appears in italics after a separator. Right-clicking either part of the pill opens the appropriate context menu (local branch actions or remote branch actions). Double-clicking the remote part opens the checkout dialog.

### Security hardening

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

## License

MIT — see [LICENSE](LICENSE).

> Not affiliated with or endorsed by the original Git Graph or neo-git-graph projects.
