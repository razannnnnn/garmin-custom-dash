// app/api/garmin/logout/route.ts — hapus token Garmin dari cookie browser

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { clearTokens } from "@/lib/garmin/client";

export async function POST() {
  await clearTokens();
  revalidateTag("garmin", { expire: 0 });
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
