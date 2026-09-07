CREATE TABLE IF NOT EXISTS asset_timesheet (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL DEFAULT '',
  asset_kind TEXT NOT NULL DEFAULT 'vehicle',
  day DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'work',
  hours NUMERIC NOT NULL DEFAULT 0,
  object_id TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  author_fio TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ats_unique ON asset_timesheet (asset_id, day);
CREATE INDEX IF NOT EXISTS idx_ats_kind ON asset_timesheet (asset_kind, day);