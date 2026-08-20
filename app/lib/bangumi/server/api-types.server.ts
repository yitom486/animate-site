import type { AnimeCardData } from "~/lib/anime-meta";

export type RawSubject = AnimeCardData & {
  summary?: string;
  infobox?: unknown;
  collection?: unknown;
  meta_tags?: unknown;
};

export type SubjectListResponse = {
  data: RawSubject[];
  total: number;
  limit?: number;
  offset?: number;
};

export type SearchSubjectsBody = {
  keyword?: string;
  sort?: "match" | "heat" | "rank";
  filter?: {
    type?: number[];
    tag?: string[];
    air_date?: string[];
  };
};
