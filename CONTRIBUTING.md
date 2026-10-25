# Contributing to Git Keizu

Thank you for considering a contribution. Bug fixes, small improvements, and new features are all welcome. Git Keizu is a personal project maintained in spare time, so reviews may take a while.

For anything larger than a small fix, opening an issue first helps us agree on the approach before you spend time on it.

## Development setup

Supported build environments are Linux, macOS, and WSL. The build scripts use Unix shell commands such as `rm` and `cp`, so on Windows please develop inside WSL.

1. Install Node.js 22 (the version CI uses).
2. Enable Corepack so the pinned pnpm version is used, then install dependencies:

   ```bash
   corepack enable
   pnpm install
   ```

3. Open the repository in VS Code and press `F5` (**Run Extension**). It compiles the extension and opens an Extension Development Host with your build loaded.

Other useful commands:

| Command            | What it does                                  |
| ------------------ | --------------------------------------------- |
| `pnpm run compile` | Build `out/extension.js` and `out/web.min.js` |
| `pnpm test`        | Run the Vitest suite in watch mode            |
| `pnpm run package` | Build a `.vsix` you can install locally       |

## Checks

CI runs these on every pull request. Please make sure they pass locally before you push:

```bash
pnpm run format     # oxfmt --check (fix with: pnpm run format:fix)
pnpm run lint       # oxlint
pnpm run typecheck  # tsc for src/ and web/
pnpm run test:ci    # vitest run
```

CI also runs `pnpm audit`. If it fails on main as well, the failure is not caused by your change.

## Code conventions

[`AGENTS.md`](AGENTS.md) describes the architecture and the conventions the codebase follows. In short:

- `src/` runs in the extension host and `web/` in the webview. They talk through the typed messages in `src/types.ts`.
- Use template literals instead of `+` for strings, and `async`/`await` instead of `.then()` chains.
- Run Git through the `spawn()` helpers in `src/dataSource.ts`, never `exec`.
- User-facing settings live under `git-keizu.*`.

For tests, [`docs/test-supplement.md`](docs/test-supplement.md) lists the project-specific rules.

### User-facing text

The extension ships in English and Japanese. When you add or change text that users see, update both languages:

| Where the text appears             | English                     | Japanese                    |
| ---------------------------------- | --------------------------- | --------------------------- |
| Settings descriptions              | `package.nls.json`          | `package.nls.ja.json`       |
| Extension host (dialogs, messages) | `l10n/bundle.l10n.json`     | `l10n/bundle.l10n.ja.json`  |
| Webview (graph, menus, panels)     | `l10n/web/web.l10n.en.json` | `l10n/web/web.l10n.ja.json` |

If you cannot write Japanese, put the English text in the Japanese file too and mention it in the pull request. The maintainer will translate it.

### Code from other projects

If you copy or adapt code from another project, say so in the file header and add an entry to [`ThirdPartyNotices.txt`](ThirdPartyNotices.txt) with the source, copyright, and license. The build minifies the code and drops ordinary comments, and the packaged extension contains only the build output, so `ThirdPartyNotices.txt` is where the notice actually reaches users.

## What the maintainer handles

You do not need to update these in your pull request:

- **Test perspective documents** (`docs/testing/perspectives/`, including `INDEX.md`). They are maintained with tooling that is not in this repository. If you do edit them, write in English.
- **`CHANGELOG.md` and the version number.** They are updated when a release is prepared.

## Pull requests

- Open the pull request against `main`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `build:`, `chore:`).
- In the description, explain what changes for users and why, and list anything you checked by hand in VS Code.
