CREATE TABLE IF NOT EXISTS norms_cache (
    id BIGSERIAL PRIMARY KEY,
    phrase TEXT NOT NULL,
    ref TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    hits INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS norms_cache_phrase_uniq ON norms_cache (phrase);
CREATE INDEX IF NOT EXISTS norms_cache_hits_idx ON norms_cache (hits DESC);