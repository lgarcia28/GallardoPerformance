import { requireAdminApi } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/queries";

export async function GET() {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

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
