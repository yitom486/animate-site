import { cn } from "~/lib/utils";

type HeroBackdropProps = {
  className?: string;
};

const CORNER_STARS = [
  { className: "hero-star hero-star--a top-[8%] right-[12%] text-fuchsia-400/70" },
  { className: "hero-star hero-star--b top-[18%] right-[28%] text-sky-400/60" },
  { className: "hero-star hero-star--c bottom-[22%] right-[8%] text-rose-400/65" },
  { className: "hero-star hero-star--d bottom-[30%] left-[58%] text-amber-300/55" },
  { className: "hero-star hero-star--e top-[42%] right-[6%] text-pink-400/50" },
] as const;

/** 首页 Hero 番剧风渐变 + 装饰星 */
export function HeroBackdrop({ className }: HeroBackdropProps) {
  return (
    <div
      className={cn("hero-backdrop pointer-events-none absolute inset-0", className)}
      aria-hidden="true"
    >
      <span className="hero-backdrop__orb hero-backdrop__orb--rose" />
      <span className="hero-backdrop__orb hero-backdrop__orb--violet" />
      <span className="hero-backdrop__orb hero-backdrop__orb--sky" />
      <span className="hero-backdrop__mesh" />
      <span className="hero-backdrop__veil" />
      {CORNER_STARS.map((star) => (
        <span key={star.className} className={cn("hero-star", star.className)}>
          ✦
        </span>
      ))}
    </div>
  );
}
