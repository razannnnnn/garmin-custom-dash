// app/(app)/activities/page.tsx — daftar aktivitas

import { cacheLife, cacheTag } from "next/cache";
import { ActivitiesView } from "./ActivitiesView";
import { NotConnected } from "@/components/shell/NotConnected";
import { GarminNotConnected, garmin } from "@/lib/garmin/client";
import { fetchActivityList } from "@/lib/garmin/activities";

export const metadata = { title: "Aktivitas — Garmin Dash" };

async function load() {
  "use cache";
  cacheLife({ revalidate: 300, expire: 1800 });
  cacheTag("garmin");
  const g = await garmin();
  return fetchActivityList(g, { limit: 60 });
}

export default async function ActivitiesPage() {
  let data;
  try {
    data = await load();
  } catch (err) {
    if (err instanceof GarminNotConnected) {
      return <NotConnected expired={err.reason === "expired"} />;
    }
    throw err;
  }

  return <ActivitiesView data={data} />;
}
