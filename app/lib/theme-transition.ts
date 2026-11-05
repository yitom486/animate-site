type ThemeTransition = Pick<ViewTransition, "ready" | "finished" | "skipTransition">;

type ThemeTransitionDocument = {
  documentElement: Pick<HTMLElement, "dataset">;
  startViewTransition?: (update: () => void) => ThemeTransition;
};

/** 主题切换唯一入口：新请求使旧回调失效，避免连续切换被延迟回调覆盖。 */
export function createThemeTransitionController(owner: ThemeTransitionDocument) {
  let active: ThemeTransition | undefined;
  let revision = 0;

  const clear = () => {
    active = undefined;
    delete owner.documentElement.dataset.themeTransition;
  };

  return {
    run(update: () => void, reducedMotion = false) {
      const requestRevision = ++revision;
      active?.skipTransition();
      clear();

      let updated = false;
      const apply = () => {
        if (requestRevision !== revision || updated) return;
        updated = true;
        update();
      };

      if (typeof owner.startViewTransition !== "function") {
        apply();
        return;
      }

      owner.documentElement.dataset.themeTransition = "active";
      let transition: ThemeTransition;
      try {
        transition = owner.startViewTransition(apply);
      } catch {
        clear();
        apply();
        return;
      }

      active = transition;
      const finish = () => {
        if (active === transition) clear();
      };
      // 取消动画会拒绝 ready；finished 仍等待 DOM 更新，不产生未处理的 Promise。
      void transition.ready.catch(() => {});
      void transition.finished.then(finish, finish);
      // 支持 API 时仍通过统一入口更新 DOM，仅跳过用户不希望看到的动画。
      if (reducedMotion) transition.skipTransition();
    },
    cancel() {
      revision++;
      active?.skipTransition();
      clear();
    },
  };
}
