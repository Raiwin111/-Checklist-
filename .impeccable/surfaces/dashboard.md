---
version: 1
slug: "dashboard"
primary_target: "dashboard"
related_targets: []
---

# Surface: App shell + Dashboard

## Scope

All authenticated screens share this shell (Dashboard, Tasks, Add/Edit Task, Task Detail, Search, Settings); Dashboard is the primary surface and sets the system. Auth screens inherit the palette and type but not the working shell.

## Visitor mode

Operate.

## Audience and job

The owner opens the app between other work to answer one question in two or three seconds: what is still open, and what is moving? Then they open the live task, update it, or capture a new one.

## Content and proof

Real task titles, categories, statuses, progress, timestamps, and the activity log. No invented users, customers, or metrics.

## Constraints

- TH/EN parity in every label; both languages must fit the same structure.
- 44px minimum touch targets; WCAG AA contrast; state never carried by colour alone.
- Offline and sync state must be honest and visible without covering content.
- Four destinations (Dashboard, Tasks, Search, Settings) plus a dedicated Add action.

## Chosen direction

Emission Line Rail — a challenger adopted over the rolled Cargo Manifest. The memorable moment: every task row ends in a measured line whose length is progress and whose form is status.

## Unresolved

The real logo is still pending from the owner. Use a neutral wordmark until it arrives.

## Direction contract

THESIS: A working task board that reads like a calibrated observation sheet — every row registers to one off-centre rail, and status is carried by line form before colour.

OWN-WORLD: Warm charcoal continuum (#14130E ground, #1B1914 plate, #2E2B22 rule), bone ink (#EDE6D2), sodium yellow (#F4C542) for live and primary, hydrogen red (#C9503F) for held, green (#7FBF5A) for done, cyan-blue (#3FA8C9) for not started. Archivo + Bai Jamjuree; 10px uppercase tracked labels, 15px body, tabular numerals; 1px rules, no rounded cards, no shadows; one 1px rail.

STORY: The owner sees the open count, reads the line forms, opens the one task that is live, updates progress, and trusts the log.

FIRST VIEWPORT: A 220px left nav rail of 1px tick destinations; a header carrying sync state; a 54px heading naming what is still open; one spectral strip that doubles as the legend; three Now rows, each with title, category, status, and a measured line ending at its percentage; the activity log at right on desktop and below on mobile.

FORM: Emission Line Rail — challenger, adopted over the rolled form (catalog operate-c-emission-line-rail); not ranked in the grounded seven. seed:d659573ec8298909

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
