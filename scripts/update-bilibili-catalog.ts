import { readFile, rename, writeFile } from "node:fs/promises";
import { resolveBilibiliMedia } from "../app/lib/bilibili/search";
import { parseBilibiliMediaId } from "../app/lib/bilibili/player";
import type { BilibiliCatalogEntry } from "../app/lib/bilibili/catalog.server";

const ids = [
  ...new Set(
    process.argv.slice(2).map((value) => {
      const id = parseBilibiliMediaId(value);
      if (!id) throw new Error("参数应为有效的 B 站 mediaId 或官方媒体页 URL");
      return id;
    }),
  ),
];
if (!ids.length) throw new Error("用法：bun run data:bilibili <mediaId> [mediaId ...]");

const target = new URL("../app/lib/bilibili/catalog.json", import.meta.url);
const catalog: Record<string, BilibiliCatalogEntry> = JSON.parse(await readFile(target, "utf8"));
let failed = false;
for (const id of ids) {
  const result = await resolveBilibiliMedia(id);
  if (!result.match?.episodes.length) {
    console.error(`mediaId=${id}: ${result.status}，保留上次成功资料`);
    failed = true;
    continue;
  }
  catalog[String(id)] = {
    updatedAt: new Date().toISOString(),
    seasonId: result.match.seasonId,
    title: result.match.title,
    episodes: result.match.episodes.map(({ epId, indexLabel, title, badge }) => ({
      epId,
      indexLabel,
      title,
      badge,
    })),
  };
  console.log(`mediaId=${id}: ${result.match.title}，${result.match.episodes.length} 集`);
}
const temporary = new URL(`${target.href}.tmp`);
await writeFile(temporary, `${JSON.stringify(catalog, null, 2)}\n`);
await rename(temporary, target);
if (failed) process.exitCode = 1;
