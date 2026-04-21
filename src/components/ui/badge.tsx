import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize', {
  variants: {
    variant: {
      success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      danger: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
      info: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
      muted: 'border-zinc-700 bg-zinc-800 text-zinc-300',
    },
  },
  defaultVariants: {
    variant: 'muted',
  },
})

function Badge({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
