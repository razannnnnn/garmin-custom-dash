"use client";

// components/shell/Sidebar.tsx — navigasi desktop (rail 72px di >=768px, penuh 236px di >=1024px)

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, House, LogOut, Sparkles, Waypoints } from "lucide-react";
import { NAV } from "./nav";

const ICONS = {
  home: House,
  chart: BarChart3,
  activity: Waypoints,
  sparkles: Sparkles,
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/garmin/logout", { method: "POST" }).catch(() => null);
    router.push("/connect");
    router.refresh();
  }

  return (
    <aside className="sidebar" aria-label="Navigasi utama">
      <Link className="brand" href="/overview" aria-label="Garmin Dash — beranda">
        <span className="mark" aria-hidden="true">
          <svg
            width="15"
            height="15"
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
        <span className="bname">
          <i>Garmin</i>&nbsp;<b>Dash</b>
        </span>
      </Link>

      <nav>
        {NAV.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "on" : undefined}
              aria-current={active ? "page" : undefined}
              title={item.label}
            >
              <Icon size={17} aria-hidden="true" strokeWidth={1.9} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidefoot">
        <span className="sidefoot-txt">Data milik Anda</span>
        <button type="button" className="sidefoot-btn" onClick={handleLogout} title="Putuskan Garmin">
          <LogOut size={14} aria-hidden="true" />
          <span>Putuskan Garmin</span>
        </button>
      </div>
    </aside>
  );
}
