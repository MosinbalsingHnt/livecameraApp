import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark'

interface UiState {
  theme: Theme
  toggleTheme: () => void
  /** alert open in the detail drawer (shared by Alerts and Map pages) */
  drawerAlertId: string | null
  openAlert: (id: string) => void
  closeAlert: () => void
  /** live refresh pause (polling) */
  livePaused: boolean
  toggleLive: () => void
}

const applyTheme = (t: Theme) => document.documentElement.classList.toggle('dark', t === 'dark')

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      toggleTheme: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
        applyTheme(next)
        set({ theme: next })
      },
      drawerAlertId: null,
      openAlert: (id) => set({ drawerAlertId: id }),
      closeAlert: () => set({ drawerAlertId: null }),
      livePaused: false,
      toggleLive: () => set((s) => ({ livePaused: !s.livePaused })),
    }),
    { name: 'ui-store', partialize: (s) => ({ theme: s.theme }) },
  ),
)

/** polling interval for "live" screens; false while paused */
export const useLiveInterval = (ms = 10_000) => {
  const paused = useUiStore((s) => s.livePaused)
  return paused ? false : ms
}
