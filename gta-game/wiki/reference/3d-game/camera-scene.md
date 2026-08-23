---
title: "3d-game — Camera, Controls & Scene"
description: "Wall-clip + input + scene — repos/3d-game."
---

# 3d-game — Camera, Controls & Scene

Wall-clip + input + scene — repos/3d-game.

> Subpage katalog Reference Imports — deep dive file-level dari whole clone `repos/3d-game/js/game/components/camera.js` [repos/3d-game/js/game/components/camera.js](https://github.com/noiz354/arena-city-try/blob/main/repos/3d-game/js/game/components/camera.js#L1) — keep `arena-city-try/main` (`wiki/catalogue.json:5`). Disk truth `D:/Downloads/22-8-26-threejs/repos/3d-game/js/game/components/camera.js`.

## Audit File

- Primary: `repos/3d-game/js/game/components/camera.js` [repos/3d-game/js/game/components/camera.js](https://github.com/noiz354/arena-city-try/blob/main/repos/3d-game/js/game/components/camera.js#L1)
- Paritas: `src/systems/CameraRig.ts` ← `repos/3d-game/js/game/components/camera.js`

## Pattern (Addy Osmani) + Skills relevan

**Strategy** — ray-clip. **Skill:** `camera-systems`.

## PRPL & Scaffold (Vite/Yeoman)

**PRPL:** PRPL: clip ray 1/frame.

**Scaffold:** `camera.js`+`controls.js`+`scene.js`.

## Manfaat untuk CITY RUSH

Kamera anti-tembus tembok.
