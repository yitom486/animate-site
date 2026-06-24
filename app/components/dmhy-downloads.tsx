import { Magnet } from "lucide-react";
import type { DmhyItem } from "~/lib/dmhy";

type DmhyDownloadsProps = {
  items: DmhyItem[];
  searchKeyword: string;
};

function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

export function DmhyDownloads({ items, searchKeyword }: DmhyDownloadsProps) {
  const searchUrl = `https://share.dmhy.org/topics/list?keyword=${encodeURIComponent(
    searchKeyword,
  )}`;

  return (
    <section className="space-y-3 rounded-lg border border-rose-100 bg-white/58 p-3 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">下载资源</h3>
        <a
          href={searchUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold text-rose-700 hover:underline"
        >
          在動漫花園搜索 →
        </a>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">
        数据来自動漫花園（dmhy）按番名关键词搜索，可能含多个字幕组 / 译名版本。
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
                {item.resolution ? (
                  <span className="rounded bg-sky-50 px-1.5 py-0.5 font-mono text-sky-700">
                    {item.resolution}
                  </span>
                ) : null}
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
                  详情页
                </a>
                {item.magnet ? (
                  <a
                    href={item.magnet}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-rose-700 hover:underline"
                  >
                    <Magnet className="size-3" />
                    磁力链接
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-rose-100 bg-rose-50/40 px-3 py-4 text-center text-xs text-slate-500">
          未搜索到相关资源，可点上方「在動漫花園搜索」手动查找。
        </p>
      )}
    </section>
  );
}
