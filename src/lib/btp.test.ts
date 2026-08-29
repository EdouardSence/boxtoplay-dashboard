import { describe, expect, it } from 'vitest'

import { collectApiKeys, formatExpiry, getRuntimeTone, pickActiveService, type BtpService } from './btp'

const service = (id: string, display_id: number, expires_at: string): BtpService => ({
  id,
  display_id,
  expires_at,
})

// Releve reel du 2026-08-27: 7 essais, dont 6 expires.
const ACCOUNT: BtpService[] = [
  service('btp_a', 956176, '2026-08-23T19:39:32Z'),
  service('btp_b', 956315, '2026-08-27T04:23:50Z'),
  service('btp_c', 956334, '2026-08-28T00:56:42Z'),
]

describe('pickActiveService', () => {
  it('prefers the configured panel id', () => {
    expect(pickActiveService(ACCOUNT, '956315')?.id).toBe('btp_b')
  })

  it('falls back to the latest expiry when the id is unknown', () => {
    expect(pickActiveService(ACCOUNT, '999999')?.id).toBe('btp_c')
  })

  it('falls back to the latest expiry when no id is configured', () => {
    expect(pickActiveService(ACCOUNT)?.id).toBe('btp_c')
  })

  it('returns null on an empty account', () => {
    expect(pickActiveService([])).toBeNull()
  })

  it('ignores services with an unparseable expiry', () => {
    const services = [service('btp_x', 1, 'not-a-date'), ACCOUNT[0]]
    expect(pickActiveService(services)?.id).toBe('btp_a')
  })
})

describe('getRuntimeTone', () => {
  it('maps the runtime_status enum of the spec', () => {
    expect(getRuntimeTone('started')).toBe('success')
    expect(getRuntimeTone('starting')).toBe('info')
    expect(getRuntimeTone('installing')).toBe('info')
    expect(getRuntimeTone('stopped')).toBe('danger')
    expect(getRuntimeTone('unknown')).toBe('muted')
  })
})

describe('formatExpiry', () => {
  const now = Date.parse('2026-08-27T12:00:00Z')

  it('counts down in hours and minutes', () => {
    expect(formatExpiry('2026-08-27T14:30:00Z', now)).toBe('2h 30m left')
  })

  it('drops the hours below one hour', () => {
    expect(formatExpiry('2026-08-27T12:45:00Z', now)).toBe('45m left')
  })

  it('does not expire a trial that still has seconds left', () => {
    expect(formatExpiry('2026-08-27T12:00:29Z', now)).toBe('1m left')
  })

  it('expires exactly at the deadline', () => {
    expect(formatExpiry('2026-08-27T12:00:00Z', now)).toBe('expired')
  })

  it('reports an elapsed trial as expired', () => {
    expect(formatExpiry('2026-08-27T04:23:50Z', now)).toBe('expired')
  })

  it('handles a missing or invalid date', () => {
    expect(formatExpiry(null, now)).toBe('—')
    expect(formatExpiry('nope', now)).toBe('—')
  })
})

describe('collectApiKeys', () => {
  it('takes one key per account, in account order', () => {
    expect(collectApiKeys({ BTP_API_KEY_0: 'a', BTP_API_KEY_1: 'b' })).toEqual(['a', 'b'])
  })

  it('still accepts the single-key form', () => {
    expect(collectApiKeys({ BTP_API_KEY: 'solo' })).toEqual(['solo'])
  })

  it('drops blanks and duplicates', () => {
    expect(collectApiKeys({ BTP_API_KEY_0: ' a ', BTP_API_KEY_1: '', BTP_API_KEY: 'a' })).toEqual(['a'])
  })

  it('returns nothing when unconfigured', () => {
    expect(collectApiKeys({})).toEqual([])
  })
})

describe('pickActiveService — pourquoi l\'id du Gist est indispensable', () => {
  // Etat reel du 2026-08-29 22:00Z: #956437 sert des joueurs, #956446 a ete
  // achete plus tard sans bascule et dort. Son expiration est PLUS TARDIVE.
  const services = [
    { id: 'a', display_id: 956437, expires_at: '2026-08-30T03:51:48Z' }, // vivant
    { id: 'b', display_id: 956446, expires_at: '2026-08-30T06:16:44Z' }, // au repos
  ]

  it('se trompe sans id: la derniere expiration est l\'essai au repos', () => {
    expect(pickActiveService(services)?.display_id).toBe(956446)
  })

  it('designe le bon serveur quand le Gist donne son id', () => {
    expect(pickActiveService(services, '956437')?.display_id).toBe(956437)
  })

  it('retombe sur l\'heuristique si l\'id du Gist ne correspond a rien', () => {
    expect(pickActiveService(services, '999999')?.display_id).toBe(956446)
  })
})
