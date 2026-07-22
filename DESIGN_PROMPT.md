# Design System Prompt — Kafaala Qaad HOPE

Copy everything below the line into whatever tool or model you want to design with
(v0, Figma AI, Claude, a human designer). It is written to be self-contained: it
states the stack, the hard constraints, what already exists, and what is missing.

Edit the **Direction** section before sending — that is the part only you can answer.

---

## The product

Kafaala Qaad HOPE is a humanitarian aid platform for Somalia. A case moves through a
verified pipeline: a Reporter submits it → a field team investigates → an admin
publishes a sanitised public version → a sponsor funds it → aid is delivered with GPS
proof → the case closes. Real money moves through escrow, so the interface has to feel
trustworthy and accountable, not like a fundraising landing page.

Two audiences share one app:
- **Public / donors** — home, cases, stories, donate, transparency. Emotive but sober.
- **Staff** — reporters, field agents, admins working long sessions in dense dashboards.

## Stack and hard constraints

- **React 18 + Vite**, plain `.jsx`. No TypeScript.
- **No CSS framework.** Tailwind is *not* installed. There is one 440-line
  `src/responsive.css` and everything else is inline `style={{ }}` objects — about
  3,750 of them. Do not propose Tailwind classes or a CSS-in-JS library.
- Responsive behaviour comes from a `useResponsive()` hook exposing `isMobile`.
  Fluid type already uses `clamp()`, e.g. `clamp(36px, 6vw, 68px)`.
- It is a **PWA**, installable on Android and iOS, `display: standalone`,
  portrait-primary. Brand/theme colour `#002651`.
- Must keep building with `npm run build` (Vite). No new runtime dependencies without
  saying so explicitly.

## What already exists — use it, do not reinvent it

`src/theme.js` is the single source of truth for colour. It was just consolidated:
17 duplicated copies of the palette were removed, and 27 of 30 components now import
from it. **Never write a raw hex in a component again — add a token instead.**

```js
export const C = {
  navy: "#002651",  primary: "#004B96", secondary: "#4B7D19", accent: "#E0AB21",
  danger: "#C0392B", teal: "#0E7490",   purple: "#6B21A8",
  muted: "#5A6E8A",  bg: "#F4F7FC",     white: "#FFFFFF",  card: "#FFFFFF",
  border: "#D8E4F0", text: "#0D1F3C",   darkBg: "#001A40", darkCard: "#00244F",
  // aliases: gold=accent, green=secondary, blue=primary, error=danger
};
```

## What is missing — this is the actual job

### 1. There is no semantic colour layer

Roughly 1,790 raw hex values remain in components. They are not brand colours; they
are status and urgency colours pasted in ad hoc, mostly Tailwind palette values that
never entered the token system. Twelve case statuses each carry a hand-picked
`color` + `bg` pair:

```
Pending Verification #F59E0B/#FEF3C7   Under Review      #3B82F6/#DBEAFE
Investigating        #8B5CF6/#EDE9FE   Awaiting Approval #EC4899/#FCE7F3
Verified             #10B981/#D1FAE5   Waiting Sponsor   #F59E0B/#FEF3C7
Sponsored            #EF4444/#FEE2E2   Aid Delivered     #06B6D4/#CFFAFE
Delivering           #0891B2/#CFFAFE   Proof Submitted   #10B981/#D1FAE5
Completed            muted  /#F3F4F6   Archived          #374151/#E5E7EB
```

**Design a semantic scale that covers these twelve states** with a defensible
structure (success / warning / info / danger / neutral, each with a foreground and a
tint), map every status onto it, and express it as tokens in `theme.js`. Nine
near-arbitrary hues for twelve states is not a system.

Accessibility is a real requirement here, not a nicety: these render as small badge
text on tinted backgrounds. Every foreground/tint pair must clear **WCAG AA (4.5:1)**.

### 2. Two urgency scales contradict each other

```js
// src/theme.js            — lowercase keys
{ critical:"#7C3AED", high:"#C0392B", medium:"#F59E0B", low:"#10B981" }
// src/KafaaleQaadApp.jsx  — capitalised keys, different red
{ Critical:"#7C3AED", High:"#EF4444", Medium:"#F59E0B", Low:"#10B981" }
```

The same "High" badge renders brand red or Tailwind red depending on the code path.
Pick one scale and one key casing.

### 3. Only colour is tokenised

Spacing, radii, shadows, and type sizes are all hand-typed per component. Define
scales for each and express them as tokens alongside `C`.

## The home page specifically

Current structure, in order — hero (background slideshow with gradient overlay, live
indicator, `clamp()` headline, CTA row, trust strip) → stats band → trust badge strip
→ "Stories from the Field" cards → programmes → footer.

The story cards are commented `"UNICEF style"` and `"clean white area like UNICEF"`.
That is imitation, not a point of view. **Give the home page its own visual argument.**

Judge it against one question: *does a first-time visitor believe their money reaches a
real, verified person?* Everything on the page either earns that belief or is noise.
Note the platform genuinely has GPS-verified delivery proof and an escrow flow — the
design should surface that evidence, not bury it under stock emotive imagery.

Practical note: the catalogue is currently **empty** (0 published cases). Empty states
are a first-class design problem here, not an afterthought.

## Direction — FILL THIS IN BEFORE SENDING

> Replace this block. Without it you will get generic output.
>
> - What feels wrong today, in your words:
> - Two or three products/sites whose feel you want (and why):
> - Tone: institutional and sober, or warm and human?
> - Anything fixed and non-negotiable (logo, navy, Lexend type):
> - Somali/English bilingual needs, RTL, or locale-specific typography:

## What to deliver

1. A token set — colour (brand + semantic), spacing, radius, shadow, type — as a
   drop-in replacement for `src/theme.js`, keeping the existing key names so nothing
   breaks.
2. A status/urgency mapping table with contrast ratios shown.
3. The home page redesigned as React with inline styles using only those tokens.
4. A short rationale: what you changed and why, in plain language.

Do not deliver a Tailwind config, a component library, or a Figma-only artifact.
