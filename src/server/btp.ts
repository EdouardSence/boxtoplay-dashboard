import { createServerFn } from '@tanstack/react-start'

import { collectApiKeys, pickActiveService, type BtpService } from '@/lib/btp'

// =============================================================================
// Official BoxToPlay REST API — https://api.boxtoplay.com/docs
//
// Authenticated with a per-account API key, not the BOXTOPLAY_SESSION cookie
// the rest of this project juggles. Read-only here: server vitals only.
//
// The modpack catalog lives on the same API too, but it is unusable for the
// browser: one row per VERSION, pack and version names glued with no
// separator, and no artwork. See server/catalog.ts.
// =============================================================================

const BTP_API_BASE = 'https://api.boxtoplay.com/v1'
const REQUEST_TIMEOUT_MS = 15_000
// Measured quota: 120 requests / 60s, plus a burst ceiling on top of it.
// A 30s TTL keeps the dashboard nowhere near either limit.
const VITALS_CACHE_TTL_MS = 30_000

interface BtpEnvelope<T> {
  success?: boolean
  data?: T
  error?: { code?: string; message?: string }
  request_id?: string
}

interface BtpServiceList {
  services?: BtpService[]
  next_cursor?: string | null
}

interface BtpServiceDetail extends BtpService {
  connection_address?: string
  installed_modpack?: { id?: string; name?: string; provider?: string } | null
}

/**
 * Un compte, son essai vivant s'il en a un. La rotation alterne entre deux
 * comptes: ne montrer que l'actif cache justement l'information qui dit si la
 * releve est possible.
 */
export interface AccountTrial {
  /** Rang de la cle, donc rang du compte dans le Gist. */
  index: number
  displayId: number | null
  expiresAt: string | null
  /** Ce compte porte-t-il le serveur qui sert en ce moment ? */
  isLive: boolean
}

export interface ServerVitals {
  serverId: string
  displayId: number | null
  runtimeStatus: string
  connectionAddress: string | null
  expiresAt: string | null
  installedModpack: string | null
  modpackProvider: string | null
  fleet: AccountTrial[]
}

export const btpFetch = async <T>(
  path: string,
  params?: Record<string, string>,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
  apiKey?: string,
): Promise<T> => {
  const key = apiKey ?? collectApiKeys(process.env)[0]

  if (!key) {
    throw new Error('Missing BTP_API_KEY (https://www.boxtoplay.com/profile/api-keys)')
  }

  const url = new URL(`${BTP_API_BASE}${path}`)
  for (const [name, value] of Object.entries(params ?? {})) {
    url.searchParams.set(name, value)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        authorization: `Bearer ${key}`,
        accept: 'application/json',
      },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  const payload = (await response.json().catch(() => ({}))) as BtpEnvelope<T>

  // The API does return application errors as HTTP 200 with success:false.
  if (!response.ok || payload.success === false) {
    const detail = payload.error?.code ?? response.status
    throw new Error(`BoxToPlay API ${path} failed: ${detail}`)
  }

  return (payload.data ?? {}) as T
}

let vitalsCache: { data: ServerVitals; expiresAt: number } | null = null

export const getServerVitals = createServerFn({ method: 'GET' }).handler(async (): Promise<ServerVitals> => {
  if (vitalsCache && vitalsCache.expiresAt > Date.now()) {
    return vitalsCache.data
  }

  const keys = collectApiKeys(process.env)

  if (keys.length === 0) {
    throw new Error('Missing BTP_API_KEY (https://www.boxtoplay.com/profile/api-keys)')
  }

  // One key per account: the live server is on whichever account the rotation
  // last landed on, so both are listed and the live one picked across them.
  const owners = new Map<string, string>()
  const services: BtpService[] = []
  const byAccount: BtpService[][] = []
  for (const key of keys) {
    const list = await btpFetch<BtpServiceList>('/services/minecraft', { limit: '50' }, REQUEST_TIMEOUT_MS, key)
    const own = list.services ?? []
    byAccount.push(own)
    for (const service of own) {
      owners.set(service.id, key)
      services.push(service)
    }
  }

  const wanted = (process.env.BOXTOPLAY_SERVER_ID ?? '').trim()
  const active = pickActiveService(services, wanted)

  if (!active) {
    throw new Error('No Minecraft service on these BoxToPlay accounts')
  }

  const key = owners.get(active.id)
  const [detail, status] = await Promise.all([
    btpFetch<BtpServiceDetail>(`/services/minecraft/${active.id}`, undefined, REQUEST_TIMEOUT_MS, key),
    btpFetch<{ runtime_status?: string }>(`/services/minecraft/${active.id}/status`, undefined, REQUEST_TIMEOUT_MS, key),
  ])

  // Chaque compte traine ses essais morts: on ne retient que le vivant le plus
  // tardif, celui que le worker verrait.
  const now = Date.now()
  const fleet: AccountTrial[] = byAccount.map((own, index) => {
    const alive = own.filter((service) => {
      const at = Date.parse(service.expires_at ?? '')
      return !Number.isNaN(at) && at > now
    })
    const best = alive.reduce<BtpService | null>((latest, service) => {
      if (!latest) return service
      return Date.parse(service.expires_at ?? '') > Date.parse(latest.expires_at ?? '') ? service : latest
    }, null)

    return {
      index,
      displayId: typeof best?.display_id === 'number' ? best.display_id : null,
      expiresAt: best?.expires_at ?? null,
      isLive: best?.id === active.id,
    }
  })

  const vitals: ServerVitals = {
    serverId: active.id,
    displayId: typeof detail.display_id === 'number' ? detail.display_id : null,
    runtimeStatus: status.runtime_status ?? 'unknown',
    connectionAddress: detail.connection_address ?? null,
    expiresAt: detail.expires_at ?? null,
    installedModpack: detail.installed_modpack?.name ?? null,
    modpackProvider: detail.installed_modpack?.provider ?? null,
    fleet,
  }

  vitalsCache = { data: vitals, expiresAt: Date.now() + VITALS_CACHE_TTL_MS }
  return vitals
})
