// Single source of truth for brand colors and urgency mappings.
// Import { C, URGENCY_COLOR, URGENCY_LABEL, URGENCY_BG } from "../theme.js"

export const C = {
  navy:    "#002651",
  primary: "#004B96",
  secondary:"#4B7D19",
  accent:  "#E0AB21",
  gold:    "#E0AB21",
  green:   "#4B7D19",
  blue:    "#004B96",
  danger:  "#C0392B",
  error:   "#C0392B", // alias of danger; kept so Login.jsx reads naturally
  teal:    "#0E7490",
  purple:  "#6B21A8",
  muted:   "#5A6E8A",
  bg:      "#F4F7FC",
  white:   "#FFFFFF",
  card:    "#FFFFFF", // alias of white; surface colour for cards
  border:  "#D8E4F0",
  text:    "#0D1F3C",
  darkBg:  "#001A40",
  darkCard:"#00244F",
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
