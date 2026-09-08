CREATE TABLE IF NOT EXISTS contracts (
  id text PRIMARY KEY,
  number text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  customer text NOT NULL DEFAULT '',
  location_id text NOT NULL DEFAULT '',
  field_key text NOT NULL DEFAULT '',
  objects jsonb NOT NULL DEFAULT '[]'::jsonb,
  chief text NOT NULL DEFAULT '',
  signed_at date NULL,
  start_at date NULL,
  end_at date NULL,
  amount numeric(16, 2) NOT NULL DEFAULT 0,
  vat text NOT NULL DEFAULT 'Без НДС',
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  author text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contract_acts (
  id text PRIMARY KEY,
  contract_id text NOT NULL,
  number text NOT NULL DEFAULT '',
  act_date date NULL,
  period text NOT NULL DEFAULT '',
  amount numeric(16, 2) NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  paid_at date NULL,
  note text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_acts_cid ON contract_acts (contract_id);
CREATE INDEX IF NOT EXISTS contracts_loc ON contracts (location_id);
