"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CarFront,
  Check,
  CircleDollarSign,
  Pencil,
  Plus,
  Receipt,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { PlateBadge } from "@/components/PlateBadge";
import { useWorkshopUI } from "@/components/WorkshopShell";
import type { FinanceRepairRow, FinancesData } from "@/lib/queries";
import {
  formatCurrency,
  formatDateISO,
  formatShortDate,
} from "@/lib/workshop";

type DatePreset =
  | "this_month"
  | "last_month"
  | "last_90_days"
  | "this_year"
  | "all"
  | "custom";

function getPresetRange(preset: Exclude<DatePreset, "custom">): {
  from: string;
  to: string;
} {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (preset) {
    case "this_month": {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return { from: formatDateISO(start), to: formatDateISO(end) };
    }
    case "last_month": {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return { from: formatDateISO(start), to: formatDateISO(end) };
    }
    case "last_90_days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 90);
      return { from: formatDateISO(start), to: formatDateISO(now) };
    }
    case "this_year": {
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31);
      return { from: formatDateISO(start), to: formatDateISO(end) };
    }
    case "all":
    default:
      return { from: "", to: "" };
  }
}

interface FinancesClientProps {
  initialData: FinancesData;
  initialFrom: string;
  initialTo: string;
}

export function FinancesClient({
  initialData,
  initialFrom,
  initialTo,
}: FinancesClientProps) {
  const { openQuickEntry, showToast } = useWorkshopUI();

  const [data, setData] = useState<FinancesData>(initialData);
  const [preset, setPreset] = useState<DatePreset>("this_month");
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [loading, setLoading] = useState(false);

  // Inline quick edit for revenue & cost right inside the table
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftRevenue, setDraftRevenue] = useState("");
  const [draftPartsCost, setDraftPartsCost] = useState("");
  const [savingRow, setSavingRow] = useState(false);

  const fetchFinances = useCallback(async (from: string, to: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const qs = params.toString();
      const res = await fetch(`/api/finances${qs ? `?${qs}` : ""}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const fresh: FinancesData = await res.json();
        setData(fresh);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      fetchFinances(fromDate, toDate);
    };
    window.addEventListener("gallardo:data-changed", handler);
    return () => window.removeEventListener("gallardo:data-changed", handler);
  }, [fetchFinances, fromDate, toDate]);

  function handleSelectPreset(nextPreset: Exclude<DatePreset, "custom">) {
    const range = getPresetRange(nextPreset);
    setPreset(nextPreset);
    setFromDate(range.from);
    setToDate(range.to);
    fetchFinances(range.from, range.to);
  }

  function handleFromChange(value: string) {
    setPreset("custom");
    setFromDate(value);
    fetchFinances(value, toDate);
  }

  function handleToChange(value: string) {
    setPreset("custom");
    setToDate(value);
    fetchFinances(fromDate, value);
  }

  function startInlineEdit(row: FinanceRepairRow) {
    setEditingId(row.id);
    setDraftRevenue(row.hasCostEntered ? String(row.revenue) : "");
    setDraftPartsCost(row.hasPartsCostEntered ? String(row.partsCost) : "");
  }

  async function saveInlineEdit(repairId: number) {
    setSavingRow(true);
    try {
      const res = await fetch(`/api/repairs/${repairId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cost: draftRevenue.trim() === "" ? null : Number(draftRevenue),
          partsCost:
            draftPartsCost.trim() === "" ? null : Number(draftPartsCost),
        }),
      });
      if (res.ok) {
        setEditingId(null);
        showToast("Montos actualizados y ganancia recalculada.");
        await fetchFinances(fromDate, toDate);
      }
    } finally {
      setSavingRow(false);
    }
  }

  const maxServiceRevenue = Math.max(
    1,
    ...data.byServiceType.map((s) => s.revenue)
  );

  const presetButtons: Array<{
    key: Exclude<DatePreset, "custom">;
    label: string;
  }> = [
    { key: "this_month", label: "Este mes" },
    { key: "last_month", label: "Mes anterior" },
    { key: "last_90_days", label: "Últimos 3 meses" },
    { key: "this_year", label: "Este año" },
    { key: "all", label: "Todo" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400/90">
            Control Económico
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            Finanzas del Taller
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Autos reparados, facturación, costos de repuestos y ganancia neta por fecha.
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

      {/* Date Filter Bar */}
      <section className="gp-card rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
          {/* Quick Presets */}
          <div className="-mx-1 flex flex-nowrap items-center gap-2 overflow-x-auto px-1 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {presetButtons.map((btn) => {
              const active = preset === btn.key;
              return (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => handleSelectPreset(btn.key)}
                  className={`min-h-[38px] shrink-0 rounded-xl border px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                    active
                      ? "border-amber-500 bg-amber-500/15 text-amber-300"
                      : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Pickers */}
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
            <div className="flex min-h-[44px] flex-col justify-center rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 sm:min-h-[38px] sm:flex-row sm:items-center sm:gap-2">
              <label
                htmlFor="finances-from-date"
                className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 sm:text-[11px] sm:normal-case sm:tracking-normal"
              >
                <Calendar className="h-3 w-3 text-slate-500 sm:h-3.5 sm:w-3.5" />
                Desde
              </label>
              <input
                id="finances-from-date"
                type="date"
                value={fromDate}
                onChange={(e) => handleFromChange(e.target.value)}
                className="w-full bg-transparent font-mono text-xs text-slate-100 tabular-nums outline-none sm:w-auto"
              />
            </div>

            <div className="flex min-h-[44px] flex-col justify-center rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 sm:min-h-[38px] sm:flex-row sm:items-center sm:gap-2">
              <label
                htmlFor="finances-to-date"
                className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 sm:text-[11px] sm:normal-case sm:tracking-normal"
              >
                <Calendar className="h-3 w-3 text-slate-500 sm:h-3.5 sm:w-3.5" />
                Hasta
              </label>
              <input
                id="finances-to-date"
                type="date"
                value={toDate}
                onChange={(e) => handleToChange(e.target.value)}
                className="w-full bg-transparent font-mono text-xs text-slate-100 tabular-nums outline-none sm:w-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4 Financial KPI Cards */}
      <section
        aria-label="Resumen financiero"
        className={`grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4 transition-opacity ${
          loading ? "opacity-60" : "opacity-100"
        }`}
      >
        <div className="gp-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Autos reparados
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/90 text-slate-300">
              <CarFront className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-slate-50 tabular-nums">
            {data.summary.uniqueVehiclesCount}
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
            {data.summary.repairsCount}{" "}
            {data.summary.repairsCount === 1
              ? "trabajo realizado"
              : "trabajos realizados"}
          </p>
        </div>

        <div className="gp-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Total cobrado
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/12 text-amber-400">
              <CircleDollarSign className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold tracking-tight text-slate-50 tabular-nums sm:text-3xl">
            {formatCurrency(data.summary.totalRevenue)}
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
            Ticket promedio: {formatCurrency(data.summary.averageTicket)}
          </p>
        </div>

        <div className="gp-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Costo de reparaciones
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/12 text-red-400">
              <Receipt className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold tracking-tight text-slate-200 tabular-nums sm:text-3xl">
            {formatCurrency(data.summary.totalPartsCost)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Repuestos e insumos del período
          </p>
        </div>

        <div className="gp-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Ganancia neta
            </span>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                data.summary.totalProfit >= 0
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-red-500/15 text-red-400"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p
            className={`mt-3 font-mono text-2xl font-bold tracking-tight tabular-nums sm:text-3xl ${
              data.summary.totalProfit >= 0
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >
            {formatCurrency(data.summary.totalProfit)}
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
            {data.summary.profitMarginPct !== null
              ? `Margen neto: ${data.summary.profitMarginPct}%`
              : "Sin facturación en el período"}
          </p>
        </div>
      </section>

      {/* Breakdown by Service Type */}
      {data.byServiceType.length > 0 && (
        <section className="gp-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <Wallet className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-slate-100">
                Rentabilidad por tipo de trabajo
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">
              Cobrado vs. Ganancia neta
            </span>
          </div>

          <div className="mt-4 space-y-3.5">
            {data.byServiceType.map((group) => {
              const revenueWidth = Math.max(
                6,
                Math.round((group.revenue / maxServiceRevenue) * 100)
              );
              const profitRatio =
                group.revenue > 0
                  ? Math.max(
                      0,
                      Math.min(100, Math.round((group.profit / group.revenue) * 100))
                    )
                  : 0;

              return (
                <div key={group.serviceType} className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">
                        {group.serviceType}
                      </span>
                      <span className="rounded-md bg-slate-800/90 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 tabular-nums">
                        {group.count} {group.count === 1 ? "vez" : "veces"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                      <span className="text-slate-400">
                        Cobrado: {formatCurrency(group.revenue)}
                      </span>
                      <span className="text-slate-500">
                        Costo: {formatCurrency(group.partsCost)}
                      </span>
                      <span
                        className={`font-bold ${
                          group.profit >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        +{formatCurrency(group.profit)}
                      </span>
                    </div>
                  </div>

                  {/* Bar showing total revenue with emerald profit fill */}
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="flex h-full overflow-hidden rounded-full bg-slate-700/80 transition-all duration-300"
                      style={{ width: `${revenueWidth}%` }}
                    >
                      <div
                        className="h-full bg-emerald-500/85"
                        style={{ width: `${profitRatio}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Detailed Repairs Financial Table */}
      <section className="gp-card overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/90 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Detalle de reparaciones del período
            </h2>
            <p className="text-xs text-slate-400">
              Tocá el ícono de lápiz en cualquier fila para cargar o ajustar lo cobrado y el costo.
            </p>
          </div>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {data.repairs.length}{" "}
            {data.repairs.length === 1 ? "reparación" : "reparaciones"}
          </span>
        </div>

        {data.repairs.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Wallet className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-slate-200">
              No hay reparaciones en las fechas seleccionadas
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Probá ampliando el rango de fechas o cargá un nuevo trabajo.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/90 bg-slate-950/50 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3.5">Fecha</th>
                    <th className="px-4 py-3.5">Vehículo</th>
                    <th className="px-4 py-3.5">Trabajo</th>
                    <th className="px-4 py-3.5 text-right">Cobrado</th>
                    <th className="px-4 py-3.5 text-right">Costo</th>
                    <th className="px-4 py-3.5 text-right">Ganancia</th>
                    <th className="px-5 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/75 text-sm">
                  {data.repairs.map((row) => {
                    const isEditing = editingId === row.id;
                    const liveRev = Number(draftRevenue || 0);
                    const liveCost = Number(draftPartsCost || 0);
                    const liveProfit = liveRev - liveCost;

                    return (
                      <tr
                        key={row.id}
                        className="transition hover:bg-slate-800/25"
                      >
                        <td className="px-5 py-4 font-mono text-xs text-slate-400 tabular-nums whitespace-nowrap">
                          {formatShortDate(row.serviceDate)}
                        </td>

                        <td className="px-4 py-4">
                          <Link
                            href={`/vehiculos/${row.vehicleId}`}
                            className="group inline-flex items-center gap-2.5"
                          >
                            <PlateBadge plate={row.licensePlate} size="sm" />
                            <div>
                              <p className="text-xs font-semibold text-slate-100 transition group-hover:text-amber-400">
                                {row.brand} {row.model}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {row.ownerName}
                              </p>
                            </div>
                          </Link>
                        </td>

                        <td className="px-4 py-4 max-w-xs">
                          <p className="text-xs font-semibold text-slate-200">
                            {row.serviceType}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            {row.description}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-right font-mono text-xs font-semibold text-slate-100 tabular-nums">
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              value={draftRevenue}
                              onChange={(e) => setDraftRevenue(e.target.value)}
                              placeholder="Cobrado"
                              className="w-28 rounded-lg border border-amber-500/60 bg-slate-950 px-2.5 py-1 text-right font-mono text-xs text-white tabular-nums outline-none"
                            />
                          ) : row.hasCostEntered ? (
                            formatCurrency(row.revenue)
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right font-mono text-xs text-slate-300 tabular-nums">
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              value={draftPartsCost}
                              onChange={(e) =>
                                setDraftPartsCost(e.target.value)
                              }
                              placeholder="Costo"
                              className="w-28 rounded-lg border border-amber-500/60 bg-slate-950 px-2.5 py-1 text-right font-mono text-xs text-white tabular-nums outline-none"
                            />
                          ) : row.hasPartsCostEntered ? (
                            formatCurrency(row.partsCost)
                          ) : (
                            <span className="text-slate-600">$0</span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right font-mono text-xs font-bold tabular-nums">
                          {isEditing ? (
                            <span
                              className={
                                liveProfit >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }
                            >
                              {formatCurrency(liveProfit)}
                            </span>
                          ) : (
                            <div>
                              <span
                                className={
                                  row.profit >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400"
                                }
                              >
                                {formatCurrency(row.profit)}
                              </span>
                              {row.marginPct !== null && (
                                <p className="text-[10px] font-medium text-slate-500">
                                  {row.marginPct}% margen
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={savingRow}
                                onClick={() => saveInlineEdit(row.id)}
                                className="rounded-lg bg-emerald-500 p-1.5 text-slate-950 hover:bg-emerald-400 disabled:opacity-50 cursor-pointer"
                                title="Guardar"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:text-white cursor-pointer"
                                title="Cancelar"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => startInlineEdit(row)}
                                className="rounded-lg border border-slate-700/90 p-1.5 text-slate-400 transition hover:border-amber-500/50 hover:bg-slate-800 hover:text-amber-300 cursor-pointer"
                                title="Editar cobrado y costo"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <Link
                                href={`/vehiculos/${row.vehicleId}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
                              >
                                Ficha
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="divide-y divide-slate-800/80 md:hidden">
              {data.repairs.map((row) => {
                const isEditing = editingId === row.id;
                return (
                  <div key={row.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/vehiculos/${row.vehicleId}`}
                        className="flex items-center gap-2.5"
                      >
                        <PlateBadge plate={row.licensePlate} size="sm" />
                        <div>
                          <p className="text-xs font-semibold text-slate-100">
                            {row.brand} {row.model}
                          </p>
                          <p className="font-mono text-[11px] text-slate-400 tabular-nums">
                            {formatShortDate(row.serviceDate)} · {row.serviceType}
                          </p>
                        </div>
                      </Link>

                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => startInlineEdit(row)}
                          className="rounded-lg border border-slate-700 p-1.5 text-slate-400 cursor-pointer"
                          aria-label="Editar montos"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-slate-400">
                              Cobrado (ARS)
                            </label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={draftRevenue}
                              onChange={(e) => setDraftRevenue(e.target.value)}
                              className="min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-white tabular-nums outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-slate-400">
                              Costo (ARS)
                            </label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={draftPartsCost}
                              onChange={(e) =>
                                setDraftPartsCost(e.target.value)
                              }
                              className="min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-white tabular-nums outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="min-h-[44px] rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={savingRow}
                            onClick={() => saveInlineEdit(row.id)}
                            className="min-h-[44px] rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 cursor-pointer"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-800/80 bg-slate-950/60 p-2.5 font-mono text-xs tabular-nums">
                        <div>
                          <p className="text-[10px] text-slate-500">Cobrado</p>
                          <p className="font-semibold text-slate-100">
                            {formatCurrency(row.revenue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Costo</p>
                          <p className="text-slate-300">
                            {formatCurrency(row.partsCost)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500">Ganancia</p>
                          <p
                            className={`font-bold ${
                              row.profit >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {formatCurrency(row.profit)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
