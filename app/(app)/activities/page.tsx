// app/(app)/activities/page.tsx — daftar aktivitas

import { ActivitiesView } from "./ActivitiesView";
import { GarminNotConnected } from "@/lib/garmin/client";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { withGarmin } from "@/lib/garmin/load";
import { fetchActivityList } from "@/lib/garmin/activities";

export const metadata = { title: "Aktivitas — Garmin Dash" };

async function load() {
  await connection();
  noStore();
  return withGarmin((g) => fetchActivityList(g, { limit: 60 }));
}

export default async function ActivitiesPage() {
  let data;
  try {
    data = await load();
  } catch (err) {
    if (err instanceof GarminNotConnected) {
      redirect(err.reason === "expired" ? "/connect?expired=1" : "/connect");
    }
    throw err;
  }

  return <ActivitiesView data={data} />;
}
