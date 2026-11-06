-- Allow one channel to track multiple RSS sources (anime / anime:<hash>, events / events:<hash>).
CREATE TABLE news_feeds_new (
  id TEXT PRIMARY KEY CHECK (
    id IN ('anime', 'events')
    OR id GLOB 'anime:*'
    OR id GLOB 'events:*'
  ),
  etag TEXT,
  last_modified TEXT,
  checked_at INTEGER,
  success_at INTEGER,
  next_check_at INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0,
  error TEXT
);

INSERT INTO news_feeds_new (
  id, etag, last_modified, checked_at, success_at, next_check_at, lease_until, error
)
SELECT
  id, etag, last_modified, checked_at, success_at, next_check_at, lease_until, error
FROM news_feeds;

DROP TABLE news_feeds;
ALTER TABLE news_feeds_new RENAME TO news_feeds;

CREATE INDEX IF NOT EXISTS news_articles_source_url
  ON news_articles(channel, source_url);
