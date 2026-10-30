import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '../services/storage';
import { DEFAULT_BASE_URL } from '../constants';

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
      vehicleId: '',
      deviceId: randomDeviceId(),
      save: (baseUrl, vehicleId) =>
        set({ baseUrl: baseUrl.trim().replace(/\/+$/, ''), vehicleId: vehicleId.trim() }),
    }),
    { name: 'settings', storage: zustandStorage },
  ),
);
