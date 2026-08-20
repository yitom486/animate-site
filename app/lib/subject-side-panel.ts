import { useCallback } from "react";
import { useSearchParams } from "react-router";

/** URL query 键：侧栏预览条目 id（与 /anime/:id 正式详情分离） */
export const SUBJECT_SIDE_PARAM = "subject";

export type SubjectSidePanelControls = {
  /** 当前打开的条目 id；未打开为空串 */
  subjectId: string;
  isOpen: boolean;
  /** 在当前页右侧打开条目预览（不离开本路由） */
  open: (id: string | number) => void;
  close: () => void;
  /** 该 id 是否正显示在侧栏 */
  isActive: (id: string | number) => boolean;
};

/**
 * 条目侧栏启动器：读写 `?subject=`，供任意页面复用。
 * 正式分栏详情仍用 `/anime/:id`；本 hook 只解决「留在当前页预览」。
 */
export function useSubjectSidePanel(options: { param?: string } = {}): SubjectSidePanelControls {
  const param = options.param ?? SUBJECT_SIDE_PARAM;
  const [searchParams, setSearchParams] = useSearchParams();
  const subjectId = searchParams.get(param)?.replace(/\D/g, "") || "";

  const open = useCallback(
    (id: string | number) => {
      const next = new URLSearchParams(searchParams);
      next.set(param, String(id).replace(/\D/g, ""));
      setSearchParams(next, { preventScrollReset: true, replace: true });
    },
    [param, searchParams, setSearchParams],
  );

  const close = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete(param);
    setSearchParams(next, { preventScrollReset: true, replace: true });
  }, [param, searchParams, setSearchParams]);

  const isActive = useCallback(
    (id: string | number) => subjectId !== "" && subjectId === String(id).replace(/\D/g, ""),
    [subjectId],
  );

  return {
    subjectId,
    isOpen: Boolean(subjectId),
    open,
    close,
    isActive,
  };
}
