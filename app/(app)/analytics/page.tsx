// app/(app)/analytics/page.tsx — tren & grafik

import { cacheLife, cacheTag } from "next/cache";
import { AnalyticsView } from "./AnalyticsView";
import { NotConnected } from "@/components/shell/NotConnected";
import { GarminNotConnected, garmin } from "@/lib/garmin/client";
import { fetchAnalytics } from "@/lib/garmin/analytics";

export const metadata = { title: "Analytics — Garmin Dash" };

async function load() {
  "use cache";
  cacheLife({ revalidate: 600, expire: 3600 });
  cacheTag("garmin");
  const g = await garmin();
  return fetchAnalytics(g);
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
