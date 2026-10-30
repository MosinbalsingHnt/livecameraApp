import * as React from 'react'
import { cn } from '@/lib/utils'

export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-2xl border bg-card p-4 shadow-sm', className)} {...p} />
)
export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn('mb-3 text-base font-semibold', className)} {...p} />
)
export const Label = ({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn('mb-1 block text-xs font-semibold text-muted-foreground', className)} {...p} />
)
export const SectionLabel = ({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn('mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground', className)} {...p} />
)
export const Skeleton = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('animate-pulse rounded-lg bg-muted', className)} {...p} />
)
export const EmptyState = ({ title, hint, icon }: { title: string; hint?: string; icon?: React.ReactNode }) => (
  <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
    {icon && <div className="text-muted-foreground">{icon}</div>}
    <p className="font-semibold">{title}</p>
    {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
  </div>
)
