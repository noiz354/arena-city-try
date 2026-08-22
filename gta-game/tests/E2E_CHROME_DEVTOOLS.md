# E2E Test Runbook — CITY RUSH via MCP `chrome_devtools`

> Runbook pengujian **end-to-end** yang menjalankan game CITY RUSH lewat MCP server
> **`chrome_devtools`** (Chrome DevTools MCP) di coding agent **lokal** Anda.
> Disusun dari skill: `threejs-qa-release` (browser QA matrix, visual QA, mobile QA),
> `threejs-debug-profiler` (performance workflow), dan `threejs-visual-validation`
> (evidence berbasis mekanisme, bukan screenshot subjektif).
>
> ⚠️ Catatan: MCP `chrome_devtools` **tidak ada di sandbox Arena**, jadi runbook ini
> adalah artefak siap-pakai untuk agent lokal Anda. Di sini saya sudah menjalankan
> bukti *headless* yang setara: `npm test` (65/65), `tsx tests/playtest.mjs` (29/29),
> `tsc --noEmit` bersih, dan dev server `http://localhost:7777` 200 OK.

---

## 0. Skills ledger (track sebelum QA dianggap selesai)

| Skill | Loaded | Digunakan untuk |
|---|---|---|
| `threejs-qa-release` | ✅ | QA workflow, browser QA matrix, interaction/visual/mobile QA |
| `threejs-debug-profiler` | ✅ | renderer diagnostics, performance trace, bottleneck |
| `threejs-visual-validation` | ✅ | no-post baseline, mechanism evidence, temporal checks |
| `threejs-game-director` | ⚠️ | routing (sudah diarahkan ke 3 skill di atas) |

---

## 1. Prasyarat

1. **Server jalan**: `cd gta-game && npm run dev` → `http://localhost:7777`.
   (Di sandbox Arena sudah jalan; di lokal Anda jalankan ulang.)
2. **MCP chrome_devtools terhubung** ke agent lokal Anda.
3. **Browser target**: Chrome/Chromium. Game ini WebGL — pastikan hardware
   acceleration aktif.

> Nama tool di bawah mengikuti standar `chrome-devtools-mcp` (Chrome team). Jika versi
> MCP Anda memakai nama lain (mis. Playwright-MCP `browser_navigate`), samakan intent-nya.

---

## 2. Urutan inti (happy path) — dipetakan ke fitur GTA

Setiap langkah: **tool call → assertion → skill checklist item yang dipenuhi**.

### E2E-01 · Boot & error-free (QA matrix: "console/page/network errors")

```
new_page("http://localhost:7777")
take_snapshot()                       # tunggu sampai elemen HUD muncul
list_console_messages()               # harus TIDAK ada `error`
list_network_requests()               # tidak ada request gagal (4xx/5xx)
take_screenshot({ format: "png" })    # simpan sebagai artifact 01-boot.png
```
Assertion via `evaluate_script`:
```js
// loading screen harus sudah hilang, HUD title ada
(() => ({
  loadingGone: !document.getElementById('loading'),
  title: document.querySelector('.hud__title')?.textContent,
  hasCanvas: !!document.querySelector('canvas'),
  canvasSize: (() => { const r = document.querySelector('canvas').getBoundingClientRect(); return [r.width, r.height] })(),
}))()
```
✅ skill: `qa-release` QA workflow langkah 5–6 (console error + nonblank canvas).

### E2E-02 · Renderer diagnostics (debug-profiler: draw calls/triangles)

```js
(() => {
  const g = window.game
  const i = g.renderer.info.render
  return {
    drawCalls: i.calls,
    triangles: i.triangles,
    geometries: g.renderer.info.memory.geometries,
    textures: g.renderer.info.memory.textures,
    chunksActive: g.world.chunks.activeCount,
    shadowOn: g.renderer.shadowMap.enabled,
    dpr: g.renderer.getPixelRatio(),
  }
})()
```
✅ skill: `debug-profiler` performance workflow langkah 2 (baseline metrics).

### E2E-03 · Karakter bergerak (fitur GTA: jalan/lari/lompat)

Drive keyboard via `evaluate_script` (InputManager mendengar `window`):
```js
// helper sekali pakai: tekan KeyW selama 1s
(async () => {
  const t = performance.now()
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
  await new Promise(r => setTimeout(r, 1000))
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }))
  const p = window.game.player.position
  return { x: p.x, z: p.z, y: p.y, hp: window.game.player.health }
})()
```
Jalankan dua kali (sebelum & sesudah) → **posisi harus berubah >1m**, `y` tetap ~0.95.
Tambahan: `ShiftLeft` sprint (stamina turun), `Space` lompat (y naik sementara).
✅ skill: `qa-release` interaction QA ("move/aim/jump").

### E2E-04 · Naik kendaraan & berkendara (fitur GTA: enter/exit + traffic solid)

```js
// cari mobil terdekat lalu tekan E
(() => {
  const g = window.game
  const nv = g.modeCtrl.nearestVehicle ?? g.vehicles.getNearest(g.player.position.x, g.player.position.z)
  if (nv) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }))
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }))
  return { mode: g.mode, vehicle: g.vehicle !== null }
})()
```
Lalu throttle:
```js
(async () => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
  await new Promise(r => setTimeout(r, 1500))
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }))
  const g = window.game
  return { mode: g.mode, speed: g.vehicle?.speedKmh, wrecked: g.vehicle?.wrecked }
})()
```
✅ skill: `qa-release` interaction QA ("steer/boost", state change foot→driving).

### E2E-05 · Wanted system (fitur GTA: bintang polisi)

```js
(() => {
  const g = window.game
  g.wanted.reportCrime(3, g.player.position)   // tembak/menabrak = crime
  return { stars: g.wanted.stars, cops: g.enemies.enemies.filter(e => e.role === 'cop' && !e.dead).length }
})()
```
Assertion: `stars >= 3` dan cop spawn bertambah setelah beberapa detik.
`take_screenshot()` → badge bintang di kanan-atas terlihat.
✅ skill: `qa-release` interaction QA ("trigger a state change").

### E2E-06 · Collider debug (regresi "invisible collider")

```js
(() => { window.game.colliderDebug.toggle(); return window.game.colliderDebug.enabled })()
take_screenshot({ format: "png" })   # wireframe hijau bounding box terlihat
```
Assertion: spawn (0,0) tidak bersentuhan wireframe mana pun.
✅ skill: `visual-validation` mechanism evidence (collider vs visual sync).

### E2E-07 · Fail/retry (respawn) — **bug yang baru diperbaiki**

```js
(() => {
  const g = window.game
  g.player.takeDamage(9999)               // lethal
  return { hp: g.player.health, respawnTimer: g.modeCtrl.respawnTimer }
})()
```
Tunggu ~3.2s lalu:
```js
(() => {
  const g = window.game
  return { hp: g.player.health, mode: g.mode, timer: g.modeCtrl.respawnTimer }
})()
```
Assertion: `hp === 100`, `mode === 'foot'`, `timer === 0` (bukan negatif).
✅ skill: `qa-release` interaction QA ("restart after fail").

---

## 3. Visual QA (skill `visual-validation` + `qa-release` visual QA)

> Prinsip skill: **jangan setujui dari satu frame**. Tangkap beberapa kondisi.

```
# no-post baseline (buktikan efek post-processing bukan satu-satunya penyebab visual)
evaluate_script: window.game.postfx.enabled = false; window.game.renderer.render(...)  # opsional
take_screenshot() → 03-no-post.png

# kondisi aktif
take_screenshot() → 04-active-day.png      (timeOfDay ≈ 0.5 siang)
take_screenshot() → 05-active-dusk.png     (set window.game.dayNight.timeOfDay = 0.75)
take_screenshot() → 06-active-night.png    (set = 0.0)
```

Auto-fail checklist (dari `qa-release` Visual QA) — jika salah satu terlihat, tandai ❌:
- active screenshot didominasi primitive/box tanpa tekstur
- skyline flat (plane/box)
- HUD generic stat-card
- fog/glow/gelap menyembunyikan geometri yang hilang
- tidak ada renderer diagnostics (E2E-02 sudah memastikan ada)

---

## 4. Mobile QA (skill `qa-release` Mobile QA)

```
resize_page({ width: 390, height: 844 })   # iPhone 12-ish
take_screenshot() → 07-mobile.png
```
Assertion via `evaluate_script`:
```js
(() => {
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  const touchBtns = document.querySelectorAll('.mc-button, .mc-stick, [class*="mc"]')
  return {
    canvasFits: r.width <= 390 && r.height <= 844,
    touchTargets: touchBtns.length,
    hudVisible: !!document.querySelector('.hud__title'),
  }
})()
```
Cek dari `qa-release` Mobile QA: touch target ≥44px, `touch-action:none`, safe-area.
Kembalikan viewport setelahnya: `resize_page({ width: 1280, height: 720 })`.

---

## 5. Performance trace (skill `debug-profiler`)

```
performance_start_trace({ autoStop: false })
# jalankan E2E-03/E2E-04 (gerak + berkendara) di sini
performance_stop_trace()
performance_analyze_insight()   # INP / CLS / LCP / layout shifts
```
Assertion: tidak ada long task >50ms yang konsisten saat berkendara; FPS via
`document.querySelector('#hud-fps').textContent` harus `FPS: \d+` dan >30.

---

## 6. Matriks hasil (template evidence — wajib diisi)

```text
QA result: PASS / FAIL
Commands:
URL: http://localhost:7777
Controls tested: WASD, Shift, Space, E, F3, mouse-click (shoot)
Screenshots/artifacts:
  01-boot.png, 02-renderer.json, 03-no-post.png, 04-active-day.png,
  05-active-dusk.png, 06-active-night.png, 07-mobile.png, 08-wanted.png
Console/page/network errors: (list / "none")
Renderer: drawCalls=..., triangles=..., chunksActive=..., shadow=...
Issues found:
Risks / unmeasured:
```

---

## 7. Catatan teknis penting

- **Keyboard**: game mendengar `window` keydown/keyup dengan `e.code` (`KeyW`, `KeyE`,
  `F3`, `Space`, `ShiftLeft`, `Digit1..4` untuk ganti senjata, `KeyR` reload, `KeyM` mute,
  `Escape` pause). Gunakan `evaluate_script` + `dispatchEvent` (MCP `chrome_devtools`
  tidak punya tool "press_key" generik di semua versi).
- **Shoot**: left-click. MCP `click` ke canvas memicu `mousedown/mouseup` → semi-auto
  (pistol/shotgun) butuh click, auto (SMG/rifle) butuh hold.
- **Look**: drag (mousedown + move). Tidak ada pointer-lock.
- **`window.game`** (diekspos di `main.ts`) adalah pintu masuk state untuk semua assert.

---

## 8. Known-fixed (ditemukan saat menyusun runbook)

- **Respawn timer tidak di-clamp** (`ModeController.handlePlayerDeath`) → `respawnTimer`
  menjadi negatif permanen setelah respawn. **Fixed**: `Math.max(0, ...)`.
  Bukti: `tsx tests/playtest.mjs` kini **29/29** (sebelumnya 28/29).
