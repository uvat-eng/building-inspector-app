CREATE TABLE IF NOT EXISTS object_docs (
  id TEXT PRIMARY KEY,
  section TEXT NOT NULL DEFAULT 'tables',
  object_id TEXT NOT NULL DEFAULT '',
  object_title TEXT NOT NULL DEFAULT '',
  contractor TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  doc_number TEXT NOT NULL DEFAULT '',
  doc_date TEXT NOT NULL DEFAULT '',
  period TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'актуально',
  file_name TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  mime TEXT NOT NULL DEFAULT '',
  size_kb INTEGER NOT NULL DEFAULT 0,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  uploaded_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_od_section ON object_docs (section);
CREATE INDEX IF NOT EXISTS idx_od_object ON object_docs (object_id);
CREATE INDEX IF NOT EXISTS idx_od_contractor ON object_docs (contractor);