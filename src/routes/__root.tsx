import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TanStackDevtools } from '@tanstack/react-devtools'
import * as React from 'react'

import { AppSidebar } from '@/components/layout/app-sidebar'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'BoxToPlay Control Center' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' as const },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap' },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: RootNotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      }),
  )

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans" suppressHydrationWarning>
        <div className="noise" />
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[{ name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel /> }]}
        />
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-6 lg:p-8 min-w-0">
        <div className="max-w-7xl mx-auto animate-fade-in-up">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function RootNotFound() {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm p-6 md:p-8">
      <h1 className="text-xl font-semibold text-zinc-100 font-display">Page introuvable</h1>
      <p className="mt-2 text-sm text-zinc-400">La route demandée n'existe pas.</p>
    </div>
  )
}