import { DashboardClient } from "@/components/DashboardClient";
import { getDashboardData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialData = await getDashboardData();
  return <DashboardClient initialData={initialData} />;
}
