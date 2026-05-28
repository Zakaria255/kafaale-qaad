import { Link } from "react-router-dom";

/**
 * <Logo /> — Kafaale Qaad brand logo
 * Props:
 *   size      "sm" | "md" | "lg"   default "md"
 *   variant   "full" | "icon"      default "full" — icon-only hides text
 *   linked    boolean              default true
 *   dark      boolean              default false — white text on dark bg
 */
export default function Logo({ size = "md", variant = "full", linked = true, dark = false, style = {} }) {
  const s = {
    sm: { img: 44,  pad: 5,  r: 10, title: 14, sub: 9,  gap: 10 },
    md: { img: 56,  pad: 6,  r: 12, title: 18, sub: 10, gap: 12 },
    lg: { img: 72,  pad: 8,  r: 14, title: 24, sub: 12, gap: 14 },
  }[size] || { img: 56, pad: 6, r: 12, title: 18, sub: 10, gap: 12 };

  const titleColor = dark ? "#ffffff" : "#002651";
  const subColor   = dark ? "#E0AB21" : "#4B7D19";

  const inner = (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: s.gap,
      flexShrink: 0,
      textDecoration: "none",
      ...style,
    }}>
      <div style={{
        width: s.img, height: s.img,
        background: "#ffffff",
        borderRadius: s.r,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: s.pad,
        flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
      }}>
        <img
          src="/assets/brand/kafaala-qaad-hope-icon.png"
          alt="Kafaale Qaad"
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          draggable={false}
        />
      </div>
      {variant !== "icon" && (
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: s.title, fontWeight: 900, color: titleColor, letterSpacing: -0.5, whiteSpace: "nowrap" }}>
            KAFAALE QAAD
          </div>
          <div style={{ fontSize: s.sub, fontWeight: 700, color: subColor, letterSpacing: 1.5, marginTop: 2, whiteSpace: "nowrap", textTransform: "uppercase" }}>
            Humanitarian Aid
          </div>
        </div>
      )}
    </div>
  );

  if (!linked) return inner;

  return (
    <Link to="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}>
      {inner}
    </Link>
  );
}
