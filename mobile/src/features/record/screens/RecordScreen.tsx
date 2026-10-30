import React, { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraDevice, useCameraFormat } from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../components/Button';
import { VIDEO_BITRATE_MBPS, VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from '../../../constants';
import { ConnectionBadge } from '../../connection/ConnectionBadge';
import { SegmentedControl } from '../../../components/SegmentedControl';
import { UploadProgress } from '../../../components/UploadProgress';
import { Camera as CameraIcon, MapPin, Navigation, UploadCloud } from 'lucide-react-native';
import { orientationOptions } from '../../../hooks/orientationOptions';
import { useOrientation } from '../../../hooks/useOrientation';
import { useSessionsStore } from '../../../store/sessionsStore';
import { colors, radius, type } from '../../../theme';
import { formatElapsed } from '../../../utils/time';
import { LiveCoords } from '../components/LiveCoords';
import { RecBadge } from '../components/RecBadge';
import { RecordButton } from '../components/RecordButton';
import { StatTile } from '../components/StatusRow';
import { useCapturePermissions } from '../hooks/useCapturePermissions';
import { useCaptureSession } from '../hooks/useCaptureSession';

export const RecordScreen = () => {
  const camera = useRef<Camera>(null);
  const insets = useSafeAreaInsets();
  const { access, request } = useCapturePermissions();
  const { orientation, set: setOrientation } = useOrientation();
  const device = useCameraDevice('back');
  const format = useCameraFormat(device, [
    { videoResolution: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT } },
    { fps: VIDEO_FPS },
  ]);
  // the camera throws if the fps is outside what the chosen format supports
  const fps = format ? Math.min(Math.max(VIDEO_FPS, format.minFps), format.maxFps) : VIDEO_FPS;
  const { sessionId, startedAt, fix, gpsAccuracy, start, stop } = useCaptureSession(camera);
  const session = useSessionsStore(s => (sessionId ? s.sessions[sessionId] : undefined));
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!sessionId) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [sessionId]);

  if (access !== 'granted') {
    return (
      <View style={styles.gate}>
        <View style={styles.gateIcon}>
          <CameraIcon size={38} color={colors.primary} />
        </View>
        <Text style={styles.gateTitle}>
          {access === 'checking' ? 'Checking permissions…' : 'Allow camera & location'}
        </Text>
        <Text style={styles.gateText}>
          The app records the road and logs GPS together, so both permissions are required.
        </Text>
        {access === 'denied' && <Button title="Grant permission" onPress={request} />}
        {access === 'blocked' && (
          <Button title="Open app settings" onPress={() => Linking.openSettings()} />
        )}
      </View>
    );
  }

  const recording = !!sessionId;
  const uploaded = session?.chunks.filter(c => c.uploaded).length ?? 0;
  const quality =
    gpsAccuracy == null
      ? { label: 'No fix', tone: colors.muted }
      : gpsAccuracy <= 10
      ? { label: 'Good', tone: colors.primary }
      : gpsAccuracy <= 30
      ? { label: 'Fair', tone: colors.warn }
      : { label: 'Poor', tone: colors.danger };

  return (
    <View style={styles.root}>
      {device ? (
        <Camera ref={camera} style={StyleSheet.absoluteFill} device={device} format={format}
          fps={fps} video audio={false} videoBitRate={VIDEO_BITRATE_MBPS} isActive />
      ) : (
        <Text style={styles.noCam}>No camera available</Text>
      )}

      <View style={[styles.top, { top: insets.top + 12 }]}>
        <View style={styles.left}>
          {recording && <RecBadge time={formatElapsed(now - startedAt)} />}
          <ConnectionBadge compact={recording} />
        </View>
        <View style={{ width: 250 }}>
          <SegmentedControl glass disabled={recording} value={orientation}
            onChange={setOrientation}
            options={orientationOptions} />
        </View>
      </View>

      <View style={[styles.panel, { bottom: 12 }]}>
        {recording && <LiveCoords fix={fix} now={now} />}
        <View style={styles.stats}>
          <StatTile icon={MapPin} label="GPS" value={quality.label} tone={quality.tone} />
          <StatTile icon={Navigation} label="Points" value={String(session?.gpsTotalLogged ?? 0)} />
          <StatTile icon={UploadCloud} label="Chunks" value={`${uploaded}/${session?.chunks.length ?? 0}`} />
        </View>
        {session && session.chunks.some(c => c.finished) ? (
          <UploadProgress session={session} compact />
        ) : null}
        {session?.lastError ? (
          <Text style={styles.err} numberOfLines={2}>Upload retrying: {session.lastError}</Text>
        ) : null}
        <View style={styles.action}>
          <RecordButton recording={recording} onPress={recording ? stop : start} />
          <Text style={styles.hint}>{recording ? 'Tap to stop' : 'Tap to start recording'}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  noCam: { color: colors.muted, textAlign: 'center', marginTop: 120 },
  top: {
    position: 'absolute', left: 12, right: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  panel: {
    position: 'absolute', left: 12, right: 12, padding: 16, gap: 14,
    backgroundColor: colors.glass, borderRadius: radius.lg,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stats: { flexDirection: 'row', gap: 12 },
  action: { alignItems: 'center', gap: 8 },
  hint: { ...type.caption, color: colors.muted },
  err: { color: colors.warn, fontSize: 12 },
  gate: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'stretch', padding: 28, gap: 16 },
  gateIcon: {
    alignSelf: 'center', width: 84, height: 84, borderRadius: 42,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  gateTitle: { ...type.title, color: colors.text, textAlign: 'center' },
  gateText: { color: colors.muted, textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: 8 },
});
