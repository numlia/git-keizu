#!/usr/bin/env bash
# Rebuilds every README capture: builds the extension, creates two fresh demo repositories,
# runs the captures and renders the results into resources/screenshots.
# Usage: capture-all.sh <demo-root>   (must not exist yet; e.g. ~/trailmap-demo)
# The demo root shows up in the Branch Cleanup worktree column, so pick a neutral path.
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
readonly DEMO_ROOT="${1:?usage: capture-all.sh <demo-root>}"

(cd "${REPO_ROOT}" && pnpm run compile)
mkdir "${DEMO_ROOT}"
# The stills create a branch that the file history capture then shows; the hero creates a
# worktree, so it gets a repository of its own.
bash "${SCRIPT_DIR}/make-demo-repo.sh" "${DEMO_ROOT}/main" > /dev/null
bash "${SCRIPT_DIR}/make-demo-repo.sh" "${DEMO_ROOT}/hero" > /dev/null
node "${SCRIPT_DIR}/capture-stills.mjs" "${DEMO_ROOT}/main/trailmap"
node "${SCRIPT_DIR}/capture-file-history.mjs" "${DEMO_ROOT}/main/trailmap"
node "${SCRIPT_DIR}/capture-hero.mjs" "${DEMO_ROOT}/hero/trailmap"
bash "${SCRIPT_DIR}/render.sh"
