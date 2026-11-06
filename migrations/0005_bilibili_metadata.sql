CREATE TABLE IF NOT EXISTS bilibili_metadata_cache (
  media_id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL,
  fetched_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS bilibili_metadata_requests (
  id TEXT PRIMARY KEY,
  requested_at INTEGER NOT NULL,
  client TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS bilibili_metadata_requests_time ON bilibili_metadata_requests(requested_at);
CREATE INDEX IF NOT EXISTS bilibili_metadata_requests_client ON bilibili_metadata_requests(client, requested_at);
