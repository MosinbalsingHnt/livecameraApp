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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Today, 3:42 PM" / "Yesterday, 9:05 AM" / "12 Mar, 6:30 PM" in local time. */
export const formatWhen = (iso: string, now = new Date()) => {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  const h = d.getHours();
  const time = `${h % 12 || 12}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
  const day = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return `${day}, ${time}`;
};
