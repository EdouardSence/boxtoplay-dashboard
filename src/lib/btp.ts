export interface BtpService {
  id: string
  display_id?: number
  name?: string
  expires_at?: string
}

/**
 * Le compte accumule les essais expires (7 au dernier releve). L'actif est
 * celui dont l'ID panel est configure, sinon celui qui expire le plus tard:
 * la rotation achete un nouvel essai a chaque passage.
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
 * Un essai gratuit vit ~16h. Le compte a rebours est l'info qui manque au
 * dashboard: c'est l'expiration qui tue le serveur, pas un crash.
 */
export function formatExpiry(expiresAt: string | null, now: number = Date.now()): string {
  if (!expiresAt) {
    return '—'
  }

  const target = Date.parse(expiresAt)
  if (Number.isNaN(target)) {
    return '—'
  }

  const minutes = Math.round((target - now) / 60_000)
  if (minutes <= 0) {
    return 'expired'
  }

  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours}h ${minutes % 60}m left` : `${minutes}m left`
}
