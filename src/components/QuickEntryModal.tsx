"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Calendar,
  CarFront,
  Check,
  Search,
  Wrench,
  X,
} from "lucide-react";
import {
  computeReminderDueDate,
  formatShortDate,
  getTodayISO,
  REMINDER_PRESETS,
  SERVICE_TYPES,
  type ReminderPreset,
} from "@/lib/workshop";

export interface SimpleVehicleOption {
  id: number;
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  currentMileage: number;
  ownerName: string;
}

export interface QuickEntryOptions {
  mode?: "existing" | "new";
  vehicleId?: number;
}

interface QuickEntryModalProps {
  open: boolean;
  options: QuickEntryOptions;
  onClose: () => void;
  onSuccess: (message: string, createdVehicleId?: number) => void;
}

export function QuickEntryModal({
  open,
  options,
  onClose,
  onSuccess,
}: QuickEntryModalProps) {
  const [mode, setMode] = useState<"existing" | "new">(() =>
    options.vehicleId ? "existing" : options.mode ?? "existing"
  );
  const [vehicles, setVehicles] = useState<SimpleVehicleOption[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    () => options.vehicleId ?? null
  );

  // New vehicle fields
  const [licensePlate, setLicensePlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [engine, setEngine] = useState("");
  const [currentMileage, setCurrentMileage] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("+54 9 11 ");
  const [vehicleNotes, setVehicleNotes] = useState("");
  const [includeInitialRepair, setIncludeInitialRepair] = useState(true);

  // Repair fields
  const [serviceDate, setServiceDate] = useState(() => getTodayISO());
  const [mileageAtService, setMileageAtService] = useState("");
  const [serviceType, setServiceType] = useState<string>(SERVICE_TYPES[0]);
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [mechanicNotes, setMechanicNotes] = useState("");
  const [reminderPreset, setReminderPreset] =
    useState<ReminderPreset>("1_year");
  const [customReminderDate, setCustomReminderDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    fetch("/api/vehicles")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const list: SimpleVehicleOption[] = (data.vehicles ?? []).map(
          (v: SimpleVehicleOption) => ({
            id: v.id,
            licensePlate: v.licensePlate,
            brand: v.brand,
            model: v.model,
            year: v.year,
            currentMileage: v.currentMileage,
            ownerName: v.ownerName,
          })
        );
        setVehicles(list);
        if (options.vehicleId) {
          const matched = list.find((v) => v.id === options.vehicleId);
          if (matched) {
            setSelectedVehicleId(matched.id);
            setMileageAtService(String(matched.currentMileage));
          }
        } else if (list.length === 0) {
          setMode("new");
        }
      })
      .catch(() => {
        // Ignore silent fetch error; user can still create a new vehicle
      })
      .finally(() => {
        if (!cancelled) setLoadingVehicles(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, options.vehicleId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const filteredVehicles = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) =>
      `${v.licensePlate} ${v.brand} ${v.model} ${v.ownerName}`
        .toLowerCase()
        .includes(q)
    );
  }, [vehicles, vehicleSearch]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId]
  );

  const previewDueDate = useMemo(
    () => computeReminderDueDate(serviceDate, reminderPreset, customReminderDate),
    [serviceDate, reminderPreset, customReminderDate]
  );

  function handleServiceTypeChange(nextType: string) {
    setServiceType(nextType);
    if (nextType === "Cambio de aceite y filtros") {
      setReminderPreset("1_year");
    } else if (reminderPreset === "1_year" && nextType !== "Cambio de aceite y filtros") {
      // Keep user flexible: suggest "none" for non-oil services unless they pick one
      setReminderPreset("none");
    }
  }

  function handleSelectExistingVehicle(v: SimpleVehicleOption) {
    setSelectedVehicleId(v.id);
    setMileageAtService(String(v.currentMileage));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "existing") {
      if (!selectedVehicleId) {
        setError("Seleccioná un vehículo para cargar la reparación.");
        return;
      }
      if (!description.trim()) {
        setError("Ingresá una descripción del trabajo o repuestos utilizados.");
        return;
      }
      if (reminderPreset === "custom" && !customReminderDate) {
        setError("Elegí la fecha personalizada para el recordatorio.");
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch("/api/repairs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehicleId: selectedVehicleId,
            serviceDate,
            mileageAtService: Number(mileageAtService || selectedVehicle?.currentMileage || 0),
            serviceType,
            description: description.trim(),
            cost: cost.trim() === "" ? null : Number(cost),
            mechanicNotes: mechanicNotes.trim() || null,
            reminderPreset,
            customReminderDate:
              reminderPreset === "custom" ? customReminderDate : null,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "No se pudo guardar la reparación.");
        }
        onSuccess("Reparación registrada correctamente.", selectedVehicleId);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Mode: new vehicle
    if (
      !licensePlate.trim() ||
      !brand.trim() ||
      !model.trim() ||
      !ownerName.trim() ||
      !ownerPhone.trim()
    ) {
      setError(
        "Completá patente, marca, modelo, nombre del dueño y WhatsApp."
      );
      return;
    }

    if (includeInitialRepair && !description.trim()) {
      setError(
        "Completá la descripción de la primera reparación o desmarcá la opción."
      );
      return;
    }

    if (includeInitialRepair && reminderPreset === "custom" && !customReminderDate) {
      setError("Elegí la fecha personalizada para el recordatorio.");
      return;
    }

    setSubmitting(true);
    try {
      const kmValue = Number(currentMileage || 0);
      const payload: Record<string, unknown> = {
        licensePlate: licensePlate.trim(),
        brand: brand.trim(),
        model: model.trim(),
        year: Number(year),
        engine: engine.trim() || null,
        currentMileage: kmValue,
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        notes: vehicleNotes.trim() || null,
      };

      if (includeInitialRepair) {
        payload.initialRepair = {
          serviceDate,
          mileageAtService: Number(mileageAtService || kmValue),
          serviceType,
          description: description.trim(),
          cost: cost.trim() === "" ? null : Number(cost),
          mechanicNotes: mechanicNotes.trim() || null,
          reminderPreset,
          customReminderDate:
            reminderPreset === "custom" ? customReminderDate : null,
        };
      }

      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar el vehículo.");
      }

      onSuccess(
        includeInitialRepair
          ? "Vehículo y primera reparación registrados."
          : "Vehículo registrado correctamente.",
        data.vehicle?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const showRepairSection = mode === "existing" || includeInitialRepair;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-entry-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="gp-card flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-800 shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/12 text-amber-400">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="quick-entry-modal-title"
                className="text-base font-semibold text-slate-100"
              >
                Cargar auto o reparación
              </h2>
              <p className="text-xs text-slate-400">
                Registrá un trabajo nuevo y programá su alerta de mantenimiento
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode switcher */}
        <div className="border-b border-slate-800/80 bg-slate-950/50 px-6 py-3">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-900/90 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                mode === "existing"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              Reparación en auto existente
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                mode === "new"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <CarFront className="h-3.5 w-3.5" />
              Cargar auto nuevo
            </button>
          </div>
        </div>

        {/* Scrollable form body */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {mode === "existing" ? (
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  1. Seleccionar vehículo
                </label>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    placeholder="Buscar por patente, modelo o dueño..."
                    className="w-full rounded-xl border border-slate-700/90 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-amber-500/70"
                  />
                </div>

                {loadingVehicles ? (
                  <p className="py-4 text-center text-xs text-slate-400">
                    Cargando vehículos registrados...
                  </p>
                ) : filteredVehicles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-700 p-4 text-center">
                    <p className="text-xs text-slate-400">
                      No encontramos ese vehículo.
                    </p>
                    <button
                      type="button"
                      onClick={() => setMode("new")}
                      className="mt-2 text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      + Registrar como auto nuevo
                    </button>
                  </div>
                ) : (
                  <div className="grid max-h-44 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                    {filteredVehicles.map((v) => {
                      const active = selectedVehicleId === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleSelectExistingVehicle(v)}
                          className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left transition cursor-pointer ${
                            active
                              ? "border-amber-500/70 bg-amber-500/10"
                              : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold tracking-wider text-slate-100 tabular-nums">
                                {v.licensePlate}
                              </span>
                              <span className="truncate text-xs text-slate-300">
                                {v.brand} {v.model}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[11px] text-slate-400">
                              {v.ownerName} ·{" "}
                              <span className="tabular-nums">
                                {v.currentMileage.toLocaleString("es-AR")} km
                              </span>
                            </p>
                          </div>
                          {active && (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-slate-950">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  1. Datos del vehículo y del dueño
                </p>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Patente *
                    </label>
                    <input
                      type="text"
                      required
                      value={licensePlate}
                      onChange={(e) =>
                        setLicensePlate(e.target.value.toUpperCase())
                      }
                      placeholder="AB 123 CD"
                      className="w-full rounded-xl border border-slate-700/90 bg-slate-950/90 px-3.5 py-2.5 font-mono text-sm font-semibold uppercase tracking-wider text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Marca *
                    </label>
                    <input
                      type="text"
                      required
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Ej. Volkswagen"
                      className="w-full rounded-xl border border-slate-700/90 bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Modelo *
                    </label>
                    <input
                      type="text"
                      required
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="Ej. Golf GTI"
                      className="w-full rounded-xl border border-slate-700/90 bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Año *
                    </label>
                    <input
                      type="number"
                      required
                      min={1950}
                      max={new Date().getFullYear() + 2}
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full rounded-xl border border-slate-700/90 bg-slate-950/90 px-3.5 py-2.5 font-mono text-sm text-slate-100 tabular-nums outline-none focus:border-amber-500/70"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Motor (opcional)
                    </label>
                    <input
                      type="text"
                      value={engine}
                      onChange={(e) => setEngine(e.target.value)}
                      placeholder="Ej. 2.0 TSI / 1.6 16v"
                      className="w-full rounded-xl border border-slate-700/90 bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Kilometraje actual *
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={currentMileage}
                      onChange={(e) => {
                        setCurrentMileage(e.target.value);
                        if (!mileageAtService) setMileageAtService(e.target.value);
                      }}
                      placeholder="Ej. 85000"
                      className="w-full rounded-xl border border-slate-700/90 bg-slate-950/90 px-3.5 py-2.5 font-mono text-sm text-slate-100 tabular-nums placeholder-slate-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Nombre del dueño *
                    </label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Ej. Martín López"
                      className="w-full rounded-xl border border-slate-700/90 bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      WhatsApp del dueño *
                    </label>
                    <input
                      type="tel"
                      required
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="+54 9 11 5555-1234"
                      className="w-full rounded-xl border border-slate-700/90 bg-slate-950/90 px-3.5 py-2.5 font-mono text-sm text-slate-100 tabular-nums placeholder-slate-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Observaciones del vehículo (opcional)
                  </label>
                  <input
                    type="text"
                    value={vehicleNotes}
                    onChange={(e) => setVehicleNotes(e.target.value)}
                    placeholder="Aceite preferido, detalles particulares del cliente..."
                    className="w-full rounded-xl border border-slate-700/90 bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500/70"
                  />
                </div>

                <label className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeInitialRepair}
                    onChange={(e) => setIncludeInitialRepair(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 accent-amber-500"
                  />
                  <span className="text-xs font-medium text-slate-200">
                    Cargar también la primera reparación ahora
                  </span>
                </label>
              </div>
            )}

            {/* Repair section */}
            {showRepairSection && (
              <div className="space-y-4 border-t border-slate-800/80 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  2. Detalle de la reparación
                </p>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Fecha del trabajo *
                    </label>
                    <input
                      type="date"
                      required
                      value={serviceDate}
                      onChange={(e) => setServiceDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-700/90 bg-slate-950/90 px-3.5 py-2.5 font-mono text-sm text-slate-100 tabular-nums outline-none focus:border-amber-500/70"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Km en este service *
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={mileageAtService}
                      onChange={(e) => setMileageAtService(e.target.value)}
                      placeholder={
                        selectedVehicle
                          ? String(selectedVehicle.currentMileage)
                          : currentMileage || "Ej. 85000"
                      }
                      className="w-full rounded-xl border border-slate-700/90 bg-slate-950/90 px-3.5 py-2.5 font-mono text-sm text-slate-100 tabular-nums placeholder-slate-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Costo ARS (opcional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="Ej. 165000"
                      className="w-full rounded-xl border border-slate-700/90 bg-slate-950/90 px-3.5 py-2.5 font-mono text-sm text-slate-100 tabular-nums placeholder-slate-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Tipo de trabajo *
                  </label>
                  <select
                    value={serviceType}
                    onChange={(e) => handleServiceTypeChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-700/90 bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500/70"
                  >
                    {SERVICE_TYPES.map((type) => (
                      <option key={type} value={type} className="bg-slate-900">
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Descripción y repuestos usados *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ej. Aceite sintético 5W-40 Motul, filtro de aceite Mann, filtro de aire y filtro de habitáculo..."
                    className="w-full rounded-xl border border-slate-700/90 bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500/70"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Notas del mecánico (opcional)
                  </label>
                  <input
                    type="text"
                    value={mechanicNotes}
                    onChange={(e) => setMechanicNotes(e.target.value)}
                    placeholder="Ej. Revisar pastillas traseras en la próxima visita..."
                    className="w-full rounded-xl border border-slate-700/90 bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500/70"
                  />
                </div>

                {/* Reminder selector */}
                <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BellRing className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-semibold text-slate-200">
                        Programar recordatorio de mantenimiento
                      </span>
                    </div>
                    {previewDueDate && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2.5 py-0.5 font-mono text-[11px] font-medium text-amber-400 tabular-nums border border-amber-500/20">
                        <Calendar className="h-3 w-3" />
                        Alerta: {formatShortDate(previewDueDate)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {REMINDER_PRESETS.map((preset) => {
                      const active = reminderPreset === preset.value;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setReminderPreset(preset.value)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                            active
                              ? "border-amber-500 bg-amber-500/15 text-amber-300"
                              : "border-slate-700/80 bg-slate-900/70 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {reminderPreset === "custom" && (
                    <div className="pt-1">
                      <label className="mb-1 block text-[11px] font-medium text-slate-400">
                        Fecha de alerta personalizada
                      </label>
                      <input
                        type="date"
                        required
                        value={customReminderDate}
                        onChange={(e) => setCustomReminderDate(e.target.value)}
                        className="w-full max-w-xs rounded-xl border border-slate-700/90 bg-slate-950 px-3.5 py-2 font-mono text-sm text-slate-100 tabular-nums outline-none focus:border-amber-500/70"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-800 bg-slate-950/60 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              id="quick-entry-submit-btn"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-400 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {submitting
                ? "Guardando..."
                : mode === "new"
                ? includeInitialRepair
                  ? "Guardar auto y reparación"
                  : "Guardar vehículo"
                : "Guardar reparación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
