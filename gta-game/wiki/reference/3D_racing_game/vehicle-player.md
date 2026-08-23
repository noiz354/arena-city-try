---
title: "3D_racing_game — Vehicle & Player"
description: "Raycast + chase cam — repos/3D_racing_game (copy penuh dari racing, byte-identical 46/46)."
---

# 3D_racing_game — Vehicle & Player

Raycast + chase cam — repos/3D_racing_game. Copy penuh dari `repos/racing` (leslieyip02/racing) — 46/46 files byte-identical, delta hanya `skills.md` di racing; whole clone evanbillet fork.

> Subpage katalog Reference Imports — deep dive file-level dari whole clone `repos/3D_racing_game/src/objects/Vehicle.ts` [repos/3D_racing_game/src/objects/Vehicle.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/3D_racing_game/src/objects/Vehicle.ts#L1) — keep `arena-city-try/main` (`wiki/catalogue.json:5`). Disk truth `D:/Downloads/22-8-26-threejs/repos/3D_racing_game/src/objects/Vehicle.ts`. Alias `repos/racing/src/objects/Vehicle.ts`.

## Audit File

- Primary: `repos/3D_racing_game/src/objects/Vehicle.ts` [repos/3D_racing_game/src/objects/Vehicle.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/3D_racing_game/src/objects/Vehicle.ts#L1)
- Alias utama: `repos/racing/src/objects/Vehicle.ts` (byte-identical)
- Paritas: `src/entities/Vehicle.ts` ← `repos/3D_racing_game/src/objects/Vehicle.ts`
- Paritas 2: `src/objects/Player.ts` ← `repos/3D_racing_game/src/objects/Player.ts` (thrust/chase cam)

## Pattern (Addy Osmani) + Skills relevan

**Data-driven + Strategy** — `repos/3D_racing_game/src/utils/interfaces.ts` VehicleData, Player thrust override. **Skill:** `threejs-gameplay-systems` → `physics-tuning`, `camera-systems`. Mirroring `skills/racing.md` / `skills/3D_racing_game.md`.

## PRPL & Scaffold (Vite/Yeoman)

**PRPL:** raycast 1/frame; friction 0.98; gravity dt-scaled. **Scaffold:** `repos/3D_racing_game/webpack.config.js` (mode:none) → Vite; `src/` + `data/` + `package.json` three 0.147 (upgrade 0.160+).

## Manfaat untuk CITY RUSH

Mengemudi CITY RUSH — copy penuh racing, pilih salah satu sebagai sumber. `// ponytail: copy penuh — alias, upgrade di racing saja, sync ke 3D_racing_game jika diverge`.

## Citations

Whole clone `D:/Downloads/22-8-26-threejs/repos/3D_racing_game` (evanbillet). Canonical `D:/Downloads/22-8-26-threejs/repos/racing` (leslieyip02, skills.md). Stub `gta-game-toolkit/reference/` dibiarkan read-only.
