import * as React from 'react'
import { cn } from '@/lib/utils'

export const Table = ({ className, ...p }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <div className="overflow-x-auto">
    <table className={cn('w-full min-w-[640px] border-collapse text-sm', className)} {...p} />
  </div>
)
export const Th = ({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn('whitespace-nowrap border-b px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground', className)} {...p} />
)
export const Td = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('border-b px-3 py-2.5 align-middle', className)} {...p} />
)
