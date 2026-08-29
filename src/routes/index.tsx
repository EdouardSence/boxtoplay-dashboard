import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { Fault, Gauge, Lamp, PageHead, Panel, Readout, State, Well } from '@/components/ui/instrument'
import {
  formatRemaining,
  formatWorkflowState,
  nextRotationAt,
  trialFraction,
  trialSignal,
  workflowSignal,
} from '@/lib/dashboard'
import { getServerVitals } from '@/server/btp'
import { getGistState, getMinecraftStatus, getRecentWorkflows } from '@/server/dashboard'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

const HOST = 'orny.boxtoplay.com'

function DashboardPage() {
  const status = useQuery({
    queryKey: ['minecraft-status'],
    queryFn: () => getMinecraftStatus(),
    refetchInterval: 60_000,
  })

  const vitals = useQuery({
    queryKey: ['server-vitals'],
    queryFn: () => getServerVitals(),
    refetchInterval: 60_000,
  })

  const rotation = useQuery({
    queryKey: ['gist-state'],
    queryFn: () => getGistState(),
    refetchInterval: 60_000,
  })

  const runs = useQuery({
    queryKey: ['recent-workflows'],
    queryFn: () => getRecentWorkflows(),
    refetchInterval: 30_000,
  })

  return (
    <div className="space-y-5">
      <PageHead
        title="Tableau de bord"
        note="Le serveur migre seul entre deux comptes toutes les huit heures. Cet écran lit son état, il n'agit pas dessus."
      />

      <StatusBanner status={status} vitals={vitals} />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <PanelVitals vitals={vitals} />
        <RotationPanel rotation={rotation} />
      </div>

      <RunLog runs={runs} />
    </div>
  )
}

// -----------------------------------------------------------------------------
// Bandeau: la seule chose lisible de loin.
// -----------------------------------------------------------------------------

function StatusBanner({
  status,
  vitals,
}: {
  status: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getMinecraftStatus>>>>
  vitals: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getServerVitals>>>>
}) {
  const online = status.data?.online === true
  const signal = status.isPending ? 'idle' : online ? 'live' : 'fault'
  const expiresAt = vitals.data?.expiresAt ?? null

  const players = status.data?.playersOnline ?? 0
  const slots = status.data?.playersMax ?? 0

  return (
    <section className="panel arrive overflow-hidden">
      <div className="flex flex-col gap-5 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Lamp signal={signal} className="h-3.5 w-3.5" />
          <div>
            <p className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
              {status.isPending ? 'Lecture…' : online ? 'En ligne' : 'Hors ligne'}
            </p>
            <p className="readout mt-1 text-sm text-ink-dim">{HOST}</p>
          </div>
        </div>

        <div className="min-w-0 md:w-72">
          <div className="flex items-baseline justify-between gap-4">
            <span className="engraved">Essai restant</span>
            <span className="readout text-sm text-ink">
              {vitals.isPending ? '…' : formatRemaining(expiresAt)}
            </span>
          </div>
          <Gauge
            className="mt-2.5"
            label="Temps restant sur l'essai en cours"
            value={trialFraction(expiresAt)}
            signal={trialSignal(expiresAt)}
            ticks={[1 / 6]}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-t border-edge-soft bg-edge-soft sm:grid-cols-4">
        <Cell label="Serveur" value={vitals.data?.displayId ? `#${vitals.data.displayId}` : '—'} />
        <Cell label="Modpack" value={vitals.data?.installedModpack ?? '—'} />
        <Cell label="Joueurs" value={online ? `${players} / ${slots}` : '—'}>
          {online && slots > 0 && (
            <Gauge
              className="mt-2.5"
              label="Places occupées"
              value={players / slots}
              signal={players > 0 ? 'live' : 'idle'}
            />
          )}
        </Cell>
        <Cell label="État panel" value={vitals.data?.runtimeStatus ?? '—'} />
      </div>
    </section>
  )
}

function Cell({
  label,
  value,
  children,
}: {
  label: string
  value: string
  children?: React.ReactNode
}) {
  return (
    <div className="bg-panel px-4 py-3.5 sm:px-5">
      <p className="engraved">{label}</p>
      <p className="readout mt-2 truncate text-sm text-ink" title={value}>
        {value}
      </p>
      {children}
    </div>
  )
}

// -----------------------------------------------------------------------------

function PanelVitals({
  vitals,
}: {
  vitals: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getServerVitals>>>>
}) {
  return (
    <Panel title="Panel BoxToPlay" note="Source faisant foi · relu toutes les 60 s">
      <div className="p-4 sm:p-5">
        {vitals.isPending ? (
          <LoadingGrid />
        ) : vitals.isError ? (
          <Fault>
            L'API BoxToPlay a refusé la requête ou n'est pas joignable. Vérifier
            <span className="readout"> BTP_API_KEY_0</span> et
            <span className="readout"> BTP_API_KEY_1</span> dans l'environnement Vercel.
          </Fault>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Readout label="Connexion" value={vitals.data.connectionAddress ?? '—'} />
            <Readout
              label="Expire à"
              value={
                vitals.data.expiresAt
                  ? new Date(vitals.data.expiresAt).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'
              }
              signal={trialSignal(vitals.data.expiresAt)}
            />
            <Readout
              label="Modpack installé"
              value={vitals.data.installedModpack ?? '—'}
              title={vitals.data.installedModpack ?? undefined}
              className="sm:col-span-2"
            />
          </div>
        )}
      </div>
    </Panel>
  )
}

// -----------------------------------------------------------------------------

function RotationPanel({
  rotation,
}: {
  rotation: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getGistState>>>>
}) {
  const next = nextRotationAt()

  return (
    <Panel title="Rotation" note="État du worker, lu dans le Gist">
      <div className="p-4 sm:p-5">
        {rotation.isPending ? (
          <LoadingGrid />
        ) : rotation.isError ? (
          <Fault>
            Gist illisible. Vérifier <span className="readout">GH_TOKEN</span> et
            <span className="readout"> GIST_ID</span>.
          </Fault>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Readout label="Compte actif" value={rotation.data.activeAccountEmail} />
              <Readout label="Serveur" value={rotation.data.activeServerId} />
              <Readout label="Modpack" value={rotation.data.modpackName} />
              <Readout label="Référence" value={rotation.data.modpackRef} />
            </div>

            <div className="mt-4 border-t border-edge-soft pt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <span className="engraved">Dernière</span>
                <span className="readout text-sm text-ink">
                  {rotation.data.lastRotationAt
                    ? new Date(rotation.data.lastRotationAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <span className="engraved">Prochaine au plus tôt</span>
                <span className="readout text-sm text-ink-dim">
                  {next
                    ? next.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </span>
              </div>
              <p className="mt-3 max-w-[68ch] text-xs text-ink-label">
                Le cron GitHub tire souvent en retard, jusqu'à quatre heures observées. Cette
                heure est un plancher, pas une promesse.
              </p>
            </div>
          </>
        )}
      </div>
    </Panel>
  )
}

// -----------------------------------------------------------------------------

function RunLog({
  runs,
}: {
  runs: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getRecentWorkflows>>>>
}) {
  return (
    <Panel title="Journal" note="Derniers déclenchements GitHub Actions">
      <div className="p-4 sm:p-5">
        {runs.isPending ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Well key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : runs.isError ? (
          <Fault>
            Journal indisponible. Vérifier <span className="readout">GH_TOKEN</span> et
            <span className="readout"> GITHUB_REPO</span>.
          </Fault>
        ) : runs.data.length === 0 ? (
          <p className="text-sm text-ink-dim">Aucun déclenchement enregistré.</p>
        ) : (
          <table className="stack-rows w-full">
            <thead>
              <tr className="border-b border-edge-soft text-left">
                <th className="engraved pb-2.5">Déclenchement</th>
                <th className="engraved pb-2.5">Date</th>
                <th className="engraved pb-2.5">État</th>
                <th className="engraved pb-2.5 text-right">Logs</th>
              </tr>
            </thead>
            <tbody>
              {runs.data.map((run) => (
                <tr key={run.id} className="border-b border-edge-soft/60 last:border-0">
                  <td data-label="Déclenchement" className="py-2.5 pr-4 text-sm text-ink">
                    {run.name}
                  </td>
                  <td data-label="Date" className="readout py-2.5 pr-4 text-xs text-ink-dim">
                    {new Date(run.createdAt).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td data-label="État" className="py-2.5 pr-4">
                    <State signal={workflowSignal(run.status, run.conclusion)}>
                      {formatWorkflowState(run.status, run.conclusion)}
                    </State>
                  </td>
                  <td data-label="Logs" className="py-2.5 text-right">
                    <a
                      href={run.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-ink-dim underline-offset-4 hover:text-ink hover:underline"
                    >
                      Ouvrir
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Panel>
  )
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <Well key={i} className="h-[62px] w-full" />
      ))}
    </div>
  )
}
