# Technology Stack

## Architecture

**Two-runtime VS Code extension**: The codebase consists of two isolated TypeScript projects that communicate via a typed message protocol.

- **Extension Host** (`src/`): Node.js backend running in VS Code's extension host process. Manages Git operations, state persistence, avatar fetching, and repository discovery.
- **Webview** (`web/`): Browser-based frontend running in VS Code's Chromium webview. Renders the commit graph, handles user interactions, and delegates all Git operations to the extension host.

**Communication**: The webview posts `RequestMessage` to the extension; the extension processes it (typically spawning a Git subprocess) and sends back a `ResponseMessage`. Both message types are discriminated unions defined in `src/types.ts`.

## Core Technologies

- **Language**: TypeScript 5.9 (strict mode enabled in both projects)
- **Runtime (backend)**: Node.js (CommonJS, ES6 target)
- **Runtime (frontend)**: Browser/Chromium (IIFE, ES2020 target)
- **Extension API**: VS Code Extension API (`@types/vscode ~1.74.0`)
- **Bundler**: esbuild (separate builds for src and web)
- **Package Manager**: pnpm 10.29.3 (via `npm exec --yes -- pnpm@10.29.3` when no global pnpm)

## Key Libraries

| Category  | Library          | Purpose                                                              |
| --------- | ---------------- | -------------------------------------------------------------------- |
| Build     | esbuild          | Bundle src → `out/extension.js`, web → `out/web.min.js`              |
| Lint      | oxlint + plugins | Static analysis (import, typescript, unicorn plugins)                |
| Format    | oxfmt            | Code formatting (printWidth 100, 2-space indent, no trailing commas) |
| Test      | Vitest           | Unit testing with v8 coverage                                        |
| Packaging | @vscode/vsce     | VS Code extension packaging and publishing                           |

No runtime dependencies — the extension uses only VS Code API and Node.js built-ins.

## Development Standards

### Type Safety

- **TypeScript strict mode**: Both `src/tsconfig.json` and `web/tsconfig.json` enable `"strict": true`
- **noImplicitAny**: Enabled in both projects
- **noUnusedLocals / noUnusedParameters**: Enabled in both projects
- **oxlint `typescript/no-explicit-any`**: Warned (not error, but flagged)
- **Discriminated unions**: Message protocol uses `command` field as discriminant for type-safe request/response handling
- **Type-only files**: `src/types.ts` for all shared interfaces, `web/global.d.ts` for webview globals

### Code Quality

- **Linter**: oxlint with plugins: `import`, `typescript`, `unicorn`, `simple-import-sort`
- **Formatter**: oxfmt (printWidth 100, 2-space indent, no trailing commas)
- **Key rules enforced**:
  - `eqeqeq`: Strict equality only
  - `no-var`: const/let only
  - `unicorn/prefer-node-protocol`: `node:` prefix for built-ins
  - `simple-import-sort/imports`: Sorted imports
  - `no-eval` / `no-implied-eval`: Security
  - `no-throw-literal`: Proper error objects

### Code Conventions

- **Node built-ins**: Always use `node:` protocol prefix (`node:fs/promises`, `node:path`, `node:child_process`)
- **Strings**: Template literals everywhere (no `+` concatenation)
- **Async**: `async/await` only (no `.then()` chains, no callbacks for fs)
- **Git commands**: Always use `spawn()` via `runGitCommandSpawn`/`spawnGit` in `dataSource.ts` (never `exec` — shell injection prevention)

### Testing

- **Framework**: Vitest (v4)
- **Test files**: `tests/src/utils.test.ts`, `tests/web/utils.test.ts` (36 tests)
- **Setup**: `tests/web/setup.ts` mocks `acquireVsCodeApi()` for webview tests
- **Coverage**: v8 provider, covers `src/**/*.ts` and `web/**/*.ts` (excludes `types.ts`, `global.d.ts`)
- **CI integration**: `pnpm run test:ci` (vitest run)
- **Test supplement**: [`docs/test-supplement.md`](docs/test-supplement.md)

## Development Environment

### Required Tools

- Node.js 22 (CI matrix)
- pnpm 10.29.3 (via corepack or `npm exec`)
- VS Code (for testing the extension)

### Common Commands

```bash
# Install
npm exec --yes -- pnpm@10.29.3 install

# Quality checks (CI order)
pnpm run format          # oxfmt --check
pnpm run lint            # oxlint
pnpm run typecheck       # tsc -p ./src --noEmit && tsc -p ./web --noEmit
pnpm run test:ci         # vitest run

# Fix
pnpm run format:fix      # oxfmt .
pnpm run lint:fix        # oxlint --fix

# Build
pnpm run compile         # clean + compile-src + compile-web

# Single test
pnpm exec vitest run tests/src/utils.test.ts
```

### CI Pipeline

GitHub Actions workflow (`ci.yaml`):

- Triggers: push to main, PRs to main
- Steps: install → format check → lint → typecheck → test
- Node 22, pnpm via corepack

## Security Architecture

Security is a core design principle (27-item audit completed):

- **Shell injection prevention**: All git commands use `child_process.spawn()` exclusively; `exec()` removed entirely
- **Git binary validation**: `isValidGitPath()` validates absolute path + `git`/`git.exe` basename
- **Input validation**: Commit hash format validation, repository path validation against registered repos, path traversal prevention (`..` check)
- **XSS prevention**: `escapeHtml()` applied to all dynamic values inserted into webview HTML
- **SSRF protection**: Avatar fetch URLs restricted to allowlist (GitHub, GitLab, Gravatar)

## Message Protocol

The extension uses a typed request/response message protocol:

- **`RequestMessage`**: Discriminated union (21 command types) — webview → extension
- **`ResponseMessage`**: Discriminated union (21 command types) — extension → webview
- **Discriminant field**: `command` (string literal type)
- **Pattern**: Webview calls `sendMessage()` → extension's `onDidReceiveMessage` handler dispatches to `DataSource` methods → response posted back

## Settings Namespace

All user-facing settings under `git-keizu.*` (11 settings):

- Graph appearance: `graphColours`, `graphStyle`, `tabIconColourTheme`
- Display: `dateFormat`, `dateType`, `showUncommittedChanges`, `showCurrentBranchByDefault`
- Behavior: `fetchAvatars`, `initialLoadCommits`, `loadMoreCommits`
- Discovery: `maxDepthOfRepoSearch`, `showStatusBarItem`

Read via `src/config.ts` wrapper around `vscode.workspace.getConfiguration('git-keizu')`.

## Key Technical Decisions

| Decision                              | Rationale                                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `spawn()` over `exec()`               | Shell injection prevention — no shell interpretation of arguments                      |
| Separate tsconfig per runtime         | src targets Node.js (ES6/CJS), web targets browser (ES2020/IIFE)                       |
| esbuild over webpack/rollup           | Fast bundling, minimal config, single-file output for both runtimes                    |
| oxlint + oxfmt over ESLint + Prettier | Faster execution, unified Rust-based toolchain                                         |
| No runtime dependencies               | Extension relies only on VS Code API + Node.js built-ins, minimizing supply chain risk |
| Typed message protocol                | Discriminated unions ensure type-safe communication between runtimes                   |

## DDL Management / Migration Strategy

Not applicable — this is a VS Code extension with no database. State is persisted via VS Code's `globalState` and local filesystem (avatar cache, repo state).

---

_Document standards and patterns, not every dependency_
