/**
 * Urgency badge — a pill with a solid dot and the urgency word. Colour comes
 * only from the four urgency token triplets; no emoji, no ad-hoc hues.
 */
const LEVELS = ["critical", "high", "medium", "low"];

export default function Badge({ level = "medium", children, style }) {
  const key = LEVELS.includes(String(level).toLowerCase())
    ? String(level).toLowerCase()
    : "medium";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--kf-s1)",
        paddingInline: "var(--kf-s2)",
        paddingBlock: "var(--kf-s1)",
        borderRadius: "var(--kf-r-pill)",
        fontSize: "var(--kf-fs-caption)",
        fontWeight: 600,
        lineHeight: 1.4,
        color: `var(--kf-urg-${key}-fg)`,
        background: `var(--kf-urg-${key}-bg)`,
        border: `1px solid var(--kf-urg-${key}-bd)`,
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          inlineSize: 6,
          blockSize: 6,
          borderRadius: "var(--kf-r-pill)",
          background: `var(--kf-urg-${key}-fg)`,
        }}
      />
      {children}
    </span>
  );
}
