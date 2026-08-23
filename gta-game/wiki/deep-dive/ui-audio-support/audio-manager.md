---
title: "AudioManager — Sound Playback & Pooling"
description: "Procedural Web Audio: lazy AudioContext unlock on first gesture, oscillator/noise SFX recipes, speed-pitched engine drone, and camera-relative 3D panning."
---

# AudioManager — Sound Playback & Pooling

## Why It Sounds Like This

Every sound in CITY RUSH is **synthesized at runtime** from oscillators and noise buffers — there are no audio files — so the game works sandboxed and offline ([`src/systems/AudioManager.ts:4-11`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L4-L11)). The manager owns a single lazily-created `AudioContext`, a master gain with mute support, a looping city-ambience bed, a speed-pitched engine drone, and camera-relative 3D panning for world-position sounds.

"Pooling" here means **node-graph lifecycle management**, not sample pooling: one-shots are fire-and-forget (the GC reclaims them), while the long-lived engine graph is built on demand and torn down on a delay after you leave a car.

## Lifecycle: Gesture Unlock → Ambient Bed

Construction does nothing audible — `new AudioManager()` only sets state fields, because browsers block audio until a user gesture ([`src/game/Game.ts:148`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L148), [`src/systems/AudioManager.ts:13-20`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L13-L20)). Game registers one-shot `pointerdown`/`keydown` listeners whose sole job is calling `audio.ensure()`; they remove themselves after first fire ([`src/game/Game.ts:328-335`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L328-L335)).

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
sequenceDiagram
    autonumber
    participant U as User gesture
    participant GM as Game unlock listener
    participant AM as AudioManager.ensure()
    participant AC as AudioContext
    participant MG as master GainNode 0.8
    participant AB as startAmbient loop
    U->>GM: pointerdown or keydown
    GM->>AM: ensure()
    alt ctx exists but suspended
        AM->>AC: resume()
    else no ctx yet
        AM->>AC: new AudioContext (webkit fallback)
        AM->>MG: createGain(0.8) connect destination
        AM->>AB: startAmbient() city-noise bed
    end
    GM->>GM: remove both listeners
```

<!-- Sources: src/game/Game.ts:328-335, src/systems/AudioManager.ts:22-39 -->

If context creation throws, `ctx` stays `null` and every later method no-ops via its `if (!ctx || !this.master) return` guard ([`src/systems/AudioManager.ts:118`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L118)) — audio failure can never crash gameplay. Do **not** call `ensure()` outside a gesture handler or the context stays suspended.

## Signal Flow

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
flowchart LR
    subgraph SOURCES["Sound generators"]
        SH["playShoot<br>noise buffer + lowpass"]
        EX["playExplosionAt<br>noise 0.7s + lowpass sweep"]
        BL["blip() one-shot cues<br>hit kill reload pickup damage empty mission jingle"]
        ENG["engineOsc sawtooth 55 Hz<br>+ lowpass + gain"]
        AMB["ambient brown-noise bed<br>2 s loop, lowpass 400 Hz"]
    end
    subgraph SPATIAL["Positional path only"]
        PN["PannerNode equalpower<br>ref 6 / max 120 / rolloff 1.4"]
    end
    MG["master gain 0.8<br>mute ramps to 0 in 0.05 s"]
    OUT["destination"]
    SH --> MG
    BL --> MG
    ENG --> MG
    AMB --> MG
    EX --> PN --> MG
    MG --> OUT
    LIS["listener follows camera each frame<br>setListener(pos, quat)"] -.-> PN
```

<!-- Sources: src/systems/AudioManager.ts:32-34,41-46,73-109,139-153,214-277, src/game/Game.ts:387 -->

Two call sites keep spatial audio honest every frame inside `Game.update()`: `audio.setListener(camera.position, camera.quaternion)` runs first ([`src/game/Game.ts:387`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L387)), rotating scratch basis vectors by camera quaternion through modern `positionX/forwardX/upX` AudioParams with legacy `setPosition`/`setOrientation` fallback ([`src/systems/AudioManager.ts:50-71`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L50-L71)); and `updateEngineAudio()` drives the engine graph plus the `KeyM` mute toggle ([`src/game/Game.ts:483-491`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L483-L491)).

## SFX Recipe Table

All one-shots funnel through private helper `blip(freq, dur, type, vol)` — an oscillator whose frequency exponentially ramps to `freq × 1.4` with matching gain decay ([`src/systems/AudioManager.ts:139-153`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L139-L153)):

| Method | Recipe | Trigger | Source |
|---|---|---|---|
| `playShoot(w)` | noise buffer; dur 0.18 s shotgun / 0.09 s others; cutoff 900/1400/2200 Hz by weapon id; gain 0.5→0.001 | WeaponSystem `onShoot` | [`src/systems/AudioManager.ts:116-137`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L116-L137), wired [`src/game/Game.ts:249-250`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L249-L250) |
| `playHit()` | 180 Hz square 0.07 s @0.12 | WeaponSystem `onHit` | [`src/systems/AudioManager.ts:155-157`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L155-L157) |
| `playKill()` | two overlapping blips: 300 Hz saw 0.12 s + 150 Hz square 0.18 s | WeaponSystem `onKill` | [`src/systems/AudioManager.ts:159-162`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L159-L162) |
| `playReload()` | 500 Hz square 0.06 s, second 700 Hz blip after 120 ms | WeaponSystem `onReload` | [`src/systems/AudioManager.ts:164-167`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L164-L167) |
| `playPickup()` | 660 Hz sine 0.09 s then 990 Hz sine 0.14 s after 90 ms | pickup hooks | [`src/systems/AudioManager.ts:169-172`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L169-L172) |
| `playDamage()` | 120 Hz saw 0.22 s @0.30 | traffic hits and enemy melee | [`src/systems/AudioManager.ts:174-176`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L174-L176), melee injection [`src/systems/ModeController.ts:108`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ModeController.ts#L108) |
| `playEmpty()` | 900 Hz square 0.04 s dry-fire click | WeaponSystem `onEmpty` | [`src/systems/AudioManager.ts:178-180`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L178-L180) |
| `playMissionComplete()` | fanfare 523/659/784 Hz sine at t+0/+120/+240 ms | mission-complete hook | [`src/systems/AudioManager.ts:206-210`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L206-L210), wired [`src/game/Game.ts:217-222`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L217-L222) |
| `playExplosionAt(pos)` | noise shaped `pow(1−t, 1.5)`, lowpass sweep 3000→120 Hz, gain 0.9→0.001, equalpower panner | wrecked vehicles | [`src/systems/AudioManager.ts:73-109`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L73-L109), trigger [`src/game/Game.ts:470-481`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L470-L481) |

## Engine Drone Lifecycle

`setEngine(active, speedRatio)` is the one long-lived graph. First activation builds `sawtooth osc (55 Hz) → lowpass (300 Hz) → gain (0)` ([`src/systems/AudioManager.ts:217-229`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L217-L229)). Each call smooth-ramps three parameters with a 0.1 s time constant:

| Parameter | Driving formula | Idle/off | Source |
|---|---|---|---|
| gain | `0.05 + ratio·0.09` | 0 | [`src/systems/AudioManager.ts:231`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L231) |
| pitch | `50 + ratio·90` Hz (50→140) | ramps to 50 | [`src/systems/AudioManager.ts:233`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L233) |
| filter | `250 + ratio·500` Hz (250→750) | ramps to 250 | [`src/systems/AudioManager.ts:234`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L234) |

Deactivation schedules graph teardown after **600 ms**, skipped if you re-entered a car meanwhile ([`src/systems/AudioManager.ts:235-250`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L235-L250)). `speedRatio` is expected in `[0,1]`; clamping is the caller's problem (`Math.abs(v.speed) / v.config.maxSpeed`, [`src/game/Game.ts:486`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L486)).

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
stateDiagram-v2
    direction LR
    [*] --> NoGraph
    NoGraph --> Playing : setEngine(true, r)<br>build osc+filter+gain
    Playing --> Playing : per-call ramp gain/pitch/filter<br>time constant 0.1 s
    Playing --> Fading : setEngine(false, 0)
    Fading --> Playing : re-enter car within 600 ms<br>teardown skipped
    Fading --> NoGraph : after 600 ms osc.stop + disconnect
```

<!-- Sources: src/systems/AudioManager.ts:214-252 -->

## Mute Path

Mute is a flag plus a ramp — never a hard cut: `setMuted()` stores `this.muted` and ramps master gain to 0 or back to 0.8 with a 0.05 s time constant ([`src/systems/AudioManager.ts:41-46`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L41-L46)). Two UI surfaces write it: the `KeyM` handler each frame ([`src/game/Game.ts:490`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L490)) and the pause menu's sound button via closure — whose label is refreshed from the same flag every time the menu opens ([`src/ui/pauseMenu.ts:74-76`](https://github.com/noiz354/arena-city-try/blob/main/src/ui/pauseMenu.ts#L74-L76)).

## Tuning & Extension Points

| Knob | Value | Source |
|---|---|---|
| Master volume / mute ramp | 0.8 / 0.05 s | [`src/systems/AudioManager.ts:33`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L33), [`src/systems/AudioManager.ts:44`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L44) |
| Panner falloff | refDistance 6, maxDistance 120, rolloffFactor 1.4 | [`src/systems/AudioManager.ts:93-95`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L93-L95) |
| Ambience bed | 2 s loop, brown-noise integrator `last = (last + 0.02·white)/1.02`, ×3.5 output, gain 0.05, lowpass 400 Hz | [`src/systems/AudioManager.ts:254-277`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L254-L277) |
| New one-shot cue | thin wrapper around `blip()` — the established pattern | [`src/systems/AudioManager.ts:155-180`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L155-L180) |
| New positional effect | copy the `playExplosionAt` panner block for consistent distance falloff | [`src/systems/AudioManager.ts:73-109`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L73-L109) |
| New continuous loop (e.g. rain hiss) | belongs next to `startAmbient()`, must connect through `master` so mute covers it | [`src/systems/AudioManager.ts:254`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L254) |

## Unresolved

- `playExplosion()` ([`src/systems/AudioManager.ts:182-204`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/AudioManager.ts#L182-L204)) is a byte-for-byte duplicate of `playExplosionAt()` minus the panner, and only the positional variant appears in `Game.ts` — likely dead code kept for symmetry.
- There are no exported interfaces; `playShoot` takes a `WeaponDef` type from [`src/data/weapons.ts`](https://github.com/noiz354/arena-city-try/blob/main/src/data/weapons.ts) and only reads `.id`.

## Related Pages

| Page | Relationship |
|------|-------------|
| [MinimapSystem](./minimap-system.md) | Also fed per frame by Game.update |
| [SaveManager](./save-manager.md) | The other lazily-wired support system |
| [MobileControls](./mobile-controls.md) | Its FIRE button ultimately triggers playShoot paths |
| [Running & Playing CITY RUSH](../../getting-started/usage.md) | KeyM mute and pause-menu sound toggle from the player's view |
