#!/usr/bin/env bash
# Restores the CI/CD workflows from CI_WORKFLOW.md into .github/workflows/
# Run from the repo root with an account/token that has the `workflows` permission:
#   bash gta-game/scripts/setup-gh-workflows.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DOC="$ROOT/gta-game/CI_WORKFLOW.md"
OUT="$ROOT/.github/workflows"
mkdir -p "$OUT"

# Extract the n-th ```yaml fenced block (1 = ci.yml, 2 = deploy-pages.yml)
extract() {
  awk -v n="$1" '
    /^```yaml/ { if (++count == n) inblock = 1; next }
    /^```/ { if (inblock) exit }
    inblock { print }
  ' "$DOC"
}

extract 1 > "$OUT/ci.yml"
extract 2 > "$OUT/deploy-pages.yml"

echo "Wrote:"
echo "  $OUT/ci.yml"
echo "  $OUT/deploy-pages.yml"
echo
echo "Review them, then:"
echo "  git add .github/workflows && git commit -m 'Enable CI/CD workflows' && git push"
