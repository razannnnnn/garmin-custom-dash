// components/shell/NotConnected.tsx — ajakan login saat token Garmin belum ada

import Link from "next/link";
import { PlugZap } from "lucide-react";

export function NotConnected({ expired = false }: { expired?: boolean }) {
  return (
    <div className="notconn">
      <span className="notconn-ic" aria-hidden="true">
        <PlugZap size={22} />
      </span>

      <div>
        <h2>{expired ? "Sesi Garmin berakhir" : "Belum terhubung ke Garmin"}</h2>
        <p>
          {expired
            ? "Token akses Garmin sudah tidak berlaku. Masuk ulang untuk melanjutkan — data Anda tidak hilang."
            : "Hubungkan akun Garmin Connect sekali saja. Setelah itu seluruh aktivitas, tidur, HRV, dan metrik latihan bisa dibaca di sini."}
        </p>

        <ul className="notconn-list">
          <li>Aktivitas lengkap dengan splits per kilometer</li>
          <li>Kesiapan latihan, HRV, dan Body Battery</li>
          <li>Tidur beserta fase dan efisiensinya</li>
        </ul>

        <Link className="btn-primary" href="/connect">
          {expired ? "Masuk ulang" : "Hubungkan Garmin"}
        </Link>
      </div>
    </div>
  );
}
