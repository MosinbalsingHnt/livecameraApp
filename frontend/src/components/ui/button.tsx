import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { Tooltip } from './tooltip'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-brand text-brand-foreground hover:opacity-90',
        secondary: 'border bg-card text-foreground hover:bg-muted',
        ghost: 'text-foreground hover:bg-muted',
        danger: 'border border-danger/40 bg-card text-danger hover:bg-danger-soft',
        solidDanger: 'bg-danger text-card hover:opacity-90',
      },
      size: { default: 'h-9 px-4', sm: 'h-8 px-3 text-[13px]', lg: 'h-12 px-5 text-base', icon: 'size-9' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    const button = (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
        {asChild ? children : (<>{loading && <Loader2 className="size-4 animate-spin" />}{children}</>)}
      </Comp>
    )
    // an icon-only button has no visible text, so its aria-label doubles as the hover hint
    const hint = size === 'icon' && !asChild ? props['aria-label'] : undefined
    return hint ? <Tooltip label={hint}>{button}</Tooltip> : button
  },
)
Button.displayName = 'Button'
