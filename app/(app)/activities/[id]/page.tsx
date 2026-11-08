// app/(app)/activities/[id]/page.tsx — detail aktivitas gaya Strava

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ActivityDetailView } from "./ActivityDetailView";
import { GarminNotConnected } from "@/lib/garmin/client";
import { connection } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { withGarmin } from "@/lib/garmin/load";
import { fetchActivityDetail } from "@/lib/garmin/activities";

export const metadata = { title: "Detail aktivitas — Garmin Dash" };

async function load(id: string) {
  await connection();
  noStore();
  return withGarmin((g) => fetchActivityDetail(g, id));
}

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let data;
  try {
    data = await load(id);
  } catch (err) {
    if (err instanceof GarminNotConnected) {
      redirect(err.reason === "expired" ? "/connect?expired=1" : "/connect");
    }
    throw err;
  }

  if (!data) notFound();

  return (
    <>
      <Link className="backlink" href="/activities">
        <ArrowLeft size={14} aria-hidden="true" /> Semua aktivitas
      </Link>
      <ActivityDetailView data={data} />
    </>
  );
}
