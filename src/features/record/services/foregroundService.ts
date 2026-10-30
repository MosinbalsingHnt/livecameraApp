import BackgroundService from 'react-native-background-actions';
import { GPS_FLUSH_MS } from '../../../constants';
import { sleep } from '../../../utils/time';
import { activeSessionIds, pumpAll } from './uploader';

let recording = false;
export const setRecordingFlag = (v: boolean) => {
  recording = v;
};

// Keeps recording + GPS + uploads alive with the screen off, and keeps
// uploading after Stop until every session is drained.
const task = async () => {
  while (BackgroundService.isRunning()) {
    await sleep(GPS_FLUSH_MS); // GPS batch + pending chunk uploads every ~10 s
    await pumpAll();
    if (!recording && activeSessionIds().length === 0) break;
  }
  await BackgroundService.stop();
};

export const startForegroundService = async () => {
  if (BackgroundService.isRunning()) return;
  await BackgroundService.start(task, {
    taskName: 'LiveCapture',
    taskTitle: 'Street capture running',
    taskDesc: 'Recording video + GPS and uploading to the AI engine',
    taskIcon: { name: 'ic_launcher', type: 'mipmap' },
    color: '#2f9e44',
    parameters: {},
  });
};

export const stopForegroundService = () => BackgroundService.stop();
