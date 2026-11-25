import { NextResponse, type NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  DEFAULT_AUTH_SECRET_FALLBACK,
  SESSION_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/lib/auth-edge";

const PROTECTED_PAGE_PREFIXES = [
  "/turnos",
  "/presupuestos",
  "/vehiculos",
  "/historial",
  "/finanzas",
];

const PROTECTED_API_PREFIXES = [
  "/api/dashboard",
  "/api/vehicles",
  "/api/repairs",
  "/api/alerts",
  "/api/finances",
  "/api/appointments",
  "/api/brands",
  "/api/quotes",
  "/api/auth/account",
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

async function resolveProxyAuthSecret(): Promise<string> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    if (ctx?.env?.AUTH_SECRET) {
      return ctx.env.AUTH_SECRET;
    }
  } catch {
    // Fallback outside CF runtime
  }
  return process.env.AUTH_SECRET || DEFAULT_AUTH_SECRET_FALLBACK;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtectedPage = matchesPrefix(pathname, PROTECTED_PAGE_PREFIXES);
  const isProtectedApi = matchesPrefix(pathname, PROTECTED_API_PREFIXES);

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = await resolveProxyAuthSecret();
  const session = await verifyAdminSessionToken(token, secret);

  if (session) {
    return NextResponse.next();
  }

  if (isProtectedApi) {
    return NextResponse.json(
      { error: "No autorizado. Iniciá sesión en /admin." },
      { status: 401 }
    );
  }

  const loginUrl = new URL("/admin", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/turnos/:path*",
    "/presupuestos/:path*",
    "/vehiculos/:path*",
    "/historial/:path*",
    "/finanzas/:path*",
    "/api/dashboard/:path*",
    "/api/vehicles/:path*",
    "/api/repairs/:path*",
    "/api/alerts/:path*",
    "/api/finances/:path*",
    "/api/appointments/:path*",
    "/api/brands/:path*",
    "/api/quotes/:path*",
    "/api/auth/account/:path*",
  ],
};
