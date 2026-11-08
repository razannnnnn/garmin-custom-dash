// app/api/garmin/logout/route.ts — akhiri sesi browser
//
// Sesi hanya dilepas dari browser ini. Kredensial di database tetap ada supaya
// akun bisa dipilih lagi tanpa login ulang.

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { resetGarmin } from "@/lib/garmin/client";
import { clearSession } from "@/lib/garmin/session";

export async function POST() {
  resetGarmin();
  revalidateTag("garmin", { expire: 0 });
  await clearSession();
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
