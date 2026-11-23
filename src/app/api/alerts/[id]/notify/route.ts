import { NextResponse } from "next/server";
import { getWorkshopRepository } from "@/db";
import type { NewRepair } from "@/db/schema";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const repairId = Number(id);
    if (!Number.isInteger(repairId) || repairId <= 0) {
      return NextResponse.json(
        { error: "ID de alerta inválido." },
        { status: 400 }
      );
    }

    const repo = await getWorkshopRepository();
    const existing = await repo.getRepairById(repairId);
    if (!existing) {
      return NextResponse.json(
        { error: "Alerta no encontrada." },
        { status: 404 }
      );
    }

    let action = "notify";
    try {
      const body = await request.json();
      if (body && typeof body.action === "string") {
        action = body.action;
      }
    } catch {
      // Optional empty body defaults to "notify"
    }

    const nowIso = new Date().toISOString();
    let updates: Partial<NewRepair>;

    if (action === "reset") {
      updates = {
        reminderStatus: "pending",
        notifiedAt: null,
      };
    } else if (action === "complete") {
      updates = {
        reminderStatus: "completed",
      };
    } else {
      updates = {
        reminderStatus: "notified",
        notifiedAt: nowIso,
      };
    }

    const updated = await repo.updateRepair(repairId, updates);
    return NextResponse.json({ repair: updated });
  } catch (error) {
    console.error("POST /api/alerts/[id]/notify error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el estado del aviso." },
      { status: 500 }
    );
  }
}
