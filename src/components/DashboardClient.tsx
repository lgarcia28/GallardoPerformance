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
} from "lucide-react";
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

  // Actionable alerts = overdue, upcoming (<=30 days), and already notified
  // Future alerts >30 days also appear under "Todas" if the user wants full visibility,
  // or let's separate clearly: "Todas" shows all active scheduled alerts sorted by urgency.
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
    const q = search.trim().toLowerCase();
    return data.alerts.filter((alert) => {
      if (filter === "overdue" && alert.urgency !== "overdue") return false;
      if (filter === "upcoming" && alert.urgency !== "upcoming") return false;
      if (filter === "notified" && alert.urgency !== "notified") return false;

      if (!q) return true;
      return `${alert.licensePlate} ${alert.brand} ${alert.model} ${alert.ownerName} ${alert.ownerPhone} ${alert.serviceType}`
        .toLowerCase()
        .includes(q);
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
      label: "Próximas (30 días)",
      count: counts.upcoming,
      accent: counts.upcoming > 0 ? "text-amber-400" : undefined,
    },
    {
      key: "notified",
      label: "Ya avisados",
      count: counts.notified,
      accent: counts.notified > 0 ? "text-emerald-400" : undefined,
    },
  ];

  return (
    <div className="space-y-8">
      {data.storageMode === "memory" && (
        <div className="flex flex-col gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-xs text-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <p className="leading-relaxed">
            <strong className="font-semibold text-amber-300">
              Modo demo temporal:
            </strong>{" "}
            para guardar los autos de forma permanente y gratuita en la nube,
            vinculá tu base <strong>Cloudflare D1</strong> (binding{" "}
            <code className="rounded bg-slate-900/90 px-1.5 py-0.5 font-mono text-[11px] text-amber-300">
              DB
            </code>
            ) en <code className="font-mono text-[11px]">wrangler.jsonc</code>.
          </p>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-400/95">
            GallardoPerformance · Humberto Primo 820, Rosario
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            Alertas y Resumen
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Mantenimiento, diagnóstico y mejoras · Controlá vencimientos y enviá avisos por WhatsApp en un clic.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => openQuickEntry({ mode: "new" })}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 cursor-pointer"
          >
            <CarFront className="h-4 w-4 text-slate-400" />
            Nuevo auto
          </button>
          <button
            type="button"
            onClick={() => openQuickEntry({ mode: "existing" })}
            id="dashboard-new-repair-btn"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-400 cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            Cargar reparación
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <section aria-label="Indicadores del taller" className="grid grid-cols-2 gap-3.5 lg:grid-cols-4 lg:gap-4">
        <Link
          href="/vehiculos"
          className="gp-card gp-card-interactive rounded-2xl p-4 sm:p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Autos registrados
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/90 text-slate-300">
              <CarFront className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-slate-50 tabular-nums">
            {data.kpis.totalVehicles}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Con ficha e historial activo
          </p>
        </Link>

        <button
          type="button"
          onClick={() => setFilter("overdue")}
          className="gp-card gp-card-interactive rounded-2xl p-4 text-left sm:p-5 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Alertas vencidas
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/12 text-red-400">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <p
            className={`mt-3 font-mono text-3xl font-bold tracking-tight tabular-nums ${
              data.kpis.overdueCount > 0 ? "text-red-400" : "text-slate-50"
            }`}
          >
            {data.kpis.overdueCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Listas para enviar WhatsApp
          </p>
        </button>

        <button
          type="button"
          onClick={() => setFilter("upcoming")}
          className="gp-card gp-card-interactive rounded-2xl p-4 text-left sm:p-5 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Próximas (30 días)
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/12 text-amber-400">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p
            className={`mt-3 font-mono text-3xl font-bold tracking-tight tabular-nums ${
              data.kpis.upcomingCount > 0 ? "text-amber-400" : "text-slate-50"
            }`}
          >
            {data.kpis.upcomingCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Vencen en los próximos 30 días
          </p>
        </button>

        <button
          type="button"
          onClick={() => setFilter("notified")}
          className="gp-card gp-card-interactive rounded-2xl p-4 text-left sm:p-5 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Mensajes este mes
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-emerald-400 tabular-nums">
            {data.kpis.notifiedThisMonthCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Clientes avisados este mes
          </p>
        </button>
      </section>

      {/* Maintenance Alerts Section */}
      <section className="gp-card overflow-hidden rounded-2xl">
        <div className="border-b border-slate-800/90 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/12 text-amber-400 border border-amber-500/20">
                <BellRing className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-50">
                  Alertas de Mantenimiento
                </h2>
                <p className="text-xs text-slate-400">
                  Cambios de aceite y controles programados ordenados por urgencia
                </p>
              </div>
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar patente, modelo o dueño..."
                aria-label="Filtrar alertas"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 py-2 pl-10 pr-3.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition focus:border-amber-500/60"
              />
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
                  className={`inline-flex min-h-[38px] shrink-0 items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                    active
                      ? "border-slate-600 bg-slate-800 text-white"
                      : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-md bg-slate-900/90 px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                      tab.accent ?? "text-slate-300"
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
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-400">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-200">
              No hay alertas en esta vista
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {search
                ? "Probá limpiando el filtro de búsqueda."
                : "Todos los vehículos de esta categoría están al día."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
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
                  className="flex flex-col gap-3.5 px-4 py-4 transition hover:bg-slate-800/25 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
                >
                  {/* Left: Vehicle + Owner + Service */}
                  <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-12 md:items-center md:gap-4">
                    {/* Vehicle */}
                    <div className="md:col-span-4">
                      <Link
                        href={`/vehiculos/${alert.vehicleId}`}
                        className="group inline-flex flex-wrap items-center gap-2.5"
                      >
                        <PlateBadge plate={alert.licensePlate} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-100 transition group-hover:text-amber-400">
                            {alert.brand} {alert.model}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500 tabular-nums">
                            {alert.year} · {formatMileage(alert.currentMileage)}
                          </p>
                        </div>
                      </Link>
                    </div>

                    {/* Owner */}
                    <div className="md:col-span-3">
                      <p className="text-sm font-medium text-slate-200">
                        {alert.ownerName}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-slate-400 tabular-nums">
                        <Phone className="h-3 w-3 text-slate-500" />
                        {alert.ownerPhone}
                      </p>
                    </div>

                    {/* Last Service */}
                    <div className="md:col-span-5">
                      <p className="text-xs font-semibold text-slate-200">
                        {alert.serviceType}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400 tabular-nums">
                        Último: {formatShortDate(alert.serviceDate)} (
                        {formatTimeAgoSpanish(alert.serviceDate)}) · Vence:{" "}
                        <span className="text-slate-300">
                          {formatShortDate(alert.reminderDueDate)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Status + WhatsApp Action */}
                  <div className="flex flex-col gap-2.5 border-t border-slate-800/60 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:justify-end lg:border-t-0 lg:pt-0">
                    <div>
                      <StatusPill urgency={alert.urgency} label={badgeLabel} />
                    </div>

                    <div className="flex items-center gap-2">
                      {isNotified ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openWhatsApp(alert)}
                            className="flex-1 sm:flex-none inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 cursor-pointer"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Reenviar
                          </button>
                          <button
                            type="button"
                            disabled={resettingId === alert.repairId}
                            onClick={() => handleResetAlert(alert)}
                            title="Volver a pendiente"
                            className="inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl border border-slate-700 p-2 text-slate-400 transition hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50 cursor-pointer"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(alert)}
                          className="flex-1 sm:flex-none inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/15 transition hover:bg-emerald-400 active:scale-[0.98] sm:min-h-[38px] cursor-pointer"
                        >
                          <MessageCircle className="h-4 w-4 stroke-[2.3]" />
                          Enviar WhatsApp
                        </button>
                      )}

                      <Link
                        href={`/vehiculos/${alert.vehicleId}`}
                        className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-slate-700/90 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white sm:min-h-[38px]"
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
            <Wrench className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Últimos trabajos registrados
            </h2>
          </div>
          <Link
            href="/historial"
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 transition hover:text-amber-300"
          >
            Ver todo el historial
            <ArrowRight className="h-3.5 w-3.5" />
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
                  <PlateBadge plate={item.licensePlate} size="sm" />
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    {formatShortDate(item.serviceDate)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    {item.serviceType}
                  </p>
                  <p className="text-xs text-slate-400">
                    {item.brand} {item.model} · {item.ownerName}
                  </p>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
                  {item.description}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 font-mono text-xs tabular-nums">
                <span className="text-slate-400">
                  {formatMileage(item.mileageAtService)}
                </span>
                <span className="font-semibold text-slate-200">
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
