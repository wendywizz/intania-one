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
  primary: '#922124'
  on-primary: '#ffffff'
  primary-container: '#b33939'
  on-primary-container: '#ffd9d7'
  inverse-primary: '#ffb3ae'
  secondary: '#585e6d'
  on-secondary: '#ffffff'
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
- **Primary Red (#b33939):** Reserved strictly for primary call-to-actions (CTAs), key brand moments, and critical status indicators. 
- **Secondary Navy (#2f3542):** Used for typography and navigation elements to provide a grounded, professional contrast.
- **Neutrals:** A spectrum of cool grays provides the scaffolding for the interface, creating clear boundaries between content sections without adding visual noise.
- **Semantic Colors:** Success, Warning, and Error colors are slightly desaturated to maintain harmony with the deep primary red.

## Typography
Inter is the foundation of this design system, chosen for its exceptional legibility in data-dense mobile environments. 
- **Hierarchy:** Use `Display-lg` only for empty states or welcome screens. Most screen titles should use `Headline-md`.
- **Readability:** Body text uses a generous 1.5x line-height to ensure that policy documents and employee notes remain readable on small screens.
- **Data Labels:** Small labels (`label-sm`) use increased letter spacing and semi-bold weights to remain legible at small scales, particularly in table headers or metadata chips.

## Layout & Spacing
The system utilizes an 8px grid (with a 4px half-step for micro-adjustments). 
- **Mobile Grid:** A fluid 4-column layout with 16px side margins and 16px gutters.
- **Vertical Rhythm:** Elements within a card should use `sm` (8px) spacing, while the gap between distinct cards or sections should use `md` (16px) or `lg` (24px).
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

## Config file
The color and font size should keep in file "constants/theme.ts" don't create another file