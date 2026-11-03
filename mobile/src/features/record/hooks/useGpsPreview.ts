import { useEffect, useState } from 'react';
import Geolocation from 'react-native-geolocation-service';

export type GpsPreview = { accuracy: number; at: number };

/**
 * Keeps the GPS chip warm while the Record screen is open but not recording,
 * so the first fix is already there when the driver taps Record. A cold start
 * can take 10-30 s, and video recorded before the first fix has no position
 * (the engine only locates a detection that has a GPS point within 5 s).
 * Nothing is stored or uploaded from here; recording has its own logger.
 */
export function useGpsPreview(active: boolean) {
  const [fix, setFix] = useState<GpsPreview | null>(null);

  useEffect(() => {
    if (!active) {
      setFix(null);
      return;
    }
    const id = Geolocation.watchPosition(
      pos => setFix({ accuracy: pos.coords.accuracy, at: pos.timestamp }),
      err => console.warn('GPS preview error', err.code, err.message),
      {
        enableHighAccuracy: true,
        interval: 2000,
        fastestInterval: 2000,
        distanceFilter: 0,
        forceRequestLocation: true,
        showLocationDialog: true,
      },
    );
    return () => Geolocation.clearWatch(id);
  }, [active]);

  return fix;
}
