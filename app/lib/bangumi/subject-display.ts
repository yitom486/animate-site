import { SUBJECT_TYPE, SUBJECT_TYPE_LABEL, type SubjectTypeValue } from "./types";

/** 将详情 API 的 type 规范成站内 SubjectType 字符串枚举 */
export function subjectTypeFromDetail(
  type: number | string | undefined,
): SubjectTypeValue | undefined {
  if (type == null || type === "") return undefined;
  const key = String(type);
  return Object.values(SUBJECT_TYPE).includes(key as SubjectTypeValue)
    ? (key as SubjectTypeValue)
    : undefined;
}

export function isAnimeSubjectType(type: number | string | undefined): boolean {
  return subjectTypeFromDetail(type) === SUBJECT_TYPE.anime;
}

export function subjectTypeLabel(type: number | string | undefined): string {
  const t = subjectTypeFromDetail(type);
  return t ? SUBJECT_TYPE_LABEL[t] : "条目";
}

/** 详情概要里「数量」字段的标签 */
export function subjectCountLabel(type: number | string | undefined): string {
  const t = subjectTypeFromDetail(type);
  switch (t) {
    case SUBJECT_TYPE.book:
      return "册数";
    case SUBJECT_TYPE.music:
      return "曲目数";
    case SUBJECT_TYPE.game:
      return "章节";
    case SUBJECT_TYPE.real:
      return "集数";
    case SUBJECT_TYPE.anime:
    default:
      return "话数";
  }
}

/** 详情概要里日期字段的标签 */
export function subjectDateLabel(type: number | string | undefined): string {
  const t = subjectTypeFromDetail(type);
  switch (t) {
    case SUBJECT_TYPE.anime:
    case SUBJECT_TYPE.real:
      return "放送开始";
    case SUBJECT_TYPE.book:
    case SUBJECT_TYPE.music:
    case SUBJECT_TYPE.game:
      return "发售日期";
    default:
      return "日期";
  }
}
