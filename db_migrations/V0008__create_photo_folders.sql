CREATE TABLE IF NOT EXISTS photo_folders (
  id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL,
  section TEXT NOT NULL,
  subsection TEXT DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  note TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS folder_photos (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photo_folders ON photo_folders(object_id, section, subsection);
CREATE INDEX IF NOT EXISTS idx_folder_photos ON folder_photos(folder_id);
