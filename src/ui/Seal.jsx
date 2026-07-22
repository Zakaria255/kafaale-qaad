import { BadgeCheck } from "lucide-react";

/**
 * Verification Seal — the trust primitive. Identical everywhere it appears;
 * never restyle it per-context. Green is reserved for verification.
 */
export default function Seal({ label = "Verified", date, lang = "en" }) {
  const when = date
    ? new Intl.DateTimeFormat(lang, { month: "short", year: "numeric" }).format(new Date(date))
    : null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--kf-s1)",
        paddingInline: "var(--kf-s2)",
        paddingBlock: "var(--kf-s1)",
        background: "var(--kf-green-50)",
        border: "1px solid var(--kf-green-100)",
        borderRadius: "var(--kf-r-pill)",
        fontSize: "var(--kf-fs-caption)",
        fontWeight: 600,
        color: "var(--kf-green-600)",
        lineHeight: 1.4,
      }}
    >
      <BadgeCheck size={16} strokeWidth={2.2} aria-hidden="true" />
      {label}
      {when && <span style={{ color: "var(--kf-ink-500)", fontWeight: 500 }}>· {when}</span>}
    </span>
  );
}
