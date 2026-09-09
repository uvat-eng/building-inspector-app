CREATE TABLE IF NOT EXISTS fleet_maint (
  id text PRIMARY KEY,
  vehicle_id text NOT NULL DEFAULT '',
  item_key text NOT NULL DEFAULT '',
  last_at date NULL,
  next_at date NULL,
  odometer integer NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT '',
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS fleet_maint_uniq ON fleet_maint (vehicle_id, item_key);

CREATE TABLE IF NOT EXISTS fleet_days (
  id text PRIMARY KEY,
  vehicle_id text NOT NULL DEFAULT '',
  driver_fio text NOT NULL DEFAULT '',
  day date NOT NULL,
  ym text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT 'line',
  share numeric(4, 2) NOT NULL DEFAULT 1,
  note text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS fleet_days_uniq ON fleet_days (vehicle_id, driver_fio, day);

ALTER TABLE fleet_acts ADD COLUMN IF NOT EXISTS accept_date date NULL;
ALTER TABLE fleet_acts ADD COLUMN IF NOT EXISTS exterior text NOT NULL DEFAULT '';
ALTER TABLE fleet_acts ADD COLUMN IF NOT EXISTS defects text NOT NULL DEFAULT '';
ALTER TABLE fleet_acts ADD COLUMN IF NOT EXISTS breakdowns text NOT NULL DEFAULT '';
ALTER TABLE fleet_acts ADD COLUMN IF NOT EXISTS advice text NOT NULL DEFAULT '';
