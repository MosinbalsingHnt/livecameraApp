import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import type { Camera } from 'react-native-vision-camera';
import { CHUNK_MS, LOW_STORAGE_BYTES } from '../../../constants';
import { checkCapturePermissions } from '../../../services/permissions';
import { useSessionsStore } from '../../../store/sessionsStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { makeSessionId } from '../../../utils/time';
import { startGps, stopGps } from '../services/gpsLogger';
import {
  setRecordingFlag,
  startForegroundService,
} from '../services/foregroundService';
import { pumpSession } from '../services/uploader';

const CHUNK_DIR = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/chunks`;

export function useCaptureSession(camera: React.RefObject<Camera | null>) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const t0 = useRef(0);
  const chunkIndex = useRef(0);
  const running = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedResolve = useRef<(() => void) | null>(null);

  const store = useSessionsStore;

  const recordChunk = useCallback(
    (sid: string) => {
      const index = ++chunkIndex.current;
      store.getState().upsertChunk(sid, { index, path: '', finished: false, uploaded: false });
      camera.current?.startRecording({
        fileType: 'mp4',
        videoCodec: 'h264',
        onRecordingFinished: async video => {
          const dest = `${CHUNK_DIR}/${sid}_${index}.mp4`;
          try {
            await ReactNativeBlobUtil.fs.mkdir(CHUNK_DIR).catch(() => {});
            await ReactNativeBlobUtil.fs.mv(video.path.replace('file://', ''), dest);
          } catch {
            /* keep file where it is */
          }
          store.getState().patchChunk(sid, index, { path: dest, finished: true });
          finishedResolve.current?.();
          pumpSession(sid); // upload while the next chunk records
        },
        onRecordingError: err => {
          console.warn('recording error', err);
          finishedResolve.current?.();
        },
      });
      // Absolute schedule from t0 so chunk lengths do not drift.
      const next = t0.current + index * CHUNK_MS - Date.now();
      timer.current = setTimeout(() => rotate(sid), Math.max(next, 0));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [camera],
  );

  const stopCurrent = useCallback(
    () =>
      new Promise<void>(resolve => {
        finishedResolve.current = resolve;
        camera.current?.stopRecording().catch(() => resolve());
      }),
    [camera],
  );

  const rotate = useCallback(
    async (sid: string) => {
      if (!running.current) return;
      await stopCurrent();
      if (running.current) recordChunk(sid);
    },
    [recordChunk, stopCurrent],
  );

  const start = useCallback(async () => {
    const { baseUrl, vehicleId, deviceId } = useSettingsStore.getState();
    if (!baseUrl || !vehicleId) {
      Alert.alert('Settings missing', 'Set the engine base URL and vehicle ID first.');
      return;
    }
    if (!(await checkCapturePermissions())) {
      Alert.alert('Permission needed', 'Camera and precise location are required to record.');
      return;
    }
    const free = await ReactNativeBlobUtil.fs.df().catch(() => null);
    if (free && Number(free.internal_free) < LOW_STORAGE_BYTES) {
      Alert.alert('Low storage', 'Free space is low; uploads may fill the phone.');
    }

    const sid = makeSessionId(vehicleId);
    chunkIndex.current = 0;
    running.current = true;
    setRecordingFlag(true);
    await startForegroundService();

    // chunk 1 starts now; this instant is the shared clock origin (README §6)
    t0.current = Date.now();
    store.getState().add({
      sessionId: sid,
      vehicleId,
      deviceId,
      videoStartedAtUtc: new Date(t0.current).toISOString(),
      created: false,
      stopped: false,
      state: 'live',
      chunks: [],
      gpsPending: [],
      gpsTotalLogged: 0,
      eventsFound: 0,
      alerts: [],
    });
    recordChunk(sid);
    startGps(sid, setGpsAccuracy);
    setSessionId(sid);
    setStartedAt(t0.current);
    pumpSession(sid); // POST /sessions asap
  }, [recordChunk, store]);

  const stop = useCallback(async () => {
    const sid = sessionId;
    if (!sid) return;
    running.current = false;
    if (timer.current) clearTimeout(timer.current);
    await stopCurrent();
    stopGps();
    setRecordingFlag(false);
    store.getState().patch(sid, { stopped: true, state: 'uploading' });
    setSessionId(null);
    setGpsAccuracy(null);
    pumpSession(sid); // final chunk + GPS flush + complete
  }, [sessionId, stopCurrent, store]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { sessionId, startedAt, gpsAccuracy, start, stop };
}
