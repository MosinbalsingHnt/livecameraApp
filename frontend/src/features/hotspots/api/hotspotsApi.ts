import { api } from '@/services/api/axios'
import type { Hotspot } from '@/types/api'

export const hotspotsApi = {
  list: (days: number, min_count: number) =>
    api.get<{ hotspots: Hotspot[] }>('/hotspots', { params: { days, min_count } }).then((r) => r.data.hotspots),
}
