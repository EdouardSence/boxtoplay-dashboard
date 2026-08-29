# Design system: warm slate control room

The surface reads as a machined instrument panel: a warm slate ground, readouts
recessed into it, controls raised off it. Light comes from above-left and never
moves. Nothing glows.

## Colour

Strategy: **restrained**. Tinted neutrals carry the whole frame; signal colours
appear only to name a state, never as decoration. Modpack cover art is the only
saturated area of the product, and the frame stays neutral so it can be.

All values OKLCH. The neutral ramp is tinted warm (hue 62) so it reads as
slate-with-warmth rather than the blue-grey default.

| Token | Value | Use |
|---|---|---|
| `--ground` | `oklch(0.145 0.010 62)` | Page ground, deepest surface |
| `--panel` | `oklch(0.215 0.014 62)` | Instrument panel faces |
| `--recess` | `oklch(0.165 0.011 62)` | Readout wells, cut into the panel |
| `--raised` | `oklch(0.275 0.016 62)` | Controls, sitting above the panel |
| `--edge` | `oklch(0.35 0.017 62)` | Panel seams and rules |
| `--ink` | `oklch(0.945 0.008 62)` | Primary readings |
| `--ink-dim` | `oklch(0.715 0.012 62)` | Secondary readings |
| `--ink-label` | `oklch(0.585 0.014 62)` | Engraved labels |

Signals, used for state only:

| Token | Value | Meaning |
|---|---|---|
| `--live` | `oklch(0.74 0.15 152)` | Running, healthy, succeeded |
| `--warn` | `oklch(0.79 0.14 78)` | Expiring, degraded, skipped |
| `--fault` | `oklch(0.64 0.19 27)` | Stopped, failed, unreachable |
| `--idle` | `oklch(0.60 0.020 62)` | Unknown, pending, not applicable |

Never `#000` or `#fff`. Signal colours never tint a whole surface; they appear
as a lamp, a gauge fill, or a single word.

## Material

Depth is built from two light sources, never from blur.

- **Recess** (readouts): `inset 0 1px 0 oklch(0 0 0 / 0.5)`, plus a hairline
  highlight `inset 0 -1px 0 oklch(1 0 0 / 0.04)`. Background `--recess`.
- **Raise** (controls, cards): `0 1px 0 oklch(1 0 0 / 0.06) inset` on the top
  edge, `0 1px 2px oklch(0 0 0 / 0.4)` below. Background `--raised`.
- **Seam**: 1px `--edge`. Panels butt against each other along seams rather than
  floating with gaps.

Banned: `backdrop-filter`, coloured `box-shadow` glow, gradient text, side-stripe
accent borders, nested cards.

## Typography

| Role | Family | Notes |
|---|---|---|
| Readouts, numerals | JetBrains Mono 500 | Tabular figures. All numbers, ids, hosts, timestamps. |
| Interface, prose | Archivo 400/500/600 | Body and headings. |
| Engraved labels | Archivo 600, uppercase, `0.09em` tracking, 11px | Field labels under/over readouts. Always `--ink-label`. |

Scale ratio 1.25 minimum between steps. Readouts outrank their labels by at
least two steps: the number is the content, the label is the engraving.

## Gauges

Any bounded quantity is drawn, not just written. Trial time remaining, player
slots, rotation progress, backup age.

- Horizontal bar, 6px, recessed track, fill in the state's signal colour.
- The fill is a hard edge, no gradient, no rounded cap on the leading edge.
- Ticks at meaningful thresholds, not evenly spaced for decoration.
- The numeric value sits beside the gauge, never inside it.

## Motion

Only two motions exist.

- **Arrival**: 240ms `cubic-bezier(0.16, 1, 0.3, 1)`, opacity plus 6px rise.
  Staggered by 40ms across siblings, capped at 6 steps.
- **Value change**: readouts cross-fade over 120ms when their number changes,
  so a refresh is visible without being loud.

Never animate layout properties. No bounce, no elastic, no infinite decorative
loops. The status lamp is the one exception: a 2.4s opacity breath, because a
live indicator that never moves reads as a screenshot.

## Layout

- Panels butt along seams into a grid; they do not float as separate rounded
  cards on a background.
- Radius: 3px on panels, 2px on controls. Nothing rounder.
- Spacing rhythm 4 / 8 / 12 / 20 / 32 / 52. Vary it; equal padding everywhere is
  monotony.
- Body prose capped at 68ch. Readout panels are not prose and may be wider.
