import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../theme';

type Props<T extends string> = {
  options: { value: T; label: string; icon?: (color: string) => React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  glass?: boolean;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
  glass,
}: Props<T>) {
  return (
    <View style={[styles.wrap, glass && styles.glass, disabled && { opacity: 0.5 }]}>
      {options.map(o => (
        <Pressable
          key={o.value}
          disabled={disabled}
          onPress={() => onChange(o.value)}
          style={[styles.seg, value === o.value && styles.on]}>
          {o.icon?.(value === o.value ? '#fff' : colors.muted)}
          <Text style={[styles.txt, value === o.value && styles.txtOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 4,
  },
  glass: { backgroundColor: colors.glass },
  seg: {
    flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
  },
  on: { backgroundColor: colors.primary },
  txt: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  txtOn: { color: '#fff' },
});
