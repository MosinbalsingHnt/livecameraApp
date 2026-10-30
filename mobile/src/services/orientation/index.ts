import { NativeModules } from 'react-native';

export type OrientationMode = 'portrait' | 'landscape';

export const lockOrientation = (mode: OrientationMode) =>
  NativeModules.AppOrientation?.lock(mode);
