import { useQuery } from '@tanstack/react-query';
import { checkHealth } from '../../record/api/sessionApi';
import { useSettingsStore } from '../../../store/settingsStore';

/** Manual "Test connection": disabled query, triggered with refetch(). */
export const useHealthCheck = () => {
  const baseUrl = useSettingsStore(s => s.baseUrl);
  return useQuery({
    queryKey: ['health', baseUrl],
    queryFn: checkHealth,
    enabled: false,
    retry: false,
    gcTime: 0,
  });
};
