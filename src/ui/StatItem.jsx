import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/useReveal.js";

/*
 * Odometer statistic. Each digit is a vertical strip of 0–9 that slides to its
 * final value; punctuation (comma, dot, %, +) is static. Because every glyph
 * occupies a fixed cell and the font is tabular, the element's width is final
 * from first paint — no layout shift while it rolls.
 *
 * No icon and no colour here by design: the row must read as one dataset.
 */

const DIGITS = ["0","1","2","3","4","5","6","7","8","9"];

function Digit({ value, delay, animate }) {
  const [shown, setShown] = useState(animate ? 0 : value);
  useEffect(() => {
    if (!animate) { setShown(value); return; }
    const id = setTimeout(() => setShown(value), delay);
    return () => clearTimeout(id);
  }, [value, delay, animate]);

  return (
    <span
      style={{
        display: "inline-block",
        blockSize: "1em",
        overflow: "hidden",
        verticalAlign: "bottom",
        inlineSize: "1ch",
      }}
    >
      <span
        style={{
          display: "block",
          transform: `translateY(-${shown * 10}%)`,
          transition: animate ? "transform 900ms var(--kf-ease-out)" : "none",
        }}
      >
        {DIGITS.map((d) => (
          <span key={d} style={{ display: "block", blockSize: "1em", lineHeight: "1em" }}>{d}</span>
        ))}
      </span>
    </span>
  );
}

export default function StatItem({ value, label }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);
  const [start, setStart] = useState(reduced);

  useEffect(() => {
    if (reduced) { setStart(true); return; }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setStart(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStart(true); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  const chars = String(value).split("");
  let digitIndex = 0;

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "var(--kf-s2)" }}>
      <div
        className="kf-tabular"
        style={{
          fontFamily: "var(--kf-font-display)",
          fontSize: "var(--kf-fs-stat)",
          lineHeight: "var(--kf-lh-stat)",
          fontWeight: 800,
          color: "var(--kf-navy-900)",
          display: "flex",
          alignItems: "flex-end",
          // Each glyph is its own element, so without an explicit LTR run the
          // digits reorder right-to-left in Arabic and "2,400+" renders "+004,2".
          // Numerals read left-to-right in every supported locale.
          direction: "ltr",
          unicodeBidi: "isolate",
        }}
      >
        {chars.map((ch, i) => {
          if (!/\d/.test(ch)) {
            return <span key={i} style={{ display: "inline-block" }}>{ch}</span>;
          }
          const delay = digitIndex * 70;
          digitIndex += 1;
          return <Digit key={i} value={Number(ch)} delay={delay} animate={start && !reduced} />;
        })}
      </div>
      <div style={{ fontSize: "var(--kf-fs-caption)", fontWeight: 500, color: "var(--kf-ink-500)" }}>
        {label}
      </div>
    </div>
  );
}
