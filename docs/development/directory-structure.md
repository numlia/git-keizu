# Directory Structure

This document describes the overall directory layout of the Git Keizu project.

## Project Characteristics

Git Keizu is a VS Code extension composed of two independent TypeScript projects (Node.js backend + Browser frontend). No database is used.

- **Build tool**: esbuild (bundles `src/` and `web/` separately)
- **Package manager**: pnpm 10.29.3
- **Testing**: Vitest
- **Linting/Formatting**: oxlint + oxfmt

## Root Directory Layout

<!-- AUTO-GENERATED:root-structure START -->

```
neo-git-graph/
├── .github/              # CI/CD workflows, Dependabot config
├── .vscode/              # VS Code debug & task settings
├── media/                # Webview CSS stylesheets
├── notes/                # Design notes, plans, audit records
├── out/                  # Build output (gitignored)
├── resources/            # Extension icons (SVG, PNG)
├── src/                  # Extension backend (Node.js)
├── tests/                # Test code (Vitest)
├── web/                  # Webview frontend (Browser)
├── .oxfmtrc.jsonc        # oxfmt formatting config
├── .oxlintrc.json        # oxlint linting config
├── CLAUDE.md             # Claude Code guide
├── package.json          # Dependencies, scripts, VS Code contributes
├── tsconfig.json         # (none: managed separately in src/ and web/)
└── vitest.config.ts      # Test config
```

<!-- AUTO-GENERATED:root-structure END -->

## src/ Directory (Extension Backend)

<!-- AUTO-GENERATED:src-structure START -->

```
src/
├── extension.ts          # Entry point (activate/deactivate)
├── config.ts             # VS Code settings wrapper
├── dataSource.ts         # Git CLI wrapper (spawn-based)
├── gitGraphView.ts       # Webview panel management & message routing
├── repoManager.ts        # Repository auto-discovery & watching
├── avatarManager.ts      # GitHub/GitLab/Gravatar avatar fetching
├── extensionState.ts     # State persistence (node:fs/promises)
├── diffDocProvider.ts    # Custom document provider for diffs
├── repoFileWatcher.ts    # File system watcher
├── statusBarItem.ts      # Status bar UI
├── types.ts              # Type definitions (incl. message protocol)
├── utils.ts              # Utility functions
└── tsconfig.json         # TypeScript config (ES6 target, CommonJS)
```

<!-- AUTO-GENERATED:src-structure END -->

- **Runtime**: Node.js (VS Code Extension Host)
- **Build output**: `out/extension.js` (CJS, minified)
- **External dependencies**: `vscode` module only (esbuild external)

## web/ Directory (Webview Frontend)

<!-- AUTO-GENERATED:web-structure START -->

```
web/
├── main.ts               # Main GitGraphView class (commit table & UI interactions)
├── graph.ts              # SVG graph rendering engine
├── dropdown.ts           # Dropdown component
├── dialogs.ts            # Dialog UI (confirmation, form, error)
├── fileTree.ts           # File tree rendering
├── contextMenu.ts        # Right-click context menu
├── dates.ts              # Date formatting
├── branchLabels.ts       # Branch/tag label rendering
├── utils.ts              # Utilities (escapeHtml, sendMessage, SVG icons)
├── global.d.ts           # Global type definitions (acquireVsCodeApi, etc.)
└── tsconfig.json         # TypeScript config (ES2020 target, DOM lib)
```

<!-- AUTO-GENERATED:web-structure END -->

- **Runtime**: Browser (VS Code Webview / Chromium)
- **Build output**: `out/web.min.js` (IIFE, minified)
- **External dependencies**: None (everything is bundled)

## tests/ Directory

<!-- AUTO-GENERATED:tests-structure START -->

```
tests/
├── src/
│   └── utils.test.ts     # Tests for src/utils.ts
└── web/
    ├── setup.ts           # Test environment setup (acquireVsCodeApi mock)
    └── utils.test.ts      # Tests for web/utils.ts
```

<!-- AUTO-GENERATED:tests-structure END -->

- **Framework**: Vitest
- **Layout**: Split by runtime — `tests/src/` and `tests/web/`
- **Setup**: `tests/web/setup.ts` mocks the VS Code API

## notes/ Directory

<!-- AUTO-GENERATED:notes-structure START -->

```
notes/
├── modernization-plan.md         # 6-phase modernization plan (completed)
├── security-audit-2026-02-22.md  # Security audit record
└── plan-combine-branch-labels.md # Branch label consolidation plan
```

<!-- AUTO-GENERATED:notes-structure END -->

- Stores design notes, plans, and audit records
- Not part of build or test targets

## .github/ Directory

<!-- AUTO-GENERATED:github-structure START -->

```
.github/
├── workflows/
│   ├── ci.yaml           # CI: format → lint → typecheck → test
│   └── publish.yml       # Extension publishing workflow
└── dependabot.yml         # Dependency auto-update config
```

<!-- AUTO-GENERATED:github-structure END -->

## Build Output (out/)

| File               | Source             | Format                  |
| ------------------ | ------------------ | ----------------------- |
| `out/extension.js` | `src/extension.ts` | CommonJS, ES6, minified |
| `out/web.min.js`   | `web/main.ts`      | IIFE, ES2020, minified  |

The `out/` directory is removed by `pnpm run clean`.

## Related Documents

- [`CLAUDE.md`](../../CLAUDE.md): Claude Code guide (commands, architecture, coding conventions)
- [`notes/modernization-plan.md`](../../notes/modernization-plan.md): Modernization plan details
