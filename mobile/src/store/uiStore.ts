import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '../services/storage';
import type { OrientationMode } from '../services/orientation';

type UiState = {
  orientation: OrientationMode;
  setOrientation: (o: OrientationMode) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    set => ({
      orientation: 'portrait', // default
      setOrientation: orientation => set({ orientation }),
    }),
    { name: 'ui', storage: zustandStorage },
  ),
);
