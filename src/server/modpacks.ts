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
const REQUEST_TIMEOUT_MS = 30_000

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

  // Use raw URL to avoid Gist API truncation for large files
  const rawUrl = `https://gist.githubusercontent.com/raw/${gistId}/modpacks_catalog.json`
  logModpacks('info', 'Fetching catalog from raw URL', { url: rawUrl })

  const response = await fetchWithTimeout(rawUrl, {
    headers: {
      accept: 'application/json',
    },
  })

  logModpacks('info', 'Gist fetch completed', { status: response.status, statusText: response.statusText })

  if (!response.ok) {
    logModpacks('error', 'Failed to load Gist', {
      status: response.status,
      statusText: response.statusText,
    })
    throw new Error('Failed to load modpack catalog from Gist')
  }

  const rawText = await response.text()
  logModpacks('info', 'Raw response size', { bytes: rawText.length })

  logModpacks('info', 'Catalog JSON size', { bytes: rawText.length })

  let catalog: ModpackCatalog
  try {
    catalog = JSON.parse(rawText) as ModpackCatalog
  } catch (parseError) {
    logModpacks('error', 'Catalog JSON parse failed', {
      error: parseError instanceof Error ? parseError.message : String(parseError),
      preview: rawText.slice(0, 200),
    })
    throw new Error('Failed to parse modpack catalog JSON')
  }

  logModpacks('info', 'Catalog parsed successfully', {
    updatedAt: catalog.updated_at,
    total: catalog.total,
    categories: catalog.categories?.length ?? 0,
  })

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
    // Versions are not included in the Gist catalog — the scraper only fetches categories and modpack list.
    // Users should use the GitHub workflow to select and install modpacks.
    return []
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
