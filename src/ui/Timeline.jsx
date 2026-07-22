import { useEffect, useRef, useState } from "react";
import Arc from "./Arc.jsx";
import { usePrefersReducedMotion } from "../hooks/useReveal.js";

/*
 * The Verification Journey — a scroll-linked pipeline.
 *
 * A single 2px path runs the length of the section. A green stroke advances down
 * it in proportion to scroll, and each step node "flips" from unreached (white,
 * ink border) to reached (navy disc, white numeral) as the stroke passes it, so
 * the page literally verifies the pipeline while you read it.
 *
 * Step 4 is the pivot where trust is established: it flips to green and emits a
 * single ring pulse rather than repeating, so the eye is drawn once and released.
 *
 * Scroll maths run in a rAF-throttled passive listener; only transform, opacity
 * and block-size animate.
 */
export default function Timeline({ steps = [], pivot = 4, isMobile = false, lang = "en" }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);
  const [progress, setProgress] = useState(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) { setProgress(1); return; }
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 0;
      // 0 when the section's top reaches 65% down the viewport, 1 once its
      // bottom has risen past 55% — a comfortable read-along pace.
      const span = rect.height + vh * 0.10;
      const p = (vh * 0.65 - rect.top) / (span || 1);
      setProgress(Math.max(0, Math.min(1, p)));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced]);

  const n = steps.length || 1;
  // Fraction of the path at which each node sits.
  const at = (i) => (i + 0.5) / n;

  const linePos = isMobile ? "19px" : "calc(50% - 1px)";

  return (
    <div ref={ref} style={{ position: "relative", marginBlockStart: "var(--kf-s8)" }}>
      {/* The Arc, crowning the path */}
      <div style={{
        display: "flex", justifyContent: isMobile ? "flex-start" : "center",
        marginInlineStart: isMobile ? -20 : 0, marginBlockEnd: "var(--kf-s5)",
      }}>
        <Arc size={96} color="var(--kf-gold-500)" />
      </div>

      {/* Base path + progress stroke */}
      <div aria-hidden="true" style={{
        position: "absolute", insetInlineStart: linePos, insetBlockStart: 64, insetBlockEnd: 0,
        inlineSize: 2, background: "var(--kf-ink-200)",
      }}>
        <div style={{
          inlineSize: "100%", blockSize: `${progress * 100}%`,
          background: "var(--kf-green-600)",
          transition: "block-size 120ms linear",
        }} />
      </div>

      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--kf-s7)" }}>
        {steps.map((s, i) => {
          const reached = progress >= at(i);
          const isPivot = s.n === pivot;
          const onStart = isMobile ? true : i % 2 === 0; // alternate sides on desktop

          const node = (
            <div style={{ display: "grid", placeItems: "center", position: "relative" }}>
              {/* single ring pulse, only for the pivot, only once it is reached */}
              {isPivot && reached && !reduced && (
                <span
                  key="ring"
                  className="kf-ring"
                  aria-hidden="true"
                  style={{
                    position: "absolute", inlineSize: 40, blockSize: 40,
                    borderRadius: "var(--kf-r-pill)", border: "1px solid var(--kf-green-600)",
                  }}
                />
              )}
              <span style={{
                inlineSize: 40, blockSize: 40, borderRadius: "var(--kf-r-pill)",
                display: "grid", placeItems: "center",
                fontSize: "var(--kf-fs-body-sm)", fontWeight: 700,
                background: reached ? (isPivot ? "var(--kf-green-600)" : "var(--kf-navy-900)") : "var(--kf-surface)",
                color: reached ? "var(--kf-surface)" : "var(--kf-ink-500)",
                border: reached ? "1px solid transparent" : "1px solid var(--kf-ink-200)",
                transition: "background 150ms var(--kf-ease-std), color 150ms var(--kf-ease-std), border-color 150ms var(--kf-ease-std)",
              }}>
                {new Intl.NumberFormat(lang).format(s.n)}
              </span>
            </div>
          );

          const content = (
            <div style={{
              display: "flex", flexDirection: "column", gap: "var(--kf-s2)",
              textAlign: isMobile ? "start" : onStart ? "end" : "start",
              alignItems: isMobile ? "flex-start" : onStart ? "flex-end" : "flex-start",
            }}>
              <span style={{
                inlineSize: 40, blockSize: 40, borderRadius: "var(--kf-r-md)",
                background: "var(--kf-blue-50)", display: "grid", placeItems: "center",
              }}>
                <s.icon size={20} strokeWidth={2} color="var(--kf-blue-600)" aria-hidden="true" />
              </span>
              <h3 style={{ fontSize: "var(--kf-fs-h4)", fontWeight: 600, color: "var(--kf-ink-900)", lineHeight: 1.35 }}>
                {s.label}
              </h3>
              <p style={{
                margin: 0, maxInlineSize: "38ch",
                fontSize: "var(--kf-fs-body-sm)", lineHeight: 1.5, color: "var(--kf-ink-600)",
              }}>
                {s.desc}
              </p>
            </div>
          );

          return (
            <li
              key={s.n}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "40px 1fr" : "1fr 80px 1fr",
                gap: isMobile ? "var(--kf-s4)" : "var(--kf-s5)",
                alignItems: "start",
              }}
            >
              {isMobile ? (
                <>{node}{content}</>
              ) : onStart ? (
                <>{content}{node}<span />
                </>
              ) : (
                <><span />{node}{content}</>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
