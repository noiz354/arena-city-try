# PR HANDOFF — Cara Membuat PR Baru (untuk sesi coding baru)

> ⚠️ **Kenapa tidak dibuat dari sesi ini:** sesi `arena/01a027e8-arena-city-try` ini
> **sudah ditutup untuk remote GitHub** — PR #1 sudah di-merge/close di sisi lain,
> sehingga `git push` / `gh pr create` / `git fetch` ditolak oleh GitHub.
> Semua kerja lokal sudah di-commit di branch ini; tinggal **2 perintah** di sesi baru.

---

## 1. State saat ini (sudah siap)

| Item | Nilai |
|---|---|
| Branch kerja | `arena/01a027e8-arena-city-try` @ `HEAD` (lihat bawah) |
| Branch target | `main` |
| Commit baru vs main | **7** (semua sudah ter-commit lokal) |
| Working tree | ✅ bersih |
| Test | 43/43 unit · 29/29 playtest · build OK · tsc bersih |

**7 commit baru vs main (isi PR):**
1. `b0dc5ae` — Bot playtest headless (24→29 assertions) + PLAYTEST_LOCAL.md
2. `06599a1` — City density pass: 174→287 bangunan, ~35 visible (target 25–40)
3. `061a934` — QA audit (threejs-qa-release): 2 bug fixed + fail/retry & softlock sweep
4. `11cda47` — AAA graphics pass: sky dome, lighting stack, bruiser variant
5. `c3843a8` — UI pass: cluster HUD, wanted pulse, debug gated DEV-only
6. `398c145` — Profile pass: −98.8% per-frame GC churn
7. `(commit terakhir)` — Sync skills docs + PR handoff

> Catatan: commit `b0dc5ae`..`398c145` dibuat di atas base lama (1b8b5a6), sedangkan
> `main` sudah berisi PR #1 yang di-merge + commit fix `3f7f357`. Jika ada konflik
> saat PR, resolve dengan mengambil versi `main` untuk file yang tidak diubah
> sesi ini, dan versi branch untuk file yang memang diubah.

---

## 2. Perintah untuk sesi baru (jalankan dari repo root)

```bash
# 1) Pastikan branch & sinkron dengan main terbaru
git checkout arena/01a027e8-arena-city-try
git fetch origin
git rebase origin/main          # resolve konflik bila ada, lalu:
# git add <file> && git rebase --continue

# 2) Push branch (buat/update remote branch)
git push -u origin arena/01a027e8-arena-city-try

# 3) Buat PR ke main
gh pr create --base main --head arena/01a027e8-arena-city-try \
  --title "Post-merge improvements: density, QA/AAA/UI/profile passes (threejs-game-skills)" \
  --body "$(cat gta-game/PR_BODY.md)"
```

> Jika token GitHub App kamu tidak punya izin `workflows`, JANGAN masukkan file
> `.github/workflows/*` dalam commit PR ini (akan ditolak push) — workflow CI/CD
> tetap tersimpan di `gta-game/CI_WORKFLOW.md` + `scripts/setup-gh-workflows.sh`.

---

## 3. Ringkasan isi PR (untuk deskripsi)

**7 commit** yang menerapkan **seluruh koleksi skill `majidmanzarpour/threejs-game-skills`**
ke implementasi game:

| Skill | Hasil |
|---|---|
| `threejs-qa-release` | Audit QA → 2 bug fixed (debug HUD bocor ke prod, respawnTimer negatif); bot playtest diperluas (fail/retry + softlock 120s); laporan `QA_AUDIT_REPORT.md` |
| `threejs-aaa-graphics-builder` | Sky dome gradient (shader), lighting stack (hemisphere+rim), varian musuh "bruiser", contact discs, renderer diagnostics; laporan `GRAPHICS_AUDIT_REPORT.md` |
| `threejs-game-ui-designer` | Cluster HUD (survival/progress/threats/combat-driving), wanted pulse, debug DEV-only, safe-area mobile; laporan `UI_AUDIT_REPORT.md` |
| `threejs-debug-profiler` | −98.8% per-frame GC churn (960→11 B/frame, cache+reuse); laporan `PROFILE_AUDIT_REPORT.md` |
| (density, prasyarat AAA) | Kota 174→287 bangunan, ~35 visible (target 25–40) |

**Verifikasi:** `npm test` 43/43 · `npm run test:play` 29/29 · `tsc --noEmit` bersih ·
`npm run build` OK (~170 kB gzip) · dev server 200.

**Risiko tercatat (di laporan):** verifikasi visual/GPU masih menunggu browser
(`tests/visual.spec.ts` di CI / `QA_PLAYTEST_TASK.md` via MCP Chrome DevTools);
generator keys (Tripo/Gemini/ElevenLabs) probe = MISSING.

---

## 4. Lampiran: body PR siap pakai (`gta-game/PR_BODY.md`)

Lihat file `PR_BODY.md` di folder ini — isinya deskripsi PR yang sudah jadi,
tinggal dipakai sebagai `--body-file gta-game/PR_BODY.md`.
