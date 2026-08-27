import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Activity, RefreshCw, Server, Terminal } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatExpiry, getRuntimeTone } from '@/lib/btp'
import { formatWorkflowState, getWorkflowTone } from '@/lib/dashboard'
import { getServerVitals } from '@/server/btp'
import { getMinecraftStatus, getRecentWorkflows, getGistState } from '@/server/dashboard'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

function DashboardPage() {
  const statusQuery = useQuery({
    queryKey: ['minecraft-status'],
    queryFn: () => getMinecraftStatus(),
    refetchInterval: 60_000,
  })

  const workflowsQuery = useQuery({
    queryKey: ['recent-workflows'],
    queryFn: () => getRecentWorkflows(),
    refetchInterval: 30_000,
  })

  const gistStateQuery = useQuery({
    queryKey: ['gist-state'],
    queryFn: () => getGistState(),
    refetchInterval: 60_000,
  })

  const vitalsQuery = useQuery({
    queryKey: ['server-vitals'],
    queryFn: () => getServerVitals(),
    refetchInterval: 60_000,
  })

  const isOnline = statusQuery.data?.online
  const playersOnline = statusQuery.data?.playersOnline ?? 0
  const playersMax = statusQuery.data?.playersMax ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <Activity className="h-6 w-6 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 font-display tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Operational overview · automated rotation</p>
        </div>
      </div>

      {/* Hero: Server Status */}
      <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-xl shadow-xl shadow-black/20 overflow-hidden">
        <CardContent className="p-6 md:p-8">
          {statusQuery.isPending ? (
            <div className="flex items-center gap-4">
              <div className="skeleton w-16 h-16 rounded-full" />
              <div className="space-y-2">
                <div className="skeleton h-6 w-32" />
                <div className="skeleton h-4 w-48" />
              </div>
            </div>
          ) : statusQuery.isError ? (
            <p className="text-sm text-rose-400">Unable to fetch server status.</p>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              {/* Status indicator */}
              <div className="relative shrink-0 flex items-center justify-center w-20 h-20">
                <span className={`absolute inset-0 rounded-full ${isOnline ? 'ping-slow bg-emerald-500/20' : 'bg-rose-500/10'}`} />
                <span className={`relative w-14 h-14 rounded-full flex items-center justify-center ${isOnline ? 'bg-emerald-500/15 glow-green' : 'bg-rose-500/10 glow-red'}`}>
                  <span className={`w-5 h-5 rounded-full status-pulse ${isOnline ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                </span>
              </div>

              {/* Main stats */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className={`text-3xl md:text-4xl font-bold font-display ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                  <span className="text-sm text-zinc-500 font-mono">orny.boxtoplay.com</span>
                </div>
                {isOnline && (
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-orange-400 font-display">{playersOnline}</span>
                    <span className="text-zinc-500 text-sm">/ {playersMax} players</span>
                  </div>
                )}
                {statusQuery.data?.motd && (
                  <p className="mt-2 text-sm text-zinc-500 font-mono truncate">{statusQuery.data.motd}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Panel vitals — official BoxToPlay REST API */}
      <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-xl shadow-xl shadow-black/20">
        <CardHeader className="px-4 md:px-6 pb-4">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-orange-400" />
            <CardTitle className="text-base font-display">Panel Vitals</CardTitle>
          </div>
          <CardDescription className="text-zinc-600">Authoritative panel state from the BoxToPlay API · refresh every 60s</CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 pb-6">
          {vitalsQuery.isPending ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : vitalsQuery.isError ? (
            <p className="text-sm text-rose-400">Unable to reach the BoxToPlay API. Check BTP_API_KEY.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant={getRuntimeTone(vitalsQuery.data.runtimeStatus)}>{vitalsQuery.data.runtimeStatus}</Badge>
                <span className="text-sm text-zinc-400">
                  Trial <span className="text-zinc-200 font-medium">{formatExpiry(vitalsQuery.data.expiresAt)}</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Panel server', value: vitalsQuery.data.displayId ? `#${vitalsQuery.data.displayId}` : '—' },
                  { label: 'Connection', value: vitalsQuery.data.connectionAddress ?? '—' },
                  { label: 'Installed modpack', value: vitalsQuery.data.installedModpack ?? '—' },
                  { label: 'Expires at', value: vitalsQuery.data.expiresAt ? new Date(vitalsQuery.data.expiresAt).toLocaleString() : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg bg-zinc-950/50 border border-zinc-800/60 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono mb-1">{label}</p>
                    <p className="text-sm text-zinc-200 truncate font-mono">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rotation state */}
      <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-xl shadow-xl shadow-black/20">
        <CardHeader className="px-4 md:px-6 pb-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-orange-400" />
            <CardTitle className="text-base font-display">Rotation State</CardTitle>
          </div>
          <CardDescription className="text-zinc-600">Current worker state from Gist · refresh every 60s</CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 pb-6">
          {gistStateQuery.isPending ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="grid grid-cols-2 gap-4">
                  <div className="skeleton h-4 w-28" />
                  <div className="skeleton h-4 w-40" />
                </div>
              ))}
            </div>
          ) : gistStateQuery.isError ? (
            <p className="text-sm text-rose-400">Unable to fetch Gist state. Check GH_TOKEN and GIST_ID.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Active account', value: gistStateQuery.data.activeAccountEmail, mono: true },
                { label: 'Server ID', value: gistStateQuery.data.activeServerId, mono: true },
                { label: 'Modpack', value: gistStateQuery.data.modpackName, mono: false },
                { label: 'Version ID', value: gistStateQuery.data.modpackVersionId, mono: true },
                {
                  label: 'Catalog updated',
                  value: gistStateQuery.data.catalogLastUpdated
                    ? new Date(gistStateQuery.data.catalogLastUpdated).toLocaleString()
                    : '—',
                  mono: true,
                },
              ].map(({ label, value, mono }) => (
                <div key={label} className="rounded-lg bg-zinc-950/50 border border-zinc-800/60 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono mb-1">{label}</p>
                  <p className={`text-sm text-zinc-200 truncate ${mono ? 'font-mono' : 'font-medium'}`}>{value ?? '—'}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Actions */}
      <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-xl shadow-xl shadow-black/20">
        <CardHeader className="px-4 md:px-6 pb-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-orange-400" />
            <CardTitle className="text-base font-display">Recent Actions</CardTitle>
          </div>
          <CardDescription className="text-zinc-600">Latest GitHub Actions workflow runs</CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 pb-6">
          {workflowsQuery.isPending ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : workflowsQuery.isError ? (
            <p className="text-sm text-rose-400">Unable to fetch workflow activity. Check GH_TOKEN and GITHUB_REPO.</p>
          ) : (
            <Table className="table-mobile-card">
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Workflow</TableHead>
                  <TableHead className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Date</TableHead>
                  <TableHead className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Status</TableHead>
                  <TableHead className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Logs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflowsQuery.data.length === 0 ? (
                  <TableRow className="border-zinc-800">
                    <TableCell colSpan={4} className="text-zinc-500 text-sm py-8 text-center">
                      No workflow runs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  workflowsQuery.data.map((run) => (
                    <TableRow key={run.id} className="border-zinc-800/60 hover:bg-zinc-900/40 transition-colors">
                      <TableCell data-label="Workflow" className="text-sm text-zinc-300 font-medium">{run.name}</TableCell>
                      <TableCell data-label="Date" className="text-xs text-zinc-500 font-mono">{new Date(run.createdAt).toLocaleString()}</TableCell>
                      <TableCell data-label="Status">
                        <Badge variant={getWorkflowTone(run.status, run.conclusion)}>{formatWorkflowState(run.status, run.conclusion)}</Badge>
                      </TableCell>
                      <TableCell data-label="Logs">
                        <a href={run.htmlUrl} target="_blank" rel="noreferrer" className="text-xs text-orange-400 hover:text-orange-300 font-mono transition-colors">
                          Open ↗
                        </a>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
