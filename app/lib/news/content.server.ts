import { prepareNewsContent } from "./parse.server";

/**
 * 成品正文只渲染和清洗，不改写内容，也不自动将普通链接替换为播放器。
 * 推送、RSS 入库和详情展示使用同一白名单，受控 iframe 可安全重复清洗。
 */
export function renderNewsContent(raw: string) {
  return prepareNewsContent(raw);
}
