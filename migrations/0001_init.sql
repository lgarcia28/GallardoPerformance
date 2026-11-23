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
  mechanic_notes TEXT,
  reminder_preset TEXT NOT NULL DEFAULT 'none',
  reminder_due_date TEXT,
  reminder_status TEXT NOT NULL DEFAULT 'none',
  notified_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_repairs_vehicle_id ON repairs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_repairs_due_date ON repairs(reminder_due_date);
