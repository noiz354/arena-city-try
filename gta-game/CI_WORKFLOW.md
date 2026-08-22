# CI Workflow (pending GitHub App permission)

The push of `.github/workflows/ci.yml` was rejected because the GitHub App token
used for this session lacks the `workflows` permission. The workflow is preserved
here — restore it by creating `.github/workflows/ci.yml` with this content and
pushing it with an account/token that has the `workflows` permission:

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
```
