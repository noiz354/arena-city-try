# PLAYTEST REPORT - CITY RUSH
**Date:** 2026-08-22
**Tester:** AI Agent (Chrome DevTools MCP)
**Port:** 7777

---

## Objective Measurements

| Metric | Value |
|--------|-------|
| FPS (avg) | 60-61 |
| FPS (min) | 57 |
| Boot time | <3 seconds |
| Console errors | 0 real, 2 warnings |

## Playability Scores

| Area | Score | Notes |
|------|-------|-------|
| Boot & Loading | 5/5 | Fast load, no errors |
| On-Foot Controls | 3/5 | WASD works, but spawn stuck between buildings |
| Driving | 2/5 | E enters vehicle, but spawn sedan wedged (0 km/h) |
| Shooting | 4/5 | LMB fires, ammo decrements correctly |
| City Rendering | 4/5 | Buildings, lamps, traffic visible when in open area |
| HUD | 4/5 | All elements working: health, money, FPS, minimap, ammo |
| NPCs | 3/5 | 14 thugs and 10 traffic cars detected, no pedestrians at spawn |
| Day/Night Cycle | 4/5 | Dawn sky observed, smooth transition |
| Stability | 4/5 | 60 FPS stable, no crashes during 15 min session |

---

## Bugs Found During Playtest

| # | Severity | Description |
|---|----------|-------------|
| 1 | CRITICAL | Spawn vehicle wedged between buildings at (9.1, 0.0, 7.0), speed stays 0 km/h, cannot drive |
| 2 | HIGH | Spawn point (0, 0.9, 9.8) stuck between buildings and trees, very hard to navigate out |
| 3 | MEDIUM | Teleporting via JS causes page reload/save conflict |
| 4 | LOW | THREE.Clock deprecated warning in console |
| 5 | LOW | PCFSoftShadowMap deprecated warning in console |

---

## Screenshots

Artifacts saved in gta-game/artifacts/:
- boot-screen.png, onfoot-move.png, onfoot-forward.png
- approaching-building.png, after-e-press.png, driving.png
- driving-freed.png, onfoot-exploring.png, open-area.png
- freed-trees.png, true-fresh.png, exploring-city.png
- teleported-open.png, shooting.png, back-open.png, near-vehicle.png
