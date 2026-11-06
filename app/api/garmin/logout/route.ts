// app/api/garmin/logout/route.ts — hapus token Garmin

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { rm } from "node:fs/promises";
import { TOKEN_DIR, resetGarmin } from "@/lib/garmin/client";

export async function POST() {
  resetGarmin();
  revalidateTag("garmin", { expire: 0 });
  try {
    await rm(TOKEN_DIR, { recursive: true, force: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus folder token" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
