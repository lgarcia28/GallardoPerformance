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
);

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
);

CREATE INDEX IF NOT EXISTS idx_repairs_vehicle_id ON repairs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_repairs_due_date ON repairs(reminder_due_date);

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
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);

CREATE TABLE IF NOT EXISTS car_brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL,
  created_at TEXT NOT NULL
);

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
);

CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);
