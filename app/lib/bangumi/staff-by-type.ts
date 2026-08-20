import { SUBJECT_TYPE } from "./types";
import type { InfoboxItem } from "~/lib/anime-meta";
import type { Person } from "./types-detail";
import { subjectTypeFromDetail } from "./subject-display";

function infoboxValue(infobox: InfoboxItem[] | undefined, ...keys: string[]): string {
  if (!infobox) return "";
  for (const key of keys) {
    const item = infobox.find((i) => i.key === key);
    if (!item) continue;
    const { value } = item;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value)) {
      const joined = value
        .map((v) => (typeof v === "string" ? v : v.v))
        .filter(Boolean)
        .join("、");
      if (joined) return joined;
    }
  }
  return "";
}

function pickPerson(persons: Person[], ...relations: string[]): string {
  return persons
    .filter((p) => relations.includes(p.relation))
    .map((p) => p.name)
    .filter(Boolean)
    .join("、");
}

function compactStaff(entries: Array<[string, string]>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of entries) {
    if (v) out[k] = v;
  }
  return out;
}

/** 从人员关系表提取展示用 staff（按条目类型选关系名） */
export function pickStaffByType(
  persons: Person[],
  type: number | string | undefined,
): Record<string, string> {
  const t = subjectTypeFromDetail(type);

  if (t === SUBJECT_TYPE.book) {
    return compactStaff([
      ["作者", pickPerson(persons, "作者", "原作")],
      ["作画", pickPerson(persons, "作画")],
      ["脚本", pickPerson(persons, "脚本")],
    ]);
  }

  if (t === SUBJECT_TYPE.music) {
    return compactStaff([
      ["艺术家", pickPerson(persons, "艺术家", "演唱", "表演者")],
      ["作曲", pickPerson(persons, "作曲")],
      ["作词", pickPerson(persons, "作词")],
    ]);
  }

  if (t === SUBJECT_TYPE.game) {
    return compactStaff([
      ["开发", pickPerson(persons, "开发", "游戏制作人", "制作人")],
      ["发行", pickPerson(persons, "发行")],
      ["原作", pickPerson(persons, "原作")],
    ]);
  }

  if (t === SUBJECT_TYPE.real) {
    return compactStaff([
      ["导演", pickPerson(persons, "导演")],
      ["主演", pickPerson(persons, "主演", "演员")],
      ["编剧", pickPerson(persons, "脚本", "编剧")],
    ]);
  }

  // 动画默认
  return compactStaff([
    ["原作", pickPerson(persons, "原作")],
    ["制作", pickPerson(persons, "动画制作")],
    ["监督", pickPerson(persons, "导演")],
  ]);
}

/** 从 infobox 提取卡片增强 staff（无 persons 时的回落） */
export function staffFromInfobox(
  type: number | string | undefined,
  infobox: InfoboxItem[] | undefined,
): Record<string, string> {
  const t = subjectTypeFromDetail(type);

  if (t === SUBJECT_TYPE.book) {
    return compactStaff([
      ["作者", infoboxValue(infobox, "作者", "原作")],
      ["出版社", infoboxValue(infobox, "出版社")],
      ["连载杂志", infoboxValue(infobox, "连载杂志", "杂志")],
    ]);
  }

  if (t === SUBJECT_TYPE.music) {
    return compactStaff([
      ["艺术家", infoboxValue(infobox, "艺术家", "演唱")],
      ["厂牌", infoboxValue(infobox, "厂牌", "唱片公司")],
      ["作曲", infoboxValue(infobox, "作曲")],
    ]);
  }

  if (t === SUBJECT_TYPE.game) {
    return compactStaff([
      ["开发", infoboxValue(infobox, "开发", "游戏开发商", "开发商")],
      ["发行", infoboxValue(infobox, "发行", "发行商")],
      ["平台", infoboxValue(infobox, "平台")],
    ]);
  }

  if (t === SUBJECT_TYPE.real) {
    return compactStaff([
      ["导演", infoboxValue(infobox, "导演")],
      ["主演", infoboxValue(infobox, "主演", "演员")],
      ["制片国家", infoboxValue(infobox, "制片国家/地区", "国家")],
    ]);
  }

  return compactStaff([
    ["原作", infoboxValue(infobox, "原作")],
    ["导演", infoboxValue(infobox, "导演", "監督", "监督")],
    ["制作", infoboxValue(infobox, "动画制作", "動畫制作", "製作", "动画制作公司")],
  ]);
}
