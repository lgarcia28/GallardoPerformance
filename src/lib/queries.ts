import { getWorkshopRepository, type StorageMode } from "@/db";
import type { Repair, Vehicle } from "@/db/schema";
import {
  diffDaysFromToday,
  getAlertUrgency,
  type AlertUrgency,
} from "@/lib/workshop";

export interface AlertItem {
  repairId: number;
  vehicleId: number;
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  currentMileage: number;
  ownerName: string;
  ownerPhone: string;
  serviceType: string;
  serviceDate: string;
  mileageAtService: number;
  description: string;
  reminderPreset: string;
  reminderDueDate: string;
  reminderStatus: string;
  notifiedAt: string | null;
  daysUntilDue: number;
  urgency: AlertUrgency;
}

export interface DashboardData {
  storageMode: StorageMode;
  kpis: {
    totalVehicles: number;
    overdueCount: number;
    upcomingCount: number;
    notifiedThisMonthCount: number;
    repairsThisMonthCount: number;
  };
  alerts: AlertItem[];
  recentRepairs: Array<
    Repair & {
      licensePlate: string;
      brand: string;
      model: string;
      ownerName: string;
    }
  >;
}

export interface VehicleSummary extends Vehicle {
  repairCount: number;
  lastServiceDate: string | null;
  lastServiceType: string | null;
  nextAlert: {
    repairId: number;
    serviceType: string;
    serviceDate: string;
    reminderPreset: string;
    reminderDueDate: string;
    reminderStatus: string;
    notifiedAt: string | null;
    daysUntilDue: number;
    urgency: AlertUrgency;
  } | null;
}

export interface VehicleDetailData {
  vehicle: Vehicle;
  repairs: Repair[];
  nextAlert: AlertItem | null;
  totalSpent: number;
}

export interface RepairWithVehicle extends Repair {
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  ownerName: string;
  ownerPhone: string;
}

function isSameCurrentMonth(isoString: string | null | undefined): boolean {
  if (!isoString) return false;
  const now = new Date();
  const [y, m] = isoString.split("T")[0].split("-").map(Number);
  return y === now.getFullYear() && m === now.getMonth() + 1;
}

function urgencyRank(urgency: AlertUrgency): number {
  switch (urgency) {
    case "overdue":
      return 0;
    case "upcoming":
      return 1;
    case "notified":
      return 2;
    case "ok":
    default:
      return 3;
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const repo = await getWorkshopRepository();
  const [allVehicles, allRepairs] = await Promise.all([
    repo.listVehicles(),
    repo.listRepairs(),
  ]);

  const vehicleMap = new Map<number, Vehicle>(
    allVehicles.map((v) => [v.id, v])
  );

  const alerts: AlertItem[] = [];
  let overdueCount = 0;
  let upcomingCount = 0;
  let notifiedThisMonthCount = 0;
  let repairsThisMonthCount = 0;

  for (const r of allRepairs) {
    if (isSameCurrentMonth(r.serviceDate)) {
      repairsThisMonthCount += 1;
    }
    if (r.notifiedAt && isSameCurrentMonth(r.notifiedAt)) {
      notifiedThisMonthCount += 1;
    }

    if (
      !r.reminderDueDate ||
      r.reminderStatus === "none" ||
      r.reminderStatus === "completed"
    ) {
      continue;
    }

    const v = vehicleMap.get(r.vehicleId);
    if (!v) continue;

    const daysUntilDue = diffDaysFromToday(r.reminderDueDate);
    const urgency = getAlertUrgency(r.reminderDueDate, r.reminderStatus);

    if (urgency === "overdue") overdueCount += 1;
    if (urgency === "upcoming") upcomingCount += 1;

    alerts.push({
      repairId: r.id,
      vehicleId: v.id,
      licensePlate: v.licensePlate,
      brand: v.brand,
      model: v.model,
      year: v.year,
      currentMileage: v.currentMileage,
      ownerName: v.ownerName,
      ownerPhone: v.ownerPhone,
      serviceType: r.serviceType,
      serviceDate: r.serviceDate,
      mileageAtService: r.mileageAtService,
      description: r.description,
      reminderPreset: r.reminderPreset,
      reminderDueDate: r.reminderDueDate,
      reminderStatus: r.reminderStatus,
      notifiedAt: r.notifiedAt,
      daysUntilDue,
      urgency,
    });
  }

  alerts.sort((a, b) => {
    const rankDiff = urgencyRank(a.urgency) - urgencyRank(b.urgency);
    if (rankDiff !== 0) return rankDiff;
    return a.daysUntilDue - b.daysUntilDue;
  });

  const recentRepairs = allRepairs.slice(0, 6).flatMap((r) => {
    const v = vehicleMap.get(r.vehicleId);
    if (!v) return [];
    return [
      {
        ...r,
        licensePlate: v.licensePlate,
        brand: v.brand,
        model: v.model,
        ownerName: v.ownerName,
      },
    ];
  });

  return {
    storageMode: repo.storageMode,
    kpis: {
      totalVehicles: allVehicles.length,
      overdueCount,
      upcomingCount,
      notifiedThisMonthCount,
      repairsThisMonthCount,
    },
    alerts,
    recentRepairs,
  };
}

export async function getVehiclesWithSummary(
  query?: string
): Promise<VehicleSummary[]> {
  const repo = await getWorkshopRepository();
  const [allVehicles, allRepairs] = await Promise.all([
    repo.listVehicles(),
    repo.listRepairs(),
  ]);

  const repairsByVehicle = new Map<number, Repair[]>();
  for (const r of allRepairs) {
    const list = repairsByVehicle.get(r.vehicleId) ?? [];
    list.push(r);
    repairsByVehicle.set(r.vehicleId, list);
  }

  let summaries: VehicleSummary[] = allVehicles.map((v) => {
    const vRepairs = repairsByVehicle.get(v.id) ?? [];
    const lastRepair = vRepairs[0] ?? null;

    const activeAlerts = vRepairs
      .filter(
        (r) =>
          r.reminderDueDate &&
          r.reminderStatus !== "none" &&
          r.reminderStatus !== "completed"
      )
      .map((r) => ({
        repairId: r.id,
        serviceType: r.serviceType,
        serviceDate: r.serviceDate,
        reminderPreset: r.reminderPreset,
        reminderDueDate: r.reminderDueDate!,
        reminderStatus: r.reminderStatus,
        notifiedAt: r.notifiedAt,
        daysUntilDue: diffDaysFromToday(r.reminderDueDate!),
        urgency: getAlertUrgency(r.reminderDueDate, r.reminderStatus),
      }))
      .sort((a, b) => {
        const rankDiff = urgencyRank(a.urgency) - urgencyRank(b.urgency);
        if (rankDiff !== 0) return rankDiff;
        return a.daysUntilDue - b.daysUntilDue;
      });

    return {
      ...v,
      repairCount: vRepairs.length,
      lastServiceDate: lastRepair?.serviceDate ?? null,
      lastServiceType: lastRepair?.serviceType ?? null,
      nextAlert: activeAlerts[0] ?? null,
    };
  });

  if (query && query.trim().length > 0) {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    summaries = summaries.filter((v) => {
      const text =
        `${v.licensePlate} ${v.brand} ${v.model} ${v.year} ${v.ownerName} ${v.ownerPhone}`.toLowerCase();
      if (text.includes(q)) return true;
      if (qDigits.length >= 3) {
        return v.ownerPhone.replace(/\D/g, "").includes(qDigits);
      }
      return false;
    });
  }

  summaries.sort((a, b) => {
    const rankA = a.nextAlert ? urgencyRank(a.nextAlert.urgency) : 4;
    const rankB = b.nextAlert ? urgencyRank(b.nextAlert.urgency) : 4;
    if (rankA !== rankB) return rankA - rankB;
    return b.id - a.id;
  });

  return summaries;
}

export async function getVehicleDetail(
  id: number
): Promise<VehicleDetailData | null> {
  const repo = await getWorkshopRepository();
  const vehicle = await repo.getVehicleById(id);
  if (!vehicle) return null;

  const vehicleRepairs = await repo.listRepairsByVehicle(id);
  const totalSpent = vehicleRepairs.reduce((sum, r) => sum + (r.cost ?? 0), 0);

  const activeAlerts: AlertItem[] = vehicleRepairs
    .filter(
      (r) =>
        r.reminderDueDate &&
        r.reminderStatus !== "none" &&
        r.reminderStatus !== "completed"
    )
    .map((r) => ({
      repairId: r.id,
      vehicleId: vehicle.id,
      licensePlate: vehicle.licensePlate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      currentMileage: vehicle.currentMileage,
      ownerName: vehicle.ownerName,
      ownerPhone: vehicle.ownerPhone,
      serviceType: r.serviceType,
      serviceDate: r.serviceDate,
      mileageAtService: r.mileageAtService,
      description: r.description,
      reminderPreset: r.reminderPreset,
      reminderDueDate: r.reminderDueDate!,
      reminderStatus: r.reminderStatus,
      notifiedAt: r.notifiedAt,
      daysUntilDue: diffDaysFromToday(r.reminderDueDate!),
      urgency: getAlertUrgency(r.reminderDueDate, r.reminderStatus),
    }))
    .sort((a, b) => {
      const rankDiff = urgencyRank(a.urgency) - urgencyRank(b.urgency);
      if (rankDiff !== 0) return rankDiff;
      return a.daysUntilDue - b.daysUntilDue;
    });

  return {
    vehicle,
    repairs: vehicleRepairs,
    nextAlert: activeAlerts[0] ?? null,
    totalSpent,
  };
}

export async function getAllRepairsWithVehicle(
  query?: string
): Promise<RepairWithVehicle[]> {
  const repo = await getWorkshopRepository();
  const [allVehicles, allRepairs] = await Promise.all([
    repo.listVehicles(),
    repo.listRepairs(),
  ]);

  const vehicleMap = new Map<number, Vehicle>(
    allVehicles.map((v) => [v.id, v])
  );

  let list: RepairWithVehicle[] = allRepairs.flatMap((r) => {
    const v = vehicleMap.get(r.vehicleId);
    if (!v) return [];
    return [
      {
        ...r,
        licensePlate: v.licensePlate,
        brand: v.brand,
        model: v.model,
        year: v.year,
        ownerName: v.ownerName,
        ownerPhone: v.ownerPhone,
      },
    ];
  });

  if (query && query.trim().length > 0) {
    const q = query.trim().toLowerCase();
    list = list.filter((item) => {
      const text =
        `${item.licensePlate} ${item.brand} ${item.model} ${item.ownerName} ${item.serviceType} ${item.description} ${item.mechanicNotes ?? ""}`.toLowerCase();
      return text.includes(q);
    });
  }

  return list;
}

export interface FinanceRepairRow {
  id: number;
  vehicleId: number;
  licensePlate: string;
  brand: string;
  model: string;
  ownerName: string;
  serviceDate: string;
  serviceType: string;
  description: string;
  revenue: number;
  partsCost: number;
  profit: number;
  marginPct: number | null;
  hasCostEntered: boolean;
  hasPartsCostEntered: boolean;
}

export interface ServiceFinanceBreakdown {
  serviceType: string;
  count: number;
  revenue: number;
  partsCost: number;
  profit: number;
}

export interface FinancesData {
  from: string | null;
  to: string | null;
  summary: {
    uniqueVehiclesCount: number;
    repairsCount: number;
    totalRevenue: number;
    totalPartsCost: number;
    totalProfit: number;
    profitMarginPct: number | null;
    averageTicket: number;
  };
  byServiceType: ServiceFinanceBreakdown[];
  repairs: FinanceRepairRow[];
}

export async function getFinancesData(
  from?: string,
  to?: string
): Promise<FinancesData> {
  const repo = await getWorkshopRepository();
  const [allVehicles, allRepairs] = await Promise.all([
    repo.listVehicles(),
    repo.listRepairs(),
  ]);

  const vehicleMap = new Map<number, Vehicle>(
    allVehicles.map((v) => [v.id, v])
  );

  const normalizedFrom =
    from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : null;
  const normalizedTo = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : null;

  const filteredRepairs = allRepairs.filter((r) => {
    const day = r.serviceDate.slice(0, 10);
    if (normalizedFrom && day < normalizedFrom) return false;
    if (normalizedTo && day > normalizedTo) return false;
    return true;
  });

  const uniqueVehicleIds = new Set<number>();
  let totalRevenue = 0;
  let totalPartsCost = 0;

  const serviceMap = new Map<string, ServiceFinanceBreakdown>();
  const rows: FinanceRepairRow[] = [];

  for (const r of filteredRepairs) {
    const v = vehicleMap.get(r.vehicleId);
    if (!v) continue;

    uniqueVehicleIds.add(v.id);

    const revenue = r.cost ?? 0;
    const partsCost = r.partsCost ?? 0;
    const profit = revenue - partsCost;
    const marginPct =
      revenue > 0 ? Math.round((profit / revenue) * 100) : null;

    totalRevenue += revenue;
    totalPartsCost += partsCost;

    rows.push({
      id: r.id,
      vehicleId: v.id,
      licensePlate: v.licensePlate,
      brand: v.brand,
      model: v.model,
      ownerName: v.ownerName,
      serviceDate: r.serviceDate,
      serviceType: r.serviceType,
      description: r.description,
      revenue,
      partsCost,
      profit,
      marginPct,
      hasCostEntered: r.cost !== null && r.cost !== undefined,
      hasPartsCostEntered: r.partsCost !== null && r.partsCost !== undefined,
    });

    const existingGroup = serviceMap.get(r.serviceType);
    if (existingGroup) {
      existingGroup.count += 1;
      existingGroup.revenue += revenue;
      existingGroup.partsCost += partsCost;
      existingGroup.profit += profit;
    } else {
      serviceMap.set(r.serviceType, {
        serviceType: r.serviceType,
        count: 1,
        revenue,
        partsCost,
        profit,
      });
    }
  }

  const totalProfit = totalRevenue - totalPartsCost;
  const profitMarginPct =
    totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : null;
  const averageTicket =
    rows.length > 0 ? Math.round(totalRevenue / rows.length) : 0;

  const byServiceType = Array.from(serviceMap.values()).sort(
    (a, b) => b.profit - a.profit || b.revenue - a.revenue
  );

  return {
    from: normalizedFrom,
    to: normalizedTo,
    summary: {
      uniqueVehiclesCount: uniqueVehicleIds.size,
      repairsCount: rows.length,
      totalRevenue,
      totalPartsCost,
      totalProfit,
      profitMarginPct,
      averageTicket,
    },
    byServiceType,
    repairs: rows,
  };
}
