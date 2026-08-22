# QA PLAYTEST TASK - Evaluasi Playability "CITY RUSH"

> **Untuk:** Coding Agent evaluator (memiliki akses **MCP Chrome DevTools**)
> **Game:** CITY RUSH - GTA-like open world (Three.js + TypeScript + Vite)
> **Lokasi kode:** `gta-game/` (root repo ini)
> **Status kode:** main terbaru (39/39 test hijau, sudah termasuk 16 fix bug)

---

## 1. ROLE YANG DIREKOMENDASIKAN

### Playability QA Tester (alias "Game Feel Auditor")

Seorang tester game yang mengevaluasi **apakah game ini layak dimainkan dan menyenangkan** -
bukan sekadar "apakah tidak crash". Perspektif yang diambil: **pemain baru yang belum pernah
melihat game ini**, mencoba dari nol tanpa instruksi apa pun selain yang tampil di layar.

**Tanggung jawab role:**
1. **Memainkan game secara sistematis** (semua sistem, semua misi, mode jalan kaki & mengemudi, mobile viewport)
2. **Mengukur playability secara objektif** (FPS, waktu load, error console, responsivitas kontrol)
3. **Menilai game feel** (sensasi mengemudi, tembak-menembak, kamera, umpan balik)
4. **Menemukan & melaporkan bug** yang memengaruhi playability (severity berjenjang)
5. **Memberi verdict + skor** (layak main? apa yang harus diperbaiki dulu?)

**Sikap yang diharapkan:** teliti, skeptis terhadap "sepertinya jalan", selalu verifikasi dengan
bukti (screenshot/console/recording), dan menilai dari sudut pandang kesenangan, bukan kode.

---

## 2. PROMPT SIAP-PAKAI

```
Kamu adalah Playability QA Tester untuk game browser "CITY RUSH" - GTA-like open
world (Three.js + TypeScript + Vite) yang ada di folder gta-game/ (root repo).

TUGAS: Evaluasi playability game ini secara menyeluruh dan beri VERDICT akhir
(layak rilis / layak dengan catatan / tidak layak). Kamu punya MCP Chrome DevTools -
gunakan untuk benar-benar MEMAINKAN game, bukan hanya membaca kode.

LANGKAH:
1. Setup: cd gta-game && npm install && npm run dev (server di 0.0.0.0:7777).
   Buka http://localhost:7777 via Chrome DevTools MCP. Catat waktu sampai game
   benar-benar bisa dimainkan (loading screen hilang).
2. Pantau sepanjang sesi: console errors/warnings, network failures, FPS.
3. MAINkan game seperti pemain baru (tanpa tahu apa-apa) dan isi checklist di bawah.
   Ambil screenshot untuk setiap temuan penting.

CHECKLIST PLAYABILITY (nilai tiap item 1-5, 5 = sangat baik):
A. Boot & Loading - game muncul <10 detik, loading screen hilang, tidak ada error console.
B. Kontrol On-Foot (WASD+mouse) - responsif, kamera nyaman (tidak mabuk/menabrak dinding),
   sprint+lompat terasa benar, stamina jelas.
C. Kontrol Mengemudi - masuk mobil (E) dekat mobil, throttle/rem/reverse masuk akal,
   kamera mengikuti mobil, keluar mobil (E) menempatkan pemain di tempat wajar.
D. Combat - crosshair akurat vs musuh (tembak badan = kena), umpan balik hit/kill jelas,
   ammo/reload HUD mudah dipahami, ganti senjata (1-4) berfungsi.
E. NPC & Kota - pejalan kaki & lalu lintas membuat kota "hidup", wanted stars muncul
   saat menembak/menabrak warga, polisi mengejar.
F. Misi - 4 tipe (delivery/race/assassination/chase) bisa dijalankan & selesai,
   waypoint/kompas/minimap jelas, reward diberikan.
G. UI/HUD - health, stamina, ammo, minimap, misi, prompt [E] mudah dibaca; tidak ada
   elemen yang menutupi permainan.
H. Game Feel - screen shake saat ledakan, partikel, audio, siang/malam, hujan
   memperkaya (bukan mengganggu) pengalaman.
I. Stabilitas - main 10+ menit: FPS stabil (>45), tidak ada crash/freeze, memory tidak
   membengkak drastis (DevTools Performance/Memory), save/load (ESC->pause) berfungsi.
J. Mobile (jika bisa) - emulasi viewport mobile di DevTools: joystick virtual muncul,
   bisa bergerak/melihat/menembak.

PENGUKURAN OBJEKTIF (catat angka-angkanya):
- FPS rata-rata & terendah (via performance atau overlay FPS di HUD)
- Waktu boot sampai bisa dimainkan (detik)
- Jumlah error console (0 = target)
- Memory growth setelah 5 menit bermain (MB)

TEMUAN BUG: laporkan dengan template di bawah (severity: critical/high/medium/low,
langkah repro, expected vs actual, bukti screenshot/console).

DELIVERABLES (buat di folder gta-game/):
1. PLAYTEST_REPORT.md - hasil checklist + pengukuran objektif + skor per dimensi
   + verdict akhir + rekomendasi prioritas.
2. PLAYTEST_BUGS.md - daftar bug terverifikasi (baru, atau konfirmasi yang di
   BUG_REPORT.md masih ada).

KONSTRAIN:
- JANGAN ubah kode game (murni evaluasi). Boleh usul perbaikan di laporan.
- Semua klaim harus punya bukti (screenshot/console/angka).
- Selesaikan dalam 1 sesi kerja; prioritas: benar-benar mainkan > baca kode.
```

---

## 3. RUBRIK SKOR PLAYABILITY

Skor tiap dimensi (A-J): `1 = rusak/tidak bisa` · `2 = jelek` · `3 = cukup` ·
`4 = baik` · `5 = sangat baik, terasa premium`

**Verdict akhir:**
| Total rata-rata | Verdict |
|---|---|
| 4.0 - 5.0 | Layak rilis |
| 3.0 - 3.9 | Layak dengan catatan (fix P0/P1 dulu) |
| 2.0 - 2.9 | Tidak layak - perbaikan mayor dulu |
| < 2.0 | Belum bisa dimainkan |

**Severity bug:**
- CRITICAL - game tidak bisa dimainkan sama sekali (boot gagal, crash terus, kontrol mati)
- HIGH - fitur utama rusak (misi tidak bisa selesai, combat meleset terus, kamera rusak)
- MEDIUM - mengganggu tapi ada workaround (UI ambigu, NPC aneh, audio hilang)
- LOW - polish (teks typo, animasi aneh, hal minor)

---

## 4. PANDUAN MCP CHROME DEVTOOLS UNTUK TUGAS INI

| Tujuan | Cara pakai DevTools |
|---|---|
| Buka game | navigate ke http://localhost:7777 |
| Cek error console | Panel Console - filter error/warning; catat setiap muncul |
| Ambil bukti | Panel Screenshot (full page / viewport) |
| Emulasi mobile | Device Toolbar (mode responsif) -> pilih iPhone/Pixel |
| Ukur FPS | Performance -> record 30-60 detik saat bermain |
| Cek memory | Performance monitor / Memory -> heap size sebelum & sesudah 5 menit |
| Cek network | Network - pastikan tidak ada request gagal |
| Simulasi interaksi | Input - gerakkan mouse/keyboard layaknya pemain |
| Storage/save | Application -> Local Storage - cek key cityrush_save_v1 |

> Tips: aktifkan "Preserve log" di Console agar error tidak hilang saat reload.
> Gunakan Ctrl+Shift+M (device mode) untuk mobile tanpa harus ganti window size.

---

## 5. TEMPLATE BUG REPORT

```
### [SEVERITY] Judul singkat
- File/Area: (mis. Combat / Driving / HUD)
- Langkah repro:
  1. ...
  2. ...
- Expected: ...
- Actual: ...
- Bukti: screenshot: artifacts/xxx.png · console: ... · FPS saat itu: ...
- Kategori: crash / kontrol / fisika / AI / UI / performa / audio / save
```

---

## 6. KONTEKS TAMBAHAN YANG BERGUNA

- Game dijalankan dari: gta-game/ - npm run dev -> http://localhost:7777
- Test otomatis ada: npm run check (39 test) - tapi itu test logika, BUKAN pengganti main sungguhan
- Bug yang sudah diketahui & diperbaiki: lihat BUG_REPORT.md (3 critical + 8 high + 5 medium sudah di-fix di commit 3f7f357)
- Save/load: otomatis (localStorage), bisa di-reset via menu Pause -> Restart
- Kontrol: WASD gerak, LMB-drag lihat/klik tembak, 1-4 senjata, R reload, E masuk mobil/mulai misi, SHIFT sprint, SPACE lompat, M mute, ESC pause, scroll zoom
