import { NextResponse } from "next/server";
import { getWorkshopRepository } from "@/db";
import { getAppointmentsData } from "@/lib/queries";
import {
  getTodayISO,
  normalizeLicensePlate,
  type AppointmentStatus,
} from "@/lib/workshop";

const VALID_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const data = await getAppointmentsData(from, to);
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/appointments error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el calendario de turnos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const appointmentDate =
      typeof body.appointmentDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.appointmentDate)
        ? body.appointmentDate
        : getTodayISO();

    const appointmentTime =
      typeof body.appointmentTime === "string" &&
      /^\d{2}:\d{2}$/.test(body.appointmentTime)
        ? body.appointmentTime
        : "09:00";

    const licensePlate = normalizeLicensePlate(String(body.licensePlate ?? ""));
    const vehicleLabel = String(body.vehicleLabel ?? "").trim();
    const ownerName = String(body.ownerName ?? "").trim();
    const ownerPhone = String(body.ownerPhone ?? "").trim();
    const serviceType = String(body.serviceType ?? "").trim();
    const notes = body.notes ? String(body.notes).trim() : null;
    const vehicleId =
      body.vehicleId !== undefined &&
      body.vehicleId !== null &&
      Number.isInteger(Number(body.vehicleId)) &&
      Number(body.vehicleId) > 0
        ? Number(body.vehicleId)
        : null;

    const status: AppointmentStatus = VALID_STATUSES.includes(body.status)
      ? body.status
      : "scheduled";

    if (
      !licensePlate ||
      !vehicleLabel ||
      !ownerName ||
      !ownerPhone ||
      !serviceType
    ) {
      return NextResponse.json(
        {
          error:
            "Patente, vehículo, dueño, WhatsApp y tipo de trabajo son obligatorios.",
        },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const repo = await getWorkshopRepository();

    const created = await repo.createAppointment({
      vehicleId,
      appointmentDate,
      appointmentTime,
      licensePlate,
      vehicleLabel,
      ownerName,
      ownerPhone,
      serviceType,
      notes,
      status,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return NextResponse.json({ appointment: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments error:", error);
    return NextResponse.json(
      { error: "No se pudo agendar el turno." },
      { status: 500 }
    );
  }
}
