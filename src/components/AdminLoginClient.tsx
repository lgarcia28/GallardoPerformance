"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { WORKSHOP_INFO } from "@/lib/workshop";

interface AdminLoginClientProps {
  nextPath?: string;
}

export function AdminLoginClient({
  nextPath = "/admin",
}: AdminLoginClientProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Ingresá tu usuario o email y tu contraseña.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo iniciar sesión.");
      }

      if (nextPath && nextPath !== "/admin") {
        router.push(nextPath);
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al iniciar sesión."
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-between bg-[#09090B] px-5 py-6 text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al inicio
        </Link>
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500">
          /admin
        </span>
      </div>

      <main className="mx-auto my-10 w-full max-w-sm">
        <div className="mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-gallardo.png"
            alt={WORKSHOP_INFO.name}
            width={200}
            height={38}
            className="h-8 w-auto object-contain"
          />
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">
            Acceso taller
          </h1>
          <p className="mt-1.5 text-xs text-neutral-400">
            Ingresá con tu usuario o email y contraseña.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-identifier"
              className="mb-1.5 block text-xs font-medium text-neutral-300"
            >
              Usuario o email
            </label>
            <input
              id="admin-identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin o tu@email.com"
              className="min-h-[46px] w-full rounded-lg border border-neutral-800 bg-[#121212] px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition focus:border-neutral-500"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="mb-1.5 block text-xs font-medium text-neutral-300"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="min-h-[46px] w-full rounded-lg border border-neutral-800 bg-[#121212] py-2.5 pr-11 pl-3.5 text-sm text-white placeholder-neutral-500 outline-none transition focus:border-neutral-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 transition hover:text-white cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            id="admin-login-submit"
            disabled={submitting}
            className="mt-2 inline-flex min-h-[46px] w-full items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {submitting ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </main>

      <p className="text-center text-[11px] text-neutral-600">
        {WORKSHOP_INFO.address}
      </p>
    </div>
  );
}
