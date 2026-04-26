import { createServerFn } from '@tanstack/react-start'

// =============================================================================
// Types
// =============================================================================

interface CatalogModpack {
  id: string | number
  name: string
  logo?: string | null
}

interface CatalogCategory {
  id: string | number
  name: string
  iconUrl?: string | null
  count?: number
}

interface ModpackCatalog {
  updated_at: string
  server_id: string
  pages_scraped: number
  total: number
  categories: CatalogCategory[]
  modpacks: CatalogModpack[]
}

interface BoxToPlayModpackVersionApi {
  id: string | number
  version_name: string
  minecraft_version?: string | null
}

interface BoxToPlayModpackVersionsResponse {
  versions?: BoxToPlayModpackVersionApi[]
  data?: BoxToPlayModpackVersionApi[]
}

// =============================================================================
// Public types (exported to routes)
// =============================================================================

export interface ModpackSummary {
  id: string
  name: string
  logo: string | null
}

export interface ModpackSearchResult {
  modpacks: ModpackSummary[]
  totalCount: number
  pageId: number
  pageSize: number
}

export interface ModpackCategory {
  id: string
  name: string
  icon: string | null
  count: number
}

export interface ModpackVersion {
  id: string
  versionName: string
  minecraftVersion: string | null
}

// =============================================================================
// Constants
// =============================================================================

const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MODPACK_SEARCH_PAGE_SIZE = 20
const MAX_QUERY_LENGTH = 80
const MAX_MODPACK_NAME_LENGTH = 120
const SAFE_ID_PATTERN = /^[A-Za-z0-9._:-]+$/
const REQUEST_TIMEOUT_MS = 10_000

// =============================================================================
// Helpers
// =============================================================================

const logModpacks = (level: 'info' | 'warn' | 'error', message: string, details?: Record<string, unknown>) => {
  const payload = details ? { message, ...details } : { message }

  if (level === 'error') {
    console.error('[modpacks]', payload)
    return
  }

  if (level === 'warn') {
    console.warn('[modpacks]', payload)
    return
  }

  console.info('[modpacks]', payload)
}

const fetchWithTimeout = (url: string, init?: RequestInit) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  return fetch(url, {
    ...init,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeout)
  })
}

const toSafeImageUrl = (value: string | null | undefined): string | null => {
  if (!value) {
    return null
  }

  try {
    const parsed = new URL(value, 'https://www.boxtoplay.com')

    if (parsed.protocol !== 'https:') {
      return null
    }

    return parsed.toString()
  } catch {
    return null
  }
}

const isSafeText = (value: string) => !/[\x00-\x1F\x7F]/.test(value)

// =============================================================================
// Catalog cache (Gist-backed, refreshed every 5 minutes)
// =============================================================================

let catalogCache: { data: ModpackCatalog; expiresAt: number } | null = null

const loadCatalogFromGist = async (): Promise<ModpackCatalog> => {
  if (catalogCache && catalogCache.expiresAt > Date.now()) {
    return catalogCache.data
  }

  const token = process.env.GH_TOKEN
  const gistId = (process.env.GIST_ID ?? '').trim()

  if (!token || !gistId) {
    throw new Error('Missing Gist configuration (GH_TOKEN or GIST_ID)')
  }

  logModpacks('info', 'Loading modpack catalog from Gist...')

  const response = await fetchWithTimeout(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
    },
  })

  if (!response.ok) {
    logModpacks('error', 'Failed to load Gist', {
      status: response.status,
      statusText: response.statusText,
    })
    throw new Error('Failed to load modpack catalog from Gist')
  }

  const payload = (await response.json()) as { files?: Record<string, { content?: string | null }> }
  const catalogFile = payload.files?.['modpacks_catalog.json']

  if (!catalogFile?.content) {
    throw new Error('modpacks_catalog.json not found in Gist — the worker has not scraped the catalog yet')
  }

  const catalog = JSON.parse(catalogFile.content) as ModpackCatalog

  logModpacks('info', 'Catalog loaded from Gist', {
    updatedAt: catalog.updated_at,
    total: catalog.total,
    categories: catalog.categories?.length ?? 0,
  })

  catalogCache = {
    data: catalog,
    expiresAt: Date.now() + CATALOG_CACHE_TTL_MS,
  }

  return catalog
}

// =============================================================================
// Server Functions
// =============================================================================

export const getModpackCategories = createServerFn({ method: 'GET' }).handler(async (): Promise<ModpackCategory[]> => {
  const catalog = await loadCatalogFromGist()
  const categories = (catalog.categories ?? [])
    .filter((cat) => cat.id != null && cat.name && isSafeText(cat.name))
    .map((cat) => ({
      id: String(cat.id),
      name: cat.name,
      icon: toSafeImageUrl(cat.iconUrl),
      count: typeof cat.count === 'number' && Number.isFinite(cat.count) ? cat.count : 0,
    }))

  return categories
})

export const searchModpacks = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => data as { query?: string; pageId?: number; categoryId?: string })
  .handler(async ({ data }): Promise<ModpackSearchResult> => {
    const query = (data?.query ?? '').trim().toLowerCase()
    const pageId = Number.isInteger(data?.pageId) && (data?.pageId ?? 0) >= 0 ? (data?.pageId ?? 0) : 0

    if (!query) {
      return {
        modpacks: [],
        totalCount: 0,
        pageId,
        pageSize: MODPACK_SEARCH_PAGE_SIZE,
      }
    }

    if (query.length > MAX_QUERY_LENGTH || !isSafeText(query)) {
      throw new Error('Invalid modpack search query')
    }

    const catalog = await loadCatalogFromGist()

    // Filter modpacks by search query (case-insensitive name match)
    const filtered = catalog.modpacks.filter((modpack) => {
      const name = (modpack.name ?? '').toLowerCase()

      if (!name.includes(query)) {
        return false
      }

      // Validate ID and name
      if (!SAFE_ID_PATTERN.test(String(modpack.id))) {
        return false
      }

      if (modpack.name.length > MAX_MODPACK_NAME_LENGTH || !isSafeText(modpack.name)) {
        return false
      }

      return true
    })

    // Paginate
    const start = pageId * MODPACK_SEARCH_PAGE_SIZE
    const page = filtered.slice(start, start + MODPACK_SEARCH_PAGE_SIZE)

    const modpacks = page.map((modpack) => ({
      id: String(modpack.id),
      name: modpack.name,
      logo: toSafeImageUrl(modpack.logo),
    }))

    return {
      modpacks,
      totalCount: filtered.length,
      pageId,
      pageSize: MODPACK_SEARCH_PAGE_SIZE,
    }
  })

export const getModpackVersions = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => data as { packId?: string })
  .handler(async ({ data }): Promise<ModpackVersion[]> => {
    const packId = (data?.packId ?? '').trim()

    if (!packId) {
      return []
    }

    if (!SAFE_ID_PATTERN.test(packId)) {
      throw new Error('Invalid modpack id')
    }

    const response = await fetchWithTimeout(`https://api.boxtoplay.com/v1/modpacks/${encodeURIComponent(packId)}/versions`, {
      headers: {
        accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch modpack versions')
    }

    const payload = (await response.json()) as BoxToPlayModpackVersionsResponse | BoxToPlayModpackVersionApi[]
    const list = Array.isArray(payload) ? payload : payload.versions ?? payload.data ?? []

    return list
      .filter((version) => {
        const minecraftVersion = version.minecraft_version ?? ''

        return SAFE_ID_PATTERN.test(String(version.id)) && isSafeText(version.version_name) && isSafeText(minecraftVersion)
      })
      .map((version) => ({
        id: String(version.id),
        versionName: version.version_name,
        minecraftVersion: version.minecraft_version ?? null,
      }))
  })

export const triggerModpackSwitch = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => data as { modpackName?: string; modpackVersionId?: string })
  .handler(async ({ data }): Promise<void> => {
    const token = process.env.GH_TOKEN
    const repository = process.env.GITHUB_REPO

    if (!token || !repository) {
      throw new Error('Missing GitHub configuration (GH_TOKEN or GITHUB_REPO)')
    }

    const [owner, repo] = repository.split('/')

    if (!owner || !repo) {
      throw new Error('GITHUB_REPO must be in the format owner/repo')
    }

    const modpackName = (data?.modpackName ?? '').trim()
    const modpackVersionId = (data?.modpackVersionId ?? '').trim()

    if (!modpackName || modpackName.length > MAX_MODPACK_NAME_LENGTH || !isSafeText(modpackName)) {
      throw new Error('Invalid modpack name')
    }

    if (!SAFE_ID_PATTERN.test(modpackVersionId)) {
      throw new Error('Invalid modpack version id')
    }

    const response = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/change_modpack.yml/dispatches`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          modpack_name: modpackName,
          modpack_id: modpackVersionId,
        },
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to trigger modpack switch workflow')
    }
  })
