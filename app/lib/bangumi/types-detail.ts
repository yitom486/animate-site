import type { InfoboxItem } from "~/lib/anime-meta";

export type Person = { id: number; name: string; relation: string };

export type Episode = {
  id: number;
  type: number;
  name: string;
  name_cn: string;
  sort: number;
  ep?: number;
  airdate?: string;
};

export type SubjectDetail = {
  id: number;
  name: string;
  name_cn: string;
  date?: string;
  eps?: number;
  total_episodes?: number;
  platform?: string;
  summary?: string;
  images?: { large: string; common?: string; medium?: string; grid?: string };
  rating?: { score: number; total: number; rank: number };
  tags?: Array<{ name: string; count: number }>;
  infobox?: InfoboxItem[];
};

export type DetailPayload = {
  subject: SubjectDetail;
  staff: Record<string, string>;
  episodes: Episode[];
};
