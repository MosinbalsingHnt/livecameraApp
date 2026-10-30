import { useCallback } from 'react';
import { lockOrientation, OrientationMode } from '../services/orientation';
import { useUiStore } from '../store/uiStore';

export function useOrientation() {
  const orientation = useUiStore(s => s.orientation);
  const setStored = useUiStore(s => s.setOrientation);
  const set = useCallback(
    (mode: OrientationMode) => {
      setStored(mode);
      lockOrientation(mode);
    },
    [setStored],
  );
  return { orientation, set };
}
