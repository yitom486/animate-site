-- 清空已入库的装饰封面（模板二维码、站点图标、占位图等），不删除稿件。
-- 与 app/lib/news/cover.ts 中 DECORATIVE_NEWS_IMAGE_LIKE 保持一致。
-- 仅把 image_url 置空；生产/预览需各自 apply，不要在未确认时对生产 D1 执行。
UPDATE news_articles
SET image_url = NULL
WHERE image_url IS NOT NULL
  AND image_url != ''
  AND (
    lower(image_url) LIKE '%/template/%'
    OR lower(image_url) LIKE '%dean_nova%'
    OR lower(image_url) LIKE '%/deancss/%'
    OR lower(image_url) LIKE '%ewm.png%'
    OR lower(image_url) LIKE '%/ewm.%'
    OR lower(image_url) LIKE '%qrcode%'
    OR lower(image_url) LIKE '%qr-code%'
    OR lower(image_url) LIKE '%qr_code%'
    OR lower(image_url) LIKE '%weibo.png%'
    OR lower(image_url) LIKE '%weixin.png%'
    OR lower(image_url) LIKE '%/share/%'
    OR lower(image_url) LIKE '%/social/%'
    OR lower(image_url) LIKE '%/icons/%'
    OR lower(image_url) LIKE '%/icon/%'
    OR lower(image_url) LIKE '%noimage%'
    OR lower(image_url) LIKE '%no-image%'
    OR lower(image_url) LIKE '%no_image%'
    OR lower(image_url) LIKE '%placeholder%'
  );
