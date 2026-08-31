CREATE TABLE IF NOT EXISTS timesheet (
  user_id TEXT NOT NULL,
  day DATE NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_timesheet_user ON timesheet(user_id);
