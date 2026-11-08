// app/api/revalidate/route.ts — segarkan token Garmin lalu buang cache data

import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { flush, garmin } from "@/lib/garmin/client";

export async function POST() {
  // Endpoint ini Route Handler, jadi boleh menulis cookie. Dipakai untuk menyimpan
  // access token yang sudah di-refresh oleh library — tanpa ini sesi akan mati
  // begitu token lama kedaluwarsa, karena render tidak bisa menulis cookie.
  try {
    const g = await garmin();
    await g.getUserProfile();
  } catch {
    // Belum login / gagal jaringan: tidak ada token baru untuk disimpan.
  }
  await flush().catch(() => null);

  revalidateTag("garmin", { expire: 0 });
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
