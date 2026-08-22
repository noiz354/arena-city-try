# TODO — CITY RUSH (GTA-Like Game)

Status per **2026-08-22**. Legend: `[x]` selesai · `[ ]` belum · `(P#)` prioritas
(P0 = blocker, P1 = penting, P2 = fitur, P3 = polish/engineering).

---

## 1. Build Game — 7 Fase (✅ selesai semua)

- [x] **Phase 0 — Scaffold** `(P0)` — Vite 8 + Three.js r185 + TS strict; renderer, kamera, lighting + shadow, ground kota
- [x] **Phase 1 — Player Controller** `(P0)` — WASD/inertia, lompat, sprint+stamina, kamera 3rd-person anti-tembus-dinding
- [x] **Phase 2 — Open World Streaming** `(P0)` — 484 chunk (16 m), 3-level LOD, kota prosedural + menara pusat
- [x] **Phase 3 — Vehicles & Driving** `(P0)` — 24 mobil parkir + 10 lalu lintas, fisika, naik/turun, damage/wrecked
- [x] **Phase 4 — Combat & Weapons** `(P0)` — 4 senjata hitscan, ammo/reload, AI musuh, pickup, mati/respawn
- [x] **Phase 5 — NPCs & Traffic** `(P0)` — pejalan kaki (jalan/idle/lari/dialog), lalu lintas AI, bintang wanted + polisi
- [x] **Phase 6 — Missions & Progression** `(P0)` — delivery/race/assassination/chase, waypoint, minimap, uang/XP, save/load
- [x] **Phase 7 — Polish & Performance** `(P0)` — siang/malam, hujan, partikel, audio, bloom, screen-shake, auto-quality, mobile

## 2. Hasil Audit — Perbaikan (✅ selesai semua)

- [x] **B-1** `(P0)` — Hitbox humanoid ray-vs-capsule (tembakan dada/kepala kena)
- [x] **B-2** `(P0)` — Kontrol mobile ditulis ulang (joystick, look, semi-auto fire)
- [x] **P-1** `(P1)` — Marker misi tidak rebuild per frame (waypoint bergerak di-reposition)
- [x] **P-2** `(P1)` — Cache AABB kendaraan, LOS enemy zero-alloc, DayNight tanpa alokasi
- [x] **I-2** `(P2)` — Dispose geometry prop chunk (anti bocor memori)
- [x] **I-3/I-4** `(P2)` — Mobil menabrak pejalan kaki + wanted dari mengemudi
- [x] **I-5** `(P2)` — Save/load lengkap (inventory, ammo, kills)
- [x] **A-4** `(P2)` — Weapon viewmodel (3rd-person, recoil, muzzle flash)
- [x] **A-5** `(P2)` — Pause menu (ESC: resume/mute/restart/stats)
- [x] **A-6** `(P2)` — Audio spatial (PannerNode, ledakan berposisi)
- [x] **I-1** `(P3)` — Engine oscillator dibersihkan saat keluar mobil
- [x] **A-2** `(P3)` — Spatial query collidable per chunk (LOS)
- [x] **A-3** `(P3)` — InstancedMesh untuk LOD ring sederhana (~100+ → ~16 draw call)
- [x] **A-1** `(P3)` — Refactor Game.ts → `ModeController` (state machine foot/driving)

## 3. Infrastruktur (✅ siap)

- [x] **Analytics** — `src/analytics/` (queue + localStorage + endpoint opsional, telemetry gameplay + FPS)
- [x] **Error handling** — global onerror/unhandledrejection/WebGL-loss, overlay dev, layar boot-failure
- [x] **CI** — `ci.yml` (tsc → test → build → artifact + Playwright visual smoke) via `scripts/setup-gh-workflows.sh`
- [x] **CD / GitHub Pages** — `deploy-pages.yml` + branch `gh-pages` **sudah ter-publish**
- [x] **Playwright visual smoke** — `tests/visual.spec.ts` (boot → HUD → FPS → zero console errors)
- [x] **Skills knowledge base** — 34 community skills di `skills/community/` + indeks

---

## 4. Sisa / Langkah Berikutnya

### A. Perlu tindakan (lingkungan)
- [ ] **Aktifkan GitHub Pages** — Settings → Pages → *Deploy from a branch* → `gh-pages` → `/ (root)` → Save
      (branch sudah ter-publish; tinggal 1 klik)
- [ ] **Restore workflow CI/CD** — jalankan `bash gta-game/scripts/setup-gh-workflows.sh` dengan akun
      berizin `workflows`, commit + push `.github/workflows/` (token sesi ini tidak bisa push workflow)
- [ ] **Merge PR #1** — `main ← arena/01a027e8-arena-city-try` (21 commits, MERGEABLE)

### B. Opsional / ide lanjutan
- [ ] **Analytics endpoint nyata** — deploy collector (Plausible/Umami/self-host), set `VITE_ANALYTICS_ENDPOINT` saat build
- [ ] **Visual QA di sandbox** — install browser Playwright bila CDN diizinkan, jalankan `npm run test:visual` lokal
- [ ] **Lebih banyak konten** — misi baru (cargo heist, chase polisi, street race), kendaraan baru (motor, bus)
- [ ] **Fitur gameplay** — drift, ramp/lompatan, sistem senjata melee, kejar-kejaran polisi saat mengemudi
- [ ] **Polish** — mini-map jalan yang lebih detail, marker misi di minimap, efek cuaca lebih (petir)
- [ ] **Multiplayer** — socket.io/geckos (pola dari skill `mavonengine-core` sudah ada di `reference/`)
- [ ] **Balancing** — tune ekonomi misi (reward/XP), spawn rate polisi, damage kendaraan

### C. Known limitations (dokumentasi)
- [ ] Dokumentasikan batasan: tidak ada vehicle-vs-vehicle physics penuh (AABB approximation),
      hujan tidak mengikuti kamera vertikal (I-8 audit), musuh tidak bisa di atap
