export const SESSION_COOKIE_NAME = "gp_admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const DEFAULT_AUTH_SECRET_FALLBACK =
  "gp-rosario-workshop-session-secret-v1-2026-humberto-primo-820";

export interface AdminSession {
  sub: number;
  username: string;
  email: string;
  displayName: string;
  exp: number;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLen);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signAdminSessionToken(
  payload: Omit<AdminSession, "exp">,
  secret: string
): Promise<string> {
  const fullPayload: AdminSession = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = bytesToBase64Url(
    textEncoder.encode(JSON.stringify(fullPayload))
  );
  const key = await importHmacKey(secret);
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(encodedPayload)
  );
  const encodedSig = bytesToBase64Url(new Uint8Array(sigBuf));
  return `${encodedPayload}.${encodedSig}`;
}

export async function verifyAdminSessionToken(
  token: string | undefined | null,
  secret: string
): Promise<AdminSession | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, encodedSig] = parts;
  if (!encodedPayload || !encodedSig) return null;

  try {
    const key = await importHmacKey(secret);
    const expectedSig = new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        key,
        textEncoder.encode(encodedPayload)
      )
    );
    const providedSig = base64UrlToBytes(encodedSig);
    if (!timingSafeEqual(expectedSig, providedSig)) {
      return null;
    }

    const decoded = JSON.parse(
      textDecoder.decode(base64UrlToBytes(encodedPayload))
    ) as Partial<AdminSession>;

    if (
      typeof decoded.sub !== "number" ||
      typeof decoded.username !== "string" ||
      typeof decoded.email !== "string" ||
      typeof decoded.displayName !== "string" ||
      typeof decoded.exp !== "number"
    ) {
      return null;
    }

    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decoded as AdminSession;
  } catch {
    return null;
  }
}

const PBKDF2_ITERATIONS = 100_000;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(
    new Uint8Array(derivedBits)
  )}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const salt = hexToBytes(parts[2]);
  const expected = hexToBytes(parts[3]);
  if (!Number.isFinite(iterations) || iterations < 10_000 || !salt || !expected) {
    return false;
  }

  try {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      textEncoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt as unknown as BufferSource,
        iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      expected.length * 8
    );
    return timingSafeEqual(new Uint8Array(derivedBits), expected);
  } catch {
    return false;
  }
}

export function isSafeAdminNextPath(raw: string | null | undefined): string {
  if (!raw) return "/admin";
  const trimmed = raw.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("://")
  ) {
    return "/admin";
  }
  return trimmed;
}

export function normalizePlateForSearch(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
