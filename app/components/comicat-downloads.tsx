import { Download, ExternalLink } from "lucide-react";
import type { ComicatItem } from "~/lib/comicat";
import { THIRD_PARTY_SEARCH } from "~/lib/external-links";

type ComicatDownloadsProps = {
  items: ComicatItem[];
  searchKeyword: string;
};

function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ComicatDownloads({ items, searchKeyword }: ComicatDownloadsProps) {
  const searchUrl = THIRD_PARTY_SEARCH.download.build(searchKeyword);

  return (
    <section className="space-y-3 rounded-lg border border-rose-100 bg-white/58 p-3 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">漫猫下载</h3>
        <a
          href={searchUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold text-rose-700 hover:underline"
        >
          在漫猫搜索 →
        </a>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">
        数据来自漫猫官方 RSS，按标题匹配「{searchKeyword}」，可能不全或不准；下载请在漫猫详情页完成。
      </p>

      {items.length ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-rose-100/80 bg-white/70 px-3 py-2.5"
            >
              <p className="text-xs font-medium leading-snug text-slate-800">
                {item.title}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                {item.author ? <span>{item.author}</span> : null}
                {item.resolution ? (
                  <span className="rounded bg-sky-50 px-1.5 py-0.5 font-mono text-sky-700">
                    {item.resolution}
                  </span>
                ) : null}
                {item.category ? <span>{item.category}</span> : null}
                {formatDate(item.publishedAt) ? (
                  <span className="font-mono">{formatDate(item.publishedAt)}</span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:underline"
                >
                  <ExternalLink className="size-3" />
                  详情页
                </a>
                {item.torrentUrl ? (
                  <a
                    href={item.torrentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-rose-700 hover:underline"
                  >
                    <Download className="size-3" />
                    种子文件
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-rose-100 bg-rose-50/40 px-3 py-4 text-center text-xs text-slate-500">
          近期 RSS 中未匹配到相关资源，请使用上方搜索或稍后再试。
        </p>
      )}
    </section>
  );
}
