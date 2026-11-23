import { NextResponse } from "next/server";
import { getFinancesData } from "@/lib/queries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const data = await getFinancesData(from, to);
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/finances error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el reporte de finanzas." },
      { status: 500 }
    );
  }
}
