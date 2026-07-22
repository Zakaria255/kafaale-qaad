import { MapPin } from "lucide-react";
import Badge from "./Badge.jsx";
import Seal from "./Seal.jsx";
import ProgressBar from "./ProgressBar.jsx";
import Button from "./Button.jsx";

const BRAND_ICON = "/assets/brand/kafaala-qaad-hope-icon.png";

/**
 * The flagship component. It appears in the hero (as the product demonstrating
 * itself) and in the Featured Cases grid — identical in both places.
 *
 * Anatomy: media → body (seal, title, location, story) → progress → actions.
 */
export default function CaseCard({
  id,
  title,
  story,
  location,
  urgency = "medium",
  raised,
  goal = 0,
  percent,
  image,
  category,
  verifiedAt,
  lang = "en",
  labels = {},
  elevation = "var(--kf-e-1)",
  style,
}) {
  const L = {
    sponsor: "Sponsor",
    details: "Details",
    verified: "Verified",
    // Single placeholder string rather than "of" + "goal" fragments — word order
    // around the amount differs per language (tr puts it first, ar uses "من أصل").
    goalOf: "of {amount} goal",
    ...labels,
  };

  const pct = Number.isFinite(percent)
    ? Math.round(percent)
    : goal > 0 ? Math.round(((raised || 0) / goal) * 100) : 0;
  const raisedAmount = Number.isFinite(raised) ? raised : Math.round((goal * pct) / 100);

  const money = (n) =>
    new Intl.NumberFormat(lang, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
      .format(Number(n) || 0);

  // Card lifts; the image scales inside its clipped frame. This is the only
  // image zoom on the site, so it reads as intentional rather than decorative.
  const lift = (on) => (e) => {
    const el = e.currentTarget;
    el.style.transform = on ? "translateY(-2px)" : "";
    el.style.boxShadow = on ? "var(--kf-e-2)" : elevation;
    el.style.borderColor = on ? "var(--kf-ink-300)" : "var(--kf-ink-200)";
    const media = el.querySelector("[data-kf-media]");
    if (media) media.style.transform = on ? "scale(1.04)" : "scale(1)";
  };

  return (
    <article
      onMouseEnter={lift(true)}
      onMouseLeave={lift(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--kf-surface)",
        border: "1px solid var(--kf-ink-200)",
        borderRadius: "var(--kf-r-lg)",
        boxShadow: elevation,
        overflow: "hidden",
        transition:
          "transform var(--kf-dur-base) var(--kf-ease-base)," +
          "box-shadow var(--kf-dur-base) var(--kf-ease-base)," +
          "border-color var(--kf-dur-base) var(--kf-ease-base)",
        ...style,
      }}
    >
      {/* ── Media ─────────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", aspectRatio: "16 / 10", background: "var(--kf-navy-50)", overflow: "hidden" }}>
        <div
          data-kf-media
          style={{
            blockSize: "100%",
            transform: "scale(1)",
            transition: "transform var(--kf-dur-long) var(--kf-ease-std)",
          }}
        >
          {image ? (
            <img
              src={image}
              alt=""
              loading="lazy"
              style={{ inlineSize: "100%", blockSize: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ display: "grid", placeItems: "center", blockSize: "100%" }}>
              <img src={BRAND_ICON} alt="" aria-hidden="true" style={{ inlineSize: 24, opacity: 0.4 }} />
            </div>
          )}
        </div>

        <div style={{ position: "absolute", insetBlockStart: "var(--kf-s3)", insetInlineStart: "var(--kf-s3)" }}>
          <Badge level={urgency}>{L[String(urgency).toLowerCase()] || urgency}</Badge>
        </div>

        {category && (
          <div
            style={{
              position: "absolute",
              insetBlockStart: "var(--kf-s3)",
              insetInlineEnd: "var(--kf-s3)",
              paddingInline: "var(--kf-s2)",
              paddingBlock: "var(--kf-s1)",
              background: "rgba(255,255,255,.90)",
              backdropFilter: "blur(6px)",
              borderRadius: "var(--kf-r-pill)",
              fontSize: "var(--kf-fs-caption)",
              fontWeight: 600,
              color: "var(--kf-navy-900)",
            }}
          >
            {category}
          </div>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: "var(--kf-s5)", display: "flex", flexDirection: "column", gap: "var(--kf-s3)" }}>
        <Seal label={L.verified} date={verifiedAt} lang={lang} />

        {title && (
          <h3
            className="kf-clamp-2"
            style={{
              fontSize: "var(--kf-fs-h3)",
              lineHeight: "var(--kf-lh-h3)",
              fontWeight: 600,
              color: "var(--kf-ink-900)",
            }}
          >
            {title}
          </h3>
        )}

        {location && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--kf-s1)",
              fontSize: "var(--kf-fs-body-sm)",
              color: "var(--kf-ink-500)",
            }}
          >
            <MapPin size={16} strokeWidth={2} aria-hidden="true" />
            {location}
          </div>
        )}

        {story && (
          <p
            className="kf-clamp-2"
            style={{ margin: 0, fontSize: "var(--kf-fs-body-sm)", lineHeight: 1.5, color: "var(--kf-ink-600)" }}
          >
            {story}
          </p>
        )}

        {/* ── Progress ────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--kf-s2)" }}>
          <ProgressBar percent={pct} lang={lang} />
          <div style={{ display: "flex", alignItems: "baseline", gap: "var(--kf-s2)", flexWrap: "wrap" }}>
            <span
              className="kf-tabular"
              style={{ fontSize: "var(--kf-fs-body-sm)", fontWeight: 700, color: "var(--kf-ink-900)" }}
            >
              {money(raisedAmount)}
            </span>
            <span style={{ fontSize: "var(--kf-fs-caption)", color: "var(--kf-ink-500)" }}>
              {L.goalOf.replace("{amount}", money(goal))}
            </span>
            <span
              className="kf-tabular"
              style={{
                marginInlineStart: "auto",
                fontSize: "var(--kf-fs-caption)",
                fontWeight: 600,
                color: "var(--kf-ink-600)",
              }}
            >
              {new Intl.NumberFormat(lang).format(pct)}%
            </span>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "var(--kf-s2)", marginBlockStart: "var(--kf-s1)" }}>
          <Button to={id ? `/donate?case=${id}` : "/cases"} variant="primary" size="sm" style={{ flex: 1 }}>
            {L.sponsor}
          </Button>
          <Button to={id ? `/cases/${id}` : "/cases"} variant="ghost" size="sm">
            {L.details}
          </Button>
        </div>
      </div>
    </article>
  );
}
