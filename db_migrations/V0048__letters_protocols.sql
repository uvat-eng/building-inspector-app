CREATE TABLE IF NOT EXISTS cust_letters (
  id text PRIMARY KEY,
  kind text NOT NULL DEFAULT 'letter',
  number text NOT NULL DEFAULT '',
  letter_date date NULL,
  ym text NOT NULL DEFAULT '',
  sender text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  object_id text NOT NULL DEFAULT '',
  field_key text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  due_at date NULL,
  author text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cust_replies (
  id text PRIMARY KEY,
  letter_id text NOT NULL,
  number text NOT NULL DEFAULT '',
  reply_date date NULL,
  subject text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cust_points (
  id text PRIMARY KEY,
  letter_id text NOT NULL,
  num text NOT NULL DEFAULT '',
  text text NOT NULL DEFAULT '',
  responsible text NOT NULL DEFAULT '',
  due_at date NULL,
  status text NOT NULL DEFAULT 'open',
  status_note text NOT NULL DEFAULT '',
  status_by text NOT NULL DEFAULT '',
  status_at timestamp NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cust_letters_kind_ym ON cust_letters (kind, ym);
CREATE INDEX IF NOT EXISTS cust_replies_lid ON cust_replies (letter_id);
CREATE INDEX IF NOT EXISTS cust_points_lid ON cust_points (letter_id);
