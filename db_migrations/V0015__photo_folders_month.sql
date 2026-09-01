ALTER TABLE photo_folders ADD COLUMN IF NOT EXISTS month TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS photo_folders_month_idx
    ON photo_folders (object_id, section, subsection, month);