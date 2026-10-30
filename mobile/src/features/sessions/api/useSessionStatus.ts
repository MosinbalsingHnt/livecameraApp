import { useQuery } from '@tanstack/react-query';
import { getSessionStatus } from '../../record/api/sessionApi';
import { useSessionsStore } from '../../../store/sessionsStore';
import type { LocalSession } from '../../../types';

/** Polls server status while a session is live/processing and mirrors it locally. */
export const useSessionStatus = (s: LocalSession) => {
  const patch = useSessionsStore(st => st.patch);
  const poll = s.created && (s.state === 'live' || s.state === 'processing');
  return useQuery({
    queryKey: ['session-status', s.sessionId],
    enabled: poll,
    refetchInterval: 5000,
    retry: false,
    queryFn: async () => {
      const r = await getSessionStatus(s.sessionId);
      const p: Partial<LocalSession> = { eventsFound: r.events_found, alerts: r.alerts ?? [] };
      if (r.status === 'done') p.state = 'done';
      if (r.status === 'failed') p.state = 'failed';
      patch(s.sessionId, p);
      return r;
    },
  });
};
