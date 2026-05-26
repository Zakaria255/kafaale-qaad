import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { cases as casesApi, donations, admin as adminApi } from "../api/client.js";

const C = {
  primary:   "#0B3D91",
  secondary: "#1A6B3C",
  accent:    "#E8A020",
  danger:    "#C0392B",
  muted:     "#6B7280",
  bg:        "#F0F4F8",
  border:    "#E2E8F0",
  text:      "#1A202C",
};

const URGENCY_COLOR = {
  critical: "#7C3AED",
  high:     "#EF4444",
  medium:   "#F59E0B",
  low:      "#10B981",
};
const URGENCY_LABEL = {
  critical: "🚨 Critical",
  high:     "🔴 High",
  medium:   "🟡 Medium",
  low:      "🟢 Low",
};

const METHOD_MAP = {
  mobile_money:  "📱 Mobile Money (EVC/Zaad/Sahal)",
  bank_transfer: "🏦 Bank Transfer",
  card:          "💳 Debit / Credit Card",
  wallet:        "💰 Digital Wallet",
};

export default function Donate() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [readyCases,    setReadyCases]    = useState([]);
  const [pipelineCount, setPipelineCount] = useState(0); // cases not yet ready
  const [loading,       setLoading]       = useState(true);
  const [selectedCase,  setSelectedCase]  = useState(null);
  const [amount,        setAmount]        = useState("");
  const [method,        setMethod]        = useState("mobile_money");
  const [message,       setMessage]       = useState("");
  const [anonymous,     setAnonymous]     = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState("");
  const [done,          setDone]          = useState(false);
  const [doneDetails,   setDoneDetails]   = useState(null);

  // Load real cases from API
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Public cases — only waiting_for_sponsor appear here
        const data = await casesApi.list({ limit: 20 });
        const sponsorable = (data?.cases || []).filter(c =>
          c.status === "waiting_for_sponsor" || c.status === "sponsored"
        );
        setReadyCases(sponsorable);

        // Count total cases in the pipeline (all statuses) for the "not ready" message
        const allData = await casesApi.list({ limit: 100 });
        const total = allData?.pagination?.total || allData?.cases?.length || 0;
        setPipelineCount(Math.max(0, total - sponsorable.length));
      } catch (e) {
        setReadyCases([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pickCase = (c) => {
    setSelectedCase(c);
    setError("");
    const goal   = c.targetGoal   || 0;
    const raised = c.totalRaised  || 0;
    const remain = Math.max(0, goal - raised);
    setAmount(remain > 0 ? String(remain) : String(goal || ""));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedCase) return setError("Please select a case first.");
    if (!user) { navigate("/login"); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setError("Please enter a valid donation amount.");

    setSubmitting(true);
    try {
      const result = await donations.donate({
        caseId:       selectedCase.id,
        amount:       amt,
        method,
        isAnonymous:  anonymous,
        donorMessage: message.trim() || undefined,
      });
      setDoneDetails({ case: selectedCase, amount: amt, method, donationId: result.donationId });
      setDone(true);
    } catch (e) {
      if (e.message?.includes("401") || e.message?.includes("not authenticated")) {
        navigate("/login");
      } else {
        setError(e.message || "Donation failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (done && doneDetails) {
    const c = doneDetails.case;
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: 24, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ background: "#fff", borderRadius: 24, padding: "48px 40px", maxWidth: 540, width: "100%", textAlign: "center", boxShadow: "0 16px 48px #0001" }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: C.secondary, margin: "0 0 10px" }}>Thank You!</h2>
          <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, marginBottom: 28 }}>
            Your donation of <strong style={{ color: C.secondary }}>${doneDetails.amount.toLocaleString()}</strong> has been received.
            Our team will confirm and process your payment, then coordinate aid delivery.
          </p>

          {/* Receipt card */}
          <div style={{ background: "#F0FDF4", border: "1px solid #A7F3D0", borderRadius: 16, padding: "20px 24px", marginBottom: 28, textAlign: "left", fontSize: 14, lineHeight: 1.9 }}>
            <div>📋 Case: <strong>{c.publicTitle?.slice(0, 50) || c.id}</strong></div>
            <div>📍 Location: <strong>{c.publicCity || "Somalia"}</strong></div>
            <div>💰 Amount: <strong>${doneDetails.amount.toLocaleString()}</strong></div>
            <div>💳 Method: <strong>{METHOD_MAP[doneDetails.method] || doneDetails.method}</strong></div>
            <div>📅 Date: <strong>{new Date().toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" })}</strong></div>
            <div>🆔 Ref: <strong style={{ fontSize: 12, color: C.muted }}>{doneDetails.donationId?.slice(0,16)}…</strong></div>
          </div>

          {/* What happens next */}
          <div style={{ background: "#EFF6FF", borderRadius: 14, padding: "16px 20px", marginBottom: 28, textAlign: "left", fontSize: 13, color: C.primary, lineHeight: 2 }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>What happens next:</div>
            <div>1️⃣  Admin confirms your payment within 24 hours</div>
            <div>2️⃣  Field agent delivers aid to the family</div>
            <div>3️⃣  Photo proof of delivery shared with you</div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={() => { setDone(false); setSelectedCase(null); setAmount(""); setMessage(""); }}
              style={{ flex: 1, padding: 14, background: C.secondary, color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              ❤️ Sponsor Another
            </button>
            {user && (
              <button onClick={() => navigate("/dashboard")}
                style={{ flex: 1, padding: 14, background: C.primary, color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                My Dashboard →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Main page ───────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: C.text }}>

      {/* Hero */}
      <section style={{ background: `linear-gradient(135deg, #EC4899 0%, ${C.primary} 100%)`, color: "#fff", padding: "72px 24px 52px", textAlign: "center" }}>
        <div style={{ maxWidth: 660, margin: "0 auto" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>❤️</div>
          <h1 style={{ fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 900, margin: "0 0 14px" }}>Sponsor a Verified Case</h1>
          <p style={{ fontSize: 16, opacity: 0.88, lineHeight: 1.7 }}>
            Every case shown here has been field-investigated and verified by our team.
            Your donation is tracked end-to-end — from payment to proof of delivery.
          </p>
          {!user && (
            <div style={{ marginTop: 20, background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "12px 20px", fontSize: 14, display: "inline-block" }}>
              💡 <Link to="/login" style={{ color: "#FCD34D", fontWeight: 700 }}>Sign in</Link> to track your donations in your personal dashboard
            </div>
          )}
        </div>
      </section>

      <section style={{ padding: "60px 24px 80px", background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(300px,1fr) minmax(340px,1.4fr)", gap: 36, alignItems: "start" }}>

          {/* ── Left: Case list ── */}
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px" }}>Select a Case to Sponsor</h2>

            {/* Pipeline info */}
            {!loading && pipelineCount > 0 && (
              <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
                <strong>ℹ️ {pipelineCount} more {pipelineCount === 1 ? "case is" : "cases are"} currently being investigated</strong> by our field teams and not yet ready for sponsorship. They will appear here once verified and approved by our admin team.
              </div>
            )}

            {loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ background: "#fff", borderRadius: 16, padding: 20, border: `1px solid ${C.border}` }}>
                    <div style={{ background: "#F3F4F6", borderRadius: 8, height: 16, width: "60%", marginBottom: 10 }} />
                    <div style={{ background: "#F3F4F6", borderRadius: 8, height: 12, width: "40%", marginBottom: 8 }} />
                    <div style={{ background: "#F3F4F6", borderRadius: 8, height: 10, width: "80%" }} />
                  </div>
                ))}
              </div>
            )}

            {!loading && readyCases.length === 0 && (
              <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🕐</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No cases ready for sponsorship yet</div>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 20px" }}>
                  {pipelineCount > 0
                    ? `We have ${pipelineCount} case${pipelineCount > 1 ? "s" : ""} currently being verified by our field team. They will appear here once the admin approves them.`
                    : "Check back soon — new verified cases are published regularly."}
                </p>
                <Link to="/cases" style={{ display: "inline-block", padding: "10px 24px", background: C.primary, color: "#fff", borderRadius: 12, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
                  Browse All Cases →
                </Link>
              </div>
            )}

            {!loading && readyCases.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {readyCases.map(c => {
                  const goal   = c.targetGoal  || 0;
                  const raised = c.totalRaised || 0;
                  const remain = Math.max(0, goal - raised);
                  const pct    = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
                  const urgKey = (c.emergencyLevel || "medium").toLowerCase();
                  const isSelected = selectedCase?.id === c.id;

                  return (
                    <div key={c.id} onClick={() => pickCase(c)}
                      style={{ background: "#fff", borderRadius: 16, padding: 20, cursor: "pointer",
                        border: `2px solid ${isSelected ? C.accent : C.border}`,
                        boxShadow: isSelected ? `0 0 0 3px ${C.accent}30` : "0 2px 8px #0001",
                        transition: "all .15s" }}>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 2 }}>{c.id?.slice(0,12)}…</div>
                          <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.publicTitle || "Verified Case"}</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>📍 {c.publicCity || "Somalia"}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
                          <span style={{ background: (URGENCY_COLOR[urgKey] || "#999") + "20", color: URGENCY_COLOR[urgKey] || "#999", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                            {URGENCY_LABEL[urgKey] || c.emergencyLevel}
                          </span>
                          {goal > 0 && (
                            <span style={{ fontSize: 13, fontWeight: 800, color: remain > 0 ? C.danger : C.secondary }}>
                              {remain > 0 ? `$${remain.toLocaleString()} needed` : "✅ Funded"}
                            </span>
                          )}
                        </div>
                      </div>

                      {c.publicStory && (
                        <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px", lineHeight: 1.5,
                          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {c.publicStory}
                        </p>
                      )}

                      {/* Progress bar */}
                      {goal > 0 && (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 4 }}>
                            <span>Raised: <strong style={{ color: C.secondary }}>${raised.toLocaleString()}</strong></span>
                            <span>Goal: <strong>${goal.toLocaleString()}</strong></span>
                          </div>
                          <div style={{ background: "#F3F4F6", borderRadius: 20, height: 6, overflow: "hidden" }}>
                            <div style={{ background: pct >= 100 ? C.secondary : C.accent, height: "100%", width: `${pct}%`, borderRadius: 20, transition: "width .4s" }} />
                          </div>
                          <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{pct}% funded</div>
                        </div>
                      )}

                      {isSelected && (
                        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: C.accent }}>✅ Selected — fill in details →</div>
                      )}
                    </div>
                  );
                })}

                <Link to="/cases" style={{ textAlign: "center", padding: 14, border: `1.5px dashed ${C.border}`, borderRadius: 14, color: C.muted, textDecoration: "none", fontSize: 13, fontWeight: 600, background: "#fff" }}>
                  Browse all cases →
                </Link>
              </div>
            )}
          </div>

          {/* ── Right: Donation form ── */}
          <div style={{ background: "#fff", borderRadius: 20, padding: 36, boxShadow: "0 4px 24px #0001", position: "sticky", top: 80 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 16px" }}>Sponsorship Details</h2>

            {/* Selected case summary */}
            {selectedCase ? (
              <div style={{ background: "linear-gradient(135deg, #0B3D91 0%, #1A6B3C 100%)", borderRadius: 14, padding: "16px 20px", marginBottom: 24, color: "#fff" }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{selectedCase.publicTitle?.slice(0,50)}</div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>📍 {selectedCase.publicCity || "Somalia"}</div>
                {(selectedCase.targetGoal || 0) > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.85, marginBottom: 5 }}>
                      <span>Raised: <strong>${(selectedCase.totalRaised || 0).toLocaleString()}</strong></span>
                      <span>Goal: <strong>${selectedCase.targetGoal.toLocaleString()}</strong></span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: 20, height: 8 }}>
                      <div style={{ background: "#FCD34D", borderRadius: 20, height: "100%",
                        width: `${Math.min(100, Math.round(((selectedCase.totalRaised||0)/selectedCase.targetGoal)*100))}%` }} />
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12 }}>
                      <strong style={{ color: "#FCD34D" }}>
                        ${Math.max(0, selectedCase.targetGoal - (selectedCase.totalRaised||0)).toLocaleString()} still needed
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 12, padding: 14, marginBottom: 24, fontSize: 13, color: "#92400E" }}>
                👈 Select a case from the list to begin
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Quick tier buttons */}
              {selectedCase && (() => {
                const goal   = selectedCase.targetGoal  || 0;
                const raised = selectedCase.totalRaised || 0;
                const remain = Math.max(0, goal - raised);
                const tiers  = remain > 0
                  ? [
                      { label: `Full — $${remain.toLocaleString()}`,            val: remain,                  desc: "Cover entire remaining need" },
                      { label: `Half — $${Math.round(remain/2).toLocaleString()}`, val: Math.round(remain/2), desc: "Cover half of what's needed" },
                      { label: `Quick — $${Math.min(50,Math.round(remain/4)||50).toLocaleString()}`, val: Math.min(50,Math.round(remain/4)||50), desc: "Any help counts" },
                    ]
                  : [];
                return tiers.length > 0 ? (
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 10 }}>Quick amounts</label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {tiers.map((t, i) => (
                        <button type="button" key={i}
                          onClick={() => setAmount(String(t.val))}
                          title={t.desc}
                          style={{ padding: "8px 14px", border: `2px solid ${amount === String(t.val) ? C.accent : C.border}`, borderRadius: 10,
                            background: amount === String(t.val) ? C.accent + "15" : "#fff", color: amount === String(t.val) ? C.accent : C.text,
                            fontSize: 13, fontWeight: 700, cursor: "pointer", flex: 1 }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Amount input */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>Donation Amount (USD) *</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, fontWeight: 700, color: C.muted }}>$</span>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1"
                    placeholder={selectedCase ? String(Math.max(0,(selectedCase.targetGoal||0)-(selectedCase.totalRaised||0))) : "Enter amount"}
                    style={{ width: "100%", padding: "13px 14px 13px 34px", border: `1.5px solid ${C.border}`, borderRadius: 12, fontSize: 18, fontWeight: 700, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                </div>
              </div>

              {/* Payment method */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 10 }}>Payment Method *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {Object.entries(METHOD_MAP).map(([val, label]) => (
                    <button type="button" key={val} onClick={() => setMethod(val)}
                      style={{ padding: "10px 12px", border: `2px solid ${method === val ? C.primary : C.border}`, borderRadius: 10,
                        background: method === val ? C.primary + "10" : "#fff", color: method === val ? C.primary : C.text,
                        fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>Message (optional)</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
                  placeholder="e.g. You are in our prayers, stay strong…"
                  style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 12, fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>

              {/* Anonymous */}
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, cursor: "pointer", userSelect: "none", fontSize: 13 }}>
                <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} style={{ width: 16, height: 16 }} />
                Keep my name anonymous
              </label>

              {/* Auth note if not logged in */}
              {!user && (
                <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#92400E" }}>
                  You'll be redirected to <Link to="/login" style={{ color: C.primary, fontWeight: 700 }}>sign in</Link> to complete your donation.
                </div>
              )}

              {/* Security note */}
              <div style={{ background: "#F0FDF4", border: "1px solid #A7F3D0", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: C.secondary, lineHeight: 1.6 }}>
                🔐 <strong>Secure & transparent.</strong> Every donation is tracked. You receive a receipt and proof of aid delivery.
              </div>

              {error && (
                <div style={{ background: "#FEF2F2", color: C.danger, borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" disabled={submitting || !selectedCase || !amount}
                style={{ width: "100%", padding: 16, background: (!selectedCase || !amount) ? "#D1D5DB" : C.accent,
                  color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: (!selectedCase || !amount) ? "not-allowed" : "pointer",
                  boxShadow: (!selectedCase || !amount) ? "none" : `0 6px 20px ${C.accent}50`, transition: "all .2s" }}>
                {submitting ? "Processing…" : amount && selectedCase ? `❤️ Confirm $${parseFloat(amount||0).toLocaleString()} Donation` : "❤️ Confirm Sponsorship"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Trust indicators */}
      <section style={{ padding: "60px 24px", background: "#fff", textAlign: "center" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 32 }}>Why Donors Trust Kafaale Qaad</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20 }}>
            {[
              { icon: "✅", title: "Verified Cases",    desc: "Every case is field-investigated before you see it" },
              { icon: "📸", title: "Proof of Delivery", desc: "Photo + GPS confirmation when aid is delivered" },
              { icon: "📊", title: "Full Transparency",  desc: "Complete transaction history & impact reports" },
              { icon: "🔐", title: "Secure Payments",   desc: "All transactions encrypted and audited" },
            ].map((t, i) => (
              <div key={i} style={{ padding: 24, borderRadius: 16, background: C.bg, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{t.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
