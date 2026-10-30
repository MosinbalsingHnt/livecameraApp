import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSessionsStore } from '../../store/sessionsStore';
import { APP_STARTED_AT } from '../../utils/time';
import { pumpAll, resumeSession } from '../record/services/uploader';
import { useConnection } from './useConnection';

/**
 * Mounted once at the app root. Connects to the engine as soon as the app
 * opens (and whenever it returns to the foreground), then pushes any chunks
 * that were waiting, so nobody has to open Settings or tap Retry.
 */
export const AutoConnect = () => {
  const { state, refetch } = useConnection();
  const staleDone = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refetch();
    });
    return () => sub.remove();
  }, [refetch]);

  useEffect(() => {
    if (state !== 'connected') return;
    const run = () => {
      if (!staleDone.current) {
        staleDone.current = true;
        // sessions cut off by an app kill / reboot: close out and upload, once per launch
        for (const s of Object.values(useSessionsStore.getState().sessions)) {
          if (s.state === 'live' && s.videoStartedAtUtc < APP_STARTED_AT) resumeSession(s.sessionId);
        }
      }
      pumpAll();
    };
    // sessions are persisted asynchronously; do not look at them before they are loaded
    if (useSessionsStore.persist.hasHydrated()) {
      run();
      return;
    }
    return useSessionsStore.persist.onFinishHydration(run);
  }, [state]);

  return null;
};
