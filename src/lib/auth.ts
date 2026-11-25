import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  DEFAULT_AUTH_SECRET_FALLBACK,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signAdminSessionToken,
  verifyAdminSessionToken,
  type AdminSession,
} from "@/lib/auth-edge";

export async function getAuthEnv(): Promise<{
  secret: string;
  defaultUsername: string;
  defaultEmail: string;
  defaultPassword: string;
  hasEnvPasswordOverride: boolean;
}> {
  let cfEnv: Partial<CloudflareEnv> | undefined;
  try {
    const ctx = await getCloudflareContext({ async: true });
    cfEnv = ctx?.env;
  } catch {
    // Fallback to process.env outside Cloudflare runtime
  }

  const secret =
    cfEnv?.AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    DEFAULT_AUTH_SECRET_FALLBACK;

  const defaultUsername = (
    cfEnv?.ADMIN_USERNAME ||
    process.env.ADMIN_USERNAME ||
    "admin"
  )
    .trim()
    .toLowerCase();

  const defaultEmail = (
    cfEnv?.ADMIN_EMAIL ||
    process.env.ADMIN_EMAIL ||
    "admin@gallardoperformance.com"
  )
    .trim()
    .toLowerCase();

  const envPassword = cfEnv?.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  const defaultPassword = envPassword || "Gallardo2026!";

  return {
    secret,
    defaultUsername,
    defaultEmail,
    defaultPassword,
    hasEnvPasswordOverride: Boolean(envPassword),
  };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const { secret } = await getAuthEnv();
  return verifyAdminSessionToken(token, secret);
}

export async function createSignedSessionCookie(
  payload: Omit<AdminSession, "exp">,
  isHttps: boolean
): Promise<{
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    sameSite: "lax";
    secure: boolean;
    path: string;
    maxAge: number;
  };
}> {
  const { secret } = await getAuthEnv();
  const value = await signAdminSessionToken(payload, secret);
  return {
    name: SESSION_COOKIE_NAME,
    value,
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  };
}

export function isHttpsRequest(request: Request): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0].trim() === "https";
  }
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

export async function requireAdminApi(): Promise<
  { session: AdminSession; response?: never } | { session?: never; response: NextResponse }
> {
  const session = await getAdminSession();
  if (!session) {
    return {
      response: NextResponse.json(
        { error: "No autorizado. Iniciá sesión en /admin." },
        { status: 401 }
      ),
    };
  }
  return { session };
}
