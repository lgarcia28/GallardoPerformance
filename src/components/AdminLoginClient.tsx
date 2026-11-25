"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  ShieldCheck,
  User,
} from "lucide-react";
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
    <div className="relative flex min-h-dvh flex-col justify-between bg-[#080B12] px-4 py-6 text-slate-100 sm:px-6">
      {/* Subtle top bar */}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link
          href="/"
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-800/90 bg-slate-900/70 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-700 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al sitio público
        </Link>

        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
          Acceso exclusivo taller
        </span>
      </div>

      {/* Centered Login Card */}
      <main className="mx-auto my-8 w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0E1422] shadow-2xl shadow-black/60">
          {/* Brand Header */}
          <div className="border-b border-slate-800/80 bg-[#0A0F1A] px-6 py-7 text-center">
            <div className="mx-auto flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-gallardo.png"
                alt={WORKSHOP_INFO.name}
                width={230}
                height={44}
                className="h-10 w-auto object-contain"
              />
            </div>
            <h1 className="mt-4 text-lg font-bold tracking-tight text-white">
              Panel de Gestión del Taller
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Ingresá con tu usuario o email y contraseña para administrar
              turnos, presupuestos, vehículos y finanzas.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div>
              <label
                htmlFor="admin-identifier"
                className="mb-1.5 block text-xs font-semibold text-slate-300"
              >
                Usuario o Email
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
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
                  className="min-h-[46px] w-full rounded-xl border border-slate-700/90 bg-slate-950 py-2.5 pr-3.5 pl-10 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-amber-500/80"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-xs font-semibold text-slate-300"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresá tu contraseña"
                  className="min-h-[46px] w-full rounded-xl border border-slate-700/90 bg-slate-950 py-2.5 pr-11 pl-10 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-amber-500/80"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  className="absolute top-1/2 right-2.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 cursor-pointer"
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
              <div
                role="alert"
                className="rounded-xl border border-red-500/35 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              id="admin-login-submit"
              disabled={submitting}
              className="mt-2 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-400 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              <LogIn className="h-4 w-4" />
              {submitting ? "Verificando acceso..." : "Ingresar al Panel"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-[11px] text-slate-500">
          {WORKSHOP_INFO.name} · {WORKSHOP_INFO.address}
        </p>
      </main>

      <div aria-hidden="true" className="h-4" />
    </div>
  );
}
