import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatWorkflowState, getWorkflowTone } from '@/lib/dashboard'
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-zinc-400">Operational overview for your automated Minecraft infrastructure.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rotation State</CardTitle>
          <CardDescription>Current worker state from Gist · auto refresh every 60s</CardDescription>
        </CardHeader>
        <CardContent>
          {gistStateQuery.isPending ? (
            <p className="text-sm text-zinc-400">Loading rotation state...</p>
          ) : gistStateQuery.isError ? (
            <p className="text-sm text-rose-300">Unable to fetch Gist state. Check GH_TOKEN and GIST_ID.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="text-zinc-400">Active account</div>
              <div className="text-zinc-100 font-mono">{gistStateQuery.data.activeAccountEmail}</div>
              <div className="text-zinc-400">Server ID</div>
              <div className="text-zinc-100 font-mono">{gistStateQuery.data.activeServerId}</div>
              <div className="text-zinc-400">Modpack</div>
              <div className="text-zinc-100">{gistStateQuery.data.modpackName}</div>
              <div className="text-zinc-400">Modpack version</div>
              <div className="text-zinc-100 font-mono">{gistStateQuery.data.modpackVersionId}</div>
              <div className="text-zinc-400">Catalog updated</div>
              <div className="text-zinc-100 font-mono">
                {gistStateQuery.data.catalogLastUpdated
                  ? new Date(gistStateQuery.data.catalogLastUpdated).toLocaleString()
                  : '—'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Server Status</CardTitle>
          <CardDescription>orny.boxtoplay.com · auto refresh every 60s</CardDescription>
        </CardHeader>
        <CardContent>
          {statusQuery.isPending ? (
            <p className="text-sm text-zinc-400">Loading server status...</p>
          ) : statusQuery.isError ? (
            <p className="text-sm text-rose-300">Unable to fetch server status.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span>Status:</span>
                <Badge variant={statusQuery.data.online ? 'success' : 'danger'}>
                  {statusQuery.data.online ? 'Online 🟢' : 'Offline 🔴'}
                </Badge>
              </div>
              <p className="text-sm text-zinc-300">
                Players: <span className="font-medium text-zinc-100">{statusQuery.data.playersOnline}</span> / {statusQuery.data.playersMax}
              </p>
              <p className="text-sm text-zinc-300">MOTD: {statusQuery.data.motd}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Actions</CardTitle>
          <CardDescription>Latest GitHub Actions workflow runs from your BoxToPlay repository.</CardDescription>
        </CardHeader>
        <CardContent>
          {workflowsQuery.isPending ? (
            <p className="text-sm text-zinc-400">Loading workflow activity...</p>
          ) : workflowsQuery.isError ? (
            <p className="text-sm text-rose-300">Unable to fetch workflow activity. Check GH_TOKEN and GITHUB_REPO.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Logs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflowsQuery.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-zinc-400">
                      No workflow runs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  workflowsQuery.data.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>{run.name}</TableCell>
                      <TableCell>{new Date(run.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={getWorkflowTone(run.status, run.conclusion)}>{formatWorkflowState(run.status, run.conclusion)}</Badge>
                      </TableCell>
                      <TableCell>
                        <a href={run.htmlUrl} target="_blank" rel="noreferrer" className="text-sm text-sky-300 hover:text-sky-200">
                          Open logs
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
