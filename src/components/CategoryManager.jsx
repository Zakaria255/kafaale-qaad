import { useState } from "react";
import { CAT_GROUPS, useCategory } from "../utils/categories.js";

const C = {
  primary: "#004B96", border: "#D8E4F0", muted: "#5A6E8A", text: "#0D1F3C",
  danger: "#C0392B", card: "#fff", bg: "#F8FAFC",
};

// Inline admin panel to add / remove entries of one category group.
// Usage: <CategoryManager group="stories" />  (gate with your own isAdmin check)
export default function CategoryManager({ group, title, style }) {
  const def = CAT_GROUPS[group];
  const [list, { add, remove }] = useCategory(group);
  const [name, setName] = useState("");
  const [type, setType] = useState("emergency");
  if (!def) return null;

  const labelOf = (item) => (def.kind === "string" ? item : item.label);
  const keyOf = (item) => (def.kind === "string" ? item : item.value);

  const submit = () => {
    if (!name.trim()) return;
    add(name, def.hasType ? { type } : undefined);
    setName("");
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", ...style }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 10 }}>
        Manage {title || def.label}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {list.map((item) => (
          <span key={keyOf(item)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 6px 5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: `1.5px solid ${C.border}`, background: C.bg, color: C.text }}>
            {labelOf(item)}
            {def.hasType && <span style={{ opacity: 0.55, fontWeight: 500 }}>· {item.type}</span>}
            <button onClick={() => remove(item)} title={`Remove "${labelOf(item)}"`}
              style={{ width: 20, height: 20, borderRadius: "50%", background: C.danger, color: "#fff", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>✕</button>
          </span>
        ))}
        {list.length === 0 && <span style={{ fontSize: 12, color: C.muted }}>No items yet — add one below.</span>}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
          placeholder={`New ${(title || def.label).toLowerCase()}…`}
          style={{ flex: "1 1 160px", minWidth: 0, padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit" }} />
        {def.hasType && (
          <select value={type} onChange={(e) => setType(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", background: "#fff", cursor: "pointer" }}>
            <option value="child_support">Child support</option>
            <option value="emergency">Emergency</option>
          </select>
        )}
        <button onClick={submit}
          style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: C.primary, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add</button>
      </div>
    </div>
  );
}
