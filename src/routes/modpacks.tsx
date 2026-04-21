import { createFileRoute } from '@tanstack/react-router'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/modpacks')({
  component: ModpacksPage,
})

function ModpacksPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Modpacks</CardTitle>
        <CardDescription>CurseForge and BoxToPlay modpack explorer (phase 2 placeholder).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-zinc-400">Search and deployment controls will be added here.</p>
        <Input placeholder="Search modpacks..." aria-label="Search modpacks" />
      </CardContent>
    </Card>
  )
}
