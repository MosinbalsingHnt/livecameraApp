import * as RT from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const TooltipProvider = ({ children }: { children: ReactNode }) => (
  <RT.Provider delayDuration={250} skipDelayDuration={150}>{children}</RT.Provider>
)

interface Props {
  label: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** extra classes for the bubble, e.g. to show it only at some breakpoints */
  className?: string
}

/** Hover / keyboard-focus hint for an icon. `children` must be a single element. */
export function Tooltip({ label, children, side = 'bottom', className }: Props) {
  return (
    <RT.Root>
      <RT.Trigger asChild>{children}</RT.Trigger>
      <RT.Portal>
        {/* z above the alert drawer (1101) and Leaflet (<=1000) */}
        <RT.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            'z-[1300] max-w-60 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg ring-1 ring-white/15',
            className,
          )}
        >
          {label}
          <RT.Arrow className="fill-foreground" />
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  )
}
