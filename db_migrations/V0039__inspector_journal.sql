CREATE TABLE IF NOT EXISTS inspector_journal (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL DEFAULT '',
  author_fio TEXT NOT NULL DEFAULT '',
  object_title TEXT NOT NULL DEFAULT '',
  project_title TEXT NOT NULL DEFAULT 'Обустройство Восточно-Мессояхского месторождения',
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  contractor TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  recorded_by TEXT NOT NULL DEFAULT '',
  ack_by TEXT NOT NULL DEFAULT '',
  measures TEXT NOT NULL DEFAULT '',
  fix_status TEXT NOT NULL DEFAULT 'не устранено',
  fix_date TEXT NOT NULL DEFAULT '',
  responsibility TEXT NOT NULL DEFAULT 'вопрос подрядчика',
  order_note TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_ij_author ON inspector_journal (author_id);
CREATE INDEX IF NOT EXISTS idx_ij_object ON inspector_journal (object_title);
CREATE INDEX IF NOT EXISTS idx_ij_date ON inspector_journal (entry_date DESC);