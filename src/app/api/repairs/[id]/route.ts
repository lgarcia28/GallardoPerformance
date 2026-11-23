import { NextResponse } from "next/server";
import { getWorkshopRepository } from "@/db";
import {
  computeReminderDueDate,
  type ReminderPreset,
} from "@/lib/workshop";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const repairId = Number(id);
    if (!Number.isInteger(repairId) || repairId <= 0) {
      return NextResponse.json(
        { error: "ID de reparación inválido." },
        { status: 400 }
      );
    }

    const repo = await getWorkshopRepository();
    const existing = await repo.getRepairById(repairId);
    if (!existing) {
      return NextResponse.json(
        { error: "Reparación no encontrada." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const serviceDate =
      typeof body.serviceDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.serviceDate)
        ? body.serviceDate
        : existing.serviceDate;

    const mileageAtService =
      body.mileageAtService !== undefined
        ? Math.max(0, Math.round(Number(body.mileageAtService) || 0))
        : existing.mileageAtService;

    const serviceType =
      body.serviceType !== undefined
        ? String(body.serviceType).trim()
        : existing.serviceType;

    const description =
      body.description !== undefined
        ? String(body.description).trim()
        : existing.description;

    const cost =
      body.cost !== undefined
        ? body.cost === null || String(body.cost).trim() === ""
          ? null
          : Math.max(0, Math.round(Number(body.cost)))
        : existing.cost;

    const mechanicNotes =
      body.mechanicNotes !== undefined
        ? body.mechanicNotes
          ? String(body.mechanicNotes).trim()
          : null
        : existing.mechanicNotes;

    const reminderPreset = (body.reminderPreset ??
      existing.reminderPreset) as ReminderPreset;

    let reminderDueDate = existing.reminderDueDate;
    let reminderStatus = existing.reminderStatus;
    let notifiedAt = existing.notifiedAt;

    if (
      body.reminderPreset !== undefined ||
      body.customReminderDate !== undefined ||
      body.serviceDate !== undefined
    ) {
      reminderDueDate = computeReminderDueDate(
        serviceDate,
        reminderPreset,
        body.customReminderDate ?? existing.reminderDueDate
      );
      if (!reminderDueDate) {
        reminderStatus = "none";
        notifiedAt = null;
      } else if (reminderStatus === "none") {
        reminderStatus = "pending";
      }
    }

    if (body.reminderStatus !== undefined) {
      reminderStatus = String(body.reminderStatus);
      if (reminderStatus === "pending") {
        notifiedAt = null;
      }
    }

    const updated = await repo.updateRepair(repairId, {
      serviceDate,
      mileageAtService,
      serviceType,
      description,
      cost: Number.isFinite(cost) ? cost : null,
      mechanicNotes,
      reminderPreset,
      reminderDueDate,
      reminderStatus,
      notifiedAt,
    });

    return NextResponse.json({ repair: updated });
  } catch (error) {
    console.error("PATCH /api/repairs/[id] error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la reparación." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const repairId = Number(id);
    if (!Number.isInteger(repairId) || repairId <= 0) {
      return NextResponse.json(
        { error: "ID de reparación inválido." },
        { status: 400 }
      );
    }

    const repo = await getWorkshopRepository();
    const deleted = await repo.deleteRepair(repairId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Reparación no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, id: repairId });
  } catch (error) {
    console.error("DELETE /api/repairs/[id] error:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la reparación." },
      { status: 500 }
    );
  }
}
