CREATE TABLE IF NOT EXISTS daily_inspector_reports (
  id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'obustroystvo',
  number TEXT NOT NULL DEFAULT '',
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  author_id TEXT NOT NULL DEFAULT '',
  author_fio TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'done',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_dir_date ON daily_inspector_reports (report_date DESC);
CREATE INDEX IF NOT EXISTS idx_dir_author ON daily_inspector_reports (author_id);
CREATE INDEX IF NOT EXISTS idx_dir_object ON daily_inspector_reports (object_id);