import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radius } from '../../theme';

export const Badge = ({ label, color, bg }: { label: string; color: string; bg: string }) => (
  <View style={[styles.pill, { backgroundColor: bg }]}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <Text style={[styles.text, { color }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: '700' },
});
