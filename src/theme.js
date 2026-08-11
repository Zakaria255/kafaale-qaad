// Single source of truth for brand colors and urgency mappings.
// Import { C, URGENCY_COLOR, URGENCY_LABEL, URGENCY_BG } from "../theme.js"

// Values mirror the Kafaala Qaad logo (emerald hands, royal-blue family, sun-gold)
// and the CSS tokens in design/tokens.css — keep the two in sync.
export const C = {
  navy:    "#112A63",
  primary: "#204BA0",
  secondary:"#0F773C",
  accent:  "#FAA528",
  gold:    "#FAA528",
  green:   "#0F773C",
  blue:    "#204BA0",
  danger:  "#C0392B",
  error:   "#C0392B", // alias of danger; kept so Login.jsx reads naturally
  teal:    "#0E7490",
  purple:  "#6B21A8",
  muted:   "#5A6E8A",
  bg:      "#F4F7FC",
  white:   "#FFFFFF",
  card:    "#FFFFFF", // alias of white; surface colour for cards
  border:  "#D6E1F5",
  text:    "#0D1F3C",
  darkBg:  "#0A1D45",
  darkCard:"#112A63",
};

// Keys are always lowercase to match API values
export const URGENCY_COLOR = {
  critical: "#7C3AED",
  high:     "#C0392B",
  medium:   "#F59E0B",
  low:      "#10B981",
};

export const URGENCY_BG = {
  critical: "#EDE9FE",
  high:     "#FEE2E2",
  medium:   "#FEF3C7",
  low:      "#D1FAE5",
};

export const URGENCY_LABEL = {
  critical: "🟣 Critical",
  high:     "🔴 High",
  medium:   "🟡 Medium",
  low:      "🟢 Low",
};

/** Normalise an API urgency/emergencyLevel string to a lowercase key */
export const urgKey = (level = "") => level.toLowerCase();
