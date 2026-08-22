# UI AUDIT — CITY RUSH (threejs-game-ui-designer)

**Skill:** `threejs-game-ui-designer` (SKILL.md + ui-patterns + 4 checklists)
**Tanggal:** 2026-08-22 · **Kode:** main terbaru + UI pass sesi ini

---

## Reference Ledger

```
- ui-patterns.md: YES (dibaca; diterapkan)
- checklists/game-ui-quality.md: YES (dibaca; diterapkan)
- checklists/hud-readability.md: YES (dibaca; diterapkan)
- checklists/responsive-ui-fit.md: YES (dibaca; diterapkan)
- checklists/mobile-input.md: YES (dibaca; diterapkan)
- threejs-image-generator: not-needed (ikon pakai teks/emoji/geometri — probe key MISSING)
- Screenshot: BLOCKED-browser (verifikasi visual via Playwright/CI)
```

## UI State Inventory (sebelum)

| State | Ada? | Kualitas |
|---|---|---|
| Gameplay HUD | ✅ | generic stat-card row (health, cash, level, stamina, thugs, speed campur) |
| Pause/resume | ✅ | tombol resume/mute/restart + stats + controls |
| Fail/retry | ✅ | prompt "YOU DIED — respawning…" |
| Driving | ✅ | speed + vehicle health (di baris sama) |
| Mobile/touch | ✅ | joystick + 4 tombol |
| Debug | ✅ | FPS/POS (dev) — **sebelumnya bocor ke prod (sudah di-gate di sesi QA)** |
| Win/milestone | ⚠️ | toast pickup, bukan state layar |

## UI Intent (sesudah — hirarki gameplay)

1. **Survival** (top-left): health + stamina bar, cash + level chips
2. **Progress** (top-center): mission name + objective + compass (jarak + panah)
3. **Threats** (top-right): wanted stars (badge + pulse saat naik) + thugs badge ☠
4. **Combat/Driving** (bottom-right, zona bergantian): weapon/ammo/reload ATAU speed/vehicle-hp/wrecked
5. **Feedback** (layers): vignette damage, hit marker, pickup toast, dialogue, prompt
6. **Brand** (top-center kecil, subtle) — bukan overlay besar

## Perubahan Sesi Ini

| # | Perubahan | Checklist |
|---|---|---|
| 1 | **Hapus baris stat-card** → 5 cluster dengan zona tetap | game-ui-quality: "no generic dashboard"; hud-readability: placement |
| 2 | **Brand "CITY RUSH" diperkecil** (11px, semi-transparan, top-center) — tidak lagi overlay besar di kiri-atas zona objektif | hud-readability: tidak menutup play path |
| 3 | **`hud__hint` (baris kontrol panjang) DIPINDAHKAN ke pause menu** — tidak lagi selalu tampil di bawah-tengah (jalur play) | ui-patterns: "jangan jelaskan kontrol dengan teks saat ikon bisa"; hud-readability: hindari jalur ancaman |
| 4 | **Wanted → badge bintang + animasi pulse** saat berubah (2 kanal feedback: teks + motion) | hud-readability: "critical status ≥2 feedback channels" |
| 5 | **Thugs → badge ☠** dengan count (bukan teks "THUGS: N" di baris) | ui-patterns: meter/badge sebelum stat-card |
| 6 | **Cash/level → chips** dengan fixed-width numeric (`.hud__num` tabular-nums) | ui-patterns: "fixed-width numeric containers"; "tidak shift layout" |
| 7 | **Driving cluster terpisah** (speed + vehicle hp + WRECKED warn) menggantikan ammo di zona yang sama — tidak pernah tampil bersamaan | hud-readability: tidak overlap |
| 8 | **Debug cluster** (FPS/POS/GPU) → `.hud__debug` DEV-only bottom-left | ui-patterns: "gate debug panels behind dev flag" |
| 9 | **Safe-area inset** untuk mobile buttons (`env(safe-area-inset-*)`) | responsive-ui-fit + mobile-input |
| 10 | Touch targets tetap 56px (≥44 ✓), `touch-action:none` ✓, meta viewport ✓ | mobile-input |

## Hasil Terukur

- `tsc` bersih · **43/43 unit** · **29/29 playtest** · build 169.9 kB gzip
- **0 string debug di bundle prod** (FPS/POS/GPU/CALLS) — dev-only confirmed
- Elemen HUD baru (`hud-driving-warn`, `hud-thugs`, `hud__survival`, `hud__brand`) ada di bundle prod
- Dev server 200

## Text-Fit / Overlap / Touch (verifikasi)

| Item | Status |
|---|---|
| Fixed-width numeric (ammo, cash, level, speed) | ✅ tabular-nums + `.hud__num` |
| Cluster tidak overlap (survival TL, progress TC, threats TR, combat/driving BR) | ✅ zona tetap terpisah |
| Touch target ≥44px | ✅ 56px |
| `touch-action:none` pada tombol | ✅ |
| Safe-area (notch) | ✅ `env(safe-area-inset-*)` |
| Long label (nama misi) wrap | ✅ mission panel min-width + text wrap |
| Overlap HUD vs play path | ✅ brand + mission di top-center kecil; hint dipindah ke pause |

**BLOCKED (butuh browser):** screenshot desktop/mobile, text-fit aktual saat motion,
overlap visual — sudah disiapkan `tests/visual.spec.ts` (CI) + `QA_PLAYTEST_TASK.md`.

## Risiko Tersisa

1. **Verifikasi visual** butuh browser (Playwright/CI atau MCP Chrome DevTools).
2. **Ikon masih teks/emoji** (☠ ★) — image-generator butuh key (MISSING); upgrade
   ikon SVG inline bisa jadi langkah berikutnya tanpa key.
3. **Win/milestone state** belum ada layar khusus (hanya toast) — bisa ditambah.

## Kesimpulan

UI di-upgrade dari "generic stat-card dashboard" ke **cluster HUD berhirarki** sesuai
skill: survival → progress → threats → combat/driving → feedback, dengan zona tetap,
badge/pulse/feedback berkanal ganda, debug gated DEV-only, dan safe-area mobile.
Gate UI lengkap (screenshot verified) menunggu verifikasi browser.
