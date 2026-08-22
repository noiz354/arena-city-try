# GTA GAMEPLAY FEATURE CHECKLIST — CITY RUSH

> Riset fitur gameplay franchise Grand Theft Auto (GTA III → Vice City → San Andreas →
> IV → V/Online), disusun sebagai checklist dengan pemetaan status implementasi di
> **CITY RUSH** (Three.js + TypeScript).
>
> **Legenda status:** ✅ sudah ada · ⚠️ sebagian/parsial · ⬜ belum ada · 🔵 sengaja tidak relevan (scope)

---

## 1. Open World & Eksplorasi

| Fitur GTA | Deskripsi | Status CITY RUSH |
|---|---|---|
| Peta kota besar yang bisa dijelajahi bebas | Dunia urban padat dengan jalan & bangunan | ✅ city ~310m, 484 chunk, 3-level LOD |
| Free roam tanpa batas linear | Bisa jalan/drive ke mana saja kapan saja | ✅ |
| Streaming wilayah (chunk/stream) | Muat/buang area berdasarkan posisi pemain | ✅ ChunkManager + spatial grid |
| Beragam distrik/area | Area berbeda karakter & konten | ⚠️ grid seragam, belum ada distrik tematik |
| Area pedestal (desa/hutan/pedalaman) | Variasi bioma | ⚠️ terrain ring rumput, belum pedalaman kaya |
| Interior bangunan yang bisa dimasuki | Restoran, toko, safehouse, dll | ⬜ belum ada interior |
| Landmark ikonik | Gedung khas kota | ⚠️ menara landmark 72m (1 saja) |
| Racun/penghalang area terlarang | Batas area terkunci | ⬜ |

---

## 2. Karakter Pemain (Player)

| Fitur GTA | Deskripsi | Status |
|---|---|---|
| Kamera third-person | Chase cam di belakang karakter | ✅ CameraRig + wall avoidance |
| Jalan / lari / sprint | Gerak dasar | ✅ WASD + sprint |
| Lompat | Jump | ✅ |
| Berenang | Swim (sejak SA) | ⬜ tidak ada air |
| Memanjat / melompat pagar | Climbing (IV/V) | ⬜ |
| Cover system | Berlindung di balik objek (IV/V) | ⬜ |
| Dodge roll | Hindar tembakan | ⬜ |
| Crouch / stealth | Jongkok & siluman | ⬜ |
| Stamina | Energi lari/berenang | ✅ stamina bar (drain/regen) |
| Health + regen | HP, regen otomatis (V) | ✅ health, ⚠️ tanpa auto-regen |
| Armor / body armor | HP tambahan | ⬜ |
| Special ability | Kemampuan unik karakter (V) | ⬜ |
| Character switching | Ganti 3 protagonis (V) | 🔵 (single player) |
| Stats/skill (SA) | Driving, shooting, stamina, muscle, respect | ⬜ |
| Makanan/minuman | Recover HP via food/vending (SA/V) | ⬜ |
| Gym / body shape (SA) | Muscle/fat/stamina | 🔵 |
| Death & respawn | Mati → respawn di rumah sakit | ✅ death/respawn |
| Arrested | Ditangkap polisi → respawn di kantor polisi | ⬜ (hanya mati) |

---

## 3. Combat & Senjata

| Fitur GTA | Deskripsi | Status |
|---|---|---|
| Senjata api (hitscan) | Tembak raycast | ✅ 4 senjata |
| Variasi senjata lengkap | Pistol, SMG, rifle, shotgun, sniper, heavy, explosive | ⚠️ 4 jenis (pistol/smg/rifle/shotgun) |
| Senjata melee | Tinju, katana, chainsaw, baseball bat | ⬜ (belum melee player) |
| Granat / bom | Explosive throwable | ⬜ |
| Aim lock-on / auto-aim | Bantuan bidik | ⬜ (free aim) |
| Aim-down-sight / scope | Bidik scope/sniper | ⬜ |
| Headshot | Damage kepala lebih besar | ✅ rayCapsule (kepala vs badan) |
| Ammo management | Peluru per senjata | ✅ mag + reserve |
| Reload | Isi ulang | ✅ |
| Weapon wheel / switch | Pilih senjata | ✅ tombol digit + viewmodel |
| Weapon pickups di dunia | Ambil senjata di tanah | ✅ PickupSystem |
| Ammu-Nation / beli senjata | Toko senjata | ⬜ |
| Drive-by shooting | Menembak dari kendaraan | ⬜ |
| Dual wield | Dua senjata (SA) | 🔵 |
| Skill senjata (SA) | Poor→Gangster→Hitman | ⬜ |
| Ragdoll / physics death | Mayat jatuh fisik | ⚠️ animasi kematian sederhana |

---

## 4. Kendaraan & Berkendara

| Fitur GTA | Deskripsi | Status |
|---|---|---|
| Mobil yang bisa dikendarai | Enter/exit | ✅ |
| Fisika berkendara | Akselerasi, rem, gesek, gravitasi | ✅ racing pattern |
| Steering + roll visual | Belok + miring badan mobil | ✅ |
| Carjack / rampasan | Tarik pengemudi | ✅ (stolen) |
| Lalu lintas AI | Mobil AI jalan di jalan | ✅ TrafficSystem |
| Parkir kendaraan | Mobil terparkir | ✅ VehicleManager |
| Vehicle damage (visual) | Penyok/asap | ⚠️ health+damage, visual penyok belum |
| Vehicle damage (fungsional) | Performa turun saat rusak | ✅ speed turun saat wrecked |
| Wrecked / meledak | Mobil hancur/ledakan | ✅ wrecked + explosion |
| Pay N' Spray / perbaikan | Repair + hilang wanted | ⬜ |
| Modifikasi kendaraan (mod shop) | Cat, mesin, nitro, hidraulik (SA) | ⬜ |
| Garasi / simpan kendaraan | Simpan mobil | ⬜ |
| Motor | Sepeda motor | ⬜ (hanya mobil) |
| Sepeda | Bicycle (SA) | 🔵 |
| Perahu | Boat | ⬜ (tidak ada air) |
| Helikopter | Heli | ⬜ |
| Pesawat | Plane | ⬜ |
| Tank / kendaraan militer | Tank | 🔵 |
| Radio kendaraan | Ganti stasiun radio | ⬜ |
| Klakson & lampu | Horn/headlight | ⬜ |

---

## 5. Pejalan Kaki & NPC

| Fitur GTA | Deskripsi | Status |
|---|---|---|
| Pejalan kaki (pedestrian) | NPC jalan di trotoar | ✅ PedestrianSystem |
| AI berjalan / idle | Path, berhenti, jalan | ✅ |
| Panik saat bahaya | Lari saat tembak/ledakan | ✅ panicNear |
| Dialogue / speech | NPC bicara | ✅ maybeSpeak |
| Responsif thd pemain | Reaksi | ⚠️ terbatas |
| Pejalan kaki tertabrak | Run-over | ✅ (mobil pemain) |
| Gang / faksi | Kelompok geng (SA) | ⬜ |
| Merekrut anggota (SA) | Ajak homies ikut | 🔵 |
| Kencan / pacar (SA/IV) | Dating | 🔵 |
| Random events / strangers | Kejadian acak di jalan | ⬜ |

---

## 6. Polisi & Wanted System

| Fitur GTA | Deskripsi | Status |
|---|---|---|
| Wanted level (bintang) | 1–6 bintang | ⚠️ stars, tanpa visual bintang penuh |
| Eskalasi unit polisi | Polisi → SWAT → FBI → militer | ⚠️ cops spawn, tanpa eskalasi unit |
| AI polisi mengejar | Chase + menembak | ✅ EnemySystem (cop role) |
| AI polisi patroli | Patroli jalan | ⬜ |
| Roadblock | Blokade jalan | ⬜ |
| Spike strip | Paku ban | ⬜ |
| Evasion (hilang dari radar) | Sembunyi sampai wanted turun | ⚠️ wanted decay, tanpa mekanik sembunyi |
| Ganti kendaraan untuk kabur | Turunkan wanted | ⬜ |
| Pay N' Spray hilangkan wanted | Respawn warna | ⬜ |
| Police bribe (pickup) | Kurangi 1 bintang (SA) | ⬜ |
| Wanted radius di minimap | Lingkaran pencarian | ⬜ |
| Ditangkap (busted) | Busted → kantor polisi | ⬜ |
| Crime detection | Kejahatan menaikkan wanted | ✅ reportCrime (tembak/menabrak) |
| 6-bintang / militer (SA) | Tangki & militer | ⬜ |

---

## 7. Misi & Cerita

| Fitur GTA | Deskripsi | Status |
|---|---|---|
| Misi cerita utama | Main story mission | ✅ MissionSystem |
| Misi sampingan (side) | Side missions | ⚠️ sedikit |
| Tipe misi beragam | Assassination, delivery, chase, race, heist | ⚠️ delivery/assassination/chase |
| Marker / blip misi | Penanda tujuan | ✅ markers + waypoint |
| Objective + reward | Tujuan & hadiah uang | ✅ |
| Checkpoint misi | Simpan progres misi | ⬜ |
| Gagal misi & retry | Fail state | ⚠️ death/respawn, tanpa fail mission |
| Cutscene | Sinematik | 🔵 |
| Dialog karakter | Narasi | ⚠️ baris dialog HUD |
| Heist | Perampokan besar (V) | ⬜ |
| Random encounter | Misi dari NPC acak | ⬜ |
| Mission rating / medal | Skor misi | ⬜ |

---

## 8. Ekonomi & Progresi

| Fitur GTA | Deskripsi | Status |
|---|---|---|
| Uang (cash) | Mata uang | ✅ money di profil |
| Mendapat uang | Reward misi, pickup | ✅ mission reward |
| Membelanjakan uang | Beli barang/properti/senjata | ⬜ |
| Property beli (safehouse) | Beli rumah | ⬜ |
| Asset / bisnis (SA) | Bisnis menghasilkan uang | ⬜ |
| Stock market (V) | Saham | 🔵 |
| Level/XP | Progresi level | ✅ level di profil |
| Kills counter | Statistik | ✅ |

---

## 9. Properti, Bisnis & Aset

| Fitur GTA | Deskripsi | Status |
|---|---|---|
| Safehouse | Rumah simpan/save | ⬜ |
| Garasi properti | Simpan kendaraan | ⬜ |
| Bisnis pasif income | Toko/aset (SA) | ⬜ |
| Gang territory (SA) | Kuasai wilayah | ⬜ |
| Bisnis GTA Online (bunker, nightclub) | Bisnis multiplayer | 🔵 |

---

## 10. Side Activities & Mini-game

| Fitur GTA | Deskripsi | Status |
|---|---|---|
| Taxi mission | Antarkan penumpang | ⬜ |
| Vigilante / polisi mission | Kejar kriminal | ⬜ |
| Paramedic | Ambulans | ⬜ |
| Firefighter | Pemadam | ⬜ |
| Pimping (SA) | — | 🔵 |
| Burglary (SA) | Merampok rumah | 🔵 |
| Balapan (race) | Race sirkuit/street | ⬜ |
| School (SA: driving/flying) | Sekolah skill | 🔵 |
| Gun range challenge | Latihan tembak | ⬜ |
| Collectibles (hidden packages, oyster, tags) | Koleksi tersembunyi | ⬜ |
| Unique stunt jumps | Lompatan unik | ⬜ |
| Mini-game (pool, darts, golf, arcade) | Game kecil | 🔵 |
| Gym / olahraga (SA) | Nge-gym | 🔵 |

---

## 11. Dunia & Lingkungan

| Fitur GTA | Deskripsi | Status |
|---|---|---|
| Siklus siang/malam | Day/night | ✅ DayNightSystem |
| Cuaca | Hujan, cerah | ✅ WeatherSystem (hujan) |
| Hujan membasahi jalan | Wet surfaces | ✅ WetSurfaceSystem |
| Kabut (fog) | Fog | ✅ |
| Langit atmosfer | Sky | ✅ single-scatter sky |
| Bayangan dinamis | Shadows | ✅ shadow + texel snap |
| Vegetasi | Pohon, rumput | ✅ trees + instanced grass |
| Pencahayaan global | Lighting | ✅ key/fill/rim/ambient |
| Post-processing | Bloom, AO, grade | ✅ GTAO + bloom + LUT |
| Efek partikel | Ledakan, asap | ✅ ParticleSystem |
| Properti jalanan | Lampu, hidran, bangku | ✅ props |
| Interiors | Bangunan masuk | ⬜ |
| Kereta / transport publik | Train | 🔵 |

---

## 12. UI / HUD / UX

| Fitur GTA | Deskripsi | Status |
|---|---|---|
| Minimap + GPS rute | Peta kecil + arah | ⚠️ minimap, tanpa GPS rute |
| Pause menu | Menu jeda | ✅ |
| Health/armor bar | Bar status | ✅ health bar |
| Wanted stars display | Bintang wanted | ✅ badge bintang |
| Uang display | Cash counter | ✅ chips |
| Ammo display | Ammo counter | ✅ |
| Radar/blip misi | Penanda di peta | ✅ |
| Radio wheel | Pilih stasiun | ⬜ |
| Phone (IV/V) | Telepon in-game | ⬜ |
| Internet (IV/V) | Web in-game | 🔵 |
| Controls hint | Petunjuk kontrol | ✅ (di pause menu) |
| Safe-area mobile | Notch inset | ✅ |
| Touch controls | Joystick mobile | ✅ MobileControls |

---

## 13. Save & Persistensi

| Fitur GTA | Deskripsi | Status |
|---|---|---|
| Save game | Simpan progres | ✅ localStorage |
| Save otomatis | Auto-save | ✅ tiap 30s |
| Multiple save slot | Banyak slot | ⬜ (1 slot) |
| Simpan properti/inventory | Serialisasi penuh | ✅ weapon inventory + profil |
| Respawn save | Kembali ke save | ✅ |

---

## 14. Multiplayer (GTA Online) — di luar scope single-player

| Fitur | Status |
|---|---|
| Online multiplayer | 🔵 |
| Heist multiplayer | 🔵 |
| Jobs & races online | 🔵 |
| Bisnis online | 🔵 |
| Character customization online | 🔵 |

---

## 15. Audio

| Fitur GTA | Deskripsi | Status |
|---|---|---|
| SFX senjata | Suara tembak | ✅ WebAudio |
| SFX ledakan | Suara ledakan | ✅ |
| Audio spasial | Suara 3D | ✅ PannerNode |
| Musik radio | Stasiun radio | ⬜ |
| Ambience kota | Suara kota | ⚠️ minimal |
| Dialog suara | Voice acting | 🔵 |

---

## Ringkasan Prioritas (Rekomendasi Roadmap)

Berdasarkan gap di atas, urutan yang paling berdampak untuk "feel GTA" CITY RUSH:

1. **Wanted system lengkap** (eskalasi unit, roadblock, evasion, busted) — inti identitas GTA.
2. **Ekonomi & belanja** (beli senjata/armor/properti) — memberi tujuan pada uang.
3. **Cover system + melee** — combat lebih dalam.
4. **Vehicle damage visual + Pay N' Spray + garasi** — kendaraan lebih hidup.
5. **Side missions** (taxi, vigilante, balapan) — konten setelah cerita.
6. **Radio + minimap GPS** — atmosfer & navigasi.
7. **Interiors & distrik** — eksplorasi lebih kaya.

> Catatan: checklist ini adalah riset fitur; status ✅/⚠️/⬜ diisi dari penelusuran kode
> CITY RUSH saat ini (branch `arena/01a02903-arena-city-try`).
