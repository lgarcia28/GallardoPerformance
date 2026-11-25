import type { D1Database } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB?: D1Database;
    AUTH_SECRET?: string;
    ADMIN_USERNAME?: string;
    ADMIN_EMAIL?: string;
    ADMIN_PASSWORD?: string;
  }
}

export {};
