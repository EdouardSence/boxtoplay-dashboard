import { createFileRoute } from '@tanstack/react-router'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/backups')({
  component: BackupsPage,
})

function BackupsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Backups</CardTitle>
        <CardDescription>Google Drive backup manager (phase 2 placeholder).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-zinc-400">Backup listing and restore actions will be added here.</p>
        <Button variant="outline">Sync backups</Button>
      </CardContent>
    </Card>
  )
}
