export type WorkflowBadgeTone = 'success' | 'danger' | 'info' | 'muted'

export function getWorkflowTone(status: string, conclusion: string | null): WorkflowBadgeTone {
  if (status === 'in_progress') {
    return 'info'
  }

  if (status === 'queued' || status === 'waiting' || status === 'requested') {
    return 'muted'
  }

  if (status === 'completed' && conclusion === 'success') {
    return 'success'
  }

  return 'danger'
}

export function formatWorkflowState(status: string, conclusion: string | null): string {
  if (status === 'completed' && conclusion) {
    return conclusion
  }

  return status
}
