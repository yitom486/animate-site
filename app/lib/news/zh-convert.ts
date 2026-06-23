// 用 t2cn 轻量子包（~65KB）而非默认 full（~1.1MB），给 Cloudflare Worker 瘦身。
// 代价：仅字符/常用词级转换（軟體→软体），但动漫标题里台湾特有词汇极少，够用。
import { Converter } from "opencc-js/t2cn";

/**
 * 繁体 → 简体。模块级单例，避免逐条重建字典。
 * 動畫→动画、聲優→声优、劇場版→剧场版 均正确转换。
 */
const tw2cn = Converter({ from: "t", to: "cn" });

export function toSimplified(text: string): string;
export function toSimplified(text: string | undefined): string | undefined;
export function toSimplified(text?: string): string | undefined {
  if (!text) return text;
  return tw2cn(text);
}
