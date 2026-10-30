import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '../services/storage';
import type { ChunkRecord, GpsPoint, LocalSession } from '../types';

type SessionsState = {
  sessions: Record<string, LocalSession>;
  add: (s: LocalSession) => void;
  patch: (id: string, p: Partial<LocalSession>) => void;
  upsertChunk: (id: string, c: ChunkRecord) => void;
  patchChunk: (id: string, index: number, p: Partial<ChunkRecord>) => void;
  appendGps: (id: string, p: GpsPoint) => void;
  remove: (ids: string[]) => void;
  removeSentGps: (id: string, lastT: number) => void;
};

export const useSessionsStore = create<SessionsState>()(
  persist(
    set => {
      const update = (id: string, fn: (s: LocalSession) => LocalSession) =>
        set(st =>
          st.sessions[id]
            ? { sessions: { ...st.sessions, [id]: fn(st.sessions[id]) } }
            : st,
        );
      return {
        sessions: {},
        add: s => set(st => ({ sessions: { ...st.sessions, [s.sessionId]: s } })),
        patch: (id, p) => update(id, s => ({ ...s, ...p })),
        upsertChunk: (id, c) =>
          update(id, s => ({
            ...s,
            chunks: [...s.chunks.filter(x => x.index !== c.index), c].sort(
              (a, b) => a.index - b.index,
            ),
          })),
        patchChunk: (id, index, p) =>
          update(id, s => ({
            ...s,
            chunks: s.chunks.map(c => (c.index === index ? { ...c, ...p } : c)),
          })),
        appendGps: (id, p) =>
          update(id, s => ({
            ...s,
            gpsPending: [...s.gpsPending, p],
            gpsTotalLogged: s.gpsTotalLogged + 1,
          })),
        remove: ids =>
          set(st => {
            const sessions = { ...st.sessions };
            ids.forEach(id => delete sessions[id]);
            return { sessions };
          }),
        // drop points up to and including lastT (already confirmed by server)
        removeSentGps: (id, lastT) =>
          update(id, s => ({
            ...s,
            gpsPending: s.gpsPending.filter(p => p.t_epoch_ms > lastT),
          })),
      };
    },
    { name: 'sessions', storage: zustandStorage },
  ),
);
