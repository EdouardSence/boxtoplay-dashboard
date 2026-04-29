import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { Boxes, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

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
          modpackVersionId: '',
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/10">
          <Boxes className="h-6 w-6 text-zinc-100" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 font-display tracking-tight">Modpacks</h1>
          <p className="text-sm text-zinc-400 mt-1">Search, browse, and install modpacks on your server</p>
        </div>
      </div>

      {/* Search Card */}
      <Card className="border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-xl shadow-black/20">
        <CardContent className="p-4 md:p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <Input
              placeholder="Search modpacks by name..."
              aria-label="Search modpacks"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-12 h-12 bg-zinc-950/50 border-white/10 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-700 focus:ring-0 transition-all duration-300"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {debouncedSearchTerm.trim().length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-xl shadow-black/20">
            <CardHeader className="px-4 md:px-6 pb-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-lg font-display">Results</CardTitle>
                  <CardDescription className="text-zinc-500">
                    {totalResults} result{totalResults > 1 ? 's' : ''} · Page {currentPage + 1}
                    {totalPages > 0 ? `/${totalPages}` : ''}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canGoToPreviousPage || searchQuery.isFetching}
                    onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
                    className="border-white/10 bg-zinc-900/80 hover:bg-zinc-800 hover:border-white/20 transition-all duration-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canGoToNextPage || searchQuery.isFetching}
                    onClick={() => setCurrentPage((page) => page + 1)}
                    className="border-white/10 bg-zinc-900/80 hover:bg-zinc-800 hover:border-white/20 transition-all duration-300"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 md:px-6 pb-6">
              {searchQuery.isPending ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                </div>
              ) : searchQuery.isError ? (
                <div className="text-center py-12">
                  <p className="text-sm text-rose-400">Failed to search modpacks. Please try again.</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-zinc-500">No modpacks found for "{debouncedSearchTerm}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {searchResults.map((modpack, index) => (
                    <button
                      key={modpack.id}
                      type="button"
                      onClick={() => onSelectModpack(modpack.id, modpack.name)}
                      className="text-left group"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <Card
                        className={`
                          relative overflow-hidden border transition-all duration-300 ease-in-out
                          ${selectedModpackId === modpack.id
                            ? 'border-sky-500/50 bg-sky-950/20 shadow-lg shadow-sky-500/10 -translate-y-1'
                            : 'border-white/5 bg-zinc-950/50 hover:border-white/10 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5'
                          }
                        `}
                      >
                        <CardContent className="flex items-center gap-3 p-4">
                          {modpack.logo ? (
                            <img 
                              src={modpack.logo} 
                              alt={`${modpack.name} logo`} 
                              className="h-12 w-12 rounded-lg object-cover ring-1 ring-white/10" 
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                              <Boxes className="h-6 w-6 text-zinc-600" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-zinc-100 truncate font-display">{modpack.name}</p>
                            <p className="text-xs text-zinc-500 font-mono mt-0.5">ID: {modpack.id}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Install Panel */}
      {selectedModpackId && (
        <Card className="border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-xl shadow-black/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Install on Server
            </CardTitle>
            <CardDescription className="text-zinc-400">
              <span className="text-zinc-300 font-medium">{selectedModpackName}</span>
              <span className="text-zinc-500 font-mono text-xs ml-2">(ID: {selectedModpackId})</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-6 space-y-4">
            <p className="text-sm text-zinc-400">
              Select the modpack version in the GitHub Actions workflow after dispatching.
            </p>

            <Button
              disabled={!canDispatchWorkflow}
              aria-label="Install on Server. Dispatches workflow."
              onClick={() => installMutation.mutate()}
              className="w-full sm:w-auto bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium transition-all duration-300 hover:shadow-lg hover:shadow-zinc-100/10"
            >
              {installMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Dispatching...
                </span>
              ) : (
                'Dispatch Workflow'
              )}
            </Button>

            {installMutation.isError && (
              <p className="text-sm text-rose-400">Failed to start installation. Please retry.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 md:right-6 top-4 z-50 rounded-lg border border-emerald-500/30 bg-emerald-950/90 backdrop-blur-xl px-4 py-3 text-sm text-emerald-100 shadow-xl shadow-emerald-500/10 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          {toastMessage}
        </div>
      )}
    </div>
  )
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
