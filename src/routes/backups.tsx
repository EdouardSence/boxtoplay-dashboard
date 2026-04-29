import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  Download,
  Loader2,
  MoreHorizontal,
  Trash2,
  Search,
  HardDrive,
  RotateCcw,
  Package,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getBackupsList, getDriveStorageStats, deleteBackupFile, restoreFullState } from '@/server/backups'
import type { BackupFile } from '@/server/backups'
import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { Toaster } from 'sonner'

export const Route = createFileRoute('/backups')({ component: BackupsPage })

function formatBytes(bytes: string | number): string {
  const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes
  if (isNaN(num)) return '0 B'
  const mb = num / (1024 * 1024)
  const gb = mb / 1024
  if (gb >= 1) return `${gb.toFixed(2)} Go`
  return `${mb.toFixed(2)} Mo`
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  const day = date.getDate()
  const month = date.toLocaleDateString('fr-FR', { month: 'long' })
  const year = date.getFullYear()
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${day} ${month} ${year} - ${time}`
}

function BackupsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<BackupFile | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<BackupFile | null>(null)
  const [restoreVersionId, setRestoreVersionId] = useState('20314') // Default to Star Technology

  // Queries
  const backupsQuery = useQuery({
    queryKey: ['backups-list'],
    queryFn: () => getBackupsList(),
    staleTime: 0,
    refetchOnMount: true,
  })

  const statsQuery = useQuery({
    queryKey: ['drive-stats'],
    queryFn: () => getDriveStorageStats(),
    staleTime: 0,
    refetchOnMount: true,
  })

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => deleteBackupFile({ input: { fileId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups-list'] })
      queryClient.invalidateQueries({ queryKey: ['drive-stats'] })
      toast.success('Sauvegarde supprimée avec succès')
      setDeleteTarget(null)
    },
    onError: (error) => {
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Suppression échouée'}`)
    },
  })

  const restoreMutation = useMutation({
    mutationFn: ({ fileId, modpackName }: { fileId: string; modpackName: string }) =>
      restoreFullState({ input: { fileId, modpackName } }),
    onSuccess: () => {
      toast.success('Restauration lancée ! Le serveur va être reconfiguré dans quelques minutes.')
      setRestoreTarget(null)
    },
    onError: (error) => {
      toast.error(
        `Erreur: ${error instanceof Error ? error.message : 'Impossible de lancer la restauration'}`
      )
    },
  })

  // Client-side filter
  const filteredBackups = useMemo(() => {
    if (!search.trim()) return backupsQuery.data ?? []
    const q = search.toLowerCase()
    return (backupsQuery.data ?? []).filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        formatDate(b.createdTime).toLowerCase().includes(q) ||
        b.associatedModpack.toLowerCase().includes(q)
    )
  }, [backupsQuery.data, search])

  // Stats
  const storagePercent =
    statsQuery.data?.limit && statsQuery.data.limit > 0
      ? Math.round((statsQuery.data.usage / statsQuery.data.limit) * 100)
      : 0
  const isHighUsage = storagePercent > 80

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Toaster position="top-right" theme="dark" />

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total sauvegardes</CardTitle>
            <Archive className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">
              {backupsQuery.data?.length ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Espace utilisé</CardTitle>
            <HardDrive className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold text-zinc-100">
              {statsQuery.data ? formatBytes(statsQuery.data.usage) : '—'}
            </div>
            <div className="text-xs text-zinc-500">
              sur {statsQuery.data ? formatBytes(statsQuery.data.limit) : '—'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Remplissage Drive</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold text-zinc-100">{storagePercent}%</div>
            <Progress
              value={storagePercent}
              className="h-2"
              indicatorClassName={isHighUsage ? 'bg-rose-500' : 'bg-blue-500'}
            />
            {isHighUsage && (
              <p className="text-xs text-rose-400">Espace critique (&gt;80%)</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Sauvegardes Minecraft</CardTitle>
              <CardDescription>
                Gestion des fichiers de sauvegarde sur Google Drive
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Loading state */}
          {backupsQuery.isPending && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
          )}

          {/* Error state */}
          {backupsQuery.isError && (
            <p className="text-sm text-rose-400">
              Erreur lors du chargement des sauvegardes.
            </p>
          )}

          {/* Empty state */}
          {!backupsQuery.isPending && !backupsQuery.isError && filteredBackups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Archive className="h-12 w-12 text-zinc-600" />
              <p className="mt-4 text-sm text-zinc-400">Aucune sauvegarde trouvée</p>
            </div>
          )}

          {/* Table */}
          {!backupsQuery.isPending &&
            !backupsQuery.isError &&
            filteredBackups.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-400">Nom du fichier</TableHead>
                      <TableHead className="text-zinc-400">Date</TableHead>
                      <TableHead className="text-zinc-400">Poids</TableHead>
                      <TableHead className="text-zinc-400 w-12">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBackups.map((backup: BackupFile) => (
                      <TableRow
                        key={backup.id}
                        className="border-zinc-800 hover:bg-zinc-800/50"
                      >
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Archive className="h-5 w-5 text-zinc-500 shrink-0" />
                              <span className="text-zinc-100 truncate max-w-[200px] sm:max-w-none">
                                {backup.name}
                              </span>
                              {backup.isFinal && (
                                <Badge
                                  variant="secondary"
                                  className="bg-emerald-900 text-emerald-300 border-emerald-700 hover:bg-emerald-800 shrink-0"
                                >
                                  <Package className="h-3 w-3 mr-1" />
                                  Point de Restauration
                                </Badge>
                              )}
                            </div>
                            {backup.isFinal && backup.associatedModpack && (
                              <div className="text-xs text-zinc-500 ml-7">
                                Modpack: <span className="text-emerald-400">{backup.associatedModpack}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-300 whitespace-nowrap">
                          {formatDate(backup.createdTime)}
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {formatBytes(backup.size)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-zinc-900 border-zinc-800 text-zinc-100"
                            >
                              {backup.isFinal && (
                                <>
                                  <DropdownMenuItem
                                    className="bg-emerald-950 text-emerald-300 hover:bg-emerald-900 focus:bg-emerald-900 cursor-pointer"
                                    onSelect={() => setRestoreTarget(backup)}
                                  >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Restaurer cet état complet
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-zinc-800" />
                                </>
                              )}
                              {backup.webContentLink && (
                                <DropdownMenuItem asChild>
                                  <a
                                    href={backup.webContentLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center cursor-pointer"
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    Télécharger
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="bg-zinc-800" />
                              <DropdownMenuItem
                                className="text-rose-400 focus:text-rose-400 focus:bg-rose-950/50 cursor-pointer"
                                onSelect={() => setDeleteTarget(backup)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">
              Supprimer cette sauvegarde ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Es-tu sûr de vouloir supprimer définitivement cette sauvegarde ? Cette
              action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border-zinc-700">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog
        open={!!restoreTarget}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
      >
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">
              Restaurer cet état complet ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Attention : Cela va arrêter le serveur actuel, réinstaller le modpack{' '}
              <span className="text-emerald-400 font-semibold">
                {restoreTarget?.associatedModpack}
              </span>{' '}
              et écraser la map actuelle par celle-ci.
            </AlertDialogDescription>
            <div className="mt-4">
              <label className="text-sm text-zinc-400">Version ID du modpack :</label>
              <Input
                value={restoreVersionId}
                onChange={(e) => setRestoreVersionId(e.target.value)}
                className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-100"
                placeholder="ex: 20314"
              />
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border-zinc-700">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() =>
                restoreTarget &&
                restoreMutation.mutate({
                  fileId: restoreTarget.id,
                  modpackName: restoreTarget.associatedModpack,
                  modpackVersionId: restoreVersionId,
                })
              }
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? 'Lancement...' : 'Confirmer la restauration'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}