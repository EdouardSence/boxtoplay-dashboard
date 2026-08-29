# BoxToPlay Control Center

## Register

product

## Users

One person: the owner of an automated Minecraft server that migrates itself
between two free trial accounts every eight hours. They open this to answer one
question fast, usually from a laptop, at any hour: **did the server survive the
last rotation?** Secondarily they browse and swap modpacks for the handful of
friends who play on it.

Nobody is being sold anything here. There is no funnel, no onboarding, no
upsell. The audience is one operator who already knows the system.

## Product purpose

Read-out surface over a system that runs unattended. Three jobs:

1. **Vitals** — is the server up, which panel server is live, how long before the
   trial expires, when the next rotation fires.
2. **Modpacks** — browse the catalogue, pick a pack, pick a version, install it
   by dispatching a GitHub Action.
3. **Backups** — inspect and restore world snapshots.

The dashboard never acts directly on BoxToPlay. It reads state and dispatches
workflows; the Python worker does the work.

## Tone

Instrument, not interface. Precise, terse, unhedged. Numbers carry units. States
are named, not implied by colour alone. No marketing voice, no exclamation, no
encouragement. French UI copy where it already is French, English where the
domain terms are English (modpack, rotation, backup).

## Strategic principles

- **A glance must be enough.** Up or down, and how long left, readable from
  across a room. Everything else is secondary.
- **The chrome is quiet so the content can be loud.** Modpack cover art is the
  only saturated colour in the product. The frame stays neutral.
- **Continuous over discrete.** A trial with 8h47m left is a gauge running down,
  not a string. Time pressure should be felt, not parsed.
- **Never invent certainty.** When a source is stale or unreachable, say which
  one and how old, rather than showing a confident empty state.

## Anti-references

- Generic dark shadcn admin dashboards: zinc-950 ground, rounded cards in a
  uniform grid, `backdrop-blur`, coloured glow shadows. This is what the product
  looked like before, and it read as a template rather than an instrument.
- SaaS hero-metric layouts: one enormous number over a small label, gradient
  accent, supporting stat row.
- Gamer-dark clichés: neon on black, angular clipped corners, purple/cyan.
  Minecraft is the subject, not the styling brief.
