import Geolocation from 'react-native-geolocation-service';
import { GPS_INTERVAL_MS } from '../../../constants';
import { useSessionsStore } from '../../../store/sessionsStore';
import type { GpsPoint } from '../../../types';

let watchId: number | null = null;
let lastFixAt = 0;

export const toGpsPoint = (p: Geolocation.GeoPosition): GpsPoint => {
  const c = p.coords;
  const pt: GpsPoint = {
    t_epoch_ms: p.timestamp, // the fix's own timestamp: master clock
    lat: c.latitude,
    lon: c.longitude,
  };
  if (c.speed != null && c.speed >= 0) pt.speed_kmh = c.speed * 3.6; // m/s -> km/h
  if (c.heading != null && c.heading >= 0) pt.heading_deg = c.heading; // -1 = unavailable
  if (c.accuracy != null) pt.accuracy_m = c.accuracy;
  return pt;
};

export function startGps(sessionId: string, onFix?: (point: GpsPoint) => void) {
  stopGps();
  watchId = Geolocation.watchPosition(
    pos => {
      // target 1 point/second
      if (pos.timestamp - lastFixAt < GPS_INTERVAL_MS * 0.9) return;
      lastFixAt = pos.timestamp;
      const point = toGpsPoint(pos);
      useSessionsStore.getState().appendGps(sessionId, point);
      onFix?.(point);
    },
    err => console.warn('GPS error', err.code, err.message),
    {
      enableHighAccuracy: true,
      interval: GPS_INTERVAL_MS,
      fastestInterval: GPS_INTERVAL_MS,
      distanceFilter: 0,
      forceRequestLocation: true,
      showLocationDialog: true,
    },
  );
}

export function stopGps() {
  if (watchId != null) Geolocation.clearWatch(watchId);
  watchId = null;
  lastFixAt = 0;
}
