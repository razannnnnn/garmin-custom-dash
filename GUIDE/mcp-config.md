# Garmin MCP — Konfigurasi Dashboard

File ini menjelaskan cara menyambungkan **Dashboard Garmin** ke data nyata via [garmin_mcp](https://github.com/taxuspt/garmin_mcp).

---

## 🚀 Cara Setup Cepat

### Opsi A: Claude Desktop Extension (.dxt)
1. Download `garmin-mcp.dxt` dari [Releases](https://github.com/taxuspt/garmin_mcp/releases)
2. Drag file ke jendela Claude Desktop
3. Masukkan email & password Garmin Connect saat diminta

### Opsi B: Manual via JSON Config

**Lokasi file konfigurasi:**
- macOS/Linux: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Isi konfigurasi:**
```json
{
  "mcpServers": {
    "garmin": {
      "command": "uvx",
      "args": ["garmin-mcp"],
      "env": {
        "GARMIN_EMAIL": "email@anda.com",
        "GARMIN_PASSWORD": "password_anda",
        "GARMIN_ENABLED_TOOLS": "get_steps_data,get_sleep_data,get_heart_rate_data,get_stress_summary,get_activities,get_training_readiness,get_body_battery,get_training_load,get_hrv_data,get_max_metrics,get_intensity_minutes,get_heart_rate_zones"
      }
    }
  }
}
```

### Opsi C: pip install

```bash
pip install garmin-mcp
```

Lalu jalankan:
```bash
garmin-mcp --email email@anda.com --password password_anda
```

---

## 🔧 Tools yang Digunakan Dashboard

| Tool MCP | Data Dashboard |
|---|---|
| `get_training_readiness` | Skor kesiapan latihan (ring besar) |
| `get_daily_steps` | Langkah hari ini & grafik 7 hari |
| `get_sleep_data` | Skor & fase tidur |
| `get_heart_rate_data` | BPM istirahat |
| `get_stress_summary` | Level stres rata-rata |
| `get_body_battery` | Body Battery % |
| `get_activities` | Daftar aktivitas terbaru |
| `get_heart_rate_zones` | Zona HR minggu ini |
| `get_training_load` | CTL / ATL / TSB |
| `get_hrv_data` | HRV semalam |
| `get_max_metrics` | VO₂ Max |
| `get_intensity_minutes` | Menit intensitas |

---

## 📋 Cara Update Data Dashboard

Setelah MCP terhubung di Claude:

1. Buka Claude Desktop
2. Tanyakan: *"Ambil semua data kebugaran Garmin hari ini dan format sebagai objek JavaScript untuk dashboard saya"*
3. Salin output ke bagian `const DATA = {...}` di `index.html`
4. Refresh halaman dashboard

---

## 🔒 Keamanan

- Jangan commit `claude_desktop_config.json` ke Git
- Gunakan environment variable alih-alih menulis password langsung
- Tambahkan `.gitignore`:

```gitignore
claude_desktop_config.json
.env
*.env
```

---

## 📁 Struktur Proyek

```
GARMIN_DASH/
├── index.html          ← Dashboard utama (redesign)
├── Dashboard Garmin.html ← Versi lama (referensi)
├── mcp-config.md       ← File ini
└── .gitignore          ← (disarankan dibuat)
```
