import { useEffect, useLayoutEffect, useRef } from "react";
import { usePrefersReducedMotion } from "~/lib/use-prefers-reduced-motion";
import { cn } from "~/lib/utils";

type HeroParticlesProps = {
  className?: string;
};

type ParticleShape = "star" | "spark" | "dot";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  core: string;
  shape: ParticleShape;
  glow: boolean;
  phase: number;
  spin: number;
};

const PALETTE = [
  { body: "rgba(255, 79, 145, 0.92)", core: "rgba(255, 240, 248, 0.98)" },
  { body: "rgba(192, 88, 255, 0.9)", core: "rgba(248, 236, 255, 0.96)" },
  { body: "rgba(56, 189, 248, 0.88)", core: "rgba(224, 247, 255, 0.96)" },
  { body: "rgba(255, 183, 77, 0.86)", core: "rgba(255, 248, 230, 0.96)" },
] as const;

const MAX_DPR = 2;

function particleCount(width: number): number {
  if (width < 640) return 36;
  if (width < 1024) return 54;
  return 72;
}

function pickShape(): ParticleShape {
  const r = Math.random();
  if (r < 0.38) return "star";
  if (r < 0.68) return "spark";
  return "dot";
}

function createParticle(width: number, height: number): Particle {
  const palette = PALETTE[Math.floor(Math.random() * PALETTE.length)]!;
  const shape = pickShape();
  const glow = shape !== "dot" || Math.random() < 0.35;

  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.45,
    vy: -0.28 - Math.random() * 0.62,
    size: shape === "dot" ? 1.2 + Math.random() * 1.8 : 2.4 + Math.random() * 3.2,
    color: palette.body,
    core: palette.core,
    shape,
    glow,
    phase: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.025,
  };
}

function seedParticles(width: number, height: number): Particle[] {
  return Array.from({ length: particleCount(width) }, () => createParticle(width, height));
}

function twinkleAlpha(base: number, time: number, phase: number, glow: boolean): number {
  const wave = Math.sin(time * 0.005 + phase);
  const boost = glow ? 0.16 : 0.1;
  return Math.min(1, base + wave * boost);
}

function drawStar(ctx: CanvasRenderingContext2D, size: number) {
  const outer = size;
  const inner = size * 0.42;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawSpark(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.lineTo(size, 0);
  ctx.moveTo(0, -size);
  ctx.lineTo(0, size);
  ctx.lineWidth = Math.max(1, size * 0.22);
  ctx.stroke();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle, alpha: number, rotation: number) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(rotation);
  ctx.globalAlpha = alpha;

  if (p.glow && p.shape !== "dot") {
    ctx.shadowBlur = 14;
    ctx.shadowColor = p.color;
  }

  if (p.shape === "dot") {
    ctx.beginPath();
    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.globalAlpha = Math.min(1, alpha + 0.15);
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = p.core;
    ctx.fill();
  } else if (p.shape === "star") {
    drawStar(ctx, p.size);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.globalAlpha = Math.min(1, alpha + 0.2);
    drawStar(ctx, p.size * 0.38);
    ctx.fillStyle = p.core;
    ctx.fill();
  } else {
    ctx.strokeStyle = p.color;
    drawSpark(ctx, p.size);
    ctx.globalAlpha = Math.min(1, alpha + 0.18);
    ctx.strokeStyle = p.core;
    ctx.lineWidth = Math.max(0.8, p.size * 0.16);
    drawSpark(ctx, p.size * 0.55);
  }

  ctx.restore();
}

/** 首页 Hero 星尘粒子（无 Plexus 连线，偏二次元 sparkle） */
export function HeroParticles({ className }: HeroParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const sizeRef = useRef({ width: 0, height: 0 });
  const frameRef = useRef<number>(0);
  const visibleRef = useRef(true);
  const reduceMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (reduceMotion) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const applyCanvasSize = (w: number, h: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const resize = (forceReseed = false) => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const prev = sizeRef.current;

      if (w === prev.width && h === prev.height && !forceReseed) return;

      const wRatio = prev.width > 0 ? w / prev.width : 1;
      const hRatio = prev.height > 0 ? h / prev.height : 1;
      const countChanged = particleCount(w) !== particlesRef.current.length;

      applyCanvasSize(w, h);
      width = w;
      height = h;
      sizeRef.current = { width: w, height: h };

      if (particlesRef.current.length === 0 || forceReseed || countChanged) {
        particlesRef.current = seedParticles(w, h);
        return;
      }

      for (const p of particlesRef.current) {
        p.x *= wRatio;
        p.y *= hRatio;
      }
    };

    const tick = (time: number) => {
      frameRef.current = 0;
      if (!visibleRef.current) return;

      const particles = particlesRef.current;
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx + Math.sin(time * 0.0014 + p.phase) * 0.18;
        p.y += p.vy + Math.cos(time * 0.001 + p.phase) * 0.06;

        if (p.y < -16) {
          p.y = height + 16;
          p.x = Math.random() * width;
        }
        if (p.x < -16) p.x = width + 16;
        if (p.x > width + 16) p.x = -16;
      }

      for (const p of particles) {
        const alpha = twinkleAlpha(0.86, time, p.phase, p.glow);
        const rotation = time * p.spin + p.phase;
        drawParticle(ctx, p, alpha, rotation);
      }

      if (!canvas.classList.contains("hero-particles--live")) {
        canvas.classList.add("hero-particles--live");
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      visibleRef.current = document.visibilityState === "visible";
      if (visibleRef.current && frameRef.current === 0) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    resize(true);
    frameRef.current = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => resize(false));
    ro.observe(container);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      canvas.classList.remove("hero-particles--live");
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <div ref={containerRef} className={cn("pointer-events-none", className)} aria-hidden="true">
      <canvas ref={canvasRef} className="hero-particles-canvas block size-full" />
    </div>
  );
}
