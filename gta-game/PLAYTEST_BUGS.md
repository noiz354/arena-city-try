# PLAYTEST BUGS - CITY RUSH

**Date:** 2026-08-22

## CRITICAL

### BUG-001: Spawn vehicle wedged between buildings
- **Location:** Vehicle at (9.1, 0.0, 7.0)
- **Reproduction:** Start game, press E to enter sedan
- **Result:** Speed stays 0 km/h, vehicle cannot move
- **Impact:** Core driving feature broken on first vehicle
- **Root cause:** CityGenerator places sedan in collision with building geometry
- **Fix:** Move sedan spawn to open road position, e.g. (12, 0.0, 16)

## HIGH

### BUG-002: Player spawn stuck between buildings/trees
- **Location:** Player spawns at (0, 0.9, 9.8)
- **Reproduction:** Fresh game start
- **Result:** Player is wedged between buildings, hard to move out
- **Impact:** Poor first impression, confusing UX
- **Root cause:** Spawn point collision with nearby building/tree geometry
- **Fix:** Move spawn to open area, e.g. (0, 0.9, 16) or check clearance

## MEDIUM

### BUG-003: JS teleport causes page reload
- **Reproduction:** window.game.player.position.set(32, 0.9, 30)
- **Result:** Page reloads, save/load conflict
- **Impact:** Cannot debug/test positions via console
- **Root cause:** Save system triggers on position change or collision edge case
- **Fix:** Add debounce to save triggers, or guard against rapid position jumps

## LOW

### BUG-004: THREE.Clock deprecated warning
- **Console:** THREE.Clock: This module has been deprecated
- **Location:** Game.ts constructor
- **Fix:** Replace with THREE.Timer

### BUG-005: PCFSoftShadowMap deprecated warning
- **Console:** WebGLRenderer shadow map type PCFSoftShadowMap is deprecated
- **Fix:** Use PCFShadowMap instead
