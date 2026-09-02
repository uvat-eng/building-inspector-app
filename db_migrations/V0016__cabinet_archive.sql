CREATE TABLE IF NOT EXISTS cabinet_archive (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    fio TEXT NOT NULL DEFAULT '',
    "group" TEXT NOT NULL DEFAULT '',
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE (user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS cabinet_archive_user_idx ON cabinet_archive (user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS cabinet_archive_group_idx ON cabinet_archive ("group", snapshot_date DESC);