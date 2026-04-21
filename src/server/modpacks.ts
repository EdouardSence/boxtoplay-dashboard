import { createServerFn } from '@tanstack/react-start'

interface BoxToPlayModpackApi {
  id: string | number
  name: string
  logo?: string | null
}

interface BoxToPlayCurseCategoryApi {
  id: number
  name: string
  iconUrl?: string | null
}

interface BoxToPlayCurseCategoryCountApi {
  curseModCategory?: BoxToPlayCurseCategoryApi
  count?: number
}

interface BoxToPlayModpackSearchResponse {
  curseMods?: BoxToPlayModpackApi[]
  modpacks?: BoxToPlayModpackApi[]
  data?: BoxToPlayModpackApi[]
  count?: number
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

interface GitHubGistFileApi {
  content?: string | null
}

interface GitHubGistApiResponse {
  files?: Record<string, GitHubGistFileApi>
}

interface BoxToPlayStateAccount {
  cookies?: Record<string, string | undefined> | null
}

interface BoxToPlayGistState {
  active_account_index?: number
  accounts?: BoxToPlayStateAccount[]
}

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

const REQUEST_TIMEOUT_MS = 10_000
const MAX_QUERY_LENGTH = 80
const MAX_MODPACK_NAME_LENGTH = 120
const SAFE_ID_PATTERN = /^[A-Za-z0-9._:-]+$/
const SAFE_NUMERIC_ID_PATTERN = /^\d+$/
const DEFAULT_BOXTOPLAY_SERVER_ID = '951457'
const MODPACK_SEARCH_PAGE_SIZE = 10
const BOXTOPLAY_SESSION_COOKIE_KEY = 'BOXTOPLAY_SESSION'
const BOXTOPLAY_REFERER = 'https://www.boxtoplay.com/minecraft/modpacks'
const BOXTOPLAY_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const COOKIE_CACHE_TTL_MS = 60_000
const FALLBACK_MODPACK_CATEGORIES: ModpackCategory[] = [
  { id: '0', name: 'All', icon: 'https://www.boxtoplay.com/assets/backend/modpacks/icons/allcategories.png', count: 3094 },
  { id: '1', name: 'Tech', icon: 'https://media.forgecdn.net/avatars/14/479/635596761534662757.png', count: 1737 },
  { id: '2', name: 'Magic', icon: 'https://media.forgecdn.net/avatars/14/474/635596760578719019.png', count: 1279 },
  { id: '3', name: 'Quests', icon: 'https://media.forgecdn.net/avatars/14/487/635596816137981263.png', count: 1203 },
  { id: '4', name: 'Exploration', icon: 'https://media.forgecdn.net/avatars/14/486/635596815896417213.png', count: 2128 },
  { id: '5', name: 'Extra Large', icon: 'https://media.forgecdn.net/avatars/14/472/635596760403562826.png', count: 503 },
  { id: '6', name: 'Adventure and RPG', icon: 'https://media.forgecdn.net/avatars/14/480/635596775049811800.png', count: 1818 },
  { id: '7', name: 'Map Based', icon: 'https://media.forgecdn.net/avatars/14/475/635596760683250342.png', count: 92 },
  { id: '8', name: 'Hardcore', icon: 'https://media.forgecdn.net/avatars/14/473/635596760504656528.png', count: 319 },
  { id: '9', name: 'Combat / PvP', icon: 'https://media.forgecdn.net/avatars/14/313/635591779575605594.png', count: 657 },
  { id: '10', name: 'Multiplayer', icon: 'https://media.forgecdn.net/avatars/14/481/635596792838491141.png', count: 1491 },
  { id: '11', name: 'Vanilla+', icon: 'https://media.forgecdn.net/avatars/451/388/637713564446392425.png', count: 638 },
  { id: '12', name: 'Skyblock', icon: 'https://media.forgecdn.net/avatars/162/818/636678840408956323.png', count: 254 },
  { id: '13', name: 'Small / Light', icon: 'https://media.forgecdn.net/avatars/14/478/635596761449660932.png', count: 489 },
  { id: '14', name: 'FTB Official Pack', icon: 'https://media.forgecdn.net/avatars/15/166/635616941825349689.png', count: 51 },
  { id: '15', name: 'Sci-Fi', icon: 'https://media.forgecdn.net/avatars/14/323/635591780581068715.png', count: 79 },
  { id: '16', name: 'Mini Game', icon: 'https://media.forgecdn.net/avatars/15/517/635627406184649114.png', count: 40 },
  { id: '17', name: 'Horror', icon: 'https://media.forgecdn.net/avatars/1062/213/638594627103104125.png', count: 108 },
  { id: '18', name: 'Expert', icon: 'https://media.forgecdn.net/avatars/1585/295/639026019554106289.png', count: 30 },
  { id: '19', name: 'RLCraft', icon: 'https://media.forgecdn.net/avatars/1729/298/639100433200568522.png', count: 1 },
]

let cachedCookieHeader: { value: string; expiresAt: number } | null = null

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

const toCookieHeader = (value: string | null | undefined): string | null => {
  if (!value) {
    return null
  }

  const trimmed = value.trim()

  if (!trimmed || !isSafeText(trimmed)) {
    return null
  }

  if (trimmed.includes('=')) {
    return trimmed
  }

  return `${BOXTOPLAY_SESSION_COOKIE_KEY}=${trimmed}`
}

const getActiveCookieFromState = (state: BoxToPlayGistState): string | null => {
  const accounts = Array.isArray(state.accounts) ? state.accounts : []

  if (accounts.length === 0) {
    return null
  }

  const activeIndex =
    Number.isInteger(state.active_account_index) &&
    (state.active_account_index ?? -1) >= 0 &&
    (state.active_account_index ?? -1) < accounts.length
      ? (state.active_account_index as number)
      : 0

  const activeCookie = toCookieHeader(accounts[activeIndex]?.cookies?.[BOXTOPLAY_SESSION_COOKIE_KEY])

  if (activeCookie) {
    return activeCookie
  }

  for (const account of accounts) {
    const fallbackCookie = toCookieHeader(account?.cookies?.[BOXTOPLAY_SESSION_COOKIE_KEY])

    if (fallbackCookie) {
      return fallbackCookie
    }
  }

  return null
}

const loadBoxToPlayCookieHeaderFromGist = async (): Promise<string> => {
  const token = process.env.GH_TOKEN
  const gistId = process.env.GIST_ID

  if (!token || !gistId) {
    throw new Error('Missing Gist configuration (GH_TOKEN or GIST_ID)')
  }

  const response = await fetchWithTimeout(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to load BoxToPlay cookies from Gist')
  }

  const payload = (await response.json()) as GitHubGistApiResponse
  const files = payload.files ?? {}

  for (const file of Object.values(files)) {
    if (typeof file.content !== 'string' || file.content.trim().length === 0) {
      continue
    }

    try {
      const state = JSON.parse(file.content) as BoxToPlayGistState
      const cookieHeader = getActiveCookieFromState(state)

      if (cookieHeader) {
        return cookieHeader
      }
    } catch {
      // ignore non-JSON gist files and try next
    }
  }

  throw new Error('No usable BoxToPlay session cookie found in Gist state')
}

const getBoxToPlayCookieHeader = async (): Promise<string> => {
  if (cachedCookieHeader && cachedCookieHeader.expiresAt > Date.now()) {
    return cachedCookieHeader.value
  }

  const value = await loadBoxToPlayCookieHeaderFromGist()

  cachedCookieHeader = {
    value,
    expiresAt: Date.now() + COOKIE_CACHE_TTL_MS,
  }

  return value
}

const getBoxToPlayRequestHeaders = (cookieHeader: string): HeadersInit => ({
  accept: 'application/json, text/plain, */*',
  'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8',
  cookie: cookieHeader,
  referer: BOXTOPLAY_REFERER,
  'user-agent': BOXTOPLAY_USER_AGENT,
  'x-requested-with': 'XMLHttpRequest',
})

const fetchBoxToPlayWithAuth = async (url: string): Promise<Response> => {
  const cachedCookie = await getBoxToPlayCookieHeader()
  let response = await fetchWithTimeout(url, {
    headers: getBoxToPlayRequestHeaders(cachedCookie),
  })

  if (response.status === 401 || response.status === 403) {
    cachedCookieHeader = null
    const freshCookie = await getBoxToPlayCookieHeader()
    response = await fetchWithTimeout(url, {
      headers: getBoxToPlayRequestHeaders(freshCookie),
    })
  }

  return response
}

const getBoxToPlayServerId = () => {
  const serverId = (process.env.BOXTOPLAY_SERVER_ID ?? DEFAULT_BOXTOPLAY_SERVER_ID).trim()

  if (!SAFE_NUMERIC_ID_PATTERN.test(serverId)) {
    throw new Error('BOXTOPLAY_SERVER_ID must be numeric')
  }

  return serverId
}

export const getModpackCategories = createServerFn({ method: 'GET' }).handler(async (): Promise<ModpackCategory[]> => {
  const serverId = getBoxToPlayServerId()

  const response = await fetchBoxToPlayWithAuth(
    `https://www.boxtoplay.com/minecraft/modpacks/cursemodpacks/categories/${encodeURIComponent(serverId)}`,
  )

  if (!response.ok) {
    return FALLBACK_MODPACK_CATEGORIES
  }

  const payload = (await response.json()) as BoxToPlayCurseCategoryCountApi[]

  const categories = payload
    .filter((entry) => {
      const category = entry.curseModCategory

      return !!category && SAFE_NUMERIC_ID_PATTERN.test(String(category.id)) && isSafeText(category.name)
    })
    .map((entry) => {
      const category = entry.curseModCategory as BoxToPlayCurseCategoryApi

      return {
        id: String(category.id),
        name: category.name,
        icon: toSafeImageUrl(category.iconUrl),
        count: typeof entry.count === 'number' && Number.isFinite(entry.count) ? entry.count : 0,
      }
    })

  return categories.length > 0 ? categories : FALLBACK_MODPACK_CATEGORIES
})

export const searchModpacks = createServerFn({ method: 'GET' })
  .handler(async ({ data }): Promise<ModpackSearchResult> => {
    const input = data as { query?: string; pageId?: number; categoryId?: string } | undefined
    const query = (input?.query ?? '').trim()
    const pageId = Number.isInteger(input?.pageId) && (input?.pageId ?? 0) >= 0 ? (input?.pageId ?? 0) : 0
    const categoryId = (input?.categoryId ?? '0').trim()
    const serverId = getBoxToPlayServerId()

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

    if (!SAFE_NUMERIC_ID_PATTERN.test(categoryId)) {
      throw new Error('Invalid modpack category id')
    }

    const searchParams = new URLSearchParams({
      search: query,
      pageId: String(pageId),
    })

    if (categoryId !== '0') {
      searchParams.set('categoryId', categoryId)
    }

    const response = await fetchBoxToPlayWithAuth(
      `https://www.boxtoplay.com/minecraft/modpacks/cursemodpacks/search/${encodeURIComponent(serverId)}?${searchParams.toString()}`,
    )

    if (!response.ok) {
      throw new Error('Failed to search modpacks')
    }

    const payload = (await response.json()) as BoxToPlayModpackSearchResponse | BoxToPlayModpackApi[]
    const totalCount = Array.isArray(payload)
      ? payload.length
      : typeof payload.count === 'number' && Number.isFinite(payload.count)
        ? payload.count
        : 0
    const list = Array.isArray(payload) ? payload : payload.curseMods ?? payload.modpacks ?? payload.data ?? []

    const modpacks = list
      .filter(
        (modpack) =>
          SAFE_ID_PATTERN.test(String(modpack.id)) &&
          isSafeText(modpack.name) &&
          modpack.name.length <= MAX_MODPACK_NAME_LENGTH,
      )
      .map((modpack) => ({
        id: String(modpack.id),
        name: modpack.name,
        logo: toSafeImageUrl(modpack.logo),
      }))

    return {
      modpacks,
      totalCount: totalCount || modpacks.length,
      pageId,
      pageSize: MODPACK_SEARCH_PAGE_SIZE,
    }
  })

export const getModpackVersions = createServerFn({ method: 'GET' })
  .handler(async ({ data }): Promise<ModpackVersion[]> => {
    const input = data as { packId?: string } | undefined
    const packId = (input?.packId ?? '').trim()

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

    const input = data as { modpackName?: string; modpackVersionId?: string } | undefined
    const modpackName = (input?.modpackName ?? '').trim()
    const modpackVersionId = (input?.modpackVersionId ?? '').trim()

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
