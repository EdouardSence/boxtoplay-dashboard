// =============================================================================
// Catalogue modpacks — instantané publié dans le Gist
//
// Trois sources ont été essayées, une seule tient:
//
//   API REST v1   trois champs par entrée (id, name, provider), une entrée par
//                 VERSION avec le nom du pack et celui de la version collés,
//                 aucune jaquette. Pas d'endpoint de détail (404).
//   Panel en direct  porte tout ce qu'il faut, mais Cloudflare rejette
//                 l'empreinte TLS de Node: 403 depuis `fetch` comme depuis
//                 `node:https`, là où Python et curl passent avec le même
//                 cookie. Injoignable depuis Vercel, donc écarté.
//   Instantané Gist  publié par le worker, qui tourne en Python et atteint le
//                 panel. 3064 packs avec jaquette, et leurs versions.
//
// C'est l'architecture d'origine, retirée en Phase 5 faute de consommateur.
// Elle en a un de nouveau.
//
// Contrepartie: l'instantané vieillit entre deux passes du worker. Son
// `updated_at` remonte jusqu'à l'écran plutôt que d'être tu.
// =============================================================================

const CATALOG_TTL_MS = 5 * 60 * 1000
const REQUEST_TIMEOUT_MS = 25_000

export interface CatalogModpack {
  id: string
  name: string
  logo: string | null
  downloads: number | null
  summary: string | null
}

export interface CatalogVersion {
  id: string
  name: string
  gameVersion: string | null
}

interface RawCatalog {
  updated_at?: string
  modpacks?: Array<{
    id?: number | string
    name?: string
    logo?: string | null
    downloadCount?: number
    shortdescription?: string | null
  }>
}

interface RawVersions {
  updated_at?: string
  versions?: Record<string, Array<{ id?: string | number; version_name?: string; minecraft_version?: string | null }>>
}

interface Catalog {
  updatedAt: string | null
  modpacks: CatalogModpack[]
}

// Le catalogue pèse 1,4 Mo et les versions 2,7 Mo: deux caches séparés, pour
// qu'ouvrir la page ne tire pas le fichier dont elle n'a pas besoin.
let catalogCache: { value: Catalog; expiresAt: number } | null = null
let versionsCache: { value: Record<string, CatalogVersion[]>; expiresAt: number } | null = null

function gistRawUrl(file: string): string {
  const gistId = (process.env.GIST_ID ?? '').trim()
  if (!gistId) {
    throw new Error('GIST_ID absent de la configuration')
  }
  return `https://gist.githubusercontent.com/raw/${gistId}/${file}`
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Instantané du catalogue illisible (${response.status})`)
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

/** Les jaquettes viennent du CDN CurseForge: on ne rend que du https absolu. */
function safeImageUrl(value: string | null | undefined): string | null {
  if (!value) return null

  try {
    const parsed = new URL(value, 'https://www.boxtoplay.com')
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

export async function loadCatalog(): Promise<Catalog> {
  if (catalogCache && catalogCache.expiresAt > Date.now()) {
    return catalogCache.value
  }

  const raw = await fetchJson<RawCatalog>(gistRawUrl('modpacks_catalog.json'))

  const value: Catalog = {
    updatedAt: raw.updated_at ?? null,
    modpacks: (raw.modpacks ?? [])
      .filter((mod) => mod.id !== undefined && mod.name)
      .map((mod) => ({
        id: String(mod.id),
        name: String(mod.name),
        logo: safeImageUrl(mod.logo),
        downloads: typeof mod.downloadCount === 'number' ? mod.downloadCount : null,
        summary: mod.shortdescription?.trim() || null,
      })),
  }

  catalogCache = { value, expiresAt: Date.now() + CATALOG_TTL_MS }
  return value
}

export async function loadVersions(): Promise<Record<string, CatalogVersion[]>> {
  if (versionsCache && versionsCache.expiresAt > Date.now()) {
    return versionsCache.value
  }

  const raw = await fetchJson<RawVersions>(gistRawUrl('modpacks_versions.json'))
  const value: Record<string, CatalogVersion[]> = {}

  for (const [modpackId, versions] of Object.entries(raw.versions ?? {})) {
    value[modpackId] = versions
      .filter((version) => version.id !== undefined && version.version_name)
      .map((version) => ({
        id: String(version.id),
        name: String(version.version_name),
        gameVersion: version.minecraft_version?.trim() || null,
      }))
  }

  versionsCache = { value, expiresAt: Date.now() + CATALOG_TTL_MS }
  return value
}
