"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Calendar,
  CarFront,
  Check,
  ChevronDown,
  Plus,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import type { CarBrand } from "@/db/schema";
import {
  computeReminderDueDate,
  formatCurrency,
  formatShortDate,
  getTodayISO,
  matchesWorkshopQuery,
  REMINDER_PRESETS,
  SERVICE_TYPES,
  slugifyBrandName,
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
  const [brands, setBrands] = useState<CarBrand[]>([]);
  const [brandPickerOpen, setBrandPickerOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [addingBrand, setAddingBrand] = useState(false);
  const [newBrandInput, setNewBrandInput] = useState("");
  const [savingBrand, setSavingBrand] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    () => options.vehicleId ?? null
  );

  // New vehicle fields
  const [licensePlate, setLicensePlate] = useState("");
  const [brand, setBrand] = useState("Volkswagen");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [engine, setEngine] = useState("");
  const [currentMileage, setCurrentMileage] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("+54 9 341 ");
  const [vehicleNotes, setVehicleNotes] = useState("");
  const [includeInitialRepair, setIncludeInitialRepair] = useState(true);

  // Repair fields
  const [serviceDate, setServiceDate] = useState(() => getTodayISO());
  const [mileageAtService, setMileageAtService] = useState("");
  const [serviceType, setServiceType] = useState<string>(SERVICE_TYPES[0]);
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [mechanicNotes, setMechanicNotes] = useState("");
  const [reminderPreset, setReminderPreset] =
    useState<ReminderPreset>("1_year");
  const [customReminderDate, setCustomReminderDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    Promise.all([
      fetch("/api/vehicles").then((r) => (r.ok ? r.json() : { vehicles: [] })),
      fetch("/api/brands").then((r) => (r.ok ? r.json() : { brands: [] })),
    ])
      .then(([vData, bData]) => {
        if (cancelled) return;
        const list: SimpleVehicleOption[] = (vData.vehicles ?? []).map(
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
        setBrands(bData.brands ?? []);
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
      if (e.key === "Escape") {
        if (brandPickerOpen) {
          setBrandPickerOpen(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, brandPickerOpen]);

  const filteredBrands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, brandSearch]);

  async function handleCreateBrand() {
    const clean = newBrandInput.trim();
    if (clean.length < 2) return;
    setSavingBrand(true);
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clean }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo agregar la marca.");
      const created: CarBrand = json.brand;
      setBrands((prev) =>
        prev.some((b) => b.id === created.id)
          ? prev
          : [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setBrand(created.name);
      setNewBrandInput("");
      setBrandSearch("");
      setAddingBrand(false);
      setBrandPickerOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al agregar marca.");
    } finally {
      setSavingBrand(false);
    }
  }

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) =>
      matchesWorkshopQuery(
        vehicleSearch,
        [v.licensePlate, v.brand, v.model, v.ownerName],
        { plate: v.licensePlate }
      )
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
            partsCost: partsCost.trim() === "" ? null : Number(partsCost),
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
          partsCost: partsCost.trim() === "" ? null : Number(partsCost),
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
      <div className="gp-card flex max-h-[95dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-zinc-800 shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
        {/* Mobile grab handle */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/12 text-amber-400">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="quick-entry-modal-title"
                className="text-base font-semibold text-zinc-100"
              >
                Cargar auto o reparación
              </h2>
              <p className="text-xs text-zinc-400">
                Registrá el trabajo y programá su alerta en segundos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode switcher */}
        <div className="border-b border-zinc-800/80 bg-zinc-950/50 px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-zinc-900/90 p-1 border border-zinc-800">
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition cursor-pointer ${
                mode === "existing"
                  ? "bg-amber-500 text-zinc-950 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Wrench className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Auto existente</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition cursor-pointer ${
                mode === "new"
                  ? "bg-amber-500 text-zinc-950 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <CarFront className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Auto nuevo</span>
            </button>
          </div>
        </div>

        {/* Scrollable form body */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:space-y-6 sm:px-6 sm:py-5">
            {mode === "existing" ? (
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  1. Seleccionar vehículo
                </label>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="search"
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    placeholder="Buscar por patente, modelo o dueño..."
                    className="min-h-[44px] w-full rounded-xl border border-zinc-700/90 bg-zinc-950/80 py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-amber-500/70"
                  />
                </div>

                {loadingVehicles ? (
                  <p className="py-4 text-center text-xs text-zinc-400">
                    Cargando vehículos registrados...
                  </p>
                ) : filteredVehicles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-700 p-4 text-center">
                    <p className="text-xs text-zinc-400">
                      No encontramos ese vehículo.
                    </p>
                    <button
                      type="button"
                      onClick={() => setMode("new")}
                      className="mt-2 min-h-[40px] px-3 text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      + Registrar como auto nuevo
                    </button>
                  </div>
                ) : (
                  <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                    {filteredVehicles.map((v) => {
                      const active = selectedVehicleId === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleSelectExistingVehicle(v)}
                          className={`flex min-h-[52px] items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left transition cursor-pointer ${
                            active
                              ? "border-amber-500/70 bg-amber-500/10"
                              : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold tracking-wider text-zinc-100 tabular-nums">
                                {v.licensePlate}
                              </span>
                              <span className="truncate text-xs text-zinc-300">
                                {v.brand} {v.model}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                              {v.ownerName} ·{" "}
                              <span className="tabular-nums">
                                {v.currentMileage.toLocaleString("es-AR")} km
                              </span>
                            </p>
                          </div>
                          {active && (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-zinc-950">
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
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  1. Datos del vehículo y del dueño
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3.5">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                      Patente *
                    </label>
                    <input
                      type="text"
                      required
                      autoCapitalize="characters"
                      autoCorrect="off"
                      value={licensePlate}
                      onChange={(e) =>
                        setLicensePlate(e.target.value.toUpperCase())
                      }
                      placeholder="AB 123 CD"
                      className="min-h-[44px] w-full rounded-xl border border-zinc-700/90 bg-zinc-950/90 px-3.5 py-2.5 font-mono text-sm font-semibold uppercase tracking-wider text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                        Marca *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setBrandSearch("");
                          setAddingBrand(false);
                          setBrandPickerOpen(true);
                        }}
                        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-left transition hover:border-white/25 cursor-pointer"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <BrandLogo
                            brandName={brand || "Auto"}
                            brandSlug={slugifyBrandName(brand || "")}
                            size="sm"
                          />
                          <span className="truncate text-sm font-semibold text-white">
                            {brand || "Elegir marca"}
                          </span>
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
                      </button>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                        Modelo *
                      </label>
                      <input
                        type="text"
                        required
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="Ej. Golf GTI"
                        className="min-h-[44px] w-full rounded-xl border border-zinc-700/90 bg-zinc-950/90 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500/70"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                      Año *
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      required
                      min={1950}
                      max={new Date().getFullYear() + 2}
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-zinc-700/90 bg-zinc-950/90 px-3.5 py-2.5 font-mono text-sm text-zinc-100 tabular-nums outline-none focus:border-amber-500/70"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                      Km actual *
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      required
                      value={currentMileage}
                      onChange={(e) => {
                        setCurrentMileage(e.target.value);
                        if (!mileageAtService) setMileageAtService(e.target.value);
                      }}
                      placeholder="Ej. 85000"
                      className="min-h-[44px] w-full rounded-xl border border-zinc-700/90 bg-zinc-950/90 px-3.5 py-2.5 font-mono text-sm text-zinc-100 tabular-nums placeholder-zinc-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                      Motor (opcional)
                    </label>
                    <input
                      type="text"
                      value={engine}
                      onChange={(e) => setEngine(e.target.value)}
                      placeholder="Ej. 2.0 TSI / 1.6"
                      className="min-h-[44px] w-full rounded-xl border border-zinc-700/90 bg-zinc-950/90 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                      Nombre del dueño *
                    </label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Ej. Martín López"
                      className="min-h-[44px] w-full rounded-xl border border-zinc-700/90 bg-zinc-950/90 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                      WhatsApp del dueño *
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      required
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="+54 9 341 555-1234"
                      className="min-h-[44px] w-full rounded-xl border border-zinc-700/90 bg-zinc-950/90 px-3.5 py-2.5 font-mono text-sm text-zinc-100 tabular-nums placeholder-zinc-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                    Observaciones del vehículo (opcional)
                  </label>
                  <input
                    type="text"
                    value={vehicleNotes}
                    onChange={(e) => setVehicleNotes(e.target.value)}
                    placeholder="Aceite preferido, detalles particulares del cliente..."
                    className="min-h-[44px] w-full rounded-xl border border-zinc-700/90 bg-zinc-950/90 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500/70"
                  />
                </div>

                <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeInitialRepair}
                    onChange={(e) => setIncludeInitialRepair(e.target.checked)}
                    className="h-5 w-5 rounded border-zinc-600 accent-amber-500"
                  />
                  <span className="text-xs font-medium text-zinc-200">
                    Cargar también la primera reparación ahora
                  </span>
                </label>
              </div>
            )}

            {/* Repair section */}
            {showRepairSection && (
              <div className="space-y-4 border-t border-zinc-800/80 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  2. Detalle de la reparación
                </p>

                {/* 1-tap Service Type Quick Chips */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-zinc-300">
                    Tipo de trabajo *
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SERVICE_TYPES.map((type) => {
                      const active = serviceType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleServiceTypeChange(type)}
                          className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                            active
                              ? "border-amber-500 bg-amber-500/18 text-amber-300"
                              : "border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                      Fecha *
                    </label>
                    <input
                      type="date"
                      required
                      value={serviceDate}
                      onChange={(e) => setServiceDate(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-zinc-700/90 bg-zinc-950/90 px-3 py-2.5 font-mono text-sm text-zinc-100 tabular-nums outline-none focus:border-amber-500/70"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                      Km en service *
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      required
                      value={mileageAtService}
                      onChange={(e) => setMileageAtService(e.target.value)}
                      placeholder={
                        selectedVehicle
                          ? String(selectedVehicle.currentMileage)
                          : currentMileage || "Ej. 85000"
                      }
                      className="min-h-[44px] w-full rounded-xl border border-zinc-700/90 bg-zinc-950/90 px-3 py-2.5 font-mono text-sm text-zinc-100 tabular-nums placeholder-zinc-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                </div>

                {/* Financial inputs: Cobrado + Costo + Live Ganancia */}
                <div className="space-y-2.5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                        Cobrado (ARS)
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={500}
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        placeholder="Ej. 165000"
                        className="min-h-[44px] w-full rounded-xl border border-zinc-700/90 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 tabular-nums placeholder-zinc-600 outline-none focus:border-amber-500/70"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                        Costo repuestos
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={500}
                        value={partsCost}
                        onChange={(e) => setPartsCost(e.target.value)}
                        placeholder="Ej. 82000"
                        className="min-h-[44px] w-full rounded-xl border border-zinc-700/90 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 tabular-nums placeholder-zinc-600 outline-none focus:border-amber-500/70"
                      />
                    </div>
                  </div>
                  {(cost.trim() !== "" || partsCost.trim() !== "") && (() => {
                    const rev = Number(cost || 0);
                    const exp = Number(partsCost || 0);
                    const profit = rev - exp;
                    const margin = rev > 0 ? Math.round((profit / rev) * 100) : null;
                    return (
                      <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2 text-xs">
                        <span className="text-zinc-400">Ganancia calculada:</span>
                        <span
                          className={`font-mono font-bold tabular-nums ${
                            profit >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {formatCurrency(profit)}
                          {margin !== null ? ` (${margin}%)` : ""}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                    Descripción y repuestos usados *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ej. Aceite sintético 5W-40 Motul, filtro de aceite Mann, filtro de aire..."
                    className="w-full rounded-xl border border-zinc-700/90 bg-zinc-950/90 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500/70"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                    Notas del mecánico (opcional)
                  </label>
                  <input
                    type="text"
                    value={mechanicNotes}
                    onChange={(e) => setMechanicNotes(e.target.value)}
                    placeholder="Ej. Revisar pastillas traseras en la próxima visita..."
                    className="min-h-[44px] w-full rounded-xl border border-zinc-700/90 bg-zinc-950/90 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500/70"
                  />
                </div>

                {/* Reminder selector */}
                <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BellRing className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-semibold text-zinc-200">
                        Recordatorio de mantenimiento
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
                          className={`min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                            active
                              ? "border-amber-500 bg-amber-500/15 text-amber-300"
                              : "border-zinc-700/80 bg-zinc-900/70 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {reminderPreset === "custom" && (
                    <div className="pt-1">
                      <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                        Fecha de alerta personalizada
                      </label>
                      <input
                        type="date"
                        required
                        value={customReminderDate}
                        onChange={(e) => setCustomReminderDate(e.target.value)}
                        className="min-h-[44px] w-full max-w-xs rounded-xl border border-zinc-700/90 bg-zinc-950 px-3.5 py-2 font-mono text-sm text-zinc-100 tabular-nums outline-none focus:border-amber-500/70"
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

          {/* Sticky Compact Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-white/[0.08] bg-zinc-950/95 px-4 pt-2.5 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-3.5">
            <button
              type="button"
              onClick={onClose}
              className="hidden min-h-[42px] rounded-xl border border-white/12 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-900 hover:text-white sm:inline-flex sm:items-center cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              id="quick-entry-submit-btn"
              className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-zinc-200 active:scale-[0.99] disabled:opacity-50 sm:min-h-[42px] sm:w-auto sm:text-xs cursor-pointer"
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

      {/* Full-Height Brand Picker Sheet */}
      {brandPickerOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Elegir marca del vehículo"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBrandPickerOpen(false);
          }}
        >
          <div className="gp-card flex h-[86dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl shadow-2xl sm:h-auto sm:max-h-[80vh] sm:rounded-2xl">
            <div
              className="flex justify-center pt-2.5 pb-1 sm:hidden"
              aria-hidden="true"
            >
              <span className="h-1 w-10 rounded-full bg-zinc-700" />
            </div>

            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Elegir marca</h3>
                <span className="rounded-full border border-white/10 bg-zinc-900 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-400">
                  {filteredBrands.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBrandPickerOpen(false)}
                aria-label="Cerrar selector de marcas"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-white/[0.08] bg-zinc-950/60 px-4 py-2.5 sm:px-5">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="search"
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  placeholder="Buscar marca..."
                  className="min-h-[42px] w-full rounded-xl border border-white/10 bg-zinc-950 py-2 pr-9 pl-10 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-500"
                />
                {brandSearch && (
                  <button
                    type="button"
                    onClick={() => setBrandSearch("")}
                    aria-label="Limpiar búsqueda"
                    className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-3.5 py-3 sm:px-5 sm:py-4">
              {filteredBrands.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5">
                  {filteredBrands.map((b) => {
                    const active = b.name.toLowerCase() === brand.toLowerCase();
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setBrand(b.name);
                          setBrandPickerOpen(false);
                        }}
                        className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition active:scale-[0.97] cursor-pointer ${
                          active
                            ? "border-white/40 bg-white/10 text-white"
                            : "border-white/[0.08] bg-zinc-900/75 text-zinc-200 hover:border-white/20 hover:bg-zinc-800/80 hover:text-white"
                        }`}
                      >
                        {active && (
                          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </span>
                        )}
                        <BrandLogo
                          brandName={b.name}
                          brandSlug={b.slug}
                          size="md"
                        />
                        <span className="w-full truncate text-[11.5px] font-semibold leading-tight">
                          {b.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-950/60 px-4 py-10 text-center">
                  <p className="text-sm font-medium text-zinc-300">
                    No encontramos &ldquo;{brandSearch.trim()}&rdquo;
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewBrandInput(brandSearch.trim());
                      setAddingBrand(true);
                    }}
                    className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-zinc-200 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar &ldquo;{brandSearch.trim()}&rdquo;
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.08] bg-zinc-950/95 px-4 pt-2.5 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-3">
              {addingBrand ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={newBrandInput}
                    onChange={(e) => setNewBrandInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (!savingBrand && newBrandInput.trim().length >= 2) {
                          handleCreateBrand();
                        }
                      }
                    }}
                    placeholder="Nueva marca (ej. Subaru, Volvo...)"
                    className="min-h-[44px] flex-1 rounded-xl border border-white/25 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/50"
                  />
                  <button
                    type="button"
                    disabled={savingBrand || newBrandInput.trim().length < 2}
                    onClick={handleCreateBrand}
                    className="min-h-[44px] shrink-0 rounded-xl bg-white px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 cursor-pointer"
                  >
                    {savingBrand ? "..." : "Guardar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingBrand(false)}
                    aria-label="Cancelar"
                    className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl border border-white/12 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (brandSearch.trim()) setNewBrandInput(brandSearch.trim());
                    setAddingBrand(true);
                  }}
                  className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Agregar nueva marca
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
