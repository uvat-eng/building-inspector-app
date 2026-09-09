CREATE TABLE IF NOT EXISTS waybills (
  id text PRIMARY KEY,
  vehicle_id text NOT NULL DEFAULT '',
  number text NOT NULL DEFAULT '',
  series text NOT NULL DEFAULT '',
  wb_date date NULL,
  ym text NOT NULL DEFAULT '',
  valid_from date NULL,
  valid_to date NULL,
  org text NOT NULL DEFAULT '',
  customer text NOT NULL DEFAULT '',
  customer_person text NOT NULL DEFAULT '',
  column_no text NOT NULL DEFAULT '',
  brigade text NOT NULL DEFAULT '',
  car_model text NOT NULL DEFAULT '',
  car_plate text NOT NULL DEFAULT '',
  trailer_model text NOT NULL DEFAULT '',
  trailer_plate text NOT NULL DEFAULT '',
  driver_fio text NOT NULL DEFAULT '',
  tab_no text NOT NULL DEFAULT '',
  license text NOT NULL DEFAULT '',
  driver_class text NOT NULL DEFAULT '',
  snils text NOT NULL DEFAULT '',
  transport_kind text NOT NULL DEFAULT 'перевозка для собственных нужд',
  message_kind text NOT NULL DEFAULT 'междугороднее сообщение',
  depart_at text NOT NULL DEFAULT '',
  return_at text NOT NULL DEFAULT '',
  odo_out integer NOT NULL DEFAULT 0,
  odo_in integer NOT NULL DEFAULT 0,
  zero_run integer NOT NULL DEFAULT 0,
  fuel_brand text NOT NULL DEFAULT '',
  fuel_issued numeric(10, 2) NOT NULL DEFAULT 0,
  fuel_out numeric(10, 2) NOT NULL DEFAULT 0,
  fuel_in numeric(10, 2) NOT NULL DEFAULT 0,
  fuel_returned numeric(10, 2) NOT NULL DEFAULT 0,
  fuel_norm numeric(10, 2) NOT NULL DEFAULT 0,
  fuel_fact numeric(10, 2) NOT NULL DEFAULT 0,
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  works jsonb NOT NULL DEFAULT '[]'::jsonb,
  med_before text NOT NULL DEFAULT '',
  med_after text NOT NULL DEFAULT '',
  tech_before text NOT NULL DEFAULT '',
  tech_after text NOT NULL DEFAULT '',
  dispatcher text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  author text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS waybills_ym ON waybills (ym);
CREATE INDEX IF NOT EXISTS waybills_v ON waybills (vehicle_id);

CREATE TABLE IF NOT EXISTS part_requests (
  id text PRIMARY KEY,
  vehicle_id text NOT NULL DEFAULT '',
  driver_fio text NOT NULL DEFAULT '',
  req_no text NOT NULL DEFAULT '',
  req_date date NULL,
  ym text NOT NULL DEFAULT '',
  urgency text NOT NULL DEFAULT 'normal',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason text NOT NULL DEFAULT '',
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new',
  answer text NOT NULL DEFAULT '',
  answer_by text NOT NULL DEFAULT '',
  answer_at timestamp NULL,
  author text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS part_requests_v ON part_requests (vehicle_id);

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vin text NOT NULL DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS year_made text NOT NULL DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine text NOT NULL DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS transmission text NOT NULL DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tyres text NOT NULL DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_kind text NOT NULL DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tank integer NOT NULL DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS condition text NOT NULL DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS past_repairs text NOT NULL DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS next_service text NOT NULL DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tech_to text NOT NULL DEFAULT '';
