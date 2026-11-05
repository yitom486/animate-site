import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type DetailLayoutState = {
  /** 详情面板是否全屏展开（持久化保存用户偏好） */
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
};

export const useDetailLayoutStore = create<DetailLayoutState>()(
  persist(
    (set) => ({
      expanded: false,
      setExpanded: (expanded: boolean) => set({ expanded }),
      toggleExpanded: () => set((state) => ({ expanded: !state.expanded })),
    }),
    {
      name: "yayu-detail-layout",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
    },
  ),
);
