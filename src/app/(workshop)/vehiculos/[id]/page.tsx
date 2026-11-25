import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VehicleDetailClient } from "@/components/VehicleDetailClient";
import { getVehicleDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getVehicleDetail(Number(id));
  if (!detail) {
    return { title: "Vehículo no encontrado — Gallardo Performance" };
  }
  const { vehicle } = detail;
  return {
    title: `${vehicle.licensePlate} · ${vehicle.brand} ${vehicle.model} — Gallardo Performance`,
    description: `Ficha e historial de reparaciones de ${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate}).`,
  };
}

export default async function VehicleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    notFound();
  }

  const detail = await getVehicleDetail(numericId);
  if (!detail) {
    notFound();
  }

  return <VehicleDetailClient initialDetail={detail} />;
}
