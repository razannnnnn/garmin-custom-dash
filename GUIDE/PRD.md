# PRD — Garmin Dash (Next.js Rebuild)

> Dokumen kebutuhan produk untuk pembangunan ulang dashboard kebugaran Garmin.
> Referensi visual: `Dashboard Garmin.html` (prototype v3, single-file HTML).
> Terakhir diperbarui: 2026-10-25

---

## 1. Ringkasan Produk

**Garmin Dash** adalah dashboard personal kebugaran yang menampilkan data dari akun Garmin pengguna: kesiapan latihan, langkah, tidur, detak jantung, beban latihan (CTL/ATL/TSB), Body Battery, HRV, VO₂ Max, dan aktivitas dengan pratinjau peta rute.

**Masalah**: Garmin Connect resmi terlalu ramai dan lambat; pengguna ingin tampilan ringkas yang fokus pada angka-angka penting hari ini, bisa dibuka cepat dari HP maupun desktop.

**Solusi**: Web app Next.js dengan desain minimal "satu aksen warna", data dari Garmin API resmi, responsif dengan pola aplikasi mobile (tab bar bawah) di layar kecil.

**Non-goal**:
- ❌ Fitur connect/pairing Bluetooth perangkat — data diambil via API resmi Garmin, bukan dari jam langsung.
- ❌ Fitur sosial (feed teman, kudos, komentar).
- ❌ Editing/menambah aktivitas manual.
- ❌ Tidak meniru UI Garmin persis — hanya mereferensi jenis datanya.

---

## 2. Pengguna & Skenario

**Pengguna**: 1 pengguna (pemilik akun), atlet amatir yang berlari/hiking/angkat beban.

**Skenario utama**:
1. Buka app di HP pagi hari → langsung melihat skor kesiapan latihan + ringkasan semalam (≤ 3 detik).
2. Pindah ke tab Aktivitas → melihat rute lari tadi pagi di peta + pace + elevasi.
3. Membuka di desktop → melihat semua bagian dalam satu halaman panjang tanpa tab.

---

## 3. Lingkup Fungsional

### 3.1 Navigasi
- **Mobile (< 900px)**: bottom tab bar sticky (glass/blur) dengan 4 tab: **Beranda · Aktivitas · Tidur · Latihan**. Klik tab = ganti view, scroll ke atas, tab aktif diberi warna aksen + pill tint di belakang ikon.
- **Desktop (≥ 900px)**: tab bar disembunyikan; semua view tampil berurutan dalam satu halaman (maks. lebar konten 1120px).
- Top bar sticky: logo, status sinkronisasi ("Garmin Connect API · HH.MM"), toggle tema (dark/light, ikuti sistem + preferensi tersimpan di localStorage/cookie).

### 3.2 Beranda
| Komponen | Isi | Sumber data |
|---|---|---|
| Sapaan | "Selamat pagi/siang/sore/malam, {nama}" + tanggal (locale id-ID) | lokal |
| Kartu Kesiapan | Ring SVG teranimasi + angka count-up, label & catatan | Training Readiness |
| Snapshot hari ini | Body Battery, detak istirahat, stres rata-rata (bar mini) | Body Battery, HR, Stress |
| 6 kartu statistik | Langkah, Tidur, Kalori aktif, Menit intensitas, HRV, VO₂ Max — masing-masing dengan progress bar | Steps, Sleep, Calories, Intensity Minutes, HRV, Max Metrics |
| Grafik langkah 7 hari | Bar chart interaktif (tap bar → readout detail), garis target 10.000 | Daily Steps |

### 3.3 Aktivitas
- Feed vertikal kartu aktivitas (maks 620px, di tengah).
- Setiap kartu: **peta pratinjau rute** (SVG polyline dari koordinat GPS, rute aksen bercahaya, titik mulai/selesai, chip jarak; latar grid + jalan samar) — aktivitas indoor (gym) tanpa peta.
- Kartu unggulan (aktivitas terbaru outdoor): peta lebih tinggi + **grafik elevasi** (area sparkline) + catatan elevasi.
- Baris metrik: jarak, pace/kecepatan, HR rata-rata, dsb.
- **v1**: peta = SVG statis digambar dari data polyline (tanpa tile peta). **v2 (opsional)**: ganti ke Mapbox/MapLibre dengan token sendiri.

### 3.4 Tidur
- Kartu "Tidur semalam": skor besar, total durasi, bar fase (Dalam/Ringan/REM/Terjaga) + legenda, jam tidur & bangun, efisiensi.
- Grafik "Tidur 7 malam": bar chart durasi (jam) dengan garis target 8 jam, tap untuk detail + skor.

### 3.5 Latihan
- Zona detak jantung Z1–Z5 (bar horizontal, menit).
- Beban latihan: 3 sel CTL (Kebugaran), ATL (Kelelahan), TSB (Form + pill status "Segar/Netral/Perlu istirahat") + catatan naratif.

---

## 4. Persyaratan Non-Fungsional

1. **Responsif penuh**: 360px – 1440px+. `safe-area-inset` untuk iPhone notch & home indicator.
2. **Dark mode**: default mengikuti `prefers-color-scheme`, bisa di-override, tersimpan.
3. **Performa**: LCP < 2s, hidrasi cepat, animasi GPU (`transform`/`opacity`), hormati `prefers-reduced-motion`.
4. **Aksesibilitas**: ikon dekoratif `aria-hidden`, tombol tab berlabel, skip-link, focus ring terlihat, angka pakai `tabular-nums`.
5. **Ikon**: icon pack **Lucide** (`lucide-react`) — larangan keras memakai emoji di UI.
6. **Bahasa UI**: Indonesia, locale `id-ID` untuk angka & tanggal.
7. **Keamanan**: kredensial Garmin hanya di server (API routes / server actions); tidak ada data kredensial di client.

---

## 5. Desain Sistem

### 5.1 Warna (lihat `AGENTS.md` untuk token lengkap)
- Latar netral (terang `#F3F5F6` / gelap `#0A1317`), kartu permukaan dengan border halus + shadow lembut.
- **Satu aksen**: teal `#0F7B84` (terang) / `#3AC2B4` (gelap).
- Warna semantik hanya untuk chip ikon & bar: heart `#D6495A`, sleep `#5E5AD6`, batt `#4E9E63`, stress `#D08A2E`, run `#3E8FD8` (versi dark lebih terang).

### 5.2 Tipografi
- **Geist** (sans) + **Geist Mono** (angka meta/label kecil), `font-variant-numeric: tabular-nums` untuk semua angka data.

### 5.3 Gerak (Framer Motion)
- Entrance: fade + rise 12px, stagger 40–70ms per kartu, easing `cubic-bezier(.22,.8,.32,1)`.
- Ring & bar: animasi width/offset saat mount, sekali saja.
- Rute peta: gambar polyline dengan `pathLength` (stroke-dash reveal) per kartu.
- Tab switch: konten view fade-in singkat; jangan animasi berlebihan.

---

## 6. Arsitektur Teknis (ringkas)

- **Next.js (App Router) + TypeScript**, Tailwind CSS, Framer Motion (`motion`), `lucide-react`.
- Data Garmin diambil **server-side** (route handler `/api/*` atau server component) → dikirim ke client sebagai props JSON.
- Prototype `Dashboard Garmin.html` adalah sumber kebenaran visual & struktur objek `D` (lihat `docs/data-contract.md`).
- Detail konvensi kode, struktur folder, dan aturan untuk AI: **`AGENTS.md`**.

---

## 7. Milestone

| Fase | Isi | Kriteria selesai |
|---|---|---|
| M1 — Scaffold | Next.js + Tailwind + Framer Motion + Lucide, design token, top bar, tema dark/light | Halaman dasar render, token terpasang |
| M2 — Beranda | Sapaan, ring kesiapan, snapshot, 6 kartu statistik, grafik langkah | Persis mengikuti prototype, responsif |
| M3 — Navigasi | Bottom tab bar (mobile) + layout desktop single-page | 4 tab berfungsi, scroll reset |
| M4 — Tidur & Latihan | Kartu tidur + grafik 7 malam, zona HR, CTL/ATL/TSB | Selesai per PRD 3.4–3.5 |
| M5 — Aktivitas | Feed kartu + peta SVG + elevasi | Rute tergambar & teranimasi |
| M6 — Integrasi Garmin | Route handler + fetch data resmi, cache, error state | Data nyata tampil, ada loading skeleton & error state |
| M7 — Polish | Skeleton loading, empty state, PWA (opsional), audit Lighthouse ≥ 90 | Lulus audit |

---

## 8. Status Quo (per 2026-10-25)

- ✅ Prototype v3 (`Dashboard Garmin.html`) selesai & terverifikasi visual: tab bar, 4 view, peta rute, tema dark/light, desktop & mobile.
- ⏳ Rebuild Next.js: **belum dimulai**.
- ⏳ Koneksi Garmin API resmi: **belum dimulai** (pemetaan tool tersedia di `docs/data-contract.md`).
