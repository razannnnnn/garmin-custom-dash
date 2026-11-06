# 03 — Arah Desain (Redesign)

## Design read

> Ini dashboard operasional harian untuk **satu** atlet, dibuka 3 detik di HP
> pagi hari dan dilihat lama di desktop. Bahasa: **cockpit data** — angka besar,
> garis rambut, satu aksen. Bukan landing page, bukan portofolio.

Dials: `VARIANCE 6` · `MOTION 4` · `DENSITY 7`.

Konsekuensi langsung: **kartu sebagai wadah default dihapus.** Pada density 7
pengelompokan dilakukan dengan garis dan jarak, bukan kotak di dalam kotak.

---

## 1. Apa yang salah pada desain sekarang

| Pola sekarang | Kenapa terbaca "AI slop" | Pengganti |
|---|---|---|
| Setiap bagian = kartu putih radius 20px + shadow | card soup; elevasi dipakai untuk semuanya sehingga tidak menandakan hierarki | satu elevasi: `1px solid var(--line)`, tanpa shadow; pemisah = `border-top` |
| `filter: drop-shadow(0 0 6px accent)` pada ring & rute | halo ber-offset nol = dekorasi, bukan kedalaman | stroke solid, penekanan lewat ketebalan |
| Latar peta `repeating-linear-gradient` 2 sumbu | grid hias yang berpura-pura jadi peta | peta MapLibre asli |
| `--font-mono` pada **semua** label kecil | monospace sebagai kostum "teknis" | mono **hanya** untuk angka, satuan, waktu, koordinat |
| `.eyebrow` uppercase di atas hampir setiap blok | ritme templat | maksimum **2** di seluruh aplikasi, dan hanya bila memuat data (timestamp, sumber) |
| Radius 20px kartu + 99px pill + 9px bar + 13px ikon | skala radius acak | 3 nilai: `14px` permukaan · `10px` elemen dalam · `999px` chip status |
| Chip `backdrop-filter: blur` di atas peta | kaca sebagai dekorasi | chip solid + border 1px |
| 3 blok hero terpisah (ring / snapshot / stat) | semua terlihat sama penting | satu blok hero + satu "ledger hari ini" |

---

## 2. Prinsip yang mengikat

1. **Angka adalah antarmuka.** Ukuran huruf mengikuti kepentingan data, bukan
   kepentingan seksi.
2. **Satu aksen.** Teal tetap aksen tunggal. Warna semantik (heart/sleep/batt/
   stress/run) hanya boleh muncul sebagai penanda kategori, tidak pernah sebagai
   latar blok besar.
3. **Garis rambut, bukan kotak.** `1px var(--line)` memisahkan; radius hanya
   untuk elemen yang benar-benar berdiri sendiri.
4. **Gerak satu momen.** Satu choreography masuk per halaman (stagger pada rail
   statistik). Grafik tumbuh sekali. Tidak ada animasi berulang.
5. **Jujur soal data.** Nilai tidak tersedia = `—` + keterangan, bukan angka.

---

## 3. Token

Dipertahankan dari `globals.css` (sudah baik, tinggal dirapikan):

```
--bg --surface --surface2 --ink --mute --faint --line --track
--accent --accent-deep
--heart --sleep --batt --stress --run
```

Ditambah:

```
--r-surface: 14px;   /* permukaan berdiri sendiri */
--r-inner: 10px;     /* elemen di dalam permukaan */
--hair: 1px solid var(--line);
--map-attr: var(--faint);   /* atribusi peta */
```

Dihapus: `--shadow` (tidak dipakai lagi), `--mapline` (peta palsu hilang),
`--r-card: 20px`, `--r-in: 12px`.

**Kontras minimum** (diukur, bukan diasumsikan):

| Pasangan | Rasio | Status |
|---|---|---|
| `--ink` di `--surface` (terang `#0F1D23` / `#FFFFFF`) | 15.6:1 | AAA |
| `--mute` di `--surface` (terang `#5A6E76` / `#FFFFFF`) | 5.6:1 | AA |
| `--faint` di `--surface` (terang `#8DA1A8` / `#FFFFFF`) | 3.1:1 | hanya untuk ≥18px / non-esensial |
| `--ink` di `--surface` (gelap `#E9F1F3` / `#101C22`) | 13.9:1 | AAA |
| `--mute` di `--surface` (gelap `#8FA6AE` / `#101C22`) | 6.1:1 | AA |
| `#FFFFFF` di `--accent` (terang `#0F7B84`) | 5.4:1 | AA |
| `#06131A` di `--accent` (gelap `#3AC2B4`) | 9.8:1 | AAA |

`--faint` **tidak boleh** dipakai untuk label yang perlu dibaca pada ukuran
kecil; naikkan ke `--mute`.

---

## 4. Tipografi

- **Display/angka:** Geist Sans, `font-weight 700–800`, `letter-spacing -0.03em`
  (batas bawah -0.04em).
- **Body:** Geist Sans 14.5px / 1.55, `max-width: 65ch`.
- **Mono:** Geist Mono **hanya** untuk: nilai angka, satuan, jam, koordinat,
  label sumbu grafik. Bukan untuk "Body Battery", bukan untuk judul seksi.
- Semua angka data: `font-variant-numeric: tabular-nums`.

---

## 5. Bentuk tiap layar

### Beranda
```
Selamat pagi, Auva                        ← h1, 1 baris
Sabtu, 25 Oktober 2026 · data 07.42 WIB   ← baris data, mono untuk jam

┌ hero ──────────────────────────────────────────────────────┐
│  82        Siap latihan                                    │
│  ─────     HRV stabil dan tidur cukup…                     │
│  dari 100                                                  │
└────────────────────────────────────────────────────────────┘

┌ ledger hari ini ───────────────────────────────────────────┐
│ Body Battery      76 %        ▓▓▓▓▓▓▓▓░░                  │
│ Detak istirahat   54 bpm      −2 dari rata 7 hari          │
│ Stres rata-rata   28 /100     ▓▓▓░░░░░░░                   │
└────────────────────────────────────────────────────────────┘

Langkah  Tidur  Kalori  Intensitas  HRV  VO₂max   ← rail 6, garis rambut vertikal

Langkah 7 hari                              rerata 9.620  ← header baris, bukan kartu
│▁▃▅▂▇▄█│ + garis target
```

Bukan lagi: ring besar dengan glow, tiga kartu terpisah, enam kartu berbingkai.

### Aktivitas
- Kartu unggulan: peta asli tinggi 200px (non-interaktif) + tombol
  "Perbesar peta" → mengaktifkan pan/zoom (tetap `scrollZoom: false`),
  lalu metrik & grafik elevasi.
- Sisanya: **baris**, bukan kartu — ikon, judul, waktu, metrik inline,
  dipisah `border-top`. Aktivitas indoor: label "tanpa rute GPS", tanpa peta.
- Aktivitas tanpa GPS tidak menampilkan kotak kosong berbingkai.

### Tidur
- Skor sebagai angka besar, bukan ring.
- Bar fase: satu bar bertumpuk, tanpa glow, dengan label di bawahnya
  sebagai `<dl>`.
- Grafik 7 malam dengan garis target 8 jam.

### Latihan
- Zona: satu bar bertumpuk horizontal (total menit) + baris per zona.
- Beban: 3 kolom dengan garis rambut, bukan 3 kotak `--surface2`.

---

## 6. Yang dilarang (dari craft floor)

- Gradient text, teks metalik.
- `box-shadow` berwarna tanpa offset (halo).
- Glass/blur sebagai dekorasi.
- Grid/garis diagonal sebagai latar hias.
- Emoji sebagai ikon (PRD sudah melarang; ikon tetap Lucide, `strokeWidth` 1.75).
- Eyebrow lebih dari 2 di seluruh aplikasi.
- Angka palsu presisi ("92%", "4.1×") tanpa sumber.
- `h-screen`; gunakan `min-h-[100dvh]` bila perlu.
- Animasi `width`/`height`; hanya `transform` dan `opacity`.
- `window.addEventListener("scroll")`.

## 7. Aksesibilitas (tidak boleh dinegosiasikan)

- `prefers-reduced-motion: reduce` → semua transisi & animasi mati.
- Fokus keyboard terlihat di setiap kontrol (`:focus-visible`, 2px aksen).
- Tab bar: `aria-current="page"`, `aria-controls` menunjuk id view.
- Grafik: `<figure>` + `<figcaption>` ringkas; batang punya `aria-label`.
- Peta: `role="img"` + `aria-label` berisi jarak & nama rute; tombol
  "Perbesar peta" adalah `<button>` sungguhan.
- Kontras mengikuti tabel §3.
