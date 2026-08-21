import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_URL = "https://cdn.jsdelivr.net/npm/bangumi-data@latest/dist/data.json";
const BACKUP_URL =
  "https://raw.githubusercontent.com/bangumi-data/bangumi-data/master/dist/data.json";

const OUTPUT_DIR = path.resolve(process.cwd(), "public/data/bangumi-data");

type RawSite = {
  site: string;
  id?: string;
  url?: string;
  begin?: string;
  broadcast?: string;
};

type RawItem = {
  title: string;
  titleTranslate?: Record<string, string[]>;
  type: string;
  lang: string;
  officialSite?: string;
  begin?: string;
  end?: string;
  sites?: RawSite[];
};

type RawData = {
  siteMeta: Record<string, unknown>;
  items: RawItem[];
};

export type ShardedBangumiItem = {
  title?: string;
  sites: Array<{
    site: string;
    id: string;
  }>;
  begin?: string;
  broadcast?: string;
};

// 感兴趣的平台（过滤掉无用站点）
const INTERESTED_SITES = new Set([
  "bangumi",
  "bilibili",
  "bilibili_hk_mo_tw",
  "gamer",
  "gamer_hk",
  "mikan",
  "iqiyi",
  "tencent",
  "youku",
  "netflix",
  "crunchyroll",
  "disneyplus",
  "danime",
  "abema",
  "unext",
  "prime",
  "nicovideo",
  "mal",
  "anidb",
  "aniList",
  "tmdb",
]);

async function fetchRawData(): Promise<RawData> {
  console.log(`[bangumi-data] 正在从 CDN 获取最新数据: ${SOURCE_URL}`);
  try {
    const res = await fetch(SOURCE_URL, {
      headers: { "User-Agent": "animate-site-build/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return (await res.json()) as RawData;
  } catch (e) {
    console.warn(`[bangumi-data] CDN 失败，尝试备用源: ${BACKUP_URL}`, e);
  }

  const backupRes = await fetch(BACKUP_URL, {
    headers: { "User-Agent": "animate-site-build/1.0" },
    signal: AbortSignal.timeout(20000),
  });
  if (!backupRes.ok) {
    throw new Error(`获取 bangumi-data 失败: HTTP ${backupRes.status}`);
  }
  return (await backupRes.json()) as RawData;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const raw = await fetchRawData();
  console.log(`[bangumi-data] 成功获取 ${raw.items.length} 条原始条目`);

  const shards: Record<string, Record<string, ShardedBangumiItem>> = {};

  for (const item of raw.items) {
    if (!item.sites || !item.sites.length) continue;

    // 找到 bangumi 的 subject id
    const bgmSite = item.sites.find((s) => s.site === "bangumi" && s.id);
    if (!bgmSite || !bgmSite.id) continue;

    const bgmId = bgmSite.id.trim();

    // 过滤出关心的第三方 sites
    const validSites: Array<{ site: string; id: string }> = [];
    for (const s of item.sites) {
      if (s.site === "bangumi") continue;
      if (INTERESTED_SITES.has(s.site) && (s.id || s.url)) {
        validSites.push({
          site: s.site,
          id: String(s.id || s.url),
        });
      }
    }

    if (validSites.length === 0) continue;

    // 计算年份分片
    let year = "archive";
    if (item.begin) {
      const match = item.begin.match(/^(\d{4})/);
      if (match) {
        const y = parseInt(match[1], 10);
        if (y >= 2010) {
          year = String(y);
        } else {
          year = "archive";
        }
      }
    }

    if (!shards[year]) {
      shards[year] = {};
    }

    const entry: ShardedBangumiItem = {
      sites: validSites,
    };
    if (item.title) entry.title = item.title;
    if (item.begin) entry.begin = item.begin;

    shards[year][bgmId] = entry;
  }

  let totalMapped = 0;
  const shardKeys = Object.keys(shards).sort();

  for (const key of shardKeys) {
    const data = shards[key];
    const count = Object.keys(data).length;
    totalMapped += count;
    const filePath = path.join(OUTPUT_DIR, `${key}.json`);
    const jsonStr = JSON.stringify(data);
    await fs.writeFile(filePath, jsonStr, "utf-8");
    const sizeKb = (Buffer.byteLength(jsonStr, "utf-8") / 1024).toFixed(1);
    console.log(`[bangumi-data] 写入分片 ${key}.json: ${count} 条目 (${sizeKb} KB)`);
  }

  console.log(`[bangumi-data] 处理完成！共映射 ${totalMapped} 部番剧，生成 ${shardKeys.length} 个分片文件。`);
}

main().catch((err) => {
  console.error("[bangumi-data] 处理失败:", err);
  process.exit(1);
});
