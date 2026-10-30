export type GpsPoint = {
  t_epoch_ms: number;
  lat: number;
  lon: number;
  speed_kmh?: number;
  heading_deg?: number;
  accuracy_m?: number;
};

export type ChunkRecord = {
  index: number;
  path: string;
  /** recording of this chunk has been closed, file is complete */
  finished: boolean;
  uploaded: boolean;
};

export type SessionState =
  | 'live'
  | 'uploading'
  | 'processing'
  | 'done'
  | 'failed';

export type LocalSession = {
  sessionId: string;
  vehicleId: string;
  deviceId: string;
  videoStartedAtUtc: string;
  created: boolean;
  stopped: boolean;
  state: SessionState;
  chunks: ChunkRecord[];
  gpsPending: GpsPoint[];
  gpsTotalLogged: number;
  eventsFound: number;
  alerts: string[];
  lastError?: string;
  /** timing of the most recent chunk upload, to tell network from server slowness */
  lastUpload?: string;
  /** live progress of the chunk currently uploading */
  uploading?: { index: number; percent: number };
};

export type ServerSessionStatus = {
  session_id: string;
  status: 'live' | 'processing' | 'done' | 'failed';
  chunks_received: number;
  events_found: number;
  alerts: string[];
};
