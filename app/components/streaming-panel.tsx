import { useState } from "react";
import { ExternalLink, Play, Tv, Sparkles, Download, Globe } from "lucide-react";
import { useBangumiData, getSiteMeta, buildSiteHref } from "~/lib/bangumi-data";
import { BilibiliPlayer } from "~/components/bilibili-player";
import { THIRD_PARTY_SEARCH } from "~/lib/external-links";
import { cn } from "~/lib/utils";

type StreamingPanelProps = {
  id: string;
  date?: string;
  title: string;
};

export function StreamingPanel({ id, date, title }: StreamingPanelProps) {
  const { data: bgmData, loading } = useBangumiData(id, date);

  // 过滤出可用的播放与资源站点
  const availableSites = (bgmData?.sites ?? [])
    .map((s) => {
      const meta = getSiteMeta(s.site);
      if (!meta) return null;
      const href = buildSiteHref(s.site, s.id);
      if (!href) return null;
      return {
        ...s,
        meta,
        href,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  // 分类站点：流媒体 / 下载
  const streamingSites = availableSites.filter((s) => s.meta.category !== "download" && s.meta.category !== "db");
  const mikanSite = availableSites.find((s) => s.site === "mikan");

  // 选中的 Tab：优先默认选 bilibili，其次选第一个流媒体，若无则选 fallback
  const defaultSelectedKey =
    streamingSites.find((s) => s.site === "bilibili" || s.site === "bilibili_hk_mo_tw")?.site ||
    streamingSites[0]?.site ||
    "bilibili";

  const [activeTab, setActiveTab] = useState<string>(defaultSelectedKey);

  const currentSelectedSite = streamingSites.find((s) => s.site === activeTab);

  return (
    <section className="space-y-3 rounded-lg border border-rose-100/90 bg-white/70 p-3.5 shadow-sm">
      {/* 头部标题与可用平台 Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-100/60 pb-2.5">
        <div className="flex items-center gap-2">
          <Tv className="size-4 text-rose-600" />
          <h3 className="font-serif text-sm font-bold text-slate-800">
            播放与正版平台
          </h3>
          {streamingSites.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              <Sparkles className="size-2.5" />
              已收录 {streamingSites.length} 个正版源
            </span>
          ) : null}
        </div>

        {/* 蜜柑快速直达链接 */}
        {mikanSite ? (
          <a
            href={mikanSite.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50/80 px-2 py-1 text-[11px] font-semibold text-amber-800 transition-colors hover:bg-amber-100"
          >
            <Download className="size-3 text-amber-600" />
            蜜柑计划专属 ↗
          </a>
        ) : null}
      </div>

      {/* 平台选择栏 */}
      {streamingSites.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {streamingSites.map((item) => {
            const isSelected = activeTab === item.site;
            return (
              <button
                key={item.site}
                type="button"
                onClick={() => setActiveTab(item.site)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all",
                  isSelected
                    ? "border-rose-300 bg-rose-500 text-white shadow-sm"
                    : cn(
                        "border-slate-200 bg-white/80 text-slate-700 hover:border-rose-200 hover:bg-white",
                        item.meta.themeColor.hover,
                      ),
                )}
              >
                <Play className={cn("size-3", isSelected ? "text-white" : "text-rose-500")} />
                {item.meta.name}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* 面板内容渲染 */}
      {/* 1. 如果当前选中的是 Bilibili */}
      {activeTab === "bilibili" || activeTab === "bilibili_hk_mo_tw" ? (
        <div className="space-y-2">
          {currentSelectedSite ? (
            <div className="flex items-center justify-between rounded-lg border border-pink-100 bg-pink-50/50 px-3 py-2 text-xs">
              <span className="text-pink-900">
                已命中 B 站官方条目 <span className="font-mono text-pink-700">(md{currentSelectedSite.id})</span>
              </span>
              <a
                href={currentSelectedSite.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-pink-700 hover:underline"
              >
                直达 B 站番剧页
                <ExternalLink className="size-3" />
              </a>
            </div>
          ) : null}

          {/* 嵌入原有的 BilibiliPlayer（带选集内嵌与平滑降级） */}
          <BilibiliPlayer id={id} fallbackKeyword={title} />
        </div>
      ) : currentSelectedSite ? (
        /* 2. 其它平台（動畫瘋、Netflix、爱奇艺等） */
        <div className="rounded-lg border border-slate-100 bg-white/85 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-block rounded px-2 py-0.5 text-xs font-bold",
                    currentSelectedSite.meta.themeColor.bg,
                    currentSelectedSite.meta.themeColor.text,
                    currentSelectedSite.meta.themeColor.border,
                  )}
                >
                  {currentSelectedSite.meta.badge}
                </span>
                <h4 className="font-serif text-sm font-bold text-slate-800">
                  {currentSelectedSite.meta.name}
                </h4>
              </div>
              <p className="text-xs text-slate-500">
                已匹配该平台正版播放页面，点击下方按钮即可前往官方播放：
              </p>
            </div>

            <a
              href={currentSelectedSite.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-rose-700"
            >
              <Globe className="size-3.5" />
              前往 {currentSelectedSite.meta.name} 观看 ↗
            </a>
          </div>
        </div>
      ) : (
        /* 3. 未命中任何静态平台的保底 */
        <div className="space-y-2 rounded-lg border border-dashed border-rose-200 bg-rose-50/40 p-3 text-xs text-slate-600">
          <p>暂无静态流媒体平台收录，可通过第三方搜索引擎快速查找：</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={THIRD_PARTY_SEARCH.online.build(title)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2.5 py-1 font-semibold text-rose-700 hover:bg-rose-50"
            >
              在 B 站搜索「{title}」↗
            </a>
            <a
              href={`https://ani.gamer.com.tw/search.php?kw=${encodeURIComponent(title)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2.5 py-1 font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              在 動畫瘋 搜索「{title}」↗
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
