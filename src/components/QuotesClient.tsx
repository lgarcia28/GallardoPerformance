"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useWorkshopUI } from "@/components/WorkshopShell";
import type { CarBrand, Quote } from "@/db/schema";
import type { QuotesData, VehicleSummary } from "@/lib/queries";
import {
  buildQuoteWhatsAppMessage,
  buildWhatsAppUrl,
  calculateQuoteTotal,
  formatCurrency,
  formatMileage,
  formatShortDate,
  parseQuoteItems,
  QUOTE_STATUS_META,
  slugifyBrandName,
  WORKSHOP_INFO,
  type QuoteItem,
  type QuoteStatus,
} from "@/lib/workshop";

interface DraftItemRow {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

function makeEmptyRow(): DraftItemRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description: "",
    quantity: "1",
    unitPrice: "",
  };
}

interface QuotesClientProps {
  initialData: QuotesData;
  initialVehicles: VehicleSummary[];
}

export function QuotesClient({
  initialData,
  initialVehicles,
}: QuotesClientProps) {
  const router = useRouter();
  const { showToast } = useWorkshopUI();

  const [data, setData] = useState<QuotesData>(initialData);
  const [vehicles, setVehicles] = useState<VehicleSummary[]>(initialVehicles);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | QuoteStatus>("all");

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null
  );

  // Client & Vehicle fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState<string>(
    WORKSHOP_INFO.defaultPhonePrefix
  );
  const [licensePlate, setLicensePlate] = useState("");
  const [brandName, setBrandName] = useState("Volkswagen");
  const [brandSlug, setBrandSlug] = useState("volkswagen");
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [addingBrand, setAddingBrand] = useState(false);
  const [newBrandInput, setNewBrandInput] = useState("");
  const [savingBrand, setSavingBrand] = useState(false);
  const brandDropdownRef = useRef<HTMLDivElement>(null);
  const [model, setModel] = useState("");
  const [mileage, setMileage] = useState("");
  const [validityDays, setValidityDays] = useState("15");
  const [notes, setNotes] = useState(
    "Presupuesto sujeto a revisión al desarmar."
  );
  const [status, setStatus] = useState<QuoteStatus>("draft");
  const [rows, setRows] = useState<DraftItemRow[]>(() => [makeEmptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // WhatsApp Preview Modal
  const [waModalQuote, setWaModalQuote] = useState<Quote | null>(null);
  const [waMessageText, setWaMessageText] = useState("");
  const [sendingWa, setSendingWa] = useState(false);

  const reloadData = useCallback(async () => {
    try {
      const [qRes, vRes] = await Promise.all([
        fetch("/api/quotes", { cache: "no-store" }),
        fetch("/api/vehicles", { cache: "no-store" }),
      ]);
      if (qRes.ok) {
        const fresh: QuotesData = await qRes.json();
        setData(fresh);
      }
      if (vRes.ok) {
        const vJson = await vRes.json();
        setVehicles(vJson.vehicles ?? []);
      }
    } catch {
      // Keep current state
    }
  }, []);

  useEffect(() => {
    const handler = () => reloadData();
    window.addEventListener("gallardo:data-changed", handler);
    return () => window.removeEventListener("gallardo:data-changed", handler);
  }, [reloadData]);

  useEffect(() => {
    if (!modalOpen && !waModalQuote) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (brandDropdownOpen) {
          setBrandDropdownOpen(false);
          return;
        }
        setModalOpen(false);
        setWaModalQuote(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, waModalQuote, brandDropdownOpen]);

  useEffect(() => {
    if (!brandDropdownOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        brandDropdownRef.current &&
        !brandDropdownRef.current.contains(e.target as Node)
      ) {
        setBrandDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [brandDropdownOpen]);

  const filteredQuotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.quotes.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      return `${item.quoteNumber} ${item.customerName} ${item.customerPhone} ${item.brandName} ${item.model} ${item.licensePlate ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [data.quotes, search, statusFilter]);

  const filteredBrands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    if (!q) return data.brands;
    return data.brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [data.brands, brandSearch]);

  const filteredVehicles = useMemo(() => {
    const q = vehicleQuery.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) =>
      `${v.licensePlate} ${v.brand} ${v.model} ${v.ownerName}`
        .toLowerCase()
        .includes(q)
    );
  }, [vehicles, vehicleQuery]);

  const liveTotal = useMemo(() => {
    return rows.reduce((sum, r) => {
      const qty = Math.max(1, Number(r.quantity) || 1);
      const price = Math.max(0, Number(r.unitPrice) || 0);
      return sum + Math.round(qty * price);
    }, 0);
  }, [rows]);

  function openCreateModal() {
    setEditingQuote(null);
    setShowVehiclePicker(false);
    setVehicleQuery("");
    setSelectedVehicleId(null);
    setCustomerName("");
    setCustomerPhone(WORKSHOP_INFO.defaultPhonePrefix);
    setLicensePlate("");
    const defaultBrand = data.brands[0] ?? {
      name: "Volkswagen",
      slug: "volkswagen",
    };
    setBrandName(defaultBrand.name);
    setBrandSlug(defaultBrand.slug);
    setBrandDropdownOpen(false);
    setBrandSearch("");
    setAddingBrand(false);
    setNewBrandInput("");
    setModel("");
    setMileage("");
    setValidityDays("15");
    setNotes("Presupuesto sujeto a revisión al desarmar.");
    setStatus("draft");
    setRows([makeEmptyRow()]);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(quote: Quote) {
    setEditingQuote(quote);
    setShowVehiclePicker(false);
    setVehicleQuery("");
    setSelectedVehicleId(quote.vehicleId ?? null);
    setCustomerName(quote.customerName);
    setCustomerPhone(quote.customerPhone);
    setLicensePlate(quote.licensePlate ?? "");
    setBrandName(quote.brandName);
    setBrandSlug(quote.brandSlug ?? slugifyBrandName(quote.brandName));
    setBrandDropdownOpen(false);
    setBrandSearch("");
    setAddingBrand(false);
    setNewBrandInput("");
    setModel(quote.model);
    setMileage(String(quote.mileage));
    setValidityDays(String(quote.validityDays));
    setNotes(quote.notes ?? "");
    setStatus((quote.status as QuoteStatus) || "draft");
    const parsed = parseQuoteItems(quote.itemsJson);
    setRows(
      parsed.length > 0
        ? parsed.map((item, i) => ({
            id: `edit-${i}-${Date.now()}`,
            description: item.description,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
          }))
        : [makeEmptyRow()]
    );
    setFormError(null);
    setModalOpen(true);
  }

  function handleAutofillVehicle(v: VehicleSummary) {
    setSelectedVehicleId(v.id);
    setCustomerName(v.ownerName);
    setCustomerPhone(v.ownerPhone);
    setLicensePlate(v.licensePlate);
    const matchedBrand = data.brands.find(
      (b) =>
        b.name.toLowerCase() === v.brand.toLowerCase() ||
        b.slug === slugifyBrandName(v.brand)
    );
    setBrandName(matchedBrand ? matchedBrand.name : v.brand);
    setBrandSlug(matchedBrand ? matchedBrand.slug : slugifyBrandName(v.brand));
    setBrandDropdownOpen(false);
    setModel(`${v.model}${v.year ? ` ${v.year}` : ""}`);
    setMileage(String(v.currentMileage));
    setShowVehiclePicker(false);
    setFormError(null);
  }

  function handleSelectBrand(brand: CarBrand) {
    setBrandName(brand.name);
    setBrandSlug(brand.slug);
    setBrandDropdownOpen(false);
    setBrandSearch("");
    setAddingBrand(false);
  }

  async function handleCreateNewBrand() {
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
      if (!res.ok) {
        throw new Error(json.error || "No se pudo agregar la marca.");
      }
      const created: CarBrand = json.brand;
      setData((prev) => {
        const exists = prev.brands.some((b) => b.id === created.id);
        const nextBrands = exists
          ? prev.brands
          : [...prev.brands, created].sort((a, b) =>
              a.name.localeCompare(b.name)
            );
        return { ...prev, brands: nextBrands };
      });
      setBrandName(created.name);
      setBrandSlug(created.slug);
      setNewBrandInput("");
      setBrandSearch("");
      setAddingBrand(false);
      setBrandDropdownOpen(false);
      showToast(`Marca "${created.name}" agregada.`);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Error al agregar la marca."
      );
    } finally {
      setSavingBrand(false);
    }
  }

  function updateRow(id: string, field: keyof DraftItemRow, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  async function handleSaveQuote(openPdfAfter: boolean) {
    setFormError(null);

    if (
      !customerName.trim() ||
      !customerPhone.trim() ||
      !brandName.trim() ||
      !model.trim()
    ) {
      setFormError(
        "Completá nombre del cliente, WhatsApp, marca y modelo del vehículo."
      );
      return;
    }

    const items: QuoteItem[] = rows
      .map((r) => ({
        description: r.description.trim(),
        quantity: Math.max(1, Math.round(Number(r.quantity) || 1)),
        unitPrice: Math.max(0, Math.round(Number(r.unitPrice) || 0)),
      }))
      .filter((item) => item.description.length > 0);

    if (items.length === 0) {
      setFormError("Agregá al menos una reparación con descripción y costo.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vehicleId: selectedVehicleId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        licensePlate: licensePlate.trim() || null,
        brandName: brandName.trim(),
        brandSlug: brandSlug || slugifyBrandName(brandName),
        model: model.trim(),
        mileage: Math.max(0, Math.round(Number(mileage) || 0)),
        items,
        totalAmount: calculateQuoteTotal(items),
        validityDays: Math.max(1, Math.round(Number(validityDays) || 15)),
        notes: notes.trim() || null,
        status,
      };

      const url = editingQuote
        ? `/api/quotes/${editingQuote.id}`
        : "/api/quotes";
      const method = editingQuote ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo guardar el presupuesto.");
      }

      setModalOpen(false);
      showToast(
        editingQuote
          ? "Presupuesto actualizado."
          : `Presupuesto ${json.quote?.quoteNumber ?? ""} generado.`
      );
      await reloadData();

      if (openPdfAfter && json.quote?.id) {
        router.push(`/presupuestos/${json.quote.id}`);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSubmitting(false);
    }
  }

  function openWhatsAppPreview(quote: Quote) {
    const items = parseQuoteItems(quote.itemsJson);
    const msg = buildQuoteWhatsAppMessage({
      quoteNumber: quote.quoteNumber,
      customerName: quote.customerName,
      brandName: quote.brandName,
      model: quote.model,
      licensePlate: quote.licensePlate,
      mileage: quote.mileage,
      items,
      totalAmount: quote.totalAmount,
      validityDays: quote.validityDays,
      notes: quote.notes,
    });
    setWaMessageText(msg);
    setWaModalQuote(quote);
  }

  async function handleConfirmSendWa() {
    if (!waModalQuote) return;
    setSendingWa(true);
    const url = buildWhatsAppUrl(waModalQuote.customerPhone, waMessageText);
    window.open(url, "_blank", "noopener,noreferrer");

    try {
      if (waModalQuote.status === "draft") {
        await fetch(`/api/quotes/${waModalQuote.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "sent" }),
        });
      }
      showToast("Presupuesto listo en WhatsApp.");
      setWaModalQuote(null);
      await reloadData();
    } finally {
      setSendingWa(false);
    }
  }

  async function handleQuickStatus(quote: Quote, nextStatus: QuoteStatus) {
    const res = await fetch(`/api/quotes/${quote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      showToast(
        `Presupuesto ${quote.quoteNumber} → ${QUOTE_STATUS_META[nextStatus].label}`
      );
      await reloadData();
    }
  }

  async function handleDeleteQuote(quote: Quote) {
    const ok = window.confirm(
      `¿Eliminar el presupuesto ${quote.quoteNumber} de ${quote.customerName}?`
    );
    if (!ok) return;
    const res = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Presupuesto eliminado.");
      await reloadData();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400/90">
            Cotizaciones PDF & WhatsApp
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            Presupuestos
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Generá presupuestos con el logo de GallardoPerformance y la marca del auto listos para PDF y WhatsApp.
          </p>
        </div>

        <button
          type="button"
          id="quotes-new-btn"
          onClick={openCreateModal}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-400 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Nuevo presupuesto
        </button>
      </div>

      {/* KPI Strip */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="gp-card rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-400">
            Presupuestos del mes
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-50 tabular-nums">
            {data.summary.monthCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Emitidos este mes
          </p>
        </div>

        <button
          type="button"
          onClick={() => setStatusFilter("sent")}
          className="gp-card gp-card-interactive rounded-2xl p-4 text-left sm:p-5 cursor-pointer"
        >
          <p className="text-xs font-medium text-slate-400">
            Enviados pendientes
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-sky-400 tabular-nums">
            {data.summary.sentPendingCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Esperando confirmación del cliente
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("approved")}
          className="gp-card gp-card-interactive rounded-2xl p-4 text-left sm:p-5 cursor-pointer"
        >
          <p className="text-xs font-medium text-slate-400">
            Aprobados ({data.summary.approvedCount})
          </p>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-400 tabular-nums sm:text-3xl">
            {formatCurrency(data.summary.approvedTotalAmount)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Total confirmado por clientes
          </p>
        </button>
      </section>

      {/* Search & Status Filters */}
      <div className="gp-card rounded-2xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por número (GP-0001), cliente, marca, modelo o patente..."
              className="min-h-[44px] w-full rounded-xl border border-slate-700/80 bg-slate-950/90 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-amber-500/70"
            />
          </div>

          <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {(
              [
                { key: "all", label: "Todos" },
                { key: "draft", label: "Borradores" },
                { key: "sent", label: "Enviados" },
                { key: "approved", label: "Aprobados" },
                { key: "rejected", label: "Rechazados" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`min-h-[38px] shrink-0 rounded-xl border px-3.5 py-2 text-xs font-medium transition cursor-pointer ${
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
      </div>

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        <div className="gp-card rounded-2xl px-6 py-16 text-center">
          <FileText className="mx-auto h-9 w-9 text-slate-600" />
          <p className="mt-3 text-sm font-semibold text-slate-200">
            No encontramos presupuestos
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Creá un nuevo presupuesto para generar su PDF y enviarlo por WhatsApp.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-4 inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nuevo presupuesto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredQuotes.map((quote) => {
            const items = parseQuoteItems(quote.itemsJson);
            const stKey = (
              quote.status in QUOTE_STATUS_META ? quote.status : "draft"
            ) as QuoteStatus;
            const stMeta = QUOTE_STATUS_META[stKey];

            return (
              <article
                key={quote.id}
                className="gp-card flex flex-col justify-between gap-4 rounded-2xl p-5"
              >
                <div className="space-y-3.5">
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <BrandLogo
                        brandName={quote.brandName}
                        brandSlug={quote.brandSlug}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400 tabular-nums">
                            {quote.quoteNumber}
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                            {formatShortDate(quote.createdAt.slice(0, 10))}
                          </span>
                        </div>
                        <h2 className="truncate text-sm font-bold text-slate-50">
                          {quote.brandName} {quote.model}
                        </h2>
                        <p className="font-mono text-[11px] text-slate-400 tabular-nums">
                          {formatMileage(quote.mileage)}
                          {quote.licensePlate ? ` · ${quote.licensePlate}` : ""}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${stMeta.badgeClass}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${stMeta.dotClass}`}
                      />
                      {stMeta.label}
                    </span>
                  </div>

                  {/* Client */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/60 px-3.5 py-2.5 text-xs">
                    <span className="font-semibold text-slate-200">
                      {quote.customerName}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-slate-400 tabular-nums">
                      <Phone className="h-3 w-3 text-slate-500" />
                      {quote.customerPhone}
                    </span>
                  </div>

                  {/* Items Preview */}
                  <div className="space-y-1.5">
                    {items.slice(0, 3).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-baseline justify-between gap-3 text-xs"
                      >
                        <span className="truncate text-slate-300">
                          {item.quantity > 1 ? `${item.quantity}x ` : ""}
                          {item.description}
                        </span>
                        <span className="shrink-0 font-mono text-slate-400 tabular-nums">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </span>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <p className="text-[11px] text-slate-500">
                        + {items.length - 3} ítems más...
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Total + Actions */}
                <div className="space-y-3 border-t border-slate-800/80 pt-3.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">
                      Validez {quote.validityDays} días
                    </span>
                    <span className="font-mono text-lg font-extrabold text-slate-50 tabular-nums">
                      {formatCurrency(quote.totalAmount)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/presupuestos/${quote.id}`}
                      className="flex-1 sm:flex-none inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Ver / PDF
                    </Link>

                    <button
                      type="button"
                      onClick={() => openWhatsAppPreview(quote)}
                      className="flex-1 sm:flex-none inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 px-3.5 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/25 cursor-pointer"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </button>

                    {stKey === "approved" && (
                      <Link
                        href="/turnos"
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-sky-500/35 bg-sky-500/12 px-3 py-2 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20"
                      >
                        <CalendarDays className="h-3.5 w-3.5" />
                        Agendar turno
                      </Link>
                    )}

                    <div className="ml-auto flex items-center gap-1.5">
                      {stKey !== "approved" && (
                        <button
                          type="button"
                          onClick={() => handleQuickStatus(quote, "approved")}
                          title="Marcar aprobado"
                          className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 transition hover:bg-emerald-500/20 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditModal(quote)}
                        title="Editar presupuesto"
                        className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-slate-800 text-slate-400 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuote(quote)}
                        title="Eliminar presupuesto"
                        className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-slate-800 text-slate-500 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create / Edit Quote Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quote-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="gp-card flex max-h-[95dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-800 shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
            <div
              className="flex justify-center pt-2.5 pb-1 sm:hidden"
              aria-hidden="true"
            >
              <span className="h-1 w-10 rounded-full bg-slate-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3.5 sm:px-6 sm:py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/12 text-amber-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2
                    id="quote-modal-title"
                    className="text-base font-semibold text-slate-100"
                  >
                    {editingQuote
                      ? `Editar presupuesto ${editingQuote.quoteNumber}`
                      : "Generar presupuesto"}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Elegí la marca, cargá las reparaciones y descargá el PDF
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

            {/* Scrollable Body */}
            <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
              {/* Optional autofill from registered vehicle */}
              {vehicles.length > 0 && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowVehiclePicker((v) => !v)}
                    className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/70 px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-amber-500/50 hover:text-amber-300 cursor-pointer"
                  >
                    <CarFront className="h-3.5 w-3.5 text-amber-400" />
                    {showVehiclePicker
                      ? "Ocultar autos registrados"
                      : "Autocompletar desde un auto registrado (opcional)"}
                  </button>

                  {showVehiclePicker && (
                    <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <input
                        type="search"
                        value={vehicleQuery}
                        onChange={(e) => setVehicleQuery(e.target.value)}
                        placeholder="Buscar patente, modelo o dueño..."
                        className="min-h-[42px] w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500/70"
                      />
                      <div className="grid max-h-36 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                        {filteredVehicles.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleAutofillVehicle(v)}
                            className="flex min-h-[46px] flex-col justify-center rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-left transition hover:border-amber-500/60 cursor-pointer"
                          >
                            <span className="truncate text-xs font-semibold text-slate-100">
                              <span className="font-mono font-bold">
                                {v.licensePlate}
                              </span>{" "}
                              · {v.brand} {v.model}
                            </span>
                            <span className="truncate text-[11px] text-slate-400">
                              {v.ownerName} · {formatMileage(v.currentMileage)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 1. Client Details */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  1. Datos del cliente
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Nombre del cliente *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ej. Marcos Pérez"
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
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+54 9 341 555-1234"
                      className="min-h-[44px] w-full rounded-xl border border-slate-700/90 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 tabular-nums placeholder-slate-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Patente (opcional)
                    </label>
                    <input
                      type="text"
                      autoCapitalize="characters"
                      value={licensePlate}
                      onChange={(e) =>
                        setLicensePlate(e.target.value.toUpperCase())
                      }
                      placeholder="AB 123 CD"
                      className="min-h-[44px] w-full rounded-xl border border-slate-700/90 bg-slate-950 px-3 py-2 font-mono text-sm font-semibold uppercase tracking-wider text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Vehicle: Brand (preset + add new) + Model (manual) + KM */}
              <div className="space-y-3 border-t border-slate-800/80 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    2. Marca, modelo y kilometraje
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingBrand((v) => !v);
                      setBrandDropdownOpen(false);
                    }}
                    className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/12 px-2.5 py-1 text-[11px] font-bold text-amber-300 transition hover:bg-amber-500/20 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    Agregar nueva marca
                  </button>
                </div>

                {/* Inline Add New Brand */}
                {addingBrand && (
                  <div className="flex gap-2 rounded-xl border border-amber-500/35 bg-amber-500/8 p-3">
                    <input
                      type="text"
                      autoFocus
                      value={newBrandInput}
                      onChange={(e) => setNewBrandInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (!savingBrand && newBrandInput.trim().length >= 2) {
                            handleCreateNewBrand();
                          }
                        }
                      }}
                      placeholder="Nombre de la nueva marca (ej. Subaru, Volvo...)"
                      className="min-h-[42px] flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      disabled={savingBrand || newBrandInput.trim().length < 2}
                      onClick={handleCreateNewBrand}
                      className="min-h-[42px] shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
                    >
                      {savingBrand ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                )}

                {/* Collapsible Brand Selector Dropdown */}
                <div ref={brandDropdownRef} className="relative">
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Marca del vehículo *
                  </label>
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={brandDropdownOpen}
                    onClick={() => {
                      setBrandDropdownOpen((open) => !open);
                      setBrandSearch("");
                    }}
                    className={`flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition cursor-pointer ${
                      brandDropdownOpen
                        ? "border-amber-500 bg-slate-950 ring-2 ring-amber-500/20"
                        : "border-slate-700/90 bg-slate-950 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <BrandLogo
                        brandName={brandName}
                        brandSlug={brandSlug}
                        size="sm"
                      />
                      <span className="truncate text-sm font-semibold text-slate-100">
                        {brandName}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-slate-400">
                      <span className="hidden text-[11px] font-medium text-slate-500 sm:inline">
                        {brandDropdownOpen ? "Cerrar" : "Elegir marca"}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-150 ${
                          brandDropdownOpen
                            ? "rotate-180 text-amber-400"
                            : "text-slate-400"
                        }`}
                      />
                    </div>
                  </button>

                  {brandDropdownOpen && (
                    <div
                      role="listbox"
                      aria-label="Seleccionar marca"
                      className="mt-2 space-y-2.5 rounded-xl border border-slate-700/90 bg-slate-900 p-2.5 shadow-2xl shadow-black/50"
                    >
                      <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                        <input
                          type="search"
                          value={brandSearch}
                          onChange={(e) => setBrandSearch(e.target.value)}
                          placeholder="Buscar marca..."
                          className="min-h-[40px] w-full rounded-lg border border-slate-700/80 bg-slate-950 py-1.5 pr-3 pl-8 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-amber-500/70"
                        />
                      </div>

                      {filteredBrands.length > 0 ? (
                        <div className="grid max-h-52 grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3">
                          {filteredBrands.map((b) => {
                            const active =
                              b.name.toLowerCase() === brandName.toLowerCase();
                            return (
                              <button
                                key={b.id}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => handleSelectBrand(b)}
                                className={`flex min-h-[44px] items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-left transition cursor-pointer ${
                                  active
                                    ? "border-amber-500 bg-amber-500/15 text-amber-200"
                                    : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700 hover:bg-slate-800/70 hover:text-white"
                                }`}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <BrandLogo
                                    brandName={b.name}
                                    brandSlug={b.slug}
                                    size="sm"
                                  />
                                  <span className="truncate text-xs font-semibold">
                                    {b.name}
                                  </span>
                                </span>
                                {active && (
                                  <Check className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/50 px-3 py-4 text-center">
                          <p className="text-xs text-slate-400">
                            No encontramos &ldquo;{brandSearch.trim()}&rdquo;.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setNewBrandInput(brandSearch.trim());
                              setAddingBrand(true);
                              setBrandDropdownOpen(false);
                            }}
                            className="mt-2 inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Agregar &ldquo;{brandSearch.trim()}&rdquo;
                          </button>
                        </div>
                      )}

                      <div className="border-t border-slate-800 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (brandSearch.trim()) {
                              setNewBrandInput(brandSearch.trim());
                            }
                            setAddingBrand(true);
                            setBrandDropdownOpen(false);
                          }}
                          className="flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Agregar otra marca que no está en la lista
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Manual Model + Mileage */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Modelo (manual) *
                    </label>
                    <input
                      type="text"
                      required
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="Ej. Golf GTI 2.0 TSI / 208 Feline"
                      className="min-h-[44px] w-full rounded-xl border border-slate-700/90 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Kilometraje del auto *
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      required
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value)}
                      placeholder="Ej. 85000"
                      className="min-h-[44px] w-full rounded-xl border border-slate-700/90 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 tabular-nums placeholder-slate-600 outline-none focus:border-amber-500/70"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Manual Repairs & Pricing Items */}
              <div className="space-y-3 border-t border-slate-800/80 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    3. Reparaciones y costos
                  </p>
                  <button
                    type="button"
                    onClick={() => setRows((prev) => [...prev, makeEmptyRow()])}
                    className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/12 px-3 py-1 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar ítem
                  </button>
                </div>

                <div className="space-y-2.5">
                  {rows.map((row, idx) => {
                    const rowSubtotal =
                      Math.max(1, Number(row.quantity) || 1) *
                      Math.max(0, Number(row.unitPrice) || 0);
                    return (
                      <div
                        key={row.id}
                        className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-bold text-slate-500">
                            Ítem #{idx + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-300 tabular-nums">
                              Subtotal: {formatCurrency(rowSubtotal)}
                            </span>
                            {rows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeRow(row.id)}
                                className="rounded-lg p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
                                aria-label="Quitar ítem"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) =>
                            updateRow(row.id, "description", e.target.value)
                          }
                          placeholder="Ej. Kit de distribución INA + mano de obra"
                          className="min-h-[44px] w-full rounded-xl border border-slate-700/90 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500/70"
                        />

                        <div className="grid grid-cols-3 gap-2.5">
                          <div>
                            <label className="mb-1 block text-[11px] text-slate-400">
                              Cantidad
                            </label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              value={row.quantity}
                              onChange={(e) =>
                                updateRow(row.id, "quantity", e.target.value)
                              }
                              className="min-h-[44px] w-full rounded-xl border border-slate-700/90 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 tabular-nums outline-none focus:border-amber-500/70"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="mb-1 block text-[11px] text-slate-400">
                              Precio unitario (ARS) *
                            </label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              step={500}
                              value={row.unitPrice}
                              onChange={(e) =>
                                updateRow(row.id, "unitPrice", e.target.value)
                              }
                              placeholder="Ej. 185000"
                              className="min-h-[44px] w-full rounded-xl border border-slate-700/90 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 tabular-nums placeholder-slate-600 outline-none focus:border-amber-500/70"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Live Total Bar */}
                <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
                    Total del presupuesto
                  </span>
                  <span className="font-mono text-xl font-extrabold text-amber-300 tabular-nums">
                    {formatCurrency(liveTotal)}
                  </span>
                </div>
              </div>

              {/* 4. Validity & Notes */}
              <div className="space-y-3 border-t border-slate-800/80 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-300">
                    Validez del presupuesto
                  </span>
                  <div className="flex gap-1.5">
                    {["7", "15", "30"].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setValidityDays(d)}
                        className={`min-h-[34px] rounded-lg border px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                          validityDays === d
                            ? "border-amber-500 bg-amber-500/18 text-amber-300"
                            : "border-slate-800 bg-slate-950/70 text-slate-400"
                        }`}
                      >
                        {d} días
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Observaciones / aclaraciones (aparecen en el PDF)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej. Presupuesto sujeto a revisión al desarmar..."
                    className="w-full rounded-xl border border-slate-700/90 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500/70"
                  />
                </div>
              </div>

              {formError && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
                  {formError}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-800 bg-slate-950/90 px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-end sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[44px] rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSaveQuote(false)}
                className="min-h-[44px] rounded-xl border border-amber-500/40 bg-amber-500/12 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                disabled={submitting}
                id="quote-save-and-pdf-btn"
                onClick={() => handleSaveQuote(true)}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/15 hover:bg-amber-400 disabled:opacity-50 sm:min-h-[42px] sm:text-xs cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                {submitting ? "Generando..." : "Guardar y ver PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editable WhatsApp Quote Preview Modal */}
      {waModalQuote && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setWaModalQuote(null);
          }}
        >
          <div className="gp-card flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-slate-800 shadow-2xl sm:rounded-2xl">
            <div
              className="flex justify-center pt-2.5 pb-1 sm:hidden"
              aria-hidden="true"
            >
              <span className="h-1 w-10 rounded-full bg-slate-700" />
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/15 text-emerald-400">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-100">
                    Enviar presupuesto {waModalQuote.quoteNumber}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {waModalQuote.customerName} · {waModalQuote.customerPhone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWaModalQuote(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <textarea
                rows={10}
                value={waMessageText}
                onChange={(e) => setWaMessageText(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3.5 text-sm leading-relaxed text-slate-100 outline-none focus:border-emerald-500/70"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-800 bg-slate-950/90 px-5 pt-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:py-4">
              <button
                type="button"
                onClick={() => setWaModalQuote(null)}
                className="min-h-[44px] rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={sendingWa || !waMessageText.trim()}
                onClick={handleConfirmSendWa}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400 sm:min-h-[42px] sm:text-xs cursor-pointer"
              >
                <MessageCircle className="h-4 w-4" />
                Abrir WhatsApp y marcar enviado
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
