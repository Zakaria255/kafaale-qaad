/**
 * Kafaala Qaad Foundation — Official Brand Colors
 * Sampled directly from the logo artwork (heart of hands cradling a family
 * beneath a rising sun). Single source of truth for the dashboard/app surfaces;
 * keep in sync with design/tokens.css and theme.js.
 *
 *   Emerald Green  #0F773C — the cradling hands + FOUNDATION wordmark (care)
 *   Royal Blue     #204BA0 — the family figures + Kafaala Qaad wordmark (trust)
 *   Sun Gold       #FAA528 — the rising sun (hope / accent / CTA)
 *   Deep Navy      #112A63 — dark surfaces, harmonized with the royal blue
 */

export const BRAND = {
  // Primary blues
  navy:    "#112A63",   // deepest — top/bottom bars, hero bg
  blue:    "#204BA0",   // royal blue — buttons, links, primary UI
  blueLight: "#2E5EC0", // mid blue — hover states, lighter accents

  // Greens
  green:   "#0F773C",   // emerald — verified badges, success, secondary
  greenDark: "#0A5A2C", // deep forest — hover on green buttons
  greenLight: "#17924A",// lighter emerald — backgrounds, soft accents

  // Gold / accent (the sun)
  gold:    "#FAA528",   // sun gold — CTA buttons, highlights
  goldDark: "#E28E12",  // darker gold — hover on gold
  goldLight: "#FEC43F", // lighter gold — badges, light accents

  // Neutrals
  bg:      "#F4F7FC",   // page background (slight blue tint)
  card:    "#FFFFFF",   // card surface
  border:  "#D6E1F5",   // borders (blue-tinted)
  text:    "#0D1F3C",   // body text (near-navy)
  muted:   "#5A6E8A",   // secondary text
  white:   "#FFFFFF",

  // Semantic
  danger:  "#C0392B",
  warning: "#FAA528",   // reuses gold
  success: "#0F773C",   // reuses green

  // Footer / dark surfaces
  darkBg:  "#0A1D45",   // very deep navy
  darkCard:"#112A63",   // slightly lighter navy card
};

// Convenience: drop-in replacement for old C = { primary, secondary, accent } pattern
export const C = {
  primary:   BRAND.blue,
  secondary: BRAND.green,
  accent:    BRAND.gold,
  danger:    BRAND.danger,
  muted:     BRAND.muted,
  bg:        BRAND.bg,
  border:    BRAND.border,
  text:      BRAND.text,
  white:     BRAND.white,
};

export default BRAND;
