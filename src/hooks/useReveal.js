import { useEffect, useRef, useState } from "react";

/** True when the user has asked for reduced motion. Read once per mount. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" &&
          window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = (e) => setReduced(e.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/**
 * Adds `is-in` to the element once it is 20% visible, then stops observing.
 * Pair with the `.kf-reveal` class. Triggers once — never re-hides on scroll up.
 */
export function useReveal(threshold = 0.2) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No IntersectionObserver (or reduced motion handled in CSS): show immediately.
    if (typeof IntersectionObserver === "undefined") { el.classList.add("is-in"); return; }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { el.classList.add("is-in"); io.disconnect(); }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return ref;
}

/**
 * Counts from 0 to `target` over `duration` once the element scrolls into view.
 * Returns [ref, value]. Under reduced motion it jumps straight to the target so
 * the page is fully static.
 */
export function useCountUp(target, duration = 800) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);
  const [value, setValue] = useState(reduced ? target : 0);
  const done = useRef(false);

  useEffect(() => {
    if (reduced) { setValue(target); return; }
    const el = ref.current;
    if (!el || done.current) return;
    if (typeof IntersectionObserver === "undefined") { setValue(target); return; }

    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || done.current) return;
      done.current = true;
      io.disconnect();
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        // easeOutCubic — fast start, settles gently on the final number.
        setValue(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
        else setValue(target);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.2 });

    io.observe(el);
    return () => io.disconnect();
  }, [target, duration, reduced]);

  return [ref, value];
}
