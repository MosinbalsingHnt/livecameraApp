import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '../services/storage';
import { DEFAULT_BASE_URL, DEMO_VEHICLE_ID } from '../constants';

type SettingsState = {
  baseUrl: string;
  vehicleId: string;
  deviceId: string;
  save: (baseUrl: string, vehicleId: string) => void;
};

const randomDeviceId = () =>
  'android-' + Math.random().toString(16).slice(2, 8);

export const useSettingsStore = create<SettingsState>()(
  persist(
    set => ({
      baseUrl: DEFAULT_BASE_URL,
      vehicleId: DEMO_VEHICLE_ID,
      deviceId: randomDeviceId(),
      save: (baseUrl, vehicleId) =>
        set({ baseUrl: baseUrl.trim().replace(/\/+$/, ''), vehicleId: vehicleId.trim() }),
    }),
    {
      name: 'settings',
      storage: zustandStorage,
      // phones that already saved an empty vehicle ID get the demo name too
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>;
        return { ...current, ...p, vehicleId: p.vehicleId || current.vehicleId };
      },
    },
  ),
);
