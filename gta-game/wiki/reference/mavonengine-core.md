---
title: "mavonengine-core — Server, State Stack & Sync"
description: "Whole clone repos/mavonengine-core — 261 files, BaseGame headless loop, Actor state stack, Geckos/WebRTC NettCode, monorepo. Untuk multiplayer authoritative."
---

# mavonengine-core — Server, State Stack & Sync

Whole clone repos/mavonengine-core — 261 files, BaseGame headless loop, Actor state stack, Geckos/WebRTC NettCode, monorepo. Untuk multiplayer authoritative.

> **Addy Osmani:** Audit → Pattern classify → Scaffold (Vite/Yeoman) → PRPL → Document. Sumber whole clone `repos/mavonengine-core` [repos/mavonengine-core](https://github.com/noiz354/arena-city-try/blob/main/repos/mavonengine-core#L1) — katalog `wiki/catalogue.json` keep `arena-city-try/main` per `wiki/catalogue.json:5`.

## Audit — What it ships (whole clone)

- `repos/mavonengine-core/packages/core/src/BaseGame.ts` — Headless physics loop [repos/mavonengine-core/packages/core/src/BaseGame.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/mavonengine-core/packages/core/src/BaseGame.ts#L1)
- `repos/mavonengine-core/packages/core/src/World/Actor.ts` — State stack enter/leave/suspend [repos/mavonengine-core/packages/core/src/World/Actor.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/mavonengine-core/packages/core/src/World/Actor.ts#L1)
- `repos/mavonengine-core/packages/core/src/Networking/Server/Server.ts` — Geckos server + command buffer [repos/mavonengine-core/packages/core/src/Networking/Server/Server.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/mavonengine-core/packages/core/src/Networking/Server/Server.ts#L1)
- `repos/mavonengine-core/packages/core/src/Networking/syncState.ts` — Reconciliation [repos/mavonengine-core/packages/core/src/Networking/syncState.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/mavonengine-core/packages/core/src/Networking/syncState.ts#L1)

## Architecture Map → CITY RUSH

- `src/game/Game.ts:51` ← `repos/mavonengine-core/packages/core/src/BaseGame.ts`
- `src/entities/Player.ts:34` ← `repos/mavonengine-core/packages/core/src/World/Actor.ts`

## Pattern Classify (Addy Osmani)

- **Command** — queue per tick.
- **State** — Actor state[] stack.
- **Observer** — EventEmitter BaseGame→World.

## Performance Budget (PRPL) & Scaffold

**PRPL:** PRPL: server 20Hz, client RAF lerp, delta compress.

**Scaffold (Yeoman/Vite):** Monorepo `packages/` + `eslint.config.mjs` → `gta-game/src/main.ts:30`.

## Extension Playbook — Load when + Skills relevan

**Load when:** multiplayer / server authoritative. **Skills:** `save-systems` + `threejs-gameplay-systems`.

## Citations

Whole clone di `D:/Downloads/22-8-26-threejs/repos/mavonengine-core` (110 repos). Stub `gta-game-toolkit/reference/` dibiarkan (read-only). Mirror URL keep `https://github.com/noiz354/arena-city-try/blob/main/repos/mavonengine-core`.
