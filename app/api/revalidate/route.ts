// app/api/revalidate/route.ts — simpan token hasil refresh lalu buang cache data

import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { persistTokens, garmin } from "@/lib/garmin/client";

export async function POST() {
  // Route Handler boleh menulis database. Dipakai menyimpan access token yang
  // sudah di-refresh library; kalau dilewatkan, sesi mati saat token berputar.
  try {
    const g = await garmin();
    await g.getUserProfile();
  } catch {
    // Belum login / gagal jaringan: tidak ada token baru untuk disimpan.
  }
  await persistTokens().catch(() => null);

  revalidateTag("garmin", { expire: 0 });
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
