import "./hamster-loader.css";

type HamsterLoaderProps = {
  show: boolean;
};

export function HamsterLoader({ show }: HamsterLoaderProps) {
  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-white/18 px-4 backdrop-blur-[2px]">
      <div
        className="hamster-loader rounded-lg border border-rose-100/90 bg-white/88 px-7 py-6 text-center shadow-2xl shadow-rose-950/10 backdrop-blur-xl"
        role="status"
        aria-live="polite"
      >
        <div className="hamster-stage" aria-hidden="true">
          <div className="hamster-wheel">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="hamster-body">
            <div className="hamster-tail" />
            <div className="hamster-ear" />
            <div className="hamster-face">
              <span className="hamster-eye" />
              <span className="hamster-blush" />
              <span className="hamster-nose" />
            </div>
            <div className="hamster-belly" />
            <span className="hamster-paw hamster-paw-front" />
            <span className="hamster-paw hamster-paw-back" />
          </div>
        </div>
        <p className="mt-4 font-serif text-sm font-bold text-slate-700">
          小仓鼠正在搬运番剧资料
        </p>
        <p className="mt-1 font-mono text-[11px] font-semibold text-rose-500">
          loading...
        </p>
      </div>
    </div>
  );
}
