// app/connect/page.tsx — halaman login Garmin

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { ShieldCheck } from "lucide-react";
import { ConnectForm } from "./ConnectForm";
import { connectionState } from "@/lib/garmin/client";
import { listAccounts } from "@/lib/garmin/credential-store";

export const metadata = {
  title: "Hubungkan Garmin — Garmin Dash",
};

async function load() {
  await connection();
  noStore();

  const state = await connectionState();
  if (state.connected) redirect("/overview");

  return listAccounts().catch(() => []);
}

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const { expired } = await searchParams;
  const isExpired = expired === "1";
  const accounts = await load();

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
                ? "Token akses Garmin sudah tidak berlaku. Masuk ulang untuk melanjutkan — data Anda tidak hilang."
                : "Masuk dengan akun Garmin Connect Anda untuk membaca seluruh data."}
            </p>
          </div>
        </div>

        <ConnectForm accounts={accounts} />

        <div className="connectnote">
          <ShieldCheck size={14} aria-hidden="true" />
          <span>
            Kredensial dikirim langsung ke Garmin lewat HTTPS dan tidak pernah disimpan. Yang
            tersimpan hanya token akses hasil login, terenkripsi di database — bukan di browser.
          </span>
        </div>
      </div>
    </main>
  );
}
