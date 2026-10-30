import { useQuery } from '@tanstack/react-query'
import { hotspotsApi } from '../api/hotspotsApi'

export const useHotspots = (days: number, minCount: number) =>
  useQuery({ queryKey: ['hotspots', days, minCount], queryFn: () => hotspotsApi.list(days, minCount) })
