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
} from "lucide-react";
import { PlateBadge } from "@/components/PlateBadge";
import { StatusPill } from "@/components/StatusPill";
import { useWorkshopUI } from "@/components/WorkshopShell";
import type { VehicleSummary } from "@/lib/queries";
import {
  formatDueBadgeLabel,
  formatMileage,
  formatShortDate,
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
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");

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

      if (!q) return true;
      const text =
        `${v.licensePlate} ${v.brand} ${v.model} ${v.year} ${v.ownerName} ${v.ownerPhone}`.toLowerCase();
      if (text.includes(q)) return true;
      if (qDigits.length >= 3) {
        return v.ownerPhone.replace(/\D/g, "").includes(qDigits);
      }
      return false;
    });
  }, [vehicles, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400/90">
            Directorio del Taller
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            Vehículos
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Buscá por patente, marca, modelo, dueño o número de WhatsApp.
          </p>
        </div>

        <button
          type="button"
          id="vehicles-add-new-btn"
          onClick={() => openQuickEntry({ mode: "new" })}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-400 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Registrar vehículo
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="gp-card rounded-2xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              id="vehicles-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por patente (ej. AD 482 KL), modelo, dueño o teléfono..."
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/90 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-amber-500/70"
            />
          </div>

          <div className="flex flex-wrap gap-2">
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
                  className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition cursor-pointer ${
                    active
                      ? "border-slate-600 bg-slate-800 text-white"
                      : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
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
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-400">
            <CarFront className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-200">
            No encontramos vehículos con esos criterios
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Probá con otra patente o registrá un vehículo nuevo.
          </p>
          <button
            type="button"
            onClick={() => openQuickEntry({ mode: "new" })}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Cargar auto nuevo
          </button>
        </div>
      ) : (
        <div className="gp-card overflow-hidden rounded-2xl">
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/90 bg-slate-950/50 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3.5">Vehículo</th>
                  <th className="px-4 py-3.5">Km actual</th>
                  <th className="px-4 py-3.5">Dueño / WhatsApp</th>
                  <th className="px-4 py-3.5">Último servicio</th>
                  <th className="px-4 py-3.5">Próximo vencimiento</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/75 text-sm">
                {filtered.map((v) => (
                  <tr
                    key={v.id}
                    className="transition hover:bg-slate-800/25"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/vehiculos/${v.id}`}
                        className="group flex items-center gap-3"
                      >
                        <PlateBadge plate={v.licensePlate} size="sm" />
                        <div>
                          <p className="font-semibold text-slate-100 transition group-hover:text-amber-400">
                            {v.brand} {v.model}
                          </p>
                          <p className="font-mono text-xs text-slate-500 tabular-nums">
                            {v.year}
                            {v.engine ? ` · ${v.engine}` : ""} ·{" "}
                            {v.repairCount}{" "}
                            {v.repairCount === 1 ? "trabajo" : "trabajos"}
                          </p>
                        </div>
                      </Link>
                    </td>

                    <td className="px-4 py-4 font-mono text-xs font-medium text-slate-200 tabular-nums">
                      {formatMileage(v.currentMileage)}
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-slate-200">
                        {v.ownerName}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-slate-400 tabular-nums">
                        <Phone className="h-3 w-3 text-slate-500" />
                        {v.ownerPhone}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      {v.lastServiceDate ? (
                        <div>
                          <p className="text-xs font-medium text-slate-200">
                            {v.lastServiceType}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                            {formatShortDate(v.lastServiceDate)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">
                          Sin servicios aún
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
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
                          <p className="font-mono text-[11px] text-slate-500 tabular-nums">
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

                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openQuickEntry({ mode: "existing", vehicleId: v.id })
                          }
                          className="inline-flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Reparación
                        </button>
                        <Link
                          href={`/vehiculos/${v.id}`}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
                        >
                          Ver historial
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="divide-y divide-slate-800/80 md:hidden">
            {filtered.map((v) => (
              <div key={v.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/vehiculos/${v.id}`}
                    className="flex items-center gap-2.5"
                  >
                    <PlateBadge plate={v.licensePlate} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-slate-100">
                        {v.brand} {v.model}
                      </p>
                      <p className="font-mono text-[11px] text-slate-400 tabular-nums">
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

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span>
                    {v.ownerName} ·{" "}
                    <span className="font-mono tabular-nums">
                      {v.ownerPhone}
                    </span>
                  </span>
                  {v.lastServiceDate && (
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                      Último: {formatShortDate(v.lastServiceDate)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href={`/vehiculos/${v.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 py-2 text-xs font-semibold text-slate-200"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    Ver historial ({v.repairCount})
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      openQuickEntry({ mode: "existing", vehicleId: v.id })
                    }
                    className="inline-flex items-center justify-center gap-1 rounded-xl bg-amber-500/15 border border-amber-500/30 px-3.5 py-2 text-xs font-semibold text-amber-300 cursor-pointer"
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
