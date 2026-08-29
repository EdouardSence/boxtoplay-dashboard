import { createServerFn } from '@tanstack/react-start'

import { btpFetch } from '@/server/btp'
import { cursorForPage, rememberCursor, type CursorTrail } from '@/lib/modpacks'

// =============================================================================
// Modpack catalog — official BoxToPlay REST API
//
// This used to read modpacks_catalog.json / modpacks_versions.json from the
// Gist, published by the worker's panel scrape. The API serves the same
// catalog directly, authenticated, so the scrape is no longer in the path.
//
// One model change comes with it: the API's catalog entries ARE installable
// versions ("Star Technology 1.20.1 THETA 1 HOTFIX 3"), so there is no
// pack -> versions second step any more. The id a card carries is the id the
// switch workflow installs.
// =============================================================================

const MAX_QUERY_LENGTH = 80
const MAX_MODPACK_NAME_LENGTH = 120
const SAFE_ID_PATTERN = /^[A-Za-z0-9._:-]+$/
const MODPACK_SEARCH_PAGE_SIZE = 24
const REQUEST_TIMEOUT_MS = 30_000

export interface ModpackSummary {
  id: string
  name: string
  provider: string | null
}

export interface ModpackSearchResult {
  modpacks: ModpackSummary[]
  pageId: number
  pageSize: number
  hasNextPage: boolean
}

interface BtpModpackCatalog {
  items?: Array<{ id?: string; name?: string; provider?: string }>
  next_cursor?: string | null
}

const isSafeText = (value: string) => !/[\x00-\x1F\x7F]/.test(value)

// The API paginates by opaque cursor, the UI by page number. Remembering the
// cursor that opens each page is what bridges the two; a fresh search starts
// its own trail.
const cursorTrails = new Map<string, CursorTrail>()

const trailFor = (query: string): CursorTrail => {
  let trail = cursorTrails.get(query)
  if (!trail) {
    trail = { cursors: [undefined] }
    cursorTrails.set(query, trail)
    // Cheap bound: this map only ever holds the queries typed in one session.
    if (cursorTrails.size > 50) {
      const oldest = cursorTrails.keys().next().value
      if (oldest !== undefined) cursorTrails.delete(oldest)
    }
  }
  return trail
}

const fetchCatalogPage = (query: string, cursor?: string) =>
  btpFetch<BtpModpackCatalog>(
    '/services/minecraft/modpacks',
    {
      limit: String(MODPACK_SEARCH_PAGE_SIZE),
      ...(query ? { query } : {}),
      ...(cursor ? { cursor } : {}),
    },
    REQUEST_TIMEOUT_MS,
  )

export const searchModpacks = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => data as { query?: string; pageId?: number })
  .handler(async ({ data }): Promise<ModpackSearchResult> => {
    const query = (data?.query ?? '').trim()
    const pageId = Number.isInteger(data?.pageId) && (data?.pageId ?? 0) >= 0 ? (data?.pageId ?? 0) : 0

    if (query.length > MAX_QUERY_LENGTH || !isSafeText(query)) {
      throw new Error('Invalid modpack search query')
    }

    const trail = trailFor(query)
    let page: BtpModpackCatalog = {}

    // Walk forward from the furthest page already visited: a cursor API has no
    // random access, and jumping is only possible where we have been.
    for (let index = cursorForPage(trail, pageId); index <= pageId; index += 1) {
      page = await fetchCatalogPage(query, trail.cursors[index])
      rememberCursor(trail, index + 1, page.next_cursor ?? null)
      if (!page.next_cursor && index < pageId) {
        // Asked for a page past the end.
        return { modpacks: [], pageId, pageSize: MODPACK_SEARCH_PAGE_SIZE, hasNextPage: false }
      }
    }

    const modpacks = (page.items ?? [])
      .filter((item): item is { id: string; name: string; provider?: string } =>
        Boolean(item.id && item.name) && SAFE_ID_PATTERN.test(item.id!) &&
        item.name!.length <= MAX_MODPACK_NAME_LENGTH && isSafeText(item.name!))
      .map((item) => ({
        id: item.id,
        name: item.name,
        provider: item.provider ?? null,
      }))

    return {
      modpacks,
      pageId,
      pageSize: MODPACK_SEARCH_PAGE_SIZE,
      hasNextPage: Boolean(page.next_cursor),
    }
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

    if (modpackVersionId && !SAFE_ID_PATTERN.test(modpackVersionId)) {
      throw new Error('Invalid modpack version id')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/change_modpack.yml/dispatches`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            modpack_name: modpackName,
            // An API id (btp_...) makes change_modpack.py install over REST and
            // write state.modpack_api_id; a panel id keeps the old path.
            modpack_id: modpackVersionId,
          },
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      throw new Error('Failed to trigger modpack switch workflow')
    }
  })
