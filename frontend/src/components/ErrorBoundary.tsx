import { TriangleAlert } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  /** shown in the message, e.g. "alert details" */
  what?: string
  /** compact fallback for panels like the alert drawer */
  compact?: boolean
}

/** Keeps one broken screen or panel from blanking the whole app. */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className={this.props.compact ? 'p-4' : 'mx-auto max-w-lg py-16'}>
        <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
          <TriangleAlert className="mx-auto mb-2 size-8 text-warn" />
          <p className="font-semibold">Could not show {this.props.what ?? 'this page'}</p>
          <p className="mt-1 break-words font-mono text-xs text-muted-foreground">{error.message}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => this.setState({ error: null })}>Try again</Button>
            <Button size="sm" onClick={() => window.location.reload()}>Reload</Button>
          </div>
        </div>
      </div>
    )
  }
}
