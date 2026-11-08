# Garmin Connect (`garminconnect-js`) — Integrasi

Aplikasi menggunakan `garminconnect-js@0.11.0` untuk mengakses endpoint Garmin Connect menggunakan OAuth1/OAuth2 token store lokal.

---

## Alur Autentikasi

1. **Via Browser (`/connect`)**: Masuk dengan email, password, dan kode MFA (bila aktif). Server menyimpan token di `.garmin-tokens/` (`chmod 600`).
2. **Via Terminal (`npm run garmin:login`)**: Skrip CLI interaktif yang menyimpan token ke `.garmin-tokens/` dan memverifikasi profil, aktivitas, tidur, serta kesiapan latihan.

> **Penting:** Token di `.garmin-tokens/` memberikan akses penuh ke akun Garmin Anda. Folder ini sudah masuk `.gitignore` dan hanya pernah dibaca di server (`lib/garmin/client.ts`).

---

## Metode yang Digunakan

| Modul | Metode `garminconnect-js` | Data |
|---|---|---|
| `lib/garmin/client.ts` | `loadTokens()`, `getUserProfile()` | Cek sesi aktif & nama pengguna |
| `lib/garmin/overview.ts` | `getUserProfile()`, `getTrainingReadiness()`, `getDailySummaries()`, `getSleepData()`, `getHrvData()`, `getMaxMetrics()`, `getTrainingStatus()` | Readiness resmi, langkah, kalori, RHR, stres, Body Battery, tidur, HRV, VO₂ Max |
| `lib/garmin/analytics.ts` | `getDailySummaries()`, `getRhrDaily()`, `getHrvDataRange()`, `getSleepDaily()`, `getMaxMetrics()`, `getHeartRateZones()` | Deret waktu 30 hari & metrik latihan |
| `lib/garmin/activities.ts` | `getActivities()`, `getActivity()`, `getActivityDetails()`, `getActivitySplits()` | Daftar aktivitas, detail sesi, rute GPS (`geoPolylineDTO`), deret waktu sensor, dan splits per km (`lapDTOs`) |

---

## Caching & Revalidasi (Next.js 16 Cache Components)

- Semua halaman data memakai `"use cache"`, `cacheLife`, dan `cacheTag("garmin")`.
- Tombol **Muat ulang data** (`POST /api/revalidate`), login (`POST /api/garmin/login`), dan logout (`POST /api/garmin/logout`) memanggil `revalidateTag("garmin", { expire: 0 })` agar cache langsung kedaluwarsa seketika.
