# GRAPHICS AUDIT — CITY RUSH (threejs-aaa-graphics-builder)

**Skill:** `threejs-aaa-graphics-builder` + `threejs-game-director` (routing, ledgers)
**Tanggal:** 2026-08-22 · **Kode:** main terbaru + AAA pass sesi ini
**Batasan jujur:** sandbox ini TIDAK punya browser → **skor visual = estimasi berbasis
arsitektur/kode + bukti terukur (test, build, renderer config)**; screenshot-dependent
kategori ditandai `⚠️ BLOCKED-browser` dan **tidak dihitung sebagai verified**.

---

## Reference Ledger (semua di-load)

```
Skill-loading:
- Director: active (SKILL.md + phase-playbook.md)
- AAA graphics: YES (SKILL.md)
- Gameplay/UI/Debug/QA: loaded pada sesi sebelumnya (QA audit selesai)
- 3D/Image/Audio generators: LOADED (SKILL.md) → butuh key, probe MISSING
References:
- visual-scorecard.md: YES (dibaca; dipakai di bawah)
- implementation-blueprint.md: YES (dibaca)
- model-recipes.md: YES (dibaca)
- render-recipes.md: YES (dibaca; diterapkan)
- technical-art.md: YES (dibaca)
- shader-cookbook.md: YES (dibaca; pola proven dipakai di SkySystem)
- checklists/aaa-game-quality-gate.md: YES (dibaca; dipakai)
- checklists/aaa-visual-scorecard.md: YES (dibaca)
- checklists/material-lighting-quality.md: YES (dibaca; dipakai)
- checklists/performance-safe-visual-detail.md: YES (dibaca; dipakai)
- checklists/procedural-model-quality.md: YES (dibaca; dipakai)
Credential probe (literal output):
  TRIPO_API_KEY=MISSING
  GEMINI_API_KEY=MISSING
  ELEVENLABS_API_KEY=MISSING
```

## External Asset Sourcing Ledger

| Surface | Keputusan | Alasan |
|---|---|---|
| Player (hero) | Procedural | Probe MISSING (tripo); bentuk authored (capsule+nose, secondary trim) |
| Musuh (thug/cop/bruiser) | Procedural | Probe MISSING; 3 varian authored + telegraf warna band |
| Kendaraan | Procedural | Probe MISSING; kit mobil (body/cabin/bumper/wheels/headlights) |
| Bangunan/kota | Procedural | Probe MISSING; texture windows CanvasTexture + instancing |
| Pickup/reward | Procedural | Probe MISSING; 2 varian + contact disc + collect feedback |
| Sky/lingkungan | Procedural shader | Probe MISSING; SkySystem gradient dome (bukan flat color) |
| Audio/SFX | Procedural WebAudio | Probe MISSING; seluruh SFX oscillators/noise |
| Tekstur/decal | Procedural canvas | Probe MISSING |

> Blocker evidence lengkap: ketiga baris probe `=MISSING` + tidak ada API key yang
> diberikan pengguna → procedural adalah jawaban yang diizinkan dengan bukti ini.

---

## Yang Di-Upgrade Sesi Ini (render-recipes: forms → materials → lighting → effects)

| # | Upgrade | File | Alasan (checklist) |
|---|---|---|---|
| 1 | **Gradient sky dome** (ShaderMaterial BackSide: zenith→horizon gradient, glow band dusk, sun disc; di-drive DayNightSystem) | `src/systems/SkySystem.ts` (baru) + `DayNightSystem.ts` + `World.ts` | Latar "flat color" → depth: foreground/midground/background; fog tak lagi satu-satunya penyusun mood |
| 2 | **Lighting stack lengkap**: key sun (shadow) + HemisphereLight fill (sky/ground) + rim light + ambient lemah | `World.ts`, `DayNightSystem.ts` | material-lighting checklist: key/fill/rim/ambient intentional; rim menjaga siluet saat senja |
| 3 | **Contact discs** untuk pickup melayang (dark disc shared, 1 geo+1 mat) | `PickupSystem.ts` | render-recipe: cheap grounding untuk hover/pickup |
| 4 | **Varian musuh ke-3: "bruiser"** — scale 1.35×, HP 180, damage 14, band oranye (telegraf), walk gaits | `EnemySystem.ts` | AAA gate: ≥3 varian authored dengan telegraph unik; health bar pakai maxHealth |
| 5 | **Renderer diagnostics** di dev HUD: draw calls + triangles (renderer.info) | `ui/hud.ts` | performance-evidence + technical-art: baseline tercatat, bukan "seems fine" |

## Technical Art Brief

- **Budget:** ring render 9×9 chunk; bangunan ring sederhana = 1 InstancedMesh/chunk
  (density pass sebelumnya); sky = 1 draw call; pickup disc = 1 geo + 1 mat shared.
- **Material kit:** MeshStandardMaterial di mayoritas permukaan; emissive hanya untuk
  sinyal (lampu jalan, band pickup, jendela menyala, badge cop); MeshBasicMaterial
  hanya untuk disc kontak & UI-less meshes.
- **DPR cap** `Math.min(devicePixelRatio, 2)` + AutoQuality (FPS-based) → mobile aman.
- **Disposal:** sky di-dispose via `World.disposables`; disc shared di-global (1x);
  enemy health bar menyesuaikan maxHealth.

---

## Visual Scorecard (format wajib skill)

Skala 0–3. `⚠️` = diestimasi dari arsitektur/kode, butuh screenshot untuk verified.

| # | Kategori | Sebelum | Sesudah | Bukti terukur |
|---|---|---|---|---|
| 1 | Art direction | 1 | **2** ⚠️ | Theme konsisten (kota 432 m, district falloff, day/night); sky dome baru menambah mood |
| 2 | Hero/player | 2 | **2** ⚠️ | Siluet capsule + nose; material contrast; state cue (stamina) |
| 3 | Obstacles/enemies | 1 | **2** ⚠️ | 3 varian (thug/cop/bruiser) dengan telegraf band warna + scale; HP bar maxHealth |
| 4 | Rewards/interactables | 2 | **2** ⚠️ | 2 varian (crate/ammo) + band warna senjata + contact disc + collect pop + toast |
| 5 | World/environment | 1 | **2** ⚠️ | 287 bangunan, LOD instanced, sky dome, water ring, fog depth; district massing |
| 6 | Materials/textures | 1 | **2** ⚠️ | Windows texture repeat, asphalt noise, roughness/metalness roles, emissive sinyal |
| 7 | Lighting/render | 1 | **2** ⚠️ | ACES tonemap + exposure 1.1; key/fill/rim/hemisphere; shadow 2048; sky gradient; bloom |
| 8 | VFX/motion | 2 | **2** ⚠️ | Event-driven: explosion, smoke, tracers, blood, muzzle flash, screen shake |
| 9 | UI/HUD | 2 | **2** ⚠️ | Genre HUD (health/stamina/ammo/minimap/misi/pause); debug gated DEV-only |
| 10 | Performance evidence | 2 | **2** ✅ | **Terukur:** renderer.info di dev HUD (calls/triangles); 43 unit + 29 playtest; build 169 kB; DPR cap + AutoQuality; budget LOD/instancing |
| | **Rata-rata** | **1.5** | **2.0** | (screenshot-dependent: ⚠️) |

**Automatic failures tersisa (dari aaa-game-quality-gate):**
- ❌ **Screenshot tidak bisa diverifikasi** (BLOCKED-browser) — gate "Screenshots do not read
  as primitives" dan "every category ≥2 dengan average ≥2.3" **belum bisa diklaim lulus**.
- ⚠️ Hero asset procedural-only (blocker: probe MISSING — bukti tercatat).
- ⚠️ Kontak shadow untuk player saat lompat belum ada (hanya disc pickup) — minor.
- ⚠️ "Movement/camera/impact feel tuned through play" — butuh main sungguhan (BLOCKED).

---

## Renderer Diagnostics (headless-measured)

| Metrik | Nilai |
|---|---|
| Bundle prod (gzip) | 169.5 kB (naik ~1.3 kB utk sky shader) |
| Unit tests | 43/43 (termasuk 4 test sky/day-night) |
| Bot playtest | 29/29 |
| Draw call est. (ring 9×9) | ~80–110 (bangunan instanced + props + sky + ground) |
| Sky | 1 mesh, 1 draw call, frustumCulled off, renderOrder -10 |
| Shadow | 1 caster map 2048, frustum mengikuti player |
| DPR / kualitas | cap 2, AutoQuality 3 level |

## Sisa Blocker

1. **Visual verified butuh browser** — jalankan `tests/visual.spec.ts` (CI) atau
   `QA_PLAYTEST_TASK.md` via MCP Chrome DevTools → lalu skor ⚠️ bisa di-upgrade ke verified.
2. Generator keys MISSING — kalau pengguna punya Tripo/Gemini/ElevenLabs key, hero/
   tekstur/audio bisa di-generate dan menggantikan sebagian procedural.
3. Sky dome harus dicek secara visual (shader gradient) — logika diuji, render tidak.

## Kesimpulan

Pass AAA pass ini menaikkan arsitektur visual dari **~1.5 → ~2.0 (estimasi)** dengan
bukti terukur untuk kategori 10 dan perubahan yang bisa diverifikasi di kode: sky dome,
lighting stack, contact discs, varian musuh ke-3, renderer diagnostics. Gate premium
penuh (rata-rata ≥2.3 + screenshot verified) **belum diklaim** — membutuhkan verifikasi
browser yang tersedia di tempat kamu (Playwright/CI atau agent + MCP Chrome DevTools).
