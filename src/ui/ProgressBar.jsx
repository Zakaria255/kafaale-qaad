import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/useReveal.js";

/**
 * Funding progress. Fill is green (verification/success); it turns gold only
 * when a case is fully funded — one of the rationed gold appearances.
 * Width animates once on first view; static under reduced motion.
 */
export default function ProgressBar({ percent = 0, lang = "en" }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);
  const [width, setWidth] = useState(reduced ? pct : 0);

  useEffect(() => {
    if (reduced) { setWidth(pct); return; }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setWidth(pct); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setWidth(pct); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [pct, reduced]);

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${new Intl.NumberFormat(lang).format(pct)}% funded`}
      style={{
        blockSize: 8,
        inlineSize: "100%",
        background: "var(--kf-ink-100)",
        borderRadius: "var(--kf-r-pill)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          blockSize: "100%",
          inlineSize: `${width}%`,
          borderRadius: "var(--kf-r-pill)",
          background: pct >= 100 ? "var(--kf-gold-500)" : "var(--kf-green-600)",
          transition: "inline-size 600ms var(--kf-ease-base)",
        }}
      />
    </div>
  );
}
