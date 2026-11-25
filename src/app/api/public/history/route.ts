import { NextResponse } from "next/server";
import { getWorkshopRepository } from "@/db";
import { normalizePlateForSearch } from "@/lib/auth-edge";
import { getAlertUrgency, slugifyBrandName } from "@/lib/workshop";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPlate = searchParams.get("plate") ?? "";
    const normalized = normalizePlateForSearch(rawPlate);

    if (normalized.length < 3) {
      return NextResponse.json(
        {
          error:
            "Ingresá una patente válida (al menos 3 letras/números, ej. AA 123 BB o ABC 123).",
        },
        { status: 400 }
      );
    }

    const repo = await getWorkshopRepository();
    const vehicle = await repo.findVehicleByPlateNormalized(normalized);

    if (!vehicle) {
      return NextResponse.json({
        found: false,
        searchedPlate: rawPlate.trim().toUpperCase(),
      });
    }

    const allRepairs = await repo.listRepairsByVehicle(vehicle.id);

    // Find next upcoming/overdue scheduled maintenance (privacy-safe)
    const pendingWithDue = allRepairs
      .filter((r) => r.reminderDueDate && r.reminderStatus !== "completed")
      .sort((a, b) =>
        (a.reminderDueDate ?? "").localeCompare(b.reminderDueDate ?? "")
      );

    const nextReminder = pendingWithDue[0] ?? null;

    // Strictly return only public service-book fields (no owner phone, no internal costs or mechanic notes)
    return NextResponse.json({
      found: true,
      vehicle: {
        licensePlate: vehicle.licensePlate,
        brand: vehicle.brand,
        brandSlug: slugifyBrandName(vehicle.brand),
        model: vehicle.model,
        year: vehicle.year,
        engine: vehicle.engine,
        currentMileage: vehicle.currentMileage,
      },
      nextMaintenance: nextReminder?.reminderDueDate
        ? {
            serviceType: nextReminder.serviceType,
            dueDate: nextReminder.reminderDueDate,
            severity: getAlertUrgency(
              nextReminder.reminderDueDate,
              nextReminder.reminderStatus
            ),
          }
        : null,
      repairs: allRepairs.map((r) => ({
        id: r.id,
        serviceDate: r.serviceDate,
        mileageAtService: r.mileageAtService,
        serviceType: r.serviceType,
        description: r.description,
        reminderDueDate: r.reminderDueDate,
      })),
    });
  } catch (error) {
    console.error("GET /api/public/history error:", error);
    return NextResponse.json(
      { error: "Error al consultar el historial del vehículo." },
      { status: 500 }
    );
  }
}
