import type { BilibiliMatch } from "~/lib/bilibili";
import { THIRD_PARTY_SEARCH } from "~/lib/external-links";

type BilibiliPlayerProps = {
  match: BilibiliMatch | null;
  fallbackKeyword: string;
};

export function BilibiliPlayer({ match, fallbackKeyword }: BilibiliPlayerProps) {
  const searchUrl = THIRD_PARTY_SEARCH.online.build(fallbackKeyword);

  if (!match) {
    return (
      <section className="space-y-2 rounded-lg border border-rose-100 bg-white/58 p-3 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800">B 站观看</h3>
        <p className="text-xs leading-relaxed text-slate-500">
          未能自动匹配到 B 站番剧（可能无版权或接口限流）。请使用下方「在线链接」在 B
          站搜索后观看。
        </p>
        <a
          href={searchUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-xs font-bold text-rose-700 hover:underline"
        >
          在 B 站搜索「{fallbackKeyword}」→
        </a>
      </section>
    );
  }

  return (
    <section className="space-y-2 rounded-lg border border-rose-100 bg-white/58 p-3 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">B 站观看</h3>
        <a
          href={match.pageUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold text-rose-700 hover:underline"
        >
          在 B 站打开 →
        </a>
      </div>
      <p className="text-[11px] text-slate-500">
        已匹配：{match.title}
        <span className="text-slate-400"> · 若不对请用下方搜索链接</span>
      </p>
      <div className="overflow-hidden rounded-lg border border-rose-100 bg-black/5">
        <iframe
          src={match.embedUrl}
          title={`B站：${match.title}`}
          className="aspect-video w-full border-0"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          loading="lazy"
        />
      </div>
    </section>
  );
}
