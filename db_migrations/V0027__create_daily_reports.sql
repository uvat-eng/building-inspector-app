CREATE TABLE IF NOT EXISTS t_p27863069_building_inspector_a.daily_reports (
  id text PRIMARY KEY,
  object_id text NOT NULL,
  report_date date NOT NULL,
  author text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  rows_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS daily_reports_object_idx
  ON t_p27863069_building_inspector_a.daily_reports (object_id, report_date);