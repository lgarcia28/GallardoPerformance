"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CarFront,
  CheckCircle2,
  Clock,
  MessageCircle,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { PlateBadge } from "@/components/PlateBadge";
import { StatusPill } from "@/components/StatusPill";
import { useWorkshopUI } from "@/components/WorkshopShell";
import type { AlertItem, DashboardData } from "@/lib/queries";
import {
  formatCurrency,
  formatDueBadgeLabel,
  formatMileage,
  formatShortDate,
  formatTimeAgoSpanish,
  matchesWorkshopQuery,
} from "@/lib/workshop";

type AlertFilter = "all" | "overdue" | "upcoming" | "notified";

interface DashboardClientProps {
  initialData: DashboardData;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const { openQuickEntry, openWhatsApp, showToast, refreshOverdueCount } =
    useWorkshopUI();
  const [data, setData] = useState<DashboardData>(initialData);
  const [filter, setFilter] = useState<AlertFilter>("all");
  const [search, setSearch] = useState("");
  const [resettingId, setResettingId] = useState<number | null>(null);
  const [demoNoticeDismissed, setDemoNoticeDismissed] = useState(false);

  const reloadDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (res.ok) {
        const fresh: DashboardData = await res.json();
        setData(fresh);
      }
    } catch {
      // Keep current state on network hiccup
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      reloadDashboard();
    };
    window.addEventListener("gallardo:data-changed", handler);
    return () => window.removeEventListener("gallardo:data-changed", handler);
  }, [reloadDashboard]);

  const counts = useMemo(() => {
    let overdue = 0;
    let upcoming = 0;
    let notified = 0;
    for (const a of data.alerts) {
      if (a.urgency === "overdue") overdue++;
      else if (a.urgency === "upcoming") upcoming++;
      else if (a.urgency === "notified") notified++;
    }
    return {
      all: data.alerts.length,
      overdue,
      upcoming,
      notified,
    };
  }, [data.alerts]);

  const filteredAlerts = useMemo(() => {
    return data.alerts.filter((alert) => {
      if (filter === "overdue" && alert.urgency !== "overdue") return false;
      if (filter === "upcoming" && alert.urgency !== "upcoming") return false;
      if (filter === "notified" && alert.urgency !== "notified") return false;

      return matchesWorkshopQuery(
        search,
        [
          alert.licensePlate,
          alert.brand,
          alert.model,
          alert.ownerName,
          alert.ownerPhone,
          alert.serviceType,
        ],
        { plate: alert.licensePlate, phone: alert.ownerPhone }
      );
    });
  }, [data.alerts, filter, search]);

  async function handleResetAlert(alert: AlertItem) {
    setResettingId(alert.repairId);
    try {
      const res = await fetch(`/api/alerts/${alert.repairId}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      if (res.ok) {
        showToast("Alerta devuelta a pendiente.");
        await reloadDashboard();
        refreshOverdueCount();
      }
    } finally {
      setResettingId(null);
    }
  }

  const filterTabs: Array<{
    key: AlertFilter;
    label: string;
    count: number;
    accent?: string;
  }> = [
    { key: "all", label: "Todas", count: counts.all },
    {
      key: "overdue",
      label: "Vencidas",
      count: counts.overdue,
      accent: counts.overdue > 0 ? "text-red-400" : undefined,
    },
    {
      key: "upcoming",
      label: "Próximas (30d)",
      count: counts.upcoming,
      accent: counts.upcoming > 0 ? "text-amber-400" : undefined,
    },
    {
      key: "notified",
      label: "Avisados",
      count: counts.notified,
      accent: counts.notified > 0 ? "text-emerald-400" : undefined,
    },
  ];

  return (
    <div className="space-y-7">
      {data.storageMode === "memory" && !demoNoticeDismissed && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-2.5 text-xs text-amber-200/90">
          <p className="leading-relaxed">
            <strong className="font-semibold text-amber-300">
              Modo demostración:
            </strong>{" "}
            los cambios son temporales hasta vincular la base de datos en la
            nube.
          </p>
          <button
            type="button"
            onClick={() => setDemoNoticeDismissed(true)}
            aria-label="Ocultar aviso"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-amber-300/70 transition hover:bg-amber-500/15 hover:text-amber-200 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Unified Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
            Panel del Taller
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Alertas y Resumen
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Controlá vencimientos de mantenimiento y enviá avisos por WhatsApp.
          </p>
        </div>

        <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
          <button
            type="button"
            onClick={() => openQuickEntry({ mode: "new" })}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/12 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-white/25 hover:text-white cursor-pointer"
          >
            <CarFront className="h-4 w-4 text-zinc-400" />
            Nuevo auto
          </button>
          <button
            type="button"
            onClick={() => openQuickEntry({ mode: "existing" })}
            id="dashboard-new-repair-btn"
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-zinc-950 shadow-sm transition hover:bg-zinc-200 cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            Cargar reparación
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <section
        aria-label="Indicadores del taller"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
      >
        <Link
          href="/vehiculos"
          className="gp-card gp-card-interactive rounded-2xl p-4 sm:p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              Autos registrados
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-zinc-900 text-zinc-300">
              <CarFront className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-white tabular-nums">
            {data.kpis.totalVehicles}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">
            Con ficha e historial
          </p>
        </Link>

        <button
          type="button"
          onClick={() => setFilter("overdue")}
          className="gp-card gp-card-interactive rounded-2xl p-4 text-left sm:p-5 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              Alertas vencidas
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/12 text-red-400">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <p
            className={`mt-3 font-mono text-3xl font-bold tracking-tight tabular-nums ${
              data.kpis.overdueCount > 0 ? "text-red-400" : "text-white"
            }`}
          >
            {data.kpis.overdueCount}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">
            Listas para avisar
          </p>
        </button>

        <button
          type="button"
          onClick={() => setFilter("upcoming")}
          className="gp-card gp-card-interactive rounded-2xl p-4 text-left sm:p-5 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              Próximas (30 días)
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/12 text-amber-400">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p
            className={`mt-3 font-mono text-3xl font-bold tracking-tight tabular-nums ${
              data.kpis.upcomingCount > 0 ? "text-amber-400" : "text-white"
            }`}
          >
            {data.kpis.upcomingCount}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">
            Vencen pronto
          </p>
        </button>

        <button
          type="button"
          onClick={() => setFilter("notified")}
          className="gp-card gp-card-interactive rounded-2xl p-4 text-left sm:p-5 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              Avisados este mes
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-emerald-400 tabular-nums">
            {data.kpis.notifiedThisMonthCount}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">
            Enviados por WhatsApp
          </p>
        </button>
      </section>

      {/* Maintenance Alerts Section */}
      <section className="gp-card overflow-hidden rounded-2xl">
        <div className="border-b border-white/[0.08] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-zinc-900 text-red-500">
                <BellRing className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">
                  Alertas de Mantenimiento
                </h2>
                <p className="text-xs text-zinc-400">
                  Services y controles ordenados por urgencia
                </p>
              </div>
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Patente, modelo o cliente..."
                aria-label="Filtrar alertas"
                className="min-h-[42px] w-full rounded-xl border border-white/10 bg-zinc-950 py-2 pl-10 pr-9 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-zinc-500 sm:text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="mt-4 -mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {filterTabs.map((tab) => {
              const active = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={`inline-flex min-h-[36px] shrink-0 items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                    active
                      ? "border-white/25 bg-white/10 text-white"
                      : "border-white/[0.08] bg-zinc-950/70 text-zinc-400 hover:border-white/15 hover:text-zinc-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-md bg-zinc-900 px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                      tab.accent ?? "text-zinc-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Alerts List */}
        {filteredAlerts.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-zinc-900 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-zinc-100">
              No hay alertas en esta vista
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {search
                ? "Probá limpiando el filtro de búsqueda."
                : "Todos los vehículos de esta categoría están al día."}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 inline-flex min-h-[38px] items-center rounded-xl border border-white/12 bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 cursor-pointer"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filteredAlerts.map((alert) => {
              const badgeLabel = formatDueBadgeLabel(
                alert.reminderDueDate,
                alert.reminderStatus,
                alert.notifiedAt
              );
              const isNotified = alert.reminderStatus === "notified";

              return (
                <div
                  key={alert.repairId}
                  className="flex flex-col gap-3.5 px-4 py-4 transition hover:bg-white/[0.02] sm:px-6 lg:flex-row lg:items-center lg:justify-between"
                >
                  {/* Left: Vehicle + Owner + Service */}
                  <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-12 md:items-center md:gap-4">
                    {/* Vehicle */}
                    <div className="md:col-span-4">
                      <Link
                        href={`/vehiculos/${alert.vehicleId}`}
                        className="group inline-flex flex-wrap items-center gap-2.5"
                      >
                        <BrandLogo brandName={alert.brand} size="sm" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <PlateBadge plate={alert.licensePlate} size="sm" />
                            <p className="text-sm font-semibold text-zinc-100 transition group-hover:text-white">
                              {alert.brand} {alert.model}
                            </p>
                          </div>
                          <p className="mt-0.5 font-mono text-[11px] text-zinc-400 tabular-nums">
                            {alert.year} · {formatMileage(alert.currentMileage)}
                          </p>
                        </div>
                      </Link>
                    </div>

                    {/* Owner */}
                    <div className="md:col-span-3">
                      <p className="text-sm font-medium text-zinc-200">
                        {alert.ownerName}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-zinc-400 tabular-nums">
                        <Phone className="h-3 w-3 text-zinc-500" />
                        {alert.ownerPhone}
                      </p>
                    </div>

                    {/* Last Service */}
                    <div className="md:col-span-5">
                      <p className="text-xs font-semibold text-zinc-200">
                        {alert.serviceType}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-400 tabular-nums">
                        Último: {formatShortDate(alert.serviceDate)} (
                        {formatTimeAgoSpanish(alert.serviceDate)}) · Vence:{" "}
                        <span className="text-zinc-200">
                          {formatShortDate(alert.reminderDueDate)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Status + WhatsApp Action */}
                  <div className="flex flex-col gap-2.5 border-t border-white/[0.06] pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:justify-end lg:border-t-0 lg:pt-0">
                    <div>
                      <StatusPill urgency={alert.urgency} label={badgeLabel} />
                    </div>

                    <div className="flex items-center gap-2">
                      {isNotified ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openWhatsApp(alert)}
                            className="flex-1 sm:flex-none inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 cursor-pointer"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Reenviar
                          </button>
                          <button
                            type="button"
                            disabled={resettingId === alert.repairId}
                            onClick={() => handleResetAlert(alert)}
                            title="Volver a pendiente"
                            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-white/10 p-2 text-zinc-400 transition hover:border-white/25 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50 cursor-pointer"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(alert)}
                          className="flex-1 sm:flex-none inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-zinc-950 transition hover:bg-emerald-400 active:scale-[0.98] sm:min-h-[38px] cursor-pointer"
                        >
                          <MessageCircle className="h-4 w-4 stroke-[2.3]" />
                          Enviar WhatsApp
                        </button>
                      )}

                      <Link
                        href={`/vehiculos/${alert.vehicleId}`}
                        className="inline-flex min-h-[42px] items-center justify-center gap-1 rounded-xl border border-white/12 px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:bg-zinc-900 hover:text-white sm:min-h-[38px]"
                      >
                        Ficha
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Repairs Quick Feed */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-200">
              Últimos trabajos registrados
            </h2>
          </div>
          <Link
            href="/historial"
            className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-300 transition hover:text-white"
          >
            Ver todo el historial
            <ArrowRight className="h-3.5 w-3.5 text-red-500" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.recentRepairs.map((item) => (
            <Link
              key={item.id}
              href={`/vehiculos/${item.vehicleId}`}
              className="gp-card gp-card-interactive flex flex-col justify-between gap-3 rounded-2xl p-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BrandLogo brandName={item.brand} size="sm" />
                    <PlateBadge plate={item.licensePlate} size="sm" />
                  </div>
                  <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                    {formatShortDate(item.serviceDate)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {item.serviceType}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {item.brand} {item.model} · {item.ownerName}
                  </p>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-zinc-400">
                  {item.description}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.06] pt-2.5 font-mono text-xs tabular-nums">
                <span className="text-zinc-400">
                  {formatMileage(item.mileageAtService)}
                </span>
                <span className="font-semibold text-zinc-100">
                  {formatCurrency(item.cost)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
