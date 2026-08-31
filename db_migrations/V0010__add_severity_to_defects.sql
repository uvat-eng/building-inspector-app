ALTER TABLE inspection_defects ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'normal';
