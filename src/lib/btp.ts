/**
 * One API key per BoxToPlay account. The rotation alternates the live server
 * between two accounts, and a key only ever sees its own account's servers --
 * so a single key shows the wrong (expired) server half the time.
 */
export function collectApiKeys(env: Record<string, string | undefined>): string[] {
  const raw = [env.BTP_API_KEY_0, env.BTP_API_KEY_1, env.BTP_API_KEY]
  const keys: string[] = []
  for (const value of raw) {
    const key = (value ?? '').trim()
    if (key && !keys.includes(key)) {
      keys.push(key)
    }
  }
  return keys
}

export interface BtpService {
  id: string
  display_id?: number
  name?: string
  expires_at?: string
}

/**
 * The account piles up expired trials (7 at the last count). The live one is
 * whichever matches the configured panel id, else the latest expiry: the
 * rotation buys a fresh trial on every pass.
 */
export function pickActiveService(services: BtpService[], displayId?: string): BtpService | null {
  if (services.length === 0) {
    return null
  }

  const wanted = (displayId ?? '').trim()
  if (wanted) {
    const match = services.find((service) => String(service.display_id ?? '') === wanted)
    if (match) {
      return match
    }
  }

  return services.reduce((latest, service) => {
    const a = Date.parse(service.expires_at ?? '')
    const b = Date.parse(latest.expires_at ?? '')
    if (Number.isNaN(a)) return latest
    if (Number.isNaN(b)) return service
    return a > b ? service : latest
  })
}

export type VitalsTone = 'success' | 'danger' | 'info' | 'muted'

export function getRuntimeTone(runtimeStatus: string): VitalsTone {
  if (runtimeStatus === 'started') return 'success'
  if (runtimeStatus === 'starting' || runtimeStatus === 'installing' || runtimeStatus === 'stopping') return 'info'
  if (runtimeStatus === 'stopped' || runtimeStatus === 'deleting') return 'danger'
  return 'muted'
}

/**
 * A free trial lives ~16h. The countdown is what the dashboard was missing:
 * expiry is what kills the server, not a crash.
 */
export function formatExpiry(expiresAt: string | null, now: number = Date.now()): string {
  if (!expiresAt) {
    return '—'
  }

  const target = Date.parse(expiresAt)
  if (Number.isNaN(target)) {
    return '—'
  }

  // ceil, not round: with 29s left there is still time, and a countdown that
  // reads "expired" early causes a panic for nothing.
  const minutes = Math.ceil((target - now) / 60_000)
  if (minutes <= 0) {
    return 'expired'
  }

  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours}h ${minutes % 60}m left` : `${minutes}m left`
}
