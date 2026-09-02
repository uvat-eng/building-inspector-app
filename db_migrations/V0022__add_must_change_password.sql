ALTER TABLE t_p27863069_building_inspector_a.users
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;