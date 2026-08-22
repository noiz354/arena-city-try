# AUDIT — CITY RUSH (GTA-Like Game)

**Tanggal audit:** 2026-08-22
**Cakupan:** `gta-game/` (7 fase selesai, ~5.250 baris TS, 30 file)
**Baseline (sebelum perbaikan):** `npm test` 13/13 lolos · `tsc --noEmit` bersih · `npm run build` OK (161 kB gzip) · working tree clean

## Status perbaikan (2026-08-22, putaran 2)

| ID | Item | Status |
|---|---|---|
| B-1 | Hitbox musuh/pedestrian di kaki | ✅ **Diperbaiki** — ray-vs-capsule (4 sphere sampling) di `utils/raycast.ts`; `Enemy.hitHeight=1.8`, `Pedestrian.hitHeight=1.8`; chest/head shot kini kena |
| B-2 | Kontrol mobile mati | ✅ **Diperbaiki** — rewrite `MobileControls.ts`: multi-touch map (joystick/look/button), `lookId` benar, FIRE inject click utk semi-auto, handler window + dispose bersih |
| P-1 | Marker misi rebuild tiap frame | ✅ **Diperbaiki** — `updateMarkers()` rebuild hanya saat set/color berubah; waypoint bergerak hanya di-reposition |
| P-2 | Alokasi per-frame hot path | ✅ **Sebagian** — `Vehicle.getCollidableBox()` di-cache (dirty flag), LOS enemy tanpa clone, DayNight tanpa `new Color` per frame; sisa: `markerPositions()` & `waypoint()` alloc kecil |
| I-2 | Prop geometry bocor saat dispose | ✅ **Diperbaiki** — `disposeChunk` kini deep-traversal |
| I-3 | Mobil tidak menabrak pedestrian | ✅ **Diperbaiki** — `Game.checkCarPedestrianCollisions()`: knock-down/run-over by speed, car melambat, cooldown per ped |
| I-4 | Wanted tidak naik saat menabrak | ✅ **Diperbaiki** — run-over fatal = crime 2, non-fatal = crime 1 |
| I-1 | Engine oscillator tidak di-stop | ⏳ minor — node tunggal, gain di-ramp ke 0; aman dibiarkan |
| I-5 | Save/load lengkap (inventory, ammo, kills) | ✅ **Diperbaiki** — `WeaponSystem.serialize/deserialize`, `SaveManager` (`src/systems/SaveManager.ts`), save otomatis + saat destroy; test roundtrip |
| A-4 | Weapon viewmodel | ✅ **Ditambahkan** — `WeaponView.ts`: model procedural per senjata di tangan karakter (3rd-person GTA-style), recoil kick, muzzle flash, movement bob |
| A-5 | Pause menu | ✅ **Ditambahkan** — ESC toggle, resume/mute/restart, stats, controls; `InputManager.clearTransient()` cegah klik nyasar |
| A-6 | Audio spatial | ✅ **Ditambahkan** — `AudioManager.setListener` (camera) + `playExplosionAt` (PannerNode, distance falloff) |
| — | Karakter tampak jalan mundur | ✅ **Diperbaiki** — nose indicator di -Z lokal (three.js forward) |
| A-2 | Collidable spatial query | ✅ **Ditambahkan** — grid per-chunk di ChunkManager (`forEachNear`/`queryCircle` zero-alloc); LOS enemy kini pakai circle 70m, bukan full list |
| I-1 | Engine oscillator cleanup | ✅ **Diperbaiki** — osc di-`stop()` + gain di-disconnect setelah gain fade saat keluar mobil |
| — | CI | ✅ **Ditambahkan** — `.github/workflows/ci.yml`: npm ci → tsc → npm test → build → artifact; `npm run typecheck` / `npm run check` |

**Baseline baru:** `npm test` 25/25 lolos · `tsc --noEmit` bersih · build OK (164 kB gzip)

---

## 1. Ringkasan Eksekutif

Game **fungsional dan lengkap** sesuai 7 fase master prompt, dengan fondasi yang sehat:
TS strict, kode bebas TODO/FIXME, sistem terdokumentasi, dan regression test headless.
Audit menemukan **2 bug P0 (pemecah gameplay)**, **2 masalah performa P1**, serta
sejumlah gap fitur dan tech-debt P2/P3. Yang paling kritis: **hitbox musuh di kaki**
(membuat tembakan nyaris selalu meleset) dan **kontrol mobile yang praktis mati**.
Keduanya layak diperbaiki sebelum game dirilis/didemokan.

Skor area (1–5):

| Area | Skor | Catatan |
|---|---|---|
| Arsitektur & kode | 4 | Game.ts god-object (535 baris), sisanya rapi |
| Performa | 3.5 | Alokasi per-frame di hot path, marker rebuild tiap frame |
| Fitur vs master prompt | 4 | Semua fase ada; beberapa sub-item belum/rusak |
| UX / kontrol | 3 | Mobile broken; senjata tanpa viewmodel |
| Kualitas & testability | 4 | 13 test headless; belum ada lint/CI/visual test |

---

## 2. BUG — P0 (pemecah gameplay)

### B-1. Hitbox musuh & pedestrian terpusat di kaki — tembakan meleset
- **Lokasi:** `src/systems/WeaponSystem.ts:204` (`raySphere(..., enemy.position, ...)`) dan `:214` (`target.position`)
- **Masalah:** `enemy.position` = posisi grup = **kaki** (y≈0), dengan `hitRadius` 0.62 (musuh) / 0.42 (pedestrian). Tembakan ke arah dada (y≈1.4) melewati >1 m dari pusat sphere → **selalu miss**. Pemain terpaksa membidik kaki.
- **Dampak:** combat terasa rusak; senjata terasa tidak akurat; frustasi.
- **Perbaikan:**
  - Pusatkan sphere di `position + (0, 0.9, 0)` dan naikkan radius ke ~0.75 (badan+lebar bahu), ATAU
  - Ganti ray-sphere dengan **ray-vs-capsule** (dua sphere + cylinder), ATAU
  - Minimal: ray-sphere di 2 titik (kaki & dada), ambil hit terdekat.
- **Uji:** tambah test headless: tembak dari (0,1.5,5) ke arah musuh di (0,0,0) → harus hit.

### B-2. Kontrol mobile praktis mati
- **Lokasi:** `src/systems/MobileControls.ts` + `src/ui/style.css:281`
- **Masalah (4 lapis):**
  1. `.mc-stick { pointer-events: none }` → `touchstart` tidak pernah sampai ke joystick → **joystick dead**.
  2. `lookId` tidak pernah di-set (tetap -1) → **look-drag di layar kanan dead** (`MobileControls.ts:17,103,124`).
  3. Tombol FIRE hanya `setMouseHeld(true/false)` → **senjata semi-auto (pistol/shotgun) tidak bisa ditembakkan** dari mobile (tidak ada `injectClick()` saat release).
  4. `onTouchEnd` di `:124` men-set `lookId = -1` tanpa makna; logika identifikasi sentuhan tidak konsisten.
- **Dampak:** di HP, pemain tidak bisa bergerak/lihat/menembak pistol — game tidak dimainkan.
- **Perbaikan:**
  - Hapus `pointer-events: none` dari `.mc-stick` (atau bind `touchstart` di `window` untuk separuh kiri layar).
  - Set `lookId` saat sentuhan dimulai di separuh kanan (non-button), reset saat `touchend`.
  - FIRE: `touchstart` → `setMouseHeld(true)`; `touchend` → `injectClick()` + `setMouseHeld(false)`.
  - Rewrite handler touch dengan multi-touch map `identifier → role` (joystick / look / button).
- **Uji:** sulit headless; minimal verifikasi binding & state via unit test InputManager (virtual keys + click queue).

---

## 3. PERFORMA — P1

### P-1. Marker misi di-rebuild tiap frame (GC + WebGL churn)
- **Lokasi:** `src/systems/MissionSystem.ts:196-217` — `update() → rebuildMarkers() → markerPositions()` mengalokasi `new Vector3` tiap frame; untuk waypoint bergerak (assassination/chase) `matches()` selalu false → `makeMarker()` membuat **mesh baru + upload buffer tiap frame**.
- **Dampak:** stall mikro tiap frame selama misi aktif; sampah GC; boros memori GPU.
- **Perbaikan:**
  - Rebuild hanya saat *set* marker berubah (start/complete/objective change — flag `dirty`).
  - Untuk waypoint bergerak, pindahkan marker dengan `group.position.copy(newPos)` (update posisi saja, tanpa recreate).
- **Uji:** test bahwa `makeMarker` dipanggil sekali per misi (spy/counter).

### P-2. Alokasi per-frame di hot path
- **Lokasi:**
  - `src/entities/Vehicle.ts:61-63` — `get forward()` → `new Vector3` tiap panggilan.
  - `src/entities/Vehicle.ts:70-83` — `getCollidableBox()` → 2× `new Vector3` + `new Box3` tiap panggilan; `Game.ts` memanggil `getCollidables()` **5×/frame** → ±100–170 alokasi/frame untuk 24–34 kendaraan.
  - `src/systems/EnemySystem.ts:96-100` — 3× `.clone()` per musuh per frame (14 musuh).
  - `src/systems/MissionSystem.ts:128-148` — `waypoint()` clone tiap frame.
  - `src/systems/DayNightSystem.ts` — `new Color()` per frame (lerp).
- **Dampak:** GC pressure; pada device lemah bisa terasa; bertentangan dengan target 60 FPS + auto-quality.
- **Perbaikan:**
  - Pool `Vector3`/`Box3` sebagai field instance (reuse, jangan clone di loop).
  - Cache AABB kendaraan: hitung ulang hanya saat `|Δyaw| > ε` atau `|Δpos| > ε` (invalidate on move).
  - `DayNightSystem`: pre-komputasi color target sebagai field.
- **Uji:** test deterministik (2 frame berturut-turut → hasil sama); profil alokasi via `performance.measureUserAgentSpecificMemory()` (manual).

---

## 4. BUG & ISSUE — P2 (fitur/logika)

| ID | Lokasi | Masalah | Perbaikan |
|---|---|---|---|
| I-1 | `AudioManager.ts:151-167` | Oscillator engine dibuat sekali, gain di-ramp ke 0 tapi node **tidak pernah di-`stop()`**; flag `engineOn` tidak konsisten | `stop()` + re-create saat aktif; atau biarkan (satu node, minor) |
| I-2 | `ChunkManager.ts:disposeChunk` | Geometri **prop** (cylinder/sphere/icosahedron di sub-Group `props`) tidak di-dispose — loop hanya menyentuh `child instanceof Mesh` di level chunk | dispose traversal ke `props` juga |
| I-3 | Seluruh game | **Mobil tidak menabrak pejalan kaki** — tidak ada car-vs-pedestrian collision; pedestrian menembus mobil | Hitbox mobil vs posisi pedestrian → knock-down/run-over + wanted crime |
| I-4 | `WantedSystem.ts` | **Menabrak/membunuh warga dengan mobil tidak menaikkan bintang wanted** — hanya tembakan | `reportCrime` pada kejadian tabrakan mobil-warga |
| I-5 | `Game.ts:save()` | Save/load hanya profile+pos+health — **senjata dimiliki, ammo, dan state misi tidak disimpan** | Simpan inventory/ammo/mode di payload save |
| I-6 | `MissionSystem.ts:chase` | Target chase (traffic car) bisa **di-cull** (>100 m dari player) → marker minimap menunjuk mobil tak terlihat | Jangan cull target aktif; atau re-target |
| I-7 | `EnemySystem.ts` | Musuh selalu `position.y = 0` — tidak bisa berdiri di atap | Ground detection sederhana seperti player |
| I-8 | `WeatherSystem.ts:resetDrop` | Hujan reset di baseY 0 — **tidak mengikuti camera Y** (terlihat aneh saat kamera tinggi) | Offset Y ke camera |

---

## 5. ARSITEKTUR & TECH-DEBT — P3

### A-1. `Game.ts` = god-object (535 baris)
Menampung: state machine foot/driving, wiring 12+ sistem, input, save/load, minimap,
explosion handling, engine audio. **Perbaikan:** ekstrak:
- `PlayerModeController` (enter/exit vehicle, respawn),
- `GameSystems` (wiring + update urutan),
- `SaveManager` (serialize/deserialize).

### A-2. Collidable lookup O(n) per entitas
±46 entitas (player, kamera, 24 parked, 10 traffic, 14 enemy, 22 ped) × ±130 collidable
(bangunan aktif + kendaraan) = ribuan uji AABB/frame. **Perbaikan:** index collidable per
chunk (ChunkManager sudah punya grid!) → query hanya chunk di sekitar entitas.

### A-3. Tidak ada instancing untuk bangunan
174+ bangunan = mesh individual + material per bangunan. **Perbaikan:** `InstancedMesh`
per chunk (1 draw call) untuk LOD penuh; material tetap beda warna → gunakan instance
color attribute.

### A-4. Senjata tanpa viewmodel
Master prompt fase 4 menyebut "viewmodel"; sekarang hanya crosshair + HUD ammo.
**Perbaikan:** kamera senjata overlay (pola `bloodwave shooting.js` `weaponScene` +
`renderer.clearDepth()` sebelum render utama) — atau FPS toggle.

### A-5. Tidak ada pause/menu
Blur tab ditangani (dt di-clamp), tapi tidak ada pause menu, restart, atau settings in-game.

### A-6. Audio tidak spatial
Semua SFX mono tanpa pan/posisi. **Perbaikan:** `PannerNode`/`StereoPannerNode` + listener
pada posisi player/camera (jarak senjata, mesin mobil).

---

## 6. Gap vs MASTER_PROMPT (checklist)

| Item master prompt | Status |
|---|---|
| Phase 4: weapon HUD (ammo, crosshair, reload indicator) | ✅ |
| Phase 4: weapon viewmodel | ⚠️ belum (hanya HUD) |
| Phase 4: weapon pickups from ground | ✅ |
| Phase 5: vehicle AI drive along roads | ✅ |
| Phase 5: NPC health, death, police alert | ✅ |
| Phase 5: wanted system (stars) | ✅ |
| Phase 5: NPC dialogue | ✅ |
| Phase 6: minimap + 3D markers | ✅ |
| Phase 6: money/XP | ✅ |
| Phase 6: save/load (localStorage) | ⚠️ parsial (I-5) |
| Phase 7: day/night, weather, particles | ✅ |
| Phase 7: spatial audio | ⚠️ mono non-spatial (A-6) |
| Phase 7: post-processing (bloom, vignette, screen shake) | ✅ (bloom+shake; vignette via HUD) |
| Phase 7: mobile touch controls | ❌ rusak (B-2) |
| Phase 7: instancing, LOD, frustum culling | ⚠️ LOD ✅; instancing ❌ (A-3) |
| Phase 7: loading screen | ✅ |

---

## 7. KUALITAS & TOOLING

- ✅ TS strict, no `any` berbahaya, no TODO/FIXME
- ✅ Test headless 13/13 — tapi hanya logika murni; **tidak ada test rendering/visual**
- ⚠️ Belum ada ESLint/Prettier, belum ada CI (GitHub Actions), belum ada Playwright smoke test
- ⚠️ `three@0.185` pinned via `^` — lockfile ada, OK

---

## 8. ROADMAP PRIORITAS

### P0 — selesai ✅ (B-1, B-2)
### P1 — selesai ✅ (P-1, P-2 sebagian)
### P2 — selesai ✅ (I-2, I-3, I-4, I-5, A-4, A-5, A-6)
### P3 — selesai ✅ (A-2, I-1, CI) · sisa:
1. **A-1** — refactor Game.ts lebih lanjut (mode controller; SaveManager sudah diekstrak)
2. **A-3** — InstancedMesh bangunan (draw call ↓)
3. Playwright visual smoke (browser tidak bisa diinstall di sandbox ini — template siap via threejs-game-skills)

---

## 9. Metrik & Referensi

| Metrik | Nilai |
|---|---|
| Total kode | ~6.000 baris (36 file src + 1 test + CI) |
| Bundle (gzip) | 164 kB JS + ~7 kB CSS |
| Draw call est. | ~200–400 (tanpa instancing — A-3 sisa, butuh tradeoff visual windows) |
| Chunk aktif | ~25 (LOD penuh + sederhana) dari 484 |
| Test | 25 pass / 0 fail (`npm test`) |
| Entitas hidup | ±46 (player, 24 parked, 10 traffic, 14 thug, 22 ped, cop dinamis) |
| CI | ✅ GitHub Actions (tsc + test + build) |

**Rekomendasi segera:** kerjakan P0 (B-1 + B-2) dalam satu sesi — keduanya kecil
(< 100 baris perubahan) tapi mengubah game dari "tidak bisa dimainkan dengan benar"
menjadi "layak demo".
