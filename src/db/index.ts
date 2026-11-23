import type { D1Database } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import {
  repairs,
  vehicles,
  type NewRepair,
  type NewVehicle,
  type Repair,
  type Vehicle,
} from "./schema";
import { getInitialSeedPayload } from "./seed-data";

export type StorageMode = "d1" | "memory";

export interface WorkshopRepository {
  storageMode: StorageMode;
  listVehicles(): Promise<Vehicle[]>;
  getVehicleById(id: number): Promise<Vehicle | null>;
  createVehicle(
    input: Omit<NewVehicle, "id">,
    initialRepair?: Omit<NewRepair, "id" | "vehicleId"> | null
  ): Promise<{ vehicle: Vehicle; repair: Repair | null }>;
  updateVehicle(
    id: number,
    updates: Partial<NewVehicle>
  ): Promise<Vehicle | null>;
  deleteVehicle(id: number): Promise<boolean>;
  listRepairs(): Promise<Repair[]>;
  listRepairsByVehicle(vehicleId: number): Promise<Repair[]>;
  getRepairById(id: number): Promise<Repair | null>;
  createRepair(input: Omit<NewRepair, "id">): Promise<Repair>;
  updateRepair(
    id: number,
    updates: Partial<NewRepair>
  ): Promise<Repair | null>;
  deleteRepair(id: number): Promise<boolean>;
}

const d1InitializedMap = new WeakMap<D1Database, Promise<void>>();

async function ensureD1Ready(d1: D1Database) {
  let promise = d1InitializedMap.get(d1);
  if (!promise) {
    promise = (async () => {
      await d1.batch([
        d1.prepare(`
          CREATE TABLE IF NOT EXISTS vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            license_plate TEXT NOT NULL UNIQUE,
            brand TEXT NOT NULL,
            model TEXT NOT NULL,
            year INTEGER NOT NULL,
            engine TEXT,
            current_mileage INTEGER NOT NULL DEFAULT 0,
            owner_name TEXT NOT NULL,
            owner_phone TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        `),
        d1.prepare(`
          CREATE TABLE IF NOT EXISTS repairs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
            service_date TEXT NOT NULL,
            mileage_at_service INTEGER NOT NULL,
            service_type TEXT NOT NULL,
            description TEXT NOT NULL,
            cost INTEGER,
            parts_cost INTEGER,
            mechanic_notes TEXT,
            reminder_preset TEXT NOT NULL DEFAULT 'none',
            reminder_due_date TEXT,
            reminder_status TEXT NOT NULL DEFAULT 'none',
            notified_at TEXT,
            created_at TEXT NOT NULL
          )
        `),
        d1.prepare(
          `CREATE INDEX IF NOT EXISTS idx_repairs_vehicle_id ON repairs(vehicle_id)`
        ),
        d1.prepare(
          `CREATE INDEX IF NOT EXISTS idx_repairs_due_date ON repairs(reminder_due_date)`
        ),
      ]);

      // Safe schema upgrade for existing D1 databases created before parts_cost existed
      const tableInfo = await d1
        .prepare(`PRAGMA table_info(repairs)`)
        .all<{ name: string }>();
      const hasPartsCost = (tableInfo.results ?? []).some(
        (col) => col.name === "parts_cost"
      );
      if (!hasPartsCost) {
        await d1.prepare(`ALTER TABLE repairs ADD COLUMN parts_cost INTEGER`).run();
      }

      const db = drizzle(d1, { schema });
      const rows = await db.select({ total: count() }).from(vehicles);
      const total = rows[0]?.total ?? 0;

      if (total === 0) {
        const seed = getInitialSeedPayload();
        const insertedIds: number[] = [];

        for (const v of seed.vehicles) {
          const inserted = await db
            .insert(vehicles)
            .values(v)
            .returning({ id: vehicles.id })
            .get();
          if (inserted) {
            insertedIds.push(inserted.id);
          }
        }

        for (const r of seed.repairs) {
          const vehicleId = insertedIds[r.vehicleIndex];
          if (!vehicleId) continue;
          const { vehicleIndex: _ignored, ...repairData } = r;
          void _ignored;
          await db.insert(repairs).values({
            ...repairData,
            vehicleId,
          });
        }
      }
    })();

    d1InitializedMap.set(d1, promise);
  }
  await promise;
}

function createD1Repository(d1: D1Database): WorkshopRepository {
  const db = drizzle(d1, { schema });

  return {
    storageMode: "d1",

    async listVehicles() {
      return db
        .select()
        .from(vehicles)
        .orderBy(desc(vehicles.updatedAt), desc(vehicles.id))
        .all();
    },

    async getVehicleById(id) {
      const row = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, id))
        .get();
      return row ?? null;
    },

    async createVehicle(input, initialRepair) {
      const createdVehicle = await db
        .insert(vehicles)
        .values(input)
        .returning()
        .get();

      let createdRepair: Repair | null = null;
      if (initialRepair) {
        createdRepair =
          (await db
            .insert(repairs)
            .values({
              ...initialRepair,
              vehicleId: createdVehicle.id,
            })
            .returning()
            .get()) ?? null;
      }

      return { vehicle: createdVehicle, repair: createdRepair };
    },

    async updateVehicle(id, updates) {
      const updated = await db
        .update(vehicles)
        .set(updates)
        .where(eq(vehicles.id, id))
        .returning()
        .get();
      return updated ?? null;
    },

    async deleteVehicle(id) {
      // Ensure repairs are removed cleanly even if PRAGMA foreign_keys is off in D1
      await db.delete(repairs).where(eq(repairs.vehicleId, id));
      const deleted = await db
        .delete(vehicles)
        .where(eq(vehicles.id, id))
        .returning({ id: vehicles.id })
        .get();
      return Boolean(deleted);
    },

    async listRepairs() {
      return db
        .select()
        .from(repairs)
        .orderBy(desc(repairs.serviceDate), desc(repairs.id))
        .all();
    },

    async listRepairsByVehicle(vehicleId) {
      return db
        .select()
        .from(repairs)
        .where(eq(repairs.vehicleId, vehicleId))
        .orderBy(desc(repairs.serviceDate), desc(repairs.id))
        .all();
    },

    async getRepairById(id) {
      const row = await db
        .select()
        .from(repairs)
        .where(eq(repairs.id, id))
        .get();
      return row ?? null;
    },

    async createRepair(input) {
      // Auto-complete prior active reminders for the same vehicle and service type
      await db
        .update(repairs)
        .set({ reminderStatus: "completed" })
        .where(
          and(
            eq(repairs.vehicleId, input.vehicleId),
            eq(repairs.serviceType, input.serviceType),
            inArray(repairs.reminderStatus, ["pending", "notified"])
          )
        );

      const created = await db
        .insert(repairs)
        .values(input)
        .returning()
        .get();

      const vehicle = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, input.vehicleId))
        .get();

      if (vehicle) {
        await db
          .update(vehicles)
          .set({
            currentMileage: Math.max(
              vehicle.currentMileage,
              input.mileageAtService
            ),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(vehicles.id, input.vehicleId));
      }

      return created;
    },

    async updateRepair(id, updates) {
      const existing = await db
        .select()
        .from(repairs)
        .where(eq(repairs.id, id))
        .get();
      if (!existing) return null;

      const updated = await db
        .update(repairs)
        .set(updates)
        .where(eq(repairs.id, id))
        .returning()
        .get();

      if (updated && updates.mileageAtService !== undefined) {
        const vehicle = await db
          .select()
          .from(vehicles)
          .where(eq(vehicles.id, existing.vehicleId))
          .get();
        if (vehicle && updated.mileageAtService > vehicle.currentMileage) {
          await db
            .update(vehicles)
            .set({
              currentMileage: updated.mileageAtService,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(vehicles.id, vehicle.id));
        }
      }

      return updated ?? null;
    },

    async deleteRepair(id) {
      const deleted = await db
        .delete(repairs)
        .where(eq(repairs.id, id))
        .returning({ id: repairs.id })
        .get();
      return Boolean(deleted);
    },
  };
}

// Graceful in-memory fallback when Cloudflare D1 binding (`DB`) is not yet attached
interface MemoryState {
  nextVehicleId: number;
  nextRepairId: number;
  vehicles: Vehicle[];
  repairs: Repair[];
}

const globalForMemory = globalThis as unknown as {
  __gallardoMemoryState?: MemoryState;
};

function getMemoryState(): MemoryState {
  if (!globalForMemory.__gallardoMemoryState) {
    const seed = getInitialSeedPayload();
    const state: MemoryState = {
      nextVehicleId: 1,
      nextRepairId: 1,
      vehicles: [],
      repairs: [],
    };

    for (const v of seed.vehicles) {
      state.vehicles.push({
        id: state.nextVehicleId++,
        licensePlate: v.licensePlate,
        brand: v.brand,
        model: v.model,
        year: v.year,
        engine: v.engine ?? null,
        currentMileage: v.currentMileage ?? 0,
        ownerName: v.ownerName,
        ownerPhone: v.ownerPhone,
        notes: v.notes ?? null,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      });
    }

    for (const r of seed.repairs) {
      const target = state.vehicles[r.vehicleIndex];
      if (!target) continue;
      state.repairs.push({
        id: state.nextRepairId++,
        vehicleId: target.id,
        serviceDate: r.serviceDate,
        mileageAtService: r.mileageAtService,
        serviceType: r.serviceType,
        description: r.description,
        cost: r.cost ?? null,
        partsCost: r.partsCost ?? null,
        mechanicNotes: r.mechanicNotes ?? null,
        reminderPreset: r.reminderPreset ?? "none",
        reminderDueDate: r.reminderDueDate ?? null,
        reminderStatus: r.reminderStatus ?? "none",
        notifiedAt: r.notifiedAt ?? null,
        createdAt: r.createdAt,
      });
    }

    globalForMemory.__gallardoMemoryState = state;
  }

  return globalForMemory.__gallardoMemoryState;
}

function createMemoryRepository(): WorkshopRepository {
  return {
    storageMode: "memory",

    async listVehicles() {
      const state = getMemoryState();
      return [...state.vehicles].sort(
        (a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id
      );
    },

    async getVehicleById(id) {
      const state = getMemoryState();
      return state.vehicles.find((v) => v.id === id) ?? null;
    },

    async createVehicle(input, initialRepair) {
      const state = getMemoryState();
      if (state.vehicles.some((v) => v.licensePlate === input.licensePlate)) {
        throw new Error("UNIQUE constraint failed: vehicles.license_plate");
      }

      const vehicle: Vehicle = {
        id: state.nextVehicleId++,
        licensePlate: input.licensePlate,
        brand: input.brand,
        model: input.model,
        year: input.year,
        engine: input.engine ?? null,
        currentMileage: input.currentMileage ?? 0,
        ownerName: input.ownerName,
        ownerPhone: input.ownerPhone,
        notes: input.notes ?? null,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
      };
      state.vehicles.push(vehicle);

      let repair: Repair | null = null;
      if (initialRepair) {
        repair = {
          id: state.nextRepairId++,
          vehicleId: vehicle.id,
          serviceDate: initialRepair.serviceDate,
          mileageAtService: initialRepair.mileageAtService,
          serviceType: initialRepair.serviceType,
          description: initialRepair.description,
          cost: initialRepair.cost ?? null,
          partsCost: initialRepair.partsCost ?? null,
          mechanicNotes: initialRepair.mechanicNotes ?? null,
          reminderPreset: initialRepair.reminderPreset ?? "none",
          reminderDueDate: initialRepair.reminderDueDate ?? null,
          reminderStatus: initialRepair.reminderStatus ?? "none",
          notifiedAt: initialRepair.notifiedAt ?? null,
          createdAt: initialRepair.createdAt,
        };
        state.repairs.push(repair);
      }

      return { vehicle, repair };
    },

    async updateVehicle(id, updates) {
      const state = getMemoryState();
      const idx = state.vehicles.findIndex((v) => v.id === id);
      if (idx === -1) return null;

      if (
        updates.licensePlate &&
        state.vehicles.some(
          (v) => v.id !== id && v.licensePlate === updates.licensePlate
        )
      ) {
        throw new Error("UNIQUE constraint failed: vehicles.license_plate");
      }

      const updated: Vehicle = {
        ...state.vehicles[idx],
        ...updates,
        engine:
          updates.engine !== undefined
            ? updates.engine ?? null
            : state.vehicles[idx].engine,
        notes:
          updates.notes !== undefined
            ? updates.notes ?? null
            : state.vehicles[idx].notes,
      };
      state.vehicles[idx] = updated;
      return updated;
    },

    async deleteVehicle(id) {
      const state = getMemoryState();
      const prevLen = state.vehicles.length;
      state.vehicles = state.vehicles.filter((v) => v.id !== id);
      state.repairs = state.repairs.filter((r) => r.vehicleId !== id);
      return state.vehicles.length < prevLen;
    },

    async listRepairs() {
      const state = getMemoryState();
      return [...state.repairs].sort(
        (a, b) => b.serviceDate.localeCompare(a.serviceDate) || b.id - a.id
      );
    },

    async listRepairsByVehicle(vehicleId) {
      const state = getMemoryState();
      return state.repairs
        .filter((r) => r.vehicleId === vehicleId)
        .sort(
          (a, b) => b.serviceDate.localeCompare(a.serviceDate) || b.id - a.id
        );
    },

    async getRepairById(id) {
      const state = getMemoryState();
      return state.repairs.find((r) => r.id === id) ?? null;
    },

    async createRepair(input) {
      const state = getMemoryState();
      for (const r of state.repairs) {
        if (
          r.vehicleId === input.vehicleId &&
          r.serviceType === input.serviceType &&
          (r.reminderStatus === "pending" || r.reminderStatus === "notified")
        ) {
          r.reminderStatus = "completed";
        }
      }

      const repair: Repair = {
        id: state.nextRepairId++,
        vehicleId: input.vehicleId,
        serviceDate: input.serviceDate,
        mileageAtService: input.mileageAtService,
        serviceType: input.serviceType,
        description: input.description,
        cost: input.cost ?? null,
        partsCost: input.partsCost ?? null,
        mechanicNotes: input.mechanicNotes ?? null,
        reminderPreset: input.reminderPreset ?? "none",
        reminderDueDate: input.reminderDueDate ?? null,
        reminderStatus: input.reminderStatus ?? "none",
        notifiedAt: input.notifiedAt ?? null,
        createdAt: input.createdAt,
      };
      state.repairs.push(repair);

      const vehicle = state.vehicles.find((v) => v.id === input.vehicleId);
      if (vehicle) {
        vehicle.currentMileage = Math.max(
          vehicle.currentMileage,
          input.mileageAtService
        );
        vehicle.updatedAt = new Date().toISOString();
      }

      return repair;
    },

    async updateRepair(id, updates) {
      const state = getMemoryState();
      const idx = state.repairs.findIndex((r) => r.id === id);
      if (idx === -1) return null;

      const updated: Repair = {
        ...state.repairs[idx],
        ...updates,
      };
      state.repairs[idx] = updated;

      const vehicle = state.vehicles.find((v) => v.id === updated.vehicleId);
      if (vehicle && updated.mileageAtService > vehicle.currentMileage) {
        vehicle.currentMileage = updated.mileageAtService;
        vehicle.updatedAt = new Date().toISOString();
      }

      return updated;
    },

    async deleteRepair(id) {
      const state = getMemoryState();
      const prevLen = state.repairs.length;
      state.repairs = state.repairs.filter((r) => r.id !== id);
      return state.repairs.length < prevLen;
    },
  };
}

export async function getWorkshopRepository(): Promise<WorkshopRepository> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (env?.DB) {
      await ensureD1Ready(env.DB);
      return createD1Repository(env.DB);
    }
  } catch {
    // Outside Cloudflare runtime or during non-CF checks, fall back cleanly
  }

  return createMemoryRepository();
}
