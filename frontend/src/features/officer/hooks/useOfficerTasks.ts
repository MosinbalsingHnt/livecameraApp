import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorMessage } from '@/services/api/axios'
import { useLiveInterval } from '@/store/uiStore'
import { officerApi } from '../api/officerApi'

export const useOfficerTasks = () => {
  const interval = useLiveInterval(15_000)
  return useQuery({ queryKey: ['officer-tasks'], queryFn: officerApi.tasks, refetchInterval: interval })
}

export const useOfficerAction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; kind: 'start' | 'cleared' | 'cant'; reason?: string }) =>
      v.kind === 'start' ? officerApi.start(v.id) : v.kind === 'cleared' ? officerApi.reportCleared(v.id) : officerApi.cantClear(v.id, v.reason ?? ''),
    onSuccess: (_d, v) => {
      toast.success(v.kind === 'start' ? 'Work started' : v.kind === 'cleared' ? 'Reported cleared. Awaiting confirmation by the next camera pass.' : 'Operator notified')
      qc.invalidateQueries({ queryKey: ['officer-tasks'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
}
