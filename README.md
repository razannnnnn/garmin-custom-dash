<div align="center">

<img src="./docs/assets/icon.svg" alt="Garmin Dash" width="112" height="112" />

# Garmin Dash

**Dashboard latihan pribadi untuk data Garmin Connect Anda sendiri.**
Kesiapan latihan, tidur, HRV, Body Battery, dan setiap sesi lengkap dengan peta rute —
semuanya dalam satu tempat, tanpa langganan.

[![Next.js](https://img.shields.io/badge/Next.js-16.4.3-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.3-087EA4?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=flat-square&logo=leaflet&logoColor=white)](https://leafletjs.com)

[**Buka Aplikasi**](https://garmin-custom-dash.vercel.app) · [Dokumentasi](./docs/README.md) · [Laporkan Bug](https://github.com/razannnnnn/garmin-custom-dash/issues)

</div>

---

## Daftar Isi

- [Kenapa proyek ini](#kenapa-proyek-ini)
- [Fitur](#fitur)
- [Tangkapan Layar](#tangkapan-layar)
- [Cara Kerja](#cara-kerja)
- [Stack Teknologi](#stack-teknologi)
- [Mulai Menjalankan](#mulai-menjalankan)
- [Variabel Lingkungan](#variabel-lingkungan)
- [Struktur Proyek](#struktur-proyek)
- [Keamanan](#keamanan)
- [Deploy ke Vercel](#deploy-ke-vercel)
- [Pemecahan Masalah](#pemecahan-masalah)
- [Keterbatasan](#keterbatasan)
- [Kredit](#kredit)

---

## Kenapa proyek ini

Aplikasi Garmin Connect resmi menampilkan banyak data, tetapi menyebarkannya ke
banyak layar dan mengunci sebagian analisis di balik langganan. Garmin Dash
mengambil **data mentah milik Anda sendiri** lewat API Garmin, lalu menyusunnya
ulang menjadi satu alur yang bisa dibaca dalam hitungan detik: *hari ini
bagaimana, sebulan terakhir bagaimana, sesi terakhir bagaimana.*

Tidak ada server basis data. Tidak ada data yang dikirim ke pihak ketiga. Token
Anda tersimpan di cookie browser Anda sendiri.

## Fitur

<table>
<tr>
<td width="50%" valign="top">

**🩺 Overview**
Ringkasan satu layar untuk hari ini.
- Skor **kesiapan latihan** + status latihan
- **Body Battery**, detak istirahat, HRV semalam
- Langkah vs target, kalori aktif, menit intensitas
- Ringkasan **tidur** dan level stres
- 12 aktivitas terakhir

</td>
<td width="50%" valign="top">

**📈 Analytics**
Tren 30 hari dalam grafik.
- Detak istirahat · HRV · durasi & skor tidur
- VO₂ Max · Body Battery harian & terkuras
- Pace, cadence, dan power per sesi
- Level stres harian
- Total jarak, durasi, elevasi, dan rata-rata

</td>
</tr>
<tr>
<td width="50%" valign="top">

**🗺️ Aktivitas**
Daftar sesi dengan filter tipe.
- Filter per jenis olahraga (lari, sepeda, hiking, …)
- Thumbnail jejak rute di tiap baris
- Metrik ringkas: jarak, pace, durasi, HR, elevasi
- **Peta rute interaktif** di halaman detail
- Unduh **GPX** asli dari Garmin

</td>
<td width="50%" valign="top">

**📊 Detail Sesi**
Gaya Strava, dari data Anda sendiri.
- Grid statistik lengkap (jarak, pace, HR, cadence, power)
- Grafik **elevasi** dan **detak jantung**
- **Split per kilometer**
- Upaya terbaik, zona HR, efek latihan

</td>
</tr>
</table>

**Lainnya**

- 🌗 **Mode terang & gelap** — mengikuti sistem, bisa dioverride, tersimpan di cookie
- 📱 **Responsif** — sidebar di desktop, bottom nav di ponsel
- ♿ **Aksesibel** — navigasi keyboard, `aria-*`, dan menghormati `prefers-reduced-motion`
- 🔒 **Privat** — token terenkripsi di cookie `httpOnly`, tidak ada file token di server
- ⚡ **Streaming** — kerangka halaman tampil seketika, data menyusul

## Tangkapan Layar

> Belum tersedia. Ingin berkontribusi? Kirim tangkapan layar Overview, Analytics,
> dan Detail Sesi lewat Pull Request.

## Cara Kerja

```
Browser ──► proxy.ts          cek cookie ada? kalau tidak → /connect
        ──► layout (server)   validasi token ke Garmin, render shell
        ──► page (server)     ambil data Garmin, kirim ke client
        ──► view (client)     grafik, peta, animasi
```

Tiga keputusan yang membentuk arsitekturnya:

**1. Token di database, sesi di cookie.**
Login menghasilkan token OAuth Garmin. Token itu dienkripsi **AES-256-GCM** lalu
disimpan di tabel `garmin_credentials` (Supabase). Cookie browser hanya berisi UUID
baris itu, jadi cookie tetap kecil, token tidak pernah menyentuh browser, dan satu
akun bisa dipakai dari beberapa perangkat sekaligus.

**2. Halaman di bawah `(app)` tidak pernah di-prerender.**
Data ditentukan oleh cookie pengunjung. Kalau Next.js mem-prerender shell saat build,
hasilnya bisa tersaji ke pengunjung lain — kebocoran data antar-pengguna. Karena itu
`proxy.ts` menjadi gerbang, dan setiap halaman memakai `connection()` + `noStore()`.

**3. Server Component hanya membaca.**
Next.js melarang mengubah cookie saat render. Token hasil *refresh* disimpan lewat
Route Handler (`/api/revalidate`), bukan di tengah render.

## Stack Teknologi

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Framework | **Next.js 16.4** App Router | Server Components, streaming, `cacheComponents` |
| Bahasa | **TypeScript 5** (strict) | Data Garmin berbentuk `Record<string, unknown>` — tipe memaksa validasi |
| API klien | **garminconnect-js 0.11** | Autentikasi OAuth + MFA Garmin yang sudah teruji |
| Styling | **Tailwind 4** + CSS variables | Token warna terpusat, tema gelap/terang |
| Animasi | **framer-motion 14** | Transisi masuk, count-up, menghormati `reduced-motion` |
| Peta | **Leaflet 1.9** + OpenStreetMap | Tanpa API key, tanpa biaya |
| Ikon | **lucide-react 1.61** | Ringan dan konsisten |

## Mulai Menjalankan

**Prasyarat:** Node.js 20+ dan akun Garmin Connect.

```bash
# 1. Klon repositori
git clone https://github.com/razannnnnn/garmin-custom-dash.git
cd garmin-custom-dash

# 2. Pasang dependensi
npm install

# 3. Siapkan kunci enkripsi token
cp .env.example .env.local
openssl rand -base64 48        # salin hasilnya ke GARMIN_TOKEN_SECRET

# 4. Jalankan
npm run dev
```

Buka <http://localhost:3000>, lalu masuk dengan akun Garmin Anda di halaman `/connect`.

### Perintah

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi |
| `npm start` | Jalankan hasil build |
| `npm run typecheck` | Cek tipe tanpa emit |

## Variabel Lingkungan

| Nama | Wajib | Keterangan |
|---|:---:|---|
| `GARMIN_TOKEN_SECRET` | ✅ | Kunci enkripsi token sebelum masuk database. **Minimal 32 karakter acak.** Buat dengan `openssl rand -base64 48`. Kalau diubah, semua akun harus login ulang. |
| `SUPABASE_URL` | ✅ | URL proyek Supabase, mis. `https://xxxx.supabase.co`. |
| `SUPABASE_SECRET_KEY` | ✅ | Secret key Supabase (melewati RLS). **Hanya untuk server.** Dashboard → Project Settings → API Keys → Secret keys. |

> `.env.local` **tidak** ikut ter-commit (lihat `.gitignore`). Gunakan
> `.env.example` sebagai templat. Jangan pernah menaruh nilai asli di `.env.example`.

## Struktur Proyek

```
app/
├── (app)/                    # halaman yang butuh login
│   ├── layout.tsx            # shell: sidebar + topbar + bottom nav
│   ├── overview/             # ringkasan hari ini
│   ├── analytics/            # tren 30 hari
│   ├── activities/           # daftar + detail sesi
│   └── coach/                # (belum aktif)
├── connect/                  # halaman login Garmin
└── api/garmin/
    ├── login/                # POST  masuk
    ├── logout/               # POST  keluar
    └── gpx/[id]/             # GET   unduh GPX

proxy.ts                      # gerbang login sebelum render
lib/garmin/
├── client.ts                 # klien Garmin (cache per-request)
├── credential-store.ts       # TokenStore: enkripsi + simpan ke Supabase
├── session.ts                # cookie sesi (UUID kredensial)
├── overview.ts               # susun data Overview
├── analytics.ts              # susun data Analytics
├── activities.ts             # daftar & detail sesi
├── geo.ts                    # koordinat, downsample, parser GPX
└── fmt.ts                    # format angka & waktu (Asia/Jakarta)
components/
├── charts/                   # Sparkline, DayBars, ElevationChart
├── map/                      # ActivityMap (Leaflet) + RouteThumb
├── shell/                    # Sidebar, TopBar, BottomNav
└── ui/                       # Icon, Motion, RefreshButton
docs/                         # dokumentasi teknis mendalam
```

## Keamanan

| Aspek | Penerapan |
|---|---|
| Token OAuth | Enkripsi **AES-256-GCM** di database; cookie sesi `httpOnly` + `secure` + `SameSite=Lax` |
| Akses database | RLS aktif tanpa policy; `grant` dicabut dari `anon` & `authenticated`. Publishable key ditolak untuk SELECT/INSERT/DELETE (HTTP 401) |
| Secret key | Hanya dibaca di server, tidak pernah dikirim ke browser |
| Kredensial | Dikirim langsung ke Garmin lewat HTTPS; **tidak pernah disimpan** |
| Kebocoran antar-pengguna | `proxy.ts` + `connection()` + `noStore()` mencegah cache lintas sesi |
| Rahasia di repo | `.env*` dan `.garmin-tokens/` diabaikan Git; `.env.example` tanpa nilai |

> ⚠️ **Token Garmin memberi akses baca-tulis ke akun Anda.** Jangan bagikan cookie
> browser, dan segera ganti password Garmin jika token diduga bocor (itu membatalkan
> seluruh token OAuth yang lama).

## Deploy ke Vercel

1. Impor repo di [vercel.com/new](https://vercel.com/new)
2. Tambahkan Environment Variable **`GARMIN_TOKEN_SECRET`** untuk Production
   (dan Preview bila perlu) — nilai acak ≥32 karakter
3. Deploy, lalu buka `/connect` dan login

```bash
# atau lewat CLI
vercel link
vercel env add GARMIN_TOKEN_SECRET production
vercel deploy --prod
```

Setelah mengubah environment variable, **redeploy** agar nilai baru terbaca.

## Pemecahan Masalah

<details>
<summary><b>Halaman terus kembali ke <code>/connect</code> setelah login</b></summary>

Garmin membatasi percobaan login berulang dari satu IP server. Pesan yang muncul
biasanya menyebut *"rate limited"* atau *"Not authorized for sso/signin (401)"*.

- Tunggu **±15–30 menit**, lalu coba lagi
- Pastikan email & password benar sebelum mencoba ulang
- Kalau tetap gagal, pastikan `GARMIN_TOKEN_SECRET` sudah diset **dan** sudah
  di-redeploy setelah diset

</details>

<details>
<summary><b>Cookie tidak tersimpan di browser</b></summary>

- Akses lewat **HTTPS** (cookie memakai atribut `secure` di produksi)
- Periksa mode penyamaran / ekstensi pemblokir cookie
- Pastikan jam sistem perangkat benar

</details>

<details>
<summary><b>Muncul "Sesi Garmin berakhir"</b></summary>

Refresh token Garmin kedaluwarsa (biasanya setelah beberapa minggu tidak dipakai)
atau password Garmin berubah. Login ulang di `/connect` — data Anda tidak hilang.

</details>

<details>
<summary><b>Sebagian metrik kosong ("—")</b></summary>

Tidak semua perangkat Garmin merekam semua metrik. VO₂ Max, HRV, dan Body Battery
hanya tersedia pada perangkat yang mendukungnya. Data yang tidak ada ditampilkan
sebagai `—`, bukan angka palsu.

</details>

<details>
<summary><b>Peta tidak muncul di detail sesi</b></summary>

Aktivitas dalam ruangan (treadmill, gym) tidak merekam GPS. Untuk aktivitas luar
ruang, Garmin Dash memakai polyline dari detail aktivitas, dengan fallback ke GPX.

</details>

## Keterbatasan

- **Token disimpan per akun di database**, jadi satu akun bisa dipakai dari beberapa perangkat.
- **Tidak ada basis data.** Riwayat hanya sebatas yang dikembalikan API Garmin.
- **Satu pengguna per sesi browser.** Cocok untuk pemakaian pribadi, bukan multi-tenant.
- **Halaman Coach belum aktif** — masih berupa pratinjau.

## Kredit

Dibangun di atas:

- [garminconnect-js](https://github.com/DynamicsNinja/garminconnect-js) — klien API Garmin
- [Leaflet](https://leafletjs.com) & [OpenStreetMap](https://www.openstreetmap.org/copyright) — peta
- [Next.js](https://nextjs.org), [React](https://react.dev), [Tailwind CSS](https://tailwindcss.com)
- [lucide](https://lucide.dev) — ikon
- [Geist](https://vercel.com/font) — tipografi

Proyek ini tidak berafiliasi dengan Garmin Ltd. Garmin dan Garmin Connect adalah
merek dagang Garmin Ltd.

---

<div align="center">

**Dokumentasi lebih dalam → [docs/](./docs/README.md)**

Dibuat untuk dipakai sendiri, dibagikan siapa tahu berguna.

</div>
