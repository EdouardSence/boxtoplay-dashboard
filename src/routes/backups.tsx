import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  Download,
  Loader2,
  Trash2,
  Search,
  HardDrive,
  RotateCcw,
  Package,
  DatabaseBackup,
  History,
  Clock,
  FileArchive,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getBackupsList, getFileRevisions, deleteBackupFile, restoreFullState } from '@/server/backups'
import type { BackupFile, FileRevision } from '@/server/backups'
import { useState, useMemo } from 'react'
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

function formatDateShort(isoDate: string): string {
  const date = new Date(isoDate)
  const day = date.getDate()
  const month = date.toLocaleDateString('fr-FR', { month: 'short' })
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

function BackupsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<BackupFile | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<BackupFile | null>(null)
  const [versionTarget, setVersionTarget] = useState<BackupFile | null>(null)
  const [restoreVersionId, setRestoreVersionId] = useState('20314')

  const backupsQuery = useQuery({
    queryKey: ['backups-list'],
    queryFn: () => getBackupsList(),
    staleTime: 0,
    refetchOnMount: true,
  })

  const revisionsQuery = useQuery({
    queryKey: ['file-revisions', versionTarget?.id],
    queryFn: () => (versionTarget ? getFileRevisions({ fileId: versionTarget.id }) : Promise.resolve([])),
    enabled: !!versionTarget,
  })

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => deleteBackupFile({ input: { fileId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups-list'] })
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
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Impossible de lancer la restauration'}`)
    },
  })

  // Separate backups into rotation active and time machine
  const { rotationBackup, timeMachineBackups } = useMemo(() => {
    const backups = backupsQuery.data ?? []
    const rotation = backups.find((b) => b.name.toLowerCase().includes('minecraft_world_backup'))
    const timeMachine = backups.filter(
      (b) => b.isFinal && !b.name.toLowerCase().includes('minecraft_world_backup')
    )
    return { rotationBackup: rotation, timeMachineBackups: timeMachine }
  }, [backupsQuery.data])

  // Calculate stats from backup files
  const stats = useMemo(() => {
    const backups = backupsQuery.data ?? []
    const totalArchives = backups.length
    const totalSize = backups.reduce((acc, b) => acc + parseInt(b.size, 10), 0)
    const latestDate = backups.length > 0
      ? backups.reduce((latest, b) => (new Date(b.createdTime) > new Date(latest) ? b.createdTime : latest), backups[0].createdTime)
      : null
    return { totalArchives, totalSize, latestDate }
  }, [backupsQuery.data])

  const filteredTimeMachine = useMemo(() => {
    if (!search.trim()) return timeMachineBackups
    const q = search.toLowerCase()
    return timeMachineBackups.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.associatedModpack.toLowerCase().includes(q) ||
        formatDate(b.createdTime).toLowerCase().includes(q)
    )
  }, [timeMachineBackups, search])

  return (
    <div className="space-y-8">
      <Toaster position="top-right" theme="dark" />

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/10">
          <DatabaseBackup className="h-6 w-6 text-zinc-100" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 font-display tracking-tight">Backups</h1>
          <p className="text-sm text-zinc-400 mt-1">Gestion des sauvegardes Minecraft sur Google Drive</p>
        </div>
      </div>

      {/* Stats Section - Calculated from backup files */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-xl shadow-black/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total des Archives</CardTitle>
            <Archive className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100 font-display">{stats.totalArchives}</div>
            <div className="text-xs text-zinc-500 mt-1">fichiers de sauvegarde</div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-xl shadow-black/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Poids des Sauvegardes</CardTitle>
            <HardDrive className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100 font-mono">{formatBytes(stats.totalSize)}</div>
            <div className="text-xs text-zinc-500 mt-1">espace utilisé par les backups</div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-xl shadow-black/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Dernière Activité</CardTitle>
            <Clock className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100 font-mono">
              {stats.latestDate ? formatDateShort(stats.latestDate) : '—'}
            </div>
            <div className="text-xs text-zinc-500 mt-1">dernière sauvegarde</div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION A: Rotation Active - Hero Card */}
      {rotationBackup && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-amber-500 rounded-full" />
            <h2 className="text-lg font-semibold text-zinc-100 font-display">Rotation Active</h2>
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">Sauvegarde Continue</Badge>
          </div>

          <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 backdrop-blur-xl shadow-xl shadow-amber-500/5">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none" />
            
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-5">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <FileArchive className="h-8 w-8 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-100 font-display">{rotationBackup.name}</h3>
                    <div className="flex items-center gap-3 mt-2 text-sm text-zinc-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(rotationBackup.createdTime)}
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span>{formatBytes(rotationBackup.size)}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2 max-w-md">
                      Cette sauvegarde est mise à jour automatiquement à chaque rotation. Elle utilise le versioning de Google Drive pour conserver l'historique.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all duration-300"
                    onClick={() => setVersionTarget(rotationBackup)}
                  >
                    <History className="h-4 w-4 mr-2" />
                    Gérer les versions
                  </Button>
                  {rotationBackup.webContentLink && (
                    <a
                      href={rotationBackup.webContentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex"
                    >
                      <Button
                        variant="outline"
                        className="border-white/10 text-zinc-300 hover:bg-zinc-800 hover:border-white/20 transition-all duration-300"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                    </a>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all duration-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-zinc-900/95 backdrop-blur-xl border-white/10 text-zinc-100"
                    >
                      <DropdownMenuItem
                        className="text-rose-400 focus:text-rose-400 focus:bg-rose-950/30 cursor-pointer transition-colors duration-300"
                        onSelect={() => setDeleteTarget(rotationBackup)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* SECTION B: Time Machine - Grid of Modpacks */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-emerald-500 rounded-full" />
            <h2 className="text-lg font-semibold text-zinc-100 font-display">Points de Restauration</h2>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Time Machine</Badge>
          </div>
          <div className="relative w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-zinc-950/50 border-white/10 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-700 focus:ring-0 transition-all duration-300 text-sm"
            />
          </div>
        </div>

        {backupsQuery.isPending && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card
                key={i}
                className="border-white/10 bg-zinc-900/40 backdrop-blur-xl shadow-xl shadow-black/20"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="skeleton h-6 w-3/4" />
                  <div className="skeleton h-4 w-1/2" />
                  <div className="skeleton h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {backupsQuery.isError && (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl bg-rose-950/10 border border-rose-500/20">
            <Archive className="h-12 w-12 text-rose-500" />
            <p className="mt-4 text-sm text-rose-400 font-medium">Erreur lors du chargement</p>
            <p className="mt-1 text-xs text-zinc-500">Vérifiez votre connexion et réessayez</p>
          </div>
        )}

        {!backupsQuery.isPending && !backupsQuery.isError && filteredTimeMachine.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl bg-zinc-900/20 border border-white/5">
            <div className="p-4 rounded-full bg-zinc-800/50">
              <Package className="h-8 w-8 text-zinc-600" />
            </div>
            <p className="mt-4 text-sm text-zinc-400 font-medium">Aucun point de restauration</p>
            <p className="mt-1 text-xs text-zinc-500">Les sauvegardes finales apparaîtront ici</p>
          </div>
        )}

        {!backupsQuery.isPending && !backupsQuery.isError && filteredTimeMachine.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTimeMachine.map((backup: BackupFile, index: number) => (
              <Card
                key={backup.id}
                className="group relative overflow-hidden border-white/10 bg-zinc-900/40 backdrop-blur-xl shadow-xl shadow-black/20 hover:border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Top glow border */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <CardContent className="p-5 space-y-4">
                  {/* Modpack Title */}
                  <div>
                    <h3 className="text-lg font-bold text-zinc-100 font-display truncate">
                      {backup.associatedModpack || backup.name.replace('.zip', '')}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 font-mono">
                      <Clock className="h-3 w-3" />
                      {formatDateShort(backup.createdTime)}
                      <span className="text-zinc-600">•</span>
                      <span>{formatBytes(backup.size)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-300 text-sm"
                      onClick={() => setRestoreTarget(backup)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restaurer
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all duration-300"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-zinc-900/95 backdrop-blur-xl border-white/10 text-zinc-100"
                      >
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
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                          className="text-rose-400 focus:text-rose-400 focus:bg-rose-950/30 cursor-pointer transition-colors duration-300"
                          onSelect={() => setDeleteTarget(backup)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Version Management Dialog */}
      <Dialog open={!!versionTarget} onOpenChange={(open) => !open && setVersionTarget(null)}>
        <DialogContent className="bg-zinc-950/95 backdrop-blur-xl border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 font-display flex items-center gap-2">
              <History className="h-5 w-5 text-amber-400" />
              Historique des versions
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {versionTarget?.name} — Versions disponibles sur Google Drive
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 max-h-96 overflow-y-auto">
            {revisionsQuery.isPending && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
              </div>
            )}
            
            {revisionsQuery.isError && (
              <div className="text-center py-8 text-rose-400 text-sm">
                Erreur lors du chargement des versions
              </div>
            )}
            
            {revisionsQuery.isSuccess && revisionsQuery.data.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-sm">
                Aucune version trouvée
              </div>
            )}
            
            {revisionsQuery.isSuccess && revisionsQuery.data.length > 0 && (
              <div className="space-y-2">
                {revisionsQuery.data.map((revision: FileRevision, idx: number) => (
                  <div
                    key={revision.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <span className="text-xs font-mono text-amber-400">v{revisionsQuery.data.length - idx}</span>
                      </div>
                      <div>
                        <div className="text-sm text-zinc-100 font-mono">
                          {formatDate(revision.modifiedTime)}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {formatBytes(revision.size)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-950/95 backdrop-blur-xl border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100 font-display">Supprimer cette sauvegarde ?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Es-tu sûr de vouloir supprimer définitivement cette sauvegarde ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 text-zinc-100 hover:bg-zinc-800 border-white/10 transition-all duration-300">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700 transition-all duration-300"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreTarget} onOpenChange={(open) => !open && setRestoreTarget(null)}>
        <AlertDialogContent className="bg-zinc-950/95 backdrop-blur-xl border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100 font-display flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Restaurer cet état complet ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Attention : Cela va arrêter le serveur actuel, réinstaller le modpack{' '}
              <span className="text-emerald-400 font-semibold">{restoreTarget?.associatedModpack}</span>{' '}
              et écraser la map actuelle par celle-ci.
            </AlertDialogDescription>
            <div className="mt-4">
              <label className="text-sm text-zinc-400">Version ID du modpack :</label>
              <Input
                value={restoreVersionId}
                onChange={(e) => setRestoreVersionId(e.target.value)}
                className="mt-2 bg-zinc-950/50 border-white/10 text-zinc-100 font-mono focus:border-emerald-500/50 focus:ring-0 transition-all duration-300"
                placeholder="ex: 20314"
              />
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 text-zinc-100 hover:bg-zinc-800 border-white/10 transition-all duration-300">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-700 transition-all duration-300"
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