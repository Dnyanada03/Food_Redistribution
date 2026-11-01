# FRS Design System

This document defines the visual identity for the Food Redistribution System. It exists so that anyone building a screen — human or agent — makes the same choices.

## Design intent

FRS sits between three very different audiences in one interface: a restaurant manager posting leftovers in a hurry, an NGO volunteer scanning listings on a cracked phone screen, and an admin auditing activity from a desktop. The design has to read as **practical and trustworthy first, warm second** — this is closer to a logistics tool than a lifestyle brand. Avoid anything that feels like a food-delivery marketplace (no glossy product photography, no "order now" energy) — the tone is closer to a community bulletin board with real accountability behind it.

The visual language draws from harvest and produce, not from generic "eco" or "charity" clichés: greens read as fresh vegetables, not recycling logos; the accent gold reads as grain and citrus, not a generic CTA-orange.

## Color

| Token | Hex | Role |
|---|---|---|
| `--color-basil` | `#2B4C36` | Primary — nav, headers, primary buttons, donor-role accents |
| `--color-marigold` | `#E2A33B` | Accent — highlights, active states, NGO-role accents, key CTAs |
| `--color-clay` | `#B2472A` | Alert / urgency — expiry warnings, destructive actions, low-stock flags |
| `--color-oat` | `#F4EEDD` | Background — page background, card fields |
| `--color-bark` | `#26241E` | Text — body copy, headings on light backgrounds |
| `--color-sage` | `#8AA285` | Positive / success — completed deliveries, verified badges |

Usage rules:
- `--color-basil` and `--color-oat` carry the page — they should dominate any screen at a glance.
- `--color-marigold` is reserved for one primary action per screen and for role-tagging NGO-side elements. It is not a decorative wash.
- `--color-clay` is used sparingly and only for genuine urgency (expiring in under 2 hours, failed pickup, rejected verification) — if it appears often, something upstream needs fixing, not more red.
- Role color-coding: Donor = basil, NGO/Recipient = marigold, Volunteer = sage, Admin = bark/neutral. This lets a mixed activity feed (e.g. the admin dashboard) be scanned by role at a glance without reading labels.
- Don't substitute a generic Material or Bootstrap palette. Don't default to a terracotta/clay-only palette without the basil and marigold counterweights — the greens are what keep this feeling like fresh food rather than a generic warm-neutral template.

## Typography

- **Headings — Fraunces** (a warm, slightly organic serif with real texture in its curves). Use for page titles, section headers, and the donation-listing food name. It gives the platform an editorial, human warmth that a geometric sans would flatten out.
- **Body & UI — Inter**. Use for body copy, form labels, buttons, table data, and all dense interface text. Inter stays legible at small sizes on the low-end phones volunteers are likely using in the field.
- Don't introduce a third typeface. Don't set Fraunces below 18px — it loses its character at small sizes; drop to Inter instead.

Type scale (base 16px):

| Use | Size | Weight | Family |
|---|---|---|---|
| Page title | 32px / 2rem | 600 | Fraunces |
| Section header | 22px / 1.375rem | 600 | Fraunces |
| Card title (food name) | 18px / 1.125rem | 600 | Fraunces |
| Body | 16px | 400 | Inter |
| Label / meta | 13px | 500, letter-spacing 0.01em | Inter |
| Button | 15px | 600 | Inter |

Line length: keep body text under 75 characters per line; forms and cards should never stretch text edge to edge on wide screens.

## Layout

Left-aligned throughout — this is a task-oriented tool, not a marketing page, and center-aligned text slows down scanning of listings and dashboards.

```
┌─────────────────────────────────────────────┐
│ [FRS logo]      Browse  My Activity  [Avatar]│  ← basil nav bar, oat page below
├─────────────────────────────────────────────┤
│  Available near you              12 listings │
│  ┌───────────────┐ ┌───────────────┐         │
│  │ photo          │ │ photo          │        │
│  │ Food name      │ │ Food name      │  ← card: oat fill,
│  │ Qty · expires  │ │ Qty · expires  │    marigold "Claim" CTA,
│  │ [Claim]        │ │ [Claim]        │    clay text only if <2h left
│  └───────────────┘ └───────────────┘         │
└─────────────────────────────────────────────┘
```

- Listings use a card grid, but cards are functional, not decorative: no drop shadows, a single 1px `--color-bark` border at 10% opacity, and a consistent 8px corner radius applied only to cards and buttons (not to every element — inputs and badges stay square or pill-shaped, not the same radius as cards, so radius carries meaning about hierarchy).
- The dashboard (admin) trades the card grid for a dense table — admins are scanning volume, not browsing.
- One moment of motion: when a donation is successfully claimed, the card transitions with a brief fill-and-settle animation in `--color-sage` before moving to "My Activity." No hover animations on every card, no staggered fade-ins on page load.

## Components

- **Buttons:** primary = solid basil with oat text; secondary = outline bark; destructive = solid clay. Button text is an action, not a category — "Post donation," "Claim this," "Mark delivered," never "Submit."
- **Status badges:** pill-shaped, filled with the relevant role/status color at full opacity, text in oat. Statuses: Posted (basil), Claimed (marigold), Picked Up (sage, outline), Completed (sage, filled), Expired (clay, muted/desaturated — expired items should visually recede, not alarm).
- **Empty states:** written in the interface's voice, with a direct next action — e.g. "No donations posted yet. Post your first one" rather than a generic illustration and "Nothing here!"
- **Forms:** labels above fields, inline validation on blur, errors in clay text directly under the field (never a color-only signal — pair with an icon and text for accessibility).

## Accessibility floor

- Basil-on-oat and bark-on-oat both clear WCAG AA for body text; verify any new color pairing before shipping it.
- Every status or role distinction encoded in color also gets a text label or icon — color is never the only signal.
- Visible keyboard focus rings in marigold on all interactive elements.
- Respect `prefers-reduced-motion`: disable the claim-transition animation when set.
