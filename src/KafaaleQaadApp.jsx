import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { cases as casesApi, admin as adminApi, field as fieldApi, notifications as notifsApi, impact } from "./api/client.js";

// ─── Color Palette & Globals ───────────────────────────────────────────────
const COLORS = {
  primary: "#0B3D91",
  secondary: "#1A6B3C",
  accent: "#E8A020",
  danger: "#C0392B",
  purple: "#6B21A8",
  teal: "#0E7490",
  bg: "#F0F4F8",
  card: "#FFFFFF",
  text: "#1A202C",
  muted: "#6B7280",
  border: "#E2E8F0",
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
  "Completed":            { color: "#6B7280", bg: "#F3F4F6", icon: "🏁" },
  "Archived":             { color: "#374151", bg: "#E5E7EB", icon: "📁" },
};

const URGENCY = { Low: "#10B981", Medium: "#F59E0B", High: "#EF4444", Critical: "#7C3AED" };

// ─── Mock Data ─────────────────────────────────────────────────────────────
const INITIAL_CASES = [
  { id: "C001", victim_name: "Amina Hassan",    age: 34, gender: "Female", description: "Single mother of 4, lost home in flood, urgent shelter needed",      location: "Mogadishu, Hodan",    urgency_level: "Critical", status: "Verified",            created_at: "2026-05-01", reporter_id: "U002", team_id: "T01", findings: "Family confirmed displaced, living in makeshift shelter", media_files: ["photo1.jpg"],               investigation_date: "2026-05-03", sponsor_id: null,   donation_amount: 0,    proof_files: [] },
  { id: "C002", victim_name: "Mohamud Ali",     age: 67, gender: "Male",   description: "Elderly man, chronic illness, needs medication and food support",   location: "Mogadishu, Bondhere", urgency_level: "High",     status: "Waiting Sponsor",     created_at: "2026-05-02", reporter_id: "U003", team_id: "T02", findings: "Medical records verified, critically low on insulin",    media_files: ["photo2.jpg","doc.pdf"],      investigation_date: "2026-05-04", sponsor_id: null,   donation_amount: 0,    proof_files: [] },
  { id: "C003", victim_name: "Fadumo Warsame",  age: 28, gender: "Female", description: "Widow with 3 children, no income source, food insecurity",          location: "Kismayo",             urgency_level: "High",     status: "Sponsored",           created_at: "2026-04-28", reporter_id: "U002", team_id: "T01", findings: "Confirmed widow, children malnourished",                media_files: ["photo3.jpg"],               investigation_date: "2026-04-30", sponsor_id: "S001", donation_amount: 500,  proof_files: [] },
  { id: "C004", victim_name: "Cabdi Xasan",     age: 45, gender: "Male",   description: "Disability, cannot work, family of 6 without support",              location: "Beledweyne",          urgency_level: "Medium",   status: "Aid Delivered",       created_at: "2026-04-20", reporter_id: "U004", team_id: "T03", findings: "Disability confirmed via medical documents",            media_files: ["photo4.jpg"],               investigation_date: "2026-04-22", sponsor_id: "S002", donation_amount: 800,  proof_files: ["receipt.jpg"] },
  { id: "C005", victim_name: "Xalimo Osman",    age: 19, gender: "Female", description: "Orphan, no family support, seeking education and shelter aid",      location: "Mogadishu, Wadajir",  urgency_level: "Medium",   status: "Pending Verification",created_at: "2026-05-10", reporter_id: "U003", team_id: null,  findings: "",                                                      media_files: [],                           investigation_date: null,         sponsor_id: null,   donation_amount: 0,    proof_files: [] },
  { id: "C006", victim_name: "Bashir Nuur",     age: 52, gender: "Male",   description: "Lost livelihood due to drought, 8 dependents",                      location: "Garowe",              urgency_level: "High",     status: "Investigating",       created_at: "2026-05-05", reporter_id: "U002", team_id: "T02", findings: "",                                                      media_files: ["photo6.jpg"],               investigation_date: null,         sponsor_id: null,   donation_amount: 0,    proof_files: [] },
  { id: "C007", victim_name: "Hodan Ismail",    age: 39, gender: "Female", description: "Domestic violence survivor, needs safe housing and counseling",     location: "Hargeisa",            urgency_level: "Critical", status: "Under Review",        created_at: "2026-05-08", reporter_id: "U005", team_id: null,  findings: "",                                                      media_files: [],                           investigation_date: null,         sponsor_id: null,   donation_amount: 0,    proof_files: [] },
  { id: "C008", victim_name: "Mahad Jimcaale",  age: 8,  gender: "Male",   description: "Orphan child, malnutrition, needs immediate nutrition support",     location: "Baidoa",              urgency_level: "Critical", status: "Completed",           created_at: "2026-04-15", reporter_id: "U003", team_id: "T01", findings: "Child confirmed orphan, malnourished",                  media_files: ["photo8.jpg"],               investigation_date: "2026-04-17", sponsor_id: "S003", donation_amount: 1200, proof_files: ["proof1.jpg","proof2.jpg"] },
];

const INITIAL_USERS = [
  { id: "U001", fullname: "Super Admin",        email: "admin@kafaale.so",       role: "super_admin",        phone: "+252611000001", verification_status: "active" },
  { id: "U002", fullname: "Caasha Maxamed",     email: "caasha@reporter.so",     role: "observer",           phone: "+252611000002", verification_status: "active" },
  { id: "U003", fullname: "Cabdirisaaq Yusuf",  email: "cabdi@reporter.so",      role: "observer",           phone: "+252611000003", verification_status: "active" },
  { id: "U004", fullname: "Xaawo Cali",         email: "xaawo@field.so",         role: "field_team",         phone: "+252611000004", verification_status: "active" },
  { id: "U005", fullname: "Maxamuud Ciise",     email: "maxamuud@field.so",      role: "field_team",         phone: "+252611000005", verification_status: "active" },
  { id: "U006", fullname: "Fadumo Nuur",        email: "fadumo@office.so",       role: "verification_office",phone: "+252611000006", verification_status: "active" },
  { id: "U007", fullname: "Ahmed Al-Rashid",    email: "ahmed@donor.com",        role: "donor",              phone: "+9715000001",   verification_status: "active" },
  { id: "U008", fullname: "Sara Kowalski",      email: "sara@ngo.org",           role: "donor",              phone: "+16175000001",  verification_status: "active" },
];

const INITIAL_DONATIONS = [
  { id: "D001", case_id: "C003", sponsor_id: "S001", amount: 500,  payment_method: "Bank Transfer", transaction_status: "completed", paid_at: "2026-05-01" },
  { id: "D002", case_id: "C004", sponsor_id: "S002", amount: 800,  payment_method: "PayPal",        transaction_status: "completed", paid_at: "2026-04-25" },
  { id: "D003", case_id: "C008", sponsor_id: "S003", amount: 1200, payment_method: "Stripe",        transaction_status: "completed", paid_at: "2026-04-20" },
];

const SPONSORS = [
  { id: "S001", user_id: "U007", case_id: "C003", sponsorship_type: "Full Support",  start_date: "2026-05-01", end_date: "2026-08-01", status: "active" },
  { id: "S002", user_id: "U008", case_id: "C004", sponsorship_type: "Partial Help",  start_date: "2026-04-25", end_date: "2026-07-25", status: "active" },
  { id: "S003", user_id: "U007", case_id: "C008", sponsorship_type: "Full Support",  start_date: "2026-04-20", end_date: "2026-07-20", status: "completed" },
];

const NOTIFICATIONS_DATA = [
  { id: 1, icon: "📝", msg: "New case reported by Caasha Maxamed",            time: "2 mins ago",  read: false },
  { id: 2, icon: "✅", msg: "Case C001 verified successfully",                time: "15 mins ago", read: false },
  { id: 3, icon: "❤️", msg: "Case C003 sponsored by Ahmed Al-Rashid ($500)", time: "1 hour ago",  read: true  },
  { id: 4, icon: "🚨", msg: "Critical case C007 requires immediate attention",time: "2 hours ago", read: false },
  { id: 5, icon: "📦", msg: "Aid delivery completed for Case C008",           time: "3 hours ago", read: true  },
];

// ─── WORKFLOW STEPS ────────────────────────────────────────────────────────
const WORKFLOW_STEPS = [
  { num: 1, label: "Report Creation",    status: "Pending Verification", color: "#3B82F6", icon: "📝" },
  { num: 2, label: "Verification Office",status: "Under Review",         color: "#8B5CF6", icon: "🏛️" },
  { num: 3, label: "Field Investigation",status: "Investigating",        color: "#F59E0B", icon: "🔍" },
  { num: 4, label: "Verified",           status: "Verified",             color: "#10B981", icon: "✅" },
  { num: 5, label: "Donor Queue",        status: "Waiting Sponsor",      color: "#EC4899", icon: "👥" },
  { num: 6, label: "Sponsorship",        status: "Sponsored",            color: "#EF4444", icon: "❤️" },
  { num: 7, label: "Aid Delivery",       status: "Aid Delivered",        color: "#06B6D4", icon: "📦" },
  { num: 8, label: "Completed",          status: "Completed",            color: "#6B7280", icon: "🏁" },
];

// ─── HELPER COMPONENTS ─────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const s = STATUS_MAP[status] || { color: "#6B7280", bg: "#F3F4F6", icon: "○" };
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

const Modal = ({ title, children, onClose, wide }) => (
  <div style={{ position: "fixed", inset: 0, background: "#0006", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
    <div style={{ background: "#fff", borderRadius: 18, padding: 32, maxWidth: wide ? 900 : 640, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px #0003" }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: COLORS.text }}>{title}</h2>
        <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 20, color: COLORS.muted }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
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
  const [form, setForm] = useState({ victim_name: "", age: "", gender: "Female", description: "", location: "", urgency_level: "Medium" });
  const [reportPhotos, setReportPhotos] = useState([]);
  const [reportVideos, setReportVideos] = useState([]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.victim_name || !form.description || !form.location) return alert("Please fill all required fields");
    const newCase = {
      id: "C" + String(Math.floor(Math.random() * 9000) + 1000),
      ...form, age: parseInt(form.age) || 0,
      status: "Pending Verification",
      created_at: new Date().toISOString().split("T")[0],
      reporter_id: currentUser.id, team_id: null,
      findings: "",
      media_files: [
        ...reportPhotos.map(f => f.name),
        ...reportVideos.map(f => f.name),
      ],
      investigation_date: null,
      sponsor_id: null, donation_amount: 0, proof_files: [],
    };
    onSubmit(newCase);
    onClose();
  };

  const totalFiles = reportPhotos.length + reportVideos.length;

  return (
    <Modal title="📝 Report New Case" onClose={onClose}>
      <Input label="Victim Full Name *" value={form.victim_name} onChange={e => set("victim_name", e.target.value)} placeholder="Enter full name" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input label="Age" type="number" value={form.age} onChange={e => set("age", e.target.value)} placeholder="Age" />
        <Select label="Gender" value={form.gender} onChange={e => set("gender", e.target.value)}>
          <option>Female</option><option>Male</option><option>Other</option>
        </Select>
      </div>
      <Input label="Location *" value={form.location} onChange={e => set("location", e.target.value)} placeholder="City, District" />
      <Select label="Urgency Level" value={form.urgency_level} onChange={e => set("urgency_level", e.target.value)}>
        <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
      </Select>
      <Textarea label="Description *" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the situation in detail..." style={{ minHeight: 100 }} />

      {/* ── FILE UPLOADS ── */}
      <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.primary, marginBottom: 4 }}>📎 Attach Supporting Evidence (Optional)</div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 14 }}>Photos or videos that support the case — family situation, shelter, documents etc.</div>
        <FileUploadZone
          label="📸 Photos"
          accept="image/*"
          files={reportPhotos}
          onAdd={f => setReportPhotos(p => [...p, ...f])}
          onRemove={i => setReportPhotos(p => p.filter((_, idx) => idx !== i))}
          note="Case photos — shelter, family, situation"
          color={COLORS.primary}
        />
        <FileUploadZone
          label="🎥 Videos (Optional)"
          accept="video/*"
          files={reportVideos}
          onAdd={f => setReportVideos(p => [...p, ...f])}
          onRemove={i => setReportVideos(p => p.filter((_, idx) => idx !== i))}
          note="Short video showing the situation"
          color="#8B5CF6"
        />
        {totalFiles > 0 && (
          <div style={{ fontSize: 12, color: COLORS.secondary, fontWeight: 600, marginTop: 4 }}>
            ✅ {totalFiles} file{totalFiles > 1 ? "s" : ""} ready to attach
          </div>
        )}
      </div>

      <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: "#92400E" }}>
        📋 After submission, Verification Office will review the case. Status: <strong>Pending Verification</strong>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="primary" onClick={handleSubmit} style={{ flex: 1 }}>Submit Report</Btn>
        <Btn variant="muted" onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
};

// ─── SPONSOR MODAL ─────────────────────────────────────────────────────────
const SponsorModal = ({ c, onClose, onConfirm, currentUser }) => {
  const [type,   setType]   = useState("Full Support");
  const [method, setMethod] = useState("Bank Transfer");
  const [amount, setAmount] = useState("");
  const AMOUNTS = { "Full Support": 800, "Partial Help": 400, "Sponsor Now": 200 };

  return (
    <Modal title={`❤️ Sponsor: ${c.victim_name}`} onClose={onClose}>
      <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 14, color: COLORS.secondary, lineHeight: 1.7 }}>
          <strong>{c.victim_name}</strong> · {c.age} yrs · {c.location}<br />{c.description}
        </div>
        <div style={{ marginTop: 8 }}><UrgencyBadge level={c.urgency_level} /></div>
      </div>
      <Select label="Sponsorship Type" value={type} onChange={e => { setType(e.target.value); setAmount(AMOUNTS[e.target.value]); }}>
        <option>Full Support</option><option>Partial Help</option><option>Sponsor Now</option>
      </Select>
      <Input label="Amount (USD)" type="number" value={amount || AMOUNTS[type]} onChange={e => setAmount(e.target.value)} />
      <Select label="Payment Method" value={method} onChange={e => setMethod(e.target.value)}>
        <option>Bank Transfer</option><option>PayPal</option><option>Stripe</option><option>Ama Gateway</option>
      </Select>
      <div style={{ background: "#EFF6FF", borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, color: COLORS.primary }}>
        <strong>Sponsorship Routes:</strong><br />
        <strong>A. Direct:</strong> Donation goes directly to the beneficiary<br />
        <strong>B. Office Managed:</strong> Office handles distribution with proof
      </div>
      <Select label="Sponsorship Route">
        <option value="direct">A. Direct Sponsorship</option>
        <option value="office">B. Office Managed (Recommended)</option>
      </Select>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="accent" onClick={() => { onConfirm(c.id, { type, method, amount: parseInt(amount) || AMOUNTS[type], sponsor_id: currentUser.id }); onClose(); }} style={{ flex: 1 }}>
          ❤️ Confirm Sponsorship
        </Btn>
        <Btn variant="muted" onClick={onClose}>Cancel</Btn>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
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
const NotificationsDropdown = ({ onClose }) => (
  <div style={{ position: "absolute", top: 56, right: 0, background: "#fff", borderRadius: 16, width: 360, boxShadow: "0 16px 48px #0003", zIndex: 500, border: `1px solid ${COLORS.border}` }}>
    <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ fontWeight: 800, fontSize: 15 }}>🔔 Notifications</div>
      <span style={{ background: "#EF4444", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
        {NOTIFICATIONS_DATA.filter(n => !n.read).length}
      </span>
    </div>
    {NOTIFICATIONS_DATA.map((n, i) => (
      <div key={n.id} style={{ padding: "12px 20px", borderBottom: i < NOTIFICATIONS_DATA.length - 1 ? `1px solid ${COLORS.border}` : "none", display: "flex", gap: 12, background: n.read ? "#fff" : "#F0F9FF", cursor: "pointer" }}>
        <div style={{ fontSize: 20, flexShrink: 0 }}>{n.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: COLORS.text }}>{n.msg}</div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{n.time}</div>
        </div>
        {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.primary, flexShrink: 0, marginTop: 5 }} />}
      </div>
    ))}
    <div style={{ padding: "12px 20px", textAlign: "center" }}>
      <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.primary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Mark all as read</button>
    </div>
  </div>
);

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
          { val: totalCases,             label: "Total Cases",      sub: "↑ 12% this month", grad: "135deg, #0B3D91 0%, #1A6B3C 100%" },
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
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
const CaseTable = ({ cases, onView, compact }) => (
  <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px #0001" }}>
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
                <Btn variant="ghost" size="sm" onClick={() => onView(c)}>View →</Btn>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

// ─── ROLE DASHBOARDS ─────────────────────────────────────────────────────────
const ObserverDashboard = ({ cases, currentUser, onReport, onViewCase }) => {
  const myCases = cases.filter(c => c.reporter_id === currentUser.id);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>📝 Reporter Dashboard</h2>
          <p style={{ margin: "4px 0 0", color: COLORS.muted }}>Welcome, {currentUser.fullname} — Ku soo dhawoow</p>
        </div>
        <Btn variant="primary" onClick={onReport}>+ New Report</Btn>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="My Reports"   value={myCases.length}                                               icon="📋" color={COLORS.primary} />
        <StatCard label="Pending"      value={myCases.filter(c => c.status === "Pending Verification").length} icon="⏳" color="#F59E0B" />
        <StatCard label="Verified"     value={myCases.filter(c => ["Verified","Completed"].includes(c.status)).length} icon="✅" color={COLORS.secondary} />
        <StatCard label="Sponsored"    value={myCases.filter(c => c.sponsor_id).length}                       icon="❤️" color="#EC4899" />
      </div>
      <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>My Submitted Cases</h3>
      <CaseTable cases={myCases} onView={onViewCase} />
    </div>
  );
};

const VerificationDashboard = ({ cases, onViewCase }) => {
  const pending = cases.filter(c => c.status === "Pending Verification");
  const review  = cases.filter(c => c.status === "Under Review");
  return (
    <div>
      <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800 }}>🏛️ Verification Dashboard</h2>
      <p style={{ margin: "0 0 24px", color: COLORS.muted }}>Review and process incoming case reports</p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Pending"      value={pending.length}                                          icon="⏳" color="#F59E0B" />
        <StatCard label="Under Review" value={review.length}                                           icon="🔍" color="#3B82F6" />
        <StatCard label="Investigating" value={cases.filter(c => c.status === "Investigating").length} icon="🕵️" color="#8B5CF6" />
        <StatCard label="Verified"     value={cases.filter(c => c.status === "Verified").length}       icon="✅" color={COLORS.secondary} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#F59E0B" }}>⏳ Pending ({pending.length})</h3>
          <CaseTable cases={pending} onView={onViewCase} compact />
        </div>
        <div>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#3B82F6" }}>🔍 Under Review ({review.length})</h3>
          <CaseTable cases={review} onView={onViewCase} compact />
        </div>
      </div>
      <h3 style={{ margin: "24px 0 12px", fontSize: 16, fontWeight: 700 }}>All Cases</h3>
      <CaseTable cases={cases} onView={onViewCase} />
    </div>
  );
};

const FieldTeamDashboard = ({ cases, onViewCase }) => {
  const assigned = cases.filter(c => (c.status === "Investigating" || c.status === "Sponsored") && c.team_id);
  return (
    <div>
      <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800 }}>🗺️ Field Team Dashboard</h2>
      <p style={{ margin: "0 0 24px", color: COLORS.muted }}>Your assigned missions and investigations</p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Active Missions" value={assigned.length}                                          icon="📍" color={COLORS.primary} />
        <StatCard label="Investigating"   value={cases.filter(c => c.status === "Investigating").length}   icon="🔍" color="#8B5CF6" />
        <StatCard label="To Deliver"      value={cases.filter(c => c.status === "Sponsored").length}       icon="📦" color="#EC4899" />
        <StatCard label="Delivered"       value={cases.filter(c => c.status === "Aid Delivered").length}   icon="✅" color={COLORS.secondary} />
      </div>

      <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>🎯 Active Missions</h3>
      <CaseTable cases={assigned} onView={onViewCase} />

      <div style={{ background: "#EFF6FF", borderRadius: 14, padding: 20, marginTop: 24 }}>
        <h4 style={{ margin: "0 0 16px", color: COLORS.primary, fontSize: 15, fontWeight: 700 }}>📡 GPS Mission Map</h4>
        {assigned.length === 0 ? (
          <div style={{ textAlign: "center", color: COLORS.muted, padding: 20 }}>No active GPS missions</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {assigned.map(c => (
              <div key={c.id} style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 6px #0001", border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary }}>{c.id}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{c.victim_name}</div>
                <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>📍 {c.location}</div>
                <div style={{ marginTop: 8 }}><Badge status={c.status} /></div>
                <Btn variant="primary" size="sm" style={{ marginTop: 10, width: "100%" }} onClick={() => onViewCase(c)}>Open Case →</Btn>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DonorDashboard = ({ cases, donations, sponsors, currentUser, onViewCase, onSponsor }) => {
  const available  = cases.filter(c => c.status === "Waiting Sponsor");
  const mySponsors = sponsors.filter(s => s.user_id === currentUser.id);
  const myDonations = donations.filter(d => d.sponsor_id === currentUser.id);
  const myTotal    = myDonations.reduce((a, d) => a + d.amount, 0);
  return (
    <div>
      <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800 }}>❤️ Donor Dashboard</h2>
      <p style={{ margin: "0 0 24px", color: COLORS.muted }}>Make a difference — sponsor a case today</p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Available Cases"  value={available.length}    icon="📋" color={COLORS.primary} />
        <StatCard label="My Sponsorships"  value={mySponsors.length}   icon="❤️" color="#EC4899" />
        <StatCard label="Total Donated"    value={`$${myTotal}`}       icon="💰" color={COLORS.secondary} />
        <StatCard label="Impact Reports"   value={mySponsors.filter(s => s.status === "completed").length} icon="📊" color={COLORS.accent} />
      </div>

      <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#EC4899" }}>💝 Cases Awaiting Your Support</h3>
      {available.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: 40, textAlign: "center", color: COLORS.muted, boxShadow: "0 2px 8px #0001" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
          All cases are currently sponsored! Check back soon.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
          {available.map(c => (
            <div key={c.id} style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 12px #0001", border: "1px solid #FCE7F3" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{c.victim_name}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted }}>{c.age} yrs · {c.gender} · 📍 {c.location}</div>
                </div>
                <UrgencyBadge level={c.urgency_level} />
              </div>
              <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.5, margin: "0 0 16px" }}>{c.description.slice(0, 100)}…</p>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="ghost" size="sm" onClick={() => onViewCase(c)} style={{ flex: 1 }}>View Details</Btn>
                <Btn variant="accent" size="sm" onClick={() => onSponsor(c)} style={{ flex: 1 }}>❤️ Sponsor</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>My Donation History</h3>
      <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px #0001" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              {["Date","Case","Amount","Method","Status"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {myDonations.map(d => (
              <tr key={d.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: "12px 16px", fontSize: 13 }}>{d.paid_at}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: COLORS.primary }}>{d.case_id}</td>
                <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 800, color: COLORS.secondary }}>${d.amount}</td>
                <td style={{ padding: "12px 16px", fontSize: 13 }}>{d.payment_method}</td>
                <td style={{ padding: "12px 16px" }}><span style={{ background: "#D1FAE5", color: "#065F46", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{d.transaction_status}</span></td>
              </tr>
            ))}
            {myDonations.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: COLORS.muted, fontSize: 14 }}>No donations yet. Sponsor a case to get started! 💝</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminDashboard = ({ cases, users, donations, sponsors, onViewCase, onAddUser, onExport }) => {
  const [tab, setTab] = useState("overview");
  const totalDonated = donations.reduce((a, d) => a + d.amount, 0);
  const byStatus = WORKFLOW_STEPS.reduce((acc, s) => { acc[s.status] = cases.filter(c => c.status === s.status).length; return acc; }, {});
  const pendingCases = cases.filter(c => ["Pending Verification","Under Review","Investigating"].includes(c.status));

  const TABS = [
    { id: "overview",  label: "🏠 Overview"  },
    { id: "analytics", label: "📊 Analytics" },
    { id: "users",     label: "👥 Users"     },
    { id: "cases",     label: "📋 All Cases" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🛡️ Admin Command Center</h2>
          <p style={{ margin: "4px 0 0", color: COLORS.muted }}>Full system oversight & management</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="teal" onClick={onExport}>📥 Export Data</Btn>
          <Btn variant="primary" onClick={onAddUser}>+ Add User</Btn>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, borderBottom: `2px solid ${COLORS.border}`, marginBottom: 28 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "10px 20px", fontSize: 14, fontWeight: 700, border: "none", background: "none", cursor: "pointer", color: tab === t.id ? COLORS.primary : COLORS.muted, borderBottom: tab === t.id ? `2px solid ${COLORS.primary}` : "2px solid transparent", marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
            <StatCard label="Total Cases"   value={cases.length}    icon="📋" color={COLORS.primary} />
            <StatCard label="Total Users"   value={users.length}    icon="👥" color="#8B5CF6" />
            <StatCard label="Total Donated" value={`$${totalDonated.toLocaleString()}`} icon="💰" color={COLORS.secondary} />
            <StatCard label="Completed"     value={cases.filter(c => c.status === "Completed").length} icon="🏁" color="#6B7280" />
          </div>

          {/* Case Pipeline */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 8px #0001", marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>📊 Live Case Pipeline</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {WORKFLOW_STEPS.map(s => (
                <div key={s.num} style={{ textAlign: "center", background: s.color + "12", borderRadius: 12, padding: "16px 8px", border: `1px solid ${s.color}30` }}>
                  <div style={{ fontSize: 24 }}>{s.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 4 }}>{byStatus[s.status] || 0}</div>
                  <div style={{ fontSize: 10, color: s.color, fontWeight: 700, marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>🚨 Needs Attention</h3>
              <CaseTable cases={pendingCases.slice(0,4)} onView={onViewCase} compact />
            </div>
            <div>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>💰 Recent Donations</h3>
              <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px #0001" }}>
                {donations.map((d, i) => (
                  <div key={d.id} style={{ padding: "12px 16px", borderBottom: i < donations.length - 1 ? `1px solid ${COLORS.border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Case {d.case_id} · {d.payment_method}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>{d.paid_at}</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.secondary }}>${d.amount}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "analytics" && <AnalyticsDashboard cases={cases} donations={donations} users={users} />}

      {tab === "users" && (
        <div>
          <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px #0001" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["ID","Name","Email","Phone","Role","Status"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? `1px solid ${COLORS.border}` : "none" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: COLORS.muted }}>{u.id}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 700 }}>{u.fullname}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.muted }}>{u.email}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>{u.phone}</td>
                    <td style={{ padding: "12px 16px" }}><span style={{ background: COLORS.primary + "15", color: COLORS.primary, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{u.role.replace(/_/g, " ")}</span></td>
                    <td style={{ padding: "12px 16px" }}><span style={{ background: "#D1FAE5", color: "#065F46", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>● Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "cases" && (
        <div>
          <CaseTable cases={cases} onView={onViewCase} />
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

  // Map real backend role → internal dashboard role
  const internalRole = authUser ? (ROLE_MAP[authUser.role] || "observer") : null;

  const [cases,        setCases]        = useState(INITIAL_CASES);
  const [users,        setUsers]        = useState(INITIAL_USERS);
  const [donations,    setDonations]    = useState(INITIAL_DONATIONS);
  const [sponsors,     setSponsors]     = useState(SPONSORS);
  const [notifs,       setNotifs]       = useState(NOTIFICATIONS_DATA);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showReport,   setShowReport]   = useState(false);
  const [sponsorCase,  setSponsorCase]  = useState(null);
  const [showAddUser,  setShowAddUser]  = useState(false);
  const [showExport,   setShowExport]   = useState(false);
  const [showNotifs,   setShowNotifs]   = useState(false);
  const [toast,        setToast]        = useState(null);
  const [searchTerm,   setSearchTerm]   = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [apiLoading,   setApiLoading]   = useState(false);

  // ─── Redirect if not logged in ─────────────────────────────────────────
  useEffect(() => {
    if (!authUser) {
      navigate("/login");
    }
  }, [authUser, navigate]);

  // ─── Build currentUser from real auth + mock fields ────────────────────
  const currentUser = authUser ? {
    id:                  authUser.id,
    fullname:            authUser.name,
    email:               authUser.email,
    role:                internalRole,
    realRole:            authUser.role,
    phone:               authUser.phone || "",
    verification_status: "active",
  } : null;

  // ─── Load real data from API ────────────────────────────────────────────
  useEffect(() => {
    if (!authUser) return;
    setApiLoading(true);

    // Load cases based on role
    const loadCases = async () => {
      try {
        if (["admin","super_admin"].includes(authUser.role)) {
          // Admin sees all cases with private data
          const data = await adminApi.cases({ limit: 50 });
          if (data?.cases) {
            const mapped = data.cases.map(c => ({
              id: c.id,
              victim_name: c.privateVictimName || c.publicTitle || "Pending Review",
              age: c.privateVictimAge || null,
              gender: c.privateVictimGender || "—",
              description: c.privateDescription || c.publicStory || "",
              location: c.publicCity || c.privateAddress?.split(",").slice(-2).join(",").trim() || "Somalia",
              urgency_level: c.emergencyLevel ? c.emergencyLevel.charAt(0).toUpperCase() + c.emergencyLevel.slice(1) : "Medium",
              status: STATUS_API_MAP[c.status] || c.status,
              created_at: c.createdAt?.slice(0,10) || "",
              reporter_id: c.reporterId,
              team_id: c.assignedAgentId,
              findings: c.fieldInvestigation?.officialNotes || "",
              media_files: [],
              investigation_date: c.investigationCompletedAt?.slice(0,10) || null,
              sponsor_id: null,
              donation_amount: c.totalRaised || 0,
              proof_files: [],
              _raw: c,
            }));
            setCases(mapped);
          }
        } else if (authUser.role === "reporter") {
          // Reporter sees only their own cases
          const data = await casesApi.my();
          if (Array.isArray(data)) {
            const mapped = data.map(c => ({
              id: c.id,
              victim_name: c.publicTitle || "My Case",
              description: c.privateDescription || "",
              location: "—",
              urgency_level: c.emergencyLevel ? c.emergencyLevel.charAt(0).toUpperCase() + c.emergencyLevel.slice(1) : "Medium",
              status: STATUS_API_MAP[c.status] || "Pending Verification",
              created_at: c.createdAt?.slice(0,10) || "",
              reporter_id: authUser.id,
              team_id: null,
              donation_amount: c.totalRaised || 0,
              media_files: [], proof_files: [], _raw: c,
            }));
            setCases(mapped);
          }
        } else if (authUser.role === "field_agent") {
          // Field agent sees assigned cases
          const data = await fieldApi.assignments();
          if (Array.isArray(data)) {
            const mapped = data.map(c => ({
              id: c.id,
              victim_name: c.privateVictimName || "Assigned Case",
              description: c.privateDescription || "",
              location: c.privateAddress?.split(",").slice(-2).join(",").trim() || "Somalia",
              urgency_level: c.emergencyLevel ? c.emergencyLevel.charAt(0).toUpperCase() + c.emergencyLevel.slice(1) : "High",
              status: STATUS_API_MAP[c.status] || "Investigating",
              created_at: c.createdAt?.slice(0,10) || "",
              reporter_id: c.reporterId,
              team_id: c.assignedAgentId,
              findings: c.fieldInvestigation?.officialNotes || "",
              media_files: [], proof_files: [], _raw: c,
            }));
            setCases(mapped);
          }
        } else if (authUser.role === "donor") {
          // Donor sees public cases
          const data = await casesApi.list({ limit: 20 });
          if (data?.cases) {
            const mapped = data.cases.map(c => ({
              id: c.id,
              victim_name: c.publicTitle || "Verified Case",
              description: c.publicStory || "",
              location: c.publicCity || "Somalia",
              urgency_level: c.emergencyLevel ? c.emergencyLevel.charAt(0).toUpperCase() + c.emergencyLevel.slice(1) : "Medium",
              status: STATUS_API_MAP[c.status] || "Waiting Sponsor",
              created_at: c.adminPublishedAt?.slice(0,10) || "",
              reporter_id: null, team_id: null,
              donation_amount: c.totalRaised || 0,
              target_goal: c.targetGoal || 0,
              media_files: [], proof_files: [], _raw: c,
            }));
            setCases(mapped);
          }
        }
      } catch (e) {
        // Fallback to mock data if API fails
      } finally { setApiLoading(false); }
    };

    loadCases();
  }, [authUser]);

  // API status → display status mapping
  const STATUS_API_MAP = {
    pending_review:          "Pending Verification",
    team_assigned:           "Under Review",
    investigating:           "Investigating",
    investigation_completed: "Awaiting Approval",
    ai_sanitized:            "Awaiting Approval",
    waiting_for_sponsor:     "Waiting Sponsor",
    sponsored:               "Sponsored",
    delivering:              "Aid Delivered",
    proof_uploaded:          "Aid Delivered",
    completed:               "Completed",
    rejected:                "Archived",
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleUpdateCase = (id, updates) => {
    setCases(cs => cs.map(c => c.id === id ? { ...c, ...updates } : c));
    showToast(`Case ${id} → ${updates.status || "updated"} ✓`);
  };

  const handleSponsor = (caseId, details) => {
    const caseItem = cases.find(c => c.id === caseId);
    const newDonation = { id: "D" + String(Math.floor(Math.random() * 9000) + 100), case_id: caseId, sponsor_id: currentUser.id, amount: details.amount, payment_method: details.method, transaction_status: "completed", paid_at: new Date().toISOString().split("T")[0] };
    const newSponsor  = { id: "S" + String(Math.floor(Math.random() * 9000) + 100), user_id: currentUser.id, case_id: caseId, sponsorship_type: details.type, start_date: new Date().toISOString().split("T")[0], end_date: "", status: "active" };
    setDonations(d => [...d, newDonation]);
    setSponsors(s => [...s, newSponsor]);
    setCases(cs => cs.map(c => c.id === caseId ? { ...c, status: "Sponsored", sponsor_id: currentUser.id, donation_amount: details.amount } : c));
    showToast(`🎉 Thank you! ${caseItem?.victim_name} is now sponsored.`);
  };

  const handleLogout = () => { logout(); navigate("/"); };

  const filteredCases = cases.filter(c => {
    const searchVal = searchTerm.toLowerCase();
    const matchSearch = !searchTerm
      || (c.victim_name || "").toLowerCase().includes(searchVal)
      || (c.location || "").toLowerCase().includes(searchVal)
      || (c.id || "").toLowerCase().includes(searchVal);
    const matchStatus = filterStatus === "All" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const unreadCount = notifs.filter(n => !n.read).length;

  // ─── Guard: still loading auth ─────────────────────────────────────────
  if (!authUser || !currentUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤝</div>
          <div style={{ fontSize: 18, color: COLORS.muted }}>Loading Kafaale Qaad...</div>
        </div>
      </div>
    );
  }

  const roleInfo = ROLE_LABELS[internalRole] || { icon: "👤", label: "User" };

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

  // ─── ROLE DASHBOARDS MAP (locked to real role) ──────────────────────────
  const ROLE_DASHBOARDS = {
    observer:            <ObserverDashboard cases={filteredCases} currentUser={currentUser} onReport={() => setShowReport(true)} onViewCase={setSelectedCase} />,
    verification_office: <VerificationDashboard cases={filteredCases} onViewCase={setSelectedCase} />,
    field_team:          <FieldTeamDashboard cases={filteredCases} currentUser={currentUser} onViewCase={setSelectedCase} />,
    donor:               <DonorDashboard cases={filteredCases} donations={donations} sponsors={sponsors} currentUser={currentUser} onViewCase={setSelectedCase} onSponsor={setSponsorCase} />,
    super_admin:         <AdminDashboard cases={filteredCases} users={users} donations={donations} sponsors={sponsors} onViewCase={setSelectedCase} onAddUser={() => setShowAddUser(true)} onExport={() => setShowExport(true)} />,
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ background: COLORS.primary, color: "#fff", padding: "0 24px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px #0003" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <span style={{ fontSize: 26 }}>🤝</span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: -0.5 }}>KAFAALE QAAD</div>
              <div style={{ fontSize: 9, opacity: 0.65, letterSpacing: 1 }}>HUMANITARIAN AID PLATFORM</div>
            </div>
          </div>

          {/* Search + filter */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, maxWidth: 480, margin: "0 20px" }}>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="🔍  Search cases by name, location, ID…"
              style={{ flex: 1, padding: "8px 14px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 13, outline: "none" }} />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 12, outline: "none" }}>
              <option value="All">All Status</option>
              {Object.keys(STATUS_MAP).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Notifications bell */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowNotifs(v => !v)}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, width: 38, height: 38, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                🔔
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, background: "#EF4444", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid " + COLORS.primary }}>
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && <NotificationsDropdown onClose={() => setShowNotifs(false)} />}
            </div>

            {/* User avatar */}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{currentUser.fullname}</div>
              <div style={{ fontSize: 9, opacity: 0.65, letterSpacing: 0.5 }}>{currentUser.role.replace(/_/g, " ").toUpperCase()}</div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              {currentUser.role === "super_admin" ? "🛡️" : currentUser.role === "donor" ? "❤️" : currentUser.role === "field_team" ? "🗺️" : currentUser.role === "verification_office" ? "🏛️" : "👁️"}
            </div>
            <Btn variant="muted" size="sm" onClick={handleLogout}>Sign Out</Btn>
          </div>
        </div>
      </div>

      {/* ── Workflow Status Banner ── */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${COLORS.border}`, padding: "10px 24px", overflowX: "auto" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, marginRight: 8, whiteSpace: "nowrap" }}>PIPELINE:</span>
          {WORKFLOW_STEPS.map((s, i) => {
            const count = cases.filter(c => c.status === s.status).length;
            return (
              <div key={s.num} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, background: count > 0 ? s.color + "15" : "#F3F4F6", border: `1px solid ${count > 0 ? s.color + "40" : COLORS.border}`, borderRadius: 20, padding: "4px 10px", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                  <span style={{ fontSize: 12 }}>{s.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: count > 0 ? s.color : COLORS.muted }}>{s.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: count > 0 ? s.color : COLORS.border, borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>{count}</span>
                </div>
                {i < WORKFLOW_STEPS.length - 1 && <span style={{ color: COLORS.border, fontSize: 14 }}>→</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: 28 }}>
        {ROLE_DASHBOARDS[currentUser.role] || ROLE_DASHBOARDS.observer}
      </div>

      {/* ── Modals ── */}
      {selectedCase && (
        <CaseDetailModal c={selectedCase} currentUser={currentUser} onClose={() => setSelectedCase(null)} onUpdateCase={handleUpdateCase} onSponsor={setSponsorCase} />
      )}
      {showReport && (
        <ReportCaseModal onClose={() => setShowReport(false)} onSubmit={c => { setCases(cs => [c, ...cs]); showToast("Case submitted! Awaiting verification."); }} currentUser={currentUser} />
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

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, background: toast.type === "success" ? COLORS.secondary : COLORS.danger, color: "#fff", borderRadius: 14, padding: "14px 22px", boxShadow: "0 8px 32px #0003", fontSize: 14, fontWeight: 700, zIndex: 2000, maxWidth: 380, animation: "slideIn 0.2s ease" }}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ textAlign: "center", padding: "20px 24px", color: COLORS.muted, fontSize: 12, borderTop: `1px solid ${COLORS.border}`, background: "#fff", marginTop: 32 }}>
        <strong style={{ color: COLORS.primary }}>🤝 KAFAALE QAAD</strong> · Qaabka Isku Xirka System-ka · React + NestJS + PostgreSQL + Supabase · AWS Cloud
        <br />
        <span style={{ fontSize: 11, opacity: 0.7 }}>🔐 OTP Login · ID Verification · Face Verification · Encrypted Payments · Role-Based Access · AI Fraud Detection · Audit Trails</span>
      </div>
    </div>
  );
}
