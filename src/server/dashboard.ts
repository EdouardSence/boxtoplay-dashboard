import { createServerFn } from '@tanstack/react-start'

import { getServerVitals } from '@/server/btp'
import { loadGistState } from '@/server/gist'

// =============================================================================
// Gist state types (only safe fields — no cookies, no FTP credentials)
// =============================================================================

export interface RotationState {
  activeAccountEmail: string
  activeServerId: string
  modpackName: string
  /** Id panel ou id API selon l'espace dans lequel le state a ete ecrit. */
  modpackRef: string
  lastRotationAt: string | null
}

interface MinecraftStatusApiResponse {
  online: boolean
  players?: {
    online?: number
    max?: number
  }
  motd?: {
    clean?: string[]
    raw?: string[]
  }
}

export interface MinecraftStatus {
  online: boolean
  playersOnline: number
  playersMax: number
  motd: string
  /** Adresse reellement sondee: celle que le panel donne, pas l'alias. */
  host: string
  /** L'alias public repond-il ? null si non sonde ou injoignable. */
  aliasOnline: boolean | null
}

interface GitHubWorkflowRunApi {
  id: number
  name: string | null
  created_at: string
  status: string
  conclusion: string | null
  html_url: string
}

interface GitHubWorkflowRunsResponse {
  workflow_runs: GitHubWorkflowRunApi[]
}

export interface WorkflowRun {
  id: number
  name: string
  createdAt: string
  status: string
  conclusion: string | null
  htmlUrl: string
}

// L'alias `orny` porte deux enregistrements SRV, dont un pointant sur un
// serveur mort d'une rotation precedente. Le sonder seul fait clignoter le
// dashboard entre En ligne et Hors ligne sans que rien ne bouge cote serveur.
// On sonde donc l'adresse que le panel donne pour l'etat, et l'alias en plus
// pour pouvoir dire qu'il est casse plutot que d'accuser le serveur.
const ALIAS_HOST = 'orny.boxtoplay.com'
const SAFE_HOST = /^[a-z0-9.-]+(:\d{1,5})?$/i

async function probe(host: string): Promise<MinecraftStatusApiResponse | null> {
  if (!SAFE_HOST.test(host)) return null

  try {
    const response = await fetch(`https://api.mcsrvstat.us/3/${host}`, {
      headers: { accept: 'application/json' },
    })
    if (!response.ok) return null
    return (await response.json()) as MinecraftStatusApiResponse
  } catch {
    return null
  }
}

export const getMinecraftStatus = createServerFn({ method: 'GET' }).handler(async (): Promise<MinecraftStatus> => {
  // Le panel fait foi sur l'adresse. S'il est injoignable on retombe sur
  // l'alias, qui vaut mieux que rien meme quand il est a moitie casse.
  const vitals = await getServerVitals().catch(() => null)
  const host = vitals?.connectionAddress ?? ALIAS_HOST

  const [direct, alias] = await Promise.all([
    probe(host),
    host === ALIAS_HOST ? Promise.resolve(null) : probe(ALIAS_HOST),
  ])

  if (!direct) {
    throw new Error('Failed to fetch Minecraft server status')
  }

  const motd =
    direct.motd?.clean?.filter(Boolean).join(' ') ||
    direct.motd?.raw?.filter(Boolean).join(' ') ||
    'No MOTD available'

  return {
    online: direct.online,
    playersOnline: direct.players?.online ?? 0,
    playersMax: direct.players?.max ?? 0,
    motd,
    host,
    aliasOnline: alias ? alias.online : null,
  }
})

export const getRecentWorkflows = createServerFn({ method: 'GET' }).handler(async (): Promise<WorkflowRun[]> => {
  const token = process.env.GH_TOKEN
  const repository = process.env.GITHUB_REPO

  if (!token || !repository) {
    throw new Error('Missing GitHub configuration (GH_TOKEN or GITHUB_REPO)')
  }

  const [owner, repo] = repository.split('/')

  if (!owner || !repo) {
    throw new Error('GITHUB_REPO must be in the format owner/repo')
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=10`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch GitHub workflow runs')
  }

  const data = (await response.json()) as GitHubWorkflowRunsResponse

  return data.workflow_runs.map((run) => ({
    id: run.id,
    name: run.name ?? 'Unnamed workflow',
    createdAt: run.created_at,
    status: run.status,
    conclusion: run.conclusion,
    htmlUrl: run.html_url,
  }))
})

export const getGistState = createServerFn({ method: 'GET' }).handler(async (): Promise<RotationState> => {
  const state = await loadGistState()
  const idx = state.active_account_index ?? 0
  const activeAccount = state.accounts?.[idx]

  return {
    activeAccountEmail: activeAccount?.email ?? '—',
    activeServerId: String(state.current_server_id ?? activeAccount?.server_id ?? '—'),
    modpackName: state.modpack_name ?? state.modpack ?? '—',
    // Les deux espaces d'ids coexistent: change_modpack.py pose l'un et retire
    // l'autre, donc afficher celui qui est renseigne evite de montrer un id
    // que plus rien n'utilise.
    modpackRef: String(state.modpack_api_id || state.modpack_version_id || '—'),
    lastRotationAt: state.last_rotation_at ?? null,
  }
})
