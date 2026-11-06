// app/(app)/activities/[id]/page.tsx — detail aktivitas gaya Strava

import Link from "next/link";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { ActivityDetailView } from "./ActivityDetailView";
import { NotConnected } from "@/components/shell/NotConnected";
import { GarminNotConnected, garmin } from "@/lib/garmin/client";
import { fetchActivityDetail } from "@/lib/garmin/activities";

export const metadata = { title: "Detail aktivitas — Garmin Dash" };

async function load(id: string) {
  "use cache";
  cacheLife({ revalidate: 3600, expire: 86400 });
  cacheTag("garmin", `activity-${id}`);
  const g = await garmin();
  return fetchActivityDetail(g, id);
}

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let data;
  try {
    data = await load(id);
  } catch (err) {
    if (err instanceof GarminNotConnected) {
      return <NotConnected expired={err.reason === "expired"} />;
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
