"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  Disc,
  ExternalLink,
  Gauge,
  Lock,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Wrench,
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
    severity: "overdue" | "upcoming" | "scheduled" | "none";
  } | null;
  repairs?: PublicRepair[];
  error?: string;
}

const SERVICES = [
  {
    icon: Wrench,
    title: "Service completo y mantenimiento",
    description:
      "Cambio de aceite sintético, filtros originales, control de fluidos y chequeo multipunto registrado en el historial digital de tu auto.",
  },
  {
    icon: Cpu,
    title: "Diagnóstico computarizado",
    description:
      "Escaneo de inyección, fallas electrónicas, sensores y módulos con equipamiento actualizado para detectar problemas con precisión.",
  },
  {
    icon: Gauge,
    title: "Distribución y mecánica integral",
    description:
      "Kits de distribución, bomba de agua, embrague, correas y reparaciones de motor con repuestos de primera línea.",
  },
  {
    icon: Disc,
    title: "Frenos, suspensión y tren delantero",
    description:
      "Pastillas, discos, rectificado, amortiguadores, bujes y alineado de componentes para un manejo firme y seguro.",
  },
  {
    icon: ShieldCheck,
    title: "Performance y puesta a punto",
    description:
      "Mejoras mecánicas, puesta a punto y optimización general para que tu vehículo entregue siempre su mejor rendimiento.",
  },
  {
    icon: ClipboardCheck,
    title: "Libro de Service Digital",
    description:
      "Cada trabajo queda guardado por patente con fecha y kilometraje. Consultalo cuando quieras y sumá valor real al momento de vender tu auto.",
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
      setError("Ingresá una patente para consultar (ej. AA 123 BB o ABC 123).");
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
        throw new Error(data.error || "No pudimos realizar la consulta.");
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

  function handleResetLookup() {
    setResult(null);
    setError(null);
    setPlateInput("");
    inputRef.current?.focus();
  }

  const generalInstagramUrl = WORKSHOP_INFO.instagramUrl;

  return (
    <div className="min-h-screen bg-[#080B12] text-slate-100">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#080B12]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-gallardo.png"
              alt={WORKSHOP_INFO.name}
              width={200}
              height={38}
              className="h-7 w-auto object-contain sm:h-8"
            />
          </Link>

          <nav
            className="hidden items-center gap-7 text-xs font-semibold text-slate-300 md:flex"
            aria-label="Navegación pública"
          >
            <a href="#historial" className="transition hover:text-white">
              Consultar historial
            </a>
            <a href="#servicios" className="transition hover:text-white">
              Servicios
            </a>
            <a href="#ubicacion" className="transition hover:text-white">
              Ubicación
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={generalInstagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden min-h-[38px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08] sm:inline-flex"
            >
              <span>Instagram</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>
            <Link
              href="/admin"
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-700/90 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-amber-500/50 hover:text-amber-300"
            >
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              <span>Acceso taller</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Editorial Hero + License Plate Lookup */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        {/* Full-bleed bespoke workshop photography with directional obsidian scrim */}
        <div className="absolute inset-0" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-workshop.jpg"
            alt=""
            className="h-full w-full object-cover object-center opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080B12] via-[#080B12]/88 to-[#080B12]/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080B12] via-transparent to-[#080B12]/40" />
        </div>

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-24">
          {/* Left: Brand Story & Primary Copy */}
          <div className="space-y-6 lg:col-span-7">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
              <MapPin className="h-3.5 w-3.5" />
              {WORKSHOP_INFO.address}
            </p>

            <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl">
              Mantenimiento, diagnóstico y mejoras para que tu auto rinda al
              máximo.
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {WORKSHOP_INFO.description} Cada servicio realizado en nuestro
              taller queda registrado en el historial digital de tu vehículo
              para que lo consultes en cualquier momento con tu patente.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="#historial"
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-400"
              >
                <Search className="h-4 w-4" />
                Consultar mi patente
              </a>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/[0.12]"
              >
                <MapPin className="h-4 w-4 text-red-400" />
                Cómo llegar
              </a>
            </div>

            <div className="grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-lg font-extrabold text-white sm:text-xl">
                  100%
                </p>
                <p className="text-[11px] leading-snug text-slate-400">
                  Historial digital por patente
                </p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-white sm:text-xl">
                  A medida
                </p>
                <p className="text-[11px] leading-snug text-slate-400">
                  Diagnóstico y service integral
                </p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-white sm:text-xl">
                  Rosario
                </p>
                <p className="text-[11px] leading-snug text-slate-400">
                  Humberto Primo 820
                </p>
              </div>
            </div>
          </div>

          {/* Right: Interactive License Plate History Lookup Card */}
          <div id="historial" className="scroll-mt-24 lg:col-span-5">
            <div className="rounded-2xl border border-white/12 bg-[#0D1322]/92 p-5 shadow-2xl shadow-black/70 backdrop-blur-md sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-400">
                    Libro de Service Digital
                  </p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
                    Consultá el historial de tu auto
                  </h2>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/12 text-amber-400">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Ingresá tu patente para ver todas las reparaciones, fechas,
                kilometrajes y el próximo mantenimiento recomendado en{" "}
                <strong className="text-slate-200">GallardoPerformance</strong>.
              </p>

              <form onSubmit={handleLookup} className="mt-5 space-y-3.5">
                {/* Authentic Mercosur-inspired License Plate Input */}
                <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950 transition focus-within:border-amber-500/80">
                  <div className="flex items-center justify-between bg-[#153E90] px-3 py-1">
                    <span className="text-[9px] font-bold tracking-[0.22em] text-blue-100">
                      REPÚBLICA ARGENTINA
                    </span>
                    <span className="text-[9px] font-semibold tracking-widest text-blue-200/90">
                      PATENTE
                    </span>
                  </div>
                  <div className="flex items-center px-3 py-1.5">
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
                      className="min-h-[48px] w-full bg-transparent text-center font-mono text-2xl font-extrabold uppercase tracking-[0.2em] text-white placeholder-slate-600 outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-500/35 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-300"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  id="public-plate-submit"
                  disabled={loading}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-400 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  <Search className="h-4 w-4" />
                  {loading
                    ? "Buscando historial..."
                    : "Ver historial de reparaciones"}
                </button>

                <p className="text-center text-[11px] text-slate-500">
                  Podés escribirla con o sin espacios (ej.{" "}
                  <span className="font-mono text-slate-400">AD 482 KL</span> o{" "}
                  <span className="font-mono text-slate-400">AD482KL</span>).
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Public History Result Panel (appears immediately when user queries a plate) */}
      {result && (
        <section
          ref={resultRef}
          aria-live="polite"
          className="scroll-mt-20 border-b border-white/[0.06] bg-[#0B101C] py-10 sm:py-14"
        >
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {result.found && result.vehicle ? (
              <div className="space-y-6">
                {/* Vehicle Summary Card */}
                <div className="rounded-2xl border border-slate-800 bg-[#0F1627] p-5 shadow-xl sm:p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <BrandLogo
                        brandName={result.vehicle.brand}
                        brandSlug={result.vehicle.brandSlug}
                        size="lg"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <PlateBadge plate={result.vehicle.licensePlate} />
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            Historial verificado
                          </span>
                        </div>
                        <h3 className="mt-2 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                          {result.vehicle.brand} {result.vehicle.model}{" "}
                          <span className="font-normal text-slate-400">
                            ({result.vehicle.year})
                          </span>
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {result.vehicle.engine
                            ? `Motor ${result.vehicle.engine} · `
                            : ""}
                          Último kilometraje registrado:{" "}
                          <strong className="font-mono text-slate-200">
                            {formatMileage(result.vehicle.currentMileage)}
                          </strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                      <span className="rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2 font-mono text-xs font-bold text-amber-300">
                        {result.repairs?.length ?? 0}{" "}
                        {(result.repairs?.length ?? 0) === 1
                          ? "servicio registrado"
                          : "servicios registrados"}
                      </span>
                      <button
                        type="button"
                        onClick={handleResetLookup}
                        className="text-xs font-semibold text-slate-400 underline underline-offset-4 transition hover:text-white cursor-pointer"
                      >
                        Consultar otra patente
                      </button>
                    </div>
                  </div>

                  {/* Next Recommended Maintenance Banner */}
                  {result.nextMaintenance && (
                    <div
                      className={`mt-5 flex flex-col gap-3 rounded-xl border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
                        result.nextMaintenance.severity === "overdue"
                          ? "border-red-500/30 bg-red-500/10"
                          : "border-amber-500/30 bg-amber-500/10"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <CalendarClock
                          className={`mt-0.5 h-5 w-5 shrink-0 ${
                            result.nextMaintenance.severity === "overdue"
                              ? "text-red-400"
                              : "text-amber-400"
                          }`}
                        />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-200">
                            Próximo mantenimiento recomendado
                          </p>
                          <p className="mt-0.5 text-sm text-slate-300">
                            <strong>
                              {result.nextMaintenance.serviceType}
                            </strong>{" "}
                            · Fecha estimada:{" "}
                            <span className="font-mono font-semibold text-white">
                              {formatShortDate(result.nextMaintenance.dueDate)}
                            </span>
                          </p>
                        </div>
                      </div>
                      <a
                        href={generalInstagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[38px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
                      >
                        Coordinar turno
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Chronological Repair History */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                      Historial de reparaciones y servicios
                    </h4>
                    <span className="text-xs text-slate-500">
                      Del más reciente al más antiguo
                    </span>
                  </div>

                  {result.repairs && result.repairs.length > 0 ? (
                    <div className="space-y-3">
                      {result.repairs.map((repair) => (
                        <article
                          key={repair.id}
                          className="rounded-2xl border border-slate-800/90 bg-[#0F1627]/85 p-4 transition hover:border-slate-700 sm:p-5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300">
                              <Wrench className="h-3.5 w-3.5" />
                              {repair.serviceType}
                            </span>

                            <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
                              <span>{formatShortDate(repair.serviceDate)}</span>
                              <span className="text-slate-600">•</span>
                              <span className="font-semibold text-slate-200">
                                {formatMileage(repair.mileageAtService)}
                              </span>
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-relaxed text-slate-200">
                            {repair.description}
                          </p>

                          {repair.reminderDueDate && (
                            <p className="mt-3 border-t border-slate-800/80 pt-2.5 text-[11px] text-slate-400">
                              Próximo control sugerido:{" "}
                              <span className="font-mono font-semibold text-slate-200">
                                {formatShortDate(repair.reminderDueDate)}
                              </span>
                            </p>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 p-8 text-center">
                      <p className="text-sm font-medium text-slate-300">
                        Este vehículo está registrado, pero todavía no tiene
                        servicios cargados.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Plate Not Found State */
              <div className="rounded-2xl border border-slate-800 bg-[#0F1627] p-7 text-center shadow-xl sm:p-10">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-amber-400">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">
                  No encontramos registros para la patente{" "}
                  <span className="font-mono text-amber-300">
                    {result.searchedPlate || plateInput}
                  </span>
                </h3>
                <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-400">
                  Verificá que esté bien escrita. Si todavía no atendiste tu
                  auto en GallardoPerformance, podés escribirnos para coordinar
                  tu primer service y empezar tu historial digital.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleResetLookup}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 cursor-pointer"
                  >
                    Probar otra patente
                  </button>
                  <a
                    href={generalInstagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Contactar a GallardoPerformance
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Services Section */}
      <section id="servicios" className="scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
              Qué hacemos
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Servicios especializados con criterio técnico y transparencia
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Trabajamos todas las marcas con seguimiento real de cada
              intervención, presupuestos detallados y aviso oportuno para tu
              próximo mantenimiento.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.title}
                  className="rounded-2xl border border-slate-800/90 bg-[#0D1322] p-6 transition hover:border-slate-700"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950 text-amber-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-white">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {service.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Location & Contact Section */}
      <section
        id="ubicacion"
        className="scroll-mt-20 border-t border-white/[0.06] bg-[#0B101C] py-16 sm:py-20"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-8 rounded-2xl border border-slate-800 bg-[#0F1627] p-6 sm:p-10 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">
                Visitanos en Rosario
              </p>
              <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {WORKSHOP_INFO.address}
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-slate-300">
                Traé tu auto para diagnóstico, service programado o presupuesto
                sin cargo. Seguinos en Instagram para ver nuestros trabajos
                diarios en el taller.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
                >
                  <MapPin className="h-4 w-4" />
                  Abrir en Google Maps
                </a>
                <a
                  href={generalInstagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white"
                >
                  <span>{WORKSHOP_INFO.instagramHandle}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 lg:col-span-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                ¿Sos cliente del taller?
              </p>
              <p className="text-sm leading-relaxed text-slate-300">
                Guardá esta página en tu celular: con solo escribir la patente
                de tu vehículo accedés al instante a todo el historial de
                reparaciones realizado en{" "}
                <strong className="text-white">GallardoPerformance</strong>.
              </p>
              <a
                href="#historial"
                className="inline-flex items-center gap-1.5 pt-1 text-xs font-bold text-amber-400 transition hover:text-amber-300"
              >
                <span>Ir al buscador de patente</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#080B12] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <div className="flex flex-col items-center gap-1.5 sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-gallardo.png"
              alt={WORKSHOP_INFO.name}
              width={160}
              height={30}
              className="h-6 w-auto object-contain opacity-90"
            />
            <p className="text-xs text-slate-500">
              {WORKSHOP_INFO.address} · {WORKSHOP_INFO.instagramHandle}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <a href="#historial" className="transition hover:text-slate-300">
              Historial por patente
            </a>
            <span>·</span>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 font-semibold text-slate-400 transition hover:text-amber-400"
            >
              <Lock className="h-3 w-3" />
              Panel de administración
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
