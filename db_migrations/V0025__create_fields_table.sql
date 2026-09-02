CREATE TABLE IF NOT EXISTS t_p27863069_building_inspector_a.fields (
  id text PRIMARY KEY,
  location_id text NOT NULL,
  title text NOT NULL,
  note text NOT NULL DEFAULT '',
  sort integer NOT NULL DEFAULT 0,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fields_location_idx
  ON t_p27863069_building_inspector_a.fields (location_id);