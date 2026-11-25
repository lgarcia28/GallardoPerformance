"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  Trash2,
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
  const statusKey = (
    quote.status in QUOTE_STATUS_META ? quote.status : "draft"
  ) as QuoteStatus;
  const statusMeta = QUOTE_STATUS_META[statusKey];

  const issuedDateIso = quote.createdAt.slice(0, 10);
  const validUntilIso = addDaysToDate(issuedDateIso, quote.validityDays);

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
    <div className="space-y-5">
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
              Descargar PDF / Imprimir
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

      {/* Printable A4 Quote Document */}
      <article className="mx-auto max-w-[820px] overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl print:max-w-none print:rounded-none print:shadow-none">
        {/* Dark Brand Header Band (preserves white+red official logo cleanly in PDF) */}
        <header className="bg-[#0B0F19] px-6 py-6 text-white sm:px-8 sm:py-7 [print-color-adjust:exact]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-gallardo.png"
                alt={WORKSHOP_INFO.name}
                width={250}
                height={48}
                className="h-10 w-auto object-contain object-left sm:h-11"
              />
              <p className="max-w-md text-xs leading-relaxed text-slate-300">
                {WORKSHOP_INFO.description}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-slate-300">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-red-500" />
                  {WORKSHOP_INFO.address}
                </span>
                <span className="text-amber-400">
                  {WORKSHOP_INFO.instagramHandle}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/80 bg-slate-900/80 px-4 py-3 text-left sm:min-w-[200px] sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                Presupuesto
              </p>
              <p className="mt-0.5 font-mono text-2xl font-extrabold tracking-tight text-white tabular-nums">
                {quote.quoteNumber}
              </p>
              <div className="mt-2 space-y-0.5 font-mono text-[11px] text-slate-300 tabular-nums">
                <p>Fecha: {formatShortDate(issuedDateIso)}</p>
                <p>
                  Válido hasta:{" "}
                  <span className="font-semibold text-amber-300">
                    {formatShortDate(validUntilIso)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* White Document Body */}
        <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-7">
          {/* Client + Vehicle with Official Brand Emblem */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Client Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Datos del Cliente
              </p>
              <p className="mt-1.5 text-base font-bold text-slate-900">
                {quote.customerName}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs font-medium text-slate-600 tabular-nums">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                {quote.customerPhone}
              </p>
            </div>

            {/* Vehicle Card with Car Brand Logo */}
            <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <BrandLogo
                brandName={quote.brandName}
                brandSlug={quote.brandSlug}
                size="lg"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Vehículo
                </p>
                <p className="mt-0.5 text-base font-bold text-slate-900 leading-tight">
                  {quote.brandName} {quote.model}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs text-slate-600 tabular-nums">
                  <span>{formatMileage(quote.mileage)}</span>
                  {quote.licensePlate && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-bold tracking-wider text-slate-800">
                        {quote.licensePlate}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Repairs & Pricing Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="px-4 py-3 w-10 text-center">#</th>
                  <th className="px-4 py-3">Reparación / Repuesto</th>
                  <th className="px-3 py-3 text-center w-16">Cant.</th>
                  <th className="px-4 py-3 text-right w-28 sm:w-32">
                    Precio unit.
                  </th>
                  <th className="px-4 py-3 text-right w-28 sm:w-36">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {items.map((item, idx) => {
                  const subtotal = item.quantity * item.unitPrice;
                  return (
                    <tr key={`${item.description}-${idx}`}>
                      <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-400 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-900">
                        {item.description}
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono text-xs text-slate-700 tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-slate-900 tabular-nums">
                        {formatCurrency(subtotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Total Box + Notes */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1 space-y-2">
              {quote.notes && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Observaciones
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">
                    {quote.notes}
                  </p>
                </div>
              )}
              <p className="text-[11px] leading-relaxed text-slate-500">
                Valores expresados en pesos argentinos (ARS). Presupuesto válido
                por {quote.validityDays}{" "}
                {quote.validityDays === 1 ? "día" : "días"} desde la fecha de
                emisión.
              </p>
            </div>

            <div className="rounded-xl bg-[#0B0F19] px-6 py-4 text-right text-white sm:min-w-[240px] [print-color-adjust:exact]">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Total Presupuestado
              </p>
              <p className="mt-1 font-mono text-2xl font-extrabold tracking-tight text-white tabular-nums sm:text-3xl">
                {formatCurrency(quote.totalAmount)}
              </p>
            </div>
          </div>

          {/* Subtle Footer Signature */}
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">
              {WORKSHOP_INFO.name} · {WORKSHOP_INFO.address}
            </span>
            <span>Instagram: {WORKSHOP_INFO.instagramHandle}</span>
          </footer>
        </div>
      </article>
    </div>
  );
}
