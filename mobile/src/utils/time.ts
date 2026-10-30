const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** <vehicle_id>_<YYYYMMDD>_<HHmmss> (local time inside the id is fine) */
export const makeSessionId = (vehicleId: string, d = new Date()) =>
  `${vehicleId}_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
  `_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

export const formatElapsed = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

/** Sessions still 'live' from before this launch were killed mid-drive. */
export const APP_STARTED_AT = new Date().toISOString();

export const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));
