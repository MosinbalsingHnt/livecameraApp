import { http } from '../../../services/api';
import type { GpsPoint, ServerSessionStatus } from '../../../types';

export const checkHealth = async () =>
  (await http.get<{ ok: boolean; service: string }>('/health', { timeout: 8000 })).data;

export const createSession = async (body: {
  session_id: string;
  vehicle_id: string;
  device_id: string;
  app_version: string;
  video_started_at_utc: string;
}) => (await http.post('/sessions', body)).data;

export const uploadChunk = async (v: {
  sessionId: string;
  index: number;
  path: string;
  onProgress?: (percent: number) => void;
}) => {
  const form = new FormData();
  form.append('file', {
    uri: v.path.startsWith('file://') ? v.path : `file://${v.path}`,
    name: `chunk_${v.index}.mp4`,
    type: 'video/mp4',
  } as any);
  const t0 = Date.now();
  let tSent = 0;
  const res = await http.post(`/sessions/${v.sessionId}/chunks/${v.index}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600_000,
    onUploadProgress: e => {
      if (!tSent && e.total && e.loaded >= e.total) tSent = Date.now();
      if (e.total) v.onProgress?.(Math.round((e.loaded / e.total) * 100));
    },
  });
  const t1 = Date.now();
  const sendMs = (tSent || t1) - t0; // phone -> server (network)
  const serverMs = t1 - (tSent || t1); // server busy before it answered (backend)
  const mb = (res.data?.video_bytes ?? 0) / 1048576;
  const info =
    `chunk ${v.index}: ${mb.toFixed(1)} MB, sent in ${(sendMs / 1000).toFixed(1)} s ` +
    `(${(mb / Math.max(sendMs / 1000, 0.1)).toFixed(2)} MB/s), server replied after ${(serverMs / 1000).toFixed(1)} s`;
  console.log('[upload]', info);
  return { ...res.data, info };
};

export const appendGps = async (v: { sessionId: string; points: GpsPoint[] }) =>
  (await http.post(`/sessions/${v.sessionId}/gps`, { points: v.points })).data;

export const completeSession = async (sessionId: string) =>
  (await http.post(`/sessions/${sessionId}/complete`)).data;

export const getSessionStatus = async (sessionId: string) =>
  (await http.get<ServerSessionStatus>(`/sessions/${sessionId}`)).data;
