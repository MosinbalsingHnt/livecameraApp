import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, type } from '../../../theme';

/** Compact stat tile used in the Record panel. */
export const StatTile = ({
  label, value, tone, icon: Icon,
}: { label: string; value: string; tone?: string; icon: LucideIcon }) => (
  <View style={styles.tile}>
    <View style={styles.head}>
      <Icon size={13} color={colors.muted} />
      <Text style={styles.label}>{label.toUpperCase()}</Text>
    </View>
    <Text style={[styles.value, tone ? { color: tone } : null]} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  tile: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { ...type.caption, color: colors.muted },
  value: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 4 },
});
