# Product Overview

Git Keizu (系図) is a VS Code extension that renders Git history as an interactive graph, enabling developers to visualize branches, tags, and commit relationships at a glance and perform common Git operations directly from the graph.

Forked from neo-git-graph (asispts), originally from Git Graph (mhutchie, MIT commit 4af8583).

## Core Capabilities

- **Interactive Graph View**: Visualize all branches, tags, and uncommitted changes in a connected commit graph with configurable colors and styles (rounded/angular)
- **Commit Inspection**: Click any commit to view detailed changes, diffs, author info, and file-level modifications
- **Git Operations**: Right-click to create/checkout/delete/rename/merge branches, add/delete/push tags, cherry-pick, revert, or reset — all without leaving VS Code
- **Multi-Repository Support**: Auto-discovers Git repositories in the workspace; switch between repos from a dropdown
- **Author Avatars**: Optionally fetches commit author avatars from GitHub, GitLab, or Gravatar

## Target Use Cases

- **Daily Git workflow**: Developers exploring branch history and performing routine Git operations through a visual interface rather than CLI
- **Code review preparation**: Understanding branch relationships and commit sequences before reviewing or merging
- **Repository orientation**: Onboarding to unfamiliar codebases by visualizing the commit topology

## Value Proposition

- **Security-hardened fork**: Full security audit (27 issues fixed) — shell injection eliminated, input validation on all git commands, XSS prevention, SSRF protection
- **Combined branch labels**: Local and remote branches pointing to the same commit merge into a single pill label (`[main | origin]`)
- **Modernized codebase**: async/await throughout, ES2020 target, Vitest test suite, esbuild bundling
- **MIT licensed**: Permissive open-source license

## Distribution

- Published as `numlia-vs.git-keizu` on VS Marketplace and Open VSX
- Minimum VS Code version: 1.74.0

---

_Focus on patterns and purpose, not exhaustive feature lists_
