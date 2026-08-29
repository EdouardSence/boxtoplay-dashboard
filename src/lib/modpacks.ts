/**
 * Le catalogue du panel se pagine par numero de page, pas par curseur: il n'y
 * a plus de piste de curseurs a tenir. Restent deux mises en forme, qui sont
 * les seuls endroits ou une donnee brute devient une lecture.
 */

/**
 * Un compteur de telechargements se lit d'un coup d'oeil ou ne se lit pas.
 * 840007 -> "840 k", 2064938 -> "2,1 M". L'espace est insecable pour que
 * l'unite ne parte pas seule a la ligne.
 */
export function formatDownloads(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null
  }

  if (value < 1_000) {
    return String(Math.round(value))
  }

  if (value < 1_000_000) {
    return `${Math.round(value / 1_000)} k`
  }

  const millions = value / 1_000_000
  // Sous 10 M un chiffre apres la virgule distingue encore 2,1 de 2,9.
  const shown = millions < 10 ? millions.toFixed(1).replace('.', ',') : String(Math.round(millions))
  return `${shown} M`
}

/**
 * Le panel range les versions de la plus recente a la plus ancienne, et c'est
 * celle-la qu'on preselectionne: installer autre chose est un choix delibere,
 * pas un defaut.
 */
export function defaultVersionId<T extends { id: string }>(versions: readonly T[]): string | null {
  return versions.length > 0 ? versions[0].id : null
}

/**
 * Le champ arrive sous deux ordres selon la source: "1.20.1 - Forge" dans
 * l'instantané, "NeoForge - 26.1.2" côté panel. Plutôt que de parier sur
 * l'ordre, la moitié qui commence par un chiffre est la version de jeu.
 */
export function splitGameVersion(value: string | null | undefined): {
  loader: string | null
  minecraft: string | null
} {
  if (!value) {
    return { loader: null, minecraft: null }
  }

  const parts = value
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    return { loader: null, minecraft: null }
  }

  if (parts.length === 1) {
    return { loader: null, minecraft: parts[0] }
  }

  const numeric = parts.findIndex((part) => /^\d/.test(part))
  if (numeric === -1) {
    return { loader: parts[0], minecraft: parts[1] }
  }

  return {
    minecraft: parts[numeric],
    loader: parts[numeric === 0 ? 1 : 0],
  }
}

export function filterModpacks<T extends { name: string; summary?: string | null }>(
  modpacks: readonly T[],
  query: string,
): readonly T[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return modpacks

  return modpacks.filter(
    (modpack) =>
      modpack.name.toLowerCase().includes(needle) ||
      (modpack.summary ?? '').toLowerCase().includes(needle),
  )
}

export interface Page<T> {
  items: T[]
  pageId: number
  hasNextPage: boolean
  total: number
}

export function pageOf<T>(items: readonly T[], pageId: number, size: number): Page<T> {
  const safeSize = Math.max(1, size)
  const safePage = Math.max(0, Math.trunc(pageId))
  const start = safePage * safeSize

  return {
    items: items.slice(start, start + safeSize) as T[],
    pageId: safePage,
    hasNextPage: start + safeSize < items.length,
    total: items.length,
  }
}
