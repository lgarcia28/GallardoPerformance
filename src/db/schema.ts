import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const vehicles = sqliteTable("vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  licensePlate: text("license_plate").notNull().unique(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  engine: text("engine"),
  currentMileage: integer("current_mileage").notNull().default(0),
  ownerName: text("owner_name").notNull(),
  ownerPhone: text("owner_phone").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const repairs = sqliteTable("repairs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  serviceDate: text("service_date").notNull(), // YYYY-MM-DD
  mileageAtService: integer("mileage_at_service").notNull(),
  serviceType: text("service_type").notNull(),
  description: text("description").notNull(),
  cost: integer("cost"), // Monto cobrado al cliente
  partsCost: integer("parts_cost"), // Costo de repuestos/insumos del taller
  mechanicNotes: text("mechanic_notes"),
  reminderPreset: text("reminder_preset").notNull().default("none"), // 1_year | 6_months | 3_months | custom | none
  reminderDueDate: text("reminder_due_date"), // YYYY-MM-DD | null
  reminderStatus: text("reminder_status").notNull().default("none"), // none | pending | notified | completed
  notifiedAt: text("notified_at"), // ISO timestamp | null
  createdAt: text("created_at").notNull(),
});

export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id").references(() => vehicles.id, {
    onDelete: "set null",
  }),
  appointmentDate: text("appointment_date").notNull(), // YYYY-MM-DD
  appointmentTime: text("appointment_time").notNull(), // HH:MM
  licensePlate: text("license_plate").notNull(),
  vehicleLabel: text("vehicle_label").notNull(),
  ownerName: text("owner_name").notNull(),
  ownerPhone: text("owner_phone").notNull(),
  serviceType: text("service_type").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("scheduled"), // scheduled | in_progress | completed | cancelled
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type Repair = typeof repairs.$inferSelect;
export type NewRepair = typeof repairs.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
