import { requireAdminApi } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getWorkshopRepository } from "@/db";
import { getQuotesData } from "@/lib/queries";
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

export async function GET() {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  try {
    const data = await getQuotesData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/quotes error:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los presupuestos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();

    const customerName = String(body.customerName ?? "").trim();
    const customerPhone = String(body.customerPhone ?? "").trim();
    const licensePlate = body.licensePlate
      ? normalizeLicensePlate(String(body.licensePlate))
      : null;
    const brandName = String(body.brandName ?? "").trim();
    const brandSlug = body.brandSlug
      ? String(body.brandSlug).trim().toLowerCase()
      : slugifyBrandName(brandName);
    const model = String(body.model ?? "").trim();
    const mileage = Math.max(0, Math.round(Number(body.mileage ?? 0) || 0));
    const validityDays = Math.max(
      1,
      Math.min(90, Math.round(Number(body.validityDays ?? 15) || 15))
    );
    const notes = body.notes ? String(body.notes).trim() : null;
    const vehicleId =
      body.vehicleId !== undefined &&
      body.vehicleId !== null &&
      Number.isInteger(Number(body.vehicleId)) &&
      Number(body.vehicleId) > 0
        ? Number(body.vehicleId)
        : null;

    const status: QuoteStatus = VALID_STATUSES.includes(body.status)
      ? body.status
      : "draft";

    const items = sanitizeItems(body.items);

    if (!customerName || !customerPhone || !brandName || !model) {
      return NextResponse.json(
        {
          error:
            "Nombre del cliente, WhatsApp, marca y modelo son obligatorios.",
        },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Agregá al menos una reparación con su costo." },
        { status: 400 }
      );
    }

    const totalAmount = calculateQuoteTotal(items);
    const nowIso = new Date().toISOString();
    const repo = await getWorkshopRepository();

    const created = await repo.createQuote({
      vehicleId,
      customerName,
      customerPhone,
      licensePlate: licensePlate || null,
      brandName,
      brandSlug: brandSlug || null,
      model,
      mileage,
      itemsJson: JSON.stringify(items),
      totalAmount,
      validityDays,
      notes,
      status,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return NextResponse.json({ quote: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/quotes error:", error);
    return NextResponse.json(
      { error: "No se pudo crear el presupuesto." },
      { status: 500 }
    );
  }
}
