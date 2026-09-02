ALTER TABLE t_p27863069_building_inspector_a.daily_reports
  ADD COLUMN IF NOT EXISTS file_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS file_name text NOT NULL DEFAULT '';