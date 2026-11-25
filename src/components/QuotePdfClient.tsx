"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Gauge,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  Trash2,
  User,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useWorkshopUI } from "@/components/WorkshopShell";
import type { Quote } from "@/db/schema";
import {
  addDaysToDate,
  buildQuoteWhatsAppMessage,
  buildWhatsAppUrl,
  formatCurrency,
  formatMileage,
  formatShortDate,
  parseQuoteItems,
  QUOTE_STATUS_META,
  WORKSHOP_INFO,
  type QuoteStatus,
} from "@/lib/workshop";

interface QuotePdfClientProps {
  initialQuote: Quote;
}

export function QuotePdfClient({ initialQuote }: QuotePdfClientProps) {
  const router = useRouter();
  const { showToast } = useWorkshopUI();
  const [quote, setQuote] = useState<Quote>(initialQuote);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const items = parseQuoteItems(quote.itemsJson);
  const isCompactTable = items.length > 7;
  const statusKey = (
    quote.status in QUOTE_STATUS_META ? quote.status : "draft"
  ) as QuoteStatus;
  const statusMeta = QUOTE_STATUS_META[statusKey];

  const issuedDateIso = quote.createdAt.slice(0, 10);
  const validUntilIso = addDaysToDate(issuedDateIso, quote.validityDays);

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  const waMessage = buildQuoteWhatsAppMessage({
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
  const waUrl = buildWhatsAppUrl(quote.customerPhone, waMessage);

  async function handleStatusChange(nextStatus: QuoteStatus) {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        const json = await res.json();
        setQuote(json.quote);
        showToast(
          `Presupuesto marcado como "${QUOTE_STATUS_META[nextStatus].label}".`
        );
        window.dispatchEvent(new CustomEvent("gallardo:data-changed"));
      }
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleSendWhatsApp() {
    window.open(waUrl, "_blank", "noopener,noreferrer");
    if (quote.status === "draft") {
      await handleStatusChange("sent");
    }
  }

  async function handleDelete() {
    const ok = window.confirm(
      `¿Eliminar el presupuesto ${quote.quoteNumber} de ${quote.customerName}?`
    );
    if (!ok) return;
    const res = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Presupuesto eliminado.");
      window.dispatchEvent(new CustomEvent("gallardo:data-changed"));
      router.push("/presupuestos");
      router.refresh();
    }
  }

  function handlePrintPdf() {
    window.print();
  }

  return (
    <div className="space-y-5 print:space-y-0">
      {/* Screen-only Action Toolbar */}
      <div className="space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/presupuestos"
            className="inline-flex min-h-[38px] items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Presupuestos
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/15 transition hover:bg-emerald-400 cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar WhatsApp
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </button>

            <button
              type="button"
              id="quote-print-pdf-btn"
              onClick={handlePrintPdf}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/15 transition hover:bg-amber-400 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Descargar PDF / Imprimir (A4)
            </button>

            <Link
              href="/turnos"
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
            >
              <CalendarDays className="h-4 w-4 text-amber-400" />
              Agendar turno
            </Link>

            <button
              type="button"
              onClick={handleDelete}
              title="Eliminar presupuesto"
              className="inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl border border-red-500/25 bg-red-500/8 text-red-400 transition hover:bg-red-500/15 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Status Quick Bar */}
        <div className="gp-card flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Estado:</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusMeta.badgeClass}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`}
              />
              {statusMeta.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(["draft", "sent", "approved", "rejected"] as QuoteStatus[]).map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  disabled={updatingStatus || quote.status === st}
                  onClick={() => handleStatusChange(st)}
                  className={`min-h-[34px] rounded-lg border px-2.5 py-1 text-xs font-semibold transition cursor-pointer disabled:opacity-45 ${
                    quote.status === st
                      ? QUOTE_STATUS_META[st].badgeClass
                      : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {QUOTE_STATUS_META[st].label}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Single-Page A4 Motorsport Dealership Quote Sheet */}
      <article
        id="quote-pdf-sheet"
        className="mx-auto flex max-w-[794px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl print:max-w-none print:rounded-none print:shadow-none"
      >
        <div>
          {/* Top Crimson Racing Accent Bar */}
          <div
            className="h-1.5 w-full bg-gradient-to-r from-red-600 via-red-500 to-amber-500 [print-color-adjust:exact]"
            aria-hidden="true"
          />

          {/* Dark Carbon Header */}
          <header className="bg-[#0A0D14] px-6 py-5 text-white sm:px-8 sm:py-6 print:px-7 print:py-5 [print-color-adjust:exact]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:flex-row print:items-center print:justify-between">
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-gallardo.png"
                  alt={WORKSHOP_INFO.name}
                  width={235}
                  height={45}
                  className="h-9 w-auto object-contain object-left sm:h-10 print:h-9"
                />
                <p className="text-[11px] font-medium tracking-wide text-slate-300">
                  Mantenimiento · Diagnóstico · Mejoras de Performance
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1 text-slate-200">
                    <MapPin className="h-3 w-3 text-red-500" />
                    {WORKSHOP_INFO.address}
                  </span>
                  <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3 w-3"
                      aria-hidden="true"
                    >
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                    </svg>
                    {WORKSHOP_INFO.instagramHandle}
                  </span>
                </div>
              </div>

              {/* Quote Number & Dates Box */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-700/80 bg-slate-900/85 px-4 py-3 sm:min-w-[215px] print:min-w-[205px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-red-400">
                    Presupuesto
                  </span>
                  <span className="rounded bg-red-600/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-300 border border-red-500/30">
                    ARS
                  </span>
                </div>
                <p className="mt-1 font-mono text-2xl font-extrabold tracking-tight text-white tabular-nums leading-none">
                  {quote.quoteNumber}
                </p>
                <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-slate-800 pt-2 font-mono text-[10px] tabular-nums">
                  <div>
                    <p className="uppercase text-slate-500">Emisión</p>
                    <p className="mt-0.5 font-semibold text-slate-200">
                      {formatShortDate(issuedDateIso)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="uppercase text-slate-500">Válido hasta</p>
                    <p className="mt-0.5 font-semibold text-amber-300">
                      {formatShortDate(validUntilIso)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main White Body */}
          <div className="space-y-5 px-6 py-5 sm:px-8 sm:py-6 print:space-y-4 print:px-7 print:py-5">
            {/* Client & Vehicle Architectural Cards */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-12 print:grid-cols-12">
              {/* Client Info (5 cols) */}
              <div className="rounded-xl border border-slate-200 border-l-4 border-l-slate-900 bg-slate-50/70 px-4 py-3.5 sm:col-span-5 print:col-span-5 [print-color-adjust:exact]">
                <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <User className="h-3 w-3 text-slate-400" />
                  Cliente
                </p>
                <p className="mt-1 text-[15px] font-extrabold text-slate-900 leading-snug">
                  {quote.customerName}
                </p>
                <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs font-medium text-slate-600 tabular-nums">
                  <Phone className="h-3 w-3 text-slate-400" />
                  {quote.customerPhone}
                </p>
              </div>

              {/* Vehicle Info with Official Brand Logo (7 cols) */}
              <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 border-l-4 border-l-red-600 bg-slate-50/70 px-4 py-3.5 sm:col-span-7 print:col-span-7 [print-color-adjust:exact]">
                <BrandLogo
                  brandName={quote.brandName}
                  brandSlug={quote.brandSlug}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Vehículo
                  </p>
                  <p className="mt-0.5 truncate text-[15px] font-extrabold text-slate-900 leading-snug">
                    {quote.brandName}{" "}
                    <span className="font-semibold text-slate-700">
                      {quote.model}
                    </span>
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px] tabular-nums">
                    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-700">
                      <Gauge className="h-3 w-3 text-slate-400" />
                      {formatMileage(quote.mileage)}
                    </span>

                    {quote.licensePlate && (
                      <span className="inline-flex flex-col overflow-hidden rounded border border-slate-700 bg-slate-900 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white [print-color-adjust:exact]">
                        <span className="h-[2px] w-full bg-sky-500" />
                        <span className="px-2 py-0.5 leading-none">
                          {quote.licensePlate}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Repairs & Pricing Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-900 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-100 [print-color-adjust:exact]">
                    <th className="w-9 px-3 py-2.5 text-center">#</th>
                    <th className="px-3.5 py-2.5">
                      Detalle de reparación / repuesto
                    </th>
                    <th className="w-14 px-2 py-2.5 text-center">Cant.</th>
                    <th className="w-28 px-3.5 py-2.5 text-right">
                      P. Unitario
                    </th>
                    <th className="w-28 px-3.5 py-2.5 text-right sm:w-32">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, idx) => {
                    const subtotal = item.quantity * item.unitPrice;
                    const cellY = isCompactTable ? "py-2" : "py-2.5";
                    return (
                      <tr
                        key={`${item.description}-${idx}`}
                        className="even:bg-slate-50/80 [print-color-adjust:exact]"
                      >
                        <td
                          className={`px-3 ${cellY} text-center font-mono text-[11px] font-semibold text-slate-400 tabular-nums`}
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </td>
                        <td
                          className={`px-3.5 ${cellY} text-xs font-medium text-slate-800 sm:text-[13px]`}
                        >
                          {item.description}
                        </td>
                        <td
                          className={`px-2 ${cellY} text-center font-mono text-xs font-semibold text-slate-700 tabular-nums`}
                        >
                          {item.quantity}
                        </td>
                        <td
                          className={`px-3.5 ${cellY} text-right font-mono text-xs text-slate-600 tabular-nums`}
                        >
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td
                          className={`px-3.5 ${cellY} text-right font-mono text-xs font-bold text-slate-900 tabular-nums sm:text-[13px]`}
                        >
                          {formatCurrency(subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Row: Notes Left + Total Card Right */}
            <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-12 sm:items-stretch print:grid-cols-12">
              <div className="flex flex-col justify-between gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:col-span-7 print:col-span-7 [print-color-adjust:exact]">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                    Observaciones y condiciones
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">
                    {quote.notes?.trim() ||
                      "Presupuesto sujeto a revisión técnica al momento del desarme."}
                  </p>
                </div>
                <p className="border-t border-slate-200/80 pt-2 text-[10px] leading-relaxed text-slate-500">
                  Precios expresados en Pesos Argentinos (ARS). Válido por{" "}
                  <strong className="text-slate-700">
                    {quote.validityDays}{" "}
                    {quote.validityDays === 1 ? "día" : "días"}
                  </strong>{" "}
                  desde su emisión. Documento no válido como factura fiscal.
                </p>
              </div>

              {/* Total Box */}
              <div className="flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800 bg-[#0A0D14] text-white sm:col-span-5 print:col-span-5 [print-color-adjust:exact]">
                <div className="space-y-1.5 border-b border-slate-800 px-4 py-3 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Ítems presupuestados</span>
                    <span className="font-mono font-semibold text-slate-200 tabular-nums">
                      {items.length} ({totalUnits}{" "}
                      {totalUnits === 1 ? "unidad" : "unidades"})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Subtotal trabajos</span>
                    <span className="font-mono font-semibold text-slate-200 tabular-nums">
                      {formatCurrency(quote.totalAmount)}
                    </span>
                  </div>
                </div>

                <div className="border-l-4 border-red-600 bg-slate-900/90 px-4 py-3.5 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-400">
                    Total Final
                  </p>
                  <p className="mt-0.5 font-mono text-2xl font-extrabold tracking-tight text-white tabular-nums">
                    {formatCurrency(quote.totalAmount)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom A4 Footer with Client Approval Line */}
        <footer className="mt-2 border-t border-slate-200 bg-slate-50/80 px-6 py-4 sm:px-8 print:mt-auto print:px-7 print:py-3.5 [print-color-adjust:exact]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:flex-row print:items-end print:justify-between">
            <div className="space-y-0.5 text-[10px] text-slate-500">
              <p className="text-xs font-extrabold tracking-tight text-slate-900">
                {WORKSHOP_INFO.name}
              </p>
              <p>
                {WORKSHOP_INFO.address} · Instagram:{" "}
                {WORKSHOP_INFO.instagramHandle}
              </p>
            </div>

            <div className="flex gap-6 pt-1">
              <div className="w-36 border-t border-slate-400 pt-1 text-center text-[10px] font-medium text-slate-500">
                Firma del Taller
              </div>
              <div className="w-40 border-t border-slate-400 pt-1 text-center text-[10px] font-medium text-slate-500">
                Conformidad del Cliente
              </div>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}
