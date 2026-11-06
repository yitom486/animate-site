import { Marked } from "marked";

const markdown = new Marked({
  gfm: true,
  breaks: false,
});

/** 已有块级 HTML 保持原样；纯文本、裸 URL 与行内 HTML 混排交给 GFM。 */
export function looksLikeMarkdown(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  return markdown.lexer(trimmed).some((token) => token.type !== "html" && token.type !== "space");
}

export function renderNewsMarkdown(source: string) {
  return markdown.parse(source, { async: false }) as string;
}
