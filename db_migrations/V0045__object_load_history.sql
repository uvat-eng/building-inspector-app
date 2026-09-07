CREATE TABLE IF NOT EXISTS object_load (
  id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL,
  day DATE NOT NULL,
  staff_plan INTEGER NOT NULL DEFAULT 0,
  staff_fact INTEGER NOT NULL DEFAULT 0,
  tech_plan INTEGER NOT NULL DEFAULT 0,
  tech_fact INTEGER NOT NULL DEFAULT 0,
  cabins INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  author_fio TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_oload_unique ON object_load (object_id, day);
CREATE INDEX IF NOT EXISTS idx_oload_day ON object_load (day);