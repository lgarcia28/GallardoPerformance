import { requireAdminApi } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getWorkshopRepository } from "@/db";
import type { NewVehicle } from "@/db/schema";
import { getVehicleDetail } from "@/lib/queries";
import { normalizeLicensePlate } from "@/lib/workshop";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;
    const vehicleId = Number(id);
    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      return NextResponse.json(
        { error: "ID de vehículo inválido." },
        { status: 400 }
      );
    }

    const detail = await getVehicleDetail(vehicleId);
    if (!detail) {
      return NextResponse.json(
        { error: "Vehículo no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(detail);
  } catch (error) {
    console.error("GET /api/vehicles/[id] error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar la ficha del vehículo." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;
    const vehicleId = Number(id);
    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      return NextResponse.json(
        { error: "ID de vehículo inválido." },
        { status: 400 }
      );
    }

    const repo = await getWorkshopRepository();
    const existing = await repo.getVehicleById(vehicleId);
    if (!existing) {
      return NextResponse.json(
        { error: "Vehículo no encontrado." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: Partial<NewVehicle> = {
      updatedAt: new Date().toISOString(),
    };

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
    if (body.brand !== undefined) updates.brand = String(body.brand).trim();
    if (body.model !== undefined) updates.model = String(body.model).trim();
    if (body.year !== undefined) {
      const y = Number(body.year);
      if (
        !Number.isFinite(y) ||
        y < 1950 ||
        y > new Date().getFullYear() + 2
      ) {
        return NextResponse.json({ error: "Año inválido." }, { status: 400 });
      }
      updates.year = y;
    }
    if (body.engine !== undefined) {
      updates.engine = body.engine ? String(body.engine).trim() : null;
    }
    if (body.currentMileage !== undefined) {
      const km = Math.max(0, Math.round(Number(body.currentMileage)));
      if (!Number.isFinite(km)) {
        return NextResponse.json(
          { error: "Kilometraje inválido." },
          { status: 400 }
        );
      }
      updates.currentMileage = km;
    }
    if (body.ownerName !== undefined) {
      updates.ownerName = String(body.ownerName).trim();
    }
    if (body.ownerPhone !== undefined) {
      updates.ownerPhone = String(body.ownerPhone).trim();
    }
    if (body.notes !== undefined) {
      updates.notes = body.notes ? String(body.notes).trim() : null;
    }

    const updated = await repo.updateVehicle(vehicleId, updates);
    return NextResponse.json({ vehicle: updated });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes("UNIQUE constraint failed") && errMsg.includes("license_plate")) {
      return NextResponse.json(
        { error: "Ya existe otro vehículo con esa patente." },
        { status: 409 }
      );
    }
    console.error("PATCH /api/vehicles/[id] error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el vehículo." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;
    const vehicleId = Number(id);
    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      return NextResponse.json(
        { error: "ID de vehículo inválido." },
        { status: 400 }
      );
    }

    const repo = await getWorkshopRepository();
    const deleted = await repo.deleteVehicle(vehicleId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Vehículo no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, id: vehicleId });
  } catch (error) {
    console.error("DELETE /api/vehicles/[id] error:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el vehículo." },
      { status: 500 }
    );
  }
}
