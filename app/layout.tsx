// app/layout.tsx — root layout
//
// Tema harus diketahui SEBELUM paint pertama supaya tidak berkedip. Membaca
// cookie lewat `cookies()` di sini memblokir prerender seluruh route (Cache
// Components), jadi cookie dibaca oleh skrip inline blocking di <head>.
// Efek sampingnya justru benar: pilihan "system" tidak menulis atribut apa pun,
// sehingga prefers-color-scheme tetap bekerja.

import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { MotionProvider } from "@/components/ui/MotionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Garmin Dash — Ringkasan Kebugaran",
  description:
    "Dashboard kebugaran Garmin: kesiapan latihan, langkah, tidur, zona detak jantung, beban latihan, dan aktivitas dengan peta rute.",
  icons: {
    icon: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='%230F7B84'/><path d='M12 34h10l5-12 8 22 6-14h11' fill='none' stroke='white' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/></svg>`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1114" },
  ],
};

const THEME_SCRIPT = `try{var m=document.cookie.match(/(?:^|;\\s*)gd-theme=(light|dark)/);if(m)document.documentElement.setAttribute("data-theme",m[1])}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <a className="skip" href="#utama">
          Langsung ke konten
        </a>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
