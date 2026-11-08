// proxy.ts — gerbang login sebelum halaman (app) dirender
//
// Halaman di bawah (app) menampilkan data milik pemilik sesi. Tanpa gerbang ini
// Next.js sempat mem-prerender shell saat build lalu menyajikannya ke pengunjung
// tanpa sesi — artinya data satu pengguna bisa terbaca pengguna lain.
//
// Proxy hanya memeriksa KEBERADAAN cookie sesi, tanpa membuka database (Edge
// runtime tidak punya node:crypto). Validitas token diuji di layout.

import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "gd_session";

export function proxy(req: NextRequest) {
  if (req.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/connect";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/overview/:path*", "/activities/:path*", "/analytics/:path*", "/coach/:path*"],
};
