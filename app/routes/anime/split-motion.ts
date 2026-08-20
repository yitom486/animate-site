import { flushSync } from "react-dom";

/** 打开 / 展开：FLIP 时长 */
export const SPLIT_OPEN_MS = 280;
/** 关闭：右栏滑出与左栏展宽同时进行 */
export const SPLIT_CLOSE_MS = 420;
export const SPLIT_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
export const SPLIT_CLOSE_EASE = "cubic-bezier(0.33, 1, 0.68, 1)";

/**
 * FLIP：瞬时改到最终布局，再用 translateX 补视觉差（合成层，避免过渡 grid 列宽）。
 */
export function flipElements(
  elements: Array<HTMLElement | null>,
  apply: () => void,
  animate: boolean,
  duration = SPLIT_OPEN_MS,
  easing = SPLIT_EASE,
): Animation[] {
  if (!animate) {
    apply();
    return [];
  }

  const measured = elements
    .filter((el): el is HTMLElement => el != null)
    .map((el) => ({ el, first: el.getBoundingClientRect() }));

  flushSync(apply);

  const animations: Animation[] = [];
  for (const { el, first } of measured) {
    const last = el.getBoundingClientRect();
    if (last.width < 1 && last.height < 1) continue;

    const dx = first.left - last.left;
    const openingFromZero = first.width < 1 && last.width >= 1;
    const tx = openingFromZero ? last.width : dx;
    if (Math.abs(tx) < 0.5) continue;

    animations.push(
      el.animate(
        [
          { transform: `translateX(${tx}px)`, opacity: openingFromZero ? 0.92 : 1 },
          { transform: "translateX(0)", opacity: 1 },
        ],
        { duration, easing },
      ),
    );
  }
  return animations;
}

/** 方案 C：把详情栏冻成 fixed「贴纸」，便于 grid 先收回仍保持可见可滑 */
export function freezeDetailPanel(el: HTMLElement, rect: DOMRect) {
  el.style.position = "fixed";
  el.style.top = `${rect.top}px`;
  el.style.left = `${rect.left}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  el.style.margin = "0";
  el.style.zIndex = "40";
  el.style.boxSizing = "border-box";
}

export function unfreezeDetailPanel(el: HTMLElement) {
  el.style.position = "";
  el.style.top = "";
  el.style.left = "";
  el.style.width = "";
  el.style.height = "";
  el.style.margin = "";
  el.style.zIndex = "";
  el.style.boxSizing = "";
  el.style.transform = "";
}

/**
 * 方案 C 关闭：冻住右栏 → 立刻让列表占满 → 同时右栏滑出、左栏 FLIP。
 * 左右在同一时段完成，避免「等右边消失再补左边」。
 */
export function closeSplitWithFrozenPanel(options: {
  list: HTMLElement | null;
  panel: HTMLElement;
  applyClosedLayout: () => void;
  animate: boolean;
}): { animations: Animation[]; cleanup: () => void } {
  const { list, panel, applyClosedLayout, animate } = options;

  if (!animate) {
    applyClosedLayout();
    return { animations: [], cleanup: () => undefined };
  }

  const panelRect = panel.getBoundingClientRect();
  const listFirst = list?.getBoundingClientRect() ?? null;

  freezeDetailPanel(panel, panelRect);

  flushSync(applyClosedLayout);

  const animations: Animation[] = [];

  animations.push(
    panel.animate([{ transform: "translateX(0)" }, { transform: "translateX(100%)" }], {
      duration: SPLIT_CLOSE_MS,
      easing: SPLIT_CLOSE_EASE,
      fill: "forwards",
    }),
  );

  if (list && listFirst && listFirst.width > 1) {
    const listLast = list.getBoundingClientRect();
    const dx = listFirst.left - listLast.left;
    // 宽度向右扩展时 left 常为 0；若有位移则 FLIP 补上
    if (Math.abs(dx) > 0.5) {
      animations.push(
        list.animate([{ transform: `translateX(${dx}px)` }, { transform: "translateX(0)" }], {
          duration: SPLIT_CLOSE_MS,
          easing: SPLIT_CLOSE_EASE,
        }),
      );
    }
  }

  const cleanup = () => {
    for (const anim of animations) anim.cancel();
    unfreezeDetailPanel(panel);
  };

  return { animations, cleanup };
}
