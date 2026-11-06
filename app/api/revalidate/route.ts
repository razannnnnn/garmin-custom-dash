// app/api/revalidate/route.ts — buang cache data Garmin

import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function POST() {
  revalidateTag("garmin", { expire: 0 });
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
