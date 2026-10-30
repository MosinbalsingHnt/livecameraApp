import type { ReactNode } from 'react'
import { Label } from '@/components/ui/card'

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div><Label>{label}</Label>{children}</div>
)

export const ActiveChip = ({ active }: { active: boolean }) => (
  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${active ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground'}`}>
    {active ? 'Active' : 'Inactive'}
  </span>
)

export const blankToNull = (s: string) => (s.trim() === '' ? null : s.trim())
