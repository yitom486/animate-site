-- Optional finished-push revision counter; RSS rows leave this NULL.
ALTER TABLE news_articles ADD COLUMN push_version INTEGER;
