/**
 * Sunrise Rule — 64×3px gold→green bar that sits above every section overline.
 * This is the only gradient permitted anywhere on the page. Never restyle it.
 */
export default function SunriseRule({ align = "start", style, className }) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        inlineSize: 64,
        blockSize: 3,
        borderRadius: "var(--kf-r-pill)",
        background: "var(--kf-sunrise)",
        ...(align === "center" ? { marginInline: "auto" } : null),
        ...style,
      }}
    />
  );
}
