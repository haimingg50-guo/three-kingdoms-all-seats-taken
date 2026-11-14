import { HomeView } from "@/components/home-view";
import { listExperiments } from "@/server/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let worlds: Awaited<ReturnType<typeof listExperiments>> = [];
  let failed = false;
  try {
    worlds = await listExperiments();
  } catch {
    failed = true;
  }
  return <HomeView worlds={worlds} failed={failed} />;
}
