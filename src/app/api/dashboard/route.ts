import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/queries";

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las alertas del taller." },
      { status: 500 }
    );
  }
}
