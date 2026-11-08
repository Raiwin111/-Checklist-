---
name: Personal Tasks
description: Personal task management and research system, dark-first Emission Line Rail
colors:
  ground: "#14130E"
  plate: "#1B1914"
  plate-2: "#232019"
  rule: "#3A3527"
  rule-soft: "#2A261D"
  ink: "#EDE6D2"
  muted: "#A39A82"
  dim: "#8C8470"
  signal: "#F4C542"
  action: "#F4C542"
  action-ink: "#14130E"
  status-live: "#F4C542"
  status-hold: "#D06A4E"
  status-done: "#8FBF6A"
  status-todo: "#5FB8D6"
  danger: "#D06A4E"
  warning: "#F4C542"
typography:
  display:
    fontFamily: "Archivo, Bai Jamjuree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "38px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Archivo, Bai Jamjuree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Archivo, Bai Jamjuree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0em"
  body:
    fontFamily: "Bai Jamjuree, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
    fontFeature: '"tnum" 1'
  label:
    fontFamily: "Archivo, Bai Jamjuree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.16em"
    case: uppercase
  micro:
    fontFamily: "Archivo, Bai Jamjuree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "9px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.16em"
    case: uppercase
  caption:
    fontFamily: "Bai Jamjuree, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  small:
    fontFamily: "Bai Jamjuree, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  metric:
    fontFamily: "Archivo, Bai Jamjuree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: '"tnum" 1'
  micro-sm:
    fontFamily: "Archivo, Bai Jamjuree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "8px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.16em"
    case: uppercase
  caption-sm:
    fontFamily: "Bai Jamjuree, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  title-sm:
    fontFamily: "Archivo, Bai Jamjuree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0em"
  body-lg:
    fontFamily: "Bai Jamjuree, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  heading-xs:
    fontFamily: "Archivo, Bai Jamjuree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  heading-sm:
    fontFamily: "Archivo, Bai Jamjuree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0em"
  heading-md:
    fontFamily: "Archivo, Bai Jamjuree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0em"
  heading-lg:
    fontFamily: "Archivo, Bai Jamjuree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  display-sm:
    fontFamily: "Archivo, Bai Jamjuree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  display-md:
    fontFamily: "Archivo, Bai Jamjuree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.04em"
  display-lg:
    fontFamily: "Archivo, Bai Jamjuree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "54px"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.035em"
rounded:
  none: "0"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-ink}"
    rounded: "{rounded.none}"
    padding: "10px 16px"
    size: "min-h-11"
    typography: "{typography.label}"
  button-primary-hover:
    opacity: 0.9
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    border: "1px solid {colors.rule}"
    rounded: "{rounded.none}"
    padding: "10px 16px"
    typography: "{typography.label}"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    border: "1px solid {colors.danger}"
    rounded: "{rounded.none}"
    padding: "10px 16px"
    typography: "{typography.label}"
  input-field:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    border: "0 0 1px 0 {colors.rule}"
    borderBottomColor: "{colors.rule}"
    rounded: "{rounded.none}"
    padding: "10px 0"
    typography: "{typography.body}"
  input-field-focus:
    borderBottomColor: "{colors.signal}"
  nav-rail-desktop:
    backgroundColor: "{colors.plate}"
    borderRight: "1px solid {colors.rule}"
    width: "220px"
  nav-bottom-mobile:
    backgroundColor: "{colors.ground}"
    borderTop: "1px solid {colors.rule}"
  field-section:
    borderTop: "1px solid {colors.rule}"
    paddingTop: "20px"
  modal:
    backgroundColor: "{colors.plate}"
    border: "1px solid {colors.rule}"
    borderRadius: "{rounded.none}"
    shadow: none
---

# Design System: Personal Tasks

## Overview

**Creative North Star: "The Calibrated Observation Sheet"**

A dark-first task board that reads like a calibrated instrument panel: every task row registers to one off-centre rail, and status is carried by line form before colour. The system is Operate-mode — the visitor scans open tasks in two or three seconds, opens the live one, updates progress, and trusts the activity log. Warm charcoal continuum (#14130E ground) with bone ink (#EDE6D2), sodium yellow (#F4C542) as the live/primary signal, hydrogen red (#D06A4E) for held, green (#8FBF6A) for done, cyan-blue (#5FB8D6) for not started. Type is Archivo for labels and display, Bai Jamjuree for body, set at 15px with tabular numerals. 1px rules, no rounded cards, no shadows, no gradient text, uppercase tracked labels ~9–10px.

The dark theme is the default; light mode is warm paper/charcoal and is opted into explicitly via `ptrs.theme=light`. The neutral "PT" wordmark stands in for the pending real logo.

**Key Characteristics:**
- Dark ground (#14130E) default, light warm-paper alternative
- Sodium yellow (#F4C542) signal colour for live/primary actions only
- Status encoded by line form: solid = live, dashed = held, dotted = not started, doubled = urgent
- 1px rules; square surfaces; zero shadow vocabulary
- 44px minimum touch targets; Thai labels sized to fit; WCAG AA contrast
- Bilingual TH/EN with parity in every label

## Colors

The palette is a warm charcoal continuum anchored by sodium yellow. Dark is canonical; light swaps are captured in `src/index.css` as a `.dark` override pair and in the sidecar's colorMeta where they deviate.

### Primary
- **Sodium Yellow** (#F4C542): primary action and live-status signal; used on ≤10% of any screen so its rarity carries meaning. Text on it sets in #14130E.

### Neutral
- **Ground** (#14130E): page background, default theme.
- **Plate** (#1B1914): raised surfaces such as the desktop rail and modal sheets.
- **Plate-2** (#232019): subtly deeper plate for range inputs and loading pulses.
- **Rule** (#3A3527): 1px dividers, borders, focus outlines.
- **Rule-soft** (#2A261D): hairline dividers inside dense lists.
- **Ink** (#EDE6D2): body and heading text.
- **Muted** (#A39A82): secondary body text.
- **Dim** (#8C8470): labels, captions, disabled-state text.

### Status (line-form first, colour confirms)
- **Live** (#F4C542): solid line, sodium yellow.
- **Hold** (#D06A4E): dashed line, hydrogen red.
- **Done** (#8FBF6A): solid line at reduced opacity, green.
- **Todo** (#5FB8D6): dotted line, cyan-blue.

**The One Line Rule.** Status is never carried by colour alone — every status also has a distinct line form (solid / dashed / dotted / doubled). Colour is the confirmation, never the sole carrier.

## Typography

**Display Font:** Archivo (with Bai Jamjuree and system-ui fallbacks)
**Body Font:** Bai Jamjuree (with Archivo fallbacks)

Thai glyphs come from Bai Jamjuree; Archivo carries Latin labels and numerals so tabular figures align.

### Hierarchy
- **Display** (600, 38px clamp to 54px, line-height 1.05, tracking -0.035em): page headings such as "open tasks" counts.
- **Headline** (600, 28px, line-height 1.05, tracking -0.03em): section titles and all-clear messages.
- **Title** (500, 15px, line-height 1.4): task titles and link text.
- **Body** (400, 15px, line-height 1.6, tabular numerals): descriptions, hints, metadata. Max measure ~65ch.
- **Label** (500, 9–10px, letter-spacing 0.14–0.18em, uppercase): field labels, status chips, nav items.
- **Caption** (400, 12px, line-height 1.5): hints and secondary metadata.
- **Small** (400, 13px, line-height 1.5): body secondary text.
- **Micro** (500, 9px, letter-spacing 0.16em, uppercase): sync status, counts, timestamps.
- **Metric** (500, 40px, line-height 1, tracking -0.04em, tabular numerals): average progress figure.

## Layout

Desktop: a 220px left rail of 1px-ticked destinations with a sticky header carrying inline sync state; main column max-width 5xl. Mobile (below lg): the rail collapses to a 4-destination bottom nav with a dedicated floating Add action above it; no header overlap, 44px touch targets throughout. Four destinations (Dashboard, Tasks, Search, Settings) plus Add. Skip-to-content link leads the DOM.

Breakpoints: Tailwind default `lg` (1024px) separates rail from bottom nav.

## Elevation & Depth

No shadows. Depth is conveyed by tonal layering (ground → plate → plate-2) and 1px rules alone. Focus rings are 1px signal-colour outlines with 3px offset. Selection uses the signal colour. This is a flat system by invariant; shadows are never used as decoration.

## Shapes

Square by default: zero border-radius on buttons, inputs, cards, modals, and dialogs. The only curves are the 5px sync dot and circular status/avatar glyphs where the brief calls for a dot. List items use 1px bottom rules rather than card containers; no nested cards.

## Components

### Buttons
- **Shape:** square (0 radius), min-height 44px for touch.
- **Primary:** sodium-yellow background (#F4C542), #14130E text, uppercase 10px label, hover to 90% opacity.
- **Secondary:** transparent, 1px rule border, ink text, hover fills plate and darkens border.
- **Danger:** transparent, 1px danger border, danger text; hover fills danger and flips text to ground.
- **Ghost:** plain text, muted → ink on hover.

### Navigation
- **Desktop rail:** 220px, 1px right rule, destinations as 10px uppercase tracked items with a 2px active tick in signal colour; account block at the bottom.
- **Mobile bottom nav:** 4 equal columns, 10px labels, active state shown by a signal-colour top underline; FAB (44px, sodium yellow) for Add above it.

### Inputs / Fields
- **Style:** bottom-rule field — transparent background, 1px rule bottom border, no radius, 15px body text; focus shifts the rule to signal.
- **Focus:** 1px signal-colour outline, 3px offset (`:focus-visible`).

### Status chip (line-form status)
- Inline 9px uppercase label preceded by a 4px line glyph whose form encodes status: solid = live, dashed = held, dotted = not started, doubled = urgent. Colour confirms but never carries status alone.

### Progress line
- 2px full-width track in rule colour; filled portion in status colour with status-appropriate form (solid/dashed/dotted/doubled), `width` bound to progress %, tabular %-readout beside it.

### Modal / ConfirmDialog
- Plate surface, square, 1px rule border, no shadow, sticky close button; primary/secondary actions right-aligned.

## Do's and Don'ts

### Do:
- **Do** encode status by line form first (solid / dashed / dotted / doubled), colour second.
- **Do** use 1px rules and square surfaces; keep the shadow vocabulary empty.
- **Do** keep labels ≤11px, uppercase, tracked; body at 15px with tabular numerals.
- **Do** keep every touch target ≥44px; Thai labels must fit their containers.
- **Do** keep TH/EN parity: every key added to `th` must exist in `en`.

### Don't:
- **Don't** use a kicker or eyebrow above a heading.
- **Don't** use section numbers (01/02/03) unless the sequence itself carries information.
- **Don't** use gradient text or rounded-card stacks.
- **Don't** carry state by colour alone.
- **Don't** use emoji or monospace as costume; icons are drawn from one library.
