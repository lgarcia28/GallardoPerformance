import { NextResponse } from "next/server";
import { getWorkshopRepository } from "@/db";
import type { NewAppointment } from "@/db/schema";
import {
  normalizeLicensePlate,
  type AppointmentStatus,
} from "@/lib/workshop";

const VALID_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
];

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const appointmentId = Number(id);
    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return NextResponse.json(
        { error: "ID de turno inválido." },
        { status: 400 }
      );
    }

    const repo = await getWorkshopRepository();
    const existing = await repo.getAppointmentById(appointmentId);
    if (!existing) {
      return NextResponse.json(
        { error: "Turno no encontrado." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: Partial<NewAppointment> = {
      updatedAt: new Date().toISOString(),
    };

    if (
      typeof body.appointmentDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.appointmentDate)
    ) {
      updates.appointmentDate = body.appointmentDate;
    }
    if (
      typeof body.appointmentTime === "string" &&
      /^\d{2}:\d{2}$/.test(body.appointmentTime)
    ) {
      updates.appointmentTime = body.appointmentTime;
    }
    if (body.licensePlate !== undefined) {
      const normalized = normalizeLicensePlate(String(body.licensePlate));
      if (!normalized) {
        return NextResponse.json(
          { error: "La patente no puede quedar vacía." },
          { status: 400 }
        );
      }
      updates.licensePlate = normalized;
    }
    if (body.vehicleLabel !== undefined) {
      updates.vehicleLabel = String(body.vehicleLabel).trim();
    }
    if (body.ownerName !== undefined) {
      updates.ownerName = String(body.ownerName).trim();
    }
    if (body.ownerPhone !== undefined) {
      updates.ownerPhone = String(body.ownerPhone).trim();
    }
    if (body.serviceType !== undefined) {
      updates.serviceType = String(body.serviceType).trim();
    }
    if (body.notes !== undefined) {
      updates.notes = body.notes ? String(body.notes).trim() : null;
    }
    if (body.vehicleId !== undefined) {
      updates.vehicleId =
        body.vehicleId !== null &&
        Number.isInteger(Number(body.vehicleId)) &&
        Number(body.vehicleId) > 0
          ? Number(body.vehicleId)
          : null;
    }
    if (body.status !== undefined && VALID_STATUSES.includes(body.status)) {
      updates.status = body.status;
    }

    const updated = await repo.updateAppointment(appointmentId, updates);
    return NextResponse.json({ appointment: updated });
  } catch (error) {
    console.error("PATCH /api/appointments/[id] error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el turno." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const appointmentId = Number(id);
    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return NextResponse.json(
        { error: "ID de turno inválido." },
        { status: 400 }
      );
    }

    const repo = await getWorkshopRepository();
    const deleted = await repo.deleteAppointment(appointmentId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Turno no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, id: appointmentId });
  } catch (error) {
    console.error("DELETE /api/appointments/[id] error:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el turno." },
      { status: 500 }
    );
  }
}
