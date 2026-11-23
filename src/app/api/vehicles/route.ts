import { NextResponse } from "next/server";
import { getWorkshopRepository } from "@/db";
import { getVehiclesWithSummary } from "@/lib/queries";
import {
  computeReminderDueDate,
  getTodayISO,
  normalizeLicensePlate,
  type ReminderPreset,
} from "@/lib/workshop";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const list = await getVehiclesWithSummary(q);
    return NextResponse.json({ vehicles: list });
  } catch (error) {
    console.error("GET /api/vehicles error:", error);
    return NextResponse.json(
      { error: "No se pudo obtener el listado de vehículos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const licensePlate = normalizeLicensePlate(String(body.licensePlate ?? ""));
    const brand = String(body.brand ?? "").trim();
    const model = String(body.model ?? "").trim();
    const year = Number(body.year);
    const engine = body.engine ? String(body.engine).trim() : null;
    const currentMileage = Math.max(0, Number(body.currentMileage ?? 0) || 0);
    const ownerName = String(body.ownerName ?? "").trim();
    const ownerPhone = String(body.ownerPhone ?? "").trim();
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!licensePlate || !brand || !model || !ownerName || !ownerPhone) {
      return NextResponse.json(
        {
          error:
            "Patente, marca, modelo, nombre del dueño y WhatsApp son obligatorios.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(year) ||
      year < 1950 ||
      year > new Date().getFullYear() + 2
    ) {
      return NextResponse.json(
        { error: "Ingresá un año válido para el vehículo." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    let initialRepair = null;

    if (body.initialRepair && body.initialRepair.serviceType) {
      const r = body.initialRepair;
      const serviceDate =
        typeof r.serviceDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(r.serviceDate)
          ? r.serviceDate
          : getTodayISO();
      const mileageAtService = Math.max(
        0,
        Number(r.mileageAtService ?? currentMileage) || 0
      );
      const serviceType = String(r.serviceType).trim();
      const description = String(r.description ?? "").trim() || serviceType;
      const cost =
        r.cost !== undefined &&
        r.cost !== null &&
        String(r.cost).trim() !== ""
          ? Math.max(0, Math.round(Number(r.cost)))
          : null;
      const partsCost =
        r.partsCost !== undefined &&
        r.partsCost !== null &&
        String(r.partsCost).trim() !== ""
          ? Math.max(0, Math.round(Number(r.partsCost)))
          : null;
      const mechanicNotes = r.mechanicNotes
        ? String(r.mechanicNotes).trim()
        : null;
      const reminderPreset = (r.reminderPreset ?? "none") as ReminderPreset;
      const reminderDueDate = computeReminderDueDate(
        serviceDate,
        reminderPreset,
        r.customReminderDate
      );
      const reminderStatus = reminderDueDate ? "pending" : "none";

      initialRepair = {
        serviceDate,
        mileageAtService,
        serviceType,
        description,
        cost: Number.isFinite(cost) ? cost : null,
        partsCost: Number.isFinite(partsCost) ? partsCost : null,
        mechanicNotes,
        reminderPreset,
        reminderDueDate,
        reminderStatus,
        notifiedAt: null,
        createdAt: nowIso,
      };
    }

    const repo = await getWorkshopRepository();
    const { vehicle, repair } = await repo.createVehicle(
      {
        licensePlate,
        brand,
        model,
        year,
        engine,
        currentMileage,
        ownerName,
        ownerPhone,
        notes,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      initialRepair
    );

    return NextResponse.json({ vehicle, repair }, { status: 201 });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes("UNIQUE constraint failed") && errMsg.includes("license_plate")) {
      return NextResponse.json(
        { error: "Ya existe un vehículo registrado con esa patente." },
        { status: 409 }
      );
    }
    console.error("POST /api/vehicles error:", error);
    return NextResponse.json(
      { error: "No se pudo registrar el vehículo." },
      { status: 500 }
    );
  }
}
