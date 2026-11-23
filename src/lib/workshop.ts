export const WORKSHOP_INFO = {
  name: "GallardoPerformance",
  description:
    "Taller mecánico dedicado al mantenimiento, diagnóstico y mejoras para que tu auto funcione siempre al máximo.",
  shortTagline: "Mantenimiento, diagnóstico y mejoras",
  address: "Humberto Primo 820, Rosario 2000",
  shortAddress: "Humberto Primo 820, Rosario",
  instagramHandle: "@gallardoperformance",
  instagramUrl: "https://www.instagram.com/gallardoperformance/?hl=es",
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
