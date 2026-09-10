ALTER TABLE doc_review_files
    ADD COLUMN IF NOT EXISTS done_pages INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ocr_pages  INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS doc_review_pages (
    id         VARCHAR(20) PRIMARY KEY,
    review_id  VARCHAR(16) NOT NULL,
    file_id    VARCHAR(16) NOT NULL,
    page_no    INTEGER NOT NULL DEFAULT 0,
    method     VARCHAR(8) NOT NULL DEFAULT 'text',
    text       TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_pages_rev ON doc_review_pages (review_id, file_id, page_no);

ALTER TABLE doc_reviews
    ADD COLUMN IF NOT EXISTS stage       VARCHAR(16) NOT NULL DEFAULT 'upload',
    ADD COLUMN IF NOT EXISTS done_pages  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ocr_pages   INTEGER NOT NULL DEFAULT 0;
