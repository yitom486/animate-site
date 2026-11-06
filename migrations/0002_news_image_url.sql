-- 可空封面字段：旧行保持 NULL，同步时从 enclosure / media / 正文首图回填。
ALTER TABLE news_articles ADD COLUMN image_url TEXT;
