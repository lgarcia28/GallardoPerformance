"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import {
  formatMileage,
  formatShortDate,
  WORKSHOP_INFO,
} from "@/lib/workshop";

interface PublicVehicle {
  licensePlate: string;
  brand: string;
  brandSlug: string;
  model: string;
  year: number;
  engine: string | null;
  currentMileage: number;
}

interface PublicRepair {
  id: number;
  serviceDate: string;
  mileageAtService: number;
  serviceType: string;
  description: string;
  reminderDueDate: string | null;
}

interface PublicHistoryResponse {
  found: boolean;
  searchedPlate?: string;
  vehicle?: PublicVehicle;
  nextMaintenance?: {
    serviceType: string;
    dueDate: string;
    severity: "overdue" | "upcoming" | "ok" | "notified";
  } | null;
  repairs?: PublicRepair[];
  error?: string;
}

const SERVICES = [
  {
    num: "01",
    title: "Service y mantenimiento",
    detail:
      "Cambio de aceite, filtros, fluidos y revisión general con registro por patente y kilometraje.",
  },
  {
    num: "02",
    title: "Diagnóstico computarizado",
    detail:
      "Escaneo de inyección, electrónica y sensores para encontrar el origen exacto de cada falla.",
  },
  {
    num: "03",
    title: "Distribución y mecánica integral",
    detail:
      "Kits de distribución, bomba de agua, embrague y trabajos de motor con repuestos de primera línea.",
  },
  {
    num: "04",
    title: "Frenos, suspensión y tren delantero",
    detail:
      "Pastillas, discos, amortiguadores, bujes y puesta a punto general para un manejo firme y seguro.",
  },
  {
    num: "05",
    title: "Performance y mejoras",
    detail:
      "Optimización mecánica y puesta a punto para que tu auto entregue siempre su mejor rendimiento.",
  },
];

const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Humberto+Primo+820,+Rosario,+Santa+Fe,+Argentina";

export function LandingClient() {
  const [plateInput, setPlateInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicHistoryResponse | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const clean = plateInput.trim();
    if (!clean) {
      setError("Escribí una patente para buscar (ej. AD 482 KL).");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/public/history?plate=${encodeURIComponent(clean)}`,
        { cache: "no-store" }
      );
      const data: PublicHistoryResponse = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo consultar la patente.");
      }
      setResult(data);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 50);
    } catch (err) {
      setResult(null);
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al consultar la patente."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setError(null);
    setPlateInput("");
    inputRef.current?.focus();
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-neutral-100 selection:bg-red-600 selection:text-white">
      {/* Minimal Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-900 bg-[#0A0A0A]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-gallardo.png"
              alt={WORKSHOP_INFO.name}
              width={185}
              height={35}
              className="h-6 w-auto object-contain sm:h-7"
            />
          </Link>

          <nav
            className="flex items-center gap-5 text-xs font-medium text-neutral-400 sm:gap-7"
            aria-label="Navegación"
          >
            <a
              href="#historial"
              className="transition hover:text-white"
            >
              Historial
            </a>
            <a
              href="#servicios"
              className="hidden transition hover:text-white sm:inline"
            >
              Servicios
            </a>
            <a
              href="#contacto"
              className="hidden transition hover:text-white sm:inline"
            >
              Ubicación
            </a>
            <Link
              href="/admin"
              className="border-l border-neutral-800 pl-5 text-neutral-300 transition hover:text-white sm:pl-7"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 sm:px-8">
        {/* Editorial Hero */}
        <section className="pt-14 pb-12 sm:pt-20 sm:pb-16">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-400">
              <span className="inline-block h-1.5 w-1.5 bg-red-600" />
              Humberto Primo 820 · Rosario
            </p>

            <h1 className="mt-5 text-4xl font-bold leading-[1.06] tracking-[-0.03em] text-white sm:text-6xl">
              Mecánica, diagnóstico y performance.
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-relaxed text-neutral-400 sm:text-base">
              {WORKSHOP_INFO.description}
            </p>
          </div>

          {/* Direct, Minimal Patente Lookup */}
          <div id="historial" className="mt-10 max-w-xl scroll-mt-24">
            <label
              htmlFor="public-plate-input"
              className="block font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400"
            >
              Consultá el historial de reparaciones de tu auto
            </label>

            <form
              onSubmit={handleLookup}
              className="mt-3 flex flex-col gap-2.5 sm:flex-row"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <input
                  ref={inputRef}
                  id="public-plate-input"
                  type="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  value={plateInput}
                  onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
                  placeholder="Ingresá tu patente (ej. AD 482 KL)"
                  className="min-h-[48px] w-full rounded-lg border border-neutral-800 bg-[#121212] py-2.5 pr-4 pl-10 font-mono text-sm font-semibold uppercase tracking-[0.12em] text-white placeholder-neutral-500 outline-none transition focus:border-neutral-500"
                />
              </div>
              <button
                type="submit"
                id="public-plate-submit"
                disabled={loading}
                className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {loading ? "Buscando..." : "Ver historial"}
              </button>
            </form>

            {error && (
              <p role="alert" className="mt-2.5 text-xs text-red-400">
                {error}
              </p>
            )}
          </div>

          {/* Lookup Result Ledger */}
          {result && (
            <div
              ref={resultRef}
              aria-live="polite"
              className="mt-8 border border-neutral-800 bg-[#111111] p-5 sm:p-7 rounded-lg"
            >
              {result.found && result.vehicle ? (
                <div>
                  {/* Vehicle Header */}
                  <div className="flex flex-col justify-between gap-4 border-b border-neutral-800 pb-5 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3.5">
                      <BrandLogo
                        brandName={result.vehicle.brand}
                        brandSlug={result.vehicle.brandSlug}
                        size="md"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                            {result.vehicle.brand} {result.vehicle.model}{" "}
                            <span className="font-normal text-neutral-400">
                              {result.vehicle.year}
                            </span>
                          </h2>
                          <span className="rounded border border-neutral-700 bg-neutral-900 px-2 py-0.5 font-mono text-xs font-semibold tracking-wider text-neutral-200">
                            {result.vehicle.licensePlate}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-400">
                          {result.vehicle.engine
                            ? `${result.vehicle.engine} · `
                            : ""}
                          Último registro:{" "}
                          <span className="font-mono text-neutral-200">
                            {formatMileage(result.vehicle.currentMileage)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="self-start text-xs text-neutral-400 underline underline-offset-4 transition hover:text-white sm:self-auto cursor-pointer"
                    >
                      Buscar otra patente
                    </button>
                  </div>

                  {/* Next Maintenance Note */}
                  {result.nextMaintenance && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 py-3.5 text-xs">
                      <span className="text-neutral-400">
                        Próximo mantenimiento sugerido:{" "}
                        <strong className="font-semibold text-white">
                          {result.nextMaintenance.serviceType}
                        </strong>
                      </span>
                      <span
                        className={`font-mono font-semibold ${
                          result.nextMaintenance.severity === "overdue"
                            ? "text-red-400"
                            : "text-neutral-200"
                        }`}
                      >
                        {formatShortDate(result.nextMaintenance.dueDate)}
                      </span>
                    </div>
                  )}

                  {/* Service Ledger Rows */}
                  <div className="divide-y divide-neutral-800/80">
                    {result.repairs && result.repairs.length > 0 ? (
                      result.repairs.map((repair) => (
                        <div
                          key={repair.id}
                          className="grid grid-cols-1 gap-1.5 py-4 sm:grid-cols-12 sm:gap-4"
                        >
                          <div className="flex items-center gap-2 font-mono text-xs text-neutral-400 sm:col-span-3 sm:flex-col sm:items-start sm:gap-0.5">
                            <span className="text-neutral-200">
                              {formatShortDate(repair.serviceDate)}
                            </span>
                            <span>{formatMileage(repair.mileageAtService)}</span>
                          </div>
                          <div className="sm:col-span-9">
                            <p className="text-sm font-semibold text-white">
                              {repair.serviceType}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                              {repair.description}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="py-6 text-xs text-neutral-400">
                        El vehículo está registrado pero todavía no tiene
                        trabajos cargados.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      No encontramos registros para{" "}
                      <span className="font-mono text-neutral-300">
                        {result.searchedPlate || plateInput}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      Revisá que la patente esté bien escrita o consultanos si
                      es tu primera visita al taller.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="self-start rounded-lg border border-neutral-700 px-3.5 py-2 text-xs font-medium text-neutral-200 transition hover:border-neutral-500 hover:text-white sm:self-auto cursor-pointer"
                  >
                    Intentar de nuevo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Clean Framed Workshop Photo */}
          <div className="mt-12 overflow-hidden rounded-lg border border-neutral-900 bg-[#111111]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero-workshop.jpg"
              alt="Taller mecánico GallardoPerformance en Rosario"
              className="aspect-[16/9] w-full object-cover object-center sm:aspect-[21/9]"
            />
          </div>
        </section>

        {/* Minimal Numbered Services List */}
        <section
          id="servicios"
          className="scroll-mt-20 border-t border-neutral-900 py-14 sm:py-20"
        >
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                Servicios
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">
                Trabajo prolijo y seguimiento real de cada auto.
              </h2>
            </div>

            <div className="divide-y divide-neutral-900 lg:col-span-8">
              {SERVICES.map((item) => (
                <div
                  key={item.num}
                  className="grid grid-cols-1 gap-2 py-5 first:pt-0 sm:grid-cols-12 sm:gap-4"
                >
                  <span className="font-mono text-xs text-red-500 sm:col-span-2">
                    {item.num}
                  </span>
                  <div className="sm:col-span-10">
                    <h3 className="text-sm font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Minimal Contact & Location */}
        <section
          id="contacto"
          className="scroll-mt-20 border-t border-neutral-900 py-14 sm:py-16"
        >
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                Dirección
              </p>
              <p className="mt-2.5 text-sm font-medium text-white">
                {WORKSHOP_INFO.address}
              </p>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-neutral-400 transition hover:text-white"
              >
                <span>Ver en Google Maps</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                Instagram
              </p>
              <a
                href={WORKSHOP_INFO.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-flex items-center gap-1 text-sm font-medium text-white transition hover:text-neutral-300"
              >
                <span>{WORKSHOP_INFO.instagramHandle}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-neutral-500" />
              </a>
              <p className="mt-1 text-xs text-neutral-500">
                Trabajos diarios y consultas
              </p>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                Taller
              </p>
              <Link
                href="/admin"
                className="mt-2.5 inline-flex items-center gap-1 text-sm font-medium text-neutral-300 transition hover:text-white"
              >
                <span>Ingresar al panel</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-neutral-500" />
              </Link>
              <p className="mt-1 text-xs text-neutral-500">
                Acceso exclusivo personal
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-neutral-900">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-2 px-5 py-6 text-[11px] text-neutral-500 sm:flex-row sm:items-center sm:px-8">
          <span>© {new Date().getFullYear()} GallardoPerformance</span>
          <span>Rosario, Santa Fe</span>
        </div>
      </footer>
    </div>
  );
}
