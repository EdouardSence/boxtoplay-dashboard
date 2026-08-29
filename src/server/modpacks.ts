import { createServerFn } from '@tanstack/react-start'

import { filterModpacks, pageOf } from '@/lib/modpacks'
import { loadCatalog, loadVersions, type CatalogModpack, type CatalogVersion } from '@/server/catalog'

// =============================================================================
// Catalogue modpacks
//
// Une entree = un modpack, ses versions arrivent au clic. La source est
// l'instantané publié dans le Gist (voir server/catalog.ts pour pourquoi ni
// l'API REST ni le panel en direct ne conviennent).
//
// Les identifiants restent dans l'espace panel. change_modpack.py accepte les
// deux espaces et nettoie l'autre champ du state en consequence, donc rien ici
// n'a a connaitre les ids `btp_`.
// =============================================================================

const MAX_QUERY_LENGTH = 80
const MAX_MODPACK_NAME_LENGTH = 120
const NUMERIC_ID = /^\d+$/
const CONTROL_CHARS = /[\x00-\x1F\x7F]/
const REQUEST_TIMEOUT_MS = 30_000

const PAGE_SIZE = 24

export type ModpackSummary = CatalogModpack
export type ModpackVersion = CatalogVersion

export interface ModpackSearchResult {
  modpacks: ModpackSummary[]
  pageId: number
  hasNextPage: boolean
  total: number
  /** Date de l'instantané: l'écran doit pouvoir dire de quand il parle. */
  updatedAt: string | null
}

const isSafeText = (value: string) => !CONTROL_CHARS.test(value)

export const searchModpacks = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => data as { query?: string; pageId?: number })
  .handler(async ({ data }): Promise<ModpackSearchResult> => {
    const query = (data?.query ?? '').trim()
    const pageId = Number.isInteger(data?.pageId) && (data?.pageId ?? 0) >= 0 ? (data?.pageId ?? 0) : 0

    if (query.length > MAX_QUERY_LENGTH || !isSafeText(query)) {
      throw new Error('Recherche de modpack invalide')
    }

    const catalog = await loadCatalog()
    const page = pageOf(filterModpacks(catalog.modpacks, query), pageId, PAGE_SIZE)

    const modpacks = page.items
      .filter((mod) => mod.name.length <= MAX_MODPACK_NAME_LENGTH && isSafeText(mod.name))
      .map((mod) => ({
        ...mod,
        summary: mod.summary && isSafeText(mod.summary) ? mod.summary : null,
      }))

    return {
      modpacks,
      pageId: page.pageId,
      hasNextPage: page.hasNextPage,
      total: page.total,
      updatedAt: catalog.updatedAt,
    }
  })

export const getModpackVersions = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => data as { modpackId?: string })
  .handler(async ({ data }): Promise<ModpackVersion[]> => {
    const modpackId = (data?.modpackId ?? '').trim()

    if (!NUMERIC_ID.test(modpackId)) {
      throw new Error('Identifiant de modpack invalide')
    }

    const versions = await loadVersions()
    return versions[modpackId] ?? []
  })

export const triggerModpackSwitch = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => data as { modpackName?: string; modpackVersionId?: string })
  .handler(async ({ data }): Promise<void> => {
    const token = process.env.GH_TOKEN
    const repository = process.env.GITHUB_REPO

    if (!token || !repository) {
      throw new Error('Configuration GitHub absente (GH_TOKEN ou GITHUB_REPO)')
    }

    const [owner, repo] = repository.split('/')

    if (!owner || !repo) {
      throw new Error('GITHUB_REPO doit avoir la forme owner/repo')
    }

    const modpackName = (data?.modpackName ?? '').trim()
    const modpackVersionId = (data?.modpackVersionId ?? '').trim()

    if (!modpackName || modpackName.length > MAX_MODPACK_NAME_LENGTH || !isSafeText(modpackName)) {
      throw new Error('Nom de modpack invalide')
    }

    if (!NUMERIC_ID.test(modpackVersionId)) {
      throw new Error('Identifiant de version invalide')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/workflows/change_modpack.yml/dispatches`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${token}`,
            accept: 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            ref: 'main',
            inputs: {
              modpack_name: modpackName,
              // Id panel: change_modpack.py pose modpack_version_id et retire
              // modpack_api_id, pour que la rotation suivante n'installe pas
              // l'ancien pack par l'autre espace d'ids.
              modpack_id: modpackVersionId,
            },
          }),
          signal: controller.signal,
        },
      )
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      throw new Error('Le declenchement du workflow a echoue')
    }
  })
