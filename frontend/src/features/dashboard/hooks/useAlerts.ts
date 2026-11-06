import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorMessage } from '@/services/api/axios'
import { useLiveInterval } from '@/store/uiStore'
import type { AlertsQuery } from '@/types/api'
import { useEffect, useState } from 'react'
import { alertsApi, mediaApi, statsApi } from '../api/dashboardApi'

export const useAlerts = (q: AlertsQuery) => {
  const interval = useLiveInterval(10_000)
  return useQuery({
    queryKey: ['alerts', q],
    queryFn: () => alertsApi.list(q),
    refetchInterval: interval,
    placeholderData: keepPreviousData,
  })
}

export const useAlert = (id: string | null) => {
  const interval = useLiveInterval(10_000)
  return useQuery({ queryKey: ['alert', id], queryFn: () => alertsApi.get(id!), enabled: !!id, refetchInterval: interval })
}

export const useTimeline = (id: string | null) =>
  useQuery({ queryKey: ['timeline', id], queryFn: () => alertsApi.timeline(id!), enabled: !!id })

export const useRecipients = (id: string | null, enabled: boolean) =>
  useQuery({ queryKey: ['recipients', id], queryFn: () => alertsApi.recipients(id!), enabled: !!id && enabled })

export const useStats = () => {
  const interval = useLiveInterval(10_000)
  return useQuery({ queryKey: ['stats'], queryFn: statsApi.get, refetchInterval: interval })
}

/** Wraps an alert action: toast result, then refresh everything an action can change. */
function useAlertMutation<V>(fn: (v: V) => Promise<unknown>, success: string | ((v: V) => string), idOf: (v: V) => string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (_d, v) => {
      toast.success(typeof success === 'function' ? success(v) : success)
      const id = idOf(v)
      for (const key of [['alerts'], ['stats'], ['alert', id], ['timeline', id], ['audit'], ['officer-tasks'], ['hotspots'], ['reports']])
        qc.invalidateQueries({ queryKey: key })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
}

export const useAssign = () =>
  useAlertMutation(
    (v: { id: string; officer_id?: number; assigned_to?: string; reassign?: boolean }) => alertsApi.assign(v.id, { officer_id: v.officer_id, assigned_to: v.assigned_to }),
    (v) => (v.reassign ? 'Alert reassigned' : 'Alert assigned'),
    (v) => v.id,
  )
export const useCloseAlert = () => useAlertMutation((id: string) => alertsApi.close(id), 'Alert closed', (id) => id)
export const useDismiss = () =>
  useAlertMutation((v: { id: string; reason: string }) => alertsApi.dismiss(v.id, v.reason), 'Alert dismissed. Reason saved.', (v) => v.id)
export const useReopen = () => useAlertMutation((id: string) => alertsApi.reopen(id), 'Alert reopened', (id) => id)
export const useOverride = () =>
  useAlertMutation((v: { id: string; status: string }) => alertsApi.override(v.id, v.status), 'Status overridden', (v) => v.id)

export const useNotify = () =>
  useMutation({
    mutationFn: (id: string) => alertsApi.notify(id),
    onSuccess: (r) =>
      r.sent ? toast.success(`Email sent to ${r.recipients.length} recipient(s)`) : toast.warning(r.reason ?? 'No notification was sent'),
    onError: (e) => toast.error(getErrorMessage(e)),
  })

/** Loads an authenticated evidence file (snapshot/clip) as an object
 * URL for <img>/<video>. Revokes the URL on unmount or path change. */
export function useMediaObjectUrl(path: string | null | undefined) {
  const [state, setState] = useState<{ url: string | null; loading: boolean; error: boolean }>({
    url: null,
    loading: !!path,
    error: false,
  })
  useEffect(() => {
    if (!path) {
      setState({ url: null, loading: false, error: false })
      return
    }
    let alive = true
    let objectUrl: string | null = null
    setState({ url: null, loading: true, error: false })
    mediaApi
      .blob(path)
      .then((blob) => {
        if (!alive) return
        objectUrl = URL.createObjectURL(blob)
        setState({ url: objectUrl, loading: false, error: false })
      })
      .catch(() => {
        if (alive) setState({ url: null, loading: false, error: true })
      })
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path])
  return state
}
