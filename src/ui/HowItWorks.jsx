import React from "react";

/**
 * Animated "How it works" — scattered, gently-rotated step cards connected by a
 * flowing dashed path. Adapted to the Kafaale design system (navy/gold, display
 * font, design tokens) from a Tailwind/motion reference; the path animation is
 * pure CSS (see .kf-dash-flow in global.css), so no motion library is needed.
 *
 * Props:
 *   steps   — [{ icon: LucideComponent, title, desc, theme? }]
 *   isMobile — stacks the cards vertically and drops the connector
 */

// On-brand accent themes (humanitarian palette), cycled across the cards.
const THEMES = {
  gold:  { text: "#B67F0D", bg: "rgba(224,171,33,.10)", border: "rgba(224,171,33,.30)" },
  blue:  { text: "#1A6CB5", bg: "rgba(26,108,181,.09)", border: "rgba(26,108,181,.24)" },
  green: { text: "#0E8A4F", bg: "rgba(14,138,79,.09)",  border: "rgba(14,138,79,.24)" },
};

// Scatter positions (desktop) — percentages of the 1000-wide stage. The dashed
// path below is hand-tuned to link these anchor points.
const DESKTOP_POS = [
  { top: 0,   side: "left",  inset: "14%", rotate: "6deg"  },
  { top: 120, side: "right", inset: "14%", rotate: "-6deg" },
  { top: 450, side: "left",  inset: "14%", rotate: "6deg"  },
  { top: 570, side: "right", inset: "10%", rotate: "-6deg" },
  { top: 850, side: "left",  inset: "14%", rotate: "6deg"  },
];

const PATH_D =
  "M 290 150 C 500 150, 550 270, 710 270 " +
  "C 850 270, 500 350, 290 450 " +
  "C 290 600, 550 720, 750 720 " +
  "C 950 720, 500 800, 290 850";

const STAGE_HEIGHT = 1130;

function Card({ Icon, number, title, desc, theme, rotate, style }) {
  const t = THEMES[theme] || THEMES.blue;
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        inlineSize: "100%",
        maxInlineSize: 280,
        transform: hover ? "rotate(0deg) scale(1.05)" : `rotate(${rotate || "0deg"})`,
        transition: "transform var(--kf-dur-base) var(--kf-ease-base), box-shadow var(--kf-dur-base) var(--kf-ease-base)",
        zIndex: hover ? 30 : 10,
        ...style,
      }}
    >
      <div
        style={{
          background: "var(--kf-surface)",
          padding: 8,
          borderRadius: 24,
          boxShadow: hover ? "var(--kf-e-3)" : "var(--kf-e-2)",
          border: "1px solid var(--kf-ink-200)",
        }}
      >
        <div style={{ display: "grid", placeItems: "center", marginBlock: "6px 12px" }}>
          {Icon && <Icon size={28} color={t.text} strokeWidth={2} aria-hidden="true" />}
        </div>
        <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 16, padding: "16px 16px 18px" }}>
          <div
            style={{
              color: t.text,
              fontFamily: "var(--kf-font-display)",
              fontSize: 34,
              fontWeight: 800,
              lineHeight: 1,
              marginBottom: 12,
            }}
          >
            {number}
          </div>
          <h3
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--kf-ink-900)",
              lineHeight: 1.15,
              margin: "0 0 8px",
            }}
          >
            {title}
          </h3>
          <p style={{ margin: 0, color: "var(--kf-ink-500)", fontSize: "var(--kf-fs-body-sm)", lineHeight: 1.5 }}>
            {desc}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorks({ steps = [], isMobile = false }) {
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--kf-s5)", maxInlineSize: 340, marginInline: "auto" }}>
        {steps.map((s, i) => (
          <Card
            key={s.title || i}
            Icon={s.icon}
            number={`0${i + 1}`}
            title={s.title}
            desc={s.desc}
            theme={s.theme}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", inlineSize: "100%", maxInlineSize: 1000, marginInline: "auto", blockSize: STAGE_HEIGHT }}>
      {steps.length > 1 && (
        <svg
          style={{ position: "absolute", insetBlockStart: 0, insetInlineStart: 0, inlineSize: "100%", blockSize: "100%", pointerEvents: "none", zIndex: 0 }}
          viewBox={`0 0 1000 ${STAGE_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className="kf-dash-flow"
            d={PATH_D}
            stroke="var(--kf-gold-500)"
            strokeWidth="2"
            strokeDasharray="8 6"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      {steps.map((s, i) => {
        const p = DESKTOP_POS[i % DESKTOP_POS.length];
        return (
          <Card
            key={s.title || i}
            Icon={s.icon}
            number={`0${i + 1}`}
            title={s.title}
            desc={s.desc}
            theme={s.theme}
            rotate={p.rotate}
            style={{ position: "absolute", insetBlockStart: p.top, [p.side === "left" ? "insetInlineStart" : "insetInlineEnd"]: p.inset }}
          />
        );
      })}
    </div>
  );
}
