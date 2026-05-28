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
    sm: { img: 36, title: 13, sub: 8,  gap: 9  },
    md: { img: 44, title: 16, sub: 9,  gap: 11 },
    lg: { img: 60, title: 22, sub: 11, gap: 13 },
  }[size] || { img: 44, title: 16, sub: 9, gap: 11 };

  const titleColor = dark ? "#ffffff"   : "#002651";
  const subColor   = dark ? "#E0AB21"   : "#4B7D19";

  const inner = (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: s.gap,
      flexShrink: 0,
      textDecoration: "none",
      ...style,
    }}>
      <img
        src="/assets/brand/kafaala-qaad-hope-icon.png"
        alt="Kafaale Qaad"
        style={{
          width:  s.img,
          height: s.img,
          objectFit: "contain",
          display: "block",
          flexShrink: 0,
          borderRadius: "20%",
        }}
        draggable={false}
      />
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
