# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Git Keizu (系図) — A VS Code extension for visualizing Git history as an interactive graph. Forked from neo-git-graph (asispts), originally from Git Graph (mhutchie, MIT).

## Commands

```bash
# Package manager: pnpm 10.29.3
# Run via npx (no global pnpm available):
#   npx --yes pnpm@10.29.3 run <script>
#   npx --yes pnpm@10.29.3 exec <command>
npx --yes pnpm@10.29.3 install   # install dependencies

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

Two isolated TypeScript projects: `src/` (Node.js extension host, CommonJS, ES6) and `web/` (Browser/Chromium webview, IIFE, ES2020). They communicate via a typed message protocol in `src/types.ts` (RequestMessage/ResponseMessage unions). See [`docs/development/directory-structure.md`](docs/development/directory-structure.md) for file-level details.

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
