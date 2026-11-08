// app/(app)/layout.tsx — shell: sidebar desktop + bottom nav mobile
//
// Layout ini membaca cookie (status login) jadi harus dirender per-request. Tanpa
// `connection()` Next.js mencoba mem-prerender-nya saat build; di build tidak ada
// cookie (selalu "belum login") sehingga redirect ke /connect menempel ke semua
// halaman di bawahnya.

import { connection } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/shell/BottomNav";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { connectionState } from "@/lib/garmin/client";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await connection();
  noStore();

  const state = await connectionState();

  if (!state.connected) {
    redirect(state.reason === "expired" ? "/connect?expired=1" : "/connect");
  }

  return (
    <div className="shell">
      <Sidebar />
      <div className="shell-main">
        <TopBar userName={state.name.split(/\s+/)[0]} />
        <main id="utama" className="wrap">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
