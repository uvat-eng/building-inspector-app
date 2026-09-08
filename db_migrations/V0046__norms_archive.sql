CREATE TABLE IF NOT EXISTS norms_archive (
  id bigserial PRIMARY KEY,
  src text NOT NULL DEFAULT '',
  dt date NULL,
  customer text NOT NULL DEFAULT '',
  contractor text NOT NULL DEFAULT '',
  field text NOT NULL DEFAULT '',
  object text NOT NULL DEFAULT '',
  order_no text NOT NULL DEFAULT '',
  text text NOT NULL,
  ref text NOT NULL,
  ref_src text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT '',
  hits integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS norms_archive_tsv
  ON norms_archive USING gin (to_tsvector('russian', text));

CREATE INDEX IF NOT EXISTS norms_archive_kind ON norms_archive (kind);
