import { Link, useRouterState } from '@tanstack/react-router'
import { Boxes, DatabaseBackup, LayoutDashboard, Menu } from 'lucide-react'
import { useState } from 'react'

import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton } from '@/components/ui/sidebar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/modpacks', label: 'Modpacks', icon: Boxes },
  { to: '/backups', label: 'Backups', icon: DatabaseBackup },
] as const

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  
  return (
    <div className="flex flex-col gap-2">
      {navItems.map((item) => (
        <Link 
          key={item.to} 
          to={item.to} 
          onClick={onNavigate}
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ease-in-out
            ${pathname === item.to 
              ? 'bg-zinc-800/80 text-zinc-100 border border-white/10' 
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}
          `}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="font-medium">{item.label}</span>
        </Link>
      ))}
    </div>
  )
}

export function AppSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar className="border-r border-white/5 bg-zinc-950/50 backdrop-blur-xl">
          <SidebarHeader className="px-4 py-6">
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 font-display">BoxToPlay</p>
            <p className="mt-2 text-sm font-semibold text-zinc-100 font-display">Control Center</p>
          </SidebarHeader>
          <SidebarContent className="px-3">
            <SidebarMenu>
              <NavContent />
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </div>

      {/* Mobile Sheet Navigation */}
      <div className="md:hidden fixed top-4 left-4 z-40">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 border-white/10 bg-zinc-900/80 backdrop-blur hover:bg-zinc-800">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-zinc-950 border-r border-white/10 p-6">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 font-display">BoxToPlay</p>
              <p className="mt-2 text-lg font-semibold text-zinc-100 font-display">Control Center</p>
            </div>
            <NavContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
