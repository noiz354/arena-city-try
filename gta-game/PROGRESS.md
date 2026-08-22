# PROGRESS — CITY RUSH (GTA-Like Game)

**Proyek:** `gta-game/` · Three.js r185 + TypeScript strict + Vite 8
**Branch kerja:** `arena/01a027e8-arena-city-try` (PR #1 → `main`)
**Terakhir diperbarui:** 2026-08-22

---

## Ringkasan Status

| Area | Status | Catatan |
|---|---|---|
| 7 Fase build (master prompt) | ✅ **100%** | Phase 0–7 selesai & ter-commit |
| Hasil audit (P0–P3) | ✅ **100%** | 17 item diperbaiki |
| Test otomatis | ✅ **39/39** | `npm test` (headless) |
| Type-check | ✅ Bersih | `npx tsc --noEmit` |
| Production build | ✅ OK | 168 kB gzip |
| Dev server | ✅ Live | `0.0.0.0:5173` (sandbox preview) |
| CI/CD | 🟡 Siap | Workflow tersimpan; Pages tinggal 1 klik |
| Analytics + error handling | ✅ Terpasang | Di-wire ke game |

---

## Metrik

| Metrik | Nilai |
|---|---|
| Total kode | ~6.740 baris (41 file src + test) |
| Bundle (gzip) | 168 kB JS + ~7 kB CSS |
| Chunk | 484 (16 m, LOD 3 level) |
| Draw call bangunan | ~70 (sebelum instancing ~200) |
| Entitas hidup | ±46 (player, 24 mobil parkir, 10 lalu lintas, 14 thug, 22 ped, polisi dinamis) |
| Commit di branch | 21 |
| Branch di origin | `main`, `arena/01a027e8-arena-city-try`, `gh-pages` |

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

---

## Verifikasi

```bash
cd gta-game
npm install
npm run check        # tsc --noEmit + npm test (39/39)
npm run build        # production build
npm run dev          # dev server 0.0.0.0:5173
npm run test:visual  # Playwright (butuh browser, jalan di CI)
```

---

## Yang Masih Terbuka (lihat TODO.md untuk detail)

1. Aktifkan GitHub Pages (1 klik di Settings) — branch `gh-pages` siap
2. Restore `.github/workflows/` via `scripts/setup-gh-workflows.sh` (butuh token berizin `workflows`)
3. Merge PR #1 → `main`
4. Opsional: analytics endpoint, konten/misi baru, balancing, multiplayer
