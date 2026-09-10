CREATE TABLE IF NOT EXISTS doc_reviews (
    id            VARCHAR(16) PRIMARY KEY,
    kind          VARCHAR(12) NOT NULL,
    object_id     VARCHAR(32),
    object_name   TEXT NOT NULL DEFAULT '',
    title         TEXT NOT NULL DEFAULT '',
    inspector     TEXT NOT NULL DEFAULT '',
    status        VARCHAR(12) NOT NULL DEFAULT 'new',
    files_count   INTEGER NOT NULL DEFAULT 0,
    pages_count   INTEGER NOT NULL DEFAULT 0,
    verdict       TEXT NOT NULL DEFAULT '',
    ctrl_verdict  TEXT NOT NULL DEFAULT '',
    ctrl_score    INTEGER NOT NULL DEFAULT 0,
    complete_note TEXT NOT NULL DEFAULT '',
    engine        VARCHAR(24) NOT NULL DEFAULT '',
    error         TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    checked_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS doc_review_files (
    id         VARCHAR(16) PRIMARY KEY,
    review_id  VARCHAR(16) NOT NULL,
    name       TEXT NOT NULL DEFAULT '',
    url        TEXT NOT NULL DEFAULT '',
    mime       TEXT NOT NULL DEFAULT '',
    size_kb    INTEGER NOT NULL DEFAULT 0,
    pages      INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doc_review_notes (
    id         VARCHAR(16) PRIMARY KEY,
    review_id  VARCHAR(16) NOT NULL,
    scope      VARCHAR(12) NOT NULL DEFAULT 'norms',
    num        INTEGER NOT NULL DEFAULT 0,
    severity   VARCHAR(12) NOT NULL DEFAULT 'Замечание',
    section    TEXT NOT NULL DEFAULT '',
    text       TEXT NOT NULL DEFAULT '',
    norm_ref   TEXT NOT NULL DEFAULT '',
    norm_quote TEXT NOT NULL DEFAULT '',
    demand     TEXT NOT NULL DEFAULT '',
    file_name  TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_reviews_kind ON doc_reviews (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_reviews_object ON doc_reviews (object_name);
CREATE INDEX IF NOT EXISTS idx_doc_review_files_rev ON doc_review_files (review_id);
CREATE INDEX IF NOT EXISTS idx_doc_review_notes_rev ON doc_review_notes (review_id, scope, num);
