import { zhCN } from "react-day-picker/locale";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

type AnimeCalendarPickerProps = {
  open: boolean;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
};

/** 日期网格、方向键和月导航交给 DayPicker；焦点与关闭交给 Base UI Dialog。 */
export function AnimeCalendarPicker({
  open,
  selectedDate,
  onSelect,
  onClose,
}: AnimeCalendarPickerProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] gap-4 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>选择放送日期</DialogTitle>
          <DialogDescription>按所选日期查看对应星期的放送安排。</DialogDescription>
        </DialogHeader>
        <Calendar
          mode="single"
          required
          selected={selectedDate}
          defaultMonth={selectedDate}
          onSelect={onSelect}
          locale={zhCN}
          weekStartsOn={1}
          autoFocus
          className="mx-auto bg-transparent [--cell-size:--spacing(8)] sm:[--cell-size:--spacing(10)]"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              onSelect(today);
            }}
          >
            选择今天
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
