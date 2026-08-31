CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  fio TEXT NOT NULL,
  fio_key TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  "group" TEXT DEFAULT '',
  org TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  specialties JSONB DEFAULT '[]'::jsonb,
  certificates JSONB DEFAULT '[]'::jsonb,
  educations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
