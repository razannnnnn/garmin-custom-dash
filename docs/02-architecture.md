# 02 — Arsitektur

## 1. Bentuk saat ini

```
app/
  layout.tsx        root layout, font Geist, metadata, skip-link
  page.tsx          server component → fetchDashboard() → <TopBar> + <AppShell>
  globals.css       998 baris, token + semua styling komponen
components/
  TopBar.tsx        client — sync badge, toggle tema
  AppShell.tsx      client — state tab + matchMedia desktop
  TabBar.tsx        client — 4 tab bawah
  views/            HomeView, ActivitiesView, SleepView, TrainingView
  cards/            ReadinessRing, SnapshotCard, StatCard, SleepCard, ZoneBars, LoadGrid, ActivityCard
  charts/           WeekBars, RouteMap, ElevationSpark
  ui/Icon.tsx       peta nama string → komponen Lucide
lib/
  garmin.ts         klien Garmin server-only + transformasi
  types.ts          kontrak tipe
  mock-data.ts      data contoh
  format.ts         helper format id-ID
```

Tidak ada route handler. Tidak ada `loading`/`error`/`not-found`.
Tidak ada dependency peta.

## 2. Alur data

```
Garmin Connect Personal API  (server only, Bearer JWT)
        │  6 endpoint paralel + N detail aktivitas (GPS)
        ▼
lib/garmin.ts  fetchDashboard()   "use cache" · cacheLife(revalidate 60)
        │  transformasi: bersihkan → null bila kosong → format id-ID
        ▼
app/page.tsx  (server component)
        │  props JSON serializable
        ▼
<AppShell>  → 4 view  → kartu & grafik
```

Aturan yang tidak boleh dilanggar:

1. `Authorization` header hanya dibuat di `lib/garmin.ts`; file ini tidak
   pernah diimpor komponen `"use client"`.
2. Semua transformasi (normalisasi tanggal, format angka, konversi koordinat)
   terjadi di server. Client hanya merender.
3. Bentuk yang menyeberang ke client adalah `DashboardData` — tidak ada objek
   respons mentah Garmin.

## 3. Keputusan yang mengikat

| Keputusan | Alasan | Alternatif yang ditolak |
|---|---|---|
| Semua view selalu dirender, visibilitas via CSS | menghilangkan CLS & remount | `matchMedia` + `useEffect` (sekarang, rusak) |
| Tema diselesaikan di server dari cookie | tanpa flash, media query tetap hidup | tulis `data-theme` dari client (sekarang, rusak) |
| `null` untuk data yang tidak ada | kejujuran data | angka default (sekarang, menyesatkan) |
| Satu dependency baru: `maplibre-gl` | peta asli, tanpa API key | SVG palsu (sekarang), Mapbox (butuh token), Leaflet (raster saja, tanpa rotasi/GPU) |
| Tile: OpenFreeMap | gratis, tanpa key, ada style gelap | CARTO (syarat komersial), MapTiler (butuh key), OSM raster (kebijakan tile) |
| CSS custom properties + kelas biasa | sudah ada, sudah jalan | migrasi ke utility Tailwind (tidak menambah nilai) |
| `framer-motion` tetap | sudah terpasang & dipakai | pindah ke paket `motion` (churn tanpa manfaat) |

## 4. Anggaran performa

- `maplibre-gl` (~200 kB gzip) **wajib** `dynamic(() => import(...), { ssr: false })`
  dan hanya dimuat saat kartu aktivitas masuk viewport.
- Peta feed: `interactive: false` (tidak ada hijack scroll), `pitchWithRotate: false`,
  `attributionControl: false` + atribusi teks sendiri (lebih kecil & bisa di-style).
- Maksimum 5 aktivitas yang di-fetch detail GPS-nya, masing-masing di-downsample
  ke ≤ 400 titik sebelum dikirim ke client.
- LCP target < 2,5 s: tidak ada gambar hero; teks + angka.

## 5. Batas kepercayaan

| Batas | Perlakuan |
|---|---|
| Respons Garmin | divalidasi bentuknya, tidak dipercaya (`toCoords()` menangani 3 bentuk) |
| `process.env` | hanya di server; token divalidasi (JWT exp) sebelum dipakai |
| Props client | sudah kanonik `DashboardData` |
| Tile map | hanya URL style pihak ketiga; tidak ada kredensial |
