import * as RT from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

export const Tabs = RT.Root
export const TabsContent = (p: RT.TabsContentProps) => <RT.Content {...p} className={cn('mt-4 outline-none', p.className)} />
export const TabsList = (p: RT.TabsListProps) => (
  <RT.List {...p} className={cn('inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border bg-muted p-1', p.className)} />
)
export const TabsTrigger = (p: RT.TabsTriggerProps) => (
  <RT.Trigger
    {...p}
    className={cn(
      'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      p.className,
    )}
  />
)
