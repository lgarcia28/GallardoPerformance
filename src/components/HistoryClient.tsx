"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Plus,
  Search,
  Wrench,
} from "lucide-react";
import { PlateBadge } from "@/components/PlateBadge";
import { StatusPill } from "@/components/StatusPill";
import { useWorkshopUI } from "@/components/WorkshopShell";
import type { RepairWithVehicle } from "@/lib/queries";
import {
  formatCurrency,
  formatDueBadgeLabel,
  formatMileage,
  formatShortDate,
  getAlertUrgency,
  SERVICE_TYPES,
} from "@/lib/workshop";

interface HistoryClientProps {
  initialRepairs: RepairWithVehicle[];
}

export function HistoryClient({ initialRepairs }: HistoryClientProps) {
  const { openQuickEntry } = useWorkshopUI();
  const [repairs, setRepairs] = useState<RepairWithVehicle[]>(initialRepairs);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");

  const reloadRepairs = useCallback(async () => {
    try {
      const res = await fetch("/api/repairs", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setRepairs(data.repairs ?? []);
      }
    } catch {
      // Keep current state
    }
  }, []);

  useEffect(() => {
    const handler = () => reloadRepairs();
    window.addEventListener("gallardo:data-changed", handler);
    return () => window.removeEventListener("gallardo:data-changed", handler);
  }, [reloadRepairs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return repairs.filter((r) => {
      if (serviceFilter !== "all" && r.serviceType !== serviceFilter) {
        return false;
      }
      if (!q) return true;
      return `${r.licensePlate} ${r.brand} ${r.model} ${r.ownerName} ${r.serviceType} ${r.description} ${r.mechanicNotes ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [repairs, search, serviceFilter]);

  const filteredTotals = useMemo(() => {
    let revenue = 0;
    let partsCost = 0;
    for (const item of filtered) {
      revenue += item.cost ?? 0;
      partsCost += item.partsCost ?? 0;
    }
    return {
      revenue,
      partsCost,
      profit: revenue - partsCost,
    };
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400/90">
            Registro General
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            Historial de Trabajos
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Todas las reparaciones y mantenimientos realizados en el taller.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openQuickEntry({ mode: "existing" })}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-400 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Cargar reparación
        </button>
      </div>

      {/* Filters */}
      <div className="gp-card rounded-2xl p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por patente, cliente, repuestos o descripción..."
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/90 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-amber-500/70"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              aria-label="Filtrar por tipo de trabajo"
              className="rounded-xl border border-slate-700/80 bg-slate-950 px-3.5 py-2.5 text-xs font-medium text-slate-200 outline-none focus:border-amber-500/70"
            >
              <option value="all" className="bg-slate-900">
                Todos los trabajos
              </option>
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type} className="bg-slate-900">
                  {type}
                </option>
              ))}
            </select>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2 font-mono text-xs tabular-nums">
              <span className="text-slate-400">{filtered.length} trabajos · </span>
              <span className="font-bold text-slate-100">
                {formatCurrency(filteredTotals.revenue)}
              </span>
              <span className="text-slate-500"> · Gan: </span>
              <span
                className={`font-bold ${
                  filteredTotals.profit >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {formatCurrency(filteredTotals.profit)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="gp-card rounded-2xl px-6 py-16 text-center">
          <ClipboardList className="mx-auto h-9 w-9 text-slate-600" />
          <p className="mt-3 text-sm font-semibold text-slate-200">
            No se encontraron trabajos
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Probá con otro filtro o cargá una nueva reparación.
          </p>
        </div>
      ) : (
        <div className="gp-card overflow-hidden rounded-2xl divide-y divide-slate-800/80">
          {filtered.map((item) => {
            const hasReminder =
              Boolean(item.reminderDueDate) && item.reminderStatus !== "none";
            const urgency = getAlertUrgency(
              item.reminderDueDate,
              item.reminderStatus
            );
            const profit = (item.cost ?? 0) - (item.partsCost ?? 0);

            return (
              <div
                key={item.id}
                className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-800/25 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-1.5 lg:max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      href={`/vehiculos/${item.vehicleId}`}
                      className="inline-flex items-center gap-2 group"
                    >
                      <PlateBadge plate={item.licensePlate} size="sm" />
                      <span className="text-sm font-semibold text-slate-100 transition group-hover:text-amber-400">
                        {item.brand} {item.model}
                      </span>
                    </Link>
                    <span className="text-xs text-slate-500">·</span>
                    <span className="text-xs text-slate-400">
                      {item.ownerName}
                    </span>
                    <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                      {item.serviceType}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-300">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-500 tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      {formatShortDate(item.serviceDate)}
                    </span>
                    <span>{formatMileage(item.mileageAtService)}</span>
                    {hasReminder && (
                      <StatusPill
                        urgency={urgency}
                        label={formatDueBadgeLabel(
                          item.reminderDueDate,
                          item.reminderStatus,
                          item.notifiedAt
                        )}
                        size="sm"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-slate-800/60 pt-2.5 lg:justify-end lg:border-t-0 lg:pt-0">
                  <div className="text-left lg:text-right font-mono tabular-nums">
                    <p className="text-sm font-bold text-slate-100">
                      {formatCurrency(item.cost)}
                    </p>
                    {(item.cost != null || item.partsCost != null) && (
                      <p className="text-[11px] text-slate-400">
                        Costo {formatCurrency(item.partsCost ?? 0)} ·{" "}
                        <span
                          className={
                            profit >= 0
                              ? "font-semibold text-emerald-400"
                              : "font-semibold text-red-400"
                          }
                        >
                          +{formatCurrency(profit)}
                        </span>
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/vehiculos/${item.vehicleId}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
                  >
                    Ver ficha
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
