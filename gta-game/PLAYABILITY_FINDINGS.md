# PLAYABILITY FINDINGS — City Density

**Status:** ✅ Fixed (density pass, commit berikutnya)

## Finding (as reported during playtest review)

```
[PLAYABILITY] City density terlalu rendah
- Evidence: 174 buildings / 484 chunks (0.4/chunk); ~12 visible in active ring
- Symptom: kota terasa sepi, cover & read jalan lemah; skyline hampir kosong
- Rekomendasi: ketatkan ROAD_WIDTH/BLOCK_SIZE, naikkan plot chance + district
  falloff (target 25–40 buildings visible); jangan hanya naikin LOD radius
- Impact: chase, gunfight cover, navigasi visual, kesan "kota"
```

## Perubahan yang diterapkan (urutan sesuai rekomendasi)

### 1. Fabric lebih ketat — `CityGenerator.ts`
| Parameter | Sebelum | Sesudah | Efek |
|---|---|---|---|
| `ROAD_WIDTH` | 10 m | **8 m** | road share 25% → 18% |
| `BLOCK_SIZE` | 30 m | **36 m** | plot lebih besar |
| Building footprint / blok | ~45% | **~61%** | target 55–65% tercapai |
| `BLOCK_COUNT` | 8 | **10** | kota 310 m → 432 m; plot total 256 → 400 |

### 2. Density district falloff — `districtAt()`
| District | radius (dari pusat) | Plot chance | Tinggi |
|---|---|---|---|
| Downtown | < 0.28 × half (≈60 m) | **0.95** | 18–64 m (menara pusat 72 m) |
| Mid / residential | < 0.55 × half (≈119 m) | **0.85** | 8–36 m |
| Edge / industrial | sisanya | **0.65** | 5–18 m |

### 3. LOD radius dilonggarkan — `ChunkManager.ts` (setelah density naik)
- `FULL_RADIUS` 1 → **3** (7×7 chunk, detail penuh + windows)
- `SIMPLE_RADIUS` 2 → **4** (9×9 chunk; ring simple tetap 1 InstancedMesh/chunk)

## Hasil terukur

| Metrik | Sebelum | Sesudah | Target |
|---|---|---|---|
| Total bangunan | 174 | **287** | 280–350 ✓ |
| Visible (ring render) | ~12 | **~35** | 25–40 ✓ |
| Median tinggi dekat pusat | — | **30 m** | — |
| Building footprint/blok | ~45% | **~61%** | 55–65% ✓ |
| Road share | 25% | **18%** | — |

**Test:** 39/39 unit + 24/24 bot playtest + build OK — semua hijau setelah tuning.

## Catatan
- Instancing membuat penambahan ini murah: ring simple (9×9) tetap ±64 draw call
  untuk seluruh backdrop bangunan.
- `MinimapSystem.VIEW` 420 → 500 m agar mencakup kota 432 m.
- Traffic spawn disesuaikan dengan CITY_HALF baru (tetap di road terakhir).
- Tuning lanjutan yang mungkin: naikkan `BLOCK_SIZE` ke 40 di district downtown
  saja (pencakar langit lebih lebar), atau tambah 3×3 plot di blok tertentu untuk
  variasi massa — belum dilakukan agar tidak menambah scope.
