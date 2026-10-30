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
}) => {
  const form = new FormData();
  form.append('file', {
    uri: v.path.startsWith('file://') ? v.path : `file://${v.path}`,
    name: `chunk_${v.index}.mp4`,
    type: 'video/mp4',
  } as any);
  return (
    await http.post(`/sessions/${v.sessionId}/chunks/${v.index}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600_000,
    })
  ).data;
};

export const appendGps = async (v: { sessionId: string; points: GpsPoint[] }) =>
  (await http.post(`/sessions/${v.sessionId}/gps`, { points: v.points })).data;

export const completeSession = async (sessionId: string) =>
  (await http.post(`/sessions/${sessionId}/complete`)).data;

export const getSessionStatus = async (sessionId: string) =>
  (await http.get<ServerSessionStatus>(`/sessions/${sessionId}`)).data;
