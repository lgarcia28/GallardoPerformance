"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Plus,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
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
  matchesWorkshopQuery,
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
    return repairs.filter((r) => {
      if (serviceFilter !== "all" && r.serviceType !== serviceFilter) {
        return false;
      }
      return matchesWorkshopQuery(
        search,
        [
          r.licensePlate,
          r.brand,
          r.model,
          r.ownerName,
          r.serviceType,
          r.description,
          r.mechanicNotes,
        ],
        { plate: r.licensePlate }
      );
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
      {/* Unified Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
            Registro General
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Historial de Trabajos
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Todas las reparaciones y mantenimientos realizados en el taller.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openQuickEntry({ mode: "existing" })}
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-zinc-950 shadow-sm transition hover:bg-zinc-200 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Cargar reparación
        </button>
      </div>

      {/* Filters */}
      <div className="gp-card rounded-2xl p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por patente, cliente, repuestos o descripción..."
              className="min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-950 py-2.5 pl-10 pr-10 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-zinc-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              aria-label="Filtrar por tipo de trabajo"
              className="min-h-[42px] rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2 text-xs font-medium text-zinc-200 outline-none focus:border-zinc-500"
            >
              <option value="all" className="bg-zinc-900">
                Todos los trabajos
              </option>
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type} className="bg-zinc-900">
                  {type}
                </option>
              ))}
            </select>

            <div className="rounded-xl border border-white/[0.08] bg-zinc-950/70 px-3.5 py-2.5 font-mono text-xs tabular-nums">
              <span className="text-zinc-400">{filtered.length} trab. · </span>
              <span className="font-bold text-white">
                {formatCurrency(filteredTotals.revenue)}
              </span>
              <span className="text-zinc-500"> · Gan: </span>
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
          <ClipboardList className="mx-auto h-9 w-9 text-zinc-600" />
          <p className="mt-3 text-sm font-semibold text-zinc-100">
            No se encontraron trabajos
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Probá con otro filtro o cargá una nueva reparación.
          </p>
          {(search || serviceFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setServiceFilter("all");
              }}
              className="mt-4 inline-flex min-h-[38px] items-center rounded-xl border border-white/12 bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="gp-card overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] bg-zinc-950/50 px-4 py-2.5 text-[11px] text-zinc-400 sm:px-5">
            <span>
              Mostrando{" "}
              <strong className="font-semibold text-zinc-100">
                {filtered.length}
              </strong>{" "}
              {filtered.length === 1 ? "trabajo" : "trabajos"}
            </span>
          </div>

          <div className="divide-y divide-white/[0.06]">
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
                  className="flex flex-col gap-3 px-4 py-4 transition hover:bg-white/[0.02] sm:px-6 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="space-y-1.5 lg:max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/vehiculos/${item.vehicleId}`}
                        className="inline-flex items-center gap-2 group"
                      >
                        <BrandLogo brandName={item.brand} size="sm" />
                        <PlateBadge plate={item.licensePlate} size="sm" />
                        <span className="text-sm font-semibold text-zinc-100 transition group-hover:text-white">
                          {item.brand} {item.model}
                        </span>
                      </Link>
                      <span className="text-xs text-zinc-600">·</span>
                      <span className="text-xs text-zinc-400">
                        {item.ownerName}
                      </span>
                      <span className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[11px] font-semibold text-zinc-200">
                        {item.serviceType}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-zinc-300">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-zinc-400 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Wrench className="h-3 w-3 text-zinc-500" />
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

                  <div className="flex items-center justify-between gap-4 border-t border-white/[0.06] pt-2.5 lg:justify-end lg:border-t-0 lg:pt-0">
                    <div className="text-left lg:text-right font-mono tabular-nums">
                      <p className="text-sm font-bold text-white">
                        {formatCurrency(item.cost)}
                      </p>
                      {(item.cost != null || item.partsCost != null) && (
                        <p className="text-[11px] text-zinc-400">
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
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-white/12 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-white/25 hover:bg-zinc-900"
                    >
                      Ver ficha
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
