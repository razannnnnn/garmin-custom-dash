"use client";

// components/shell/BottomNav.tsx — navigasi mobile (<768px)

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, House, Sparkles, Waypoints } from "lucide-react";
import { NAV } from "./nav";

const ICONS = {
  home: House,
  chart: BarChart3,
  activity: Waypoints,
  sparkles: Sparkles,
};

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottomnav" aria-label="Navigasi utama">
      {NAV.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "on" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <span className="ic" aria-hidden="true">
              <Icon size={19} strokeWidth={1.9} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
