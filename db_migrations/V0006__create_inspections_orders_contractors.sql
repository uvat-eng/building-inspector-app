CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL,
  number TEXT NOT NULL DEFAULT '',
  work_type TEXT DEFAULT '',
  doc_ref TEXT DEFAULT '',
  contractor_rep TEXT DEFAULT '',
  inspector TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  note TEXT DEFAULT '',
  act_url TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_defects (
  id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL,
  pos INTEGER DEFAULT 1,
  title TEXT NOT NULL DEFAULT '',
  deadline TEXT DEFAULT '',
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL,
  inspection_id TEXT DEFAULT '',
  number TEXT NOT NULL DEFAULT '',
  issued_to TEXT DEFAULT '',
  inspector TEXT DEFAULT '',
  deadline TEXT DEFAULT '',
  status TEXT DEFAULT 'open',
  body JSONB DEFAULT '{}'::jsonb,
  file_url TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contractors (
  object_id TEXT PRIMARY KEY,
  name TEXT DEFAULT '',
  inn TEXT DEFAULT '',
  address TEXT DEFAULT '',
  director TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspections_object ON inspections(object_id);
CREATE INDEX IF NOT EXISTS idx_defects_inspection ON inspection_defects(inspection_id);
CREATE INDEX IF NOT EXISTS idx_orders_object ON orders(object_id);
