import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getModpackCategories, searchModpacks, triggerModpackSwitch } from '@/server/modpacks'

export const Route = createFileRoute('/modpacks')({
  component: ModpacksPage,
})

function ModpacksPage() {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(0)
  const [selectedModpackId, setSelectedModpackId] = React.useState<string | null>(null)
  const [selectedModpackName, setSelectedModpackName] = React.useState<string | null>(null)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  const categoriesQuery = useQuery({
    queryKey: ['modpacks-categories'],
    queryFn: () => getModpackCategories(),
  })

  // Keep search term debounced
  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [searchTerm])

  // Reset selection on search change
  React.useEffect(() => {
    setCurrentPage(0)
    setSelectedModpackId(null)
    setSelectedModpackName(null)
  }, [debouncedSearchTerm])

  // Auto-clear toast
  React.useEffect(() => {
    if (!toastMessage) return
    const timeout = window.setTimeout(() => setToastMessage(null), 3000)
    return () => window.clearTimeout(timeout)
  }, [toastMessage])

  const searchQuery = useQuery({
    queryKey: ['modpacks-search', debouncedSearchTerm, currentPage],
    queryFn: () =>
      searchModpacks({
        data: { query: debouncedSearchTerm, pageId: currentPage },
      }),
    enabled: debouncedSearchTerm.trim().length > 0,
  })

  const installMutation = useMutation({
    mutationFn: async () => {
      if (!selectedModpackId || !selectedModpackName) return

      await triggerModpackSwitch({
        data: {
          modpackName: selectedModpackName,
          modpackVersionId: '', // User inputs modpack ID directly in workflow
        },
      })
    },
    onSuccess: () => {
      if (selectedModpackName) {
        setToastMessage(`Workflow dispatched for ${selectedModpackName}. Check GitHub Actions to select version.`)
      }
    },
  })

  const canDispatchWorkflow = !!selectedModpackId && !installMutation.isPending
  const searchResults = searchQuery.data?.modpacks ?? []
  const totalResults = searchQuery.data?.totalCount ?? 0
  const pageSize = searchQuery.data?.pageSize ?? 20
  const totalPages = totalResults > 0 ? Math.ceil(totalResults / pageSize) : 0
  const canGoToPreviousPage = currentPage > 0
  const canGoToNextPage = totalPages > 0 && currentPage + 1 < totalPages

  const onSelectModpack = (id: string, name: string) => {
    setSelectedModpackId(id)
    setSelectedModpackName(name)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modpacks</CardTitle>
          <CardDescription>Search BoxToPlay modpacks, choose a version, and install it on your server.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search modpacks..."
            aria-label="Search modpacks"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          {categoriesQuery.isPending ? (
            <p className="text-sm text-zinc-400">Loading categories...</p>
          ) : categoriesQuery.isError ? (
            <p className="text-sm text-rose-300">Failed to load categories. Showing all by default.</p>
          ) : categoriesQuery.data.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categoriesQuery.data.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={
                    selectedCategoryId === category.id
                      ? 'flex items-center gap-2 rounded-md border border-sky-400/70 bg-sky-950/20 px-3 py-2 text-left text-sm text-zinc-100 transition-colors'
                      : 'flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-left text-sm text-zinc-100 transition-colors hover:border-zinc-700'
                  }
                >
                  {category.icon ? (
                    <img src={category.icon} alt={`${category.name} icon`} className="h-5 w-5 rounded object-cover" />
                  ) : (
                    <div className="h-5 w-5 rounded bg-zinc-800" />
                  )}
                  <span className="truncate">
                    {category.name} ({category.count})
                  </span>
                </button>
              ))}
            </div>
          ) : null}
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
              <p className="text-sm text-rose-300">Failed to search modpacks. Please try again in a moment.</p>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-zinc-400">No modpacks found.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-zinc-400">
                    {totalResults} result{totalResults > 1 ? 's' : ''} · page {currentPage + 1}
                    {totalPages > 0 ? `/${totalPages}` : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canGoToPreviousPage || searchQuery.isFetching}
                      onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canGoToNextPage || searchQuery.isFetching}
                      onClick={() => setCurrentPage((page) => page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {searchResults.map((modpack) => (
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
              <br />
              <span className="text-xs text-zinc-500">(ID: {selectedModpackId})</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-400">
              Select the modpack version in the GitHub Actions workflow after dispatching.
            </p>

            <Button
              disabled={!canDispatchWorkflow}
              aria-label="Install on Server. Dispatches workflow."
              onClick={() => installMutation.mutate()}
            >
              {installMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-100 border-t-transparent" />
                  Dispatching...
                </span>
              ) : (
                'Dispatch Workflow'
              )}
            </Button>

            {installMutation.isError && (
              <p className="text-sm text-rose-300">Failed to start installation. Please retry or contact support.</p>
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
