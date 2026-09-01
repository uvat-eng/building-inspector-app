CREATE TABLE IF NOT EXISTS signed_docs (
    id TEXT PRIMARY KEY,
    object_id TEXT NOT NULL,
    section TEXT NOT NULL,
    period TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    file_url TEXT NOT NULL DEFAULT '',
    file_name TEXT NOT NULL DEFAULT '',
    mime TEXT NOT NULL DEFAULT '',
    file_size BIGINT NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT '',
    uploaded_by TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signed_docs_obj_idx ON signed_docs (object_id, section, period);
CREATE INDEX IF NOT EXISTS signed_docs_created_idx ON signed_docs (created_at DESC);