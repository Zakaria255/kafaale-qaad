import { Link } from "react-router-dom";

/**
 * <Logo /> — Kafaala Qaad Hope Society brand logo
 * Props:
 *   size      "sm" | "md" | "lg"   default "md"
 *   variant   "full" | "icon"      default "full" — icon-only hides text
 *   linked    boolean              default true
 *   dark      boolean              default false — white text on dark bg
 */
export default function Logo({ size = "md", variant = "full", linked = true, dark = false, style = {} }) {
  const s = {
    sm: { img: 56,  title: 14, sub: 8,  gap: 11 },
    md: { img: 72,  title: 19, sub: 10, gap: 13 },
    lg: { img: 96,  title: 25, sub: 12, gap: 16 },
  }[size] || { img: 72, title: 19, sub: 10, gap: 13 };

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
      {/* Icon wrapper — always white background so icon is visible on any surface */}
      <div style={{
        width: s.img, height: s.img, flexShrink: 0,
        background: "#ffffff",
        borderRadius: Math.round(s.img * 0.2),
        padding: Math.round(s.img * 0.07),
        boxSizing: "border-box",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: dark ? "0 2px 14px rgba(0,0,0,0.30)" : "0 2px 10px rgba(0,38,81,0.15)",
        border: dark ? "2px solid rgba(224,171,33,0.5)" : "2px solid rgba(0,38,81,0.12)",
      }}>
        <img
          src="/assets/brand/kafaala-qaad-hope-icon.png"
          alt="Kafaala Qaad Hope Society"
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          draggable={false}
        />
      </div>
      {variant !== "icon" && (
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: s.title, fontWeight: 900, color: titleColor, letterSpacing: -0.5, whiteSpace: "nowrap" }}>
            KAFAALA QAAD
          </div>
          <div style={{ fontSize: s.sub, fontWeight: 700, color: subColor, letterSpacing: 1.5, marginTop: 2, whiteSpace: "nowrap", textTransform: "uppercase" }}>
            Hope Society
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
