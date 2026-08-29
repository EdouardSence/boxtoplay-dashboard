import * as React from 'react'

import { cn } from '@/lib/utils'

// =============================================================================
// Primitives d'instrument
//
// Voir DESIGN.md. Trois pieces suffisent a toute la surface: un panneau qui
// s'aboute a ses voisins, une lecture creusee dans ce panneau, une jauge pour
// toute quantite bornee. Le temoin est la quatrieme parce qu'un etat vivant se
// signale par une lampe, pas par une couleur de fond.
// =============================================================================

export type Signal = 'live' | 'warn' | 'fault' | 'idle'

const SIGNAL_TEXT: Record<Signal, string> = {
  live: 'text-live',
  warn: 'text-warn',
  fault: 'text-fault',
  idle: 'text-idle',
}

const SIGNAL_FILL: Record<Signal, string> = {
  live: 'bg-live',
  warn: 'bg-warn',
  fault: 'bg-fault',
  idle: 'bg-idle',
}

// -----------------------------------------------------------------------------
// Panneau
// -----------------------------------------------------------------------------

export function Panel({
  title,
  note,
  aside,
  children,
  className,
}: {
  title?: string
  note?: string
  aside?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('panel', className)}>
      {(title || aside) && (
        <header className="flex items-baseline justify-between gap-4 border-b border-edge-soft px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="engraved">{title}</h2>}
            {note && <p className="mt-1.5 text-xs text-ink-label">{note}</p>}
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

// -----------------------------------------------------------------------------
// Lecture
//
// Le nombre est le contenu, l'etiquette n'est qu'une gravure: deux crans
// d'ecart minimum entre les deux.
// -----------------------------------------------------------------------------

export function Readout({
  label,
  value,
  signal,
  title,
  className,
}: {
  label: string
  value: React.ReactNode
  signal?: Signal
  title?: string
  className?: string
}) {
  return (
    <div className={cn('recess rounded-[2px] px-3.5 py-3', className)}>
      <p className="engraved">{label}</p>
      <p
        title={title}
        className={cn(
          'readout mt-2 truncate text-[15px] leading-none',
          signal ? SIGNAL_TEXT[signal] : 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Jauge
//
// Toute quantite bornee est dessinee, pas seulement ecrite. Remplissage a bord
// franc: pas de degrade, pas de bout arrondi en tete.
// -----------------------------------------------------------------------------

export function Gauge({
  value,
  signal = 'live',
  ticks,
  className,
  label,
}: {
  /** 0 a 1. Hors bornes, la valeur est ramenee dedans. */
  value: number
  signal?: Signal
  /** Positions 0 a 1 des seuils qui veulent dire quelque chose. */
  ticks?: number[]
  className?: string
  label?: string
}) {
  const filled = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))

  return (
    <div
      role="meter"
      aria-valuenow={Math.round(filled * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('recess relative h-1.5 w-full overflow-hidden rounded-[1px]', className)}
    >
      <div
        className={cn('absolute inset-y-0 left-0', SIGNAL_FILL[signal])}
        style={{ width: `${filled * 100}%` }}
      />
      {ticks?.map((tick) => (
        <span
          key={tick}
          aria-hidden
          className="absolute inset-y-0 w-px bg-ground/70"
          style={{ left: `${Math.max(0, Math.min(1, tick)) * 100}%` }}
        />
      ))}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Temoin
// -----------------------------------------------------------------------------

export function Lamp({ signal, className }: { signal: Signal; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block h-2 w-2 shrink-0 rounded-full',
        SIGNAL_FILL[signal],
        signal === 'live' && 'lamp-live',
        className,
      )}
    />
  )
}

// -----------------------------------------------------------------------------
// Etat nomme
//
// Un etat se lit meme sans percevoir la couleur: le mot porte l'information,
// la lampe ne fait que la doubler.
// -----------------------------------------------------------------------------

export function State({ signal, children }: { signal: Signal; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.09em]', SIGNAL_TEXT[signal])}>
      <Lamp signal={signal} />
      {children}
    </span>
  )
}

// -----------------------------------------------------------------------------
// Creux de chargement
// -----------------------------------------------------------------------------

export function Well({ className }: { className?: string }) {
  return <div className={cn('loading-well', className)} />
}

// -----------------------------------------------------------------------------
// Panne
//
// Dit quelle source est muette, jamais un vide confiant.
// -----------------------------------------------------------------------------

export function Fault({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 text-sm text-ink-dim">
      <Lamp signal="fault" className="mt-1.5" />
      <span className="max-w-[68ch]">{children}</span>
    </p>
  )
}

// -----------------------------------------------------------------------------
// En-tete de page
// -----------------------------------------------------------------------------

export function PageHead({ title, note }: { title: string; note: string }) {
  return (
    <header className="pb-1">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-1.5 max-w-[68ch] text-sm text-ink-dim">{note}</p>
    </header>
  )
}
