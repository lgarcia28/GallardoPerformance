import type { Metadata } from "next";
import {
  AppointmentsClient,
  type AppointmentPrefillDraft,
} from "@/components/AppointmentsClient";
import { getAppointmentsData, getVehiclesWithSummary } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Calendario de Turnos — GallardoPerformance",
  description:
    "Agenda de turnos e ingresos de vehículos del taller mecánico GallardoPerformance en Rosario.",
};

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    new?: string;
    name?: string;
    phone?: string;
    plate?: string;
    vehicle?: string;
    vehicleId?: string;
  }>;
}) {
  const [initialData, initialVehicles, params] = await Promise.all([
    getAppointmentsData(),
    getVehiclesWithSummary(),
    searchParams,
  ]);

  let initialDraft: AppointmentPrefillDraft | null = null;
  if (params?.new === "1") {
    const parsedVehicleId = params.vehicleId ? Number(params.vehicleId) : null;
    initialDraft = {
      ownerName: params.name ?? "",
      ownerPhone: params.phone ?? "",
      licensePlate: params.plate ?? "",
      vehicleLabel: params.vehicle ?? "",
      vehicleId:
        parsedVehicleId && Number.isFinite(parsedVehicleId)
          ? parsedVehicleId
          : null,
    };
  }

  return (
    <AppointmentsClient
      initialData={initialData}
      initialVehicles={initialVehicles}
      initialDraft={initialDraft}
    />
  );
}
