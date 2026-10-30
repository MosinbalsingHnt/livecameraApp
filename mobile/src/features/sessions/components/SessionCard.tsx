import React, { useEffect, useRef } from 'react';
import { Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Clock, Film, MapPin, RefreshCw, Trash2, TriangleAlert,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Badge } from '../../../components/Badge';
import { UploadProgress } from '../../../components/UploadProgress';
import { CHUNK_MS } from '../../../constants';
import { colors, radius, type } from '../../../theme';
import type { LocalSession, SessionState } from '../../../types';
import { APP_STARTED_AT, formatElapsed, formatWhen } from '../../../utils/time';
import { clearSession, resumeSession } from '../../record/services/uploader';
import { useSessionStatus } from '../api/useSessionStatus';

export const tones: Record<SessionState, { fg: string; bg: string; label: string }> = {
  live: { fg: colors.danger, bg: colors.dangerSoft, label: 'Live' },
  uploading: { fg: colors.info, bg: colors.infoSoft, label: 'Uploading' },
  processing: { fg: colors.warn, bg: colors.warnSoft, label: 'Processing' },
  done: { fg: colors.primary, bg: colors.primarySoft, label: 'Done' },
  failed: { fg: colors.danger, bg: colors.dangerSoft, label: 'Failed' },
};

const Meta = ({ icon: Icon, label, value, tone }: {
  icon: LucideIcon; label: string; value: string | number; tone?: string;
}) => (
  <View style={styles.meta}>
    <View style={styles.metaHead}>
      <Icon size={12} color={tone ?? colors.muted} />
      <Text style={styles.metaLabel}>{label.toUpperCase()}</Text>
    </View>
    <Text style={[styles.metaValue, tone ? { color: tone } : null]} numberOfLines={1}>{value}</Text>
  </View>
);

export const SessionCard = ({ session, index = 0 }: { session: LocalSession; index?: number }) => {
  useSessionStatus(session);
  const t = tones[session.state];
  const total = session.chunks.length;
  const up = session.chunks.filter(c => c.uploaded).length;
  const needsRetry =
    session.state === 'uploading' ||
    session.state === 'failed' ||
    (session.state === 'live' && session.videoStartedAtUtc < APP_STARTED_AT);

  // the session being recorded right now cannot be deleted
  const recordingNow =
    session.state === 'live' && !session.stopped && session.videoStartedAtUtc >= APP_STARTED_AT;

  // staggered fade/slide-in when the list appears
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1, duration: 380, delay: Math.min(index, 8) * 60, useNativeDriver: true,
    }).start();
  }, [enter, index]);

  const confirmDelete = () =>
    Alert.alert(
      'Delete this session?',
      `${session.sessionId}\nIts video files are removed from the phone. Anything not yet uploaded is lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => clearSession(session.sessionId) },
      ],
    );

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        },
      ]}>
      <View style={[styles.accent, { backgroundColor: t.fg }]} />
      <View style={styles.body}>
        <View style={styles.head}>
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>{session.vehicleId || 'Vehicle'}</Text>
            <Text style={styles.when}>{formatWhen(session.videoStartedAtUtc)}</Text>
          </View>
          <Badge label={t.label} color={t.fg} bg={t.bg} />
        </View>
        <Text style={styles.id} numberOfLines={1}>{session.sessionId}</Text>

        <View style={styles.progress}>
          <UploadProgress session={session} />
        </View>

        <View style={styles.metas}>
          <Meta icon={Clock} label="Length" value={total ? formatElapsed(total * CHUNK_MS) : '—'} />
          <Meta icon={Film} label="Chunks" value={`${up}/${total}`} />
          <Meta icon={MapPin} label="GPS left" value={session.gpsPending.length} />
          <Meta
            icon={TriangleAlert}
            label="Events"
            value={session.eventsFound}
            tone={session.eventsFound > 0 ? colors.warn : undefined}
          />
        </View>

        {session.alerts.length > 0 && (
          <View style={styles.chips}>
            {session.alerts.map(a => (
              <View key={a} style={styles.chip}>
                <Text style={styles.chipText}>{a}</Text>
              </View>
            ))}
          </View>
        )}

        {session.lastUpload ? <Text style={styles.diag}>{session.lastUpload}</Text> : null}
        {session.lastError ? (
          <View style={styles.errBox}>
            <TriangleAlert size={14} color={colors.warn} />
            <Text style={styles.err} numberOfLines={2}>{session.lastError}</Text>
          </View>
        ) : null}

        {(needsRetry || !recordingNow) && (
          <View style={styles.actions}>
            {needsRetry && (
              <Pressable
                onPress={() => resumeSession(session.sessionId)}
                disabled={!!session.uploading}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                style={({ pressed }) => [
                  styles.retry,
                  (pressed || !!session.uploading) && { opacity: 0.6 },
                ]}>
                <RefreshCw size={16} color="#fff" />
                <Text style={styles.retryText}>Retry upload</Text>
              </Pressable>
            )}
            <View style={styles.spacer} />
            {!recordingNow && (
              <Pressable
                onPress={confirmDelete}
                accessibilityLabel="Delete session"
                hitSlop={6}
                android_ripple={{ color: 'rgba(239,68,68,0.25)', borderless: true }}
                style={({ pressed }) => [styles.delete, pressed && { opacity: 0.6 }]}>
                <Trash2 size={18} color={colors.danger} />
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 12,
  },
  accent: { width: 4 },
  body: { flex: 1, padding: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleWrap: { flex: 1 },
  title: { color: colors.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  when: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 2 },
  id: { color: colors.muted, fontSize: 11, marginTop: 6, opacity: 0.7, fontVariant: ['tabular-nums'] },
  progress: { marginTop: 14 },
  metas: {
    flexDirection: 'row', marginTop: 16, paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  meta: { flex: 1 },
  metaHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaLabel: { ...type.caption, fontSize: 10, color: colors.muted },
  metaValue: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 4, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  chip: { backgroundColor: colors.warnSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { color: colors.warn, fontSize: 11, fontWeight: '700' },
  diag: { color: colors.muted, marginTop: 12, fontSize: 11, opacity: 0.8 },
  errBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    backgroundColor: colors.warnSoft, borderRadius: radius.sm, padding: 10,
  },
  err: { flex: 1, color: colors.warn, fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  spacer: { flex: 1 },
  retry: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 16,
    backgroundColor: colors.info, borderRadius: radius.md, overflow: 'hidden',
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  delete: {
    width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.dangerSoft,
  },
});
