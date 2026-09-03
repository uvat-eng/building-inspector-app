CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  plate TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'car',
  driver TEXT DEFAULT '',
  location_id TEXT DEFAULT '',
  odometer INTEGER DEFAULT 0,
  fuel_norm NUMERIC(8,2) DEFAULT 0,
  service_at TEXT DEFAULT '',
  osago_to TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'На линии',
  note TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_logs (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'service',
  date TEXT NOT NULL DEFAULT '',
  odometer INTEGER DEFAULT 0,
  amount NUMERIC(10,2) DEFAULT 0,
  content TEXT DEFAULT '',
  author TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_loc ON vehicles(location_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_logs ON vehicle_logs(vehicle_id, date);