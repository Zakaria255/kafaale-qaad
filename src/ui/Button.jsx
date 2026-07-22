import { Link } from "react-router-dom";

/*
 * Variants
 *   cta        gold on light or dark — the primary action. Gold is rationed:
 *              see the acceptance checklist before adding another.
 *   secondary  on-dark ghost, for pairing with `cta` on navy surfaces
 *   ghost      quiet text link with an optional trailing chevron
 * Sizes: sm 40px · md 44px · lg 52px — all at or above the 44px target except
 * `sm`, which is only used inside cards next to a larger primary action.
 */
const SIZES = {
  sm: { blockSize: 40, paddingInline: "var(--kf-s4)", fontSize: "var(--kf-fs-body-sm)" },
  md: { blockSize: 44, paddingInline: "var(--kf-s5)", fontSize: "var(--kf-fs-body)" },
  lg: { blockSize: 52, paddingInline: "var(--kf-s7)", fontSize: "var(--kf-fs-body)" },
};

const VARIANTS = {
  cta: {
    background: "var(--kf-gold-500)",
    color: "var(--kf-navy-900)",
    fontWeight: 700,
    border: "1px solid transparent",
  },
  // Primary action *within* a card. Deliberately blue, not gold: gold is capped
  // at four appearances page-wide, and a grid of gold buttons would spend that
  // budget on repeated tiles instead of the page's real call to action.
  primary: {
    background: "var(--kf-blue-600)",
    color: "var(--kf-surface)",
    fontWeight: 700,
    border: "1px solid transparent",
  },
  secondary: {
    background: "var(--kf-on-dark-12)",
    color: "var(--kf-surface)",
    fontWeight: 600,
    border: "1px solid var(--kf-on-dark-25)",
  },
  ghost: {
    background: "transparent",
    color: "var(--kf-blue-600)",
    fontWeight: 600,
    border: "1px solid transparent",
  },
};

export default function Button({
  to,
  href,
  onClick,
  variant = "cta",
  size = "md",
  icon: Icon,
  iconEnd: IconEnd,
  children,
  style,
  className,
  ...rest
}) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--kf-s2)",
    borderRadius: "var(--kf-r-md)",
    fontFamily: "var(--kf-font-body)",
    textDecoration: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition:
      "background var(--kf-dur-hover) var(--kf-ease-out)," +
      "transform var(--kf-dur-hover) var(--kf-ease-out)," +
      "box-shadow var(--kf-dur-hover) var(--kf-ease-out)",
    ...SIZES[size],
    ...VARIANTS[variant],
    ...style,
  };

  // Hover lift is applied imperatively so we avoid a styled-components dependency
  // while still honouring reduced motion (the CSS layer zeroes the duration).
  const hoverIn = (e) => {
    const el = e.currentTarget;
    if (variant === "cta") el.style.background = "var(--kf-gold-600)";
    if (variant === "primary") el.style.background = "var(--kf-blue-500)";
    if (variant === "secondary") el.style.background = "var(--kf-on-dark-25)";
    if (variant === "ghost") el.style.background = "var(--kf-blue-50)";
    if (variant !== "ghost") {
      el.style.transform = "translateY(-2px)";
      el.style.boxShadow = "var(--kf-e-2)";
    }
  };
  const hoverOut = (e) => {
    const el = e.currentTarget;
    el.style.background = VARIANTS[variant].background;
    el.style.transform = "";
    el.style.boxShadow = "";
  };

  const content = (
    <>
      {Icon && <Icon size={18} strokeWidth={2} aria-hidden="true" />}
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
      {IconEnd && (
        // Trailing icons are directional (arrow/chevron), so they mirror in RTL.
        <span className="kf-dir-icon" style={{ display: "inline-flex" }}>
          <IconEnd size={18} strokeWidth={2} aria-hidden="true" />
        </span>
      )}
    </>
  );

  // Only the gold CTA gets the sheen glint; everything else stays flat.
  const cls = [variant === "cta" ? "kf-sheen" : "", className].filter(Boolean).join(" ") || undefined;
  const handlers = { onMouseEnter: hoverIn, onMouseLeave: hoverOut, onFocus: hoverIn, onBlur: hoverOut };

  if (to) return <Link to={to} className={cls} style={base} {...handlers} {...rest}>{content}</Link>;
  if (href) return <a href={href} className={cls} style={base} {...handlers} {...rest}>{content}</a>;
  return <button type="button" className={cls} onClick={onClick} style={base} {...handlers} {...rest}>{content}</button>;
}
