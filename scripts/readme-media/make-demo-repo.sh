#!/usr/bin/env bash
# Builds a small, deterministic demo repository for README captures: branches, merges, a rename,
# tags, remote-tracking branches, a squash-merged branch, a commit with enough labels to fold into
# a +N badge, a stash, uncommitted changes, and a linked and a detached-HEAD worktree.
# Usage: make-demo-repo.sh <base-dir>   (the base dir must not exist yet)
set -euo pipefail

readonly BASE_DIR="${1:?usage: make-demo-repo.sh <base-dir>}"
readonly TZ_OFFSET="+0900"
epoch=1790380800 # 2026-09-26 09:00 +09:00

mkdir "${BASE_DIR}"
mkdir "${BASE_DIR}/template"
cat > "${BASE_DIR}/template/config" <<'CONFIG'
[user]
    name = Mika Sato
    email = mika@example.com
[commit]
    gpgsign = false
[tag]
    gpgsign = false
[remote "origin"]
    url = https://example.com/trailmap.git
    fetch = +refs/heads/*:refs/remotes/origin/*
[branch "main"]
    remote = origin
    merge = refs/heads/main
[branch "release/1.2"]
    remote = origin
    merge = refs/heads/release/1.2
[branch "feature/offline-mode"]
    remote = origin
    merge = refs/heads/feature/offline-mode
[branch "feature/dark-theme"]
    remote = origin
    merge = refs/heads/feature/dark-theme
CONFIG
git init -q -b main --template="${BASE_DIR}/template" "${BASE_DIR}/trailmap"
cd "${BASE_DIR}/trailmap"

as() {
  export GIT_AUTHOR_NAME="$1" GIT_AUTHOR_EMAIL="$2" GIT_COMMITTER_NAME="$1" GIT_COMMITTER_EMAIL="$2"
}
mika() { as "Mika Sato" "mika@example.com"; }
daniel() { as "Daniel Park" "daniel@example.com"; }
lena() { as "Lena Fischer" "lena@example.com"; }

advance() {
  epoch=$((epoch + $1 * 60))
  export GIT_AUTHOR_DATE="@${epoch} ${TZ_OFFSET}" GIT_COMMITTER_DATE="@${epoch} ${TZ_OFFSET}"
}

# c <minutes-later> <file-in-repo> <message> <line...>: appends lines to a file and commits.
c() {
  advance "$1"
  mkdir -p "$(dirname "./$2")"
  printf '%s\n' "${@:4}" >> "./$2"
  git add -A
  git commit -q -m "$3"
}

# m <minutes-later> <branch> <message>: merges a branch with a merge commit.
m() {
  advance "$1"
  git merge -q --no-ff "$2" -m "$3"
}

# track <branch>: records the branch's current commit as its remote-tracking branch.
track() {
  git update-ref "refs/remotes/origin/$1" "$1"
}

mika
c 0 package.json "Initial commit" '{ "name": "trailmap", "version": "1.0.0" }'
c 40 src/renderer.ts "Add map tile renderer" 'export function renderTiles(zoom: number) {' '  return loadTiles(zoom);' '}'
daniel
c 55 src/api.ts "Add trail API client" 'export async function fetchTrails(region: string) {' '  return request(`/trails?region=${region}`);' '}'
mika
c 30 README.md "Write project README" '# Trailmap' '' 'Plan your next hike on an interactive trail map.'
git tag -a v1.0.0 -m "v1.0.0"

git switch -q -c feature/elevation-profile
lena
c 120 src/elevation.ts "Add elevation profile chart" 'export function drawProfile(points: number[]) {' '  return chart(points);' '}'
git switch -q main
git switch -q -c fix/tile-cache
daniel
c 35 src/renderer.ts "Fix stale tiles after zooming out" '// Invalidate cached tiles when the zoom level changes.'
git switch -q feature/elevation-profile
lena
c 50 src/elevation.ts "Smooth elevation samples" 'export const SMOOTHING_WINDOW = 5;'
git switch -q main
daniel
m 25 fix/tile-cache "Merge branch 'fix/tile-cache'"
git branch -q -d fix/tile-cache
mika
c 40 package.json "Update map dependencies" '// maplibre-gl 5.2'
git switch -q feature/elevation-profile
lena
c 45 src/elevation.ts "Show total ascent and descent" 'export function totals(points: number[]) {' '  return summarize(points);' '}'
git switch -q main
m 30 feature/elevation-profile "Merge branch 'feature/elevation-profile'"
git branch -q -d feature/elevation-profile
mika
advance 10
git mv src/renderer.ts src/map.ts
git commit -q -m "Rename renderer module to map"
# Enough labels on one commit to fold the rest into a +N badge.
git branch support/1.1
git branch hotfix/gps-drift
git branch backport/1.0
git tag v1.1.0-rc.2
git tag nightly-0926
c 20 CHANGELOG.md "Update CHANGELOG for v1.1.0" '## 1.1.0' '- Elevation profile' '- Tile cache fix'
git tag -a v1.1.0 -m "v1.1.0"

git switch -q -c feature/offline-mode
daniel
c 90 src/offline.ts "Add service worker for offline tiles" 'self.addEventListener("fetch", handleFetch);'
git switch -q main
git switch -q -c feature/dark-theme
lena
c 35 src/theme.ts "Add dark map style" 'export const darkStyle = loadStyle("dark");'
git switch -q feature/offline-mode
daniel
c 40 src/offline.ts "Cache trail metadata in IndexedDB" 'export const STORE_NAME = "trails";'
git switch -q main
git switch -q -c fix/search-debounce
mika
c 25 src/search.ts "Debounce trail search input" 'export const SEARCH_DEBOUNCE_MS = 250;'
c 20 src/search.ts "Cancel stale search requests" 'let controller: AbortController | undefined;'
git switch -q main
m 30 fix/search-debounce "Merge branch 'fix/search-debounce'"
git switch -q feature/dark-theme
lena
c 45 src/theme.ts "Follow the system color scheme" 'export const prefersDark = matchMedia("(prefers-color-scheme: dark)");'
git switch -q feature/offline-mode
daniel
c 35 src/offline.ts "Show an offline banner" 'export function showOfflineBanner() {}'
git switch -q main
mika
c 25 src/map.ts "Add trail difficulty legend" 'export function renderLegend() {' '  return legend(DIFFICULTY_LEVELS);' '}'
git switch -q -c release/1.2
c 30 package.json "Bump version to 1.2.0-rc.1" '// 1.2.0-rc.1'
git tag -a v1.2.0-rc.1 -m "v1.2.0-rc.1"
git switch -q main
git switch -q -c feature/trail-photos
lena
c 20 src/photos.ts "Add trail photo gallery" 'export function renderGallery(trailId: string) {}'
c 15 src/photos.ts "Lazy-load trail photos" 'export const PHOTO_PAGE_SIZE = 12;'
git switch -q main
mika
advance 10
git merge -q --squash feature/trail-photos
git commit -q -m "Add trail photo gallery (#14)"
daniel
c 40 src/api.ts "Retry trail requests on network errors" 'export const MAX_RETRIES = 3;'
git switch -q feature/dark-theme
lena
c 30 src/theme.ts "Tune contrast of trail lines" 'export const TRAIL_LINE_OPACITY = 0.85;'
git switch -q main
mika
c 35 src/map.ts "Highlight the selected trail" 'export function highlightTrail(id: string) {' '  return setFeatureState(id, { selected: true });' '}'

track main
track release/1.2
track feature/offline-mode
track feature/dark-theme

git switch -q feature/offline-mode
daniel
c 30 src/offline.ts "Prefetch tiles along a planned route" 'export function prefetchRoute(route: string) {}'
git switch -q main
mika
c 25 src/search.ts "Search trails by difficulty" 'export function byDifficulty(level: string) {}'

git worktree add -q "${BASE_DIR}/trailmap-dark-theme" feature/dark-theme
git worktree add -q --detach "${BASE_DIR}/trailmap-review" v1.1.0

printf '%s\n' 'export const DIFFICULTY_COLORS = ["#2e7d32", "#f9a825", "#c62828"];' >> ./src/map.ts
git stash push -q -m "WIP: trail difficulty colors"
printf '%s\n' 'export const DEFAULT_ZOOM = 12;' >> ./src/map.ts
printf '%s\n' '- Trail difficulty legend' >> ./CHANGELOG.md

git log --oneline --graph --all --decorate
