import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Check, Cpu, UploadCloud } from 'lucide-react-native';
import { colors, radius, type } from '../../theme';
import type { LocalSession } from '../../types';

type Mode = 'uploading' | 'queued' | 'stalled' | 'processing' | 'done' | 'failed' | 'idle';

const SHIMMER_W = 70;
const MAX_SEGMENTS = 24;
const LINEAR = Easing.linear;
const SMOOTH = Easing.out(Easing.cubic);

/** 0 -> 1 on repeat, native-driven. Resets to 0 when not running. */
const useLoop = (running: boolean, duration: number) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!running) {
      v.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration, easing: LINEAR, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [running, duration, v]);
  return v;
};

const modeOf = (s: LocalSession): Mode => {
  if (s.state === 'done') return 'done';
  if (s.state === 'failed') return 'failed';
  if (s.state === 'processing') return 'processing';
  if (s.uploading) return 'uploading';
  if (s.lastError) return 'stalled';
  if (s.state === 'uploading') return 'queued';
  return 'idle';
};

const tone = (m: Mode) =>
  m === 'done' ? colors.primary
  : m === 'processing' || m === 'stalled' ? colors.warn
  : m === 'failed' ? colors.danger
  : colors.info;

/**
 * Animated upload progress for a session: smooth overall bar with a moving
 * shimmer, a pulsing cloud icon, and one segment per chunk.
 */
export const UploadProgress = ({ session, compact }: { session: LocalSession; compact?: boolean }) => {
  const total = session.chunks.length;
  const uploaded = session.chunks.filter(c => c.uploaded).length;
  const mode = modeOf(session);
  const color = tone(mode);
  const busy = mode === 'uploading' || mode === 'processing';

  // overall fraction = finished chunks + the part of the chunk being sent
  const part = session.uploading ? session.uploading.percent / 100 : 0;
  // while recording, `total` keeps growing, so the bar tracks the chunk being sent instead
  const recording = session.state === 'live';
  let frac = recording && session.uploading ? part : total ? Math.min((uploaded + part) / total, 1) : 0;
  if (mode === 'done' || mode === 'processing') frac = 1;
  else if (mode === 'uploading' && frac < 0.03) frac = 0.03;

  const progress = useRef(new Animated.Value(frac)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: frac, duration: 450, easing: SMOOTH, useNativeDriver: false,
    }).start();
  }, [frac, progress]);
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const [trackW, setTrackW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width);

  const shimmer = useLoop(busy, 1300);
  const pulse = useLoop(busy, 1500);
  const blink = useLoop(mode === 'uploading', 900);

  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1], outputRange: [-SHIMMER_W, Math.max(trackW, SHIMMER_W)],
  });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.75] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const bob = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -2.5, 0] });
  const segOpacity = blink.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.35, 1] });

  const Icon = mode === 'done' ? Check : mode === 'processing' ? Cpu : UploadCloud;
  const title =
    mode === 'uploading' ? `Uploading chunk ${Math.min(uploaded + 1, total)} of ${total}`
    : mode === 'queued' ? `Queued · ${uploaded}/${total} uploaded`
    : mode === 'stalled' ? 'Waiting to retry…'
    : mode === 'processing' ? 'Analysing video on server…'
    : mode === 'done' ? 'All chunks uploaded'
    : mode === 'failed' ? 'Server processing failed'
    : `${uploaded}/${total} uploaded`;
  // big number: the chunk in flight while uploading, otherwise the overall figure
  const pct = `${mode === 'uploading' ? session.uploading!.percent : Math.round(frac * 100)}%`;
  const size = compact ? 28 : 36;

  return (
    <View>
      <View style={styles.row}>
        <View style={[styles.iconBox, { width: size, height: size }]}>
          {busy && (
            <Animated.View
              style={[
                styles.ring,
                { borderColor: color, opacity: ringOpacity, transform: [{ scale: ringScale }] },
              ]}
            />
          )}
          <View style={[styles.iconWrap, { width: size, height: size, backgroundColor: `${color}26` }]}>
            <Animated.View style={{ transform: [{ translateY: busy ? bob : 0 }] }}>
              <Icon size={compact ? 15 : 18} color={color} />
            </Animated.View>
          </View>
        </View>
        <Text style={[styles.title, { color: mode === 'idle' ? colors.muted : colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.pct, { color }]}>{pct}</Text>
      </View>

      <View style={styles.track} onLayout={onLayout}>
        <Animated.View style={[styles.fill, { width, backgroundColor: color }]}>
          {busy && (
            <Animated.View
              style={[styles.shimmer, { transform: [{ translateX: shimmerX }, { skewX: '-20deg' }] }]}
            />
          )}
        </Animated.View>
      </View>

      {!compact && total > 1 && total <= MAX_SEGMENTS && (
        <View style={styles.segments}>
          {session.chunks.map((c, i) => {
            const current = mode === 'uploading' && !c.uploaded && i === uploaded;
            return (
              <Animated.View
                key={c.index}
                style={[
                  styles.seg,
                  { backgroundColor: c.uploaded || mode === 'processing' || mode === 'done' ? color : current ? color : colors.surfaceAlt },
                  current && { opacity: segOpacity },
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { alignItems: 'center', justifyContent: 'center' },
  iconWrap: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute', width: '100%', height: '100%',
    borderRadius: radius.pill, borderWidth: 2,
  },
  title: { ...type.body, flex: 1, fontWeight: '700' },
  pct: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'], minWidth: 56, textAlign: 'right' },
  track: {
    height: 8, borderRadius: 4, marginTop: 10,
    backgroundColor: colors.surfaceAlt, overflow: 'hidden',
  },
  fill: { height: 8, borderRadius: 4, overflow: 'hidden' },
  shimmer: {
    position: 'absolute', top: 0, bottom: 0, width: SHIMMER_W,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  segments: { flexDirection: 'row', gap: 3, marginTop: 8 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
});
