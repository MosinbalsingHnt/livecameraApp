import { useQuery } from '@tanstack/react-query';
import { checkHealth } from '../record/api/sessionApi';
import { useSettingsStore } from '../../store/settingsStore';

export type ConnectionState = 'connecting' | 'connected' | 'offline';

/**
 * Engine connection, checked automatically: on launch, every 5 s while it is
 * down (so it reconnects by itself), every 30 s once it is up. Shares the
 * ['health', baseUrl] cache entry with the Settings "Test connection" button.
 */
export const useConnection = () => {
  const baseUrl = useSettingsStore(s => s.baseUrl);
  const q = useQuery({
    queryKey: ['health', baseUrl],
    queryFn: checkHealth,
    enabled: !!baseUrl,
    retry: false,
    refetchInterval: query => (query.state.status === 'success' ? 30_000 : 5_000),
    refetchOnReconnect: true,
  });
  const state: ConnectionState =
    q.status === 'success' ? 'connected' : q.status === 'error' ? 'offline' : 'connecting';
  return { state, service: q.data?.service, error: q.error?.message, refetch: q.refetch };
};
