'use client'

import { Link, useRouterState } from '@tanstack/react-router'
import { Boxes, DatabaseBackup, LayoutDashboard, Menu, X } from 'lucide-react'
import { useState } from 'react'

import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu } from '@/components/ui/sidebar'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/modpacks', label: 'Modpacks', icon: Boxes },
  { to: '/backups', label: 'Backups', icon: DatabaseBackup },
] as const

export function AppSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed bottom-4 right-4 z-50 p-3 rounded-full bg-zinc-800/90 backdrop-blur-xl border border-white/10 shadow-xl"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-5 w-5 text-zinc-100" /> : <Menu className="h-5 w-5 text-zinc-100" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar className={`
        border-r border-white/5 bg-zinc-950/80 backdrop-blur-xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        md:relative fixed left-0 top-0 h-full w-64 z-40 transition-transform duration-300 ease-in-out
      `}>
        <SidebarHeader className="px-4 py-6">
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 font-display">BoxToPlay</p>
          <p className="mt-2 text-sm font-semibold text-zinc-100 font-display">Control Center</p>
        </SidebarHeader>
        <SidebarContent className="px-3">
          <SidebarMenu>
            {navItems.map((item) => (
              <Link 
                key={item.to} 
                to={item.to} 
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ease-in-out mb-1
                  ${pathname === item.to 
                    ? 'bg-zinc-800/80 text-zinc-100 border border-white/10 shadow-lg shadow-zinc-900/50' 
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 hover:border-white/5'}
                `}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    </>
  )
}
