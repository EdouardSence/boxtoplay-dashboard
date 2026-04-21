import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getModpackVersions, searchModpacks, triggerModpackSwitch } from '@/server/modpacks'

export const Route = createFileRoute('/modpacks')({
  component: ModpacksPage,
})

function ModpacksPage() {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState('')
  const [selectedModpackId, setSelectedModpackId] = React.useState<string | null>(null)
  const [selectedModpackName, setSelectedModpackName] = React.useState<string | null>(null)
  const [selectedVersionId, setSelectedVersionId] = React.useState('')
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [searchTerm])

  React.useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timeout = window.setTimeout(() => {
      setToastMessage(null)
    }, 3000)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [toastMessage])

  const searchQuery = useQuery({
    queryKey: ['modpacks-search', debouncedSearchTerm],
    queryFn: () => searchModpacks({ data: { query: debouncedSearchTerm } }),
    enabled: debouncedSearchTerm.trim().length > 0,
  })

  const versionsQuery = useQuery({
    queryKey: ['modpacks-versions', selectedModpackId],
    queryFn: () => getModpackVersions({ data: { packId: selectedModpackId ?? '' } }),
    enabled: !!selectedModpackId,
  })

  const installMutation = useMutation({
    mutationFn: async () => {
      if (!selectedModpackName || !selectedVersionId) {
        return
      }

      await triggerModpackSwitch({
        data: {
          modpackName: selectedModpackName,
          modpackVersionId: selectedVersionId,
        },
      })
    },
    onSuccess: () => {
      if (selectedModpackName) {
        setToastMessage(`Workflow dispatched for ${selectedModpackName}.`)
      }
    },
  })

  const canDispatchWorkflow = !!selectedModpackId && !!selectedVersionId && !installMutation.isPending

  const onSelectModpack = (id: string, name: string) => {
    setSelectedModpackId(id)
    setSelectedModpackName(name)
    setSelectedVersionId('')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modpacks</CardTitle>
          <CardDescription>Search BoxToPlay modpacks, choose a version, and install it on your server.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search modpacks..."
            aria-label="Search modpacks"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </CardContent>
      </Card>

      {debouncedSearchTerm.trim().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>Select a modpack to load available versions.</CardDescription>
          </CardHeader>
          <CardContent>
            {searchQuery.isPending ? (
              <p className="text-sm text-zinc-400">Searching modpacks...</p>
            ) : searchQuery.isError ? (
              <p className="text-sm text-rose-300">Unable to search modpacks right now.</p>
            ) : searchQuery.data.length === 0 ? (
              <p className="text-sm text-zinc-400">No modpacks found.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {searchQuery.data.map((modpack) => (
                  <button
                    key={modpack.id}
                    type="button"
                    onClick={() => onSelectModpack(modpack.id, modpack.name)}
                    className="text-left"
                  >
                    <Card
                      className={
                        selectedModpackId === modpack.id
                          ? 'border-sky-400/70 bg-sky-950/20 transition-colors'
                          : 'border-zinc-800 transition-colors hover:border-zinc-700'
                      }
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        {modpack.logo ? (
                          <img src={modpack.logo} alt={`${modpack.name} logo`} className="h-10 w-10 rounded-md object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-zinc-800" />
                        )}
                        <p className="text-sm font-medium text-zinc-100">{modpack.name}</p>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedModpackId && (
        <Card>
          <CardHeader>
            <CardTitle>Install on Server</CardTitle>
            <CardDescription>
              Selected modpack: <span className="font-medium text-zinc-100">{selectedModpackName}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {versionsQuery.isPending ? (
              <p className="text-sm text-zinc-400">Loading versions...</p>
            ) : versionsQuery.isError ? (
              <p className="text-sm text-rose-300">Unable to load modpack versions.</p>
            ) : versionsQuery.data.length === 0 ? (
              <p className="text-sm text-zinc-400">No versions available for this modpack.</p>
            ) : (
              <>
                <select
                  value={selectedVersionId}
                  onChange={(event) => setSelectedVersionId(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700"
                >
                  <option value="">Select a version</option>
                  {versionsQuery.data.map((version) => (
                    <option key={version.id} value={version.id}>
                      {version.versionName}
                      {version.minecraftVersion ? ` · MC ${version.minecraftVersion}` : ''}
                    </option>
                  ))}
                </select>

                <Button disabled={!canDispatchWorkflow} onClick={() => installMutation.mutate()}>
                  {installMutation.isPending ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-100 border-t-transparent" />
                      Dispatching...
                    </span>
                  ) : (
                    'Install on Server'
                  )}
                </Button>

                {installMutation.isError && (
                  <p className="text-sm text-rose-300">Failed to dispatch workflow. Check GitHub configuration.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-6 top-6 z-50 rounded-md border border-emerald-500/30 bg-emerald-950/90 px-4 py-3 text-sm text-emerald-100 shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </div>
  )
}
