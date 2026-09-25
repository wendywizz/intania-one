---
name: Professional HR Systems
colors:
  surface: '#f8f9fd'
  surface-dim: '#d9dade'
  surface-bright: '#f8f9fd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3f7'
  surface-container: '#edeef2'
  surface-container-high: '#e7e8ec'
  surface-container-highest: '#e1e2e6'
  on-surface: '#191c1f'
  on-surface-variant: '#584140'
  inverse-surface: '#2e3134'
  inverse-on-surface: '#eff1f5'
  outline: '#8b716f'
  outline-variant: '#dfbfbd'
  surface-tint: '#ab3334'
  primary: '#b33939'
  on-primary: '#ffffff'
  primary-container: '#b33939'
  on-primary-container: '#ffd9d7'
  inverse-primary: '#ffb3ae'
  secondary: 'rgba(20, 20, 20, 0.08)'
  on-secondary: '#141414'
  secondary-container: '#dadff0'
  on-secondary-container: '#5d6371'
  tertiary: '#444d5b'
  on-tertiary: '#ffffff'
  tertiary-container: '#5c6573'
  on-tertiary-container: '#dae3f4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  success: '#2ecc71'
  info: '#3498db'
  danger: '#e74c3c'
  warning: '#f1c40f'
  # Flat UI (Defo) palette — https://flatuicolors.com/palette/defo
  turquoise: '#1abc9c'
  emerald: '#2ecc71'
  peter-river: '#3498db'
  amethyst: '#9b59b6'
  wet-asphalt: '#34495e'
  green-sea: '#16a085'
  nephritis: '#27ae60'
  belize-hole: '#2980b9'
  wisteria: '#8e44ad'
  midnight-blue: '#2c3e50'
  sun-flower: '#f1c40f'
  carrot: '#e67e22'
  alizarin: '#e74c3c'
  clouds: '#ecf0f1'
  concrete: '#95a5a6'
  orange: '#f39c12'
  pumpkin: '#d35400'
  pomegranate: '#c0392b'
  silver: '#bdc3c7'
  asbestos: '#7f8c8d'
  # Extra named accents
  pico8-pink: '#fd79a8'
  prunus-avium: '#e84393'
  primary-fixed: '#ffdad7'
  primary-fixed-dim: '#ffb3ae'
  on-primary-fixed: '#410005'
  on-primary-fixed-variant: '#8a1a1f'
  secondary-fixed: '#dde2f3'
  secondary-fixed-dim: '#c1c6d7'
  on-secondary-fixed: '#161c28'
  on-secondary-fixed-variant: '#414754'
  tertiary-fixed: '#dae3f4'
  tertiary-fixed-dim: '#bec7d7'
  on-tertiary-fixed: '#131c28'
  on-tertiary-fixed-variant: '#3e4755'
  background: '#f8f9fd'
  on-background: '#191c1f'
  surface-variant: '#e1e2e6'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-padding: 16px
  stack-gap: 12px
---

## Brand & Style
The design system is built on the pillars of **Trust, Efficiency, and Clarity**. Designed specifically for HR management, the aesthetic balances the authority of a traditional corporate environment with the agility of a modern SaaS platform.

The visual style is **Corporate Modern**, leaning heavily into high-end utility. It uses a sophisticated deep red to signal importance and action, set against a vast "Canvas" of neutral whites and cool grays to prevent cognitive fatigue during data-heavy tasks. The emotional response should be one of reliability and calm control.

## Colors
This design system utilizes a "High-Value Interaction" color strategy. 
- **Primary (#b33939):** Reserved strictly for primary call-to-actions (CTAs), key brand moments, and critical status indicators. 
- **Secondary (rgba(20, 20, 20, 0.08)):** The subtle neutral fill used behind circular icon buttons — matching the nav-top-bar back button background (the text color `#141414` at ~8% opacity). Used for low-emphasis, tappable icon affordances.
- **Inverse (#2e3134):** The inverse surface — a dark slate used for inverted UI (e.g. snackbars, tooltips, high-contrast surfaces) and to ground content against the light canvas.
- **Neutrals:** A spectrum of cool grays provides the scaffolding for the interface, creating clear boundaries between content sections without adding visual noise.
- **Semantic Colors:** The status roles map directly onto Flat UI (Defo) swatches — **Success → Emerald (#2ecc71)**, **Warning → Sun Flower (#f1c40f)**, **Danger → Alizarin (#e74c3c)**, **Info → Peter River (#3498db)** — referenced by name in `constants/theme.ts` so the mapping stays explicit in both light and dark.
- **Flat UI (Defo) Palette:** The full 20-swatch [Flat UI Colors "Defo"](https://flatuicolors.com/palette/defo) set is available as named tokens (Turquoise, Emerald, Peter River, Amethyst, Wet Asphalt, Green Sea, Nephritis, Belize Hole, Wisteria, Midnight Blue, Sun Flower, Carrot, Alizarin, Clouds, Concrete, Orange, Pumpkin, Pomegranate, Silver, Asbestos). These are fixed named swatches (identical in light and dark) for categorization, charts, highlights, or illustration — use sparingly so they never compete with the primary red.

## Typography
Inter is the foundation of this design system, chosen for its exceptional legibility in data-dense mobile environments. 
- **Hierarchy:** Use `Display-lg` only for empty states or welcome screens. Most screen titles should use `Headline-md`.
- **Readability:** Body text uses a generous 1.5x line-height to ensure that policy documents and employee notes remain readable on small screens.
- **Data Labels:** Small labels (`label-sm`) use increased letter spacing and semi-bold weights to remain legible at small scales, particularly in table headers or metadata chips.

## Layout & Spacing
The system utilizes an 8px grid (with a 4px half-step for micro-adjustments). 
- **Mobile Grid:** A fluid 4-column layout with 16px side margins and 16px gutters.
- **Vertical Rhythm:** Elements within a card should use `sm` (8px) spacing, while the gap between distinct cards or sections should use `md` (16px) or `lg` (24px).
- **Screen edge → content gutter (responsive by width):** The horizontal spacing between the screen edge and all section content is **responsive to the viewport width**, not a fixed value. Use `useScreenGutter()` from `constants/theme.ts`: `round(clamp(20, width × 0.062, 32))` — i.e. min **20px** on small phones, growing to a max of **32px** on large screens. Apply it inline on each screen's content container (`contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}`); cards may bleed to this gutter and keep their own internal padding. This gutter must be uniform across every screen within a module.
- **Screen title → content gap (responsive by height):** The vertical spacing between the screen title and the content section below it is **responsive to the viewport height**. `ScreenHeader` applies `useScreenTitleGap()`: `round(clamp(16, height × 0.028, 32))` — min **16px** on short screens, up to **32px** on tall screens — as the title's bottom spacing, so the header breathes proportionally on any device.
- **Safe Areas:** Strict adherence to mobile safe areas is required, ensuring that floating action buttons or bottom navigation menus do not interfere with OS-level gestures.

## Elevation & Depth
Depth is conveyed through **Tonal Layering** supplemented by **Ambient Shadows**.
- **Level 0 (Base):** The main background (`background-subtle`).
- **Level 1 (Cards):** Pure white surfaces with a very soft, diffused shadow (Y: 2px, Blur: 8px, Opacity: 4% Black). 
- **Level 2 (Modals/Popovers):** Elevated surfaces with a more pronounced shadow (Y: 8px, Blur: 20px, Opacity: 8% Black) to focus user attention.
- **Interactive State:** On tap, cards should visually depress (reduce shadow) or show a subtle gray overlay to indicate the hit state.

## Shapes
A **Rounded (0.5rem)** logic is applied to balance professional structure with modern approachability. 
- **Standard UI:** Buttons, Input fields, and Cards use the base 8px (0.5rem) radius.
- **Large Components:** Hero sections or large banners use `rounded-lg` (16px).
- **Communication:** Avatars are always circular. Status tags/chips use a "pill" shape (max radius) to distinguish them from interactive buttons.

## Components
- **Buttons:** Primary buttons use the deep red background with white text. Secondary buttons use a transparent background with a 1px gray border.
- **Input Fields:** Use a light gray fill (`neutral-color`) with a bottom-only border that turns Primary Red on focus. Labels always remain visible.
- **Cards:** The primary vehicle for HR data (e.g., Employee Profiles, Leave Requests). They feature a 1px subtle border or a Level 1 shadow, never both.
- **Chips:** Used for "Status" (e.g., Pending, Approved). Backgrounds should be highly desaturated versions of the status color with high-contrast text.
- **Lists:** Clean rows with 16px vertical padding, separated by 1px dividers (`#eee`). Use "Chevron-right" icons for all tappable list items to signify navigation.
- **Progress Bars:** For onboarding or performance tracks, use the Primary Red for the fill and a light gray for the track.
- All components should support dark theme

## Theming Convention (Engineering) — single source of truth
**`constants/theme.ts` is the single source of truth for every visual value.** No screen or component may hardcode a color. Every element — **font color, background color, icon color, border/divider line, and card/section surface** — must reference a token from `constants/theme.ts` so light/dark themes stay correct and the palette can change in one place.

- **How to consume:** `const c = useColors();` for inline values (`color={c.text}`, `backgroundColor={c.primary}`), and `useThemedStyles((c) => StyleSheet.create({...}))` for `StyleSheet` blocks. Both resolve to the active light/dark palette automatically.
- **No hardcoded hex / rgba** in `.tsx` files — not in `style={}`, not in `StyleSheet.create`, not as component props. This includes `#FFFFFF`: white text/icon on a colored fill must use **`c.textOnPrimary`** (it is `#FFFFFF` in both themes), never a literal.
- **Token map (common):** screen background → `c.background`; cards/sheets → `c.surface`; muted fills / icon circles → `c.surfaceMuted` / `c.primarySoft`; body text → `c.text`; secondary text → `c.textMuted` / `c.textFaint`; brand/CTA → `c.primary`; text/icon on a colored fill → `c.textOnPrimary`; borders & divider lines → `c.border`; semantic → `c.success` / `c.warning` / `c.danger` / `c.info`.
- **Button backgrounds** come from the token that matches intent: primary action → `c.primary`, positive/accept → `c.success`, destructive/reject → `c.danger`, neutral/info → `c.info`. Prefer the shared `Button` component's `variant` (`primary` / `secondary` / `ghost` / `danger`) which already maps to these tokens.
- **Lines & card sections:** dividers/hairlines use `borderColor: c.border` (never a literal `#eee`); card surfaces use the shared `SectionCard` / `DetailInfoCard`, which are already tokenized.
- **Fonts:** use `AppFonts` from `constants/fonts.ts` (never a raw family string). App-wide typeface is **Sarabun** — titles/emphasis use SemiBold (`AppFonts.psuBold`), general text uses Regular (`AppFonts.psuRegular`).
- **Reference:** `app/repair-computer/worker-job-detail.tsx` is fully tokenized (no literals) — use it as the pattern for new screens.

## Config file
The color and font size should keep in file "constants/theme.ts" don't create another file