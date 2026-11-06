// app/(app)/overview/page.tsx — ringkasan seluruh data

import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { ArrowRight } from "lucide-react";
import { OverviewView } from "./OverviewView";
import { NotConnected } from "@/components/shell/NotConnected";
import { GarminNotConnected, garmin } from "@/lib/garmin/client";
import { fetchOverview } from "@/lib/garmin/overview";

export const metadata = { title: "Overview — Garmin Dash" };

async function load() {
  "use cache";
  cacheLife({ revalidate: 300, expire: 1800 });
  cacheTag("garmin");
  const g = await garmin();
  return fetchOverview(g);
}

export default async function OverviewPage() {
  let data;
  try {
    data = await load();
  } catch (err) {
    if (err instanceof GarminNotConnected) {
      return <NotConnected expired={err.reason === "expired"} />;
    }
    throw err;
  }

  return (
    <>
      <OverviewView data={data} />
      <Link className="textlink" href="/analytics">
        Buka Analytics <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </>
  );
}
