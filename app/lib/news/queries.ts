import { queryOptions } from "@tanstack/react-query";
import { fetchQueryJson } from "../query-client";
import type { NewsFeed } from "./types";

export function homeNewsQuery() {
  return queryOptions({
    queryKey: ["news", "home"],
    queryFn: ({ signal }) => fetchQueryJson<NewsFeed>("/api/news?view=home", signal),
    staleTime: 5 * 60 * 1000,
  });
}
