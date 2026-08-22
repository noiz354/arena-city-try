# DEBUG & PROFILE AUDIT — CITY RUSH (threejs-debug-profiler)

**Skill:** `threejs-debug-profiler` (SKILL.md + debug-profile-checklists + performance-profile + scene-debugging)
**Tanggal:** 2026-08-22 · **Kode:** main terbaru + profiling pass sesi ini
**Batasan:** sandbox headless (tanpa browser) — profiling memori/alokasi via Node heap; render/GPU metrics BLOCKED-browser (Playwright/CI menunggu)

---

## Reference Ledger

```
- debug-profile-checklists.md: YES (dibaca; diterapkan)
- checklists/performance-profile.md: YES (dibaca; diterapkan)
- checklists/scene-debugging.md: YES (dibaca; diterapkan)
- checklists/mobile-input.md: YES (dibaca; diverifikasi)
```

## Checklist Scene-Debugging (headless-capable)

| Item | Hasil |
|---|---|
| Render loop start sekali & lanjut | ✅ `Game.start()` dipanggil di main.ts (fix sesi lain) |
| Renderer attach ke canvas yang benar | ✅ `container.appendChild(renderer.domElement)` |
| Canvas size & DPR | ✅ `setSize(clientWidth, clientHeight)`, DPR cap `min(dpr,2)`, AutoQuality 3 level |
| Camera aspect/projection | ✅ di-resize handler: aspect + updateProjectionMatrix |
| Scene berisi objek | ✅ (bot playtest: entitas bergerak) |
| Lights/materials/fog | ✅ (AAA pass: sky dome + hemisphere/rim + fog) |
| Asset paths/base | ✅ `GH_PAGES=1` base `/arena-city-try/` (verified) |
| Resize update renderer+camera+composer | ✅ `renderer.setSize` + `camera` + `postfx.setSize` |
| **Per-frame allocations (GC pressure)** | ✅ **Dioptimasi sesi ini — lihat bawah** |
| Audio unlock | ✅ pointerdown/keydown self-remove listener |

## Performance Profile — Baseline & Optimasi

### Bottleneck yang ditemukan & diukur
**`MissionSystem.markerPositions() + waypoint()`** dipanggil **tiap frame** oleh HUD + minimap:

| Metrik | Sebelum | Sesudah | Δ |
|---|---|---|---|
| Alokasi/frame (marker+waypoint) | ~960 B/frame | **~11 B/frame** | **−98.8%** |
| GC churn (60 fps, 60 s) | ~3.4 MB/min | **~40 KB/min** | −98.8% |
| Heap delta (1000 iter) | 938 KB | 11 KB | — |

**Cara:**
1. `waypoint()` → reuse `wpBuffer` (Vector3 field), tidak `new`/`clone()` per panggilan.
2. `markerPositions()` → **cache** dengan invalidasi pada: `startMission`, objective change
   (delivery pickup, race checkpoint), `complete`, `abort`. Steady-state = 0 alokasi.

**Optimasi kedua:** `WeaponSystem.fire()` — `dir = baseDir.clone()` per pellet → `tmpDir2.copy()`.
(Shotgun 6 pellet/shot → 6 alokasi → 0.)

### Item performance-checklist yang sudah baik (verified)
- `renderer.info` (calls/triangles) tampil di dev HUD → baseline terukur
- Instancing: ring bangunan sederhana = 1 InstancedMesh/chunk (density pass)
- LOD: 3 ring (full 7×7, simple 9×9, hidden)
- DPR cap + AutoQuality FPS-based (3 level)
- Disposal: world/vehicles/traffic/wanted/particles/mobile di `destroy()`; prop geometry
  deep-traversal (fix sesi lalu); sky di-dispose via World.disposables
- dt di-clamp (0.05) → tab-sleep aman
- Satu RAF loop (tidak ganda) — verified di Game.loop
- Audio unlock listener self-removes → tidak leak listener

### BLOCKED (butuh browser)
- FPS/frame-time nyata, draw calls live, triangles GPU, memory heap browser
  (Chrome DevTools / Playwright) — `tests/visual.spec.ts` siap di CI
- Blank-canvas pixel sampling — butuh browser
- Mobile render/input (portrait/landscape) — butuh emulasi

## Files Changed (sesi ini)

| File | Perubahan |
|---|---|
| `src/systems/MissionSystem.ts` | `waypoint()` reuse buffer; `markerPositions()` cache + invalidate |
| `src/systems/WeaponSystem.ts` | `tmpDir2` reuse (0 alokasi per pellet) |

## Verification

- `tsc --noEmit` bersih
- `npm test` 43/43 (termasuk test marker cache invalidation & waypoint)
- `npm run test:play` 29/29 (softlock sweep 120 s: 0 exception)
- `npm run build` 169.9 kB gzip (naik ~0.1 kB — netral)
- Re-measure setelah optimasi: **960 → 11 B/frame** (diukur, bukan dikira)

## Residual Risks

1. **Renderer/GPU metrics tidak bisa diverifikasi di sandbox** — butuh browser; sudah
   disiapkan jalur CI (`tests/visual.spec.ts`) + `QA_PLAYTEST_TASK.md` (MCP Chrome DevTools).
2. **Variable timestep** (bukan fixed-step) — sudah di-clamp; physics AABB stabil di
   playtest, tapi frame rate sangat rendah bisa ubah feel (tercatat di laporan QA).
3. Particle pool 140 — 2 ledakan simultan bisa drop (diketahui, minor).

## Kesimpulan

Profiling menemukan satu **bottleneck GC nyata** (marker + waypoint ~3.4 MB/min churn)
dan mengoptimasi **−98.8% alokasi per frame** dengan reuse buffer + cache invalidasi,
plus zero-alloc pada jalur tembak. Checklist scene-debugging & performance-profile
lainnya terverifikasi baik (loop tunggal, resize lengkap, dispose lengkap, DPR cap,
LOD/instancing, audio unlock clean). Metrics GPU/frame-time tetap menunggu browser.
