#!/usr/bin/env bash
# Publishes the game to GitHub Pages via the gh-pages branch.
# Requires no `workflows` permission — just a normal git push.
#
# Safe by design: it works on a temporary clone, so the working repo (and its
# .git) is never touched.
#
# After running: Settings → Pages → Deploy from a branch → gh-pages → / (root) → Save
#
# Usage:
#   bash gta-game/scripts/publish-gh-pages.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GAME="$ROOT/gta-game"
REMOTE="$(git -C "$ROOT" remote get-url origin)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo ">> Building with GH_PAGES=1 (base /arena-city-try/)"
(cd "$GAME" && GH_PAGES=1 npm run build)

echo ">> Cloning fresh worktree (repo untouched)"
if git clone --quiet --branch gh-pages "$REMOTE" "$WORK/gh" 2>/dev/null; then
  : # existing gh-pages branch checked out
else
  git clone --quiet "$REMOTE" "$WORK/gh"
  (cd "$WORK/gh" && git checkout --quiet --orphan gh-pages)
fi

echo ">> Replacing contents with the fresh build"
(
  cd "$WORK/gh"
  # wipe everything except .git so no stale repo files leak into the site
  find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
  cp -r "$GAME/dist/." .
  touch .nojekyll
  git add -A
  if git diff --cached --quiet; then
    echo "No changes — gh-pages already up to date."
    exit 0
  fi
  git -c user.name="CI Bot" -c user.email="ci@localhost" commit -q -m "Deploy to GitHub Pages"
  echo ">> Pushing gh-pages"
  git push --quiet --force origin gh-pages
)

echo ">> Done. Enable Pages: Settings → Pages → Deploy from a branch → gh-pages → / (root)"
