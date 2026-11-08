// proxy.ts — gerbang login sebelum halaman (app) dirender
//
// Halaman di bawah (app) menampilkan data milik pemilik cookie. Tanpa gerbang ini
// Next.js sempat mem-prerender shell-nya saat build lalu menyajikannya ke pengunjung
// tanpa cookie — artinya data satu pengguna bisa terbaca pengguna lain.
//
// Proxy hanya memeriksa KEBERADAAN cookie, tanpa mendekripsi (Edge runtime tidak
// punya node:crypto). Validitas token tetap diperiksa di layout lewat Garmin API.

import { NextResponse, type NextRequest } from "next/server";

const TOKEN_COOKIE = "gd_garmin_tok";

export function proxy(req: NextRequest) {
  if (req.cookies.has(TOKEN_COOKIE)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/connect";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/overview/:path*", "/activities/:path*", "/analytics/:path*", "/coach/:path*"],
};
