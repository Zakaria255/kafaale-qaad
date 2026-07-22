import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/useReveal.js";

/**
 * The Arc — a thin sunrise arc echoing the logo mark.
 *
 * Two modes:
 *   draw   (default) the stroke draws itself once when scrolled into view
 *   static an oversized, very faint watermark (used behind the closing CTA)
 */
export default function Arc({
  size = 120,
  stroke = 1.5,
  color = "var(--kf-gold-500)",
  mode = "draw",
  opacity = 1,
  style,
}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);
  const [drawn, setDrawn] = useState(mode !== "draw" || reduced);

  useEffect(() => {
    if (mode !== "draw" || reduced) { setDrawn(true); return; }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setDrawn(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setDrawn(true); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [mode, reduced]);

  // Half-circle path across a 100×50 viewBox; length ≈ πr = 157.08.
  const LEN = 157.08;

  return (
    <svg
      ref={ref}
      viewBox="0 0 100 52"
      width={size}
      height={size * 0.52}
      fill="none"
      aria-hidden="true"
      style={{ display: "block", opacity, overflow: "visible", ...style }}
    >
      <path
        d="M 2 50 A 48 48 0 0 1 98 50"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        style={{
          strokeDasharray: LEN,
          strokeDashoffset: drawn ? 0 : LEN,
          transition: "stroke-dashoffset 900ms var(--kf-ease-out)",
        }}
      />
    </svg>
  );
}
