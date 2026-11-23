"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Phone,
  RotateCcw,
  X,
} from "lucide-react";
import { PlateBadge } from "@/components/PlateBadge";
import {
  buildDefaultWhatsAppMessage,
  buildWhatsAppUrl,
  formatShortDate,
  formatTimeAgoSpanish,
} from "@/lib/workshop";

export interface WhatsAppAlertPayload {
  repairId: number;
  licensePlate: string;
  brand: string;
  model: string;
  ownerName: string;
  ownerPhone: string;
  serviceType: string;
  serviceDate: string;
  reminderPreset?: string;
  reminderDueDate?: string | null;
  reminderStatus?: string;
}

interface WhatsAppModalProps {
  alert: WhatsAppAlertPayload | null;
  onClose: () => void;
  onMarkedNotified: () => void;
}

export function WhatsAppModal({
  alert,
  onClose,
  onMarkedNotified,
}: WhatsAppModalProps) {
  const [message, setMessage] = useState(() =>
    alert
      ? buildDefaultWhatsAppMessage({
          ownerName: alert.ownerName,
          serviceType: alert.serviceType,
          brand: alert.brand,
          model: alert.model,
          licensePlate: alert.licensePlate,
          serviceDate: alert.serviceDate,
          reminderPreset: alert.reminderPreset,
          reminderDueDate: alert.reminderDueDate,
        })
      : ""
  );
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!alert) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [alert, onClose]);

  if (!alert) return null;

  const waUrl = buildWhatsAppUrl(alert.ownerPhone, message);

  async function markNotified(openWhatsApp: boolean) {
    if (!alert) return;
    setSaving(true);
    setError(null);

    if (openWhatsApp) {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }

    try {
      const res = await fetch(`/api/alerts/${alert.repairId}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "notify" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo registrar el aviso.");
      }

      onMarkedNotified();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar el aviso."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  }

  function handleResetTemplate() {
    if (!alert) return;
    setMessage(
      buildDefaultWhatsAppMessage({
        ownerName: alert.ownerName,
        serviceType: alert.serviceType,
        brand: alert.brand,
        model: alert.model,
        licensePlate: alert.licensePlate,
        serviceDate: alert.serviceDate,
        reminderPreset: alert.reminderPreset,
        reminderDueDate: alert.reminderDueDate,
      })
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatsapp-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="gp-card w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/90 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="whatsapp-modal-title"
                className="text-base font-semibold text-slate-100"
              >
                Enviar recordatorio por WhatsApp
              </h2>
              <p className="text-xs text-slate-400">
                Editá el mensaje si hace falta antes de abrir WhatsApp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Context Summary */}
        <div className="space-y-4 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <PlateBadge plate={alert.licensePlate} size="sm" />
                <span className="text-sm font-semibold text-slate-100">
                  {alert.brand} {alert.model}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Último servicio:{" "}
                <span className="text-slate-200">{alert.serviceType}</span>{" "}
                <span className="tabular-nums text-slate-400">
                  ({formatShortDate(alert.serviceDate)} ·{" "}
                  {formatTimeAgoSpanish(alert.serviceDate)})
                </span>
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm font-medium text-slate-100">
                {alert.ownerName}
              </p>
              <p className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400 tabular-nums">
                <Phone className="h-3 w-3" />
                {alert.ownerPhone}
              </p>
            </div>
          </div>

          {/* Editable message */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="whatsapp-message-input"
                className="text-xs font-medium uppercase tracking-wider text-slate-400"
              >
                Mensaje prearmado
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetTemplate}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restaurar
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>

            <textarea
              id="whatsapp-message-input"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-slate-700/90 bg-slate-950/90 px-4 py-3 text-sm leading-relaxed text-slate-100 placeholder-slate-500 outline-none transition focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Escribí el mensaje para el cliente..."
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-col-reverse gap-2.5 border-t border-slate-800/90 bg-slate-950/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled={saving}
            onClick={() => markNotified(false)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 px-3.5 py-2.5 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800/80 hover:text-white disabled:opacity-50 cursor-pointer"
          >
            <Check className="h-4 w-4 text-emerald-400" />
            Solo marcar avisado
          </button>

          <button
            type="button"
            disabled={saving || !message.trim()}
            onClick={() => markNotified(true)}
            id="whatsapp-confirm-send-btn"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/15 transition hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <MessageCircle className="h-4 w-4" />
            <span>
              {saving ? "Registrando..." : "Abrir WhatsApp y marcar avisado"}
            </span>
            <ExternalLink className="h-3.5 w-3.5 opacity-80" />
          </button>
        </div>
      </div>
    </div>
  );
}
