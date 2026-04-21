import { createServerFn } from '@tanstack/react-start'

interface BoxToPlayModpackApi {
  id: string
  name: string
  logo?: string | null
}

interface BoxToPlayModpackSearchResponse {
  modpacks?: BoxToPlayModpackApi[]
  data?: BoxToPlayModpackApi[]
}

interface BoxToPlayModpackVersionApi {
  id: string
  version_name: string
  minecraft_version?: string | null
}

interface BoxToPlayModpackVersionsResponse {
  versions?: BoxToPlayModpackVersionApi[]
  data?: BoxToPlayModpackVersionApi[]
}

export interface ModpackSummary {
  id: string
  name: string
  logo: string | null
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
    const parsed = new URL(value)

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null
    }

    return parsed.toString()
  } catch {
    return null
  }
}

const isSafeText = (value: string) => !/[\x00-\x1F\x7F]/.test(value)

export const searchModpacks = createServerFn({ method: 'GET' })
  .validator((data: { query: string }) => data)
  .handler(async ({ data }): Promise<ModpackSummary[]> => {
    const query = data.query.trim()

    if (!query) {
      return []
    }

    if (query.length > MAX_QUERY_LENGTH || !isSafeText(query)) {
      throw new Error('Invalid modpack search query')
    }

    const response = await fetchWithTimeout(`https://api.boxtoplay.com/v1/modpacks/search?q=${encodeURIComponent(query)}`, {
      headers: {
        accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to search modpacks')
    }

    const payload = (await response.json()) as BoxToPlayModpackSearchResponse | BoxToPlayModpackApi[]
    const list = Array.isArray(payload) ? payload : payload.modpacks ?? payload.data ?? []

    return list.map((modpack) => ({
      id: modpack.id,
      name: modpack.name,
      logo: toSafeImageUrl(modpack.logo),
    }))
  })

export const getModpackVersions = createServerFn({ method: 'GET' })
  .validator((data: { packId: string }) => data)
  .handler(async ({ data }): Promise<ModpackVersion[]> => {
    const packId = data.packId.trim()

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

    return list.map((version) => ({
      id: version.id,
      versionName: version.version_name,
      minecraftVersion: version.minecraft_version ?? null,
    }))
  })

export const triggerModpackSwitch = createServerFn({ method: 'POST' })
  .validator((data: { modpackName: string; modpackVersionId: string }) => data)
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

    const modpackName = data.modpackName.trim()
    const modpackVersionId = data.modpackVersionId.trim()

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
