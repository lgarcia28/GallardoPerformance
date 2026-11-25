import type { D1Database } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import {
  adminUsers,
  appointments,
  carBrands,
  quotes,
  repairs,
  vehicles,
  type AdminUser,
  type Appointment,
  type CarBrand,
  type NewAppointment,
  type NewQuote,
  type NewRepair,
  type NewVehicle,
  type Quote,
  type Repair,
  type Vehicle,
} from "./schema";
import { getInitialSeedPayload } from "./seed-data";
import { getAuthEnv } from "@/lib/auth";
import { hashPassword, normalizePlateForSearch } from "@/lib/auth-edge";
import { DEFAULT_CAR_BRANDS, slugifyBrandName } from "@/lib/workshop";

export type StorageMode = "d1" | "memory";

export interface WorkshopRepository {
  storageMode: StorageMode;
  listVehicles(): Promise<Vehicle[]>;
  getVehicleById(id: number): Promise<Vehicle | null>;
  findVehicleByPlateNormalized(plate: string): Promise<Vehicle | null>;
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
  listAppointments(): Promise<Appointment[]>;
  getAppointmentById(id: number): Promise<Appointment | null>;
  createAppointment(input: Omit<NewAppointment, "id">): Promise<Appointment>;
  updateAppointment(
    id: number,
    updates: Partial<NewAppointment>
  ): Promise<Appointment | null>;
  deleteAppointment(id: number): Promise<boolean>;
  listBrands(): Promise<CarBrand[]>;
  createBrand(name: string): Promise<CarBrand>;
  listQuotes(): Promise<Quote[]>;
  getQuoteById(id: number): Promise<Quote | null>;
  createQuote(input: Omit<NewQuote, "id" | "quoteNumber">): Promise<Quote>;
  updateQuote(id: number, updates: Partial<NewQuote>): Promise<Quote | null>;
  deleteQuote(id: number): Promise<boolean>;
  findAdminByIdentifier(identifier: string): Promise<AdminUser | null>;
  getAdminById(id: number): Promise<AdminUser | null>;
  updateAdminAccount(
    id: number,
    updates: {
      username?: string;
      email?: string;
      displayName?: string;
      passwordHash?: string;
    }
  ): Promise<AdminUser | null>;
}

function formatQuoteNumber(seq: number): string {
  return `GP-${String(seq).padStart(4, "0")}`;
}

function computeNextQuoteNumber(existingNumbers: string[]): string {
  let maxNum = 0;
  for (const num of existingNumbers) {
    const match = /GP-(\d+)/i.exec(num);
    if (match) {
      const parsed = Number(match[1]);
      if (Number.isFinite(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  }
  return formatQuoteNumber(maxNum + 1);
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
        d1.prepare(`
          CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
            appointment_date TEXT NOT NULL,
            appointment_time TEXT NOT NULL,
            license_plate TEXT NOT NULL,
            vehicle_label TEXT NOT NULL,
            owner_name TEXT NOT NULL,
            owner_phone TEXT NOT NULL,
            service_type TEXT NOT NULL,
            notes TEXT,
            status TEXT NOT NULL DEFAULT 'scheduled',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        `),
        d1.prepare(`
          CREATE TABLE IF NOT EXISTS car_brands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            slug TEXT NOT NULL,
            created_at TEXT NOT NULL
          )
        `),
        d1.prepare(`
          CREATE TABLE IF NOT EXISTS quotes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quote_number TEXT NOT NULL UNIQUE,
            vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            license_plate TEXT,
            brand_name TEXT NOT NULL,
            brand_slug TEXT,
            model TEXT NOT NULL,
            mileage INTEGER NOT NULL DEFAULT 0,
            items_json TEXT NOT NULL,
            total_amount INTEGER NOT NULL DEFAULT 0,
            validity_days INTEGER NOT NULL DEFAULT 15,
            notes TEXT,
            status TEXT NOT NULL DEFAULT 'draft',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        `),
        d1.prepare(`
          CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            display_name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        `),
        d1.prepare(
          `CREATE INDEX IF NOT EXISTS idx_repairs_vehicle_id ON repairs(vehicle_id)`
        ),
        d1.prepare(
          `CREATE INDEX IF NOT EXISTS idx_repairs_due_date ON repairs(reminder_due_date)`
        ),
        d1.prepare(
          `CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)`
        ),
        d1.prepare(
          `CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at)`
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
        await d1
          .prepare(`ALTER TABLE repairs ADD COLUMN parts_cost INTEGER`)
          .run();
      }

      const db = drizzle(d1, { schema });

      // Always ensure at least one admin account exists
      const adminCountRows = await db
        .select({ total: count() })
        .from(adminUsers);
      if ((adminCountRows[0]?.total ?? 0) === 0) {
        const authEnv = await getAuthEnv();
        const nowIso = new Date().toISOString();
        const passwordHash = await hashPassword(authEnv.defaultPassword);
        await db
          .insert(adminUsers)
          .values({
            username: authEnv.defaultUsername,
            email: authEnv.defaultEmail,
            passwordHash,
            displayName: "Gallardo Performance",
            createdAt: nowIso,
            updatedAt: nowIso,
          })
          .onConflictDoNothing();
      }

      // Always ensure preset car brands exist if car_brands is empty
      const brandCountRows = await db
        .select({ total: count() })
        .from(carBrands);
      if ((brandCountRows[0]?.total ?? 0) === 0) {
        const nowIso = new Date().toISOString();
        for (const b of DEFAULT_CAR_BRANDS) {
          await db
            .insert(carBrands)
            .values({ name: b.name, slug: b.slug, createdAt: nowIso })
            .onConflictDoNothing();
        }
      }

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

        for (const a of seed.appointments) {
          const vehicleId =
            a.vehicleIndex !== null
              ? insertedIds[a.vehicleIndex] ?? null
              : null;
          const { vehicleIndex: _ignored, ...apptData } = a;
          void _ignored;
          await db.insert(appointments).values({
            ...apptData,
            vehicleId,
          });
        }

        for (const q of seed.quotes) {
          const vehicleId =
            q.vehicleIndex !== null
              ? insertedIds[q.vehicleIndex] ?? null
              : null;
          const { vehicleIndex: _ignored, ...quoteData } = q;
          void _ignored;
          await db.insert(quotes).values({
            ...quoteData,
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

    async findVehicleByPlateNormalized(plate) {
      const target = normalizePlateForSearch(plate);
      if (target.length < 3) return null;
      const all = await db.select().from(vehicles).all();
      return (
        all.find((v) => normalizePlateForSearch(v.licensePlate) === target) ??
        null
      );
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
      await db.delete(repairs).where(eq(repairs.vehicleId, id));
      await db
        .update(appointments)
        .set({ vehicleId: null })
        .where(eq(appointments.vehicleId, id));
      await db
        .update(quotes)
        .set({ vehicleId: null })
        .where(eq(quotes.vehicleId, id));
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

    async listAppointments() {
      return db
        .select()
        .from(appointments)
        .orderBy(
          asc(appointments.appointmentDate),
          asc(appointments.appointmentTime),
          asc(appointments.id)
        )
        .all();
    },

    async getAppointmentById(id) {
      const row = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, id))
        .get();
      return row ?? null;
    },

    async createAppointment(input) {
      return db.insert(appointments).values(input).returning().get();
    },

    async updateAppointment(id, updates) {
      const updated = await db
        .update(appointments)
        .set(updates)
        .where(eq(appointments.id, id))
        .returning()
        .get();
      return updated ?? null;
    },

    async deleteAppointment(id) {
      const deleted = await db
        .delete(appointments)
        .where(eq(appointments.id, id))
        .returning({ id: appointments.id })
        .get();
      return Boolean(deleted);
    },

    async listBrands() {
      return db.select().from(carBrands).orderBy(asc(carBrands.name)).all();
    },

    async createBrand(rawName) {
      const cleanName = rawName.trim();
      const slug = slugifyBrandName(cleanName);
      const all = await db.select().from(carBrands).all();
      const existing = all.find(
        (b) => b.name.toLowerCase() === cleanName.toLowerCase() || b.slug === slug
      );
      if (existing) return existing;

      return db
        .insert(carBrands)
        .values({
          name: cleanName,
          slug,
          createdAt: new Date().toISOString(),
        })
        .returning()
        .get();
    },

    async listQuotes() {
      return db
        .select()
        .from(quotes)
        .orderBy(desc(quotes.createdAt), desc(quotes.id))
        .all();
    },

    async getQuoteById(id) {
      const row = await db
        .select()
        .from(quotes)
        .where(eq(quotes.id, id))
        .get();
      return row ?? null;
    },

    async createQuote(input) {
      const existing = await db
        .select({ quoteNumber: quotes.quoteNumber })
        .from(quotes)
        .all();
      const quoteNumber = computeNextQuoteNumber(
        existing.map((e) => e.quoteNumber)
      );
      return db
        .insert(quotes)
        .values({
          ...input,
          quoteNumber,
        })
        .returning()
        .get();
    },

    async updateQuote(id, updates) {
      const updated = await db
        .update(quotes)
        .set(updates)
        .where(eq(quotes.id, id))
        .returning()
        .get();
      return updated ?? null;
    },

    async deleteQuote(id) {
      const deleted = await db
        .delete(quotes)
        .where(eq(quotes.id, id))
        .returning({ id: quotes.id })
        .get();
      return Boolean(deleted);
    },

    async findAdminByIdentifier(identifier) {
      const clean = identifier.trim().toLowerCase();
      if (!clean) return null;
      const all = await db.select().from(adminUsers).all();
      return (
        all.find(
          (u) =>
            u.username.toLowerCase() === clean ||
            u.email.toLowerCase() === clean
        ) ?? null
      );
    },

    async getAdminById(id) {
      const row = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.id, id))
        .get();
      return row ?? null;
    },

    async updateAdminAccount(id, updates) {
      const patch: Partial<typeof adminUsers.$inferInsert> = {
        updatedAt: new Date().toISOString(),
      };
      if (updates.username !== undefined) {
        patch.username = updates.username.trim().toLowerCase();
      }
      if (updates.email !== undefined) {
        patch.email = updates.email.trim().toLowerCase();
      }
      if (updates.displayName !== undefined) {
        patch.displayName = updates.displayName.trim();
      }
      if (updates.passwordHash !== undefined) {
        patch.passwordHash = updates.passwordHash;
      }
      const updated = await db
        .update(adminUsers)
        .set(patch)
        .where(eq(adminUsers.id, id))
        .returning()
        .get();
      return updated ?? null;
    },
  };
}

// Graceful in-memory fallback when Cloudflare D1 binding (`DB`) is not yet attached
interface MemoryState {
  nextVehicleId: number;
  nextRepairId: number;
  nextAppointmentId: number;
  nextBrandId: number;
  nextQuoteId: number;
  nextAdminId: number;
  vehicles: Vehicle[];
  repairs: Repair[];
  appointments: Appointment[];
  brands: CarBrand[];
  quotes: Quote[];
  admins: AdminUser[];
}

const globalForMemory = globalThis as unknown as {
  __gallardoMemoryState?: MemoryState;
};

function getMemoryState(): MemoryState {
  if (!globalForMemory.__gallardoMemoryState) {
    const seed = getInitialSeedPayload();
    const nowIso = new Date().toISOString();
    const state: MemoryState = {
      nextVehicleId: 1,
      nextRepairId: 1,
      nextAppointmentId: 1,
      nextBrandId: 1,
      nextQuoteId: 1,
      nextAdminId: 1,
      vehicles: [],
      repairs: [],
      appointments: [],
      brands: [],
      quotes: [],
      admins: [],
    };

    for (const b of DEFAULT_CAR_BRANDS) {
      state.brands.push({
        id: state.nextBrandId++,
        name: b.name,
        slug: b.slug,
        createdAt: nowIso,
      });
    }

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

    for (const a of seed.appointments) {
      const target =
        a.vehicleIndex !== null ? state.vehicles[a.vehicleIndex] ?? null : null;
      state.appointments.push({
        id: state.nextAppointmentId++,
        vehicleId: target ? target.id : null,
        appointmentDate: a.appointmentDate,
        appointmentTime: a.appointmentTime,
        licensePlate: a.licensePlate,
        vehicleLabel: a.vehicleLabel,
        ownerName: a.ownerName,
        ownerPhone: a.ownerPhone,
        serviceType: a.serviceType,
        notes: a.notes ?? null,
        status: a.status ?? "scheduled",
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      });
    }

    for (const q of seed.quotes) {
      const target =
        q.vehicleIndex !== null ? state.vehicles[q.vehicleIndex] ?? null : null;
      state.quotes.push({
        id: state.nextQuoteId++,
        quoteNumber: q.quoteNumber,
        vehicleId: target ? target.id : null,
        customerName: q.customerName,
        customerPhone: q.customerPhone,
        licensePlate: q.licensePlate ?? null,
        brandName: q.brandName,
        brandSlug: q.brandSlug ?? null,
        model: q.model,
        mileage: q.mileage ?? 0,
        itemsJson: q.itemsJson,
        totalAmount: q.totalAmount ?? 0,
        validityDays: q.validityDays ?? 15,
        notes: q.notes ?? null,
        status: q.status ?? "draft",
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      });
    }

    globalForMemory.__gallardoMemoryState = state;
  }

  return globalForMemory.__gallardoMemoryState;
}

async function ensureMemoryAdminSeeded(state: MemoryState): Promise<void> {
  if (state.admins.length > 0) return;
  const authEnv = await getAuthEnv();
  const nowIso = new Date().toISOString();
  const passwordHash = await hashPassword(authEnv.defaultPassword);
  state.admins.push({
    id: state.nextAdminId++,
    username: authEnv.defaultUsername,
    email: authEnv.defaultEmail,
    passwordHash,
    displayName: "Gallardo Performance",
    createdAt: nowIso,
    updatedAt: nowIso,
  });
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

    async findVehicleByPlateNormalized(plate) {
      const state = getMemoryState();
      const target = normalizePlateForSearch(plate);
      if (target.length < 3) return null;
      return (
        state.vehicles.find(
          (v) => normalizePlateForSearch(v.licensePlate) === target
        ) ?? null
      );
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
      for (const a of state.appointments) {
        if (a.vehicleId === id) a.vehicleId = null;
      }
      for (const q of state.quotes) {
        if (q.vehicleId === id) q.vehicleId = null;
      }
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

    async listAppointments() {
      const state = getMemoryState();
      return [...state.appointments].sort(
        (a, b) =>
          a.appointmentDate.localeCompare(b.appointmentDate) ||
          a.appointmentTime.localeCompare(b.appointmentTime) ||
          a.id - b.id
      );
    },

    async getAppointmentById(id) {
      const state = getMemoryState();
      return state.appointments.find((a) => a.id === id) ?? null;
    },

    async createAppointment(input) {
      const state = getMemoryState();
      const appointment: Appointment = {
        id: state.nextAppointmentId++,
        vehicleId: input.vehicleId ?? null,
        appointmentDate: input.appointmentDate,
        appointmentTime: input.appointmentTime,
        licensePlate: input.licensePlate,
        vehicleLabel: input.vehicleLabel,
        ownerName: input.ownerName,
        ownerPhone: input.ownerPhone,
        serviceType: input.serviceType,
        notes: input.notes ?? null,
        status: input.status ?? "scheduled",
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
      };
      state.appointments.push(appointment);
      return appointment;
    },

    async updateAppointment(id, updates) {
      const state = getMemoryState();
      const idx = state.appointments.findIndex((a) => a.id === id);
      if (idx === -1) return null;

      const updated: Appointment = {
        ...state.appointments[idx],
        ...updates,
        notes:
          updates.notes !== undefined
            ? updates.notes ?? null
            : state.appointments[idx].notes,
      };
      state.appointments[idx] = updated;
      return updated;
    },

    async deleteAppointment(id) {
      const state = getMemoryState();
      const prevLen = state.appointments.length;
      state.appointments = state.appointments.filter((a) => a.id !== id);
      return state.appointments.length < prevLen;
    },

    async listBrands() {
      const state = getMemoryState();
      return [...state.brands].sort((a, b) => a.name.localeCompare(b.name));
    },

    async createBrand(rawName) {
      const state = getMemoryState();
      const cleanName = rawName.trim();
      const slug = slugifyBrandName(cleanName);
      const existing = state.brands.find(
        (b) => b.name.toLowerCase() === cleanName.toLowerCase() || b.slug === slug
      );
      if (existing) return existing;

      const brand: CarBrand = {
        id: state.nextBrandId++,
        name: cleanName,
        slug,
        createdAt: new Date().toISOString(),
      };
      state.brands.push(brand);
      return brand;
    },

    async listQuotes() {
      const state = getMemoryState();
      return [...state.quotes].sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id
      );
    },

    async getQuoteById(id) {
      const state = getMemoryState();
      return state.quotes.find((q) => q.id === id) ?? null;
    },

    async createQuote(input) {
      const state = getMemoryState();
      const quoteNumber = computeNextQuoteNumber(
        state.quotes.map((q) => q.quoteNumber)
      );
      const quote: Quote = {
        id: state.nextQuoteId++,
        quoteNumber,
        vehicleId: input.vehicleId ?? null,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        licensePlate: input.licensePlate ?? null,
        brandName: input.brandName,
        brandSlug: input.brandSlug ?? null,
        model: input.model,
        mileage: input.mileage ?? 0,
        itemsJson: input.itemsJson,
        totalAmount: input.totalAmount ?? 0,
        validityDays: input.validityDays ?? 15,
        notes: input.notes ?? null,
        status: input.status ?? "draft",
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
      };
      state.quotes.push(quote);
      return quote;
    },

    async updateQuote(id, updates) {
      const state = getMemoryState();
      const idx = state.quotes.findIndex((q) => q.id === id);
      if (idx === -1) return null;

      const updated: Quote = {
        ...state.quotes[idx],
        ...updates,
        licensePlate:
          updates.licensePlate !== undefined
            ? updates.licensePlate ?? null
            : state.quotes[idx].licensePlate,
        notes:
          updates.notes !== undefined
            ? updates.notes ?? null
            : state.quotes[idx].notes,
      };
      state.quotes[idx] = updated;
      return updated;
    },

    async deleteQuote(id) {
      const state = getMemoryState();
      const prevLen = state.quotes.length;
      state.quotes = state.quotes.filter((q) => q.id !== id);
      return state.quotes.length < prevLen;
    },

    async findAdminByIdentifier(identifier) {
      const state = getMemoryState();
      await ensureMemoryAdminSeeded(state);
      const clean = identifier.trim().toLowerCase();
      if (!clean) return null;
      return (
        state.admins.find(
          (u) =>
            u.username.toLowerCase() === clean ||
            u.email.toLowerCase() === clean
        ) ?? null
      );
    },

    async getAdminById(id) {
      const state = getMemoryState();
      await ensureMemoryAdminSeeded(state);
      return state.admins.find((u) => u.id === id) ?? null;
    },

    async updateAdminAccount(id, updates) {
      const state = getMemoryState();
      await ensureMemoryAdminSeeded(state);
      const idx = state.admins.findIndex((u) => u.id === id);
      if (idx === -1) return null;

      const updated: AdminUser = {
        ...state.admins[idx],
        username:
          updates.username !== undefined
            ? updates.username.trim().toLowerCase()
            : state.admins[idx].username,
        email:
          updates.email !== undefined
            ? updates.email.trim().toLowerCase()
            : state.admins[idx].email,
        displayName:
          updates.displayName !== undefined
            ? updates.displayName.trim()
            : state.admins[idx].displayName,
        passwordHash:
          updates.passwordHash !== undefined
            ? updates.passwordHash
            : state.admins[idx].passwordHash,
        updatedAt: new Date().toISOString(),
      };
      state.admins[idx] = updated;
      return updated;
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
