import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorMessage } from '@/services/api/axios'
import { useLiveInterval } from '@/store/uiStore'
import type { OfficerInput, Settings, UserInput, VehicleInput, WardImportBody } from '@/types/api'
import { auditApi, icccApi, officersApi, passesApi, settingsApi, usersApi, vehiclesApi, wardsApi } from '../api/adminApi'

export const useWards = () => useQuery({ queryKey: ['wards'], queryFn: wardsApi.list, staleTime: 10 * 60_000 })

export const useImportWards = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: WardImportBody) => wardsApi.import(b),
    onSuccess: (r) => {
      const n = [r.imported, r.count, r.inserted, r.wards].find((v) => typeof v === 'number')
      toast.success(n != null ? `Ward import complete · ${n} ward${n === 1 ? '' : 's'}` : 'Ward import complete')
      qc.invalidateQueries({ queryKey: ['wards'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}

export const useOfficers = (p: { ward_code?: string; active_only?: boolean } = {}, enabled = true) =>
  useQuery({ queryKey: ['officers', p], queryFn: () => officersApi.list(p), enabled })

export const useVehicles = (p: { ward_code?: string; active_only?: boolean } = {}, live = false) => {
  const interval = useLiveInterval(30_000)
  return useQuery({ queryKey: ['vehicles', p], queryFn: () => vehiclesApi.list(p), refetchInterval: live ? interval : false })
}

export const useUsers = (enabled = true) => useQuery({ queryKey: ['users'], queryFn: usersApi.list, enabled })
export const useSettings = () => useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
export const useAudit = () => useQuery({ queryKey: ['audit'], queryFn: () => auditApi.list(100) })
export const useIcccEvents = () => {
  const interval = useLiveInterval(15_000)
  return useQuery({ queryKey: ['iccc'], queryFn: () => icccApi.events(30), refetchInterval: interval })
}
export const usePasses = () => useQuery({ queryKey: ['passes'], queryFn: passesApi.list })

/** Shared helper: a mutation that toasts the outcome and refreshes the given query keys. */
function useCrud<V, R>(fn: (v: V) => Promise<R>, keys: string[], success: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(success)
      keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
}

export const useSaveOfficer = () =>
  useCrud((v: { id?: number; data: OfficerInput }) => (v.id ? officersApi.update(v.id, v.data) : officersApi.create(v.data)), ['officers'], 'Officer saved')
export const useDeactivateOfficer = () => useCrud((id: number) => officersApi.remove(id), ['officers'], 'Officer deactivated')

export const useSaveVehicle = () =>
  useCrud((v: { id?: string; data: VehicleInput }) => (v.id ? vehiclesApi.update(v.id, v.data) : vehiclesApi.create(v.data)), ['vehicles'], 'Vehicle saved')
export const useDeactivateVehicle = () => useCrud((id: string) => vehiclesApi.remove(id), ['vehicles'], 'Vehicle deactivated')

export const useSaveUser = () =>
  useCrud((v: { id?: number; data: UserInput }) => (v.id ? usersApi.update(v.id, v.data) : usersApi.create(v.data)), ['users'], 'User saved')
export const useDeactivateUser = () => useCrud((id: number) => usersApi.remove(id), ['users'], 'User deactivated')

export const useSaveSettings = () => useCrud((b: Partial<Settings>) => settingsApi.update(b), ['settings'], 'Settings saved')
