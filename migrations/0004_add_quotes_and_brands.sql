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
