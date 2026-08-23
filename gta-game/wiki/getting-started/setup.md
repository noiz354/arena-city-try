---
title: "Dev Setup & Build (Vite + TypeScript)"
description: "Prerequisites, install, dev server on port 7777, production build, typecheck and test commands — every command taken verbatim from package.json scripts."
---

# Dev Setup & Build (Vite + TypeScript)

## Why This Toolchain

CITY RUSH is a **Vite + TypeScript** single-page app with exactly one runtime dependency (`three`). There is no framework, no router, no CSS pipeline — `vite` serves and bundles TypeScript modules directly, and `tsc` runs as a separate type gate because the tsconfig sets `noEmit: true`. Everything you need to know lives in three files at the repo root:

| File | Role | Notable settings | Source |
|---|---|---|---|
| `package.json` | All npm scripts; deps = `three ^0.185.1` only | `"type": "module"` | [`package.json:5-24`](https://github.com/noiz354/arena-city-try/blob/main/package.json#L5-L24) |
| `vite.config.ts` | Dev/preview server + build target + Pages base path | port `7777`, `allowedHosts: true`, `target es2022` | [`vite.config.ts:5-18`](https://github.com/noiz354/arena-city-try/blob/main/vite.config.ts#L5-L18) |
| `tsconfig.json` | Strictness gate for both IDE and `npm run typecheck` | `strict`, `noUnusedLocals`, `noUnusedParameters`, include `src` only | [`tsconfig.json:2-19`](https://github.com/noiz354/arena-city-try/blob/main/tsconfig.json#L2-L19) |

Prerequisites: **Node.js with npm**. Runtime dependency is `three ^0.185.1`; dev tooling is `typescript ^7.0.2`, `vite ^8.2.2`, `tsx ^4.23.12`, `@playwright/test ^1.62.1` ([`package.json:15-23`](https://github.com/noiz354/arena-city-try/blob/main/package.json#L15-L23)). Use a Node version recent enough for Vite 8.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
graph LR
    PKG["package.json scripts"] --> DEV["dev -> vite.config.ts"]
    PKG --> BUILD["build -> tsc then vite"]
    PKG --> CHK["check -> tsc + tsx smoke"]
    PKG --> VIS["test:visual -> playwright.config.ts"]
    TS["tsconfig.json"] --> TSC["tsc --noEmit gate"]
    BUILD --> TSC
    VC["vite.config.ts<br>port 7777 / GH_PAGES base"] --> DEV
    VC --> BUILD
    PWCFG["playwright.config.ts<br>builds + previews :4173"] --> VIS
```

<!-- Sources: package.json:6-24, vite.config.ts:3-18, tsconfig.json:1-19, playwright.config.ts:1-25 -->


## The Commands

Every command below is a verbatim script from [`package.json:6-13`](https://github.com/noiz354/arena-city-try/blob/main/package.json#L6-L13) — nothing here is invented:

| Command | Underlying script | What it does |
|---|---|---|
| `npm install` | — | Installs dependencies into `node_modules/` |
| `npm run dev` | `vite --host 0.0.0.0` | Dev server on **http://localhost:7777**, LAN-exposed |
| `npm run build` | `tsc && vite build` | Type-checks first, then bundles to `dist/` — a type error fails the build |
| `npm run preview` | `vite preview --host 0.0.0.0` | Serves the production bundle (default Vite preview port **4173**) |
| `npm run typecheck` | `tsc --noEmit` | Types only, no output files |
| `npm test` | `tsx tests/smoke.mjs` | Headless smoke tests via tsx |
| `npm run check` | `tsc --noEmit && tsx tests/smoke.mjs` | Typecheck + smoke — **the pre-commit gate per AGENTS.md** |
| `npm run test:visual` | `playwright test` | Playwright visual spec against the production preview |

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
flowchart TD
    A["npm install"] --> B["npm run dev<br>port 7777"]
    A --> C["npm run check<br>tsc --noEmit then smoke.mjs"]
    C --> D["commit"]
    D --> E["npm run build<br>tsc && vite build -> dist/"]
    E --> F{"GH_PAGES=1 ?"}
    F -- yes --> G["base = /arena-city-try/"]
    F -- no --> H["base = /"]
    G --> I["npm run preview<br>port 4173"]
    H --> I
    I --> J["npm run test:visual<br>Playwright vs localhost:4173"]
```

<!-- Sources: package.json:6-13, vite.config.ts:3-18, playwright.config.ts:19-24 -->

## Dev Server Behavior You Will Notice

Two non-default settings exist for sandboxed/cloud environments and matter when the page misbehaves:

| Setting | Value | Why | Source |
|---|---|---|---|
| `server.port` | `7777` | Fixed port; QA docs and Playwright evidence assume it | [`vite.config.ts:9-10`](https://github.com/noiz354/arena-city-try/blob/main/vite.config.ts#L9-L10) |
| `server.allowedHosts` | `true` | Preview hosts served from a different host than localhost | [`vite.config.ts:11-12`](https://github.com/noiz354/arena-city-try/blob/main/vite.config.ts#L11-L12) |
| `build.target` | `es2022` | Matches `tsconfig` target ES2022 | [`vite.config.ts:14-16`](https://github.com/noiz354/arena-city-try/blob/main/vite.config.ts#L14-L16) |
| `chunkSizeWarningLimit` | `1500` kB | three.js is large; silences the default warning | [`vite.config.ts:16`](https://github.com/noiz354/arena-city-try/blob/main/vite.config.ts#L16) |

### GitHub Pages base path

The site is published under `/arena-city-try/`, but only for Pages builds. The switch is an environment variable read inside the config — do not edit the file to deploy:

```sh
GH_PAGES=1 npm run build   # base becomes /arena-city-try/
```

Source: [`vite.config.ts:3-7`](https://github.com/noiz354/arena-city-try/blob/main/vite.config.ts#L3-L7). Changing this base path is flagged ask-first in [AGENTS.md](https://github.com/noiz354/arena-city-try/blob/main/AGENTS.md).

## TypeScript Contract

The compiler is deliberately strict so that "it compiles" is a meaningful bar:

| Flag | Effect on contributors | Source |
|---|---|---|
| `strict: true` | Full null/any checking across `src/` | [`tsconfig.json:13`](https://github.com/noiz354/arena-city-try/blob/main/tsconfig.json#L13) |
| `noUnusedLocals` / `noUnusedParameters` | Zero unused symbols tolerated — dead code will not compile | [`tsconfig.json:14-15`](https://github.com/noiz354/arena-city-try/blob/main/tsconfig.json#L14-L15) |
| `allowImportingTsExtensions` | Imports may carry explicit `.ts` extensions | [`tsconfig.json:9`](https://github.com/noiz354/arena-city-try/blob/main/tsconfig.json#L9) |
| `moduleResolution: "bundler"` | Modern Vite-style resolution; pairs with `"module": "ESNext"` | [`tsconfig.json:8`](https://github.com/noiz354/arena-city-try/blob/main/tsconfig.json#L8) |
| `"include": ["src"]` | Only `src/` is type-checked; tests/docs are excluded from tsc | [`tsconfig.json:19`](https://github.com/noiz354/arena-city-try/blob/main/tsconfig.json#L19) |
| `types: ["vite/client"]` | Enables `import.meta.env.DEV` etc., used by boot error overlays | [`tsconfig.json:17`](https://github.com/noiz354/arena-city-try/blob/main/tsconfig.json#L17), [`src/main.ts:13`](https://github.com/noiz354/arena-city-try/blob/main/src/main.ts#L13) |

## Test Infrastructure

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
sequenceDiagram
    autonumber
    participant Dev as Contributor
    participant PW as Playwright runner
    participant WS as webServer hook
    participant SV as vite preview :4173
    participant BR as Chromium 1280x720
    Dev->>PW: npx playwright test / npm run test:visual
    PW->>WS: start webServer if not up
    WS->>SV: npm run build && npm run preview
    WS->>BR: launch against http://localhost:4173
    BR->>SV: run visual.spec.ts cases (90 s timeout)
    BR-->>PW: screenshots on failure, trace retained
```

<!-- Sources: playwright.config.ts:7-24 -->

Key facts: tests live in `tests/` matched to `visual.spec.ts` only ([`playwright.config.ts:8-9`](https://github.com/noiz354/arena-city-try/blob/main/playwright.config.ts#L8-L9)); the webServer command builds fresh each run unless a server already occupies 4173 outside CI ([`playwright.config.ts:20-22`](https://github.com/noiz354/arena-city-try/blob/main/playwright.config.ts#L20-L22)); browsers are installed in CI via `npx playwright install --with-deps chromium` ([`playwright.config.ts:4-6`](https://github.com/noiz354/arena-city-try/blob/main/playwright.config.ts#L4-L6)). For interactive QA beyond the visual spec, see [Quick Reference — Debug Console & QA Entry Points](./quick-reference.md).

## Recommended Workflow

1. `npm install` once.
2. Keep `npm run dev` running; iterate against http://localhost:7777.
3. Before committing: `npm run check` (typecheck + smoke).
4. Before pushing UI/rendering changes: `npm run test:visual`.
5. Never commit changes to `dist/`, `test-results/`, or `node_modules/` (see [AGENTS.md](https://github.com/noiz354/arena-city-try/blob/main/AGENTS.md)).

## Related Pages

| Page | Relationship |
|------|-------------|
| [Project Overview & Architecture](./overview.md) | What the toolchain builds |
| [Running & Playing CITY RUSH](./usage.md) | How to exercise the game locally once the server is up |
| [Quick Reference — Debug Console](./quick-reference.md) | In-browser QA hooks used alongside Playwright testing |
| [ColliderDebug — F3 Overlay](../deep-dive/ui-audio-support/collider-debug.md) | One of the debug tools you can drive during local dev |
