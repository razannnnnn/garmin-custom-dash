// app/api/garmin/gpx/[id]/route.ts — unduh file GPX asli dari Garmin Connect

import { NextResponse } from "next/server";
import { persistTokens } from "@/lib/garmin/client";
import { withGarmin } from "@/lib/garmin/load";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "ID aktivitas tidak valid" }, { status: 400 });
  }

  try {
    const buf = await withGarmin((g) => g.downloadActivity(id, "GPX"));
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/gpx+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="garmin-activity-${id}.gpx"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengunduh GPX" },
      { status: 500 }
    );
  } finally {
    await persistTokens().catch(() => null);
  }
}
