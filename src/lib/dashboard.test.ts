import { describe, expect, it } from 'vitest'

import { formatWorkflowState, getWorkflowTone } from './dashboard'

describe('getWorkflowTone', () => {
  it('returns success when a run completed successfully', () => {
    expect(getWorkflowTone('completed', 'success')).toBe('success')
  })

  it('returns info when a run is in progress', () => {
    expect(getWorkflowTone('in_progress', null)).toBe('info')
  })

  it('returns muted when a run is queued', () => {
    expect(getWorkflowTone('queued', null)).toBe('muted')
  })

  it('returns danger for failed states', () => {
    expect(getWorkflowTone('completed', 'failure')).toBe('danger')
  })
})

describe('formatWorkflowState', () => {
  it('prefers conclusion for completed runs', () => {
    expect(formatWorkflowState('completed', 'cancelled')).toBe('cancelled')
  })

  it('falls back to status for non-completed runs', () => {
    expect(formatWorkflowState('in_progress', null)).toBe('in_progress')
  })
})
