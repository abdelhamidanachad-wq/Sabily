# Sabily Design System — v1
Status: proposed baseline for premium experience rollout.

## Foundations
```css
:root {
  --sbl-color-forest-950: #0A211C;
  --sbl-color-forest-900: #102F28;
  --sbl-color-forest-800: #174438;
  --sbl-color-jade-700: #2E6F5A;
  --sbl-color-jade-100: #DCEBE2;
  --sbl-color-paper: #F7F6F0;
  --sbl-color-surface: #FFFFFF;
  --sbl-color-ink: #182C26;
  --sbl-color-muted: #718078;
  --sbl-color-border: #E3E8E2;
  --sbl-color-gold: #B99454;
  --sbl-color-success: #23734B;
  --sbl-color-warning: #9B6B20;
  --sbl-color-error: #B64242;
  --sbl-color-info: #326A91;
  --sbl-radius-control: 10px;
  --sbl-radius-card: 14px;
  --sbl-radius-feature: 20px;
  --sbl-radius-hero: 28px;
  --sbl-shadow-card: 0 8px 28px rgba(16,47,40,.07);
  --sbl-shadow-float: 0 18px 54px rgba(16,47,40,.13);
}
```
## Type
- UI Latin: Manrope for display/headings; DM Sans for body/controls.
- Arabic UI: Cairo/Noto Sans Arabic.
- Qur'an Arabic: Amiri/Noto Naskh Arabic, 28–36px, line-height 2.15, generous paragraph spacing.
- Scale: 12 / 13 / 14 / 16 / 18 / 22 / 28 / 36 / 48.
## Layout & navigation
- 4px base spacing, 8px primary rhythm.
- Desktop member: 248px navigation rail, content max-width 1440px.
- Mobile: bottom navigation 5 destinations and a More sheet.
- Admin: dedicated shell; dense data views are responsive and become stacked rows on mobile.
- Arabic layout uses `dir=rtl` at app root and component-level `dir=ltr` only for numerals, time values, technical identifiers and compass headings.
## Component standards
- Buttons: primary jade/forest, secondary outlined, tertiary text; 44px minimum interactive height.
- Inputs: visible label, helper/error text; focus ring 3px with offset.
- Cards: white/paper surfaces, 1px border; use elevation sparingly.
- Status: text + icon + color; never use color alone.
- Tables: responsive stacked rows on small screens; row action labels must be clear.
- Dialogs: accessible title/description, escape close where safe, explicit destructive confirmation.
- Loading: skeleton surfaces matched to final content.
- Empty: explain why empty and provide next action.
- Error: specific, recoverable message; never swallow backend failure.
## UX patterns by feature
- Home: greeting, local context, next prayer, worship progress, one Continue Quran action, compact discovery.
- Prayer: location + method metadata, next-prayer countdown, ordered times, settings and refresh.
- Quran: focused reading canvas, Surah/ayah navigation, font sizing, line-height, bookmarks/progress and source/edition notice.
- Azkar: category tabs, one remembrance at a time, readable Arabic, translation/source, tactile counter, reset confirmation.
- Qibla: compass, bearing degrees, location permission, sensor support/calibration state and manual direction fallback.
- Admin: contextual page title, role, filter/search, tables with feedback states, irreversible action confirmations, audit trail.
## Accessibility
- WCAG 2.2 AA intent: 4.5:1 body contrast, 3:1 large text/controls, keyboard access, visible focus, semantic labels, reduced motion, screen reader announcements for counters and async outcomes.
- Arabic/RTL tested at narrow widths and 200% zoom.
