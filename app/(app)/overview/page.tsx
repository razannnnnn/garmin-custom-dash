// app/(app)/overview/page.tsx — ringkasan seluruh data

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { connection } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { OverviewView } from "./OverviewView";
import { NotConnected } from "@/components/shell/NotConnected";
import { GarminNotConnected } from "@/lib/garmin/client";
import { withGarmin } from "@/lib/garmin/load";
import { fetchOverview } from "@/lib/garmin/overview";

export const metadata = { title: "Overview — Garmin Dash" };

async function load() {
  await connection();
  // Hasil render bergantung pada cookie pengunjung; jangan pernah disimpan ke cache
  // bersama, karena cache itu akan menyajikan data satu pengguna ke pengguna lain.
  noStore();
  return withGarmin((g) => fetchOverview(g));
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
