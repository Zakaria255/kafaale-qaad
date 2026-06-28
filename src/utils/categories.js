import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Central editable category registry.
// Every category list in the system is defined here with its defaults and is
// persisted in localStorage so admins can add / remove entries (see
// <CategoryManager/>). Consumers read a list via useCategory(key) or getCat(key).
//
//  kind: "string" → list is an array of plain strings.
//  kind: "object" → list is an array of { value, label, ...extra } objects.
//                   `value` is an auto-generated stable slug; logic keys off it.
//                   hasType: object items also carry a `type` (used by the case
//                   pipeline branching). hasDesc: items carry a short `desc`.
// ─────────────────────────────────────────────────────────────────────────────

export const CAT_GROUPS = {
  stories: {
    label: "Story Categories", kind: "string",
    defaults: ["Medical", "Shelter", "Education", "Food", "Water", "Orphan", "Emergency", "Other"],
  },
  updates: {
    label: "Update Types", kind: "string",
    defaults: ["Disaster", "Flood", "Drought", "Emergency", "Conflict", "Disease", "General"],
  },
  partnerTypes: {
    label: "Partner Organisation Types", kind: "string",
    defaults: [
      "International NGO", "Local NGO", "Government Agency", "UN Agency / Intergovernmental",
      "Religious Organization", "Foundation", "Corporate CSR / Business",
      "Academic / Research Institution", "Healthcare Organization", "Humanitarian Response Network",
      "Diaspora Organization", "Media Organization", "Community Group / CBO", "Social Enterprise",
      "Advocacy & Policy Organization", "Red Cross / Red Crescent", "Other",
    ],
  },
  report: {
    label: "Report / Case Categories", kind: "object", hasType: true, hasDesc: true,
    defaults: [
      { value: "child_support",  label: "👶 Child Support",     type: "child_support", desc: "Orphan, vulnerable child needing long-term support" },
      { value: "education",      label: "🎓 Education Support",  type: "child_support", desc: "Child needing school fees, books, uniforms" },
      { value: "orphan",         label: "🏠 Orphan Care",        type: "child_support", desc: "Child with no parents or guardian support" },
      { value: "medical",        label: "🩺 Medical Support",    type: "child_support", desc: "Child needing ongoing medical treatment" },
      { value: "family_support", label: "👨‍👩‍👧 Family Support",   type: "child_support", desc: "Vulnerable family needing monthly support" },
      { value: "food",           label: "🍚 Food Emergency",     type: "emergency",     desc: "Urgent food insecurity — immediate help needed" },
      { value: "shelter",        label: "🏚️ Emergency Shelter",  type: "emergency",     desc: "Displacement, flooding, structural damage" },
      { value: "disaster",       label: "🌊 Disaster Relief",    type: "emergency",     desc: "Natural disaster, crisis, urgent relief" },
      { value: "other",          label: "📌 Other",              type: "emergency",     desc: "Anything not covered above" },
    ],
  },
  programTypes: {
    label: "Program Types", kind: "object",
    defaults: [
      { value: "child_sponsorship", label: "👶 Child Sponsorship" },
      { value: "education",         label: "🎓 Education" },
      { value: "medical",           label: "🩺 Medical" },
      { value: "family_care",       label: "🏠 Family Care" },
      { value: "nutrition",         label: "🍎 Nutrition" },
      { value: "emergency_relief",  label: "🚨 Emergency Relief" },
    ],
  },
  projectCats: {
    label: "Project Categories", kind: "object",
    defaults: [
      { value: "water",       label: "Water" },
      { value: "school",      label: "Education" },
      { value: "health",      label: "Health" },
      { value: "agriculture", label: "Agriculture" },
      { value: "shelter",     label: "Shelter" },
      { value: "energy",      label: "Energy" },
    ],
  },
  sponsorTypes: {
    label: "Sponsorship Types", kind: "object", hasDesc: true,
    defaults: [
      { value: "full",      label: "Full Sponsor", desc: "You cover all needs" },
      { value: "education", label: "Education",    desc: "School fees & supplies" },
      { value: "medical",   label: "Medical Care", desc: "Health & treatments" },
      { value: "food",      label: "Food Support", desc: "Daily nutrition" },
      { value: "clothing",  label: "Clothing",     desc: "Uniforms & clothes" },
      { value: "custom",    label: "Custom",       desc: "Set your own amount" },
    ],
  },
};

const EVT = "kf-categories-changed";
const keyOf = (group) => `kf_cat_${group}`;

export const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item";

// Read a group's current list (stored value, or defaults if never customised).
export function getCat(group) {
  const def = CAT_GROUPS[group];
  if (!def) return [];
  try {
    const raw = JSON.parse(localStorage.getItem(keyOf(group)) || "null");
    if (Array.isArray(raw) && raw.length) return raw;
  } catch { /* fall through to defaults */ }
  return def.defaults;
}

export function setCat(group, list) {
  try { localStorage.setItem(keyOf(group), JSON.stringify(list)); } catch { /* ignore quota */ }
  try { window.dispatchEvent(new CustomEvent(EVT, { detail: { group } })); } catch { /* SSR */ }
}

// Build a new entry for an object group, auto-slugging a unique `value`.
export function makeEntry(group, label, extra = {}) {
  const def = CAT_GROUPS[group];
  const list = getCat(group);
  let base = slugify(label), value = base, n = 2;
  while (list.some((x) => x.value === value)) value = `${base}_${n++}`;
  const entry = { value, label: label.trim() };
  if (def.hasType) entry.type = extra.type || "emergency";
  if (def.hasDesc) entry.desc = extra.desc || "";
  return entry;
}

// React hook — reactive list bound to a group; updates everywhere on change.
export function useCategory(group) {
  const [list, setList] = useState(() => getCat(group));
  useEffect(() => {
    const h = (e) => { if (!e.detail || e.detail.group === group) setList(getCat(group)); };
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, [group]);

  const add = (label, extra) => {
    const name = (label || "").trim();
    if (!name) return;
    const def = CAT_GROUPS[group];
    if (def.kind === "string") {
      if (list.some((x) => x.toLowerCase() === name.toLowerCase())) return;
      setCat(group, [...list, name]);
    } else {
      if (list.some((x) => x.label.toLowerCase() === name.toLowerCase())) return;
      setCat(group, [...list, makeEntry(group, name, extra)]);
    }
  };
  const remove = (item) => {
    const def = CAT_GROUPS[group];
    setCat(group, def.kind === "string"
      ? list.filter((x) => x !== item)
      : list.filter((x) => x.value !== (item.value ?? item)));
  };
  return [list, { add, remove }];
}
