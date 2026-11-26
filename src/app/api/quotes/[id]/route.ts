import { requireAdminApi } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getWorkshopRepository } from "@/db";
import type { NewQuote } from "@/db/schema";
import {
  calculateQuoteTotal,
  normalizeLicensePlate,
  slugifyBrandName,
  type QuoteItem,
  type QuoteStatus,
} from "@/lib/workshop";

const VALID_STATUSES: QuoteStatus[] = [
  "draft",
  "sent",
  "approved",
  "rejected",
];

interface RouteContext {
  params: Promise<{ id: string }>;
}

function sanitizeItems(raw: unknown): QuoteItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      description: String(
        (item as { description?: unknown })?.description ?? ""
      ).trim(),
      quantity: Math.max(
        1,
        Math.round(Number((item as { quantity?: unknown })?.quantity) || 1)
      ),
      unitPrice: Math.max(
        0,
        Math.round(Number((item as { unitPrice?: unknown })?.unitPrice) || 0)
      ),
    }))
    .filter((item) => item.description.length > 0);
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;
    const quoteId = Number(id);
    if (!Number.isInteger(quoteId) || quoteId <= 0) {
      return NextResponse.json(
        { error: "ID de presupuesto inválido." },
        { status: 400 }
      );
    }

    const repo = await getWorkshopRepository();
    const quote = await repo.getQuoteById(quoteId);
    if (!quote) {
      return NextResponse.json(
        { error: "Presupuesto no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ quote });
  } catch (error) {
    console.error("GET /api/quotes/[id] error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el presupuesto." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;
    const quoteId = Number(id);
    if (!Number.isInteger(quoteId) || quoteId <= 0) {
      return NextResponse.json(
        { error: "ID de presupuesto inválido." },
        { status: 400 }
      );
    }

    const repo = await getWorkshopRepository();
    const existing = await repo.getQuoteById(quoteId);
    if (!existing) {
      return NextResponse.json(
        { error: "Presupuesto no encontrado." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: Partial<NewQuote> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.customerName !== undefined) {
      updates.customerName = String(body.customerName).trim();
    }
    if (body.customerPhone !== undefined) {
      updates.customerPhone = String(body.customerPhone).trim();
    }
    if (body.licensePlate !== undefined) {
      const normalized = body.licensePlate
        ? normalizeLicensePlate(String(body.licensePlate))
        : "";
      updates.licensePlate = normalized || null;
    }
    if (body.brandName !== undefined) {
      const name = String(body.brandName).trim();
      updates.brandName = name;
      updates.brandSlug =
        body.brandSlug !== undefined
          ? String(body.brandSlug || "").trim().toLowerCase() ||
            slugifyBrandName(name)
          : slugifyBrandName(name);
    }
    if (body.model !== undefined) {
      updates.model = String(body.model).trim();
    }
    if (body.mileage !== undefined) {
      updates.mileage = Math.max(0, Math.round(Number(body.mileage) || 0));
    }
    if (body.validityDays !== undefined) {
      updates.validityDays = Math.max(
        1,
        Math.min(90, Math.round(Number(body.validityDays) || 15))
      );
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
    if (body.items !== undefined) {
      const items = sanitizeItems(body.items);
      if (items.length === 0) {
        return NextResponse.json(
          { error: "El presupuesto debe tener al menos una reparación." },
          { status: 400 }
        );
      }
      updates.itemsJson = JSON.stringify(items);
      updates.totalAmount = calculateQuoteTotal(items);
    }

    const updated = await repo.updateQuote(quoteId, updates);
    return NextResponse.json({ quote: updated });
  } catch (error) {
    console.error("PATCH /api/quotes/[id] error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el presupuesto." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;
    const quoteId = Number(id);
    if (!Number.isInteger(quoteId) || quoteId <= 0) {
      return NextResponse.json(
        { error: "ID de presupuesto inválido." },
        { status: 400 }
      );
    }

    const repo = await getWorkshopRepository();
    const deleted = await repo.deleteQuote(quoteId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Presupuesto no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, id: quoteId });
  } catch (error) {
    console.error("DELETE /api/quotes/[id] error:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el presupuesto." },
      { status: 500 }
    );
  }
}
