ALTER TABLE inspector_journal ADD COLUMN IF NOT EXISTS source_kind TEXT NOT NULL DEFAULT '';
ALTER TABLE inspector_journal ADD COLUMN IF NOT EXISTS source_id TEXT NOT NULL DEFAULT '';
ALTER TABLE inspector_journal ADD COLUMN IF NOT EXISTS source_number TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_ij_source ON inspector_journal (source_id);