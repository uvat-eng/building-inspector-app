CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  mime TEXT DEFAULT '',
  note TEXT DEFAULT '',
  uploaded_by TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_object ON documents(object_id, section);
