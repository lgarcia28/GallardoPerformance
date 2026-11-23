import type { Metadata } from "next";
import { HistoryClient } from "@/components/HistoryClient";
import { getAllRepairsWithVehicle } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Historial de Trabajos — Gallardo Performance",
  description:
    "Registro cronológico de todas las reparaciones y services realizados en Gallardo Performance.",
};

export default async function HistoryPage() {
  const initialRepairs = await getAllRepairsWithVehicle();
  return <HistoryClient initialRepairs={initialRepairs} />;
}
