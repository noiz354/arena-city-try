---
title: "bloodwave — Scene, HUD & Audio"
description: "Terrain + HUD + Web Audio — repos/bloodwave-fps-game."
---

# bloodwave — Scene, HUD & Audio

Terrain + HUD + Web Audio — repos/bloodwave-fps-game.

> Subpage katalog Reference Imports — deep dive file-level dari whole clone `repos/bloodwave-fps-game/js/scene.js` [repos/bloodwave-fps-game/js/scene.js](https://github.com/noiz354/arena-city-try/blob/main/repos/bloodwave-fps-game/js/scene.js#L1) — keep `arena-city-try/main` (`wiki/catalogue.json:5`). Disk truth `D:/Downloads/22-8-26-threejs/repos/bloodwave-fps-game/js/scene.js`.

## Audit File

- Primary: `repos/bloodwave-fps-game/js/scene.js` [repos/bloodwave-fps-game/js/scene.js](https://github.com/noiz354/arena-city-try/blob/main/repos/bloodwave-fps-game/js/scene.js#L1)
- Paritas: `src/systems/AudioManager.ts` ← `repos/bloodwave-fps-game/js/audio.js`

## Pattern (Addy Osmani) + Skills relevan

**Facade** — scene build terrain+trees. **Skill:** `threejs-audio-generator`.

## PRPL & Scaffold (Vite/Yeoman)

**PRPL:** PRPL: instanced trees 1 draw; audio pool gesture.

**Scaffold:** `scene.js`+`hud.js`+`audio.js` triad.

## Manfaat untuk CITY RUSH

HUD & audio pooling CITY RUSH.
