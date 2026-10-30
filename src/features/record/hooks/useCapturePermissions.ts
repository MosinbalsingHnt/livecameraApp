import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  CaptureAccess,
  checkCapturePermissions,
  requestCapturePermissions,
} from '../../../services/permissions';

type Access = CaptureAccess | 'checking';

/** Asks as soon as the Record screen opens; re-checks after returning from Settings. */
export function useCapturePermissions() {
  const [access, setAccess] = useState<Access>('checking');

  const request = useCallback(async () => {
    setAccess(await requestCapturePermissions());
  }, []);

  useEffect(() => {
    (async () => {
      if (await checkCapturePermissions()) setAccess('granted');
      else await request();
    })();
    const sub = AppState.addEventListener('change', async state => {
      if (state === 'active' && (await checkCapturePermissions())) setAccess('granted');
    });
    return () => sub.remove();
  }, [request]);

  return { access, request };
}
