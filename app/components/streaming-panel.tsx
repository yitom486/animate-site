import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/motion/tabs";
import { Skeleton } from "~/components/ui/skeleton";
import { useState } from "react";
import { ExternalLink, Play, Tv, Download, Globe } from "lucide-react";
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
  const streamingSites = availableSites.filter(
    (s) => s.meta.category !== "download" && s.meta.category !== "db",
  );
  const mikanSite = availableSites.find((s) => s.site === "mikan");

  // 选中的 Tab：优先默认选 bilibili，其次选第一个流媒体，若无则选 fallback
  const defaultSelectedKey =
    streamingSites.find((s) => s.site === "bilibili" || s.site === "bilibili_hk_mo_tw")?.site ||
    streamingSites[0]?.site ||
    "bilibili";

  const [selection, setSelection] = useState<{ id: string; site: string } | null>(null);
  const activeTab =
    selection?.id === id && streamingSites.some((site) => site.site === selection.site)
      ? selection.site
      : defaultSelectedKey;

  const currentSelectedSite = streamingSites.find((s) => s.site === activeTab);

  return (
    <section className="rounded-lg border border-border bg-card p-3.5">
      <Tabs
        value={activeTab}
        onValueChange={(site) => setSelection({ id, site })}
        variant="underline"
        className="space-y-3"
      >
        {/* 头部标题与可用平台 Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/25 pb-2.5">
          <div className="flex items-center gap-2">
            <Tv className="size-4 text-primary" />
            <h3 className="font-serif text-sm font-bold text-foreground">播放与正版平台</h3>
            {streamingSites.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
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
              className="inline-flex items-center gap-1 rounded-md border border-warning/25 bg-warning/10 px-2 py-1 text-[11px] font-semibold text-rating transition-colors hover:bg-warning/10"
            >
              <Download className="size-3 text-rating" />
              蜜柑计划专属 ↗
            </a>
          ) : null}
        </div>

        {loading ? <Skeleton className="h-24 w-full" aria-label="正在加载播放平台" /> : null}
        {!loading && streamingSites.length > 0 ? (
          <TabsList aria-label="播放平台" className="gap-2">
            {streamingSites.map((item) => (
              <TabsTrigger
                key={item.site}
                value={item.site}
                className="px-2 text-xs"
                icon={<Play className="size-3" />}
              >
                {item.meta.name}
              </TabsTrigger>
            ))}
          </TabsList>
        ) : null}

        {!loading &&
          (streamingSites.length ? streamingSites.map((site) => site.site) : ["bilibili"]).map(
            (site) => (
              <TabsContent key={site} value={site} className="mt-3">
                {activeTab === site ? (
                  <>
                    {/* 面板内容渲染 */}
                    {/* 1. 如果当前选中的是 Bilibili */}
                    {activeTab === "bilibili" || activeTab === "bilibili_hk_mo_tw" ? (
                      <div className="space-y-2">
                        {currentSelectedSite ? (
                          <div className="flex items-center justify-between rounded-lg border border-primary/25 bg-accent px-3 py-2 text-xs">
                            <span className="text-primary">B 站官方播放页</span>
                            <a
                              href={currentSelectedSite.href}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
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
                      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
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
                              <h4 className="font-serif text-sm font-bold text-foreground">
                                {currentSelectedSite.meta.name}
                              </h4>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              已匹配该平台正版播放页面，点击下方按钮即可前往官方播放：
                            </p>
                          </div>

                          <a
                            href={currentSelectedSite.href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary"
                          >
                            <Globe className="size-3.5" />
                            前往 {currentSelectedSite.meta.name} 观看 ↗
                          </a>
                        </div>
                      </div>
                    ) : (
                      /* 3. 未命中任何静态平台的保底 */
                      <div className="space-y-2 rounded-lg border border-dashed border-primary/25 bg-accent p-3 text-xs text-foreground">
                        <p>暂未找到播放直链，可以前往平台搜索：</p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <a
                            href={THIRD_PARTY_SEARCH.online.build(title)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-card px-2.5 py-1 font-semibold text-primary hover:bg-accent"
                          >
                            在 B 站搜索「{title}」↗
                          </a>
                          <a
                            href={`https://ani.gamer.com.tw/search.php?kw=${encodeURIComponent(title)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-success/25 bg-card px-2.5 py-1 font-semibold text-success hover:bg-success/10"
                          >
                            在 動畫瘋 搜索「{title}」↗
                          </a>
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </TabsContent>
            ),
          )}
      </Tabs>
    </section>
  );
}
