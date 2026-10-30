import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppRouter } from '@/navigation/AppRouter'
import { queryClient } from '@/services/api/queryClient'
import { useUiStore } from '@/store/uiStore'

export default function App() {
  const theme = useUiStore((s) => s.theme)
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
      <Toaster position="bottom-center" richColors theme={theme} />
    </QueryClientProvider>
  )
}
