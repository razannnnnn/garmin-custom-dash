// app/(app)/analytics/page.tsx — tren & grafik

import { AnalyticsView } from "./AnalyticsView";
import { NotConnected } from "@/components/shell/NotConnected";
import { GarminNotConnected } from "@/lib/garmin/client";
import { connection } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { withGarmin } from "@/lib/garmin/load";
import { fetchAnalytics } from "@/lib/garmin/analytics";

export const metadata = { title: "Analytics — Garmin Dash" };

async function load() {
  await connection();
  noStore();
  return withGarmin((g) => fetchAnalytics(g));
}

export default async function AnalyticsPage() {
  let data;
  try {
    data = await load();
  } catch (err) {
    if (err instanceof GarminNotConnected) {
      return <NotConnected expired={err.reason === "expired"} />;
    }
    throw err;
  }

  return <AnalyticsView data={data} />;
}
