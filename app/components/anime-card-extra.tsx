import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { peekCardExtra, requestCardExtra } from "~/lib/card-extra-client";
import { observeInViewOnce } from "~/lib/shared-in-view";
import type { CardExtra } from "~/lib/bangumi/types-card";

/** 卡片懒加载增强数据：共享 Observer + 短窗口批量请求 */
export function useCardExtra<T extends Element>(id: number) {
  const ref = useRef<T>(null);
  const [data, setData] = useState<CardExtra | null>(() => peekCardExtra(id));

  useEffect(() => {
    setData(peekCardExtra(id));
  }, [id]);

  useEffect(() => {
    if (data) return;
    const el = ref.current;
    if (!el) return;

    let alive = true;
    const stop = observeInViewOnce(el, () => {
      void requestCardExtra(id)
        .then((next) => {
          if (alive) setData(next);
        })
        .catch(() => {
          /* 单卡片失败静默降级，不影响其余卡片 */
        });
    });

    return () => {
      alive = false;
      stop();
    };
  }, [id, data]);

  return { ref, data };
}

/** 简介弹窗 */
export function SummaryModal({
  title,
  summary,
  onClose,
}: {
  title: string;
  summary: string;
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 overflow-hidden border-white/85 bg-white/95 p-0 shadow-2xl sm:max-w-2xl">
        <DialogHeader className="border-b border-rose-100 px-6 py-4 pr-14">
          <DialogTitle className="font-serif text-lg font-bold leading-snug text-slate-800">
            {title}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="overflow-y-auto whitespace-pre-line px-6 py-5 font-serif leading-relaxed text-slate-700">
          {summary}
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
