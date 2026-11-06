/** 推送与 RSS 使用相同的非负安全整数版本号。缺省值兼容旧来源。 */
export function parseNewsVersion(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const version =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value.trim())
        ? Number(value.trim())
        : NaN;
  if (!Number.isSafeInteger(version) || version < 0) throw new Error("Invalid news version");
  return version;
}

export function isStaleNewsRevision(
  incoming: { publishedAt: number; version?: number },
  stored: { published_at: number; push_version: number | null },
) {
  return (
    incoming.publishedAt < stored.published_at ||
    (stored.push_version !== null &&
      (incoming.version === undefined
        ? incoming.publishedAt === stored.published_at
        : incoming.version < stored.push_version))
  );
}

/** 与 isStaleNewsRevision 相同的判断，最终写入时原子执行，避免并发竞态。 */
export const STALE_NEWS_REVISION_SQL = `
  excluded.published_at < news_articles.published_at OR
  (news_articles.push_version IS NOT NULL AND (
    (excluded.push_version IS NULL AND excluded.published_at = news_articles.published_at) OR
    (excluded.push_version IS NOT NULL AND excluded.push_version < news_articles.push_version)
  ))`;
