# 04 — Integrasi Peta & GPS Aktivitas

## 1. Masalah

Saat ini tidak ada peta yang nyata:

- `lib/garmin.ts` baris 541 selalu menulis `map: null` → tidak ada peta untuk
  data nyata sama sekali.
- `components/charts/RouteMap.tsx` menggambar SVG dari koordinat **ternormalisasi
  0–100** di atas latar `repeating-linear-gradient` yang menyerupai jalan.
  Itu ilustrasi, bukan peta.

## 2. Keputusan library

**`maplibre-gl@^6.16.0`** — satu-satunya dependency baru.

| Kandidat | Verdict |
|---|---|
| `maplibre-gl` | ✅ vektor, GPU, tanpa API key, lisensi BSD, 1 paket |
| `mapbox-gl` | ❌ butuh token + billing |
| `leaflet` + `react-leaflet` | ❌ 2 paket, raster saja, tanpa rotasi |
| `@vis.gl/react-maplibre` | ❌ pembungkus tipis; kita hanya butuh 1 peta |
| Google Maps | ❌ butuh key + billing |
| static map API | ❌ tidak ada penyedia gratis tanpa key yang layak |

Pemasangan: `npm install maplibre-gl` (versi terkunci `^6.16.0`, terverifikasi
tersedia di registry).

**Tile: OpenFreeMap** (`https://tiles.openfreemap.org/styles/{style}`) —
terverifikasi merespons 200 untuk `positron`, `bright`, `dark`, `liberty`.
Gratis, tanpa key, tanpa batas komersial, atribusi © OpenStreetMap contributors.

```
tema terang → https://tiles.openfreemap.org/styles/positron
tema gelap  → https://tiles.openfreemap.org/styles/dark
```

Fallback bila gaya gagal dimuat: peta tidak dirender, tampil blok
"peta gagal dimuat" dengan tombol coba lagi. **Tidak** kembali ke SVG palsu.

## 3. Sumber GPS dari Garmin

Endpoint ringkasan aktivitas tidak memuat geometri. Butuh endpoint detail:

```
GET /activity-service/activity/{activityId}/details
    ?maxChartSize=2000&maxPolylineSize=2000
```

Bentuk yang diharapkan (toleran, karena **belum terverifikasi live** — token
kedaluwarsa, lihat `01-audit.md` P0):

```jsonc
{
  "activityId": 123456789,
  "geoPolylineDTO": {
    "startPoint": { "lat": -6.20, "lon": 106.82 },
    "endPoint":   { "lat": -6.21, "lon": 106.83 },
    "polyline": [ { "lat": -6.20, "lon": 106.82, "altitude": 12 }, … ]
  }
}
```

`toCoords(dto)` menangani tiga kemungkinan bentuk:

1. `dto.geoPolylineDTO.polyline[]` berisi objek `{ lat, lon | latitude, longitude }`
2. array pasangan `[[lat, lon], …]`
3. string polyline terenkode Google (decoder ~15 baris)

Hasil selalu `[lon, lat][]` (urutan GeoJSON) atau `null`.

**Batas biaya.** Hanya `limit=5` aktivitas terakhir dengan `distance > 0` yang
detailnya diambil, paralel via `Promise.allSettled`, sehingga satu endpoint
gagal tidak menggagalkan yang lain. Downsample ke ≤ 400 titik
(stride = ceil(n/400), titik terakhir selalu dipertahankan).

**Bila gagal** (401, 404, tidak ada `polyline`): `geo: null` → UI menampilkan
"tanpa rute GPS". Tidak ada peta karangan, tidak ada crash.

## 4. Komponen

`components/map/ActivityMap.tsx` — client, `"use client"`.

```
props:
  coords: [number, number][]   // [lon, lat]
  interactive?: boolean        // default false
  height?: number              // default 200
  label: string                // untuk aria-label
  theme: "light" | "dark"
```

Perilaku:

1. `maplibre-gl` diimpor **dinamis** di dalam `useEffect` (bukan statis) agar
   tidak masuk bundle awal dan aman dari SSR.
2. `new maplibregl.Map({ container, style, interactive: false })
   .on("load", …)` → `addSource("route", geojson LineString)` +
   `addLayer({ type: "line", paint: { line-color: accent, line-width: 3,
   line-opacity: .95 }, layout: { line-cap: "round", line-join: "round" } })`.
3. Titik mulai: layer `circle` radius 5 warna aksen; titik selesai: `circle`
   radius 4, `circle-color` = permukaan, `circle-stroke-color` = aksen.
4. `fitBounds(bounds, { padding: 24, duration: 0 })` — dihitung dari
   `coords.reduce(extend, new LngLatBounds(coords[0], coords[0]))`.
5. `scrollZoom: false` **selalu**. Saat `interactive`, aktifkan
   `dragPan` + `NavigationControl({ showCompass: false })`.
6. `coords` berubah → `map.getSource("route").setData(...)` + `fitBounds` ulang.
7. `ResizeObserver` → `map.resize()` (penting untuk container yang baru tampil
   setelah tab berpindah dari `display:none`).
8. Cleanup: `map.remove()`.
9. Atribusi: `attributionControl: false`, teks kecil sendiri
   `© OpenStreetMap` dengan kontras ≥ 4.5:1 terhadap peta (pakai scrim).

## 5. Perubahan tipe

```ts
// lib/types.ts
export interface Activity {
  …
  geo?: [number, number][] | null;  // [lon, lat], ≤400 titik
  // map?: … DIHAPUS (koordinat 0–100 tidak lagi dipakai)
}
```

`RouteMap.tsx` **dihapus**.

## 6. Data contoh harus punya koordinat nyata

`lib/mock-data.ts` diisi rute Jakarta yang nyata agar peta ikut teruji tanpa
token: rute lari di sekitar GBK / Senayan, hiking di Gunung Pancar, jalan sore
di Kota Tua. Semua `[lon, lat]`. Ini yang membuat peta bisa diverifikasi
secara visual sekarang juga.

## 7. Verifikasi

| Cek | Cara |
|---|---|
| Peta merender | buka tab Aktivitas, peta terlihat dengan geometri jalan nyata |
| Rute tergambar | garis aksen mengikuti koordinat, start/end marker |

> Dua baris tabel di atas sengaja digabung agar bisa diperiksa dalam satu render.

| Cek | Cara |
|---|---|
| Sesuai tema | ganti tema → gaya peta ikut (positron ↔ dark) |
| Tidak hijack scroll | scroll daftar di atas peta; halaman tetap bergulir |
| Interaktif setelah tombol | klik "Perbesar peta" → drag pan & zoom aktif |
| Tanpa GPS | aktivitas gym → label "tanpa rute GPS", tidak ada kotak kosong |
| Gagal muat | blokir `tiles.openfreemap.org` di devtools → pesan gagal + tombol coba lagi |
