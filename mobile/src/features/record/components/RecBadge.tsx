import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../../theme';

export const RecBadge = ({ time }: { time: string }) => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={styles.badge}>
      <Animated.View style={[styles.dot, { opacity: pulse }]} />
      <Text style={styles.text}>REC {time}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.glass,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  text: { color: '#fff', fontWeight: '800', fontSize: 14, fontVariant: ['tabular-nums'] },
});
