import { NextResponse } from "next/server";
import { getWorkshopRepository } from "@/db";
import { getAllRepairsWithVehicle } from "@/lib/queries";
import {
  computeReminderDueDate,
  getTodayISO,
  type ReminderPreset,
} from "@/lib/workshop";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const list = await getAllRepairsWithVehicle(q);
    return NextResponse.json({ repairs: list });
  } catch (error) {
    console.error("GET /api/repairs error:", error);
    return NextResponse.json(
      { error: "No se pudo obtener el historial de trabajos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const vehicleId = Number(body.vehicleId);
    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      return NextResponse.json(
        { error: "Seleccioná un vehículo válido." },
        { status: 400 }
      );
    }

    const repo = await getWorkshopRepository();
    const vehicle = await repo.getVehicleById(vehicleId);
    if (!vehicle) {
      return NextResponse.json(
        { error: "El vehículo seleccionado no existe." },
        { status: 404 }
      );
    }

    const serviceDate =
      typeof body.serviceDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.serviceDate)
        ? body.serviceDate
        : getTodayISO();

    const mileageAtService = Math.max(
      0,
      Math.round(Number(body.mileageAtService ?? vehicle.currentMileage) || 0)
    );
    const serviceType = String(body.serviceType ?? "").trim();
    const description = String(body.description ?? "").trim();
    const cost =
      body.cost !== undefined &&
      body.cost !== null &&
      String(body.cost).trim() !== ""
        ? Math.max(0, Math.round(Number(body.cost)))
        : null;
    const mechanicNotes = body.mechanicNotes
      ? String(body.mechanicNotes).trim()
      : null;

    if (!serviceType || !description) {
      return NextResponse.json(
        { error: "El tipo de trabajo y la descripción son obligatorios." },
        { status: 400 }
      );
    }

    const reminderPreset = (body.reminderPreset ?? "none") as ReminderPreset;
    const reminderDueDate = computeReminderDueDate(
      serviceDate,
      reminderPreset,
      body.customReminderDate
    );
    const reminderStatus = reminderDueDate ? "pending" : "none";
    const nowIso = new Date().toISOString();

    const created = await repo.createRepair({
      vehicleId,
      serviceDate,
      mileageAtService,
      serviceType,
      description,
      cost: Number.isFinite(cost) ? cost : null,
      mechanicNotes,
      reminderPreset,
      reminderDueDate,
      reminderStatus,
      notifiedAt: null,
      createdAt: nowIso,
    });

    return NextResponse.json({ repair: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/repairs error:", error);
    return NextResponse.json(
      { error: "No se pudo registrar la reparación." },
      { status: 500 }
    );
  }
}
