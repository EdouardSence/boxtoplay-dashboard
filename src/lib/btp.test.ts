import { describe, expect, it } from 'vitest'

import { formatExpiry, getRuntimeTone, pickActiveService, type BtpService } from './btp'

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

  it('reports an elapsed trial as expired', () => {
    expect(formatExpiry('2026-08-27T04:23:50Z', now)).toBe('expired')
  })

  it('handles a missing or invalid date', () => {
    expect(formatExpiry(null, now)).toBe('—')
    expect(formatExpiry('nope', now)).toBe('—')
  })
})
