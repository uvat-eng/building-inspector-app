CREATE TABLE IF NOT EXISTS object_contractors (
  id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'sub',
  name TEXT DEFAULT '',
  inn TEXT DEFAULT '',
  address TEXT DEFAULT '',
  director TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  works TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obj_contractors ON object_contractors(object_id, kind);

INSERT INTO object_contractors (id, object_id, kind, name, inn, address, director, phone, email)
SELECT md5(object_id || 'gen'), object_id, 'general', name, inn, address, director, phone, email
FROM contractors
ON CONFLICT (id) DO NOTHING;

ALTER TABLE inspections ADD COLUMN IF NOT EXISTS general_contractor TEXT DEFAULT '';
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS subcontractor TEXT DEFAULT '';
