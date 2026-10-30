import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius } from '../../theme';
import { useConnection } from './useConnection';

const tones = {
  connecting: { color: colors.warn, label: 'Connecting…' },
  connected: { color: colors.primary, label: 'Connected' },
  offline: { color: colors.danger, label: 'Offline · retrying' },
};

/** Live engine status pill. Tap to retry right away. `compact` is the dot only. */
export const ConnectionBadge = ({ compact }: { compact?: boolean }) => {
  const { state, refetch } = useConnection();
  const t = tones[state];
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'connected') {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state, pulse]);

  return (
    <Pressable onPress={() => refetch()} accessibilityLabel={t.label} style={styles.pill}>
      <Animated.View style={[styles.dot, { backgroundColor: t.color, opacity: pulse }]} />
      {!compact && <Text style={styles.text}>{t.label}</Text>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.glass,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  text: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
