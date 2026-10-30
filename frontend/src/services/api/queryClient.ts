import { QueryClient } from '@tanstack/react-query'
import axios from 'axios'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      refetchOnWindowFocus: true,
      retry: (count, error) => {
        // don't hammer on auth/permission/validation failures
        if (axios.isAxiosError(error) && error.response && error.response.status < 500) return false
        return count < 2
      },
    },
  },
})
