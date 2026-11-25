import { redirect } from "next/navigation";
import { WorkshopShell } from "@/components/WorkshopShell";
import { getAdminSession } from "@/lib/auth";

export default async function WorkshopProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin");
  }
  return <WorkshopShell session={session}>{children}</WorkshopShell>;
}
