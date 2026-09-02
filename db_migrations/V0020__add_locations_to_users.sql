ALTER TABLE t_p27863069_building_inspector_a.users
  ADD COLUMN IF NOT EXISTS locations jsonb NOT NULL DEFAULT '[]'::jsonb;