import { NextResponse } from "next/server";
import { isHttpsRequest } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth-edge";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttpsRequest(request),
    path: "/",
    maxAge: 0,
  });
  return response;
}
