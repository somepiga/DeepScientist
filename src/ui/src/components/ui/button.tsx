import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-none text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 font-display tracking-wide',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground border-2 border-[hsl(var(--pixel-border-color))] shadow-pixel hover:shadow-pixel-lg hover:-translate-y-0.5 active:translate-y-0.5 active:translate-x-0.5 active:shadow-pixel-sm',
        primary:
          'bg-primary text-primary-foreground border-2 border-[hsl(var(--pixel-border-color))] shadow-pixel hover:shadow-pixel-lg hover:-translate-y-0.5 active:translate-y-0.5 active:translate-x-0.5 active:shadow-pixel-sm',
        destructive:
          'bg-destructive text-destructive-foreground border-2 border-[hsl(var(--pixel-border-color))] shadow-pixel hover:shadow-pixel-lg hover:-translate-y-0.5 active:translate-y-0.5 active:translate-x-0.5 active:shadow-pixel-sm',
        outline:
          'border-2 border-[hsl(var(--pixel-border-color))] bg-background shadow-pixel hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-y-0.5 active:shadow-pixel-sm',
        secondary:
          'bg-secondary text-secondary-foreground border-2 border-[hsl(var(--pixel-border-color))] shadow-pixel hover:shadow-pixel-lg hover:-translate-y-0.5 active:translate-y-0.5 active:translate-x-0.5 active:shadow-pixel-sm',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        fab: 'rounded-none bg-primary text-primary-foreground border-2 border-[hsl(var(--pixel-border-color))] shadow-pixel hover:shadow-pixel-lg hover:-translate-y-0.5 active:translate-y-0.5 active:translate-x-0.5 active:shadow-pixel-sm',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  /** @deprecated Use isLoading instead */
  loading?: boolean
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, loading, asChild = false, children, disabled, type, ...props }, ref) => {
    const showLoading = isLoading || loading
    const Comp = asChild ? Slot : 'button'
    const resolvedType = !asChild && Comp === 'button' && !type ? 'button' : type
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || showLoading}
        {...props}
        type={resolvedType}
      >
        {showLoading ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
