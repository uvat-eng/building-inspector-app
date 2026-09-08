CREATE TABLE IF NOT EXISTS fleet_shifts (
  id text PRIMARY KEY,
  vehicle_id text NOT NULL DEFAULT '',
  driver_id text NOT NULL DEFAULT '',
  driver_fio text NOT NULL DEFAULT '',
  start_at date NULL,
  end_at date NULL,
  note text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fleet_repairs (
  id text PRIMARY KEY,
  vehicle_id text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'repair',
  title text NOT NULL DEFAULT '',
  repair_date date NULL,
  ym text NOT NULL DEFAULT '',
  odometer integer NOT NULL DEFAULT 0,
  amount numeric(14, 2) NOT NULL DEFAULT 0,
  parts text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'done',
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT '',
  author_role text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fleet_expenses (
  id text PRIMARY KEY,
  vehicle_id text NOT NULL DEFAULT '',
  driver_fio text NOT NULL DEFAULT '',
  exp_date date NULL,
  ym text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'podotchet',
  title text NOT NULL DEFAULT '',
  amount numeric(14, 2) NOT NULL DEFAULT 0,
  qty numeric(12, 2) NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'шт',
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  author text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fleet_acts (
  id text PRIMARY KEY,
  vehicle_id text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'handover',
  act_no text NOT NULL DEFAULT '',
  act_date date NULL,
  driver_fio text NOT NULL DEFAULT '',
  accept_fio text NOT NULL DEFAULT '',
  odometer integer NOT NULL DEFAULT 0,
  condition text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  author text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fleet_shifts_v ON fleet_shifts (vehicle_id);
CREATE INDEX IF NOT EXISTS fleet_repairs_v ON fleet_repairs (vehicle_id);
CREATE INDEX IF NOT EXISTS fleet_expenses_v ON fleet_expenses (vehicle_id);
CREATE INDEX IF NOT EXISTS fleet_acts_v ON fleet_acts (vehicle_id);
