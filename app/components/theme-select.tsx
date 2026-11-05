import { Monitor, Moon, Sun } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { parseThemePreference, useTheme } from "~/lib/theme";

const THEMES = [
  { value: "system", label: "跟随系统", icon: Monitor },
  { value: "light", label: "亮色", icon: Sun },
  { value: "dark", label: "暗色", icon: Moon },
];

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  const Icon = THEMES.find((item) => item.value === theme)?.icon ?? Monitor;
  return (
    <Select
      value={theme}
      onValueChange={(value) => setTheme(parseThemePreference(value))}
      items={THEMES}
    >
      <SelectTrigger
        aria-label="外观主题"
        className="size-9 shrink-0 justify-center border-0 p-0 hover:bg-muted [&>svg:last-child]:hidden"
      >
        <Icon className="size-4" aria-hidden />
        <span className="sr-only">
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent align="end" alignItemWithTrigger={false}>
        {THEMES.map(({ value, label, icon: ItemIcon }) => (
          <SelectItem key={value} value={value}>
            <ItemIcon className="size-4" aria-hidden />
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
