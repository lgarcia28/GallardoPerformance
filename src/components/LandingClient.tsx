"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  Lock,
  MapPin,
  Search,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { PlateBadge } from "@/components/PlateBadge";
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
    title: "Service y mantenimiento preventivo",
    detail:
      "Cambio de aceite, filtros, fluidos y control multipunto con seguimiento por patente y kilometraje.",
  },
  {
    num: "02",
    title: "Diagnóstico computarizado",
    detail:
      "Escaneo electrónico, sensores e inyección para detectar fallas con precisión desde el primer chequeo.",
  },
  {
    num: "03",
    title: "Distribución y mecánica integral",
    detail:
      "Kits de distribución, bomba de agua, embrague y reparaciones de motor con repuestos de primera línea.",
  },
  {
    num: "04",
    title: "Frenos, suspensión y tren delantero",
    detail:
      "Pastillas, discos, amortiguadores, bujes y puesta a punto general para un manejo firme y seguro.",
  },
  {
    num: "05",
    title: "Performance y puesta a punto",
    detail:
      "Mejoras mecánicas y optimización pensadas para que tu auto entregue siempre su mejor rendimiento.",
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
      setError("Ingresá una patente para consultar (ej. AD 482 KL).");
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
          block: "start",
        });
      }, 60);
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
    <div className="min-h-screen bg-[#09090B] text-zinc-100 selection:bg-red-600 selection:text-white">
      {/* Modern Glass Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#09090B]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-gallardo.png"
              alt={WORKSHOP_INFO.name}
              width={190}
              height={36}
              className="h-6 w-auto object-contain sm:h-7"
            />
          </Link>

          <nav
            className="hidden items-center gap-7 text-xs font-medium text-zinc-400 md:flex"
            aria-label="Navegación"
          >
            <a href="#historial" className="transition hover:text-white">
              Historial
            </a>
            <a href="#servicios" className="transition hover:text-white">
              Servicios
            </a>
            <a href="#contacto" className="transition hover:text-white">
              Ubicación
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <a
              href={WORKSHOP_INFO.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden min-h-[36px] items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:text-white sm:inline-flex"
            >
              <span>Instagram</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500" />
            </a>
            <Link
              href="/admin"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.1] hover:text-white"
            >
              <Lock className="h-3 w-3 text-zinc-400" />
              <span>Admin</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Modern Full-Bleed Editorial Hero + Tactile Mercosur Plate Lookup */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-workshop.jpg"
            alt=""
            className="h-full w-full object-cover object-center opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#09090B] via-[#09090B]/85 to-[#09090B]/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-[#09090B]/50" />
        </div>

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-12 lg:gap-12 lg:py-24">
          {/* Left Copy */}
          <div className="space-y-6 lg:col-span-7">
            <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
              Humberto Primo 820 · Rosario
            </p>

            <h1 className="text-4xl font-bold leading-[1.06] tracking-[-0.03em] text-white sm:text-5xl lg:text-[56px]">
              Mecánica, diagnóstico y performance.
            </h1>

            <p className="max-w-lg text-sm leading-relaxed text-zinc-300 sm:text-base">
              {WORKSHOP_INFO.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200"
              >
                <MapPin className="h-3.5 w-3.5 text-red-600" />
                <span>Cómo llegar</span>
              </a>
              <a
                href={WORKSHOP_INFO.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-5 py-2.5 text-xs font-medium text-white backdrop-blur-md transition hover:border-white/30 hover:bg-white/[0.1]"
              >
                <span>{WORKSHOP_INFO.instagramHandle}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
              </a>
            </div>
          </div>

          {/* Right: Sleek Mercosur License Plate Lookup Card */}
          <div id="historial" className="scroll-mt-24 lg:col-span-5">
            <div className="rounded-2xl border border-white/12 bg-[#0F0F12]/88 p-5 shadow-2xl shadow-black/70 backdrop-blur-xl sm:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                Historial por patente
              </p>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white">
                Consultá tu vehículo
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Ingresá tu patente para ver las reparaciones realizadas, fechas
                y kilometrajes registrados en el taller.
              </p>

              <form onSubmit={handleLookup} className="mt-5 space-y-3.5">
                {/* Tactile Argentine Mercosur License Plate Input */}
                <div className="overflow-hidden rounded-xl border border-zinc-700/90 bg-[#09090B] shadow-inner transition focus-within:border-white/50">
                  <div className="flex items-center justify-between bg-[#164299] px-3.5 py-1.5">
                    <span className="text-[9px] font-bold tracking-[0.22em] text-blue-100">
                      REPÚBLICA ARGENTINA
                    </span>
                    <span className="text-[9px] font-semibold tracking-widest text-blue-200/85">
                      MERCOSUR
                    </span>
                  </div>
                  <div className="px-3 py-2">
                    <input
                      ref={inputRef}
                      id="public-plate-input"
                      type="text"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      value={plateInput}
                      onChange={(e) =>
                        setPlateInput(e.target.value.toUpperCase())
                      }
                      placeholder="AA 123 BB"
                      aria-label="Ingresá la patente del vehículo"
                      className="min-h-[48px] w-full bg-transparent text-center font-mono text-2xl font-extrabold uppercase tracking-[0.22em] text-white placeholder-zinc-600 outline-none sm:text-[26px]"
                    />
                  </div>
                </div>

                {error && (
                  <p role="alert" className="text-xs font-medium text-red-400">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  id="public-plate-submit"
                  disabled={loading}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-950/40 transition hover:bg-red-500 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  <Search className="h-4 w-4" />
                  {loading ? "Buscando historial..." : "Ver historial"}
                </button>

                <p className="text-center text-[11px] text-zinc-500">
                  Con o sin espacios · Ej.{" "}
                  <span className="font-mono text-zinc-300">AD 482 KL</span>
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Service History Ledger */}
      {result && (
        <section
          ref={resultRef}
          aria-live="polite"
          className="scroll-mt-20 border-b border-white/[0.06] bg-[#0C0C0F] py-10 sm:py-14"
        >
          <div className="mx-auto max-w-4xl px-5 sm:px-8">
            {result.found && result.vehicle ? (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111115] shadow-2xl shadow-black/50">
                {/* Vehicle Header */}
                <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] p-5 sm:flex-row sm:items-center sm:p-7">
                  <div className="flex items-center gap-4">
                    <BrandLogo
                      brandName={result.vehicle.brand}
                      brandSlug={result.vehicle.brandSlug}
                      size="lg"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <PlateBadge plate={result.vehicle.licensePlate} />
                        <span className="font-mono text-xs text-zinc-400">
                          {result.repairs?.length ?? 0}{" "}
                          {(result.repairs?.length ?? 0) === 1
                            ? "servicio"
                            : "servicios"}
                        </span>
                      </div>
                      <h3 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
                        {result.vehicle.brand} {result.vehicle.model}{" "}
                        <span className="font-normal text-zinc-400">
                          {result.vehicle.year}
                        </span>
                      </h3>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {result.vehicle.engine
                          ? `${result.vehicle.engine} · `
                          : ""}
                        Último kilometraje:{" "}
                        <span className="font-mono font-semibold text-zinc-200">
                          {formatMileage(result.vehicle.currentMileage)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="self-start rounded-full border border-white/12 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white sm:self-auto cursor-pointer"
                  >
                    Otra patente
                  </button>
                </div>

                {/* Next Maintenance Strip */}
                {result.nextMaintenance && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.02] px-5 py-3.5 sm:px-7">
                    <div className="flex items-center gap-2.5 text-xs">
                      <CalendarClock
                        className={`h-4 w-4 shrink-0 ${
                          result.nextMaintenance.severity === "overdue"
                            ? "text-red-500"
                            : "text-zinc-400"
                        }`}
                      />
                      <span className="text-zinc-400">
                        Próximo mantenimiento sugerido:{" "}
                        <strong className="font-semibold text-white">
                          {result.nextMaintenance.serviceType}
                        </strong>
                      </span>
                    </div>
                    <span
                      className={`font-mono text-xs font-semibold ${
                        result.nextMaintenance.severity === "overdue"
                          ? "text-red-400"
                          : "text-zinc-200"
                      }`}
                    >
                      {formatShortDate(result.nextMaintenance.dueDate)}
                    </span>
                  </div>
                )}

                {/* Chronological Service Entries */}
                <div className="divide-y divide-white/[0.06] px-5 sm:px-7">
                  {result.repairs && result.repairs.length > 0 ? (
                    result.repairs.map((repair) => (
                      <div
                        key={repair.id}
                        className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-12 sm:gap-6"
                      >
                        <div className="flex items-center gap-2.5 font-mono text-xs text-zinc-400 sm:col-span-3 sm:flex-col sm:items-start sm:gap-1">
                          <span className="font-semibold text-zinc-200">
                            {formatShortDate(repair.serviceDate)}
                          </span>
                          <span>{formatMileage(repair.mileageAtService)}</span>
                        </div>
                        <div className="sm:col-span-9">
                          <p className="text-sm font-semibold text-white">
                            {repair.serviceType}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                            {repair.description}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-8 text-center text-xs text-zinc-400">
                      Este vehículo está registrado, pero todavía no tiene
                      trabajos cargados.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-[#111115] p-6 sm:flex-row sm:items-center sm:p-7">
                <div>
                  <h3 className="text-base font-bold text-white">
                    No encontramos registros para{" "}
                    <span className="font-mono text-red-400">
                      {result.searchedPlate || plateInput}
                    </span>
                  </h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    Revisá que la patente esté bien escrita o escribinos por
                    Instagram para coordinar tu primer service.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="self-start rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:border-white/30 hover:text-white sm:self-auto cursor-pointer"
                >
                  Probar otra patente
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Modern Architectural Services List */}
      <section id="servicios" className="scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 sm:px-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              Servicios
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Criterio técnico y seguimiento real en cada servicio.
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-zinc-400 sm:text-sm">
              Trabajamos todas las marcas dejando asentado cada mantenimiento en
              el historial de tu patente.
            </p>
          </div>

          <div className="divide-y divide-white/[0.08] border-y border-white/[0.08] lg:col-span-8">
            {SERVICES.map((item) => (
              <div
                key={item.num}
                className="grid grid-cols-1 gap-2 px-2 py-5 transition hover:bg-white/[0.02] sm:grid-cols-12 sm:gap-4 sm:px-4"
              >
                <span className="font-mono text-xs font-semibold text-red-500 sm:col-span-2">
                  {item.num}
                </span>
                <div className="sm:col-span-10">
                  <h3 className="text-sm font-semibold text-white sm:text-base">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modern Contact Card & Minimal Footer */}
      <section
        id="contacto"
        className="scroll-mt-20 border-t border-white/[0.06] py-14 sm:py-16"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid grid-cols-1 gap-8 rounded-2xl border border-white/[0.08] bg-[#111115] p-6 sm:grid-cols-3 sm:p-8">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                Ubicación
              </p>
              <p className="mt-2.5 text-sm font-semibold text-white">
                {WORKSHOP_INFO.address}
              </p>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-400 transition hover:text-white"
              >
                <span>Abrir en Google Maps</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                WhatsApp y redes
              </p>
              <a
                href={WORKSHOP_INFO.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-white transition hover:text-[#25D366]"
              >
                <span>{WORKSHOP_INFO.whatsappDisplay}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500" />
              </a>
              <div className="mt-1.5">
                <a
                  href={WORKSHOP_INFO.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 transition hover:text-white"
                >
                  <span>{WORKSHOP_INFO.instagramHandle}</span>
                  <ArrowUpRight className="h-3 w-3 text-zinc-500" />
                </a>
              </div>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                Sistema interno
              </p>
              <Link
                href="/admin"
                className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-200 transition hover:text-white"
              >
                <Lock className="h-3.5 w-3.5 text-red-500" />
                <span>Acceso taller</span>
              </Link>
              <p className="mt-1 text-xs text-zinc-500">
                Gestión privada de GallardoPerformance
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] pb-20 sm:pb-0">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-5 py-6 text-[11px] text-zinc-500 sm:flex-row sm:items-center sm:px-8">
          <span>© {new Date().getFullYear()} GallardoPerformance</span>
          <span>Humberto Primo 820 · Rosario, Santa Fe</span>
        </div>
      </footer>

      {/* Floating WhatsApp Inquiries Button */}
      <a
        href={WORKSHOP_INFO.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        id="floating-whatsapp-btn"
        aria-label="Consultas por WhatsApp al 341 212-2472"
        title="Consultas por WhatsApp"
        className="group fixed right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-50 inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-[#25D366] px-4 text-white shadow-2xl shadow-black/60 ring-1 ring-white/20 transition hover:scale-[1.03] hover:bg-[#22c35e] active:scale-95 sm:right-6 sm:bottom-6 sm:px-5"
      >
        <svg
          viewBox="0 0 32 32"
          className="h-6 w-6 shrink-0 fill-current"
          aria-hidden="true"
        >
          <path d="M16.004 3C8.833 3 3 8.832 3 16.002c0 2.29.598 4.525 1.734 6.494L3 29l6.678-1.751A12.94 12.94 0 0 0 16.004 29C23.173 29 29 23.17 29 16.002 29 8.832 23.173 3 16.004 3zm0 23.62c-2.01 0-3.982-.54-5.702-1.56l-.409-.243-3.963 1.039 1.058-3.864-.266-.424a10.56 10.56 0 0 1-1.622-5.566c0-5.847 4.757-10.604 10.605-10.604 2.833 0 5.495 1.104 7.498 3.108a10.535 10.535 0 0 1 3.106 7.496c0 5.848-4.758 10.618-10.305 10.618zm5.816-7.953c-.319-.16-1.886-.931-2.179-1.037-.292-.106-.505-.16-.718.16-.212.319-.824 1.037-1.01 1.25-.186.213-.372.24-.691.08-.319-.16-1.347-.497-2.565-1.583-.948-.846-1.589-1.89-1.775-2.21-.186-.319-.02-.491.14-.65.143-.143.319-.372.479-.558.16-.186.212-.319.319-.532.106-.212.053-.398-.027-.558-.08-.16-.718-1.729-.984-2.367-.259-.622-.522-.538-.718-.548l-.611-.011c-.213 0-.558.08-.851.399-.292.319-1.117 1.091-1.117 2.661s1.144 3.086 1.303 3.299c.16.213 2.25 3.437 5.452 4.82.762.329 1.356.526 1.82.673.765.243 1.461.209 2.011.127.614-.092 1.886-.771 2.152-1.516.266-.745.266-1.383.186-1.516-.08-.133-.292-.213-.611-.372z" />
        </svg>
        <span className="hidden text-xs font-bold tracking-tight sm:inline">
          Consultas
        </span>
      </a>
    </div>
  );
}
