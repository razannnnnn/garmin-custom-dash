// app/(app)/layout.tsx — shell: sidebar desktop + bottom nav mobile

import { BottomNav } from "@/components/shell/BottomNav";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { connectionState } from "@/lib/garmin/client";
import { nowClock } from "@/lib/garmin/fmt";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const state = await connectionState();
  const userName = state.connected ? state.name.split(/\s+/)[0] : "Belum terhubung";
  const sync = state.connected ? `${nowClock()} WIB` : null;

  return (
    <div className="shell">
      <Sidebar />
      <div className="shell-main">
        <TopBar syncLabel={sync} userName={userName} />
        <main id="utama" className="wrap">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}


