# PROGRESS — CITY RUSH (GTA-Like Game)

**Proyek:** `gta-game/` · Three.js r185 + TypeScript strict + Vite 8
**Branch kerja:** `arena/01a027e8-arena-city-try` (PR #1 → `main`)
**Terakhir diperbarui:** 2026-08-23

---

## Ringkasan Status

| Area | Status | Catatan |
|---|---|---|
| 7 Fase build (master prompt) | ✅ **100%** | Phase 0–7 selesai & ter-commit |
| Hasil audit (P0–P3) | ✅ **100%** | 17 item diperbaiki |
| Test otomatis | ✅ **65/65** | `npm run check` (tsc --noEmit + tsx smoke.mjs) |
| Type-check | ✅ Bersih | `npx tsc --noEmit` |
| Production build | ✅ OK | 182 kB gzip (697 kB JS) |
| Wiki build | ✅ OK | `npx vitepress build wiki` 29s, 45 md, `ignoreDeadLinks:true` |
| Dev server | ✅ Live | `0.0.0.0:5173` (sandbox preview) |
| CI/CD | 🟡 Siap | Workflow tersimpan; Pages tinggal 1 klik |
| Analytics + error handling | ✅ Terpasang | Di-wire ke game |

---

## Metrik

| Metrik | Nilai |
|---|---|
| Total kode | ~6.740 baris (41 file src + test) |
| Bundle (gzip) | 182 kB JS + ~1.93 kB CSS (697 kB raw) |
| Chunk | 484 (16 m, LOD 3 level) |
| Draw call bangunan | ~70 (sebelum instancing ~200) |
| Entitas hidup | ±46 (player, 24 mobil parkir, 10 lalu lintas, 14 thug, 22 ped, polisi dinamis) |
| Wiki | 45 md (13 overview + 31 subpage + index), `wiki/catalogue.json` 4 cluster, `wiki/index.md` 13 repo |
| Reference clones | `repos/` 110 dirs whole clone (`.git` intact), `gta-game-toolkit/reference/` 12 stubs (read-only) |
| Commit di branch | 21 → pending push |
| Branch di origin | `main`, `gh-pages` (PR #2 merged) |

---

## Garis Waktu

### Sesi 1 — Build 7 Fase (10 commit)
| Fase | Hasil |
|---|---|
| 0 Scaffold | Scene + renderer + lighting shadow + ground |
| 1 Player | 3rd-person controller + stamina + kamera anti-dinding |
| 2 Open World | Kota prosedural 484 chunk, LOD, menara 72 m |
| 3 Vehicles | 24 parkir + fisika + naik/turun + damage |
| 4 Combat | 4 senjata hitscan + AI musuh + pickup + respawn |
| 5 NPCs | Pejalan kaki + lalu lintas + wanted + polisi |
| 6 Missions | 4 tipe misi + minimap + uang/XP + save/load |
| 7 Polish | Siang/malam + hujan + partikel + audio + bloom + mobile |

**Gate:** tiap fase di-commit terpisah, build hijau.

### Sesi 2 — Audit & Perbaikan (5 commit)
- `AUDIT.md` dibuat: 2 bug P0, 2 performa P1, 8 isu P2, 6 tech-debt P3
- **P0:** hitbox capsule (B-1) + mobile rewrite (B-2)
- **P1:** marker no-rebuild (P-1) + alokasi hot path (P-2)
- **P2:** tabrak-pejalan-kaki + wanted (I-3/4), save lengkap (I-5), viewmodel (A-4),
  pause menu (A-5), audio spatial (A-6)
- **P3:** spatial query (A-2), engine cleanup (I-1), CI workflow

**Test:** 13 → 25.

### Sesi 3 — Infrastruktur (2 commit)
- **Analytics** `src/analytics/` (tracker + gameTelemetry)
- **Error handling** `src/utils/` (logger + errors)
- **CI/CD** — `CI_WORKFLOW.md`, `scripts/setup-gh-workflows.sh`, `scripts/publish-gh-pages.sh`
- **gh-pages** berhasil di-publish (verifikasi: isi bersih, base benar)

**Catatan insiden:** script publish v1 sempat menghapus `.git` lokal → direcovery penuh
dari origin (semua commit sudah ter-push), script diperbaiki (kini kerja di temp clone).

**Test:** 25 → 30.

### Sesi 4 — Performa & QA (1 commit)
- **A-3 InstancedMesh** — LOD ring sederhana jadi 1 draw call/chunk
- **Playwright visual smoke** `tests/visual.spec.ts` (jalan di CI)

**Test:** 30 → 34.

### Sesi 5 — Refactor (1 commit) + push
- **A-1 ModeController** — Game.ts 639 → 556 baris; state machine foot/driving
  dipisah; bug telemetry (lazy wiring) diperbaiki
- Push final, gh-pages di-rebuild

**Test:** 34 → 39.

### Sesi 6 — Vegetation & City Tuning (2026-08-23)
- **Pohon tumpang tindih** `CityGenerator.ts:161` — scatter 9× di loop `bc/bz` → 1× per chunk + `minDist` O(n²) (`tooClose` 5 m pohon/3 m bush/4 m bench), `treeCount 2–4`, snap sidewalk `BLOCK_SIZE+1+rand*1.5` (tinggalkan tengah jalan untuk `TrafficSystem ROADS_X/Z`), bug `bench continue` fixed
- **Verifikasi:** sampling avg 2.22 pohon/chunk jarak ≥5.73 m, `npm run check` 65 passed, `vite build` 65 modules

### Sesi 7 — Day/Night Balancing (2026-08-23)
- **Opsi B (seimbang)** `DayNightSystem.ts:12–110` + `Game.ts:453` — palet `SKY_NIGHT 0x0b1026→0x1a2540`, `FOG_NIGHT 0x0d1330→0x1e2f4a`, band `−0.15..0.4→−0.25..0.6`, `sun 0.15→2.6` jadi `0.35→1.9`, `hemi/ambient` flat, `moon 0.55`, `sky 1.2→26` jadi `3→15`, exposure `0.55+0.6*day→0.70+0.35*day` (+ACES 1.1), sampling tengah malam lebih cerah tanpa noon blow

### Sesi 8 — Wiki Reference Imports 13 Repo (2026-08-23)
- **Sumber truth:** `repos/` 110 whole clone (12 slug + `3D_racing_game` evanbillet fork), `gta-game-toolkit/reference/` stub 5–14 file/jangan jadi file:line
- **Catalogue:** `wiki/catalogue.json` (675 baris, 4 cluster) — Reference Imports `12→13`, `sourceDoc reference/→repos/`, `citationFormat arena-city-try/main` dipertahankan, `3D_racing_game` promoted `children:[]→3` (vehicle-player/track-cpu/scene-config) `repos/3D_racing_game/src/...` byte-identical 46/46 vs `repos/racing`
- **Wiki generation:** `wiki/reference/` `42→45 md` (13 overview `repo.md` + 31 subpage + `index.md`) via `temp_gen` dengan `repos/<slug>/file#L1` keep `arena-city-try/main`; `wiki/index.md` tabel 13 baris + cross-link subpage; `wiki/.vitepress/config.mts` `toSidebarItem()` auto dari catalogue
- **Copy penuh:** `wiki/reference/3D_racing_game/` 3 md mirror `racing/*` (evanbillet vs leslieyip02), overview diperluas audit 6 file + PRPL; `gta-game-toolkit/reference/` dibiarkan read-only
- **Verifikasi:** `npm run check` 65 passed, `vite build` 65 modules 182 kB gzip, `vitepress build wiki` 29s

---

## Verifikasi

```bash
cd gta-game
npm install
npm run check        # tsc --noEmit + tsx smoke.mjs (65/65)
npm run build        # tsc && vite build (65 modules, 182 kB gzip)
npm run preview      # serve dist:4173
npx vitepress build wiki  # wiki build 29s, 45 md
npm run dev          # dev server 0.0.0.0:7777
npm run test:visual  # Playwright (butuh browser, jalan di CI)
```

---

## Yang Masih Terbuka (lihat TODO.md untuk detail)

1. Aktifkan GitHub Pages (1 klik di Settings) — branch `gh-pages` siap
2. Restore `.github/workflows/` via `scripts/setup-gh-workflows.sh` (butuh token berizin `workflows`)
3. Opsional: flip `wiki/.vitepress/config.mts:54` `ignoreDeadLinks:true→false` setelah P0 hollow fix, perkaya `#L1→Lstart-Lend`, upgrade `three 0.147→0.160` produksi (racing/3D_racing_game), analytics endpoint, konten/misi baru, balancing, multiplayer
