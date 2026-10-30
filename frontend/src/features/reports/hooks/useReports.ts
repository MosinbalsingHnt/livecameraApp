import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../api/reportsApi'

export const useDailyReport = (days: number) => useQuery({ queryKey: ['reports', 'daily', days], queryFn: () => reportsApi.daily(days) })
export const useWardReport = () => useQuery({ queryKey: ['reports', 'wards'], queryFn: reportsApi.wards })
