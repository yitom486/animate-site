/** 列表网格：桌面端 7 列，分页尽量保持完整 6 行 */
export const LIST_GRID_DESKTOP_COLUMNS = 7;
export const LIST_GRID_ROWS_PER_PAGE = 6;
export const LIST_PAGE_SIZE_MIN = 24;

/** 列表每页条数（GET /subjects）；按网格计算，24 作为移动端最低数量兜底 */
export const LIST_PAGE_SIZE = Math.max(
  LIST_PAGE_SIZE_MIN,
  LIST_GRID_DESKTOP_COLUMNS * LIST_GRID_ROWS_PER_PAGE,
);
