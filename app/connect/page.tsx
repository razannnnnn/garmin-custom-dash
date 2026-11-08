// app/connect/page.tsx — halaman login Garmin

import { ShieldCheck } from "lucide-react";
import { ConnectForm } from "./ConnectForm";

export const metadata = {
  title: "Hubungkan Garmin — Garmin Dash",
};

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const { expired } = await searchParams;
  const isExpired = expired === "1";

  return (
    <main className="connectwrap">
      <div className="connectcard">
        <div className="connecthead">
          <span className="mark" aria-hidden="true">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </span>
          <div>
            <h1>{isExpired ? "Sesi Garmin berakhir" : "Hubungkan Garmin"}</h1>
            <p>
              {isExpired
                ? "Token akses Garmin di browser ini sudah tidak berlaku. Masuk ulang untuk melanjutkan — data Anda tidak hilang."
                : "Masuk dengan akun Garmin Connect Anda untuk membaca seluruh data."}
            </p>
          </div>
        </div>

        <ConnectForm />

        <div className="connectnote">
          <ShieldCheck size={14} aria-hidden="true" />
          <span>
            Kredensial dikirim langsung ke Garmin lewat HTTPS dan tidak disimpan. Yang disimpan hanya
            token akses, terenkripsi di cookie browser Anda sendiri — tidak ada file token di server,
            dan JavaScript halaman tidak bisa membacanya.
          </span>
        </div>
      </div>
    </main>
  );
}
