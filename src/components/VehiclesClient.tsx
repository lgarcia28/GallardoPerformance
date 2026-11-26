"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CarFront,
  Phone,
  Plus,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { PlateBadge } from "@/components/PlateBadge";
import { StatusPill } from "@/components/StatusPill";
import { useWorkshopUI } from "@/components/WorkshopShell";
import type { VehicleSummary } from "@/lib/queries";
import {
  formatDueBadgeLabel,
  formatMileage,
  formatShortDate,
  matchesWorkshopQuery,
} from "@/lib/workshop";

type VehicleFilter = "all" | "overdue" | "upcoming" | "ok";

interface VehiclesClientProps {
  initialVehicles: VehicleSummary[];
}

export function VehiclesClient({ initialVehicles }: VehiclesClientProps) {
  const { openQuickEntry } = useWorkshopUI();
  const [vehicles, setVehicles] = useState<VehicleSummary[]>(initialVehicles);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VehicleFilter>("all");

  const reloadVehicles = useCallback(async () => {
    try {
      const res = await fetch("/api/vehicles", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.vehicles ?? []);
      }
    } catch {
      // Keep current list on transient error
    }
  }, []);

  useEffect(() => {
    const handler = () => reloadVehicles();
    window.addEventListener("gallardo:data-changed", handler);
    return () => window.removeEventListener("gallardo:data-changed", handler);
  }, [reloadVehicles]);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      const urgency = v.nextAlert?.urgency ?? "ok";
      if (statusFilter === "overdue" && urgency !== "overdue") return false;
      if (statusFilter === "upcoming" && urgency !== "upcoming") return false;
      if (
        statusFilter === "ok" &&
        (urgency === "overdue" || urgency === "upcoming")
      ) {
        return false;
      }

      return matchesWorkshopQuery(
        search,
        [v.licensePlate, v.brand, v.model, v.year, v.ownerName, v.ownerPhone],
        { plate: v.licensePlate, phone: v.ownerPhone }
      );
    });
  }, [vehicles, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Unified Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
            Directorio del Taller
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Vehículos
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Buscá por patente (con o sin espacios), marca, modelo, dueño o
            WhatsApp.
          </p>
        </div>

        <button
          type="button"
          id="vehicles-add-new-btn"
          onClick={() => openQuickEntry({ mode: "new" })}
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-zinc-950 shadow-sm transition hover:bg-zinc-200 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Registrar vehículo
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="gp-card rounded-2xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              id="vehicles-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por patente (ej. AD 482 KL), modelo, dueño o teléfono..."
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

          <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {(
              [
                { key: "all", label: "Todos" },
                { key: "overdue", label: "Vencidos" },
                { key: "upcoming", label: "Próximos" },
                { key: "ok", label: "Al día" },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`min-h-[38px] shrink-0 rounded-xl border px-3.5 py-2 text-xs font-medium transition cursor-pointer ${
                    active
                      ? "border-white/25 bg-white/10 text-white"
                      : "border-white/[0.08] bg-zinc-950/70 text-zinc-400 hover:border-white/15 hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="gp-card rounded-2xl px-6 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-zinc-900 text-zinc-400">
            <CarFront className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-semibold text-zinc-100">
            No encontramos vehículos con esos criterios
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Probá con otra patente o registrá un vehículo nuevo.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="inline-flex min-h-[40px] items-center rounded-xl border border-white/12 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 cursor-pointer"
              >
                Limpiar búsqueda
              </button>
            )}
            <button
              type="button"
              onClick={() => openQuickEntry({ mode: "new" })}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-zinc-200 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Cargar auto nuevo
            </button>
          </div>
        </div>
      ) : (
        <div className="gp-card overflow-hidden rounded-2xl">
          {/* Unified Count Bar */}
          <div className="flex items-center justify-between border-b border-white/[0.08] bg-zinc-950/50 px-4 py-2.5 text-[11px] text-zinc-400 sm:px-5">
            <span>
              Mostrando{" "}
              <strong className="font-semibold text-zinc-100">
                {filtered.length}
              </strong>{" "}
              {filtered.length === 1 ? "vehículo" : "vehículos"}
              {search.trim() ? ` para "${search.trim()}"` : ""}
            </span>
          </div>

          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-zinc-950/60 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  <th className="px-5 py-3">Vehículo</th>
                  <th className="px-4 py-3">Km actual</th>
                  <th className="px-4 py-3">Dueño / WhatsApp</th>
                  <th className="px-4 py-3">Último servicio</th>
                  <th className="px-4 py-3">Próximo vencimiento</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-sm">
                {filtered.map((v) => (
                  <tr key={v.id} className="transition hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/vehiculos/${v.id}`}
                        className="group flex items-center gap-3"
                      >
                        <BrandLogo brandName={v.brand} size="sm" />
                        <PlateBadge plate={v.licensePlate} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-100 transition group-hover:text-white">
                            {v.brand} {v.model}
                          </p>
                          <p className="font-mono text-xs text-zinc-400 tabular-nums">
                            {v.year}
                            {v.engine ? ` · ${v.engine}` : ""} ·{" "}
                            {v.repairCount}{" "}
                            {v.repairCount === 1 ? "trabajo" : "trabajos"}
                          </p>
                        </div>
                      </Link>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs font-medium text-zinc-200 tabular-nums">
                      {formatMileage(v.currentMileage)}
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-zinc-200">
                        {v.ownerName}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-zinc-400 tabular-nums">
                        <Phone className="h-3 w-3 text-zinc-500" />
                        {v.ownerPhone}
                      </p>
                    </td>

                    <td className="px-4 py-3.5">
                      {v.lastServiceDate ? (
                        <div>
                          <p className="text-xs font-medium text-zinc-200">
                            {v.lastServiceType}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-zinc-400 tabular-nums">
                            {formatShortDate(v.lastServiceDate)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500">
                          Sin servicios aún
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      {v.nextAlert ? (
                        <div className="space-y-1">
                          <StatusPill
                            urgency={v.nextAlert.urgency}
                            label={formatDueBadgeLabel(
                              v.nextAlert.reminderDueDate,
                              v.nextAlert.reminderStatus,
                              v.nextAlert.notifiedAt
                            )}
                            size="sm"
                          />
                          <p className="font-mono text-[11px] text-zinc-400 tabular-nums">
                            {formatShortDate(v.nextAlert.reminderDueDate)}
                          </p>
                        </div>
                      ) : (
                        <StatusPill
                          urgency="ok"
                          label="Sin alerta"
                          size="sm"
                        />
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openQuickEntry({ mode: "existing", vehicleId: v.id })
                          }
                          className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-zinc-950 transition hover:bg-zinc-200 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Reparación
                        </button>
                        <Link
                          href={`/vehiculos/${v.id}`}
                          className="inline-flex items-center gap-1 rounded-xl border border-white/12 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-white/25 hover:bg-zinc-900"
                        >
                          Ficha
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Compact List */}
          <div className="divide-y divide-white/[0.06] md:hidden">
            {filtered.map((v) => (
              <div key={v.id} className="space-y-2.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/vehiculos/${v.id}`}
                    className="flex items-center gap-2.5 min-w-0"
                  >
                    <BrandLogo brandName={v.brand} size="sm" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <PlateBadge plate={v.licensePlate} size="sm" />
                        <p className="truncate text-sm font-semibold text-white">
                          {v.brand} {v.model}
                        </p>
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-zinc-400 tabular-nums">
                        {v.year} · {formatMileage(v.currentMileage)}
                      </p>
                    </div>
                  </Link>

                  {v.nextAlert && (
                    <StatusPill
                      urgency={v.nextAlert.urgency}
                      label={formatDueBadgeLabel(
                        v.nextAlert.reminderDueDate,
                        v.nextAlert.reminderStatus,
                        v.nextAlert.notifiedAt
                      )}
                      size="sm"
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                  <span>
                    {v.ownerName} ·{" "}
                    <span className="font-mono tabular-nums">
                      {v.ownerPhone}
                    </span>
                  </span>
                  {v.lastServiceDate && (
                    <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                      Último: {formatShortDate(v.lastServiceDate)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <Link
                    href={`/vehiculos/${v.id}`}
                    className="flex-1 inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-white/12 py-1.5 text-xs font-semibold text-zinc-200"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    Ver ficha ({v.repairCount})
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      openQuickEntry({ mode: "existing", vehicleId: v.id })
                    }
                    className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-950 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Reparación
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
