import { NextResponse } from "next/server";
import { getWorkshopRepository } from "@/db";
import {
  createSignedSessionCookie,
  isHttpsRequest,
  requireAdminApi,
} from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/auth-edge";

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  try {
    const body = await request.json().catch(() => null);
    const username =
      typeof body?.username === "string"
        ? body.username.trim().toLowerCase()
        : undefined;
    const email =
      typeof body?.email === "string"
        ? body.email.trim().toLowerCase()
        : undefined;
    const displayName =
      typeof body?.displayName === "string"
        ? body.displayName.trim()
        : undefined;
    const currentPassword =
      typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword =
      typeof body?.newPassword === "string" ? body.newPassword : "";

    if (username !== undefined && username.length < 3) {
      return NextResponse.json(
        { error: "El usuario debe tener al menos 3 caracteres." },
        { status: 400 }
      );
    }
    if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Ingresá un email válido." },
        { status: 400 }
      );
    }

    const repo = await getWorkshopRepository();
    const existing = await repo.getAdminById(auth.session.sub);
    if (!existing) {
      return NextResponse.json(
        { error: "Cuenta administradora no encontrada." },
        { status: 404 }
      );
    }

    let passwordHash: string | undefined;
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "La nueva contraseña debe tener al menos 6 caracteres." },
          { status: 400 }
        );
      }
      const validCurrent = await verifyPassword(
        currentPassword,
        existing.passwordHash
      );
      if (!validCurrent) {
        return NextResponse.json(
          { error: "La contraseña actual es incorrecta." },
          { status: 400 }
        );
      }
      passwordHash = await hashPassword(newPassword);
    }

    const updated = await repo.updateAdminAccount(existing.id, {
      username,
      email,
      displayName: displayName || existing.displayName,
      passwordHash,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "No se pudo actualizar la cuenta." },
        { status: 500 }
      );
    }

    const cookie = await createSignedSessionCookie(
      {
        sub: updated.id,
        username: updated.username,
        email: updated.email,
        displayName: updated.displayName,
      },
      isHttpsRequest(request)
    );

    const response = NextResponse.json({
      ok: true,
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        displayName: updated.displayName,
      },
    });
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    console.error("PATCH /api/auth/account error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la cuenta administradora." },
      { status: 500 }
    );
  }
}
