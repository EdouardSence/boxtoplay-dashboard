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

export const searchModpacks = createServerFn({ method: 'GET' })
  .validator((data: { query: string }) => data)
  .handler(async ({ data }): Promise<ModpackSummary[]> => {
    const query = data.query.trim()

    if (!query) {
      return []
    }

    const response = await fetch(`https://api.boxtoplay.com/v1/modpacks/search?q=${encodeURIComponent(query)}`, {
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
      logo: modpack.logo ?? null,
    }))
  })

export const getModpackVersions = createServerFn({ method: 'GET' })
  .validator((data: { packId: string }) => data)
  .handler(async ({ data }): Promise<ModpackVersion[]> => {
    const packId = data.packId.trim()

    if (!packId) {
      return []
    }

    const response = await fetch(`https://api.boxtoplay.com/v1/modpacks/${encodeURIComponent(packId)}/versions`, {
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

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/change_modpack.yml/dispatches`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          modpack_name: data.modpackName,
          modpack_id: data.modpackVersionId,
        },
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to trigger modpack switch workflow')
    }
  })
