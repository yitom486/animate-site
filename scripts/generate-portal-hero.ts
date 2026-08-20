/**
 * 从现有 portal-hero 源图生成响应式 AVIF / WebP / JPEG。
 * 源图上限 1024×1024；Hero 为低透明度装饰层，质量可偏压缩。
 *
 *   bun run assets:hero
 */
import sharp from "sharp";
import { readdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/assets");
const SRC_CANDIDATES = [
  join(OUT, "portal-hero-source.jpg"),
  join(OUT, "portal-hero-source.webp"),
  join(OUT, "portal-hero-1024.webp"),
  join(OUT, "portal-hero.webp"),
];

/** 与布局匹配的宽度档（源图为 1024，不再放大） */
const WIDTHS = [480, 768, 1024] as const;

const QUALITY = {
  avif: 40,
  webp: 50,
  jpeg: 58,
} as const;

async function resolveSource(): Promise<string> {
  const { access } = await import("node:fs/promises");
  for (const p of SRC_CANDIDATES) {
    try {
      await access(p);
      return p;
    } catch {
      /* try next */
    }
  }
  throw new Error(`找不到 Hero 源图，试过：\n${SRC_CANDIDATES.join("\n")}`);
}

function clearGenerated(keepSource: string) {
  const prefix = "portal-hero-";
  for (const name of readdirSync(OUT)) {
    if (!name.startsWith(prefix)) continue;
    if (name.startsWith("portal-hero-source.")) continue;
    const full = join(OUT, name);
    if (full === keepSource) continue;
    // 只清数字档位产物
    if (/^portal-hero-\d+\.(avif|webp|jpe?g)$/.test(name)) {
      unlinkSync(full);
    }
  }
}

async function main() {
  const src = await resolveSource();
  console.log("source:", src);
  clearGenerated(src);

  const meta = await sharp(src).metadata();
  console.log(`meta: ${meta.format} ${meta.width}x${meta.height}`);

  for (const w of WIDTHS) {
    const resized = sharp(src).resize(w, w, { fit: "cover", withoutEnlargement: true });

    const avifPath = join(OUT, `portal-hero-${w}.avif`);
    const webpPath = join(OUT, `portal-hero-${w}.webp`);
    const jpegPath = join(OUT, `portal-hero-${w}.jpg`);

    const [avif, webp, jpeg] = await Promise.all([
      resized.clone().avif({ quality: QUALITY.avif, effort: 6 }).toFile(avifPath),
      resized.clone().webp({ quality: QUALITY.webp }).toFile(webpPath),
      resized.clone().jpeg({ quality: QUALITY.jpeg, mozjpeg: true }).toFile(jpegPath),
    ]);

    console.log(
      `${w}w  avif=${avif.size}  webp=${webp.size}  jpeg=${jpeg.size}  (q a${QUALITY.avif}/w${QUALITY.webp}/j${QUALITY.jpeg})`,
    );
  }

  console.log("done → public/assets/portal-hero-{480,768,1024}.{avif,webp,jpg}");
}

await main();
