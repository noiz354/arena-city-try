# CI/CD — GitHub Actions workflows (pending GitHub App permission)

The session's GitHub App token lacks the `workflows` permission, so
`.github/workflows/*.yml` cannot be pushed from this sandbox (GitHub rejects
the push). The full CI + CD configuration is preserved here.

## Enable in one command

Run `scripts/setup-gh-workflows.sh` (from this repo root) with an account that
has the `workflows` permission, then commit + push the generated files:

```bash
bash gta-game/scripts/setup-gh-workflows.sh
git add .github/workflows
git commit -m "Enable CI/CD workflows"
git push
```

The script writes `.github/workflows/ci.yml` and
`.github/workflows/deploy-pages.yml` (contents below).

---

## 1. Continuous Integration — `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: ['**']
  pull_request:

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: gta-game
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: gta-game/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Type-check
        run: npx tsc --noEmit

      - name: Run smoke tests
        run: npm test

      - name: Production build
        run: npm run build

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: gta-game/dist

  visual-smoke:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: gta-game
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: gta-game/package-lock.json
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      - name: Visual smoke test (boot + render + zero console errors)
        run: npm run test:visual
      - name: Upload screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-artifacts
          path: gta-game/artifacts/
          if-no-files-found: ignore
```

## 2. Continuous Deployment — GitHub Pages — `.github/workflows/deploy-pages.yml`

Serves the game at `https://<owner>.github.io/arena-city-try/` (the Vite `base`
is set automatically by the `GH_PAGES=1` env var in the deploy step).

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: gta-game
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: gta-game/package-lock.json
      - name: Install dependencies
        run: npm ci
      - name: Build for GitHub Pages
        run: GH_PAGES=1 npm run build
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: gta-game/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

> In the repo settings (Settings → Pages) set **Source: GitHub Actions** so the
> workflow can publish.

## 3. Alternative (no workflows permission needed): `gh-pages` branch

`scripts/publish-gh-pages.sh` builds (`GH_PAGES=1`) and force-pushes a
`gh-pages` branch — a plain git push, no `workflows` permission needed.
Then enable it with one click:
**Settings → Pages → Deploy from a branch → `gh-pages` → `/ (root)` → Save.**

Rebuild + re-publish any time:

```bash
bash gta-game/scripts/publish-gh-pages.sh
```
