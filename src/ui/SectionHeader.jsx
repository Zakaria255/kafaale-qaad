import SunriseRule from "./SunriseRule.jsx";

/**
 * The section header pattern, identical everywhere:
 *   Sunrise Rule → overline → h2 → optional lede (max 60ch)
 * Content is expected to begin 40px below (the caller owns that gap).
 */
export default function SectionHeader({
  overline,
  title,
  lede,
  align = "start",
  onDark = false,
  id,
}) {
  const centered = align === "center";
  return (
    <header
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--kf-s3)",
        alignItems: centered ? "center" : "flex-start",
        textAlign: centered ? "center" : "start",
      }}
    >
      <SunriseRule align={align} />

      {overline && (
        <div
          style={{
            fontSize: "var(--kf-fs-overline)",
            fontWeight: 700,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: onDark ? "var(--kf-gold-500)" : "var(--kf-ink-500)",
          }}
        >
          {overline}
        </div>
      )}

      <h2
        id={id}
        style={{
          fontSize: "var(--kf-fs-h2)",
          lineHeight: "var(--kf-lh-h2)",
          fontWeight: 700,
          color: onDark ? "var(--kf-surface)" : "var(--kf-navy-900)",
        }}
      >
        {title}
      </h2>

      {lede && (
        <p
          style={{
            margin: 0,
            maxInlineSize: "60ch",
            fontSize: "var(--kf-fs-body-lg)",
            lineHeight: 1.6,
            color: onDark ? "var(--kf-on-dark-75)" : "var(--kf-ink-600)",
          }}
        >
          {lede}
        </p>
      )}
    </header>
  );
}
