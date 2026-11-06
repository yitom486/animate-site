import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: false,
});

/** 正文更像 Markdown 而不是 HTML 时走 marked；已消毒的 HTML 仍走原路径。 */
export function looksLikeMarkdown(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const htmlTagCount = (trimmed.match(/<\/?[a-z][^>]*>/gi) ?? []).length;
  if (htmlTagCount >= 2) return false;
  return (
    /^#{1,6}\s+\S/m.test(trimmed) ||
    /^>\s+\S/m.test(trimmed) ||
    /^[-*+]\s+\S/m.test(trimmed) ||
    /^\d+\.\s+\S/m.test(trimmed) ||
    /```[\s\S]*```/.test(trimmed) ||
    /!\[[^\]]*]\(https?:\/\/[^)]+\)/.test(trimmed) ||
    /\[[^\]]+]\(https?:\/\/[^)]+\)/.test(trimmed)
  );
}

export function renderNewsMarkdown(markdown: string) {
  return marked.parse(markdown, { async: false }) as string;
}
