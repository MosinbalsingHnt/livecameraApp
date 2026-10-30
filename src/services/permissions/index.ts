import { PermissionsAndroid, Platform, Permission } from 'react-native';

const P = PermissionsAndroid.PERMISSIONS;

export type CaptureAccess = 'granted' | 'denied' | 'blocked';

const required = (): Permission[] => {
  const list: Permission[] = [P.CAMERA, P.ACCESS_FINE_LOCATION];
  if (Number(Platform.Version) >= 33) list.push(P.POST_NOTIFICATIONS);
  return list;
};

/** Current state without prompting. */
export async function checkCapturePermissions(): Promise<boolean> {
  const [cam, loc] = await Promise.all([
    PermissionsAndroid.check(P.CAMERA),
    PermissionsAndroid.check(P.ACCESS_FINE_LOCATION),
  ]);
  return cam && loc;
}

/**
 * Prompts for camera + precise location (+ notifications for the foreground
 * service). Video without GPS is useless, so both are mandatory.
 * 'blocked' = "Don't ask again" was chosen: only system Settings can fix it.
 */
export async function requestCapturePermissions(): Promise<CaptureAccess> {
  const res = await PermissionsAndroid.requestMultiple(required());
  const mandatory = [res[P.CAMERA], res[P.ACCESS_FINE_LOCATION]];
  if (mandatory.every(r => r === 'granted')) return 'granted';
  if (mandatory.some(r => r === 'never_ask_again')) return 'blocked';
  return 'denied';
}
