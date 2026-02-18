# (neo) Git Graph for Visual Studio Code

View your Git history as a graph, and do common Git actions directly from it.

A fork of [Git Graph](https://github.com/mhutchie/vscode-git-graph) by mhutchie, based on commit [4af8583](https://github.com/mhutchie/vscode-git-graph/commit/4af8583a42082b2c230d2c0187d4eaff4b69c665) (May 9, 2019) — the last version released under the MIT license.
<p>&nbsp;</p>

![demo](resources/demo.gif)

## Features

- **Graph View**: See all your branches, tags, and uncommitted changes in one visual graph
- **Commit Details**: Click on a commit to see what changed, view diffs for any file
- **Branch Actions**: Right-click to create, checkout, delete, rename, or merge branches
- **Tag Actions**: Add, delete, and push tags directly from the graph
- **Commit Actions**: Checkout, cherry-pick, revert, or reset to any commit
- **Avatar Support**: Optionally fetch commit author avatars from GitHub, GitLab, or Gravatar
- **Multi-Repository**: Support for multiple Git repositories in one workspace
- **Configurable**: Customize graph colors, style, date format, and more

## Installation

Search for `neo-git-graph` in the Extensions panel, or install from the [VS Code Marketplace](#) or [Open VSX Registry](#).

## Roadmap

- [x] Fix activation event (`*` → `onStartupFinished`)
- [x] Fix extension not activating in devcontainers
- [x] Upgrade dependencies and toolchain
- [ ] Modernize the codebase

## License

MIT — see [LICENSE](LICENSE).

> Not affiliated with or endorsed by the original Git Graph project.
