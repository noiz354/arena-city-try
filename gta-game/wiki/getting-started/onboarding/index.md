---
title: "Onboarding — Role-Based Guides"
description: "Four audience-tailored entry points into CITY RUSH: Contributor, Staff Engineer, Executive, and Product Manager. Every claim grounded in the file:line-verified implementation wiki at docs/wiki/."
---

# Onboarding — Role-Based Guides

CITY RUSH is a GTA-style open-world browser game built with TypeScript, Vite, and Three.js (r185) — a single-page client-only app with exactly one runtime dependency ([`package.json:15-18`](https://github.com/noiz354/arena-city-try/blob/main/package.json#L15-L18)). It streams a seeded, deterministic 310 m city in 16 m chunks ([`src/systems/CityGenerator.ts:4-12`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/CityGenerator.ts#L4-L12)), runs hand-rolled collision instead of a physics engine, and orchestrates 27 gameplay/render systems from one fixed per-frame update sequence ([`src/game/Game.ts:385-467`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L385-L467)). There is no backend: progress persists to `localStorage` ([`src/systems/SaveManager.ts:21`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/SaveManager.ts#L21)), and optional telemetry is privacy-friendly and local-only unless an endpoint env var is set ([`src/analytics/tracker.ts:110`](https://github.com/noiz354/arena-city-try/blob/main/src/analytics/tracker.ts#L110)). The project is young — its entire git history spans a single day (2026-08-22, 33 commits; see the [changelog](../../changelog.md)) — which shows honestly in both its velocity and its rough edges.

## Pick Your Guide

| Guide | Audience | What You'll Learn | Time |
|-------|----------|-------------------|------|
| [Contributor Guide](./contributor-guide.md) | Engineers joining the project (assumes Python or JS background) | Setup, first PR, codebase patterns, testing workflow | ~30 min |
| [Staff Engineer Guide](./staff-engineer-guide.md) | Staff/principal engineers | The core architectural insight, design tradeoffs, decision log, technical debt register | ~45 min |
| [Executive Guide](./executive-guide.md) | VP/directors of engineering | Capabilities, risks, team topology, technology investment thesis | ~20 min |
| [Product Manager Guide](./product-manager-guide.md) | Product managers & non-engineering stakeholders | Features, player journeys, constraints, known limitations | ~20 min |

## How These Guides Are Grounded

Every guide cites either source files (`file:line`) or pages of the hand-made implementation wiki under [`docs/wiki/index.md`](https://github.com/noiz354/arena-city-try/blob/main/docs/wiki/index.md), where all 31 pages are file:line verified against `src/`. Known discrepancies between documentation comments and actual behavior are preserved as *Known Doc-vs-Code Findings* rather than smoothed over.

## Suggested Reading Order After Your Guide

1. [Project Overview & Architecture at a Glance](../getting-started/overview.md)
2. [Dev Setup & Build](../getting-started/setup.md)
3. [Running & Playing CITY RUSH](../getting-started/usage.md)
4. [Quick Reference — Debug Console](../getting-started/quick-reference.md)
5. Deep-dive system pages under [Deep Dive](../../deep-dive/ui-audio-support/save-manager.md), starting from your area of interest
