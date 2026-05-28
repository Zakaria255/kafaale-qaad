import { Link } from "react-router-dom";

/**
 * <Logo /> — Kafaale Qaad brand logo
 * Props:
 *   size    "sm" | "md" | "lg"   default "md"
 *   linked  boolean              default true
 *   dark    boolean              default false — white text on navy vs navy text on light
 */
export default function Logo({ size = "md", linked = true, dark = false, style = {} }) {
  const s = {
    sm: { emoji: 18, title: 11, sub: 7,  gap: 6,  px: 10, py: 6,  radius: 8  },
    md: { emoji: 22, title: 14, sub: 8,  gap: 8,  px: 14, py: 8,  radius: 10 },
    lg: { emoji: 30, title: 20, sub: 10, gap: 10, px: 18, py: 10, radius: 12 },
  }[size] || { emoji: 22, title: 14, sub: 8, gap: 8, px: 14, py: 8, radius: 10 };

  const bg     = dark ? "#002651" : "#002651";
  const titleC = "#ffffff";
  const subC   = "rgba(255,255,255,0.65)";

  const inner = (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: s.gap,
      background: bg,
      padding: `${s.py}px ${s.px}px`,
      borderRadius: s.radius,
      flexShrink: 0,
      textDecoration: "none",
      ...style,
    }}>
      <span style={{ fontSize: s.emoji, lineHeight: 1, flexShrink: 0 }}>🤝</span>
      <div style={{ lineHeight: 1.15 }}>
        <div style={{ fontSize: s.title, fontWeight: 900, color: titleC, letterSpacing: -0.5, whiteSpace: "nowrap" }}>
          KAFAALE QAAD
        </div>
        <div style={{ fontSize: s.sub, fontWeight: 700, color: subC, letterSpacing: 2, marginTop: 2, whiteSpace: "nowrap", textTransform: "uppercase" }}>
          Humanitarian Aid
        </div>
      </div>
    </div>
  );

  if (!linked) return inner;

  return (
    <Link to="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}>
      {inner}
    </Link>
  );
}
