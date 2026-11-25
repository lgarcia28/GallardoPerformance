import type { Metadata } from "next";
import { QuotesClient } from "@/components/QuotesClient";
import { getQuotesData, getVehiclesWithSummary } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Presupuestos — GallardoPerformance",
  description:
    "Generador de presupuestos en PDF y WhatsApp con marcas de autos para el taller GallardoPerformance.",
};

export default async function QuotesPage() {
  const [initialData, initialVehicles] = await Promise.all([
    getQuotesData(),
    getVehiclesWithSummary(),
  ]);

  return (
    <QuotesClient
      initialData={initialData}
      initialVehicles={initialVehicles}
    />
  );
}
