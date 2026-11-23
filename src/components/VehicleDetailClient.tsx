"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BellRing,
  Calendar,
  Check,
  Edit3,
  ExternalLink,
  Gauge,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
  Wrench,
  X,
} from "lucide-react";
import { PlateBadge } from "@/components/PlateBadge";
import { StatusPill } from "@/components/StatusPill";
import { useWorkshopUI } from "@/components/WorkshopShell";
import type { Repair } from "@/db/schema";
import type { VehicleDetailData } from "@/lib/queries";
import {
  buildWhatsAppUrl,
  computeReminderDueDate,
  formatCurrency,
  formatDueBadgeLabel,
  formatMileage,
  formatShortDate,
  formatTimeAgoSpanish,
  getAlertUrgency,
  REMINDER_PRESETS,
  SERVICE_TYPES,
  type ReminderPreset,
} from "@/lib/workshop";

interface VehicleDetailClientProps {
  initialDetail: VehicleDetailData;
}

export function VehicleDetailClient({
  initialDetail,
}: VehicleDetailClientProps) {
  const router = useRouter();
  const { openQuickEntry, openWhatsApp, showToast, refreshOverdueCount } =
    useWorkshopUI();

  const [detail, setDetail] = useState<VehicleDetailData>(initialDetail);

  // Quick inline mileage edit
  const [editingKm, setEditingKm] = useState(false);
  const [kmDraft, setKmDraft] = useState(
    String(initialDetail.vehicle.currentMileage)
  );
  const [savingKm, setSavingKm] = useState(false);

  // Edit vehicle modal
  const [editVehicleOpen, setEditVehicleOpen] = useState(false);
  const [vPlate, setVPlate] = useState("");
  const [vBrand, setVBrand] = useState("");
  const [vModel, setVModel] = useState("");
  const [vYear, setVYear] = useState("");
  const [vEngine, setVEngine] = useState("");
  const [vKm, setVKm] = useState("");
  const [vOwnerName, setVOwnerName] = useState("");
  const [vOwnerPhone, setVOwnerPhone] = useState("");
  const [vNotes, setVNotes] = useState("");
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  // Edit repair modal
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null);
  const [rDate, setRDate] = useState("");
  const [rKm, setRKm] = useState("");
  const [rType, setRType] = useState("");
  const [rDesc, setRDesc] = useState("");
  const [rCost, setRCost] = useState("");
  const [rPartsCost, setRPartsCost] = useState("");
  const [rNotes, setRNotes] = useState("");
  const [rPreset, setRPreset] = useState<ReminderPreset>("none");
  const [rCustomDate, setRCustomDate] = useState("");
  const [savingRepair, setSavingRepair] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);

  const reloadDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/vehicles/${detail.vehicle.id}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const fresh: VehicleDetailData = await res.json();
        setDetail(fresh);
        setKmDraft(String(fresh.vehicle.currentMileage));
      }
    } catch {
      // Ignore transient network errors
    }
  }, [detail.vehicle.id]);

  useEffect(() => {
    const handler = () => reloadDetail();
    window.addEventListener("gallardo:data-changed", handler);
    return () => window.removeEventListener("gallardo:data-changed", handler);
  }, [reloadDetail]);

  const { vehicle, repairs, nextAlert, totalSpent } = detail;

  async function handleSaveMileage(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(kmDraft);
    if (!Number.isFinite(parsed) || parsed < 0) return;

    setSavingKm(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentMileage: Math.round(parsed) }),
      });
      if (res.ok) {
        setEditingKm(false);
        showToast("Kilometraje actualizado.");
        await reloadDetail();
      }
    } finally {
      setSavingKm(false);
    }
  }

  function openEditVehicleModal() {
    setVPlate(vehicle.licensePlate);
    setVBrand(vehicle.brand);
    setVModel(vehicle.model);
    setVYear(String(vehicle.year));
    setVEngine(vehicle.engine ?? "");
    setVKm(String(vehicle.currentMileage));
    setVOwnerName(vehicle.ownerName);
    setVOwnerPhone(vehicle.ownerPhone);
    setVNotes(vehicle.notes ?? "");
    setVehicleError(null);
    setEditVehicleOpen(true);
  }

  async function handleSaveVehicle(e: React.FormEvent) {
    e.preventDefault();
    setSavingVehicle(true);
    setVehicleError(null);
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licensePlate: vPlate,
          brand: vBrand,
          model: vModel,
          year: Number(vYear),
          engine: vEngine || null,
          currentMileage: Number(vKm || 0),
          ownerName: vOwnerName,
          ownerPhone: vOwnerPhone,
          notes: vNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo actualizar el vehículo.");
      }
      setEditVehicleOpen(false);
      showToast("Datos del vehículo actualizados.");
      await reloadDetail();
      router.refresh();
    } catch (err) {
      setVehicleError(
        err instanceof Error ? err.message : "Error al actualizar."
      );
    } finally {
      setSavingVehicle(false);
    }
  }

  async function handleDeleteVehicle() {
    const confirmed = window.confirm(
      `¿Eliminar ${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate}) y todo su historial de reparaciones? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    const res = await fetch(`/api/vehicles/${vehicle.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast("Vehículo eliminado.");
      refreshOverdueCount();
      router.push("/vehiculos");
      router.refresh();
    }
  }

  function openEditRepairModal(r: Repair) {
    setEditingRepair(r);
    setRDate(r.serviceDate);
    setRKm(String(r.mileageAtService));
    setRType(r.serviceType);
    setRDesc(r.description);
    setRCost(r.cost != null ? String(r.cost) : "");
    setRPartsCost(r.partsCost != null ? String(r.partsCost) : "");
    setRNotes(r.mechanicNotes ?? "");
    const preset = (r.reminderPreset || "none") as ReminderPreset;
    setRPreset(preset);
    setRCustomDate(r.reminderDueDate ?? "");
    setRepairError(null);
  }

  async function handleSaveRepair(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRepair) return;

    if (rPreset === "custom" && !rCustomDate) {
      setRepairError("Seleccioná una fecha personalizada para el recordatorio.");
      return;
    }

    setSavingRepair(true);
    setRepairError(null);
    try {
      const res = await fetch(`/api/repairs/${editingRepair.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceDate: rDate,
          mileageAtService: Number(rKm || 0),
          serviceType: rType,
          description: rDesc,
          cost: rCost.trim() === "" ? null : Number(rCost),
          partsCost: rPartsCost.trim() === "" ? null : Number(rPartsCost),
          mechanicNotes: rNotes.trim() || null,
          reminderPreset: rPreset,
          customReminderDate: rPreset === "custom" ? rCustomDate : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo actualizar la reparación.");
      }
      setEditingRepair(null);
      showToast("Reparación actualizada.");
      await reloadDetail();
      refreshOverdueCount();
    } catch (err) {
      setRepairError(
        err instanceof Error ? err.message : "Error al actualizar."
      );
    } finally {
      setSavingRepair(false);
    }
  }

  async function handleDeleteRepair(repair: Repair) {
    const confirmed = window.confirm(
      `¿Eliminar la reparación "${repair.serviceType}" del ${formatShortDate(
        repair.serviceDate
      )}?`
    );
    if (!confirmed) return;

    const res = await fetch(`/api/repairs/${repair.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast("Reparación eliminada.");
      await reloadDetail();
      refreshOverdueCount();
    }
  }

  const directWaUrl = buildWhatsAppUrl(
    vehicle.ownerPhone,
    `Hola ${vehicle.ownerName.split(" ")[0]}, te escribimos desde Gallardo Performance por tu ${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate}).`
  );

  const editRepairDuePreview = editingRepair
    ? computeReminderDueDate(rDate, rPreset, rCustomDate)
    : null;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb + Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/vehiculos"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Vehículos
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openEditVehicleModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Editar ficha
          </button>
          <button
            type="button"
            onClick={handleDeleteVehicle}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/8 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/15 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </button>
        </div>
      </div>

      {/* Vehicle & Owner Header Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Vehicle Card */}
        <section className="gp-card rounded-2xl p-5 sm:p-6 lg:col-span-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-3">
                <PlateBadge plate={vehicle.licensePlate} size="lg" />
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
                    {vehicle.brand} {vehicle.model}
                  </h1>
                  <p className="font-mono text-xs text-slate-400 tabular-nums">
                    Año {vehicle.year}
                    {vehicle.engine ? ` · Motor ${vehicle.engine}` : ""} ·{" "}
                    {repairs.length}{" "}
                    {repairs.length === 1
                      ? "reparación registrada"
                      : "reparaciones registradas"}
                  </p>
                </div>
              </div>

              {vehicle.notes && (
                <p className="rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-xs leading-relaxed text-slate-300">
                  {vehicle.notes}
                </p>
              )}
            </div>
          </div>

          {/* Metrics Row inside Vehicle Card */}
          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-800/80 pt-5 sm:grid-cols-3">
            {/* Inline editable mileage */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                  <Gauge className="h-3.5 w-3.5 text-amber-400" />
                  Kilometraje actual
                </span>
                {!editingKm && (
                  <button
                    type="button"
                    onClick={() => setEditingKm(true)}
                    className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-amber-400 cursor-pointer"
                    title="Actualizar kilometraje"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>

              {editingKm ? (
                <form
                  onSubmit={handleSaveMileage}
                  className="mt-2 flex items-center gap-1.5"
                >
                  <input
                    type="number"
                    min={0}
                    autoFocus
                    value={kmDraft}
                    onChange={(e) => setKmDraft(e.target.value)}
                    className="w-full rounded-lg border border-amber-500/60 bg-slate-900 px-2.5 py-1 font-mono text-sm font-semibold text-white tabular-nums outline-none"
                  />
                  <button
                    type="submit"
                    disabled={savingKm}
                    className="rounded-lg bg-amber-500 p-1.5 text-slate-950 hover:bg-amber-400 cursor-pointer"
                    aria-label="Guardar kilometraje"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingKm(false);
                      setKmDraft(String(vehicle.currentMileage));
                    }}
                    className="rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:text-white cursor-pointer"
                    aria-label="Cancelar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </form>
              ) : (
                <p className="mt-1.5 font-mono text-lg font-bold text-slate-100 tabular-nums">
                  {formatMileage(vehicle.currentMileage)}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Última visita
              </span>
              <p className="mt-1.5 font-mono text-lg font-bold text-slate-100 tabular-nums">
                {repairs[0] ? formatShortDate(repairs[0].serviceDate) : "—"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <Wrench className="h-3.5 w-3.5 text-slate-400" />
                Total invertido
              </span>
              <p className="mt-1.5 font-mono text-lg font-bold text-slate-100 tabular-nums">
                {formatCurrency(totalSpent)}
              </p>
            </div>
          </div>
        </section>

        {/* Owner Contact Card */}
        <section className="gp-card flex flex-col justify-between gap-5 rounded-2xl p-5 sm:p-6 lg:col-span-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <User className="h-3.5 w-3.5 text-amber-400" />
              Dueño del vehículo
            </div>

            <div>
              <p className="text-lg font-bold text-slate-50">
                {vehicle.ownerName}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-sm text-emerald-400 tabular-nums">
                <Phone className="h-3.5 w-3.5" />
                {vehicle.ownerPhone}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <a
              href={directWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/15 transition hover:bg-emerald-400"
            >
              <MessageCircle className="h-4 w-4 stroke-[2.3]" />
              <span>Escribir por WhatsApp</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </a>

            <button
              type="button"
              id="detail-add-repair-btn"
              onClick={() =>
                openQuickEntry({ mode: "existing", vehicleId: vehicle.id })
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Nueva reparación</span>
            </button>
          </div>
        </section>
      </div>

      {/* Next Scheduled Alert Banner */}
      {nextAlert ? (
        <section
          className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
            nextAlert.urgency === "overdue"
              ? "border-red-500/35 bg-red-500/8"
              : nextAlert.urgency === "upcoming"
              ? "border-amber-500/35 bg-amber-500/8"
              : nextAlert.urgency === "notified"
              ? "border-emerald-500/30 bg-emerald-500/8"
              : "border-slate-800 bg-slate-900/70"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                nextAlert.urgency === "overdue"
                  ? "border-red-500/30 bg-red-500/15 text-red-400"
                  : nextAlert.urgency === "upcoming"
                  ? "border-amber-500/30 bg-amber-500/15 text-amber-400"
                  : "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
              }`}
            >
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Próxima alerta programada
                </p>
                <StatusPill
                  urgency={nextAlert.urgency}
                  label={formatDueBadgeLabel(
                    nextAlert.reminderDueDate,
                    nextAlert.reminderStatus,
                    nextAlert.notifiedAt
                  )}
                  size="sm"
                />
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-50">
                {nextAlert.serviceType} · Fecha objetivo:{" "}
                <span className="font-mono tabular-nums">
                  {formatShortDate(nextAlert.reminderDueDate)}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Último servicio realizado el{" "}
                <span className="font-mono tabular-nums">
                  {formatShortDate(nextAlert.serviceDate)}
                </span>{" "}
                ({formatTimeAgoSpanish(nextAlert.serviceDate)}).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openWhatsApp(nextAlert)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/15 transition hover:bg-emerald-400 cursor-pointer"
          >
            <MessageCircle className="h-4 w-4 stroke-[2.3]" />
            Enviar recordatorio WhatsApp
          </button>
        </section>
      ) : (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <BellRing className="h-4 w-4 text-slate-500" />
            <p className="text-xs text-slate-400">
              Este vehículo no tiene alertas de mantenimiento pendientes. Podés
              programar una al cargar la próxima reparación.
            </p>
          </div>
        </section>
      )}

      {/* Chronological Repair Timeline */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">
            Historial de Reparaciones
          </h2>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {repairs.length} {repairs.length === 1 ? "registro" : "registros"}
          </span>
        </div>

        {repairs.length === 0 ? (
          <div className="gp-card rounded-2xl px-6 py-14 text-center">
            <Wrench className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-slate-200">
              Todavía no hay reparaciones cargadas
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Registrá el primer trabajo para comenzar el historial de este auto.
            </p>
            <button
              type="button"
              onClick={() =>
                openQuickEntry({ mode: "existing", vehicleId: vehicle.id })
              }
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Cargar primera reparación
            </button>
          </div>
        ) : (
          <div className="relative space-y-4 pl-6 before:absolute before:bottom-4 before:left-[9px] before:top-4 before:w-px before:bg-slate-800">
            {repairs.map((r) => {
              const urgency = getAlertUrgency(
                r.reminderDueDate,
                r.reminderStatus
              );
              const hasActiveReminder =
                Boolean(r.reminderDueDate) &&
                r.reminderStatus !== "none" &&
                r.reminderStatus !== "completed";

              return (
                <article
                  key={r.id}
                  className="gp-card relative rounded-2xl p-5"
                >
                  {/* Timeline Dot */}
                  <span
                    className={`absolute -left-[22px] top-6 h-3 w-3 rounded-full border-2 border-[#0B0F19] ${
                      urgency === "overdue"
                        ? "bg-red-500"
                        : urgency === "upcoming"
                        ? "bg-amber-400"
                        : urgency === "notified"
                        ? "bg-emerald-400"
                        : "bg-slate-500"
                    }`}
                    aria-hidden="true"
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                          {r.serviceType}
                        </span>
                        <span className="font-mono text-xs text-slate-400 tabular-nums">
                          {formatShortDate(r.serviceDate)}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="font-mono text-xs text-slate-300 tabular-nums">
                          {formatMileage(r.mileageAtService)}
                        </span>
                      </div>

                      <p className="pt-1.5 text-sm leading-relaxed text-slate-100">
                        {r.description}
                      </p>

                      {r.mechanicNotes && (
                        <p className="pt-1 text-xs italic text-slate-400">
                          Nota del mecánico: {r.mechanicNotes}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <div className="text-left sm:text-right font-mono tabular-nums">
                        <p className="text-base font-bold text-slate-100">
                          {formatCurrency(r.cost)}
                        </p>
                        {(r.cost != null || r.partsCost != null) && (
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            Costo: {formatCurrency(r.partsCost ?? 0)} ·{" "}
                            <span
                              className={
                                (r.cost ?? 0) - (r.partsCost ?? 0) >= 0
                                  ? "font-semibold text-emerald-400"
                                  : "font-semibold text-red-400"
                              }
                            >
                              Gan:{" "}
                              {formatCurrency(
                                (r.cost ?? 0) - (r.partsCost ?? 0)
                              )}
                            </span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditRepairModal(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700/90 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white cursor-pointer"
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRepair(r)}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-800 p-1.5 text-slate-500 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
                          title="Eliminar reparación"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Reminder footer strip if configured */}
                  {r.reminderDueDate && r.reminderStatus !== "none" && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill
                          urgency={urgency}
                          label={formatDueBadgeLabel(
                            r.reminderDueDate,
                            r.reminderStatus,
                            r.notifiedAt
                          )}
                          size="sm"
                        />
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                          Recordatorio: {formatShortDate(r.reminderDueDate)}
                        </span>
                      </div>

                      {hasActiveReminder && (
                        <button
                          type="button"
                          onClick={() =>
                            openWhatsApp({
                              repairId: r.id,
                              licensePlate: vehicle.licensePlate,
                              brand: vehicle.brand,
                              model: vehicle.model,
                              ownerName: vehicle.ownerName,
                              ownerPhone: vehicle.ownerPhone,
                              serviceType: r.serviceType,
                              serviceDate: r.serviceDate,
                              reminderPreset: r.reminderPreset,
                              reminderDueDate: r.reminderDueDate,
                              reminderStatus: r.reminderStatus,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/25 cursor-pointer"
                        >
                          <MessageCircle className="h-3 w-3" />
                          Avisar por WhatsApp
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Edit Vehicle Modal */}
      {editVehicleOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditVehicleOpen(false);
          }}
        >
          <div className="gp-card w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-100">
                Editar ficha del vehículo
              </h2>
              <button
                type="button"
                onClick={() => setEditVehicleOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Patente
                  </label>
                  <input
                    type="text"
                    required
                    value={vPlate}
                    onChange={(e) => setVPlate(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm uppercase text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Marca
                  </label>
                  <input
                    type="text"
                    required
                    value={vBrand}
                    onChange={(e) => setVBrand(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Modelo
                  </label>
                  <input
                    type="text"
                    required
                    value={vModel}
                    onChange={(e) => setVModel(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Año
                  </label>
                  <input
                    type="number"
                    required
                    value={vYear}
                    onChange={(e) => setVYear(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 tabular-nums outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Motor
                  </label>
                  <input
                    type="text"
                    value={vEngine}
                    onChange={(e) => setVEngine(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Km actual
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={vKm}
                    onChange={(e) => setVKm(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 tabular-nums outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Dueño
                  </label>
                  <input
                    type="text"
                    required
                    value={vOwnerName}
                    onChange={(e) => setVOwnerName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    value={vOwnerPhone}
                    onChange={(e) => setVOwnerPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 tabular-nums outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Observaciones
                </label>
                <textarea
                  rows={2}
                  value={vNotes}
                  onChange={(e) => setVNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              {vehicleError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {vehicleError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditVehicleOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingVehicle}
                  className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
                >
                  {savingVehicle ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Repair Modal */}
      {editingRepair && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingRepair(null);
          }}
        >
          <div className="gp-card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-100">
                Editar reparación
              </h2>
              <button
                type="button"
                onClick={() => setEditingRepair(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRepair} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Fecha
                  </label>
                  <input
                    type="date"
                    required
                    value={rDate}
                    onChange={(e) => setRDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 tabular-nums outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Km en el service
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={rKm}
                    onChange={(e) => setRKm(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 tabular-nums outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Cobrado al cliente (ARS)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={rCost}
                      onChange={(e) => setRCost(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 tabular-nums outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Costo reparación / repuestos (ARS)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={rPartsCost}
                      onChange={(e) => setRPartsCost(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 tabular-nums outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                {(rCost.trim() !== "" || rPartsCost.trim() !== "") && (() => {
                  const rev = Number(rCost || 0);
                  const exp = Number(rPartsCost || 0);
                  const profit = rev - exp;
                  return (
                    <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-xs">
                      <span className="text-slate-400">Ganancia neta:</span>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          profit >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {formatCurrency(profit)}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Tipo de trabajo
                </label>
                <select
                  value={rType}
                  onChange={(e) => setRType(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                >
                  {SERVICE_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-slate-900">
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Descripción y repuestos
                </label>
                <textarea
                  rows={3}
                  required
                  value={rDesc}
                  onChange={(e) => setRDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Notas del mecánico
                </label>
                <input
                  type="text"
                  value={rNotes}
                  onChange={(e) => setRNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200">
                    Recordatorio de mantenimiento
                  </span>
                  {editRepairDuePreview && (
                    <span className="font-mono text-[11px] text-amber-400 tabular-nums">
                      Alerta: {formatShortDate(editRepairDuePreview)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {REMINDER_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setRPreset(preset.value)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                        rPreset === preset.value
                          ? "border-amber-500 bg-amber-500/15 text-amber-300"
                          : "border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {preset.shortLabel}
                    </button>
                  ))}
                </div>
                {rPreset === "custom" && (
                  <input
                    type="date"
                    required
                    value={rCustomDate}
                    onChange={(e) => setRCustomDate(e.target.value)}
                    className="w-full max-w-xs rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-sm text-slate-100 tabular-nums outline-none focus:border-amber-500"
                  />
                )}
              </div>

              {repairError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {repairError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRepair(null)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRepair}
                  className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
                >
                  {savingRepair ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
