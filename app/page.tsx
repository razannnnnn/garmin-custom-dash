// app/page.tsx — arahkan ke /overview

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/overview");
}
