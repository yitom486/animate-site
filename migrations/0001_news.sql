CREATE TABLE IF NOT EXISTS news_articles (
  id TEXT PRIMARY KEY,
  guid TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL CHECK (channel IN ('anime', 'events')),
  title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  content_html TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  first_seen_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS news_articles_channel_date
  ON news_articles(channel, published_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS news_articles_date
  ON news_articles(published_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS news_feeds (
  id TEXT PRIMARY KEY CHECK (id IN ('anime', 'events')),
  etag TEXT,
  last_modified TEXT,
  checked_at INTEGER,
  success_at INTEGER,
  next_check_at INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
