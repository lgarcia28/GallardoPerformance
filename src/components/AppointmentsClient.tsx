"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  ListChecks,
  MessageCircle,
  Pencil,
  Phone,
  PlayCircle,
  Plus,
  Search,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { PlateBadge } from "@/components/PlateBadge";
import { useWorkshopUI } from "@/components/WorkshopShell";
import type { Appointment } from "@/db/schema";
import type { AppointmentsData, VehicleSummary } from "@/lib/queries";
import {
  APPOINTMENT_STATUS_META,
  buildAppointmentWhatsAppMessage,
  buildWhatsAppUrl,
  formatDateISO,
  formatLongDateSpanish,
  formatShortDate,
  getTodayISO,
  parseLocalDate,
  SERVICE_TYPES,
  WORKSHOP_INFO,
  WORKSHOP_TIME_SLOTS,
  type AppointmentStatus,
} from "@/lib/workshop";

const WEEKDAY_HEADERS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface CalendarCell {
  isoDate: string;
  dayNumber: number;
  inCurrentMonth: boolean;
}

function buildMonthGrid(year: number, monthIndex: number): CalendarCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  // Convert JS Sunday=0..Saturday=6 to Monday=0..Sunday=6
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, monthIndex, 1 - startOffset);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i
    );
    cells.push({
      isoDate: formatDateISO(d),
      dayNumber: d.getDate(),
      inCurrentMonth: d.getMonth() === monthIndex,
    });
  }
  return cells;
}

function formatMonthTitle(year: number, monthIndex: number): string {
  const d = new Date(year, monthIndex, 1);
  const text = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(d);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

interface AppointmentsClientProps {
  initialData: AppointmentsData;
  initialVehicles: VehicleSummary[];
}

export function AppointmentsClient({
  initialData,
  initialVehicles,
}: AppointmentsClientProps) {
  const { openQuickEntry, showToast, refreshOverdueCount } = useWorkshopUI();

  const todayIso = getTodayISO();
  const todayDate = parseLocalDate(todayIso);

  const [data, setData] = useState<AppointmentsData>(initialData);
  const [vehicles, setVehicles] = useState<VehicleSummary[]>(initialVehicles);
  const [viewMode, setViewMode] = useState<"calendar" | "upcoming">("calendar");
  const [statusFilter, setStatusFilter] = useState<
    "active" | "in_progress" | "completed" | "all"
  >("active");

  const [viewYear, setViewYear] = useState(() => todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => todayDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(() => todayIso);

  // Modal state (create or edit appointment)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);
  const [clientMode, setClientMode] = useState<"registered" | "walkin">(
    "registered"
  );
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null
  );

  const [apptDate, setApptDate] = useState(todayIso);
  const [apptTime, setApptTime] = useState("09:00");
  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleLabel, setVehicleLabel] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState<string>(
    WORKSHOP_INFO.defaultPhonePrefix
  );
  const [serviceType, setServiceType] = useState<string>(SERVICE_TYPES[0]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<AppointmentStatus>("scheduled");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const reloadData = useCallback(async () => {
    try {
      const [apptRes, vehRes] = await Promise.all([
        fetch("/api/appointments", { cache: "no-store" }),
        fetch("/api/vehicles", { cache: "no-store" }),
      ]);
      if (apptRes.ok) {
        const fresh: AppointmentsData = await apptRes.json();
        setData(fresh);
      }
      if (vehRes.ok) {
        const vData = await vehRes.json();
        setVehicles(vData.vehicles ?? []);
      }
    } catch {
      // Keep current state on transient network error
    }
  }, []);

  useEffect(() => {
    const handler = () => reloadData();
    window.addEventListener("gallardo:data-changed", handler);
    return () => window.removeEventListener("gallardo:data-changed", handler);
  }, [reloadData]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  const monthCells = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of data.appointments) {
      const list = map.get(a.appointmentDate) ?? [];
      list.push(a);
      map.set(a.appointmentDate, list);
    }
    return map;
  }, [data.appointments]);

  const selectedDayAppointments = useMemo(
    () => appointmentsByDate.get(selectedDate) ?? [],
    [appointmentsByDate, selectedDate]
  );

  const upcomingList = useMemo(() => {
    return data.appointments.filter((a) => {
      if (statusFilter === "in_progress") return a.status === "in_progress";
      if (statusFilter === "completed") return a.status === "completed";
      if (statusFilter === "active") {
        return (
          (a.status === "scheduled" || a.status === "in_progress") &&
          a.appointmentDate >= todayIso
        );
      }
      return true;
    });
  }, [data.appointments, statusFilter, todayIso]);

  const filteredVehicles = useMemo(() => {
    const q = vehicleQuery.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) =>
      `${v.licensePlate} ${v.brand} ${v.model} ${v.ownerName} ${v.ownerPhone}`
        .toLowerCase()
        .includes(q)
    );
  }, [vehicles, vehicleQuery]);

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function goToToday() {
    const d = parseLocalDate(todayIso);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedDate(todayIso);
    setViewMode("calendar");
  }

  function openCreateModal(dateToUse?: string) {
    setEditingAppointment(null);
    setClientMode(vehicles.length > 0 ? "registered" : "walkin");
    setVehicleQuery("");
    setSelectedVehicleId(null);
    setApptDate(dateToUse ?? selectedDate);
    setApptTime("09:00");
    setLicensePlate("");
    setVehicleLabel("");
    setOwnerName("");
    setOwnerPhone(WORKSHOP_INFO.defaultPhonePrefix);
    setServiceType(SERVICE_TYPES[0]);
    setNotes("");
    setStatus("scheduled");
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(appt: Appointment) {
    setEditingAppointment(appt);
    setClientMode(appt.vehicleId ? "registered" : "walkin");
    setVehicleQuery("");
    setSelectedVehicleId(appt.vehicleId ?? null);
    setApptDate(appt.appointmentDate);
    setApptTime(appt.appointmentTime);
    setLicensePlate(appt.licensePlate);
    setVehicleLabel(appt.vehicleLabel);
    setOwnerName(appt.ownerName);
    setOwnerPhone(appt.ownerPhone);
    setServiceType(appt.serviceType);
    setNotes(appt.notes ?? "");
    setStatus((appt.status as AppointmentStatus) || "scheduled");
    setFormError(null);
    setModalOpen(true);
  }

  function handlePickRegisteredVehicle(v: VehicleSummary) {
    setSelectedVehicleId(v.id);
    setLicensePlate(v.licensePlate);
    setVehicleLabel(`${v.brand} ${v.model} ${v.year}`);
    setOwnerName(v.ownerName);
    setOwnerPhone(v.ownerPhone);
    setFormError(null);
  }

  async function handleSaveAppointment(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (
      !licensePlate.trim() ||
      !vehicleLabel.trim() ||
      !ownerName.trim() ||
      !ownerPhone.trim()
    ) {
      setFormError(
        "Completá patente, vehículo, nombre del dueño y WhatsApp para agendar."
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vehicleId: clientMode === "registered" ? selectedVehicleId : null,
        appointmentDate: apptDate,
        appointmentTime: apptTime,
        licensePlate: licensePlate.trim(),
        vehicleLabel: vehicleLabel.trim(),
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        serviceType,
        notes: notes.trim() || null,
        status,
      };

      const url = editingAppointment
        ? `/api/appointments/${editingAppointment.id}`
        : "/api/appointments";
      const method = editingAppointment ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo guardar el turno.");
      }

      // Jump calendar view to the booked date so user immediately sees it
      const booked = parseLocalDate(apptDate);
      setViewYear(booked.getFullYear());
      setViewMonth(booked.getMonth());
      setSelectedDate(apptDate);

      setModalOpen(false);
      showToast(
        editingAppointment
          ? "Turno actualizado correctamente."
          : "Turno agendado correctamente."
      );
      await reloadData();
      refreshOverdueCount();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(
    appt: Appointment,
    nextStatus: AppointmentStatus,
    openRepairAfter = false
  ) {
    setUpdatingId(appt.id);
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        const label = APPOINTMENT_STATUS_META[nextStatus].label;
        showToast(`Turno marcado como "${label}".`);
        await reloadData();
        refreshOverdueCount();

        if (openRepairAfter) {
          if (appt.vehicleId) {
            openQuickEntry({ mode: "existing", vehicleId: appt.vehicleId });
          } else {
            openQuickEntry({ mode: "new" });
          }
        }
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteAppointment(appt: Appointment) {
    const ok = window.confirm(
      `¿Eliminar el turno de ${appt.ownerName} (${appt.licensePlate}) del ${formatShortDate(
        appt.appointmentDate
      )} a las ${appt.appointmentTime}?`
    );
    if (!ok) return;

    setUpdatingId(appt.id);
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Turno eliminado.");
        await reloadData();
        refreshOverdueCount();
      }
    } finally {
      setUpdatingId(null);
    }
  }

  function renderAppointmentCard(appt: Appointment, showDate = false) {
    const statusKey = (
      appt.status in APPOINTMENT_STATUS_META ? appt.status : "scheduled"
    ) as AppointmentStatus;
    const statusMeta = APPOINTMENT_STATUS_META[statusKey];

    const waMessage = buildAppointmentWhatsAppMessage({
      ownerName: appt.ownerName,
      appointmentDate: appt.appointmentDate,
      appointmentTime: appt.appointmentTime,
      vehicleLabel: appt.vehicleLabel,
      licensePlate: appt.licensePlate,
      serviceType: appt.serviceType,
    });
    const waUrl = buildWhatsAppUrl(appt.ownerPhone, waMessage);

    return (
      <article
        key={appt.id}
        className={`rounded-2xl border p-4 transition ${
          statusKey === "in_progress"
            ? "border-sky-500/35 bg-sky-500/[0.06]"
            : statusKey === "cancelled"
            ? "border-slate-800/70 bg-slate-950/40 opacity-65"
            : "border-slate-800 bg-slate-950/65 hover:border-slate-700"
        }`}
      >
        {/* Top Row: Time + Plate + Status */}
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-amber-300 tabular-nums">
              <Clock className="h-3.5 w-3.5" />
              {appt.appointmentTime}
            </span>
            {showDate && (
              <span className="font-mono text-xs font-semibold text-slate-300 tabular-nums">
                {formatShortDate(appt.appointmentDate)}
              </span>
            )}
            <PlateBadge plate={appt.licensePlate} size="sm" />
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusMeta.badgeClass}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
            {statusMeta.label}
          </span>
        </div>

        {/* Middle: Vehicle + Client + Service */}
        <div className="mt-3 space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-slate-100">
              {appt.vehicleLabel}
            </p>
            <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
              {appt.serviceType}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span className="font-medium text-slate-300">{appt.ownerName}</span>
            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
              <Phone className="h-3 w-3 text-slate-500" />
              {appt.ownerPhone}
            </span>
          </div>

          {appt.notes && (
            <p className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-xs leading-relaxed text-slate-300">
              {appt.notes}
            </p>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-slate-800/70 pt-3">
          {statusKey === "scheduled" && (
            <button
              type="button"
              disabled={updatingId === appt.id}
              onClick={() => handleStatusChange(appt, "in_progress")}
              className="flex-1 sm:flex-none inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-sky-500/20 border border-sky-500/40 px-3 py-1.5 text-xs font-bold text-sky-300 transition hover:bg-sky-500/30 disabled:opacity-50 cursor-pointer"
            >
              <PlayCircle className="h-4 w-4" />
              Ingresó al taller
            </button>
          )}

          {statusKey === "in_progress" && (
            <button
              type="button"
              disabled={updatingId === appt.id}
              onClick={() => handleStatusChange(appt, "completed", true)}
              className="flex-1 sm:flex-none inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              Finalizar y cargar trabajo
            </button>
          )}

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
            <ExternalLink className="h-3 w-3 opacity-75" />
          </a>

          <div className="ml-auto flex items-center gap-1.5">
            {appt.vehicleId && (
              <Link
                href={`/vehiculos/${appt.vehicleId}`}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-slate-700/90 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
              >
                Ficha
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => openEditModal(appt)}
              title="Editar turno"
              className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-slate-800 text-slate-400 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={updatingId === appt.id}
              onClick={() => handleDeleteAppointment(appt)}
              title="Eliminar turno"
              className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-slate-800 text-slate-500 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400/90">
            Agenda del Taller
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            Calendario de Turnos
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Anotá los autos que ingresan por día y horario, y confirmá el turno por WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-950/80 p-1">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Calendario
            </button>
            <button
              type="button"
              onClick={() => setViewMode("upcoming")}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                viewMode === "upcoming"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ListChecks className="h-3.5 w-3.5" />
              Próximos
            </button>
          </div>

          <button
            type="button"
            id="appointments-new-btn"
            onClick={() => openCreateModal(selectedDate)}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-400 cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            Nuevo turno
          </button>
        </div>
      </div>

      {/* 3 Compact KPIs */}
      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={goToToday}
          className="gp-card gp-card-interactive rounded-2xl p-3.5 text-left sm:p-5 cursor-pointer"
        >
          <p className="text-[11px] font-medium text-slate-400 sm:text-xs">
            Turnos hoy
          </p>
          <p className="mt-2 font-mono text-2xl font-bold text-amber-400 tabular-nums sm:text-3xl">
            {data.summary.todayCount}
          </p>
          <p className="mt-0.5 hidden text-[11px] text-slate-500 sm:block">
            Agendados o en curso hoy
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode("upcoming");
            setStatusFilter("in_progress");
          }}
          className="gp-card gp-card-interactive rounded-2xl p-3.5 text-left sm:p-5 cursor-pointer"
        >
          <p className="text-[11px] font-medium text-slate-400 sm:text-xs">
            En taller ahora
          </p>
          <p className="mt-2 font-mono text-2xl font-bold text-sky-400 tabular-nums sm:text-3xl">
            {data.summary.inProgressCount}
          </p>
          <p className="mt-0.5 hidden text-[11px] text-slate-500 sm:block">
            Vehículos ingresados hoy
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode("upcoming");
            setStatusFilter("active");
          }}
          className="gp-card gp-card-interactive rounded-2xl p-3.5 text-left sm:p-5 cursor-pointer"
        >
          <p className="text-[11px] font-medium text-slate-400 sm:text-xs">
            Próximos 7 días
          </p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-50 tabular-nums sm:text-3xl">
            {data.summary.next7DaysCount}
          </p>
          <p className="mt-0.5 hidden text-[11px] text-slate-500 sm:block">
            Ingresos confirmados
          </p>
        </button>
      </section>

      {viewMode === "calendar" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
          {/* Interactive Monthly Calendar */}
          <section className="gp-card rounded-2xl p-4 sm:p-5 lg:col-span-7">
            {/* Month Controls */}
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
              <h2 className="text-base font-bold text-slate-100 sm:text-lg">
                {formatMonthTitle(viewYear, viewMonth)}
              </h2>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={goToToday}
                  className="min-h-[36px] rounded-lg border border-slate-700/90 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={goPrevMonth}
                  aria-label="Mes anterior"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/70 text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goNextMonth}
                  aria-label="Mes siguiente"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/70 text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Weekday labels */}
            <div className="mt-3 grid grid-cols-7 gap-1 text-center">
              {WEEKDAY_HEADERS.map((day) => (
                <div
                  key={day}
                  className="py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 42 Day Grid */}
            <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-1.5">
              {monthCells.map((cell) => {
                const dayAppts = (appointmentsByDate.get(cell.isoDate) ?? []).filter(
                  (a) => a.status !== "cancelled"
                );
                const isToday = cell.isoDate === todayIso;
                const isSelected = cell.isoDate === selectedDate;

                return (
                  <button
                    key={cell.isoDate}
                    type="button"
                    onClick={() => setSelectedDate(cell.isoDate)}
                    className={`relative flex min-h-[54px] sm:min-h-[72px] flex-col items-center justify-between rounded-xl border p-1.5 sm:p-2 text-left transition cursor-pointer ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/14 shadow-sm"
                        : isToday
                        ? "border-sky-500/45 bg-sky-500/8 hover:border-sky-400/60"
                        : cell.inCurrentMonth
                        ? "border-slate-800/80 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-900/70"
                        : "border-transparent bg-slate-950/20 opacity-40 hover:opacity-70"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span
                        className={`font-mono text-xs font-bold tabular-nums sm:text-sm ${
                          isSelected
                            ? "text-amber-300"
                            : isToday
                            ? "text-sky-300"
                            : "text-slate-200"
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {dayAppts.length > 0 && (
                        <span className="hidden sm:inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-slate-800 px-1 font-mono text-[10px] font-bold text-slate-200 tabular-nums">
                          {dayAppts.length}
                        </span>
                      )}
                    </div>

                    {/* Status Dots */}
                    <div className="flex flex-wrap items-center justify-center gap-1 pt-1">
                      {dayAppts.slice(0, 4).map((a) => {
                        const s = (
                          a.status in APPOINTMENT_STATUS_META
                            ? a.status
                            : "scheduled"
                        ) as AppointmentStatus;
                        return (
                          <span
                            key={a.id}
                            className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${APPOINTMENT_STATUS_META[s].dotClass}`}
                          />
                        );
                      })}
                      {dayAppts.length > 4 && (
                        <span className="text-[9px] font-bold text-slate-400">
                          +
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Agendado
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                En taller
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Completado
              </span>
            </div>
          </section>

          {/* Selected Day Agenda */}
          <section className="gp-card rounded-2xl p-4 sm:p-5 lg:col-span-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                  {selectedDate === todayIso ? "Agenda de hoy" : "Día seleccionado"}
                </p>
                <h2 className="mt-0.5 text-base font-bold text-slate-50">
                  {formatLongDateSpanish(selectedDate)}
                </h2>
                <p className="mt-0.5 font-mono text-xs text-slate-400 tabular-nums">
                  {selectedDayAppointments.length}{" "}
                  {selectedDayAppointments.length === 1
                    ? "auto agendado"
                    : "autos agendados"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => openCreateModal(selectedDate)}
                className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-xl border border-amber-500/35 bg-amber-500/12 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Agendar
              </button>
            </div>

            {selectedDayAppointments.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/70 text-slate-500">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-200">
                  Sin turnos para este día
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Tocá el botón para anotar un ingreso en esta fecha.
                </p>
                <button
                  type="button"
                  onClick={() => openCreateModal(selectedDate)}
                  className="mt-4 inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Agendar turno este día
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {selectedDayAppointments.map((appt) =>
                  renderAppointmentCard(appt, false)
                )}
              </div>
            )}
          </section>
        </div>
      ) : (
        /* Upcoming / All List View */
        <section className="gp-card rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-slate-800/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-bold text-slate-100">
              Listado de turnos
            </h2>
            <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
              {(
                [
                  { key: "active", label: "Próximos activos" },
                  { key: "in_progress", label: "En taller" },
                  { key: "completed", label: "Completados" },
                  { key: "all", label: "Todos" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`min-h-[36px] shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    statusFilter === tab.key
                      ? "border-slate-600 bg-slate-800 text-white"
                      : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {upcomingList.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-slate-200">
                No hay turnos en esta vista
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Agendá un turno nuevo para empezar a organizar la semana.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
              {upcomingList.map((appt) => renderAppointmentCard(appt, true))}
            </div>
          )}
        </section>
      )}

      {/* Create / Edit Appointment Modal (Mobile Bottom Sheet + Desktop Modal) */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="appointment-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="gp-card flex max-h-[95dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-800 shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
            <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden="true">
              <span className="h-1 w-10 rounded-full bg-slate-700" />
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3.5 sm:px-6 sm:py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/12 text-amber-400">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h2
                    id="appointment-modal-title"
                    className="text-base font-semibold text-slate-100"
                  >
                    {editingAppointment ? "Editar turno" : "Agendar nuevo turno"}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Reservá día y horario de ingreso al taller
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveAppointment}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
                {/* Date & Time Slots */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-300">
                        Fecha de ingreso *
                      </label>
                      <input
                        type="date"
                        required
                        value={apptDate}
                        onChange={(e) => setApptDate(e.target.value)}
                        className="min-h-[44px] w-full rounded-xl border border-slate-700/90 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 tabular-nums outline-none focus:border-amber-500/70"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-300">
                        Horario *
                      </label>
                      <input
                        type="time"
                        required
                        value={apptTime}
                        onChange={(e) => setApptTime(e.target.value)}
                        className="min-h-[44px] w-full rounded-xl border border-slate-700/90 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 tabular-nums outline-none focus:border-amber-500/70"
                      />
                    </div>
                  </div>

                  {/* Quick Time Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {WORKSHOP_TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setApptTime(slot)}
                        className={`min-h-[34px] rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold tabular-nums transition cursor-pointer ${
                          apptTime === slot
                            ? "border-amber-500 bg-amber-500/18 text-amber-300"
                            : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Client Mode Switcher */}
                <div className="space-y-3 border-t border-slate-800/80 pt-4">
                  <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 p-1">
                    <button
                      type="button"
                      onClick={() => setClientMode("registered")}
                      className={`inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition cursor-pointer ${
                        clientMode === "registered"
                          ? "bg-amber-500 text-slate-950"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <CarFront className="h-3.5 w-3.5" />
                      Auto registrado
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClientMode("walkin");
                        setSelectedVehicleId(null);
                      }}
                      className={`inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition cursor-pointer ${
                        clientMode === "walkin"
                          ? "bg-amber-500 text-slate-950"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      Cliente nuevo / rápido
                    </button>
                  </div>

                  {clientMode === "registered" && (
                    <div className="space-y-2.5">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          type="search"
                          value={vehicleQuery}
                          onChange={(e) => setVehicleQuery(e.target.value)}
                          placeholder="Buscar patente, modelo o cliente..."
                          className="min-h-[44px] w-full rounded-xl border border-slate-700/90 bg-slate-950/90 py-2 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-amber-500/70"
                        />
                      </div>

                      <div className="grid max-h-36 grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                        {filteredVehicles.map((v) => {
                          const active = selectedVehicleId === v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handlePickRegisteredVehicle(v)}
                              className={`flex min-h-[48px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition cursor-pointer ${
                                active
                                  ? "border-amber-500/70 bg-amber-500/12"
                                  : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-slate-100">
                                  <span className="font-mono font-bold">
                                    {v.licensePlate}
                                  </span>{" "}
                                  · {v.brand} {v.model}
                                </p>
                                <p className="truncate text-[11px] text-slate-400">
                                  {v.ownerName}
                                </p>
                              </div>
                              {active && (
                                <Check className="h-4 w-4 shrink-0 text-amber-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Vehicle & Owner Inputs (auto-filled when registered vehicle picked, or typed directly) */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-300">
                        Patente *
                      </label>
                      <input
                        type="text"
                        required
                        autoCapitalize="characters"
                        value={licensePlate}
                        onChange={(e) =>
                          setLicensePlate(e.target.value.toUpperCase())
                        }
                        placeholder="AB 123 CD"
                        className="min-h-[44px] w-full rounded-xl border border-slate-700/90 bg-slate-950 px-3 py-2 font-mono text-sm font-semibold uppercase tracking-wider text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500/70"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-300">
                        Auto (Marca y Modelo) *
                      </label>
                      <input
                        type="text"
                        required
                        value={vehicleLabel}
                        onChange={(e) => setVehicleLabel(e.target.value)}
                        placeholder="Ej. Peugeot 208 2022"
                        className="min-h-[44px] w-full rounded-xl border border-slate-700/90 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500/70"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-300">
                        Nombre del dueño *
                      </label>
                      <input
                        type="text"
                        required
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Ej. Juan Pérez"
                        className="min-h-[44px] w-full rounded-xl border border-slate-700/90 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500/70"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-300">
                        WhatsApp *
                      </label>
                      <input
                        type="tel"
                        inputMode="tel"
                        required
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        placeholder="+54 9 341 555-1234"
                        className="min-h-[44px] w-full rounded-xl border border-slate-700/90 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 tabular-nums placeholder-slate-600 outline-none focus:border-amber-500/70"
                      />
                    </div>
                  </div>
                </div>

                {/* Service Type Chips */}
                <div className="space-y-2 border-t border-slate-800/80 pt-4">
                  <label className="block text-xs font-medium text-slate-300">
                    Trabajo a realizar *
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SERVICE_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setServiceType(type)}
                        className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                          serviceType === type
                            ? "border-amber-500 bg-amber-500/18 text-amber-300"
                            : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status (when editing) */}
                {editingAppointment && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-300">
                      Estado del turno
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          "scheduled",
                          "in_progress",
                          "completed",
                          "cancelled",
                        ] as AppointmentStatus[]
                      ).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStatus(st)}
                          className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                            status === st
                              ? APPOINTMENT_STATUS_META[st].badgeClass
                              : "border-slate-800 bg-slate-950/60 text-slate-400"
                          }`}
                        >
                          {APPOINTMENT_STATUS_META[st].label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Observaciones del turno (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej. Deja el auto a las 9 y retira a la tarde, revisar ruido en tren delantero..."
                    className="w-full rounded-xl border border-slate-700/90 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500/70"
                  />
                </div>

                {formError && (
                  <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
                    {formError}
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-800 bg-slate-950/90 px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-end sm:px-6 sm:py-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-[44px] rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  id="appointment-submit-btn"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-400 disabled:opacity-50 sm:min-h-[42px] sm:text-xs cursor-pointer"
                >
                  {submitting
                    ? "Guardando..."
                    : editingAppointment
                    ? "Guardar cambios"
                    : "Confirmar turno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
