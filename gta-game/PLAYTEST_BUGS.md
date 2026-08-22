# PLAYTEST BUGS - CITY RUSH

**Date:** 2026-08-22

## CRITICAL

### BUG-001: Spawn vehicle wedged between buildings — ✅ FIXED
- **Location:** Vehicle at (9.1, 0.0, 7.0)
- **Reproduction:** Start game, press E to enter sedan
- **Result:** Speed stays 0 km/h, vehicle cannot move
- **Impact:** Core driving feature broken on first vehicle
- **Root cause:** the 16×16 m landmark tower sat at the origin, on top of the
  central road intersection — the starter cars spawned inside/against its walls
- **Fix:** tower relocated to (20,20) (NE central block), clearing the intersection

## HIGH

### BUG-002: Player spawn stuck between buildings/trees — ✅ FIXED
- **Location:** Player spawns at (0, 0.95, 0)
- **Reproduction:** Fresh game start
- **Result:** Player is wedged inside the landmark tower collider, hard to move out
- **Impact:** Poor first impression, confusing UX — reads as an invisible wall
- **Root cause:** the 16×16 m tower collider covered the spawn origin (0,0); the
  player spawned dead-center inside it
- **Fix:** tower relocated to (20,20); spawn origin verified clear via a
  regression test (`tests/smoke.mjs`) that no active collider overlaps (0,0)

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
