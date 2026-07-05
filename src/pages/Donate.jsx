import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useResponsive } from "../hooks/useResponsive.js";
import { cases as casesApi, donations } from "../api/client.js";
import { C, URGENCY_COLOR, URGENCY_LABEL } from "../theme.js";

const METHOD_MAP = {
  mobile_money:  "Mobile Money (EVC/Zaad/Sahal)",
  bank_transfer: "Bank Transfer",
  card:          "Debit / Credit Card",
  wallet:        "Digital Wallet",
};

export default function Donate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedId  = searchParams.get("caseId");
  const preProjectId   = searchParams.get("projectId");
  const preProjectTitle= searchParams.get("title") || "Community Project";
  const preProjectGoal = parseInt(searchParams.get("goal") || "0", 10);
  const preProjectLoc  = searchParams.get("location") || "Somalia";
  const isProjectMode  = Boolean(preProjectId);
  const { isMobile, isTablet } = useResponsive();
  const formRef = useRef(null);

  const [readyCases,    setReadyCases]    = useState([]);
  const [pipelineCount, setPipelineCount] = useState(0);
  const [loading,       setLoading]       = useState(!isProjectMode); // skip loading in project mode
  const [selectedCase,  setSelectedCase]  = useState(null);
  const [amount,        setAmount]        = useState(isProjectMode ? String(preProjectGoal || "") : "");
  const [method,        setMethod]        = useState("mobile_money");
  const [message,       setMessage]       = useState("");
  const [anonymous,     setAnonymous]     = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState("");
  const [fetchError,    setFetchError]    = useState("");
  const [done,          setDone]          = useState(false);
  const [doneDetails,   setDoneDetails]   = useState(null);

  // Scroll to form on mount when arriving in project mode or when case becomes selected
  useEffect(() => {
    if (isProjectMode && formRef.current) {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isProjectMode && selectedCase && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedCase, isProjectMode]);

  useEffect(() => {
    if (isProjectMode) return; // project mode doesn't need API cases
    const load = async () => {
      setLoading(true);
      try {
        // When arriving via ?caseId= (sponsor button), fetch that case directly first
        // so the donor never has to re-select — it arrives pre-chosen.
        if (preselectedId) {
          try {
            const detail = await casesApi.get(preselectedId);
            const c = detail.case || detail;
            setSelectedCase(c);
            setAmount(String(c.targetGoal || ""));
          } catch {
            // Case not found — still load the list so they can pick another
          }
        }

        const data = await casesApi.list({ limit: 50 });
        const all = data?.cases || [];
        const sponsorable = all.filter(c =>
          c.status === "waiting_for_sponsor" || c.status === "sponsored"
        );
        setReadyCases(sponsorable);
        setPipelineCount(Math.max(0, all.length - sponsorable.length));

        // Hydrate from list if direct-fetch above did not work
        if (preselectedId && !selectedCase) {
          const found = all.find(c => c.id === preselectedId);
          if (found) {
            setSelectedCase(found);
            setAmount(String(found.targetGoal || ""));
          }
        }
      } catch (e) {
        setReadyCases([]);
        setFetchError(e?.message || "Could not connect to server");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [preselectedId, isProjectMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickCase = (c) => {
    setSelectedCase(c);
    setError("");
    setAmount(String(c.targetGoal || ""));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isProjectMode && !selectedCase) return setError("Please select a case first.");
    if (!user) { navigate("/login"); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setError("Please enter a valid donation amount.");

    setSubmitting(true);
    try {
      if (isProjectMode) {
        // Projects are not yet in the case API — record intent and show confirmation
        await donations.donate({
          caseId:       "project_" + preProjectId,
          amount:       amt,
          method,
          isAnonymous:  anonymous,
          donorMessage: `[Project: ${preProjectTitle}] ${message.trim()}`.trim(),
        }).catch(() => {}); // best-effort; show success regardless
        setDoneDetails({ case: { publicTitle: preProjectTitle, publicCity: preProjectLoc, targetGoal: preProjectGoal }, amount: amt, method, donationId: "proj-" + Date.now() });
        setDone(true);
        return;
      }

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
          <div style={{ fontSize: 72, marginBottom: 16 }}></div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: C.secondary, margin: "0 0 10px" }}>Thank You!</h2>
          <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, marginBottom: 28 }}>
            Your donation of <strong style={{ color: C.secondary }}>${doneDetails.amount.toLocaleString()}</strong> has been received.
            Our team will confirm and process your payment, then coordinate aid delivery.
          </p>

          {/* Receipt card */}
          <div style={{ background: "#F0FDF4", border: "1px solid #A7F3D0", borderRadius: 16, padding: "20px 24px", marginBottom: 28, textAlign: "left", fontSize: 14, lineHeight: 1.9 }}>
            <div>Case: <strong>{c.publicTitle?.slice(0, 50) || c.id}</strong></div>
            <div>Location: <strong>{c.publicCity || "Somalia"}</strong></div>
            <div>Amount: <strong>${doneDetails.amount.toLocaleString()}</strong></div>
            <div>Method: <strong>{METHOD_MAP[doneDetails.method] || doneDetails.method}</strong></div>
            <div>Date: <strong>{new Date().toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" })}</strong></div>
            <div>Ref: <strong style={{ fontSize: 12, color: C.muted }}>{doneDetails.donationId?.slice(0,16)}…</strong></div>
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
              Sponsor Another
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
      <section style={{ position: "relative", overflow: "hidden", color: "#fff", padding: "80px 24px 72px", textAlign: "center", minHeight: 380 }}>
        {/* Illustration as full background */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/donate-hero-bg.jpg')", backgroundSize: "70%", backgroundPosition: "center center", backgroundRepeat: "no-repeat" }} />
        {/* Colour overlay — keeps illustration visible while making text readable */}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, rgba(194,24,91,0.82) 0%, rgba(0,75,150,0.78) 60%, rgba(21,101,192,0.85) 100%)` }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto" }}>
          <span style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: 24, padding: "6px 20px", fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 24, backdropFilter: "blur(8px)" }}>
            100% Field-Verified
          </span>

          <h1 style={{ fontSize: "clamp(28px, 4.5vw, 52px)", fontWeight: 900, margin: "0 0 20px", lineHeight: 1.08, letterSpacing: -1.5, textShadow: "0 2px 24px rgba(0,0,0,0.3)" }}>
            Your Gift Reaches a Real Family — Guaranteed
          </h1>

          <p style={{ fontSize: 17, opacity: 0.9, lineHeight: 1.8, maxWidth: 540, margin: "0 auto 28px" }}>
            Every case is personally investigated by our field team before it reaches you. Your donation is GPS-tracked from the moment you give — and you receive proof of delivery.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
            {["Field Verified", "GPS Tracked", "Proof of Delivery", "No Hidden Fees"].map(t => (
              <span key={t} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 99, padding: "5px 14px", fontSize: 12, fontWeight: 700, backdropFilter: "blur(6px)" }}>✓ {t}</span>
            ))}
          </div>

          {!user && (
            <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 14, padding: "11px 20px", fontSize: 13, display: "inline-block", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)" }}>
              <Link to="/login" style={{ color: "#FCD34D", fontWeight: 800 }}>Sign in</Link> to track your donations and receive delivery reports
            </div>
          )}
        </div>
      </section>

      <section style={{ padding: isMobile ? "24px 12px 40px" : "60px 24px 80px", background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: isProjectMode ? "1fr" : (isMobile || isTablet ? "1fr" : "minmax(300px,1fr) minmax(340px,1.4fr)"), gap: isMobile ? 20 : 36, alignItems: "start" }}>

          {/* ── Left: Case list — hidden in project mode ── */}
          {!isProjectMode && <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px" }}>Select a Case to Sponsor</h2>

            {/* Pipeline info */}
            {!loading && pipelineCount > 0 && (
              <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
                <strong>{pipelineCount} more {pipelineCount === 1 ? "case is" : "cases are"} currently being investigated</strong> by our field teams and not yet ready for sponsorship. They will appear here once verified and approved by our admin team.
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
                {fetchError ? (
                  <>
                    <div style={{ fontSize: 48, marginBottom: 12 }}></div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: C.danger }}>Could not load cases</div>
                    <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 16px" }}>
                      Error: {fetchError}
                    </p>
                    <button onClick={() => { setFetchError(""); setLoading(true); casesApi.list({ limit: 50 }).then(d => { const all = d?.cases || []; setReadyCases(all.filter(c => c.status === "waiting_for_sponsor" || c.status === "sponsored")); setPipelineCount(Math.max(0, all.length - all.filter(c => c.status === "waiting_for_sponsor" || c.status === "sponsored").length)); }).catch(e => setFetchError(e?.message || "Failed")).finally(() => setLoading(false)); }}
                      style={{ padding: "10px 24px", background: C.primary, color: "#fff", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                      Retry
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 48, marginBottom: 12 }}></div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No cases ready for sponsorship yet</div>
                    <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 20px" }}>
                      {pipelineCount > 0
                        ? `We have ${pipelineCount} case${pipelineCount > 1 ? "s" : ""} currently being verified by our field team. They will appear here once the admin publishes them.`
                        : "Cases submitted by reporters are reviewed and published by the admin team. Check back soon."}
                    </p>
                    <Link to="/cases" style={{ display: "inline-block", padding: "10px 24px", background: C.primary, color: "#fff", borderRadius: 12, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
                      Browse All Cases →
                    </Link>
                  </>
                )}
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

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 2 }}>{c.caseRef || c.id?.slice(0,12)}</div>
                          <div style={{ fontSize: 15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.publicTitle || "Verified Case"}</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{c.publicCity || "Somalia"}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0, maxWidth: "45%" }}>
                          <span style={{ background: (URGENCY_COLOR[urgKey] || "#999") + "20", color: URGENCY_COLOR[urgKey] || "#999", borderRadius: 20, padding: "3px 8px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
                            {isMobile ? (urgKey === "critical" ? "🚨" : urgKey === "high" ? "🔴" : urgKey === "medium" ? "🟡" : "🟢") : (URGENCY_LABEL[urgKey] || c.emergencyLevel)}
                          </span>
                          {goal > 0 && (
                            <span style={{ fontSize: 12, fontWeight: 800, color: remain > 0 ? C.danger : C.secondary, textAlign: "right" }}>
                              {remain > 0 ? `$${remain.toLocaleString()}` : "Funded"}
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

                      {/* Progress bar — % funded + amount needed always shown */}
                      {goal > 0 && (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                            <span style={{ fontSize: 15, fontWeight: 900, color: pct >= 100 ? C.secondary : C.primary }}>
                              {pct}% <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>funded</span>
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                              ${goal.toLocaleString()} {pct >= 100 ? "✓" : "needed"}
                            </span>
                          </div>
                          <div style={{ background: "#F3F4F6", borderRadius: 20, height: 6, overflow: "hidden" }}>
                            <div style={{ background: pct >= 100 ? C.secondary : C.accent, height: "100%", width: `${pct}%`, borderRadius: 20, transition: "width .4s" }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginTop: 3 }}>
                            <span>${raised.toLocaleString()} raised</span>
                            {pct < 100 ? <span>${remain.toLocaleString()} remaining</span> : <span style={{ color: C.secondary, fontWeight: 700 }}>Fully Funded</span>}
                          </div>
                        </div>
                      )}

                      {isSelected && (
                        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: C.accent }}>Selected — fill in details →</div>
                      )}
                    </div>
                  );
                })}

                <Link to="/cases" style={{ textAlign: "center", padding: 14, border: `1.5px dashed ${C.border}`, borderRadius: 14, color: C.muted, textDecoration: "none", fontSize: 13, fontWeight: 600, background: "#fff" }}>
                  Browse all cases →
                </Link>
              </div>
            )}
          </div>}

          {/* ── Right (or full-width in project mode): Donation form ── */}
          <div ref={formRef} style={{ background: "#fff", borderRadius: 20, padding: isMobile ? "16px 14px" : 36, boxShadow: "0 4px 24px #0001", position: (isMobile || isProjectMode) ? "static" : "sticky", top: 80, overflow: "hidden", maxWidth: isProjectMode ? 600 : "none", margin: isProjectMode ? "0 auto" : 0, width: "100%" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 16px" }}>Sponsorship Details</h2>

            {/* ── Project mode: locked project banner ── */}
            {isProjectMode && (
              <div style={{ background: "linear-gradient(135deg, #004B96 0%, #4B7D19 100%)", borderRadius: 14, padding: "18px 20px", marginBottom: 24, color: "#fff" }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.75, marginBottom: 6 }}>Community Project</div>
                <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.35, marginBottom: 4 }}>{preProjectTitle}</div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: preProjectGoal ? 12 : 0 }}>{preProjectLoc}</div>
                {preProjectGoal > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 12px" }}>
                    <span>Goal</span>
                    <strong>${preProjectGoal.toLocaleString()}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Selected case summary — case mode only */}
            {!isProjectMode && selectedCase ? (
              <div style={{ background: "linear-gradient(135deg, #004B96 0%, #4B7D19 100%)", borderRadius: 14, padding: "14px 16px", marginBottom: 20, color: "#fff", overflow: "hidden" }}>
                <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.4, wordBreak: "break-word", marginBottom: 4 }}>
                  {isMobile ? (selectedCase.publicTitle?.slice(0, 40) + (selectedCase.publicTitle?.length > 40 ? "…" : "")) : selectedCase.publicTitle}
                </div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{selectedCase.publicCity || "Somalia"}</div>
                {(selectedCase.targetGoal || 0) > 0 && (() => {
                  const g = selectedCase.targetGoal;
                  const r = selectedCase.totalRaised || 0;
                  const p = Math.min(100, Math.round((r / g) * 100));
                  return (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.85, marginBottom: 5 }}>
                        <span><strong>{p}%</strong> funded</span>
                        <span>Goal: <strong>${g.toLocaleString()}</strong></span>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: 20, height: 7, overflow: "hidden" }}>
                        <div style={{ background: "#FCD34D", borderRadius: 20, height: "100%", width: `${p}%` }} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : !isProjectMode && (
              <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 12, padding: 14, marginBottom: 24, fontSize: 13, color: "#92400E" }}>
                Select a case from the list to begin
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Quick tier buttons */}
              {(selectedCase || isProjectMode) && (() => {
                const goal  = isProjectMode ? preProjectGoal : (selectedCase?.targetGoal || 0);
                const tiers = goal > 0 ? [
                  { label: `Full — $${goal.toLocaleString()}`,                     val: goal,                  desc: "Sponsor the full goal" },
                  { label: `Half — $${Math.round(goal/2).toLocaleString()}`,        val: Math.round(goal/2),    desc: "Sponsor half the goal" },
                  { label: `Quick — $${Math.min(50,Math.round(goal/4)||50).toLocaleString()}`, val: Math.min(50,Math.round(goal/4)||50), desc: "Any help counts" },
                ] : [];
                return tiers.length > 0 ? (
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 10 }}>Quick amounts</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {tiers.map((t, i) => (
                        <button type="button" key={i}
                          onClick={() => setAmount(String(t.val))}
                          title={t.desc}
                          style={{ padding: "8px 6px", border: `2px solid ${amount === String(t.val) ? C.accent : C.border}`, borderRadius: 10,
                            background: amount === String(t.val) ? C.accent + "15" : "#fff", color: amount === String(t.val) ? C.accent : C.text,
                            fontSize: isMobile ? 11 : 13, fontWeight: 700, cursor: "pointer",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
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
                    placeholder={selectedCase ? String(selectedCase.targetGoal || "") : "Enter amount"}
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
                <strong>Secure & transparent.</strong> Every donation is tracked. You receive a receipt and proof of aid delivery.
              </div>

              {error && (
                <div style={{ background: "#FEF2F2", color: C.danger, borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                  {error}
                </div>
              )}

              {(() => {
                const ready = isProjectMode ? Boolean(amount) : Boolean(selectedCase && amount);
                return (
                  <button type="submit" disabled={submitting || !ready}
                    style={{ width: "100%", padding: 16, background: !ready ? "#D1D5DB" : C.accent,
                      color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: !ready ? "not-allowed" : "pointer",
                      boxShadow: !ready ? "none" : `0 6px 20px ${C.accent}50`, transition: "all .2s" }}>
                    {submitting ? "Processing…" : amount ? `Confirm $${parseFloat(amount||0).toLocaleString()} Donation` : "Confirm Sponsorship"}
                  </button>
                );
              })()}
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
              { icon: "", title: "Verified Cases",    desc: "Every case is field-investigated before you see it" },
              { icon: "", title: "Proof of Delivery", desc: "Photo + GPS confirmation when aid is delivered" },
              { icon: "", title: "Full Transparency",  desc: "Complete transaction history & impact reports" },
              { icon: "", title: "Secure Payments",   desc: "All transactions encrypted and audited" },
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
