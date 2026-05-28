import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { useLang } from "./context/LanguageContext.jsx";
import { cases as casesApi, admin as adminApi, field as fieldApi, notifications as notifsApi, donations, impact } from "./api/client.js";
import Logo from "./components/Logo.jsx";
import "./responsive.css";

// ─── Responsive hook ──────────────────────────────────────────────────────────
const useIsMobile = (bp = 600) => {
  const [mob, setMob] = useState(() => window.innerWidth <= bp);
  useEffect(() => {
    const h = () => setMob(window.innerWidth <= bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return mob;
};
const useIsTablet = () => useIsMobile(900);

// ─── Color Palette & Globals ───────────────────────────────────────────────
const COLORS = {
  navy:      "#002651",
  primary:   "#004B96",
  blue:      "#004B96",
  secondary: "#4B7D19",
  green:     "#4B7D19",
  accent:    "#E0AB21",
  gold:      "#E0AB21",
  danger:    "#C0392B",
  purple:    "#6B21A8",
  teal:      "#0E7490",
  bg:        "#F4F7FC",
  card:      "#FFFFFF",
  text:      "#0D1F3C",
  muted:     "#5A6E8A",
  border:    "#D8E4F0",
  darkBg:    "#001A40",
  darkCard:  "#00244F",
};

const STATUS_MAP = {
  "Pending Verification": { color: "#F59E0B", bg: "#FEF3C7", icon: "⏳" },
  "Under Review":         { color: "#3B82F6", bg: "#DBEAFE", icon: "🔍" },
  "Investigating":        { color: "#8B5CF6", bg: "#EDE9FE", icon: "🕵️" },
  "Awaiting Approval":    { color: "#EC4899", bg: "#FCE7F3", icon: "📋" },
  "Verified":             { color: "#10B981", bg: "#D1FAE5", icon: "✅" },
  "Waiting Sponsor":      { color: "#F59E0B", bg: "#FEF3C7", icon: "🤝" },
  "Sponsored":            { color: "#EF4444", bg: "#FEE2E2", icon: "❤️" },
  "Aid Delivered":        { color: "#06B6D4", bg: "#CFFAFE", icon: "📦" },
  "Delivering":           { color: "#0891B2", bg: "#CFFAFE", icon: "🚚" },
  "Proof Submitted":      { color: "#10B981", bg: "#D1FAE5", icon: "📤" },
  "Completed":            { color: "#5A6E8A", bg: "#F3F4F6", icon: "🏁" },
  "Archived":             { color: "#374151", bg: "#E5E7EB", icon: "📁" },
};

const URGENCY = { Low: "#10B981", Medium: "#F59E0B", High: "#EF4444", Critical: "#7C3AED" };

// ─── WORKFLOW STEPS ────────────────────────────────────────────────────────
const WORKFLOW_STEPS = [
  { num: 1, label: "Report Creation",    status: "Pending Verification", color: "#3B82F6", icon: "📝" },
  { num: 2, label: "Verification Office",status: "Under Review",         color: "#8B5CF6", icon: "🏛️" },
  { num: 3, label: "Field Investigation",status: "Investigating",        color: "#F59E0B", icon: "🔍" },
  { num: 4, label: "Verified",           status: "Verified",             color: "#10B981", icon: "✅" },
  { num: 5, label: "Donor Queue",        status: "Waiting Sponsor",      color: "#EC4899", icon: "👥" },
  { num: 6, label: "Sponsorship",        status: "Sponsored",            color: "#EF4444", icon: "❤️" },
  { num: 7, label: "Aid Delivery",       status: "Aid Delivered",        color: "#06B6D4", icon: "📦" },
  { num: 8, label: "Completed",          status: "Completed",            color: "#5A6E8A", icon: "🏁" },
];

// ─── HELPER COMPONENTS ─────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const s = STATUS_MAP[status] || { color: "#5A6E8A", bg: "#F3F4F6", icon: "○" };
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}40`, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
      {s.icon} {status}
    </span>
  );
};

const UrgencyBadge = ({ level }) => (
  <span style={{ background: URGENCY[level] + "20", color: URGENCY[level], border: `1px solid ${URGENCY[level]}40`, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
    {level}
  </span>
);

const StatCard = ({ label, value, icon, color, sub }) => (
  <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 2px 12px #0001", borderLeft: `4px solid ${color}`, display: "flex", alignItems: "center", gap: 16, flex: 1, minWidth: 140 }}>
    <div style={{ fontSize: 32 }}>{icon}</div>
    <div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 13, color: COLORS.muted, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);

const Modal = ({ title, children, onClose, wide }) => {
  const isMob = useIsMobile();
  return (
    <div className="kf-modal-outer" style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 1000, display: "flex", alignItems: isMob ? "flex-end" : "center", justifyContent: "center", padding: isMob ? 0 : 16 }} onClick={onClose}>
      <div className="kf-modal-inner" style={{ maxWidth: wide ? 900 : 640, borderRadius: isMob ? "18px 18px 0 0" : 18 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: isMob ? 18 : 22, fontWeight: 800, color: COLORS.text }}>{title}</h2>
          <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 20, color: COLORS.muted, flexShrink: 0 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>{label}</label>}
    <input {...props} style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${COLORS.border}`, borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", ...props.style }} />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>{label}</label>}
    <select {...props} style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${COLORS.border}`, borderRadius: 10, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", fontFamily: "inherit" }}>
      {children}
    </select>
  </div>
);

const Textarea = ({ label, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>{label}</label>}
    <textarea {...props} rows={3} style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${COLORS.border}`, borderRadius: 10, fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", ...props.style }} />
  </div>
);

const Btn = ({ children, variant = "primary", size = "md", ...props }) => {
  const variants = {
    primary: { background: COLORS.primary,   color: "#fff" },
    success: { background: COLORS.secondary, color: "#fff" },
    danger:  { background: COLORS.danger,    color: "#fff" },
    accent:  { background: COLORS.accent,    color: "#fff" },
    ghost:   { background: "transparent",    color: COLORS.primary, border: `1.5px solid ${COLORS.primary}` },
    muted:   { background: "#F3F4F6",        color: COLORS.muted },
    purple:  { background: COLORS.purple,    color: "#fff" },
    teal:    { background: COLORS.teal,      color: "#fff" },
  };
  const sizes = { sm: { padding: "6px 14px", fontSize: 12 }, md: { padding: "10px 20px", fontSize: 14 }, lg: { padding: "14px 28px", fontSize: 16 } };
  return (
    <button {...props} style={{ ...variants[variant], ...sizes[size], border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontFamily: "inherit", transition: "opacity 0.2s", ...props.style }}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.85"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
      {children}
    </button>
  );
};

// ─── FILE UPLOAD ZONE ──────────────────────────────────────────────────────
const FileUploadZone = ({ label, accept, multiple = true, files, onAdd, onRemove, note, required, color = COLORS.primary }) => {
  const inputRef = useRef(null);

  const getIcon = (f) => {
    if (f.preview) return null;
    if (f.name.match(/\.(mp4|mov|avi|webm|mkv)$/i)) return "🎥";
    if (f.name.match(/\.pdf$/i)) return "📄";
    if (f.name.match(/\.(doc|docx)$/i)) return "📝";
    if (f.name.match(/\.(jpg|jpeg|png|gif|webp|heic)$/i)) return "🖼️";
    return "📎";
  };

  const formatSize = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : (b / 1024).toFixed(0) + " KB";

  const handleChange = (e) => {
    const selected = Array.from(e.target.files).map(f => ({
      name: f.name, type: f.type, size: f.size,
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
    }));
    onAdd(selected);
    e.target.value = "";
  };

  return (
    <div style={{ marginBottom: 18 }}>
      {label && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{label}</label>
          {required && <span style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>Required</span>}
          {files.length > 0 && <span style={{ background: color + "15", color, borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>{files.length} file{files.length > 1 ? "s" : ""}</span>}
        </div>
      )}

      {/* Drop zone */}
      <div onClick={() => inputRef.current?.click()}
        style={{ border: `2px dashed ${files.length > 0 ? color + "60" : COLORS.border}`, borderRadius: 12, padding: "18px", textAlign: "center", cursor: "pointer", background: files.length > 0 ? color + "06" : "#FAFAFA", transition: "all .15s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = color + "08"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = files.length > 0 ? color + "60" : COLORS.border; e.currentTarget.style.background = files.length > 0 ? color + "06" : "#FAFAFA"; }}>
        <div style={{ fontSize: 26, marginBottom: 6 }}>📁</div>
        <div style={{ fontSize: 13, color, fontWeight: 700 }}>Click to upload {multiple ? "files" : "file"}</div>
        <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 3 }}>{note || "Photos · Videos · Documents"}</div>
      </div>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={handleChange} style={{ display: "none" }} />

      {/* Previews */}
      {files.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {files.map((f, i) => (
            <div key={i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${COLORS.border}`, background: "#F8FAFC" }}>
              {f.preview ? (
                <img src={f.preview} alt={f.name} style={{ width: 80, height: 80, objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: 80, height: 80, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: 4 }}>
                  <span style={{ fontSize: 26 }}>{getIcon(f)}</span>
                  <span style={{ fontSize: 8, color: COLORS.muted, textAlign: "center", maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <span style={{ fontSize: 8, color: COLORS.muted }}>{formatSize(f.size)}</span>
                </div>
              )}
              {/* Remove button */}
              <button onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                style={{ position: "absolute", top: 3, right: 3, background: "rgba(239,68,68,.85)", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 12, color: "#fff", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                ×
              </button>
              {/* Image overlay with name */}
              {f.preview && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,.5)", padding: "2px 4px", fontSize: 8, color: "#fff", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{f.name}</div>
              )}
            </div>
          ))}
          {/* Add more */}
          <div onClick={() => inputRef.current?.click()}
            style={{ width: 80, height: 80, border: `2px dashed ${COLORS.border}`, borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: COLORS.muted, fontSize: 11, fontWeight: 700, gap: 4 }}>
            <span style={{ fontSize: 22 }}>+</span>Add
          </div>
        </div>
      )}
    </div>
  );
};

// ─── CASE TIMELINE ───────────────────────────────────────────────────────────
const CaseTimeline = ({ c }) => {
  const events = [
    { time: c.created_at,         action: "📝 Report Created",      by: "Reporter",   done: true },
    c.investigation_date
      ? { time: c.investigation_date, action: "🕵️ Investigation Started",by: "Field Team", done: true }
      : { time: "—",               action: "🕵️ Investigation Pending", by: "Field Team", done: false },
    c.findings
      ? { time: c.investigation_date, action: "✅ Case Verified",       by: "Field Team", done: true }
      : { time: "—",               action: "✅ Verification Pending",   by: "Field Team", done: false },
    c.sponsor_id
      ? { time: new Date().toISOString().split("T")[0], action: "❤️ Case Sponsored", by: "Donor", done: true }
      : { time: "—",               action: "❤️ Awaiting Sponsorship",  by: "Donor",      done: false },
    c.status === "Aid Delivered" || c.status === "Completed"
      ? { time: "—",               action: "📦 Aid Delivered",          by: "Field Team", done: true }
      : { time: "—",               action: "📦 Aid Delivery Pending",   by: "Field Team", done: false },
    c.status === "Completed"
      ? { time: "—",               action: "🏁 Case Completed",         by: "System",     done: true }
      : { time: "—",               action: "🏁 Completion Pending",     by: "System",     done: false },
  ];

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>📋 Case Timeline</div>
      <div style={{ position: "relative", paddingLeft: 28 }}>
        {events.map((e, i) => (
          <div key={i} style={{ marginBottom: i < events.length - 1 ? 16 : 0, position: "relative" }}>
            <div style={{ position: "absolute", left: -28, top: 2, width: 18, height: 18, borderRadius: "50%", background: e.done ? COLORS.secondary : "#E5E7EB", border: "2.5px solid #fff", boxShadow: `0 0 0 2px ${e.done ? COLORS.secondary : "#D1D5DB"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {e.done && <span style={{ color: "#fff", fontSize: 9, fontWeight: 900 }}>✓</span>}
            </div>
            {i < events.length - 1 && <div style={{ position: "absolute", left: -19, top: 18, width: 2, height: 14, background: e.done ? COLORS.secondary + "40" : "#E5E7EB" }} />}
            <div style={{ opacity: e.done ? 1 : 0.45 }}>
              <div style={{ fontSize: 13, fontWeight: e.done ? 700 : 500, color: e.done ? COLORS.text : COLORS.muted }}>{e.action}</div>
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{e.time !== "—" ? e.time : "Pending"} · {e.by}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── CASE DETAIL MODAL ─────────────────────────────────────────────────────
const CaseDetailModal = ({ c, currentUser, onClose, onUpdateCase, onSponsor }) => {
  const [findings,      setFindings]      = useState(c.findings);
  const [activeTab,     setActiveTab]     = useState("details");
  // Evidence files (field investigation)
  const [evidencePhotos, setEvidencePhotos] = useState([]);
  const [evidenceVideos, setEvidenceVideos] = useState([]);
  const [evidenceDocs,   setEvidenceDocs]   = useState([]);
  // Delivery proof files
  const [proofPhotos,  setProofPhotos]  = useState([]);
  const [proofVideos,  setProofVideos]  = useState([]);
  const [proofReceipts,setProofReceipts]= useState([]);

  const stepIdx = WORKFLOW_STEPS.findIndex(s => s.status === c.status);

  const canAdvance = () => {
    const isAdmin = ["admin","super_admin","verification_office"].includes(currentUser.role);
    const isField = ["field_agent","field_team"].includes(currentUser.role);
    if (c.status === "Pending Verification" && isAdmin) return "Under Review";
    if (c.status === "Under Review"         && isAdmin) return "Investigating";
    if (c.status === "Investigating"        && isField) return "Verified";
    if (c.status === "Verified"             && isAdmin) return "Waiting Sponsor";
    if (c.status === "Sponsored"            && isField) return "Aid Delivered";
    if (c.status === "Aid Delivered"        && (isAdmin || currentUser.role === "super_admin")) return "Completed";
    return null;
  };
  const nextStatus = canAdvance();

  // For field investigation — require at least 1 photo before submitting
  const isInvestigating = c.status === "Investigating" && ["field_agent","field_team"].includes(currentUser.role);
  const isDelivering    = c.status === "Sponsored"     && ["field_agent","field_team"].includes(currentUser.role);
  const canSubmitInvestigation = evidencePhotos.length > 0 && findings.trim().length > 0;
  const canSubmitDelivery      = proofPhotos.length > 0;

  const handleAdvance = () => {
    const allEvidenceFiles = [
      ...evidencePhotos.map(f => f.name),
      ...evidenceVideos.map(f => f.name),
      ...evidenceDocs.map(f => f.name),
    ];
    const allProofFiles = [
      ...proofPhotos.map(f => f.name),
      ...proofVideos.map(f => f.name),
      ...proofReceipts.map(f => f.name),
    ];
    onUpdateCase(c.id, {
      status: nextStatus,
      findings: findings || c.findings,
      ...(allEvidenceFiles.length > 0 && { media_files: [...c.media_files, ...allEvidenceFiles] }),
      ...(allProofFiles.length > 0    && { proof_files: [...c.proof_files, ...allProofFiles] }),
    });
    onClose();
  };

  const totalMedia = c.media_files.length + evidencePhotos.length + evidenceVideos.length + evidenceDocs.length;
  const totalProof = c.proof_files.length + proofPhotos.length + proofVideos.length + proofReceipts.length;

  const tabs = [
    { id: "details",  label: "📋 Details"  },
    { id: "timeline", label: "🕐 Timeline" },
    { id: "media",    label: `📎 Media (${totalMedia})` },
    ...(totalProof > 0 ? [{ id: "proof", label: `✅ Proof (${totalProof})` }] : []),
  ];

  return (
    <Modal title={`Case ${c.id} — ${c.victim_name}`} onClose={onClose} wide>
      {/* Workflow bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 8 }}>
        {WORKFLOW_STEPS.map((s, i) => (
          <div key={s.num} style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 60 }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: i <= stepIdx ? s.color : "#E5E7EB", color: i <= stepIdx ? "#fff" : "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", fontSize: 16, fontWeight: 700 }}>
                {i < stepIdx ? "✓" : s.num}
              </div>
              <div style={{ fontSize: 9, marginTop: 4, color: i <= stepIdx ? s.color : "#9CA3AF", fontWeight: 600, lineHeight: 1.2 }}>{s.label}</div>
            </div>
            {i < WORKFLOW_STEPS.length - 1 && <div style={{ width: 16, height: 2, background: i < stepIdx ? s.color : "#E5E7EB", flexShrink: 0 }} />}
          </div>
        ))}
      </div>

      {/* Status row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <Badge status={c.status} />
        <UrgencyBadge level={c.urgency_level} />
        {c.donation_amount > 0 && <span style={{ background: "#D1FAE5", color: "#065F46", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>💰 ${c.donation_amount}</span>}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: `2px solid ${COLORS.border}`, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: "8px 16px", fontSize: 13, fontWeight: 700, border: "none", background: "none", cursor: "pointer", color: activeTab === t.id ? COLORS.primary : COLORS.muted, borderBottom: activeTab === t.id ? `2px solid ${COLORS.primary}` : "2px solid transparent", marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── DETAILS TAB ── */}
      {activeTab === "details" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[["Victim Name", c.victim_name], ["Age", c.age], ["Gender", c.gender], ["Location", c.location], ["Reporter", c.reporter_id], ["Team", c.team_id || "Not Assigned"], ["Created", c.created_at], ["Donation", c.donation_amount ? `$${c.donation_amount}` : "None"]].map(([k, v]) => (
              <div key={k} style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "#F8FAFC", borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600, marginBottom: 6 }}>DESCRIPTION</div>
            <p style={{ margin: 0, fontSize: 14, color: COLORS.text, lineHeight: 1.6 }}>{c.description}</p>
          </div>

          {/* ── FIELD INVESTIGATION SECTION ── */}
          {isInvestigating && (
            <div style={{ background: "#FFFBEB", border: "2px solid #FCD34D", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#92400E", marginBottom: 4 }}>🔍 Field Investigation Report</div>
              <div style={{ fontSize: 12, color: "#B45309", marginBottom: 16 }}>Document your findings. At least 1 photo + written findings required before submitting.</div>
              <Textarea label="Investigation Findings *" value={findings} onChange={e => setFindings(e.target.value)} placeholder="Describe what you found on site — confirm or deny the case details, note any important observations..." style={{ minHeight: 90 }} />
              <FileUploadZone
                label="📸 Photos (Required — min. 1)"
                accept="image/*"
                files={evidencePhotos}
                onAdd={f => setEvidencePhotos(p => [...p, ...f])}
                onRemove={i => setEvidencePhotos(p => p.filter((_, idx) => idx !== i))}
                note="Take photos at the location as evidence"
                required
                color="#F59E0B"
              />
              <FileUploadZone
                label="🎥 Videos (Optional)"
                accept="video/*"
                files={evidenceVideos}
                onAdd={f => setEvidenceVideos(p => [...p, ...f])}
                onRemove={i => setEvidenceVideos(p => p.filter((_, idx) => idx !== i))}
                note="Short video clips of the situation"
                color="#8B5CF6"
              />
              <FileUploadZone
                label="📄 Documents (Optional)"
                accept=".pdf,.doc,.docx,image/*"
                files={evidenceDocs}
                onAdd={f => setEvidenceDocs(p => [...p, ...f])}
                onRemove={i => setEvidenceDocs(p => p.filter((_, idx) => idx !== i))}
                note="Medical records, IDs, official documents"
                color="#3B82F6"
              />
              {!canSubmitInvestigation && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: 12, fontSize: 12, color: "#991B1B" }}>
                  ⚠️ You must add <strong>written findings</strong> and at least <strong>1 photo</strong> before submitting.
                </div>
              )}
            </div>
          )}

          {/* ── AID DELIVERY SECTION ── */}
          {isDelivering && (
            <div style={{ background: "#F0FDF4", border: "2px solid #86EFAC", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#065F46", marginBottom: 4 }}>📦 Aid Delivery Proof</div>
              <div style={{ fontSize: 12, color: "#047857", marginBottom: 16 }}>Upload proof that aid was delivered. At least 1 photo is required. Receipts and videos are optional but encouraged.</div>
              <FileUploadZone
                label="📸 Delivery Photos (Required — min. 1)"
                accept="image/*"
                files={proofPhotos}
                onAdd={f => setProofPhotos(p => [...p, ...f])}
                onRemove={i => setProofPhotos(p => p.filter((_, idx) => idx !== i))}
                note="Photo of aid being handed to beneficiary"
                required
                color="#10B981"
              />
              <FileUploadZone
                label="🎥 Delivery Video (Optional)"
                accept="video/*"
                files={proofVideos}
                onAdd={f => setProofVideos(p => [...p, ...f])}
                onRemove={i => setProofVideos(p => p.filter((_, idx) => idx !== i))}
                note="Short video of the delivery moment"
                color="#06B6D4"
              />
              <FileUploadZone
                label="🧾 Receipt / Document (Optional)"
                accept=".pdf,.doc,.docx,image/*"
                files={proofReceipts}
                onAdd={f => setProofReceipts(p => [...p, ...f])}
                onRemove={i => setProofReceipts(p => p.filter((_, idx) => idx !== i))}
                note="Payment receipt, signed acknowledgement, or any document"
                color="#F59E0B"
              />
              {!canSubmitDelivery && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: 12, fontSize: 12, color: "#991B1B" }}>
                  ⚠️ At least <strong>1 delivery photo</strong> is required before marking as Aid Delivered.
                </div>
              )}
            </div>
          )}

          {/* Existing findings display */}
          {c.findings && !isInvestigating && (
            <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: COLORS.secondary, fontWeight: 700, marginBottom: 6 }}>✅ FIELD FINDINGS</div>
              <p style={{ margin: 0, fontSize: 14, color: COLORS.text }}>{c.findings}</p>
            </div>
          )}
        </div>
      )}

      {/* ── TIMELINE TAB ── */}
      {activeTab === "timeline" && <CaseTimeline c={c} />}

      {/* ── MEDIA TAB ── */}
      {activeTab === "media" && (
        <div>
          {c.media_files.length === 0 && evidencePhotos.length === 0 && evidenceVideos.length === 0 && evidenceDocs.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: COLORS.muted }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
              No media files attached to this case yet.
            </div>
          ) : (
            <div>
              {/* Existing files */}
              {c.media_files.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 10 }}>EXISTING FILES</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {c.media_files.map(f => (
                      <div key={f} style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "16px 20px", fontSize: 13, color: COLORS.primary, fontWeight: 600, textAlign: "center", minWidth: 100 }}>
                        <div style={{ fontSize: 28, marginBottom: 6 }}>{f.endsWith(".pdf") ? "📄" : f.match(/\.(mp4|mov|avi)$/) ? "🎥" : "🖼️"}</div>
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Newly added files preview */}
              {(evidencePhotos.length > 0 || evidenceVideos.length > 0 || evidenceDocs.length > 0) && (
                <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 10 }}>🆕 NEW UPLOADS (not saved yet)</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[...evidencePhotos, ...evidenceVideos, ...evidenceDocs].map((f, i) => (
                      <div key={i} style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #FCD34D" }}>
                        {f.preview ? <img src={f.preview} alt={f.name} style={{ width: 64, height: 64, objectFit: "cover", display: "block" }} /> :
                          <div style={{ width: 64, height: 64, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                            {f.name.match(/\.(mp4|mov)$/i) ? "🎥" : f.name.endsWith(".pdf") ? "📄" : "📎"}
                          </div>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PROOF TAB ── */}
      {activeTab === "proof" && (
        <div>
          {c.proof_files.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.secondary, marginBottom: 10 }}>✅ DELIVERY PROOF</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {c.proof_files.map(f => (
                  <div key={f} style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 12, padding: "16px 20px", fontSize: 13, color: COLORS.secondary, fontWeight: 600, textAlign: "center", minWidth: 100 }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>
                      {f.match(/\.(mp4|mov|avi)$/i) ? "🎥" : f.match(/\.(pdf|doc)$/i) ? "🧾" : "📸"}
                    </div>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}
          {(proofPhotos.length > 0 || proofVideos.length > 0 || proofReceipts.length > 0) && (
            <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#065F46", marginBottom: 10 }}>🆕 NEW PROOF (not saved yet)</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[...proofPhotos, ...proofVideos, ...proofReceipts].map((f, i) => (
                  <div key={i} style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #86EFAC" }}>
                    {f.preview ? <img src={f.preview} alt={f.name} style={{ width: 64, height: 64, objectFit: "cover", display: "block" }} /> :
                      <div style={{ width: 64, height: 64, background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                        {f.name.match(/\.(mp4|mov)$/i) ? "🎥" : f.name.endsWith(".pdf") ? "🧾" : "📎"}
                      </div>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ACTION BUTTONS ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24, paddingTop: 20, borderTop: `1px solid ${COLORS.border}` }}>
        {nextStatus && !isInvestigating && !isDelivering && (
          <Btn variant="success" onClick={handleAdvance}>➜ Advance: {nextStatus}</Btn>
        )}
        {isInvestigating && (
          <Btn variant="success" onClick={handleAdvance} style={{ opacity: canSubmitInvestigation ? 1 : 0.4, cursor: canSubmitInvestigation ? "pointer" : "not-allowed" }}
            {...(!canSubmitInvestigation ? { onClick: () => alert("Add written findings + at least 1 photo before submitting.") } : {})}>
            ✅ Submit Investigation → Verified
          </Btn>
        )}
        {isDelivering && (
          <Btn variant="teal" onClick={handleAdvance} style={{ opacity: canSubmitDelivery ? 1 : 0.4, cursor: canSubmitDelivery ? "pointer" : "not-allowed" }}
            {...(!canSubmitDelivery ? { onClick: () => alert("Add at least 1 delivery photo before submitting.") } : {})}>
            📦 Confirm Aid Delivered
          </Btn>
        )}
        {c.status === "Waiting Sponsor" && ["donor"].includes(currentUser.role) && (
          <Btn variant="accent" onClick={() => { onSponsor(c); onClose(); }}>❤️ Sponsor This Case</Btn>
        )}
        {c.status === "Pending Verification" && ["admin","super_admin","verification_office"].includes(currentUser.role) && (
          <Btn variant="danger" onClick={() => { onUpdateCase(c.id, { status: "Archived" }); onClose(); }}>✕ Reject Case</Btn>
        )}
        {["admin","super_admin","verification_office"].includes(currentUser.role) && c.status === "Under Review" && (
          <Btn variant="primary" onClick={() => { onUpdateCase(c.id, { status: "Investigating", team_id: "T01" }); onClose(); }}>Assign Field Team</Btn>
        )}
        {["admin","super_admin","verification_office"].includes(currentUser.role) && c.status === "Aid Delivered" && (
          <Btn variant="success" onClick={handleAdvance}>🏁 Mark as Completed</Btn>
        )}
        <Btn variant="muted" onClick={onClose}>Close</Btn>
      </div>
    </Modal>
  );
};

// ─── REPORT CASE MODAL ─────────────────────────────────────────────────────
const ReportCaseModal = ({ onClose, onSubmit, currentUser }) => {
  const [form, setForm] = useState({
    privateVictimName:   "",
    privateVictimAge:    "",
    privateVictimGender: "female",
    privateVictimPhone:  "",
    privateAddress:      "",
    privateFamilySize:   "",
    privateDescription:  "",
    privateNotes:        "",
    category:            "food",
    emergencyLevel:      "high",
    targetGoal:          "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError("");
    if (!form.privateVictimName.trim()) return setError("Victim name is required");
    if (form.privateDescription.trim().length < 20) return setError("Description must be at least 20 characters");
    if (!form.privateAddress.trim()) return setError("Location / address is required");

    setLoading(true);
    try {
      const payload = {
        privateVictimName:   form.privateVictimName.trim(),
        privateDescription:  form.privateDescription.trim(),
        privateAddress:      form.privateAddress.trim(),
        category:            form.category,
        emergencyLevel:      form.emergencyLevel,
        ...(form.privateVictimAge    && { privateVictimAge:    parseInt(form.privateVictimAge)  }),
        ...(form.privateVictimGender && { privateVictimGender: form.privateVictimGender }),
        ...(form.privateVictimPhone  && { privateVictimPhone:  form.privateVictimPhone.trim() }),
        ...(form.privateFamilySize   && { privateFamilySize:   parseInt(form.privateFamilySize) }),
        ...(form.privateNotes        && { privateNotes:        form.privateNotes.trim() }),
        ...(form.targetGoal          && { targetGoal:          parseFloat(form.targetGoal) }),
      };
      const result = await casesApi.submit(payload);
      // Submission succeeded — tell parent to reload
      onSubmit(result);
      onClose();
    } catch (e) {
      setError(e.message || "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const CATEGORIES = [
    { value: "food",      label: "🍚 Food Insecurity"     },
    { value: "medical",   label: "🏥 Medical Emergency"   },
    { value: "shelter",   label: "🏠 Shelter / Housing"   },
    { value: "orphan",    label: "👶 Orphan / Child Aid"  },
    { value: "disaster",  label: "🌊 Disaster Relief"     },
    { value: "education", label: "📚 Education Support"   },
    { value: "other",     label: "📌 Other"               },
  ];

  return (
    <Modal title="📝 Report New Case" onClose={onClose} wide>
      {/* Privacy note */}
      <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#065F46" }}>
        🔐 All personal details you enter are <strong>private and encrypted</strong>. Only verified admins and field agents can see this information. Donors never see victim names, phones, or addresses.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
        {/* Left: victim info */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>🔐 Private Victim Information</div>
          <Input label="Victim Full Name *" value={form.privateVictimName}
            onChange={e => set("privateVictimName", e.target.value)} placeholder="Full name" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <Input label="Age" type="number" value={form.privateVictimAge}
              onChange={e => set("privateVictimAge", e.target.value)} placeholder="Years" />
            <Select label="Gender" value={form.privateVictimGender} onChange={e => set("privateVictimGender", e.target.value)}>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <Input label="Phone Number" value={form.privateVictimPhone}
            onChange={e => set("privateVictimPhone", e.target.value)} placeholder="+252 61 xxx xxxx" />
          <Input label="Family Size (no. of people)" type="number" value={form.privateFamilySize}
            onChange={e => set("privateFamilySize", e.target.value)} placeholder="e.g. 5" />
          <Input label="Address / Location *" value={form.privateAddress}
            onChange={e => set("privateAddress", e.target.value)} placeholder="District, City, Region" />
        </div>

        {/* Right: case details */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>📋 Case Details</div>
          <Select label="Category *" value={form.category} onChange={e => set("category", e.target.value)}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <Select label="Urgency Level *" value={form.emergencyLevel} onChange={e => set("emergencyLevel", e.target.value)}>
            <option value="critical">🚨 Critical — Life-threatening, immediate help needed</option>
            <option value="high">🔴 High — Urgent within days</option>
            <option value="medium">🟡 Medium — Within a week</option>
            <option value="low">🟢 Low — Stable but needs support</option>
          </Select>
          <Input label="Estimated Amount Needed (USD)" type="number" value={form.targetGoal}
            onChange={e => set("targetGoal", e.target.value)} placeholder="e.g. 800" />
          <Textarea label="Situation Description * (min. 20 characters)" value={form.privateDescription}
            onChange={e => set("privateDescription", e.target.value)}
            placeholder="Describe the full situation — what happened, why they need help, what is urgently needed…"
            style={{ minHeight: 120 }} />
          <Textarea label="Additional Notes (optional)" value={form.privateNotes}
            onChange={e => set("privateNotes", e.target.value)}
            placeholder="Any other relevant information for the verification team…" />
        </div>
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", color: COLORS.danger, borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, marginTop: 8 }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#92400E", marginTop: 16 }}>
        📋 After submission you will see this case immediately in your dashboard with status <strong>Pending Verification</strong>. Admin will assign a field agent to investigate.
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <Btn variant="muted" onClick={onClose} style={{ flex: 1 }} disabled={loading}>Cancel</Btn>
        <Btn variant="primary" onClick={handleSubmit} disabled={loading} style={{ flex: 2 }}>
          {loading ? "Submitting…" : "📤 Submit Case Report"}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── SPONSOR MODAL ─────────────────────────────────────────────────────────
const SponsorModal = ({ c, onClose, onConfirm, currentUser }) => {
  const targetGoal  = c.target_goal  || c._raw?.targetGoal  || 0;
  const totalRaised = c.donation_amount || c._raw?.totalRaised || 0;
  const remaining   = Math.max(0, targetGoal - totalRaised);
  const pct         = targetGoal > 0 ? Math.min(100, Math.round((totalRaised / targetGoal) * 100)) : 0;

  const METHODS = [
    { value: "mobile_money",  label: "📱 Mobile Money (EVC / Zaad / Sahal)" },
    { value: "bank_transfer", label: "🏦 Bank Transfer" },
    { value: "card",          label: "💳 Debit / Credit Card" },
    { value: "wallet",        label: "💰 Digital Wallet" },
  ];

  // Tier presets based on actual remaining amount
  const tiers = [
    { label: "Full Sponsor 🏆",   amount: remaining || targetGoal,           desc: "Cover the entire remaining need" },
    { label: "Half Support 🤝",   amount: Math.round((remaining || targetGoal) / 2), desc: "Cover half of what's still needed" },
    { label: "Quick Help ❤️",     amount: Math.min(100, Math.round((remaining || targetGoal) / 4) || 50), desc: "Any help makes a difference" },
  ].filter(t => t.amount > 0);

  const [selectedTier, setSelectedTier] = useState(0);
  const [amount,       setAmount]       = useState(String(tiers[0]?.amount || ""));
  const [method,       setMethod]       = useState("mobile_money");
  const [message,      setMessage]      = useState("");
  const [anonymous,    setAnonymous]    = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [done,         setDone]         = useState(false);

  const pickTier = (i) => {
    setSelectedTier(i);
    setAmount(String(tiers[i].amount));
  };

  const handleConfirm = async () => {
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setError("Please enter a valid amount");
    setLoading(true);
    try {
      await donations.donate({
        caseId:       c.id,
        amount:       amt,
        method,
        isAnonymous:  anonymous,
        donorMessage: message.trim() || undefined,
      });
      setDone(true);
      // update parent state optimistically
      onConfirm(c.id, { type: tiers[selectedTier]?.label || "Donation", method, amount: amt });
    } catch (e) {
      setError(e.message || "Donation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──
  if (done) {
    return (
      <Modal title="❤️ Thank You!" onClose={onClose}>
        <div style={{ textAlign: "center", padding: "20px 0 32px" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: COLORS.secondary }}>Donation Received!</h3>
          <p style={{ color: COLORS.muted, fontSize: 14, lineHeight: 1.6, maxWidth: 360, margin: "0 auto 24px" }}>
            Your donation of <strong style={{ color: COLORS.secondary }}>${parseFloat(amount).toLocaleString()}</strong> has been submitted.
            Our team will confirm and process the payment. You will receive a notification once confirmed.
          </p>
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 14, padding: "16px 20px", marginBottom: 24, fontSize: 13, color: "#065F46", textAlign: "left" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>What happens next:</div>
            <div>1️⃣ Admin confirms your payment</div>
            <div style={{ marginTop: 4 }}>2️⃣ Field agent delivers aid to the family</div>
            <div style={{ marginTop: 4 }}>3️⃣ Proof of delivery uploaded — you see it</div>
          </div>
          <Btn variant="success" onClick={onClose} style={{ minWidth: 160 }}>Close ✓</Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`❤️ Sponsor This Case`} onClose={onClose} wide>
      {/* Case summary card */}
      <div style={{ background: "linear-gradient(135deg, #004B96 0%, #4B7D19 100%)", borderRadius: 16, padding: 20, marginBottom: 24, color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{c.victim_name}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>📍 {c.location}</div>
            <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5, margin: 0, maxWidth: 420 }}>
              {(c.description || "").slice(0, 140)}{c.description?.length > 140 ? "…" : ""}
            </p>
          </div>
          <UrgencyBadge level={c.urgency_level} />
        </div>

        {/* Funding progress */}
        {targetGoal > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
              <span>💰 Raised: <strong>${totalRaised.toLocaleString()}</strong></span>
              <span>🎯 Goal: <strong>${targetGoal.toLocaleString()}</strong></span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 20, height: 10, overflow: "hidden" }}>
              <div style={{ background: pct >= 100 ? "#10B981" : "#FCD34D", borderRadius: 20, height: "100%", width: `${pct}%`, transition: "width 0.5s" }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
              {pct}% funded · <strong style={{ color: "#FCD34D" }}>${remaining.toLocaleString()} still needed</strong>
            </div>
          </div>
        )}
      </div>

      {/* Tier buttons */}
      {tiers.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>Choose a sponsorship tier</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            {tiers.map((t, i) => (
              <button key={i} onClick={() => pickTier(i)}
                style={{ padding: "12px 10px", borderRadius: 12, border: `2px solid ${selectedTier === i ? COLORS.secondary : COLORS.border}`, background: selectedTier === i ? "#F0FDF4" : "#fff", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.secondary }}>${t.amount.toLocaleString()}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, marginTop: 2 }}>{t.label}</div>
                <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom amount */}
      <Input label="Donation Amount (USD) *" type="number" value={amount}
        onChange={e => { setAmount(e.target.value); setSelectedTier(-1); }}
        placeholder={remaining > 0 ? `Remaining needed: $${remaining}` : "Enter amount"} />

      {/* Payment method */}
      <Select label="Payment Method *" value={method} onChange={e => setMethod(e.target.value)}>
        {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </Select>

      {/* Optional message */}
      <Textarea label="Message to the family (optional — shown anonymously)" value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="e.g. You are in our prayers, stay strong…" />

      {/* Anonymous toggle */}
      <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, cursor: "pointer", userSelect: "none" }}>
        <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)}
          style={{ width: 18, height: 18, cursor: "pointer" }} />
        <span style={{ fontSize: 13 }}>Keep my donation anonymous (name hidden from public)</span>
      </label>

      {/* Process note */}
      <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: COLORS.primary }}>
        <strong>How it works:</strong><br />
        1. Submit your pledge here → 2. Admin contacts you to confirm payment → 3. Field team delivers aid → 4. Proof of delivery shared with you
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", color: COLORS.danger, borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="muted" onClick={onClose} style={{ flex: 1 }} disabled={loading}>Cancel</Btn>
        <Btn variant="accent" onClick={handleConfirm} disabled={loading || !amount} style={{ flex: 2 }}>
          {loading ? "Processing…" : `❤️ Confirm $${parseFloat(amount || 0).toLocaleString()} Donation`}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── ADD USER MODAL ─────────────────────────────────────────────────────────
const AddUserModal = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({ fullname: "", email: "", phone: "", role: "observer" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = () => {
    if (!form.fullname || !form.email) return alert("Name and email required");
    onAdd({ ...form, id: "U" + String(Math.floor(Math.random() * 9000) + 100), verification_status: "active" });
    onClose();
  };
  return (
    <Modal title="➕ Add New User" onClose={onClose}>
      <Input label="Full Name *" value={form.fullname} onChange={e => set("fullname", e.target.value)} />
      <Input label="Email *" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
      <Input label="Phone" value={form.phone} onChange={e => set("phone", e.target.value)} />
      <Select label="Role" value={form.role} onChange={e => set("role", e.target.value)}>
        <option value="observer">Observer / Reporter</option>
        <option value="verification_office">Verification Office</option>
        <option value="field_team">Field Team</option>
        <option value="donor">Donor / Sponsor</option>
        <option value="super_admin">Super Admin</option>
      </Select>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="primary" onClick={handleSubmit} style={{ flex: 1 }}>Add User</Btn>
        <Btn variant="muted" onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
};

// ─── EXPORT MODAL ────────────────────────────────────────────────────────────
const ExportModal = ({ cases, onClose }) => {
  const exportCSV = () => {
    const headers = ["Case ID","Victim Name","Age","Gender","Location","Urgency","Status","Created","Donation"];
    const rows = cases.map(c => [c.id,c.victim_name,c.age,c.gender,c.location,c.urgency_level,c.status,c.created_at,c.donation_amount]);
    const csv = [headers,...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `kafaale_cases_${Date.now()}.csv` });
    a.click();
  };
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(cases, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `kafaale_cases_${Date.now()}.json` });
    a.click();
  };
  return (
    <Modal title="📥 Export Data" onClose={onClose}>
      <p style={{ margin: "0 0 20px", color: COLORS.muted, fontSize: 14 }}>Export {cases.length} cases in your preferred format:</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 14, padding: 24, textAlign: "center", cursor: "pointer" }} onClick={exportCSV}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
          <div style={{ fontWeight: 700, color: COLORS.primary }}>CSV Export</div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>For Excel / Spreadsheets</div>
        </div>
        <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 14, padding: 24, textAlign: "center", cursor: "pointer" }} onClick={exportJSON}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
          <div style={{ fontWeight: 700, color: COLORS.secondary }}>JSON Export</div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>For System Integration</div>
        </div>
      </div>
      <Btn variant="muted" onClick={onClose} style={{ width: "100%" }}>Close</Btn>
    </Modal>
  );
};

// ─── NOTIFICATIONS PANEL ────────────────────────────────────────────────────
const NotificationsDropdown = ({ notifs, onClose, onMarkAll, onOpenCase }) => {
  const unread = notifs.filter(n => !(n.read || n.isRead)).length;
  const TYPE_ICON = {
    case_submitted:         "📝",
    case_assigned:          "🗂️",
    investigation_completed:"📋",
    case_published:         "✅",
    case_rejected:          "❌",
    new_donation:           "❤️",
  };
  return (
    <div className="kf-notif-dropdown" style={{ position: "absolute", top: 56, right: 0, background: "#fff", borderRadius: 16, width: 340, maxHeight: 480, overflowY: "auto", boxShadow: "0 16px 48px #0003", zIndex: 500, border: `1px solid ${COLORS.border}` }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff" }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>🔔 Notifications</div>
        {unread > 0 && <span style={{ background: "#EF4444", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{unread}</span>}
      </div>
      {notifs.length === 0 && (
        <div style={{ padding: 32, textAlign: "center", color: COLORS.muted }}>
          <div style={{ fontSize: 32 }}>🔕</div>
          <div style={{ marginTop: 8, fontSize: 13 }}>No notifications yet</div>
        </div>
      )}
      {notifs.map((n, i) => (
        <div key={n.id} onClick={() => n.caseId && onOpenCase && onOpenCase(n.caseId)}
          style={{ padding: "12px 20px", borderBottom: i < notifs.length - 1 ? `1px solid ${COLORS.border}` : "none", display: "flex", gap: 12, background: (n.read || n.isRead) ? "#fff" : "#EFF6FF", cursor: n.caseId ? "pointer" : "default" }}>
          <div style={{ fontSize: 20, flexShrink: 0 }}>{TYPE_ICON[n.type] || "🔔"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: (n.read || n.isRead) ? 500 : 700, color: COLORS.text }}>{n.title || n.msg}</div>
            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.message || n.time}</div>
            {n.createdAt && <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 1 }}>{new Date(n.createdAt).toLocaleString()}</div>}
          </div>
          {!(n.read || n.isRead) && <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.primary, flexShrink: 0, marginTop: 5 }} />}
        </div>
      ))}
      {notifs.length > 0 && (
        <div style={{ padding: "12px 20px", textAlign: "center", borderTop: `1px solid ${COLORS.border}` }}>
          <button onClick={onMarkAll} style={{ background: "none", border: "none", color: COLORS.primary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Mark all as read ✓</button>
        </div>
      )}
    </div>
  );
};

// ─── ASSIGN AGENT MODAL ────────────────────────────────────────────────────
const AssignAgentModal = ({ caseItem, agents, onClose, onDone, showToast }) => {
  const [selectedAgent, setSelectedAgent] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!selectedAgent) return;
    setLoading(true);
    try {
      await adminApi.assign(caseItem.id, selectedAgent);
      showToast(`🗺️ Agent assigned to ${caseItem.id} ✓`);
      onDone(caseItem.id, "Under Review");
      onClose();
    } catch (e) { showToast(e.message || "Failed to assign", "error"); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={`🗺️ Assign Field Agent — ${caseItem.id}`} onClose={onClose}>
      <div style={{ marginBottom: 16, background: "#FFF7ED", borderRadius: 12, padding: "14px 18px", border: "1px solid #FED7AA" }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{caseItem.victim_name}</div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>📍 {caseItem.location} · {caseItem.urgency_level} Priority · {caseItem.category || caseItem.status}</div>
        <div style={{ fontSize: 12, color: COLORS.text, marginTop: 8, lineHeight: 1.5 }}>{caseItem.description?.slice(0, 150)}…</div>
      </div>

      <Select label="Select Field Agent *" value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
        <option value="">— Choose an agent —</option>
        {agents.map(a => (
          <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
        ))}
      </Select>

      {agents.length === 0 && (
        <div style={{ background: "#FEF2F2", color: COLORS.danger, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
          ⚠️ No field agents found. Register a field_agent account first.
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="primary" onClick={handle} disabled={!selectedAgent || loading} style={{ flex: 2 }}>
          {loading ? "Assigning…" : "🗺️ Assign Agent & Notify"}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── ASSIGN DELIVERY MODAL ─────────────────────────────────────────────────
const AssignDeliveryModal = ({ caseItem, agents, onClose, onDone, showToast }) => {
  const [selectedAgent, setSelectedAgent] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!selectedAgent) return;
    setLoading(true);
    try {
      await adminApi.assignDelivery(caseItem.id, selectedAgent);
      showToast(`🚚 Delivery agent assigned to ${caseItem.id} — they've been notified!`);
      onDone();
      onClose();
    } catch (e) { showToast(e.message || "Failed to assign", "error"); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={`🚚 Assign Delivery Agent — ${caseItem.id || caseItem._caseId}`} onClose={onClose}>
      <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "14px 18px", marginBottom: 16, border: "1px solid #BBF7D0" }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#166534" }}>💰 Donation Confirmed — Ready for Delivery</div>
        <div style={{ fontSize: 13, color: COLORS.text, marginTop: 6 }}>{caseItem.victim_name || caseItem._caseTitle}</div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>📍 {caseItem.location || caseItem._caseCity}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.secondary, marginTop: 6 }}>
          Amount to deliver: ${(caseItem.donation_amount || caseItem._amount || 0).toLocaleString()}
        </div>
      </div>
      <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 16, lineHeight: 1.6 }}>
        Pick a field agent to carry out the aid delivery. They will be notified immediately and must submit a delivery proof document when done.
      </p>
      <Select label="Select Delivery Agent *" value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
        <option value="">— Choose an agent —</option>
        {agents.map(a => (
          <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
        ))}
      </Select>
      {agents.length === 0 && (
        <div style={{ background: "#FEF2F2", color: COLORS.danger, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
          ⚠️ No field agents available. Please register a field_agent account first.
        </div>
      )}
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="teal" onClick={handle} disabled={!selectedAgent || loading} style={{ flex: 2 }}>
          {loading ? "Assigning…" : "🚚 Start Delivery & Notify Agent"}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── REJECT CASE MODAL ──────────────────────────────────────────────────────
const RejectCaseModal = ({ caseItem, onClose, onDone, showToast }) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await adminApi.updateStatus(caseItem.id, "rejected", "Rejected by admin", reason);
      showToast(`❌ Case ${caseItem.id} rejected`);
      onDone(caseItem.id, "Archived");
      onClose();
    } catch (e) { showToast(e.message || "Failed", "error"); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={`❌ Reject Case — ${caseItem.id}`} onClose={onClose}>
      <div style={{ marginBottom: 16, background: "#FEF2F2", borderRadius: 12, padding: "14px 18px", border: "1px solid #FECACA" }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{caseItem.victim_name}</div>
        <div style={{ fontSize: 12, color: COLORS.muted }}>{caseItem.location} · {caseItem.status}</div>
      </div>
      <Textarea label="Rejection Reason * (will be sent to reporter)" value={reason}
        onChange={e => setReason(e.target.value)} placeholder="Explain why this case is being rejected…" style={{ minHeight: 100 }} />
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="danger" onClick={handle} disabled={!reason.trim() || loading} style={{ flex: 2 }}>
          {loading ? "Rejecting…" : "❌ Confirm Rejection"}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── PUBLISH CASE MODAL ─────────────────────────────────────────────────────
const PublishCaseModal = ({ caseItem, onClose, onDone, showToast }) => {
  const raw = caseItem._raw || {};
  const ai  = raw.aiPublicData  || {};
  const [form, setForm] = useState({
    publicTitle: ai.generatedTitle || caseItem.victim_name || "",
    publicStory: ai.generatedStory || caseItem.description || "",
    publicCity:  ai.generatedCity  || caseItem.location    || "",
    targetGoal:  raw.targetGoal    || "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = async () => {
    if (!form.publicTitle || !form.publicStory || !form.targetGoal) return;
    setLoading(true);
    try {
      await adminApi.publish(caseItem.id, { ...form, targetGoal: parseFloat(form.targetGoal) });
      showToast(`✅ Case ${caseItem.id} published to donor portal!`);
      onDone(caseItem.id, "Waiting Sponsor");
      onClose();
    } catch (e) { showToast(e.message || "Failed to publish", "error"); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={`📢 Publish to Donor Portal — ${caseItem.id}`} onClose={onClose} wide>
      <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "12px 16px", marginBottom: 20, border: "1px solid #BBF7D0", fontSize: 13, color: "#065F46" }}>
        ✅ Victim's private data (name, phone, GPS) will <strong>never</strong> be shown publicly. Only the public story below will appear to donors.
      </div>

      {ai.generatedTitle && (
        <div style={{ background: "#EDE9FE", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#6B21A8" }}>
          🤖 AI-generated content loaded. Review and edit before publishing.
        </div>
      )}

      <Input label="Public Case Title *" value={form.publicTitle} onChange={e => set("publicTitle", e.target.value)}
        placeholder="e.g. Emergency medical support for displaced family" />
      <Textarea label="Public Story *" value={form.publicStory} onChange={e => set("publicStory", e.target.value)}
        placeholder="Describe the situation without revealing private identity details…" style={{ minHeight: 120 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <Input label="Public City / Region *" value={form.publicCity} onChange={e => set("publicCity", e.target.value)}
          placeholder="e.g. Mogadishu, Hodan" />
        <Input label="Funding Goal (USD) *" type="number" value={form.targetGoal} onChange={e => set("targetGoal", e.target.value)}
          placeholder="e.g. 1500" />
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="success" onClick={handle} disabled={!form.publicTitle || !form.publicStory || !form.targetGoal || loading} style={{ flex: 2 }}>
          {loading ? "Publishing…" : "📢 Publish to Donors"}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── INVESTIGATION MODAL (Field Agent) ─────────────────────────────────────
const InvestigationModal = ({ caseItem, onClose, onDone, showToast }) => {
  const [form, setForm] = useState({
    victimVerified: false,
    situationAccurate: false,
    situationNotes: "",
    estimatedAmountNeeded: "",
    urgencyConfirmed: (caseItem.urgency_level || "medium").toLowerCase(),
    deliveryFeasible: true,
    deliveryMethod: "direct_cash",
    deliveryNotes: "",
    fraudRiskScore: 0,
    fraudRiskLevel: "low",
    fraudRiskNotes: "",
    verificationStatus: "verified",
    officialNotes: "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = async () => {
    if (!form.estimatedAmountNeeded || !form.officialNotes) return;
    setLoading(true);
    try {
      await fieldApi.investigate({
        ...form,
        caseId: caseItem.id,
        estimatedAmountNeeded: parseFloat(form.estimatedAmountNeeded),
        fraudRiskScore: parseInt(form.fraudRiskScore),
      });
      showToast(`📋 Investigation report submitted for ${caseItem.id} ✓`);
      onDone(caseItem.id, "Awaiting Approval");
      onClose();
    } catch (e) { showToast(e.message || "Failed to submit", "error"); }
    finally { setLoading(false); }
  };

  const Chk = ({ label, k }) => (
    <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, cursor: "pointer", userSelect: "none" }}>
      <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)}
        style={{ width: 18, height: 18, cursor: "pointer" }} />
      <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
    </label>
  );

  return (
    <Modal title={`📋 Submit Investigation Report — ${caseItem.id}`} onClose={onClose} wide>
      {/* Case summary */}
      <div style={{ background: "#EFF6FF", borderRadius: 12, padding: "14px 18px", marginBottom: 20, border: "1px solid #BFDBFE" }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{caseItem.victim_name} · {caseItem.location}</div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{caseItem.description?.slice(0, 200)}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
        {/* Left column */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.primary, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Verification Checks</div>
          <Chk label="✅ Victim identity verified on-site" k="victimVerified" />
          <Chk label="✅ Situation description is accurate" k="situationAccurate" />
          <Chk label="✅ Aid delivery is feasible" k="deliveryFeasible" />

          <Select label="Overall Verification Status *" value={form.verificationStatus} onChange={e => set("verificationStatus", e.target.value)}>
            <option value="verified">✅ Verified — Case is legitimate</option>
            <option value="needs_review">⚠️ Needs Further Review</option>
            <option value="rejected">❌ Rejected — Case is invalid</option>
          </Select>

          <Select label="Confirmed Urgency Level" value={form.urgencyConfirmed} onChange={e => set("urgencyConfirmed", e.target.value)}>
            <option value="critical">🚨 Critical — Immediate action</option>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </Select>

          <Input label="Estimated Amount Needed (USD) *" type="number" value={form.estimatedAmountNeeded}
            onChange={e => set("estimatedAmountNeeded", e.target.value)} placeholder="e.g. 1200" />
        </div>

        {/* Right column */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.primary, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Delivery & Risk</div>

          <Select label="Delivery Method" value={form.deliveryMethod} onChange={e => set("deliveryMethod", e.target.value)}>
            <option value="direct_cash">💵 Direct Cash</option>
            <option value="bank_transfer">🏦 Bank Transfer</option>
            <option value="mobile_money">📱 Mobile Money (EVC/Zaad)</option>
            <option value="goods_in_kind">📦 Goods in Kind</option>
            <option value="medical_services">🏥 Medical Services</option>
          </Select>

          <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.primary, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 }}>Fraud Risk Assessment</div>
          <Select label="Risk Level" value={form.fraudRiskLevel} onChange={e => set("fraudRiskLevel", e.target.value)}>
            <option value="low">🟢 Low Risk</option>
            <option value="medium">🟡 Medium Risk</option>
            <option value="high">🔴 High Risk — Requires review</option>
          </Select>
          <Input label="Risk Score (0–100)" type="number" min="0" max="100" value={form.fraudRiskScore}
            onChange={e => set("fraudRiskScore", e.target.value)} placeholder="0" />
          <Textarea label="Risk Notes" value={form.fraudRiskNotes}
            onChange={e => set("fraudRiskNotes", e.target.value)} placeholder="Any red flags or concerns…" />
        </div>
      </div>

      {/* Full-width fields */}
      <Textarea label="Field Situation Notes" value={form.situationNotes}
        onChange={e => set("situationNotes", e.target.value)} placeholder="Describe what you observed on the ground…" style={{ minHeight: 80 }} />
      <Textarea label="Official Investigation Report *" value={form.officialNotes}
        onChange={e => set("officialNotes", e.target.value)} placeholder="Write your full official report here. Include all key findings…" style={{ minHeight: 120 }} />

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="success" onClick={handle} disabled={!form.estimatedAmountNeeded || !form.officialNotes || loading} style={{ flex: 2 }}>
          {loading ? "Submitting…" : "📤 Submit Investigation Report"}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── VIEW FIELD REPORT MODAL ────────────────────────────────────────────────
const FieldReportModal = ({ caseItem, onClose }) => {
  const fi = caseItem._raw?.fieldInvestigation || caseItem.fieldInvestigation;
  if (!fi) return (
    <Modal title={`📋 Field Report — ${caseItem.id}`} onClose={onClose}>
      <div style={{ textAlign: "center", padding: 40, color: COLORS.muted }}>
        <div style={{ fontSize: 40 }}>📋</div>
        <p>No field investigation report yet.</p>
      </div>
    </Modal>
  );
  const riskColor = { low: COLORS.secondary, medium: "#F59E0B", high: COLORS.danger };
  return (
    <Modal title={`📋 Field Investigation Report — ${caseItem.id}`} onClose={onClose} wide>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Victim Verified",    val: fi.victimVerified     ? "✅ Yes" : "❌ No",  bg: fi.victimVerified     ? "#D1FAE5" : "#FEE2E2" },
          { label: "Situation Accurate", val: fi.situationAccurate  ? "✅ Yes" : "❌ No",  bg: fi.situationAccurate  ? "#D1FAE5" : "#FEE2E2" },
          { label: "Delivery Feasible",  val: fi.deliveryFeasible   ? "✅ Yes" : "❌ No",  bg: fi.deliveryFeasible   ? "#D1FAE5" : "#FEE2E2" },
          { label: "Status",             val: fi.verificationStatus, bg: fi.verificationStatus === "verified" ? "#D1FAE5" : "#FEE2E2" },
          { label: "Urgency",            val: fi.urgencyConfirmed,   bg: "#DBEAFE" },
          { label: "Est. Amount",        val: fi.estimatedAmountNeeded ? `$${fi.estimatedAmountNeeded}` : "—", bg: "#EDE9FE" },
          { label: "Fraud Risk",         val: `${fi.fraudRiskLevel || "low"} (${fi.fraudRiskScore || 0}/100)`, bg: (riskColor[fi.fraudRiskLevel] || "#eee") + "30" },
          { label: "Delivery Method",    val: fi.deliveryMethod || "—", bg: "#FEF3C7" },
        ].map((item, i) => (
          <div key={i} style={{ background: item.bg, borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, textTransform: "uppercase" }}>{item.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{item.val}</div>
          </div>
        ))}
      </div>
      {fi.situationNotes && (
        <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 6 }}>FIELD NOTES</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{fi.situationNotes}</p>
        </div>
      )}
      {fi.officialNotes && (
        <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "14px 16px", marginBottom: 14, border: "1px solid #BFDBFE" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>📄 OFFICIAL REPORT</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{fi.officialNotes}</p>
        </div>
      )}
      {fi.fraudRiskNotes && (
        <div style={{ background: "#FEF2F2", borderRadius: 10, padding: "14px 16px", border: "1px solid #FECACA" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.danger, marginBottom: 6 }}>⚠️ RISK NOTES</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{fi.fraudRiskNotes}</p>
        </div>
      )}
      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Close</Btn>
      </div>
    </Modal>
  );
};

// ─── DELIVERY PROOF MODAL (Field Agent) ───────────────────────────────────
const DeliveryProofModal = ({ caseItem, onClose, onDone, showToast }) => {
  const [form, setForm] = useState({
    deliveryMethod:  "cash",
    amountDelivered: caseItem.donation_amount || caseItem.target_goal || "",
    recipientName:   caseItem.victim_name || "",
    deliveryNotes:   "",
    extraProof:      "",   // optional extra observations / proof description
    deliveryDate:    new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const canSubmit = form.deliveryNotes.trim().length >= 10 && form.amountDelivered > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const combinedNotes = form.extraProof
        ? `${form.deliveryNotes}\n\n--- Additional Proof ---\n${form.extraProof}`
        : form.deliveryNotes;
      await fieldApi.delivery({
        caseId:          caseItem.id,
        deliveryMethod:  form.deliveryMethod,
        amountDelivered: parseFloat(form.amountDelivered),
        recipientName:   form.recipientName || undefined,
        deliveryNotes:   combinedNotes,
        deliveryDate:    new Date(form.deliveryDate).toISOString(),
      });
      showToast("✅ Delivery proof submitted! Admin will verify and close the case.", "success");
      onDone();
      onClose();
    } catch (e) {
      showToast("Failed: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const METHOD_OPTIONS = [
    { val: "cash",              label: "💵 Cash handover" },
    { val: "food_package",      label: "🍱 Food package" },
    { val: "medical_supplies",  label: "💊 Medical supplies" },
    { val: "clothing",          label: "👗 Clothing / blankets" },
    { val: "goods",             label: "📦 General goods" },
    { val: "mixed",             label: "🎁 Mixed (cash + items)" },
  ];

  return (
    <Modal title={`📦 Submit Delivery Proof — ${caseItem.id}`} onClose={onClose}>
      {/* Case summary */}
      <div style={{ background: "#F0F9FF", borderRadius: 10, padding: "12px 16px", marginBottom: 20, border: "1px solid #BAE6FD" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary }}>
          {caseItem.victim_name} · 📍 {caseItem.location}
        </div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>
          Donation confirmed: <strong>${(caseItem.donation_amount || 0).toLocaleString()}</strong> of goal <strong>${(caseItem.target_goal || 0).toLocaleString()}</strong>
        </div>
      </div>

      {/* Delivery date */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, display: "block", marginBottom: 6 }}>📅 DELIVERY DATE</label>
        <input type="date" value={form.deliveryDate} onChange={e => set("deliveryDate", e.target.value)}
          max={new Date().toISOString().slice(0,10)}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
      </div>

      {/* Delivery method */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, display: "block", marginBottom: 6 }}>📦 WHAT WAS DELIVERED</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          {METHOD_OPTIONS.map(opt => (
            <button key={opt.val} onClick={() => set("deliveryMethod", opt.val)}
              style={{ padding: "10px 12px", borderRadius: 10, border: `2px solid ${form.deliveryMethod === opt.val ? COLORS.secondary : COLORS.border}`, background: form.deliveryMethod === opt.val ? COLORS.secondary + "10" : "#fff", cursor: "pointer", fontSize: 13, fontWeight: form.deliveryMethod === opt.val ? 700 : 500, textAlign: "left", color: form.deliveryMethod === opt.val ? COLORS.secondary : COLORS.text }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount delivered */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, display: "block", marginBottom: 6 }}>💵 AMOUNT / VALUE DELIVERED ($)</label>
        <input type="number" min="0" step="0.01" value={form.amountDelivered} onChange={e => set("amountDelivered", e.target.value)}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
      </div>

      {/* Recipient name */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, display: "block", marginBottom: 6 }}>👤 RECIPIENT NAME (who signed / received)</label>
        <input type="text" placeholder="e.g. Amina Hassan or family member name" value={form.recipientName} onChange={e => set("recipientName", e.target.value)}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
      </div>

      {/* Delivery notes */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, display: "block", marginBottom: 6 }}>📝 DELIVERY NOTES <span style={{ color: COLORS.danger }}>*</span></label>
        <textarea rows={4} placeholder="Describe the delivery: what happened, how the family reacted, any challenges, family's current condition after receiving aid…"
          value={form.deliveryNotes} onChange={e => set("deliveryNotes", e.target.value)}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${form.deliveryNotes.length < 10 && form.deliveryNotes.length > 0 ? COLORS.danger : COLORS.border}`, fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
        {form.deliveryNotes.length < 10 && form.deliveryNotes.length > 0 && (
          <div style={{ fontSize: 11, color: COLORS.danger, marginTop: 4 }}>⚠️ Please write at least 10 characters</div>
        )}
      </div>

      {/* Extra proof (optional) */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, display: "block", marginBottom: 6 }}>
          📎 EXTRA PROOF / OBSERVATIONS <span style={{ color: COLORS.secondary, fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea rows={3} placeholder="Any extra observations, GPS location description, witness names, family feedback, physical condition after receiving aid…"
          value={form.extraProof} onChange={e => set("extraProof", e.target.value)}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", color: COLORS.muted }} />
        <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>This will be appended to your delivery report and shown to the donor.</div>
      </div>

      {/* Info banner */}
      <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "#166534" }}>
        ℹ️ After submission, the case moves to <strong>"Proof Submitted"</strong>. Admin reviews → marks complete → donor and reporter notified automatically.
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="teal" onClick={handleSubmit} disabled={!canSubmit || loading}>
          {loading ? "Submitting…" : "📤 Submit Delivery Proof"}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── COMPLETE CASE MODAL (Admin — after delivery proof) ───────────────────
const CompleteCaseModal = ({ caseItem, onClose, onDone, showToast }) => {
  const [adminNotes,   setAdminNotes]  = useState("");
  const [completing,   setCompleting]  = useState(false);
  const [fullCase,     setFullCase]    = useState(null);
  const [fetching,     setFetching]    = useState(true);

  // Always fetch the full case on open — list endpoint may not include deliveryProof
  useEffect(() => {
    adminApi.getCase(caseItem.id)
      .then(data => setFullCase(data))
      .catch(() => setFullCase(caseItem._raw || null))
      .finally(() => setFetching(false));
  }, [caseItem.id]);

  const proof = fullCase?.deliveryProof;

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await adminApi.completeCase(caseItem.id, adminNotes);
      showToast("🏁 Case completed! Donor and reporter have been notified.", "success");
      onDone();
      onClose();
    } catch (e) {
      showToast("Failed: " + e.message, "error");
    } finally {
      setCompleting(false);
    }
  };

  const ProofRow = ({ label, val, wide }) => (
    <div style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", ...(wide ? { gridColumn: "1 / -1" } : {}) }}>
      <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, lineHeight: 1.5 }}>{val || "—"}</div>
    </div>
  );

  return (
    <Modal title={`🏁 Review & Complete — ${caseItem.id}`} onClose={onClose} wide>

      {/* Case header */}
      <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{caseItem.victim_name}</div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 3 }}>📍 {caseItem.location} · {caseItem.urgency_level} Priority</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.secondary }}>${(caseItem.donation_amount || 0).toLocaleString()}</div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>donated</div>
        </div>
      </div>

      {/* Delivery proof block */}
      {fetching ? (
        <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "28px 16px", marginBottom: 20, textAlign: "center", color: COLORS.muted }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
          Loading delivery proof…
        </div>
      ) : proof ? (
        <div style={{ background: "#F0FDF4", borderRadius: 14, padding: 18, marginBottom: 20, border: "1px solid #BBF7D0" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#166534", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            📦 Delivery Proof
            <span style={{ fontSize: 11, background: "#D1FAE5", color: "#065F46", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>Submitted by Field Agent</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginBottom: 10 }}>
            <ProofRow label="Delivery Date"    val={proof.deliveryDate ? new Date(proof.deliveryDate).toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" }) : null} />
            <ProofRow label="Method"           val={(proof.deliveryMethod || "").replace(/_/g," ")} />
            <ProofRow label="Amount Delivered" val={`$${(proof.amountDelivered || 0).toLocaleString()}`} />
            <ProofRow label="Recipient"        val={proof.recipientName || "Confirmed on-site"} />
          </div>

          {proof.deliveryNotes && (() => {
            // Split notes from extra proof if "--- Additional Proof ---" separator exists
            const parts = proof.deliveryNotes.split("\n\n--- Additional Proof ---\n");
            return (
              <>
                <div style={{ background: "#fff", borderRadius: 8, padding: "12px 14px", marginBottom: parts[1] ? 8 : 0 }}>
                  <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700, marginBottom: 6 }}>FIELD AGENT DELIVERY NOTES</div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: COLORS.text, whiteSpace: "pre-wrap" }}>{parts[0]}</p>
                </div>
                {parts[1] && (
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "12px 14px", border: "1px solid #BFDBFE" }}>
                    <div style={{ fontSize: 10, color: COLORS.primary, fontWeight: 700, marginBottom: 6 }}>📎 ADDITIONAL PROOF / OBSERVATIONS</div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: COLORS.text, whiteSpace: "pre-wrap" }}>{parts[1]}</p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      ) : (
        <div style={{ background: "#FEF3C7", borderRadius: 12, padding: "18px 20px", marginBottom: 20, border: "1px solid #FDE68A" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#92400E", marginBottom: 6 }}>⚠️ No Delivery Proof Yet</div>
          <div style={{ fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
            The field agent has not submitted a delivery proof document yet.<br />
            You can still mark the case complete if you have confirmed delivery through other means — use the notes below to document it.
          </div>
        </div>
      )}

      {/* Admin closing notes */}
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, display: "block", marginBottom: 6 }}>
          📝 YOUR CONFIRMATION NOTES {!proof && <span style={{ color: COLORS.danger }}>*</span>}
        </label>
        <textarea rows={4}
          placeholder={proof
            ? "Optional: confirm delivery, add feedback, note any follow-up needed…"
            : "Required when no proof submitted: describe how you confirmed delivery (phone call, field visit, witness, etc.)"}
          value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${!proof && !adminNotes.trim() ? "#FCA5A5" : COLORS.border}`, fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
        {!proof && !adminNotes.trim() && (
          <div style={{ fontSize: 11, color: COLORS.danger, marginTop: 4 }}>⚠️ Please describe how you confirmed delivery before completing</div>
        )}
      </div>

      <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: COLORS.primary }}>
        ℹ️ Marking complete notifies the <strong>reporter</strong> and all <strong>donors</strong> automatically. This action cannot be undone.
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="success" onClick={handleComplete}
          disabled={completing || fetching || (!proof && !adminNotes.trim())}>
          {completing ? "Completing…" : "🏁 Mark Case Complete"}
        </Btn>
      </div>
    </Modal>
  );
};

// ─── FULL CASE REPORT MODAL (super_admin only) ────────────────────────────
const CaseFullReportModal = ({ caseId, onClose }) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    adminApi.getCase(caseId)
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [caseId]);

  const fmt = (iso) => iso ? new Date(iso).toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "—";
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" }) : "—";
  const money = (n) => n != null ? `$${Number(n).toLocaleString()}` : "—";

  const Section = ({ title, color = COLORS.primary, children }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ background: color, color: "#fff", borderRadius: "10px 10px 0 0", padding: "10px 18px", fontSize: 13, fontWeight: 800, letterSpacing: 0.5 }}>
        {title}
      </div>
      <div style={{ border: `1px solid ${color}30`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: 16 }}>
        {children}
      </div>
    </div>
  );

  const Row = ({ label, val, mono, danger, success }) => (
    <div style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 700, minWidth: 170, flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: danger ? COLORS.danger : success ? COLORS.secondary : COLORS.text, fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all" }}>
        {val ?? "—"}
      </div>
    </div>
  );

  const handlePrint = () => {
    const el = document.getElementById("kf-full-report");
    if (!el) return;
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>Kafaale Case Report — ${caseId}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; color: #1a202c; padding: 32px; max-width: 900px; margin: 0 auto; }
        h1 { font-size: 22px; color: #004B96; margin-bottom: 4px; }
        .sub { font-size: 13px; color: #5A6E8A; margin-bottom: 28px; }
        .section-title { background: #004B96; color: #fff; padding: 8px 16px; font-size: 12px; font-weight: 800; border-radius: 6px 6px 0 0; letter-spacing: 0.5px; margin-top: 20px; }
        .section-body { border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 6px 6px; padding: 12px 16px; }
        .row { display: flex; gap: 12px; padding: 5px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
        .label { color: #5A6E8A; font-weight: 700; min-width: 170px; }
        .val { color: #1a202c; font-weight: 500; }
        .green { color: #065F46; } .red { color: #C0392B; } .blue { color: #004B96; }
        .notes { background: #f8fafc; border-radius: 6px; padding: 10px 14px; font-size: 13px; line-height: 1.7; white-space: pre-wrap; margin-top: 6px; }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #f8fafc; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #5A6E8A; border-bottom: 1px solid #e2e8f0; }
        td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9CA3AF; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${el.innerHTML}
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  if (loading) return (
    <Modal title="📄 Full Case Report" onClose={onClose} wide>
      <div style={{ padding: "60px 0", textAlign: "center", color: COLORS.muted }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        Loading full case data…
      </div>
    </Modal>
  );

  if (error || !data) return (
    <Modal title="📄 Full Case Report" onClose={onClose} wide>
      <div style={{ padding: "40px 0", textAlign: "center", color: COLORS.danger }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>❌</div>
        Failed to load case: {error}
      </div>
    </Modal>
  );

  const fi    = data.fieldInvestigation;
  const ai    = data.aiPublicData;
  const dp    = data.deliveryProof;
  const dons  = data.donations || [];
  const audit = data.auditLogs  || [];
  const confirmedDons = dons.filter(d => d.status === "confirmed");
  const totalRaised   = confirmedDons.reduce((a, d) => a + (d.amount || 0), 0);

  // Split delivery notes from extra proof
  const proofParts = dp?.deliveryNotes?.split("\n\n--- Additional Proof ---\n") || [];

  // Build timeline from audit + key dates
  const timeline = [
    data.createdAt            && { time: data.createdAt,              event: "📝 Case submitted by reporter" },
    data.teamAssignedAt       && { time: data.teamAssignedAt,         event: "🗺️ Field team assigned" },
    data.investigationCompletedAt && { time: data.investigationCompletedAt, event: "🔍 Field investigation completed" },
    data.adminPublishedAt     && { time: data.adminPublishedAt,       event: "✅ Case approved & published for sponsorship" },
    dons[0]?.createdAt        && { time: dons[0].createdAt,           event: `❤️ First donation received (${money(dons[0].amount)})` },
    dp?.deliveryDate          && { time: dp.deliveryDate,             event: "📦 Aid delivered by field agent" },
    data.completedAt          && { time: data.completedAt,            event: "🏁 Case completed & closed by admin" },
  ].filter(Boolean).sort((a, b) => new Date(a.time) - new Date(b.time));

  return (
    <Modal title={`📄 Full Case Report — ${data.id}`} onClose={onClose} wide>
      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ background: "#D1FAE5", color: "#065F46", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700 }}>🏁 {data.status?.replace(/_/g," ").toUpperCase()}</span>
          <span style={{ background: COLORS.primary + "15", color: COLORS.primary, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700 }}>🔐 SUPER ADMIN ONLY</span>
        </div>
        <Btn variant="primary" onClick={handlePrint}>🖨️ Print / Export PDF</Btn>
      </div>

      <div id="kf-full-report">
        {/* Print header (visible on print) */}
        <div style={{ marginBottom: 24, borderBottom: `3px solid ${COLORS.primary}`, paddingBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.primary }}>🤝 KAFAALE QAAD — Humanitarian Case Report</div>
              <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>Case ID: <strong>{data.id}</strong> · Generated: {fmt(new Date().toISOString())} · CONFIDENTIAL — Super Admin Only</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.secondary }}>{money(totalRaised)}</div>
              <div style={{ fontSize: 11, color: COLORS.muted }}>total raised</div>
            </div>
          </div>
        </div>

        {/* ── 1. Case Overview ── */}
        <Section title="1. CASE OVERVIEW" color={COLORS.primary}>
          <Row label="Case ID"           val={data.id} mono />
          <Row label="Status"            val={data.status?.replace(/_/g," ").toUpperCase()} />
          <Row label="Category"          val={data.category || "—"} />
          <Row label="Emergency Level"   val={data.emergencyLevel?.toUpperCase()} danger={data.emergencyLevel === "critical"} />
          <Row label="Date Submitted"    val={fmt(data.createdAt)} />
          <Row label="Date Completed"    val={fmt(data.completedAt)} success={!!data.completedAt} />
          <Row label="Public Title"      val={data.publicTitle || "Not published"} />
          <Row label="Public City"       val={data.publicCity  || "—"} />
          <Row label="Target Goal"       val={money(data.targetGoal)} />
          <Row label="Total Raised"      val={money(data.totalRaised)} success />
        </Section>

        {/* ── 2. Victim (Private) ── */}
        <Section title="2. VICTIM — PRIVATE INFORMATION" color="#7C3AED">
          <Row label="Full Name"         val={data.privateVictimName || "—"} />
          <Row label="Age"               val={data.privateVictimAge  || "—"} />
          <Row label="Gender"            val={data.privateVictimGender || "—"} />
          <Row label="Private Address"   val={data.privateAddress    || "—"} />
          <Row label="Phone / Contact"   val={data.privatePhone      || "—"} />
          <Row label="Description"       val="" />
          {data.privateDescription && (
            <div style={{ background: "#F5F3FF", borderRadius: 8, padding: "12px 14px", marginTop: 6, fontSize: 13, lineHeight: 1.7, color: COLORS.text, whiteSpace: "pre-wrap" }}>
              {data.privateDescription}
            </div>
          )}
        </Section>

        {/* ── 3. Reporter ── */}
        <Section title="3. REPORTED BY" color="#0E7490">
          <Row label="Name"              val={data.reporter?.name  || "—"} />
          <Row label="Email"             val={data.reporter?.email || "—"} />
          <Row label="Phone"             val={data.reporter?.phone || "—"} />
          <Row label="Reporter ID"       val={data.reporter?.id    || "—"} mono />
        </Section>

        {/* ── 4. Field Investigation ── */}
        <Section title="4. FIELD INVESTIGATION REPORT" color="#D97706">
          {fi ? (
            <>
              <Row label="Assigned Agent"    val={data.assignedAgent?.name  || "—"} />
              <Row label="Agent Email"       val={data.assignedAgent?.email || "—"} />
              <Row label="Agent Phone"       val={data.assignedAgent?.phone || "—"} />
              <Row label="Completed At"      val={fmt(data.investigationCompletedAt)} />
              <Row label="Victim Verified"   val={fi.victimVerified    ? "✅ YES" : "❌ NO"} success={fi.victimVerified}    danger={!fi.victimVerified} />
              <Row label="Situation Accurate"val={fi.situationAccurate ? "✅ YES" : "❌ NO"} success={fi.situationAccurate} danger={!fi.situationAccurate} />
              <Row label="Delivery Feasible" val={fi.deliveryFeasible  ? "✅ YES" : "❌ NO"} success={fi.deliveryFeasible}  danger={!fi.deliveryFeasible} />
              <Row label="Verification"      val={fi.verificationStatus?.toUpperCase()} success={fi.verificationStatus === "verified"} danger={fi.verificationStatus === "rejected"} />
              <Row label="Urgency Confirmed" val={fi.urgencyConfirmed?.toUpperCase()} />
              <Row label="Est. Amount Needed"val={money(fi.estimatedAmountNeeded)} />
              <Row label="Delivery Method"   val={fi.deliveryMethod || "—"} />
              <Row label="Fraud Risk Level"  val={`${fi.fraudRiskLevel?.toUpperCase()} (${fi.fraudRiskScore}/100)`} danger={fi.fraudRiskLevel === "high"} />
              {fi.situationNotes && <>
                <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>FIELD NOTES</div>
                <div style={{ background: "#FEF3C7", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{fi.situationNotes}</div>
              </>}
              {fi.officialNotes && <>
                <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>OFFICIAL REPORT</div>
                <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", border: "1px solid #BFDBFE" }}>{fi.officialNotes}</div>
              </>}
              {fi.fraudRiskNotes && <>
                <div style={{ fontSize: 11, color: COLORS.danger, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>⚠️ FRAUD RISK NOTES</div>
                <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", border: "1px solid #FECACA" }}>{fi.fraudRiskNotes}</div>
              </>}
            </>
          ) : (
            <div style={{ color: COLORS.muted, fontSize: 13, padding: "8px 0" }}>No field investigation on record.</div>
          )}
        </Section>

        {/* ── 5. AI Sanitization ── */}
        {ai && (
          <Section title="5. AI SANITIZATION DATA" color="#6B21A8">
            <Row label="Generated Title"   val={ai.generatedTitle || "—"} />
            <Row label="Confidence Score"  val={ai.confidenceScore != null ? `${ai.confidenceScore}%` : "—"} />
            {ai.publicStory && <>
              <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>AI-GENERATED PUBLIC STORY</div>
              <div style={{ background: "#F5F3FF", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{ai.publicStory}</div>
            </>}
          </Section>
        )}

        {/* ── 6. Sponsorship & Donations ── */}
        <Section title="6. SPONSORSHIP & DONATIONS" color={COLORS.secondary}>
          <Row label="Published for Sponsors" val={fmt(data.adminPublishedAt)} />
          <Row label="Target Goal"         val={money(data.targetGoal)} />
          <Row label="Total Raised"        val={money(totalRaised)} success />
          <Row label="Number of Donors"    val={confirmedDons.length} />
          {dons.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, marginBottom: 8 }}>ALL DONATIONS</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    {["Donor","Amount","Method","Date","Status"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}`, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dons.map((d, i) => (
                    <tr key={d.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: "8px 10px" }}>{d.isAnonymous ? "Anonymous" : (d.donor?.name || "—")}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: COLORS.secondary }}>{money(d.amount)}</td>
                      <td style={{ padding: "8px 10px", color: COLORS.muted }}>{(d.method || "—").replace(/_/g," ")}</td>
                      <td style={{ padding: "8px 10px", color: COLORS.muted }}>{fmtDate(d.createdAt)}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ background: d.status === "confirmed" ? "#D1FAE5" : "#FEF3C7", color: d.status === "confirmed" ? "#065F46" : "#92400E", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* ── 7. Delivery Proof ── */}
        <Section title="7. DELIVERY PROOF" color="#0891B2">
          {dp ? (
            <>
              <Row label="Delivered By (Agent ID)" val={dp.deliveredBy} mono />
              <Row label="Delivery Date"       val={fmtDate(dp.deliveryDate)} success />
              <Row label="Delivery Method"     val={(dp.deliveryMethod || "—").replace(/_/g," ")} />
              <Row label="Amount Delivered"    val={money(dp.amountDelivered)} success />
              <Row label="Recipient Name"      val={dp.recipientName || "Confirmed on-site"} />
              <Row label="Admin Confirmed"     val={dp.adminConfirmed ? `✅ Yes — ${fmtDate(dp.adminConfirmedAt)}` : "Pending"} success={dp.adminConfirmed} />
              {proofParts[0] && <>
                <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>AGENT DELIVERY NOTES</div>
                <div style={{ background: "#ECFDF5", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", border: "1px solid #BBF7D0" }}>{proofParts[0]}</div>
              </>}
              {proofParts[1] && <>
                <div style={{ fontSize: 11, color: COLORS.primary, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>📎 ADDITIONAL PROOF / OBSERVATIONS</div>
                <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", border: "1px solid #BFDBFE" }}>{proofParts[1]}</div>
              </>}
              {dp.adminNotes && <>
                <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>ADMIN CLOSING NOTES</div>
                <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{dp.adminNotes}</div>
              </>}
            </>
          ) : (
            <div style={{ color: COLORS.muted, fontSize: 13, padding: "8px 0" }}>No delivery proof on record.</div>
          )}
        </Section>

        {/* ── 8. Case Timeline ── */}
        <Section title="8. CASE TIMELINE" color="#374151">
          <div style={{ position: "relative", paddingLeft: 24 }}>
            <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 2, background: COLORS.border }} />
            {timeline.map((t, i) => (
              <div key={i} style={{ position: "relative", marginBottom: 14 }}>
                <div style={{ position: "absolute", left: -24, top: 3, width: 12, height: 12, borderRadius: "50%", background: i === timeline.length - 1 ? COLORS.secondary : COLORS.primary, border: "2px solid #fff", boxShadow: "0 0 0 2px " + (i === timeline.length - 1 ? COLORS.secondary : COLORS.primary) }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{t.event}</div>
                <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{fmt(t.time)}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 9. Admin Audit Log ── */}
        <Section title="9. ADMIN AUDIT LOG" color="#4B5563">
          {audit.length === 0 ? (
            <div style={{ color: COLORS.muted, fontSize: 13 }}>No audit entries.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Timestamp","Admin","Action","Notes"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}`, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...audit].reverse().map((log, i) => (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: "8px 10px", color: COLORS.muted, whiteSpace: "nowrap" }}>{fmt(log.timestamp)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700 }}>{log.admin?.name || "—"}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ background: COLORS.primary + "15", color: COLORS.primary, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{log.action}</span>
                    </td>
                    <td style={{ padding: "8px 10px", color: COLORS.muted }}>{log.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 28, paddingTop: 16, borderTop: `1px solid ${COLORS.border}`, fontSize: 11, color: COLORS.muted }}>
          <strong style={{ color: COLORS.primary }}>KAFAALE QAAD</strong> · Confidential Case Report · {fmt(new Date().toISOString())} · Document generated for Super Admin review only
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
        <Btn variant="ghost"   onClick={onClose}>Close</Btn>
        <Btn variant="primary" onClick={handlePrint}>🖨️ Print / Save as PDF</Btn>
      </div>
    </Modal>
  );
};

// ─── ANALYTICS DASHBOARD ───────────────────────────────────────────────────
const AnalyticsDashboard = ({ cases, donations }) => {
  const totalCases     = cases.length;
  const completedCases = cases.filter(c => c.status === "Completed").length;
  const urgentCases    = cases.filter(c => c.urgency_level === "Critical").length;
  const totalFunded    = donations.reduce((a, d) => a + d.amount, 0);
  const avgDonation    = donations.length > 0 ? (totalFunded / donations.length).toFixed(0) : 0;
  const completionRate = totalCases > 0 ? ((completedCases / totalCases) * 100).toFixed(1) : 0;
  const casesByStatus  = WORKFLOW_STEPS.reduce((acc, s) => { acc[s.label] = cases.filter(c => c.status === s.status).length; return acc; }, {});

  return (
    <div>
      {/* Gradient KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        {[
          { val: totalCases,             label: "Total Cases",      sub: "↑ 12% this month", grad: "135deg, #004B96 0%, #4B7D19 100%" },
          { val: completedCases,         label: "Completed",        sub: `${completionRate}% completion rate`, grad: "135deg, #10B981 0%, #059669 100%" },
          { val: `$${totalFunded.toLocaleString()}`, label: "Total Donated", sub: `Avg $${avgDonation} / donation`, grad: "135deg, #EC4899 0%, #DB2777 100%" },
          { val: urgentCases,            label: "Critical Cases",   sub: "Require immediate action", grad: "135deg, #EF4444 0%, #DC2626 100%" },
        ].map((k, i) => (
          <div key={i} style={{ background: `linear-gradient(${k.grad})`, borderRadius: 16, padding: 24, color: "#fff", boxShadow: "0 4px 16px #0002" }}>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{k.val}</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4, fontWeight: 600 }}>{k.label}</div>
            <div style={{ fontSize: 10, opacity: 0.65, marginTop: 6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24, marginBottom: 24 }}>
        {/* Case pipeline bar chart */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 8px #0001" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700 }}>📊 Case Distribution by Status</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(casesByStatus).map(([status, count]) => (
              <div key={status}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12, fontWeight: 600 }}>
                  <span>{WORKFLOW_STEPS.find(s => s.label === status)?.icon} {status}</span>
                  <span style={{ color: COLORS.primary, fontWeight: 800 }}>{count}</span>
                </div>
                <div style={{ height: 20, background: "#F3F4F6", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: WORKFLOW_STEPS.find(s => s.label === status)?.color || COLORS.primary, width: totalCases > 0 ? `${(count / totalCases) * 100}%` : "0%", borderRadius: 6, transition: "width 0.5s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Donation trend bar chart */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 8px #0001" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700 }}>💰 Donation Trends</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 160, paddingBottom: 8 }}>
            {[{ month: "March", amount: 1800 }, { month: "April", amount: 2400 }, { month: "May", amount: 2500 }].map((d, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: `${(d.amount / 3000) * 120}px`, background: `linear-gradient(180deg, ${COLORS.accent} 0%, ${COLORS.secondary} 100%)`, borderRadius: "8px 8px 0 0", marginBottom: 8, minHeight: 20 }} />
                <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.text }}>${d.amount.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>{d.month}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Urgency distribution */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 8px #0001", marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700 }}>🚦 Cases by Urgency Level</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 16 }}>
          {["Critical", "High", "Medium", "Low"].map(level => {
            const count = cases.filter(c => c.urgency_level === level).length;
            return (
              <div key={level} style={{ textAlign: "center", padding: 20, background: URGENCY[level] + "12", borderRadius: 14, border: `2px solid ${URGENCY[level]}30` }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: URGENCY[level] }}>{count}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginTop: 6 }}>{level}</div>
                <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>{totalCases > 0 ? ((count / totalCases) * 100).toFixed(1) : 0}% of cases</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team performance */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 8px #0001" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700 }}>🏆 Team Performance Metrics</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          {[
            { team: "Field Team Alpha",   investigations: 12, completed: 10, avgTime: "3.2 days", rating: 4.8 },
            { team: "Field Team Beta",    investigations: 9,  completed: 7,  avgTime: "4.1 days", rating: 4.5 },
            { team: "Verification Team",  investigations: 8,  completed: 8,  avgTime: "2.8 days", rating: 4.9 },
          ].map((team, i) => (
            <div key={i} style={{ background: "#F8FAFC", borderRadius: 12, padding: 20, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: COLORS.primary }}>{team.team}</div>
              <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 2 }}>
                <div>📊 Investigations: <strong style={{ color: COLORS.text }}>{team.investigations}</strong></div>
                <div>✅ Completed: <strong style={{ color: COLORS.secondary }}>{team.completed}</strong></div>
                <div>⏱️ Avg Time: <strong style={{ color: COLORS.text }}>{team.avgTime}</strong></div>
                <div>⭐ Rating: <strong style={{ color: COLORS.accent }}>{team.rating}/5</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── CASE TABLE ─────────────────────────────────────────────────────────────
const CaseTable = ({ cases, onView, compact, onReport }) => (
  <div className="kf-table-wrap">
    {cases.length === 0 ? (
      <div style={{ padding: 32, textAlign: "center", color: COLORS.muted, fontSize: 14 }}>No cases found</div>
    ) : (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#F8FAFC" }}>
            {["ID", "Name", "Location", "Urgency", "Status", "Action"].map(h => (
              <th key={h} style={{ padding: compact ? "10px 12px" : "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cases.map((c, i) => (
            <tr key={c.id} style={{ borderBottom: i < cases.length - 1 ? `1px solid ${COLORS.border}` : "none" }}
              onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}>
              <td style={{ padding: compact ? "10px 12px" : "12px 16px", fontSize: 12, fontWeight: 700, color: COLORS.primary }}>{c.id}</td>
              <td style={{ padding: compact ? "10px 12px" : "12px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{c.victim_name}</div>
                {!compact && <div style={{ fontSize: 11, color: COLORS.muted }}>{c.age} yrs · {c.gender}</div>}
              </td>
              <td style={{ padding: compact ? "10px 12px" : "12px 16px", fontSize: 12, color: COLORS.muted }}>📍 {c.location}</td>
              <td style={{ padding: compact ? "10px 12px" : "12px 16px" }}><UrgencyBadge level={c.urgency_level} /></td>
              <td style={{ padding: compact ? "10px 12px" : "12px 16px" }}><Badge status={c.status} /></td>
              <td style={{ padding: compact ? "10px 12px" : "12px 16px" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn variant="ghost" size="sm" onClick={() => onView(c)}>View →</Btn>
                  {onReport && c.status === "Completed" && (
                    <Btn variant="primary" size="sm" onClick={() => onReport(c.id)}>📄 Report</Btn>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

// ─── ROLE DASHBOARDS ─────────────────────────────────────────────────────────
// Reporter case status pipeline tracker
const CaseStatusTracker = ({ status }) => {
  const PIPELINE = [
    { key: "Pending Verification", label: "Submitted",     icon: "📝" },
    { key: "Under Review",         label: "Under Review",  icon: "🔍" },
    { key: "Investigating",        label: "Field Visit",   icon: "🕵️" },
    { key: "Awaiting Approval",    label: "Admin Review",  icon: "🏛️" },
    { key: "Waiting Sponsor",      label: "Finding Donor", icon: "🤝" },
    { key: "Sponsored",            label: "Sponsored",     icon: "❤️" },
    { key: "Aid Delivered",        label: "Aid Sent",      icon: "📦" },
    { key: "Completed",            label: "Completed",     icon: "✅" },
  ];
  const idx = PIPELINE.findIndex(s => s.key === status);
  const isRejected = status === "Archived";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12, flexWrap: "wrap" }}>
      {isRejected
        ? <span style={{ fontSize: 12, background: "#FEE2E2", color: COLORS.danger, borderRadius: 20, padding: "4px 12px", fontWeight: 700 }}>❌ Case Rejected — see details</span>
        : PIPELINE.map((step, i) => {
          const done    = i < idx;
          const current = i === idx;
          return (
            <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div title={step.label} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: current ? COLORS.primary : done ? COLORS.secondary + "25" : "#F3F4F6",
                color:      current ? "#fff"          : done ? COLORS.secondary       : COLORS.muted,
                border:     current ? "none"          : done ? `1px solid ${COLORS.secondary}40` : `1px solid ${COLORS.border}`,
              }}>
                {step.icon} <span style={{ display: window.innerWidth > 480 ? "inline" : "none" }}>{step.label}</span>
              </div>
              {i < PIPELINE.length - 1 && <span style={{ color: current || done ? COLORS.secondary : COLORS.border, fontSize: 12 }}>›</span>}
            </div>
          );
        })
      }
    </div>
  );
};

const ObserverDashboard = ({ cases, currentUser, onReport, onViewCase }) => {
  // Show all cases (for reporters, API already filtered to only their cases)
  const myCases = cases;
  const pending   = myCases.filter(c => c.status === "Pending Verification").length;
  const active    = myCases.filter(c => !["Pending Verification","Archived","Completed"].includes(c.status)).length;
  const completed = myCases.filter(c => c.status === "Completed").length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>📝 Reporter Dashboard</h2>
          <p style={{ margin: "4px 0 0", color: COLORS.muted }}>Ku soo dhawoow, {currentUser.fullname} — Track your submitted cases</p>
        </div>
        <Btn variant="primary" onClick={onReport}>+ Report New Case</Btn>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Total Reports"  value={myCases.length}  icon="📋" color={COLORS.primary} />
        <StatCard label="Pending Review" value={pending}         icon="⏳" color="#F59E0B" />
        <StatCard label="In Progress"    value={active}          icon="🔄" color="#8B5CF6" />
        <StatCard label="Completed"      value={completed}       icon="✅" color={COLORS.secondary} />
      </div>

      {/* How it works */}
      {myCases.length === 0 && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", boxShadow: "0 2px 8px #0001" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>No cases yet</div>
          <div style={{ fontSize: 14, color: COLORS.muted, marginTop: 8, maxWidth: 400, margin: "8px auto 24px" }}>
            Submit your first case report and we'll notify you at every step — from field investigation to aid delivery.
          </div>
          <Btn variant="primary" onClick={onReport}>Submit Your First Report →</Btn>
        </div>
      )}

      {/* Case cards with pipeline tracker */}
      {myCases.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {myCases.map(c => (
            <div key={c.id} style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px #0001", border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary, background: COLORS.primary + "12", borderRadius: 20, padding: "2px 10px" }}>{c.id}</span>
                    <UrgencyBadge level={c.urgency_level} />
                    <Badge status={c.status} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {c.victim_name !== "My Case" ? c.victim_name : (c.description?.slice(0, 60) + "…")}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 3 }}>Reported: {c.created_at}</div>
                </div>
                <Btn variant="ghost" size="sm" onClick={() => onViewCase(c)}>View Details →</Btn>
              </div>
              <CaseStatusTracker status={c.status} />
              {c.status === "Archived" && c._raw?.rejectionReason && (
                <div style={{ marginTop: 10, background: "#FEF2F2", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: COLORS.danger }}>
                  <strong>Rejection Reason:</strong> {c._raw.rejectionReason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const VerificationDashboard = ({ cases, agents, donations = [], onViewCase, onAssign, onReject, onPublish, onViewReport, onConfirmDonation, onComplete, onStartDelivery }) => {
  const [tab, setTab] = useState("workflow");
  const [donFilter, setDonFilter] = useState("all");

  // Workflow lanes
  const newReports     = cases.filter(c => c.status === "Pending Verification");
  const inField        = cases.filter(c => ["Under Review", "Investigating"].includes(c.status));
  const reviewReady    = cases.filter(c => c.status === "Awaiting Approval");
  const proofReady     = cases.filter(c => c.status === "Proof Submitted");
  const allActive      = cases.filter(c => c.status !== "Archived");
  const pendingDons    = donations.filter(d => d.status === "pending");
  const filteredDons   = donFilter === "all" ? donations : donations.filter(d => d.status === donFilter);
  const alertCount     = newReports.length + proofReady.length + pendingDons.length;

  const TABS = [
    { id: "workflow",  label: `🔄 Workflow${alertCount > 0 ? ` (${alertCount})` : ""}` },
    { id: "all",       label: `📋 All Cases (${cases.length})` },
    { id: "donations", label: `💰 Donations${pendingDons.length > 0 ? ` (${pendingDons.length})` : ""}` },
  ];

  const WorkflowCard = ({ c }) => (
    <div style={{ background: "#fff", borderRadius: 14, padding: 18, border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 8px #0001", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary, background: COLORS.primary + "12", borderRadius: 20, padding: "2px 10px" }}>{c.id}</span>
            <UrgencyBadge level={c.urgency_level} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{c.victim_name}</div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 3 }}>📍 {c.location} · {c.created_at}</div>
          <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.5, margin: "8px 0 0", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{c.description}</p>
        </div>
      </div>
      {/* Action buttons per status */}
      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <Btn variant="ghost" size="sm" onClick={() => onViewCase(c)}>🔍 Full Details</Btn>
        {c.status === "Pending Verification" && <>
          <Btn variant="primary" size="sm" onClick={() => onAssign(c)}>🗺️ Assign Team</Btn>
          <Btn variant="success" size="sm" onClick={() => onPublish(c)}>✅ Approve & Publish</Btn>
          <Btn variant="danger"  size="sm" onClick={() => onReject(c)}>❌ Reject</Btn>
        </>}
        {c.status === "Awaiting Approval" && <>
          <Btn variant="purple" size="sm" onClick={() => onViewReport(c)}>📋 View Field Report</Btn>
          <Btn variant="success" size="sm" onClick={() => onPublish(c)}>✅ Approve & Publish</Btn>
          <Btn variant="danger"  size="sm" onClick={() => onReject(c)}>❌ Reject</Btn>
        </>}
        {["Under Review","Investigating"].includes(c.status) && (
          <span style={{ fontSize: 12, color: COLORS.muted, alignSelf: "center" }}>⏳ Awaiting field investigation…</span>
        )}
        {c.status === "Aid Delivered" && onComplete && <>
          <Btn variant="ghost" size="sm" onClick={() => onViewCase(c)}>🔍 View Proof</Btn>
          <Btn variant="success" size="sm" onClick={() => onComplete(c)}>🏁 Mark Complete</Btn>
        </>}
      </div>
    </div>
  );

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>🏛️ Verification Dashboard</h2>
      <p style={{ margin: "0 0 20px", color: COLORS.muted }}>Review incoming reports and manage the case pipeline</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="New Reports"    value={newReports.length}   icon="🚨" color="#EF4444" />
        <StatCard label="In Field"       value={inField.length}      icon="🕵️" color="#8B5CF6" />
        <StatCard label="Needs Decision" value={reviewReady.length}  icon="📋" color="#F59E0B" />
        <StatCard label="Total Active"   value={allActive.length}    icon="📊" color={COLORS.primary} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: `2px solid ${COLORS.border}`, marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "10px 20px", fontSize: 14, fontWeight: 700, border: "none", background: "none", cursor: "pointer",
              color: tab === t.id ? COLORS.primary : COLORS.muted,
              borderBottom: tab === t.id ? `2px solid ${COLORS.primary}` : "2px solid transparent", marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "workflow" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {/* Lane 1 — New Reports */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ background: "#FEE2E2", borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontSize: 13, color: COLORS.danger }}>
                🚨 New Reports ({newReports.length})
              </div>
            </div>
            {newReports.length === 0
              ? <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 24, textAlign: "center", color: COLORS.muted, fontSize: 13 }}>No new reports 🎉</div>
              : newReports.map(c => <WorkflowCard key={c.id} c={c} />)
            }
          </div>

          {/* Lane 2 — Field Investigation */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ background: "#EDE9FE", borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontSize: 13, color: "#6B21A8" }}>
                🕵️ Field Investigation ({inField.length})
              </div>
            </div>
            {inField.length === 0
              ? <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 24, textAlign: "center", color: COLORS.muted, fontSize: 13 }}>No cases in investigation</div>
              : inField.map(c => <WorkflowCard key={c.id} c={c} />)
            }
          </div>

          {/* Lane 3 — Needs Decision */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ background: "#FEF3C7", borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontSize: 13, color: "#92400E" }}>
                📋 Needs Decision ({reviewReady.length})
              </div>
            </div>
            {reviewReady.length === 0
              ? <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 24, textAlign: "center", color: COLORS.muted, fontSize: 13 }}>No cases awaiting decision</div>
              : reviewReady.map(c => <WorkflowCard key={c.id} c={c} />)
            }
          </div>

          {/* Lane 4 — Delivery Proof Review */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ background: "#CFFAFE", borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontSize: 13, color: "#0E7490", position: "relative" }}>
                📦 Proof Uploaded ({proofReady.length})
                {proofReady.length > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: COLORS.danger, color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{proofReady.length}</span>}
              </div>
            </div>
            {proofReady.length === 0
              ? <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 24, textAlign: "center", color: COLORS.muted, fontSize: 13 }}>No delivery proofs to review 🎉</div>
              : proofReady.map(c => <WorkflowCard key={c.id} c={c} />)
            }
          </div>
        </div>
      )}

      {tab === "all" && (
        <div>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>All Cases</h3>
          <CaseTable cases={cases} onView={onViewCase} />
        </div>
      )}

      {tab === "donations" && (
        <div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
            <StatCard label="Total Received"  value={`$${donations.reduce((a,d)=>a+(d.amount||0),0).toLocaleString()}`} icon="💵" color={COLORS.secondary} />
            <StatCard label="Confirmed"       value={`$${donations.filter(d=>d.status==="confirmed").reduce((a,d)=>a+(d.amount||0),0).toLocaleString()}`} icon="✅" color="#10B981" />
            <StatCard label="Needs Confirm"   value={pendingDons.length} icon="⏳" color="#F59E0B" />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["all","pending","confirmed"].map(f => (
              <button key={f} onClick={() => setDonFilter(f)}
                style={{ padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, border: `1.5px solid ${donFilter === f ? COLORS.primary : COLORS.border}`, background: donFilter === f ? COLORS.primary : "#fff", color: donFilter === f ? "#fff" : COLORS.muted, cursor: "pointer" }}>
                {f === "all" ? `All (${donations.length})` : f.charAt(0).toUpperCase() + f.slice(1) + ` (${donations.filter(d=>d.status===f).length})`}
              </button>
            ))}
          </div>
          <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px #0001" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Donor","Amount","Case","Method","Date","Status","Action"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDons.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: "28px 14px", textAlign: "center", color: COLORS.muted, fontSize: 13 }}>No donations found</td></tr>
                )}
                {filteredDons.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: i < filteredDons.length-1 ? `1px solid ${COLORS.border}` : "none" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{d.isAnonymous ? "Anonymous" : (d.donor?.name || "—")}</div>
                      {!d.isAnonymous && <div style={{ fontSize: 11, color: COLORS.muted }}>{d.donor?.email || ""}</div>}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 15, fontWeight: 800, color: COLORS.secondary }}>${(d.amount||0).toLocaleString()}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{d.case?.publicTitle || `Case #${(d.caseId||"").slice(-6)}`}</div>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: COLORS.muted }}>{(d.method||"—").replace(/_/g," ")}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: COLORS.muted }}>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ background: d.status==="confirmed" ? "#D1FAE5" : "#FEF3C7", color: d.status==="confirmed" ? "#065F46" : "#92400E", borderRadius: 20, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>
                        {d.status==="confirmed" ? "✅ Confirmed" : "⏳ Pending"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {d.status === "pending" && onConfirmDonation && (
                          <button onClick={() => onConfirmDonation(d.id)}
                            style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#10B981", color: "#fff", border: "none", cursor: "pointer" }}>
                            ✓ Confirm
                          </button>
                        )}
                        {d.status === "confirmed" && ["sponsored","waiting_for_sponsor"].includes(d.case?.status) && onStartDelivery && (
                          <button onClick={() => onStartDelivery({
                            id: d.caseId, victim_name: d.case?.publicTitle || `Case #${(d.caseId||"").slice(-6)}`,
                            location: d.case?.publicCity || "", donation_amount: d.amount,
                            _amount: d.amount, _caseTitle: d.case?.publicTitle, _caseCity: d.case?.publicCity, _caseId: d.caseId,
                          })}
                            style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#0891B2", color: "#fff", border: "none", cursor: "pointer" }}>
                            🚚 Start Delivery
                          </button>
                        )}
                        {d.status === "confirmed" && d.case?.status === "delivering" && (
                          <span style={{ fontSize: 11, color: "#0891B2", fontWeight: 700 }}>🚚 En Route</span>
                        )}
                        {d.status === "confirmed" && d.case?.status === "proof_uploaded" && onComplete && (
                          <button onClick={() => { const c = cases.find(x => x.id === d.caseId); if(c) onComplete(c); }}
                            style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: COLORS.secondary, color: "#fff", border: "none", cursor: "pointer" }}>
                            🏁 Complete
                          </button>
                        )}
                        {d.status === "confirmed" && d.case?.status === "completed" && (
                          <span style={{ fontSize: 11, color: COLORS.secondary, fontWeight: 700 }}>🏁 Done</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const FieldTeamDashboard = ({ cases, currentUser, onViewCase, onInvestigate, onDeliver }) => {
  const active      = cases.filter(c => ["Under Review","Investigating"].includes(c.status));
  const submitted   = cases.filter(c => c.status === "Awaiting Approval");
  const toDeliver   = cases.filter(c => ["Sponsored","Delivering"].includes(c.status));
  const proofSent   = cases.filter(c => c.status === "Proof Submitted");
  const completed   = cases.filter(c => c.status === "Completed");
  const delivering  = [...toDeliver, ...proofSent];

  const MissionCard = ({ c }) => {
    const statusColors = {
      "Under Review": { bg: "#EDE9FE", color: "#6B21A8", label: "🆕 Just Assigned" },
      "Investigating": { bg: "#DBEAFE", color: "#1E40AF", label: "🔍 Investigating" },
      "Awaiting Approval": { bg: "#D1FAE5", color: "#065F46", label: "✅ Report Submitted" },
      "Delivering":    { bg: "#CFFAFE", color: "#0891B2", label: "🚚 Active Delivery" },
      "Sponsored":     { bg: "#FCE7F3", color: "#9D174D", label: "❤️ Funded — Deliver Aid" },
      "Proof Submitted":{ bg: "#D1FAE5", color: "#065F46", label: "📤 Proof Sent to Admin" },
    };
    const s = statusColors[c.status] || { bg: "#F3F4F6", color: COLORS.muted, label: c.status };
    return (
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 12px #0001" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary, background: COLORS.primary + "12", borderRadius: 20, padding: "2px 10px" }}>{c.id}</span>
              <UrgencyBadge level={c.urgency_level} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{c.victim_name}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, borderRadius: 20, padding: "4px 12px" }}>{s.label}</span>
        </div>

        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>📍 {c.location}</div>
        <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.5, margin: "0 0 16px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{c.description}</p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="ghost" size="sm" onClick={() => onViewCase(c)}>🔍 View Details</Btn>
          {["Under Review","Investigating"].includes(c.status) && (
            <Btn variant="success" size="sm" onClick={() => onInvestigate(c)} style={{ flex: 1 }}>
              📋 Submit Investigation Report
            </Btn>
          )}
          {c.status === "Awaiting Approval" && (
            <span style={{ fontSize: 12, color: "#065F46", background: "#D1FAE5", borderRadius: 8, padding: "4px 10px", alignSelf: "center" }}>
              ✅ Report submitted — awaiting admin approval
            </span>
          )}
          {["Sponsored","Delivering"].includes(c.status) && (
            <Btn variant="teal" size="sm" onClick={() => onDeliver ? onDeliver(c) : onViewCase(c)} style={{ flex: 1 }}>
              📤 Submit Delivery Proof
            </Btn>
          )}
          {c.status === "Proof Submitted" && (
            <span style={{ fontSize: 12, color: "#065F46", background: "#D1FAE5", borderRadius: 8, padding: "4px 10px", alignSelf: "center" }}>
              ✅ Proof submitted — waiting for admin to close case
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>🗺️ Field Team Dashboard</h2>
      <p style={{ margin: "0 0 20px", color: COLORS.muted }}>Welcome, {currentUser.fullname} — Your active missions and investigations</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Active Missions"   value={active.length}     icon="🎯" color={COLORS.primary} />
        <StatCard label="Report Submitted"  value={submitted.length}  icon="📋" color={COLORS.secondary} />
        <StatCard label="Delivering Aid"    value={delivering.length} icon="📦" color="#EC4899" />
        <StatCard label="Completed"         value={completed.length}  icon="✅" color="#5A6E8A" />
      </div>

      {active.length > 0 && (
        <>
          <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: COLORS.primary }}>🎯 Active Missions — Need Your Action</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginBottom: 28 }}>
            {active.map(c => <MissionCard key={c.id} c={c} />)}
          </div>
        </>
      )}

      {toDeliver.length > 0 && (
        <>
          <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#9D174D" }}>🚚 Aid Delivery — Submit Your Proof</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginBottom: 28 }}>
            {toDeliver.map(c => <MissionCard key={c.id} c={c} />)}
          </div>
        </>
      )}

      {proofSent.length > 0 && (
        <>
          <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#065F46" }}>📤 Proof Submitted — Waiting for Admin to Close</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginBottom: 28 }}>
            {proofSent.map(c => <MissionCard key={c.id} c={c} />)}
          </div>
        </>
      )}

      {submitted.length > 0 && (
        <>
          <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: COLORS.secondary }}>📋 Reports Submitted — Awaiting Admin Review</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginBottom: 28 }}>
            {submitted.map(c => <MissionCard key={c.id} c={c} />)}
          </div>
        </>
      )}

      {active.length === 0 && delivering.length === 0 && submitted.length === 0 && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 60, textAlign: "center", boxShadow: "0 2px 8px #0001" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>No Active Missions</div>
          <div style={{ fontSize: 14, color: COLORS.muted, marginTop: 8 }}>You will receive a notification when a case is assigned to you.</div>
        </div>
      )}
    </div>
  );
};

const DonorDashboard = ({ cases, currentUser, onViewCase, onSponsor }) => {
  const [myDonations, setMyDonations] = useState([]);
  const [loadingDonations, setLoadingDonations] = useState(true);

  useEffect(() => {
    donations.my().then(data => {
      if (Array.isArray(data)) setMyDonations(data);
    }).catch(() => {}).finally(() => setLoadingDonations(false));
  }, []);

  const available = cases.filter(c => ["Waiting Sponsor","Sponsored"].includes(c.status));
  const waitingCases = cases.filter(c => c.status === "Waiting Sponsor");
  const myTotal = myDonations.reduce((a, d) => a + (d.amount || 0), 0);
  const confirmedTotal = myDonations.filter(d => d.status === "confirmed").reduce((a, d) => a + (d.amount || 0), 0);

  const STATUS_COLORS = {
    pending:   { bg: "#FEF3C7", color: "#92400E",  label: "⏳ Pending"   },
    confirmed: { bg: "#D1FAE5", color: "#065F46",  label: "✅ Confirmed" },
    failed:    { bg: "#FEE2E2", color: COLORS.danger, label: "❌ Failed" },
  };

  const METHOD_LABELS = {
    mobile_money:  "📱 Mobile Money",
    bank_transfer: "🏦 Bank Transfer",
    card:          "💳 Card",
    wallet:        "💰 Wallet",
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>❤️ Donor Dashboard</h2>
      <p style={{ margin: "0 0 20px", color: COLORS.muted }}>Welcome, {currentUser.fullname} — your support changes lives</p>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Cases to Sponsor" value={waitingCases.length}                    icon="🤝" color={COLORS.primary} />
        <StatCard label="My Donations"      value={myDonations.length}                    icon="❤️" color="#EC4899" />
        <StatCard label="Total Pledged"     value={`$${myTotal.toLocaleString()}`}        icon="💸" color={COLORS.accent} />
        <StatCard label="Confirmed"         value={`$${confirmedTotal.toLocaleString()}`} icon="✅" color={COLORS.secondary} />
      </div>

      {/* Cases grid */}
      <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#EC4899" }}>💝 Cases Waiting for a Sponsor</h3>
      {waitingCases.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: 48, textAlign: "center", color: COLORS.muted, boxShadow: "0 2px 8px #0001", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>All cases are currently sponsored!</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Check back soon — new verified cases are added regularly.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18, marginBottom: 36 }}>
          {waitingCases.map(c => {
            const goal    = c.target_goal  || c._raw?.targetGoal  || 0;
            const raised  = c.donation_amount || c._raw?.totalRaised || 0;
            const remain  = Math.max(0, goal - raised);
            const pct     = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
            return (
              <div key={c.id} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 16px #0002", border: "1px solid #FCE7F3", display: "flex", flexDirection: "column" }}>
                {/* Top color bar by urgency */}
                <div style={{ height: 5, background: c.urgency_level === "Critical" ? "#7C3AED" : c.urgency_level === "High" ? "#EF4444" : c.urgency_level === "Medium" ? "#F59E0B" : "#10B981" }} />
                <div style={{ padding: 20, flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, flex: 1, marginRight: 8 }}>{c.victim_name}</div>
                    <UrgencyBadge level={c.urgency_level} />
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 10 }}>📍 {c.location}</div>
                  <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6, margin: "0 0 16px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                    {c.description}
                  </p>

                  {/* Funding progress */}
                  {goal > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                        <span style={{ color: COLORS.muted }}>Raised: <strong style={{ color: COLORS.secondary }}>${raised.toLocaleString()}</strong></span>
                        <span style={{ color: COLORS.muted }}>Goal: <strong>${goal.toLocaleString()}</strong></span>
                      </div>
                      <div style={{ background: "#F3F4F6", borderRadius: 20, height: 8, overflow: "hidden" }}>
                        <div style={{ background: pct >= 100 ? COLORS.secondary : COLORS.accent, borderRadius: 20, height: "100%", width: `${pct}%`, transition: "width 0.5s" }} />
                      </div>
                      <div style={{ marginTop: 5, fontSize: 12, color: remain > 0 ? COLORS.danger : COLORS.secondary, fontWeight: 700 }}>
                        {remain > 0 ? `💔 $${remain.toLocaleString()} still needed` : "🎉 Fully funded!"}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ padding: "0 20px 20px", display: "flex", gap: 8 }}>
                  <Btn variant="ghost" size="sm" onClick={() => onViewCase(c)} style={{ flex: 1 }}>View Details</Btn>
                  <Btn variant="accent" size="sm" onClick={() => onSponsor(c)} style={{ flex: 2 }}>
                    ❤️ {remain > 0 ? `Sponsor $${remain.toLocaleString()}` : "Contribute"}
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Donation history */}
      <h3 style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 700 }}>💰 My Sponsorship History</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {loadingDonations ? (
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, textAlign: "center", color: COLORS.muted }}>Loading…</div>
        ) : myDonations.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", color: COLORS.muted, boxShadow: "0 2px 8px #0001" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>💝</div>
            <div style={{ fontWeight: 700 }}>No sponsorships yet</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Sponsor a case above to get started!</div>
          </div>
        ) : myDonations.map((d) => {
          const s = STATUS_COLORS[d.status] || STATUS_COLORS.pending;
          const proof = d.case?.deliveryProof;
          const caseStatus = d.case?.status;
          const isDelivered = ["proof_uploaded","completed"].includes(caseStatus);
          const isCompleted = caseStatus === "completed";

          const caseStatusLabel = {
            waiting_for_sponsor: { label: "⏳ Awaiting sponsor match", color: "#92400E", bg: "#FEF3C7" },
            sponsored:           { label: "✅ Donation received — starting delivery", color: "#065F46", bg: "#D1FAE5" },
            delivering:          { label: "🚚 Aid en route to beneficiary", color: "#0891B2", bg: "#CFFAFE" },
            proof_uploaded:      { label: "📦 Aid delivered — admin reviewing", color: "#6D28D9", bg: "#EDE9FE" },
            completed:           { label: "🏁 Completed — aid confirmed delivered", color: "#065F46", bg: "#D1FAE5" },
          }[caseStatus] || { label: caseStatus || "—", color: COLORS.muted, bg: "#F3F4F6" };

          return (
            <div key={d.id} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px #0001", border: isCompleted ? "1.5px solid #10B981" : `1px solid ${COLORS.border}` }}>
              {/* Top bar — case progress */}
              <div style={{ background: caseStatusLabel.bg, padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: caseStatusLabel.color }}>{caseStatusLabel.label}</span>
                <span style={{ fontSize: 11, color: COLORS.muted }}>{d.createdAt?.slice(0,10)}</span>
              </div>

              <div style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.primary }}>{d.case?.publicTitle || `Case #${d.caseId?.slice(-8)}`}</div>
                    {d.case?.publicCity && <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>📍 {d.case.publicCity}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.secondary }}>${d.amount?.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted }}>{METHOD_LABELS[d.method] || d.method}</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{s.label}</span>
                </div>

                {/* Delivery proof — shown once field agent submits */}
                {isDelivered && proof && (
                  <div style={{ marginTop: 14, background: "#F0FDF4", borderRadius: 12, padding: "14px 16px", border: "1px solid #BBF7D0" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#166534", marginBottom: 10 }}>
                      📦 Delivery Proof — {isCompleted ? "✅ Admin Confirmed" : "⏳ Pending Admin Review"}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
                      {[
                        { label: "Delivery Date",    val: proof.deliveryDate ? new Date(proof.deliveryDate).toLocaleDateString() : "—" },
                        { label: "Method",           val: (proof.deliveryMethod || "—").replace(/_/g," ") },
                        { label: "Amount Delivered", val: `$${(proof.amountDelivered||0).toLocaleString()}` },
                        { label: "Recipient",        val: proof.recipientName || "Confirmed on-site" },
                      ].map((item, i) => (
                        <div key={i} style={{ background: "#fff", borderRadius: 8, padding: "8px 12px" }}>
                          <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700 }}>{item.label.toUpperCase()}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{item.val}</div>
                        </div>
                      ))}
                    </div>
                    {proof.deliveryNotes && (
                      <div style={{ marginTop: 10, background: "#fff", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700, marginBottom: 4 }}>FIELD AGENT NOTES</div>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: COLORS.text }}>{proof.deliveryNotes}</p>
                      </div>
                    )}
                    {isCompleted && (
                      <div style={{ marginTop: 10, background: "#065F46", color: "#fff", borderRadius: 8, padding: "10px 14px", fontSize: 12, fontWeight: 700, textAlign: "center" }}>
                        🏁 Case fully completed on {d.case?.completedAt ? new Date(d.case.completedAt).toLocaleDateString() : "—"} — Thank you for your generosity!
                      </div>
                    )}
                  </div>
                )}

                {/* Waiting message if not yet delivered */}
                {!isDelivered && d.status === "confirmed" && (
                  <div style={{ marginTop: 10, background: "#EFF6FF", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: COLORS.primary }}>
                    ℹ️ Your donation is confirmed. The field team is preparing to deliver aid. You'll see proof of delivery here once it's done.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── USER AVATAR — coloured circle with initials ─────────────────────────────
const AVATAR_COLORS = ["#004B96","#4B7D19","#7C3AED","#D97706","#DC2626","#0891B2","#059669","#9D174D"];
const UserAvatar = ({ name, size = 36 }) => {
  const initials = (name || "?").split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
  const color = AVATAR_COLORS[(name || "").charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 800, flexShrink: 0, letterSpacing: -0.5 }}>
      {initials}
    </div>
  );
};

// ─── USERS TAB — avatars, inline role change, delete ─────────────────────────
const ALL_ROLES = [
  { value: "reporter",    label: "📝 Reporter"      },
  { value: "donor",       label: "💳 Donor"          },
  { value: "field_agent", label: "🔍 Field Agent"    },
  { value: "admin",       label: "🟠 Admin"          },
  { value: "super_admin", label: "🔴 Super Admin"    },
];
const ROLE_COLORS = {
  super_admin:  { bg: "#FEE2E2", text: "#991B1B" },
  admin:        { bg: "#FEF3C7", text: "#92400E" },
  field_agent:  { bg: "#EDE9FE", text: "#5B21B6" },
  donor:        { bg: "#D1FAE5", text: "#065F46" },
  reporter:     { bg: "#DBEAFE", text: "#1E40AF" },
};

const UsersTab = ({ users, isSuperAdmin, onDeleteUser, onChangeRole }) => {
  const { t } = useLang();
  const [editingId, setEditingId] = useState(null);
  const [savingId,  setSavingId]  = useState(null);

  const handleRoleChange = async (u, newRole) => {
    if (newRole === u.role) { setEditingId(null); return; }
    setSavingId(u.id);
    try {
      await onChangeRole(u, newRole);
    } finally {
      setSavingId(null);
      setEditingId(null);
    }
  };

  return (
    <div className="kf-table-wrap">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#F8FAFC" }}>
            {["", t("name"), "Email", "Phone", t("role"), t("status"), isSuperAdmin ? t("actions") : null].filter(Boolean).map(h => (
              <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => {
            const name = u.name || u.fullname || "?";
            const rc = ROLE_COLORS[u.role] || { bg: "#F3F4F6", text: "#374151" };
            const isSelf = false; // will be guarded on backend
            const isEditing = editingId === u.id;
            const isSaving  = savingId  === u.id;
            return (
              <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? `1px solid ${COLORS.border}` : "none" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                <td style={{ padding: "10px 16px" }}><UserAvatar name={name} size={38} /></td>
                <td style={{ padding: "10px 16px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{name}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted }}>{u.country || ""}{u.city ? `, ${u.city}` : ""}</div>
                </td>
                <td style={{ padding: "10px 16px", fontSize: 13, color: COLORS.muted }}>{u.email}</td>
                <td style={{ padding: "10px 16px", fontSize: 13 }}>{u.phone || "—"}</td>
                <td style={{ padding: "10px 16px" }}>
                  {isSuperAdmin && isEditing ? (
                    <select defaultValue={u.role} disabled={isSaving}
                      onChange={e => handleRoleChange(u, e.target.value)}
                      onBlur={() => setEditingId(null)}
                      autoFocus
                      style={{ padding: "4px 8px", borderRadius: 8, border: `1.5px solid ${COLORS.primary}`, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "#fff", outline: "none" }}>
                      {ALL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  ) : (
                    <span onClick={() => isSuperAdmin && setEditingId(u.id)}
                      title={isSuperAdmin ? "Click to change role" : ""}
                      style={{ background: rc.bg, color: rc.text, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: isSuperAdmin ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {(u.role || "").replace(/_/g, " ")}
                      {isSuperAdmin && <span style={{ fontSize: 9, opacity: 0.6 }}>✏️</span>}
                    </span>
                  )}
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <span style={{ background: u.isActive !== false ? "#D1FAE5" : "#FEE2E2", color: u.isActive !== false ? "#065F46" : "#991B1B", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                    ● {u.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </td>
                {isSuperAdmin && (
                  <td style={{ padding: "10px 16px" }}>
                    {u.role !== "super_admin" && (
                      <button onClick={() => onDeleteUser && onDeleteUser(u)}
                        style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#FEE2E2", color: "#DC2626", border: "1px solid #FCA5A5", cursor: "pointer" }}>
                        {t("deleteUser")}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const AdminDashboard = ({ cases, users, donations, sponsors, agents, onViewCase, onAddUser, onDeleteUser, onChangeRole, onExport, onConfirmDonation, onComplete, onStartDelivery, onFullReport, isSuperAdmin }) => {
  const [tab, setTab] = useState("overview");
  const [donFilter, setDonFilter] = useState("all");
  const { t } = useLang();
  const totalDonated = donations.reduce((a, d) => a + (d.amount || 0), 0);
  const confirmedTotal = donations.filter(d => d.status === "confirmed").reduce((a, d) => a + (d.amount || 0), 0);
  const pendingTotal   = donations.filter(d => d.status === "pending").reduce((a, d) => a + (d.amount || 0), 0);
  const byStatus = WORKFLOW_STEPS.reduce((acc, s) => { acc[s.status] = cases.filter(c => c.status === s.status).length; return acc; }, {});
  const pendingCases   = cases.filter(c => ["Pending Verification","Under Review","Investigating"].includes(c.status));
  const proofPending   = cases.filter(c => c.status === "Proof Submitted"); // awaiting admin complete
  const recentDonations = donations.slice(0, 5);
  const filteredDonations = donFilter === "all" ? donations : donations.filter(d => d.status === donFilter);

  const TABS = [
    { id: "overview",   label: t("overview")   },
    { id: "analytics",  label: t("analytics")  },
    { id: "users",      label: t("users")      },
    { id: "cases",      label: t("allCases")   },
    { id: "donations",  label: t("donations")  },
  ];

  return (
    <div>
      <div className="kf-action-row">
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{t("adminCommandCenter")}</h2>
          <p style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: 13 }}>{t("fullOversight")}</p>
        </div>
        <div className="kf-action-btns">
          <Btn variant="teal" onClick={onExport}>{t("exportData")}</Btn>
          <Btn variant="primary" onClick={onAddUser}>{t("addUser")}</Btn>
        </div>
      </div>

      {/* Tab bar — scrollable on mobile */}
      <div className="kf-tabs">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, border: "none", background: "none", cursor: "pointer", color: tab === t.id ? COLORS.primary : COLORS.muted, borderBottom: tab === t.id ? `2px solid ${COLORS.primary}` : "2px solid transparent", marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          <div className="kf-stats-row">
            <StatCard label={t("totalCases")}   value={cases.length}    icon="📋" color={COLORS.primary} />
            <StatCard label={t("totalUsers")}   value={users.length}    icon="👥" color="#8B5CF6" />
            <StatCard label={t("totalDonated")} value={`$${totalDonated.toLocaleString()}`} icon="💰" color={COLORS.secondary} />
            <StatCard label={t("completed")}    value={cases.filter(c => c.status === "Completed").length} icon="🏁" color="#5A6E8A" />
          </div>

          {/* Proof pending alert */}
          {proofPending.length > 0 && (
            <div style={{ background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#065F46" }}>📦 {proofPending.length} case{proofPending.length > 1 ? "s" : ""} with delivery proof — needs your review</div>
                <div style={{ fontSize: 12, color: "#047857", marginTop: 2 }}>Field agent has submitted proof. Review and mark complete to notify donors & reporter.</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {proofPending.map(c => (
                  <button key={c.id} onClick={() => onComplete && onComplete(c)}
                    style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: COLORS.secondary, color: "#fff", border: "none", cursor: "pointer" }}>
                    🏁 Complete {c.id}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Case Pipeline */}
          <div style={{ background: "#fff", borderRadius: 14, padding: "20px 16px", boxShadow: "0 2px 8px #0001", marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>📊 Live Case Pipeline</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
              {WORKFLOW_STEPS.map(s => (
                <div key={s.num} style={{ textAlign: "center", background: s.color + "12", borderRadius: 12, padding: "14px 8px", border: `1px solid ${s.color}30` }}>
                  <div style={{ fontSize: 22 }}>{s.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginTop: 4 }}>{byStatus[s.status] || 0}</div>
                  <div style={{ fontSize: 10, color: s.color, fontWeight: 700, marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="kf-grid-2">
            <div>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>🚨 Needs Attention</h3>
              <CaseTable cases={pendingCases.slice(0,4)} onView={onViewCase} compact />
            </div>
            <div>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>💰 Recent Donations</h3>
              <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px #0001" }}>
                {recentDonations.length === 0 && (
                  <div style={{ padding: "20px 16px", color: COLORS.muted, fontSize: 13, textAlign: "center" }}>No donations yet</div>
                )}
                {recentDonations.map((d, i) => (
                  <div key={d.id} style={{ padding: "12px 16px", borderBottom: i < recentDonations.length - 1 ? `1px solid ${COLORS.border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>
                        {d.donor?.name || "Anonymous"} → {d.case?.publicTitle || `Case #${d.caseId?.slice(-6)}`}
                      </div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>
                        {d.method?.replace(/_/g," ") || "—"} · {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "—"}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: d.status === "confirmed" ? "#D1FAE5" : "#FEF3C7", color: d.status === "confirmed" ? "#065F46" : "#92400E" }}>
                        {d.status}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: COLORS.secondary }}>${d.amount?.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {donations.length > 5 && (
                  <div style={{ padding: "10px 16px", textAlign: "center" }}>
                    <button onClick={() => setTab("donations")} style={{ fontSize: 12, color: COLORS.primary, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>View all {donations.length} donations →</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "analytics" && <AnalyticsDashboard cases={cases} donations={donations} users={users} />}

      {tab === "users" && (
        <UsersTab users={users} isSuperAdmin={isSuperAdmin} onDeleteUser={onDeleteUser} onChangeRole={onChangeRole} />
      )}

      {tab === "cases" && (
        <div>
          <CaseTable cases={cases} onView={onViewCase} onReport={onFullReport} />
        </div>
      )}

      {tab === "donations" && (
        <div>
          {/* Summary cards */}
          <div className="kf-stats-row">
            <StatCard label="Total Received"   value={`$${totalDonated.toLocaleString()}`}   icon="💵" color={COLORS.secondary} />
            <StatCard label="Confirmed"        value={`$${confirmedTotal.toLocaleString()}`}  icon="✅" color="#10B981" />
            <StatCard label="Pending Confirm"  value={`$${pendingTotal.toLocaleString()}`}    icon="⏳" color="#F59E0B" />
            <StatCard label="# Donations"      value={donations.length}                       icon="📊" color={COLORS.primary} />
          </div>

          {/* Filter bar */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["all","pending","confirmed"].map(f => (
              <button key={f} onClick={() => setDonFilter(f)}
                style={{ padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, border: `1.5px solid ${donFilter === f ? COLORS.primary : COLORS.border}`, background: donFilter === f ? COLORS.primary : "#fff", color: donFilter === f ? "#fff" : COLORS.muted, cursor: "pointer" }}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== "all" && <span style={{ marginLeft: 6, background: "rgba(255,255,255,0.25)", borderRadius: 10, padding: "1px 6px" }}>{donations.filter(d => d.status === f).length}</span>}
              </button>
            ))}
          </div>

          {/* Donations table */}
          <div className="kf-table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Donor","Amount","Case","Method","Date","Status","Action"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDonations.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: "32px 16px", textAlign: "center", color: COLORS.muted, fontSize: 14 }}>No donations found</td></tr>
                )}
                {filteredDonations.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: i < filteredDonations.length - 1 ? `1px solid ${COLORS.border}` : "none" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{d.isAnonymous ? "Anonymous" : (d.donor?.name || "—")}</div>
                      {!d.isAnonymous && <div style={{ fontSize: 11, color: COLORS.muted }}>{d.donor?.email || ""}</div>}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 16, fontWeight: 800, color: COLORS.secondary }}>${(d.amount || 0).toLocaleString()}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{d.case?.publicTitle || `Case #${(d.caseId || "").slice(-6)}`}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>{d.case?.publicCity || ""}</div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: COLORS.muted }}>{(d.method || "—").replace(/_/g," ")}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: COLORS.muted }}>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: d.status === "confirmed" ? "#D1FAE5" : d.status === "pending" ? "#FEF3C7" : "#FEE2E2", color: d.status === "confirmed" ? "#065F46" : d.status === "pending" ? "#92400E" : "#991B1B", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                        {d.status === "confirmed" ? "✅ Confirmed" : d.status === "pending" ? "⏳ Pending" : d.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {d.status === "pending" && onConfirmDonation && (
                        <button onClick={() => onConfirmDonation(d.id)}
                          style={{ padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#10B981", color: "#fff", border: "none", cursor: "pointer" }}>
                          ✓ Confirm
                        </button>
                      )}
                      {d.status === "confirmed" && ["sponsored","waiting_for_sponsor"].includes(d.case?.status) && onStartDelivery && (
                        <button onClick={() => onStartDelivery({
                          id: d.caseId,
                          victim_name: d.case?.publicTitle || `Case #${(d.caseId||"").slice(-6)}`,
                          location: d.case?.publicCity || "",
                          donation_amount: d.amount,
                          _amount: d.amount,
                          _caseTitle: d.case?.publicTitle,
                          _caseCity: d.case?.publicCity,
                          _caseId: d.caseId,
                        })}
                          style={{ padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#0891B2", color: "#fff", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                          🚚 Start Delivery
                        </button>
                      )}
                      {d.status === "confirmed" && d.case?.status === "delivering" && (
                        <span style={{ fontSize: 11, color: "#0891B2", fontWeight: 700 }}>🚚 En Route</span>
                      )}
                      {d.status === "confirmed" && d.case?.status === "proof_uploaded" && onComplete && (
                        <button onClick={() => { const c = cases.find(x => x.id === d.caseId); if(c) onComplete(c); }}
                          style={{ padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: COLORS.secondary, color: "#fff", border: "none", cursor: "pointer" }}>
                          🏁 Mark Complete
                        </button>
                      )}
                      {d.status === "confirmed" && d.case?.status === "completed" && (
                        <span style={{ fontSize: 11, color: COLORS.secondary, fontWeight: 700 }}>🏁 Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  );
};

// ─── Role → internal dashboard key ─────────────────────────────────────────
const ROLE_MAP = {
  reporter:            "observer",
  admin:               "verification_office",
  super_admin:         "super_admin",
  field_agent:         "field_team",
  donor:               "donor",
  // legacy keys (pass-through)
  observer:            "observer",
  verification_office: "verification_office",
  field_team:          "field_team",
};

const ROLE_LABELS = {
  observer:            { icon: "📝", label: "Reporter" },
  verification_office: { icon: "🏛️", label: "Admin / Verification" },
  field_team:          { icon: "🗺️", label: "Field Agent" },
  donor:               { icon: "❤️", label: "Donor / Sponsor" },
  super_admin:         { icon: "🛡️", label: "Super Admin" },
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────
export default function KafaaleQaadApp() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();

  // API status → display status mapping (defined first so useEffect can use it)
  const STATUS_API_MAP = {
    pending_review:          "Pending Verification",
    team_assigned:           "Under Review",
    investigating:           "Investigating",
    investigation_completed: "Awaiting Approval",
    ai_sanitized:            "Awaiting Approval",
    waiting_for_sponsor:     "Waiting Sponsor",
    sponsored:               "Sponsored",
    delivering:              "Delivering",
    proof_uploaded:          "Proof Submitted",
    completed:               "Completed",
    rejected:                "Archived",
  };

  const mapCase = (c, role) => ({
    id:               c.id,
    victim_name:      role === "donor" ? (c.publicTitle || "Verified Case")
                    : (c.privateVictimName || c.publicTitle || "Pending Review"),
    age:              c.privateVictimAge || null,
    gender:           c.privateVictimGender || "—",
    description:      role === "donor" ? (c.publicStory || "")
                    : (c.privateDescription || c.publicStory || ""),
    location:         c.publicCity || c.privateAddress?.split(",").slice(-2).join(",").trim() || "Somalia",
    urgency_level:    c.emergencyLevel ? c.emergencyLevel.charAt(0).toUpperCase() + c.emergencyLevel.slice(1) : "Medium",
    status:           STATUS_API_MAP[c.status] || c.status || "Pending Verification",
    created_at:       (c.createdAt || c.adminPublishedAt || "")?.slice(0,10),
    reporter_id:      c.reporterId,
    team_id:          c.assignedAgentId,
    findings:         c.fieldInvestigation?.officialNotes || "",
    donation_amount:  c.totalRaised || 0,
    target_goal:      c.targetGoal  || 0,
    media_files: [], proof_files: [],
    fieldInvestigation: c.fieldInvestigation,
    _raw: c,
  });

  // Map real backend role → internal dashboard role
  const internalRole = authUser ? (ROLE_MAP[authUser.role] || "observer") : null;

  const [cases,             setCases]            = useState([]);
  const [users,             setUsers]            = useState([]);
  const [donations,         setDonations]        = useState([]);
  const [sponsors,          setSponsors]         = useState([]);
  const [notifs,            setNotifs]           = useState([]);
  const [agents,            setAgents]           = useState([]);
  const [dataLoading,       setDataLoading]      = useState(true);
  const isMobile = useIsMobile();
  const { t, lang, changeLang, LANGUAGES, currentLang } = useLang();
  const [showLangMenu,      setShowLangMenu]     = useState(false);
  const [selectedCase,      setSelectedCase]     = useState(null);
  const [showReport,        setShowReport]       = useState(false);
  const [sponsorCase,       setSponsorCase]      = useState(null);
  const [showAddUser,       setShowAddUser]      = useState(false);
  const [showExport,        setShowExport]       = useState(false);
  const [showNotifs,        setShowNotifs]       = useState(false);
  const [assignCase,        setAssignCase]       = useState(null);
  const [investigateCase,   setInvestigateCase]  = useState(null);
  const [publishCase,       setPublishCase]      = useState(null);
  const [rejectCase,        setRejectCase]       = useState(null);
  const [fieldReportCase,   setFieldReportCase]  = useState(null);
  const [deliveryCase,      setDeliveryCase]     = useState(null);
  const [deliveryAssign,    setDeliveryAssign]   = useState(null);
  const [completeCase,      setCompleteCase]     = useState(null);
  const [fullReportId,      setFullReportId]     = useState(null);
  const [toast,             setToast]            = useState(null);
  const [searchTerm,        setSearchTerm]       = useState("");
  const [filterStatus,      setFilterStatus]     = useState("All");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Redirect if not logged in ─────────────────────────────────────────
  useEffect(() => {
    if (!authUser) navigate("/login");
  }, [authUser, navigate]);

  // ─── Build currentUser from real auth ──────────────────────────────────
  const currentUser = authUser ? {
    id:       authUser.id,
    fullname: authUser.name,
    email:    authUser.email,
    role:     internalRole,
    realRole: authUser.role,
    phone:    authUser.phone || "",
    verification_status: "active",
  } : null;

  // ─── Load data from API ─────────────────────────────────────────────────
  const reloadCases = async (showLoader = false) => {
    if (!authUser) return;
    if (showLoader) setDataLoading(true);
    try {
      if (["admin","super_admin","verification_office"].includes(authUser.role)) {
        const data = await adminApi.cases({ limit: 30 });
        if (data?.cases) setCases(data.cases.map(c => mapCase(c, "admin")));
        // Load users + donations after dashboard is visible (non-blocking)
        setTimeout(async () => {
          try {
            const [usersRes, donRes] = await Promise.allSettled([adminApi.users(), adminApi.donations()]);
            if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value)) {
              setUsers(usersRes.value);
              setAgents(usersRes.value.filter(u => u.role === "field_agent" && u.isActive));
            }
            if (donRes.status === "fulfilled" && donRes.value?.donations)
              setDonations(donRes.value.donations);
          } catch { /* ignore */ }
        }, 800);
      } else if (authUser.role === "reporter") {
        const data = await casesApi.my();
        if (Array.isArray(data)) setCases(data.map(c => mapCase(c, "reporter")));
      } else if (authUser.role === "field_agent") {
        const data = await fieldApi.assignments();
        if (Array.isArray(data)) setCases(data.map(c => mapCase(c, "field_agent")));
      } else if (authUser.role === "donor") {
        const data = await casesApi.list({ limit: 30 });
        if (data?.cases) setCases(data.cases.map(c => mapCase(c, "donor")));
      }
    } catch (e) {
      console.error("Failed to load data:", e);
      if (e.message?.includes('Session expired')) { logout(); navigate("/login"); }
    } finally {
      setDataLoading(false);
    }
  };

  // Lazy loaders — called by AdminDashboard when users/donations tabs are opened
  const reloadUsers = async () => {
    try {
      const us = await adminApi.users();
      if (Array.isArray(us)) { setUsers(us); setAgents(us.filter(u => u.role === "field_agent" && u.isActive)); }
    } catch (e) { console.error("Failed to load users:", e); }
  };

  const reloadDonations = async () => {
    try {
      const data = await adminApi.donations();
      if (data?.donations) setDonations(data.donations);
    } catch (e) { console.error("Failed to load donations:", e); }
  };

  const reloadNotifs = async () => {
    if (!authUser) return;
    try {
      const data = await notifsApi.list();
      if (Array.isArray(data)) setNotifs(data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    reloadCases(true);  // true = show loading spinner on first load
    reloadNotifs();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(reloadNotifs, 30000);
    return () => clearInterval(interval);
  }, [authUser]);

  // ─── Case status update (optimistic) ───────────────────────────────────
  const handleCaseStatusUpdate = (caseId, newDisplayStatus) => {
    setCases(cs => cs.map(c => c.id === caseId ? { ...c, status: newDisplayStatus } : c));
    setTimeout(reloadCases, 1000); // sync with server after 1s
  };

  const handleSponsor = (caseId, details) => {
    // Optimistic update — show donated amount on the case card immediately
    setCases(cs => cs.map(c => c.id === caseId
      ? { ...c, donation_amount: (c.donation_amount || 0) + details.amount }
      : c
    ));
    // Reload cases from server after a short delay to get real totals
    setTimeout(reloadCases, 1500);
  };

  const handleLogout = () => { logout(); navigate("/"); };

  const handleMarkAllNotifs = async () => {
    try { await notifsApi.readAll(); setNotifs(n => n.map(x => ({ ...x, read: true }))); } catch { /* ignore */ }
    setShowNotifs(false);
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Delete user "${u.name || u.fullname}"?\nEmail: ${u.email}\nRole: ${u.role}\n\nThis cannot be undone.`)) return;
    try {
      await adminApi.deleteUser(u.id);
      setUsers(us => us.filter(x => x.id !== u.id));
      showToast(`User ${u.name || u.email} deleted.`, "success");
    } catch (e) {
      showToast("Failed to delete user: " + e.message, "error");
    }
  };

  const handleChangeRole = async (u, newRole) => {
    try {
      await adminApi.changeRole(u.id, newRole);
      setUsers(us => us.map(x => x.id === u.id ? { ...x, role: newRole } : x));
      showToast(`${u.name || u.email} is now ${newRole.replace(/_/g, " ")}.`, "success");
    } catch (e) {
      showToast("Failed to change role: " + e.message, "error");
    }
  };

  const handleConfirmDonation = async (donationId) => {
    try {
      await adminApi.confirmDonation(donationId);
      showToast("Donation confirmed! Case totals updated.", "success");
      setTimeout(reloadCases, 800);
    } catch (e) {
      showToast("Failed to confirm donation: " + e.message, "error");
    }
  };

  const handleOpenNotifCase = async (caseId) => {
    setShowNotifs(false);
    const existing = cases.find(c => c.id === caseId);
    if (existing) { setSelectedCase(existing); return; }
    // Load the case if not in current list
    try {
      const data = ["admin","super_admin"].includes(authUser.role)
        ? await adminApi.getCase(caseId) : null;
      if (data) setSelectedCase(mapCase(data, "admin"));
    } catch { /* ignore */ }
  };

  const filteredCases = cases.filter(c => {
    const s = searchTerm.toLowerCase();
    const matchSearch = !s
      || (c.victim_name || "").toLowerCase().includes(s)
      || (c.location || "").toLowerCase().includes(s)
      || (c.id || "").toLowerCase().includes(s);
    const matchStatus = filterStatus === "All" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const unreadCount = notifs.filter(n => !(n.read || n.isRead)).length;

  // ─── Guard: still loading auth ─────────────────────────────────────────
  if (!authUser || !currentUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Logo size="lg" linked={false} />
          <div style={{ fontSize: 14, color: COLORS.muted }}>Loading...</div>
        </div>
      </div>
    );
  }

  // ─── Guard: data still loading ─────────────────────────────────────────
  if (dataLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: COLORS.bg, gap: 20 }}>
        <Logo size="lg" linked={false} />
        <div style={{ fontSize: 13, color: COLORS.muted }}>Loading your dashboard…</div>
        {/* Animated dots */}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: "50%", background: COLORS.primary,
              animation: `kf-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
        <style>{`@keyframes kf-pulse { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>
      </div>
    );
  }

  // ─── Access denied guard ────────────────────────────────────────────────
  const VALID_ROLES = ["observer","verification_office","field_team","donor","super_admin"];
  if (!VALID_ROLES.includes(internalRole)) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg }}>
        <div style={{ textAlign: "center", background: "#fff", padding: 40, borderRadius: 20, boxShadow: "0 4px 20px #0001" }}>
          <div style={{ fontSize: 48 }}>🚫</div>
          <h2 style={{ color: COLORS.danger }}>Access Denied</h2>
          <p style={{ color: COLORS.muted }}>Your account role ({authUser.role}) does not have dashboard access.</p>
          <button onClick={handleLogout} style={{ padding: "10px 24px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700 }}>Sign Out</button>
        </div>
      </div>
    );
  }

  const roleInfo = ROLE_LABELS[internalRole] || { icon: "👤", label: "User" };

  // ─── ROLE DASHBOARDS MAP (locked to real role) ──────────────────────────
  const ROLE_DASHBOARDS = {
    observer: (
      <ObserverDashboard cases={filteredCases} currentUser={currentUser}
        onReport={() => setShowReport(true)} onViewCase={setSelectedCase} />
    ),
    verification_office: (
      <VerificationDashboard cases={filteredCases} agents={agents} donations={donations}
        onViewCase={setSelectedCase} onAssign={setAssignCase} onReject={setRejectCase}
        onPublish={setPublishCase} onViewReport={setFieldReportCase}
        onConfirmDonation={handleConfirmDonation} onComplete={setCompleteCase}
        onStartDelivery={setDeliveryAssign} />
    ),
    field_team: (
      <FieldTeamDashboard cases={filteredCases} currentUser={currentUser}
        onViewCase={setSelectedCase} onInvestigate={setInvestigateCase}
        onDeliver={setDeliveryCase} />
    ),
    donor: (
      <DonorDashboard cases={filteredCases}
        currentUser={currentUser} onViewCase={setSelectedCase} onSponsor={setSponsorCase} />
    ),
    super_admin: (
      <AdminDashboard cases={filteredCases} users={users} donations={donations} sponsors={sponsors} agents={agents}
        onViewCase={setSelectedCase} onAddUser={() => setShowAddUser(true)} onDeleteUser={handleDeleteUser}
        onChangeRole={handleChangeRole} onExport={() => setShowExport(true)} isSuperAdmin={authUser?.role === "super_admin"}
        onConfirmDonation={handleConfirmDonation} onComplete={setCompleteCase}
        onStartDelivery={setDeliveryAssign} onFullReport={setFullReportId} />
    ),
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div className="kf-header">
        <div className="kf-header-inner">
          {/* Logo */}
          <Logo size={isMobile ? "sm" : "md"} linked={false} dark />

          {/* Search bar */}
          <div className="kf-search" style={{ margin: "0 8px" }}>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="🔍 Search…"
              style={{ flex: 1, padding: "7px 12px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.18)", color: "#fff", fontSize: 13, outline: "none", minWidth: 0 }} />
            {!isMobile && (
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ padding: "7px 8px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.18)", color: "#fff", fontSize: 11, outline: "none", maxWidth: 110 }}>
                <option value="All">All</option>
                {Object.keys(STATUS_MAP).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>

          {/* Right: notifications + user + logout */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowNotifs(v => !v)}
                style={{ background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                🔔
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, background: "#EF4444", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid " + COLORS.primary }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <NotificationsDropdown notifs={notifs} onClose={() => setShowNotifs(false)}
                  onMarkAll={handleMarkAllNotifs} onOpenCase={handleOpenNotifCase} />
              )}
            </div>

            <div className="kf-hide-mobile" style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{currentUser.fullname}</div>
              <div style={{ fontSize: 9, opacity: 0.65, letterSpacing: 0.5 }}>{roleInfo.icon} {roleInfo.label}</div>
            </div>

            <UserAvatar name={currentUser.fullname} size={34} />

            {/* Language switcher */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowLangMenu(v => !v)}
                style={{ background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 15, color: "#fff", display: "flex", alignItems: "center", gap: 4 }}>
                {currentLang.flag}{!isMobile && <span style={{ fontSize: 11 }}> ▾</span>}
              </button>
              {showLangMenu && (
                <div className="kf-lang-menu" style={{ position: "absolute", top: 42, right: 0, background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px #0003", zIndex: 200, minWidth: 160, border: `1px solid ${COLORS.border}` }}>
                  {LANGUAGES.map(l => (
                    <div key={l.code} onClick={() => { changeLang(l.code); setShowLangMenu(false); }}
                      style={{ padding: "10px 16px", fontSize: 13, cursor: "pointer", background: lang === l.code ? COLORS.primary + "10" : "", fontWeight: lang === l.code ? 700 : 400, display: "flex", alignItems: "center", gap: 8, color: COLORS.text }}>
                      {l.flag} {l.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Btn variant="muted" size="sm" onClick={handleLogout} style={{ padding: "6px 10px", fontSize: 12 }}>
              {isMobile ? "⏻" : t("exit")}
            </Btn>
          </div>
        </div>
      </div>

      {/* ── Pipeline Banner (admin/field only) ── */}
      {["verification_office","super_admin","field_team"].includes(internalRole) && (
        <div style={{ background: "#fff", borderBottom: `1px solid ${COLORS.border}`, padding: "8px 16px" }}>
          <div className="kf-pipeline" style={{ maxWidth: 1400, margin: "0 auto" }}>
            <span style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700, marginRight: 6, whiteSpace: "nowrap" }}>PIPELINE:</span>
            {WORKFLOW_STEPS.map((s, i) => {
              const count = cases.filter(c => c.status === s.status).length;
              return (
                <div key={s.num} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, background: count > 0 ? s.color + "15" : "#F3F4F6", border: `1px solid ${count > 0 ? s.color + "40" : COLORS.border}`, borderRadius: 20, padding: "3px 8px", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 11 }}>{s.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: count > 0 ? s.color : COLORS.muted }}>{s.label}</span>
                    {count > 0 && <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: s.color, borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>{count}</span>}
                  </div>
                  {i < WORKFLOW_STEPS.length - 1 && <span style={{ color: COLORS.border, fontSize: 12 }}>›</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="kf-main">
        {ROLE_DASHBOARDS[internalRole] || ROLE_DASHBOARDS.observer}
      </div>

      {/* ── Modals ── */}
      {selectedCase && (
        <CaseDetailModal c={selectedCase} currentUser={currentUser} onClose={() => setSelectedCase(null)} onUpdateCase={() => reloadCases()} onSponsor={setSponsorCase} />
      )}
      {showReport && (
        <ReportCaseModal onClose={() => setShowReport(false)} currentUser={currentUser}
          onSubmit={c => { showToast("✅ Case submitted! Admin will review shortly."); setShowReport(false); reloadCases(); }} />
      )}
      {sponsorCase && (
        <SponsorModal c={sponsorCase} onClose={() => setSponsorCase(null)} onConfirm={handleSponsor} currentUser={currentUser} />
      )}
      {showAddUser && (
        <AddUserModal onClose={() => setShowAddUser(false)} onAdd={u => { setUsers(us => [...us, u]); showToast("User added successfully!"); }} />
      )}
      {showExport && (
        <ExportModal cases={cases} onClose={() => setShowExport(false)} />
      )}
      {assignCase && (
        <AssignAgentModal caseItem={assignCase} agents={agents} onClose={() => setAssignCase(null)}
          onDone={handleCaseStatusUpdate} showToast={showToast} />
      )}
      {investigateCase && (
        <InvestigationModal caseItem={investigateCase} onClose={() => setInvestigateCase(null)}
          onDone={handleCaseStatusUpdate} showToast={showToast} />
      )}
      {publishCase && (
        <PublishCaseModal caseItem={publishCase} onClose={() => setPublishCase(null)}
          onDone={handleCaseStatusUpdate} showToast={showToast} />
      )}
      {rejectCase && (
        <RejectCaseModal caseItem={rejectCase} onClose={() => setRejectCase(null)}
          onDone={handleCaseStatusUpdate} showToast={showToast} />
      )}
      {fieldReportCase && (
        <FieldReportModal caseItem={fieldReportCase} onClose={() => setFieldReportCase(null)} />
      )}
      {deliveryAssign && (
        <AssignDeliveryModal caseItem={deliveryAssign} agents={agents}
          onClose={() => setDeliveryAssign(null)}
          onDone={() => { setTimeout(reloadCases, 800); showToast("🚚 Delivery started! Field agent has been notified."); }}
          showToast={showToast} />
      )}
      {deliveryCase && (
        <DeliveryProofModal caseItem={deliveryCase} onClose={() => setDeliveryCase(null)}
          onDone={() => { setTimeout(reloadCases, 800); }} showToast={showToast} />
      )}
      {completeCase && (
        <CompleteCaseModal caseItem={completeCase} onClose={() => setCompleteCase(null)}
          onDone={() => { const id = completeCase.id; setTimeout(reloadCases, 800); setTimeout(() => setFullReportId(id), 400); }}
          showToast={showToast} />
      )}
      {fullReportId && internalRole === "super_admin" && (
        <CaseFullReportModal caseId={fullReportId} onClose={() => setFullReportId(null)} />
      )}

      {/* ── Toast notification ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 16, background: toast.type === "success" ? COLORS.secondary : COLORS.danger, color: "#fff", borderRadius: 14, padding: "12px 20px", boxShadow: "0 8px 32px #0003", fontSize: 14, fontWeight: 700, zIndex: 2000, maxWidth: 360, left: "auto" }}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ textAlign: "center", padding: "20px 24px", color: COLORS.muted, fontSize: 12, borderTop: `1px solid ${COLORS.border}`, background: "#fff", marginTop: 32 }}>
        <strong style={{ color: COLORS.primary }}>🤝 KAFAALE QAAD</strong> · Humanitarian Aid Platform · React + Express + PostgreSQL · Claude AI
        <br />
        <span style={{ fontSize: 11, opacity: 0.7 }}>🔐 JWT Auth · Role-Based Access · AI Sanitization · Field Verification · Audit Trails · Real-Time Notifications</span>
      </div>
    </div>
  );
}
