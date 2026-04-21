import { Link, useRouterState } from '@tanstack/react-router'
import { Boxes, DatabaseBackup, LayoutDashboard } from 'lucide-react'

import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton } from '@/components/ui/sidebar'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/modpacks', label: 'Modpacks', icon: Boxes },
  { to: '/backups', label: 'Backups', icon: DatabaseBackup },
] as const

export function AppSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <Sidebar>
      <SidebarHeader>
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">BoxToPlay</p>
        <p className="mt-1 text-sm font-semibold text-zinc-100">Control Center</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className="block">
              <SidebarMenuButton isActive={pathname === item.to}>
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  )
}
