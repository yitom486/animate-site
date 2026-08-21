import { useEffect, useState } from "react";
import type { BangumiDataItem, BangumiDataShard } from "./types";

// 客户端内存缓存：key 为 shard 名称（如 "2026", "2025", "archive"）
const shardMemoryCache = new Map<string, BangumiDataShard>();
const inFlightPromises = new Map<string, Promise<BangumiDataShard | null>>();

async function loadShard(shardName: string): Promise<BangumiDataShard | null> {
  if (shardMemoryCache.has(shardName)) {
    return shardMemoryCache.get(shardName)!;
  }
  if (inFlightPromises.has(shardName)) {
    return inFlightPromises.get(shardName)!;
  }

  const promise = (async () => {
    try {
      const res = await fetch(`/data/bangumi-data/${shardName}.json`);
      if (!res.ok) return null;
      const data = (await res.json()) as BangumiDataShard;
      shardMemoryCache.set(shardName, data);
      return data;
    } catch {
      return null;
    } finally {
      inFlightPromises.delete(shardName);
    }
  })();

  inFlightPromises.set(shardName, promise);
  return promise;
}

export function parseShardYear(dateStr?: string): string {
  if (!dateStr) return "2026";
  const match = dateStr.match(/^(\d{4})/);
  if (match) {
    const y = parseInt(match[1], 10);
    if (y >= 2010 && y <= 2026) return String(y);
    if (y < 2010) return "archive";
  }
  return "2026";
}

/**
 * 客户端异步获取条目在 bangumi-data 中的正版平台与下载映射
 * 0 服务端负担，水合后异步读取静态切片并强缓存
 */
export function useBangumiData(subjectId?: string | number, date?: string) {
  const [data, setData] = useState<BangumiDataItem | null>(null);
  const [loading, setLoading] = useState(true);

  const idStr = subjectId ? String(subjectId) : "";
  const shardName = parseShardYear(date);

  useEffect(() => {
    if (!idStr) {
      setData(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const checkShards = async () => {
      // 1. 优先查目标年份
      const primaryShard = await loadShard(shardName);
      if (primaryShard && primaryShard[idStr]) {
        if (isMounted) {
          setData(primaryShard[idStr]);
          setLoading(false);
        }
        return;
      }

      // 2. 若未命中且目标年份不是当季，尝试容错当季 2026 或 archive
      if (shardName !== "2026") {
        const currentShard = await loadShard("2026");
        if (currentShard && currentShard[idStr]) {
          if (isMounted) {
            setData(currentShard[idStr]);
            setLoading(false);
          }
          return;
        }
      }

      if (isMounted) {
        setData(null);
        setLoading(false);
      }
    };

    checkShards();

    return () => {
      isMounted = false;
    };
  }, [idStr, shardName]);

  return { data, loading };
}
