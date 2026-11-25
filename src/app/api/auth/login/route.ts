import { NextResponse } from "next/server";
import { getWorkshopRepository } from "@/db";
import {
  createSignedSessionCookie,
  getAuthEnv,
  isHttpsRequest,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/auth-edge";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const identifier =
      typeof body?.identifier === "string" ? body.identifier.trim() : "";
    const password =
      typeof body?.password === "string" ? body.password : "";

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Ingresá tu usuario o email y tu contraseña." },
        { status: 400 }
      );
    }

    const repo = await getWorkshopRepository();
    const user = await repo.findAdminByIdentifier(identifier);
    const authEnv = await getAuthEnv();

    let authenticatedUser: {
      id: number;
      username: string;
      email: string;
      displayName: string;
    } | null = null;

    if (user) {
      const valid = await verifyPassword(password, user.passwordHash);
      if (valid) {
        authenticatedUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
        };
      }
    }

    // Optional fallback if ADMIN_PASSWORD env var was explicitly overridden in Cloudflare
    if (!authenticatedUser && authEnv.hasEnvPasswordOverride) {
      const cleanId = identifier.toLowerCase();
      if (
        (cleanId === authEnv.defaultUsername ||
          cleanId === authEnv.defaultEmail) &&
        password === authEnv.defaultPassword
      ) {
        authenticatedUser = {
          id: user?.id ?? 1,
          username: user?.username ?? authEnv.defaultUsername,
          email: user?.email ?? authEnv.defaultEmail,
          displayName: user?.displayName ?? "Gallardo Performance",
        };
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: "Usuario/email o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const cookie = await createSignedSessionCookie(
      {
        sub: authenticatedUser.id,
        username: authenticatedUser.username,
        email: authenticatedUser.email,
        displayName: authenticatedUser.displayName,
      },
      isHttpsRequest(request)
    );

    const response = NextResponse.json({
      ok: true,
      user: authenticatedUser,
    });
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { error: "No se pudo iniciar sesión. Intentá nuevamente." },
      { status: 500 }
    );
  }
}
