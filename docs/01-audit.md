# 01 — Audit Bug & Error

Setiap temuan punya bukti. Tingkat: **P0** memblokir data nyata, **P1** salah
tampil/salah data, **P2** kualitas & aksesibilitas.

---

## P0 — Token Garmin kedaluwarsa, kegagalan tidak terlihat

**Bukti**

```
$ node -e '…decode JWT payload exp…'
exp= 2026-10-25T11:05:27.000Z  expired= true  days_overdue= 10

$ curl -H "Authorization: Bearer $GARMIN_PERSONAL_API_KEY" \
    https://personal.connectapi.garmin.com/activitylist-service/activities/search/activities?limit=2
401
```

**Dampak.** Setiap request gagal 401 → `fetchDashboard` menelan error →
seluruh aplikasi menyajikan `mockData`. Tidak ada satu pun elemen UI yang
memberi tahu *kenapa*. Pengguna bisa berhari-hari melihat angka palsu.

**Perbaikan**
- `DashboardData.source: "live" | "demo"` + `warnings: string[]`.
- Strip sumber data di atas halaman: `Sumber: data contoh · token kedaluwarsa 10 hari`.
- `fetchDashboard` membedakan "belum ada token", "token kedaluwarsa",
  "token ditolak (401)", "sebagian endpoint gagal".
- Footer tidak lagi hardcode "Data contoh" (bug B16).

---

## P1 — Data karangan disajikan sebagai data nyata

`lib/garmin.ts` memakai angka default yang tidak pernah berasal dari Garmin:

| Baris | Nilai karangan |
|---|---|
| 296 | `bodyBatteryMostRecentValue ?? 75` |
| 374 | `stress = … : 24` |
| 379 | `hrvMs = … ?? 48` |
| 380 | `vo2 = … ?? 49` |
| 383 | readiness diturunkan dari Body Battery |
| 411 | `sleepScore ?? 78` |
| 417 | `sleepSecs ?? 24000` |
| 555-557 | `ctl ?? 42`, `atl ?? 48` |
| 511 | menit zona HR karangan bila tidak ada data |

**Perbaikan.** Semua field opsional menjadi `number | null`. UI merender `—`
dengan label "belum ada data". Mode demo hanya aktif lewat satu jalur eksplisit
(`mockData`), tidak pernah lewat angka default di tengah transformasi.

---

## P1 — Zona waktu tidur salah

`formatTime()` menerima `wellnessStartTimeGMT` lalu memformat dengan
`getHours()` (waktu lokal server). Server produksi biasanya UTC → jam tidur
dan jam bangun meleset 7 jam untuk pengguna WIB.

**Perbaikan.** Prioritaskan field non-GMT (`sleepStartTimestampLocal`), fallback
memformat eksplisit di `Asia/Jakarta`, dan tampilkan zona di UI.

---

## P1 — "Ikuti sistem" pada tema rusak permanen

`TopBar` menulis `data-theme="light"|"dark"` ke `<html>` saat mount. Aturan CSS
`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }`
jadi tidak pernah aktif lagi. Sekaligus: flash tema pada paint pertama, dan
ikon bulan/matahari salah sebelum hidrasi.

**Perbaikan.** Tema tiga status (`system` / `light` / `dark`) disimpan di
cookie, diselesaikan **di server** pada `layout.tsx`, sehingga tidak ada flash
dan tidak ada JS yang memutus rantai media query.

---

## P1 — Layout desktop melompat

`AppShell` memutuskan tampilan dari `useEffect` + `matchMedia`. HTML server
hanya berisi Beranda; setelah hidrasi tiga view lain muncul sekaligus (CLS).
Setiap pindah tab, view di-unmount → animasi masuk diputar ulang, dan
`scrollTo` bertabrakan dengan perilaku browser.

**Perbaikan.** Semua view selalu dirender. Visibilitas diatur CSS lewat
`data-active` (`display:none` di mobile untuk view non-aktif). Tidak ada
keputusan layout di JS, tidak ada remount.

---

## P1 — Pembagian nol dan NaN

| Lokasi | Masalah |
|---|---|
| `HomeView` | `week.reduce(…)/week.length` → `NaN` bila kosong |
| `SleepView` | `avgH` → `NaN` bila `week` kosong |
| `SleepCard` | `tot = 0` → lebar `NaN%` |
| `WeekBars` | `max = Math.max(goal, …) * 1.1`, `avg` dihitung tapi tak dipakai |

**Perbaikan.** Guard + satu helper `safeAvg`.

---

## P1 — Garis target grafik bisa keluar dari area plot

`WeekBars` memberi `height: height + 40` pada kontainer (termasuk
`padding-top: 24px` + label 16px) tapi memposisikan garis target dengan
`bottom: 32 + height * (goal/max)` — konstanta `32` tidak terhubung ke skala
yang dipakai batang. Jika `goal > max`, garis melompat keluar kotak.

**Perbaikan.** Satu fungsi `y(value)` dipakai bersama oleh batang dan garis
target.

---

## P1 — "Hari ini" ditentukan dari posisi array

`WeekBars`: `isToday = i === data.length - 1`. Data 7 hari dari Garmin bisa
kosong di hari terakhir (belum sinkron) sehingga label "hari ini" menempel di
hari yang salah.

**Perbaikan.** Index hari ini diturunkan dari tanggal (`calendarDate` vs hari
ini di Asia/Jakarta).

---

## P1 — Urutan data mingguan tidak dinormalisasi

`weekSteps` / `weekSleep` dipetakan apa adanya. Jika Garmin mengembalikan
urut menurun, grafik 7 hari tampil terbalik dan label hari tidak cocok
dengan tanggalnya.

**Perbaikan.** Urutkan naik berdasarkan tanggal, lalu petakan label hari dari
tanggal (bukan dari posisi array).

---

## P1 — Intensitas menit kurang dihitung

`moderateIntensityMinutes + vigorousIntensityMinutes`. Garmin menghitung
menit vigorous ×2 terhadap target 150 menit/minggu.

**Perbaikan.** `moderate + 2 * vigorous`.

---

## P2 — Peta palsu dan pratinjau rute yang tidak pernah bergerak

`RouteMap` menggambar latar kotak-kotak `repeating-linear-gradient` sebagai
"jalan", plus dua `<path class="road">` statis, lalu `polyline` SVG dari
koordinat ternormalisasi 0–100. Tidak ada hubungannya dengan geografi nyata,
dan `lib/garmin.ts` selalu menulis `map: null` sehingga **peta tidak pernah
tampil sama sekali untuk data nyata**.

**Perbaikan.** Diganti peta MapLibre asli (`04-maps.md`).

---

## P2 — Animasi rute tidak idempoten

`RouteMap` memakai `useEffect(…, [])` sehingga `getTotalLength()` hanya
dihitung sekali; jika `points` berubah, path baru tampil tanpa animasi dan
`stroke-dashoffset` tersisa dari path lama.

**Perbaikan.** Komponen peta baru menangani perubahan data lewat
`map.getSource().setData()`.

---

## P2 — Chip jarak tersembunyi dari pembaca layar

`RouteMap` membungkus seluruh isi (termasuk `<span class="chip-km">`) dalam
`aria-hidden="true"`, jadi jarak tidak pernah dibacakan.

**Perbaikan.** Label jarak keluar dari subtree `aria-hidden`.

---

## P2 — Tidak ada error boundary / loading / not-found

`app/` hanya punya `layout.tsx` dan `page.tsx`. Satu throw di komponen client
mengosongkan halaman tanpa jalan pulih.

**Perbaikan.** Tambah `app/error.tsx`, `app/loading.tsx`, `app/not-found.tsx`.

---

## P2 — Tidak ada skrip typecheck/lint

`package.json` hanya `dev` / `build` / `start`. Error tipe tidak pernah
terdeteksi sebelum deploy.

**Perbaikan.** Tambah `"typecheck": "tsc --noEmit"` dan jalankan.

---

## P2 — Tautan brand membuat entri riwayat `#`

`<a className="brand" href="#">` menambah `#` ke URL dan menggeser fokus.

**Perbaikan.** `href="/"`.

---

## P2 — Pengumuman ganda pada ring kesiapan

`role="img" aria-label="Skor kesiapan latihan: 82 dari 100"` membungkus angka
`82` yang juga ada di DOM → pembaca layar membaca dua kali.

**Perbaikan.** Teks visual `aria-hidden`, satu label pada wrapper.

---

## P2 — Glow neon pada elemen data

`.ring .v { filter: drop-shadow(0 0 6px …) }` dan `.rt { filter: drop-shadow(…) }`
adalah halo ber-offset nol: dekorasi, bukan kedalaman. Bertentangan dengan
`03-design.md` §"Jangan".

**Perbaikan.** Dihapus; penekanan lewat ketebalan dan warna solid.

---

## Catatan: cache menahan kegagalan

`fetchDashboard` memakai `"use cache"` + `cacheLife({ revalidate: 60, expire: 3600 })`.
Karena error ditelan di dalam scope cache, 401 ikut ter-cache. Dengan
`revalidate: 60` dampaknya ≤ 60 detik (stale-while-revalidate), jadi 401
tidak ditangani khusus — tapi ini sebabnya setelah token diperpanjang UI
bisa masih menampilkan data contoh sampai satu menit. Didokumentasikan di
`07-runbook.md`.
