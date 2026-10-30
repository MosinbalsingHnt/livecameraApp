import * as React from 'react'
import { cn } from '@/lib/utils'

const field =
  'w-full rounded-lg border bg-card px-3 text-sm placeholder:text-muted-foreground disabled:opacity-60'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => <input ref={ref} className={cn(field, 'h-9', className)} {...p} />,
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => <textarea ref={ref} className={cn(field, 'min-h-20 py-2', className)} {...p} />,
)
Textarea.displayName = 'Textarea'
