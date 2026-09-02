ALTER TABLE t_p27863069_building_inspector_a.objects
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_objects_location
  ON t_p27863069_building_inspector_a.objects (location, field, title);