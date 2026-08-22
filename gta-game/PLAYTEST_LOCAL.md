# PLAYTEST LOKAL — Hasil Tes di Sandbox (headless)

**Tanggal:** 2026-08-22 · **Kode:** main terbaru (39/39 unit test hijau, 16 bug fix termasuk)
**Metode:** Bot playtest headless (`tests/playtest.mjs`, `npm run test:play`) + verifikasi
server/modul. **Bukan** pengganti main sungguhan dengan mata & telinga — itu butuh browser
(lihat `QA_PLAYTEST_TASK.md` untuk agent dengan MCP Chrome DevTools).

---

## ✅ Yang bisa & sudah diuji di sini

### 1. Bot playtest end-to-end (24 assertions, semua lolos)
Bot memainkan alur game sungguhan (sistem asli, bukan stub terpisah):

| Skenario | Hasil |
|---|---|
| **Jalan kaki** (W, 2 dtk) | ✅ Bergerak 10.5 m, posisi finite |
| **Sprint** (SHIFT+W, 1.5 dtk) | ✅ Stamina 100 → 67, tidak negatif |
| **Lompat** (SPACE) | ✅ Peak y=2.60, mendarat y=0.95 (gravitasi jalan) |
| **Tembak** (aim ke dada musuh) | ✅ HP 100 → 66 (hitbox capsule bekerja), mag berkurang |
| **Masuk mobil** (E dekat mobil) | ✅ mode→driving, mobil occupied+stolen |
| **Mengemudi** (W throttle 3 dtk) | ✅ Bergerak 44.2 m, ~79 km/h, posisi finite |
| **Belok** (A 1.2 dtk) | ✅ Δyaw 2.04 rad |
| **Keluar mobil** (E) | ✅ mode→foot, mobil bebas, pemain di samping mobil (3.0 m) |
| **Misi delivery** (E di zona → ambil → antar) | ✅ start → objective 1 → selesai, uang 0→150 |
| **Invariant** | ✅ Semua posisi entitas finite (player, 24+10 mobil, 14 musuh, 22 ped); tidak ada NaN |

### 2. Server & modul
- Dev server `0.0.0.0:7777` jalan; semua modul kunci HTTP 200 (main, Game, ModeController,
  WeaponSystem, analytics tracker, error handler, HUD)
- Production build OK: 168 kB gzip, tsc bersih

### 3. Unit test yang sudah ada
- `npm run check` → **39/39** (chunk/LOD, kendaraan, senjata/ammo, lalu lintas, wanted+polisi,
  misi, save/load, ray-capsule, analytics tracker, ModeController)

---

## ❌ Yang TIDAK bisa diuji di sandbox ini

1. **Rendering visual aktual** — tidak ada browser (CDN download browser diblokir: playwright,
   apt, npmmirror semuanya unreachable; hanya npm registry yang bisa)
2. **FPS sungguhan di GPU/WebGL** — tidak ada WebGL context headless
3. **Game feel subjektif** — sensasi kamera, handling mobil, kepuasan tembak (butuh manusia/bot browser)
4. **Input nyata keyboard/mouse/touch** — hanya input sintetis virtual
5. **Mobile viewport & joystick** — butuh emulasi device di DevTools
6. **Console errors runtime** (bukan module-level) — butuh browser (test Playwright sudah
   disiapkan: `tests/visual.spec.ts`, jalan di CI / mesin dengan browser)

---

## Rekomendasi

1. **Di tempat kamu:** jalankan task `QA_PLAYTEST_TASK.md` dengan coding agent + MCP Chrome
   DevTools — itu mencakup apa yang tidak bisa dilakukan di sini (visual, FPS, feel, mobile).
2. **Di CI:** restore workflow (`scripts/setup-gh-workflows.sh`) → job `visual-smoke`
   otomatis menjalankan Playwright (boot + HUD + FPS + zero console errors).
3. **Catatan:** bot playtest ini bisa dijadikan regression baseline — tambahkan skenario baru
   (misi race/assassination/chase, wanted + polisi, tabrak pedestrian) seiring fitur bertambah.
