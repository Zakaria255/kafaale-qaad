import {
  TriangleAlert, ShieldCheck, MapPin, Siren, Lock, CircleCheck,
  HeartHandshake, ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

const BRAND_ICON = "/assets/brand/kafaala-qaad-hope-icon.png";
const DEFAULT_PHOTO = "/assets/hero/field-delivery.jpg";

/**
 * Featured-case showcase — a two-panel flagship card: field photo on the left
 * (with a CRITICAL badge and a reassurance card overlaid), verified case detail
 * on the right (case ref, title, story, funding, trust markers and actions).
 *
 * Sits on the light home surface inside a navy frame so it reads as a
 * self-contained "verified case" object regardless of section background.
 */
export default function FeaturedCase({
  caseRef = "KQ-2026-0148",
  title = "Urgent Medical Support for a Family in Mogadishu",
  location = "Mogadishu, Somalia",
  story =
    "A mother caring for five children is facing a critical medical emergency and " +
    "urgently needs support for life-saving treatment. Our field team has verified " +
    "the situation and confirmed the family's immediate needs.",
  raised = 1200,
  goal = 5400,
  percent,
  image = DEFAULT_PHOTO,
  id,
  isMobile = false,
  lang = "en",
  labels = {},
}) {
  const L = {
    tagCritical: "CRITICAL",
    tagVerifiedCase: "VERIFIED CASE",
    reassureTitle: "Your support can save a life",
    reassureSub: "Every contribution brings hope, healing, and a brighter future.",
    caseId: "CASE ID",
    verifiedBy: "VERIFIED BY KAFAALA QAAD",
    verifiedTag: "Your trust. Their hope.",
    alert: "Critical — Immediate Support Needed",
    raised: "raised",
    funded: "Funded",
    goal: "goal",
    trust1Title: "Field Verified",
    trust1Sub: "Our team verified this case on-site",
    trust2Title: "Identity Protected",
    trust2Sub: "Beneficiary identity is protected",
    trust3Title: "Needs Confirmed",
    trust3Sub: "Needs assessed and confirmed",
    sponsor: "Sponsor This Case",
    viewFull: "View Full Case",
    ...labels,
  };

  const pct = Number.isFinite(percent)
    ? Math.round(percent)
    : goal > 0 ? Math.round(((raised || 0) / goal) * 100) : 0;
  const clamped = Math.max(0, Math.min(100, pct));

  const money = (n) =>
    new Intl.NumberFormat(lang, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
      .format(Number(n) || 0);

  const green = "var(--kf-green-600)";

  const TRUST = [
    { icon: ShieldCheck, title: L.trust1Title, sub: L.trust1Sub },
    { icon: Lock,        title: L.trust2Title, sub: L.trust2Sub },
    { icon: CircleCheck, title: L.trust3Title, sub: L.trust3Sub },
  ];

  return (
    <div
      style={{
        background: "var(--kf-navy-950)",
        padding: isMobile ? 8 : 12,
        borderRadius: "var(--kf-r-lg)",
        boxShadow: "var(--kf-e-3)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 44%) minmax(0, 56%)",
          background: "var(--kf-surface)",
          borderRadius: "calc(var(--kf-r-lg) - 4px)",
          overflow: "hidden",
        }}
      >
        {/* ── Media panel ─────────────────────────────────────────────────── */}
        <div
          style={{
            position: "relative",
            minBlockSize: isMobile ? 280 : 0,
            aspectRatio: isMobile ? "16 / 10" : "auto",
            background: "var(--kf-navy-900)",
            overflow: "hidden",
          }}
        >
          {image ? (
            <img
              src={image}
              alt={title}
              loading="lazy"
              className="kf-photo-tone"
              onError={(e) => { if (!e.currentTarget.src.endsWith(DEFAULT_PHOTO)) e.currentTarget.src = DEFAULT_PHOTO; }}
              style={{ position: "absolute", inset: 0, inlineSize: "100%", blockSize: "100%", objectFit: "cover", objectPosition: "72% center" }}
            />
          ) : (
            <div style={{
              position: "absolute", inset: 0, display: "grid", placeItems: "center",
              background: "linear-gradient(135deg, var(--kf-navy-800) 0%, var(--kf-navy-950) 100%)",
            }}>
              <img src={BRAND_ICON} alt="" aria-hidden="true" style={{ inlineSize: 64, opacity: 0.3 }} />
            </div>
          )}

          {/* Brand grade — matches the logo atmosphere and keeps overlays legible */}
          <div aria-hidden="true" className="kf-img-grade" />

          {/* CRITICAL badge */}
          <div style={{
            position: "absolute", insetBlockStart: "var(--kf-s5)", insetInlineStart: "var(--kf-s5)",
            display: "flex", alignItems: "center", gap: "var(--kf-s2)",
            background: "var(--kf-urg-high-fg, #C0392B)",
            color: "#fff", padding: "10px 14px", borderRadius: "var(--kf-r-md)",
            boxShadow: "var(--kf-e-2)",
          }}>
            <TriangleAlert size={22} strokeWidth={2.4} aria-hidden="true" />
            <div style={{ lineHeight: 1.05 }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: ".02em" }}>{L.tagCritical}</div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", opacity: 0.92 }}>{L.tagVerifiedCase}</div>
            </div>
          </div>

          {/* Reassurance card */}
          <div style={{
            position: "absolute", insetBlockEnd: "var(--kf-s5)", insetInlineStart: "var(--kf-s5)", insetInlineEnd: "var(--kf-s5)",
            display: "flex", alignItems: "center", gap: "var(--kf-s3)",
            background: "rgba(10,29,69,.72)", backdropFilter: "blur(8px)",
            border: "1px solid var(--kf-on-dark-14)",
            padding: "var(--kf-s4)", borderRadius: "var(--kf-r-md)",
          }}>
            <div style={{
              flex: "0 0 auto", inlineSize: 40, blockSize: 40, borderRadius: "var(--kf-r-md)",
              display: "grid", placeItems: "center",
              background: "rgba(250,165,40,.16)", border: "1px solid rgba(250,165,40,.4)",
            }}>
              <HeartHandshake size={20} color="var(--kf-gold-500)" strokeWidth={2} aria-hidden="true" />
            </div>
            <div>
              <div style={{ color: "var(--kf-gold-500)", fontWeight: 700, fontSize: "var(--kf-fs-body-sm)" }}>{L.reassureTitle}</div>
              <div style={{ color: "var(--kf-on-dark-75)", fontSize: "var(--kf-fs-caption)", lineHeight: 1.4 }}>{L.reassureSub}</div>
            </div>
          </div>
        </div>

        {/* ── Detail panel ────────────────────────────────────────────────── */}
        <div style={{
          padding: isMobile ? "var(--kf-s6)" : "var(--kf-s8)",
          display: "flex", flexDirection: "column", gap: "var(--kf-s4)",
        }}>
          {/* Header row: case id + verified badge */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--kf-s4)", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--kf-s2)" }}>
              <span style={{
                background: "var(--kf-gold-100)", color: "var(--kf-gold-600)",
                fontSize: 11, fontWeight: 800, letterSpacing: ".06em",
                padding: "4px 10px", borderRadius: "var(--kf-r-pill)",
              }}>{L.caseId}</span>
              <span className="kf-tabular" style={{ fontWeight: 700, color: "var(--kf-ink-600)", fontSize: "var(--kf-fs-body-sm)" }}>{caseRef}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--kf-s2)" }}>
              <div style={{
                flex: "0 0 auto", inlineSize: 34, blockSize: 34, borderRadius: "var(--kf-r-pill)",
                display: "grid", placeItems: "center", background: "var(--kf-green-100)",
              }}>
                <ShieldCheck size={18} color={green} strokeWidth={2.2} aria-hidden="true" />
              </div>
              <div style={{ lineHeight: 1.15 }}>
                <div style={{ color: green, fontWeight: 800, fontSize: 11, letterSpacing: ".04em" }}>{L.verifiedBy}</div>
                <div style={{ color: green, fontSize: "var(--kf-fs-caption)" }}>{L.verifiedTag}</div>
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 style={{
            margin: 0, fontFamily: "var(--kf-font-display)",
            fontSize: isMobile ? "var(--kf-fs-h2)" : 38, lineHeight: 1.1,
            fontWeight: 800, letterSpacing: "-.02em", color: "var(--kf-navy-900)",
          }}>
            {title}
          </h2>

          {/* Location */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--kf-s2)", color: "var(--kf-ink-600)", fontSize: "var(--kf-fs-body)" }}>
            <MapPin size={18} color="var(--kf-gold-500)" strokeWidth={2.2} aria-hidden="true" />
            {location}
          </div>

          {/* Story */}
          <p style={{ margin: 0, fontSize: "var(--kf-fs-body)", lineHeight: 1.6, color: "var(--kf-ink-600)" }}>
            {story}
          </p>

          {/* Critical alert bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: "var(--kf-s2)",
            background: "var(--kf-urg-high-bg)", border: "1px solid var(--kf-urg-high-bd)",
            color: "var(--kf-urg-high-fg)", fontWeight: 700,
            padding: "12px 16px", borderRadius: "var(--kf-r-md)", fontSize: "var(--kf-fs-body)",
          }}>
            <Siren size={20} strokeWidth={2.2} aria-hidden="true" />
            {L.alert}
          </div>

          {/* Funding card */}
          <div style={{
            border: "1px solid var(--kf-ink-200)", borderRadius: "var(--kf-r-lg)",
            padding: "var(--kf-s5)", display: "flex", flexDirection: "column", gap: "var(--kf-s4)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--kf-s3)" }}>
              <div>
                <div className="kf-tabular" style={{ fontSize: "var(--kf-fs-h3)", fontWeight: 800, color: green }}>{money(raised)}</div>
                <div style={{ fontSize: "var(--kf-fs-body-sm)", color: "var(--kf-ink-500)" }}>{L.raised}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div className="kf-tabular" style={{ fontSize: "var(--kf-fs-h3)", fontWeight: 800, color: "var(--kf-navy-900)" }}>{clamped}%</div>
                <div style={{ fontSize: "var(--kf-fs-body-sm)", color: "var(--kf-ink-500)" }}>{L.funded}</div>
              </div>
              <div style={{ textAlign: "end" }}>
                <div className="kf-tabular" style={{ fontSize: "var(--kf-fs-h3)", fontWeight: 800, color: "var(--kf-navy-900)" }}>{money(goal)}</div>
                <div style={{ fontSize: "var(--kf-fs-body-sm)", color: "var(--kf-ink-500)" }}>{L.goal}</div>
              </div>
            </div>

            {/* Progress with bubble */}
            <div style={{ position: "relative", blockSize: 10, background: "var(--kf-ink-100)", borderRadius: "var(--kf-r-pill)" }}>
              <div style={{
                blockSize: "100%", inlineSize: `${clamped}%`, background: green,
                borderRadius: "var(--kf-r-pill)", transition: "inline-size 600ms var(--kf-ease-base)",
              }} />
              <div style={{
                position: "absolute", insetBlockStart: "50%", insetInlineStart: `${clamped}%`,
                transform: "translate(-50%, -50%)",
                background: "var(--kf-surface)", border: `2px solid ${green}`, color: green,
                fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: "var(--kf-r-pill)",
                boxShadow: "var(--kf-e-1)", whiteSpace: "nowrap",
              }}>{clamped}%</div>
            </div>

            {/* Trust markers */}
            <div style={{
              display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gap: "var(--kf-s4)", borderBlockStart: "1px solid var(--kf-ink-100)", paddingBlockStart: "var(--kf-s4)",
            }}>
              {TRUST.map(({ icon: Icon, title: t, sub }) => (
                <div key={t} style={{ display: "flex", gap: "var(--kf-s2)", alignItems: "flex-start" }}>
                  <div style={{
                    flex: "0 0 auto", inlineSize: 30, blockSize: 30, borderRadius: "var(--kf-r-pill)",
                    display: "grid", placeItems: "center", background: "var(--kf-green-100)",
                  }}>
                    <Icon size={15} color={green} strokeWidth={2.2} aria-hidden="true" />
                  </div>
                  <div style={{ lineHeight: 1.25 }}>
                    <div style={{ fontWeight: 700, color: green, fontSize: "var(--kf-fs-body-sm)" }}>{t}</div>
                    <div style={{ color: "var(--kf-ink-500)", fontSize: "var(--kf-fs-caption)" }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "var(--kf-s3)", flexWrap: "wrap" }}>
            <Link
              to={id ? `/donate?case=${id}` : "/donate"}
              className="kf-sheen"
              style={{
                flex: isMobile ? "1 1 100%" : "1 1 0",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--kf-s2)",
                blockSize: 56, paddingInline: "var(--kf-s6)",
                background: "var(--kf-gold-500)", color: "var(--kf-navy-900)",
                fontWeight: 800, fontSize: "var(--kf-fs-body-lg)", textDecoration: "none",
                borderRadius: "var(--kf-r-md)", whiteSpace: "nowrap",
              }}
            >
              <HeartHandshake size={20} strokeWidth={2.2} aria-hidden="true" />
              <span style={{ position: "relative", zIndex: 1 }}>{L.sponsor}</span>
              <span className="kf-dir-icon" style={{ display: "inline-flex" }}>
                <ArrowRight size={20} strokeWidth={2.2} aria-hidden="true" />
              </span>
            </Link>
            <Link
              to={id ? `/cases/${id}` : "/cases"}
              style={{
                flex: isMobile ? "1 1 100%" : "0 1 auto",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                blockSize: 56, paddingInline: "var(--kf-s7)",
                background: "var(--kf-surface)", color: "var(--kf-navy-900)",
                fontWeight: 700, fontSize: "var(--kf-fs-body)", textDecoration: "none",
                border: "1px solid var(--kf-ink-200)", borderRadius: "var(--kf-r-md)", whiteSpace: "nowrap",
              }}
            >
              {L.viewFull}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
