import type { Metadata } from "next";
import { AppointmentsClient } from "@/components/AppointmentsClient";
import { getAppointmentsData, getVehiclesWithSummary } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Calendario de Turnos — GallardoPerformance",
  description:
    "Agenda de turnos e ingresos de vehículos del taller mecánico GallardoPerformance en Rosario.",
};

export default async function AppointmentsPage() {
  const [initialData, initialVehicles] = await Promise.all([
    getAppointmentsData(),
    getVehiclesWithSummary(),
  ]);

  return (
    <AppointmentsClient
      initialData={initialData}
      initialVehicles={initialVehicles}
    />
  );
}
