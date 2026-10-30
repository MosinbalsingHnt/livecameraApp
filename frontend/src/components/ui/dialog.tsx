import * as RD from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Tooltip } from './tooltip'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  children: ReactNode
  /** 'sheet' slides in from the right (alert drawer); 'modal' is centered (forms) */
  variant?: 'sheet' | 'modal'
  className?: string
}

export function Dialog({ open, onOpenChange, title, description, children, variant = 'modal', className }: Props) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        {/* z above Leaflet, whose panes/controls use z-index up to 1000 */}
        <RD.Overlay className="fixed inset-0 z-[1100] bg-black/55 backdrop-blur-[2px]" />
        <RD.Content
          aria-describedby={description ? undefined : undefined}
          className={cn(
            'fixed z-[1101] overflow-y-auto bg-background shadow-2xl',
            variant === 'sheet'
              ? 'inset-y-0 right-0 w-full max-w-4xl p-4 sm:p-5 2xl:max-w-5xl'
              : 'left-1/2 top-1/2 max-h-[90dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-5',
            className,
          )}
        >
          <div className="mb-4 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <RD.Title className="text-lg font-semibold">{title}</RD.Title>
              {description ? (
                <RD.Description className="text-sm text-muted-foreground">{description}</RD.Description>
              ) : (
                <RD.Description className="sr-only">{title}</RD.Description>
              )}
            </div>
            <Tooltip label="Close" side="left">
              <RD.Close className="rounded-md p-1.5 hover:bg-muted" aria-label="Close"><X className="size-4" /></RD.Close>
            </Tooltip>
          </div>
          {children}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  )
}
