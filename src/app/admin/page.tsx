import { AdminLoginClient } from "@/components/AdminLoginClient";
import { DashboardClient } from "@/components/DashboardClient";
import { WorkshopShell } from "@/components/WorkshopShell";
import { getAdminSession } from "@/lib/auth";
import { isSafeAdminNextPath } from "@/lib/auth-edge";
import { getDashboardData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getAdminSession();
  const params = await searchParams;

  if (!session) {
    const safeNext = isSafeAdminNextPath(params?.next);
    return <AdminLoginClient nextPath={safeNext} />;
  }

  const initialData = await getDashboardData();
  return (
    <WorkshopShell session={session}>
      <DashboardClient initialData={initialData} />
    </WorkshopShell>
  );
}
