import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { cases as casesApi } from "../api/client";
import { useResponsive } from "../hooks/useResponsive.js";

const C = {
  navy:      "#002651",
  primary:   "#004B96",
  secondary: "#4B7D19",
  accent:    "#E0AB21",
  gold:      "#E0AB21",
  green:     "#4B7D19",
  blue:      "#004B96",
  danger:    "#C0392B",
  muted:     "#5A6E8A",
  bg:        "#F4F7FC",
  border:    "#D8E4F0",
  text:      "#0D1F3C",
};

const URGENCY_COLOR = { low: "#10B981", medium: "#F59E0B", high: "#C0392B", critical: "#7C3AED" };
const URGENCY_BG    = { low: "#D1FAE5", medium: "#FEF3C7", high: "#FEE2E2", critical: "#EDE9FE" };
const URGENCY_LABEL = { low: "🟢 Low", medium: "🟡 Medium", high: "🔴 High", critical: "🟣 Critical" };
const CAT_ICON      = { food: "🍚", medical: "🏥", shelter: "🏠", orphan: "👶", disaster: "🌪️", education: "📚", other: "🌍" };
const CAT_LABEL     = { food: "Food Security", medical: "Medical", shelter: "Shelter", orphan: "Orphan Support", disaster: "Disaster Relief", education: "Education", other: "Emergency" };

const STEP_LABELS = [
  { key: "reported",   icon: "📝", label: "Case Reported",     sub: "Submitted by community reporter" },
  { key: "reviewed",   icon: "🏛️", label: "Office Review",     sub: "Verified by Kafaale Qaad office" },
  { key: "field",      icon: "🕵️", label: "Field Investigation", sub: "Physical visit by our field team" },
  { key: "verified",   icon: "✅", label: "Verified & Published", sub: "Confirmed real and safe to show donors" },
  { key: "sponsored",  icon: "❤️", label: "Sponsorship",        sub: "Donor funds secured in escrow" },
  { key: "delivered",  icon: "📦", label: "Aid Delivered",      sub: "Field team delivered with GPS proof" },
  { key: "completed",  icon: "🏁", label: "Completed",          sub: "Impact report generated" },
];

function getActiveStep(status) {
  const map = {
    pending_review: 0, under_review: 1, investigating: 2, ai_sanitized: 3,
    awaiting_approval: 3, verified: 3, waiting_for_sponsor: 3,
    sponsored: 4, delivering: 5, proof_uploaded: 5, completed: 6,
  };
  return map[status] ?? 0;
}

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [kase, setKase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) { navigate("/cases"); return; }
    setLoading(true);
    casesApi.get(id)
      .then(d => setKase(d.case || d))
      .catch(() => setError("Case not found or no longer available."))
      .finally(() => setLoading(false));
  }, [id]);

  // Must call hooks before any conditional returns
  const { isMobile, isTablet } = useResponsive();

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16, animation: "spin 1s linear infinite" }}>⏳</div>
        <div style={{ fontSize: 18, color: C.muted }}>Loading case details…</div>
      </div>
    </div>
  );

  if (error || !kase) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <div style={{ textAlign: "center", maxWidth: 440, padding: 24 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>😔</div>
        <h2 style={{ color: C.primary, marginBottom: 8 }}>{error || "Case not found"}</h2>
        <p style={{ color: C.muted, marginBottom: 24 }}>The case may have been archived or removed.</p>
        <Link to="/cases" style={{ background: C.primary, color: "#fff", padding: "12px 28px", borderRadius: 12, textDecoration: "none", fontWeight: 700 }}>
          ← Browse All Cases
        </Link>
      </div>
    </div>
  );
  const pct        = kase.targetGoal > 0 ? Math.min(100, Math.round((kase.totalRaised / kase.targetGoal) * 100)) : 0;
  const remaining  = Math.max(0, (kase.targetGoal || 0) - (kase.totalRaised || 0));
  const urgKey     = (kase.emergencyLevel || "medium").toLowerCase();
  const activeStep = getActiveStep(kase.status);
  const fi         = kase.fieldInvestigation;
  const dp         = kase.deliveryProof;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Breadcrumb */}
      <div style={{ background: C.primary, color: "#fff", padding: "12px 24px", fontSize: 13 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 6, alignItems: "center" }}>
          <Link to="/" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>Home</Link>
          <span style={{ opacity: 0.5 }}>/</span>
          <Link to="/cases" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>Cases</Link>
          <span style={{ opacity: 0.5 }}>/</span>
          <span style={{ color: "#FCD34D", fontWeight: 600 }}>Case Details</span>
        </div>
      </div>

      {/* Hero Banner */}
      <div style={{ background: `linear-gradient(135deg, ${C.primary} 0%, ${C.secondary} 100%)`, color: "#fff", padding: "40px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
            <span style={{ fontSize: 36 }}>{CAT_ICON[kase.category] || "🌍"}</span>
            <span style={{ background: URGENCY_BG[urgKey], color: URGENCY_COLOR[urgKey], borderRadius: 20, padding: "5px 14px", fontSize: 13, fontWeight: 800 }}>
              {URGENCY_LABEL[urgKey] || kase.emergencyLevel}
            </span>
            <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "5px 14px", fontSize: 13, fontWeight: 600 }}>
              {CAT_LABEL[kase.category] || kase.category}
            </span>
            <span style={{ background: "#D1FAE5", color: "#065F46", borderRadius: 20, padding: "5px 14px", fontSize: 13, fontWeight: 700 }}>
              ✅ Field Verified
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 36px)", fontWeight: 900, margin: "0 0 10px", lineHeight: 1.3 }}>
            {kase.publicTitle || "Verified Emergency Case"}
          </h1>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 14, opacity: 0.85 }}>
            <span>📍 {kase.publicCity || "Somalia"}, {kase.publicCountry || "Somalia"}</span>
            {kase.adminPublishedAt && (
              <span>📅 Published {new Date(kase.adminPublishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
            )}
            <span>🆔 Ref: {kase.id?.slice(0, 12)}…</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "20px 16px" : "32px 24px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "1fr 380px", gap: isMobile ? 20 : 32, alignItems: "start" }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Case Story */}
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 2px 16px #0001" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 10 }}>
              📖 Case Story
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.9, color: "#374151", margin: 0, whiteSpace: "pre-wrap" }}>
              {kase.publicStory || "Case details are being finalized."}
            </p>

            {/* Privacy notice */}
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "12px 16px", marginTop: 20, fontSize: 13, color: C.primary, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>🔐</span>
              <span>All personally identifiable information (names, addresses, phone numbers, GPS) has been removed to protect the beneficiary's privacy. This story was AI-sanitized by Kafaale Qaad before publication.</span>
            </div>
          </div>

          {/* Verification Timeline */}
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 2px 16px #0001" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 24px", display: "flex", alignItems: "center", gap: 10 }}>
              🗂️ Verification Timeline
            </h2>
            <div style={{ position: "relative" }}>
              {STEP_LABELS.map((step, i) => {
                const done    = i <= activeStep;
                const current = i === activeStep;
                return (
                  <div key={step.key} style={{ display: "flex", gap: 16, marginBottom: i < STEP_LABELS.length - 1 ? 0 : 0, position: "relative", paddingBottom: i < STEP_LABELS.length - 1 ? 24 : 0 }}>
                    {/* Vertical line */}
                    {i < STEP_LABELS.length - 1 && (
                      <div style={{ position: "absolute", left: 19, top: 40, width: 2, height: "calc(100% - 16px)", background: done ? C.secondary : C.border }} />
                    )}
                    {/* Icon bubble */}
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: done ? C.secondary : "#F3F4F6", border: `2px solid ${done ? C.secondary : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, zIndex: 1, boxShadow: current ? `0 0 0 4px ${C.secondary}30` : "none" }}>
                      {done ? step.icon : "○"}
                    </div>
                    {/* Text */}
                    <div style={{ flex: 1, paddingTop: 6 }}>
                      <div style={{ fontWeight: current ? 800 : done ? 700 : 500, color: done ? C.text : C.muted, fontSize: 15 }}>
                        {step.label}
                        {current && <span style={{ marginLeft: 8, background: C.accent + "20", color: C.accent, borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 800 }}>CURRENT</span>}
                      </div>
                      <div style={{ fontSize: 12, color: done ? C.muted : "#D1D5DB", marginTop: 2 }}>{step.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Field Investigation Report */}
          {fi && (
            <div style={{ background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 2px 16px #0001" }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10 }}>
                🕵️ Field Investigation Report
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 20 }}>
                {[
                  { label: "Victim Verified On-Site", val: fi.victimVerified ? "✅ Yes" : "❌ No", ok: fi.victimVerified },
                  { label: "Situation Matches Report", val: fi.situationAccurate ? "✅ Yes" : "❌ No", ok: fi.situationAccurate },
                  { label: "Delivery Feasible", val: fi.deliveryFeasible ? "✅ Yes" : "❌ No", ok: fi.deliveryFeasible },
                  { label: "Fraud Risk Level", val: `${fi.fraudRiskLevel?.toUpperCase() || "LOW"}`, ok: fi.fraudRiskLevel === "low" },
                  { label: "Urgency Confirmed", val: fi.urgencyConfirmed ? (fi.urgencyConfirmed.charAt(0).toUpperCase() + fi.urgencyConfirmed.slice(1)) : "—", ok: true },
                  { label: "Estimated Need", val: fi.estimatedAmountNeeded ? `$${fi.estimatedAmountNeeded.toLocaleString()}` : "—", ok: true },
                ].map(({ label, val, ok }) => (
                  <div key={label} style={{ background: C.bg, borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${ok ? C.secondary : C.danger}` }}>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: ok ? C.secondary : C.danger }}>{val}</div>
                  </div>
                ))}
              </div>
              {fi.deliveryMethod && (
                <div style={{ background: "#EFF6FF", borderRadius: 12, padding: "14px 16px", marginBottom: 14, fontSize: 14 }}>
                  <strong>📦 Delivery Method:</strong> {fi.deliveryMethod}
                </div>
              )}
              {fi.officialNotes && (
                <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "14px 16px", fontSize: 14, lineHeight: 1.6, color: "#166534" }}>
                  <strong>🏛️ Official Notes:</strong> {fi.officialNotes}
                </div>
              )}
              <div style={{ marginTop: 16, background: "#D1FAE5", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#065F46", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <strong>This case was physically verified by a Kafaale Qaad field agent who visited the location in person.</strong>
              </div>
            </div>
          )}

          {/* Delivery Proof */}
          {dp && (
            <div style={{ background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 2px 16px #0001" }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10 }}>
                📦 Proof of Aid Delivery
                <span style={{ fontSize: 13, fontWeight: 600, background: "#D1FAE5", color: "#065F46", borderRadius: 8, padding: "4px 10px" }}>Delivered ✅</span>
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                {[
                  { label: "Delivery Date", val: new Date(dp.deliveryDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) },
                  { label: "Delivery Method", val: dp.deliveryMethod },
                  { label: "Amount Delivered", val: `$${dp.amountDelivered?.toLocaleString()}` },
                  { label: "Admin Confirmed", val: dp.adminConfirmed ? "✅ Yes" : "⏳ Pending" },
                ].map(({ label, val }) => (
                  <div key={label} style={{ background: C.bg, borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{val || "—"}</div>
                  </div>
                ))}
              </div>
              {dp.deliveryNotes && (
                <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "14px 16px", marginTop: 14, fontSize: 14, color: "#166534" }}>
                  <strong>📝 Notes:</strong> {dp.deliveryNotes}
                </div>
              )}
            </div>
          )}

          {/* Trust & Transparency */}
          <div style={{ background: "linear-gradient(135deg, #004B96, #4B7D19)", borderRadius: 20, padding: 32, color: "#fff" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 800 }}>🔐 Our Guarantee to Donors</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { icon: "✅", title: "100% Verified", desc: "Every case physically visited before being shown to donors" },
                { icon: "🔐", title: "Secure Escrow", desc: "Your money is held until delivery is confirmed" },
                { icon: "📸", title: "Proof of Delivery", desc: "GPS-tagged photos when aid reaches the person" },
                { icon: "📊", title: "Impact Report", desc: "You receive a full report after delivery is complete" },
              ].map(t => (
                <div key={t.title} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{t.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.5 }}>{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN — Sticky donate panel ── */}
        <div style={{ position: isMobile ? "static" : "sticky", top: 80, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Funding Card */}
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.1)", border: `1px solid ${C.border}` }}>
            {/* Big % as main stat */}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, color: pct >= 100 ? C.secondary : C.primary }}>{pct}%</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4, fontWeight: 600 }}>
                {pct >= 100 ? "Fully Funded 🎉" : "funded so far"}
              </div>
              {/* Show goal $ only when 100% */}
              {pct >= 100 && (
                <div style={{ fontSize: 13, color: C.secondary, fontWeight: 700, marginTop: 6 }}>
                  Goal: ${(kase.targetGoal || 0).toLocaleString()} ✓
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div style={{ background: "#F3F4F6", borderRadius: 20, height: 10, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? C.secondary : `linear-gradient(90deg, ${C.primary}, ${C.accent})`, borderRadius: 20, transition: "width .6s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 12, color: C.muted, marginBottom: 20 }}>
              {remaining > 0 && <span><strong style={{ color: C.danger }}>${remaining.toLocaleString()}</strong> still needed</span>}
            </div>

            {/* Donate button */}
            {(kase.status === "waiting_for_sponsor" || kase.status === "sponsored") && remaining > 0 ? (
              <Link to={`/donate?caseId=${kase.id}`}
                style={{ display: "block", textAlign: "center", background: C.accent, color: "#fff", padding: "16px 20px", borderRadius: 14, fontWeight: 800, fontSize: 16, textDecoration: "none", boxShadow: `0 6px 20px ${C.accent}50`, marginBottom: 12 }}>
                ❤️ Sponsor This Case
              </Link>
            ) : kase.status === "completed" ? (
              <div style={{ background: "#D1FAE5", color: "#065F46", padding: "14px 20px", borderRadius: 14, fontWeight: 700, fontSize: 14, textAlign: "center", marginBottom: 12 }}>
                🏁 This case has been completed
              </div>
            ) : (
              <div style={{ background: "#FEF3C7", color: "#92400E", padding: "14px 20px", borderRadius: 14, fontSize: 13, fontWeight: 600, textAlign: "center", marginBottom: 12 }}>
                ⏳ This case is still being verified
              </div>
            )}

            <Link to="/donate"
              style={{ display: "block", textAlign: "center", background: "transparent", color: C.primary, padding: "12px 20px", borderRadius: 14, fontWeight: 700, fontSize: 14, textDecoration: "none", border: `1.5px solid ${C.primary}` }}>
              Browse All Cases →
            </Link>
          </div>

          {/* Case Quick Facts */}
          <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px #0001" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 16px", color: C.text }}>📋 Quick Facts</h3>
            {[
              { label: "Category",   val: `${CAT_ICON[kase.category] || "🌍"} ${CAT_LABEL[kase.category] || kase.category}` },
              { label: "Urgency",    val: URGENCY_LABEL[urgKey] || kase.emergencyLevel },
              { label: "Location",   val: `📍 ${kase.publicCity || "Somalia"}` },
              { label: "Status",     val: kase.status?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) },
              ...(fi ? [{ label: "Field Verified", val: "✅ Yes — physically visited" }] : []),
              ...(dp ? [{ label: "Aid Delivered",  val: `✅ $${dp.amountDelivered?.toLocaleString()} delivered` }] : []),
            ].map(({ label, val }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ color: C.muted, fontWeight: 600 }}>{label}</span>
                <span style={{ fontWeight: 700, color: C.text, textAlign: "right", maxWidth: "60%" }}>{val}</span>
              </div>
            ))}
          </div>

          {/* AI Assistant shortcut */}
          <div style={{ background: `linear-gradient(135deg, ${C.primary}15, ${C.secondary}15)`, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🤖</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Questions about this case?</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>Our AI assistant can explain the verification process, how your money is used, and more.</div>
            <div style={{ fontSize: 12, color: C.primary, fontWeight: 600 }}>Click the 🤖 button in the bottom-right ↘</div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      {(kase.status === "waiting_for_sponsor" || kase.status === "sponsored") && remaining > 0 && (
        <div style={{ background: C.primary, color: "#fff", padding: "40px 24px", textAlign: "center" }}>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 24, fontWeight: 900 }}>Help Complete This Case</h2>
            <p style={{ margin: "0 0 24px", opacity: 0.85, fontSize: 15 }}>
              ${remaining.toLocaleString()} is still needed. Every contribution is tracked and delivered with proof.
            </p>
            <Link to={`/donate?caseId=${kase.id}`}
              style={{ display: "inline-block", background: C.accent, color: "#fff", padding: "16px 40px", borderRadius: 14, fontWeight: 800, fontSize: 16, textDecoration: "none", boxShadow: `0 6px 24px ${C.accent}60` }}>
              ❤️ Sponsor This Case — ${remaining.toLocaleString()} Needed
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
