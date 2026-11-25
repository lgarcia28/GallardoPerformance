import { NextResponse } from "next/server";
import { getWorkshopRepository } from "@/db";

export async function GET() {
  try {
    const repo = await getWorkshopRepository();
    const brands = await repo.listBrands();
    return NextResponse.json({ brands });
  } catch (error) {
    console.error("GET /api/brands error:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las marcas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawName = String(body.name ?? "").trim();

    if (!rawName || rawName.length < 2) {
      return NextResponse.json(
        { error: "Ingresá un nombre de marca válido." },
        { status: 400 }
      );
    }

    const repo = await getWorkshopRepository();
    const brand = await repo.createBrand(rawName);
    return NextResponse.json({ brand }, { status: 201 });
  } catch (error) {
    console.error("POST /api/brands error:", error);
    return NextResponse.json(
      { error: "No se pudo guardar la marca." },
      { status: 500 }
    );
  }
}
