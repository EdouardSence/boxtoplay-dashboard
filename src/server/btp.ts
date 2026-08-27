import { createServerFn } from '@tanstack/react-start'

import { pickActiveService, type BtpService } from '@/lib/btp'

// =============================================================================
// Official BoxToPlay REST API — https://api.boxtoplay.com/docs
//
// Authenticated with a per-account API key, not the BOXTOPLAY_SESSION cookie
// the rest of this project juggles. Read-only here: server vitals only.
//
// The modpack catalog lives on the same API, but the switch flow cannot move
// yet: the dashboard writes state.modpack_version_id, and worker.py feeds that
// id to the panel installer. API ids (btp_...) would break the next rotation.
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

export interface ServerVitals {
  serverId: string
  displayId: number | null
  runtimeStatus: string
  connectionAddress: string | null
  expiresAt: string | null
  installedModpack: string | null
  modpackProvider: string | null
}

export const btpFetch = async <T>(
  path: string,
  params?: Record<string, string>,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<T> => {
  const key = (process.env.BTP_API_KEY ?? '').trim()

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

  const list = await btpFetch<BtpServiceList>('/services/minecraft', { limit: '50' })
  const wanted = (process.env.BOXTOPLAY_SERVER_ID ?? '').trim()
  const active = pickActiveService(list.services ?? [], wanted)

  if (!active) {
    throw new Error('No Minecraft service on this BoxToPlay account')
  }

  const [detail, status] = await Promise.all([
    btpFetch<BtpServiceDetail>(`/services/minecraft/${active.id}`),
    btpFetch<{ runtime_status?: string }>(`/services/minecraft/${active.id}/status`),
  ])

  const vitals: ServerVitals = {
    serverId: active.id,
    displayId: typeof detail.display_id === 'number' ? detail.display_id : null,
    runtimeStatus: status.runtime_status ?? 'unknown',
    connectionAddress: detail.connection_address ?? null,
    expiresAt: detail.expires_at ?? null,
    installedModpack: detail.installed_modpack?.name ?? null,
    modpackProvider: detail.installed_modpack?.provider ?? null,
  }

  vitalsCache = { data: vitals, expiresAt: Date.now() + VITALS_CACHE_TTL_MS }
  return vitals
})
