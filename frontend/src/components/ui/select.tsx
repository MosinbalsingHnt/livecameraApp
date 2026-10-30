import * as RS from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Option {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (v: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  disabled?: boolean
  'aria-label'?: string
}

/** Radix doesn't allow empty-string item values, so '' is mapped to a sentinel. */
const EMPTY = '__empty__'

export function Select({ value, onChange, options, placeholder, className, disabled, ...rest }: Props) {
  return (
    <RS.Root value={value === '' ? EMPTY : value} onValueChange={(v) => onChange(v === EMPTY ? '' : v)} disabled={disabled}>
      <RS.Trigger
        aria-label={rest['aria-label']}
        className={cn(
          'inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-card px-3 text-sm disabled:opacity-60',
          className,
        )}
      >
        <span className="truncate"><RS.Value placeholder={placeholder} /></span>
        <RS.Icon><ChevronDown className="size-4 text-muted-foreground" /></RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content position="popper" sideOffset={4} className="z-[1200] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border bg-card shadow-lg">
          <RS.Viewport className="p-1">
            {options.map((o) => (
              <RS.Item
                key={o.value}
                value={o.value === '' ? EMPTY : o.value}
                className="relative flex cursor-pointer items-center rounded-md py-1.5 pl-7 pr-3 text-sm outline-none data-[highlighted]:bg-muted"
              >
                <RS.ItemIndicator className="absolute left-2"><Check className="size-3.5" /></RS.ItemIndicator>
                <RS.ItemText>{o.label}</RS.ItemText>
              </RS.Item>
            ))}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  )
}
