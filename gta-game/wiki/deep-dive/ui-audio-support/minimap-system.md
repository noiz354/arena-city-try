---
title: "MinimapSystem — North-Up Projection & Blip Logic"
description: "How the 168px canvas minimap projects the world north-up each frame — draw order, blip sources from MissionSystem, constants, and flagged limitations."
---

# MinimapSystem — North-Up Projection & Blip Logic

## Why It Exists

The minimap answers one question every frame: *where am I relative to the city and my objective?* It is deliberately **sandbox-safe**: pure Canvas 2D with zero textures and no CDN fetches ([`src/systems/MinimapSystem.ts:7-10`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L7-L10)). It is also **stateless** — its only fields are the canvas and its 2D context; every frame redraws from scratch ([`src/systems/MinimapSystem.ts:12-13`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L12-L13)).

The design choice that matters most: the map is **world-fixed / north-up**. The world translates under a fixed center point and only the player arrow rotates ([`src/systems/MinimapSystem.ts:42-43`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L42-L43), [`src/systems/MinimapSystem.ts:87-88`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L87-L88)).

## Architecture at a Glance

| Aspect | Choice | Source |
|---|---|---|
| Canvas size | 168 × 168 px, class `minimap`, appended to `#ui-root` | [`src/systems/MinimapSystem.ts:15-22`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L15-L22) |
| World window | `VIEW = 420` m across → scale = 168/420 ≈ **0.4 px/m** | [`src/systems/MinimapSystem.ts:4-5`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L4-L5) |
| Projection | `px = half + (wx − playerPos.x) · scale`, same for z | [`src/systems/MinimapSystem.ts:42-43`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L42-L43) |
| Masking | Circular clip radius `half−4`; border ring drawn after restore | [`src/systems/MinimapSystem.ts:37-40`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L37-L40) |
| Data ownership | None — all inputs arrive as `update()` arguments | [`src/systems/MinimapSystem.ts:24`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L24) |

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
flowchart TB
    G["Game.update step 19<br>updateMinimap()"] --> MM["minimap.update(pos, yaw, waypoint, zones)"]
    subgraph ARGS["Inputs - all read-only arguments"]
        P["modeCtrl.activePosition<br>car pos while driving else player"]
        Y["modeCtrl.activeYaw"]
        WP["missions.waypoint()<br>current objective or null"]
        ZN["missions.markerPositions()<br>start zones when idle"]
    end
    ARGS --> MM
    MM --> CV["Full canvas redraw:<br>bg disc, clip, roads, bounds,<br>zones, waypoint, arrow, border"]
```

<!-- Sources: src/game/Game.ts:527-534, src/systems/MinimapSystem.ts:24, src/systems/ModeController.ts:62-70 -->

## Per-Frame Draw Order

`update()` runs every tick from `Game.updateMinimap()` ([`src/game/Game.ts:527-534`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L527-L534)). Order is fixed and matters — later layers paint over earlier ones:

| # | Layer | Style | Geometry | Source |
|---|---|---|---|---|
| 1 | Background disc | `rgba(10,14,18,0.82)` | radius `half−2` = 82 px | [`src/systems/MinimapSystem.ts:30-34`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L30-L34) |
| 2 | Circular clip | — | radius `half−4` | [`src/systems/MinimapSystem.ts:36-40`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L36-L40) |
| 3 | Roads | `rgba(120,130,145,0.5)`, 2 px | strokes per `ROADS_X` / `ROADS_Z` | [`src/systems/MinimapSystem.ts:45-59`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L45-L59) |
| 4 | City bounds rect | white @ 0.15 alpha | spans ±`CITY_HALF` (155 m) | [`src/systems/MinimapSystem.ts:61-63`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L61-L63) |
| 5 | Mission zone dots | green `#2ecc71` | r = 4 px per zone | [`src/systems/MinimapSystem.ts:65-71`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L65-L71) |
| 6 | Waypoint dot + halo | gold `#ffd166` + ring @ 0.5 | r = 5 px dot, r = 9 px ring | [`src/systems/MinimapSystem.ts:73-84`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L73-L84) |
| 7 | Player arrow | cyan `#7ef0ff` | triangle rotated by raw yaw | [`src/systems/MinimapSystem.ts:86-96`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L86-L96) |
| 8 | Border ring | `rgba(255,255,255,0.35)` | drawn last, outside clip | [`src/systems/MinimapSystem.ts:98-103`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L98-L103) |

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
flowchart TD
    S["update(playerPos, yaw, waypoint, zones)"] --> A["clearRect + background disc"]
    A --> B["save + circular clip"]
    B --> C["projection closures px/py<br>world-fixed north-up"]
    C --> D["roads grid from ROADS_X / ROADS_Z"]
    D --> E["city bounds rectangle"]
    E --> F{"zones array?"}
    F -- yes --> G["green dots r=4"]
    F --> H{"waypoint != null?"}
    G --> H
    H -- yes --> I["gold dot r=5 + halo ring r=9"]
    H --> J["translate center, rotate yaw, arrow triangle"]
    I --> J
    J --> K["restore clip, border ring"]
```

<!-- Sources: src/systems/MinimapSystem.ts:24-104 -->

## Blip Logic: Who Feeds What

The minimap never queries gameplay itself — it is constructed *after* MissionSystem and receives everything as arguments ([`src/game/Game.ts:225`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L225)). MissionSystem is the sole source of both blip types:

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
sequenceDiagram
    autonumber
    participant GM as Game.updateMinimap
    participant MC as ModeController
    participant MS as MissionSystem
    participant MM as MinimapSystem.update
    GM->>MC: read activePosition / activeYaw
    MC-->>GM: car pose while driving else player pose
    GM->>MS: waypoint() and markerPositions()
    MS-->>GM: objective Vector3 or null, zone list when idle
    GM->>MM: update(pos, yaw, waypoint, zones)
    MM->>MM: full redraw in fixed draw order
```

<!-- Sources: src/game/Game.ts:527-534, src/systems/MissionSystem.md -->

Blip semantics:

| Blip | When visible | Data source | Source |
|---|---|---|---|
| Green zone dots | Only while **no** mission is active — `markerPositions()` returns available mission start points then | [`src/systems/MissionSystem.ts:208-214`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MissionSystem.ts#L208-L214) | same |
| Gold waypoint dot | During an active mission — follows delivery pickup/dropoff, race checkpoint, assassination target clone, or chase-target car | [`src/systems/MissionSystem.ts:133-153`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MissionSystem.ts#L133-L153) | same |

There are **no enemy, pedestrian, vehicle or police blips** anywhere in the file or its callers ([`docs/wiki/systems/MinimapSystem.md`](https://github.com/noiz354/arena-city-try/blob/main/docs/wiki/systems/MinimapSystem.md)). Off-map blips are simply hidden by the circular clip — there are no edge-clamped direction indicators.

## World Constants It Consumes

| Constant | Value | Role on the map | Source |
|---|---|---|---|
| `CITY_HALF` | 155 m | Bounds rectangle extent | [`src/systems/CityGenerator.ts:9`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/CityGenerator.ts#L9) |
| `ROADS_X` / `ROADS_Z` | centerlines at −120…120 step 40 m | Road grid strokes | [`src/systems/CityGenerator.ts:28-31`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/CityGenerator.ts#L28-L31) |
| `SIZE` / `VIEW` | 168 px / 420 m | Since VIEW (420) > CITY_SIZE (310), the whole city fits when centered | [`src/systems/MinimapSystem.ts:4-5`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L4-L5) |

## Public API

| Member | Signature | Notes | Source |
|---|---|---|---|
| `constructor()` | no args | Self-appends to `#ui-root` via non-null assertion — throws if missing | [`src/systems/MinimapSystem.ts:15-22`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L15-L22) |
| `update()` | `(playerPos: Vector3, playerYaw: number, waypoint: Vector3 \| null, zones: Array<{pos: Vector3, color: number}>)` | Full redraw; call once per frame (Game does) | [`src/systems/MinimapSystem.ts:24`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L24) |

## Tuning & Extension Points

- **New blip type**: one more draw loop inside the clip region reusing the existing `px`/`py` closures ([`src/systems/MinimapSystem.ts:42-43`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L42-L43)).
- **Rotating-map variant**: move the `ctx.rotate(playerYaw)` from the arrow block to wrap projection through arrow steps ([`src/systems/MinimapSystem.ts:87`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L87)).
- **Palette**: all seven colors are inline literals listed in the draw-order table above.

## Known Limitations (Unresolved)

1. The `zones[].color` parameter is **ignored** — dots are hard-coded green regardless of passed color ([`src/systems/MinimapSystem.ts:66-71`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L66-L71)).
2. Waypoints outside the 420 m window vanish entirely — no edge-of-map indicator ([`src/systems/MinimapSystem.ts:37-40`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L37-L40)).
3. Full redraw every frame even when nothing moved; no dirty-flagging (fine at 168²).
4. No devicePixelRatio scaling — soft rendering on HiDPI displays ([`src/systems/MinimapSystem.ts:16-19`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MinimapSystem.ts#L16-L19)).
5. Yaw handedness relies on the Player/Vehicle convention (`rotation.y`, −z forward); verified only against HUD compass math which negates for screen space ([`src/ui/hud.ts`](https://github.com/noiz354/arena-city-try/blob/main/src/ui/hud.ts)).

## Related Pages

| Page | Relationship |
|------|-------------|
| [AudioManager](./audio-manager.md) | Fellow UI-support system driven per frame by Game |
| [SaveManager](./save-manager.md) | Persists the position this map centers on |
| [MobileControls](./mobile-controls.md) | Shares the `#ui-root` DOM container with the minimap canvas |
| [Running & Playing CITY RUSH](../../getting-started/usage.md) | Player-facing navigation behavior |
