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

export const carBrands = sqliteTable("car_brands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull(),
  createdAt: text("created_at").notNull(),
});

export const quotes = sqliteTable("quotes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quoteNumber: text("quote_number").notNull().unique(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id, {
    onDelete: "set null",
  }),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  licensePlate: text("license_plate"),
  brandName: text("brand_name").notNull(),
  brandSlug: text("brand_slug"),
  model: text("model").notNull(),
  mileage: integer("mileage").notNull().default(0),
  itemsJson: text("items_json").notNull(), // JSON string of QuoteItem[]
  totalAmount: integer("total_amount").notNull().default(0),
  validityDays: integer("validity_days").notNull().default(15),
  notes: text("notes"),
  status: text("status").notNull().default("draft"), // draft | sent | approved | rejected
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const adminUsers = sqliteTable("admin_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type Repair = typeof repairs.$inferSelect;
export type NewRepair = typeof repairs.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type CarBrand = typeof carBrands.$inferSelect;
export type NewCarBrand = typeof carBrands.$inferInsert;
export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;
export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
