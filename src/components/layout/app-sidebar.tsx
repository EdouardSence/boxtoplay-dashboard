'use client'

import { Link, useRouterState } from '@tanstack/react-router'
import { Boxes, DatabaseBackup, LayoutDashboard, Menu, X } from 'lucide-react'
import { useState } from 'react'

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
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed bottom-5 right-5 z-50 p-3 rounded-full bg-orange-500 shadow-xl shadow-orange-500/30 transition-transform active:scale-95"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          border-r border-zinc-800/60 bg-zinc-950
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:relative fixed left-0 top-0 h-full w-60 z-40 transition-transform duration-300 ease-in-out
          flex flex-col
        `}
      >
        {/* Logo */}
        <div className="px-4 py-6 flex items-center gap-3 border-b border-zinc-800/60">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm font-display">B</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-100 font-display tracking-wide truncate">BoxToPlay</p>
            <p className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">Control Center</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={`
                  group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                  ${active
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                  }
                `}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-orange-500 rounded-r-full" />
                )}
                <item.icon className={`h-4 w-4 shrink-0 transition-colors ${active ? 'text-orange-400' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-zinc-800/60">
          <p className="text-[10px] font-mono text-zinc-700 tracking-wider">v2 · automated rotation</p>
        </div>
      </aside>
    </>
  )
}
