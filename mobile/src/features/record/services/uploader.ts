import ReactNativeBlobUtil from 'react-native-blob-util';
import { runMutation } from '../../../services/api';
import { useSessionsStore } from '../../../store/sessionsStore';
import {
  appendGpsMutation,
  completeSessionMutation,
  createSessionMutation,
  uploadChunkMutation,
} from '../api/mutations';
import { APP_VERSION } from '../../../constants';
import { APP_STARTED_AT } from '../../../utils/time';

const busy = new Set<string>();
// a pump requested while one is running is re-run right after, not dropped
const rerun = new Set<string>();
const get = (id: string) => useSessionsStore.getState().sessions[id];
const patch = (id: string, p: object) => useSessionsStore.getState().patch(id, p);

const gpsInflight = new Map<string, Promise<boolean>>();

/**
 * Send buffered GPS points. Has its own lock so a slow chunk upload never
 * holds GPS back; safe to call from the service loop at any time.
 *
 * Resolves true once everything buffered so far has been accepted by the
 * server. A caller that arrives while a send is in flight waits for it (and
 * then sends what built up meanwhile) instead of returning early: the engine
 * only geo-tags a detection when a GPS point lies within 5 s of it, so a chunk
 * must never be uploaded ahead of the GPS that covers it.
 */
export function flushGps(sessionId: string): Promise<boolean> {
  const running = gpsInflight.get(sessionId);
  if (running) return running.then(ok => (ok ? flushGps(sessionId) : false));

  const s = get(sessionId);
  if (!s) return Promise.resolve(true);
  if (s.gpsPending.length === 0) return Promise.resolve(true);
  if (!s.created) return Promise.resolve(false); // cannot send before the session exists

  const send = (async () => {
    const points = s.gpsPending;
    try {
      await runMutation(appendGpsMutation, { sessionId, points });
      useSessionsStore.getState().removeSentGps(sessionId, points[points.length - 1].t_epoch_ms);
      return true;
    } catch (e: any) {
      patch(sessionId, { lastError: e?.message ?? String(e) });
      return false;
    } finally {
      gpsInflight.delete(sessionId);
    }
  })();
  gpsInflight.set(sessionId, send);
  return send;
}

/** Sessions that still have work to do against the server. */
export const activeSessionIds = () =>
  Object.values(useSessionsStore.getState().sessions)
    .filter(s => s.state === 'live' || s.state === 'uploading')
    .map(s => s.sessionId);

/**
 * One idempotent upload pass for a session: create -> chunks in order ->
 * GPS batch -> complete. Safe to call repeatedly (retry == call again).
 */
export async function pumpSession(sessionId: string) {
  if (busy.has(sessionId)) {
    rerun.add(sessionId);
    return;
  }
  busy.add(sessionId);
  try {
    let s = get(sessionId);
    if (!s) return;

    if (!s.created) {
      await runMutation(createSessionMutation, {
        session_id: s.sessionId,
        vehicle_id: s.vehicleId,
        device_id: s.deviceId,
        app_version: APP_VERSION,
        video_started_at_utc: s.videoStartedAtUtc,
      });
      patch(sessionId, { created: true });
    }

    // GPS first, and it must have been accepted: the engine geo-tags a chunk from it.
    // If it could not be sent, hold the chunks back; the next pass retries both.
    if (!(await flushGps(sessionId))) return;

    // chunks strictly in order, one at a time; never block recording
    for (const c of get(sessionId).chunks) {
      if (c.uploaded) continue;
      if (!c.finished) break;
      let lastPercent = 0;
      patch(sessionId, { uploading: { index: c.index, percent: 0 } }); // show it the moment it starts
      const r: any = await runMutation(uploadChunkMutation, {
        sessionId,
        index: c.index,
        path: c.path,
        onProgress: percent => {
          if (percent - lastPercent >= 3 || percent === 100) {
            lastPercent = percent;
            patch(sessionId, { uploading: { index: c.index, percent } });
          }
        },
      });
      patch(sessionId, { lastUpload: r?.info, uploading: undefined });
      useSessionsStore.getState().patchChunk(sessionId, c.index, { uploaded: true });
    }

    await flushGps(sessionId);

    s = get(sessionId);
    if (
      s.stopped &&
      s.state === 'uploading' &&
      s.gpsPending.length === 0 &&
      s.chunks.every(c => c.finished && c.uploaded)
    ) {
      await runMutation(completeSessionMutation, sessionId);
      patch(sessionId, { state: 'processing', lastError: undefined });
    }
    patch(sessionId, { lastError: undefined });
  } catch (e: any) {
    patch(sessionId, { lastError: e?.message ?? String(e), uploading: undefined });
  } finally {
    busy.delete(sessionId);
    if (rerun.delete(sessionId)) pumpSession(sessionId);
  }
}

export const pumpAll = () =>
  Promise.all(activeSessionIds().flatMap(id => [flushGps(id), pumpSession(id)]));

/** Delete local chunk files once the server confirmed `done`. */
export async function cleanupSession(sessionId: string) {
  const s = get(sessionId);
  if (!s) return;
  await Promise.all(
    s.chunks.map(c => ReactNativeBlobUtil.fs.unlink(c.path).catch(() => {})),
  );
}

/** Remove one session and its local chunk files. */
export async function clearSession(sessionId: string) {
  await cleanupSession(sessionId);
  useSessionsStore.getState().remove([sessionId]);
}

/** Remove every session except the one being recorded right now (+ its files). */
export async function clearOldSessions() {
  const { sessions, remove } = useSessionsStore.getState();
  const old = Object.values(sessions).filter(
    s => !(s.state === 'live' && !s.stopped && s.videoStartedAtUtc >= APP_STARTED_AT),
  );
  await Promise.all(old.map(s => cleanupSession(s.sessionId)));
  remove(old.map(s => s.sessionId));
  return old.length;
}

/**
 * Retry entry point. A session never stopped (app killed / reboot) is closed
 * out first: the half-written last chunk is dropped, the rest is uploaded.
 */
export function resumeSession(sessionId: string) {
  const s = get(sessionId);
  if (!s) return;
  if (!s.stopped) {
    useSessionsStore.setState(st => ({
      sessions: {
        ...st.sessions,
        [sessionId]: { ...s, chunks: s.chunks.filter(c => c.finished) },
      },
    }));
  }
  patch(sessionId, { stopped: true, state: 'uploading', lastError: undefined });
  return pumpSession(sessionId);
}
