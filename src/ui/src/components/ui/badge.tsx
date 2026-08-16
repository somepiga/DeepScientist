import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-none border-2 px-2 py-0.5 text-[10px] font-display uppercase tracking-wide',
  {
    variants: {
      variant: {
        default: 'border-[hsl(var(--pixel-border-color))] bg-background text-foreground',
        secondary: 'border-[hsl(var(--pixel-border-color))] bg-muted text-muted-foreground',
        success: 'border-[hsl(var(--soft-success))] bg-[hsl(var(--soft-success)/0.18)] text-foreground',
        warning: 'border-[hsl(var(--soft-warning))] bg-[hsl(var(--soft-warning)/0.22)] text-foreground',
        destructive: 'border-[hsl(var(--soft-danger))] bg-[hsl(var(--soft-danger)/0.18)] text-foreground',
        error: 'border-[hsl(var(--soft-danger))] bg-[hsl(var(--soft-danger)/0.18)] text-foreground',
        primary: 'border-[hsl(var(--soft-accent))] bg-[hsl(var(--soft-accent)/0.18)] text-foreground',
        outline: 'border-[hsl(var(--pixel-border-color))] bg-transparent text-foreground',
        info: 'border-[hsl(var(--soft-info))] bg-[hsl(var(--soft-info)/0.18)] text-foreground',
      },
      size: {
        sm: 'text-[10px] px-1.5 py-0.5',
        md: 'text-xs px-2 py-0.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'primary'

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}
