import type { MutationObserverOptions } from '@tanstack/react-query';
import * as api from './sessionApi';
import type { GpsPoint } from '../../../types';

type Opts<D, V> = MutationObserverOptions<D, Error, V>;

export const createSessionMutation: Opts<unknown, Parameters<typeof api.createSession>[0]> = {
  mutationKey: ['session', 'create'],
  mutationFn: api.createSession,
};

export const uploadChunkMutation: Opts<unknown, Parameters<typeof api.uploadChunk>[0]> = {
  mutationKey: ['session', 'chunk'],
  mutationFn: api.uploadChunk,
};

export const appendGpsMutation: Opts<unknown, { sessionId: string; points: GpsPoint[] }> = {
  mutationKey: ['session', 'gps'],
  mutationFn: api.appendGps,
};

// 409 means chunks/GPS still missing: do not hammer it with retries.
export const completeSessionMutation: Opts<unknown, string> = {
  mutationKey: ['session', 'complete'],
  mutationFn: api.completeSession,
  retry: 0,
};
