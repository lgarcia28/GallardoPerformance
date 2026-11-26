export const WORKSHOP_INFO = {
  name: "GallardoPerformance",
  description:
    "Taller mecánico dedicado al mantenimiento, diagnóstico y mejoras para que tu auto funcione siempre al máximo.",
  shortTagline: "Mantenimiento, diagnóstico y mejoras",
  address: "Humberto Primo 820, Rosario 2000",
  shortAddress: "Humberto Primo 820, Rosario",
  instagramHandle: "@gallardoperformance",
  instagramUrl: "https://www.instagram.com/gallardoperformance/?hl=es",
  whatsappNumber: "5493412122472",
  whatsappDisplay: "+54 9 341 212-2472",
  whatsappUrl:
    "https://wa.me/5493412122472?text=Hola%20GallardoPerformance!%20Quisiera%20hacer%20una%20consulta.",
  defaultPhonePrefix: "+54 9 341 ",
} as const;

export type ReminderPreset =
  | "1_year"
  | "6_months"
  | "3_months"
  | "custom"
  | "none";

export type ReminderStatus = "none" | "pending" | "notified" | "completed";

export type AlertUrgency = "overdue" | "upcoming" | "notified" | "ok";

export const SERVICE_TYPES = [
  "Cambio de aceite y filtros",
  "Frenos",
  "Distribución",
  "Tren delantero",
  "Embrague",
  "Diagnóstico electrónico",
  "Alineación y balanceo",
  "Batería / Electricidad",
  "Refrigeración / Radiador",
  "Otro",
] as const;

export const REMINDER_PRESETS: Array<{
  value: ReminderPreset;
  label: string;
  shortLabel: string;
}> = [
  {
    value: "1_year",
    label: "En 1 año (Cambio de aceite)",
    shortLabel: "1 año",
  },
  {
    value: "6_months",
    label: "En 6 meses",
    shortLabel: "6 meses",
  },
  {
    value: "3_months",
    label: "En 3 meses",
    shortLabel: "3 meses",
  },
  {
    value: "custom",
    label: "Fecha personalizada",
    shortLabel: "Personalizada",
  },
  {
    value: "none",
    label: "Sin recordatorio",
    shortLabel: "Sin alerta",
  },
];

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getTodayISO(): string {
  return formatDateISO(new Date());
}

export function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("T")[0].split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDaysToDate(isoDate: string, days: number): string {
  const d = parseLocalDate(isoDate);
  d.setDate(d.getDate() + days);
  return formatDateISO(d);
}

export function addMonthsToDate(isoDate: string, months: number): string {
  const d = parseLocalDate(isoDate);
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + months);
  // Handle end-of-month rollover (e.g., Jan 31 + 1 month)
  if (d.getDate() < originalDay) {
    d.setDate(0);
  }
  return formatDateISO(d);
}

export function computeReminderDueDate(
  serviceDate: string,
  preset: ReminderPreset,
  customDate?: string | null
): string | null {
  if (!serviceDate) return null;
  switch (preset) {
    case "1_year":
      return addMonthsToDate(serviceDate, 12);
    case "6_months":
      return addMonthsToDate(serviceDate, 6);
    case "3_months":
      return addMonthsToDate(serviceDate, 3);
    case "custom":
      return customDate && /^\d{4}-\d{2}-\d{2}$/.test(customDate)
        ? customDate
        : null;
    case "none":
    default:
      return null;
  }
}

export function diffDaysFromToday(targetIsoDate: string): number {
  const today = parseLocalDate(getTodayISO());
  const target = parseLocalDate(targetIsoDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((target.getTime() - today.getTime()) / msPerDay);
}

export function getAlertUrgency(
  reminderDueDate: string | null,
  reminderStatus: string
): AlertUrgency {
  if (!reminderDueDate || reminderStatus === "none" || reminderStatus === "completed") {
    return "ok";
  }
  if (reminderStatus === "notified") {
    return "notified";
  }
  const daysUntilDue = diffDaysFromToday(reminderDueDate);
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 30) return "upcoming";
  return "ok";
}

export function formatDueBadgeLabel(
  reminderDueDate: string | null,
  reminderStatus: string,
  notifiedAt?: string | null
): string {
  if (!reminderDueDate || reminderStatus === "none") return "Sin recordatorio";
  if (reminderStatus === "completed") return "Completado";

  if (reminderStatus === "notified") {
    if (notifiedAt) {
      const notifiedDays = Math.abs(diffDaysFromToday(notifiedAt.split("T")[0]));
      if (notifiedDays === 0) return "Avisado hoy";
      if (notifiedDays === 1) return "Avisado ayer";
      return `Avisado hace ${notifiedDays} días`;
    }
    return "Ya avisado";
  }

  const daysUntilDue = diffDaysFromToday(reminderDueDate);
  if (daysUntilDue < 0) {
    const overdueDays = Math.abs(daysUntilDue);
    return overdueDays === 1
      ? "Vencido hace 1 día"
      : `Vencido hace ${overdueDays} días`;
  }
  if (daysUntilDue === 0) return "Vence hoy";
  if (daysUntilDue === 1) return "Vence mañana";
  if (daysUntilDue <= 30) return `Vence en ${daysUntilDue} días`;

  const months = Math.round(daysUntilDue / 30);
  if (months >= 12) return "En 1 año";
  return `En ${months} ${months === 1 ? "mes" : "meses"}`;
}

export function formatTimeAgoSpanish(isoDate: string): string {
  const daysAgo = -diffDaysFromToday(isoDate);
  if (daysAgo <= 0) return "hoy";
  if (daysAgo === 1) return "hace 1 día";
  if (daysAgo < 30) return `hace ${daysAgo} días`;

  const totalMonths = Math.floor(daysAgo / 30);
  if (totalMonths < 12) {
    return totalMonths === 1 ? "hace 1 mes" : `hace ${totalMonths} meses`;
  }

  const years = Math.floor(daysAgo / 365);
  const remainingDays = daysAgo - years * 365;
  if (remainingDays <= 7) {
    return years === 1 ? "hace 1 año" : `hace ${years} años`;
  }
  const remMonths = Math.floor(remainingDays / 30);
  if (remMonths >= 1) {
    return years === 1
      ? `hace 1 año y ${remMonths} ${remMonths === 1 ? "mes" : "meses"}`
      : `hace ${years} años y ${remMonths} ${remMonths === 1 ? "mes" : "meses"}`;
  }
  return years === 1
    ? `hace 1 año y ${remainingDays} días`
    : `hace ${years} años y ${remainingDays} días`;
}

export function formatShortDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const d = parseLocalDate(isoDate);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatMileage(km: number | null | undefined): string {
  if (km == null || Number.isNaN(km)) return "—";
  return `${new Intl.NumberFormat("es-AR").format(km)} km`;
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function normalizeLicensePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/\s+/g, " ");
}

export function matchesWorkshopQuery(
  query: string,
  fields: Array<string | number | null | undefined>,
  options?: { plate?: string | null; phone?: string | null }
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = fields
    .filter((f) => f !== null && f !== undefined)
    .map((f) => String(f))
    .join(" ")
    .toLowerCase();
  if (haystack.includes(q)) return true;

  const compactQ = q.replace(/[^a-z0-9]/g, "");
  if (compactQ.length >= 2 && options?.plate) {
    const compactPlate = options.plate.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (compactPlate.includes(compactQ)) return true;
  }

  const qDigits = q.replace(/\D/g, "");
  if (qDigits.length >= 3 && options?.phone) {
    const phoneDigits = options.phone.replace(/\D/g, "");
    if (phoneDigits.includes(qDigits)) return true;
  }

  return false;
}

export function normalizeWhatsAppDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // If user entered a 10-digit Argentine local mobile without country code (e.g. 1154328810), prepend 549
  if (digits.length === 10 && !digits.startsWith("54")) {
    return `549${digits}`;
  }
  return digits;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = normalizeWhatsAppDigits(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildDefaultWhatsAppMessage(params: {
  ownerName: string;
  serviceType: string;
  brand: string;
  model: string;
  licensePlate: string;
  serviceDate: string;
  reminderPreset?: string;
  reminderDueDate?: string | null;
}): string {
  const firstName = params.ownerName.trim().split(/\s+/)[0] || params.ownerName;
  const serviceLower = params.serviceType.toLowerCase();
  const vehicleLabel = `${params.brand} ${params.model}`;

  const daysUntilDue = params.reminderDueDate
    ? diffDaysFromToday(params.reminderDueDate)
    : 0;

  let elapsedText = "1 año";
  if (params.reminderPreset === "6_months") {
    elapsedText = "6 meses";
  } else if (params.reminderPreset === "3_months") {
    elapsedText = "3 meses";
  } else if (params.reminderPreset === "custom") {
    elapsedText = formatTimeAgoSpanish(params.serviceDate).replace(/^hace\s+/, "");
  }

  if (daysUntilDue > 0 && daysUntilDue <= 30) {
    return `Hola ${firstName}, te escribimos desde ${WORKSHOP_INFO.name} (${WORKSHOP_INFO.shortAddress}) para recordarte que en ${daysUntilDue} ${
      daysUntilDue === 1 ? "día" : "días"
    } se cumple ${elapsedText === "1 año" ? "1 año" : elapsedText} desde el último ${serviceLower} de tu ${vehicleLabel} (${params.licensePlate}). ¿Querés que coordinemos un turno?`;
  }

  return `Hola ${firstName}, te escribimos desde ${WORKSHOP_INFO.name} (${WORKSHOP_INFO.shortAddress}) para recordarte que ya pasó ${elapsedText} desde el último ${serviceLower} de tu ${vehicleLabel} (${params.licensePlate}). ¿Querés que coordinemos un turno?`;
}

export type AppointmentStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export const APPOINTMENT_STATUS_META: Record<
  AppointmentStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  scheduled: {
    label: "Agendado",
    dotClass: "bg-amber-400",
    badgeClass: "bg-amber-500/12 text-amber-300 border-amber-500/30",
  },
  in_progress: {
    label: "En taller",
    dotClass: "bg-sky-400",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  completed: {
    label: "Completado",
    dotClass: "bg-emerald-400",
    badgeClass: "bg-emerald-500/12 text-emerald-300 border-emerald-500/30",
  },
  cancelled: {
    label: "Cancelado",
    dotClass: "bg-slate-500",
    badgeClass: "bg-slate-500/12 text-slate-400 border-slate-700",
  },
};

export const WORKSHOP_TIME_SLOTS = [
  "08:00",
  "08:30",
  "09:00",
  "10:00",
  "11:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
] as const;

export function formatLongDateSpanish(isoDate: string): string {
  const d = parseLocalDate(isoDate);
  const formatted = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function buildAppointmentWhatsAppMessage(params: {
  ownerName: string;
  appointmentDate: string;
  appointmentTime: string;
  vehicleLabel: string;
  licensePlate: string;
  serviceType: string;
}): string {
  const firstName = params.ownerName.trim().split(/\s+/)[0] || params.ownerName;
  const dateLabel = formatLongDateSpanish(params.appointmentDate).toLowerCase();
  return `Hola ${firstName}, te confirmamos tu turno en ${WORKSHOP_INFO.name} (${WORKSHOP_INFO.shortAddress}) para el ${dateLabel} a las ${params.appointmentTime} hs con tu ${params.vehicleLabel} (${params.licensePlate}) — ${params.serviceType}. ¡Te esperamos!`;
}

export const DEFAULT_CAR_BRANDS: Array<{ name: string; slug: string }> = [
  { name: "Volkswagen", slug: "volkswagen" },
  { name: "Ford", slug: "ford" },
  { name: "Chevrolet", slug: "chevrolet" },
  { name: "Toyota", slug: "toyota" },
  { name: "Renault", slug: "renault" },
  { name: "Peugeot", slug: "peugeot" },
  { name: "Fiat", slug: "fiat" },
  { name: "Honda", slug: "honda" },
  { name: "Citroën", slug: "citroen" },
  { name: "Audi", slug: "audi" },
  { name: "BMW", slug: "bmw" },
  { name: "Mercedes-Benz", slug: "mercedes-benz" },
  { name: "Nissan", slug: "nissan" },
  { name: "Jeep", slug: "jeep" },
  { name: "Hyundai", slug: "hyundai" },
  { name: "Kia", slug: "kia" },
  { name: "Suzuki", slug: "suzuki" },
  { name: "RAM", slug: "ram" },
  { name: "Chery", slug: "chery" },
];

export const BRAND_LOGO_SLUGS = new Set(DEFAULT_CAR_BRANDS.map((b) => b.slug));

export function slugifyBrandName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getBrandLogoUrl(
  brandSlug?: string | null,
  brandName?: string | null
): string | null {
  const candidate =
    (brandSlug && brandSlug.trim().toLowerCase()) ||
    (brandName ? slugifyBrandName(brandName) : "");
  if (candidate && BRAND_LOGO_SLUGS.has(candidate)) {
    return `/brands/${candidate}.svg`;
  }
  return null;
}

export interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export type QuoteStatus = "draft" | "sent" | "approved" | "rejected";

export const QUOTE_STATUS_META: Record<
  QuoteStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  draft: {
    label: "Borrador",
    dotClass: "bg-slate-400",
    badgeClass: "bg-slate-500/15 text-slate-300 border-slate-700",
  },
  sent: {
    label: "Enviado",
    dotClass: "bg-sky-400",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  approved: {
    label: "Aprobado",
    dotClass: "bg-emerald-400",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  rejected: {
    label: "Rechazado",
    dotClass: "bg-red-400",
    badgeClass: "bg-red-500/12 text-red-400 border-red-500/30",
  },
};

export function parseQuoteItems(itemsJson: string): QuoteItem[] {
  try {
    const parsed = JSON.parse(itemsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        description: String(item?.description ?? "").trim(),
        quantity: Math.max(1, Number(item?.quantity) || 1),
        unitPrice: Math.max(0, Math.round(Number(item?.unitPrice) || 0)),
      }))
      .filter((item) => item.description.length > 0);
  } catch {
    return [];
  }
}

export function calculateQuoteTotal(items: QuoteItem[]): number {
  return items.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unitPrice),
    0
  );
}

export function buildQuoteWhatsAppMessage(params: {
  quoteNumber: string;
  customerName: string;
  brandName: string;
  model: string;
  licensePlate?: string | null;
  mileage: number;
  items: QuoteItem[];
  totalAmount: number;
  validityDays: number;
  notes?: string | null;
}): string {
  const firstName =
    params.customerName.trim().split(/\s+/)[0] || params.customerName;
  const platePart = params.licensePlate ? ` (${params.licensePlate})` : "";
  const lines = params.items.map((item) => {
    const sub = item.quantity * item.unitPrice;
    const qtyPrefix = item.quantity > 1 ? `${item.quantity}x ` : "";
    return `• ${qtyPrefix}${item.description}: ${formatCurrency(sub)}`;
  });

  const parts = [
    `Hola ${firstName}, te pasamos el presupuesto *${params.quoteNumber}* desde *${WORKSHOP_INFO.name}* (${WORKSHOP_INFO.shortAddress}):`,
    "",
    `🚗 *Vehículo:* ${params.brandName} ${params.model}${platePart}`,
    `📍 *Kilometraje:* ${formatMileage(params.mileage)}`,
    "",
    `*Detalle de trabajos:*`,
    ...lines,
    "",
    `💰 *Total estimado:* ${formatCurrency(params.totalAmount)}`,
    `⏳ *Validez:* ${params.validityDays} días`,
  ];

  if (params.notes && params.notes.trim()) {
    parts.push(`📝 *Nota:* ${params.notes.trim()}`);
  }

  parts.push("", "¿Querés que coordinemos un turno para ingresarlo?");
  return parts.join("\n");
}
