import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { Boxes, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { searchModpacks, triggerModpackSwitch } from '@/server/modpacks'

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
  })

  const installMutation = useMutation({
    mutationFn: async () => {
      if (!selectedModpackId || !selectedModpackName) return

      // A catalog entry IS an installable version: its id is what gets sent.
      await triggerModpackSwitch({
        data: {
          modpackName: selectedModpackName,
          modpackVersionId: selectedModpackId,
        },
      })
    },
    onSuccess: () => {
      if (selectedModpackName) {
        setToastMessage(`Workflow dispatché pour ${selectedModpackName}.`)
      }
    },
  })

  const canDispatchWorkflow = !!selectedModpackId && !installMutation.isPending
  const searchResults = searchQuery.data?.modpacks ?? []
  const canGoToPreviousPage = currentPage > 0
  const canGoToNextPage = Boolean(searchQuery.data?.hasNextPage)

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
      <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-xl shadow-xl shadow-black/20">
        <CardContent className="p-4 md:p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <Input
              placeholder="Search modpacks by name..."
              aria-label="Search modpacks"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-12 h-12 bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-0 transition-all duration-300"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-xl shadow-xl shadow-black/20">
          <CardHeader className="px-4 md:px-6 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-lg font-display">
                  {debouncedSearchTerm.trim() ? 'Results' : 'All Modpacks'}
                </CardTitle>
                <CardDescription className="text-zinc-600">
                  Page {currentPage + 1} · {searchResults.length} version{searchResults.length !== 1 ? 's' : ''} installable{searchResults.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canGoToPreviousPage || searchQuery.isFetching}
                    onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
                    className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canGoToNextPage || searchQuery.isFetching}
                    onClick={() => setCurrentPage((page) => page + 1)}
                    className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-300"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 md:px-6 pb-6">
              {searchQuery.isPending ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-zinc-950/30 border border-white/5">
                      <div className="skeleton h-12 w-12 shrink-0 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-4 w-3/4" />
                        <div className="skeleton h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery.isError ? (
                <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl bg-rose-950/10 border border-rose-500/20">
                  <Boxes className="h-8 w-8 text-rose-500" />
                  <p className="mt-4 text-sm text-rose-400 font-medium">Erreur de recherche</p>
                  <p className="mt-1 text-xs text-zinc-500">Vérifiez votre connexion et réessayez</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl bg-zinc-900/20 border border-white/5">
                  <div className="p-4 rounded-full bg-zinc-800/50">
                    <Search className="h-6 w-6 text-zinc-600" />
                  </div>
                  <p className="mt-4 text-sm text-zinc-400 font-medium">Aucun résultat</p>
                  <p className="mt-1 text-xs text-zinc-500">Essayez avec d'autres mots-clés</p>
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
                          relative overflow-hidden border transition-all duration-300 ease-in-out card-glow
                          ${selectedModpackId === modpack.id
                            ? 'border-orange-500/40 bg-orange-950/20 shadow-lg shadow-orange-500/10 -translate-y-1'
                            : 'border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700 hover:-translate-y-2 hover:shadow-xl hover:shadow-black/40'
                          }
                        `}
                      >
                        <CardContent className="flex items-center gap-3 p-4">
                          <div className="h-12 w-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                            <Boxes className="h-6 w-6 text-zinc-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-zinc-100 truncate font-display">{modpack.name}</p>
                            <p className="text-xs text-zinc-500 font-mono mt-0.5">{modpack.provider ?? 'boxtoplay'}</p>
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

      {/* Install Panel */}
      {selectedModpackId && (
        <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-xl shadow-xl shadow-black/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Install on Server
            </CardTitle>
            <CardDescription className="text-zinc-500">
              <span className="text-zinc-300 font-medium">{selectedModpackName}</span>
              <span className="text-zinc-500 font-mono text-xs ml-2">(ID: {selectedModpackId})</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-6 space-y-4">
            <p className="text-sm text-zinc-500">
              Cette entrée est la version installée telle quelle. Le workflow
              sauvegarde le monde actuel sur Drive avant de basculer.
            </p>

            <Button
              disabled={!canDispatchWorkflow}
              aria-label="Install on Server. Dispatches workflow."
              onClick={() => installMutation.mutate()}
              className="w-full sm:w-auto bg-orange-500 hover:bg-orange-400 text-white font-medium transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20"
            >
              {installMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Dispatching...
                </span>
              ) : (
                'Installer cette version'
              )}
            </Button>

            {installMutation.isError && (
              <p className="text-sm text-rose-400">Échec du déclenchement du workflow. Réessayez.</p>
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
