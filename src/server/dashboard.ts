import { createServerFn } from '@tanstack/react-start'

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

export const getMinecraftStatus = createServerFn({ method: 'GET' }).handler(async (): Promise<MinecraftStatus> => {
  const response = await fetch('https://api.mcsrvstat.us/3/orny.boxtoplay.com', {
    headers: {
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Minecraft server status')
  }

  const data = (await response.json()) as MinecraftStatusApiResponse
  const motd = data.motd?.clean?.filter(Boolean).join(' ') || data.motd?.raw?.filter(Boolean).join(' ') || 'No MOTD available'

  return {
    online: data.online,
    playersOnline: data.players?.online ?? 0,
    playersMax: data.players?.max ?? 0,
    motd,
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
