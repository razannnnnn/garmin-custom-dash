"use client";

// components/shell/TopBar.tsx — bar atas: brand (mobile), status, refresh, tema

import { useEffect, useState } from "react";
import Link from "next/link";
import { Monitor, Moon, Sun } from "lucide-react";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { RouteProgress } from "@/components/ui/RouteProgress";
import { nowClock } from "@/lib/garmin/fmt";

type ThemeChoice = "system" | "light" | "dark";

const NEXT: Record<ThemeChoice, ThemeChoice> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const LABEL: Record<ThemeChoice, string> = {
  system: "Tema: ikut sistem",
  light: "Tema: terang",
  dark: "Tema: gelap",
};

function readCookieTheme(): ThemeChoice {
  const m = document.cookie.match(/(?:^|;\s*)gd-theme=(light|dark|system)/);
  return (m?.[1] as ThemeChoice | undefined) ?? "system";
}

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
  document.cookie = `gd-theme=${choice}; path=/; max-age=31536000; samesite=lax`;
}

export function TopBar({ userName, account }: { userName: string; account?: string }) {
  const [theme, setTheme] = useState<ThemeChoice>("system");
  const [syncLabel, setSyncLabel] = useState<string | null>(null);

  useEffect(() => {
    setTheme(readCookieTheme());
    setSyncLabel(`${nowClock()} WIB`);
  }, []);

  function cycleTheme() {
    const next = NEXT[theme];
    setTheme(next);
    applyTheme(next);
  }

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <header className="topbar">
      <div className="tb-in">
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

        <div className="tb-right">
          <span className="sync" title={account ? `Masuk sebagai ${account}` : undefined}>
            <span className="dot" aria-hidden="true" />
            <span className="stxt">
              {userName}
              {syncLabel ? ` · ${syncLabel}` : ""}
            </span>
          </span>

          <RefreshButton />
          <button
            type="button"
            className="iconbtn"
            onClick={cycleTheme}
            aria-label={`${LABEL[theme]}. Klik untuk mengganti.`}
            title={LABEL[theme]}
          >
            <ThemeIcon size={16} aria-hidden="true" strokeWidth={1.75} />
          </button>
        </div>
      </div>
      <RouteProgress />
    </header>
  );
}
