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

const busy = new Set<string>();
const get = (id: string) => useSessionsStore.getState().sessions[id];
const patch = (id: string, p: object) => useSessionsStore.getState().patch(id, p);

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
  if (busy.has(sessionId)) return;
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

    // chunks strictly in order, one at a time; never block recording
    for (const c of get(sessionId).chunks) {
      if (c.uploaded) continue;
      if (!c.finished) break;
      await runMutation(uploadChunkMutation, { sessionId, index: c.index, path: c.path });
      useSessionsStore.getState().patchChunk(sessionId, c.index, { uploaded: true });
    }

    const pending = get(sessionId).gpsPending;
    if (pending.length) {
      await runMutation(appendGpsMutation, { sessionId, points: pending });
      useSessionsStore.getState().removeSentGps(sessionId, pending[pending.length - 1].t_epoch_ms);
    }

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
    patch(sessionId, { lastError: e?.message ?? String(e) });
  } finally {
    busy.delete(sessionId);
  }
}

export const pumpAll = () => Promise.all(activeSessionIds().map(pumpSession));

/** Delete local chunk files once the server confirmed `done`. */
export async function cleanupSession(sessionId: string) {
  const s = get(sessionId);
  if (!s) return;
  await Promise.all(
    s.chunks.map(c => ReactNativeBlobUtil.fs.unlink(c.path).catch(() => {})),
  );
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
