import * as React from 'react'

import { cn } from '@/lib/utils'

function Sidebar({ className, ...props }: React.ComponentProps<'aside'>) {
  return <aside className={cn('w-64 border-r border-zinc-800 bg-zinc-950/90', className)} {...props} />
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('border-b border-zinc-800 p-5', className)} {...props} />
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('p-3', className)} {...props} />
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'nav'>) {
  return <nav className={cn('space-y-1', className)} {...props} />
}

function SidebarMenuButton({ className, isActive = false, ...props }: React.ComponentProps<'div'> & { isActive?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100',
        isActive && 'bg-zinc-900 text-zinc-100',
        className,
      )}
      {...props}
    />
  )
}

export { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton }
