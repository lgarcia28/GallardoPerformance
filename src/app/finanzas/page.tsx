import type { Metadata } from "next";
import { FinancesClient } from "@/components/FinancesClient";
import { getFinancesData } from "@/lib/queries";
import { formatDateISO } from "@/lib/workshop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finanzas — Gallardo Performance",
  description:
    "Panel financiero del taller mecánico Gallardo Performance: autos reparados, facturación, costos y ganancia neta por fecha.",
};

export default async function FinancesPage() {
  const now = new Date();
  const initialFrom = formatDateISO(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const initialTo = formatDateISO(
    new Date(now.getFullYear(), now.getMonth() + 1, 0)
  );

  const initialData = await getFinancesData(initialFrom, initialTo);

  return (
    <FinancesClient
      initialData={initialData}
      initialFrom={initialFrom}
      initialTo={initialTo}
    />
  );
}
