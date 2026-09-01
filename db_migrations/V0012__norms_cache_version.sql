ALTER TABLE norms_cache ADD COLUMN IF NOT EXISTS prompt_ver INTEGER NOT NULL DEFAULT 1;
UPDATE norms_cache SET prompt_ver = 1;