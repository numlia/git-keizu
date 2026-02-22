# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Git Keizu (系図) — A VS Code extension for visualizing Git history as an interactive graph. Forked from neo-git-graph (asispts), originally from Git Graph (mhutchie, MIT).

## Commands

```bash
# Package manager: pnpm 10.29.3 (no global pnpm available)
npm exec --yes -- pnpm@10.29.3 install   # install dependencies

# Quality checks (CI runs these in order)
pnpm run format          # oxfmt --check
pnpm run lint            # oxlint
pnpm run typecheck       # tsc -p ./src --noEmit && tsc -p ./web --noEmit
pnpm run test:ci         # vitest run (36 tests)

# Fix formatting/lint
pnpm run format:fix      # oxfmt .
pnpm run lint:fix        # oxlint --fix

# Build
pnpm run compile         # clean + compile-src (esbuild → out/extension.js) + compile-web (esbuild → out/web.min.js)

# Test (watch mode)
pnpm run test            # vitest (interactive)

# Run a single test file
pnpm exec vitest run tests/src/utils.test.ts
```

## Architecture

### Two runtimes, one extension

The codebase is split into two isolated TypeScript projects with separate tsconfig files:

- **`src/`** — Extension backend (Node.js, CommonJS, ES6 target). Runs in VS Code's extension host. Entry: `src/extension.ts` → bundled to `out/extension.js`.
- **`web/`** — Webview frontend (Browser, IIFE, ES2020 target). Runs in VS Code's webview (Chromium). Entry: `web/main.ts` → bundled to `out/web.min.js`.

They communicate via a typed message protocol defined in `src/types.ts` (RequestMessage/ResponseMessage unions). The webview posts requests; the extension handles them and sends responses.

### Extension backend (`src/`)

| File | Role |
|---|---|
| `extension.ts` | Activation entry point. Wires managers together, registers commands. |
| `dataSource.ts` | Git CLI wrapper. All commands use `child_process.spawn()` (no shell). Contains commit hash validation, git path validation, and reset mode validation. |
| `gitGraphView.ts` | Manages the VS Code Webview panel. Routes messages between webview and DataSource/AvatarManager. |
| `repoManager.ts` | Auto-discovers Git repos in workspace via glob patterns. Watches for changes. |
| `avatarManager.ts` | Fetches author avatars from GitHub/GitLab/Gravatar public APIs. Caches to disk. |
| `extensionState.ts` | Persists state (repo column widths, last active repo, avatar cache) using `node:fs/promises`. |
| `config.ts` | Typed wrapper around `vscode.workspace.getConfiguration('git-keizu')`. |
| `types.ts` | All TypeScript interfaces: git data types, message protocol, config enums. |

### Webview frontend (`web/`)

| File | Role |
|---|---|
| `main.ts` | Main `GitGraphView` class — renders commit table, handles user interactions. |
| `graph.ts` | SVG graph rendering engine (commit positions, branch colors, rounded/angular styles). |
| `dropdown.ts` | Reusable dropdown component with filtering. |
| `dialogs.ts` | Confirmation, form, and error dialogs. |
| `fileTree.ts` | Nested file tree from commit file changes. |
| `contextMenu.ts` | Right-click context menu. |
| `dates.ts` | Date formatting (Date & Time / Date Only / Relative). |
| `branchLabels.ts` | Branch/tag label rendering on commits. |
| `utils.ts` | `escapeHtml`, `sendMessage`, SVG icons. |
| `global.d.ts` | Global type definitions (`acquireVsCodeApi`, `viewState`, component interfaces). |

### Message flow

1. User action in webview (e.g., select branch)
2. `web/utils.ts:sendMessage()` posts `RequestMessage` to extension
3. `src/gitGraphView.ts` receives message, calls `DataSource` method
4. `DataSource` spawns git process, parses output
5. Extension posts `ResponseMessage` back to webview
6. Webview handler renders the result

## Code conventions

- **Node built-ins**: Use `node:` protocol prefix (`node:fs/promises`, `node:path`, `node:child_process`) — enforced by oxlint `unicorn/prefer-node-protocol`
- **Imports**: Sorted by `simple-import-sort` (oxlint plugin) — auto-fixable with `pnpm run lint:fix`
- **String concatenation**: Use template literals everywhere (no `+` for strings)
- **Async**: All async code uses `async/await` (no `.then()` chains, no callbacks for fs)
- **Strict equality**: `===` only — enforced by oxlint `eqeqeq`
- **No `var`**: Use `const`/`let` — enforced by oxlint `no-var`
- **`any` usage**: Warned by oxlint `typescript/no-explicit-any`
- **Git commands**: Always use `spawn()` via `runGitCommandSpawn`/`spawnGit` in `dataSource.ts` (never `exec` — shell injection prevention)
- **Format**: oxfmt with printWidth 100, 2-space indent, no trailing commas

## Testing

- Framework: Vitest
- Test files: `tests/src/utils.test.ts`, `tests/web/utils.test.ts`
- Setup: `tests/web/setup.ts` mocks `acquireVsCodeApi()` for webview tests
- Coverage: v8 provider, covers `src/**/*.ts` and `web/**/*.ts` (excludes `types.ts`, `global.d.ts`)
- Test supplement (project-specific rules): [`docs/test-supplement.md`](docs/test-supplement.md)

## Settings namespace

All user-facing settings are under `git-keizu.*` (defined in `package.json` contributes.configuration). The `src/config.ts` wrapper reads these via `vscode.workspace.getConfiguration('git-keizu')`.

## Commit settings

commit-language: en
