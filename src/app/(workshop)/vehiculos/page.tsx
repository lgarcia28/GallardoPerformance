import type { Metadata } from "next";
import { VehiclesClient } from "@/components/VehiclesClient";
import { getVehiclesWithSummary } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vehículos — Gallardo Performance",
  description:
    "Directorio de autos y clientes del taller mecánico Gallardo Performance.",
};

export default async function VehiclesPage() {
  const initialVehicles = await getVehiclesWithSummary();
  return <VehiclesClient initialVehicles={initialVehicles} />;
}
