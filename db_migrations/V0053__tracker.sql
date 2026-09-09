CREATE TABLE IF NOT EXISTS track_points (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL DEFAULT '',
  fio text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy double precision NOT NULL DEFAULT 0,
  speed double precision NOT NULL DEFAULT 0,
  day date NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS track_points_user_day ON track_points (user_id, day);
CREATE INDEX IF NOT EXISTS track_points_recorded ON track_points (recorded_at DESC);

CREATE TABLE IF NOT EXISTS track_days (
  id text PRIMARY KEY,
  user_id text NOT NULL DEFAULT '',
  fio text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  day date NOT NULL,
  ym text NOT NULL DEFAULT '',
  distance_km numeric(12, 2) NOT NULL DEFAULT 0,
  move_min integer NOT NULL DEFAULT 0,
  idle_min integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  first_at timestamptz NULL,
  last_at timestamptz NULL,
  idles jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS track_days_uniq ON track_days (user_id, day);
CREATE INDEX IF NOT EXISTS track_days_ym ON track_days (ym);

CREATE TABLE IF NOT EXISTS track_consent (
  user_id text PRIMARY KEY,
  fio text NOT NULL DEFAULT '',
  agreed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS track_month (
  id text PRIMARY KEY,
  ym text NOT NULL DEFAULT '',
  rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS track_month_uniq ON track_month (ym);
