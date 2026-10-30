export const APP_VERSION = '0.1.0';
export const CHUNK_MS = 5_000; // testing value; README contract is 60_000
// 720p, 15 fps, 1 Mbps ≈ 0.6 MB per 5 s chunk (was 1080p/30 fps/3.5 Mbps ≈ 2.2 MB).
// At 15 fps each frame gets twice the bits it had at 30 fps for the same rate.
export const VIDEO_WIDTH = 1280;
export const VIDEO_HEIGHT = 720;
export const VIDEO_FPS = 15;
export const VIDEO_BITRATE_MBPS = 1;
// 'h265' is ~40% smaller again, but only switch once the backend is confirmed to decode HEVC
export const VIDEO_CODEC: 'h264' | 'h265' = 'h264';
// hard ceiling: a chunk over this is logged as a warning
export const MAX_CHUNK_BYTES = 3 * 1024 * 1024;
export const DEMO_VEHICLE_ID = 'PCMC-DEMO-01';
export const GPS_INTERVAL_MS = 1_000;
export const GPS_FLUSH_MS = 10_000;
export const LOW_STORAGE_BYTES = 2 * 1024 * 1024 * 1024;
export const DEFAULT_BASE_URL = 'http://0.tcp.in.ngrok.io:23705';
